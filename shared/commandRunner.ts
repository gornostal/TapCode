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
}
