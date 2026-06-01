# Framework MCP Patterns

Specialized MCP usage patterns for framework management tasks.

---

## Overview

Framework v9.3+ uses **reference MCPs** optimized for framework management tasks. These tools improve efficiency for bulk operations, validation, and complex refactoring.

For comprehensive MCP usage guidance, see [SKILL.md](./SKILL.md).

---

## File System MCP for Framework Work

**Tool:** `@modelcontextprotocol/server-filesystem`

**Purpose:** Advanced file and directory operations for framework reorganization

**Capabilities:**
- Bulk file operations (move, rename, copy)
- Directory tree analysis
- Glob pattern matching
- Safe refactoring with validation
- Cross-file search and replace
- Markdown link validation

### Use Case 1: Bulk File Reorganization

```
Task: "Move all TypeScript files from src/lib/jira/ to new location"

With FS MCP:
1. List all files matching pattern: src/lib/jira/*.ts
2. For each file:
   - Read content to check imports
   - Move to target location
   - Update any path references
3. Validate all imports still resolve
4. Report completion with file list

Result: 20+ files moved safely in seconds vs hours manually
```

### Use Case 2: Framework Structure Analysis

```
Task: "Analyze ai/ directory structure and report token distribution"

With FS MCP:
1. Read directory tree: ai/
2. For each .md file:
   - Count tokens
   - Extract frontmatter metadata
   - Compare to registry budgets
3. Generate report with:
   - Files over budget
   - Optimization opportunities
   - Structure recommendations

Result: Complete token audit in seconds
```

### Use Case 3: Markdown Link Validation

```
Task: "Validate all internal markdown links in framework documentation"

With FS MCP:
1. Find all .md files in ai/, docs/, framework/
2. Extract all markdown links: [text](path)
3. Check if target files exist
4. Report broken links with source locations
5. Suggest fixes

Result: Automated integrity check for framework docs
```

### Use Case 4: Bulk Rename Operation

```
Task: "Rename all agent files from 'pact-*' pattern to 'ai-*' pattern"

With FS MCP:
1. List files matching: ai/agents/pact-*.md
2. For each file:
   - Generate new name: pact-architect.md → ai-architect.md
   - Update internal references within file
   - Move file to new name
3. Find all files referencing old names
4. Update those references
5. Validate no broken links

Result: Safe bulk rename with reference updates
```

**Safety Guidelines:**
- Always preview changes before applying (use `--report` mode)
- Validate after bulk operations using version control
- Use dry-run mode when available
- Rely on git history for rollback

---

## Git MCP for Framework Work

**Tool:** `@modelcontextprotocol/server-git`

**Purpose:** Structured version control operations for framework evolution

**Capabilities:**
- Branch management
- Commit creation with templates
- Diff analysis across files
- Commit history analysis
- Tag creation and management
- Change validation before commit

### Use Case 1: Structured Framework Commit

```
Task: "Create commit for Phase 2 completion with proper changelog format"

With Git MCP:
1. Analyze staged files
2. Generate structured commit message:
   - [Framework vX.Y] Title
   - Phase N: Description
   - Changes section (grouped by file type)
   - Validation results
   - Breaking changes (if any)
3. Validate commit message format
4. Create commit
5. Report commit hash

Result: Consistent, well-formatted framework commits
```

### Use Case 2: Branch Management

```
Task: "Create feature branch for v8.2 planning"

With Git MCP:
1. Validate current branch is clean
2. Create branch: feature/v8.2-planning
3. Set up branch metadata
4. Report branch status

Result: Proper branch structure for framework work
```

### Use Case 3: Change Analysis

```
Task: "Show all framework files changed since v8.0"

With Git MCP:
1. Get diff between v8.0 tag and HEAD
2. Filter to framework files (ai/, framework/)
3. Categorize changes:
   - Agent modifications
   - Registry changes
   - Documentation updates
4. Generate summary report

Result: Clear change overview for version planning
```

### Use Case 4: Version Tag Creation

```
Task: "Create v8.1 tag after Phase 3 completion"

With Git MCP:
1. Validate all phases committed
2. Generate tag message with:
   - Version number
   - Release summary
   - Key changes
   - Validation status
3. Create annotated tag: v8.1
4. Report tag creation

Result: Proper semantic versioning
```

**Integration with Current Workflow:**
- Enhances existing Bash git workflow
- Provides structured operations
- Better error handling
- Validation built-in

---

## Sequential Thinking MCP for Framework Planning

**Purpose:** Extended reasoning for complex framework planning

**Capabilities:**
- Multi-step problem analysis
- Architecture decision evaluation
- Trade-off analysis
- Complex refactoring planning

