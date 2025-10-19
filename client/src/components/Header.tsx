type HeaderProps = {
  projectName: string;
};

const Header = ({ projectName }: HeaderProps) => (
  <header
    className="fixed left-0 right-0 top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur"
    style={{ paddingTop: "var(--safe-area-inset-top)" }}
  >
    <div
      className="mx-auto flex items-center justify-center px-4 sm:px-6 lg:px-8"
      style={{ height: "30px" }}
    >
      <h1 className="text-sm font-semibold tracking-tight text-slate-100">
        {projectName || "Loading project"}
      </h1>
    </div>
  </header>
);

export default Header;
