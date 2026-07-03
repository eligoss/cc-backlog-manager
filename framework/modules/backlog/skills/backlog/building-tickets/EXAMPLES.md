# Ticket Examples

## Example 1: Frontend Story (Recommended)

### File: 1283-configurable-cards.md

```yaml
---
documentType: story
title: "Frontend: Dashboard: Configurable Cards"
description: "Allow users to select which cards appear on their dashboard and persist preferences"
priority: P1
storyPoints: 5
labels: [my-project, frontend, feature, ux]
createdDate: 2025-12-08
assignee: "Jane Smith"
status: "In Progress"
sprint: APMR-APP-2026W25

jira-ticketId: PROJ-1283
jira-url: "https://{your-org}.atlassian.net/browse/PROJ-1283"
jira-parent: PROJ-200
jira-related: [PROJ-101, PROJ-102]
jira-fixVersion: "Feb2026"
jira-internalNotes: "Coordinate with UX team on card catalog design"

framework-documentation: "@frontend-repo/src/components/Dashboard/README.md"
framework-milestone: "backlog/milestones/Feb2026.md"
framework-technicalGuides: ["@frontend-repo/docs/state-management.md"]
framework-relatedLocal: ["backlog/epics/200-configurable-dashboard.md"]
---

# Frontend: Dashboard: Configurable Cards

---

## Description

**Context:**

Users want to customize their dashboard to see only the metrics that matter to them. Currently, all cards are fixed. This story enables flexible dashboard customization with preferences persisted to their browser.

The UX team has designed a simple card selector (side panel with checkboxes). This story implements the frontend experience and localStorage persistence. Backend changes will be in follow-up story PROJ-102.

**Requirements:**

* Add card selector sidebar with 1-9 card toggles
* Persist selected cards to localStorage (per browser/device)
* Update dashboard grid to show/hide cards based on selection
* Reset button returns to default card layout
* All selections idempotent (can be toggled multiple times)

**Technical Notes:**

* Follow MUI Drawer pattern for sidebar (already used elsewhere)
* Use Zustand for state management (existing pattern)
* localStorage key: `dashboard:cardPreferences:{orgId}`
* Card order follows default sequence (don't persist order yet - Phase 2)

---

## Acceptance Criteria

* **Verify** card selector sidebar displays all 9 available cards with checkboxes
* **Verify** toggling a checkbox immediately shows/hides the card on dashboard (no page reload)
* **Verify** selected cards persist after page refresh (same cards visible)
* **Verify** reset button returns dashboard to default 9-card layout
* **Verify** selecting 0 cards shows "Select at least one card" message
* **Verify** card toggle responds within 100ms (no visible delay)
* **Verify** layout renders correctly on mobile (375px), tablet (768px), desktop (1440px)
```

### Key Annotations

✅ **YAML Structure:** Lean frontmatter — only fields with values present:
- Generic fields: documentType, title, description, priority, storyPoints, labels, createdDate
- Workflow fields: assignee, status, sprint
- Jira fields: jira-ticketId, jira-url, jira-parent, jira-related, jira-fixVersion, jira-internalNotes
- Framework fields: framework-documentation, framework-milestone, framework-technicalGuides, framework-relatedLocal

✅ **Body Structure:**
- H1 title matches YAML title
- `---` dividers present
- Exactly 2 H2 sections: Description, Acceptance Criteria
- Context as plain paragraphs (not bullets)
- Requirements as bullets
- Technical Notes as bullets (no code snippets)
- 7 QA-verifiable Acceptance Criteria (within 4-8 range, no filler)

✅ **Content Quality:**
- Context explains WHY (user need, business value)
- Requirements are specific and clear
- Technical Notes reference patterns, not implementations
- Acceptance Criteria are testable and observable

---

## Example 2: Backend Task (With Dependencies)

### File: 1406-convert-data-layer-promises.md

