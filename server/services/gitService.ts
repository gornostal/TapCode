import type { GitStatusResponse, GitDiffResponse } from "@shared/messages";
import { exec } from "child_process";
import { promisify } from "util";
import { resolveFromRoot } from "../utils/paths";

const execAsync = promisify(exec);

/**
 * Gets the current git status including branch, ahead/behind, and file statuses
 */
export const getGitStatus = async (): Promise<GitStatusResponse> => {
  const projectRoot = resolveFromRoot("");

  try {
    // Get branch name and tracking info
    const { stdout: branchOutput } = await execAsync(
      "git rev-parse --abbrev-ref HEAD",
      { cwd: projectRoot },
    );
    const branch = branchOutput.trim();

    // Get ahead/behind counts
    let ahead = 0;
    let behind = 0;
    try {
      const { stdout: trackingOutput } = await execAsync(
        "git rev-list --left-right --count @{u}...HEAD",
        { cwd: projectRoot },
      );
      const [behindStr, aheadStr] = trackingOutput.trim().split(/\s+/);
      ahead = parseInt(aheadStr, 10) || 0;
      behind = parseInt(behindStr, 10) || 0;
    } catch {
      // No upstream or other tracking error - keep defaults
    }

    // Get file statuses
    const { stdout: statusOutput } = await execAsync("git status --porcelain", {
      cwd: projectRoot,
    });

    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];

    const lines = statusOutput.split("\n").filter((line) => line.length > 0);
    for (const line of lines) {
      const status = line.substring(0, 2);
      const filePath = line.substring(3);

      // First character is staged status, second is unstaged
      const stagedStatus = status[0];
      const unstagedStatus = status[1];

      if (stagedStatus === "?" && unstagedStatus === "?") {
        untracked.push(filePath);
      } else {
        if (stagedStatus !== " " && stagedStatus !== "?") {
          staged.push(filePath);
        }
        if (unstagedStatus !== " " && unstagedStatus !== "?") {
          unstaged.push(filePath);
        }
      }
    }

    return {
      branch,
      ahead,
      behind,
      staged,
      unstaged,
      untracked,
    };
  } catch (error) {
    throw new Error(`Failed to get git status: ${(error as Error).message}`);
  }
};

/**
 * Gets the git diff showing only unstaged and new (untracked) files
 */
export const getGitDiff = async (): Promise<GitDiffResponse> => {
  const projectRoot = resolveFromRoot("");

  try {
    // Get diff for unstaged changes only (excludes staged files)
    const { stdout: unstagedDiff } = await execAsync("git diff", {
      cwd: projectRoot,
    });

    // Get untracked files
    const { stdout: untrackedFiles } = await execAsync(
      "git ls-files --others --exclude-standard",
      {
        cwd: projectRoot,
      },
    );

    let diff = unstagedDiff;

    // Add untracked files to the diff output
    if (untrackedFiles.trim()) {
      const untrackedList = untrackedFiles.trim().split("\n");
      const untrackedSection = untrackedList
        .map(
          (file) =>
            `diff --git a/${file} b/${file}\nnew file\n--- /dev/null\n+++ b/${file}\n`,
        )
        .join("\n");

      diff = diff ? `${diff}\n${untrackedSection}` : untrackedSection;
    }

    return {
      diff: diff || "No changes",
    };
  } catch (error) {
    throw new Error(`Failed to get git diff: ${(error as Error).message}`);
  }
};

/**
 * Stages all changes (equivalent to git add -A)
 */
export const stageAll = async (): Promise<void> => {
  const projectRoot = resolveFromRoot("");

  try {
    await execAsync("git add -A", {
      cwd: projectRoot,
    });
  } catch (error) {
    throw new Error(`Failed to stage all changes: ${(error as Error).message}`);
  }
};

/**
 * Commits staged changes with the given message
 */
export const commitStaged = async (message: string): Promise<void> => {
  const projectRoot = resolveFromRoot("");

  if (!message || !message.trim()) {
    throw new Error("Commit message cannot be empty");
  }

  try {
    await execAsync(`git commit -m ${JSON.stringify(message)}`, {
      cwd: projectRoot,
    });
  } catch (error) {
    throw new Error(`Failed to commit changes: ${(error as Error).message}`);
  }
};
