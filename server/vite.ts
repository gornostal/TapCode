import express from "express";
import fs from "node:fs";
import type { Express } from "express";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import {
  clientDistIndexHtmlPath,
  clientDistPath,
  resolveFromRoot,
} from "./utils/paths";

export async function setupVite(app: Express): Promise<ViteDevServer> {
  const vite = await createViteServer({
    configFile: resolveFromRoot("vite.config.ts"),
    server: {
      middlewareMode: true,
    },
  });

  app.use(vite.middlewares);
  return vite;
}

export function serveStatic(app: Express) {
  if (!fs.existsSync(clientDistPath)) {
    throw new Error(
      `Static client assets not found at ${clientDistPath}. Run "npm run build:client" before starting in production mode.`,
    );
  }

  app.use(express.static(clientDistPath));

  app.use("*", (_req, res) => {
    res.sendFile(clientDistIndexHtmlPath);
  });
}
