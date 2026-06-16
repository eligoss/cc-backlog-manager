---
id: syncing-with-jira
module: backlog
name: syncing-with-jira
description: Sync backlog tickets with Jira using backlog CLI commands (pull/diff/push). Use when syncing tickets to/from Jira, troubleshooting Jira integration, or understanding field mappings.
scope: generic
capabilities-provided:
 - jira-sync
 - markdown-jira-conversion
---

# Syncing with Jira

## When to Use This Skill

You need to sync local markdown tickets with Jira:

- **PUSH:** Send local tickets to Jira (CREATE or UPDATE, auto-detected)
- **PULL:** Fetch Jira tickets into local markdown
- **DIFF:** Compare local vs Jira state
- **IMPORT:** Bulk import from Jira CSV export
- **Troubleshoot:** Jira sync failures or API issues

---

## Quick Start

### Push Local Tickets to Jira

```bash
# Validate first
agentic-framework backlog validate

# Push to Jira (auto-detects CREATE vs UPDATE based on jira-ticketId)
agentic-framework backlog push --ticket <id>

# Dry-run to preview
agentic-framework backlog push --ticket <id> --dry-run

# Push all modified tickets
agentic-framework backlog push --all

# Push by sprint
agentic-framework backlog push --sprint <name>
```

**AUTO-DETECT Mode:**
- `jira-ticketId: null` or missing → CREATE new Jira issue
- `jira-ticketId: PROJ-1234` → UPDATE existing Jira issue

### Push Sprint Assignment to Jira

Syncs a sprint file with Jira: adds tickets listed locally but missing from the Jira sprint, and **removes** tickets present in Jira but not in the local file (moves them to backlog). This is a full sync — the local file is the source of truth.

```bash
# Push sprint assignment (reads sprint file, assigns tickets to sprint in Jira)
agentic-framework backlog push-sprint -s <sprint-name>

# Dry-run to preview
agentic-framework backlog push-sprint -s <sprint-name> --dry-run

# Specify sprint file explicitly
agentic-framework backlog push-sprint -s <sprint-name> -f <path/to/sprint-file.md>
```

### Push Fix Version to Jira

Reads a milestone file and sets fixVersion on all listed tickets in Jira.

```bash
# Push fixVersion (reads milestone file, sets fixVersion on tickets in Jira)
agentic-framework backlog push-version -m <milestone-name>

# Dry-run to preview
agentic-framework backlog push-version -m <milestone-name> --dry-run

# Specify milestone file explicitly
agentic-framework backlog push-version -m <milestone-name> -f <path/to/milestone-file.md>
```

### Pull Jira Tickets to Local

```bash
# Pull specific ticket
agentic-framework backlog pull --ticket <id>

# Pull by sprint
agentic-framework backlog pull --sprint <name>

# Pull by fix version
agentic-framework backlog pull --version <name>
```

### Compare Local vs Jira

```bash
# Diff all tickets
agentic-framework backlog diff

# Diff specific ticket
agentic-framework backlog diff --ticket <id>
```

**Statuses:** IN_SYNC, REMOTE_NEWER, LOCAL_NEWER, CONFLICT, LOCAL_ONLY

### Import from Jira CSV

```bash
# Export sprint/milestone as CSV from Jira UI, then:
agentic-framework backlog import <csv-file>
```

---

## Authentication

Requires `backlog.config.json` in the project root and a `.env` file:

**backlog.config.json:**
```json
{
 "jiraProject": "PROJ",
 "jiraBaseUrl": "https://your-instance.atlassian.net",
 "envFile": ".env"
}
```

**.env:**
```
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
```

Generate API tokens at: https://id.atlassian.com/manage-profile/security/api-tokens

---

## Detailed Patterns

See supporting docs:
- [FIELD-MAPPINGS.md](FIELD-MAPPINGS.md) — YAML field mappings, custom fields, markup conversion
- [PATTERNS.md](PATTERNS.md) — Detailed workflows, AUTO-DETECT logic, troubleshooting

## Related Skills
- [organizing-backlog](../organizing-backlog/SKILL.md) — Backlog module architecture and CLI
- [building-tickets](../building-tickets/SKILL.md) — YAML format and validation

---

**Version:** 1.0
**Created:** 2026-03-31
**Replaces:** `integrating-jira` (jira module, now deleted)
