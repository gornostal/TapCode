import { describe, expect, it } from "vitest";
import {
  addTaskItem,
  parseTaskItems,
  reorderTaskItem,
  removeTaskItem,
  updateTaskItem,
} from "./tasks";

const withTaskSection = `# Instructions

Implement the first task, run tests, and remove the item from this file.

# Tasks

- add GET tasks API endpoint

- file view should show line numbers

# Footer

Thanks!
`;

const withMultilineTask = `# Instructions

Implement the first task, run tests, and remove the item from this file.

# Tasks

- Item can span across multiple
  lines by keeping 2-space indentation.
  There can be multiple paragraphs separated with \\n\\n.

  This is still the same item.

- This, however, is a new item.
- And this. Althought it doesn't have a paragraph break.

# Footer

Thanks!
`;

describe("parseTaskItems", () => {
  it("returns bullet items without their leading marker", () => {
    const items = parseTaskItems(withTaskSection);

    expect(items).toEqual([
      "add GET tasks API endpoint",
      "file view should show line numbers",
    ]);
  });

  it("includes plain lines that are not formatted as list items", () => {
    const contents = `# Tasks
Do the chores
`;

    const items = parseTaskItems(contents);

    expect(items).toEqual(["Do the chores"]);
  });

  it("stops collecting items when encountering the next header", () => {
    const contents = `# Tasks

- first

- second

# Done

- third
`;

    const items = parseTaskItems(contents);

    expect(items).toEqual(["first", "second"]);
  });

  it("throws when the Tasks header is missing", () => {
    const act = () => parseTaskItems("# Notes\n- example\n");

    expect(act).toThrowError(/Tasks section not found/);
  });

  it("handles multiline task items", () => {
    const contents = `# Tasks

- The Add Item function in tasks should support multiline input

- file view should show line numbers
`;

    const items = parseTaskItems(contents);

    expect(items).toEqual([
      "The Add Item function in tasks should support multiline input",
      "file view should show line numbers",
    ]);
  });

  it("parses complex multiline task items with proper indentation", () => {
    const items = parseTaskItems(withMultilineTask);

    expect(items).toEqual([
      "Item can span across multiple\nlines by keeping 2-space indentation.\nThere can be multiple paragraphs separated with \\n\\n.\n\nThis is still the same item.",
      "This, however, is a new item.",
      "And this. Althought it doesn't have a paragraph break.",
    ]);
  });
});

describe("addTaskItem", () => {
  it("inserts the new item directly under the Tasks header", () => {
    const updated = addTaskItem(withTaskSection, "new shiny feature");

    expect(updated).toContain(
      "# Tasks\n\n- new shiny feature\n\n- add GET tasks API endpoint",
    );
  });

  it("preserves existing trailing content", () => {
    const updated = addTaskItem(withTaskSection, "- add logging");

    expect(updated.endsWith("# Footer\n\nThanks!\n")).toBe(true);
  });

  it("adds newline padding when the header is not followed by one", () => {
    const contents = "# Tasks\n\n- current\n";
    const updated = addTaskItem(contents, "future");

    expect(updated).toBe("# Tasks\n\n- future\n\n- current\n");
  });

  it("throws when the Tasks header is missing", () => {
    const act = () => addTaskItem("# Something else\n", "task");

    expect(act).toThrowError(/Tasks section not found/);
  });

  it("throws when the item is blank", () => {
    const act = () => addTaskItem("# Tasks\n", "  ");

    expect(act).toThrowError(/task text is required/);
  });

  it("adds dash prefix if item doesn't start with one", () => {
    const contents = "# Tasks\n\n- existing\n";
    const updated = addTaskItem(contents, "without dash");

    expect(updated).toContain("# Tasks\n\n- without dash\n\n- existing\n");
  });

  it("handles multiline items with the correct format", () => {
    const contents = "# Tasks\n\n- existing\n";
    const updated = addTaskItem(contents, "line one\nline two");

    expect(updated).toContain(
      "# Tasks\n\n- line one\n  line two\n\n- existing\n",
    );
  });

  it("preserves complex multiline formatting when appending to existing multiline tasks", () => {
    const updated = addTaskItem(
      withMultilineTask,
      "New multiline item\nwith proper indentation\n\nand paragraph breaks",
    );

    expect(updated).toContain(
      "# Tasks\n\n- New multiline item\n  with proper indentation\n  \n  and paragraph breaks\n\n- Item can span across multiple",
    );
  });
});

