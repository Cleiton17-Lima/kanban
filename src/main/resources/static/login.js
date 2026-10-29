const message = document.getElementById("auth-message");

async function prepareCsrf() {
    const response = await fetch("/api/auth/csrf", { credentials: "same-origin" });
    if (!response.ok) throw new Error("Não foi possível iniciar a sessão segura.");
    const data = await response.json();
    document.getElementById("csrf-token").value = data.token;
}

const params = new URLSearchParams(window.location.search);
if (params.has("error")) {
    message.textContent = "Usuário ou senha inválidos. Confira os dados e tente novamente.";
    message.classList.add("is-error");
} else if (params.has("logout")) {
    message.textContent = "Você saiu da sua conta com segurança.";
    message.classList.add("is-success");
}

prepareCsrf().catch(() => {
    message.textContent = "Não foi possível preparar o formulário seguro. Atualize a página.";
    message.classList.add("is-error");
    document.querySelector(".auth-submit").disabled = true;
});
