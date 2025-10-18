# TapCode

TapCode aims to help developers code effectively from smartphones by pairing them with coding agents. It will provide a web UI where developers can review generated code and steer the agents with additional instructions.

## Environment Variables

Configure the server by exporting the following variables before starting TapCode:

- `TAPCODE_HOST` (optional): Network interface the server binds to. Defaults to `127.0.0.1` for local-only access.
- `TAPCODE_PORT` (optional): Port the server listens on. Defaults to `2025`.
- `TAPCODE_BASIC_AUTH` (optional): Enables HTTP Basic Authentication when set to `username:password`. Leave unset to disable authentication.
