---
id: organizing-backlog
module: backlog
name: organizing-backlog
description: Understand the backlog module architecture, CLI commands, and ticket organization workflow. Use when working with backlog module, understanding ticket lifecycle, or organizing work items using the framework's TypeScript CLI.
scope: generic
capabilities-provided:
 - organizing-backlog
 - epic-breakdown
 - sprint-planning
 - milestone-tracking
 - organizing-backlog-knowledge
 - backlog-workflow
 - ticket-lifecycle
---

# Backlog Organization

## When to Use This Skill

Use this skill when you need to:
- Understand backlog module architecture and structure
- Navigate the ticket workflow lifecycle (draft → validation → deployment)
- Learn CLI commands for backlog management
- Organize tickets using the backlog module
- Import Jira data into the backlog module
- Sync tickets with Jira using pull/diff/push workflow
- Generate milestone overviews from ticket metadata
- Work with the backlog module's ticket management system

**Agents that need this skill:**
- ai-backlog-manager (creating, organizing, and syncing tickets with Jira)

---

## Quick Start: Backlog Module Architecture

```text
framework/modules/backlog/
├── ai/
│ ├── agents/ ← Backlog management agents
│ ├── skills/ ← This skill + building-tickets
│ └── context/ ← Backlog domain knowledge
│
├── src/
│ ├── cli/ ← TypeScript CLI commands
│ │ ├── import.ts # Import Jira data
│ │ ├── validate.ts # Validate ticket format
│ │ ├── pull.ts # Fetch tickets from Jira
│ │ ├── diff.ts # Compare local vs Jira state
│ │ ├── push.ts # Push local changes to Jira
│ │ └── migrate-milestones.ts # Generate milestone overviews
│ ├── models/ ← Ticket, Epic, Milestone models
│ └── utils/ ← Parsing, validation utilities
│
└── module.json ← Module manifest
```

**Key Principle:** Backlog module uses TypeScript CLI commands (NOT Python scripts) for automation.

---

## Instructions

### 1. Understand Module-Based Ticket Organization

**Architecture:** The backlog module is self-contained with TypeScript implementation.

**Workflow Lifecycle:**
1. **Creation:** AI agent creates ticket using backlog module API
2. **Validation:** CLI validates format and YAML metadata
3. **Deployment:** Skills and capabilities available via discovery system

**TypeScript CLI Commands:**

| Command | Purpose |
|---------|---------|
| `backlog import --csv <file>` | Import Jira CSV data |
| `backlog validate` | Validate ticket format |
| `backlog migrate-milestones` | Generate milestone overviews |
| `backlog pull --sprint <name>` | Fetch tickets from Jira |
| `backlog diff` | Compare local vs Jira state |
| `backlog push --ticket <id>` | Push local changes to Jira |

**No Python Scripts:** The old v1 repo used Python (`backlog-milestone-generator.py`, `import_jira_data.py`). The new framework uses TypeScript CLI exclusively.

### 2. Follow Naming Conventions

**Format:** `[TICKET-NUMBER]-[title-kebab-case].md`

**Rules:**
- Start with Jira ticket number (e.g., `1315-`, `942-`)
- Use kebab-case for title (lowercase, hyphens)
- Remove project prefix (e.g., `PROJ-`) from number
- Strip redundant prefixes from title (project-specific prefixes, App:, etc.)
- NO milestone prefix in filename
- NO type prefix in filename (determined by YAML `type:` field)

**Examples:**
- Story: `1164-forecast-180d-lr-marker-and-timestamps.md`
- Task: `1032-migrate-to-api-v2-via-centralized-data-layer.md`
- Bug: `1315-fix-shimmer-loading-when-changing-analysis-hours.md`
- Epic: `1171-split-final-drive-to-left-right-sub-components.md`

**YAML Frontmatter:** See the `building-tickets` skill for the ticket format details.

### 3. Use TypeScript CLI for Backlog Operations

