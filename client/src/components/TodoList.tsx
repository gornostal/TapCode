import { FormEvent, useEffect, useState } from "react";
import type { TodosResponse } from "@shared/messages";

type TodoListProps = {
  projectName: string;
  onBackToBrowser: () => void;
};

const TodoList = ({ projectName, onBackToBrowser }: TodoListProps) => {
  const [todos, setTodos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTodoText, setNewTodoText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadTodos = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/todos", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as TodosResponse;

        if (!controller.signal.aborted) {
          setTodos(data.items);
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

    void loadTodos();

    return () => {
      controller.abort();
    };
  }, []);

  const addTodo = async (trimmed: string) => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/todos", {
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

      setTodos((current) => [data.text as string, ...current]);
      setNewTodoText("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = newTodoText.trim();

    if (!trimmed) {
      setSubmitError("Enter a todo item before adding it.");
      return;
    }

    setSubmitError(null);
    void addTodo(trimmed);
  };

  return (
    <>
      <header>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {projectName ? `${projectName} todos` : "Project todos"}
        </h1>
        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
          Outstanding items
        </p>
        <p className="mt-2 text-base text-slate-400">
          Review the remaining tasks pulled from{" "}
          <span className="font-mono">TODO.md</span>.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Add new todos below or use the file browser to mark them complete.
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
          <label htmlFor="new-todo-text" className="sr-only">
            New todo item
          </label>
          <input
            id="new-todo-text"
            name="text"
            placeholder="Add a new todo item"
            className="w-full rounded border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
            value={newTodoText}
            onChange={(event) => setNewTodoText(event.target.value)}
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
            Loading todos…
          </p>
        ) : error ? (
          <p className="py-4 font-mono text-sm text-rose-400">
            Unable to load todos: {error}
          </p>
        ) : todos.length === 0 ? (
          <p className="py-4 font-mono text-sm text-slate-400">
            Nothing left on the list. Nice work!
          </p>
        ) : (
          <ul className="space-y-3">
            {todos.map((item, index) => (
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

export default TodoList;
