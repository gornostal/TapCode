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

  // Split by double newlines to get blocks
  const blocks = section.split(/\n\n+/);
  const items: string[] = [];

  for (const block of blocks) {
    const trimmedBlock = block.trim();

    if (!trimmedBlock) {
      continue;
    }

    // Check if block starts with a header (stop processing)
    if (trimmedBlock.startsWith("#")) {
      break;
    }

    // If block starts with "- ", remove the dash and add the rest
    if (trimmedBlock.startsWith("- ")) {
      const text = trimmedBlock.slice(2);
      items.push(text);
      continue;
    }

    // Otherwise, add the entire block as-is (for backwards compatibility)
    items.push(trimmedBlock);
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

  // Ensure the item starts with "- " if it doesn't already
  const itemWithDash = sanitized.startsWith("- ")
    ? sanitized
    : `- ${sanitized}`;

  // Add double newline before the item
  const needsLeadingNewline = !before.endsWith("\n");
  const prefix = needsLeadingNewline ? "\n\n" : "\n";

  // Add single newline after the item, but only if there's existing content
  // If the existing content already starts with a newline, we add just one more to make it double
  let suffix = "";
  if (after.length > 0) {
    suffix = after.startsWith("\n") ? "" : "\n";
  }

  return `${before}${prefix}${itemWithDash}${suffix}${after}`;
};
