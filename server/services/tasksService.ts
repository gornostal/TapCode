import fs from "node:fs/promises";
import type { TasksResponse } from "@shared/messages";
import { parseTaskItems, addTaskItem } from "../utils/tasks";

/**
 * Gets all task items from the Tasks.md file
 */
export const getTasks = async (taskPath: string): Promise<TasksResponse> => {
  const taskContents = await fs.readFile(taskPath, "utf8");
  const items = parseTaskItems(taskContents);

  return { items };
};

/**
 * Appends a new task item to the Tasks.md file
 */
export const addTask = async (
  taskPath: string,
  text: string,
): Promise<{ text: string }> => {
  const taskContents = await fs.readFile(taskPath, "utf8");
  const updated = addTaskItem(taskContents, text);
  await fs.writeFile(taskPath, updated, "utf8");

  return { text };
};
