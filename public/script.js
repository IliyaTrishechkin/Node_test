// ===== Проверка авторизации на главной странице =====
if (window.location.pathname === "/" || window.location.pathname === "/index.html") {
    fetch("/api/auth/me", { credentials: "include" })
        .then(res => {
            if (res.ok) {
                // Есть токен → сразу на кабинет
                window.location.href = "/user.html";
            }
            // Нет токена → остаёмся на главной
        })
        .catch(() => {
            // Ошибка → остаёмся на главной
        });
}


// ===== Проверка авторизации =====
async function checkAuth(redirectIfNot = true) {
    try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) throw new Error("Не авторизован");
        const user = await res.json();
        return user;
    } catch {
        if (redirectIfNot) window.location.href = "/login.html";
        return null;
    }
}

// ===== Для user.html =====
if (window.location.pathname.endsWith("user.html")) {
    checkAuth().then(user => {
        if (user) {
            document.getElementById("user-name").innerText = user.name;
            document.getElementById("user-email").innerText = user.email;
        }
    });
}

// ===== Регистрация =====
const formRegister = document.getElementById("form-register");
if (formRegister) {
    formRegister.addEventListener("submit", async e => {
        e.preventDefault();
        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password })
            });

            const data = await res.json();
            document.getElementById("msg-register").innerText = data.message;

            if (res.ok) setTimeout(() => window.location.href = "/login.html", 1000);
        } catch {
            document.getElementById("msg-register").innerText = "Ошибка сети";
        }
    });
}

// ===== Вход =====
const formLogin = document.getElementById("form-login");
if (formLogin) {
    formLogin.addEventListener("submit", async e => {
        e.preventDefault();
        const email = document.getElementById("email-login").value;
        const password = document.getElementById("password-login").value;

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            document.getElementById("msg-login").innerText = data.message;

            if (res.ok) setTimeout(() => window.location.href = "/user.html", 500);
        } catch {
            document.getElementById("msg-login").innerText = "Ошибка сети";
        }
    });
}

// ===== Выход =====
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        window.location.href = "/login.html";
    });
}
