import { useMemo } from "react";
import hljs from "highlight.js/lib/common";
import "highlight.js/styles/github-dark.css";

import type { FileContentResponse } from "@shared/messages";

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

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

type HighlightResult = {
  html: string;
  language: string | null;
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

    try {
      if (
        selectedFile.language &&
        hljs.getLanguage(selectedFile.language) !== undefined
      ) {
        const result = hljs.highlight(selectedFile.content, {
          language: selectedFile.language,
          ignoreIllegals: true,
        });
        return {
          html: result.value,
          language: result.language ?? selectedFile.language ?? null,
        };
      }

      const result = hljs.highlightAuto(selectedFile.content);
      return {
        html: result.value,
        language: result.language ?? null,
      };
    } catch {
      return {
        html: escapeHtml(selectedFile.content),
        language: selectedFile.language ?? null,
      };
    }
  }, [selectedFile]);

  const highlightedLanguageLabel =
    highlighted?.language ?? selectedFile?.language ?? null;

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">
              {projectName || "Project"}
            </p>
            <p className="mt-1 font-mono text-sm text-slate-300">
              {displayedFilePath ? `/${displayedFilePath}` : "Loading file"}
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
            <button
              type="button"
              onClick={onBackToBrowser}
              className="rounded border border-slate-700 px-3 py-1 font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-600 hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 sm:self-center"
            >
              Back to files
            </button>
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
            <div className="overflow-x-auto">
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
    </>
  );
};

export default FilePreview;
