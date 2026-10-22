console.log("Clearn Sync: content script activo.");

const sanitize = (value, fallback = "Sin_Nombre") => {
    const cleaned = (value || "").replace(/[\/\\?%*:|"<>]/g, "").replace(/\s+/g, " ").trim();
    return cleaned || fallback;
};

const getText = (element) => (element?.innerText || element?.textContent || "").replace(/\s+/g, " ").trim();

const isVisible = (element) => Boolean(element && element.getClientRects().length && getComputedStyle(element).visibility !== "hidden");

const getBreadcrumbItems = () => {
    const containers = Array.from(document.querySelectorAll(
        "[aria-label*='breadcrumb' i], [data-testid*='breadcrumb' i], nav ol, nav[aria-label] ol"
    )).filter(isVisible);
    const container = containers.sort((a, b) => getText(b).length - getText(a).length)[0];
    if (!container) return [];

    const items = Array.from(container.querySelectorAll("li, a, [aria-current='page']"))
        .map(getText)
        .filter((text, index, list) => text && list.indexOf(text) === index);
    return items.length ? items : [getText(container)].filter(Boolean);
};

const getQuestionTitle = () => {
    const activeItems = Array.from(document.querySelectorAll(
        "[aria-current='page'], [aria-current='step'], aside [class*='active'], aside [class*='selected']"
    )).filter(isVisible);
    const headings = Array.from(document.querySelectorAll("main h1, main h2, h1, h2"))
        .filter(isVisible)
        .map(getText)
        .filter(Boolean);
    const heading = headings.find((text) => /^pregunta\s+\d+/i.test(text)) || headings[0] || "";
    const activeLabels = activeItems.map(getText).filter(Boolean);
    const navigationLabels = Array.from(document.querySelectorAll("aside a, aside button, nav a, nav button"))
        .filter(isVisible)
        .map(getText)
        .filter((text) => /(?:pregunta|problema)\s*\d+/i.test(text));
    const numberPattern = /(?:pregunta|problema)\s*\d+/ig;
    const getBestQuestionNumber = (labels) => labels
        .flatMap((label) => Array.from(label.matchAll(numberPattern), (match) => match[0]))
        .sort((a, b) => b.match(/\d+/)[0].length - a.match(/\d+/)[0].length)[0];
    const questionNumber = getBestQuestionNumber(activeLabels)
        || getBestQuestionNumber([...navigationLabels, heading]);

    if (questionNumber) return questionNumber.replace(/^(pregunta|problema)/i, "Pregunta");
    return heading || activeLabels[0] || "Pregunta";
};

const getMainEditorCode = () => {
    const editors = Array.from(document.querySelectorAll(".monaco-editor"))
        .filter((editor) => isVisible(editor) && !editor.closest("[aria-label*='output' i], [data-testid*='output' i]"));
    const mainEditor = editors.sort((a, b) => {
        const area = (element) => element.getBoundingClientRect().width * element.getBoundingClientRect().height;
        return area(b) - area(a);
    })[0];
    if (!mainEditor) return "";

    const lines = Array.from(mainEditor.querySelectorAll(".view-lines .view-line"));
    return lines.map((line) => line.innerText || line.textContent || "").join("\n").replace(/\u00a0/g, " ").trimEnd();
};

const getQuestionDescription = () => {
    const selectors = [
        "[data-testid*='description' i]",
        "[class*='question-description' i]",
        "[class*='prose']",
        "[class*='markdown']",
        "article",
        "[role='complementary']"
    ];
    const candidates = Array.from(document.querySelectorAll(selectors.join(", ")))
        .filter((element) => isVisible(element) && !element.closest(".monaco-editor") && !element.querySelector(".monaco-editor"));
    const description = candidates
        .map((element) => ({ element, text: getText(element) }))
        .filter(({ text }) => text.length > 40)
        .sort((a, b) => b.text.length - a.text.length)[0];
    return description?.text || "";
};

const collectPageData = () => {
    const breadcrumbs = getBreadcrumbItems();
    const questionTitle = getQuestionTitle();
    const evaluation = [...breadcrumbs].reverse().find((item) =>
        item && item !== questionTitle && !/^pregunta\s+\d+/i.test(item)
    );

    return {
        courseName: "Introduccion a la Programacion",
        evaluationTitle: sanitize(evaluation, "Evaluacion"),
        questionTitle: sanitize(questionTitle, "Pregunta"),
        questionDescription: getQuestionDescription(),
        code: getMainEditorCode()
    };
};

const syncCurrentPage = async () => {
    const payload = collectPageData();
    if (!payload.code) {
        return { ok: false, error: "No se encontró código visible en el editor." };
    }

    await browser.runtime.sendMessage({ type: "SYNC_TO_GITHUB", payload });
    return { ok: true };
};

browser.runtime.onMessage.addListener((message) => {
    if (message?.type === "SYNC_CURRENT_PAGE") return syncCurrentPage();
});

