export interface HelloResponse {
  message: string;
}

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
