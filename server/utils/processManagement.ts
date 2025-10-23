import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createInterface } from "node:readline/promises";
import { log } from "./logger";

export const PID_FILE = path.join(os.homedir(), ".tapcode.pid");

async function confirmTermination(pid: number): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    log(
      `Found existing instance (PID: ${pid}), but terminal is not interactive; continuing without confirmation`,
    );
    return true;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(
      `Found existing TapCode instance running (PID: ${pid}). Stop it? [y/N] `,
    );
    const normalized = answer.trim().toLowerCase();
    return normalized === "y" || normalized === "yes";
  } finally {
    rl.close();
  }
}

export async function killExistingInstance(): Promise<boolean> {
  try {
    // Check if PID file exists
    const pidContent = await fs.readFile(PID_FILE, "utf-8");
    const oldPid = parseInt(pidContent.trim(), 10);

    if (isNaN(oldPid)) {
      log("Invalid PID in file, removing stale PID file");
      await fs.unlink(PID_FILE).catch(() => {
        /* ignore cleanup errors */
      });
      return true;
    }

    // Check if process is still running
    try {
      // Sending signal 0 checks if process exists without killing it
      process.kill(oldPid, 0);

      const shouldTerminate = await confirmTermination(oldPid);
      if (!shouldTerminate) {
        log(
          `Existing TapCode instance ${oldPid} left running; aborting startup of new instance`,
        );
        return false;
      }

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
        return true;
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
    return true;
  } catch (error) {
    const errorCode = (error as NodeJS.ErrnoException).code;
    if (errorCode === "ENOENT") {
      // PID file doesn't exist, this is fine
      return true;
    }
    // Log but don't crash - we can continue even if cleanup failed
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(
      `Warning: Could not process PID file (${errorCode || "unknown error"}): ${errorMessage}`,
    );
    return true;
  }
}