**Import Jira Data:**
```bash
# Import Jira sprint/milestone CSV export
agentic-framework backlog import --csv jira-export.csv

# Example output:
# - Creates ticket markdown files with YAML metadata
# - Preserves Jira IDs, names, and metadata
# - Organizes by type (story, task, bug, epic)
```

**Validate Tickets:**
```bash
# Validate all tickets in backlog module
agentic-framework backlog validate

# Checks:
# - YAML frontmatter format (flat structure, correct prefixes)
# - Required fields (title, type, status)
# - Markdown syntax
# - Link validity
```

**Generate Milestone Overviews:**
```bash
# Auto-generate milestone overviews from ticket metadata
agentic-framework backlog migrate-milestones

# Scans tickets for `framework-milestone:` YAML field
# Creates milestone overview files
# Updates statistics and ticket lists
```

**Pull from Jira:**
```bash
# Fetch tickets from a Jira sprint
agentic-framework backlog pull --sprint "Sprint 2026-W12"

# Fetches ticket data via Jira REST API
# Creates/updates local markdown files with YAML metadata
# Preserves Jira IDs, relationships, and field values
```

**Diff Local vs Jira:**
```bash
# Compare local tickets against Jira state
agentic-framework backlog diff

# Shows: added locally, modified locally, modified in Jira, conflicts
# Git-like output format for easy review
```

**Push to Jira:**
```bash
# Push local changes to Jira
agentic-framework backlog push --ticket PROJ-100

# Updates Jira issue with local changes
# Converts markdown back to Jira wiki markup
# Updates status, fields, and description
```

### 4. Understand YAML Frontmatter Structure

**Flat Structure with Prefixes:**
```yaml
---
# Jira metadata (jira- prefix)
jira-ticketId: PROJ-1164
jira-url: "https://your-instance.atlassian.net/browse/PROJ-1164"
jira-parent: PROJ-1171
jira-component: "Your Component Name"

# Framework metadata (framework- prefix)
framework-type: story # story, task, bug, epic
framework-status: in-progress
framework-priority: high
framework-milestone: Feb2026 # example milestone code
framework-sprint: 2026-W03

# Content metadata (no prefix)
title: Forecast 180d LR marker and timestamps
labels: [forecasting, reliability, frontend]
assignee: unassigned
---
```

**See Also:** `building-tickets` skill for complete format specification.

### 5. Apply "Jira is Source of Truth" Principle

**Principle:** Preserve full Jira names, IDs, and references exactly as they appear in Jira

**What to Preserve:**
- Full Jira ticket IDs (PROJ-XXX)
- Jira milestone names exactly as they appear
- Jira sprint names exactly as they appear
- Jira component names (e.g., "Team: Frontend")
- Jira epic names and links

**Why:**
- Maintains bidirectional sync integrity
- Enables import/export without data loss
- Preserves Jira relationships and dependencies
- Allows Jira CSV imports to find existing tickets

**Example:**
```yaml
# YAML frontmatter preserves Jira IDs
jira-ticketId: PROJ-1164
jira-url: "https://your-instance.atlassian.net/browse/PROJ-1164"
jira-parent: PROJ-1171
jira-component: "Your Component Name" # Exact Jira component name
```

---

## Common Patterns

### Pattern 1: Importing Jira Sprint

**When:** You have a Jira sprint exported as CSV and want to import it into the backlog module

```bash
# 1. Export sprint from Jira as CSV
# (done via Jira UI: Filters → Export → CSV)

# 2. Import using backlog CLI
agentic-framework backlog import --csv jira-sprint-2026-W03.csv

# 3. CLI creates:
# - Ticket markdown files with YAML metadata
# - Preserves Jira IDs and relationships
# - Organizes by framework-type field
```

### Pattern 2: Generating Milestone Overviews

**When:** You want to auto-generate milestone overview files from ticket metadata

```bash
# 1. Ensure tickets have framework-milestone field in YAML
# Example: framework-milestone: Feb2026

# 2. Run milestone migration CLI
agentic-framework backlog migrate-milestones

# 3. CLI generates:
# - Milestone overview files
# - Statistics (total tickets, by status, by type)
# - Links to all tickets in milestone
```

