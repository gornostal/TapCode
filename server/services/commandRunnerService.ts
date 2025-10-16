import { spawn, ChildProcess } from "node:child_process";
import { Response } from "express";
import { getProjectRoot } from "../utils/paths";
import { log } from "../utils/logger";
import { randomBytes } from "node:crypto";
import type {
  CommandOutput,
  CommandRunSummary,
} from "../../shared/commandRunner";

// Re-export types for convenience
export type { CommandOutput, CommandRunSummary };

interface RunningCommand {
  process: ChildProcess;
  output: CommandOutput[];
  isComplete: boolean;
  exitCode?: number;
  command: string;
  startTime: number;
  stopRequested: boolean;
  forceKillTimer: NodeJS.Timeout | null;
}

// Store running commands by session ID
const runningCommands = new Map<string, RunningCommand>();

// Clean up completed commands after 60 minutes
const CLEANUP_DELAY = 60 * 60 * 1000;
const STOP_FORCE_TIMEOUT_MS = 5 * 1000;
const isWindows = process.platform === "win32";

function sendSignalToProcess(
  sessionId: string,
  runningCommand: RunningCommand,
  signal: NodeJS.Signals,
): boolean {
  const child = runningCommand.process;
  const pid = child.pid;

  if (!pid || child.killed) {
    return false;
  }

  if (!isWindows) {
    try {
      process.kill(-pid, signal);
      return true;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err?.code === "ESRCH") {
        return false;
      }
      log(
        `Failed to send ${signal} to process group for session ${sessionId}: ${
          err?.message ?? error
        }`,
      );
      try {
        return child.kill(signal);
      } catch (innerError) {
        log(
          `Fallback ${signal} delivery failed for session ${sessionId}: ${
            (innerError as Error)?.message ?? innerError
          }`,
        );
        return false;
      }
    }
  }

  try {
    return child.kill(signal);
  } catch (error) {
    log(
      `Failed to send ${signal} to session ${sessionId}: ${
        (error as Error)?.message ?? error
      }`,
    );
    return false;
  }
}

type StopCommandResult =
  | { status: "not_found" }
  | { status: "already_complete"; exitCode?: number }
  | { status: "stopping" };

export function runCommand(
  command: string,
  res: Response,
  sessionId?: string,
): void {
  const projectRoot = getProjectRoot();
  let runningCommand: RunningCommand;
  let currentSessionId = sessionId;

  // Check if this is a reconnection to existing command
  if (sessionId && runningCommands.has(sessionId)) {
    runningCommand = runningCommands.get(sessionId)!;
    log(`Client reconnected to session: ${sessionId}`);
  } else {
    // Generate new session ID
    currentSessionId = randomBytes(16).toString("hex");

    log(`Running command: ${command} in directory: ${projectRoot}`);

    // Spawn the command using shell
    const childProcess = spawn(command, {
      cwd: projectRoot,
      shell: true,
      // Disable output buffering
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      detached: !isWindows,
    });

    runningCommand = {
      process: childProcess,
      output: [],
      isComplete: false,
      command,
      startTime: Date.now(),
      stopRequested: false,
      forceKillTimer: null,
    };

    runningCommands.set(currentSessionId, runningCommand);

    // Handle stdout
    childProcess.stdout.on("data", (data: Buffer) => {
      const output: CommandOutput = { type: "stdout", data: data.toString() };
      runningCommand.output.push(output);
    });

    // Handle stderr
    childProcess.stderr.on("data", (data: Buffer) => {
      const output: CommandOutput = { type: "stderr", data: data.toString() };
      runningCommand.output.push(output);
    });

    // Handle process exit
    childProcess.on("close", (code, signal) => {
      if (runningCommand.forceKillTimer) {
        clearTimeout(runningCommand.forceKillTimer);
      }
      runningCommand.forceKillTimer = null;

      const exitMessage = (() => {
        if (runningCommand.stopRequested) {
          return signal
            ? `Process stopped by user (signal ${signal})`
            : "Process stopped by user";
        }
        if (signal) {
          return `Process terminated by signal ${signal}`;
        }
        return "Process exited";
      })();

      const output: CommandOutput = {
        type: "exit",
        data: exitMessage,
        code: code ?? undefined,
      };
      runningCommand.output.push(output);
      runningCommand.isComplete = true;
      runningCommand.exitCode = code ?? undefined;

      // Clean up after delay
      setTimeout(() => {
        runningCommands.delete(currentSessionId!);
        log(`Cleaned up session: ${currentSessionId}`);
      }, CLEANUP_DELAY);
    });

    // Handle errors
    childProcess.on("error", (error) => {
      const output: CommandOutput = {
        type: "error",
        data: `Failed to start command: ${error.message}`,
      };
      runningCommand.output.push(output);
      if (runningCommand.forceKillTimer) {
        clearTimeout(runningCommand.forceKillTimer);
        runningCommand.forceKillTimer = null;
      }
      runningCommand.isComplete = true;

      // Clean up after delay
      setTimeout(() => {
        runningCommands.delete(currentSessionId!);
        log(`Cleaned up session: ${currentSessionId}`);
      }, CLEANUP_DELAY);
    });
  }

  // Set up SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // Disable any buffering
    "X-Accel-Buffering": "no",
  });

  // Send session ID to client
  res.write(
    `data: ${JSON.stringify({ type: "session", data: currentSessionId })}\n\n`,
  );

  // Send all buffered output
  let outputIndex = 0;
  const sendBufferedOutput = () => {
    while (outputIndex < runningCommand.output.length) {
      const output = runningCommand.output[outputIndex];
      res.write(`data: ${JSON.stringify(output)}\n\n`);
      outputIndex++;
    }
  };

  sendBufferedOutput();

  // If command is already complete, close connection
  if (runningCommand.isComplete) {
    res.end();
    return;
  }

  // Send a comment every 30 seconds to keep connection alive
  const keepAliveInterval = setInterval(() => {
    res.write(": keep-alive\n\n");
  }, 30000);

  // Watch for new output
  const outputWatcher = setInterval(() => {
    sendBufferedOutput();

    // Close connection if command is complete
    if (runningCommand.isComplete) {
      clearInterval(outputWatcher);
      clearInterval(keepAliveInterval);
      res.end();
    }
  }, 100);

  // Clean up on client disconnect
  res.on("close", () => {
    clearInterval(keepAliveInterval);
    clearInterval(outputWatcher);
    log(`Client disconnected from session: ${currentSessionId}`);

    // Don't kill the process on disconnect - allow reconnection
    // Process will be cleaned up after CLEANUP_DELAY when it completes
  });
}

