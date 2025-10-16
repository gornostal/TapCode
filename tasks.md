# Instructions

Implement the first task, run tests, remove the item from this file and then stop.

Note: This file may change while work is being done - new items may be added.

# Tasks

- When receiving a task run request in the server side, append  paragraph: "Remove this task from ./tasks.md when finished"

- Commit all changes

- Don't use bash type for highlighting command output

- Put session id in response headers

- Command output view should also have + - toolbar buttons like GitDiff.tsx

- Make sure first letter is not capitalized when user types cmd in client/src/components/CommandRunner.tsx

- Add more logs to the code. Don't log command output.

- helper text about annotations

- Reorganize ./shared:
  messages.ts should not import agents.ts -- import from agents directly
  extract everything from message.ts to files by type (e.g. tasks.ts) and remove messages.ts

- move killExistingInstance from server/index.ts to utils

- move PID file from ~/.tapcode.pid to `$HOME/.local/state/tapcode/pid` or `~/Library/Logs/tapcode/pid` for mac.

- Use Pino logging lib (npm install pino) instead of current implementation in ./server/logger.ts.

- In addition to stdout logs, log to file: `$HOME/.local/state/tapcode/tapcode.log` or `~/Library/Logs/tapcode/tapcode.log` for mac.
  Delete log file on startup so it alwsys contains logs from last run.
