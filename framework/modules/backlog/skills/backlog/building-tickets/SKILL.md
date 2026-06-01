---
id: building-tickets
module: backlog
name: building-tickets
description: Write Jira tickets with v10.1.1 native markdown format, flat YAML frontmatter, and cross-repo reference support. Use when creating stories, tasks, epics, and bugs for any project using this framework.
scope: generic
applicable-projects: any
capabilities-provided:
  - ticket-decomposition
  - ticket-writing
  - jira-formatting
cli-commands:
  - name: backlog create-ticket
    description: Create a new ticket from template
    usage: agentic-framework backlog create-ticket --type <type> [options]
    options:
      - "-t, --type <type>: Ticket type (story, task, bug, epic, spike)"
      - "-p, --path <path>: Output directory (default: ./backlog)"
      - "-n, --name <name>: Ticket name in kebab-case (auto-generated if not provided)"
      - "-s, --summary <summary>: Ticket summary/title"
      - "--dry-run: Preview template without creating file"
    examples:
      - "agentic-framework backlog create-ticket --type story --summary \"Add user authentication\""
      - "agentic-framework backlog create-ticket --type bug --name BUG-001 --dry-run"
  - name: backlog validate
    description: Validate ticket files against v10.1.1 standards
    usage: agentic-framework backlog validate [path] [options]
    options:
      - "-v, --verbose: Show detailed validation progress"
      - "--schema-only: Only run JSON Schema validation"
      - "--rules-only: Only run business rules validation"
    examples:
      - "agentic-framework backlog validate ./backlog"
      - "agentic-framework backlog validate --verbose"
      - "agentic-framework backlog validate --schema-only"
---

# Jira Ticket Writing Standards (v10.1.1)

## When to Use This Skill

You're creating **Jira tickets** (stories, tasks, epics, bugs) and need to:
- Define proper YAML frontmatter with jira-* and framework-* fields
- Structure ticket body with ## Description and ## Acceptance Criteria
- Use native markdown (NOT Jira wiki markup)
- Support cross-repo file references (@repo-name/path format)
- Validate ticket format for Jira import/export
- Ensure tickets are consistent with v10.1.1 specification

**Example invocation:** "Use building-tickets to create a story with proper v10.1.1 structure including Jira and framework fields"

---

## MCP Integration

This skill uses **NO MCPs** - works with built-in tools only.
- No dependencies required
- No additional setup needed
- Full functionality with reference tools

---

## CLI-First Workflow (Recommended)

**Always use the CLI to create ticket files** - this ensures consistent structure, auto-numbering, and proper template usage.

### Step 1: Create Ticket Structure (CLI - REQUIRED)

```bash
# Create a story with auto-generated name
agentic-framework backlog create-ticket --type story --summary "Add user authentication"

# Create a bug with specific name
agentic-framework backlog create-ticket --type bug --name BUG-042 --summary "Fix login timeout"

# Preview without creating
agentic-framework backlog create-ticket --type task --summary "Setup CI pipeline" --dry-run
```

### Step 2: Fill In Content (AI Task)

After the CLI creates the file, open it and fill in:
- Acceptance criteria
- Technical notes
- Dependencies and blocking relationships
- Cross-repo references (if applicable)

### Step 3: Validate (CLI)

```bash
# Validate all tickets
agentic-framework backlog validate

# Validate specific directory
agentic-framework backlog validate ./backlog/tickets --verbose
```

---

## Manual Ticket Creation (Reference)

If CLI is not available, follow this checklist:

### Step 1: Create YAML Frontmatter (v10.1.1)

