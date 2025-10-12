import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let readProjectFile: typeof import("./fileContent").readProjectFile;
let inferHighlightLanguage: typeof import("./fileContent").inferHighlightLanguage;
let normalizeRelativeFilePath: typeof import("./fileContent").normalizeRelativeFilePath;

let tempRoot: string;

const writeFile = async (relativePath: string, contents: string | Buffer) => {
  const absolutePath = path.join(tempRoot, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, contents);
};

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "tapcode-files-"));
  process.env.POCKETIDE_ROOT = tempRoot;
  vi.resetModules();
  ({
    readProjectFile,
    inferHighlightLanguage,
    normalizeRelativeFilePath,
  } = await import("./fileContent"));
});

afterEach(async () => {
  delete process.env.POCKETIDE_ROOT;
  await fs.rm(tempRoot, { recursive: true, force: true });
});

describe("normalizeRelativeFilePath", () => {
  it("normalizes a simple file path", () => {
    const result = normalizeRelativeFilePath("src/index.ts");

    expect(result).toBe("src/index.ts");
  });

  it("throws error when path is empty", () => {
    expect(() => normalizeRelativeFilePath("")).toThrow("File path is required");
  });

  it("throws error when path is only whitespace", () => {
    expect(() => normalizeRelativeFilePath("   ")).toThrow(
      "File path is required",
    );
  });

  it("converts backslashes to forward slashes", () => {
    const result = normalizeRelativeFilePath("src\\components\\Button.tsx");

    expect(result).toBe("src/components/Button.tsx");
  });

  it("throws error when path contains '..' segment", () => {
    expect(() => normalizeRelativeFilePath("src/../etc/passwd")).toThrow(
      "Invalid file path",
    );
  });

  it("removes leading slash", () => {
    const result = normalizeRelativeFilePath("/src/index.ts");

    expect(result).toBe("src/index.ts");
  });

  it("removes trailing slash", () => {
    const result = normalizeRelativeFilePath("src/index.ts/");

    expect(result).toBe("src/index.ts");
  });

  it("removes current directory '.' segments", () => {
    const result = normalizeRelativeFilePath("./src/./index.ts");

    expect(result).toBe("src/index.ts");
  });

  it("throws error when normalized path is only dots", () => {
    expect(() => normalizeRelativeFilePath("././.")).toThrow(
      "File path is required",
    );
  });

  it("handles multiple consecutive slashes", () => {
    const result = normalizeRelativeFilePath("src//index.ts");

    expect(result).toBe("src/index.ts");
  });
});

describe("readProjectFile", () => {
  it("reads a text file successfully", async () => {
    await writeFile("test.txt", "hello world");

    const result = await readProjectFile("test.txt");

    expect(result).toEqual({
      path: "test.txt",
      size: 11,
      isBinary: false,
      content: "hello world",
      truncated: false,
    });
  });

  it("throws error when file does not exist", async () => {
    await expect(readProjectFile("nonexistent.txt")).rejects.toThrow(
      "File not found",
    );
  });

  it("throws error with ENOENT code when file does not exist", async () => {
    try {
      await readProjectFile("nonexistent.txt");
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect((error as NodeJS.ErrnoException).code).toBe("ENOENT");
    }
  });

  it("throws error when path is a directory", async () => {
    await fs.mkdir(path.join(tempRoot, "src"), { recursive: true });

    await expect(readProjectFile("src")).rejects.toThrow(
      "Requested path is not a file",
    );
  });

  it("throws error with EISDIR code when path is a directory", async () => {
    await fs.mkdir(path.join(tempRoot, "src"), { recursive: true });

    try {
      await readProjectFile("src");
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect((error as NodeJS.ErrnoException).code).toBe("EISDIR");
    }
  });

  it("detects binary files by null byte", async () => {
    const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    await writeFile("binary.bin", binaryContent);

    const result = await readProjectFile("binary.bin");

    expect(result.isBinary).toBe(true);
    expect(result.content).toBeNull();
  });

  it("detects binary files by high percentage of control characters", async () => {
    // Create buffer with many control characters (>10%)
    const buffer = Buffer.alloc(100);
    for (let i = 0; i < 20; i++) {
      buffer[i] = 0x01; // Control character
    }
    for (let i = 20; i < 100; i++) {
      buffer[i] = 0x41; // 'A'
    }
    await writeFile("control.bin", buffer);

    const result = await readProjectFile("control.bin");

    expect(result.isBinary).toBe(true);
  });

  it("allows common control characters (tab, newline, form feed, carriage return, escape)", async () => {
    const content = "line1\tcolumn\nline2\r\nline3\fpage\x1b[0m";
    await writeFile("text.txt", content);

    const result = await readProjectFile("text.txt");

    expect(result.isBinary).toBe(false);
    expect(result.content).toBe(content);
  });

  it("truncates large text files beyond 200KB", async () => {
    const largeContent = "x".repeat(250_000);
    await writeFile("large.txt", largeContent);

    const result = await readProjectFile("large.txt");

    expect(result.isBinary).toBe(false);
    expect(result.truncated).toBe(true);
    expect(result.content?.length).toBe(200_000);
    expect(result.size).toBe(250_000);
  });

  it("does not truncate files under 200KB", async () => {
    const content = "x".repeat(100_000);
    await writeFile("small.txt", content);

    const result = await readProjectFile("small.txt");

    expect(result.truncated).toBe(false);
    expect(result.content?.length).toBe(100_000);
  });

  it("handles empty files", async () => {
    await writeFile("empty.txt", "");

    const result = await readProjectFile("empty.txt");

    expect(result).toEqual({
      path: "empty.txt",
      size: 0,
      isBinary: false,
      content: "",
      truncated: false,
    });
  });

  it("normalizes the returned path to POSIX format", async () => {
    await writeFile("src/components/Button.tsx", "export const Button = () => {}");

    const result = await readProjectFile("src/components/Button.tsx");

    expect(result.path).toBe("src/components/Button.tsx");
  });

  it("throws error when attempting path traversal", async () => {
    await expect(readProjectFile("../etc/passwd")).rejects.toThrow(
      "Invalid file path",
    );
  });

  it("throws error with EINVALIDFILEPATH code for path traversal", async () => {
    try {
      await readProjectFile("../etc/passwd");
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect((error as NodeJS.ErrnoException).code).toBe("EINVALIDFILEPATH");
    }
  });

  it("reads UTF-8 encoded files correctly", async () => {
    const utf8Content = "Hello 世界 🌍";
    await writeFile("utf8.txt", utf8Content);

    const result = await readProjectFile("utf8.txt");

    expect(result.content).toBe(utf8Content);
  });
});

