type ToolbarButton = {
  label: string;
  ariaLabel?: string;
};

type ToolbarProps = {
  onNavigateToRoot: () => void;
  onGoToFileToggle: () => void;
  isGoToFileOpen: boolean;
  onOpenTaskList: () => void;
  isTaskListActive: boolean;
  onOpenGitStatus: () => void;
  isGitActive: boolean;
};

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { label: "Files" },
  { label: "Go to file" },
  { label: "Git" },
  { label: "Tasks" },
];

const Toolbar = ({
  onNavigateToRoot,
  onGoToFileToggle,
  isGoToFileOpen,
  onOpenTaskList,
  isTaskListActive,
  onOpenGitStatus,
  isGitActive,
}: ToolbarProps) => {
  const buttons = TOOLBAR_BUTTONS;

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="relative flex w-full flex-wrap items-stretch justify-center overflow-hidden isolate">
        <div className="pointer-events-none absolute inset-0 z-0 bg-slate-900/60 backdrop-blur" />
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-sky-500/20 via-purple-500/10 to-emerald-500/20 opacity-80" />
        {buttons.map((button, index) => {
          const handleClick = () => {
            if (button.label === "Files") {
              onNavigateToRoot();
            } else if (button.label === "Git") {
              onOpenGitStatus();
            } else if (button.label === "Go to file") {
              onGoToFileToggle();
            } else if (button.label === "Tasks") {
              onOpenTaskList();
            }
          };

          const isDisabled =
            button.label !== "Files" &&
            button.label !== "Go to file" &&
            button.label !== "Tasks" &&
            button.label !== "Git";

          const isPressed =
            button.label === "Go to file"
              ? isGoToFileOpen
              : button.label === "Tasks"
                ? isTaskListActive
                : button.label === "Git"
                  ? isGitActive
                  : undefined;

          return (
            <button
              type="button"
              key={button.label}
              aria-label={button.ariaLabel ?? button.label}
              aria-pressed={isPressed}
              onClick={handleClick}
              disabled={isDisabled}
              className={`relative z-20 flex h-[3.25rem] flex-1 items-center justify-center px-1.5 py-1.5 text-[0.6rem] font-semibold uppercase tracking-wide transition ${
                index < buttons.length - 1 ? "border-r border-slate-800" : ""
              } ${
                (button.label === "Go to file" && isGoToFileOpen) ||
                (button.label === "Tasks" && isTaskListActive) ||
                (button.label === "Git" && isGitActive)
                  ? "bg-slate-900 text-sky-200"
                  : "bg-transparent text-slate-100"
              } ${
                isDisabled
                  ? "cursor-not-allowed opacity-100"
                  : "hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:opacity-100"
              }`}
            >
              <span className="break-words text-center leading-tight">
                {button.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Toolbar;
