import { FormEvent, useState, useEffect } from "react";
import { AgentName, isAgentName } from "@shared/agents";

type AgentSelectionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (settings: AgentSettings) => void;
  onRunTask?: (settings: AgentSettings) => void;
};

export type SandboxMode = "project" | "yolo";

export type AgentSettings = {
  agent: AgentName;
  sandbox: SandboxMode;
};

const AGENT_SETTINGS_STORAGE_KEY = "agent-settings";

const isSandboxMode = (value: unknown): value is SandboxMode => {
  return value === "project" || value === "yolo";
};

const loadSettings = (): AgentSettings => {
  const defaults: AgentSettings = {
    agent: "codex",
    sandbox: "project",
  };

  if (typeof window === "undefined") {
    return defaults;
  }

  try {
    const stored = window.localStorage.getItem(AGENT_SETTINGS_STORAGE_KEY);
    if (!stored) {
      return defaults;
    }

    const parsed = JSON.parse(stored) as Partial<AgentSettings>;
    return {
      agent: isAgentName(parsed.agent) ? parsed.agent : defaults.agent,
      sandbox: isSandboxMode(parsed.sandbox)
        ? parsed.sandbox
        : defaults.sandbox,
    };
  } catch {
    return defaults;
  }
};

const AgentSelectionModal = ({
  isOpen,
  onClose,
  onSubmit,
  onRunTask,
}: AgentSelectionModalProps) => {
  const [settings, setSettings] = useState<AgentSettings>(loadSettings);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        AGENT_SETTINGS_STORAGE_KEY,
        JSON.stringify(settings),
      );
    } catch {
      // Ignore storage persistence issues
    }
  }, [settings]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSubmit(settings);
    onClose();
  };

  const handleRunTask = (): void => {
    onSubmit(settings);
    if (onRunTask) {
      onRunTask(settings);
    }
    onClose();
  };

  const handleBackdropClick = (
    event: React.MouseEvent<HTMLDivElement>,
  ): void => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <h2 className="mb-6 text-xl font-semibold text-slate-100">
          Agent Settings
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Agent Name
            </label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="agent"
                  value="codex"
                  checked={settings.agent === "codex"}
                  onChange={(event) => {
                    const { value } = event.target;
                    if (isAgentName(value)) {
                      setSettings({ ...settings, agent: value });
                    }
                  }}
                  className="h-4 w-4 border-slate-700 bg-slate-950/70 text-orange-400 focus:ring-2 focus:ring-orange-400 focus:ring-offset-0"
                />
                <span className="text-sm text-slate-100">Codex</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="agent"
                  value="claude"
                  checked={settings.agent === "claude"}
                  onChange={(event) => {
                    const { value } = event.target;
                    if (isAgentName(value)) {
                      setSettings({ ...settings, agent: value });
                    }
                  }}
                  className="h-4 w-4 border-slate-700 bg-slate-950/70 text-orange-400 focus:ring-2 focus:ring-orange-400 focus:ring-offset-0"
                />
                <span className="text-sm text-slate-100">Claude</span>
              </label>
            </div>
          </div>

          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Sandbox
            </label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="sandbox"
                  value="project"
                  checked={settings.sandbox === "project"}
                  onChange={(event) => {
                    const { value } = event.target;
                    if (isSandboxMode(value)) {
                      setSettings({ ...settings, sandbox: value });
                    }
                  }}
                  className="h-4 w-4 border-slate-700 bg-slate-950/70 text-orange-400 focus:ring-2 focus:ring-orange-400 focus:ring-offset-0"
                />
                <span className="text-sm text-slate-100">Project</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="sandbox"
                  value="yolo"
                  checked={settings.sandbox === "yolo"}
                  onChange={(event) => {
                    const { value } = event.target;
                    if (isSandboxMode(value)) {
                      setSettings({ ...settings, sandbox: value });
                    }
                  }}
                  className="h-4 w-4 border-slate-700 bg-slate-950/70 text-orange-400 focus:ring-2 focus:ring-orange-400 focus:ring-offset-0"
                />
                <span className="text-sm text-slate-100">YOLO</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 select-none">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-700 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-600 hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded border border-slate-700 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-600 hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            >
              Save
            </button>
            {onRunTask && (
              <button
                type="button"
                onClick={handleRunTask}
                className="rounded bg-orange-400 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-orange-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
              >
                Run
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgentSelectionModal;