```yaml
---
documentType: task
title: "Backend: Data Layer: Convert Methods to Promise-Based"
description: "Convert all synchronous data layer methods to async/Promise-based for Sentry transaction support"
priority: P0
storyPoints: 5
labels: [my-project, backend, infrastructure]
createdDate: 2025-12-04
assignee: "Alex Johnson"
status: "In Progress"
sprint: APMR-APP-2026W25

jira-ticketId: PROJ-1406
jira-url: "https://{your-org}.atlassian.net/browse/PROJ-1406"
jira-parent: PROJ-201
jira-related: [PROJ-301, PROJ-302]
jira-blocking: [PROJ-303, PROJ-304]
jira-fixVersion: "Feb2026"

framework-documentation: "@backend-repo/src/data-layer/README.md"
framework-milestone: "backlog/milestones/Feb2026.md"
framework-technicalGuides:
 - "@backend-repo/docs/transaction-tracing.md"
 - "@backend-repo/docs/data-layer-v2.md"
framework-relatedLocal:
 - "backlog/epics/201-centralized-data-layer.md"
 - "backlog/tickets/301-add-sentry-transactions.md"
---

# Backend: Data Layer: Convert Methods to Promise-Based

---

## Description

**Context:**

PROJ-305 implemented V2 data layer architecture (Fetch Controllers, Data Mapping, Zustand Store). However, all data layer methods currently use synchronous patterns. Sentry transactions require **Promise-based methods** so we can properly `await` completion before the transaction finishes.

Without Promises, Sentry transactions may close before data fetching completes, breaking trace correlation and timing accuracy.

**Requirements:**

* Audit all Fetch Controller methods in data layer (identify corner cases)
* Convert all synchronous methods to `async` functions returning `Promise<T>`
* Ensure all controller methods return Promises to clients
* Update page-level code to `await` data layer calls
* Verify correct promise chaining for parallel fetches
* Ensure everything ready for Sentry transaction integration (PROJ-303)

**Technical Notes:**

* V2 architecture (PROJ-305) is already in place
* Promise-based allows: `await dataLayerCall()` pattern for Sentry wrapping
* TanStack Query hooks already return Promises (native behavior)
* Keep existing component code unchanged - only data layer internals change
* Follow Promise pattern established in PROJ-301

---

## Acceptance Criteria

* **Verify** PCR Analyzer pages load data correctly with no loading state regressions
* **Verify** data fetches complete within 500ms (no timing regression from conversion)
* **Verify** failed API calls display error state to user (not silent failure)
* **Verify** parallel data fetches (e.g., multiple chart panels) load concurrently
* **Verify** page navigation away from loading state does not cause stale data display
* **Verify** Sentry transaction integration ready (PROJ-303 can be implemented on top)
```

### Key Annotations

✅ **Task vs. Story:** No "AS/WANT/SO THAT" - it's a technical task

✅ **Dependencies:**
- `jira-blocking: [PROJ-303, PROJ-304]` - This blocks follow-up Sentry tasks (field present because non-empty)
- `jira-blockedBy` omitted — no blockers, so field is excluded (lean model)
- Context references related tasks (PROJ-305, PROJ-301)

✅ **Technical Specificity:**
- Context explains the "why" (Sentry needs Promise-based methods)
- Requirements are concrete (convert methods to async)
- Technical Notes reference patterns and existing code

✅ **Acceptance Criteria:**
- QA-verifiable from user/system perspective (page loads, error states, performance)
- No implementation details (async keyword, Promise type) — those belong in code review

---

## Example 3: Epic (High-Level)

### File: 200-configurable-dashboard.md

```yaml
---
documentType: epic
title: "Analytics: Configurable Dashboard"
description: "Enable users to customize dashboards to see metrics that matter to their role and workflow"
priority: P1
labels: [my-project, frontend, epic, feature]
createdDate: 2025-12-01
assignee: "Sarah Lee"
status: "In Progress"
sprint: APMR-APP-2026W25

jira-ticketId: PROJ-1171
jira-url: "https://{your-org}.atlassian.net/browse/PROJ-1171"
jira-related: [PROJ-202, PROJ-203]
jira-fixVersion: "Feb2026"

framework-milestone: "backlog/milestones/Feb2026.md"
framework-technicalGuides: ["@frontend-repo/docs/dashboard-architecture.md"]
framework-relatedLocal:
 - "backlog/milestones/Feb2026.md"
 - "ai/context/business-advanced.md"
---

# Analytics: Configurable Dashboard

---

## Description

**Business Value:**

Users want personalized dashboards - different roles need different metrics. Risk Analysts focus on engine performance, Traders focus on position impact, Managers focus on exposure summary. Currently, all users see identical fixed layouts, forcing them to search for relevant metrics.

By enabling customization, we directly improve user productivity and decision speed. Early customer feedback rates this as highest-priority feature request.

**Technical Scope:**

Implement flexible dashboard builder with card selection and layout persistence. Vertical slicing enables FE customization first, BE data optimization second, allowing quick customer launch.

*Child Stories (Implementation Steps):*
* [PROJ-100] Frontend: Card Selector UI & localStorage Persistence
* [PROJ-103] Backend: Optimize GraphQL Query Selection for Custom Cards
* [PROJ-104] Analytics: Track Card Selection Usage Patterns
* [PROJ-105] Polish: Mobile Responsiveness & A/B Testing

---

## Acceptance Criteria

* **Verify** all 4 child stories completed and deployed
* **Verify** end-to-end: Users can select cards → See custom dashboard → Preferences persist
* **Verify** Query optimization reduces average response by 20% (vs. requesting all fields)
* **Verify** Dashboard loads in <1s on 3G network (vs. current 2-3s)
* **Verify** Mobile experience identical to desktop
* **Verify** A/B testing ready (can measure impact on user engagement)
* **Verify** Analytics data validates usage patterns (which cards selected, least popular)
* **Verify** Integration testing passes across all components
* **Verify** Documentation updated with customization architecture
* **Verify** Customer training materials prepared
```

