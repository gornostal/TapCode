import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { log, logError } from "./utils/logger";
import { setProjectRoot } from "./utils/paths";

async function bootstrap() {
  // Parse command-line arguments
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Error: Project path is required");
    console.error("Usage: tapcode <path>");
    console.error("Example: tapcode . (for current directory)");
    process.exit(1);
  }

  const projectPath = args[0];
  const resolvedPath = path.resolve(process.cwd(), projectPath);

  // Set the project root for the application
  setProjectRoot(resolvedPath);
  log(`Project root set to: ${resolvedPath}`);
  const app = express();
  app.use(express.json());

  registerRoutes(app);

  const server = createServer(app);
  const port = 2025;
  const host = "0.0.0.0";
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
    log(
      `TapCode server listening on http://${host === "0.0.0.0" ? "localhost" : host}:${port}`,
    );
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
        process.exit();
      });
    });
  });
}

bootstrap().catch((error) => {
  logError(error);
  process.exit(1);
});
