import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import hljs from "highlight.js/lib/common";
import "highlight.js/styles/github-dark.css";

import type {
  FileContentResponse,
  FileListItem,
  FilesResponse,
} from "@shared/messages";

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

type RouteState =
  | {
      page: "list";
    }
  | {
      page: "file";
      path: string;
    };

const parseRoute = (): RouteState => {
  const { pathname, search } = window.location;

  if (pathname.startsWith("/file")) {
    const params = new URLSearchParams(search);
    const pathParam = params.get("path");

    if (pathParam && pathParam.trim()) {
      return { page: "file", path: pathParam };
    }
  }

  return { page: "list" };
};

function App() {
  const [route, setRoute] = useState<RouteState>(() => parseRoute());
  const [files, setFiles] = useState<FileListItem[]>([]);
  const [currentDirectory, setCurrentDirectory] = useState("");
  const [parentDirectory, setParentDirectory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<FileContentResponse | null>(
    null,
  );
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRequestRef = useRef<AbortController | null>(null);

  const resetFileViewer = useCallback(() => {
    if (fileRequestRef.current) {
      fileRequestRef.current.abort();
      fileRequestRef.current = null;
    }

    setSelectedFile(null);
    setActiveFilePath(null);
    setFileError(null);
    setIsFileLoading(false);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseRoute());
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadFiles = async () => {
      setIsLoading(true);

      const params = new URLSearchParams();
      if (currentDirectory) {
        params.set("dir", currentDirectory);
      }

      try {
        const response = await fetch(
          params.size ? `/files?${params.toString()}` : "/files",
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as FilesResponse;

        if (!controller.signal.aborted) {
          setFiles(data.items);
          setParentDirectory(data.parentDirectory);
          setError(null);

          if (data.directory !== currentDirectory) {
            setCurrentDirectory(data.directory);
          }
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

    void loadFiles();

    return () => {
      controller.abort();
    };
  }, [currentDirectory]);

  useEffect(
    () => () => {
      if (fileRequestRef.current) {
        fileRequestRef.current.abort();
      }
    },
    [],
  );

  const loadFile = useCallback(async (path: string) => {
    if (fileRequestRef.current) {
      fileRequestRef.current.abort();
    }

    const controller = new AbortController();
    fileRequestRef.current = controller;

    setIsFileLoading(true);
    setFileError(null);
    setSelectedFile(null);
    setActiveFilePath(path);

    const params = new URLSearchParams();
    params.set("path", path);

    try {
      const response = await fetch(`/file?${params.toString()}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as FileContentResponse;

      if (!controller.signal.aborted) {
        setSelectedFile(data);
        setActiveFilePath(data.path);
        setFileError(null);
      }
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }
      setFileError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      if (fileRequestRef.current === controller) {
        fileRequestRef.current = null;
      }

      if (!controller.signal.aborted) {
        setIsFileLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (route.page === "file") {
      void loadFile(route.path);
      return;
    }

    resetFileViewer();
  }, [route, loadFile, resetFileViewer]);

  const openFilePage = useCallback(
    (path: string) => {
      const params = new URLSearchParams();
      params.set("path", path);

      window.history.pushState(
        { page: "file", path },
        "",
        `/file?${params.toString()}`,
      );

      setRoute({ page: "file", path });
    },
    [setRoute],
  );

  const handleBackToBrowser = useCallback(() => {
    const state = window.history.state as RouteState | null;

    if (state && state.page === "file") {
      window.history.back();
      return;
    }

    window.history.replaceState({ page: "list" }, "", "/");
    setRoute({ page: "list" });
  }, [setRoute]);

  const currentDirectoryLabel = currentDirectory ? `/${currentDirectory}` : "/";
  const canNavigateUp = parentDirectory !== null;

  const handleNavigateUp = () => {
    if (!canNavigateUp) {
      return;
    }

    resetFileViewer();
    setCurrentDirectory(parentDirectory ?? "");
  };

  const handleDirectoryClick = (item: FileListItem) => {
    if (item.kind !== "directory") {
      return;
    }

    resetFileViewer();
    setCurrentDirectory(item.path);
  };

  const handleFileClick = (item: FileListItem) => {
    if (item.kind !== "file") {
      return;
    }

    openFilePage(item.path);
  };

  const highlighted = useMemo(() => {
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

  const isFileRoute = route.page === "file";
  const displayedFilePath =
    activeFilePath ?? (route.page === "file" ? route.path : null);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
        {isFileRoute ? (
          <>
            <header>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
                PocketIDE
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                File view
              </h1>
              <p className="mt-2 text-base text-slate-400">
                Showing{" "}
                <span className="font-mono">
                  {displayedFilePath ? `/${displayedFilePath}` : "Loading file"}
                </span>
                .
              </p>
            </header>

            <div className="rounded-xl border border-slate-800 bg-slate-900/80 shadow-lg shadow-slate-950/40 backdrop-blur">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 px-5 py-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    File view
                  </p>
                  <p className="mt-1 font-mono text-sm text-slate-300">
                    {displayedFilePath
                      ? `/${displayedFilePath}`
                      : "Loading file"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3 text-xs uppercase tracking-wider text-slate-500 sm:flex-row sm:items-center">
                  {selectedFile && (
                    <div className="text-right">
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
                    onClick={handleBackToBrowser}
                    className="rounded border border-slate-700 px-3 py-1 font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-600 hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                  >
                    Back to files
                  </button>
                </div>
              </div>
              <div className="px-5 py-4">
                {isFileLoading ? (
                  <p className="font-mono text-sm text-slate-400">
                    Loading file…
                  </p>
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
                      <pre className="min-w-full rounded-lg bg-slate-950/60 p-4 text-sm leading-relaxed">
                        <code
                          className={`hljs ${
                            highlighted?.language
                              ? `language-${highlighted.language}`
                              : ""
                          }`}
                          dangerouslySetInnerHTML={{
                            __html:
                              highlighted?.html ??
                              escapeHtml(selectedFile.content),
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
            </div>

            <footer className="text-xs text-slate-500">
              Use Back to files or your browser history to return to the project
              listing.
            </footer>
          </>
        ) : (
          <>
            <header>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
                PocketIDE
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Project files
              </h1>
              <p className="mt-2 text-base text-slate-400">
                Listing items inside{" "}
                <span className="font-mono">{currentDirectoryLabel}</span>.
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Select a file to open it in a dedicated preview page.
              </p>
            </header>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80 shadow-lg shadow-slate-950/40 backdrop-blur">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3 text-xs uppercase tracking-wider text-slate-500">
                <span>Current directory</span>
                <div className="flex items-center gap-3 text-right">
                  <span className="font-mono text-slate-400">
                    {currentDirectoryLabel}
                  </span>
                  <button
                    type="button"
                    onClick={handleNavigateUp}
                    disabled={!canNavigateUp}
                    className="rounded border border-slate-700 px-3 py-1 font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-600 hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
                  >
                    Up
                  </button>
                </div>
              </div>
              {isLoading ? (
                <p className="px-5 py-6 font-mono text-sm text-slate-400">
                  Loading files…
                </p>
              ) : error ? (
                <p className="px-5 py-6 font-mono text-sm text-rose-400">
                  Unable to load files: {error}
                </p>
              ) : files.length === 0 ? (
                <p className="px-5 py-6 font-mono text-sm text-slate-400">
                  No items found in this directory.
                </p>
              ) : (
                <ul className="min-w-full divide-y divide-slate-800 font-mono text-sm text-slate-100">
                  {files.map((item) => {
                    const segments = item.path.split("/");
                    const name = segments[segments.length - 1] ?? item.path;
                    const label = item.kind === "directory" ? `${name}/` : name;
                    const isActiveFile =
                      item.kind === "file" && item.path === activeFilePath;
                    const isPendingFile =
                      item.kind === "file" &&
                      item.path === activeFilePath &&
                      isFileLoading;
                    const statusLabel =
                      item.kind === "file"
                        ? isPendingFile
                          ? "loading"
                          : isActiveFile
                            ? "open"
                            : "file"
                        : "directory";

                    return (
                      <li
                        key={item.path}
                        className="flex min-w-max items-center justify-between px-5 py-3"
                      >
                        {item.kind === "directory" ? (
                          <button
                            type="button"
                            onClick={() => handleDirectoryClick(item)}
                            className="flex items-center gap-3 whitespace-nowrap text-left text-slate-100 transition hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                          >
                            <span
                              aria-hidden
                              className="text-lg text-slate-500 sm:text-xl"
                            >
                              📁
                            </span>
                            <span>{label}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleFileClick(item)}
                            className={`flex items-center gap-3 whitespace-nowrap text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 ${
                              isActiveFile
                                ? "text-sky-300"
                                : "text-slate-100 hover:text-slate-50"
                            }`}
                          >
                            <span
                              aria-hidden
                              className="text-lg text-slate-500 sm:text-xl"
                            >
                              📄
                            </span>
                            <span>{label}</span>
                          </button>
                        )}
                        <span className="whitespace-nowrap text-xs uppercase tracking-wider text-slate-500">
                          {statusLabel}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <footer className="text-xs text-slate-500">
              File list updates on page refresh to reflect the current file
              system.
            </footer>
          </>
        )}
      </section>
    </main>
  );
}

export default App;