### Key Annotations

✅ **Epic Structure:**
- Business value clearly stated (user productivity, customer feedback)
- Technical scope is high-level (mentions "vertical slicing" pattern)
- Child stories listed as implementation steps with ticket numbers

✅ **NO story points:** Epics don't have story points (child stories do)

✅ **Parent/Related:**
- `jira-parent` omitted — top-level epic has no parent (lean: omit null fields)
- `jira-related` present because it has values
- `jira-blocking`/`jira-blockedBy` omitted — no dependencies (lean model)

✅ **Concise (34 lines):** Within 25-40 line target for epics

---

## Example 4: Bug Report

### File: 1315-shimmer-loading-state.md

```yaml
---
documentType: bug
title: "Frontend: Assets: Fix Shimmer Loading State When Changing Analysis Hours"
description: "Loading shimmer appears for 5+ seconds when users change analysis hours, indicating performance regression"
priority: P0
storyPoints: 3
labels: [my-project, frontend, bug, performance]
createdDate: 2025-12-07

jira-related: [PROJ-302]
jira-fixVersion: "Feb2026"
jira-internalNotes: "Regression from PROJ-302 commit a3f2b1c"

framework-milestone: "backlog/milestones/Feb2026.md"
---

# Frontend: Assets: Fix Shimmer Loading State When Changing Analysis Hours

---

## Description

**Context:**

Users report 5+ second loading delays when changing analysis hours on the Assets page. A shimmer skeleton loader appears and persists for too long, creating poor user experience and suggesting performance problems.

Root cause: Recent refactor in PROJ-302 likely introduced inefficient re-computation or redundant data fetches. This is a regression - previous version had <1s load time.

**Symptoms:**

* User changes analysis hours (e.g., from 24h to 7d)
* Shimmer skeleton appears
* Shimmer persists for 5-10 seconds
* Data finally appears

**Technical Notes:**

* Regression timeline: Started after PROJ-302 merged (commit a3f2b1c)
* Check React profiler for excessive re-renders
* Verify TanStack Query cache invalidation not triggering unnecessary fetches
* Profile with Chrome DevTools to identify bottleneck (computation vs. network)

---

## Acceptance Criteria

* **Verify** changing analysis hours refreshes data within 1 second (was 5-10s)
* **Verify** shimmer skeleton appears briefly during load (not stuck for 5+ seconds)
* **Verify** 7-day, 24-hour, and custom date ranges all load within 1 second
* **Verify** switching between assets while loading does not display stale data
* **Verify** responsive on desktop, tablet, and mobile viewports
```

### Key Annotations

✅ **Bug Format:** No "AS/WANT/SO THAT" - focus on problem description

✅ **Symptoms Section:** Clear repro steps help developers understand the issue

✅ **Root Cause Reference:** Links to potentially related commit/ticket

✅ **Technical Guidance:** Performance debugging hints (profiler, cache, network)

✅ **Priority P0:** Critical/blocking issue

---

## Example 5: Spike (Investigation Task)

### File: 942-subscription-spike.md

