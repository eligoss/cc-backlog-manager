# Backlog Organization Examples

Real-world scenarios for backlog module operations using TypeScript CLI.

---

## Example 1: Creating a New Story

**Scenario:** ai-backlog-manager creates a new story for Auth0 SSO configuration

### Step 1: Create Ticket with YAML Metadata

**File:** `auth0-sso-configuration.md`

```markdown
---
# Framework metadata
framework-type: story
framework-status: draft
framework-priority: high
framework-milestone: Feb2026

# Jira metadata (null until export)
jira-ticketId: null
jira-url: null
jira-component: "Team: Frontend"
jira-parent: null

# Content metadata
title: "Auth0 SSO Configuration"
labels: [auth, frontend, feature]
assignee: unassigned
storyPoints: 5
---

# Auth0 SSO Configuration

## Description

**AS** a user,
**I WANT** to authenticate via Auth0 SSO,
**SO THAT** I can access the application securely.

### Context

Current authentication uses username/password. This story extends login to support SSO for enterprise customers.

### Acceptance Criteria

* Verify users can initiate SSO login
* Verify SSO redirect to Auth0 works
* Verify callback processes tokens correctly
* Verify user session includes SSO metadata
* Verify error handling for SSO failures
* Verify logout clears SSO session
```

### Step 2: Validate Ticket

**Command:**
```bash
agentic-framework backlog validate
```

**Output:**
```text
Validating tickets...
 auth0-sso-configuration.md
 - framework-type: story
 - jira-component: valid
 - YAML structure: valid

1 ticket validated, 0 errors
```

### Step 3: Push to Jira

**Command:**
```bash
# Dry-run first (validate only)
agentic-framework backlog push --all --dry-run

# Actual push
agentic-framework backlog push --all
```

**AUTO-DETECT Mode:** Since `jira-ticketId: null`, CLI creates NEW Jira issue

**After Export:**
```yaml
---
jira-ticketId: PROJ-1234
jira-url: "https://your-instance.atlassian.net/browse/PROJ-1234"
exportedDate: 2025-12-22
---
```

**File renamed to:** `1234-auth0-sso-configuration.md`

---

## Example 2: Updating Existing Jira Ticket

**Scenario:** Update local ticket and sync changes back to Jira

### Step 1: Modify Ticket Locally

**File:** `1234-auth0-sso-configuration.md`

**Change:** Update acceptance criteria

```yaml
---
jira-ticketId: PROJ-1234 # Existing Jira ID
jira-url: "https://your-instance.atlassian.net/browse/PROJ-1234"
---

# Auth0 SSO Configuration

## Acceptance Criteria

* Verify users can initiate SSO login
* Verify SSO redirect to Auth0 works
* Verify callback processes tokens correctly
* Verify user session includes SSO metadata
* Verify error handling for SSO failures
* Verify logout clears SSO session
* **NEW:** Verify SSO works with multiple identity providers
* **NEW:** Verify SSO domain detection is case-insensitive
```

### Step 2: Push to Jira (UPDATE Mode)

**Command:**
```bash
agentic-framework backlog push --ticket PROJ-1234
```

**AUTO-DETECT Mode:** Since `jira-ticketId: PROJ-1234` exists, CLI updates EXISTING Jira issue

**Result:** Jira ticket PROJ-1234 updated with new acceptance criteria

---

## Example 3: Importing Jira Sprint CSV

**Scenario:** Import a sprint from Jira CSV export

### Step 1: Export from Jira

**Jira Actions:**
1. Navigate to sprint board
2. Select "Sprint 2026-W01"
3. Export as CSV: `sprint-2026-W01.csv`

**CSV Content:**
```csv
Issue key,Summary,Issue Type,Component,Epic Link,Sprint,Story Points
PROJ-1234,"Auth0 SSO Configuration",Story,"Team: Frontend",PROJ-1171,"Sprint W01",5
PROJ-1235,"Implement caching",Task,"Team: Backend",,"Sprint W01",3
```

### Step 2: Run Import CLI

**Command:**
```bash
agentic-framework backlog import --csv sprint-2026-W01.csv
```

