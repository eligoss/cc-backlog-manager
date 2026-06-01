---
command: cmd-backlog-pull
cli-command: backlog pull
module: backlog
type: sync
description: Pull tickets from Jira to local backlog files
skill: organizing-backlog
---

# backlog pull

Pull tickets from Jira REST API and create/update local markdown files.

## Usage

```bash
agentic-framework backlog pull [options]
```

## Options

| Option | Description |
|--------|-------------|
| `--ticket <id>` | Pull a specific ticket by Jira ID |
| `--sprint <name>` | Pull tickets from a specific sprint |
| `--version <name>` | Pull tickets from a specific fix version |
| `--dry-run` | Preview changes without writing files |
| `-v, --verbose` | Show detailed progress |
| `-p, --path <path>` | Base path to backlog directory (default: `.`) |
| `--env <path>` | Path to .env file (overrides config) |

## Prerequisites

Requires `backlog.config.json` with `jiraProject` and `jiraBaseUrl`.

## Examples

```bash
# Refresh all existing local tickets
agentic-framework backlog pull

# Pull a specific ticket
agentic-framework backlog pull --ticket PROJ-100

# Pull a specific sprint
agentic-framework backlog pull --sprint "Sprint 2026-W12"

# Pull by version
agentic-framework backlog pull --version "Mar2026"
```
