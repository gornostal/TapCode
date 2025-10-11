import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";

import type { FileListItem } from "@shared/messages";
import { resolveFromRoot } from "./paths";

const IGNORED_DIRECTORIES = new Set([".git", "node_modules", "dist"]);
const GITIGNORE_FILENAME = ".gitignore";

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

interface IgnoreRule {
  negate: boolean;
  directoryOnly: boolean;
  matches(pathRelativeToRoot: string, isDirectory: boolean): boolean;
}

const segmentMatches = (pattern: string, value: string): boolean => {
  let patternIndex = 0;
  let valueIndex = 0;
  let starIndex = -1;
  let matchIndex = 0;

  while (valueIndex < value.length) {
    const patternChar = pattern[patternIndex];
    if (
      patternChar !== undefined &&
      (patternChar === "?" || patternChar === value[valueIndex])
    ) {
      patternIndex += 1;
      valueIndex += 1;
      continue;
    }

    if (patternChar === "*") {
      starIndex = patternIndex;
      matchIndex = valueIndex;
      patternIndex += 1;
      continue;
    }

    if (starIndex !== -1) {
      patternIndex = starIndex + 1;
      matchIndex += 1;
      valueIndex = matchIndex;
      continue;
    }

    return false;
  }

  while (patternIndex < pattern.length && pattern[patternIndex] === "*") {
    patternIndex += 1;
  }

  return patternIndex === pattern.length;
};

const matchSegments = (
  patternSegments: string[],
  targetSegments: string[],
  anchored: boolean,
): boolean => {
  const matchFrom = (patternIndex: number, targetIndex: number): boolean => {
    let pIndex = patternIndex;
    let tIndex = targetIndex;

    while (pIndex < patternSegments.length) {
      const segment = patternSegments[pIndex];

      if (segment === "**") {
        while (
          pIndex + 1 < patternSegments.length &&
          patternSegments[pIndex + 1] === "**"
        ) {
          pIndex += 1;
        }

        if (pIndex + 1 === patternSegments.length) {
          return true;
        }

        pIndex += 1;

        for (
          let nextIndex = tIndex;
          nextIndex <= targetSegments.length;
          nextIndex += 1
        ) {
          if (matchFrom(pIndex, nextIndex)) {
            return true;
          }
        }

        return false;
      }

      if (tIndex >= targetSegments.length) {
        return false;
      }

      if (!segmentMatches(segment, targetSegments[tIndex])) {
        return false;
      }

      pIndex += 1;
      tIndex += 1;
    }

    return tIndex === targetSegments.length;
  };

  if (anchored) {
    return matchFrom(0, 0);
  }

  for (let offset = 0; offset <= targetSegments.length; offset += 1) {
    if (matchFrom(0, offset)) {
      return true;
    }
  }

  return false;
};

const createRule = ({
  pattern,
  negate,
  directoryOnly,
  basePath,
}: {
  pattern: string;
  negate: boolean;
  directoryOnly: boolean;
  basePath: string;
}): IgnoreRule | null => {
  const anchored = pattern.startsWith("/");
  const patternBody = anchored ? pattern.slice(1) : pattern;
  const hasSlash = patternBody.includes("/");
  const matchAnywhere = !anchored && !hasSlash;
  const effectiveAnchored = anchored || hasSlash;

  const basePrefix = basePath ? `${basePath}/` : "";
  const withinBase = (target: string): string | null => {
    if (!basePath) {
      return target;
    }

    if (target === basePath) {
      return "";
    }

    if (target.startsWith(basePrefix)) {
      return target.slice(basePrefix.length);
    }

    return null;
  };

  if (matchAnywhere) {
    const matcher = (value: string) => segmentMatches(patternBody, value);

    return {
      negate,
      directoryOnly,
      matches(pathRelativeToRoot, isDirectory) {
        if (directoryOnly && !isDirectory) {
          return false;
        }

        const relativeToBase = withinBase(pathRelativeToRoot);
        if (relativeToBase === null) {
          return false;
        }

        if (!relativeToBase) {
          return matcher("");
        }

        const segments = relativeToBase.split("/");
        for (const segment of segments) {
          if (matcher(segment)) {
            return true;
          }
        }
        return false;
      },
    };
  }

  const patternSegments = patternBody
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => (segment === "" ? "**" : segment));

  if (patternSegments.length === 0) {
    return null;
  }

  return {
    negate,
    directoryOnly,
    matches(pathRelativeToRoot, isDirectory) {
      if (directoryOnly && !isDirectory) {
        return false;
      }

      const relativeToBase = withinBase(pathRelativeToRoot);
      if (relativeToBase === null) {
        return false;
      }

      if (!relativeToBase && patternSegments.length > 0) {
        return matchSegments(
          patternSegments,
          relativeToBase ? relativeToBase.split("/") : [],
          effectiveAnchored,
        );
      }

      const targetSegments = relativeToBase ? relativeToBase.split("/") : [];
      return matchSegments(patternSegments, targetSegments, effectiveAnchored);
    },
  };
};

