import {
  memo,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { HistoryEntry, ShellSuggestionsResponse } from "@shared/messages";
import Toolbar from "@/components/Toolbar";

type CommandRunnerProps = {
  onBackToBrowser: () => void;
};

const SEARCH_DEBOUNCE_MS = 150;

const CommandRunner = ({ onBackToBrowser }: CommandRunnerProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HistoryEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      if (requestRef.current) {
        requestRef.current.abort();
        requestRef.current = null;
      }
      setResults([]);
      setError(null);
      setIsSearching(false);
      return;
    }

    if (requestRef.current) {
      requestRef.current.abort();
      requestRef.current = null;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    setIsSearching(true);
    setError(null);

    const executeSearch = async () => {
      try {
        const params = new URLSearchParams();
        params.set("q", trimmedQuery);

        const response = await fetch(
          `/api/shell/suggestions?${params.toString()}`,
          {
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as ShellSuggestionsResponse;

        if (!controller.signal.aborted) {
          setResults(data.commands);
        }
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setResults([]);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (requestRef.current === controller) {
          requestRef.current = null;
        }

        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    };

    const timeoutId = window.setTimeout(() => {
      void executeSearch();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  const handleResultClick = useCallback((command: string) => {
    // TODO: Implement submit function
    console.log("Command selected:", command);
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const [firstResult] = results;
      if (firstResult) {
        // TODO: Implement submit function
        console.log("Command submitted:", firstResult.command);
      }
    },
    [results],
  );

  const emptyStateMessage = useMemo(() => {
    if (!query.trim()) {
      return "Enter command to execute.";
    }

    if (error) {
      return "Unable to search shell history";
    }

    if (results.length === 0) {
      return isSearching
        ? "Searching in shell history…"
        : "No matching commands were found.";
    }

    return null;
  }, [error, isSearching, query, results.length]);

  return (
    <>
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
          Command runner
        </p>
        <p className="mt-2 text-base text-slate-400">
          Execute shell commands with real-time output
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Search your shell history or type a new command to run
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <form
          onSubmit={handleSubmit}
          className="rounded border border-slate-800 bg-slate-900/70 p-4"
        >
          <div className="flex items-center gap-3">
            <span aria-hidden className="text-sm text-slate-500">
              $
            </span>
            <label htmlFor="command-input" className="sr-only">
              Command
            </label>
            <input
              id="command-input"
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Start typing a command"
              className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:outline-none"
            />
          </div>
        </form>

        {emptyStateMessage ? (
          <p className="py-4 font-mono text-sm text-slate-400">
            {emptyStateMessage}
          </p>
        ) : (
          <ul className="space-y-2">
            {results.map((result, index) => (
              <li key={`${result.command}-${index}`}>
                <button
                  type="button"
                  onClick={() => handleResultClick(result.command)}
                  className="flex w-full items-center justify-between gap-3 rounded border border-slate-800 bg-slate-900/60 px-4 py-3 text-left text-sm text-slate-100 transition hover:border-slate-700 hover:bg-slate-900/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                >
                  <span className="flex-1 break-all font-mono">
                    {result.command}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Run
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Toolbar currentPath="Commands" onBack={onBackToBrowser} />
    </>
  );
};

export default memo(CommandRunner);
