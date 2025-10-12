import fs from "node:fs/promises";
import type { TodosResponse } from "@shared/messages";
import { parseTodoItems, appendTodoItem } from "../utils/todos";

/**
 * Gets all todo items from the TODO.md file
 */
export const getTodos = async (todoPath: string): Promise<TodosResponse> => {
  const todoContents = await fs.readFile(todoPath, "utf8");
  const items = parseTodoItems(todoContents);

  return { items };
};

/**
 * Appends a new todo item to the TODO.md file
 */
export const addTodo = async (
  todoPath: string,
  text: string,
): Promise<{ text: string }> => {
  const todoContents = await fs.readFile(todoPath, "utf8");
  const updated = appendTodoItem(todoContents, text);
  await fs.writeFile(todoPath, updated, "utf8");

  return { text };
};
