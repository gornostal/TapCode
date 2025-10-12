import { useMemo } from "react";
import type { FileContentResponse } from "@shared/messages";
import NavigationBar from "@/components/NavigationBar";
import {
  highlightCode,
  escapeHtml,
  type HighlightResult,
} from "@/utils/syntaxHighlighting";

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
  projectName: string;
  displayedFilePath: string | null;
  selectedFile: FileContentResponse | null;
  isFileLoading: boolean;
  fileError: string | null;
  onBackToBrowser: () => void;
};

const FilePreview = ({
  projectName,
  displayedFilePath,
  selectedFile,
  isFileLoading,
  fileError,
  onBackToBrowser,
}: FilePreviewProps) => {
  const highlighted = useMemo<HighlightResult | null>(() => {
    if (!selectedFile || selectedFile.isBinary || !selectedFile.content) {
      return null;
    }

    return highlightCode(selectedFile.content, selectedFile.language, true);
  }, [selectedFile]);

  const highlightedLanguageLabel =
    highlighted?.language ?? selectedFile?.language ?? null;

  const currentPath = displayedFilePath
    ? `/${displayedFilePath}`
    : "Loading file";

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">
              {projectName || "Project"}
            </p>
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
              <pre className="min-w-full rounded-lg bg-slate-950/60 text-sm leading-relaxed">
                <code
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

      <footer className="text-xs text-slate-500">
        Use Back to files or your browser history to return to the project
        listing.
      </footer>
      <NavigationBar currentPath={currentPath} onBack={onBackToBrowser} />
    </>
  );
};

export default FilePreview;
