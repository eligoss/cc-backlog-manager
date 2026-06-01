# Jira is Source of Truth

Principle and implementation of "Jira is source of truth" for backlog module and Jira integration using TypeScript CLI.

---

## Core Principle

**"Jira is the source of truth for all ticket metadata, IDs, names, and references."**

This means:
- Preserve exact Jira ticket IDs, names, and field values
- Don't modify or transform Jira data during import/export
- Maintain bidirectional sync integrity
- Enable Jira CSV imports to find existing tickets
- Preserve Jira relationships and dependencies

---

## What to Preserve

### 1. Jira Ticket IDs

**Format:** `PROJ-XXX` (project prefix + number)

**Where Stored:**
```yaml
# In YAML frontmatter (jira- prefix)
jira-ticketId: PROJ-1234
jira-url: "https://your-instance.atlassian.net/browse/PROJ-1234"
```

**In Filename (after export):**
```text
# Numeric part only (no project prefix)
1234-auth0-sso-configuration.md
```

**Why:**
- Jira ticket ID is immutable and unique
- Enables cross-referencing between tickets
- Allows import script to find existing tickets
- Maintains audit trail

### 2. Jira Component Names

**Format:** Exact string from Jira (including spacing and punctuation)

**Examples:**
```yaml
jira-component: "Your Component Name"
jira-component: "Team: Frontend"
jira-component: "Team: Backend"
jira-component: "Team: Full Stack"
```

**Why:**
- Component names are controlled by Jira administrators
- Preserving exact names ensures proper Jira export mapping
- Spacing quirks (e.g., extra spaces) are intentional in Jira
- Changing names breaks Jira API calls

### 3. Jira Epic Names and Links

**Format:** Exact Jira epic ID and name

**Examples:**
```yaml
jira-parent: PROJ-1171
```

**Why:**
- Epic relationships tracked by Jira ID
- Changing epic IDs breaks parent-child relationships
- Enables Jira to display epic hierarchy

### 4. Jira Sprint Names

**Format:** Exact sprint name from Jira

**Examples:**
```yaml
# In YAML frontmatter
jira-sprint: "My Project Sprint W01"
jira-sprintId: 16786
```

**Why:**
- Sprint names controlled by Jira sprint board
- Jira sprint ID required for API calls
- Enables smart lookup by name or ID

### 5. Jira Milestone Names

**Format:** Exact milestone name from Jira (often called Fix Version)

**Examples:**
```yaml
# In YAML frontmatter
jira-milestone: "My Project - February 2026 - W3 W5 W7"  # example format
framework-milestone: Feb2026  # Framework-specific milestone code (example)
```

**Why:**
- Milestone names defined in Jira Fix Versions
- Enables import script to find milestone by name
- Supports rename detection (find by ID even if name changed)

### 6. Jira Relationships

**Format:** Exact Jira ticket IDs for related, blocking, blocked-by

**Examples:**
```yaml
jira-related: [PROJ-1165, PROJ-1166]
jira-blocking: [PROJ-1167]
jira-blockedBy: [PROJ-1032]
```

**Why:**
- Jira tracks dependencies via ticket IDs
- Preserving IDs maintains dependency graph
- Enables Jira to display blockers and blocked-by tickets

---

## Why "Jira is Source of Truth"

### 1. Bidirectional Sync Integrity

**Problem without this principle:**
```text
Jira: "Team: Frontend" (exact name)
Local: "Team:Frontend" (modified)
Export: Component not found error
```

**Solution:**
```text
Jira: "Team: Frontend"
Local: "Team: Frontend" (preserved exactly)
Export: Jira API succeeds
```

### 2. Import/Export Without Data Loss

**Problem without this principle:**
```text
# First import
Jira CSV: PROJ-1234, "Implement SSO"
Local File: sso-implementation.md (no Jira ID)

# Second import (after Jira update)
Jira CSV: PROJ-1234, "Implement SSO with Auth0"
Local File: Creates duplicate file: sso-implementation-with-auth0.md
```

**Solution:**
```text
# First import
Jira CSV: PROJ-1234, "Implement SSO"
Local File: 1234-implement-sso.md (Jira ID in filename)
YAML: jira-ticketId: PROJ-1234

# Second import (after Jira update)
Jira CSV: PROJ-1234, "Implement SSO with Auth0"
Local File: Updates existing: 1234-implement-sso-with-auth0.md
YAML: jira-ticketId: PROJ-1234 (unchanged, used for lookup)
```

---

## Implementation in TypeScript CLI

### Export CLI (`jira export`)

**Command:**
```bash
agentic-framework jira export --tickets <ticket-files>
```

**What it does:**
1. Reads YAML frontmatter from ticket file
2. Uses `jira-component` field to set Jira component (exact match required)
3. Uses `jira-parent` field to set Jira epic link
4. Creates or updates Jira ticket via REST API (AUTO-DETECT mode)
5. Updates YAML with `jira-ticketId` and `jira-url` from Jira response

**AUTO-DETECT Mode:**
- If `jira-ticketId` exists → UPDATE existing Jira issue
- If `jira-ticketId` is null/missing → CREATE new Jira issue

### Import CLI (`backlog import`)

**Command:**
```bash
agentic-framework backlog import --csv <file>
```

**What it does:**
1. Reads Jira CSV export
2. Extracts exact field values (Issue key, Summary, Component, Epic Link, etc.)
3. Converts Jira wiki markup → markdown
4. Generates YAML frontmatter preserving exact Jira values
5. Creates ticket files with Jira ticket number in filename

