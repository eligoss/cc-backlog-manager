# Workflow Pipeline

Step-by-step guide for ticket lifecycle in the backlog module using TypeScript CLI.

---

## Overview

The backlog module uses a simplified workflow for ticket management:

```text
Creation → Validation → Export to Jira → Import from Jira → Pull/Diff/Push Sync
```

**Key Differences from Old Framework:**

- **TypeScript CLI** commands (not Python scripts)
- **Module-based** architecture (not backlog/ directory)
- **YAML frontmatter** with flat structure (jira- and framework- prefixes)
- **AUTO-DETECT mode** for Jira export (CREATE vs UPDATE)
- **Git-like sync** via pull/diff/push commands

---

## Stage 1: Creation

**Agent:** ai-backlog-manager

**Method:** Create ticket using backlog module API

### Steps

1. **Create ticket with YAML frontmatter**

   ```yaml
   ---
   # Framework metadata (framework- prefix)
   framework-type: story # story, task, bug, epic, spike
   framework-status: draft
   framework-priority: high
   framework-milestone: Feb2026 # example milestone code

   # Jira metadata (jira- prefix, null until export)
   jira-ticketId: null
   jira-url: null
   jira-component: "Team: Frontend"
   jira-parent: null

   # Content metadata (no prefix)
   title: "Auth0 SSO Configuration"
   labels: [auth, frontend, feature]
   assignee: unassigned
   ---
   ```

1. **Write ticket content**

   - Use native markdown (NOT Jira markup)
   - Follow the ticket format (see `building-tickets` skill)
   - Include all required sections

1. **Self-verification**

   - Check against Definition of Ready
   - Validate YAML frontmatter
   - Ensure completeness

---

## Stage 2: Validation

**CLI Command:**

```bash
agentic-framework backlog validate
```

**What it checks:**

- YAML frontmatter format (flat structure, correct prefixes)
- Required fields (title, type, status)
- Markdown syntax
- Link validity
- Component names match Jira

**Example Output:**

```text
Validating tickets...
  1164-forecast-180d-lr-marker-and-timestamps.md
  1234-invalid-ticket.md
    - Missing framework-type field
    - Invalid jira-component name

1 valid, 1 invalid
```

---

## Stage 3: Push to Jira

> **Note:** `jira export` is deprecated. Use `backlog push` instead.

**CLI Command:**

```bash
# Push a single ticket to Jira
agentic-framework backlog push --ticket PROJ-100

# Push all locally modified tickets
agentic-framework backlog push --all

# Dry-run validation (no actual push)
agentic-framework backlog push --ticket PROJ-100 --dry-run
```

**AUTO-DETECT Mode:**

- **If `jira-ticketId` exists** → UPDATE existing Jira issue
- **If `jira-ticketId` is null/missing** → CREATE new Jira issue

### Stage 3 Steps

1. **Read ticket**

   - Parse YAML frontmatter
   - Parse markdown content

1. **Convert markdown → Jira wiki markup**

   - Native markdown → Jira syntax
   - Preserve formatting and structure

1. **Call Jira REST API**

   - CREATE new issue OR UPDATE existing issue (auto-detected)
   - Set fields from YAML metadata
   - Receive Jira ticket ID (PROJ-XXX)

1. **Update YAML metadata**

   ```yaml
   jira-ticketId: PROJ-1234
   jira-url: "https://your-instance.atlassian.net/browse/PROJ-1234"
   exportedDate: 2025-12-22
   ```

**Example:**

```bash
# Before export
YAML: jira-ticketId: null

# After export (CREATE mode)
YAML: jira-ticketId: PROJ-1234
```

---

## Stage 4: Import from Jira CSV

**CLI Command:**

```bash
# Import Jira CSV export
agentic-framework backlog import --csv <file>
```

### Stage 4 Steps

1. **Export from Jira**

   - Use Jira CSV export feature
   - Save CSV file

