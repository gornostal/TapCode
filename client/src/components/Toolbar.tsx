type ToolbarButton = {
  label: string;
  ariaLabel?: string;
};

type ToolbarProps = {
  onGoToFileToggle: () => void;
  isGoToFileOpen: boolean;
};

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { label: "…", ariaLabel: "Open more options" },
  { label: "Go to file" },
  { label: "View uncommitted" },
  { label: "Stage changes" },
  { label: "Git status" },
  { label: "Todo list" },
];

const Toolbar = ({ onGoToFileToggle, isGoToFileOpen }: ToolbarProps) => (
  <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
    <div className="relative flex w-full flex-wrap items-stretch justify-center overflow-hidden isolate">
      <div className="pointer-events-none absolute inset-0 z-0 bg-slate-900/60 backdrop-blur" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-sky-500/20 via-purple-500/10 to-emerald-500/20 opacity-80" />
      {TOOLBAR_BUTTONS.map((button, index) => (
        <button
          type="button"
          key={button.label}
          aria-label={button.ariaLabel ?? button.label}
          aria-pressed={
            button.label === "Go to file" ? isGoToFileOpen : undefined
          }
          onClick={button.label === "Go to file" ? onGoToFileToggle : undefined}
          disabled={button.label !== "Go to file"}
          className={`relative z-20 flex h-[3.25rem] flex-1 items-center justify-center px-1.5 py-1.5 text-[0.6rem] font-semibold uppercase tracking-wide transition ${
            index < TOOLBAR_BUTTONS.length - 1
              ? "border-r border-slate-800"
              : ""
          } ${
            button.label === "Go to file" && isGoToFileOpen
              ? "bg-slate-900 text-sky-200"
              : "bg-transparent text-slate-100"
          } ${
            button.label !== "Go to file"
              ? "cursor-not-allowed opacity-100"
              : "hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:opacity-100"
          }`}
        >
          <span className="break-all text-center leading-tight">
            {button.label}
          </span>
        </button>
      ))}
    </div>
  </nav>
);

export default Toolbar;
