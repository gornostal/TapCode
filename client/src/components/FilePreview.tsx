import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { FileContentResponse } from "@shared/files";
import type { AddTaskResponse, CreateTaskRequest } from "@shared/tasks";
import type { ErrorResponse } from "@shared/http";
import Toolbar from "@/components/Toolbar";
import AnnotationModal from "@/components/AnnotationModal";
import { CheckIcon, ClipboardIcon } from "@/components/icons";
import {
  highlightCode,
  escapeHtml,
  type HighlightResult,
} from "@/utils/syntaxHighlighting";
import { usePersistentFontSize } from "@/hooks/usePersistentFontSize";

const PREVIEW_BYTE_LIMIT = 200_000;

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 10 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex] ?? "KB"}`;
};

type FilePreviewProps = {
  displayedFilePath: string | null;
  selectedFile: FileContentResponse | null;
  isFileLoading: boolean;
  fileError: string | null;
  onBackToBrowser: () => void;
};

const FilePreview = ({
  displayedFilePath,
  selectedFile,
  isFileLoading,
  fileError,
  onBackToBrowser,
}: FilePreviewProps) => {
  const { fontSize, increaseFontSize, decreaseFontSize } =
    usePersistentFontSize("tapcode:editorFontSize");
  const [selectedLineNumbers, setSelectedLineNumbers] = useState<number[]>([]);
  const [isAnnotationModalOpen, setIsAnnotationModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  const highlighted = useMemo<HighlightResult | null>(() => {
    if (!selectedFile || selectedFile.isBinary || !selectedFile.content) {
      return null;
    }

    return highlightCode(selectedFile.content, selectedFile.language, true);
  }, [selectedFile]);

  const fileLines = useMemo<string[]>(() => {
    if (!selectedFile?.content) {
      return [];
    }

    return selectedFile.content.split("\n");
  }, [selectedFile?.content]);

  useEffect(() => {
    setSelectedLineNumbers([]);
    setIsAnnotationModalOpen(false);
  }, [displayedFilePath]);

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

  const highlightedLanguageLabel =
    highlighted?.language ?? selectedFile?.language ?? null;

  const currentPath = displayedFilePath
    ? (displayedFilePath.split("/").pop() ?? displayedFilePath)
    : "Loading file";

  const selectedLineDetails = useMemo(
    () =>
      [...selectedLineNumbers]
        .sort((a, b) => a - b)
        .map((lineNumber) => ({
          number: lineNumber,
          content: fileLines[lineNumber - 1] ?? "",
        })),
    [selectedLineNumbers, fileLines],
  );

  const annotationFilename =
    selectedFile?.path ?? displayedFilePath ?? "Selected file";

  const handleOpenAnnotationModal = () => {
    if (!selectedFile?.content) {
      return;
    }

    setIsAnnotationModalOpen(true);
  };

  const handleCloseAnnotationModal = () => {
    setIsAnnotationModalOpen(false);
  };

  const handleAnnotationSubmit = async (text: string): Promise<void> => {
    const requestBody: CreateTaskRequest = { text };
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const payload = (await response.json().catch(() => null)) as
      | AddTaskResponse
      | ErrorResponse
      | null;

    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "error" in payload
          ? payload.error
          : `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    if (
      !payload ||
      typeof payload !== "object" ||
      !("text" in payload) ||
      typeof payload.text !== "string"
    ) {
      throw new Error("Unexpected server response.");
    }

    // Reset line selection after successful submission
    setSelectedLineNumbers([]);
  };

  const handleCopyPath = () => {
    if (!displayedFilePath) {
      return;
    }

    navigator.clipboard
      .writeText(displayedFilePath)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch((error) => {
        console.error("Failed to copy path:", error);
      });
  };

  const showAnnotateButton =
    Boolean(selectedFile?.content) && !selectedFile?.isBinary;

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-400 font-mono">
              {displayedFilePath || "No file selected"}
            </p>
            {displayedFilePath && (
              <button
                onClick={handleCopyPath}
                className="text-slate-400 hover:text-slate-200 transition-colors"
                title="Copy path"
                type="button"
              >
                {copySuccess ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  <ClipboardIcon className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
          <div className="flex w-full flex-col items-start gap-3 text-xs uppercase tracking-wider text-slate-500 sm:w-auto sm:flex-row sm:items-center sm:text-right">
            {selectedFile && (
              <div className="sm:text-right">
                <p>{formatBytes(selectedFile.size)}</p>
                {highlightedLanguageLabel && (
                  <p className="mt-1">{highlightedLanguageLabel}</p>
                )}
                {selectedFile.truncated && (
                  <p className="mt-1 text-amber-400">
                    Preview limited to {formatBytes(PREVIEW_BYTE_LIMIT)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        {isFileLoading ? (
          <p className="font-mono text-sm text-slate-400">Loading file…</p>
        ) : fileError ? (
          <p className="font-mono text-sm text-rose-400">
            Unable to load file: {fileError}
          </p>
        ) : !selectedFile ? (
          <p className="font-mono text-sm text-slate-400">
            No data available for this file.
          </p>
        ) : selectedFile.isBinary ? (
          <p className="font-mono text-sm text-slate-400">
            This file appears to be binary and cannot be previewed.
          </p>
        ) : selectedFile.content ? (
          <div className="flex flex-col gap-3">
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
                    __html:
                      highlighted?.html ?? escapeHtml(selectedFile.content),
                  }}
                />
              </pre>
            </div>
          </div>
        ) : (
          <p className="font-mono text-sm text-slate-400">
            No preview available for this file.
          </p>
        )}
      </div>

      <AnnotationModal
        isOpen={isAnnotationModalOpen}
        onClose={handleCloseAnnotationModal}
        onSubmit={handleAnnotationSubmit}
        selectedLines={selectedLineDetails}
        filename={annotationFilename}
      />
      <Toolbar
        statusText={currentPath}
        onBack={onBackToBrowser}
        onIncreaseFontSize={increaseFontSize}
        onDecreaseFontSize={decreaseFontSize}
        onAnnotate={showAnnotateButton ? handleOpenAnnotationModal : undefined}
      />
    </>
  );
};

export default FilePreview;
