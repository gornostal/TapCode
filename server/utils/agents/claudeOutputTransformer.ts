import type { StdoutTransformer } from "../../services/commandRunnerService";
import type { CommandOutput } from "../../../shared/commandRunner";

type ClaudeStreamEvent =
  | {
      type: "assistant";
      message?: {
        content?: unknown;
      };
    }
  | {
      type: "user";
      message?: {
        content?: unknown;
      };
    }
  | {
      type: "result";
      is_error?: boolean;
      result?: unknown;
    }
  | {
      type: "system";
    };

type PendingTool = {
  name: string;
};

const MAX_PREVIEW_LENGTH = 200;

const formatSection = (title: string, body: string): string => {
  const sanitizedBody = normalizeLineEndings(body).trimEnd();
  return `${title}:\n${sanitizedBody}\n\n`;
};

const normalizeLineEndings = (value: string): string =>
  value.replace(/\r\n/g, "\n");

const extractToolResultContent = (content: unknown): string => {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (
          item &&
          typeof item === "object" &&
          typeof (item as { text?: unknown }).text === "string"
        ) {
          return (item as { text: string }).text;
        }
        return "";
      })
      .join("");
  }

  return "";
};

const truncatePreview = (value: string): string => {
  const collapsed = value.replace(/\s+/g, " ").trim();
  if (!collapsed) {
    return "(no output)";
  }
  if (collapsed.length <= MAX_PREVIEW_LENGTH) {
    return collapsed;
  }
  return `${collapsed.slice(0, MAX_PREVIEW_LENGTH).trimEnd()}...`;
};

const toStringResult = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  if (value instanceof Error) {
    return value.message || value.toString();
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return Object.prototype.toString.call(value);
  }
};

export const createClaudeStdoutTransformer = (): StdoutTransformer => {
  let buffer = "";
  const pendingTools = new Map<string, PendingTool>();

  const flushAssistantTexts = (
    texts: string[],
    push: (output: CommandOutput) => void,
  ) => {
    if (texts.length === 0) {
      return;
    }
    const combined = texts.join("\n\n");
    push({
      type: "stdout",
      data: formatSection("Assistant", combined),
    });
    texts.length = 0;
  };

  const handleEvent = (
    event: ClaudeStreamEvent,
    push: (output: CommandOutput) => void,
  ) => {
    switch (event.type) {
      case "assistant": {
        const content = event.message?.content;
        if (!content) {
          return;
        }
        if (typeof content === "string") {
          const trimmed = content.trim();
          if (trimmed) {
            push({
              type: "stdout",
              data: formatSection("Assistant", trimmed),
            });
          }
          return;
        }

        if (!Array.isArray(content)) {
          return;
        }

        const textBuffer: string[] = [];

        for (const rawItem of content) {
          if (!rawItem || typeof rawItem !== "object") {
            continue;
          }
          const item = rawItem as Record<string, unknown>;
          const type = (() => {
            const value = (item as { type?: unknown }).type;
            return typeof value === "string" ? value : undefined;
          })();

          if (type === "text") {
            const textValue = (item as { text?: unknown }).text;
            if (typeof textValue === "string") {
              textBuffer.push(textValue);
            }
            continue;
          }

          if (type === "tool_use") {
            flushAssistantTexts(textBuffer, push);
            const id = (item as { id?: unknown }).id;
            const name = (item as { name?: unknown }).name;
            if (typeof id === "string" && typeof name === "string") {
              pendingTools.set(id, { name });
            }
          }
        }

        flushAssistantTexts(textBuffer, push);
        return;
      }

      case "user": {
        const content = event.message?.content;
        if (!content) {
          return;
        }
        if (typeof content === "string") {
          return;
        }
        if (!Array.isArray(content)) {
          return;
        }

        for (const rawItem of content) {
          if (!rawItem || typeof rawItem !== "object") {
            continue;
          }
          const item = rawItem as Record<string, unknown>;
          const typeValue = (item as { type?: unknown }).type;
          if (typeValue !== "tool_result") {
            continue;
          }
          const toolUseId = (item as { tool_use_id?: unknown }).tool_use_id;
          if (typeof toolUseId !== "string") {
            continue;
          }

          const tool = pendingTools.get(toolUseId);
          const toolName = tool?.name ?? "Tool";
          const toolContent = extractToolResultContent(
            (item as { content?: unknown }).content,
          );
          const preview = truncatePreview(toolContent);

          const toolSection = formatSection("Tool", `${toolName} — ${preview}`);
          const resultSection = formatSection("Tool Result", toolContent);

          push({
            type: "stdout",
            data: toolSection + resultSection,
          });
          pendingTools.delete(toolUseId);
        }
        return;
      }

      case "result": {
        const icon = event.is_error ? "❌" : "✅";
        const resultText = toStringResult(event.result);
        push({
          type: "stdout",
          data: formatSection(`${icon} Result`, resultText),
        });
        return;
      }

      default:
        return;
    }
  };

  return {
    handleChunk: (chunk, push) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) {
          continue;
        }

        try {
          const event = JSON.parse(line) as ClaudeStreamEvent;
          handleEvent(event, push);
        } catch {
          // Ignore parse errors for individual lines; they may be partial or irrelevant.
        }
      }
    },

    finalize: (push) => {
      const remaining = buffer.trim();
      if (!remaining) {
        return;
      }
      try {
        const event = JSON.parse(remaining) as ClaudeStreamEvent;
        handleEvent(event, push);
      } catch {
        // Ignore final partial line if it cannot be parsed.
      }
    },
  };
};
