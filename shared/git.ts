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
