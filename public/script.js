// API helper
async function api(url, options = {}) {
    try {
        const res = await fetch(url, {
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },
            ...options
        });

        let data = {};
        try {
            data = await res.json();
        } catch {}

        return { ok: res.ok, status: res.status, data };
    } catch (err) {
        return { ok: false, status: 500, data: { message: "Network error" } };
    }
}


async function checkAuth() {
    const res = await api("/api/auth/me");
    if (!res.ok) return null;
    return res.data;
}

// Logout helper
async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
}

// Page logic
(async () => {
    const path = window.location.pathname;
    const user = await checkAuth();

    // Адмінські сторінки (захист)
    const adminPages = ["add_question.html", "add_article.html", "add_advice.html", "root_menu.html"];
    const isAdminPage = adminPages.some(p => path.includes(p));

    // Якщо сторінка для адміна, але користувач не адмін — перенаправити
    if (isAdminPage && (!user || user.role !== "admin")) {
        window.location.href = "/user.html";
        return;
    }

    // ===== Home page =====
    if (path === "/" || path.endsWith("index.html")) {
        if (user) {
            window.location.href = "/user.html";
        }
    }

    // ===== User page =====
    if (path.endsWith("user.html")) {
        if (!user) {
            window.location.href = "/login.html";
            return;
        }
        const nameEl = document.getElementById("user-name");
        const emailEl = document.getElementById("user-email");
        if (nameEl) nameEl.innerText = user.name;
        if (emailEl) emailEl.innerText = user.email;
        
        initChat();
    }

    // ===== Login page (redirect if already logged in) =====
    if (path.endsWith("login.html") && user) {
        window.location.href = "/user.html";
    }

    // ===== Register page (redirect if already logged in) =====
    if (path.endsWith("register.html") && user) {
        window.location.href = "/user.html";
    }
})();

// Registration
const formRegister = document.getElementById("form-register");
if (formRegister) {
    formRegister.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("name")?.value;
        const email = document.getElementById("email")?.value;
        const password = document.getElementById("password")?.value;
        const msgElement = document.getElementById("msg-register");

        if (!name || !email || !password) {
            if (msgElement) msgElement.innerText = "Заполните все поля";
            return;
        }

        const res = await api("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({ name, email, password })
        });

        if (msgElement) msgElement.innerText = res.data.message || (res.ok ? "Успешно!" : "Ошибка");

        if (res.ok) {
            setTimeout(() => {
                window.location.href = "/login.html";
            }, 1000);
        }
    });
}

// Login
const formLogin = document.getElementById("form-login");
if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email-login")?.value;
        const password = document.getElementById("password-login")?.value;
        const msgElement = document.getElementById("msg-login");

        if (!email || !password) {
            if (msgElement) msgElement.innerText = "Введите email и пароль";
            return;
        }

        const res = await api("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });

        if (res.ok) {
            const meRes = await api("/api/auth/me");
            if (meRes.ok && meRes.data.role === "admin") {
                window.location.href = "/root_menu.html";
            } else {
                window.location.href = "/user.html";
            }
        } else {
            if (msgElement) msgElement.innerText = res.data.message || "Ошибка входа";
        }
    });
}

// Logout
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await logout();
    });
}

// ===== Функція відправки повідомлення =====
async function sendMessage(text) {
    const developerPrefix = "Проаналізуй настрій за повідомленням: ";
    const fullMessage = developerPrefix + text;

    const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: fullMessage })
    });

    const data = await res.json();
    return data.reply;
}

// ===== Чат з DeepSeek =====
function initChat() {
    const questionInput = document.getElementById('question');
    const chatArea = document.getElementById('chat');
    const askBtn = document.getElementById('ask-btn');

    if (!questionInput || !chatArea || !askBtn) {
        console.log('Елементи чату не знайдені');
        return;
    }

    askBtn.addEventListener('click', async () => {
        const text = questionInput.value.trim();
        if (!text) return;
        
        chatArea.value = '🤔 Запит до DeepSeek...';
        
        const reply = await sendMessage(text);
        
        chatArea.value = reply;
        questionInput.value = '';
    });

    questionInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') askBtn.click();
    });
    
    console.log('Чат ініціалізовано!');
}

// Адмінські форми додавання (існують тільки на відповідних сторінках)
const questionForm = document.getElementById("questionForm");
if (questionForm) {
    questionForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = questionForm.querySelector("[name='question']").value;
        const answers = [
            questionForm.querySelector("[name='answer1']").value,
            questionForm.querySelector("[name='answer2']").value,
            questionForm.querySelector("[name='answer3']").value
        ].filter(a => a.trim());
        const res = await api("/api/save/addQuestion", {
            method: "POST",
            body: JSON.stringify({ question: title, answers })
        });
        alert(res.data.message || "Done");
    });
}

const adviceForm = document.getElementById("adviceForm");
if (adviceForm) {
    adviceForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = adviceForm.querySelector("[name='title']").value;
        const text = adviceForm.querySelector("[name='advice']").value;
        const res = await api("/api/save/addAdvice", {
            method: "POST",
            body: JSON.stringify({ title, text })
        });
        alert(res.data.message || "Done");
    });
}

const articleForm = document.getElementById("articleForm");
if (articleForm) {
    articleForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = articleForm.querySelector("[name='title']").value;
        const text = articleForm.querySelector("[name='article']").value;
        const res = await api("/api/save/addArticle", {
            method: "POST",
            body: JSON.stringify({ title, text })
        });
        alert(res.data.message || "Done");
    });
}