```yaml
---
documentType: story|task|bug|spike|epic
title: "Clear, descriptive ticket title"
description: "One-sentence summary"
milestone: Feb2026                     # Optional: milestone code
priority: P0|P1|P2                     # Optional
storyPoints: 5                         # Optional: 1,2,3,5,8 (stories/tasks only)
labels: [my-project, frontend]        # Optional: array of labels
createdDate: 2025-12-08
exportedDate: null                     # Auto-filled after Jira export

# Jira Integration Fields (v10.1.1 - flat structure with jira- prefix)
jira-ticketId: null                   # PROJ-XXXX (auto-filled)
jira-url: null                         # https://...
jira-parent: null                      # Parent epic if applicable
jira-related: []                       # Array of related ticket IDs
jira-blocking: []                      # Tickets this blocks
jira-blockedBy: []                     # Tickets blocking this
jira-fixVersion: null                  # Release version linking
jira-internalNotes: null               # Internal process notes

# Framework Integration Fields (v10.1.1 - flat structure with framework- prefix)
framework-documentation: null          # @repo-name/path cross-repo references
framework-milestone: null              # Local milestone file path
framework-technicalGuides: []          # Technical documentation references
framework-relatedLocal: []             # Local file references
---
```

### Step 2: Write Ticket Body (Native Markdown)

```markdown
# Story Title: [Project]: [FE|BE|FS]: [Component]: [Feature]

---

## Description

**AS** a [role],
**I WANT** [capability],
**SO THAT** [business value].

**Context:**

[2-3 plain language paragraphs - explain WHY not WHAT]

Related ticket: [PROJ-100](https://{your-org}.atlassian.net/browse/PROJ-100)

**Requirements:**

* [Requirement 1 - concise statement]
* [Requirement 2]
* [Requirement 3]

**Technical Notes:**

* [High-level guidance only - NO CODE SNIPPETS]
* Pattern reference: Use MUI Dialog pattern
* Security: Validate input X

---

## Acceptance Criteria

* **Verify** [QA-testable user behavior or outcome 1]
* **Verify** [QA-testable user behavior or outcome 2]
* **Verify** [edge case or error recovery from user's perspective]

[5-10 QA-verifiable criteria — focus on what a tester can observe, not implementation]
```

### Step 3: Validate Structure

- ✅ If component is provided, it matches a valid Jira component name
- ✅ Only one component (not multiple/array)
- ✅ YAML frontmatter present with all jira-* and framework-* fields
- ✅ Exactly 2 H2 sections: `## Description` and `## Acceptance Criteria`
- ✅ `---` dividers after title and between sections
- ✅ NO metadata lines in body
- ✅ NO code snippets in Technical Notes
- ✅ Context written as plain paragraphs (NOT bullets)
- ✅ Jira URLs use full format: `https://{your-org}.atlassian.net/browse/PROJ-XXXX`

---

## Full Instructions

See supporting documentation:
- **[YAML-STRUCTURE.md](YAML-STRUCTURE.md)** - Detailed frontmatter specification and field definitions
- **[BODY-STRUCTURE.md](BODY-STRUCTURE.md)** - Complete body markdown structure rules
- **[EXAMPLES.md](EXAMPLES.md)** - Real annotated examples (stories, epics, tasks)
- **[VALIDATION-RULES.md](VALIDATION-RULES.md)** - Validation rules and checklist

---

## Key Rules (v10.1.1)

### YAML Frontmatter

- ✅ **Flat structure:** All fields at root level (no nested objects)
- ✅ **Jira prefix:** All Jira-specific fields use `jira-` prefix
- ✅ **Framework prefix:** All framework-specific fields use `framework-` prefix
- ✅ **Arrays:** Use YAML arrays `[]` for jira-related, jira-blocking, etc.
- ✅ **Required fields:** documentType, title, description, createdDate
- ✅ **Component field (optional):** If provided, must match a valid Jira component name. If `backlog.config.json` defines `components`, the value must be in that list.
- ✅ **Single component:** Only one component per ticket (not multiple)
- ✅ **Optional fields:** milestone, priority, storyPoints, labels, exportedDate

### Body Structure

