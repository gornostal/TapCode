import { Response } from "express";
import { runCommand } from "./commandRunnerService";

function quoteForShellArgument(argument: string): string {
  return `'${argument.replace(/'/g, `'\\''`)}'`;
}

export function buildTaskRunCommand(description: string): string {
  return `codex --full-auto exec ${quoteForShellArgument(description)}`;
}

export function runTask(
  description: string | undefined,
  res: Response,
  sessionId?: string,
): void {
  if (sessionId && (!description || !description.trim())) {
    runCommand("", res, sessionId);
    return;
  }

  if (!description) {
    throw new Error("Task description is required when starting a new run");
  }

  const trimmedDescription = description.trim();
  if (!trimmedDescription) {
    throw new Error("Task description cannot be empty");
  }

  const command = buildTaskRunCommand(trimmedDescription);
  runCommand(command, res, sessionId);
}
