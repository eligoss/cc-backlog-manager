# Ticket Body Structure

## Overview

All ticket bodies use **native markdown** (NOT Jira wiki markup) with exactly **2 H2 sections** and **--- dividers**.

```text
# H1 Title
---
## Description
[content]
---
## Acceptance Criteria
[content]
```

---

## Writing Principles

Keep tickets short and skimmable — a developer should grasp the intent in under a minute.

- **Describe WHAT and WHY, not HOW.** State the problem and the desired outcome; leave the
 technical solution to the developer. A ticket frames the goal; it does not design the code.
- **Less is more.** Prefer a few clear points over an exhaustive list. If a detail doesn't
 change what "done" means, drop it.
- **Stay outcome-oriented.** Requirements describe observable behavior/capability, not the
 mechanism (e.g. "status updates appear without refresh", not "switch to GraphQL subscriptions").
- **Technical Notes are optional** — include only real constraints (existing patterns to
 reuse, integration points, hard limits), never a prescribed implementation.

---

## Complete Template

### Story/Task Template

```markdown
# Frontend: Dashboard: Configurable Cards

---

## Description

**AS** a user,
**I WANT** to customize my dashboard with selectable cards,
**SO THAT** I can focus on metrics that matter to me.

**Context:**

Polling is chatty, delayed, and harder to scale. We shaped the data layer to be
subscription-ready; this story implements push updates for real-time status
without altering page components.

Related ticket: [PROJ-100](https://{your-org}.atlassian.net/browse/PROJ-100)

**Requirements:**

* Status changes appear in the UI in real time, without a manual refresh
* Updates keep working after a brief network drop (reconnect automatically)
* A user only ever sees their own organization's data

**Technical Notes:** _(optional — constraints only)_

* Reuse the existing real-time data pattern in the codebase rather than adding a new one
* Target <100ms update latency; coordinate any schema change with the data team

---

## Acceptance Criteria

* **Verify** status updates appear on screen within 2 seconds, without a manual refresh
* **Verify** updates resume automatically after temporary network loss (disable/enable Wi-Fi)
* **Verify** user A cannot see user B's organization data (test with 2 accounts)
* **Verify** connection loss displays a "Reconnecting..." indicator to the user
* **Verify** responsive layout on mobile (375px), tablet (768px), desktop (1440px)
```

### Epic Template

```markdown
# Analytics: Scenario Analysis Engine

---

## Description

**Business Value:**

Users need to understand how risks change under different market scenarios. This
epic enables rapid scenario modeling without leaving the platform, reducing time
to insight from hours to minutes and improving decision quality.

**Technical Scope:**

Implement configurable scenario builder with real-time delta calculation across
all components. Architecture uses immutable scenario state and parallel
computation for performance.

*Child Stories (Implementation Steps):*
* [PROJ-101] Backend: Scenario Model & Persistence
* [PROJ-102] Frontend: Scenario Builder UI
* [PROJ-103] Backend: Delta Calculation Engine
* [PROJ-104] Frontend: Results Visualization

---

## Acceptance Criteria

* **Verify** all child stories completed and deployed
* **Verify** end-to-end scenario creation → delta calculation → visualization
* **Verify** performance acceptable (delta calculation <2s for large scenarios)
* **Verify** integration tests pass across all components
* **Verify** documentation updated for scenario modeling
```

---

## Section Details

### H1 Title

**Format:** Single markdown header at top of body (matches YAML title field)

**Pattern:**
- Stories/Tasks/Bugs: `# [Project]: [FE|BE|FS]: [Component]: [Feature]`
- Epics: `# [Project]: [Component]: [Epic Theme]`

**Examples:**
```markdown
# Frontend: Dashboard: Configurable Cards
# Backend: Data Layer: Subscription Support
# Full Stack: Risk Engine: Scenario Analysis
# Infrastructure: Deployment: CI/CD Pipeline
# Analytics: Scenario Analysis Engine (Epic)
```

**Rules:**
- Matches YAML `title` field exactly
- One line only
- Descriptive and clear

---

### Section Divider: ---

**Location:** After H1 title and between H2 sections

**Purpose:** Visually separate sections in markdown (converted to Jira format on export)

**Rules:**
- Use exactly 3 hyphens: `---`
- Must be on its own line
- One blank line before and after (optional but recommended)

**Example:**
```markdown
# Title

---

## Description
```

---

### ## Description Section

**Purpose:** Main ticket content (context, requirements, technical guidance)

