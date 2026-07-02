# Validation Rules & Checklist

## Quick Validation Checklist

Use this checklist before marking a ticket "Ready for Development":

### YAML Frontmatter (5 minutes)
- ✅ `documentType` present and valid (story|task|bug|spike|epic)
- ✅ `title` present and descriptive (30-80 chars)
- ✅ `createdDate` present (ISO 8601)
- ✅ **Lean frontmatter** — only fields with values are present; no `null` / `[]` placeholders
- ✅ Membership fields use **bare** names where present: `sprint`, `status`, `assignee` (not `jira-status`/`jira-sprint`/`jira-assignee`); milestone uses `jira-fixVersion`
- ✅ No nested objects (all fields at root level)
- ✅ Arrays are YAML arrays `[]` not strings
- ✅ Strings properly quoted if containing special chars

### Body Structure (5 minutes)
- ✅ H1 title matches YAML `title` field
- ✅ `---` divider after H1 title
- ✅ **AS/WANT/SO THAT section present** (stories/tasks only - first after H1 divider)
- ✅ Format: `**AS** a [role],` / `**I WANT** [capability],` / `**SO THAT** [business value].`
- ✅ Exactly 2 H2 sections: `## Description` and `## Acceptance Criteria`
- ✅ `---` divider between H2 sections
- ✅ NO `###` headers anywhere (use bold labels only)
- ✅ NO bold pseudo-headers for H2 sections
- ✅ Subsection labels use bold: `**Context:**`, `**In Order to Support This:**`, `**Technical Notes:**`
- ✅ NO metadata lines in body (e.g., "Type: Task | Status: Ready")

### Content Quality (10-15 minutes)
- ✅ **Context section:**
 - Written as 2-3 plain paragraphs (NOT bullet points)
 - 3-5 sentences total
 - Explains WHY not WHAT
 - Related tickets properly linked
- ✅ **In Order to Support This section:**
 - Formatted as bullet list
 - 3-5 bullets (outcome/capability — WHAT, not HOW)
 - Each bullet 1-2 sentences
 - Max 2 nesting levels
 - Clear and specific language
- ✅ **Technical Notes section (optional):**
 - 0-3 bullets (omit the section if there are no real constraints)
 - Constraints/pointers only (reuse pattern X, integrate with Y) — no code, no prescribed solution
 - Leaves the implementation approach to the developer
- ✅ **Acceptance Criteria section:**
 - 4-8 "Verify" statements (focused, not padded)
 - QA-verifiable: testable through UI, API, or observable behavior
 - No implementation details, code-level checks, or meta items
 - Measurable thresholds where applicable (not "performance is good")
 - Priority: core flows → edge cases → error recovery → cross-device

### Document Quality (5 minutes)
- ✅ Line count appropriate:
 - Stories/Tasks: 25-70 lines
 - Epics: 25-40 lines
- ✅ NO code snippets anywhere in ticket body
- ✅ NO implementation step-by-step instructions
- ✅ NO Jira wiki markup (h3., h2., etc.) - use native markdown only
- ✅ Links use proper markdown format: `[text](https://url)`
- ✅ Framework file refs in YAML fields, NOT in body

**Total Time:** ~25 minutes per ticket

---

## Detailed Validation Rules

### Rule 1: YAML Structure Must Be Flat

**CORRECT (flat + lean — only fields with values):**

```yaml
---
documentType: story
title: "Dashboard: Configurable Cards"
createdDate: 2025-12-08
priority: P1
sprint: APMR-APP-2026W25
jira-ticketId: PROJ-100
jira-url: "https://..."
jira-related: [PROJ-101, PROJ-102]
jira-fixVersion: "Pilot"
---
```

**WRONG - Nested structure:**
```yaml
---
documentType: story
jiraFields:
 ticketId: PROJ-100
 url: "https://..."
 related: [PROJ-101]
frameworkFields:
 documentation: null
---
```

**Why:** Flat structure is easier to parse, validate, and import/export to Jira.

---

### Rule 2: Required Fields + Lean Frontmatter

**Required fields (every ticket):**
- documentType
- title
- createdDate

`description` is **optional** — a one-line summary an agent may add; it is NOT produced by
CSV import and is NOT required (matches `ticket.schema.json`).

**Lean frontmatter — do NOT add `null` / `[]` placeholders.** Only include fields that have
values. There is no "every jira-*/framework-* field must be present" rule. Optional fields
appear only when set:

- Planning/membership: `priority`, `storyPoints`, `labels`, `assignee`, `status`, `sprint`,
 `jira-fixVersion` (milestone) — **bare names** (no `jira-` prefix on sprint/status/assignee)
- Identity (after push/import): `jira-ticketId`, `jira-url`, `jira-parent`
- Relations / framework refs: `jira-related`, `jira-blocking`, `jira-blockedBy`,
 `framework-*` — only when non-empty

`sprint` and `jira-fixVersion` drive sprint/milestone index derivation; include them when known.

---

### Rule 3: Body Must Have Exactly 2 H2 Sections

**CORRECT:**
```markdown
# Title

---

## Description

[content]

---

## Acceptance Criteria

[content]
```

**WRONG - Missing sections:**
```markdown
# Title

---

## Description

[content]
```

**WRONG - Too many sections:**
```markdown
# Title

---

## Description

[content]

---

## Technical Notes

[content]

---

## Acceptance Criteria

[content]
```

**Why:** Consistency enables reliable parsing for Jira export.

---

### Rule 4: NO Metadata Lines in Body

**CORRECT - Metadata in YAML only:**
```yaml
---
documentType: story
priority: P1
storyPoints: 5
---

# Story Title

---

## Description

...

---

## Acceptance Criteria

...
```

**WRONG - Metadata repeated in body:**
```yaml
---
documentType: story
priority: P1
storyPoints: 5
---

# Story Title

**Type:** Story | **Status:** Ready | **Priority:** P1 | **Story Points:** 5

---

## Description

...
```

**Why:** Duplication causes confusion and export errors.

---

### Rule 5: Context Section Must Be Paragraphs, NOT Bullets

**CORRECT:**
```markdown
**Context:**

Polling is inefficient and creates high latency. We've designed the data layer
to be subscription-ready. This story implements push updates for real-time
status without modifying page components.
```

**WRONG - Bullet points:**
```markdown
**Context:**

* Polling is inefficient
* Creates high latency
* We need subscriptions
* Data layer is ready
```

**Why:** Paragraphs provide better narrative flow and explain the "why." Bullets are for lists, not storytelling.

---

### Rule 6: "In Order to Support This" Must Reference Requirements, Not Implementation

**CORRECT — outcomes/capabilities (WHAT):**

```markdown
**In Order to Support This:**

* Status changes appear in the UI in real time, without a manual refresh
* Updates keep working after a brief network drop
* A user only ever sees their own organization's data
```

**WRONG — prescribes the mechanism (HOW):**

```markdown
**In Order to Support This:**

* Expose a GraphQL subscription and switch the data layer to subscription transport
* Add an Apollo subscription manager with reconnect/backoff
* Configure WebSocket timeouts
```

**Why:** The ticket describes WHAT outcome is needed and WHY; the developer chooses HOW. Naming the mechanism (GraphQL subscriptions, Apollo, WebSockets) removes their room to find the right solution — keep those out unless they're a hard constraint (then put them in Technical Notes).

---

### Rule 7: Acceptance Criteria Must Be QA-Verifiable

**CORRECT - QA can test through the UI/API:**
```markdown
* **Verify** status updates appear on screen within 2 seconds of a change event
* **Verify** page loads within 1 second on slow 3G connection
* **Verify** user A cannot see user B's organization data (test with 2 accounts)
* **Verify** connection loss displays "Reconnecting..." indicator to user
```

**WRONG - Implementation details (requires reading code):**
```markdown
* **Verify** Apollo Client is used for subscriptions
* **Verify** single active subscription per context
* **Verify** unsubscribe cleanup prevents memory leaks
```

**WRONG - Vague/unmeasurable:**
```markdown
* **Verify** subscriptions work
* **Verify** performance is good
* **Verify** memory is managed
```

**Why:** AC exists for QA — every criterion must be testable by a QA engineer through observable behavior, not code inspection. Implementation concerns belong in code review.

---

### Rule 8: Jira URLs Use Full Format

**CORRECT:**
```markdown
Related ticket: [PROJ-103](https://{your-org}.atlassian.net/browse/PROJ-103)
```

**WRONG - Ticket number only:**
```markdown
Related ticket: PROJ-103
```

**WRONG - Shortcut:**
```markdown
Related ticket: [PROJ-103]
```

**Why:** Full URL enables direct navigation from any system.

---

### Rule 9: Framework Files Go in YAML Fields, NOT Body