```yaml
---
documentType: spike
title: "Backend: Data Layer: GraphQL Subscription Architecture Spike"
description: "Investigate GraphQL subscription patterns and recommend architecture for real-time data updates"
priority: P1
storyPoints: 3
labels: [my-project, backend, spike, architecture]
createdDate: 2025-12-06

jira-related: [PROJ-201]
jira-blocking: [PROJ-400]
jira-fixVersion: "Jan2026"
jira-internalNotes: "Output: Decision doc on subscription pattern"

framework-documentation: "@backend-repo/docs/architecture-decisions.md"
framework-milestone: "backlog/milestones/Jan2026.md"
framework-technicalGuides:
 - "@backend-repo/docs/graphql-api.md"
 - "@backend-repo/docs/authentication.md"
framework-relatedLocal: ["ai/context/technical-advanced.md"]
---

# Backend: Data Layer: GraphQL Subscription Architecture Spike

---

## Description

**Context:**

Real-time data updates are becoming important for user experience. We need to move beyond polling to push-based subscriptions. Before implementing, we should investigate:

* Competing subscription architectures (Apollo subscriptions vs. custom WebSocket vs. Server-Sent Events)
* Complexity vs. benefit trade-offs
* Integration with our existing authentication and authorization
* Performance implications at scale

**Research Questions:**

* Which pattern best matches our tech stack (NestJS, GraphQL, Redis)?
* How do we handle authentication + reconnection + cleanup?
* What's the overhead per connected client?
* Can we implement in 1 sprint vs. 2-3 sprints?

**Technical Notes:**

* Apollo Client already used on frontend (familiar pattern)
* Redis available for pub/sub coordination
* WebSocket support built into NestJS
* Study existing implementations in similar systems

---

## Acceptance Criteria

* **Verify** spike document delivered with clear architecture recommendation
* **Verify** comparison of 3+ subscription patterns with pros/cons table
* **Verify** authentication and reconnection flow documented
* **Verify** performance estimates included (connections, memory, CPU)
* **Verify** implementation effort estimated in story points
* **Verify** recommendation is actionable (team can start implementation without further research)
```

### Key Annotations

✅ **Spike Purpose:** Investigation and learning, not implementation

✅ **Research Questions:** Clear objectives for the spike

✅ **Output Focused:** Acceptance criteria focus on deliverables (decision doc, estimates)

✅ **Unblocks Future Work:** jira-blocking references follow-up story (PROJ-400) that depends on this decision

---

## Comparison: Good vs. Bad Examples

### GOOD Story: Clear, Specific, Actionable

```markdown
# Frontend: Dashboard: Add Export Button

---

## Description

**Context:**

Users frequently request CSV export of dashboard data for external analysis. This adds export functionality to reduce manual workarounds. Export will include all visible cards' data in table format.

**Requirements:**

* Add Export button to dashboard toolbar
* Export visible card data to CSV format
* Include column headers and timestamps
* Show success/error toast after export

**Technical Notes:**

* Use papaparse library (already available)
* Follow existing export pattern in AssetList component
* CSV file naming: dashboard-{YYYY-MM-DD}-{HH-mm}.csv

---

## Acceptance Criteria

* **Verify** Export button visible in dashboard toolbar
* **Verify** clicking Export downloads a CSV containing all visible card data
* **Verify** CSV column headers match card names on screen
* **Verify** success toast shown after download completes
* **Verify** error toast shown if export fails (e.g., simulate network error)
* **Verify** exported CSV opens correctly in Excel and Google Sheets
* **Verify** works on Chrome, Firefox, and Safari
```

### BAD Story: Vague, Verbose, Unmeasurable

```markdown
# Add Export Functionality

---

## Description

In today's modern business environment, users need flexibility in how they consume and analyze data. Our dashboard should provide comprehensive export capabilities to ensure data accessibility and usability across different tools and platforms.

**Requirements:**

* Make data exportable
* Ensure data quality
* Handle edge cases
* Maintain performance
* Support multiple formats
* Ensure compatibility

**Technical Notes:**

We should use best practices and ensure the implementation is robust and well-tested.

---

## Acceptance Criteria

* **Verify** Export works
* **Verify** Data is correct
* **Verify** Performance is good
```

**Issues:**
- Verbose context (academic tone)
- Vague requirements ("make data exportable")
- No technical specifics (which export format? which library?)
- Unmeasurable criteria ("performance is good")
- Way too short (11 lines)

---

## Common Mistakes to Avoid

1. ❌ **Metadata in body:** Never repeat priority/points in the description
2. ❌ **Code snippets:** Reference patterns, don't paste code
3. ❌ **### headers in body:** Use bold labels only
4. ❌ **Bullet points in Context:** Write as paragraphs
5. ❌ **Vague criteria:** "Make it work" vs. "Verify response time <100ms"
6. ❌ **Step-by-step instructions:** Trust developers to figure out HOW
7. ❌ **Bloated YAML:** Include only fields that have a value — omit `key: null` and `key: []`
8. ❌ **Nested YAML objects:** Flat structure only (jira-field, not jira.field)
9. ❌ **Local file links in body:** Put them in framework-relatedLocal YAML field
10. ❌ **Jira URL shortcuts:** Use full URL, not just PROJ-500
