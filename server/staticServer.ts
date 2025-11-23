import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Express } from "express";

// Get the TapCode installation directory (not the user's project directory)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// When running from built code, __dirname is dist/server/server
// When running from source (tsx), __dirname is server
// We need to find the package root in both cases
const tapCodeRoot = __dirname.includes(path.join("dist", "server"))
  ? path.resolve(__dirname, "..", "..", "..")
  : path.resolve(__dirname, "..");

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

  if (!fs.existsSync(tapCodeClientDistIndexHtmlPath)) {
    throw new Error(
      `Static client index not found at ${tapCodeClientDistIndexHtmlPath}. Run "npm run build:client" before starting in production mode.`,
    );
  }

  app.use(express.static(tapCodeClientDistPath));

  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) {
      next();
      return;
    }

    res.sendFile(tapCodeClientDistIndexHtmlPath, (error) => {
      if (error) {
        next(error);
      }
    });
  });
}
