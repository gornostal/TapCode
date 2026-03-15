import { useCallback, useState } from "react";

const STORAGE_KEY = "tapcode:wordWrap";

const readStoredWordWrap = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
};

export const useWordWrap = () => {
  const [wordWrap, setWordWrap] = useState(() => readStoredWordWrap());

  const toggleWordWrap = useCallback(() => {
    setWordWrap((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      }
      return next;
    });
  }, []);

  return { wordWrap, toggleWordWrap };
};
