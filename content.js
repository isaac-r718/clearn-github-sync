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
        "[aria-current='page'], [aria-current='step'], aside [aria-selected='true'], aside [aria-pressed='true'], aside [data-state='active'], aside [class~='active'], aside [class~='selected']"
    )).filter(isVisible);
    const headings = Array.from(document.querySelectorAll("main h1, main h2, main h3, h1, h2, h3"))
        .filter(isVisible)
        .map(getText)
        .filter(Boolean);
    const heading = headings.find((text) => /^pregunta\s+\d+/i.test(text)) || headings[0] || "";
    const activeLabels = activeItems.map(getText).filter((label) => {
        const matches = label.match(/(?:pregunta|problema)\s*\d+/ig) || [];
        return matches.length === 1;
    });
    const activeQuestion = activeLabels
        .filter((label) => /(?:pregunta|problema)\s*\d+/i.test(label))
        .sort((a, b) => a.length - b.length)[0];

    const normalizePath = (path) => path.replace(/\/+$/, "") || "/";
    const currentPath = normalizePath(location.pathname);
    const routeLabels = Array.from(document.querySelectorAll("aside a[href], nav a[href]"))
        .filter(isVisible)
        .filter((link) => {
            try {
                const url = new URL(link.href, location.href);
                return url.origin === location.origin && normalizePath(url.pathname) === currentPath;
            } catch (error) {
                return false;
            }
        })
        .map(getText)
        .filter((label) => /(?:pregunta|problema)\s*\d+/i.test(label));

    const questionNumber = activeQuestion?.match(/(?:pregunta|problema)\s*(\d+)/i)?.[1]
        || routeLabels.sort((a, b) => a.length - b.length)[0]?.match(/(?:pregunta|problema)\s*(\d+)/i)?.[1]
        || heading.match(/(?:pregunta|problema)\s*(\d+)/i)?.[1]
        || location.pathname.match(/\/(?:preguntas?|problems?)\/(\d+)(?:\/|$)/i)?.[1];

    return questionNumber ? `Pregunta ${questionNumber}` : "";
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

const descriptionToMarkdown = (root) => {
    const renderChildren = (element, omittedChild) => Array.from(element.childNodes)
        .filter((child) => child !== omittedChild)
        .map(renderNode)
        .join("");
    const renderLabeledBlock = (label, body) => {
        const content = body.trim().replace(/^:\s*/, "");
        if (/^ejemplo$/i.test(label)) {
            const quoted = content ? `\n> ${content.replace(/\n/g, "\n> ")}` : "";
            return `\n\n> **Ejemplo**${quoted}\n\n`;
        }
        return `\n\n## ${label.trim().replace(/:$/, "")}\n\n${content}\n\n`;
    };
    const labelPattern = /^(objetivo|ejemplo|descripci[oó]n|entrada|salida|formato de entrada|formato de salida|restricciones|consideraciones|observaciones)\s*:?\s*$/i;

    const renderParagraph = (element) => {
        const firstElement = Array.from(element.children).find((child) => child.matches("strong, b"));
        const strongLabel = firstElement && labelPattern.exec(getText(firstElement));
        if (strongLabel) {
            return renderLabeledBlock(strongLabel[1], renderChildren(element, firstElement));
        }

        const firstText = Array.from(element.childNodes).find((child) => child.nodeType === Node.TEXT_NODE && child.nodeValue.trim());
        const textLabel = firstText && /^(\s*)(objetivo|ejemplo|descripci[oó]n|entrada|salida|formato de entrada|formato de salida|restricciones|consideraciones|observaciones)\s*:\s*/i.exec(firstText.nodeValue);
        if (textLabel) {
            const remainingText = firstText.nodeValue.replace(textLabel[0], "");
            const body = remainingText + renderChildren(element, firstText);
            return renderLabeledBlock(textLabel[2], body);
        }

        return `\n\n${renderChildren(element).trim()}\n\n`;
    };

    const renderNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) return node.nodeValue.replace(/\s+/g, " ");
        if (node.nodeType !== Node.ELEMENT_NODE) return "";

        const tag = node.tagName.toLowerCase();
        const content = renderChildren(node);
        if (/^h[1-6]$/.test(tag)) {
            const level = Number(tag[1]);
            const headingText = content.trim();
            if (tag === "h3" && /^ejemplo(?:\s+\d+)?$/i.test(headingText)) {
                return `\n\n> **${headingText}**\n\n`;
            }
            return `\n\n${"#".repeat(level)} ${headingText}\n\n`;
        }
        if (tag === "p") return renderParagraph(node);
        if (tag === "pre") return `\n\n\`\`\`\n${node.textContent.trim()}\n\`\`\`\n\n`;
        if (tag === "strong" || tag === "b") return `**${content.trim()}**`;
        if (tag === "em" || tag === "i") return `*${content.trim()}*`;
        if (tag === "code") return `\`${content.trim()}\``;
        if (tag === "br") return "\n";
        if (tag === "hr") return "\n\n---\n\n";
        if (tag === "blockquote") return `\n\n> ${content.trim().replace(/\n/g, "\n> ")}\n\n`;
        if (tag === "ul" || tag === "ol") {
            const items = Array.from(node.children).filter((child) => child.tagName.toLowerCase() === "li");
            return `\n\n${items.map((item, index) => {
                const marker = tag === "ol" ? `${index + 1}.` : "-";
                return `${marker} ${renderChildren(item).trim()}`;
            }).join("\n")}\n\n`;
        }
        if (tag === "li") return content.trim();
        if (tag === "img") return node.alt ? `![${node.alt}](${node.src})` : "";
        if (["div", "section", "article", "main"].includes(tag)) return `\n\n${content}\n\n`;
        return content;
    };

    return renderNode(root)
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
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
    return description ? descriptionToMarkdown(description.element) : "";
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
    if (!/^Pregunta \d+$/.test(payload.questionTitle)) {
        return { ok: false, error: "No se pudo identificar la pregunta activa. No se subió nada para evitar sobrescribir otra carpeta." };
    }
    if (!payload.code) {
        return { ok: false, error: "No se encontró código visible en el editor." };
    }

    await browser.runtime.sendMessage({ type: "SYNC_TO_GITHUB", payload });
    return { ok: true };
};

browser.runtime.onMessage.addListener((message) => {
    if (message?.type === "SYNC_CURRENT_PAGE") return syncCurrentPage();
});