**CLI Actions:**
1. Parse CSV file
2. Convert Jira wiki markup → markdown for each ticket
3. Generate YAML frontmatter preserving exact Jira values
4. Create ticket files with Jira ticket number in filename

### Step 3: Output Files

**Story:** `1234-auth0-sso-configuration.md`
```yaml
---
framework-type: story
jira-ticketId: PROJ-1234
jira-component: "Team: Frontend" # Exact from Jira
jira-parent: PROJ-1171
jira-sprint: "Sprint W01"
framework-milestone: Feb2026 # Derived or set via CLI (example)
storyPoints: 5
---
```

**Task:** `1235-implement-caching.md`
```yaml
---
framework-type: task
jira-ticketId: PROJ-1235
jira-component: "Team: Backend"
jira-sprint: "Sprint W01"
storyPoints: 3
---
```

---

## Example 4: Generating Milestone Overview

**Scenario:** Auto-generate milestone overview from ticket metadata

### Step 1: Tickets with Milestone Metadata

**Tickets:**
- `1234-auth0-sso-configuration.md` (framework-milestone: Feb2026)
- `1166-final-drive-support.md` (framework-milestone: Feb2026)
- `1032-migrate-to-api-v2.md` (framework-milestone: Feb2026)
- `1315-fix-shimmer-loading.md` (framework-milestone: Feb2026)

### Step 2: Run Milestone Generation

**Command:**
```bash
agentic-framework backlog migrate-milestones
```

**CLI Actions:**
1. Scan all tickets for `framework-milestone:` field
2. Group tickets by milestone code
3. Count tickets by type and story points
4. Generate milestone overview file

### Step 3: Generated File

**File:** `Feb2026-milestone-overview.md` (or similar)

```yaml
---
framework-milestone: Feb2026
jira-milestone: "My Project - February 2026 - W3 W5 W7" # example format
generatedDate: 2025-12-22
totalTickets: 4
totalStoryPoints: 15
---

# Milestone: Feb2026

## Summary

**Total Tickets:** 4
**Total Story Points:** 15

## Stories (2 tickets, 10 points)
- PROJ-1234 (5 pts): Auth0 SSO Configuration
- PROJ-1166 (5 pts): Final drive divisions support

## Tasks (1 ticket, 3 points)
- PROJ-1032 (3 pts): Migrate to API v2

## Bugs (1 ticket, 2 points)
- PROJ-1315 (2 pts): Fix shimmer loading

## Breakdown by Status
- In Progress: 2 tickets (8 points)
- To Do: 1 ticket (5 points)
- Done: 1 ticket (2 points)
```

---

## Example 5: Batch Validation

**Scenario:** Validate multiple tickets before committing

### Step 1: Run Validation

**Command:**
```bash
agentic-framework backlog validate
```

**Output:**
```text
Validating tickets...

 1234-auth0-sso-configuration.md
 - framework-type: story
 - jira-component: valid
 - YAML structure: valid

 1235-incomplete-ticket.md
 - ERROR: Missing framework-type field
 - ERROR: Invalid jira-component value (must match Jira exactly)
 - WARNING: Missing storyPoints field

 1166-final-drive-support.md
 - framework-type: story
 - jira-component: valid
 - YAML structure: valid

Summary: 2 valid, 1 invalid
```

### Step 2: Fix Errors

**Edit:** `1235-incomplete-ticket.md`

```yaml
---
framework-type: task # Added
jira-component: "Team: Backend" # Fixed to match Jira exactly
storyPoints: 3 # Added
---
```

### Step 3: Re-Validate

**Command:**
```bash
agentic-framework backlog validate
```

**Output:**
```text
Validating tickets...
 All 3 tickets valid
```

---

## Example 6: Git-Like Sync with Jira (Pull/Diff/Push)

**Scenario:** Keep local tickets in sync with Jira using the pull/diff/push workflow

### Step 1: Pull Latest from Jira

**Command:**
```bash
# Fetch all tickets from a specific sprint
agentic-framework backlog pull --sprint "Sprint 2026-W12"
```

