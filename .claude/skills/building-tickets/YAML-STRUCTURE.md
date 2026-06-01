# YAML Frontmatter Structure (v10.1.1)

## Complete Field Reference

### Generic Fields (All Ticket Types)

```yaml
documentType: story|task|bug|spike|epic    # REQUIRED: Type of ticket
title: "Descriptive title"                 # REQUIRED: Ticket title
description: "One-line summary"            # REQUIRED: Executive summary
createdDate: 2025-12-08                    # REQUIRED: Creation date (ISO 8601)
```

### Story/Task Specific Fields

```yaml
component: "Your Jira component name"         # OPTIONAL: Jira component (must match Jira exactly)
milestone: Feb2026                         # OPTIONAL: Milestone code (Feb2026, Mar2026, etc.)
priority: P0|P1|P2                        # OPTIONAL: Priority level
storyPoints: 5                             # OPTIONAL: Story points (1,2,3,5,8)
labels: [my-project, frontend, feature]        # OPTIONAL: Jira labels array
```

### Post-Export Fields (Auto-Filled by `backlog push`)

```yaml
exportedDate: 2025-12-08                  # Auto-filled after Jira export
```

### Jira Integration Fields (v10.1.1 - Flat with jira- prefix)

```yaml
jira-ticketId: PROJ-100                  # Auto-filled: Jira ticket ID
jira-url: "https://..."                   # Auto-filled: Full Jira URL
jira-parent: PROJ-200                    # OPTIONAL: Parent epic ID (if subtask/child)
jira-related: [PROJ-100, PROJ-101]      # OPTIONAL: Array of related ticket IDs
jira-blocking: [PROJ-300]                 # OPTIONAL: Array of tickets this blocks
jira-blockedBy: [PROJ-301]                # OPTIONAL: Array of tickets blocking this
jira-fixVersion: "2025-02"                # OPTIONAL: Release version ID
jira-internalNotes: "Process notes"       # OPTIONAL: Internal notes (not exported)
```

### Framework Integration Fields (v10.1.1 - Flat with framework- prefix)

```yaml
framework-documentation: "@backend-repo/CLAUDE.md"  # OPTIONAL: Cross-repo file ref
framework-milestone: "backlog/milestones/Feb2026.md"  # OPTIONAL: Local milestone path
framework-technicalGuides: ["@backend-repo/docs/api.md"]  # OPTIONAL: Array of technical refs
framework-relatedLocal: ["backlog/epics/EPIC-200.md"]  # OPTIONAL: Array of local refs
```

---

## Field Definitions

### documentType
**Required.** The type of ticket being created.

**Values:**
- `story` - User story (has AS/WANT/SO THAT format)
- `task` - Implementation task (no user story format)
- `bug` - Bug report
- `spike` - Research/investigation task
- `epic` - Epic (high-level feature grouping)

**Example:**
```yaml
documentType: story
```

---

### title
**Required.** Descriptive ticket title (same as H1 in body).

**Format:**
- For stories/tasks/bugs: `[Project]: [FE|BE|FS]: [Component]: [Feature]`
- For epics: `[Project]: [Component]: [Epic Theme]`

**Rules:**
- Clear and descriptive (30-80 characters)
- No ticket numbers or prefixes in title
- Use colons to separate segments

**Example:**
```yaml
title: "Frontend: Dashboard: Configurable Cards"
```

---

### description
**Required.** One-sentence executive summary of the ticket.

**Rules:**
- Single sentence only (max 150 characters)
- Clear purpose and value
- Written for someone unfamiliar with the ticket

**Example:**
```yaml
description: "Allow users to customize which cards appear on their dashboard"
```

---

### component
**Optional.** Jira component classification (configurable per project).

**Rules:**
- Exactly one component per ticket (no arrays)
- Must match a valid Jira component name
- If `backlog.config.json` defines `components`, the value must be in that list
- Case-sensitive

**Example:**
```yaml
component: "Your Jira component name"
```

---

### milestone
**Optional.** Milestone code for planning purposes.

**Format:** Month+Year (e.g., Feb2026, Mar2026)

**Rules:**
- Use standardized milestone codes
- Helps with sprint planning and release coordination
- Can be null if not assigned yet

**Example:**
```yaml
milestone: Feb2026
```

---

### priority
**Optional.** Priority level for Jira.

**Values:**
- `P0` - Critical (production outages, blocking work)
- `P1` - High (important features, major issues)
- `P2` - Medium (standard features, improvements)

**Example:**
```yaml
priority: P1
```

---

### storyPoints
**Optional.** Story point estimation (stories/tasks only).

**Values:** 1, 2, 3, 5, 8

**Rules:**
- Use Fibonacci-like sequence only
- Never >8 points (break into smaller stories)
- Can be null if not estimated yet
- Epics do NOT have story points

**Example:**
```yaml
storyPoints: 5
```

---

### labels
**Optional.** Jira labels for categorization.

**Format:** YAML array of strings

**Rules:**
- Use lowercase with hyphens (kebab-case)
- 2-5 labels per ticket
- Common labels: project name, component, type (frontend, backend), priority indicators

**Example:**
```yaml
labels: [my-project, frontend, feature, priority-high]
```

---

### createdDate
**Required.** Date the ticket was created.

**Format:** ISO 8601 (YYYY-MM-DD)

**Rules:**
- Auto-set when ticket is created
- Should not be modified after creation

**Example:**
```yaml
createdDate: 2025-12-08
```

---

### exportedDate
**Optional.** Date the ticket was exported to Jira.

**Format:** ISO 8601 (YYYY-MM-DD) or null

**Rules:**
- Auto-filled by `backlog push` after export
- null until exported
- Used to track when tickets were synced to Jira

**Example:**
```yaml
exportedDate: 2025-12-08
```

