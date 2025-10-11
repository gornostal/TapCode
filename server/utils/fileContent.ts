import type { Stats } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import { resolveFromRoot } from "./paths";

const MAX_TEXT_BYTES = 200_000;
const BINARY_SAMPLE_BYTES = 4096;
const ALLOWED_CONTROL_BYTES = new Set([9, 10, 12, 13, 27]);

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  bat: "dos",
  c: "c",
  cc: "cpp",
  cfg: "ini",
  cjs: "javascript",
  conf: "ini",
  cpp: "cpp",
  cs: "csharp",
  css: "css",
  cts: "typescript",
  env: "dotenv",
  eslintrc: "json",
  gitignore: "plaintext",
  go: "go",
  gql: "graphql",
  graphql: "graphql",
  h: "c",
  hpp: "cpp",
  html: "xml",
  ini: "ini",
  java: "java",
  js: "javascript",
  json: "json",
  jsx: "javascript",
  kt: "kotlin",
  kts: "kotlin",
  less: "less",
  lock: "json",
  log: "plaintext",
  md: "markdown",
  mdx: "markdown",
  mjs: "javascript",
  mts: "typescript",
  npmrc: "ini",
  php: "php",
  prisma: "prisma",
  prettierrc: "json",
  py: "python",
  rb: "ruby",
  rs: "rust",
  scss: "scss",
  sh: "bash",
  sql: "sql",
  swift: "swift",
  toml: "toml",
  ts: "typescript",
  tsx: "typescript",
  txt: "plaintext",
  vue: "xml",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
};

const LANGUAGE_BY_FILENAME: Record<string, string> = {
  dockerfile: "dockerfile",
  gemfile: "ruby",
  makefile: "makefile",
};

const toPosixPath = (value: string) => value.split(path.sep).join("/");

const invalidFilePathError = (message: string) =>
  Object.assign(new Error(message), { code: "EINVALIDFILEPATH" });

export const normalizeRelativeFilePath = (value: string): string => {
  const trimmed = value.trim();

  if (!trimmed) {
    throw invalidFilePathError("File path is required");
  }

  const replaced = trimmed.replace(/\\/g, "/");
  const segments = replaced
    .split("/")
    .filter((segment) => Boolean(segment) && segment !== ".");

  if (segments.length === 0) {
    throw invalidFilePathError("File path is required");
  }

  for (const segment of segments) {
    if (segment === "..") {
      throw invalidFilePathError("Invalid file path");
    }
  }

  return segments.join("/");
};

const isWithinRoot = (root: string, target: string): boolean => {
  if (target === root) {
    return true;
  }

  const withSeparator = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  return target.startsWith(withSeparator);
};

const isProbablyBinary = (buffer: Buffer): boolean => {
  if (buffer.length === 0) {
    return false;
  }

  let controlCount = 0;
  const length = buffer.length;

  for (let index = 0; index < length; index += 1) {
    const byte = buffer[index];
    if (byte === 0) {
      return true;
    }

    if (byte < 32 && !ALLOWED_CONTROL_BYTES.has(byte)) {
      controlCount += 1;
    }
  }

  return controlCount / length > 0.1;
};

export interface FileReadResult {
  path: string;
  size: number;
  isBinary: boolean;
  content: string | null;
  truncated: boolean;
}

export async function readProjectFile(
  relativePath: string,
): Promise<FileReadResult> {
  const normalizedPath = normalizeRelativeFilePath(relativePath);
  const root = resolveFromRoot();
  const absoluteCandidate = resolveFromRoot(...normalizedPath.split("/"));
  const resolvedPath = path.resolve(absoluteCandidate);

  if (!isWithinRoot(root, resolvedPath)) {
    throw invalidFilePathError("Invalid file path");
  }

  let stats: Stats;
  try {
    stats = await fs.stat(resolvedPath);
  } catch (error) {
    const { code } = error as NodeJS.ErrnoException;
    if (code === "ENOENT") {
      throw Object.assign(new Error("File not found"), { code });
    }
    throw error;
  }

  if (!stats.isFile()) {
    throw Object.assign(new Error("Requested path is not a file"), {
      code: "EISDIR",
    });
  }

  const size = stats.size;
  const fileBuffer = await fs.readFile(resolvedPath);
  const sample = fileBuffer.subarray(
    0,
    Math.min(fileBuffer.length, BINARY_SAMPLE_BYTES),
  );
  const binary = isProbablyBinary(sample);

  if (binary) {
    return {
      path: toPosixPath(normalizedPath),
      size,
      isBinary: true,
      content: null,
      truncated: false,
    };
  }

  const limitedBuffer =
    fileBuffer.length > MAX_TEXT_BYTES
      ? fileBuffer.subarray(0, MAX_TEXT_BYTES)
      : fileBuffer;

  const truncated = fileBuffer.length > MAX_TEXT_BYTES;

  return {
    path: toPosixPath(normalizedPath),
    size,
    isBinary: false,
    content: limitedBuffer.toString("utf8"),
    truncated,
  };
}

export const inferHighlightLanguage = (relativePath: string): string | null => {
  const basename = path.basename(relativePath);
  const lowerBasename = basename.toLowerCase();

  if (LANGUAGE_BY_FILENAME[lowerBasename]) {
    return LANGUAGE_BY_FILENAME[lowerBasename] ?? null;
  }

  if (lowerBasename.startsWith(".env")) {
    return "dotenv";
  }

  const extension = path.extname(lowerBasename).replace(".", "");
  if (!extension) {
    return null;
  }

  return LANGUAGE_BY_EXTENSION[extension] ?? null;
};