### Use Case 1: Architecture Decision

```
Task: "Should we split registry.yml into multiple domain files?"

With Sequential Thinking:
1. Analyze current registry.yml structure
2. Evaluate splitting approaches:
   - By domain (agents, context, scripts)
   - By concern (metadata, validation, workflow)
   - Keep unified
3. Consider trade-offs:
   - Maintainability vs complexity
   - Loading performance vs clarity
   - Token usage vs navigation
4. Recommend approach with detailed rationale

Result: Well-reasoned architectural decision
```

### Use Case 2: Framework Refactoring Plan

```
Task: "Design migration from manual routes.yml to automatic discovery"

With Sequential Thinking:
1. Analyze current routes.yml usage
2. Design discovery mechanism
3. Plan migration phases
4. Identify risks and mitigations
5. Define success metrics
6. Create rollback plan

Result: Comprehensive refactoring design
```

### Use Case 3: Token Optimization Strategy

```
Task: "Optimize framework to reduce total token usage by 20%"

With Sequential Thinking:
1. Audit current token distribution
2. Identify optimization opportunities:
   - Duplicate content
   - Overly verbose sections
   - Redundant context
3. Prioritize optimizations by impact
4. Design optimization phases
5. Validate no capability loss

Result: Data-driven optimization plan
```

---

## Memory MCP for Framework History

**Tool:** `@modelcontextprotocol/server-memory`

**Purpose:** Persistent framework knowledge and decision history

**Capabilities:**
- Store framework design decisions
- Remember "why we did it this way"
- Track framework evolution rationale
- Provide historical context

### Use Case 1: Decision Documentation

```
Store: "Why did we separate routes.yml from registry.yml in v4.1?"

Memory:
{
  "decision": "Routes and Registry Separation",
  "version": "v4.1",
  "rationale": "Routes is filesystem navigation (where things live), Registry is metadata (what things are). Separation of concerns improves clarity.",
  "date": "2024-11",
  "alternatives_considered": ["Single unified file", "Discovery-based routing"],
  "trade_offs": "Two files to maintain, but clearer responsibilities"
}
```

### Use Case 2: Architecture Patterns

```
Recall: "What's the pure agent pattern and why do we use it?"

Memory retrieves:
{
  "pattern": "Pure Agent Pattern",
  "version": "v6.0",
  "principle": "Agents contain zero project-specific knowledge. All project knowledge lives in context files.",
  "benefit": "Agents are generic and reusable across any project by changing context files.",
  "validation": "No project names, tech stacks, or specific references in agent files."
}
```

### Use Case 3: Framework Evolution Context

```
Query: "Why did we move from sequential phases to pure capabilities in v6.0?"

Memory provides:
{
  "change": "Sequential to Capabilities Model",
  "version": "v6.0",
  "reason": "Sequential phases (design→plan→build) were artificial. Real work is capability-based. Agents compose based on needs, not forced sequence.",
  "impact": "More flexible, better matches actual workflows",
  "lessons": "Don't force artificial ordering on natural capability composition"
}
```

**Integration with Framework Work:**
- Preserve institutional knowledge
- Onboard new contributors faster
- Avoid re-litigating old decisions
- Maintain consistency across versions

---

## MCP Integration Patterns

### Pattern 1: Framework Reorganization

```
1. FS MCP: Analyze current structure
2. Sequential Thinking: Design optimal structure
3. FS MCP: Preview changes (dry-run)
4. User: Approve changes
5. FS MCP: Execute reorganization
6. FS MCP: Validate all references
7. Git MCP: Create structured commit
8. Memory MCP: Store reorganization rationale
```

### Pattern 2: Version Planning

```
1. Git MCP: Analyze changes since last version
2. FS MCP: Audit framework structure
3. Sequential Thinking: Design version scope
4. Memory MCP: Recall past version decisions
5. Present plan to user
```

### Pattern 3: Quality Validation

```
1. FS MCP: Read all agent files
2. Validate against governance rules
3. Check token budgets from registry
4. Validate markdown links
5. Generate validation report
```

---

## When to Use Each MCP

| MCP | Primary Use Cases |
|-----|-------------------|
| **File System** | Bulk file operations, reorganization, structure analysis, link validation |
| **Git** | Framework commits, branch management, change analysis, version tagging |
| **Sequential Thinking** | Complex architecture decisions, multi-phase planning, trade-off analysis |
| **Memory** | Storing design decisions, recalling framework history, maintaining consistency |

---

**Version:** 1.0.0
**Last Updated:** 2025-12-15
