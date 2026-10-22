browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SYNC_TO_GITHUB") {
        return syncToGitHub(message.payload);
    }
});

async function syncToGitHub(payload) {
    const config = await browser.storage.local.get(["githubToken", "repoName"]);
    if (!config.githubToken || !config.repoName) {
        throw new Error("Configura el token y el repositorio antes de sincronizar.");
    }

    const { courseName, evaluationTitle, questionTitle, questionDescription, code } = payload;
    const folderPath = `${courseName}/${evaluationTitle}/${questionTitle}`;

    console.log("🚀 Sincronizando en la ruta de GitHub:", folderPath);

    // 1. Subir README.md (Enunciado)
    if (questionDescription) {
        await uploadFile(config.githubToken, config.repoName, `${folderPath}/README.md`, questionDescription, "Actualizar enunciado README.md");
    }

    // 2. Subir solution.py (Código)
    if (code) {
        await uploadFile(config.githubToken, config.repoName, `${folderPath}/solution.py`, code, "Actualizar código solution.py");
    }

    return { ok: true };
}

async function uploadFile(token, repo, path, content, commitMessage) {
    const url = `https://api.github.com/repos/${repo}/contents/${path}`;
    
    let sha = null;
    try {
        const checkRes = await fetch(url, {
            headers: { 
                "Authorization": `Bearer ${token}`,
                "Accept": "application/vnd.github+json"
            }
        });
        if (checkRes.ok) {
            const data = await checkRes.json();
            sha = data.sha;
        }
    } catch (e) {}

    // Codificación segura en Base64 compatible con caracteres especiales (tildes, emojis)
    const utf8Bytes = new TextEncoder().encode(content);
    let binary = '';
    utf8Bytes.forEach(b => binary += String.fromCharCode(b));
    const base64Content = btoa(binary);

    const body = {
        message: commitMessage,
        content: base64Content
    };
    if (sha) body.sha = sha;

    const res = await fetch(url, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    if (res.ok) {
        console.log("✅ ¡Archivos sincronizados con éxito en GitHub!", path);
    } else {
        const errText = await res.text();
        console.error("❌ Error de GitHub:", res.status, errText);
        throw new Error(`GitHub respondió ${res.status}: ${errText}`);
    }
}