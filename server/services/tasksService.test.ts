import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { addTask } from "./tasksService";
import { TASKS_FILE_TEMPLATE } from "../utils/taskFileTemplate";
import { parseTaskItems } from "../utils/tasks";

const tempDirectories: string[] = [];

const createTempDir = async (): Promise<string> => {
  const directory = await fs.mkdtemp(join(tmpdir(), "tapcode-tasks-service-"));
  tempDirectories.push(directory);
  return directory;
};

afterEach(async () => {
  while (tempDirectories.length) {
    const directory = tempDirectories.pop();

    if (!directory) {
      continue;
    }

    await fs.rm(directory, { recursive: true, force: true });
  }
});

describe("addTask", () => {
  it("creates tasks.md from the template when the file is missing", async () => {
    const directory = await createTempDir();
    const taskPath = join(directory, "tasks.md");

    await addTask(taskPath, "first generated task");

    const fileContents = await fs.readFile(taskPath, "utf8");

    expect(fileContents.startsWith(TASKS_FILE_TEMPLATE)).toBe(true);
    expect(parseTaskItems(fileContents)).toEqual(["first generated task"]);
  });

  it("preserves existing file contents when appending", async () => {
    const directory = await createTempDir();
    const taskPath = join(directory, "tasks.md");

    await fs.writeFile(
      taskPath,
      `${TASKS_FILE_TEMPLATE}- initial task\n`,
      "utf8",
    );

    await addTask(taskPath, "follow-up work");

    const fileContents = await fs.readFile(taskPath, "utf8");

    expect(parseTaskItems(fileContents)).toEqual([
      "follow-up work",
      "initial task",
    ]);
  });
});
