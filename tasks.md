# Instructions

Implement the first task, run tests, remove the item from this file and then stop.

Note: This file may change while work is being done - new items may be added.

# Tasks

- Truncate long command lines in command history list. Make sure commands don't overflow the box boundaries

- Fix shell command autosuggestions: they don't appear anymore

- move PID file from ~/.tapcode.pid to `$HOME/.local/state/tapcode/pid` or `~/Library/Logs/tapcode/pid` for mac.

- Put session id in response headers

- Command output view should also have + - toolbar buttons like GitDiff.tsx

- Add more logs to the code. Don't log command output, but among other things, log http requests which resulted in code >= 400 including requests to non-existent API

- helper text about annotations

- Reorganize ./shared:
  messages.ts should not import agents.ts -- import from agents directly
  extract everything from message.ts to files by type (e.g. tasks.ts) and remove messages.ts

- move killExistingInstance from server/index.ts to utils

- In addition to stdout logs, log to file: `$HOME/.local/state/tapcode/tapcode.log` or `~/Library/Logs/tapcode/tapcode.log` for mac.
  Delete log file on startup so it alwsys contains logs from last run.