- ✅ **AS/WANT/SO THAT section:** Required for stories/tasks (first line after H1 divider)
  - Format: `**AS** a [role],` / `**I WANT** [capability],` / `**SO THAT** [business value].`
  - Describes user need and business value
  - Epics: Optional (use Business Value subsection instead)
- ✅ **Exactly 2 H2 sections:** `## Description` and `## Acceptance Criteria`
- ✅ **Section dividers:** `---` after H1 title and between H2 sections
- ✅ **NO ### headers:** Use bold labels instead: `**Context:**`, `**Requirements:**`, `**Technical Notes:**`
- ✅ **NO metadata in body:** All metadata (priority, points, status) belongs in YAML only
- ✅ **NO code snippets:** Technical Notes reference patterns, not implementation
- ✅ **NO fancy formatting:** Keep it simple (bold, bullets, plain text)

### Cross-Repo References

- ✅ **Format:** `@repo-name/path` (e.g., `@backend-repo/CLAUDE.md`)
- ✅ **Location:** YAML metadata fields only (framework-documentation)
- ✅ **NOT in body:** Body contains only Jira ticket references
- ✅ **Supported repos:** Configure in your project (e.g., @frontend-repo, @backend-repo, @infrastructure-repo, @architecture-docs)

### Jira URLs

- ✅ **Format:** Full URL only: `https://{your-org}.atlassian.net/browse/PROJ-XXXX`
- ✅ **Allowed in body:** Jira ticket references in Description context
- ✅ **Markdown syntax:** `[PROJ-100](https://{your-org}.atlassian.net/browse/PROJ-100)`

---

## Comparison: Old vs. v10.1.1

### YAML Frontmatter Changes

| Field | Old | New (v10.1.1) |
|-------|-----|---|
| Jira ID | `ticketId` | `jira-ticketId` |
| Jira URL | `jiraLink` | `jira-url` |
| Jira Parent | ❌ Missing | `jira-parent` |
| Related Tickets | ❌ Missing | `jira-related: []` |
| Blocking Tickets | ❌ Missing | `jira-blocking: []` |
| Blocked By Tickets | ❌ Missing | `jira-blockedBy: []` |
| Framework Docs | ❌ Missing | `framework-documentation` |
| Structure | Nested objects | **Flat (all at root level)** |

### Body Structure Changes

| Aspect | Old | New (v10.1.1) |
|--------|-----|---|
| Main sections | `### Context`, `### Requirements` | `## Description`, `## Acceptance Criteria` |
| Subsection labels | Bold: `**Context:**` | Bold: `**Context:**` |
| Section dividers | Single blank line | `---` dividers |
| Metadata in body | "Type: Task \| Status: Ready" | ❌ NONE (all in YAML) |
| Context format | Bullets allowed | Plain paragraphs only |

---

## Success Criteria

Your ticket is properly formatted when:
- ✅ If component is provided, it matches a valid Jira component name
- ✅ Only one component (not multiple)
- ✅ YAML frontmatter includes all jira-* and framework-* fields
- ✅ AS/WANT/SO THAT section present (stories/tasks) or Business Value subsection (epics)
- ✅ Exactly 2 H2 sections (## Description, ## Acceptance Criteria)
- ✅ NO metadata lines in the body
- ✅ Context written as plain language paragraphs (not bullets)
- ✅ Requirements/Technical Notes as concise bullets
- ✅ 5-10 QA-verifiable "Verify" acceptance criteria (no implementation details or filler)
- ✅ Proper Jira URL format for cross-references
- ✅ Ticket length 30-100 lines (story/task)
- ✅ Ticket length 30-50 lines (epic)
- ✅ NO code snippets

---

**Version:** 1.0 (v10.1.1 specification)
**Last Updated:** 2025-12-08
**Framework Version:** v11.2
**Scope:** Generic (framework-level, applicable to any project)
**Mandatory For:** ai-backlog-manager agents
