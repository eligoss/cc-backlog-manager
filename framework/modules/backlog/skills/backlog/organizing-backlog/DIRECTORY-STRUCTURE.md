# Backlog Module Structure

Complete reference for backlog module organization and architecture.

---

## Module Top-Level Structure

```text
framework/modules/backlog/
├── agents/ # Backlog management agents
│ ├── ai-backlog-manager.md
│
├── skills/backlog/ # Skills (this skill + building-tickets)
│ ├── organizing-backlog/
│ └── building-tickets/
│
├── commands/ # Slash command definitions
│ ├── cmd-backlog-create-ticket.md
│ ├── cmd-backlog-validate.md
│ ├── cmd-backlog-import.md
│ ├── cmd-backlog-pull.md
│ ├── cmd-backlog-diff.md
│ ├── cmd-backlog-push.md
│ └── cmd-backlog-migrate-milestones.md
│
├── src/
│ ├── cli/ # TypeScript CLI commands
│ │ ├── import.ts # Import Jira data
│ │ ├── validate.ts # Validate ticket format
│ │ ├── pull.ts # Fetch tickets from Jira
│ │ ├── diff.ts # Compare local vs Jira state
│ │ ├── push.ts # Push local changes to Jira
│ │ ├── migrate-milestones.ts # Generate milestone overviews
│ │ └── update-fields.ts # Update ticket metadata
│ │
│ ├── models/ # Ticket, Epic, Milestone models
│ │ ├── Ticket.ts
│ │ ├── Epic.ts
│ │ └── Milestone.ts
│ │
│ └── utils/ # Parsing, validation utilities
│ ├── yaml-parser.ts
│ ├── validator.ts
│ └── markdown-converter.ts
│
└── module.json # Module manifest
```

---

## Key Architecture Principles

### 1. Self-Contained Module

**No External Directory Dependencies:**
- Ticket files are stored in the project's backlog directory (default: `./backlog/`), configured via `backlog.config.json`
- All logic in `framework/modules/backlog/`
- TypeScript implementation in `src/`
- CLI commands for automation

### 2. TypeScript CLI Commands

**Available Commands:**
```bash
agentic-framework backlog import --csv <file>
agentic-framework backlog validate
agentic-framework backlog migrate-milestones
agentic-framework backlog update-fields
agentic-framework backlog pull --sprint <name>
agentic-framework backlog diff
agentic-framework backlog push --ticket <id>
```

**No Python Scripts:**
- `backlog-milestone-generator.py` (doesn't exist)
- `import_jira_data.py` (doesn't exist)
- TypeScript CLI equivalents implemented

### 3. YAML Frontmatter Structure

**Flat Structure with Prefixes:**
```yaml
---
# Jira metadata (jira- prefix)
jira-ticketId: PROJ-1234
jira-url: "https://your-instance.atlassian.net/browse/PROJ-1234"
component: "Team: Frontend"
jira-parent: PROJ-1171

# Framework metadata (framework- prefix)
documentType: story # story, task, bug, epic, spike
framework-status: in-progress
framework-priority: high
milestone: Feb2026 # example milestone code

# Content metadata (no prefix)
title: "Ticket title"
labels: [label1, label2]
assignee: unassigned
---
```

---

## File Storage Patterns

### Ticket Files

**Location:** Managed by backlog module (not in project backlog/ directory)

**Naming:**
- Before Jira export: Can vary (created by agents)
- After Jira export: `[NUMBER]-[title-kebab-case].md`

**Example:**
```text
1164-forecast-180d-lr-marker-and-timestamps.md
```

**YAML Metadata:**
- Type assignment: `documentType:` field (story, task, bug, epic)
- Milestone assignment: `milestone:` field (e.g., Feb2026, Mar2026)
- Jira integration: `jira-ticketId`, `jira-url`, `component`, etc.

### Milestone Files

**Auto-Generated:** Via `backlog migrate-milestones` CLI

**Format:**
```yaml
---
milestone: Feb2026 # example milestone code
jira-milestone: "My Project - February 2026 - W3 W5 W7" # example Jira milestone name
generatedDate: 2025-12-22
totalTickets: 4
totalStoryPoints: 15
---

# Milestone: Feb2026

## Stories (2 tickets, 10 points)
- PROJ-1164 (5 pts): Forecast (+180d), L/R marker, and timestamps
- PROJ-1166 (5 pts): Final drive divisions support

## Tasks (1 ticket, 3 points)
- PROJ-1032 (3 pts): Migrate to API v2

## Total: 4 tickets, 15 story points
```

---

## CLI Commands Reference

| CLI Command | Source Code | Purpose |
|-------------|-------------|---------|
| `backlog import` | `src/cli/import.ts` | Import Jira CSV export |
| `backlog validate` | `src/cli/validate.ts` | Validate ticket format and YAML |
| `backlog migrate-milestones` | `src/cli/migrate-milestones.ts` | Generate milestone overviews |
| `backlog update-fields` | `src/cli/update-fields.ts` | Batch update ticket metadata |
| `backlog pull` | `src/cli/pull.ts` | Fetch tickets from Jira |
| `backlog diff` | `src/cli/diff.ts` | Compare local vs Jira state |
| `backlog push` | `src/cli/push.ts` | Push local changes to Jira |

---

## Integration with Jira Module

**Jira Sync:**
```bash
agentic-framework backlog push
```

- **AUTO-DETECT mode:** Creates new OR updates existing Jira issues
- **Source:** Backlog module (`framework/modules/backlog/`)
- **Coordination:** Backlog module creates tickets and pushes them to Jira

**Git-Like Sync:**

```bash
agentic-framework backlog pull --sprint "Sprint 2026-W12"
agentic-framework backlog diff
agentic-framework backlog push --ticket PROJ-100
```

- **Pull:** Fetches tickets from Jira REST API
- **Diff:** Compares local state vs Jira state
- **Push:** Pushes local changes to Jira

**Workflow:**
1. Backlog module creates tickets with YAML metadata
2. Jira module exports to Jira (AUTO-DETECT CREATE vs UPDATE)
3. Backlog module syncs with Jira via pull/diff/push
4. Backlog module generates milestone overviews

---

## Comparison with Old Framework

| Aspect | Old v1 Repo | New v1.0 Framework |
|--------|-------------|---------------------|
| **Directory** | `backlog/` in project root | Module in `framework/modules/backlog/` |
| **Automation** | Python scripts | TypeScript CLI commands |
| **Workflow** | draft/ → ready-to-export/ → permanent/ | Simplified: creation → validation → export |
| **Sync** | CSV import only | Pull/diff/push + CSV import |
| **Organization** | tickets/stories/, tickets/tasks/, etc. | Managed by module (flexible) |
| **Metadata** | Various YAML formats | Flat structure with prefixes |

---

## See Also

- **Module Manifest:** `framework/modules/backlog/module.json` - Module capabilities and CLI commands
- **Ticket Format:** [building-tickets](../building-tickets/SKILL.md) - YAML structure
- **CLI Source:** `framework/cli/src/commands/backlog/` - TypeScript implementation
- **Jira Integration:** [syncing-with-jira](../syncing-with-jira/SKILL.md) - Jira sync workflow

---

**Note:** Ticket files are stored in the project's backlog directory (default: `./backlog/`), configured via `backlog.config.json`. All module logic is implemented in TypeScript and accessed via CLI commands.
