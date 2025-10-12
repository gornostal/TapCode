import { describe, expect, it } from "vitest";
import { parentDirectoryOf } from "./directoryUtils";

describe("parentDirectoryOf", () => {
  it("returns parent directory for a nested path", () => {
    const result = parentDirectoryOf("src/components/Button");

    expect(result).toBe("src/components");
  });

  it("returns empty string for a single-level path", () => {
    const result = parentDirectoryOf("src");

    expect(result).toBe("");
  });

  it("returns null for an empty string", () => {
    const result = parentDirectoryOf("");

    expect(result).toBeNull();
  });

  it("returns parent directory for deeply nested path", () => {
    const result = parentDirectoryOf("a/b/c/d/e/f");

    expect(result).toBe("a/b/c/d/e");
  });

  it("handles paths with trailing slash", () => {
    const result = parentDirectoryOf("src/components/");

    expect(result).toBe("src/components");
  });

  it("handles single segment with trailing slash", () => {
    const result = parentDirectoryOf("src/");

    expect(result).toBe("src");
  });

  it("returns parent for path with two segments", () => {
    const result = parentDirectoryOf("src/utils");

    expect(result).toBe("src");
  });

  it("handles multiple consecutive slashes", () => {
    const result = parentDirectoryOf("src//components");

    expect(result).toBe("src/");
  });
});
