/**
 * Gets the parent directory of a given directory path.
 * Returns null if the directory is the root or empty.
 */
export const parentDirectoryOf = (directory: string): string | null => {
  if (!directory) {
    return null;
  }

  const segments = directory.split("/");
  segments.pop();

  return segments.join("/");
};
