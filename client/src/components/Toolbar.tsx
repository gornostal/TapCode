import { useState } from "react";

type ToolbarButton = {
  label: string;
  ariaLabel?: string;
};

type ToolbarProps = {
  onGoToFileToggle: () => void;
  isGoToFileOpen: boolean;
  onOpenTodoList: () => void;
  isTodoListActive: boolean;
};

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { label: "…", ariaLabel: "Open more options" },
  { label: "Go to file" },
  { label: "Git" },
  { label: "Todo list" },
];

const GIT_SUBMENU_BUTTONS: ToolbarButton[] = [
  { label: "<", ariaLabel: "Back" },
  { label: "status" },
  { label: "changes" },
  { label: "stage all" },
  { label: "history" },
];

const Toolbar = ({
  onGoToFileToggle,
  isGoToFileOpen,
  onOpenTodoList,
  isTodoListActive,
}: ToolbarProps) => {
  const [isGitMenuOpen, setIsGitMenuOpen] = useState(false);

  const buttons = isGitMenuOpen ? GIT_SUBMENU_BUTTONS : TOOLBAR_BUTTONS;

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="relative flex w-full flex-wrap items-stretch justify-center overflow-hidden isolate">
        <div className="pointer-events-none absolute inset-0 z-0 bg-slate-900/60 backdrop-blur" />
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-sky-500/20 via-purple-500/10 to-emerald-500/20 opacity-80" />
        {buttons.map((button, index) => {
          const handleClick = () => {
            if (isGitMenuOpen && button.label === "<") {
              setIsGitMenuOpen(false);
            } else if (!isGitMenuOpen && button.label === "Git") {
              setIsGitMenuOpen(true);
            } else if (button.label === "Go to file") {
              onGoToFileToggle();
            } else if (button.label === "Todo list") {
              onOpenTodoList();
            }
          };

          const isDisabled =
            !isGitMenuOpen &&
            button.label !== "Go to file" &&
            button.label !== "Todo list" &&
            button.label !== "Git";

          const isPressed =
            button.label === "Go to file"
              ? isGoToFileOpen
              : button.label === "Todo list"
                ? isTodoListActive
                : button.label === "Git"
                  ? isGitMenuOpen
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
                (button.label === "Todo list" && isTodoListActive) ||
                (button.label === "Git" && isGitMenuOpen)
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
