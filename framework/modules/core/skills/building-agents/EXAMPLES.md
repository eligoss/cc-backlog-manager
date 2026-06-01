# Slim Agent Design Examples

Real-world examples demonstrating agent design patterns.

---

## Example 1: ai-framework-manager Transformation

### Before: Heavy Agent (1,950 lines)

**Metrics:**
- Lines: 1,950
- Tokens: ~10,850
- Duplicated content: 67%
- Agent-specific: 18%

**Content breakdown:**

| Section | Lines | Type | Action |
|---------|-------|------|--------|
| MCP Tools | 397 | Duplicated (skill exists) | REMOVE |
| Discovery Architecture | 307 | Duplicated (skill exists) | REMOVE |
| JSON Registries | 247 | Duplicated (in governance) | REMOVE |
| Task 1: Create Agent | 88 | Reusable workflow | EXTRACT |
| Task 5: Create Skill | 95 | Duplicated (skill exists) | REMOVE |
| Task 6: Governance | 48 | Duplicated (skill exists) | REMOVE |
| Framework Enforcement | 66 | Duplicated (skill exists) | REMOVE |
| Version Management | 59 | Duplicated (skill exists) | REMOVE |
| Purpose & Responsibilities | 26 | Agent orchestration | KEEP |
| Task 2: Optimize Agent | 46 | Agent-specific | KEEP |
| Task 3: Refactor Folder | 54 | Agent-specific | KEEP |
| Task 4: Update Context | 51 | Agent-specific | KEEP |
| Routes Automation | 52 | Agent-specific | KEEP |
| Success Criteria | 30 | Agent orchestration | KEEP |
| Frontmatter/Metadata | 55 | Required | KEEP |
| Navigation | 40 | Routing | KEEP |

### After: Slim Agent (~420 lines)

**Metrics:**
- Lines: ~420
- Tokens: ~2,350
- Duplicated content: 0%
- Agent-specific: 100%

**Structure:**

```markdown
---
agent: ai-framework-manager
role: Framework Manager
capability-needs:
  - framework-governance
  - planning-phases
  - quality-assurance
  - markdown-formatting
  - agent-design
context-category-needs:
  business: advanced
  technical: advanced
  process: advanced
token-budget: 2500
---

# Framework Manager Agent

> **Auto-Discovery:** Required skills are automatically discovered...

## Purpose

Maintain and improve the AI-assisted development framework itself...

**Core Responsibilities:**
1. Design and improve agent architecture
2. Optimize folder structure and file organization
3. Refine context file layering system
...

---

## Skill Routing Table

| Task Category | Primary Skill | Supporting File |
|--------------|---------------|-----------------|
| Create Agent | `building-framework` | AGENT-CREATION-WORKFLOW.md |
| Create Skill | `building-skills` | SKILL-CREATION-WORKFLOW.md |
| MCP Operations | `using-mcp` | FRAMEWORK-MCP-PATTERNS.md |
| Version Management | `apmr-managing-framework-versions-workflow` | SKILL.md |
| Governance | `building-framework` | GOVERNANCE-RULES.md |

---

## Agent-Specific Tasks

### Task: Optimize Existing Agent
[46 lines - unique workflow kept]

### Task: Refactor Folder Structure
[54 lines - unique workflow kept]

### Task: Update Context Files
[51 lines - unique workflow kept]

---

## Success Criteria

- Token budgets maintained or reduced
- Agents remain functional after changes
...

---

## Self-Evaluation

1. Did I follow skill routing table?
2. Did I leverage auto-discovery?
...

---

**Version:** 12.0
**Token Budget:** 2500 tokens
```

### Transformation Summary

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Lines | 1,950 | 420 | -78% |
| Tokens | 10,850 | 2,350 | -78% |
| Duplicated | 67% | 0% | -67% |
| Agent-specific | 18% | 100% | +82% |

---

## Example 2: Content Extraction Pattern

### Before: Inline MCP Documentation

```markdown
## MCP Tools for Framework Work (v9.3+)

### Overview

Framework v9.3+ uses **reference MCPs** optimized for framework management
tasks, available without discovery...

### Available Framework MCPs

#### 1. File System MCP

**Tool:** `@modelcontextprotocol/server-filesystem`

**Purpose:** Advanced file and directory operations...

**Capabilities:**
- Bulk file operations (move, rename, copy)
- Directory tree analysis
...

**Use Case 1: Bulk File Reorganization**
...
[300+ more lines]
```

### After: Skill Reference + Supporting File

**In agent (3 lines):**

```markdown
## MCP Operations

> **Skill:** Load `using-mcp` for MCP tool guidance
> **Supporting:** See FRAMEWORK-MCP-PATTERNS.md for framework-specific use cases
```

**In skill (FRAMEWORK-MCP-PATTERNS.md):**

```markdown
# Framework MCP Patterns

Specialized MCP patterns for framework management tasks.

## File System MCP for Framework Work

### Use Case 1: Bulk File Reorganization
[Full documentation moved here]

### Use Case 2: Framework Structure Analysis
[Full documentation moved here]
...
```

