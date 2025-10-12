type ToolbarButton = {
  label: string;
  ariaLabel?: string;
};

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { label: "…", ariaLabel: "Open more options" },
  { label: "Go to file" },
  { label: "View uncommitted" },
  { label: "Stage changes" },
  { label: "Git status" },
  { label: "Todo list" },
];

const Toolbar = () => (
  <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
    <div className="relative flex w-full flex-wrap items-stretch justify-center">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-blue-500/5" />
      {TOOLBAR_BUTTONS.map((button, index) => (
        <button
          type="button"
          key={button.label}
          aria-label={button.ariaLabel ?? button.label}
          disabled
          className={`relative flex h-[3.25rem] flex-1 items-center justify-center bg-slate-900/70 px-1.5 py-1.5 text-[0.6rem] font-semibold uppercase tracking-wide text-slate-100 transition disabled:cursor-not-allowed disabled:opacity-100 ${
            index < TOOLBAR_BUTTONS.length - 1 ? "border-r border-slate-800" : ""
          }`}
        >
          <span className="break-all text-center leading-tight">{button.label}</span>
        </button>
      ))}
    </div>
  </nav>
);

export default Toolbar;