describe("reorderTaskItem", () => {
  it("moves an item from one position to another", () => {
    const updated = reorderTaskItem(withTaskSection, 0, 1);
    const items = parseTaskItems(updated);

    expect(items).toEqual([
      "file view should show line numbers",
      "add GET tasks API endpoint",
    ]);
  });

  it("moves an item from end to beginning", () => {
    const updated = reorderTaskItem(withTaskSection, 1, 0);
    const items = parseTaskItems(updated);

    expect(items).toEqual([
      "file view should show line numbers",
      "add GET tasks API endpoint",
    ]);
  });

  it("returns unchanged content when fromIndex equals toIndex", () => {
    const updated = reorderTaskItem(withTaskSection, 0, 0);

    expect(updated).toBe(withTaskSection);
  });

  it("preserves the footer section", () => {
    const updated = reorderTaskItem(withTaskSection, 0, 1);

    expect(updated).toContain("# Footer\n\nThanks!\n");
  });

  it("preserves the instructions section", () => {
    const updated = reorderTaskItem(withTaskSection, 0, 1);

    expect(updated).toContain(
      "# Instructions\n\nImplement the first task, run tests, and remove the item from this file.",
    );
  });

  it("handles multiline items correctly", () => {
    const updated = reorderTaskItem(withMultilineTask, 0, 2);
    const items = parseTaskItems(updated);

    expect(items).toEqual([
      "This, however, is a new item.",
      "And this. Althought it doesn't have a paragraph break.",
      "Item can span across multiple\nlines by keeping 2-space indentation.\nThere can be multiple paragraphs separated with \\n\\n.\n\nThis is still the same item.",
    ]);
  });

  it("preserves multiline formatting when reordering", () => {
    const updated = reorderTaskItem(withMultilineTask, 2, 0);

    expect(updated).toContain(
      "- And this. Althought it doesn't have a paragraph break.",
    );
    expect(updated).toContain(
      "- Item can span across multiple\n  lines by keeping 2-space indentation.",
    );
  });

  it("throws when fromIndex is out of bounds (negative)", () => {
    const act = () => reorderTaskItem(withTaskSection, -1, 0);

    expect(act).toThrowError(/Invalid fromIndex/);
  });

  it("throws when fromIndex is out of bounds (too large)", () => {
    const act = () => reorderTaskItem(withTaskSection, 10, 0);

    expect(act).toThrowError(/Invalid fromIndex/);
  });

  it("throws when toIndex is out of bounds (negative)", () => {
    const act = () => reorderTaskItem(withTaskSection, 0, -1);

    expect(act).toThrowError(/Invalid toIndex/);
  });

  it("throws when toIndex is out of bounds (too large)", () => {
    const act = () => reorderTaskItem(withTaskSection, 0, 10);

    expect(act).toThrowError(/Invalid toIndex/);
  });

  it("handles reordering in a list with 3 items", () => {
    const contents = `# Tasks

- first
- second
- third
`;
    const updated = reorderTaskItem(contents, 0, 2);
    const items = parseTaskItems(updated);

    expect(items).toEqual(["second", "third", "first"]);
  });
});

