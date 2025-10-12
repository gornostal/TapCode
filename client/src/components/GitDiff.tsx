import { useEffect, useState } from "react";
import type { GitDiffResponse } from "@shared/messages";
import NavigationBar from "@/components/NavigationBar";

type GitDiffProps = {
  onBackToBrowser: () => void;
};

const GitDiff = ({ onBackToBrowser }: GitDiffProps) => {
  const [diff, setDiff] = useState<GitDiffResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <div className="rounded border border-slate-800 bg-slate-900/60 p-4">
            <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs text-slate-300">
              {diff.diff}
            </pre>
          </div>
        ) : null}
      </div>
      <NavigationBar currentPath="Git Changes" onBack={onBackToBrowser} />
    </>
  );
};

export default GitDiff;
