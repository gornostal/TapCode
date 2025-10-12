const todoHeaderPattern = /^# TODO.*$/m;

interface ParseResult {
  headerEndIndex: number;
}

const locateTodoHeader = (contents: string): ParseResult => {
  const match = todoHeaderPattern.exec(contents);

  if (!match) {
    const error = Object.assign(new Error("TODO section not found"), {
      code: "ETODOSECTION",
    });
    throw error;
  }

  return { headerEndIndex: match.index + match[0].length };
};

export const parseTodoItems = (contents: string): string[] => {
  const { headerEndIndex } = locateTodoHeader(contents);
  const section = contents.slice(headerEndIndex);
  const lines = section.split(/\r?\n/);
  const items: string[] = [];

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim();

    if (!trimmedLine) {
      continue;
    }

    if (trimmedLine.startsWith("#")) {
      break;
    }

    if (trimmedLine.startsWith("-")) {
      const text = trimmedLine.slice(1).trimStart();
      items.push(text);
      continue;
    }

    items.push(trimmedLine);
  }

  return items;
};

export const appendTodoItem = (contents: string, item: string): string => {
  const sanitized = item.trim();

  if (!sanitized) {
    const error = Object.assign(new Error("todo text is required"), {
      code: "EINVALIDTODO",
    });
    throw error;
  }

  const { headerEndIndex } = locateTodoHeader(contents);
  const before = contents.slice(0, headerEndIndex);
  const after = contents.slice(headerEndIndex);
  const needsLeadingNewline = !before.endsWith("\n");
  const needsTrailingNewline = after.length > 0 && !after.startsWith("\n");
  const prefix = needsLeadingNewline ? "\n" : "";
  const suffix = needsTrailingNewline ? "\n" : "";

  return `${before}${prefix}${sanitized}${suffix}${after}`;
};
