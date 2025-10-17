export interface HistoryEntry {
  command: string;
  timestamp?: number;
}

export interface ShellSuggestionsResponse {
  commands: HistoryEntry[];
}
