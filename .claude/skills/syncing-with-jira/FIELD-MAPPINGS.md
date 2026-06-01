# Jira Field Mappings & Markup Conversion

## YAML ↔ Jira Field Mappings

### Required Fields

```yaml
---
jira-ticketId: null          # null → CREATE, "PROJ-1234" → UPDATE
jira-url: null               # Auto-populated after push
jira-component: "Component"  # Must match Jira exactly (spacing, punctuation)
jira-parent: null            # Epic link (e.g., "PROJ-1000")
framework-type: story        # story, task, bug, epic, spike
framework-milestone: Feb2026
framework-priority: P1       # P0, P1, P2, P3
---
```

### Editable Fields (UPDATE Mode)

| Field | Editable | Notes |
|-------|----------|-------|
| title | Yes | Maps to Jira "Summary" |
| description | Yes | Body content |
| framework-priority | Yes | Maps to Jira priority |
| jira-component | Yes | Must match Jira exactly |
| Acceptance Criteria | Yes | Extracted from markdown section |
| jira-ticketId | No | Immutable after creation |
| framework-type | No | Cannot change issue type |

### CSV Import Column Mapping

```plaintext
Issue key        → jira-ticketId
Summary          → title
Issue Type       → framework-type
Priority         → framework-priority
Status           → status
Assignee         → assignee
Custom field     → storyPoints
Fix Version/s    → framework-milestone
Epic Link        → jira-parent
Description      → Body content (converted to markdown)
```

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
