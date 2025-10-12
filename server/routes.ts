import { Router, type Express } from "express";
import { resolveFromRoot } from "./utils/paths";
import {
  normalizeQueryParam,
  normalizeDirectoryQueryParam,
} from "./utils/queryParams";
import { getFiles, getFileContent } from "./services/filesService";
import { getTodos, addTodo } from "./services/todosService";
import { extractTextFromBody } from "./utils/validation";
import {
  handleFileError,
  handleFileContentError,
  handleTodoError,
} from "./utils/errorHandling";

export function registerRoutes(app: Express) {
  const router = Router();
  const todoPath = resolveFromRoot("TODO.md");

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

    getFiles(query, directory)
      .then((response) => {
        res.json(response);
      })
      .catch((error) => {
        handleFileError(error, res, next);
      });
  });

  router.get("/file", (req, res, next) => {
    const pathParam = normalizeQueryParam(req.query.path);

    getFileContent(pathParam)
      .then((response) => {
        res.json(response);
      })
      .catch((error) => {
        handleFileContentError(error, res, next);
      });
  });

  router.get("/todos", (_req, res, next) => {
    getTodos(todoPath)
      .then((response) => {
        res.json(response);
      })
      .catch((error) => {
        handleTodoError(error, res, next);
      });
  });

  router.post("/todos", (req, res, next) => {
    const body = req.body as unknown;
    const validationResult = extractTextFromBody(body);

    if ("error" in validationResult) {
      res.status(400).json({ error: validationResult.error });
      return;
    }

    addTodo(todoPath, validationResult.text)
      .then((result) => {
        res.status(201).json(result);
      })
      .catch((error) => {
        handleTodoError(error, res, next);
      });
  });

  app.use("/api", router);
}
