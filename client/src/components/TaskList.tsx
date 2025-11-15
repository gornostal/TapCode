import { FormEvent, useCallback, useEffect, useState } from "react";
import { isAgentName } from "@shared/agents";
import { COMMAND_SESSION_HEADER } from "@shared/commandRunner";
import type {
  AddTaskResponse,
  CreateTaskRequest,
  RunTaskRequest,
  ReorderTasksRequest,
  TasksResponse,
  UpdateTaskRequest,
} from "@shared/tasks";
import EditTaskModal from "@/components/EditTaskModal";
import MultilineTaskModal from "@/components/MultilineTaskModal";
import AgentSelectionModal, {
  type AgentSettings,
} from "@/components/AgentSelectionModal";
import Toolbar from "@/components/Toolbar";
import type { ErrorResponse } from "@shared/http";
import { isSandboxMode } from "@shared/sandbox";
import { RunTaskIcon } from "./icons";

type TaskListProps = {
  onBackToBrowser: () => void;
  onOpenCommandOutput: (sessionId: string) => void;
};

const DRAFT_STORAGE_KEY = "taskList-draft";
const AGENT_SETTINGS_STORAGE_KEY = "agent-settings";

const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  agent: "claude",
  sandbox: "project",
};

const loadStoredAgentSettings = (): AgentSettings => {
  if (typeof window === "undefined") {
    return DEFAULT_AGENT_SETTINGS;
  }

  try {
    const storedValue = window.localStorage.getItem(AGENT_SETTINGS_STORAGE_KEY);
    if (!storedValue) {
      return DEFAULT_AGENT_SETTINGS;
    }

    const parsed = JSON.parse(storedValue) as Partial<AgentSettings>;
    const agent = isAgentName(parsed.agent)
      ? parsed.agent
      : DEFAULT_AGENT_SETTINGS.agent;
    const sandbox = isSandboxMode(parsed.sandbox)
      ? parsed.sandbox
      : DEFAULT_AGENT_SETTINGS.sandbox;

    return { agent, sandbox };
  } catch {
    return DEFAULT_AGENT_SETTINGS;
  }
};

