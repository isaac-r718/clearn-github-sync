document.getElementById("save").addEventListener("click", () => {
    const githubToken = document.getElementById("token").value.trim();
    const repoName = document.getElementById("repo").value.trim();

    browser.storage.local.set({ githubToken, repoName }).then(() => {
        const status = document.getElementById("status");
        status.style.color = "green";
        status.textContent = "¡Configuración guardada!";
        setTimeout(() => status.textContent = "", 2000);
    });
});

document.getElementById("test").addEventListener("click", async () => {
    const status = document.getElementById("status");
    status.style.color = "black";
    status.textContent = "Probando conexión...";

    const { githubToken, repoName } = await browser.storage.local.get(["githubToken", "repoName"]);
    if (!githubToken || !repoName) {
        status.style.color = "red";
        status.textContent = "Completa los campos primero.";
        return;
    }

    try {
        const res = await fetch(`https://api.github.com/repos/${repoName}`, {
            headers: { "Authorization": `Bearer ${githubToken}` }
        });
        if (res.ok) {
            status.style.color = "green";
            status.textContent = "✅ Conexión con GitHub exitosa";
        } else {
            status.style.color = "red";
            status.textContent = `❌ Error ${res.status}: Revisa token/repo`;
        }
    } catch (e) {
        status.style.color = "red";
        status.textContent = "Error de red al conectar a GitHub.";
    }
});

document.getElementById("sync").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const status = document.getElementById("status");
    button.disabled = true;
    status.style.color = "black";
    status.textContent = "Leyendo el ejercicio actual...";

    try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) throw new Error("No se encontró una pestaña activa.");

        const result = await browser.tabs.sendMessage(tab.id, { type: "SYNC_CURRENT_PAGE" });
        if (!result?.ok) throw new Error(result?.error || "No se pudo leer el ejercicio.");

        status.style.color = "green";
        status.textContent = "Ejercicio sincronizado con GitHub.";
    } catch (error) {
        status.style.color = "red";
        status.textContent = error.message || "No se pudo sincronizar. Abre un ejercicio de Clearn.";
    } finally {
        button.disabled = false;
    }
});

browser.storage.local.get(["githubToken", "repoName"]).then((result) => {
    if (result.githubToken) document.getElementById("token").value = result.githubToken;
    if (result.repoName) document.getElementById("repo").value = result.repoName;
});