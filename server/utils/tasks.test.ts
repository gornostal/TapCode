import { describe, expect, it } from "vitest";
import { addTaskItem, parseTaskItems } from "./tasks";

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
