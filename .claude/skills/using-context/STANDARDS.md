# Standards: Structuring Required Reading Sections

## Required Reading Section Template

Every agent should have this structure immediately after Purpose:

```markdown
## Required Reading

**Critical:** This agent provides **[domain] principles**.
The [context-file-name].md provides **YOUR project's specific [details]**.
Always check context files before [action].

### Context Files

> **📋 Registry:** Loading matrix defined in [ai/registry.yml](../registry.yml)
> `loading-matrix.[agent-name]`

Load these [N] files for [agent-purpose]:

1. **[ai/context/business-[level].md](../context/business-[level].md)** - [One-line description]
2. **[ai/context/technical-[level].md](../context/technical-[level].md)** - [One-line description]
3. **[ai/context/process-[level].md](../context/process-[level].md)** - [One-line description]

### Shared Resources

> **📋 Registry:** Shared resource definitions in [ai/registry.yml](../registry.yml)
> `shared-resources`

1. **[ai/shared/resource-name.md](../shared/resource-name.md)** - [Brief description]
2. **[ai/shared/another-resource.md](../shared/another-resource.md)** - [Brief description]
```

---

## Rules for Context File Descriptions

### Rule 1: Keep Descriptions Short (3-10 words max)

✅ **GOOD:**
- "Product overview, core features, users"
- "Tech stack, patterns, architecture"
- "Development workflow, documentation standards"

❌ **BAD:**
- "This file contains the complete product overview including all core features available to users and should be reviewed for understanding what the product does"
- "Contains information about the technology stack including architectural patterns used throughout the codebase"

### Rule 2: Use Consistent Format

**Format:** [What it is] + [Why needed] (in 3-10 words)

**Examples:**
- `business-basic.md` - "Product overview, core features, users"
- `technical-advanced.md` - "Tech stack, patterns, codebase structure"
- `process-basic.md` - "Development workflow, documentation standards"

### Rule 3: Describe Purpose, Not Contents

✅ **GOOD:**
- "Architecture decisions and design patterns"
- "User types, personas, market positioning"

❌ **BAD:**
- "Contains 47 lines about architecture"
- "3 paragraphs on users and personas"

---

## Registry Reference Standards

### Rule 1: Always Reference Registry as Single Source of Truth

✅ **GOOD:**
```markdown
> **📋 Registry:** Loading matrix defined in [ai/registry.yml](../registry.yml)
> `loading-matrix.ai-architect`
```

❌ **BAD:**
```markdown
The loading matrix for this agent is:
- business-advanced
- technical-advanced
- process-basic
```

**Why:** Duplicating metadata means updating in two places (DRY violation)

### Rule 2: Link Format Consistency

All registry references follow this format:
```markdown
> **📋 Registry:** [Description] in [ai/registry.yml](../registry.yml)
> `[path-to-section]`
```

**Examples:**
```markdown
> **📋 Registry:** Loading matrix in [ai/registry.yml](../registry.yml)
> `loading-matrix.ai-architect`

> **📋 Registry:** Shared resources in [ai/registry.yml](../registry.yml)
> `shared-resources`

> **📋 Registry:** Token budget in [ai/registry.yml](../registry.yml)
> `token-budgets.ai-architect`
```

### Rule 3: Link Text Clarity

Registry reference lines should clearly state WHAT information is in registry:
- "Loading matrix" (lists which context files)
- "Shared resources" (lists available shared tools)
- "Token budget" (total budget for this agent)

---

## Shared Resources Standards

### Rule 1: Only Include Agent-Specific Resources

✅ **GOOD:** List only resources this agent actually uses
```markdown
### Shared Resources

1. **[ai/shared/markdown-formatting-guide.md]** - Formatting standards
2. **[ai/shared/agent-self-evaluation.md]** - Post-task evaluation
```

❌ **BAD:** List all shared resources
```markdown
### Shared Resources

1. **[ai/shared/markdown-formatting-guide.md]** - Formatting standards
2. **[ai/shared/agent-self-evaluation.md]** - Evaluation
3. **[ai/shared/context-loading-pattern.md]** - Context patterns (not used by this agent)
4. **[ai/shared/ci-best-practices.md]** - CI/CD practices (not relevant)
```

### Rule 2: Brief Descriptions (3-5 words)

✅ **GOOD:**
- "Documentation formatting standards"
- "Post-task evaluation framework"
- "Git workflow procedures"

❌ **BAD:**
- "This file contains comprehensive documentation on formatting standards including rules for headers, lists, code blocks, emphasis, and special formatting conventions"
- "Evaluation framework with detailed instructions on how to evaluate yourself after completing tasks"

---

## Optional Agent-Specific Notes

### When to Include

Include a note ONLY if the agent's loading pattern needs special emphasis:

✅ **Include if:**
- Agent uses unusual mix of basic + advanced (e.g., 1 basic + 2 advanced)
- Agent needs to clarify WHY specific files are loaded
- Agent has unique context dependencies

❌ **Don't include if:**
- Standard loading pattern (3 files, 1 of each type)
- Note would just repeat what files list already says

### Format

```markdown
**Note:** The [agent-name] agent uses [N] basic + [N] advanced context files.
This provides [explain balance/rationale].
```

**Example:**
```markdown
**Note:** The ai-app-developer agent uses 1 basic + 1 advanced + 1 basic
context file (business-basic, technical-advanced, process-basic).
This provides lightweight business understanding with deep technical knowledge.
```

---

## File Description Examples by Category

### Business Context Descriptions

**business-basic.md:**
- "Product overview, core features, users"
- "What we build, who uses it, core value"
- "Product strategy, market positioning"

**business-advanced.md:**
- "Detailed product roadmap, user personas, metrics"
- "Strategic goals, competitive analysis, market data"
- "Business model, revenue, growth metrics"

### Technical Context Descriptions

**technical-basic.md:**
- "Tech stack overview, project structure"
- "Main technologies, folder layout, conventions"
- "Technology choices and setup"

**technical-advanced.md:**
- "Architecture patterns, design decisions, codebase structure"
- "Implementation patterns, best practices, optimization approaches"
- "Deep technical standards and conventions"

### Process Context Descriptions

**process-basic.md:**
- "Development workflow, documentation standards"
- "How we build, write code, document work"
- "Development procedures, standards, conventions"

**process-advanced.md:**
- "Advanced workflows, performance optimization, testing strategies"
- "Complex procedures, edge cases, escalation processes"
- "Advanced development practices and procedures"

---

## Validation Checklist

Before finalizing Required Reading section:

- [ ] Registry reference points to correct YAML path
- [ ] All file descriptions are 3-10 words max
- [ ] No file is duplicated in multiple sections
- [ ] Shared Resources only lists files agent actually uses
- [ ] Links to context files use correct relative path
- [ ] One-line critical statement explains context relationship
- [ ] Optional note (if present) adds clarity, not redundancy
- [ ] Token budget for section is 150-250 tokens total

---

**Standards Version:** 1.0
**Last Updated:** 2025-12-07
