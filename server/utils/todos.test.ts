import { describe, expect, it } from "vitest";
import { appendTodoItem, parseTodoItems } from "./todos";

const withTodoSection = `# Instructions

Implement the first todo item, run tests, and remove the item from this file.

# TODO

- add GET todos API endpoint
- file view should show line numbers

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
});

describe("appendTodoItem", () => {
  it("inserts the new item directly under the TODO header", () => {
    const updated = appendTodoItem(withTodoSection, "- new shiny feature");

    expect(updated).toContain(
      "# TODO\n- new shiny feature\n\n- add GET todos API endpoint",
    );
  });

  it("preserves existing trailing content", () => {
    const updated = appendTodoItem(withTodoSection, "- add logging");

    expect(updated.endsWith("# Footer\n\nThanks!\n")).toBe(true);
  });

  it("adds newline padding when the header is not followed by one", () => {
    const contents = "# TODO\n- current\n";
    const updated = appendTodoItem(contents, "- future");

    expect(updated).toBe("# TODO\n- future\n- current\n");
  });

  it("throws when the TODO header is missing", () => {
    const act = () => appendTodoItem("# Something else\n", "task");

    expect(act).toThrowError(/TODO section not found/);
  });

  it("throws when the item is blank", () => {
    const act = () => appendTodoItem("# TODO\n", "  ");

    expect(act).toThrowError(/todo text is required/);
  });
});
