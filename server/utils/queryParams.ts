/**
 * Normalizes query parameters to string values.
 * Handles string, array, and other types.
 */
export const normalizeQueryParam = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string") {
        return item;
      }
    }
    return "";
  }

  return "";
};

/**
 * Normalizes and validates a directory query parameter.
 * Ensures no path traversal attacks (no ".." segments).
 * @throws Error with code EINVALIDDIR if validation fails
 */
export const normalizeDirectoryQueryParam = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const replaced = trimmed.replace(/\\/g, "/");
  const segments = replaced.split("/").filter(Boolean);

  for (const segment of segments) {
    if (segment === "..") {
      const error = Object.assign(new Error("Invalid directory parameter"), {
        code: "EINVALIDDIR",
      });
      throw error;
    }
  }

  return segments.join("/");
};
