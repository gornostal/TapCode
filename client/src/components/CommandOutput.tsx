import { memo, useEffect, useRef, useState } from "react";
import { highlightCode } from "@/utils/syntaxHighlighting";
import Toolbar from "@/components/Toolbar";
import type { CommandOutput } from "@shared/commandRunner";

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
                    return;

                  case "error":
                    setError(data.data);
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

  const highlighted = highlightCode(output, "bash", false);

  return (
    <>
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
          Command Output
        </p>
        <div className="mt-2 flex items-center gap-3">
          {isComplete ? (
            <span
              className={`text-sm ${
                exitCode === 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              Process exited with code {exitCode}
            </span>
          ) : (
            <span className="text-sm text-blue-400">Running...</span>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-4">
        {error ? (
          <div className="rounded border border-red-800 bg-red-900/20 p-4 text-sm text-red-400">
            Error: {error}
          </div>
        ) : (
          <div
            ref={outputRef}
            className="max-h-[70vh] overflow-auto rounded border border-slate-800 bg-slate-950/50 p-4"
          >
            <pre className="font-mono text-sm">
              <code
                className="hljs"
                dangerouslySetInnerHTML={{ __html: highlighted.html }}
              />
            </pre>
          </div>
        )}
      </div>

      <Toolbar currentPath={`Command: ${sessionId}`} onBack={onBackToBrowser} />
    </>
  );
};

export default memo(CommandOutput);
