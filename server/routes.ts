import {
  Router,
  type Express,
  type NextFunction,
  type Request,
  type Response,
  type RequestHandler,
} from "express";
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
  updateTask,
  removeTask,
} from "./services/tasksService";
import {
  getGitStatus,
  getGitDiff,
  stageAll,
  commitStaged,
} from "./services/gitService";
import { getShellSuggestions } from "./services/shellHistoryService";
import {
  runCommand,
  getCommandRuns,
  stopCommand,
} from "./services/commandRunnerService";
import { extractTextFromBody } from "./utils/validation";
import {
  handleFileError,
  handleFileContentError,
  handleTaskError,
  handleGitError,
  handleShellError,
} from "./utils/errorHandling";
import { runTask } from "./services/taskRunnerService";
import { isAgentName } from "../shared/agents";
import { isSandboxMode } from "../shared/sandbox";
import type {
  FileContentResponse,
  FileRequestQuery,
  FilesRequestQuery,
  FilesResponse,
} from "../shared/files";
import type {
  AddTaskResponse,
  CreateTaskRequest,
  ReorderTasksRequest,
  RunTaskRequest,
  TaskIndexParams,
  TasksResponse,
  UpdateTaskRequest,
} from "../shared/tasks";
import type {
  CommitRequest,
  CommitResponse,
  GitDiffResponse,
  GitStatusResponse,
  StageAllResponse,
} from "../shared/git";
import type {
  CommandRunsResponse,
  CommandStopParams,
  CommandStopResponse,
  RunCommandRequest as CommandRunRequest,
} from "../shared/commandRunner";
import type {
  ShellSuggestionsQuery,
  ShellSuggestionsResponse,
} from "../shared/shell";
import type { ErrorResponse } from "../shared/http";
import { createHttpErrorLogger } from "./middleware/httpErrorLogger";
import { logError } from "./utils/logger";

type EmptyParams = Record<string, never>;
type DefaultQuery = Record<string, string | string[] | undefined>;
type DefaultLocals = Record<string, unknown>;

type AsyncHandler<
  P = EmptyParams,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = DefaultQuery,
  Locals extends DefaultLocals = DefaultLocals,
> = (
  req: Request<P, ResBody, ReqBody, ReqQuery, Locals>,
  res: Response<ResBody, Locals>,
  next: NextFunction,
) => Promise<void>;

const asyncRoute = <
  P = EmptyParams,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = DefaultQuery,
  Locals extends DefaultLocals = DefaultLocals,
