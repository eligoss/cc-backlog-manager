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

**Editable fields:** title, description, priority, component, acceptance criteria
**Immutable fields:** jira-ticketId, framework-type, project, issuetype

Only changed fields are sent to Jira (partial update).

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
