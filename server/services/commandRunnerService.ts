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
}

// Store running commands by session ID
const runningCommands = new Map<string, RunningCommand>();

// Clean up completed commands after 5 minutes
const CLEANUP_DELAY = 5 * 60 * 1000;

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
    });

    runningCommand = {
      process: childProcess,
      output: [],
      isComplete: false,
      command,
      startTime: Date.now(),
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
    childProcess.on("close", (code) => {
      const output: CommandOutput = {
        type: "exit",
        data: `Process exited`,
        code: code ?? 0,
      };
      runningCommand.output.push(output);
      runningCommand.isComplete = true;
      runningCommand.exitCode = code ?? 0;

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
    }),
  );

  // Sort by start time, newest first
  runs.sort((a, b) => b.startTime - a.startTime);

  return runs;
}
