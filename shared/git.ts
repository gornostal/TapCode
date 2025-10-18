import type { SuccessResponse, TextRequest } from "./http";

export interface GitStatusResponse {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export interface GitDiffResponse {
  diff: string;
}

export type StageAllResponse = SuccessResponse;

export type CommitRequest = TextRequest;

export type CommitResponse = SuccessResponse;
