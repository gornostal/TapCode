import { useEffect, useState } from "react";
import type { FileListItem, FilesResponse } from "@shared/messages";

function App() {
  const [files, setFiles] = useState<FileListItem[]>([]);
  const [currentDirectory, setCurrentDirectory] = useState("");
  const [parentDirectory, setParentDirectory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const currentDirectoryLabel = currentDirectory ? `/${currentDirectory}` : "/";
  const canNavigateUp = parentDirectory !== null;

  const handleNavigateUp = () => {
    if (!canNavigateUp) {
      return;
    }

    setCurrentDirectory(parentDirectory ?? "");
  };

  const handleDirectoryClick = (item: FileListItem) => {
    if (item.kind !== "directory") {
      return;
    }

    setCurrentDirectory(item.path);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
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
        </header>

        <div className="flex-1">
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
                        <span className="flex items-center gap-3 whitespace-nowrap">
                          <span
                            aria-hidden
                            className="text-lg text-slate-500 sm:text-xl"
                          >
                            📄
                          </span>
                          <span>{label}</span>
                        </span>
                      )}
                      <span className="whitespace-nowrap text-xs uppercase tracking-wider text-slate-500">
                        {item.kind}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <footer className="text-xs text-slate-500">
          File list updates on page refresh to reflect the current file system.
        </footer>
      </section>
    </main>
  );
}

export default App;