---

## Example 3: Domain Knowledge to Context

### Before: Architecture Explanation in Agent

```markdown
## Discovery-Driven Architecture (v12.0)

### Overview

Framework v12.0 implements **discovery-driven architecture** where agents
and skills are loosely coupled through abstract capabilities...

### How It Works

**Flow: Agent Capability-Needs → Discovery Engine → Skills Auto-Loaded**
...

### Core Components

**1. Six JSON Registries** (replaced monolithic registry.yml)
...
[300+ more lines of architecture explanation]
```

### After: Context/Skill Reference

**In agent (2 lines):**

```markdown
## Architecture Understanding

> **Skill:** For Discovery Engine details, load
> `generic-shared-understanding-framework-architecture-knowledge`
```

**In knowledge skill (DISCOVERY-ENGINE-ARCHITECTURE.md):**

```markdown
# Discovery Engine Architecture

Complete explanation of discovery-driven architecture...

## How It Works
[Full documentation moved here]

## Core Components
[Full documentation moved here]
```

---

## Example 4: Workflow Extraction

### Before: Inline Agent Creation Workflow

```markdown
### Task 1: Create a New Agent

**Workflow (v12.0 Discovery-Driven):**

1. **Define Agent Purpose & Capabilities**
   - What capability does this agent provide?
   - What are core responsibilities?
   - Who is the primary user?
   - What capabilities does it NEED from skills?

2. **Determine Context Requirements**
   - Check agents.json for similar agents
   - Select appropriate levels for each category
   ...

3. **Create Agent File with YAML Frontmatter**
   ```yaml
   ---
   agent: ai-{agent-name}
   ...
   ```

4. **Add Agent to Registry**
   ...

5. **Test Auto-Discovery**
   ...

**Validation:**
- [ ] Agent file created
- [ ] Registry entry added
...
[88 lines total]
```

### After: Skill Routing + Supporting File

**In agent (5 lines):**

```markdown
### Task: Create New Agent

> **Skill:** Use `building-framework`
> **Supporting:** See AGENT-CREATION-WORKFLOW.md for complete workflow

**Quick checklist:**
- [ ] Define capability-needs
- [ ] Create agent file from template
- [ ] Update agents.json
- [ ] Test discovery
```

**In governance skill (AGENT-CREATION-WORKFLOW.md):**

```markdown
# Agent Creation Workflow

Complete workflow for creating new agents in v12.0...

## Step 1: Define Agent Purpose & Capabilities
[Full step documentation]

## Step 2: Determine Context Requirements
[Full step documentation]
...
```

---

## Example 5: Slim vs Heavy Agent Comparison

### Heavy Agent Pattern (Avoid)

```markdown
# Some Agent

## Purpose
[30 lines]

## Detailed Knowledge Section 1
[200 lines of domain knowledge that belongs in context]

## Detailed Knowledge Section 2
[150 lines of architecture that belongs in knowledge skill]

## Complete Workflow 1
[100 lines that exist in workflow skill]

## Complete Workflow 2
[100 lines that exist in another skill]

## More Knowledge
[100 lines duplicated from context]

## Success Criteria
[20 lines]

TOTAL: 700+ lines, 4000+ tokens
```

**Problems:**
- Domain knowledge duplicated from context
- Workflows duplicated from skills
- Agent does content delivery, not orchestration
- High maintenance burden
- Context pollution

### Slim Agent Pattern (Preferred)

```markdown
# Some Agent

## Purpose
[30 lines]

## Skill Routing Table
[25 lines - maps tasks to skills]

## Agent-Specific Task 1
[40 lines - unique coordination logic]

## Agent-Specific Task 2
[40 lines - unique coordination logic]

## Success Criteria
[20 lines]

## Self-Evaluation
[15 lines]

TOTAL: ~170 lines, ~950 tokens
```

**Benefits:**
- Pure routing/orchestration
- Zero duplication
- Easy to maintain
- Clear responsibility
- Efficient context usage

---

## Common Extraction Patterns

### Pattern A: Knowledge → Context

```
BEFORE (in agent):
  ## Business Rules
  [150 lines explaining business domain]

AFTER:
  Agent: context-category-needs.business: advanced
  Content: Moved to context/business-advanced.md
```

### Pattern B: Workflow → Skill

```
BEFORE (in agent):
  ## Git Commit Workflow
  [80 lines explaining git operations]

AFTER:
  Agent: capability-needs: [git-workflow-management]
  Content: Already exists in git workflows skill
```

### Pattern C: Examples → Skill Supporting File

```
BEFORE (in agent):
  ## Examples
  [100 lines of code examples]

AFTER:
  Agent: Reference "See EXAMPLES.md in {skill}"
  Content: Moved to skill/EXAMPLES.md
```

### Pattern D: Reference → Link

```
BEFORE (in agent):
  ## API Documentation
  [200 lines copied from external source]

AFTER:
  Agent: Link to docs/api-reference.md
  Content: Single source in docs folder
```

---

**Version:** 1.0.0
**Last Updated:** 2025-12-15