### Pattern 3: Validating Ticket Format

**When:** Before committing ticket changes, validate YAML format and markdown syntax

```bash
# Validate all tickets
agentic-framework backlog validate

# Fix any errors reported:
# - Invalid YAML frontmatter
# - Missing required fields
# - Broken markdown links
# - Incorrect prefix usage
```

### Pattern 4: Pushing to Jira

**When:** You have tickets ready to push to Jira

> **Deprecation Notice:** `jira export` and `jira sync` are deprecated. Use `backlog push` instead, which supports both CREATE and UPDATE modes with conflict detection.

```bash
# Push a specific ticket to Jira
agentic-framework backlog push --ticket PROJ-100

# Push all locally modified tickets
agentic-framework backlog push --all

# AUTO-DETECT mode:
# - If jira-ticketId exists → UPDATE existing Jira issue
# - If jira-ticketId is null/missing → CREATE new Jira issue
```

**See Also:** `committing-code` skill for Git operations with Jira auto-detection.

### Pattern 5: Git-Like Sync with Jira (Pull/Diff/Push)

**When:** You want to keep local tickets in sync with Jira using a git-like workflow

```bash
# 1. Pull latest from Jira
agentic-framework backlog pull --sprint "Sprint 2026-W12"

# 2. Review differences
agentic-framework backlog diff

# 3. Push local changes
agentic-framework backlog push --ticket PROJ-100
```

---

## Best Practices

### File Organization
- Use backlog module TypeScript CLI for all operations
- Assign milestone via YAML `framework-milestone:` field (not in filename)
- Organize by type using YAML `framework-type:` field
- Link epics in YAML using `jira-parent:` field
- Don't create files with milestone prefix in filename
- Don't use Python scripts (they don't exist in new framework)

### Naming Consistency
- Use Jira ticket number after export (`1164-title.md`)
- Use kebab-case for all titles
- Remove redundant prefixes (project prefix, project-specific prefixes, etc.)
- Don't include type prefix in filename (use YAML field)
- Don't change filename format from what CLI generates

### Metadata Management
- Preserve exact Jira component names
- Store Jira IDs in YAML frontmatter with `jira-` prefix
- Use `framework-` prefix for framework-specific metadata
- Use `framework-milestone:` and `framework-sprint:` fields for assignment
- Don't modify Jira IDs or names
- Don't duplicate metadata in filename

### CLI Usage
- Use TypeScript CLI commands for automation
- Run validation before commits
- Import Jira data via CLI (preserves metadata)
- Don't manually create YAML (use CLI to import)
- Don't bypass validation (errors indicate issues)

---

## Anti-Patterns to Avoid

**Using Python scripts from old framework**
- Old framework used `backlog-milestone-generator.py`, `import_jira_data.py`
- New framework uses TypeScript CLI commands exclusively

**Adding milestone prefix to filename**
- Use YAML `framework-milestone:` field instead

**Modifying Jira ticket IDs or component names**
- Jira is source of truth - preserve exactly

**Skipping validation**
- Always run `backlog validate` before committing changes

**Mixing old v1 repo patterns with new framework**
- Old repo had `backlog/` directory structure
- New framework uses self-contained backlog module

---

## See Also

### Related Skills
- [building-tickets](../building-tickets/SKILL.md) - ticket format and YAML schema
- committing-code - Git workflows with Jira auto-detection (core module skill)

### Module Documentation
- **Backlog Module Manifest:** `framework/modules/backlog/module.json`
- **CLI Commands:** `framework/cli/src/commands/backlog/`
- **Models:** `framework/modules/backlog/src/models/`

### Registry Files
- **Skills Registry:** `ai/registries/skills.json` - Skill metadata and paths
- **Discovery Map:** `ai/registries/discovery-map.json` - Capability routing

---

**Version:** 2.0 (generalized for cross-project reuse)
**Created:** 2025-12-22
**Status:** Production-Ready
