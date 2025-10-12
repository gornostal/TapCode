import { useEffect, useState } from "react";
import type { TodosResponse } from "@shared/messages";

type TodoListProps = {
  projectName: string;
  onBackToBrowser: () => void;
};

const TodoList = ({ projectName, onBackToBrowser }: TodoListProps) => {
  const [todos, setTodos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          Use the file browser to add new todos or mark them complete.
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
            {todos.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-100"
              >
                <span aria-hidden className="mt-0.5 text-lg">
                  ✅
                </span>
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
