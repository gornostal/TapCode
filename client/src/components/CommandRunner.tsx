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
import type { CommandRunSummary } from "@shared/commandRunner";
import Toolbar from "@/components/Toolbar";

type CommandRunnerProps = {
  onBackToBrowser: () => void;
  onOpenCommandOutput: (sessionId: string) => void;
};

const SEARCH_DEBOUNCE_MS = 150;
const REFRESH_INTERVAL_MS = 2000;

const CommandRunner = ({
  onBackToBrowser,
  onOpenCommandOutput,
}: CommandRunnerProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HistoryEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [runningCommands, setRunningCommands] = useState<CommandRunSummary[]>(
    [],
  );

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
    setQuery(command);
    // Focus the input and move cursor to the end
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(command.length, command.length);
      }
    }, 0);
  }, []);

  const fetchRunningCommands = useCallback(async () => {
    try {
      const response = await fetch("/api/command/runs");
      if (!response.ok) {
        throw new Error(`Failed to fetch running commands`);
      }
      const data = (await response.json()) as CommandRunSummary[];
      setRunningCommands(data);
    } catch (err) {
      console.error("Error fetching running commands:", err);
    }
  }, []);

  useEffect(() => {
    void fetchRunningCommands();

    const intervalId = setInterval(() => {
      void fetchRunningCommands();
    }, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchRunningCommands]);

  const startCommand = useCallback(async () => {
    const commandToRun = query.trim() || results[0]?.command;
    if (!commandToRun) {
      return;
    }

    try {
      // Start the command by making a POST request
      const response = await fetch("/api/command/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: commandToRun }),
      });

      if (!response.ok) {
        throw new Error("Failed to start command");
      }

      // Read the SSE stream to get the sessionId from the first event
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      // Read the first event which contains the session ID
      const { value } = await reader.read();
      if (value) {
        buffer = decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr) as {
                type: string;
                data: string;
              };
              if (data.type === "session") {
                // Got the session ID, navigate to output view
                setQuery("");
                onOpenCommandOutput(data.data);
                // Cancel the reader since we're navigating away
                await reader.cancel();
                return;
              }
            } catch (err) {
              console.error("Error parsing SSE message:", err);
            }
          }
        }
      }

      // If we didn't get a session ID, fall back to refreshing the list
      await reader.cancel();
      void fetchRunningCommands();
      setQuery("");
    } catch (err) {
      console.error("Error starting command:", err);
    }
  }, [query, results, fetchRunningCommands, onOpenCommandOutput]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void startCommand();
    },
    [startCommand],
  );

  const handleStopCommand = useCallback(
    async (sessionId: string) => {
      setRunningCommands((prev) =>
        prev.map((cmd) =>
          cmd.sessionId === sessionId ? { ...cmd, stopRequested: true } : cmd,
        ),
      );

      try {
        const response = await fetch(`/api/commands/${sessionId}`, {
          method: "DELETE",
        });

        if (!response.ok && response.status !== 404) {
          throw new Error(`Failed to stop command: ${response.status}`);
        }
      } catch (err) {
        console.error("Error stopping command:", err);
      } finally {
        void fetchRunningCommands();
      }
    },
    [fetchRunningCommands],
  );

  const emptyStateMessage = useMemo(() => {
    if (!query.trim()) {
      return "Enter a command to execute.";
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

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) {
      return "just now";
    } else if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    } else if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <>
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
          Command runner
        </p>
        <p className="mt-2 text-base text-slate-400">
          Execute shell commands with real-time output
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

        {runningCommands.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-400">
              Running & Recent Commands
            </h3>
            <ul className="space-y-2">
              {runningCommands.map((cmd) => (
                <li key={cmd.sessionId}>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenCommandOutput(cmd.sessionId)}
                      className="flex w-full flex-1 items-center justify-between gap-3 rounded border border-slate-800 bg-slate-900/60 px-4 py-3 text-left text-sm transition hover:border-slate-700 hover:bg-slate-900/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="font-mono text-slate-100">
                          {cmd.command}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{formatTime(cmd.startTime)}</span>
                          {cmd.isComplete ? (
                            cmd.stopRequested ? (
                              <span className="text-orange-400">stopped</span>
                            ) : (
                              <span
                                className={
                                  cmd.exitCode === 0
                                    ? "text-green-500"
                                    : "text-red-500"
                                }
                              >
                                {typeof cmd.exitCode === "number"
                                  ? `exited ${cmd.exitCode}`
                                  : "exited"}
                              </span>
                            )
                          ) : cmd.stopRequested ? (
                            <span className="text-orange-400">stopping...</span>
                          ) : (
                            <span className="text-blue-400">running...</span>
                          )}
                        </div>
                      </div>
                      <span aria-hidden className="text-slate-500">
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </span>
                    </button>
                    {!cmd.isComplete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleStopCommand(cmd.sessionId);
                        }}
                        disabled={cmd.stopRequested}
                        className="rounded border border-slate-800 bg-slate-900/60 px-3 py-3 text-sm text-slate-400 transition hover:border-red-700 hover:bg-red-900/20 hover:text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-800 disabled:hover:bg-slate-900/60 disabled:hover:text-slate-400"
                        title={
                          cmd.stopRequested ? "Stopping..." : "Stop command"
                        }
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="6" y="6" width="12" height="12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

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
                  <span aria-hidden className="text-slate-500">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 17L7 7" />
                      <path d="M7 15V7h8" />
                    </svg>
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
