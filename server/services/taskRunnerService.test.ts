import { describe, expect, it } from "vitest";
import { buildTaskRunCommand } from "./taskRunnerService";

describe("buildTaskRunCommand", () => {
  it("wraps the description in single quotes", () => {
    const result = buildTaskRunCommand("review pull request", "codex");
    expect(result).toBe("codex --full-auto exec 'review pull request'");
  });

  it("escapes existing single quotes in the description", () => {
    const result = buildTaskRunCommand("need Bob's input", "codex");
    expect(result).toBe("codex --full-auto exec 'need Bob'\\''s input'");
  });

  it("preserves special shell characters as literals", () => {
    const result = buildTaskRunCommand("deploy $BRANCH", "codex");
    expect(result).toBe("codex --full-auto exec 'deploy $BRANCH'");
  });

  it("builds the claude command with the provided prompt", () => {
    const result = buildTaskRunCommand("summarize updates", "claude");
    expect(result).toBe(
      "claude --verbose --output-format stream-json -p 'summarize updates'",
    );
  });
});
