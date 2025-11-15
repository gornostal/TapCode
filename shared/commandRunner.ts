export interface CommandOutput {
  type: "stdout" | "stderr" | "exit" | "error";
  data: string;
  /**
   * Process exit code. Only provided for `type: "exit"` events.
   */
  code?: number;
}

export interface CommandRunSummary {
  sessionId: string;
  command: string;
  startTime: number;
  isComplete: boolean;
  /**
   * Present only when `isComplete` is true.
   */
  exitCode?: number;
  stopRequested: boolean;
}

export type CommandStopStatus = "not_found" | "already_complete" | "stopping";

export interface CommandStopResponse {
  sessionId: string;
  status: CommandStopStatus;
  /**
   * Provided when `status` is `"already_complete"` to report the finished exit code.
   */
  exitCode?: number;
}

export const COMMAND_SESSION_HEADER = "x-command-session-id";
export const COMMAND_TEXT_HEADER = "x-command-text";

export interface RunCommandRequest {
  /**
   * Command to execute. Required when `sessionId` is missing; trimmed server-side
   * and rejected if the resulting string is empty.
   */
  text?: string;
  /**
   * Unique client-provided identifier used to deduplicate command run requests.
   * When provided, the server will reuse the original session if the same
   * request is submitted multiple times.
   */
  requestId?: string;
  /**
   * Existing session identifier returned by `/command/run`. Required when `text`
   * is omitted (client reconnection) and ignored when starting a new run.
   */
  sessionId?: string;
}

export type CommandRunsResponse = CommandRunSummary[];

export interface CommandStopParams {
  id: string;
}
