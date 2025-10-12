import type { FileListItem } from "@shared/messages";

type FileBrowserProps = {
  projectName: string;
  currentDirectoryLabel: string;
  canNavigateUp: boolean;
  onNavigateUp: () => void;
  isLoading: boolean;
  error: string | null;
  files: FileListItem[];
  activeFilePath: string | null;
  isFileLoading: boolean;
  onDirectoryClick: (item: FileListItem) => void;
  onFileClick: (item: FileListItem) => void;
};

const FileBrowser = ({
  projectName,
  currentDirectoryLabel,
  canNavigateUp,
  onNavigateUp,
  isLoading,
  error,
  files,
  activeFilePath,
  isFileLoading,
  onDirectoryClick,
  onFileClick,
}: FileBrowserProps) => (
  <>
    <header>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {projectName || "Loading project"}
      </h1>
      <p className="mt-2 text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
        Project files
      </p>
      <p className="mt-2 text-base text-slate-400">
        Listing items inside{" "}
        <span className="font-mono">{currentDirectoryLabel}</span>.
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Select a file to open it in a dedicated preview page.
      </p>
    </header>

    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-wider text-slate-500">
        <span>Current directory</span>
        <div className="flex flex-wrap items-center gap-3 text-right sm:flex-nowrap">
          <span className="font-mono text-slate-400">
            {currentDirectoryLabel}
          </span>
          <button
            type="button"
            onClick={onNavigateUp}
            disabled={!canNavigateUp}
            className="rounded border border-slate-700 px-3 py-1 font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-600 hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
          >
            Up
          </button>
        </div>
      </div>
      {isLoading ? (
        <p className="py-4 font-mono text-sm text-slate-400">Loading files…</p>
      ) : error ? (
        <p className="py-4 font-mono text-sm text-rose-400">
          Unable to load files: {error}
        </p>
      ) : files.length === 0 ? (
        <p className="py-4 font-mono text-sm text-slate-400">
          No items found in this directory.
        </p>
      ) : (
        <div className="overflow-x-auto">
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
                      : null
                  : null;

              return (
                <li
                  key={item.path}
                  className="flex min-w-max items-center justify-between px-3 py-3 sm:px-4"
                >
                  {item.kind === "directory" ? (
                    <button
                      type="button"
                      onClick={() => onDirectoryClick(item)}
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
                      onClick={() => onFileClick(item)}
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
                  {statusLabel && (
                    <span className="whitespace-nowrap text-xs uppercase tracking-wider text-slate-500">
                      {statusLabel}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>

    <footer className="text-xs text-slate-500">
      File list updates on page refresh to reflect the current file system.
    </footer>
  </>
);

export default FileBrowser;
