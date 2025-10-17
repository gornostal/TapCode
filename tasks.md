# Instructions

Implement the first task, run tests, remove the item from this file and then stop.

Note: This file may change while work is being done - new items may be added.

# Tasks

- Truncate long command lines in command history list. Make sure commands don't overflow the box boundaries

- In commandRunnerService, Put session id in response headers instead of SSE messages. Update all code that is it.

- Command output view should also have + - toolbar buttons like GitDiff.tsx

- helper text about annotations

- Reorganize ./shared:
  messages.ts should not import agents.ts -- import from agents directly
  extract everything from message.ts to files by type (e.g. tasks.ts) and remove messages.ts

- move killExistingInstance from server/index.ts to utils
