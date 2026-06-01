# Jira Sync Patterns

## Push Workflow (Local → Jira)

### AUTO-DETECT Mode

The `backlog push` command auto-detects CREATE vs UPDATE:

| Condition | Mode | API Call |
|-----------|------|----------|
| `jira-ticketId: PROJ-1234` | UPDATE | PUT `/rest/api/2/issue/PROJ-1234` |
| `jira-ticketId: null` | CREATE | POST `/rest/api/2/issue` |
| `jira-ticketId` missing | CREATE | POST `/rest/api/2/issue` |

### Push Single Ticket

```bash
# Validate first
agentic-framework backlog validate

# Push (auto-detects CREATE or UPDATE)
agentic-framework backlog push --ticket <id>

# Preview changes without pushing
agentic-framework backlog push --ticket <id> --dry-run
```

**Output (CREATE):** New Jira issue created, YAML updated with `jira-ticketId` and `jira-url`
**Output (UPDATE):** Existing issue updated, only changed fields sent

### Push Batch

```bash
# Push all locally-modified tickets
agentic-framework backlog push --all

# Push by sprint
agentic-framework backlog push --sprint "Sprint 42"

# Force push (skip conflict checks)
agentic-framework backlog push --ticket <id> --force
```

### UPDATE Mode Details

**Editable fields (readwrite):** title, description, priority, component, acceptance criteria, jira-parent, jira-assignee, labels, jira-fixVersion, jira-sprint
**Create-only fields (createOnly):** documentType, jira-project, jira-reporter — sent on CREATE, skipped on UPDATE
**Read-only fields (readonly):** jira-ticketId, jira-status, jira-created, jira-updated — never written via field API

Only changed fields are sent to Jira (partial update).

---

## Push Sprint Workflow (Sprint File → Jira)

Reads a local sprint file (markdown with YAML frontmatter listing ticket keys) and assigns all listed tickets to that sprint in Jira. Sprint must already exist in Jira.

```bash
# Push sprint assignment
agentic-framework backlog push-sprint -s <sprint-name>

# Dry-run to preview which tickets would be added/removed
agentic-framework backlog push-sprint -s <sprint-name> --dry-run

# Specify sprint file explicitly
agentic-framework backlog push-sprint -s <sprint-name> -f backlog/sprints/sprint-42.md
```

**Output:** Tickets added to sprint in Jira; summary shows added/removed/unchanged counts.

---

## Push Version Workflow (Milestone File → Jira)

Reads a local milestone file and sets `fixVersions` on all listed tickets in Jira. Version must already exist in Jira.

```bash
# Push fixVersion to all tickets in milestone
agentic-framework backlog push-version -m <milestone-name>

# Dry-run to preview
agentic-framework backlog push-version -m <milestone-name> --dry-run

# Specify milestone file explicitly
agentic-framework backlog push-version -m <milestone-name> -f backlog/milestones/Feb2026.md
```

**Output:** `jira-fixVersion` set on each ticket in Jira; summary shows pushed/error counts.

---

## Pull Workflow (Jira → Local)

```bash
# Pull specific ticket
agentic-framework backlog pull --ticket PROJ-1234

# Pull sprint tickets
agentic-framework backlog pull --sprint "Sprint 42"

# Pull by fix version
agentic-framework backlog pull --version "Release 2.0"

# Preview without writing files
agentic-framework backlog pull --ticket PROJ-1234 --dry-run
```

**Output:** Local markdown files created/updated with YAML metadata and converted content.

---

## Diff Workflow (Compare Local vs Jira)

```bash
# Compare all tracked tickets
agentic-framework backlog diff

# Compare specific ticket
agentic-framework backlog diff --ticket PROJ-1234

# Filter by sprint
agentic-framework backlog diff --sprint "Sprint 42"
```

**Status indicators:**
- **IN_SYNC** (gray) — local and Jira match
- **REMOTE_NEWER** (yellow) — Jira has newer changes
- **LOCAL_NEWER** (green) — local file is newer
- **CONFLICT** (red) — both sides changed
- **LOCAL_ONLY** (blue) — no Jira ticket yet

---

## Import Workflow (Jira CSV → Local)

For bulk import from Jira CSV exports:

```bash
# Export sprint/milestone as CSV from Jira UI, then:
agentic-framework backlog import <csv-file>

# Skip existing files
agentic-framework backlog import <csv-file> --skip

# Preview without writing
agentic-framework backlog import <csv-file> --dry-run
```

**Generated output:**

```plaintext
backlog/
├── tickets/      # All ticket types
├── epics/        # Epic files
├── sprints/      # Sprint indexes (auto-generated)
└── milestones/   # Milestone indexes (auto-generated)
```

---

## Common Patterns

### Pattern 1: New Ticket → Jira

1. Create ticket: agent or `backlog create-ticket`
2. Validate: `backlog validate`
3. Push: `backlog push --ticket <id>`
4. Result: Jira ticket created, YAML updated

### Pattern 2: Update Existing Ticket

1. Edit local markdown (change content, priority, etc.)
2. Push: `backlog push --ticket <id>` (auto-detects UPDATE)
3. Result: Jira ticket updated, only changed fields sent

### Pattern 3: Sprint Import

1. Export sprint CSV from Jira UI
2. Import: `backlog import <csv-file>`
3. Result: Markdown tickets created with Jira metadata

### Pattern 4: Bidirectional Sync

1. Pull latest: `backlog pull --sprint <name>`
2. Check status: `backlog diff`
3. Edit locally
4. Push changes: `backlog push --all`

### Pattern 5: Assign Tickets to Sprint in Jira

1. Ensure sprint file exists locally (e.g., `backlog/sprints/sprint-42.md`) with ticket keys listed
2. Push sprint: `backlog push-sprint -s Sprint-42`
3. Result: All listed tickets assigned to that sprint in Jira; local `jira-sprint` field updated on pull

### Pattern 6: Set Fix Version on Tickets in Jira

1. Ensure milestone file exists locally (e.g., `backlog/milestones/Feb2026.md`) with ticket keys listed
2. Push version: `backlog push-version -m Feb2026`
3. Result: All listed tickets get `fixVersions` set in Jira; local `jira-fixVersion` field updated on pull

---

## Troubleshooting

**401 Unauthorized:**
- Check `.env` for valid `JIRA_EMAIL` and `JIRA_API_TOKEN`
- Verify API token hasn't expired
- Regenerate at: https://id.atlassian.com/manage-profile/security/api-tokens

**403 Forbidden:**
- Check user permissions in project
- Verify custom fields are accessible

**404 Issue Not Found:**
- Verify issue key format (e.g., PROJ-1234)
- If ticket was deleted in Jira, set `jira-ticketId` to null and re-push to create new

**Component Not Found:**
- `jira-component` field must match Jira exactly (spacing, punctuation)

**Rate Limited (429):**
- CLI handles rate limiting with exponential backoff
- Reduce batch size if needed

**Import Creates Duplicates:**
- Ensure CSV includes Issue key column
- Import CLI uses it for deduplication

---

**Version:** 1.0
**Created:** 2026-03-31
