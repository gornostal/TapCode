import {
  ClipboardCheckIcon,
  FolderIcon,
  GitBranchIcon,
  SearchIcon,
  TerminalIcon,
} from "@/components/icons";
import { ReactElement } from "react";

type TabBarButton = {
  label: string;
  ariaLabel?: string;
  icon: ReactElement;
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
    icon: <FolderIcon className="block h-5 w-5" focusable={false} />,
  },
  {
    label: "Go to file",
    icon: <SearchIcon className="block h-5 w-5" focusable={false} />,
  },
  {
    label: "Command",
    icon: <TerminalIcon className="block h-5 w-5" focusable={false} />,
  },
  {
    label: "Git",
    icon: <GitBranchIcon className="block h-5 w-5" focusable={false} />,
  },
  {
    label: "Tasks",
    icon: <ClipboardCheckIcon className="block h-5 w-5" focusable={false} />,
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
    <nav
      className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95"
      style={{ paddingBottom: "var(--safe-area-inset-bottom)" }}
    >
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
