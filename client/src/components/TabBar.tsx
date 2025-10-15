type TabBarButton = {
  label: string;
  ariaLabel?: string;
  icon: JSX.Element;
};

type TabBarProps = {
  onNavigateToRoot: () => void;
  onGoToFileToggle: () => void;
  isGoToFileOpen: boolean;
  onOpenCommands: () => void;
  isCommandsActive: boolean;
  onOpenTaskList: () => void;
  isTaskListActive: boolean;
  onOpenGitStatus: () => void;
  isGitActive: boolean;
};

const TABBAR_BUTTONS: TabBarButton[] = [
  {
    label: "Files",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="block h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M3.5 7.5h5l2 2H20a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 20 18.5H5A1.5 1.5 0 0 1 3.5 17v-9.5Z" />
        <path d="M3.5 7.5V6A2 2 0 0 1 5.5 4h3a2 2 0 0 1 1.6.8l1.2 1.7" />
      </svg>
    ),
  },
  {
    label: "Go to file",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="block h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="11" cy="11" r="6" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" />
      </svg>
    ),
  },
  {
    label: "Command",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="block h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <polyline points="7,9 10,12 7,15" />
        <line x1="12" y1="15" x2="17" y2="15" />
      </svg>
    ),
  },
  {
    label: "Git",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="block h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="6" cy="6" r="2" />
        <circle cx="18" cy="6" r="2" />
        <circle cx="12" cy="18" r="2" />
        <path d="M6 8v4a4 4 0 0 0 4 4h2" />
        <path d="M18 8v4a4 4 0 0 1-4 4h-2" />
      </svg>
    ),
  },
  {
    label: "Tasks",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="block h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="8" y="3" width="8" height="3" rx="1" />
        <path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
        <path d="M9 13l2 2 4-4" />
      </svg>
    ),
  },
];

const TabBar = ({
  onNavigateToRoot,
  onGoToFileToggle,
  isGoToFileOpen,
  onOpenCommands,
  isCommandsActive,
  onOpenTaskList,
  isTaskListActive,
  onOpenGitStatus,
  isGitActive,
}: TabBarProps) => {
  const buttons = TABBAR_BUTTONS;

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95">
      <div className="relative flex w-full flex-wrap items-center justify-center overflow-hidden isolate">
        <div className="pointer-events-none absolute inset-0 z-0 bg-slate-900/60" />
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-sky-500/20 via-purple-500/10 to-emerald-500/20 opacity-80" />
        {buttons.map((button, index) => {
          const handleClick = () => {
            if (button.label === "Files") {
              onNavigateToRoot();
            } else if (button.label === "Git") {
              onOpenGitStatus();
            } else if (button.label === "Go to file") {
              onGoToFileToggle();
            } else if (button.label === "Command") {
              onOpenCommands();
            } else if (button.label === "Tasks") {
              onOpenTaskList();
            }
          };

          const isDisabled =
            button.label !== "Files" &&
            button.label !== "Go to file" &&
            button.label !== "Command" &&
            button.label !== "Tasks" &&
            button.label !== "Git";

          let isPressed: boolean | undefined;
          switch (button.label) {
            case "Go to file":
              isPressed = isGoToFileOpen;
              break;
            case "Command":
              isPressed = isCommandsActive;
              break;
            case "Tasks":
              isPressed = isTaskListActive;
              break;
            case "Git":
              isPressed = isGitActive;
              break;
            default:
              isPressed = undefined;
          }

          return (
            <button
              type="button"
              key={button.label}
              aria-label={button.ariaLabel ?? button.label}
              aria-pressed={isPressed}
              onClick={handleClick}
              disabled={isDisabled}
              className={`relative z-20 flex h-13 flex-1 flex-col items-center justify-center gap-1.5 px-1.5 text-[0.6rem] font-semibold uppercase leading-none tracking-wide transition ${
                index < buttons.length - 1 ? "border-r border-slate-800" : ""
              } ${
                (button.label === "Go to file" && isGoToFileOpen) ||
                (button.label === "Command" && isCommandsActive) ||
                (button.label === "Tasks" && isTaskListActive) ||
                (button.label === "Git" && isGitActive)
                  ? "bg-slate-900 text-sky-200"
                  : "bg-transparent text-slate-100"
              } ${
                isDisabled
                  ? "cursor-not-allowed opacity-100"
                  : "cursor-pointer hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:opacity-100"
              }`}
            >
              <span aria-hidden="true" className="block leading-none">
                {button.icon}
              </span>
              <span className="block break-words text-center leading-none">
                {button.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default TabBar;
