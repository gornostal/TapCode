import {
  FormEvent,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

type EditTaskModalProps = {
  isOpen: boolean;
  initialValue: string;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
};

const EditTaskModal = ({
  isOpen,
  initialValue,
  onClose,
  onSubmit,
}: EditTaskModalProps) => {
  const [taskText, setTaskText] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTaskText(initialValue);
      setSubmitError(null);
    }
  }, [initialValue, isOpen]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.focus();
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
    }
  }, [isOpen]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = taskText.trim();

    if (!trimmed) {
      setSubmitError("Enter a task before saving it.");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    void (async () => {
      try {
        await onSubmit(trimmed);
        onClose();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape" && !isSubmitting) {
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
      <div className="w-full max-w-2xl rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-slate-100">Edit Task</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="edit-task-text" className="sr-only">
              Task text
            </label>
            <textarea
              ref={textareaRef}
              id="edit-task-text"
              name="text"
              placeholder="Update your task"
              className="w-full rounded border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
              value={taskText}
              onChange={(event) => setTaskText(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              rows={8}
            />
          </div>
          {submitError ? (
            <p className="text-sm text-rose-400">{submitError}</p>
          ) : null}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-700 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-600 hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-slate-100 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTaskModal;
