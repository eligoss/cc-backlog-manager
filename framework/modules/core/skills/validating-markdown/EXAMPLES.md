# Markdown Formatting - Real-World Examples

## Example 1: User Story with Full Metadata

**Scenario:** Creating a user story for Jira with complete frontmatter.

**Before (Incomplete):**
```markdown
# Add User Authentication

Users need to log in to the dashboard.

## Requirements
- Support username/password
- Secure password storage
- Session management

## Acceptance Criteria
- Users can register
- Users can log in
- Sessions expire after 24 hours
```

**After (Properly Formatted):**
```yaml
---
documentType: story
description: Implement user authentication for dashboard access
tags: [authentication, security, frontend, priority-high]
dependencies:
  - ai/context/technical-advanced.md
soft_references:
  - backlog/sprints/2025-W50.md
audience: [agent, human]
jira_key: APMR-123
jira_project: APMR
issue_type: Story
story_points: 8
priority: high
milestone: Q1 2025
---

# Add User Authentication

## Overview

Users need secure authentication to access the dashboard. This story implements
username/password authentication with session management.

## Requirements

- Support username/password login
- Hash passwords securely (bcrypt)
- Implement session tokens (JWT)
- Auto-logout after 24 hours

## Acceptance Criteria

- [x] Users can register account
- [x] Users can log in with credentials
- [x] Invalid credentials rejected
- [x] Sessions expire after 24 hours
- [x] Password reset functionality works

## Dependencies

See [Technical Architecture](../../ai/context/technical-advanced.md) for security patterns.

## Related Work

- [Frontend dashboard](ai-dashboard.md) - Uses auth
- [API security](api-security.md) - Implementation details
```

**Key Improvements:**
- Complete YAML frontmatter with metadata
- Single-sentence description
- Proper markdown headers
- Links use relative paths
- Clean structure with sections

---

## Example 2: Technical Guide Format

**Scenario:** Creating a framework guide with minimal metadata.

**Before:**
```markdown
Markdown Formatting Guide

This guide explains how to format markdown files.

What is YAML?
YAML is a data format...

How to use it:
1. Add at top of file
2. Use standard syntax
```

**After:**
```yaml
---
documentType: guide
description: Standards and practices for markdown formatting in agent-generated files
tags: [markdown, formatting, standards, documentation]
dependencies: []
soft_references:
  - ai/shared/markdown-formatting-guide.md
audience: [agent]
---

# Markdown Formatting Guide

## Overview

This guide establishes standards for all markdown files generated within the framework,
ensuring consistent structure, metadata, and formatting across all agents and systems.

## What is YAML Frontmatter?

YAML (YAML Ain't Markup Language) is a human-readable data format used to store metadata
about documents. Every markdown file MUST include YAML frontmatter at the top.

## How to Add Frontmatter

1. Start file with three hyphens: `---`
2. Add metadata fields (see [schema](../YAML-SCHEMA.md))
3. Close with three hyphens: `---`
4. Add content after closing marker

## Examples

See [Real-world examples](EXAMPLES.md) for detailed formatting samples.

## See Also

- [YAML Schema Reference](YAML-SCHEMA.md) - Complete field specifications
- [Validation Rules](VALIDATION-RULES.md) - Format compliance standards
```

**Key Points:**
- Minimal metadata (no Jira fields)
- Clear section structure
- Links to supporting docs
- Professional tone

---

## Example 3: Architecture Decision with Dependencies

**Scenario:** Documenting a significant architecture decision.

**Formatted Example:**
```yaml
---
documentType: architecture
description: Adopt event-driven architecture for real-time data synchronization
tags: [architecture, design-decision, scalability, events]
dependencies:
  - ai/context/technical-advanced.md
  - analysis/current-architecture.md
soft_references:
  - backlog/architecture-spikes/event-systems.md
audience: [human]
jira_key: APMR-456
jira_project: APMR
priority: high
date: 2025-12-07
status: approved
parent_epic_key: APMR-400
---

# Event-Driven Architecture Decision

## Context

Our current REST-based architecture creates tight coupling between services.
As we scale, we need asynchronous, event-driven communication.

## Problem Statement

Current system limitations:
- Synchronous calls create bottlenecks
- Tight coupling between services
- Difficult to add real-time features
- Poor handling of service failures

## Solution

Implement Apache Kafka for event streaming:

1. **Services publish domain events** to topics
2. **Other services consume events** asynchronously
3. **Event store** maintains audit trail
4. **Saga pattern** coordinates distributed transactions

## Benefits

- ✅ Loose coupling between services
- ✅ Real-time data synchronization
- ✅ Resilient to service failures
- ✅ Complete audit trail via event store
- ✅ Scales to thousands of events/second

## Implementation Plan

See [infrastructure plan](../../ai/plans/framework/kafka-migration/PLAN.md) for details.

## References

- [Technical Architecture](../context/technical-advanced.md)
- [Current Deployment](../context/deployment-guide.md)
```

---

## Example 4: Task with Linked Dependencies

**Scenario:** Development task that depends on other work.

