import { useEffect, useState } from "react";
import type { GitStatusResponse } from "@shared/messages";
import NavigationBar from "@/components/NavigationBar";

type GitStatusProps = {
  onBackToBrowser: () => void;
};

const GitStatus = ({ onBackToBrowser }: GitStatusProps) => {
  const [status, setStatus] = useState<GitStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadGitStatus = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/git/status", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as GitStatusResponse;

        if (!controller.signal.aborted) {
          setStatus(data);
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

    void loadGitStatus();

    return () => {
      controller.abort();
    };
  }, []);

  const renderFileList = (files: string[], title: string, color: string) => {
    if (files.length === 0) return null;

    return (
      <div className="rounded border border-slate-800 bg-slate-900/60 p-4">
        <h3
          className={`mb-3 text-sm font-semibold uppercase tracking-[0.2em] ${color}`}
        >
          {title} ({files.length})
        </h3>
        <ul className="space-y-1">
          {files.map((file, index) => (
            <li
              key={`${file}-${index}`}
              className="font-mono text-sm text-slate-300"
            >
              {file}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        {isLoading ? (
          <p className="py-4 font-mono text-sm text-slate-400">
            Loading git status…
          </p>
        ) : error ? (
          <p className="py-4 font-mono text-sm text-rose-400">
            Unable to load git status: {error}
          </p>
        ) : status ? (
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
            {renderFileList(status.unstaged, "Unstaged", "text-amber-400")}
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
      <NavigationBar currentPath="Git Status" onBack={onBackToBrowser} />
    </>
  );
};

export default GitStatus;
