type ToolbarProps = {
  currentPath: string;
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
};

const Toolbar = ({
  currentPath,
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
}: ToolbarProps) => (
  <div className="fixed bottom-[3.25rem] left-0 right-0 z-20 border-t border-b border-slate-800 bg-slate-950">
    <div
      className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      style={{ height: "30px" }}
    >
      <div className="flex-1 overflow-hidden">
        <p className="truncate font-mono text-sm text-slate-300">
          {currentPath}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {onRun && (
          <button
            type="button"
            onClick={onRun}
            disabled={runDisabled}
            className="flex-shrink-0 cursor-pointer rounded p-2 text-slate-400 transition hover:bg-emerald-900/30 hover:text-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
            aria-label="Run selected task"
            title="Run selected task"
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
              <path d="M12 12L12 3.75" />
              <path d="M12 12L12 20.25" />
              <path d="M12 12L3.75 12" />
              <path d="M12 12L20.25 12" />
              <path d="M12 12L17.3 6.7" />
              <path d="M12 12L6.7 17.3" />
              <path d="M12 12L6.7 6.7" />
              <path d="M12 12L17.3 17.3" />
              <circle
                cx="12"
                cy="12"
                r="1.5"
                fill="currentColor"
                stroke="none"
              />
            </svg>
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            disabled={editDisabled}
            className="flex-shrink-0 cursor-pointer rounded p-2 text-slate-400 transition hover:bg-sky-900/30 hover:text-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
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
              <path d="M15.728 2.272a2.5 2.5 0 00-3.536 0L4 10.464V14h3.536l8.192-8.192a2.5 2.5 0 000-3.536z" />
              <path d="M11.5 3.5L14.5 6.5" />
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
            className="flex-shrink-0 cursor-pointer rounded p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
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
              className="flex-shrink-0 cursor-pointer rounded p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Decrease font size"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
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
              className="flex-shrink-0 cursor-pointer rounded p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Increase font size"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={onBack}
          disabled={disabled}
          className="flex-shrink-0 cursor-pointer rounded p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
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

export default Toolbar;
