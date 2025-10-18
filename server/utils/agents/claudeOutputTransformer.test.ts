import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import type { CommandOutput } from "../../../shared/commandRunner";
import { createClaudeStdoutTransformer } from "./claudeOutputTransformer";

describe("createClaudeStdoutTransformer", () => {
  it("transforms a recorded Claude stream into snapshot-stable output", () => {
    const transformer = createClaudeStdoutTransformer();
    const outputs: CommandOutput[] = [];
    const push = (output: CommandOutput) => {
      outputs.push(output);
    };

    const fixturePath = resolve(
      __dirname,
      "__fixtures__",
      "claude-events.jsonl",
    );
    const stream = readFileSync(fixturePath, "utf8");

    for (let index = 0; index < stream.length; index += 64) {
      const chunk = stream.slice(index, index + 64);
      transformer.handleChunk(chunk, push);
    }

    transformer.finalize?.(push);

    expect(outputs).toMatchSnapshot();
  });
});
