import { useEffect, useState } from "react";
import type {
  CommitRequest,
  CommitResponse,
  GitStatusResponse,
  StageAllResponse,
} from "@shared/git";
import type { ErrorResponse } from "@shared/http";
import type { FileListItem } from "@shared/files";
import Toolbar from "@/components/Toolbar";

type GitStatusProps = {
  onBackToBrowser: () => void;
  onOpenGitDiff: () => void;
  onOpenFile: (path: string) => void;
  onNavigateToDirectory: (path: string) => void;
};

const GitStatus = ({
  onBackToBrowser,
  onOpenGitDiff,
  onOpenFile,
  onNavigateToDirectory,
}: GitStatusProps) => {
  const [status, setStatus] = useState<GitStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStaging, setIsStaging] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");

  const loadGitStatus = async (controller?: AbortController) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/git/status", {
        signal: controller?.signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as GitStatusResponse;

      if (!controller || !controller.signal.aborted) {
        setStatus(data);
      }
    } catch (err) {
      if (controller?.signal.aborted) {
        return;
      }

      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      if (!controller || !controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadGitStatus(controller);

    return () => {
      controller.abort();
    };
  }, []);

  const handleStageAll = async () => {
    setIsStaging(true);
    setError(null);

    try {
      const response = await fetch("/api/git/stage-all", {
        method: "POST",
      });

      const payload = (await response.json().catch(() => null)) as
        | StageAllResponse
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
        !("success" in payload) ||
        payload.success !== true
      ) {
        throw new Error("Failed to stage changes.");
      }

      // Reload git status after staging
      await loadGitStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsStaging(false);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      setError("Commit message cannot be empty");
      return;
    }

    setIsCommitting(true);
    setError(null);

    try {
      const requestBody: CommitRequest = { text: commitMessage };
      const response = await fetch("/api/git/commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const payload = (await response.json().catch(() => null)) as
        | CommitResponse
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
        !("success" in payload) ||
        payload.success !== true
      ) {
        throw new Error("Commit did not complete successfully.");
      }

      // Clear commit message and reload status after successful commit
      setCommitMessage("");
      await loadGitStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsCommitting(false);
    }
  };

  const renderFileList = (
    files: FileListItem[],
    title: string,
    color: string,
  ) => {
    if (files.length === 0) return null;

    const handleItemClick = (item: FileListItem) => {
      if (item.kind === "directory") {
        onNavigateToDirectory(item.path);
      } else {
        onOpenFile(item.path);
      }
    };

    return (
      <div className="rounded border border-slate-800 bg-slate-900/60 p-4">
        <h3
          className={`mb-3 text-sm font-semibold uppercase tracking-[0.2em] ${color}`}
        >
          {title} ({files.length})
        </h3>
        <ul className="space-y-1">
          {files.map((item, index) => (
            <li
              key={`${item.path}-${index}`}
              className="font-mono text-sm text-slate-300"
            >
              <button
                onClick={() => handleItemClick(item)}
                className="w-full cursor-pointer truncate text-left underline hover:text-sky-400 focus:text-sky-400 focus:outline-none"
              >
                {item.kind === "directory" ? `${item.path}` : item.path}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <>
      {error && (
        <div className="sticky top-0 z-10 rounded border border-rose-700 bg-rose-950/90 p-4 backdrop-blur-sm">
          <p className="font-mono text-sm text-rose-300">
            <span className="font-semibold">Error:</span> {error}
          </p>
        </div>
      )}
      <div className="flex flex-col gap-4">
        {isLoading ? (
          <p className="py-4 font-mono text-sm text-slate-400">
            Loading git status…
          </p>
        ) : error ? null : status ? (
          <>
            <div className="rounded border border-slate-800 bg-slate-900/60 p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Branch:
                  </span>
                  <span className="font-mono text-sm text-sky-300">
                    {status.branch}
                  </span>
                </div>
                {(status.ahead > 0 || status.behind > 0) && (
                  <div className="flex items-center gap-4 text-sm">
                    {status.ahead > 0 && (
                      <span className="text-emerald-400">
                        ↑ {status.ahead} ahead
                      </span>
                    )}
                    {status.behind > 0 && (
                      <span className="text-amber-400">
                        ↓ {status.behind} behind
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {renderFileList(status.staged, "Staged", "text-emerald-400")}

            {status.staged.length > 0 && (
              <div className="rounded border border-slate-800 bg-slate-900/60 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                  Commit Changes
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isCommitting) {
                        void handleCommit();
                      }
                    }}
                    placeholder="Enter commit message..."
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                  />
                  <button
                    onClick={() => void handleCommit()}
                    disabled={isCommitting || !commitMessage.trim()}
                    className="w-full rounded border border-sky-700 bg-sky-900/40 px-4 py-2 font-mono text-sm text-sky-300 transition-colors hover:bg-sky-900/60 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCommitting ? "Committing..." : "Commit"}
                  </button>
                </div>
              </div>
            )}
            {status.unstaged.length > 0 && (
              <div className="rounded border border-slate-800 bg-slate-900/60 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
                  Unstaged ({status.unstaged.length})
                </h3>
                <ul className="space-y-1">
                  {status.unstaged.map((item, index) => (
                    <li
                      key={`${item.path}-${index}`}
                      className="font-mono text-sm text-slate-300"
                    >
                      <button
                        onClick={() =>
                          item.kind === "directory"
                            ? onNavigateToDirectory(item.path)
                            : onOpenFile(item.path)
                        }
                        className="w-full cursor-pointer truncate text-left underline hover:text-sky-400 focus:text-sky-400 focus:outline-none"
                      >
                        {item.kind === "directory"
                          ? `${item.path}/`
                          : item.path}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => void handleStageAll()}
                    disabled={isStaging}
                    className="rounded border border-emerald-700 bg-emerald-900/40 px-4 py-2 font-mono text-sm text-emerald-300 transition-colors hover:bg-emerald-900/60 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isStaging ? "Staging..." : "Stage All Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={onOpenGitDiff}
                    className="rounded border border-sky-700 bg-sky-900/40 px-4 py-2 font-mono text-sm text-sky-300 transition-colors hover:bg-sky-900/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                  >
                    View Git Diff
                  </button>
                </div>
              </div>
            )}
            {renderFileList(status.untracked, "Untracked", "text-slate-400")}

            {status.staged.length === 0 &&
              status.unstaged.length === 0 &&
              status.untracked.length === 0 && (
                <p className="py-4 font-mono text-sm text-slate-400">
                  Working tree clean. No changes to commit.
                </p>
              )}
          </>
        ) : null}
      </div>
      <Toolbar statusText="Git Status" onBack={onBackToBrowser} />
    </>
  );
};

export default GitStatus;
