# Jira Field Mappings & Markup Conversion

## YAML ↔ Jira Field Mappings

### Key Fields

```yaml
---
documentType: story          # story, task, bug, epic, spike
title: "Ticket title"
jira-ticketId: null          # null → CREATE, "PROJ-1234" → UPDATE
jira-url: null               # Auto-populated after push
jira-component: "Component"  # Must match Jira exactly (spacing, punctuation)
jira-parent: null            # Epic link (e.g., "PROJ-1000")
priority: P1                 # P0, P1, P2, P3
labels: ["my-project"]       # Jira labels (no jira- prefix)
---
```

> **Note:** `jira-fixVersion` and `jira-sprint` are fields on sprint/milestone index files, NOT on per-ticket files. They are managed via `backlog push-version` and `backlog push-sprint` commands.

### Field Modes (write behavior)

| Field | Mode | Notes |
|-------|------|-------|
| title | readwrite | Maps to Jira "Summary" |
| description | readwrite | Body content |
| priority | readwrite | Maps to Jira priority |
| jira-component | readwrite | Must match Jira exactly |
| jira-parent | readwrite | Epic/parent link |
| jira-assignee | readwrite | Maps to Jira assignee email (used by pull/push; import uses `assignee` with display name) |
| labels | readwrite | Maps to Jira labels array |
| jira-fixVersion | readwrite | Pushed via `push-version` command |
| jira-sprint | readwrite | Pushed via `push-sprint` command |
| Acceptance Criteria | readwrite | Extracted from markdown section |
| jira-ticketId | readonly | Set by Jira on create; never updated via field API |
| jira-status | readonly | Requires transitions API |
| jira-created | readonly | Set by Jira server |
| jira-updated | readonly | Set by Jira server |
| documentType | createOnly | Cannot change issue type after creation |
| jira-project | createOnly | Cannot change project after creation |
| jira-reporter | createOnly | Jira Cloud rejects reporter updates for most users |

### CSV Import Column Mapping

```plaintext
Issue key        → jira-ticketId
Summary          → title
Issue Type       → documentType
Priority         → priority  (mapped: High → P1, Medium → P2, etc.)
Status           → status (used for index files only, not per-ticket frontmatter)
Assignee         → assignee  (display name, no jira- prefix)
Custom field     → storyPoints
Labels           → labels  (no jira- prefix)
Epic Link        → jira-parent
Created          → createdDate
Updated          → updatedDate
Description      → Body content (converted to markdown)
```

> **Lean import:** Only fields with values are written. Null/empty fields are omitted.

### Acceptance Criteria Extraction

Markdown `## Acceptance Criteria` section with checkbox items:
```markdown
## Acceptance Criteria

- [ ] User can log in with email
- [ ] Session persists for 24 hours
```

Becomes Jira array stored in custom field (e.g., `customfield_13608`).

---

## Markup Conversion: Markdown ↔ Jira Wiki

### Markdown → Jira Wiki Markup

| Markdown | Jira Markup | Notes |
|----------|-------------|-------|
| `# Heading 1` | `h1. Heading 1` | Top-level header |
| `## Heading 2` | `h2. Heading 2` | Section header |
| `**bold**` | `*bold*` | Bold emphasis |
| `*italic*` | `_italic_` | Italic emphasis |
| `- List item` | `* List item` | Unordered list |
| `  - Nested` | `** Nested` | Nested bullet |
| `1. Ordered` | `# Ordered` | Ordered list |
| `[Text](url)` | `[Text\|url]` | Hyperlink |
| `` `code` `` | `{{code}}` | Inline code |
| ` ```lang ``` ` | `{code:lang}...{code}` | Code block |
| `> Quote` | `{quote}...{quote}` | Block quote |
| `---` | `----` | Horizontal rule |

### Jira Wiki Markup → Markdown

Reverse of above. Key differences to watch:
- Jira uses `*bold*` (1 asterisk), Markdown uses `**bold**` (2 asterisks)
- Jira links use pipe `|`, Markdown uses parentheses `()`
- Nested lists in Jira use `**` for second level, Markdown uses indentation
- Smart-links require exact issue key format (e.g., `PROJ-123`)

---

## Jira Configuration Reference

### Issue Types
Epic, Story, Task, Sub-task, Bug, Spike

### Custom Fields (Project-Specific)

Configure in `backlog.config.json`. Common examples:
- **Story Points:** `customfield_10016`
- **Epic Link:** `customfield_10014`
- **Team:** `customfield_10060`

---

**Version:** 1.0
**Created:** 2026-03-31
