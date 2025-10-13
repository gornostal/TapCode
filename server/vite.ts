import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Express } from "express";
import { createServer as createViteServer, type ViteDevServer } from "vite";

// Get the TapCode installation directory (not the user's project directory)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tapCodeRoot = path.resolve(__dirname, "..");

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

export function serveStatic(app: Express) {
  const tapCodeClientDistPath = path.join(tapCodeRoot, "dist", "public");
  const tapCodeClientDistIndexHtmlPath = path.join(
    tapCodeClientDistPath,
    "index.html",
  );

  if (!fs.existsSync(tapCodeClientDistPath)) {
    throw new Error(
      `Static client assets not found at ${tapCodeClientDistPath}. Run "npm run build:client" before starting in production mode.`,
    );
  }

  app.use(express.static(tapCodeClientDistPath));

  app.use("*", (_req, res) => {
    res.sendFile(tapCodeClientDistIndexHtmlPath);
  });
}
