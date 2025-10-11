import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";

import type { FileListItem } from "@shared/messages";
import { resolveFromRoot } from "./paths";

const IGNORED_DIRECTORIES = new Set([".git", "node_modules", "dist"]);

const toPosixPath = (value: string) => value.split(path.sep).join("/");

const isIgnoredDirectory = (name: string) => IGNORED_DIRECTORIES.has(name);

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
      const notFoundError = Object.assign(
        new Error("Directory not found"),
        {
          code,
        },
      );
      throw notFoundError;
    }

    throw error;
  }

  const items: FileListItem[] = [];

  for (const entry of dirEntries) {
    if (entry.isDirectory()) {
      if (isIgnoredDirectory(entry.name)) {
        continue;
      }

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
  const stack: Array<{ absolute: string; relative: string }> = [
    { absolute: root, relative: "" },
  ];
  const files: string[] = [];

  while (stack.length > 0) {
    const { absolute, relative } = stack.pop()!;
    const entries = await fs.readdir(absolute, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (isIgnoredDirectory(entry.name)) {
          continue;
        }

        const nextRelative = relative
          ? `${relative}/${entry.name}`
          : entry.name;
        stack.push({
          absolute: path.join(absolute, entry.name),
          relative: nextRelative,
        });
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const fileRelative = relative ? `${relative}/${entry.name}` : entry.name;
      files.push(toPosixPath(fileRelative));
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
