import path from "node:path";

const projectRoot = path.resolve(process.env.POCKETIDE_ROOT ?? process.cwd());
export const projectBaseName = path.basename(projectRoot);

export const resolveFromRoot = (...segments: string[]) =>
  path.join(projectRoot, ...segments);

export const clientRoot = resolveFromRoot("client");
export const clientIndexHtmlPath = path.join(clientRoot, "index.html");

export const distRoot = resolveFromRoot("dist");
export const clientDistPath = path.join(distRoot, "public");
export const clientDistIndexHtmlPath = path.join(clientDistPath, "index.html");
