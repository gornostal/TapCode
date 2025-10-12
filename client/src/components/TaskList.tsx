import { FormEvent, useEffect, useState } from "react";
import type { TasksResponse } from "@shared/messages";

type TaskListProps = {
  projectName: string;
  onBackToBrowser: () => void;
};

const TaskList = ({ projectName, onBackToBrowser }: TaskListProps) => {
  const [tasks, setTasks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const addTask = async (trimmed: string) => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!response.ok) {
        let message = `Request failed with status ${response.status}`;

        try {
          const data = (await response.json()) as { error?: string };
          if (data.error) {
            message = data.error;
          }
        } catch {
          // Ignore JSON parse errors and fall back to default message.
        }

        throw new Error(message);
      }

      const data = (await response.json()) as { text?: string };

      if (!data.text) {
        throw new Error("Unexpected server response.");
      }

      setTasks((current) => [data.text as string, ...current]);
      setNewTaskText("");
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

  return (
    <>
      <header>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {projectName ? `${projectName} tasks` : "Project tasks"}
        </h1>
        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
          Outstanding items
        </p>
        <p className="mt-2 text-base text-slate-400">
          Review the remaining tasks pulled from{" "}
          <span className="font-mono">Tasks.md</span>.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Add new tasks below or use the file browser to mark them complete.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToBrowser}
            className="rounded border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-600 hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          >
            Back to files
          </button>
        </div>
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
            placeholder="Add a new task"
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
          <ul className="space-y-3">
            {tasks.map((item, index) => (
              <li
                key={`${item}-${index}`}
                className="rounded border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-100"
              >
                <span className="whitespace-pre-wrap">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export default TaskList;
