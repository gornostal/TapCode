import { useRef } from "react";

import {
  ArrowLeftIcon,
  ChatBubbleIcon,
  CloseIcon,
  MinusIcon,
  PencilIcon,
  PlusIcon,
  RunTaskIcon,
  StopSquareFilledIcon,
} from "@/components/icons";

type ToolbarProps = {
  statusText: string;
  onBack: () => void;
  disabled?: boolean;
  onIncreaseFontSize?: () => void;
  onDecreaseFontSize?: () => void;
  onAnnotate?: () => void;
  onEdit?: () => void;
  editDisabled?: boolean;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  onRun?: () => void;
  runDisabled?: boolean;
  onRunLongPress?: () => void;
  onStop?: () => void;
  stopDisabled?: boolean;
};

const Toolbar = ({
  statusText: statusText,
  onBack,
  disabled = false,
  onIncreaseFontSize,
  onDecreaseFontSize,
  onAnnotate,
  onEdit,
  editDisabled = true,
  onDelete,
  deleteDisabled = true,
  onRun,
  runDisabled = false,
  onRunLongPress,
  onStop,
  stopDisabled = false,
}: ToolbarProps) => {
  const longPressTimerRef = useRef<number | null>(null);
  const isLongPressRef = useRef(false);

  const baseButtonClass =
    "flex-shrink-0 cursor-pointer rounded p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400";

  const handleRunMouseDown = () => {
    if (runDisabled || !onRunLongPress) return;

    isLongPressRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      isLongPressRef.current = true;
      onRunLongPress();
    }, 500); // 500ms for long press
  };

  const handleRunMouseUp = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!isLongPressRef.current && onRun && !runDisabled) {
      onRun();
    }

    isLongPressRef.current = false;
  };

  const handleRunMouseLeave = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    isLongPressRef.current = false;
  };

  return (
    <div
      className="fixed left-0 right-0 z-20 border-t border-b border-slate-800 bg-slate-950"
      style={{ bottom: "calc(3.25rem + var(--safe-area-inset-bottom))" }}
    >
      <div
        className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
        style={{ height: "30px" }}
      >
        <div className="flex flex-1 items-center gap-3 overflow-hidden">
          <p className="truncate font-mono text-sm text-slate-300">
            {statusText}
          </p>
        </div>
        <div className="flex items-center gap-2 select-none">
          {onStop && (
            <button
              type="button"
              onClick={onStop}
              disabled={stopDisabled}
              className="flex-shrink-0 cursor-pointer rounded p-2 text-slate-400 transition hover:bg-red-900/30 hover:text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
              aria-label="Stop command"
              title="Stop command"
            >
              <StopSquareFilledIcon className="h-4 w-4" />
            </button>
          )}
          {onRun && (
            <button
              type="button"
              onMouseDown={handleRunMouseDown}
              onMouseUp={handleRunMouseUp}
              onMouseLeave={handleRunMouseLeave}
              onTouchStart={handleRunMouseDown}
              onTouchEnd={handleRunMouseUp}
              disabled={runDisabled}
              className={`flex-shrink-0 cursor-pointer rounded p-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${
                runDisabled
                  ? "text-slate-400 disabled:hover:text-slate-400"
                  : "text-orange-400 hover:bg-orange-900/30 hover:text-orange-300 focus-visible:outline-orange-400"
              }`}
              aria-label="Run selected task (long press for settings)"
              title="Run selected task (long press for settings)"
            >
              <RunTaskIcon className="h-4 w-4" />
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              disabled={editDisabled}
              className={baseButtonClass}
              aria-label="Edit selected task"
              title="Edit selected task"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleteDisabled}
              className="flex-shrink-0 cursor-pointer rounded p-2 text-slate-400 transition hover:bg-red-900/30 hover:text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
              aria-label="Delete selected task"
              title="Delete selected task"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          )}
          {onAnnotate && (
            <button
              type="button"
              onClick={onAnnotate}
              className={baseButtonClass}
              aria-label="Annotate selected lines"
              title="Create annotation for selected lines"
            >
              <ChatBubbleIcon className="h-4 w-4" />
            </button>
          )}
          {onDecreaseFontSize && onIncreaseFontSize && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onDecreaseFontSize}
                className={baseButtonClass}
                aria-label="Decrease font size"
              >
                <MinusIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onIncreaseFontSize}
                className={baseButtonClass}
                aria-label="Increase font size"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={onBack}
            disabled={disabled}
            className={baseButtonClass}
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
