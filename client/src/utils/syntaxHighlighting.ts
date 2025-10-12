import hljs from "highlight.js/lib/common";
import "highlight.js/styles/github-dark.css";

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const addLineNumbers = (html: string): string => {
  const lines = html.split("\n");
  const lineNumberWidth = lines.length.toString().length;

  return lines
    .map((line, index) => {
      const lineNumber = (index + 1).toString().padStart(lineNumberWidth, " ");
      return `<span class="line-number">${lineNumber}</span>${line}`;
    })
    .join("\n");
};

export type HighlightResult = {
  html: string;
  language: string | null;
};

export const highlightCode = (
  content: string,
  language?: string | null,
): HighlightResult => {
  try {
    let htmlContent: string;
    let detectedLanguage: string | null;

    if (language && hljs.getLanguage(language) !== undefined) {
      const result = hljs.highlight(content, {
        language,
        ignoreIllegals: true,
      });
      htmlContent = result.value;
      detectedLanguage = result.language ?? language ?? null;
    } else {
      const result = hljs.highlightAuto(content);
      htmlContent = result.value;
      detectedLanguage = result.language ?? null;
    }

    return {
      html: addLineNumbers(htmlContent),
      language: detectedLanguage,
    };
  } catch {
    return {
      html: addLineNumbers(escapeHtml(content)),
      language: language ?? null,
    };
  }
};
