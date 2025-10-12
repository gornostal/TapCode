import type { NextFunction, Response } from "express";

/**
 * Handles file-related errors and sends appropriate HTTP responses
 */
export const handleFileError = (
  error: unknown,
  res: Response,
  next: NextFunction,
): void => {
  const { code } = error as NodeJS.ErrnoException;

  if (code === "EINVALIDDIR") {
    res.status(400).json({ error: (error as Error).message });
    return;
  }

  if (code === "ENOENT" || code === "ENOTDIR") {
    res.status(404).json({ error: (error as Error).message });
    return;
  }

  next(error);
};

/**
 * Handles file content errors and sends appropriate HTTP responses
 */
export const handleFileContentError = (
  error: unknown,
  res: Response,
  next: NextFunction,
): void => {
  const { code } = error as NodeJS.ErrnoException;

  if (code === "EINVALIDFILEPATH") {
    res.status(400).json({ error: (error as Error).message });
    return;
  }

  if (code === "EISDIR") {
    res.status(400).json({ error: (error as Error).message });
    return;
  }

  if (code === "ENOENT") {
    res.status(404).json({ error: (error as Error).message });
    return;
  }

  next(error);
};

/**
 * Handles todo-related errors and sends appropriate HTTP responses
 */
export const handleTodoError = (
  error: unknown,
  res: Response,
  next: NextFunction,
): void => {
  const { code } = error as NodeJS.ErrnoException;

  if (code === "ETODOSECTION") {
    res.status(500).json({ error: (error as Error).message });
    return;
  }

  next(error);
};
