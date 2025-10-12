import { Router, type Express } from "express";
import fs from "node:fs/promises";
import type {
  FileContentResponse,
  FilesResponse,
  TodosResponse,
} from "@shared/messages";
import { listDirectoryContents, searchFiles } from "./utils/fileSearch";
import {
  inferHighlightLanguage,
  normalizeRelativeFilePath,
  readProjectFile,
} from "./utils/fileContent";
import { projectBaseName, resolveFromRoot } from "./utils/paths";
import { appendTodoItem, parseTodoItems } from "./utils/todos";

const normalizeQueryParam = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string") {
        return item;
      }
    }
    return "";
  }

  return "";
};

export function registerRoutes(app: Express) {
  const router = Router();
  const todoPath = resolveFromRoot("TODO.md");

  const normalizeDirectoryQueryParam = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }

    const replaced = trimmed.replace(/\\/g, "/");
    const segments = replaced.split("/").filter(Boolean);

    for (const segment of segments) {
      if (segment === "..") {
        const error = Object.assign(new Error("Invalid directory parameter"), {
          code: "EINVALIDDIR",
        });
        throw error;
      }
    }

    return segments.join("/");
  };

  const parentDirectoryOf = (directory: string): string | null => {
    if (!directory) {
      return null;
    }

    const segments = directory.split("/");
    segments.pop();

    return segments.join("/");
  };

  router.get("/files", (req, res, next) => {
    const query = normalizeQueryParam(req.query.q).trim();
    const directoryParam = normalizeQueryParam(req.query.dir);

    let directory = "";
    try {
      directory = normalizeDirectoryQueryParam(directoryParam);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
      return;
    }

    const itemsPromise = query
      ? searchFiles(query, 10)
      : listDirectoryContents(directory);

    itemsPromise
      .then((items) => {
        const response: FilesResponse = {
          query,
          directory,
          parentDirectory: parentDirectoryOf(directory),
          items,
          projectName: projectBaseName,
        };
        res.json(response);
      })
      .catch((error) => {
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
      });
  });

  router.get("/file", (req, res, next) => {
    const pathParam = normalizeQueryParam(req.query.path);

    let normalizedPath: string;
    try {
      normalizedPath = normalizeRelativeFilePath(pathParam);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
      return;
    }

    readProjectFile(normalizedPath)
      .then((result) => {
        const response: FileContentResponse = {
          path: result.path,
          size: result.size,
          isBinary: result.isBinary,
          content: result.content,
          truncated: result.truncated,
          language: inferHighlightLanguage(result.path),
        };
        res.json(response);
      })
      .catch((error) => {
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
      });
  });

  router.get("/todos", (_req, res, next) => {
    fs.readFile(todoPath, "utf8")
      .then((todoContents) => {
        let items: string[];

        try {
          items = parseTodoItems(todoContents);
        } catch (error) {
          const { code } = error as NodeJS.ErrnoException;

          if (code === "ETODOSECTION") {
            res.status(500).json({ error: (error as Error).message });
            return;
          }

          throw error;
        }

        const response: TodosResponse = { items };
        res.json(response);
      })
      .catch((error) => {
        next(error);
      });
  });

  router.post("/todos", (req, res, next) => {
    const body = req.body as unknown;
    let textValue: unknown;

    if (body && typeof body === "object" && "text" in body) {
      textValue = (body as Record<string, unknown>).text;
    }

    if (typeof textValue !== "string" || !textValue.trim()) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    const sanitizedText = textValue.trim();

    const appendTodo = async () => {
      const todoContents = await fs.readFile(todoPath, "utf8");
      let updated: string;

      try {
        updated = appendTodoItem(todoContents, sanitizedText);
      } catch (error) {
        const { code } = error as NodeJS.ErrnoException;

        if (code === "ETODOSECTION") {
          res.status(500).json({ error: (error as Error).message });
          return;
        }

        throw error;
      }

      await fs.writeFile(todoPath, updated, "utf8");
      res.status(201).json({ text: sanitizedText });
    };

    appendTodo().catch((error) => {
      next(error);
    });
  });

  app.use("/api", router);
}
