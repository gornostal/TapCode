type ToolbarButton = {
  label: string;
  ariaLabel?: string;
};

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { label: "Ellipsis", ariaLabel: "Open more options" },
  { label: "Go to file" },
  { label: "View uncommitted" },
  { label: "Stage changes" },
  { label: "Todo list" },
];

const Toolbar = () => (
  <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
    <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
      {TOOLBAR_BUTTONS.map((button) => (
        <button
          type="button"
          key={button.label}
          aria-label={button.ariaLabel ?? button.label}
          disabled
          className="flex h-20 w-20 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/70 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-100 transition disabled:cursor-not-allowed disabled:opacity-100"
        >
          <span className="text-center leading-tight">{button.label}</span>
        </button>
      ))}
    </div>
  </nav>
);

export default Toolbar;
