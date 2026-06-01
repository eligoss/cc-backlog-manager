# YAML Frontmatter Schema & Examples

## Complete Frontmatter Schema

```yaml
---
# Required Fields (Always Include)
documentType: [required, string]           # guide|epic|story|task|spike|bug|architecture|requirements|other
description: [required, string, max 150]  # Single sentence, clear purpose
tags: [required, array]                    # Keywords for search (3-5 items)
dependencies: [required, array]            # Files needed for context
soft_references: [required, array]         # Related but optional files
audience: [required, array]                # agent|human|mixed

# Optional Fields (Include Only If Relevant)
author: [optional, string]                 # Author name
date: [optional, string]                   # YYYY-MM-DD format
status: [optional, string]                 # draft|in-review|approved|published

# Jira Integration (Include If Applicable)
jira_key: [optional, string]              # PROJECT-123 format
jira_url: [optional, string]              # Full URL to Jira issue
jira_project: [optional, string]          # Project key
issue_type: [optional, string]            # Story|Epic|Task|Bug

# Scope & Organization
scope: [optional, string]                  # Project or framework scope
milestone: [optional, string]              # Release or sprint identifier
team: [optional, string]                   # Team responsible
component: [optional, string]              # Component or module

# Relationships
parent_epic_file: [optional, string]      # Path to parent epic
parent_epic_key: [optional, string]       # Jira key of parent
related_stories: [optional, array]        # Array of related story keys
depends_on: [optional, array]             # Dependencies on other items
blocks: [optional, array]                 # What this item blocks

# Estimation & Priority
story_points: [optional, number]          # 1, 2, 3, 5, 8, 13
priority: [optional, string]              # critical|high|medium|low
labels: [optional, array]                 # Additional tags
---
```

## Field Specifications

### Required Fields

#### documentType
- **Values:** guide, epic, story, task, spike, bug, architecture, requirements, other
- **Description:** Type of document being created
- **Examples:**
  - `documentType: story` - User story or feature request
  - `documentType: guide` - How-to guide or documentation
  - `documentType: architecture` - Architectural decision
  - `documentType: task` - Implementation task
  - `documentType: spike` - Investigation or research

#### version
- **Format:** Semantic versioning (major.minor)
- **Pattern:** `X.Y` (e.g., 1.0, 1.1, 2.0)
- **Rules:**
  - Start at 1.0 for new documents
  - Increment minor (1.0 → 1.1) for updates
  - Increment major (1.1 → 2.0) for significant changes
- **Examples:** 1.0, 1.1, 1.2, 2.0, 2.1

#### description
- **Format:** Single sentence string
- **Max length:** 150 characters
- **Rules:**
  - Start with action verb (if applicable)
  - Clear and concise
  - Summarize document purpose
- **Examples:**
  - "Implement user authentication for dashboard"
  - "Guidelines for markdown formatting in documentation"
  - "Architecture decision for microservices deployment"

#### tags
- **Format:** Array of strings
- **Count:** 3-5 items recommended
- **Naming:** lowercase, hyphen-separated
- **Purpose:** Search and filtering
- **Examples:**
  ```yaml
  tags: [authentication, security, frontend]
  tags: [framework, governance, validation]
  tags: [architecture, scaling, performance]
  ```

#### dependencies
- **Format:** Array of file paths
- **Content:** Paths to files required for context
- **Rules:**
  - Relative paths from repository root
  - Include .md extension
  - Only required files
- **Examples:**
  ```yaml
  dependencies:
    - ai/context/technical-advanced.md
    - framework/architecture-decisions.md
  dependencies: []  # Empty if none
  ```

#### soft_references
- **Format:** Array of file paths
- **Content:** Related files, helpful but not required
- **Rules:**
  - Similar format to dependencies
  - Optional reading
  - For context enhancement
- **Examples:**
  ```yaml
  soft_references:
    - backlog/sprints/2025-W49.md
    - ai/skills/building-skills/EXAMPLES.md
  soft_references: []  # Empty if none
  ```

#### audience
- **Values:** agent, human, mixed
- **agent:** AI agent instructions, technical details
- **human:** End-user documentation, design docs
- **mixed:** Both agents and humans will read
- **Examples:**
  ```yaml
  audience: [agent]          # AI agents only
  audience: [human]          # Humans only
  audience: [agent, human]   # Both
  ```

---

### Optional Fields

#### author
- **Format:** String, author name or team
- **Examples:** "John Doe", "Engineering Team", "PACT Agents"

#### date
- **Format:** ISO 8601 date string (YYYY-MM-DD)
- **Examples:** "2025-12-07", "2025-01-15"
- **Use case:** Document creation or last update date

#### status
- **Values:** draft, in-review, approved, published
- **Examples:**
  - draft - Initial creation
  - in-review - Under review
  - approved - Ready for use
  - published - Live/released

#### jira_key
- **Format:** PROJECT-NUMBER
- **Examples:** APMR-123, PROJ-456
- **Use case:** Link to Jira issue

#### jira_url
- **Format:** Full URL string
- **Example:** `https://jira.company.com/browse/APMR-123`
- **Use case:** Direct link to issue

#### jira_project
- **Format:** Project key string
- **Examples:** APMR, INFRA, DOCS
- **Use case:** Project identifier

#### issue_type
- **Values:** Story, Epic, Task, Bug, Spike, Feature
- **Use case:** Jira issue type categorization

#### scope
- **Format:** String describing scope
- **Examples:** "Framework", "APM-R Project", "Multi-repo"

