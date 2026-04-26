const express = require("express");
const router = express.Router();
const OpenAI = require("openai");

const Advice = require("../models/Advice");
const Article = require("../models/Article");
const Question = require("../models/Question");


const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

async function getRandomQuestions(){
  const questions = await Question.aggregate([{ $sample: { size: 30 } }]);
  return questions;
}

// Helper function: classify custom user answer into category 1,2,3
async function classifyCustomAnswer(userText) {
  try {
    const completion = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `Ти — психологічний помічник.  
            Користувач написав свій варіант відповіді на питання тесту.  
            Визнач, до якої з трьох категорій належить його стан:  
            1 — все добре, позитив, впевненість, енергія  
            2 — невеликі проблеми, легка тривога, іноді втома  
            3 — все погано, сильна тривога, безнадійність, занепад сил  

            Відповідь тільки українською.

            Відповідь ТІЛЬКИ однією цифрою: 1, 2 або 3. Без пояснень.`,
        },
        { role: "user", content: userText },
      ],
      temperature: 0.2,                             // low temperature for precise classification
    });

    const reply = completion.choices[0].message.content.trim();
    const category = parseInt(reply, 10);
    if ([1, 2, 3].includes(category)) return category;
    return 2;                                       // fallback – minor problems
  } catch (err) {
    console.error("DeepSeek classification error:", err);
    return 2;                                       // default to minor problems
  }
}

