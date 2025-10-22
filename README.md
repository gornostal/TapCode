# TapCode

**Code from your phone**

![TapCode Hero](./assets/hero.png)

---

## Table of Contents

- [What is TapCode?](#what-is-tapcode)
- [Features](#features)
- [Install](#install)
- [Configure](#configure)
- [Support](#support)
- [Contributing](#contributing)
- [License](#license)

---

## What is TapCode?

- It is a mobile-first programming UI that focuses on AI-assisted coding.
- It is a web-based interface that allows creating tasks for AI agents, running CLI commands, browsing code, and doing basic GIT operations.
- It is a client-server NodeJS application written with TypeScript, Express, Vite, React, and TailwindCSS.
- It is a task-oriented coding workflow where developers create tasks, run them using coding agents, review code, and continue iterating until the desired result.

**What it is NOT:**

- A code editor or IDE replacement: TapCode doesn't provide file editing capabilities at all.
- A full-featured AI coding assistant: TapCode focuses on task-based coding. It currently does not support interactive chat with AI agents (it might be added in the future).
- A cloud service: TapCode runs locally on your machine, ensuring your code and data remain private.

## Features

TapCode helps developers code effectively from smartphones by pairing them with coding agents.

- **Mobile-First Development** - Programming workflow optimized for smartphone screens. SSH terminal might be required for more complex tasks
- **Project File Browsing** - Navigate and view project files in a mobile-friendly way with code syntax highlighting
- **Task-Oriented Approach** - Easily annotate code and create coding tasks for AI agents
- **Task Execution With Coding Agents** - Currently only `Claude Code` and `OpenAI Codex` agents are supported in _non-interactive_ mode.
- **Basic GIT Operations** - View git status, diff, stage & commit changes
- **Web-Based Interface** - Review generated code from your mobile web browser, execute CLI command tasks using agents
- **Runs Locally Or In The Cloud** - Run it on your home machine -> at night -- when you dreamed of a new feature -- pick up a phone and start TapCoding. You can also program on the go if you run TapCode on a cloud VM.

---

## Install

Install TapCode globally via npm:

```bash
npm install -g tapcode

# then run by specifying the project directory
tapcode /path/to/your/project
```

Or run directly without installation using npx:

```bash
npx tapcode .
```

**Requirements:**

- Node.js >= 18

---

## Configure

### Quick Start

The server will start on `http://127.0.0.1:2025` by default.

### Configuration

Configure TapCode using environment variables:

| Variable             | Description                                          | Default     |
| -------------------- | ---------------------------------------------------- | ----------- |
| `TAPCODE_HOST`       | Network interface the server binds to                | `127.0.0.1` |
| `TAPCODE_PORT`       | Port the server listens on                           | `2025`      |
| `TAPCODE_BASIC_AUTH` | Enable HTTP Basic Auth (format: `username:password`) | disabled    |

> **Security Note**: Basic auth does not encrypt traffic. Use it only over secure networks or keep the default host name and forward via SSH tunnel.

**Example:**

```bash
export TAPCODE_HOST=0.0.0.0 # listens on all interfaces
export TAPCODE_PORT=3000
export TAPCODE_BASIC_AUTH=username:secretpassword
tapcode .
```

---

## Support

We'd love your support and contributions to make TapCode better!

### Give a Star

If you find TapCode useful, please give us a star on GitHub:

⭐ [Star TapCode on GitHub](https://github.com/gornostal/TapCode)

### Report a Bug

Found a bug? Please create an issue:

🐛 [Report Bug](https://github.com/gornostal/TapCode/issues/new)

### Start a Discussion

Have questions or ideas? Join the discussion:

💬 [GitHub Discussions](https://github.com/gornostal/TapCode/discussions)

---

## Contributing

We welcome contributions from the community!

### Code Contributions

**Bug Fixes:**

- Feel free to submit pull requests for bug fixes directly

**Features & Improvements:**

‼ Please start a **discussion** first before implementing new features. This helps ensure alignment with project goals and prevents duplicate work

---

## License

TapCode is licensed under the [Apache License 2.0](LICENSE).

---

_Made with ❤️ for developers who code in their sleep and on the go_
