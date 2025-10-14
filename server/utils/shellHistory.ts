import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface HistoryEntry {
  command: string;
  timestamp?: number;
}

/**
 * Read bash history from ~/.bash_history
 * Format: Simple line-by-line commands, or with timestamps when HISTTIMEFORMAT is set
 * Example without timestamps:
 *   ls -la
 *   cd /home
 * Example with timestamps:
 *   #1680589220
 *   ls -la
 *   #1680589225
 *   cd /home
 */
export function readBashHistory(limit: number = 100): HistoryEntry[] {
  const historyPath = join(homedir(), ".bash_history");

  try {
    const content = readFileSync(historyPath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim() !== "");

    const entries: HistoryEntry[] = [];
    let currentTimestamp: number | undefined;

    for (const line of lines) {
      // Check if line is a timestamp (starts with # followed by digits)
      if (line.startsWith("#") && /^#\d+$/.test(line)) {
        currentTimestamp = parseInt(line.substring(1), 10);
      } else {
        // It's a command
        entries.push({
          command: line,
          timestamp: currentTimestamp,
        });
        currentTimestamp = undefined;
      }
    }

    // Return the most recent commands
    return entries.slice(-limit).reverse();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * Read zsh history from ~/.zsh_history
 * Format: Extended history format when EXTENDED_HISTORY is enabled
 * Example:
 *   : 1458291931:0;ls -l
 *   : 1449561637:0;echo "foobar"
 * Format breakdown:
 *   : <timestamp>:<duration>;<command>
 */
export function readZshHistory(limit: number = 100): HistoryEntry[] {
  const historyPath = join(homedir(), ".zsh_history");

  try {
    const content = readFileSync(historyPath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim() !== "");

    const entries: HistoryEntry[] = [];

    for (const line of lines) {
      // Check if line is in extended history format
      const extendedMatch = line.match(/^:\s*(\d+):\d+;(.*)$/);
      if (extendedMatch) {
        const timestamp = parseInt(extendedMatch[1], 10);
        const command = extendedMatch[2];
        entries.push({ command, timestamp });
      } else {
        // Plain format (no extended history)
        entries.push({ command: line });
      }
    }

    // Return the most recent commands
    return entries.slice(-limit).reverse();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * Read fish history from ~/.local/share/fish/fish_history
 * Format: YAML-like structure with cmd, when, and optional paths fields
 * Example:
 *   - cmd: cat some/file/path
 *     when: 1636402372
 *     paths:
 *       - some/file/path
 *   - cmd: ls -la
 *     when: 1636402380
 */
export function readFishHistory(limit: number = 100): HistoryEntry[] {
  const historyPath = join(homedir(), ".local/share/fish/fish_history");

  try {
    const content = readFileSync(historyPath, "utf-8");
    const lines = content.split("\n");

    const entries: HistoryEntry[] = [];
    let currentEntry: { command?: string; timestamp?: number } | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Check for cmd: line
      const cmdMatch = trimmed.match(/^-?\s*cmd:\s*(.+)$/);
      if (cmdMatch) {
        // Save previous entry if exists
        if (currentEntry?.command) {
          entries.push({
            command: currentEntry.command,
            timestamp: currentEntry.timestamp,
          });
        }
        // Start new entry
        currentEntry = { command: unescapeFish(cmdMatch[1]) };
        continue;
      }

      // Check for when: line
      const whenMatch = trimmed.match(/^when:\s*(\d+)$/);
      if (whenMatch && currentEntry) {
        currentEntry.timestamp = parseInt(whenMatch[1], 10);
        continue;
      }

      // Ignore paths: and other fields
    }

    // Save last entry if exists
    if (currentEntry?.command) {
      entries.push({
        command: currentEntry.command,
        timestamp: currentEntry.timestamp,
      });
    }

    // Return the most recent commands
    return entries.slice(-limit).reverse();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * Unescape fish shell history format
 * Fish escapes backslashes as \\ and newlines as \\n
 */
function unescapeFish(str: string): string {
  return str.replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
}

/**
 * Calculate fuzzy match score for a command against a query
 * Returns a score where higher is better, or -1 if no match
 *
 * Scoring:
 * - Exact match: highest score
 * - Match at word boundaries: high score
 * - Sequential character matches: medium score
 * - Characters appear in order but not sequential: lower score
 */
function fuzzyMatchScore(command: string, query: string): number {
  const cmdLower = command.toLowerCase();
  const queryLower = query.toLowerCase();

  // Exact match
  if (cmdLower === queryLower) {
    return 10000;
  }

  // Contains as substring
  const substringIndex = cmdLower.indexOf(queryLower);
  if (substringIndex !== -1) {
    // Bonus points for matching at start or word boundary
    if (substringIndex === 0) {
      return 5000;
    }
    if (cmdLower[substringIndex - 1] === " ") {
      return 4000;
    }
    return 3000;
  }

  // Fuzzy match: check if all query characters appear in order
  let cmdIndex = 0;
  let queryIndex = 0;
  let consecutiveMatches = 0;
  let score = 1000;

  while (cmdIndex < cmdLower.length && queryIndex < queryLower.length) {
    if (cmdLower[cmdIndex] === queryLower[queryIndex]) {
      queryIndex++;
      consecutiveMatches++;
      // Bonus for consecutive character matches
      score += consecutiveMatches * 10;
    } else {
      consecutiveMatches = 0;
    }
    cmdIndex++;
  }

  // If we didn't match all query characters, no match
  if (queryIndex < queryLower.length) {
    return -1;
  }

  return score;
}

/**
 * Search shell history with fuzzy matching
 * @param query The search query string
 * @param limit Maximum number of results to return (default: 50)
 * @returns Array of matching history entries, sorted by relevance
 */
export function fuzzySearchHistory(
  query: string,
  limit: number = 50,
): HistoryEntry[] {
  if (!query || query.trim() === "") {
    return [];
  }

  // Try to read history from all supported shells
  // Get a large initial set to search through
  const bashHistory = readBashHistory(1000);
  const zshHistory = readZshHistory(1000);
  const fishHistory = readFishHistory(1000);

  // Combine all history entries and deduplicate by command
  const allHistory = [...bashHistory, ...zshHistory, ...fishHistory];
  const uniqueCommands = new Map<string, HistoryEntry>();

  for (const entry of allHistory) {
    const existing = uniqueCommands.get(entry.command);
    // Keep the entry with the most recent timestamp
    if (
      !existing ||
      (entry.timestamp &&
        (!existing.timestamp || entry.timestamp > existing.timestamp))
    ) {
      uniqueCommands.set(entry.command, entry);
    }
  }

  // Score and filter entries
  const scoredEntries: Array<{ entry: HistoryEntry; score: number }> = [];

  for (const entry of Array.from(uniqueCommands.values())) {
    const score = fuzzyMatchScore(entry.command, query);
    if (score >= 0) {
      scoredEntries.push({ entry, score });
    }
  }

  // Sort by score (highest first) and return limited results
  return scoredEntries
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.entry);
}
