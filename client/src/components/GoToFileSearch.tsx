import {
  memo,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  FileListItem,
  FilesRequestQuery,
  FilesResponse,
} from "@shared/files";

type GoToFileSearchProps = {
  isOpen: boolean;
  onClose: () => void;
  onOpenFile: (path: string) => void;
};

const SEARCH_DEBOUNCE_MS = 150;
const TOOLBAR_HEIGHT_PX = 56;

const GoToFileSearch = ({
  isOpen,
  onClose,
  onOpenFile,
}: GoToFileSearchProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FileListItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      if (requestRef.current) {
        requestRef.current.abort();
        requestRef.current = null;
      }
      setQuery("");
      setResults([]);
      setError(null);
      setIsSearching(false);
      setKeyboardOffset(0);
      return;
    }

    const id = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(id);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

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
        const query: FilesRequestQuery = { q: trimmedQuery };
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(query)) {
          if (typeof value === "string") {
            params.set(key, value);
          }
        }

        const response = await fetch(`/api/files?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as FilesResponse;

        if (!controller.signal.aborted) {
          const fileResults = data.items.filter((item) => item.kind === "file");
          setResults(fileResults);
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
  }, [isOpen, query]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const viewport = window.visualViewport;
    if (!viewport) {
      setKeyboardOffset(0);
      return;
    }

    const handleViewportChange = () => {
      const windowHeight = window.innerHeight;
      const visibleHeight = viewport.height + viewport.offsetTop;
      const computedOffset = Math.max(windowHeight - visibleHeight, 0);
      setKeyboardOffset((prev) =>
        Math.abs(prev - computedOffset) > 1 ? computedOffset : prev,
      );
    };

    handleViewportChange();

    viewport.addEventListener("resize", handleViewportChange);
    viewport.addEventListener("scroll", handleViewportChange);

    return () => {
      viewport.removeEventListener("resize", handleViewportChange);
      viewport.removeEventListener("scroll", handleViewportChange);
    };
  }, [isOpen]);

  const handleResultClick = useCallback(
    (path: string) => {
      onOpenFile(path);
      onClose();
    },
    [onClose, onOpenFile],
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const [firstResult] = results;
      if (firstResult) {
        onOpenFile(firstResult.path);
        onClose();
      }
    },
    [onClose, onOpenFile, results],
  );

  const emptyStateMessage = useMemo(() => {
    if (!query.trim()) {
      return "Type to search for files in this project.";
    }

    if (error) {
      return `Unable to search files: ${error}`;
    }

    if (results.length === 0) {
      return isSearching ? "Searching…" : "No matching files were found.";
    }

    return null;
  }, [error, isSearching, query, results.length]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        aria-hidden
        className="fixed left-0 right-0 top-0 z-30 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        style={{ bottom: TOOLBAR_HEIGHT_PX }}
      />
      <div
        className="fixed left-0 right-0 z-40 flex justify-center px-4 pb-3"
        style={{ bottom: TOOLBAR_HEIGHT_PX + keyboardOffset }}
      >
        <div className="w-full max-w-xl overflow-hidden rounded-lg border border-slate-800 bg-slate-950/95 shadow-xl backdrop-blur">
          <form
            className="flex items-center gap-3 border-b border-slate-800 px-4 py-3"
            onSubmit={handleSubmit}
          >
            <span aria-hidden className="text-sm text-slate-500">
              🔎
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search files…"
              className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-transparent px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400 transition hover:border-slate-700 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            >
              Esc
            </button>
          </form>
          {emptyStateMessage ? (
            <p className="px-4 py-3 text-sm text-slate-400">
              {emptyStateMessage}
            </p>
          ) : (
            <ul className="max-h-56 overflow-y-auto py-1">
              {results.map((result) => (
                <li key={result.path}>
                  <button
                    type="button"
                    onClick={() => handleResultClick(result.path)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm text-slate-200 transition hover:bg-slate-900 hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                  >
                    <span className="flex-1 break-all font-mono">
                      {result.path}
                    </span>
                    <span className="text-xs uppercase tracking-wider text-slate-500">
                      Open
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
};

export default memo(GoToFileSearch);
