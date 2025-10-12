import { Router, type Express } from "express";
import { resolveFromRoot } from "./utils/paths";
import {
  normalizeQueryParam,
  normalizeDirectoryQueryParam,
} from "./utils/queryParams";
import { getFiles, getFileContent } from "./services/filesService";
import { getTasks, addTask } from "./services/tasksService";
import { extractTextFromBody } from "./utils/validation";
import {
  handleFileError,
  handleFileContentError,
  handleTaskError,
} from "./utils/errorHandling";

export function registerRoutes(app: Express) {
  const router = Router();
  const taskPath = resolveFromRoot("Tasks.md");

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

  router.get("/tasks", (_req, res, next) => {
    getTasks(taskPath)
      .then((response) => {
        res.json(response);
      })
      .catch((error) => {
        handleTaskError(error, res, next);
      });
  });

  router.post("/tasks", (req, res, next) => {
    const body = req.body as unknown;
    const validationResult = extractTextFromBody(body);

    if ("error" in validationResult) {
      res.status(400).json({ error: validationResult.error });
      return;
    }

    addTask(taskPath, validationResult.text)
      .then((result) => {
        res.status(201).json(result);
      })
      .catch((error) => {
        handleTaskError(error, res, next);
      });
  });

  app.use("/api", router);
}
