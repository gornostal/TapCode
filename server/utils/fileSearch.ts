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

async function collectFilesFromRoot(): Promise<string[]> {
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

      return Array.from(allFiles).sort();
    } catch {
      // Fall back to filesystem traversal if git commands fail
      return traverseFilesystem(root);
    }
  } else {
    // Traverse filesystem if no .git directory
    return traverseFilesystem(root);
  }
}

async function traverseFilesystem(root: string): Promise<string[]> {
  const stack: Array<{
    absolute: string;
    relative: string;
  }> = [{ absolute: root, relative: "" }];
  const files: string[] = [];

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

      files.push(posixRelative);
    }
  }

  return files;
}

interface ScoredMatch {
  path: string;
  score: number;
}

const WORD_BOUNDARY_CHARS = new Set(["/", "-", "_", ".", " "]);

function scoreMatch(query: string, candidate: string): number | null {
  const normalizedQuery = query.toLowerCase();
  const normalizedCandidate = candidate.toLowerCase();

  let candidateIndex = 0;
  let score = 0;
  let streak = 0;

  for (const queryChar of normalizedQuery) {
    const foundIndex = normalizedCandidate.indexOf(queryChar, candidateIndex);

    if (foundIndex === -1) {
      return null;
    }

    if (foundIndex === candidateIndex) {
      streak += 1;
      score += 5 * streak;
    } else {
      streak = 1;
      score += 1;
      score -= foundIndex - candidateIndex;
    }

    const precedingChar = normalizedCandidate[foundIndex - 1];
    if (foundIndex === 0 || WORD_BOUNDARY_CHARS.has(precedingChar ?? "")) {
      score += 3;
    }

    candidateIndex = foundIndex + 1;
  }

  score -= normalizedCandidate.length - normalizedQuery.length;

  return score;
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
  const matches: ScoredMatch[] = [];

  for (const file of files) {
    const score = scoreMatch(normalizedQuery, file);
    if (score === null) {
      continue;
    }
    matches.push({ path: file, score });
  }

  matches.sort((left, right) => right.score - left.score);

  return matches.slice(0, limit).map((match) => ({
    path: match.path,
    kind: "file" as const,
  }));
}
