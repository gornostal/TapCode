import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { log, logError } from "./utils/logger";
import { setProjectRoot } from "./utils/paths";

const PID_FILE = path.join(os.homedir(), ".tapcode.pid");

async function killExistingInstance() {
  try {
    // Check if PID file exists
    const pidContent = await fs.readFile(PID_FILE, "utf-8");
    const oldPid = parseInt(pidContent.trim(), 10);

    if (isNaN(oldPid)) {
      log("Invalid PID in file, removing stale PID file");
      await fs.unlink(PID_FILE).catch(() => {
        /* ignore cleanup errors */
      });
      return;
    }

    // Check if process is still running
    try {
      // Sending signal 0 checks if process exists without killing it
      process.kill(oldPid, 0);

      // Process exists, try to kill it
      log(`Found existing instance (PID: ${oldPid}), killing...`);
      try {
        process.kill(oldPid, "SIGTERM");
      } catch (killError) {
        // If we can't kill it (e.g., permission denied), just log and continue
        const errorCode = (killError as NodeJS.ErrnoException).code;
        if (errorCode === "EPERM") {
          log(
            `Permission denied to kill process ${oldPid}, it may belong to another user`,
          );
        } else if (errorCode === "ESRCH") {
          log(`Process ${oldPid} no longer exists`);
        } else {
          log(
            `Could not kill process ${oldPid}: ${errorCode || "unknown error"}`,
          );
        }
        // Remove stale PID file and continue
        await fs.unlink(PID_FILE).catch(() => {
          /* ignore cleanup errors */
        });
        return;
      }

      // Give it time to shut down gracefully
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if it's still running
      try {
        process.kill(oldPid, 0);
        // Still running, try force kill
        log(`Process ${oldPid} still running, sending SIGKILL`);
        try {
          process.kill(oldPid, "SIGKILL");
        } catch (forceKillError) {
          // If force kill fails, just log it - we'll continue anyway
          log(
            `Could not force kill process ${oldPid}, continuing anyway: ${(forceKillError as NodeJS.ErrnoException).code || "unknown error"}`,
          );
        }
      } catch {
        // Process has exited
        log(`Process ${oldPid} terminated successfully`);
      }
    } catch (error) {
      // Process doesn't exist (ESRCH error)
      const errorCode = (error as NodeJS.ErrnoException).code;
      if (errorCode === "ESRCH") {
        log(
          "PID file exists but process is not running, cleaning up stale file",
        );
      } else {
        // Unexpected error, log but continue
        log(
          `Unexpected error checking process ${oldPid}: ${errorCode || "unknown"}, continuing anyway`,
        );
      }
    }

    // Remove old PID file (best effort)
    await fs.unlink(PID_FILE).catch(() => {
      /* ignore cleanup errors */
    });
  } catch (error) {
    const errorCode = (error as NodeJS.ErrnoException).code;
    if (errorCode === "ENOENT") {
      // PID file doesn't exist, this is fine
      return;
    }
    // Log but don't crash - we can continue even if cleanup failed
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(
      `Warning: Could not process PID file (${errorCode || "unknown error"}): ${errorMessage}`,
    );
  }
}

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

  if (args.length === 0) {
    console.error("Error: Project path is required");
    console.error("Usage: tapcode <path>");
    console.error("Example: tapcode . (for current directory)");
    await cleanupPidFile();
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
        cleanupPidFile()
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
  await cleanupPidFile();
  process.exit(1);
});