#### milestone
- **Format:** Release or sprint identifier
- **Examples:** "Q1 2025", "Sprint 12", "v2.0"

#### team
- **Format:** Team name or identifier
- **Examples:** "Platform Team", "Frontend Team", "Architecture"

#### component
- **Format:** Component or module name
- **Examples:** "Authentication", "Dashboard", "API Gateway"

#### parent_epic_file
- **Format:** Relative file path
- **Example:** ai/plans/framework/001-consolidation/PLAN.md

#### parent_epic_key
- **Format:** Jira key format
- **Example:** APMR-100

#### related_stories
- **Format:** Array of Jira keys
- **Example:** [APMR-101, APMR-102, APMR-103]

#### depends_on
- **Format:** Array of Jira keys or file paths
- **Example:** [APMR-50, APMR-51]

#### blocks
- **Format:** Array of Jira keys
- **Example:** [APMR-200, APMR-201]

#### story_points
- **Values:** Fibonacci sequence (1, 2, 3, 5, 8, 13, 21)
- **Use case:** Agile estimation

#### priority
- **Values:** critical, high, medium, low
- **Use case:** Issue prioritization

#### labels
- **Format:** Array of strings
- **Use case:** Additional categorization
- **Examples:** [urgent, technical-debt, refactoring]

---

## Complete Examples

### Example 1: User Story

```yaml
---
documentType: story
description: Implement user authentication for dashboard access
tags: [authentication, security, frontend, priority-high]
dependencies:
  - ai/context/technical-advanced.md
  - framework/architecture-decisions.md
soft_references:
  - backlog/sprints/2025-W49.md
  - ai/agents/ai-architect.md
audience: [agent, human]
jira_key: APMR-123
jira_url: "https://jira.example.com/browse/APMR-123"
jira_project: APMR
issue_type: Story
story_points: 8
priority: high
milestone: Q1 2025
team: Platform Team
component: Authentication
---

# User Authentication for Dashboard

## Overview
Users need secure authentication...
```

### Example 2: Technical Guide

```yaml
---
documentType: guide
description: Best practices for markdown formatting in agent-generated files
tags: [markdown, formatting, standards, documentation]
dependencies: []
soft_references:
  - ai/shared/markdown-formatting-guide.md
audience: [agent]
author: PACT Agents
date: 2025-12-07
status: published
scope: Framework
milestone: v11.1
---

# Markdown Formatting Guide

## Purpose
Define standards for all...
```

### Example 3: Architecture Decision

```yaml
---
documentType: architecture
description: Decision to adopt microservices architecture for scalability
tags: [architecture, design-decision, scalability, infrastructure]
dependencies:
  - framework/current-architecture.md
  - analysis/performance-study.md
soft_references:
  - backlog/architecture-spikes/
audience: [human]
jira_key: APMR-456
jira_project: APMR
date: 2025-12-01
status: approved
parent_epic_key: APMR-400
priority: high
---

# Microservices Architecture Decision

## Context
Current monolithic architecture...
```

### Example 4: Development Task

```yaml
---
documentType: task
description: Update validation script for new frontmatter schema
tags: [framework, development, validation, automation]
dependencies:
  - ai/shared/markdown-formatting-guide.md
  - cli/src/lib/framework/validation.ts
soft_references: []
audience: [agent]
jira_key: APMR-789
jira_project: APMR
issue_type: Task
story_points: 3
priority: medium
milestone: Sprint 12
component: Framework Governance
parent_epic_key: APMR-123
depends_on: [APMR-121, APMR-122]
blocks: [APMR-124]
---

# Update Frontmatter Validation Script

## Objective
Extend validation to support...
```

### Example 5: Minimal Frontmatter (No Optional Fields)

```yaml
---
documentType: guide
description: Quick reference for CLI commands
tags: [cli, reference, tools]
dependencies: []
soft_references: []
audience: [human]
---

# CLI Command Reference

## Available Commands
...
```

---

## Field Combination Examples

### For Jira Integration (All Fields)
```yaml
documentType: story
description: Feature objective
tags: [category, priority]
dependencies: []
soft_references: []
audience: [agent, human]
jira_key: APMR-123
jira_url: "https://jira.example.com/browse/APMR-123"
jira_project: APMR
issue_type: Story
story_points: 5
priority: high
milestone: Q1 2025
team: Team Name
labels: [label1, label2]
```

### For Framework Documentation (Minimal)
```yaml
documentType: guide
description: Documentation objective
tags: [tag1, tag2, tag3]
dependencies: []
soft_references: []
audience: [agent]
```

### For Epic Stories (With Dependencies)
```yaml
documentType: epic
description: Epic overview and goals
tags: [epic, major-feature]
dependencies:
  - related/doc1.md
  - related/doc2.md
soft_references:
  - optional/reference.md
audience: [human]
parent_epic_key: APMR-100
related_stories: [APMR-101, APMR-102]
milestone: Q1 2025
priority: high
```

---

## Validation Rules

- **Required fields:** All 7 must be present
- **Array fields:** Can be empty `[]` but must exist
- **Field count:** Maximum 12 fields total
- **Version format:** Must be semantic (X.Y)
- **Description:** Single sentence, max 150 chars
- **Tags:** 3-5 items recommended
- **Audience:** Must be array (even if single value)

---

**Last Updated:** 2025-12-07
**Schema Version:** 1.0
**Used by:** formatting-markdown-standards skill
