import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let searchFiles: typeof import("./fileSearch").searchFiles;
let resetCache: typeof import("./fileSearch").__resetFileMetadataCacheForTesting;

let tempRoot: string;

const writeFile = async (relativePath: string, contents = "test") => {
  const absolutePath = path.join(tempRoot, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, contents);
};

const setModifiedTime = async (relativePath: string, mtimeMs: number) => {
  const absolutePath = path.join(tempRoot, relativePath);
  const mtime = new Date(mtimeMs);
  await fs.utimes(absolutePath, mtime, mtime);
};

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "pocketide-files-"));
  process.env.POCKETIDE_ROOT = tempRoot;
  vi.resetModules();
  ({ searchFiles, __resetFileMetadataCacheForTesting: resetCache } =
    await import("./fileSearch"));
});

afterEach(async () => {
  resetCache();
  delete process.env.POCKETIDE_ROOT;
  await fs.rm(tempRoot, { recursive: true, force: true });
});

describe("searchFiles", () => {
  it("returns an empty list for blank queries", async () => {
    await writeFile("src/index.ts");

    const results = await searchFiles("   ");

    expect(results).toEqual([]);
  });

  it("returns all files when no .git repository exists", async () => {
    await writeFile("node_modules/library/index.js");
    await writeFile("dist/assets/bundle.js");
    await writeFile("src/main.ts");

    const indexResults = await searchFiles("index");
    const mainResults = await searchFiles("main.ts");

    expect(indexResults).toEqual([
      { path: "node_modules/library/index.js", kind: "file" },
    ]);
    expect(mainResults).toEqual([{ path: "src/main.ts", kind: "file" }]);
  });

  it("orders substring matches by most recent modification time", async () => {
    await writeFile("app.ts");
    await writeFile("src/app.ts");
    const now = Date.now();
    await setModifiedTime("app.ts", now - 10_000);
    await setModifiedTime("src/app.ts", now);

    const results = await searchFiles("app", 5);

    expect(results).toEqual([
      { path: "src/app.ts", kind: "file" },
      { path: "app.ts", kind: "file" },
    ]);
  });

  it("falls back to fuzzy matching when no substring matches exist", async () => {
    await writeFile("src/components/Button.tsx");
    await writeFile("scripts/generate-report.ts");

    const results = await searchFiles("rcm", 5);

    expect(results).toEqual([
      { path: "src/components/Button.tsx", kind: "file" },
    ]);
  });

  it("returns POSIX-style paths regardless of platform separators", async () => {
    await writeFile(path.join("nested", "deep", "file.txt"));

    const [match] = await searchFiles("file");

    expect(match?.path).toBe("nested/deep/file.txt");
  });
});
