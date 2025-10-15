import { Router, type Express } from "express";
import { resolveFromRoot } from "./utils/paths";
import {
  normalizeQueryParam,
  normalizeDirectoryQueryParam,
} from "./utils/queryParams";
import { getFiles, getFileContent } from "./services/filesService";
import {
  getTasks,
  addTask,
  reorderTask,
  removeTask,
} from "./services/tasksService";
import {
  getGitStatus,
  getGitDiff,
  stageAll,
  commitStaged,
} from "./services/gitService";
import { getShellSuggestions } from "./services/shellService";
import { runCommand, getCommandRuns } from "./services/commandRunnerService";
import { extractTextFromBody } from "./utils/validation";
import {
  handleFileError,
  handleFileContentError,
  handleTaskError,
  handleGitError,
  handleShellError,
} from "./utils/errorHandling";

export function registerRoutes(app: Express) {
  const router = Router();
  const taskPath = resolveFromRoot("tasks.md");

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

  router.put("/tasks/reorder", (req, res, next) => {
    const body = req.body as unknown;

    if (typeof body !== "object" || body === null) {
      res.status(400).json({ error: "Request body must be an object" });
      return;
    }

    const { fromIndex, toIndex } = body as Record<string, unknown>;

    if (typeof fromIndex !== "number") {
      res
        .status(400)
        .json({ error: "fromIndex is required and must be a number" });
      return;
    }

    if (typeof toIndex !== "number") {
      res
        .status(400)
        .json({ error: "toIndex is required and must be a number" });
      return;
    }

    reorderTask(taskPath, fromIndex, toIndex)
      .then((result) => {
        res.json(result);
      })
      .catch((error) => {
        handleTaskError(error, res, next);
      });
  });

  router.delete("/tasks/:index", (req, res, next) => {
    const indexParam = req.params.index;
    const index = Number.parseInt(indexParam, 10);

    if (Number.isNaN(index)) {
      res.status(400).json({ error: "index must be a valid number" });
      return;
    }

    removeTask(taskPath, index)
      .then((result) => {
        res.json(result);
      })
      .catch((error) => {
        handleTaskError(error, res, next);
      });
  });

  router.get("/git/status", (_req, res) => {
    getGitStatus()
      .then((response) => {
        res.json(response);
      })
      .catch((error) => {
        handleGitError(error, res);
      });
  });

  router.get("/git/diff", (_req, res) => {
    getGitDiff()
      .then((response) => {
        res.json(response);
      })
      .catch((error) => {
        handleGitError(error, res);
      });
  });

  router.post("/git/stage-all", (_req, res) => {
    stageAll()
      .then(() => {
        res.status(200).json({ success: true });
      })
      .catch((error) => {
        handleGitError(error, res);
      });
  });

  router.post("/git/commit", (req, res) => {
    const body = req.body as unknown;
    const validationResult = extractTextFromBody(body);

    if ("error" in validationResult) {
      res.status(400).json({ error: validationResult.error });
      return;
    }

    commitStaged(validationResult.text)
      .then(() => {
        res.status(200).json({ success: true });
      })
      .catch((error) => {
        handleGitError(error, res);
      });
  });

  router.get("/shell/suggestions", (req, res) => {
    const query = normalizeQueryParam(req.query.q).trim();

    if (!query) {
      res.status(400).json({ error: "Query parameter 'q' is required" });
      return;
    }

    try {
      const result = getShellSuggestions(query);
      res.json(result);
    } catch (error) {
      handleShellError(error, res);
    }
  });

  router.post("/command/run", (req, res) => {
    const body = req.body as unknown;
    const validationResult = extractTextFromBody(body);

    if ("error" in validationResult) {
      res.status(400).json({ error: validationResult.error });
      return;
    }

    const command = validationResult.text;
    if (!command) {
      res.status(400).json({ error: "Command cannot be empty" });
      return;
    }

    // Extract optional sessionId from body for reconnection support
    let sessionId: string | undefined;
    if (
      typeof body === "object" &&
      body !== null &&
      "sessionId" in body &&
      typeof body.sessionId === "string"
    ) {
      sessionId = body.sessionId;
    }

    // Run command with SSE streaming
    runCommand(command, res, sessionId);
  });

  router.get("/command/runs", (_req, res) => {
    const runs = getCommandRuns();
    res.json(runs);
  });

  app.use("/api", router);
}
