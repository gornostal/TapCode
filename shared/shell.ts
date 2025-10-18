export interface HistoryEntry {
  command: string;
  /**
   * Unix epoch milliseconds when the command last ran. Not all history sources
   * provide timestamps, so this field is omitted in those cases.
   */
  timestamp?: number;
}

export interface ShellSuggestionsResponse {
  commands: HistoryEntry[];
}

export type ShellSuggestionsQuery = Record<string, string | undefined> & {
  /**
   * Autocomplete prefix. The server trims the value and returns HTTP 400 when
   * the normalized string is empty.
   */
  q?: string;
};