**Smart Lookup Feature:**
- Finds existing tickets by Jira ID
- Detects renames and updates metadata
- Preserves Jira relationships

**Example CSV → YAML Mapping:**
```csv
Issue key,Summary,Component,Epic Link,Sprint,Fix versions
PROJ-1234,"Implement SSO","Team: Frontend",PROJ-1171,"Sprint W01","Feb2026"
```

**Generated YAML:**
```yaml
---
jira-ticketId: PROJ-1234
title: "Implement SSO"
jira-component: "Team: Frontend"  # Exact match
jira-parent: PROJ-1171
jira-sprint: "Sprint W01"
jira-milestone: "Feb2026"
---
```

### Pull CLI (`backlog pull`)

**Command:**
```bash
agentic-framework backlog pull --sprint "Sprint 2026-W12"
```

**What it does:**
1. Fetches ticket data from Jira via REST API
2. Creates/updates local markdown files with YAML metadata
3. Preserves Jira IDs, relationships, and field values
4. Converts Jira wiki markup → markdown

### Diff CLI (`backlog diff`)

**Command:**
```bash
agentic-framework backlog diff
```

**What it does:**
1. Compares local ticket state against Jira state
2. Shows added, modified, and conflicting tickets
3. Provides git-like output for easy review

### Push CLI (`backlog push`)

**Command:**
```bash
agentic-framework backlog push --ticket PROJ-100
```

**What it does:**
1. Reads local ticket YAML and markdown content
2. Converts markdown → Jira wiki markup
3. Updates Jira issue via REST API
4. Syncs status, fields, and description

---

## Validation Rules

### Component Validation

**Rule:** Component name must exist in Jira project

**Check via CLI:**
```bash
# Validate ticket format before export
agentic-framework backlog validate
```

**Example Errors:**
```text
Component: "Team:Frontend" (missing space)
   Expected: "Team: Frontend"

Component: "Frontend Team"
   Expected: "Team: Frontend"
```

### Ticket ID Validation

**Rule:** Jira ticket ID must match project pattern: `PROJ-[0-9]+`

**Example Errors:**
```text
jira-ticketId: "1234" (missing project prefix)
   Expected: "PROJ-1234"

jira-ticketId: "proj-1234" (lowercase)
   Expected: "PROJ-1234"
```

---

## Best Practices

### When Creating Tickets

**DO:**
- Leave `jira-ticketId`, `jira-url`, `exportedDate` as `null`
- Use exact component names from Jira
- Reference epic by Jira ID if known

**DON'T:**
- Make up Jira ticket IDs
- Modify component names
- Use placeholder values

### When Exporting to Jira

**DO:**
- Preserve component names exactly
- Use CLI validation before export
- Update YAML with exact Jira response values

**Command:**
```bash
# Dry-run validation
agentic-framework jira export --tickets <file> --dry-run
```

**DON'T:**
- Transform or clean up component names
- Modify Jira ticket IDs returned by API
- Skip updating YAML metadata

### When Importing from Jira

**DO:**
- Preserve exact field values from CSV
- Use Jira ticket ID for duplicate detection
- Store both Jira ID and Jira name (for smart lookup)

**Command:**
```bash
agentic-framework backlog import --csv <file>
```

**DON'T:**
- Transform or clean up field values
- Create duplicate tickets for existing Jira IDs
- Lose Jira relationship data

---

## Troubleshooting

### Issue: Export fails with "Component not found"

**Cause:** Component name doesn't match exactly

**Solution:**
```yaml
# Check spacing and punctuation - preserve exact Jira values
jira-component: "Team: Frontend"  # Must match Jira exactly
```

**Validate with CLI:**
```bash
agentic-framework backlog validate
```

### Issue: Import creates duplicate tickets

**Cause:** Jira ticket ID not stored in YAML or filename

**Solution:**
```yaml
# Ensure YAML has Jira ticket ID
jira-ticketId: PROJ-1234

# Ensure filename has Jira ticket number
1234-implement-sso.md
```

### Issue: Epic relationships lost after import

**Cause:** `jira-parent` field not preserved

**Solution:**
```yaml
# Ensure child stories have epic link
jira-parent: PROJ-1171
```

---

## Summary

**Key Takeaways:**
1. Jira is source of truth - preserve exact values
2. Store Jira IDs in YAML frontmatter with `jira-` prefix
3. Use Jira ticket number in filenames (after export)
4. Preserve component names exactly (spacing, punctuation)
5. Use TypeScript CLI for all Jira operations
6. Validate tickets before export using `backlog validate`
7. AUTO-DETECT mode handles CREATE vs UPDATE automatically

**TypeScript CLI Commands:**
- `agentic-framework jira export --tickets <file>` - Export to Jira
- `agentic-framework backlog import --csv <file>` - Import from Jira CSV
- `agentic-framework backlog validate` - Validate ticket format
- `agentic-framework backlog migrate-milestones` - Generate milestone overviews
- `agentic-framework backlog pull --sprint <name>` - Fetch tickets from Jira
- `agentic-framework backlog diff` - Compare local vs Jira state
- `agentic-framework backlog push --ticket <id>` - Push local changes to Jira

**Benefits:**
- Import/export without data loss
- Rename detection and smart lookup
- Jira relationship preservation
- Bidirectional sync integrity
- Audit trail and traceability
