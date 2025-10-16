import { Response } from "express";
import { AgentName } from "@shared/agents";
import { runCommand } from "./commandRunnerService";
import { createClaudeStdoutTransformer } from "../utils/agents/claudeOutputTransformer";

function quoteForShellArgument(argument: string): string {
  return `'${argument.replace(/'/g, `'\\''`)}'`;
}

export function buildTaskRunCommand(
  description: string,
  agent: AgentName,
): string {
  switch (agent) {
    case "codex":
      return `codex --full-auto exec ${quoteForShellArgument(description)}`;
    case "claude":
      return `claude --verbose --output-format stream-json -p ${quoteForShellArgument(description)}`;
    default:
      throw new Error(`Unsupported agent: ${agent as string}`);
  }
}

export function runTask(
  description: string | undefined,
  agent: AgentName,
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

  const command = buildTaskRunCommand(trimmedDescription, agent);
  const options =
    agent === "claude"
      ? { stdoutTransformer: createClaudeStdoutTransformer() }
      : undefined;
  runCommand(command, res, sessionId, options);
}
