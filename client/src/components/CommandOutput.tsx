import { memo, useEffect, useRef, useState } from "react";
import { highlightCode } from "@/utils/syntaxHighlighting";
import Toolbar from "@/components/Toolbar";
import type { CommandOutput, CommandStopResponse } from "@shared/commandRunner";

type SSEEvent =
  | {
      type: "session";
      data: string;
    }
  | CommandOutput;

type CommandOutputProps = {
  sessionId: string;
  onBackToBrowser: () => void;
};

const CommandOutput = ({ sessionId, onBackToBrowser }: CommandOutputProps) => {
  const [output, setOutput] = useState<string>("");
  const [isComplete, setIsComplete] = useState(false);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const [stopError, setStopError] = useState<string | null>(null);
  const [exitMessage, setExitMessage] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const abortController = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    const connectToStream = async () => {
      try {
        const response = await fetch("/api/command/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to connect: ${response.status}`);
        }

        reader = response.body?.getReader() ?? null;
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          if (abortController.signal.aborted) {
            await reader.cancel();
            return;
          }

          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              try {
                const data = JSON.parse(dataStr) as SSEEvent;

                switch (data.type) {
                  case "session":
                    // Session ID received
                    break;

                  case "stdout":
                    setOutput((prev) => prev + data.data);
                    break;

                  case "stderr":
                    setOutput((prev) => prev + data.data);
                    break;

                  case "exit":
                    setIsComplete(true);
                    setExitCode(data.code ?? null);
                    setExitMessage(data.data);
                    setIsStopping(false);
                    return;

                  case "error":
                    setError(data.data);
                    setIsComplete(true);
                    setExitCode(null);
                    setExitMessage(null);
                    setIsStopping(false);
                    return;
                }
              } catch (err) {
                console.error("Error parsing SSE message:", err);
              }
            }
          }
        }
      } catch (err) {
        if (abortController.signal.aborted) {
          return;
        }

        console.error("Stream connection error:", err);
        setError(err instanceof Error ? err.message : "Connection failed");
        setIsStopping(false);
      }
    };

    void connectToStream();

    return () => {
      abortController.abort();
      if (reader) {
        void reader.cancel().catch(() => {
          // Reader cancellation can throw if stream already closed; ignore.
        });
      }
    };
  }, [sessionId]);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    setIsStopping(false);
    setStopError(null);
    setExitMessage(null);
  }, [sessionId]);

  const handleStop = async () => {
    setStopError(null);
    setIsStopping(true);

    try {
      const response = await fetch(`/api/commands/${sessionId}`, {
        method: "DELETE",
      });

      if (response.status === 404) {
        throw new Error("Command not found");
      }

      const data = (await response
        .json()
        .catch(() => null)) as CommandStopResponse | null;

      if (!response.ok) {
        throw new Error(`Failed to stop command: ${response.status}`);
      }

      if (data?.status === "already_complete") {
        setIsStopping(false);
        setIsComplete(true);
      }
    } catch (err) {
      console.error("Error stopping command:", err);
      setStopError(
        err instanceof Error ? err.message : "Failed to stop command",
      );
      setIsStopping(false);
    }
  };

  const highlighted = highlightCode(output, "bash", false);
  const statusText = (() => {
    if (!isComplete) {
      return isStopping ? "Stopping..." : "Running...";
    }

    if (exitMessage) {
      return exitCode === null
        ? exitMessage
        : `${exitMessage} (code ${exitCode})`;
    }

    return exitCode === null
      ? "Process exited"
      : `Process exited with code ${exitCode}`;
  })();

  const statusClassName = (() => {
    if (!isComplete) {
      return isStopping ? "text-orange-400" : "text-blue-400";
    }

    if (exitMessage && exitMessage.toLowerCase().includes("stopped")) {
      return "text-orange-400";
    }

    if (exitCode === 0) {
      return "text-green-500";
    }

    return "text-red-500";
  })();

  return (
    <>
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
          Command Output
        </p>
        <div className="mt-2 flex items-center gap-3">
          <span className={`text-sm ${statusClassName}`}>{statusText}</span>
          <button
            type="button"
            onClick={() => {
              void handleStop();
            }}
            disabled={isComplete || isStopping}
            className="flex items-center gap-2 rounded border border-red-800 px-3 py-1 text-xs font-medium uppercase tracking-wider text-red-400 transition hover:border-red-600 hover:bg-red-900/40 hover:text-red-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 disabled:hover:bg-transparent"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <rect x="5" y="5" width="10" height="10" rx="1" />
            </svg>
            <span>Stop</span>
          </button>
        </div>
        {stopError && <p className="mt-1 text-xs text-red-400">{stopError}</p>}
      </header>

      <div className="flex flex-col gap-4">
        {error ? (
          <div className="rounded border border-red-800 bg-red-900/20 p-4 text-sm text-red-400">
            Error: {error}
          </div>
        ) : (
          <div
            className="overflow-x-auto"
            style={{
              width: "100vw",
              position: "relative",
              left: "50%",
              right: "50%",
              marginLeft: "-50vw",
              marginRight: "-50vw",
            }}
          >
            <div
              ref={outputRef}
              className="max-h-[70vh] overflow-auto"
            >
              <pre className="min-w-full rounded-lg bg-slate-950/60 font-mono text-sm leading-relaxed">
                <code
                  className="hljs"
                  dangerouslySetInnerHTML={{ __html: highlighted.html }}
                />
              </pre>
            </div>
          </div>
        )}
      </div>

      <Toolbar currentPath={`Command: ${sessionId}`} onBack={onBackToBrowser} />
    </>
  );
};

export default memo(CommandOutput);
