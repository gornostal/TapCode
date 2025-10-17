import { useCallback, useEffect, useState } from "react";

type UsePersistentFontSizeOptions = {
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
};

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
};

const readStoredFontSize = (
  key: string,
  min: number,
  max: number,
  fallback: number,
): number => {
  if (typeof window === "undefined") {
    return fallback;
  }

  const rawValue = window.localStorage.getItem(key);

  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return clamp(parsed, min, max);
};

const writeStoredFontSize = (key: string, value: number) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, String(value));
};

export const usePersistentFontSize = (
  storageKey: string,
  options: UsePersistentFontSizeOptions = {},
) => {
  const { min = 6, max = 32, step = 1, defaultValue = 10 } = options;

  const [fontSize, setFontSize] = useState(() =>
    readStoredFontSize(storageKey, min, max, clamp(defaultValue, min, max)),
  );

  useEffect(() => {
    writeStoredFontSize(storageKey, fontSize);
  }, [fontSize, storageKey]);

  const increaseFontSize = useCallback(() => {
    setFontSize((prev) => clamp(prev + step, min, max));
  }, [max, min, step]);

  const decreaseFontSize = useCallback(() => {
    setFontSize((prev) => clamp(prev - step, min, max));
  }, [max, min, step]);

  return {
    fontSize,
    setFontSize,
    increaseFontSize,
    decreaseFontSize,
  };
};