describe("updateTaskItem", () => {
  it("updates the task at the specified index", () => {
    const updated = updateTaskItem(
      withTaskSection,
      1,
      "refresh file viewer design",
    );
    const items = parseTaskItems(updated);

    expect(items).toEqual([
      "add GET tasks API endpoint",
      "refresh file viewer design",
    ]);
  });

  it("trims the provided text before saving", () => {
    const updated = updateTaskItem(withTaskSection, 0, "  tidy task  ");
    const items = parseTaskItems(updated);

    expect(items[0]).toBe("tidy task");
  });

  it("formats multiline updates with proper indentation", () => {
    const updated = updateTaskItem(
      withTaskSection,
      0,
      "First line\nSecond line",
    );

    expect(updated).toContain(
      "- First line\n  Second line\n\n- file view should show line numbers",
    );
  });

  it("preserves content after the tasks section", () => {
    const updated = updateTaskItem(withTaskSection, 0, "keep footer safe");

    expect(updated.endsWith("# Footer\n\nThanks!\n")).toBe(true);
  });

  it("throws when index is out of bounds (negative)", () => {
    const act = () => updateTaskItem(withTaskSection, -1, "noop");

    expect(act).toThrowError(/Invalid index/);
  });

  it("throws when index is out of bounds (too large)", () => {
    const act = () => updateTaskItem(withTaskSection, 10, "noop");

    expect(act).toThrowError(/Invalid index/);
  });

  it("throws when the provided text is blank", () => {
    const act = () => updateTaskItem(withTaskSection, 0, "   ");

    expect(act).toThrowError(/task text is required/);
  });
});

describe("removeTaskItem", () => {
  it("removes a task at the specified index", () => {
    const updated = removeTaskItem(withTaskSection, 0);
    const items = parseTaskItems(updated);

    expect(items).toEqual(["file view should show line numbers"]);
  });

  it("removes the last task", () => {
    const updated = removeTaskItem(withTaskSection, 1);
    const items = parseTaskItems(updated);

    expect(items).toEqual(["add GET tasks API endpoint"]);
  });

  it("preserves the footer section", () => {
    const updated = removeTaskItem(withTaskSection, 0);

    expect(updated).toContain("# Footer\n\nThanks!\n");
  });

  it("preserves the instructions section", () => {
    const updated = removeTaskItem(withTaskSection, 0);

    expect(updated).toContain(
      "# Instructions\n\nImplement the first task, run tests, and remove the item from this file.",
    );
  });

  it("handles removing all tasks leaving an empty tasks section", () => {
    const contents = `# Tasks

- only task

# Footer

Thanks!
`;
    const updated = removeTaskItem(contents, 0);
    const items = parseTaskItems(updated);

    expect(items).toEqual([]);
    expect(updated).toContain("# Tasks\n");
    expect(updated).toContain("# Footer\n\nThanks!\n");
  });

  it("handles multiline task removal", () => {
    const updated = removeTaskItem(withMultilineTask, 0);
    const items = parseTaskItems(updated);

    expect(items).toEqual([
      "This, however, is a new item.",
      "And this. Althought it doesn't have a paragraph break.",
    ]);
  });

  it("preserves multiline formatting of remaining tasks", () => {
    const updated = removeTaskItem(withMultilineTask, 1);

    expect(updated).toContain(
      "- Item can span across multiple\n  lines by keeping 2-space indentation.",
    );
    expect(updated).toContain(
      "- And this. Althought it doesn't have a paragraph break.",
    );
  });

  it("throws when index is out of bounds (negative)", () => {
    const act = () => removeTaskItem(withTaskSection, -1);

    expect(act).toThrowError(/Invalid index/);
  });

  it("throws when index is out of bounds (too large)", () => {
    const act = () => removeTaskItem(withTaskSection, 10);

    expect(act).toThrowError(/Invalid index/);
  });

  it("removes a task from the middle of a list with 3 items", () => {
    const contents = `# Tasks

- first
- second
- third
`;
    const updated = removeTaskItem(contents, 1);
    const items = parseTaskItems(updated);

    expect(items).toEqual(["first", "third"]);
  });
});