**CORRECT - YAML fields:**
```yaml
framework-documentation: "@backend-repo/CLAUDE.md"
framework-relatedLocal: ["backlog/epics/1171.md"]
```

In body (only Jira tickets):
```markdown
Related: [PROJ-103](https://{your-org}.atlassian.net/browse/PROJ-103)
```

**WRONG - Local files in body:**
```markdown
Related files:
- backlog/epics/1171.md
- ai/context/technical.md
```

**Why:** Body focuses on Jira relationships. Framework references belong in metadata for import/export.

---

### Rule 10: Arrays Must Be YAML Arrays

**CORRECT:**
```yaml
jira-related: [PROJ-101, PROJ-102]
jira-blocking: []
labels: [my-project, frontend, feature]
framework-technicalGuides: ["@backend-repo/docs/api.md"]
```

**WRONG - String format:**
```yaml
jira-related: "PROJ-101, PROJ-102"
jira-blocking: ""
labels: "my-project, frontend, feature"
```

**Why:** YAML arrays enable proper parsing for import/export.

---

## Line Count Validation

### Stories & Tasks
- **Minimum:** 25 lines (too short = incomplete)
- **Maximum:** 70 lines (too long = verbose)
- **Target:** 40-55 lines

**Why:** A ticket states the problem and desired outcome, not a step-by-step solution — that's the developer's job. If it's running long, you're probably prescribing HOW. Under 25 lines usually lacks context.

### Epics
- **Minimum:** 25 lines
- **Maximum:** 40 lines
- **Target:** 30-38 lines

**Why:** Epics should be concise (business value + child stories). Anything >40 lines is too detailed for an epic.

### Bugs
- **Minimum:** 25 lines
- **Maximum:** 70 lines (may be longer if complex repro steps)

**How to Check:**

```bash
wc -l file.md # Count lines
```

---

## YAML Field Validation Rules

### documentType Validation
- ✅ Must be one of: story, task, bug, spike, epic
- ❌ NOT: user-story, task, bug-fix, investigation, feature
- ❌ NOT: Story, TASK, BUG (case-sensitive, lowercase only)

### version Validation
- ✅ Must be semantic: 1.0, 1.1, 2.0
- ❌ NOT: v1.0, 1, 1.0.0
- ✅ Start at 1.0 for new tickets

### milestone Validation
- ✅ Must match project's milestone codes: Jan2026, Feb2026, Mar2026, etc.
- ✅ CAN be null (not assigned yet)
- ❌ NOT: "Q1 2026", "January", "sprint-5"
- ❌ NOT: Different format (must be MonthYear)

### priority Validation
- ✅ Must be P0, P1, or P2
- ✅ CAN be null (not prioritized yet)
- ❌ NOT: Critical, High, Medium, Low
- ❌ NOT: P-0, p0 (must be uppercase)

### storyPoints Validation
- ✅ Must be 1, 2, 3, 5, or 8 (Fibonacci-like)
- ✅ CAN be null (not estimated yet)
- ❌ NOT: 4, 6, 7, 10 (not Fibonacci)
- ❌ Epics should NOT have story points (null)

### labels Validation
- ✅ Must be YAML array: [label1, label2, label3]
- ✅ Use lowercase kebab-case: my-project, frontend, bug-fix
- ✅ 2-5 labels per ticket
- ❌ NOT: ["My-Project", "Frontend"] (not lowercase)
- ❌ NOT: ["my_project"] (not kebab-case)

### jira-ticketId Validation
- ✅ Must be PROJECT-NUMBER format: PROJ-100
- ✅ CAN be null (before export)
- ❌ NOT: 100, proj-100, PROJ100

### jira-url Validation
- ✅ Must be full URL: https://{your-org}.atlassian.net/browse/PROJ-1234
- ✅ CAN be null (before export)
- ❌ NOT: PROJ-100, /browse/PROJ-100, shortened URL

### jira-parent Validation
- ✅ Must be PROJ-XXXX format if present
- ✅ CAN be null (if not a child story)
- ❌ NOT: Epic-1, EPIC-1171

### Arrays Validation (jira-related, jira-blocking, jira-blockedBy, labels, etc.)
- ✅ Must be YAML array: []
- ✅ Each item must be valid: PROJ-100
- ✅ CAN be empty array: []
- ❌ NOT: String "PROJ-100"
- ❌ NOT: Mixed format

