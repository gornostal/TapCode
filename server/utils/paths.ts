import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
let projectRoot = path.resolve(
  process.env.POCKETIDE_ROOT ?? path.resolve(currentDir, "../.."),
);

export function setProjectRoot(rootPath: string): void {
  projectRoot = rootPath;
}

export function getProjectRoot(): string {
  return projectRoot;
}

export const projectBaseName = () => path.basename(projectRoot);

export const resolveFromRoot = (...segments: string[]) =>
  path.join(projectRoot, ...segments);

export const clientRoot = resolveFromRoot("client");
export const clientIndexHtmlPath = path.join(clientRoot, "index.html");

export const distRoot = resolveFromRoot("dist");
export const clientDistPath = path.join(distRoot, "public");
export const clientDistIndexHtmlPath = path.join(clientDistPath, "index.html");
