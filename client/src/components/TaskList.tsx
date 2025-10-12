import { FormEvent, useEffect, useState } from "react";
import type { TasksResponse } from "@shared/messages";
import MultilineTaskModal from "@/components/MultilineTaskModal";
import NavigationBar from "@/components/NavigationBar";

type TaskListProps = {
  onBackToBrowser: () => void;
};

const TaskList = ({ onBackToBrowser }: TaskListProps) => {
  const [tasks, setTasks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isMultilineModalOpen, setIsMultilineModalOpen] = useState(false);

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

  const reorderTask = async (fromIndex: number, toIndex: number) => {
    try {
      const response = await fetch("/api/tasks/reorder", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fromIndex, toIndex }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as TasksResponse;
      setTasks(data.items);
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

  const deleteTask = async (index: number) => {
    try {
      const response = await fetch(`/api/tasks/${index}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as TasksResponse;
      setTasks(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  };

  return (
    <>
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
          Outstanding items
        </p>
        <p className="mt-2 text-base text-slate-400">
          Review the remaining tasks pulled from{" "}
          <span className="font-mono">tasks.md</span>
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Add new tasks below and prompt your agent to follow instructions in
          ./tasks.md
        </p>
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
          <ul className="space-y-3">
            {tasks.map((item, index) => (
              <li
                key={`${item}-${index}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                className={`group flex cursor-move items-center gap-3 rounded border px-4 py-3 text-sm text-slate-100 transition-all ${
                  draggedIndex === index
                    ? "border-slate-600 bg-slate-800/90 opacity-50"
                    : dragOverIndex === index && draggedIndex !== null
                      ? "border-slate-500 bg-slate-800/80"
                      : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/80"
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <svg
                    className="h-4 w-4 flex-shrink-0 text-slate-600 transition-colors group-hover:text-slate-400"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <circle cx="4" cy="3" r="1.5" />
                    <circle cx="12" cy="3" r="1.5" />
                    <circle cx="4" cy="8" r="1.5" />
                    <circle cx="12" cy="8" r="1.5" />
                    <circle cx="4" cy="13" r="1.5" />
                    <circle cx="12" cy="13" r="1.5" />
                  </svg>
                  <button
                    type="button"
                    onClick={() => {
                      void deleteTask(index);
                    }}
                    className="flex-shrink-0 rounded p-1 text-slate-400 transition hover:bg-red-900/30 hover:text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
                    aria-label="Delete task"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M3 3 L13 13 M13 3 L3 13" />
                    </svg>
                  </button>
                </div>
                <span className="flex-1 whitespace-pre-wrap">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <MultilineTaskModal
        isOpen={isMultilineModalOpen}
        onClose={() => setIsMultilineModalOpen(false)}
        onSubmit={handleMultilineSubmit}
      />
      <NavigationBar currentPath="Tasks" onBack={onBackToBrowser} />
    </>
  );
};

export default TaskList;
