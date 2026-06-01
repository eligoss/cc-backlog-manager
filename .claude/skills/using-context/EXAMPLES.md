# Examples: Agent Context Loading Integration

## Example 1: Architecture Agent (ai-architect)

### Problem
Agent needs deep knowledge of both business strategy and technical architecture to design system components.

### Solution

```markdown
## Purpose
Architect designs system components, technical decisions, and integration patterns.
Uses business strategy and technical standards to ensure alignment.

## Required Reading

**Critical:** This agent provides **generic architecture principles**.
The technical-advanced.md provides **YOUR project's specific patterns and tech stack**.
Always check context files before designing components.

### Context Files

> **📋 Registry:** Loading matrix defined in [ai/registry.yml](../registry.yml)
> `loading-matrix.ai-architect`

Load these 3 files for architecture design:

1. **[ai/context/business-advanced.md](../context/business-advanced.md)** - Strategy, roadmap, market positioning
2. **[ai/context/technical-advanced.md](../context/technical-advanced.md)** - Tech stack, patterns, architecture standards
3. **[ai/context/process-basic.md](../context/process-basic.md)** - Development workflow, documentation standards

### Shared Resources

> **📋 Registry:** Shared resources in [ai/registry.yml](../registry.yml)
> `shared-resources`

1. **[ai/shared/markdown-formatting-guide.md](../shared/markdown-formatting-guide.md)** - Documentation formatting standards
2. **[ai/shared/agent-self-evaluation.md](../shared/agent-self-evaluation.md)** - Post-design evaluation framework
```

### Analysis
- **Context mix:** 1 advanced business + 1 advanced technical + 1 basic process
- **Rationale:** Deep knowledge of strategy + tech stack, lightweight workflow knowledge
- **Token budget:** ~210 tokens (balanced expertise)
- **Registry reference:** Directly links to registry, no duplication

---

## Example 2: App Developer Agent (ai-app-developer)

### Problem
Agent implements features but doesn't need deep strategy knowledge. Needs lightweight business understanding with strong technical depth.

### Solution

```markdown
## Purpose
App developer implements features, writes code, and maintains components.
Focuses on technical excellence while understanding business context.

## Required Reading

**Critical:** This agent provides **generic development best practices**.
The technical-advanced.md provides **YOUR project's specific stack and patterns**.
Always check context files before starting implementation.

### Context Files

> **📋 Registry:** Loading matrix defined in [ai/registry.yml](../registry.yml)
> `loading-matrix.ai-app-developer`

Load these 3 files for implementation:

1. **[ai/context/business-basic.md](../context/business-basic.md)** - Product features, core value, users
2. **[ai/context/technical-advanced.md](../context/technical-advanced.md)** - Tech stack, patterns, codebase structure
3. **[ai/context/process-basic.md](../context/process-basic.md)** - Development workflow, documentation standards

**Note:** The ai-app-developer uses 1 basic + 1 advanced + 1 basic files.
This provides lightweight business understanding with deep technical knowledge.
```

### Analysis
- **Context mix:** 1 basic business + 1 advanced technical + 1 basic process
- **Rationale:** Understand features, master technical stack, follow workflow
- **Token budget:** ~190 tokens (implementation-focused)
- **Agent-specific note:** Clarifies WHY this unusual mix exists

---

## Example 3: Before & After Comparison

### ❌ BEFORE: Token Inefficient (750+ wasted tokens)

```markdown
## Architecture Design Process

When designing components, check the technical-advanced.md context to understand
YOUR project's specific patterns. The technical-advanced.md has detailed information
about the tech stack you should know.

## Component Design Decisions

For each component, you should check technical-advanced.md to understand how similar
components are designed in YOUR project. Always reference technical-advanced.md when
making implementation decisions.

## Integration Patterns

When integrating components, you need to check technical-advanced.md for YOUR project's
integration patterns. The technical-advanced.md defines standards for how things work together.

## Testing Strategy

Before testing, check technical-advanced.md for YOUR project's testing standards and
approaches. Reference technical-advanced.md when designing tests.
```

**Problem:** "Check technical-advanced.md" repeated 4+ times = ~50-80 tokens × 5 = 250-400 tokens wasted

### ✅ AFTER: Token Efficient (~50 tokens saved)

```markdown
## Required Reading

**Critical:** This agent provides generic architecture principles.
The technical-advanced.md provides YOUR project's specific patterns and tech stack.
Always check context files before designing components.

### Context Files

Load these 3 files:

1. **[ai/context/business-advanced.md]** - Strategy, roadmap, market positioning
2. **[ai/context/technical-advanced.md]** - Tech stack, patterns, architecture standards
3. **[ai/context/process-basic.md]** - Development workflow, documentation standards

---

## Architecture Design Process

When designing components, consider...
[No reminders needed - context loaded above]

## Component Design Decisions

For each component, ensure...
[Context already loaded in Required Reading]

## Integration Patterns

When integrating components, follow...
[Reference context from Required Reading]

## Testing Strategy

Before testing, design tests that...
[No need to repeat - context established once]
```

**Improvement:** Single context statement at top (50 tokens) vs scattered reminders (250+ tokens) = 200 token savings

---

## Example 4: Shared Resources Only (Lightweight Agent)

### Problem
Agent doesn't need context files, but uses shared tools and templates.

### Solution

```markdown
## Purpose
Operations coordinator manages framework-related tasks and documentation.

## Required Reading

**Critical:** This agent uses shared resources for framework operations.
Check shared resources for templates and procedures.

### Shared Resources

> **📋 Registry:** Shared resources in [ai/registry.yml](../registry.yml)
> `shared-resources`

1. **[ai/shared/markdown-formatting-guide.md]** - Documentation formatting standards
2. **[ai/shared/ticket-template.md]** - Ticket structure template
3. **[ai/shared/validation-checklist.md]** - Quality checklist
```

### Analysis
- **No context files:** Agent doesn't need business/technical/process context
- **Shared resources only:** Uses templates and procedures
- **Token budget:** ~80 tokens (minimal)
- **Use case:** Framework maintenance, coordination, administration

---

## Quick Copy-Paste Templates

### Template 1: Full Context + Shared Resources

```markdown
## Required Reading

**Critical:** This agent provides [domain] principles.
The [context-file].md provides YOUR project's specific [details].

### Context Files

> **📋 Registry:** [ai/registry.yml](../registry.yml) `loading-matrix.[agent-name]`

Load these N files:

1. **[ai/context/business-[level].md]** - [3-10 word description]
2. **[ai/context/technical-[level].md]** - [3-10 word description]
3. **[ai/context/process-[level].md]** - [3-10 word description]

### Shared Resources

> **📋 Registry:** [ai/registry.yml](../registry.yml) `shared-resources`

1. **[ai/shared/resource-name.md]** - [Brief description]
```

### Template 2: Context Only (No Shared Resources)

```markdown
## Required Reading

**Critical:** This agent needs [specific] context.

### Context Files

> **📋 Registry:** [ai/registry.yml](../registry.yml) `loading-matrix.[agent-name]`

1. **[ai/context/business-[level].md]** - [3-10 word description]
2. **[ai/context/technical-[level].md]** - [3-10 word description]
```

### Template 3: Shared Resources Only (No Context Files)

```markdown
## Required Reading

**Critical:** This agent uses shared resources for [purpose].

### Shared Resources

> **📋 Registry:** [ai/registry.yml](../registry.yml) `shared-resources`

1. **[ai/shared/resource-name.md]** - [Brief description]
```

---

**Examples Version:** 1.0
**Last Updated:** 2025-12-07