**Output:**
```text
Pulling from Jira...
 Created: 1400-new-feature-from-jira.md
 Updated: 1234-auth0-sso-configuration.md (status changed)
 Unchanged: 1235-implement-caching.md

3 tickets synced (1 created, 1 updated, 1 unchanged)
```

### Step 2: Make Local Changes

Edit `1234-auth0-sso-configuration.md` locally:
- Update acceptance criteria
- Change status to `in-progress`

### Step 3: Review Differences

**Command:**
```bash
agentic-framework backlog diff
```

**Output:**
```text
Comparing local vs Jira...

Modified locally:
 PROJ-1234 auth0-sso-configuration
 ~ framework-status: draft → in-progress
 ~ description: acceptance criteria updated

Modified in Jira:
 PROJ-1235 implement-caching
 ~ assignee: unassigned → john.doe

No conflicts detected.
1 ticket modified locally, 1 modified in Jira
```

### Step 4: Push Local Changes to Jira

**Command:**
```bash
# Push a specific ticket
agentic-framework backlog push --ticket PROJ-1234

# Or push all locally modified tickets
agentic-framework backlog push --all
```

**Output:**
```text
Pushing to Jira...
 PROJ-1234: Updated (status, description)

1 ticket pushed successfully
```

### Step 5: Pull Jira-Side Changes

**Command:**
```bash
# Pull to get the Jira-side changes (assignee update)
agentic-framework backlog pull --sprint "Sprint 2026-W12"
```

**Result:** Local tickets now fully in sync with Jira.

---

## CLI Commands Quick Reference

| Task | Command | Example |
|------|---------|---------|
| **Validate tickets** | `backlog validate` | `agentic-framework backlog validate` |
| **Import Jira CSV** | `backlog import --csv <file>` | `agentic-framework backlog import --csv sprint.csv` |
| **Generate milestones** | `backlog migrate-milestones` | `agentic-framework backlog migrate-milestones` |
| **Push to Jira (CREATE/UPDATE)** | `backlog push --ticket <id>` | `agentic-framework backlog push --ticket PROJ-100` |
| **Push all to Jira** | `backlog push --all` | `agentic-framework backlog push --all` |
| **Dry-run push** | `backlog push --all --dry-run` | `agentic-framework backlog push --all --dry-run` |
| **Pull from Jira** | `backlog pull --sprint <name>` | `agentic-framework backlog pull --sprint "Sprint 2026-W12"` |
| **Diff local vs Jira** | `backlog diff` | `agentic-framework backlog diff` |
| **Push to Jira** | `backlog push --ticket <id>` | `agentic-framework backlog push --ticket PROJ-100` |

---

## Workflow Best Practices

### Before Push

1. Create ticket with complete YAML metadata
2. Run `backlog validate` to check format
3. Use `backlog push --all --dry-run` to preview Jira integration
4. Fix any errors reported by validation

### During Push

1. CLI auto-detects CREATE vs UPDATE mode
2. Check CLI output for success/failure
3. Verify `jira-ticketId` and `jira-url` fields updated

### After Push

1. Verify Jira ticket created/updated in Jira UI
2. Check ticket filename updated with Jira number (CREATE mode)
3. Run `backlog validate` to confirm metadata is correct

### Periodic Maintenance

1. Run `backlog migrate-milestones` to update milestone overviews
2. Import Jira sprints via `backlog import` to sync updates
3. Use `backlog pull` / `backlog diff` / `backlog push` for ongoing sync
4. Validate all tickets before major commits

---

## See Also

- **CLI Commands:** [WORKFLOW-PIPELINE.md](WORKFLOW-PIPELINE.md) - Detailed CLI workflow
- **Jira Integration:** [JIRA-SOURCE-OF-TRUTH.md](JIRA-SOURCE-OF-TRUTH.md) - Jira integration principles
- **Validation Rules:** [building-tickets](../building-tickets/SKILL.md) - format specification
- **Naming:** [NAMING-CONVENTIONS.md](NAMING-CONVENTIONS.md) - File naming rules

---

**Note:** All examples use TypeScript CLI commands from the backlog and jira modules. Python scripts from the old framework do NOT exist in the new framework.
