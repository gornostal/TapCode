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

  const lines = section.split("\n");
  const items: string[] = [];
  let currentItem = "";
  let inItem = false;

  for (const line of lines) {
    // Check if we hit a new header (stop processing)
    if (line.trim().startsWith("#")) {
      break;
    }

    // Skip empty lines when not in an item
    if (!inItem && !line.trim()) {
      continue;
    }

    // Check if this line starts a new item (starts with "- ")
    if (line.startsWith("- ")) {
      // Save previous item if exists
      if (currentItem) {
        items.push(currentItem.trim());
      }
      // Start new item (remove the "-" prefix)
      currentItem = line.slice(1);
      inItem = true;
    }
    // Check if this is a continuation line (starts with exactly 2 spaces and we're in an item)
    else if (inItem && line.startsWith("  ")) {
      // Add continuation line (remove 2-space indentation)
      currentItem += "\n" + line.slice(1).trim();
    }
    // Check if this is an empty line within an item
    else if (inItem && !line.trim()) {
      currentItem += "\n";
    }
    // If we're not in an item and line has content, treat as standalone item
    else if (!inItem && line.trim()) {
      items.push(line.trim());
    }
    // If we're in an item and encounter a non-indented, non-empty line that doesn't start with "- "
    else if (
      inItem &&
      line.trim() &&
      !line.startsWith("  ") &&
      !line.startsWith("- ")
    ) {
      // This shouldn't happen in well-formed input, but handle it gracefully
      currentItem += "\n" + line.trim();
    }
  }

  // Add the last item if exists
  if (currentItem) {
    items.push(currentItem.trim());
  }

  return items;
};

export const addTodoItem = (contents: string, item: string): string => {
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

  const paddedLines = sanitized.split("\n").map((line, index) =>
    index === 0 ? `- ${line}` : `  ${line}`
  );
  const formattedItem = paddedLines.join("\n");

  return `${before}\n\n${formattedItem}${after}`;
};
