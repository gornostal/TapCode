import { describe, expect, it } from "vitest";
import { buildTaskRunCommand } from "./taskRunnerService";

describe("buildTaskRunCommand", () => {
  it("wraps the description in single quotes", () => {
    const result = buildTaskRunCommand(
      "review pull request",
      "codex",
      "project",
    );
    expect(result).toBe("codex exec 'review pull request'");
  });

  it("escapes existing single quotes in the description", () => {
    const result = buildTaskRunCommand("need Bob's input", "codex", "project");
    expect(result).toBe("codex exec 'need Bob'\\''s input'");
  });

  it("preserves special shell characters as literals", () => {
    const result = buildTaskRunCommand("deploy $BRANCH", "codex", "project");
    expect(result).toBe("codex exec 'deploy $BRANCH'");
  });

  it("builds the claude command with the provided prompt", () => {
    const result = buildTaskRunCommand(
      "summarize updates",
      "claude",
      "project",
    );
    expect(result).toBe(
      'claude --verbose --output-format stream-json --allowedTools "Edit(./**)" "Bash(git:*)" -p \'summarize updates\'',
    );
  });

  it("disables sandbox for codex when sandbox mode is yolo", () => {
    const result = buildTaskRunCommand("plan migrations", "codex", "yolo");
    expect(result).toBe(
      "codex --dangerously-bypass-approvals-and-sandbox exec 'plan migrations'",
    );
  });

  it("disables permissions for claude when sandbox mode is yolo", () => {
    const result = buildTaskRunCommand("plan migrations", "claude", "yolo");
    expect(result).toBe(
      "claude --verbose --output-format stream-json --dangerously-skip-permissions -p 'plan migrations'",
    );
  });
});