### Framework Paths Validation
- ✅ Cross-repo: @repo-name/path/to/file.md
- ✅ Local: repo-root-relative/path/to/file.md
- ✅ CAN be null
- ❌ NOT: ../ paths (must be root-relative)
- ❌ NOT: Absolute filesystem paths

---

## Content Quality Rubric

### Context Section (2-3 points)
| Rating | Criteria |
|--------|----------|
| ✅ Excellent | 2-3 paragraphs, 3-5 sentences, clear WHY, business context, related links |
| ⚠️ Acceptable | Paragraphs present but somewhat vague on "why" or too long |
| ❌ Needs Work | Bullets instead of paragraphs, vague, missing context, no links |

### In Order to Support This Section (2-3 points)
| Rating | Criteria |
|--------|----------|
| ✅ Excellent | 4-6 specific bullets, clear and concise, max 2 nesting levels |
| ⚠️ Acceptable | Right format but too many/few bullets or somewhat vague |
| ❌ Needs Work | Wrong format (paragraphs), too verbose, too few items, vague language |

### Technical Notes Section (2-3 points)
| Rating | Criteria |
|--------|----------|
| ✅ Excellent | 3-5 bullets, patterns referenced, NO code, actionable |
| ⚠️ Acceptable | Right format but maybe too many bullets or slightly prescriptive |
| ❌ Needs Work | Contains code snippets, too verbose, too few bullets, unclear guidance |

### Acceptance Criteria Section (2-3 points)
| Rating | Criteria |
|--------|----------|
| ✅ Excellent | 4-8 QA-verifiable "Verify" statements, testable through UI/API, measurable thresholds |
| ⚠️ Acceptable | Right format but some criteria require code inspection or lack measurable thresholds |
| ❌ Needs Work | Padded with filler (docs, tests, console errors), vague, or implementation-focused |

**Total: Pass if 7-12 points**

---

## Pre-Export Checklist (Before Jira Export)

Before running export to Jira, verify:

### YAML Fields (2 minutes)
- ✅ `jira-ticketId` is null (not exported yet)
- ✅ `jira-url` is null (not exported yet)
- ✅ `exportedDate` is null (not exported yet)
- ✅ All other fields populated correctly

