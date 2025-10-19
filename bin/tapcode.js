#!/usr/bin/env node
/* eslint-env node */

import fs from "node:fs";
import console from "node:console";
import process from "node:process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

const args = process.argv.slice(2);

const hasFlag = (flag) =>
  args.includes(flag) || args.some((value) => value.startsWith(`${flag}=`));

if (hasFlag("--help") || hasFlag("-h")) {
  console.log(`TapCode - mobile-first coding agent interface

Usage:
  tapcode [projectPath]

Options:
  -h, --help        Show this help message
  -v, --version     Print the TapCode version

Environment configuration:
  TAPCODE_HOST       Network interface to bind (default: 127.0.0.1)
  TAPCODE_PORT       Port to listen on (default: 2025)
  TAPCODE_BASIC_AUTH Enable Basic Auth as username:password
`);
  process.exit(0);
}

if (hasFlag("--version") || hasFlag("-v")) {
  const pkgPath = resolve(__dirname, "../package.json");
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    console.log(pkg.version ?? "unknown");
  } catch (error) {
    console.error("Unable to read package version");
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
  process.exit(0);
}

const projectPath = args[0] ?? ".";
const serverEntry =
  [
    "../dist/server/index.js",
    "../dist/server/server/index.js",
  ]
    .map((relativePath) => resolve(__dirname, relativePath))
    .find((candidate) => fs.existsSync(candidate)) ?? null;

if (!serverEntry) {
  console.error(
    "TapCode has not been built. Run `npm run build` before executing the CLI.",
  );
  process.exit(1);
}

// Ensure the server receives the project path as its first argument.
const passthroughArgs = args.slice(projectPath === "." ? 0 : 1);
process.argv = [process.argv[0], serverEntry, projectPath, ...passthroughArgs];

await import(pathToFileURL(serverEntry).href);
