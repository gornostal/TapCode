# Instructions

Implement the first task, run tests, remove the item from this file and then stop.

Note: This file may change while work is being done - new items may be added.

# Tasks

- Command Runner API Documentation for Client Implementation:

  ## Overview

  The command runner API allows executing shell commands on the server with streaming output and reconnection support for long-running processes.

  ## Endpoints

  NOTE: use types from `./shared` instead of re-implementing them on the client.

  ### POST /api/command/run

  Starts a new command or reconnects to an existing one.

  **Request Body:**

  ```json
  {
    "text": "npm test", // Required: The shell command to execute
    "sessionId": "abc123..." // Optional: Session ID for reconnection
  }
  ```

  **Response:** Server-Sent Events (SSE) stream

  **Event Format:**
  Each event is sent as `data: <json>\n\n`

  **Event Types:**
  1. Session event (first event sent):

     ```json
     { "type": "session", "data": "session-id-string" }
     ```

     Client should store this sessionId for reconnection.

  2. Stdout output:

     ```json
     { "type": "stdout", "data": "output text" }
     ```

  3. Stderr output:

     ```json
     { "type": "stderr", "data": "error text" }
     ```

  4. Process exit:

     ```json
     { "type": "exit", "data": "Process exited", "code": 0 }
     ```

  5. Error:
     ```json
     { "type": "error", "data": "error message" }
     ```

  **Keep-alive:** Server sends `: keep-alive\n\n` every 30 seconds to maintain connection.

  ### GET /api/command/runs

  Returns list of all running and recently completed commands.

  **Response:**

  ```json
  [
    {
      "sessionId": "abc123...",
      "command": "npm test",
      "startTime": 1634567890123, // Unix timestamp in milliseconds
      "isComplete": false,
      "exitCode": 0 // Only present when isComplete is true
    }
  ]
  ```

  **Sorting:** Results are ordered by startTime, newest first.

  ## Client Implementation Guide
  1. **Starting a command:**
     - POST to /api/command/run with command in request body
     - Listen for SSE events
     - Store the sessionId from the first "session" event
     - Display stdout/stderr appropriately (e.g., different colors)
     - Handle exit/error events to close the stream

  2. **Reconnection:**
     - If connection drops (timeout, network issue), POST again with the stored sessionId
     - Server will resume streaming from current position (not from the beginning)
     - Process continues running even when client disconnects

  3. **Listing commands:**
     - GET /api/command/runs to show all active/recent commands
     - Can use this to reconnect to commands started in another session

  4. **Output buffering:**
     - Server buffers all output for 5 minutes after completion
     - Reconnecting to completed command will send all buffered output then close

  5. **Session cleanup:**
     - Sessions are automatically cleaned up 5 minutes after command completion
     - After cleanup, reconnection with that sessionId will start a new command

- helper text about annotations
