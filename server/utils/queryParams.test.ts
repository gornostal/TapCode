import { describe, expect, it } from "vitest";
import {
  normalizeDirectoryQueryParam,
  normalizeQueryParam,
} from "./queryParams";

describe("normalizeQueryParam", () => {
  it("returns the string value directly when given a string", () => {
    const result = normalizeQueryParam("test");

    expect(result).toBe("test");
  });

  it("returns empty string when given undefined", () => {
    const result = normalizeQueryParam(undefined);

    expect(result).toBe("");
  });

  it("returns empty string when given null", () => {
    const result = normalizeQueryParam(null);

    expect(result).toBe("");
  });

  it("returns empty string when given a number", () => {
    const result = normalizeQueryParam(123);

    expect(result).toBe("");
  });

  it("returns empty string when given an object", () => {
    const result = normalizeQueryParam({ key: "value" });

    expect(result).toBe("");
  });

  it("returns the first string value from an array", () => {
    const result = normalizeQueryParam(["first", "second"]);

    expect(result).toBe("first");
  });

  it("returns empty string when array contains no strings", () => {
    const result = normalizeQueryParam([123, 456]);

    expect(result).toBe("");
  });

  it("returns empty string when array is empty", () => {
    const result = normalizeQueryParam([]);

    expect(result).toBe("");
  });

  it("skips non-string items and returns first string in array", () => {
    const result = normalizeQueryParam([123, "valid", "second"]);

    expect(result).toBe("valid");
  });
});

describe("normalizeDirectoryQueryParam", () => {
  it("returns normalized path with forward slashes", () => {
    const result = normalizeDirectoryQueryParam("src/components");

    expect(result).toBe("src/components");
  });

  it("returns empty string when given empty string", () => {
    const result = normalizeDirectoryQueryParam("");

    expect(result).toBe("");
  });

  it("returns empty string when given only whitespace", () => {
    const result = normalizeDirectoryQueryParam("   ");

    expect(result).toBe("");
  });

  it("converts backslashes to forward slashes", () => {
    const result = normalizeDirectoryQueryParam("src\\components");

    expect(result).toBe("src/components");
  });

  it("removes leading slash", () => {
    const result = normalizeDirectoryQueryParam("/src/components");

    expect(result).toBe("src/components");
  });

  it("removes trailing slash", () => {
    const result = normalizeDirectoryQueryParam("src/components/");

    expect(result).toBe("src/components");
  });

  it("trims whitespace before normalization", () => {
    const result = normalizeDirectoryQueryParam("  src/components  ");

    expect(result).toBe("src/components");
  });

  it("throws error when path contains '..' segment", () => {
    expect(() => normalizeDirectoryQueryParam("src/../etc")).toThrow(
      "Invalid directory parameter",
    );
  });

  it("throws error with EINVALIDDIR code when path contains '..'", () => {
    try {
      normalizeDirectoryQueryParam("src/../etc");
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect((error as NodeJS.ErrnoException).code).toBe("EINVALIDDIR");
    }
  });

  it("throws error when path is only '..'", () => {
    expect(() => normalizeDirectoryQueryParam("..")).toThrow(
      "Invalid directory parameter",
    );
  });

  it("throws error when path contains multiple '..' segments", () => {
    expect(() => normalizeDirectoryQueryParam("../../etc")).toThrow(
      "Invalid directory parameter",
    );
  });

  it("handles single segment path", () => {
    const result = normalizeDirectoryQueryParam("src");

    expect(result).toBe("src");
  });

  it("handles deeply nested paths", () => {
    const result = normalizeDirectoryQueryParam("src/components/ui/button");

    expect(result).toBe("src/components/ui/button");
  });

  it("normalizes multiple consecutive slashes", () => {
    const result = normalizeDirectoryQueryParam("src//components");

    expect(result).toBe("src/components");
  });
});