**Contains 3 subsections with BOLD labels (NOT ### headers):**

#### 1. **Context:**

**Purpose:** Explain WHY this ticket matters (business context and rationale)

**Format:** 1-2 short plain-language paragraphs (NOT bullet points)

**Rules:**
- Write as natural paragraphs, not bullets
- 2-4 sentences total — just enough to explain the "why"
- Explain the business problem or opportunity
- Reference related tickets if relevant
- Use plain language (not jargon)

**Example:**
```markdown
**Context:**

Polling is chatty, delayed, and harder to scale. We shaped the data layer to be
subscription-ready; this story implements push updates for real-time status
without altering page components.

Users currently wait 5-10 seconds for updates. Real-time push reduces this to
<100ms, dramatically improving user experience and reducing server load.

Related ticket: [PROJ-100](https://{your-org}.atlassian.net/browse/PROJ-100)
```

**Anti-patterns:**
```markdown
❌ BAD - Bullet points in Context:
**Context:**

* Polling is inefficient
* Delays are problematic
* We need real-time updates
[Wrong format - use paragraphs]

❌ BAD - Too verbose:
**Context:**

In today's modern web applications, polling has been a longstanding approach...
[5 more paragraphs explaining polling theory...]
[Too long - keep to 3-5 sentences]
```

#### 2. **In Order to Support This:**

**Purpose:** List what needs to be implemented (acceptance/completion criteria)

**Format:** Bullet list with concise statements

**Rules:**
- Use `*` for bullets (NOT `-` or `+`)
- Each bullet 1-2 sentences max
- 3-5 top-level bullets
- Describe the **outcome/capability needed (WHAT)**, not the implementation approach (HOW) — leave the mechanism to the developer
- Max 2 nesting levels (sub-bullets under requirements)
- Clear, specific language (not vague)

**Example:**
```markdown
**In Order to Support This:**

* Expose GraphQL subscription for status events (started/progress/completed/failed)
* Switch data layer to subscription transport
* Standardize connection: single active subscription per context, clean unsubscribe, reconnect with backoff
* Enforce tenant isolation via org context from session/claims
```

**Anti-patterns:**
```markdown
❌ BAD - Too many bullets:
**In Order to Support This:**

* Implement subscriptions
* Add error handling
* Test on mobile
* Test on tablet
* Test on desktop
* Add monitoring
* Add alerting
* Document the code
* Write unit tests
[Too many - consolidate]

❌ BAD - Too much nesting:
**In Order to Support This:**

* Main requirement
 * Sub-requirement
 * Sub-sub-requirement
 * Sub-sub-sub-requirement
[Excessive nesting - max 2 levels]

❌ BAD - Vague language:
**In Order to Support This:**

* Make it work
* Improve performance
* Handle errors
[Not specific enough - be concrete]
```

#### 3. **Technical Notes:** _(optional)_

**Purpose:** Capture only real **constraints** — existing patterns to reuse, integration points, hard limits. NOT a design or a prescribed solution. **Omit this section entirely if there are no genuine constraints** — leave the developer room to choose the approach.

**Format:** Short bullet list of constraints/pointers

**Rules:**
- Use `*` for bullets
- 0-3 bullets (fewer is better; omit the section if none)
- Note constraints/pointers only (reuse pattern X, integrate with Y, limit Z) — never step-by-step implementation
- NO code snippets
- Don't prescribe the solution — that's the developer's call

**Example:**
```markdown
**Technical Notes:**

* Use Apollo Client subscriptions pattern (already established in codebase)
* Performance target: <100ms latency for status updates
* Coordinate with data team on subscription schema changes
* Monitor WebSocket connection health
```

**Anti-patterns:**
```markdown
❌ BAD - Code snippets:
**Technical Notes:**

* Create a new class:
 ```typescript
 class SubscriptionManager {
 constructor() { ... }
 subscribe() { ... }
 }
 ```
[Wrong - reference pattern, not code]

❌ BAD - Step-by-step implementation:
**Technical Notes:**

* Step 1: Add Apollo Client dependency
* Step 2: Create subscription query
* Step 3: Add subscription hook
* Step 4: Call hook in component
[Wrong - tell what pattern, not how]

❌ BAD - Too many bullets:
**Technical Notes:**

* Use pattern X
* Handle error Y
* Monitor metric Z
* Log in format A
* Add retry logic B
* Configure timeout C
* Test scenario D
[Too many - consolidate to 3-5]
```

---

### ## Acceptance Criteria Section

**Purpose:** QA-verifiable conditions that confirm the ticket delivers the intended value

**Format:** Bullet list with "Verify" statements

**Principle:** Every criterion must be testable by a QA engineer through the UI, API, or observable behavior — no code inspection required. Focus on what the user sees and experiences.

**Rules:**
- Use `*` for bullets (NOT `-`)
- Start each with **Verify** (bold)
- 4-8 focused criteria (quality over quantity — don't pad to hit a number; cover the core flow, not every edge)
- Each criterion = one specific test a QA engineer can execute
- Describe the action and expected result, not implementation details
- Use measurable thresholds where applicable (e.g., "<2s", "within 100ms")

**Priority order:**
1. Core user flows (happy path — what the user came to do)
2. Key edge cases (empty states, boundary values, concurrent actions)
3. Error recovery (what happens when things go wrong — from user's perspective)
4. Cross-browser/responsive (only when relevant to the story)

**Example:**
```markdown
## Acceptance Criteria

* **Verify** status updates appear on screen within 2 seconds of a change event
* **Verify** updates resume automatically after temporary network loss (disable/enable Wi-Fi)
* **Verify** user A cannot see user B's organization data (test with 2 accounts)
* **Verify** connection loss displays "Reconnecting..." indicator to user
* **Verify** page loads within 1 second on slow 3G connection
* **Verify** responsive layout on mobile (375px), tablet (768px), desktop (1440px)
```

**What belongs in AC vs. elsewhere:**

| Belongs in AC | Does NOT belong in AC |
|---------------|----------------------|
| User-observable behaviors | Implementation details ("uses Apollo Client") |
| Measurable outcomes | Code-level checks ("async methods return Promise") |
| Error states the user sees | Ops concerns (monitoring, alerting) |
| Cross-browser/device behavior | Meta items ("tests written", "docs updated") |
| Performance from user's perspective | Internal architecture choices |

**Anti-patterns:**

```markdown
❌ BAD - Implementation details (QA can't verify without reading code):
* **Verify** Apollo Client is used for subscriptions
* **Verify** Redux store is updated correctly
* **Verify** unsubscribe cleanup prevents memory leaks
[These are code review items, not QA test cases]

❌ BAD - Vague/unmeasurable:
* **Verify** it works
* **Verify** performance is good
* **Verify** errors are handled
[No pass/fail criteria — how does QA know it passed?]

❌ BAD - Filler to hit a count:
* **Verify** no console errors or React warnings
* **Verify** integration tests cover happy path
* **Verify** documentation updated with pattern
[These are DoR/checklist items, not AC — don't pad]

✅ GOOD - QA can test this:
* **Verify** changing analysis hours refreshes data within 1 second
* **Verify** selecting a component with no data shows "No data available" message (not error)
* **Verify** export button produces a CSV that opens correctly in Excel
[Clear action → expected result, testable through the UI]
```

---

## Special Cases

### Out of Scope Section (Optional)

**When to include:**
- There's a specific feature/requirement users might expect but it's NOT included
- There's a planned follow-up ticket for the excluded scope
- Clarification is needed to prevent scope creep

**When to OMIT:**
- There's nothing specific to call out
- Items are obviously unrelated to the story
- You're struggling to think of items

**Format:**
```markdown
### Out of Scope

* Multi-user configuration sharing - Will be handled in PROJ-400
* Custom tile creation - Planned for Q2 2026 roadmap
```

**Rules:**
- Only include if there's a specific reason
- Keep brief (2-3 items max)
- Reference follow-up tickets when deferring scope
- OMIT this section entirely if nothing specific to call out

---

### Links in Body

**Jira URLs (ALLOWED):**
```markdown
Related work: [PROJ-100](https://{your-org}.atlassian.net/browse/PROJ-100)
Parent epic: [PROJ-200](https://{your-org}.atlassian.net/browse/PROJ-200)
```

**Framework files (NOT in body):**
- Put cross-repo references in `framework-documentation` YAML field
- Put local file references in `framework-relatedLocal` YAML field
- Do NOT include file paths in the ticket body

---

## Formatting Rules Summary

| Element | Rule |
|---------|------|
| H1 Title | Single line at top, matches YAML title |
| Section dividers | `---` after H1 and between H2 sections |
| H2 sections | Exactly 2: Description and Acceptance Criteria |
| Subsection labels | Bold: `**Context:**`, `**In Order to Support This:**`, `**Technical Notes:**` |
| Subsection headers | NO `###` headers - use bold labels only |
| Context format | Plain paragraphs (NOT bullets) |
| In Order to Support This format | Bullet list (NOT paragraphs) |
| Technical Notes format | Optional; 0-3 constraint bullets (no code, no prescribed solution) |
| Acceptance Criteria format | 4-8 QA-verifiable **Verify** statements |
| Code snippets | ZERO - reference patterns only |
| Metadata in body | ZERO - all metadata in YAML frontmatter |
| Line count | 25-70 lines (stories/tasks), 25-40 lines (epics) |

---

## Validation Checklist

Before considering a ticket complete:

- ✅ H1 title present and matches YAML title
- ✅ Section dividers (`---`) present
- ✅ Exactly 2 H2 sections: Description and Acceptance Criteria
- ✅ NO `###` headers (use bold labels only)
- ✅ Context as plain paragraphs (NOT bullets)
- ✅ In Order to Support This as bullets (NOT paragraphs)
- ✅ Technical Notes optional (0-3 constraint bullets, NO code, no prescribed solution)
- ✅ 4-8 QA-verifiable Acceptance Criteria starting with "Verify"
- ✅ NO metadata lines in body (all in YAML)
- ✅ Proper Jira URL format for cross-references
- ✅ Total lines: 25-70 (stories/tasks) or 25-40 (epics)
- ✅ Clear, concise language throughout; WHAT/WHY, not HOW