export function getCommandRuns(): CommandRunSummary[] {
  const runs: CommandRunSummary[] = Array.from(runningCommands.entries()).map(
    ([sessionId, runningCommand]) => ({
      sessionId,
      command: runningCommand.command,
      startTime: runningCommand.startTime,
      isComplete: runningCommand.isComplete,
      exitCode: runningCommand.exitCode,
      stopRequested: runningCommand.stopRequested,
    }),
  );

  // Sort by start time, newest first
  runs.sort((a, b) => b.startTime - a.startTime);

  return runs;
}

export function stopCommand(sessionId: string): StopCommandResult {
  const runningCommand = runningCommands.get(sessionId);

  if (!runningCommand) {
    return { status: "not_found" };
  }

  if (runningCommand.isComplete) {
    return {
      status: "already_complete",
      exitCode: runningCommand.exitCode,
    };
  }

  const wasAlreadyRequested = runningCommand.stopRequested;

  if (!wasAlreadyRequested) {
    runningCommand.stopRequested = true;
    runningCommand.output.push({
      type: "stderr",
      data: "Termination requested by user\n",
    });
  } else {
    runningCommand.output.push({
      type: "stderr",
      data: "Termination already requested; reinforcing stop signal\n",
    });
  }

  const signalsToTry: NodeJS.Signals[] = isWindows
    ? ["SIGTERM"]
    : ["SIGINT", "SIGTERM"];
  let deliveredSignal: NodeJS.Signals | null = null;

  for (const signal of signalsToTry) {
    const delivered = sendSignalToProcess(sessionId, runningCommand, signal);
    if (delivered) {
      deliveredSignal = signal;
      runningCommand.output.push({
        type: "stderr",
        data: `Sent ${signal} to process\n`,
      });
      break;
    }
  }

  if (!deliveredSignal) {
    runningCommand.output.push({
      type: "stderr",
      data: "Unable to deliver graceful stop signal; process may continue running\n",
    });
  }

  if (!runningCommand.forceKillTimer) {
    const timeout = setTimeout(() => {
      if (!runningCommand.isComplete && runningCommands.has(sessionId)) {
        log(`Force killing session ${sessionId} after timeout`);
        runningCommand.output.push({
          type: "stderr",
          data: "Force killing process with SIGKILL\n",
        });
        const killDelivered = sendSignalToProcess(
          sessionId,
          runningCommand,
          "SIGKILL",
        );
        if (!killDelivered) {
          runningCommand.output.push({
            type: "stderr",
            data: "Force kill signal could not be delivered; manual intervention may be required\n",
          });
        }
      }
      runningCommand.forceKillTimer = null;
    }, STOP_FORCE_TIMEOUT_MS);
    if (typeof timeout.unref === "function") {
      timeout.unref();
    }
    runningCommand.forceKillTimer = timeout;
  }

  return { status: "stopping" };
}