### Body Structure (2 minutes)
- ✅ No Jira wiki markup (h3., h2., etc.)
- ✅ Native markdown only (##, ###, **, etc.)
- ✅ NO metadata lines (Type, Status, Priority, Points)
- ✅ Exactly 2 H2 sections with --- dividers

### Content Quality (5 minutes)
- ✅ Acceptance Criteria QA-verifiable (4-8 focused items, no filler)
- ✅ Technical Notes don't contain code
- ✅ Context is paragraphs, not bullets
- ✅ No vague language ("Make it work", "Improve performance")

**Ready to Export:** ✅ Pass all checks above

---

## After-Export Validation (Jira Sync)

After `backlog push` syncs to Jira, verify:

### YAML Fields Updated (Auto-filled)
- ✅ `jira-ticketId` now populated (PROJ-XXXX)
- ✅ `jira-url` now populated (full URL)
- ✅ `exportedDate` now populated (ISO 8601)

### Jira Display
- ✅ Ticket appears in Jira project
- ✅ Title matches YAML title
- ✅ Description formatted correctly
- ✅ Acceptance Criteria displayed properly
- ✅ No formatting artifacts (broken markup, double text)

### File Organization
- ✅ File moved from `backlog/_workflow/ready-to-export/` to `backlog/tickets/[type]/`
- ✅ Filename unchanged (same name throughout workflow)
- ✅ YAML metadata updated with Jira ticket ID

**Export Successful:** ✅ All items above verified

---

## Common Validation Failures & Fixes

### ❌ Context Section Has Bullets

**Problem:**
```markdown
**Context:**

* Users want customization
* Current dashboard is fixed
* We should add selection
```

**Fix:**
```markdown
**Context:**

Users want dashboard customization. Current design has fixed cards that don't
match individual workflows. This story enables card selection so each user can
focus on metrics that matter to them.
```

---

### ❌ In Order to Support This Section Has Only 2 Items

**Problem:**
```markdown
**In Order to Support This:**

* Add card selector
* Save preferences
```

**Fix:**
```markdown
**In Order to Support This:**

* Add card selector sidebar with 1-9 toggles
* Persist selected cards to localStorage (per browser)
* Render dashboard grid based on selections
* Add reset button for default layout
```

---

### ❌ Acceptance Criteria Are Vague or Implementation-Focused

**Problem — too vague:**
```markdown
## Acceptance Criteria

* **Verify** selector works
* **Verify** preferences save
* **Verify** performance is good
```

**Problem — implementation details QA can't test:**
```markdown
* **Verify** Zustand store updates correctly on toggle
* **Verify** localStorage key uses correct format
* **Verify** no console errors or React warnings
* **Verify** documentation updated: Dashboard README.md
```

**Fix — QA-verifiable with clear actions and expected results:**
```markdown
## Acceptance Criteria

* **Verify** card selector shows all 9 available cards with checkboxes
* **Verify** toggling a card checkbox immediately shows/hides the card on dashboard
* **Verify** selected cards persist after page refresh (same cards visible)
* **Verify** reset button returns dashboard to default 9-card layout
* **Verify** selecting 0 cards shows "Select at least one card" message
* **Verify** card toggle responds within 100ms (no visible delay)
* **Verify** layout renders correctly on mobile (375px), tablet (768px), desktop (1440px)
```

---

### ❌ Technical Notes Contains Code Snippet

**Problem:**
```markdown
**Technical Notes:**

* Implement with MUI Drawer:
 ```typescript
 const [open, setOpen] = React.useState(false);
 const drawer = (
 <Drawer open={open}>
 ...
 </Drawer>
);
 ```
```

**Fix:**
```markdown
**Technical Notes:**

* Follow MUI Drawer pattern (existing component in codebase)
* Use Zustand for state management (established pattern)
* localStorage key: dashboard:cardPreferences:{orgId}
* Card order persists in Phase 2 (current phase: selection only)
```

---

### ❌ jira-related Not a YAML Array

**Problem:**
```yaml
jira-related: "PROJ-104, PROJ-105"
```

**Fix:**
```yaml
jira-related: [PROJ-104, PROJ-105]
```

---

### ❌ Context Uses Bullet Points Instead of Paragraphs

**Problem:**
```markdown
**Context:**

* Polling has latency
* Users see stale data
* Performance degrades under load
```

**Fix:**
```markdown
**Context:**

Polling creates high latency and stale data visibility. As datasets grow,
polling becomes increasingly expensive on both client and server. This story
implements push-based subscriptions for real-time updates.
```

---

## Reference: Validation Checklists by Document Type

### Story Checklist
- ✅ **AS/WANT/SO THAT format REQUIRED** (first line after H1 divider)
- ✅ Context explains business need (not implementation)
- ✅ In Order to Support This: 3-5 specific bullets
- ✅ Technical Notes reference patterns (no code)
- ✅ 4-8 QA-verifiable Acceptance Criteria
- ✅ Story Points: 1-8 (never >8)
- ✅ Total lines: 40-60

### Task Checklist

- ✅ **AS/WANT/SO THAT format REQUIRED** (first line after H1 divider)
- ✅ Context explains what/why
- ✅ In Order to Support This: 3-5 specific bullets
- ✅ Technical Notes reference patterns
- ✅ 4-8 QA-verifiable Acceptance Criteria
- ✅ Story Points: 1-8 (never >8)
- ✅ Total lines: 40-60

### Epic Checklist
- ✅ Business Value section (why this epic matters)
- ✅ Technical Scope section (high-level approach)
- ✅ Child Stories listed as implementation steps
- ✅ Each child story has ticket number
- ✅ Acceptance Criteria (minimal - focuses on completion)
- ✅ NO Story Points (stories have points, not epic)
- ✅ Total lines: 25-40

### Bug Checklist

- ✅ Problem described clearly (current broken behavior)
- ✅ Symptoms or repro steps included
- ✅ Acceptance Criteria describe fixed behavior
- ✅ Performance regression reference (if applicable)
- ✅ 4-8 QA-verifiable Acceptance Criteria
- ✅ Priority P0 or P1 (critical bugs)
- ✅ Total lines: 25-60

### Spike Checklist
- ✅ Research questions clearly stated
- ✅ Scope boundaries defined (what's IN scope/OUT scope)
- ✅ Technical Notes mention key topics to explore
- ✅ Acceptance Criteria focus on decision deliverables
- ✅ Output clear (decision doc, recommendation, estimates)
- ✅ Story Points: 2-5 (research typically smaller)
- ✅ Total lines: 25-50

---

**Last Updated:** 2025-12-08
**Specification:** Jira Ticket Structure