// Route to get random questions for the test
router.get("/questions", async (req, res) => {
  try{
    const questions = await getRandomQuestions();
    res.json({ questions });
  }catch(err){
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route to process the test answers
router.post("/test", async (req, res) => {
  try {
    const { answers } = req.body;                   // expected array of { answer: number, customText?: string }

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: "Invalid format: expected answers array" });
    }

    let good = 0;                                   // category 1 – everything is fine
    let minor = 0;                                  // category 2 – minor problems
    let bad = 0;                                    // category 3 – everything is bad

    // Process each answer
    for (let i = 0; i < answers.length; i++) {
      const item = answers[i];
      const answerNumber = item.answer;             // 1,2,3 or 4

      if (answerNumber === 1) {
        good++;
      } else if (answerNumber === 2) {
        minor++;
      } else if (answerNumber === 3) {
        bad++;
      } else if (answerNumber === 4) {
        const customText = item.customText || "";
        if (customText.trim()) {
          const category = await classifyCustomAnswer(customText);
          if (category === 1) good++;
          else if (category === 2) minor++;
          else if (category === 3) bad++;
        } else {
          minor++;                                  // empty custom text -> treat as minor
        }
      } else {
        minor++;                                    // unknown answer number -> treat as minor
      }
    }

    const sum = good + minor + bad;
    let percent_good = 0, percent_minor = 0, percent_bad = 0;

    if (sum > 0) {
      percent_good = Math.round((good / sum) * 100);
      percent_minor = Math.round((minor / sum) * 100);
      percent_bad = Math.round((bad / sum) * 100);
    }

    
    // Prepare percentages and corresponding state names
    const items = [
      { name: "все добре", percent: percent_good },
      { name: "невеликі проблеми", percent: percent_minor },
      { name: "все погано", percent: percent_bad }
    ];
    items.sort((a, b) => b.percent - a.percent);
    const primary = items[0];    // max
    const secondary = items[1];   // mid
    const [maxP, midP, minP] = [primary.percent, secondary.percent, items[2].percent];
    const K = maxP * 3 + midP * 2 + minP;

    // Dominant state (for backward compatibility)
    const state = primary.name;

    // 2D recommendations: [primary][secondary][kRange]
    const recommendations2D = {
      "все добре": {
        "невеликі проблеми": {
          200: "У вас гарний фон, але є легка тривога. Зверніть увагу на відпочинок та дихальні практики.",
          220: "Переважно позитивний настрій, однак дрібні турботи іноді заважають. Спробуйте вести щоденник радості.",
          240: "Ви в хорошому ресурсі, але помітна втома чи сумніви. Дозвольте собі паузу та прогулянку на свіжому повітрі.",
          260: "Чудовий стан із легкими коливаннями. Підтримуйте баланс між активністю та релаксацією.",
          280: "Відмінний настрій, майже без нюансів. Діліться енергією з іншими, але не виснажуйте себе."
        },
        "все погано": {
          200: "Ваш стан неоднозначний: є позитив, але й сильний смуток. Важливо не ігнорувати глибокі емоції.",
          220: "Переважає хороший настрій, однак іноді виникає відчай. Поговоріть із близькими про свої почуття.",
          240: "Ви тримаєтесь, але всередині може бути біль. Рекомендуємо звернутися до психолога, щоб розібратися.",
          260: "Нестабільний стан: радість змінюється пригніченням. Професійна підтримка допоможе знайти рівновагу.",
          280: "Коливання від підйому до спаду дуже різкі. Не зволікайте – зверніться до фахівця."
        }
      },
      "невеликі проблеми": {
        "все добре": {
          200: "Легка тривога при загальному позитиві. Додайте маленькі ритуали заспокоєння (чай, музика).",
          220: "Переважно спокій, але іноді скутість. Спробуйте техніки заземлення та глибокого дихання.",
          240: "Хороший фон, проте напруга накопичується. Відпочивайте свідомо, вимикайте сповіщення.",
          260: "Ви майже в рівновазі, але дрібниці виводять із себе. Практикуйте усвідомленість.",
          280: "Легкі коливання настрою не заважають жити. Продовжуйте дбати про себе та радіти дрібницям."
        },
        "все погано": {
          200: "Відчуття, що ви застрягли між тривогою та апатією. Почніть із малого: 5 хвилин спокійного дихання.",
          220: "Помітний дискомфорт, але є ресурс. Зверніться до психолога, щоб отримати інструменти підтримки.",
          240: "Стан нестійкий: то легка тривога, то відчай. Не залишайтесь наодинці, зателефонуйте на лінію допомоги.",
          260: "Переважають проблеми, але ви ще можете вплинути. Важливо отримати професійну консультацію.",
          280: "Критична межа: тривога межує з депресією. Негайно зверніться до психотерапевта."
        }
      },
      "все погано": {
        "все добре": {
          200: "Парадоксальний стан: на фоні відчаю є проблиски надії. Шукайте підтримку в близьких або спеціалістів.",
          220: "Ви переживаєте складний період, але зберігаєте іскру. Це добре – вчіться спиратися на неї.",
          240: "Депресивні епізоди змінюються відносним спокоєм. Ведіть щоденник настрою та зверніться до лікаря.",
          260: "Стан важкий, але ви знаєте, що таке радість. Це ресурс для зцілення – використовуйте його.",
          280: "Різкі перепади від розпачу до ейфорії. Терміново проконсультуйтеся з психіатром."
        },
        "невеликі проблеми": {
          200: "Ви відчуваєте безнадію, але є ознаки легкої тривоги – це не дає вам завмерти. Зверніться по допомогу.",
          220: "Пригніченість домінує, однак ви помічаєте свої емоції. Це перший крок до полегшення.",
          240: "Сильний смуток, іноді з напругою. Не зволікайте – зателефонуйте на лінію психологічної підтримки.",
          260: "Ви майже втратили сили, але ще можете реагувати на подразники. Професійна допомога потрібна негайно.",
          280: "Критичний стан із елементами тривоги. Негайно зверніться до лікаря або кризового центру."
        }
      }
    };

    // Round K to nearest 20 and clamp
    let kRange = Math.floor(K / 20) * 20;
    if (kRange < 200) kRange = 200;
    if (kRange > 280) kRange = 280;

    // Get recommendation using primary and secondary states
    let recommendation = recommendations2D[primary.name]?.[secondary.name]?.[kRange];
    if (!recommendation) {
      // Fallback to general advice based on primary state only
      const fallbacks = {
        "все добре": "Ви в хорошому ресурсі. Підтримуйте режим, спілкуйтесь із близькими.",
        "невеликі проблеми": "У вас є труднощі, але вони вирішувані. Спробуйте більше відпочивати та не тримати емоції в собі.",
        "все погано": "Ваш стан викликає занепокоєння. Не відкладайте візит до психотерапевта або зателефонуйте на лінію підтримки."
      };
      recommendation = fallbacks[primary.name] || "Бережіть себе. Якщо потрібна підтримка, зверніться до психолога.";
    }

    res.json({
      state,
      scores: { good, minor, bad },
      percentages: { good: percent_good, minor: percent_minor, bad: percent_bad },
      coefficient: K,    
      recommendation,
    });
    } catch (err) {
      console.error("Test processing error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
});



router.post("/", async (req, res) => {
  try {
    const message = req.body.message;
    console.log("Отримано:", message);

    let userText = message
      .replace("Проаналізуй настрій за повідомленням: ", "")
      .replace("Проаналізуй мій настрій: ", "");

    const completion = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `
              Ти дружній психолог.
              Проаналізуй настрій людини.

              Відповідай СТРОГО у форматі:

              🔍 Аналіз настрою: (коротко)
              💡 Порада: (1-2 речення підтримки)

              Мова: українська.
`
        },
        {
          role: "user",
          content: userText
        }
      ],
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content;

    res.json({ reply });

  } catch (err) {
    console.error("DeepSeek error:", err);
    res.status(500).json({ reply: "Помилка ШІ 😢" });
  }
});

