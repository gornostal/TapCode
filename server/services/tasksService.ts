import fs from "node:fs/promises";
import type { TasksResponse } from "@shared/tasks";
import {
  parseTaskItems,
  addTaskItem,
  reorderTaskItem,
  updateTaskItem,
  removeTaskItem,
} from "../utils/tasks";

/**
 * Gets all task items from the tasks.md file
 */
export const getTasks = async (taskPath: string): Promise<TasksResponse> => {
  const taskContents = await fs.readFile(taskPath, "utf8");
  const items = parseTaskItems(taskContents);

  return { items };
};

/**
 * Appends a new task item to the tasks.md file
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

/**
 * Reorders a task item from one index to another
 */
export const reorderTask = async (
  taskPath: string,
  fromIndex: number,
  toIndex: number,
): Promise<TasksResponse> => {
  const taskContents = await fs.readFile(taskPath, "utf8");
  const updated = reorderTaskItem(taskContents, fromIndex, toIndex);
  await fs.writeFile(taskPath, updated, "utf8");

  const items = parseTaskItems(updated);
  return { items };
};

/**
 * Updates a task item at the specified index
 */
export const updateTask = async (
  taskPath: string,
  index: number,
  text: string,
): Promise<TasksResponse> => {
  const taskContents = await fs.readFile(taskPath, "utf8");
  const updated = updateTaskItem(taskContents, index, text);
  await fs.writeFile(taskPath, updated, "utf8");

  const items = parseTaskItems(updated);
  return { items };
};

/**
 * Removes a task item at the specified index
 */
export const removeTask = async (
  taskPath: string,
  index: number,
): Promise<TasksResponse> => {
  const taskContents = await fs.readFile(taskPath, "utf8");
  const updated = removeTaskItem(taskContents, index);
  await fs.writeFile(taskPath, updated, "utf8");

  const items = parseTaskItems(updated);
  return { items };
};
