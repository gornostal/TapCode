export interface CommandOutput {
  type: "stdout" | "stderr" | "exit" | "error";
  data: string;
  code?: number;
}

export interface CommandRunSummary {
  sessionId: string;
  command: string;
  startTime: number;
  isComplete: boolean;
  exitCode?: number;
  stopRequested: boolean;
}

export type CommandStopStatus = "not_found" | "already_complete" | "stopping";

export interface CommandStopResponse {
  sessionId: string;
  status: CommandStopStatus;
  exitCode?: number;
}

export const COMMAND_SESSION_HEADER = "x-command-session-id";
export const COMMAND_TEXT_HEADER = "x-command-text";
