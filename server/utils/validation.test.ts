import { describe, expect, it } from "vitest";
import { extractTextFromBody } from "./validation";

describe("extractTextFromBody", () => {
  it("extracts text from a valid body with text field", () => {
    const body = { text: "hello world" };

    const result = extractTextFromBody(body);

    expect(result).toEqual({ text: "hello world" });
  });

  it("trims whitespace from the text field", () => {
    const body = { text: "  hello world  " };

    const result = extractTextFromBody(body);

    expect(result).toEqual({ text: "hello world" });
  });

  it("returns error when body is null", () => {
    const result = extractTextFromBody(null);

    expect(result).toEqual({ error: "text is required" });
  });

  it("returns error when body is undefined", () => {
    const result = extractTextFromBody(undefined);

    expect(result).toEqual({ error: "text is required" });
  });

  it("returns error when body is not an object", () => {
    const result = extractTextFromBody("not an object");

    expect(result).toEqual({ error: "text is required" });
  });

  it("returns error when body is missing text field", () => {
    const body = { other: "value" };

    const result = extractTextFromBody(body);

    expect(result).toEqual({ error: "text is required" });
  });

  it("returns error when text field is not a string", () => {
    const body = { text: 123 };

    const result = extractTextFromBody(body);

    expect(result).toEqual({ error: "text is required" });
  });

  it("returns error when text field is an empty string", () => {
    const body = { text: "" };

    const result = extractTextFromBody(body);

    expect(result).toEqual({ error: "text is required" });
  });

  it("returns error when text field is only whitespace", () => {
    const body = { text: "   " };

    const result = extractTextFromBody(body);

    expect(result).toEqual({ error: "text is required" });
  });

  it("handles body with multiple fields", () => {
    const body = { text: "valid text", other: "ignored" };

    const result = extractTextFromBody(body);

    expect(result).toEqual({ text: "valid text" });
  });

  it("handles text with newlines and preserves them after trimming", () => {
    const body = { text: "  line one\nline two  " };

    const result = extractTextFromBody(body);

    expect(result).toEqual({ text: "line one\nline two" });
  });
});
