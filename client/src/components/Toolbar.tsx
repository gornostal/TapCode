import { useRef } from "react";

type ToolbarProps = {
  statusText: string;
  onBack: () => void;
  disabled?: boolean;
  onIncreaseFontSize?: () => void;
  onDecreaseFontSize?: () => void;
  onAnnotate?: () => void;
  onEdit?: () => void;
  editDisabled?: boolean;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  onRun?: () => void;
  runDisabled?: boolean;
  onRunLongPress?: () => void;
  onStop?: () => void;
  stopDisabled?: boolean;
};

const Toolbar = ({
  statusText: statusText,
  onBack,
  disabled = false,
  onIncreaseFontSize,
  onDecreaseFontSize,
  onAnnotate,
  onEdit,
  editDisabled = true,
  onDelete,
  deleteDisabled = true,
  onRun,
  runDisabled = false,
  onRunLongPress,
  onStop,
  stopDisabled = false,
}: ToolbarProps) => {
  const longPressTimerRef = useRef<number | null>(null);
  const isLongPressRef = useRef(false);

  const baseButtonClass =
    "flex-shrink-0 cursor-pointer rounded p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400";

  const handleRunMouseDown = () => {
    if (runDisabled || !onRunLongPress) return;

    isLongPressRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      isLongPressRef.current = true;
      onRunLongPress();
    }, 500); // 500ms for long press
  };

  const handleRunMouseUp = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!isLongPressRef.current && onRun && !runDisabled) {
      onRun();
    }

    isLongPressRef.current = false;
  };

  const handleRunMouseLeave = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    isLongPressRef.current = false;
  };

  return (
    <div className="fixed bottom-[3.25rem] left-0 right-0 z-20 border-t border-b border-slate-800 bg-slate-950">
      <div
        className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
        style={{ height: "30px" }}
      >
        <div className="flex flex-1 items-center gap-3 overflow-hidden">
          <p className="truncate font-mono text-sm text-slate-300">
            {statusText}
          </p>
        </div>
        <div className="flex items-center gap-2 select-none">
          {onStop && (
            <button
              type="button"
              onClick={onStop}
              disabled={stopDisabled}
              className="flex-shrink-0 cursor-pointer rounded p-2 text-slate-400 transition hover:bg-red-900/30 hover:text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
              aria-label="Stop command"
              title="Stop command"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <rect x="5" y="5" width="10" height="10" rx="1" />
              </svg>
            </button>
          )}
          {onRun && (
            <button
              type="button"
              onMouseDown={handleRunMouseDown}
              onMouseUp={handleRunMouseUp}
              onMouseLeave={handleRunMouseLeave}
              onTouchStart={handleRunMouseDown}
              onTouchEnd={handleRunMouseUp}
              disabled={runDisabled}
              className={`flex-shrink-0 cursor-pointer rounded p-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${
                runDisabled
                  ? "text-slate-400 disabled:hover:text-slate-400"
                  : "text-orange-400 hover:bg-orange-900/30 hover:text-orange-300 focus-visible:outline-orange-400"
              }`}
              aria-label="Run selected task (long press for settings)"
              title="Run selected task (long press for settings)"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12.162" cy="3.276" r="1.516" />
                <path d="M 12.162 4.791 L 12.162 7.064" />
                <rect
                  x="3.321"
                  y="8.328"
                  width="17.682"
                  height="12.63"
                  rx="2"
                />
                <path d="M 2.058 12.117 L 2.058 17.169" />
                <path d="M 22.267 12.117 L 22.267 17.169" />
                <circle
                  cx="8.373"
                  cy="13.379"
                  r="1.263"
                  fill="currentColor"
                  stroke="none"
                />
                <circle
                  cx="15.952"
                  cy="13.379"
                  r="1.263"
                  fill="currentColor"
                  stroke="none"
                />
                <path d="M 8.373 17.8 L 15.952 17.8" />
                <path d="M 10.267 20.958 L 14.056 20.958" />
              </svg>
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              disabled={editDisabled}
              className={baseButtonClass}
              aria-label="Edit selected task"
              title="Edit selected task"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M 16.169 3.18 C 15.625 2.635 14.887 2.33 14.117 2.33 C 13.347 2.33 12.609 2.635 12.065 3.18 L 2.555 12.689 L 2.555 16.794 L 6.66 16.794 L 16.169 7.284 C 16.714 6.74 17.019 6.002 17.019 5.232 C 17.019 4.462 16.714 3.724 16.169 3.18 Z" />
                <path d="M 11.261 4.605 L 14.744 8.088" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleteDisabled}
              className="flex-shrink-0 cursor-pointer rounded p-2 text-slate-400 transition hover:bg-red-900/30 hover:text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
              aria-label="Delete selected task"
              title="Delete selected task"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M3 3 L13 13 M13 3 L3 13" />
              </svg>
            </button>
          )}
          {onAnnotate && (
            <button
              type="button"
              onClick={onAnnotate}
              className={baseButtonClass}
              aria-label="Annotate selected lines"
              title="Create annotation for selected lines"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
          {onDecreaseFontSize && onIncreaseFontSize && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onDecreaseFontSize}
                className={baseButtonClass}
                aria-label="Decrease font size"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={onIncreaseFontSize}
                className={baseButtonClass}
                aria-label="Increase font size"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={onBack}
            disabled={disabled}
            className={baseButtonClass}
            aria-label="Go back"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