---

### Jira Integration Fields (jira-*)

#### jira-ticketId
Jira ticket ID assigned after export (e.g., PROJ-100).

**Auto-filled:** By `backlog push`
**Format:** PROJECT-NUMBER

**Example:**
```yaml
jira-ticketId: PROJ-100
```

#### jira-url
Full Jira URL for the ticket.

**Auto-filled:** By `backlog push`
**Format:** `https://{your-org}.atlassian.net/browse/PROJ-XXXX`

**Example:**
```yaml
jira-url: "https://{your-org}.atlassian.net/browse/PROJ-1234"
```

#### jira-parent
Parent epic ID if this is a child story/task.

**Optional.** Leave null if not a subtask.
**Format:** `PROJ-XXXX`

**Example:**
```yaml
jira-parent: PROJ-200
```

#### jira-related
Array of related ticket IDs.

**Optional.** Array of related tickets (not blocking, just related).
**Format:** `[PROJ-100, PROJ-101]`

**Example:**
```yaml
jira-related: [PROJ-102, PROJ-103]
```

#### jira-blocking
Array of tickets this ticket blocks.

**Optional.** Tickets that are blocked by this ticket completing.
**Format:** `[PROJ-100, PROJ-101]`

**Example:**
```yaml
jira-blocking: [PROJ-300, PROJ-304]
```

#### jira-blockedBy
Array of tickets blocking this ticket.

**Optional.** Tickets that must complete before this one.
**Format:** `[PROJ-100, PROJ-101]`

**Example:**
```yaml
jira-blockedBy: [PROJ-302, PROJ-303]
```

#### jira-fixVersion
Release version ID for version linking.

**Optional.** Used to link ticket to specific release version in Jira.
**Format:** Version ID or null

**Example:**
```yaml
jira-fixVersion: "2025-02"
```

#### jira-internalNotes
Internal process notes (not exported to Jira).

**Optional.** Internal tracking notes, not visible to Jira.
**Format:** String or null

**Example:**
```yaml
jira-internalNotes: "Waiting for architectural review before proceeding"
```

---

### Framework Integration Fields (framework-*)

#### framework-documentation
Cross-repository file reference.

**Optional.** Reference to documentation in other repositories.
**Format:** `@repo-name/path/to/file.md`

**Supported repos (examples, configure per project):**
- `@frontend-repo` - Frontend repository
- `@backend-repo` - Backend repository
- `@infrastructure-repo` - Infrastructure repository
- `@architecture-docs` - Architecture documentation

**Example:**
```yaml
framework-documentation: "@backend-repo/src/services/auth/README.md"
```

#### framework-milestone
Local milestone file reference.

**Optional.** Reference to milestone file in current repository.
**Format:** Repo-root-relative path

**Example:**
```yaml
framework-milestone: "backlog/milestones/Feb2026.md"
```

#### framework-technicalGuides
Array of technical guide references.

**Optional.** References to technical documentation.
**Format:** Array of paths or cross-repo references

**Example:**
```yaml
framework-technicalGuides:
  - "@backend-repo/docs/api-design.md"
  - "ai/context/technical-advanced.md"
```

#### framework-relatedLocal
Array of local file references.

**Optional.** References to other local files.
**Format:** Array of repo-root-relative paths

**Example:**
```yaml
framework-relatedLocal:
  - "backlog/epics/200-configurable-dashboard.md"
  - "ai/context/business-advanced.md"
```

---

## Complete Example

```yaml
---
documentType: story
title: "Frontend: Dashboard: Add Configurable Cards"
description: "Allow users to select which cards appear on their dashboard and save preferences"
component: "Your Jira component name"
milestone: Feb2026
priority: P1
storyPoints: 5
labels: [my-project, frontend, feature, ux-improvement]
createdDate: 2025-12-08
exportedDate: 2025-12-09

# Jira Integration Fields
jira-ticketId: PROJ-1283
jira-url: "https://{your-org}.atlassian.net/browse/PROJ-1283"
jira-parent: PROJ-200
jira-related: [PROJ-102, PROJ-103]
jira-blocking: []
jira-blockedBy: [PROJ-104]
jira-fixVersion: "2025-02"
jira-internalNotes: "Coordinate with UX team on card catalog design"

# Framework Integration Fields
framework-documentation: "@frontend-repo/src/components/Dashboard/README.md"
framework-milestone: "backlog/milestones/Feb2026.md"
framework-technicalGuides:
  - "@backend-repo/docs/api-design.md"
  - "ai/context/technical-advanced.md"
framework-relatedLocal:
  - "backlog/epics/200-configurable-dashboard.md"
---
```

---

## Validation Rules

### Required Fields Checklist
- ✅ `documentType` present and valid (story|task|bug|spike|epic)
- ✅ `title` present (30-80 characters)
- ✅ `description` present (1-line summary)
- ✅ `createdDate` present (ISO 8601)

### Optional Component Checklist (when component is used)
- ✅ `component` matches a valid Jira component name (if provided)
- ✅ Only one component (not multiple)
- ✅ If `backlog.config.json` defines `components`, the value must be in that list

### Jira Fields Checklist (for exported tickets)
- ✅ `jira-ticketId` populated (PROJ-XXXX format)
- ✅ `jira-url` populated (full URL)
- ✅ `exportedDate` populated (ISO 8601)
- ✅ `jira-blocking`, `jira-blockedBy`, `jira-related` are arrays
- ✅ `jira-parent` matches PROJ-XXXX format if present

### Framework Fields Checklist
- ✅ Cross-repo refs use `@repo-name/path` format
- ✅ Local refs are repo-root-relative paths
- ✅ All arrays are valid YAML arrays `[]`
- ✅ All strings properly quoted if containing special characters
