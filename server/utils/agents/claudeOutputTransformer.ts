import type { StdoutTransformer } from "../../services/commandRunnerService";
import type { CommandOutput } from "../../../shared/commandRunner";

interface ClaudeBaseEvent {
  type?: unknown;
  [key: string]: unknown;
}

interface ClaudeTextContent {
  type: "text";
  text: string;
  [key: string]: unknown;
}

interface ClaudeToolUseContent {
  type: "tool_use";
  name: string;
  input?: Record<string, unknown>;
  [key: string]: unknown;
}

type ClaudeContent = ClaudeTextContent | ClaudeToolUseContent;

interface ClaudeAssistantPayload {
  content?: ClaudeContent | ClaudeContent[];
  [key: string]: unknown;
}

interface ClaudeAssistantEvent extends ClaudeBaseEvent {
  type: "assistant";
  message?: ClaudeAssistantPayload;
}

interface ClaudeResultEvent extends ClaudeBaseEvent {
  type: "result";
  is_error?: boolean;
  duration_ms?: number;
}

export const createClaudeStdoutTransformer = (): StdoutTransformer => {
  let buffer = "";
  const textBuffer: string[] = [];

  const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === "object" && value !== null;
  };

  const isAssistantEvent = (event: unknown): event is ClaudeAssistantEvent => {
    return isRecord(event) && event.type === "assistant";
  };

  const isResultEvent = (event: unknown): event is ClaudeResultEvent => {
    return isRecord(event) && event.type === "result";
  };

  const isTextContent = (value: unknown): value is ClaudeTextContent => {
    return (
      isRecord(value) && value.type === "text" && typeof value.text === "string"
    );
  };

  const isToolUseContent = (value: unknown): value is ClaudeToolUseContent => {
    return (
      isRecord(value) &&
      value.type === "tool_use" &&
      typeof value.name === "string"
    );
  };

  const isKnownContent = (value: unknown): value is ClaudeContent => {
    return isTextContent(value) || isToolUseContent(value);
  };

  const collectAssistantContent = (
    payload: ClaudeAssistantPayload["content"],
  ): ClaudeContent[] => {
    if (!payload) {
      return [];
    }
    if (Array.isArray(payload)) {
      return payload.filter(isKnownContent);
    }
    return isKnownContent(payload) ? [payload] : [];
  };

  const flushAssistantTexts = (
    texts: string[],
    push: (output: CommandOutput) => void,
  ) => {
    if (texts.length === 0) {
      return;
    }
    const combined = texts.map((t) => t.trim()).join("\n");
    const quoted = combined
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    const prefix = "\n\n## Assistant";
    push({
      type: "stdout",
      data: `${prefix}\n${quoted}`,
    });
    texts.length = 0;
  };

  const formatToolValue = (value: unknown): string => {
    if (value === null) {
      return "null";
    }
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const str = String(value).replace(/\n/g, "␤");
    const maxLength = 200;
    if (str.length > maxLength) {
      return str.slice(0, maxLength) + "...";
    }
    return str;
  };

  const pushToolUse = (
    name: string,
    input: Record<string, unknown> | undefined,
    push: (output: CommandOutput) => void,
  ) => {
    const lines: string[] = [`\n\n## ${name}`];
    if (input && typeof input === "object") {
      for (const [key, value] of Object.entries(input)) {
        lines.push(`- \`${key}\`: \`${formatToolValue(value)}\``);
      }
    }
    push({
      type: "stdout",
      data: `${lines.join("\n")}`,
    });
  };

  const formatDurationMinutes = (durationMs: number): number => {
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      return 0;
    }
    const wholeSeconds = Math.floor(durationMs / 1000);
    const minutes = wholeSeconds / 60;
    return Math.floor(minutes * 100) / 100;
  };

  const handleEvent = (
    event: unknown,
    push: (output: CommandOutput) => void,
  ) => {
    if (isAssistantEvent(event)) {
      const contentItems = collectAssistantContent(event.message?.content);
      for (const item of contentItems) {
        if (isTextContent(item)) {
          textBuffer.push(item.text);
          continue;
        }
        if (isToolUseContent(item)) {
          flushAssistantTexts(textBuffer, push);
          pushToolUse(item.name, item.input ?? {}, push);
        }
      }
      return;
    }

    if (isResultEvent(event)) {
      flushAssistantTexts(textBuffer, push);
      const status = event.is_error ? "❌ Failed" : "✅ Done";
      const minutes = formatDurationMinutes(event.duration_ms ?? 0);
      const durationSuffix =
        minutes > 0 ? ` It took ${minutes.toFixed(2)} min.` : "";
      push({
        type: "stdout",
        data: `\n\n${status}.${durationSuffix}\n`,
      });
    }
  };

  const flushRemaining = (push: (output: CommandOutput) => void) => {
    if (textBuffer.length > 0) {
      flushAssistantTexts(textBuffer, push);
    }
  };

  const processLine = (line: string, push: (output: CommandOutput) => void) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    try {
      const event: unknown = JSON.parse(trimmed);
      handleEvent(event, push);
    } catch {
      // Ignore parse errors for individual lines; they may be partial or irrelevant.
    }
  };

  return {
    handleChunk: (chunk, push) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        processLine(rawLine, push);
      }
    },

    finalize: (push) => {
      if (buffer.length > 0) {
        processLine(buffer, push);
      }
      flushRemaining(push);
    },
  };
};