```yaml
---
documentType: task
description: Implement validation script for YAML frontmatter compliance
tags: [development, framework, automation, validation]
dependencies:
  - ai/shared/markdown-formatting-guide.md
  - cli/src/lib/common/validation.ts
soft_references: []
audience: [agent]
jira_key: APMR-789
jira_project: APMR
issue_type: Task
story_points: 3
priority: medium
milestone: Sprint 12
team: Platform
component: Framework
parent_epic_key: APMR-123
depends_on: [APMR-121, APMR-122]
blocks: [APMR-124]
---

# Implement YAML Frontmatter Validator

## Objective

Extend the validation script to check markdown frontmatter for:
- Required fields present
- Field types and formats correct
- No excess metadata fields
- Proper YAML syntax

## Requirements

1. Validate all required fields
2. Check semantic versioning format
3. Ensure arrays are proper format
4. Detect Jira markup in content
5. Report errors with line numbers

## Success Criteria

- Validates 100% of required fields
- Catches invalid documentType values
- Reports detailed error locations
- Provides suggested fixes
- Runs in < 100ms per file

## Implementation Notes

Uses validation utilities from the CLI validation module.
Must integrate with pre-commit hook system.

## Testing

Test against:
- Valid files (should pass)
- Invalid files (should catch errors)
- Edge cases (empty arrays, long descriptions)
```

---

## Example 5: Common Mistakes Corrected

### Mistake 1: Missing Frontmatter

**Before (❌ INVALID):**
```markdown
# My Document

This is content without metadata.
```

**After (✅ VALID):**
```yaml
---
documentType: guide
description: My document purpose
tags: [relevant, tags]
dependencies: []
soft_references: []
audience: [human]
---

# My Document

This is content with proper metadata.
```

### Mistake 2: Invalid Link Formats

**Before (❌ INVALID):**
```markdown
See `ai/agents/ai-architect.md` for details.

Reference [old file](/absolute/path/file.md)

Click [here](this-document#undefined-section)
```

**After (✅ VALID):**
```markdown
See [agent architecture](../agents/ai-architect.md) for details.

Reference [documentation](../../ai/agents/ai-architect.md)

Click [here](#getting-started) [jump to section]
```

### Mistake 3: Mixed Markup Systems

**Before (❌ INVALID):**
```markdown
h3. Using Jira Header

This is {color:red}red text{color} in Jira format.

{panel}
Some panel content
{panel}
```

**After (✅ VALID):**
```markdown
### Using Markdown Header

This is **red emphasis** in markdown format.

> Some important note or blockquote
```

### Mistake 4: Incomplete Metadata

**Before (❌ INVALID):**
```yaml
---
documentType: story
description: This is a very long description that goes on and on explaining in great detail exactly what this story is about and should do and will accomplish when completed
tags: [tag]
---
```

**After (✅ VALID):**
```yaml
---
documentType: story
description: Implement user login feature
tags: [authentication, security, frontend]
dependencies: []
soft_references: []
audience: [agent, human]
---
```

---

## Example 6: Complex Document with All Features

**Scenario:** A comprehensive spike/investigation document.

```yaml
---
documentType: spike
description: Investigate microservices framework options for APM-R platform
tags: [architecture, investigation, microservices, infrastructure]
dependencies:
  - ai/context/technical-advanced.md
  - ai/context/business-advanced.md
soft_references:
  - backlog/architecture-spikes/
audience: [agent, human]
jira_key: APMR-999
jira_project: APMR
issue_type: Spike
story_points: 5
priority: high
milestone: Q1 2025
team: Architecture
date: 2025-12-07
status: in-review
---

# Microservices Framework Investigation

## Executive Summary

This spike investigates three leading microservices frameworks to determine
best fit for APM-R platform scaling requirements.

## Frameworks Evaluated

### 1. Kubernetes with Docker

**Pros:**
- Industry standard
- Excellent ecosystem
- Auto-scaling built-in

**Cons:**
- Operational complexity
- Requires learning curve

See [detailed analysis](./kubernetes-analysis.md)

### 2. Serverless (AWS Lambda)

**Pros:**
- Low operational overhead
- Auto-scaling inherent
- Cost-efficient for variable load

**Cons:**
- Vendor lock-in
- Cold start issues

Reference: [AWS documentation](https://docs.aws.amazon.com/lambda/)

### 3. Service Mesh (Istio)

**Pros:**
- Advanced traffic management
- Fine-grained control
- Observable

**Cons:**
- High complexity
- Resource overhead

## Recommendation

**Result:** Recommend Kubernetes for flexibility and community support.

## Next Steps

1. Create [implementation plan](../../ai/plans/framework/k8s-migration/PLAN.md)
2. Set up test environment
3. Run performance benchmarks
4. Document operational runbooks

## Related Issues

- Depends on: [APMR-998](https://jira/browse/APMR-998)
- Blocks: [APMR-1000](https://jira/browse/APMR-1000)
- Related: [APMR-1001](https://jira/browse/APMR-1001)
```

---

## Quick Reference: Common Patterns

| Scenario | documentType | Audience | Include Jira Fields? |
|----------|--------------|----------|----------------------|
| User story | story | agent, human | Yes |
| Technical doc | guide | agent | No |
| Arch decision | architecture | human | Yes |
| Dev task | task | agent | Yes |
| Investigation | spike | agent, human | Yes |
| Bug report | bug | agent, human | Yes |
| Internal guide | guide | agent | No |

---

## Validation Examples

### Example: Valid File Structure
✅ All checks pass:
```
- YAML frontmatter present ✅
- All required fields ✅
- Proper version format ✅
- Valid documentType ✅
- Links are relative paths ✅
- No Jira markup ✅
- Proper markdown syntax ✅
```

### Example: Multiple Issues Found
❌ Needs fixes:
```
- YAML frontmatter MISSING ❌
- documentType invalid ❌
- version format wrong ❌
- Tags not array ❌
- Links use absolute paths ❌
- Contains Jira markup ❌
```

---

**Last Updated:** 2025-12-07
**Examples Version:** 1.0
**Used by:** formatting-markdown-standards skill
