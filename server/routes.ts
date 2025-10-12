import { Router, type Express } from "express";
import type {
  FileContentResponse,
  FilesResponse,
  HelloResponse,
} from "@shared/messages";
import { listDirectoryContents, searchFiles } from "./utils/fileSearch";
import {
  inferHighlightLanguage,
  normalizeRelativeFilePath,
  readProjectFile,
} from "./utils/fileContent";
import { projectBaseName } from "./utils/paths";

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

  router.get("/hello", (_req, res) => {
    const payload: HelloResponse = {
      message: "Hello from the PocketIDE server!",
    };

    res.json(payload);
  });

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

  app.use(router);
}
