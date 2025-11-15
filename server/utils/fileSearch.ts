import Fuse, { type IFuseOptions } from "fuse.js";
import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import type { FileListItem } from "../../shared/files";
import { resolveFromRoot } from "./paths";

const toPosixPath = (value: string) => value.split(path.sep).join("/");

const normalizeDirectoryPath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const replaced = trimmed.replace(/\\/g, "/");
  const segments = replaced.split("/").filter(Boolean);

  for (const segment of segments) {
    if (segment === "..") {
      const error = Object.assign(new Error("Invalid directory path"), {
        code: "EINVALIDDIR",
      });
      throw error;
    }
  }

  return segments.join("/");
};

export async function listImmediateChildrenFromRoot(): Promise<FileListItem[]> {
  return listDirectoryContents("");
}

export async function listDirectoryContents(
  directory: string,
): Promise<FileListItem[]> {
  const normalizedDirectory = normalizeDirectoryPath(directory);
  const root = resolveFromRoot();

  const absoluteDirectory = normalizedDirectory
    ? resolveFromRoot(...normalizedDirectory.split("/"))
    : root;
  const resolvedDirectory = path.resolve(absoluteDirectory);

  const isWithinRoot =
    resolvedDirectory === root ||
    resolvedDirectory.startsWith(`${root}${path.sep}`);

  if (!isWithinRoot) {
    const error = Object.assign(new Error("Invalid directory path"), {
      code: "EINVALIDDIR",
    });
    throw error;
  }

  let dirEntries: Dirent[];
  try {
    dirEntries = await fs.readdir(resolvedDirectory, { withFileTypes: true });
  } catch (error) {
    const { code } = error as NodeJS.ErrnoException;
    if (code === "ENOENT" || code === "ENOTDIR") {
      const notFoundError = Object.assign(new Error("Directory not found"), {
        code,
      });
      throw notFoundError;
    }

    throw error;
  }

  const items: FileListItem[] = [];

  for (const entry of dirEntries) {
    if (entry.isDirectory()) {
      const relativePath = normalizedDirectory
        ? `${normalizedDirectory}/${entry.name}`
        : entry.name;

      items.push({ path: toPosixPath(relativePath), kind: "directory" });
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const relativePath = normalizedDirectory
      ? `${normalizedDirectory}/${entry.name}`
      : entry.name;

    items.push({ path: toPosixPath(relativePath), kind: "file" });
  }

  items.sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === "directory" ? -1 : 1;
    }

    return left.path.localeCompare(right.path);
  });

  return items;
}

interface FileMatch {
  path: string;
  mtimeMs: number;
}

const FUSE_OPTIONS: IFuseOptions<FileMatch> = {
  includeScore: true,
  keys: ["path"],
  threshold: 0.4,
  ignoreLocation: true,
};

const METADATA_TTL_MS = 10 * 60 * 1000;

type CachedMetadata = {
  mtimeMs: number;
  fetchedAt: number;
};

const fileMetadataCache = new Map<string, CachedMetadata>();

function shouldUseCache(entry: CachedMetadata, now: number): boolean {
  return now - entry.fetchedAt < METADATA_TTL_MS;
}

async function getFileMatch(
  relativePosixPath: string,
  absolutePath: string,
): Promise<FileMatch | null> {
  const cached = fileMetadataCache.get(relativePosixPath);
  const now = Date.now();

  if (cached && shouldUseCache(cached, now)) {
    return { path: relativePosixPath, mtimeMs: cached.mtimeMs };
  }

  try {
    const stat = await fs.stat(absolutePath);
    const match = { path: relativePosixPath, mtimeMs: stat.mtimeMs };
    fileMetadataCache.set(relativePosixPath, {
      mtimeMs: stat.mtimeMs,
      fetchedAt: now,
    });
    return match;
  } catch {
    fileMetadataCache.delete(relativePosixPath);
    return null;
  }
}

export function __resetFileMetadataCacheForTesting(): void {
  fileMetadataCache.clear();
}

async function collectFilesFromRoot(): Promise<FileMatch[]> {
  const root = resolveFromRoot();

  // Check if .git directory exists
  const gitPath = path.join(root, ".git");
  let hasGit = false;

  try {
    const stat = await fs.stat(gitPath);
    hasGit = stat.isDirectory();
  } catch {
    hasGit = false;
  }

  if (hasGit) {
    // Use git commands to get files
    try {
      // Get tracked files
      const trackedOutput = execSync("git ls-files --full-name", {
        cwd: root,
        encoding: "utf8",
      });

      // Get untracked files
      const untrackedOutput = execSync(
        "git ls-files --full-name --others --exclude-standard",
        { cwd: root, encoding: "utf8" },
      );

      // Combine and deduplicate
      const allFiles = new Set<string>();
      trackedOutput
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .forEach((file) => allFiles.add(file));

      untrackedOutput
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .forEach((file) => allFiles.add(file));

      const sortedFiles = Array.from(allFiles).sort();
      return buildMetadata(sortedFiles, root);
    } catch {
      // Fall back to filesystem traversal if git commands fail
      return traverseFilesystem(root);
    }
  } else {
    // Traverse filesystem if no .git directory
    return traverseFilesystem(root);
  }
}

async function buildMetadata(
  files: string[],
  root: string,
): Promise<FileMatch[]> {
  const results = await Promise.all(
    files.map(async (relativePath) => {
      const posixRelative = toPosixPath(relativePath);
      const absolutePath = path.join(root, relativePath);
      return getFileMatch(posixRelative, absolutePath);
    }),
  );

  return results.filter((item): item is FileMatch => item !== null);
}

async function traverseFilesystem(root: string): Promise<FileMatch[]> {
  const stack: Array<{
    absolute: string;
    relative: string;
  }> = [{ absolute: root, relative: "" }];
  const files: FileMatch[] = [];

  while (stack.length > 0) {
    const { absolute, relative } = stack.pop()!;
    const entries = await fs.readdir(absolute, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = relative ? `${relative}/${entry.name}` : entry.name;
      const posixRelative = toPosixPath(relativePath);

      if (entry.isDirectory()) {
        const childAbsolute = path.join(absolute, entry.name);
        stack.push({
          absolute: childAbsolute,
          relative: posixRelative,
        });
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const absoluteFilePath = path.join(absolute, entry.name);
      const match = await getFileMatch(posixRelative, absoluteFilePath);
      if (match) {
        files.push(match);
      }
    }
  }

  return files;
}

export async function searchFiles(
  query: string,
  limit = 10,
): Promise<FileListItem[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const files = await collectFilesFromRoot();
  const queryLower = normalizedQuery.toLowerCase();

  const substringMatches = files.filter((file) =>
    file.path.toLowerCase().includes(queryLower),
  );

  if (substringMatches.length > 0) {
    return substringMatches
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(0, limit)
      .map((file) => ({
        path: file.path,
        kind: "file" as const,
      }));
  }

  const fuse = new Fuse(files, FUSE_OPTIONS);
  const fuzzyResults = fuse.search(normalizedQuery);

  return fuzzyResults
    .map((result) => ({
      entry: result.item,
      score: result.score === undefined ? 1 : 1 - result.score,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((match) => ({
      path: match.entry.path,
      kind: "file" as const,
    }));
}
