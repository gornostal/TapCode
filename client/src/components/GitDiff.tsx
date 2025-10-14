import {
  useEffect,
  useState,
  useMemo,
  useRef,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { GitDiffResponse } from "@shared/messages";
import Toolbar from "@/components/Toolbar";
import AnnotationModal from "@/components/AnnotationModal";
import {
  highlightCode,
  escapeHtml,
  type HighlightResult,
} from "@/utils/syntaxHighlighting";

type GitDiffProps = {
  onBackToBrowser: () => void;
};

const GitDiff = ({ onBackToBrowser }: GitDiffProps) => {
  const [diff, setDiff] = useState<GitDiffResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(10);
  const [selectedLineNumbers, setSelectedLineNumbers] = useState<number[]>([]);
  const [isAnnotationModalOpen, setIsAnnotationModalOpen] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  const highlighted = useMemo<HighlightResult | null>(() => {
    if (!diff?.diff) {
      return null;
    }

    // Use "diff" language for git diff syntax highlighting
    return highlightCode(diff.diff, "diff", true);
  }, [diff]);

  const diffLines = useMemo<string[]>(() => {
    if (!diff?.diff) {
      return [];
    }

    return diff.diff.split("\n");
  }, [diff?.diff]);

  useEffect(() => {
    setSelectedLineNumbers([]);
    setIsAnnotationModalOpen(false);
  }, [diff?.diff]);

  useEffect(() => {
    if (!codeRef.current) {
      return;
    }

    const lineNumberNodes =
      codeRef.current.querySelectorAll<HTMLSpanElement>(".line-number");

    lineNumberNodes.forEach((node) => {
      const lineValue = Number(node.dataset.line);

      if (Number.isNaN(lineValue)) {
        node.classList.remove("line-number-selected");
        return;
      }

      if (selectedLineNumbers.includes(lineValue)) {
        node.classList.add("line-number-selected");
      } else {
        node.classList.remove("line-number-selected");
      }
    });
  }, [selectedLineNumbers, highlighted?.html]);

  const handleCodeClick = (event: ReactMouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;

    if (!target || !target.classList.contains("line-number")) {
      return;
    }

    const lineNumberAttr = target.dataset.line;
    if (!lineNumberAttr) {
      return;
    }

    const lineNumber = Number(lineNumberAttr);
    if (Number.isNaN(lineNumber)) {
      return;
    }

    setSelectedLineNumbers((prev) => {
      if (prev.includes(lineNumber)) {
        return prev.filter((value) => value !== lineNumber);
      }

      return [...prev, lineNumber].sort((a, b) => a - b);
    });
  };

  const handleIncreaseFontSize = () => {
    setFontSize((prev) => Math.min(prev + 2, 32));
  };

  const handleDecreaseFontSize = () => {
    setFontSize((prev) => Math.max(prev - 2, 6));
  };

  const selectedLineDetails = useMemo(
    () =>
      [...selectedLineNumbers]
        .sort((a, b) => a - b)
        .map((lineNumber) => ({
          number: lineNumber,
          content: diffLines[lineNumber - 1] ?? "",
        })),
    [selectedLineNumbers, diffLines],
  );

  const handleOpenAnnotationModal = () => {
    if (!diff?.diff) {
      return;
    }

    setIsAnnotationModalOpen(true);
  };

  const handleCloseAnnotationModal = () => {
    setIsAnnotationModalOpen(false);
  };

  const handleAnnotationSubmit = async (text: string): Promise<void> => {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
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
  };

  const showAnnotateButton = Boolean(diff?.diff);
  const annotationFilename = "git diff";

  useEffect(() => {
    const controller = new AbortController();

    const loadGitDiff = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/git/diff", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as GitDiffResponse;

        if (!controller.signal.aborted) {
          setDiff(data);
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

    void loadGitDiff();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <>
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
          Git Changes
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {isLoading ? (
          <p className="py-4 font-mono text-sm text-slate-400">
            Loading git diff…
          </p>
        ) : error ? (
          <p className="py-4 font-mono text-sm text-rose-400">
            Unable to load git diff: {error}
          </p>
        ) : diff ? (
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
            <pre
              className="min-w-full rounded-lg bg-slate-950/60 leading-relaxed"
              style={{ fontSize: `${fontSize}px` }}
            >
              <code
                ref={codeRef}
                onClick={handleCodeClick}
                className={`hljs ${
                  highlighted?.language
                    ? `language-${highlighted.language}`
                    : ""
                }`}
                dangerouslySetInnerHTML={{
                  __html: highlighted?.html ?? escapeHtml(diff.diff),
                }}
              />
            </pre>
          </div>
        ) : null}
      </div>
      <AnnotationModal
        isOpen={isAnnotationModalOpen}
        onClose={handleCloseAnnotationModal}
        onSubmit={handleAnnotationSubmit}
        selectedLines={selectedLineDetails}
        filename={annotationFilename}
      />
      <Toolbar
        currentPath="Git Changes"
        onBack={onBackToBrowser}
        onIncreaseFontSize={handleIncreaseFontSize}
        onDecreaseFontSize={handleDecreaseFontSize}
        onAnnotate={showAnnotateButton ? handleOpenAnnotationModal : undefined}
      />
    </>
  );
};

export default GitDiff;
