import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { basicAuthMiddleware } from "./middleware/basicAuth";
import { resolveServerConfig } from "./utils/config";
import { log, logError, closeLogger } from "./utils/logger";
import { setProjectRoot } from "./utils/paths";
import { killExistingInstance, PID_FILE } from "./utils/processManagement";

async function writePidFile() {
  try {
    await fs.writeFile(PID_FILE, process.pid.toString(), "utf-8");
    log(`PID file created: ${PID_FILE}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`Failed to write PID file: ${errorMessage}`);
  }
}

async function cleanupPidFile() {
  try {
    await fs.unlink(PID_FILE);
    log("PID file removed");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logError(`Failed to remove PID file: ${errorMessage}`);
    }
  }
}

async function bootstrap() {
  // Kill any existing instance first
  await killExistingInstance();

  // Write our PID file
  await writePidFile();

  // Parse command-line arguments
  const args = process.argv.slice(2);
  if (!args[0]) {
    log("No project path provided; defaulting to current working directory.");
  }

  const projectPath = args[0] ?? ".";
  const resolvedPath = path.resolve(process.cwd(), projectPath);

  // Set the project root for the application
  setProjectRoot(resolvedPath);
  log(`Project root set to: ${resolvedPath}`);

  const { host, port, basicAuth } = resolveServerConfig();
  const app = express();
  app.use(express.json());

  if (basicAuth) {
    app.use(basicAuthMiddleware(basicAuth));
    log(`Basic authentication enabled for user: ${basicAuth.username}`);
  }

  registerRoutes(app);

  const server = createServer(app);
  const isDevelopment = process.env.NODE_ENV !== "production";

  if (isDevelopment) {
    const vite = await setupVite(app);
    log("Vite development middleware enabled");

    const closeVite = () => {
      vite
        .close()
        .then(() => log("Vite server closed gracefully"))
        .catch((error) => logError(error));
    };

    process.once("SIGINT", closeVite);
    process.once("SIGTERM", closeVite);
  } else {
    serveStatic(app);
    log("Serving static client assets from dist/public");
  }

  server.listen(port, host, () => {
    const displayHost = host === "0.0.0.0" ? "localhost" : host;
    log(`TapCode server listening on http://${displayHost}:${port}`);
  });

  const shutdownSignals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  shutdownSignals.forEach((signal) => {
    process.on(signal, () => {
      log(`Received ${signal}, shutting down gracefully...`);
      server.close((error) => {
        if (error) {
          logError(error);
          process.exitCode = 1;
        }
        Promise.all([cleanupPidFile(), closeLogger()])
          .then(() => {
            process.exit();
          })
          .catch((cleanupError) => {
            logError(cleanupError);
            process.exit(1);
          });
      });
    });
  });
}

bootstrap().catch(async (error) => {
  logError(error);
  await Promise.all([cleanupPidFile(), closeLogger()]);
  process.exit(1);
});