const parseGitignore = (contents: string, basePath: string): IgnoreRule[] => {
  const rules: IgnoreRule[] = [];
  const lines = contents.split(/\n/);

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    let negate = false;
    let pattern = trimmedLine;

    if (pattern.startsWith("!")) {
      negate = true;
      pattern = pattern.slice(1);
    }

    const directoryOnly = pattern.endsWith("/");
    const normalizedPattern = directoryOnly ? pattern.slice(0, -1) : pattern;

    if (!normalizedPattern) {
      continue;
    }

    const rule = createRule({
      pattern: normalizedPattern,
      negate,
      directoryOnly,
      basePath,
    });

    if (rule) {
      rules.push(rule);
    }
  }

  return rules;
};

const loadIgnoreRulesForDirectory = async (
  currentRules: IgnoreRule[],
  absolutePath: string,
  relativePath: string,
): Promise<IgnoreRule[]> => {
  const gitignorePath = path.join(absolutePath, GITIGNORE_FILENAME);

  let contents: string;
  try {
    contents = await fs.readFile(gitignorePath, "utf8");
  } catch (error) {
    const { code } = error as NodeJS.ErrnoException;
    if (code === "ENOENT") {
      return currentRules;
    }
    throw error;
  }

  const rules = parseGitignore(contents, toPosixPath(relativePath));
  if (rules.length === 0) {
    return currentRules;
  }

  return [...currentRules, ...rules];
};

const shouldIgnorePath = (
  relativePath: string,
  isDirectory: boolean,
  rules: IgnoreRule[],
): boolean => {
  let ignored = false;

  for (const rule of rules) {
    if (!rule.matches(relativePath, isDirectory)) {
      continue;
    }

    ignored = !rule.negate;
  }

  return ignored;
};

async function collectFilesFromRoot(): Promise<string[]> {
  const root = resolveFromRoot();
  const initialRules = await loadIgnoreRulesForDirectory([], root, "");
  const stack: Array<{
    absolute: string;
    relative: string;
    rules: IgnoreRule[];
  }> = [{ absolute: root, relative: "", rules: initialRules }];
  const files: string[] = [];

  while (stack.length > 0) {
    const { absolute, relative, rules } = stack.pop()!;
    const entries = await fs.readdir(absolute, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = relative ? `${relative}/${entry.name}` : entry.name;
      const posixRelative = toPosixPath(relativePath);

      if (entry.isDirectory()) {
        if (isIgnoredDirectory(entry.name)) {
          continue;
        }

        if (shouldIgnorePath(posixRelative, true, rules)) {
          continue;
        }

        const childAbsolute = path.join(absolute, entry.name);
        const nextRules = await loadIgnoreRulesForDirectory(
          rules,
          childAbsolute,
          posixRelative,
        );
        stack.push({
          absolute: childAbsolute,
          relative: posixRelative,
          rules: nextRules,
        });
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (shouldIgnorePath(posixRelative, false, rules)) {
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
