import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Express } from "express";
import { createServer as createViteServer, type ViteDevServer } from "vite";

// Get the TapCode installation directory (not the user's project directory)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// When running from built code, __dirname is dist/server/server
// When running from source (tsx), __dirname is server
// We need to find the package root in both cases
const tapCodeRoot = __dirname.includes(path.join("dist", "server"))
  ? path.resolve(__dirname, "..", "..", "..")
  : path.resolve(__dirname, "..");

export async function setupVite(app: Express): Promise<ViteDevServer> {
  const vite = await createViteServer({
    configFile: path.join(tapCodeRoot, "vite.config.ts"),
    server: {
      middlewareMode: true,
    },
  });

  app.use(vite.middlewares);
  return vite;
}
