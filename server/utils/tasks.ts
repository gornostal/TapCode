const taskHeaderPattern = /^# Tasks.*$/m;

interface ParseResult {
  headerEndIndex: number;
}

const locateTaskHeader = (contents: string): ParseResult => {
  const match = taskHeaderPattern.exec(contents);

  if (!match) {
    const error = Object.assign(new Error("Tasks section not found"), {
      code: "ETASKSECTION",
    });
    throw error;
  }

  return { headerEndIndex: match.index + match[0].length };
};

export const parseTaskItems = (contents: string): string[] => {
  const { headerEndIndex } = locateTaskHeader(contents);
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

export const addTaskItem = (contents: string, item: string): string => {
  const sanitized = item.trim();

  if (!sanitized) {
    const error = Object.assign(new Error("task text is required"), {
      code: "EINVALIDTASK",
    });
    throw error;
  }

  const { headerEndIndex } = locateTaskHeader(contents);
  const before = contents.slice(0, headerEndIndex);
  const after = contents.slice(headerEndIndex);

  const paddedLines = sanitized
    .split("\n")
    .map((line, index) => (index === 0 ? `- ${line}` : `  ${line}`));
  const formattedItem = paddedLines.join("\n");

  return `${before}\n\n${formattedItem}${after}`;
};

export const reorderTaskItem = (
  contents: string,
  fromIndex: number,
  toIndex: number,
): string => {
  const items = parseTaskItems(contents);

  // Validate indices
  if (fromIndex < 0 || fromIndex >= items.length) {
    const error = Object.assign(
      new Error(
        `Invalid fromIndex: ${fromIndex}. Must be between 0 and ${items.length - 1}`,
      ),
      { code: "EINVALIDINDEX" },
    );
    throw error;
  }

  if (toIndex < 0 || toIndex >= items.length) {
    const error = Object.assign(
      new Error(
        `Invalid toIndex: ${toIndex}. Must be between 0 and ${items.length - 1}`,
      ),
      { code: "EINVALIDINDEX" },
    );
    throw error;
  }

  // If indices are the same, no reordering needed
  if (fromIndex === toIndex) {
    return contents;
  }

  // Reorder the items array
  const reorderedItems = [...items];
  const [movedItem] = reorderedItems.splice(fromIndex, 1);
  reorderedItems.splice(toIndex, 0, movedItem);

  // Rebuild the file contents
  const { headerEndIndex } = locateTaskHeader(contents);
  const before = contents.slice(0, headerEndIndex);

  // Find the end of the tasks section
  const afterHeader = contents.slice(headerEndIndex);
  const lines = afterHeader.split("\n");
  let tasksSectionEnd = 0;
  let foundFirstItem = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip initial empty lines
    if (!foundFirstItem && !line.trim()) {
      continue;
    }

    // Check if we hit a new header (stop processing)
    if (line.trim().startsWith("#")) {
      break;
    }

    // If we found a task item or are in a task
    if (line.startsWith("- ") || (foundFirstItem && line.startsWith("  "))) {
      foundFirstItem = true;
      tasksSectionEnd = i + 1;
    } else if (foundFirstItem && !line.trim()) {
      // Empty line within tasks section
      tasksSectionEnd = i + 1;
    } else if (foundFirstItem && line.trim() && !line.startsWith("  ")) {
      // Non-task content found, end of tasks section
      break;
    }
  }

  const after = lines.slice(tasksSectionEnd).join("\n");

  // Format the reordered items
  const formattedItems = reorderedItems
    .map((item) => {
      const itemLines = item.split("\n");
      return itemLines
        .map((line, index) => (index === 0 ? `- ${line}` : `  ${line}`))
        .join("\n");
    })
    .join("\n\n");

  return `${before}\n\n${formattedItems}\n${after}`;
};
