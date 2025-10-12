import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let searchFiles: typeof import("./fileSearch").searchFiles;

let tempRoot: string;

const writeFile = async (relativePath: string, contents = "test") => {
  const absolutePath = path.join(tempRoot, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, contents);
};

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "pocketide-files-"));
  process.env.POCKETIDE_ROOT = tempRoot;
  vi.resetModules();
  ({ searchFiles } = await import("./fileSearch"));
});

afterEach(async () => {
  delete process.env.POCKETIDE_ROOT;
  await fs.rm(tempRoot, { recursive: true, force: true });
});

describe("searchFiles", () => {
  it("returns an empty list for blank queries", async () => {
    await writeFile("src/index.ts");

    const results = await searchFiles("   ");

    expect(results).toEqual([]);
  });

  it("skips ignored directories such as node_modules, dist, and .git", async () => {
    await writeFile("node_modules/library/index.js");
    await writeFile("dist/assets/bundle.js");
    await writeFile(".git/config");
    await writeFile("src/main.ts");

    const ignoredMatchResults = await searchFiles("index");
    const includedResults = await searchFiles("main");

    expect(ignoredMatchResults).toEqual([]);
    expect(includedResults).toEqual([{ path: "src/main.ts", kind: "file" }]);
  });

  it("prioritizes tighter matches and enforces the result limit", async () => {
    await writeFile("app.ts");
    await writeFile("src/app.ts");
    await writeFile("src/utils/helpers.ts");

    const results = await searchFiles("app", 2);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ path: "app.ts", kind: "file" });
    expect(results[1]).toEqual({ path: "src/app.ts", kind: "file" });
  });

  it("returns POSIX-style paths regardless of platform separators", async () => {
    await writeFile(path.join("nested", "deep", "file.txt"));

    const [match] = await searchFiles("file");

    expect(match?.path).toBe("nested/deep/file.txt");
  });

  it("respects .gitignore files within directories", async () => {
    await writeFile(".gitignore", "ignored-root.txt\n");
    await writeFile("ignored-root.txt");
    await writeFile("src/.gitignore", "*.snap\n");
    await writeFile("src/test.snap");
    await writeFile("src/nested/test.snap");
    await writeFile("src/nested/keep.ts");

    const rootIgnored = await searchFiles("ignored-root.txt");
    const snapIgnored = await searchFiles("test.snap");
    const keepResults = await searchFiles("keep.ts");

    expect(rootIgnored).toEqual([]);
    expect(snapIgnored).toEqual([]);
    expect(keepResults).toEqual([{ path: "src/nested/keep.ts", kind: "file" }]);
  });

  it("allows negated patterns to re-include files within ignored directories", async () => {
    await writeFile(".gitignore", "logs/*\n!logs/.keep\n");
    await writeFile("logs/output.log");
    await writeFile("logs/.keep");

    const keepResults = await searchFiles("keep");
    const outputResults = await searchFiles("output");

    expect(keepResults).toEqual([{ path: "logs/.keep", kind: "file" }]);
    expect(outputResults).toEqual([]);
  });

  it("treats root-anchored patterns as relative to the .gitignore location", async () => {
    await writeFile(".gitignore", "/build/\n");
    await writeFile("build/output.js");
    await writeFile("src/build/keep.ts");

    const rootResults = await searchFiles("output");
    const nestedResults = await searchFiles("keep");

    expect(rootResults).toEqual([]);
    expect(nestedResults).toEqual([
      { path: "src/build/keep.ts", kind: "file" },
    ]);
  });

  it("respects wildcard patterns like *.log in .gitignore", async () => {
    await writeFile(".gitignore", "*.log\n");
    await writeFile("test.log");
    await writeFile("src/debug.log");
    await writeFile("src/code.ts");

    const logResults = await searchFiles("test.log");
    const debugResults = await searchFiles("debug.log");
    const tsResults = await searchFiles("code.ts");

    expect(logResults).toEqual([]);
    expect(debugResults).toEqual([]);
    expect(tsResults).toEqual([{ path: "src/code.ts", kind: "file" }]);
  });
});
