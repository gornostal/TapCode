import { memo, useEffect, useRef, useState } from "react";
import { highlightCode } from "@/utils/syntaxHighlighting";
import Toolbar from "@/components/Toolbar";
import {
  COMMAND_TEXT_HEADER,
  type CommandOutput,
  type CommandStopResponse,
} from "@shared/commandRunner";
import { usePersistentFontSize } from "@/hooks/usePersistentFontSize";

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
  const [exitMessage, setExitMessage] = useState<string | null>(null);
  const { fontSize, increaseFontSize, decreaseFontSize } =
    usePersistentFontSize("tapcode:editorFontSize");
  const [command, setCommand] = useState<string>("");
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

        const headerCommand = response.headers.get(COMMAND_TEXT_HEADER);
        if (headerCommand) {
          setCommand(decodeURIComponent(headerCommand));
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
                const data = JSON.parse(dataStr) as CommandOutput;

                switch (data.type) {
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
    setExitMessage(null);
  }, [sessionId]);

  const handleStop = () => {
    setIsStopping(true);

    const stopCommand = async () => {
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
        setIsStopping(false);
      }
    };

    void stopCommand();
  };

  const highlighted = highlightCode(output, "markdown", false);

  // Simple status text for toolbar
  const toolbarStatus = (() => {
    if (!isComplete) {
      return isStopping ? "Stopping..." : "Running...";
    }
    return "Stopped";
  })();

  // Detailed status text to display after output
  const detailedStatus = (() => {
    if (!isComplete) {
      return null;
    }

    if (exitMessage) {
      return exitCode === null
        ? exitMessage
        : `${exitMessage} (code ${exitCode})`;
    }

    return exitCode === 0 ? "Exited: OK" : `Error: ${exitCode}`;
  })();

  return (
    <>
      <header>
        {command && (
          <div className="mb-2 rounded bg-slate-900/50 px-3 py-2">
            <code className="text-sm text-slate-300">{command}</code>
          </div>
        )}
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
          Command Output
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {error ? (
          <div className="rounded border border-red-800 bg-red-900/20 p-4 text-sm text-red-400">
            Error: {error}
          </div>
        ) : (
          <>
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
              <div ref={outputRef} className="max-h-[70vh] overflow-auto">
                <pre
                  className="min-w-full rounded-lg bg-slate-950/60 font-mono leading-relaxed"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  <code
                    className="hljs"
                    dangerouslySetInnerHTML={{ __html: highlighted.html }}
                  />
                </pre>
              </div>
            </div>
            {detailedStatus && (
              <div className="text-sm text-slate-400">{detailedStatus}</div>
            )}
          </>
        )}
      </div>

      <Toolbar
        statusText={toolbarStatus}
        onBack={onBackToBrowser}
        onIncreaseFontSize={increaseFontSize}
        onDecreaseFontSize={decreaseFontSize}
        onStop={handleStop}
        stopDisabled={isComplete || isStopping}
      />
    </>
  );
};

export default memo(CommandOutput);
