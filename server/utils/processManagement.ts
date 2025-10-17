import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { log } from "./logger";

export const PID_FILE = path.join(os.homedir(), ".tapcode.pid");

export async function killExistingInstance() {
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
