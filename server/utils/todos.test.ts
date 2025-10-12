import { describe, expect, it } from "vitest";
import { addTodoItem, parseTodoItems } from "./todos";

const withTodoSection = `# Instructions

Implement the first todo item, run tests, and remove the item from this file.

# TODO

- add GET todos API endpoint

- file view should show line numbers

# Footer

Thanks!
`;

const withMultilineTodo = `# Instructions

Implement the first todo item, run tests, and remove the item from this file.

# TODO

- Item can span across multiple
  lines by keeping 2-space indentation.
  There can be multiple paragraphs separated with \\n\\n.

  This is still the same item.

- This, however, is a new item.
- And this. Althought it doesn't have a paragraph break.

# Footer

Thanks!
`;

describe("parseTodoItems", () => {
  it("returns bullet items without their leading marker", () => {
    const items = parseTodoItems(withTodoSection);

    expect(items).toEqual([
      "add GET todos API endpoint",
      "file view should show line numbers",
    ]);
  });

  it("includes plain lines that are not formatted as list items", () => {
    const contents = `# TODO
Do the chores
`;

    const items = parseTodoItems(contents);

    expect(items).toEqual(["Do the chores"]);
  });

  it("stops collecting items when encountering the next header", () => {
    const contents = `# TODO

- first

- second

# Done

- third
`;

    const items = parseTodoItems(contents);

    expect(items).toEqual(["first", "second"]);
  });

  it("throws when the TODO header is missing", () => {
    const act = () => parseTodoItems("# Notes\n- example\n");

    expect(act).toThrowError(/TODO section not found/);
  });

  it("handles multiline todo items", () => {
    const contents = `# TODO

- The Add Item function in todos should support multiline input

- file view should show line numbers
`;

    const items = parseTodoItems(contents);

    expect(items).toEqual([
      "The Add Item function in todos should support multiline input",
      "file view should show line numbers",
    ]);
  });

  it("parses complex multiline todo items with proper indentation", () => {
    const items = parseTodoItems(withMultilineTodo);

    expect(items).toEqual([
      "Item can span across multiple\nlines by keeping 2-space indentation.\nThere can be multiple paragraphs separated with \\n\\n.\n\nThis is still the same item.",
      "This, however, is a new item.",
      "And this. Althought it doesn't have a paragraph break.",
    ]);
  });
});

describe("addTodoItem", () => {
  it("inserts the new item directly under the TODO header", () => {
    const updated = addTodoItem(withTodoSection, "new shiny feature");

    expect(updated).toContain(
      "# TODO\n\n- new shiny feature\n\n- add GET todos API endpoint",
    );
  });

  it("preserves existing trailing content", () => {
    const updated = addTodoItem(withTodoSection, "- add logging");

    expect(updated.endsWith("# Footer\n\nThanks!\n")).toBe(true);
  });

  it("adds newline padding when the header is not followed by one", () => {
    const contents = "# TODO\n\n- current\n";
    const updated = addTodoItem(contents, "future");

    expect(updated).toBe("# TODO\n\n- future\n\n- current\n");
  });

  it("throws when the TODO header is missing", () => {
    const act = () => addTodoItem("# Something else\n", "task");

    expect(act).toThrowError(/TODO section not found/);
  });

  it("throws when the item is blank", () => {
    const act = () => addTodoItem("# TODO\n", "  ");

    expect(act).toThrowError(/todo text is required/);
  });

  it("adds dash prefix if item doesn't start with one", () => {
    const contents = "# TODO\n\n- existing\n";
    const updated = addTodoItem(contents, "without dash");

    expect(updated).toContain("# TODO\n\n- without dash\n\n- existing\n");
  });

  it("handles multiline items with the correct format", () => {
    const contents = "# TODO\n\n- existing\n";
    const updated = addTodoItem(contents, "line one\nline two");

    expect(updated).toContain("# TODO\n\n- line one\n  line two\n\n- existing\n");
  });

  it("preserves complex multiline formatting when appending to existing multiline todos", () => {
    const updated = addTodoItem(
      withMultilineTodo,
      "New multiline item\nwith proper indentation\n\nand paragraph breaks",
    );

    expect(updated).toContain(
      "# TODO\n\n- New multiline item\n  with proper indentation\n  \n  and paragraph breaks\n\n- Item can span across multiple",
    );
  });
});
