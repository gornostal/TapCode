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
});
