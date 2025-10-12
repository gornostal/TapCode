import express from "express";
import { createServer } from "node:http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { log, logError } from "./utils/logger";

async function bootstrap() {
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