1. **Run import CLI**

   - Parses CSV (columns: Issue key, Summary, Issue Type, Status, etc.)
   - Converts Jira wiki markup → markdown
   - Generates YAML frontmatter with Jira metadata
   - Creates ticket files with Jira ticket number in filename

1. **Output:**

   - Ticket files created with YAML metadata
   - Jira IDs, names, and metadata preserved exactly

**Example CSV → YAML:**

```csv
Issue key,Summary,Component,Epic Link
PROJ-1234,"Implement SSO","Team: Frontend",PROJ-1171
```

**Generated YAML:**

```yaml
---
jira-ticketId: PROJ-1234
title: "Implement SSO"
jira-component: "Team: Frontend" # Exact match
jira-parent: PROJ-1171
framework-type: story
---
```

---

## Stage 5: Milestone Generation

**CLI Command:**

```bash
# Auto-generate milestone overviews from ticket metadata
agentic-framework backlog migrate-milestones
```

### Stage 5 Steps

1. **Scan tickets**

   - Read `framework-milestone:` field from all ticket YAML
   - Group tickets by milestone code

1. **Generate milestone files**

   - Create overview with ticket list
   - Include statistics (ticket counts, story points)

**Example Output:**

```text
Generating milestones...
  Feb2026.md (4 tickets, 15 story points)
  Mar2026.md (2 tickets, 8 story points)

2 milestones generated
```

---

## Stage 6: Pull from Jira

**CLI Command:**

```bash
# Fetch tickets from a Jira sprint
agentic-framework backlog pull --sprint "Sprint 2026-W12"
```

### Stage 6 Steps

1. **Query Jira REST API**

   - Fetch tickets matching the sprint filter
   - Retrieve all fields, relationships, and descriptions

1. **Create/update local files**

   - Convert Jira wiki markup → markdown
   - Generate YAML frontmatter with exact Jira values
   - Create new files or update existing ones (matched by `jira-ticketId`)

1. **Output:**

   - New tickets created as markdown files
   - Existing tickets updated with Jira changes
   - Summary of created/updated/unchanged tickets

**Example Output:**

```text
Pulling from Jira...
  Created: 1400-new-feature-from-jira.md
  Updated: 1234-auth0-sso-configuration.md (status changed)
  Unchanged: 1235-implement-caching.md

3 tickets synced (1 created, 1 updated, 1 unchanged)
```

---

## Stage 7: Diff Local vs Jira

**CLI Command:**

```bash
# Compare local tickets against Jira state
agentic-framework backlog diff
```

### Stage 7 Steps

1. **Read local ticket state**

   - Parse YAML frontmatter and markdown content
   - Build local state snapshot

1. **Fetch Jira state**

   - Query Jira REST API for matching tickets
   - Build Jira state snapshot

1. **Compare and report**

   - Identify local-only changes
   - Identify Jira-only changes
   - Detect conflicts (both sides changed)

**Example Output:**

```text
Comparing local vs Jira...

Modified locally:
  PROJ-1234 auth0-sso-configuration
    ~ framework-status: draft → in-progress
    ~ description: acceptance criteria updated

Modified in Jira:
  PROJ-1235 implement-caching
    ~ assignee: unassigned → john.doe

No conflicts detected.
1 ticket modified locally, 1 modified in Jira
```

---

## Stage 8: Push to Jira

**CLI Command:**

```bash
# Push a specific ticket
agentic-framework backlog push --ticket PROJ-100

# Push all locally modified tickets
agentic-framework backlog push --all
```

### Stage 8 Steps

1. **Read local ticket**

   - Parse YAML frontmatter and markdown content

1. **Convert markdown → Jira wiki markup**

   - Native markdown → Jira syntax
   - Preserve formatting and structure

1. **Update Jira via REST API**

   - Set fields from YAML metadata
   - Update description with converted content
   - Sync status transitions

1. **Update local YAML metadata**

   - Update `exportedDate` with push timestamp

