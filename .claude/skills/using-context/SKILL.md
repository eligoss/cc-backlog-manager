---
id: using-context
module: core
name: loading-context-pattern
description: Load context files in layered fashion with registry integration. Use when building agents, updating context loading patterns, or understanding how agents consume business/technical/process knowledge.
scope: generic
applicable-projects: any
capabilities-provided:
  - context-loading-knowledge
# Claude Code v2.1 features - read-only knowledge skill
tools:
  - Read
  - Glob
  - Grep
---

# Loading Context Pattern

## When to Use This Skill

You need to understand **how agents load context** and should:
- Build agents with proper context loading (Required Reading sections)
- Structure agent "Required Reading" sections for clarity and token efficiency
- Reference context files from registry (single source of truth)
- Avoid redundant context reminders throughout agent instructions
- Design frameworks with separated concerns (context vs implementation)
- Review historical context loading patterns

**Example Invocations:**
- "Use loading-context-pattern to add a Required Reading section to my agent"
- "Help me structure context loading for an agent - how do I organize files?"
- "Show me how agents should reference registry in Required Reading sections"
- "I want to improve token efficiency - how do context reminders work?"

---

## Quick Reference

### The Pattern

**Problem:** Agents need context to operate, but repeating "check context files" throughout agent instructions wastes 750-3,000 tokens

**Solution:** Load context once in Required Reading section with:

| Component | Purpose | Size |
|-----------|---------|------|
| **Context Files** | Business/technical/process knowledge | 50-120 tokens |
| **Shared Resources** | Tools, templates, utilities | 40-60 tokens |
| **Registry Reference** | Single source of truth | 20-30 tokens |
| **Total** | Complete context load | 150-250 tokens per agent |

### Standard Structure

Every agent follows this pattern immediately after Purpose:

```markdown
## Required Reading

**Critical:** This agent provides [domain] principles.
The [context-file].md provides YOUR project's specific details.

### Context Files

> **📋 Registry:** Loading matrix in [ai/registry.yml](../registry.yml)

Load these [N] files for [agent-purpose]:

1. **[ai/context/business-[level].md]** - [Brief description]
2. **[ai/context/technical-[level].md]** - [Brief description]
3. **[ai/context/process-[level].md]** - [Brief description]

### Shared Resources

> **📋 Registry:** Shared resources in [ai/registry.yml](../registry.yml)

1. **[ai/shared/resource-name.md]** - [Brief description]
```

---

## Common Patterns

### Pattern 1: Business + Technical Context (Domain Experts)

**Use When:** Agent needs project knowledge to provide specialized expertise

**Structure:**
```markdown
### Context Files

Load these 2 files for [agent-purpose]:

1. **[ai/context/business-advanced.md]** - Product strategy, user personas, market
2. **[ai/context/technical-advanced.md]** - Tech stack, patterns, architecture
```

**Token Budget:** 120-180 tokens (dense knowledge)

### Pattern 2: Lightweight + Intensive (Balanced Learning)

**Use When:** Agent needs some business context but deep technical knowledge

**Structure:**
```markdown
### Context Files

Load these 2 files for [agent-purpose]:

1. **[ai/context/business-basic.md]** - Product overview, core features
2. **[ai/context/technical-advanced.md]** - Architecture, patterns, standards
```

**Token Budget:** 100-160 tokens (balanced)

### Pattern 3: Process-Focused Loading

**Use When:** Agent executes standardized workflows

**Structure:**
```markdown
### Context Files

Load these 2 files for [agent-purpose]:

1. **[ai/context/process-basic.md]** - Development workflow, standards
2. **[ai/context/technical-basic.md]** - Stack overview, conventions
```

**Token Budget:** 80-140 tokens (implementation-focused)

---

## Registry Integration

All context loading references registry.yml as single source of truth:

**Registry Structure:**
```yaml
workflow:
  loading-matrix:
    ai-architect:
      - business-advanced
      - technical-advanced
      - process-basic
    ai-app-developer:
      - business-basic
      - technical-advanced
      - process-basic

shared-resources:
  markdown-formatting: ai/shared/markdown-formatting-guide.md
  agent-evaluation: ai/shared/agent-self-evaluation.md
```

**Why registry-first:**
1. Single source of truth - update once, applies everywhere
2. Enables context dependency tracking
3. Simplifies agent design (just reference registry)
4. Token budgets tracked centrally

**In Agents:** Always link to registry, never duplicate metadata:
```markdown
> **📋 Registry:** Loading matrix defined in [ai/registry.yml](../registry.yml)
> `loading-matrix.ai-architect`
```

---

## Token Efficiency Guidelines

### ✅ DO: One clear statement in Required Reading

```markdown
## Required Reading

**Critical:** This agent provides **generic architecture principles**.
The technical-advanced.md provides **YOUR project's specific patterns**.
Always check context files before designing.
```

**Token cost:** 50-80 tokens (one statement)

### ❌ DON'T: Repeat throughout agent

```markdown
## Section 1
→ Check technical-advanced.md for YOUR project's patterns

## Section 2
→ Check technical-advanced.md for YOUR project's patterns

## Section 3
→ Check technical-advanced.md for YOUR project's patterns
```

**Token cost:** 50-80 tokens × 15-20 reminders = 750-1,600 wasted tokens

### Key Rules

1. **Keep descriptions short:** 3-10 words per file
2. **State once, reference many:** One Required Reading section, reference throughout
3. **Use registry references:** Point to registry rather than duplicating paths
4. **Minimal file lists:** Only include files agent actually needs

**Token Budget Targets:**
- Required Reading section: 150-250 tokens per agent
- Context Files subsection: 80-120 tokens
- Shared Resources subsection: 40-60 tokens
- Agent-specific notes: 30-50 tokens (optional)

---

## See Also

### Deep Dives (Supporting Files)

- **[STANDARDS.md](STANDARDS.md)** - How to structure Required Reading sections in agents, file descriptions, registry integration
- **[EXAMPLES.md](EXAMPLES.md)** - Real-world agent integration examples, before/after comparisons

### Related Skills

- **[using-framework](../using-framework/SKILL.md)** - Framework design patterns with routes/registry separation
- **[building-skills](../building-skills/SKILL.md)** - How to build skills with good structure
- **[building-framework](../building-framework/SKILL.md)** - Framework governance rules

### Reference Files

- **ai/registry.yml** - Single source of truth for loading matrices and context definitions
- **ai/context/** - All context files (organized by type: business, technical, process)
- **ai/shared/** - Shared resources available to all agents
- **ai/framework/framework-governance.md** - Pure Agent Pattern rules

---

**Type:** knowledge (static reference)
**Scope:** generic (reusable across projects with context files)
**Applicable Projects:** any project with framework structure
**Last Updated:** 2025-12-07
