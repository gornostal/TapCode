import Fuse, { type IFuseOptions } from "fuse.js";
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

const FUSE_OPTIONS: IFuseOptions<HistoryEntry> = {
  includeScore: true,
  keys: ["command"],
  threshold: 0.4,
  ignoreLocation: true,
};

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
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
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

  const historyEntries = Array.from(uniqueCommands.values());
  const queryLower = trimmedQuery.toLowerCase();

  const substringMatches = historyEntries.filter((entry) =>
    entry.command.toLowerCase().includes(queryLower),
  );

  if (substringMatches.length > 0) {
    return substringMatches
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
      .slice(0, limit);
  }

  const fuse = new Fuse(historyEntries, FUSE_OPTIONS);
  const fuzzyResults = fuse.search(trimmedQuery);

  return fuzzyResults
    .map((result) => ({
      entry: result.item,
      score: result.score === undefined ? 1 : 1 - result.score,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.entry);
}
