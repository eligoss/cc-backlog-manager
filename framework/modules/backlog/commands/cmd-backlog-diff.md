---
command: cmd-backlog-diff
cli-command: backlog diff
module: backlog
type: validate
description: Compare local tickets against Jira remote state
skill: organizing-backlog
---

# backlog diff

Compare local ticket state against Jira remote state.

## Usage

```bash
agentic-framework backlog diff [options]
```

## Options

| Option | Description |
|--------|-------------|
| `--ticket <id>` | Diff a specific ticket by Jira ID |
| `--sprint <name>` | Diff tickets in a specific sprint |
| `--version <name>` | Diff tickets in a specific version |
| `-p, --path <path>` | Base path to backlog directory (default: `.`) |
| `--env <path>` | Path to .env file (overrides config) |

## Prerequisites

Requires `backlog.config.json` with `jiraProject` and `jiraBaseUrl`.

## Examples

```bash
# Diff all local tickets
agentic-framework backlog diff

# Diff a specific ticket
agentic-framework backlog diff --ticket PROJ-100

# Diff tickets in a version
agentic-framework backlog diff --version "Mar2026"
```
