type NavigationBarProps = {
  currentPath: string;
  onBack: () => void;
  disabled?: boolean;
};

const NavigationBar = ({
  currentPath,
  onBack,
  disabled = false,
}: NavigationBarProps) => (
  <div className="fixed bottom-[3.25rem] left-0 right-0 z-20 border-t border-b border-slate-800 bg-slate-950/95 backdrop-blur">
    <div className="relative isolate">
      <div className="pointer-events-none absolute inset-0 z-0 bg-slate-900/60 backdrop-blur" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-sky-500/20 via-purple-500/10 to-emerald-500/20 opacity-80" />
      <div
        className="relative z-20 mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
        style={{ height: "30px" }}
      >
        <div className="flex-1 overflow-hidden">
          <p className="truncate font-mono text-sm text-slate-300">
            {currentPath}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          disabled={disabled}
          className="flex-shrink-0 rounded p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
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

export default NavigationBar;
