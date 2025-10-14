import { FormEvent, useState, useEffect, useRef } from "react";

type AnnotationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
  selectedLines: Array<{ number: number; content: string }>;
  filename: string;
};

const ANNOTATION_DRAFT_STORAGE_KEY = "annotation-draft";

const AnnotationModal = ({
  isOpen,
  onClose,
  onSubmit,
  selectedLines,
  filename,
}: AnnotationModalProps) => {
  const [annotationText, setAnnotationText] = useState(() => {
    // Load draft from session storage on mount
    return sessionStorage.getItem(ANNOTATION_DRAFT_STORAGE_KEY) || "";
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSubmitError(null);
    }
  }, [isOpen]);

  // Save draft to session storage whenever it changes
  useEffect(() => {
    if (annotationText) {
      sessionStorage.setItem(ANNOTATION_DRAFT_STORAGE_KEY, annotationText);
    } else {
      sessionStorage.removeItem(ANNOTATION_DRAFT_STORAGE_KEY);
    }
  }, [annotationText]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmed = annotationText.trim();

    if (!trimmed) {
      setSubmitError("Enter an annotation before submitting.");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    // Format the task with annotation and code lines
    const codeLines = selectedLines
      .map((line) => `${line.number}: ${line.content}`)
      .join("\n");

    const formattedTask = `${trimmed}\n\n${filename}:\n${codeLines}`;

    void (async () => {
      try {
        await onSubmit(formattedTask);
        setAnnotationText("");
        sessionStorage.removeItem(ANNOTATION_DRAFT_STORAGE_KEY);
        onClose();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const handleBackdropClick = (
    event: React.MouseEvent<HTMLDivElement>,
  ): void => {
    if (event.target === event.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
        <h2 className="mb-4 text-xl font-semibold text-slate-100">
          Create Annotation
        </h2>

        {selectedLines.length > 0 && (
          <div className="mb-4 rounded border border-slate-700 bg-slate-950/50 p-3">
            <p className="mb-2 text-sm font-medium text-slate-300">
              Selected code from {filename}:
            </p>
            <pre className="text-xs text-slate-400 overflow-x-auto">
              {selectedLines.map((line) => (
                <div key={line.number}>
                  {line.number}: {line.content}
                </div>
              ))}
            </pre>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="annotation-text" className="sr-only">
              Annotation text
            </label>
            <textarea
              ref={textareaRef}
              id="annotation-text"
              name="text"
              placeholder="Enter your annotation or task description..."
              className="w-full rounded border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
              value={annotationText}
              onChange={(event) => setAnnotationText(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              rows={6}
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
              {isSubmitting ? "Creating…" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnnotationModal;
