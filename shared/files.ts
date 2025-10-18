export type FileKind = "file" | "directory";

export interface FileListItem {
  path: string;
  kind: FileKind;
}

export interface FilesResponse {
  query: string;
  directory: string;
  parentDirectory: string | null;
  items: FileListItem[];
  projectName: string;
}

export interface FileContentResponse {
  path: string;
  size: number;
  isBinary: boolean;
  content: string | null;
  truncated: boolean;
  language: string | null;
}

export type FilesRequestQuery = Record<string, string | undefined> & {
  /**
   * Optional fuzzy match term. When omitted or blank, the server lists the contents
   * of the directory supplied in `dir` (or the project root when `dir` is empty).
   */
  q?: string;
  /**
   * Optional project-relative directory path. Supplying a value outside the project
   * root (for example containing `..`) causes the server to respond with 400.
   */
  dir?: string;
};

export type FileRequestQuery = Record<string, string | undefined> & {
  /**
   * Project-relative file path. The server returns 400 when this field is missing,
   * blank, or points outside the repository.
   */
  path?: string;
};
