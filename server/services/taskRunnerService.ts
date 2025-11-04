import { Response } from "express";
import { AgentName } from "../../shared/agents";
import { SandboxMode } from "../../shared/sandbox";
import { runCommand } from "./commandRunnerService";
import { createClaudeStdoutTransformer } from "../utils/agents/claudeOutputTransformer";

function quoteForShellArgument(argument: string): string {
  return `'${argument.replace(/'/g, `'\\''`)}'`;
}

export function buildTaskRunCommand(
  description: string,
  agent: AgentName,
  sandbox: SandboxMode,
): string {
  switch (agent) {
    case "codex":
      return [
        "codex",
        ...(sandbox === "yolo"
          ? ["--dangerously-bypass-approvals-and-sandbox"]
          : []),
        "exec",
        quoteForShellArgument(description),
      ].join(" ");
    case "claude":
      return [
        "claude",
        "--verbose",
        "--output-format",
        "stream-json",
        ...(sandbox === "yolo" ? ["--dangerously-skip-permissions"] : []),
        ...(sandbox === "project"
          ? ["--allowedTools", '"Edit(./**)"', '"Bash(git:*)"']
          : []),
        "-p",
        quoteForShellArgument(description),
      ].join(" ");
    default:
      throw new Error(`Unsupported agent: ${agent as string}`);
  }
}

export function runTask(
  description: string | undefined,
  agent: AgentName,
  sandbox: SandboxMode,
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

  const descriptionWithInstruction = `${trimmedDescription}\n\nRemove this task from ./tasks.md when finished`;

  const command = buildTaskRunCommand(
    descriptionWithInstruction,
    agent,
    sandbox,
  );
  const options =
    agent === "claude"
      ? { stdoutTransformer: createClaudeStdoutTransformer() }
      : undefined;
  runCommand(command, res, sessionId, options);
}