**Example Output:**

```text
Pushing to Jira...
  PROJ-1234: Updated (status, description)

1 ticket pushed successfully
```

---

## Workflow Decision Tree

```text
START
  │
  ├─ Creating new ticket?
  │   └─> Create with YAML metadata, validate with CLI
  │
  ├─ Exporting to Jira?
  │   └─> Run jira export CLI (auto-detects CREATE vs UPDATE)
  │
  ├─ Importing from Jira?
  │   └─> Run backlog import CLI (parses CSV, creates tickets)
  │
  ├─ Syncing with Jira (ongoing)?
  │   └─> Pull → Diff → Push (git-like workflow)
  │
  ├─ Generating milestone overview?
  │   └─> Run backlog migrate-milestones CLI
  │
  └─ Validating tickets?
      └─> Run backlog validate CLI
```

---

## CLI Commands Summary

| Command | Purpose | Example |
|---------|---------|---------|
| `backlog validate` | Validate ticket format | `agentic-framework backlog validate` |
| `backlog import` | Import Jira CSV | `agentic-framework backlog import --csv <file>` |
| `backlog migrate-milestones` | Generate milestone overviews | `agentic-framework backlog migrate-milestones` |
| `backlog pull` | Fetch tickets from Jira | `agentic-framework backlog pull --sprint "Sprint 2026-W12"` |
| `backlog diff` | Compare local vs Jira state | `agentic-framework backlog diff` |
| `backlog push` | Push local changes to Jira | `agentic-framework backlog push --ticket PROJ-100` |
| `jira export` (deprecated) | Export to Jira (use `backlog push` instead) | `agentic-framework jira export --tickets <file>` |

---

## Best Practices

### During Creation

- Use native markdown (NOT Jira markup)
- Complete all YAML fields (except jira-* fields)
- Validate with CLI before committing
- Don't skip sections or leave placeholders

### During Push

- Use dry-run mode to preview what would be pushed
- Check Jira ticket created/updated successfully
- Verify YAML metadata updated
- Don't bypass validation

**Dry-run example:**

```bash
# Dry-run to preview what would be pushed
agentic-framework backlog push --all --dry-run
```

### After Export

- Verify `jira-ticketId` and `jira-url` fields updated
- Check Jira URL works
- Confirm ticket searchable in Jira
- Don't manually edit `jira-ticketId` field

### During Pull/Diff/Push Sync

- Always pull before making local changes to minimize conflicts
- Use diff to review changes before pushing
- Push specific tickets when possible (vs push all)
- Resolve conflicts manually when both sides changed

---

## Troubleshooting

**Issue:** Export fails (API error)

- **Solution:** Check Jira credentials, network connectivity, validate ticket format

**Issue:** YAML metadata not updated after export

- **Solution:** Check CLI output for errors, verify file permissions

**Issue:** Milestone file not generated

- **Solution:** Check tickets have `framework-milestone:` YAML field, re-run CLI

**Issue:** Validation fails

- **Solution:** Read CLI error output, fix YAML frontmatter issues

**Issue:** Pull creates duplicates

- **Solution:** Ensure existing tickets have `jira-ticketId` in YAML for matching

**Issue:** Diff shows unexpected conflicts

- **Solution:** Pull latest first, then re-run diff to get clean comparison

---

## See Also

- **Ticket Format:** [building-tickets](../building-tickets/SKILL.md) - YAML structure
- **Jira Integration:** [JIRA-SOURCE-OF-TRUTH.md](JIRA-SOURCE-OF-TRUTH.md) - Jira integration principles
- **Naming:** [NAMING-CONVENTIONS.md](NAMING-CONVENTIONS.md) - File naming rules
- **Module CLI:** Backlog and Jira module TypeScript CLI commands

---

**Note:** This workflow uses TypeScript CLI commands exclusively. Python scripts from old framework (export_to_jira.py, import_jira_data.py) do NOT exist in the new framework.
