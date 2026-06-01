---
command: cmd-backlog-push
cli-command: backlog push
module: backlog
type: sync
description: Push local ticket changes to Jira
skill: organizing-backlog
---

# backlog push

Push local ticket changes to Jira. Creates new issues or updates existing ones.

## Usage

```bash
agentic-framework backlog push [options]
```

## Options

| Option | Description |
|--------|-------------|
| `--ticket <id...>` | Push specific ticket(s) by Jira ID |
| `--all` | Push all locally-changed tickets |
| `--sprint <name>` | Push all locally-changed tickets in a specific sprint |
| `--force` | Force push even if conflicts exist |
| `--dry-run` | Preview changes without pushing |
| `-v, --verbose` | Show detailed progress |
| `-p, --path <path>` | Base path to backlog directory (default: `.`) |
| `--env <path>` | Path to .env file (overrides config) |

## Prerequisites

Requires `backlog.config.json` with `jiraProject` and `jiraBaseUrl`.

## Examples

```bash
# Push a specific ticket
agentic-framework backlog push --ticket PROJ-100

# Push all changed tickets
agentic-framework backlog push --all

# Push all changed tickets in a sprint
agentic-framework backlog push --sprint "Sprint 2026-W12"

# Force push with conflicts
agentic-framework backlog push --ticket PROJ-100 --force
```
