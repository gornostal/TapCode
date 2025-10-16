import { fuzzySearchHistory, type HistoryEntry } from "../utils/shellHistory";

/**
 * Get suggested shell commands based on user query
 * @param query The search query string
 * @returns Array of up to 20 unique command suggestions
 */
export function getShellSuggestions(query: string): {
  commands: HistoryEntry[];
} {
  // Get 20 deduplicated commands using the fuzzy search function
  const results = fuzzySearchHistory(query, 20);

  return {
    commands: results,
  };
}
