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
  items: FileListItem[];
}