describe("inferHighlightLanguage", () => {
  it("returns javascript for .js extension", () => {
    expect(inferHighlightLanguage("index.js")).toBe("javascript");
  });

  it("returns typescript for .ts extension", () => {
    expect(inferHighlightLanguage("index.ts")).toBe("typescript");
  });

  it("returns typescript for .tsx extension", () => {
    expect(inferHighlightLanguage("Component.tsx")).toBe("typescript");
  });

  it("returns json for .json extension", () => {
    expect(inferHighlightLanguage("package.json")).toBe("json");
  });

  it("returns markdown for .md extension", () => {
    expect(inferHighlightLanguage("README.md")).toBe("markdown");
  });

  it("returns python for .py extension", () => {
    expect(inferHighlightLanguage("script.py")).toBe("python");
  });

  it("returns rust for .rs extension", () => {
    expect(inferHighlightLanguage("main.rs")).toBe("rust");
  });

  it("returns go for .go extension", () => {
    expect(inferHighlightLanguage("server.go")).toBe("go");
  });

  it("returns ruby for .rb extension", () => {
    expect(inferHighlightLanguage("app.rb")).toBe("ruby");
  });

  it("returns dockerfile for Dockerfile", () => {
    expect(inferHighlightLanguage("Dockerfile")).toBe("dockerfile");
  });

  it("returns dockerfile for dockerfile (lowercase)", () => {
    expect(inferHighlightLanguage("dockerfile")).toBe("dockerfile");
  });

  it("returns makefile for Makefile", () => {
    expect(inferHighlightLanguage("Makefile")).toBe("makefile");
  });

  it("returns ruby for Gemfile", () => {
    expect(inferHighlightLanguage("Gemfile")).toBe("ruby");
  });

  it("returns dotenv for .env files", () => {
    expect(inferHighlightLanguage(".env")).toBe("dotenv");
  });

  it("returns dotenv for .env.local", () => {
    expect(inferHighlightLanguage(".env.local")).toBe("dotenv");
  });

  it("returns dotenv for .env.production", () => {
    expect(inferHighlightLanguage(".env.production")).toBe("dotenv");
  });

  it("returns null for unknown extensions", () => {
    expect(inferHighlightLanguage("file.xyz")).toBeNull();
  });

  it("returns null for files without extension", () => {
    expect(inferHighlightLanguage("LICENSE")).toBeNull();
  });

  it("handles nested paths correctly", () => {
    expect(inferHighlightLanguage("src/components/Button.tsx")).toBe(
      "typescript",
    );
  });

  it("returns yaml for .yml extension", () => {
    expect(inferHighlightLanguage("config.yml")).toBe("yaml");
  });

  it("returns yaml for .yaml extension", () => {
    expect(inferHighlightLanguage("config.yaml")).toBe("yaml");
  });

  it("returns toml for .toml extension", () => {
    expect(inferHighlightLanguage("Cargo.toml")).toBe("toml");
  });

  it("returns css for .css extension", () => {
    expect(inferHighlightLanguage("styles.css")).toBe("css");
  });

  it("returns scss for .scss extension", () => {
    expect(inferHighlightLanguage("styles.scss")).toBe("scss");
  });

  it("returns xml for .html extension", () => {
    expect(inferHighlightLanguage("index.html")).toBe("xml");
  });

  it("returns json for package-lock.json", () => {
    expect(inferHighlightLanguage("package-lock.json")).toBe("json");
  });

  it("is case-insensitive for extensions", () => {
    expect(inferHighlightLanguage("Test.TS")).toBe("typescript");
  });

  it("is case-insensitive for special filenames", () => {
    expect(inferHighlightLanguage("MAKEFILE")).toBe("makefile");
  });
});