/*
router.post("/", async (req, res) => {
  const message = req.body.message;
  console.log("Отримано:", message);
  
  // Забираємо префікс
  let userText = message.replace("Проаналізуй настрій за повідомленням: ", "");
  userText = userText.replace("Проаналізуй мій настрій: ", "");
  
  // Словник для аналізу настрою
  const moods = {
    "чудово": { mood: "чудовий настрій 😊", advice: "Це прекрасно! Насолоджуйся моментом і поділись позитивом з друзями! ✨" },
    "добре": { mood: "хороший настрій 👍", advice: "Чудово! Продовжуй в тому ж дусі! 🌟" },
    "супер": { mood: "супер настрій 🤩", advice: "Вау! Ти на піку! Зроби щось особливе сьогодні! 🎉" },
    "клас": { mood: "класний настрій 😎", advice: "Круто! Енергія б'є через край! 🔥" },
    "погано": { mood: "поганий настрій 😔", advice: "Тримайся! Завтра новий день. Поговори з близькими 💙" },
    "сумно": { mood: "сумний настрій 😢", advice: "Обіймаю! Подивись улюблений фільм або послухай музику 🎵" },
    "втом": { mood: "втомлений стан 😴", advice: "Відпочинь! Ти заслуговуєш на перерву. Ляж спати раніше 🛌" },
    "злий": { mood: "злий настрій 😠", advice: "Глибоко вдихни... Візьми паузу, заспокойся 🧘" },
    "рад": { mood: "радісний настрій 🥰", advice: "Яка чудова емоція! Насолоджуйся цим моментом 💫" },
    "стрес": { mood: "стресовий стан 😰", advice: "Зроби перерву, вийди на свіже повітря, випий води 🚶" }
  };
  
  // Пошук настрою
  let result = { 
    mood: "нейтральний 😐", 
    advice: "Розкажи детальніше про свій стан, і я дам кращу пораду! 💫" 
  };
  
  for (const [key, value] of Object.entries(moods)) {
    if (userText.toLowerCase().includes(key)) {
      result = value;
      break;
    }
  }
  
  // Відповідь для "привіт" та інших привітань
  if (userText.match(/привіт|здоров|hello|hi/i)) {
    result = { 
      mood: "дружній настрій 👋", 
      advice: "Привіт! Розкажи, як твої справи? Який у тебе настрій сьогодні?" 
    };
  }
  
  const reply = `🔍 **Аналіз настрою:** ${result.mood}\n\n💡 **Порада:** ${result.advice}\n\n---\n💬 *Я тут, щоб підтримати тебе!*`;
  
  res.json({ reply });
});
*/
module.exports = router;