>(
  handler: AsyncHandler<P, ResBody, ReqBody, ReqQuery, Locals>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> => {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
};

export function registerRoutes(app: Express) {
  const router = Router();
  const taskPath = resolveFromRoot("tasks.md");

  app.use("/api", createHttpErrorLogger());

  router.get(
    "/files",
    asyncRoute<
      EmptyParams,
      FilesResponse | ErrorResponse,
      void,
      FilesRequestQuery
    >(async (req, res, next) => {
      const query = normalizeQueryParam(req.query.q).trim();
      const directoryParam = normalizeQueryParam(req.query.dir);

      let directory = "";
      try {
        directory = normalizeDirectoryQueryParam(directoryParam);
      } catch (error) {
        res.status(400).json({ error: (error as Error).message });
        return;
      }

      try {
        const response = await getFiles(query, directory);
        res.json(response);
      } catch (error) {
        handleFileError(error, res, next);
      }
    }),
  );

  router.get(
    "/file",
    asyncRoute<
      EmptyParams,
      FileContentResponse | ErrorResponse,
      void,
      FileRequestQuery
    >(async (req, res, next) => {
      const pathParam = normalizeQueryParam(req.query.path);

      try {
        const response = await getFileContent(pathParam);
        res.json(response);
      } catch (error) {
        handleFileContentError(error, res, next);
      }
    }),
  );

  router.get(
    "/tasks",
    asyncRoute<EmptyParams, TasksResponse | ErrorResponse>(
      async (_req, res, next) => {
        try {
          const response = await getTasks(taskPath);
          res.json(response);
        } catch (error) {
          handleTaskError(error, res, next);
        }
      },
    ),
  );

  router.post(
    "/tasks",
    asyncRoute<EmptyParams, AddTaskResponse | ErrorResponse, CreateTaskRequest>(
      async (req, res, next) => {
        const validationResult = extractTextFromBody(req.body);

        if ("error" in validationResult) {
          res.status(400).json({ error: validationResult.error });
          return;
        }

        try {
          const result = await addTask(taskPath, validationResult.text);
          res.status(201).json(result);
        } catch (error) {
          handleTaskError(error, res, next);
        }
      },
    ),
  );

  router.post(
    "/tasks/run",
    (
      req: Request<
        EmptyParams,
        void | ErrorResponse,
        Partial<RunTaskRequest> | undefined
      >,
      res: Response<void | ErrorResponse>,
    ) => {
      const body = req.body;

      if (typeof body !== "object" || body === null) {
        res.status(400).json({ error: "Request body must be an object" });
        return;
      }

      const bodyObj = body as Partial<RunTaskRequest> & Record<string, unknown>;
      const description =
        typeof bodyObj.description === "string"
          ? bodyObj.description
          : undefined;
      const sessionId =
        typeof bodyObj.sessionId === "string" ? bodyObj.sessionId : undefined;
      const agentValue = bodyObj.agent;
      const sandboxValue = bodyObj.sandbox;

      if (!isAgentName(agentValue)) {
        res.status(400).json({ error: "Agent must be one of: codex, claude" });
        return;
      }

      const agent = agentValue;
      if (!isSandboxMode(sandboxValue)) {
        res
          .status(400)
          .json({ error: "Sandbox must be one of: project, yolo" });
        return;
      }

      const sandbox = sandboxValue;
      const trimmedDescription =
        description !== undefined ? description.trim() : undefined;

      if (trimmedDescription === undefined && !sessionId) {
        res
          .status(400)
          .json({ error: "Either 'description' or 'sessionId' is required" });
        return;
      }

      if (!sessionId && trimmedDescription === "") {
        res.status(400).json({ error: "Task description cannot be empty" });
        return;
      }

      try {
        runTask(trimmedDescription, agent, sandbox, res, sessionId);
      } catch (error) {
        res
          .status(500)
          .json({ error: (error as Error)?.message ?? "Failed to run task" });
      }
    },
  );

  router.put(
    "/tasks/reorder",
    asyncRoute<EmptyParams, TasksResponse | ErrorResponse, ReorderTasksRequest>(
      async (req, res, next) => {
        const body = req.body as
          | Partial<ReorderTasksRequest>
          | null
          | undefined;

        if (typeof body !== "object" || body === null) {
          res.status(400).json({ error: "Request body must be an object" });
          return;
        }

        const { fromIndex, toIndex } = body;

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

        try {
          const result = await reorderTask(taskPath, fromIndex, toIndex);
          res.json(result);
        } catch (error) {
          handleTaskError(error, res, next);
        }
      },
    ),
  );

  router.put(
    "/tasks/:index(\\d+)",
    asyncRoute<
      TaskIndexParams,
      TasksResponse | ErrorResponse,
      UpdateTaskRequest
    >(async (req, res, next) => {
      const indexParam = req.params.index;
      const index = Number.parseInt(indexParam, 10);

      if (Number.isNaN(index)) {
        res.status(400).json({ error: "index must be a valid number" });
        return;
      }

      const validationResult = extractTextFromBody(req.body);

      if ("error" in validationResult) {
        res.status(400).json({ error: validationResult.error });
        return;
      }

      try {
        const result = await updateTask(taskPath, index, validationResult.text);
        res.json(result);
      } catch (error) {
        handleTaskError(error, res, next);
      }
    }),
  );

  router.delete(
    "/tasks/:index",
    asyncRoute<TaskIndexParams, TasksResponse | ErrorResponse>(
      async (req, res, next) => {
        const indexParam = req.params.index;
        const index = Number.parseInt(indexParam, 10);

        if (Number.isNaN(index)) {
          res.status(400).json({ error: "index must be a valid number" });
          return;
        }

        try {
          const result = await removeTask(taskPath, index);
          res.json(result);
        } catch (error) {
          handleTaskError(error, res, next);
        }
      },
    ),
  );

  router.get(
    "/git/status",
    asyncRoute<EmptyParams, GitStatusResponse | ErrorResponse>(
      async (_req, res) => {
        try {
          const response = await getGitStatus();
          res.json(response);
        } catch (error) {
          handleGitError(error, res);
        }
      },
    ),
  );

  router.get(
    "/git/diff",
    asyncRoute<EmptyParams, GitDiffResponse | ErrorResponse>(
      async (_req, res) => {
        try {
          const response = await getGitDiff();
          res.json(response);
        } catch (error) {
          handleGitError(error, res);
        }
      },
    ),
  );

  router.post(
    "/git/stage-all",
    asyncRoute<EmptyParams, StageAllResponse | ErrorResponse>(
      async (_req, res) => {
        try {
          await stageAll();
          const response: StageAllResponse = { success: true };
          res.status(200).json(response);
        } catch (error) {
          handleGitError(error, res);
        }
      },
    ),
  );

  router.post(
    "/git/commit",
    asyncRoute<EmptyParams, CommitResponse | ErrorResponse, CommitRequest>(
      async (req, res) => {
        const validationResult = extractTextFromBody(req.body);

        if ("error" in validationResult) {
          res.status(400).json({ error: validationResult.error });
          return;
        }

        try {
          await commitStaged(validationResult.text);
          const response: CommitResponse = { success: true };
          res.status(200).json(response);
        } catch (error) {
          handleGitError(error, res);
        }
      },
    ),
  );

  router.get(
    "/shell/suggestions",
    (
      req: Request<
        EmptyParams,
        ShellSuggestionsResponse | ErrorResponse,
        void,
        ShellSuggestionsQuery
      >,
      res: Response<ShellSuggestionsResponse | ErrorResponse>,
    ) => {
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
    },
  );

  router.post(
    "/command/run",
    (
      req: Request<
        EmptyParams,
        void | ErrorResponse,
        CommandRunRequest | undefined
      >,
      res: Response<void | ErrorResponse>,
    ) => {
      const body = req.body;

      // Validate body is an object
      if (typeof body !== "object" || body === null) {
        res.status(400).json({ error: "Request body must be an object" });
        return;
      }

      const bodyObj = body as Partial<CommandRunRequest> &
        Record<string, unknown>;

      // Extract text and sessionId
      const text =
        typeof bodyObj.text === "string" ? bodyObj.text.trim() : undefined;
      const sessionId =
        typeof bodyObj.sessionId === "string" ? bodyObj.sessionId : undefined;

      // Either text or sessionId must be provided
      if (!text && !sessionId) {
        res
          .status(400)
          .json({ error: "Either 'text' or 'sessionId' is required" });
        return;
      }

      // If text is provided, it cannot be empty
      if (text !== undefined && !text) {
        res.status(400).json({ error: "Command cannot be empty" });
        return;
      }

      // Run command with SSE streaming (text may be undefined for reconnection)
      runCommand(text || "", res, sessionId);
    },
  );

  router.get(
    "/command/runs",
    (
      _req: Request<EmptyParams, CommandRunsResponse>,
      res: Response<CommandRunsResponse>,
    ) => {
      const runs = getCommandRuns();
      res.json(runs);
    },
  );

  router.delete(
    "/commands/:id",
    (
      req: Request<CommandStopParams, CommandStopResponse | ErrorResponse>,
      res: Response<CommandStopResponse | ErrorResponse>,
    ) => {
      const idParam = req.params.id;

      if (typeof idParam !== "string" || !idParam.trim()) {
        res.status(400).json({ error: "Command session id is required" });
        return;
      }

      const sessionId = idParam.trim();
      const result = stopCommand(sessionId);

      switch (result.status) {
        case "not_found": {
          res.status(404).json({ error: "Command not found" });
          return;
        }
        case "already_complete": {
          res.status(200).json({
            sessionId,
            status: result.status,
            exitCode: result.exitCode,
          });
          return;
        }
        case "stopping": {
          res.status(202).json({
            sessionId,
            status: result.status,
          });
          return;
        }
      }
    },
  );

  app.use("/api", router);

  app.use("/api", (req: Request, res: Response<ErrorResponse>) => {
    res.status(404).json({ error: "Endpoint not found" });
  });

  app.use(
    "/api",
    (
      error: unknown,
      req: Request,
      res: Response<ErrorResponse>,
      next: NextFunction,
    ): void => {
      void next;

      if (res.headersSent) {
        return;
      }

      const statusFromError =
        typeof (error as { status?: number })?.status === "number"
          ? (error as { status?: number }).status
          : undefined;

      const statusCode =
        statusFromError !== undefined && statusFromError >= 400
          ? statusFromError
          : 500;

      if (statusCode >= 500) {
        logError(
          error,
          `Unhandled API error for ${req.method} ${req.originalUrl}`,
        );
      }

      const responseMessage =
        statusCode >= 500
          ? "Internal server error"
          : ((error as Error)?.message ?? "Request failed");

      res.status(statusCode).json({ error: responseMessage });
    },
  );
}
