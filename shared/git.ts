import type { SuccessResponse, TextRequest } from "./http";
import type { FileListItem } from "./files";

export interface GitStatusResponse {
  branch: string;
  ahead: number;
  behind: number;
  staged: FileListItem[];
  unstaged: FileListItem[];
  untracked: FileListItem[];
}

export interface GitDiffResponse {
  diff: string;
}

export type StageAllResponse = SuccessResponse;

export type CommitRequest = TextRequest;

export type CommitResponse = SuccessResponse;
