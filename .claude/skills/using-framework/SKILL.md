---
id: using-framework
module: core
name: understanding-framework-architecture
description: Understand design patterns for framework organization with separated concerns (routes for navigation, registry for metadata). Use when learning how frameworks are structured, designing new frameworks, or understanding the rationale behind routes/registry separation.
scope: generic
applicable-projects: any
capabilities-provided:
  - framework-architecture-knowledge
# Claude Code v2.1 features - read-only knowledge skill
tools:
  - Read
  - Glob
  - Grep
---

# Understanding Framework Architecture

## When to Use This Skill

You need to understand **framework design patterns** and should:
- Learn why routes and registry are separated (design rationale)
- Understand how routes/registry work together (architecture pattern)
- Design navigation systems for other projects
- Make decisions about framework structure organization
- Understand best practices for maintaining separated navigation/metadata
- Review historical evolution of framework organization patterns

**Example Invocations:**
- "Use understanding-framework-architecture to explain why routes and registry are separate"
- "Help me understand how the routes/registry pattern works"
- "I'm designing a new framework - what can I learn from the routes/registry pattern?"
- "Show me examples of how routes/registry separation improves maintainability"

---

## Quick Reference

### The Pattern

**Problem:** Mixing filesystem navigation with component metadata makes both hard to maintain

**Solution:** Separate concerns into two files:

| Aspect | routes.yml | registry.yml |
|--------|-----------|--------------|
| **Purpose** | Navigation ("where things live") | Configuration ("what things are") |
| **Contains** | Directory paths only | Metadata, dependencies, rules |
| **Updated When** | New folder added | New component added |
| **Used By** | Tools, developers finding files | Agents, systems understanding components |

### Example: Finding Something

```
1. Use routes.yml  → "Where is the agents folder?"
   → agents: ai/agents/

2. Use registry.yml → "What agents exist and what do they load?"
   → agents: { ai-architect: { file: ai-architect.md, context-dependencies: [...] } }
```

---

## Quick Decision Trees

### When Should These Be Separate?

**Question 1:** Do you need to find files?
- YES → You need routes.yml (pure navigation)
- NO → You need registry (metadata only)

**Question 2:** Do you need to understand component relationships?
- YES → You need registry.yml (dependencies, metadata)
- NO → You need routes (just paths)

**Question 3:** Are navigation and metadata changing independently?
- YES → Keep them separate (different update frequencies)
- NO → Could merge (but harder to maintain)

### Decision: Merge or Separate?

```
Should routes and registry be one file or two?

├─ If: Tools need FAST path lookups
│  └─ SEPARATE → registry.yml too heavy for navigation
│
├─ If: Building from scratch
│  ├─ < 20 components → Could merge
│  └─ > 20 components → SEPARATE (grows too large)
│
├─ If: Path format ≠ metadata format
│  └─ SEPARATE → Different structural needs
│
└─ If: Teams maintain separately (frontend vs platform)
   └─ SEPARATE → Different ownership
```

**Typical Recommendation:** SEPARATE (better maintainability, independent evolution)

---

## Common Patterns

### Pattern 1: Pure Navigation (routes.yml)

**Purpose:** Tool discovers where files are
```yaml
paths:
  agents: ai/agents/
  context: ai/context/
  registry: ai/registry.yml
```

**Key:** Simple key-value, fast to parse, no metadata

### Pattern 2: Consolidated Metadata (registry.yml)

**Purpose:** System understands component relationships
```yaml
agents:
  ai-architect:
    file: ai-architect.md
    context-dependencies:
      - business-advanced
      - technical-advanced
    total-context-tokens: 9800
```

**Key:** Complete metadata in one place, single source of truth

### Pattern 3: Workflow Integration

**Purpose:** Loading an agent with full context

```
1. routes.yml tells system WHERE agents live
   → ai/agents/

2. registry.yml tells system WHAT to load
   → File: ai-architect.md
   → Context: [business-advanced, technical-advanced, ...]

3. Combined workflow:
   → Read routes.yml → ai/agents/
   → Read registry.yml → ai-architect.md → Load context
   → Load full agent prompt with context
```

---

## See Also

### Deep Dives (Supporting Files)

- **[ROUTES-REGISTRY-DESIGN.md](ROUTES-REGISTRY-DESIGN.md)** - Complete design rationale, workflow examples, best practices
- **[BEST-PRACTICES.md](BEST-PRACTICES.md)** - How to maintain routes and registry effectively
- **[EXAMPLES.md](EXAMPLES.md)** - Real-world examples, validation patterns, adding new components

### Related Skills

- **[building-skills](../building-skills/SKILL.md)** - How to build skills with good structure
- **[building-framework](../building-framework/SKILL.md)** - Governance rules for framework organization

### Reference Files

- **routes.yml** - Your project's navigation map (implementation)
- **registry.yml** - Your project's metadata catalog (implementation)
- **Framework docs** - Architecture decisions for your specific project

---

**Type:** knowledge (static reference)
**Scope:** generic (reusable across projects)
**Applicable Projects:** any project with framework structure
**Last Updated:** 2025-12-07