const generateRequestId = (): string => {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const TaskList = ({ onBackToBrowser, onOpenCommandOutput }: TaskListProps) => {
  const [tasks, setTasks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState(() => {
    // Load draft from session storage on mount
    return sessionStorage.getItem(DRAFT_STORAGE_KEY) || "";
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isMultilineModalOpen, setIsMultilineModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [agentSettings, setAgentSettings] = useState<AgentSettings>(() =>
    loadStoredAgentSettings(),
  );
  const [isStartingTask, setIsStartingTask] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadTasks = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/tasks", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as TasksResponse;

        if (!controller.signal.aborted) {
          setTasks(data.items);
        }
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadTasks();

    return () => {
      controller.abort();
    };
  }, []);

  // Save draft to session storage whenever it changes
  useEffect(() => {
    if (newTaskText) {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, newTaskText);
    } else {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, [newTaskText]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        AGENT_SETTINGS_STORAGE_KEY,
        JSON.stringify(agentSettings),
      );
    } catch {
      // Ignore storage persistence issues to avoid surfacing errors in UI.
    }
  }, [agentSettings]);

  const addTask = async (trimmed: string) => {
    setIsSubmitting(true);

    try {
      const requestBody: CreateTaskRequest = { text: trimmed };
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const payload = (await response.json().catch(() => null)) as
        | AddTaskResponse
        | ErrorResponse
        | null;

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? payload.error
            : `Request failed with status ${response.status}`;
        throw new Error(message);
      }

      if (
        !payload ||
        typeof payload !== "object" ||
        !("text" in payload) ||
        typeof payload.text !== "string"
      ) {
        throw new Error("Unexpected server response.");
      }

      setTasks((current) => [payload.text, ...current]);
      setNewTaskText("");
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = newTaskText.trim();

    if (!trimmed) {
      setSubmitError("Enter a task before adding it.");
      return;
    }

    setSubmitError(null);
    void addTask(trimmed);
  };

  const reorderTask = async (fromIndex: number, toIndex: number) => {
    try {
      const requestBody: ReorderTasksRequest = { fromIndex, toIndex };
      const response = await fetch("/api/tasks/reorder", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const payload = (await response.json().catch(() => null)) as
        | TasksResponse
        | ErrorResponse
        | null;

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? payload.error
            : `Request failed with status ${response.status}`;
        throw new Error(message);
      }

      if (
        !payload ||
        typeof payload !== "object" ||
        !("items" in payload) ||
        !Array.isArray(payload.items)
      ) {
        throw new Error("Unexpected server response.");
      }

      setTasks(payload.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder tasks");
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (event: React.DragEvent, toIndex: number) => {
    event.preventDefault();

    if (draggedIndex !== null && draggedIndex !== toIndex) {
      void reorderTask(draggedIndex, toIndex);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleMultilineSubmit = async (text: string) => {
    await addTask(text);
  };

  const updateTask = async (index: number, text: string) => {
    try {
      const requestBody: UpdateTaskRequest = { text };
      const response = await fetch(`/api/tasks/${index}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const payload = (await response.json().catch(() => null)) as
        | TasksResponse
        | ErrorResponse
        | null;

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? payload.error
            : `Request failed with status ${response.status}`;
        throw new Error(message);
      }

      if (
        !payload ||
        typeof payload !== "object" ||
        !("items" in payload) ||
        !Array.isArray(payload.items)
      ) {
        throw new Error("Unexpected server response.");
      }

      const updatedItems = payload.items;

      setTasks(updatedItems);
      if (updatedItems.length === 0) {
        setSelectedIndex(null);
      } else {
        const nextSelectedIndex = Math.min(index, updatedItems.length - 1);
        setSelectedIndex(nextSelectedIndex);
      }
      setRunError(null);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update task";
      setError(message);

      if (err instanceof Error) {
        throw err;
      }

      throw new Error(message);
    }
  };

  const handleRunSelectedTask = useCallback(
    async (settingsOverride?: AgentSettings) => {
      if (isStartingTask) {
        return;
      }

      if (selectedIndex === null) {
        setRunError("Select a task to run before starting it.");
        return;
      }

      const selectedTask = tasks[selectedIndex];
      const task = selectedTask?.trim();

      if (!task) {
        setRunError("Selected task is empty.");
        return;
      }

      setRunError(null);
      setIsStartingTask(true);

      try {
        const effectiveSettings = settingsOverride ?? agentSettings;
        const requestId = generateRequestId();
        const requestBody: RunTaskRequest = {
          description: task,
          agent: effectiveSettings.agent,
          sandbox: effectiveSettings.sandbox,
          requestId,
        };

        const response = await fetch("/api/tasks/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          let message = `Request failed with status ${response.status}`;

          try {
            const data = (await response.json()) as ErrorResponse;
            if (data.error) {
              message = data.error;
            }
          } catch {
            // Ignore JSON parse errors as we'll surface default message.
          }

          throw new Error(message);
        }

        const sessionIdFromHeader = response.headers.get(
          COMMAND_SESSION_HEADER,
        );
        if (!sessionIdFromHeader) {
          throw new Error(
            "Task run started but session information was missing.",
          );
        }

        onOpenCommandOutput(sessionIdFromHeader);
      } catch (err) {
        setRunError(
          err instanceof Error ? err.message : "Failed to start task run.",
        );
      } finally {
        setIsStartingTask(false);
      }
    },
    [agentSettings, isStartingTask, selectedIndex, tasks, onOpenCommandOutput],
  );

  const deleteTask = async () => {
    if (selectedIndex === null) return;

    try {
      const response = await fetch(`/api/tasks/${selectedIndex}`, {
        method: "DELETE",
      });

      const payload = (await response.json().catch(() => null)) as
        | TasksResponse
        | ErrorResponse
        | null;

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? payload.error
            : `Request failed with status ${response.status}`;
        throw new Error(message);
      }

      if (
        !payload ||
        typeof payload !== "object" ||
        !("items" in payload) ||
        !Array.isArray(payload.items)
      ) {
        throw new Error("Unexpected server response.");
      }

      setTasks(payload.items);
      setSelectedIndex(null);
      setRunError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  };

  const handleEditSubmit = async (text: string) => {
    if (selectedIndex === null) {
      throw new Error("Select a task before saving changes.");
    }

    await updateTask(selectedIndex, text);
  };

  const handleAgentSettingsSubmit = (settings: AgentSettings) => {
    setAgentSettings(settings);
  };

  const handleAgentSettingsRunTask = (settings: AgentSettings) => {
    setAgentSettings(settings);
    void handleRunSelectedTask(settings);
  };

  const selectedTask =
    selectedIndex !== null ? (tasks[selectedIndex] ?? "") : "";

  return (
    <>
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
          Outstanding items
        </p>
        <p className="mt-2 text-base text-slate-400">
          Tasks are pulled from and saved to{" "}
          <span className="font-mono">tasks.md</span>
        </p>
        {tasks.length === 0 && (
          <p className="mt-2 text-sm text-slate-500">
            Add new tasks below and prompt your agent to follow instructions in
            <span className="font-mono">./tasks.md</span>. Or run them
            non-interactively from here by pressing{" "}
            <RunTaskIcon className="inline w-3 h-3" /> on the toolbar.
          </p>
        )}
      </header>

      <div className="flex flex-col gap-4">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2 rounded border border-slate-800 bg-slate-900/70 p-4 sm:flex-row sm:items-center sm:gap-3"
        >
          <label htmlFor="new-task-text" className="sr-only">
            New task
          </label>
          <input
            id="new-task-text"
            name="text"
            placeholder="Write a new task"
            className="w-full rounded border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
            value={newTaskText}
            onChange={(event) => setNewTaskText(event.target.value)}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            className="w-full rounded bg-slate-100 px-3 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Adding…" : "Add item"}
          </button>
          <button
            type="button"
            onClick={() => setIsMultilineModalOpen(true)}
            className="w-full rounded border border-slate-700 px-3 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-600 hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            disabled={isSubmitting}
          >
            Multiline
          </button>
          {submitError ? (
            <p className="text-sm text-rose-400 sm:w-full sm:text-right">
              {submitError}
            </p>
          ) : null}
        </form>

        {isLoading ? (
          <p className="py-4 font-mono text-sm text-slate-400">
            Loading tasks…
          </p>
        ) : error ? (
          <p className="py-4 font-mono text-sm text-rose-400">
            Unable to load tasks: {error}
          </p>
        ) : tasks.length === 0 ? (
          <p className="py-4 font-mono text-sm text-slate-400">
            Nothing left on the list. Nice work!
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <ul className="space-y-3">
              {tasks.map((item, index) => (
                <li
                  key={`${item}-${index}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onClick={() => {
                    setSelectedIndex(index);
                    setRunError(null);
                  }}
                  onDoubleClick={() => {
                    setSelectedIndex(index);
                    setRunError(null);
                    setIsEditModalOpen(true);
                  }}
                  className={`group flex cursor-move items-center gap-3 rounded border px-4 py-3 text-sm text-slate-100 transition-all ${
                    selectedIndex === index
                      ? "border-slate-500 bg-slate-800/90 ring-2 ring-slate-500"
                      : draggedIndex === index
                        ? "border-slate-600 bg-slate-800/90 opacity-50"
                        : dragOverIndex === index && draggedIndex !== null
                          ? "border-slate-500 bg-slate-800/80"
                          : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/80"
                  }`}
                >
                  <span
                    className="flex-1 whitespace-pre-wrap"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 5,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            {tasks.length > 1 && (
              <p className="text-xs text-slate-500">
                Items can be reordered by dragging.
              </p>
            )}
            {tasks.length > 0 && (
              <p className="text-xs text-slate-500">
                Select a task and run it using coding agents by pressing{" "}
                <RunTaskIcon className="inline w-3 h-3" /> on the toolbar. Long
                press to select an agent.
              </p>
            )}
          </div>
        )}
      </div>
      <MultilineTaskModal
        isOpen={isMultilineModalOpen}
        onClose={() => setIsMultilineModalOpen(false)}
        onSubmit={handleMultilineSubmit}
      />
      <EditTaskModal
        isOpen={isEditModalOpen}
        initialValue={selectedTask}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditSubmit}
      />
      <AgentSelectionModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        onSubmit={handleAgentSettingsSubmit}
        onRunTask={handleAgentSettingsRunTask}
      />
      {runError ? (
        <p className="mt-2 text-sm text-rose-400">{runError}</p>
      ) : null}
      <Toolbar
        statusText="Tasks"
        onBack={onBackToBrowser}
        onEdit={() => {
          if (selectedIndex !== null) {
            setIsEditModalOpen(true);
          }
        }}
        editDisabled={selectedIndex === null}
        onDelete={() => {
          void deleteTask();
        }}
        deleteDisabled={selectedIndex === null}
        onRun={() => {
          void handleRunSelectedTask();
        }}
        runDisabled={selectedIndex === null || isStartingTask}
        onRunLongPress={() => {
          setIsAgentModalOpen(true);
        }}
      />
    </>
  );
};

export default TaskList;
