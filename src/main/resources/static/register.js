const form = document.getElementById("register-form");
const message = document.getElementById("auth-message");
const submitButton = form.querySelector("button[type=submit]");

function showMessage(text, kind) {
    message.textContent = text;
    message.className = "auth-message " + (kind === "success" ? "is-success" : "is-error");
}

function readCookie(name) {
    const prefix = name + "=";
    const item = document.cookie.split("; ").find(value => value.startsWith(prefix));
    return item ? decodeURIComponent(item.substring(prefix.length)) : null;
}

async function prepareCsrf() {
    const response = await fetch("/api/auth/csrf", { credentials: "same-origin" });
    if (!response.ok) throw new Error("Não foi possível iniciar a proteção do formulário.");
    await response.json();
}

form.addEventListener("submit", async event => {
    event.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const confirmation = document.getElementById("password-confirm").value;

    if (password !== confirmation) {
        showMessage("As senhas não coincidem.", "error");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Criando conta…";

    try {
        await prepareCsrf();
        const csrf = readCookie("XSRF-TOKEN");
        if (!csrf) throw new Error("Não foi possível preparar a proteção CSRF. Atualize a página.");

        const response = await fetch("/api/auth/register", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                "X-XSRF-TOKEN": csrf
            },
            body: JSON.stringify({ username, password })
        });

        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(body.detail || body.message || body.title || "Não foi possível criar a conta com esses dados.");
        }

        showMessage("Conta criada! Redirecionando para entrar…", "success");
        setTimeout(() => window.location.assign("/login.html"), 1200);
    } catch (error) {
        showMessage(error.message || "Ocorreu um erro. Tente novamente.", "error");
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Criar conta <span aria-hidden="true">→</span>';
    }
});

prepareCsrf().catch(error => showMessage(error.message, "error"));
