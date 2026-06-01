---
id: building-agents
name: building-agents
description: Design agents following Pure Agent Pattern. Use when creating new agents or validating existing ones for framework alignment.
scope: apmr
applicable-projects: apm-r-ai-agentic-framework
module: core
capabilities-provided:
  - building-agents
  - agent-design
---

# Slim Agent Design Skill

**Skill:** building-agents
**Taxonomy:** meta
**Scope:** apmr (framework-manager exclusive)
**Token Budget:** 2,000
**Version:** 1.0.0

---

## When to Use

Use this skill when:
- **Creating a new agent** - Design from scratch with agent design principles
- **Verifying existing agent** - Check alignment with agent standards
- **Extracting content** - Move duplicated content from agent to skills
- **Reviewing agent PRs** - Validate agent changes follow agent pattern

This skill is **exclusive to ai-framework-manager** capability-needs.

---

## Core Principles

### 1. Agents are Routing Entry Points

**Purpose:** Orchestration, not content delivery

**Targets:**
- Lines: < 500
- Tokens: < 3,000
- Agent-specific content: > 90%

**Agent responsibility:** Route to skills/context, coordinate workflows, evaluate completion.

**NOT agent responsibility:** Store domain knowledge, provide templates, explain architecture.

---

### 2. Zero Duplication Rule

**If content exists elsewhere, reference it - never duplicate.**

| Content Location | Action |
|------------------|--------|
| Exists in a skill | Reference skill via capability-needs |
| Exists in context | Reference via context-category-needs |
| Exists in docs | Link to docs (never auto-load) |
| Doesn't exist | Create skill or context file first |

**Detection:** Search for 50+ consecutive similar lines across agent files.

---

### 3. Content Classification

| Content Type | Belongs In | Example |
|--------------|------------|---------|
| Domain knowledge | Context files | Business rules, technical patterns |
| Reusable workflows | Skills | Git workflows, validation, formatting |
| Agent orchestration | Agent file | Task routing, evaluation, coordination |
| Examples/templates | Skill supporting files | Code templates, before/after examples |
| Reference docs | docs/ folder | Architecture docs, API references |

**Decision tree:** See [CONTENT-ROUTING.md](./CONTENT-ROUTING.md)

---

### 4. Progressive Disclosure via Skills

**Pattern:**
```
SKILL.md (~300 lines) ← Always loaded
├── EXAMPLES.md ← On-demand
├── PATTERNS.md ← On-demand
└── WORKFLOW.md ← On-demand
```

**Rules:**
- SKILL.md = entry point (< 500 lines)
- Supporting files = loaded only when needed
- Agents reference skills, not inline content
- Total skill budget: 1,500-2,500 tokens

---

### 5. Token Budget Discipline

| Component | Budget | Rationale |
|-----------|--------|-----------|
| Agent file | < 3,000 tokens | Pure routing overhead |
| Individual skill | 1,500-2,500 tokens | Progressive disclosure |
| Agent + auto-loaded skills | < 15,000 tokens | Runtime context limit |
| Total framework | < 25,000 tokens | All context + agents + skills |

**Measurement:** Count tokens in markdown files (rough: lines × 5.5)

---

## Quick Decision Tree

```
Is this content agent-specific orchestration?
├── YES → Keep in agent
│   Examples: Task routing, evaluation checklist, mandatory workflow
│
└── NO → Where does it belong?
    ├── Is it domain knowledge? → Context file
    ├── Is it a reusable workflow? → Skill
    ├── Is it examples/templates? → Skill supporting file
    └── Is it reference documentation? → docs/ folder
```

---

## Slim Agent Template

See [AGENT-TEMPLATE.md](./AGENT-TEMPLATE.md) for complete template with:
- YAML frontmatter structure
- Section ordering
- Token budget allocation per section
- Required vs optional sections

---

## Validation Checklist (Quick)

Before committing agent changes:

- [ ] **Lines:** < 500 lines total
- [ ] **Tokens:** < 3,000 tokens estimated
- [ ] **Duplication:** 0% duplicated content from skills/context
- [ ] **Agent-specific:** > 90% content is orchestration
- [ ] **Skill routing:** All task types route to skills
- [ ] **Discovery:** capability-needs resolve to skills
- [ ] **Context:** context-category-needs defined correctly

**Full validation:** See [VALIDATION-CHECKLIST.md](./VALIDATION-CHECKLIST.md)

---

## Instructions

### Creating a New Agent

1. **Start with template** from [AGENT-TEMPLATE.md](./AGENT-TEMPLATE.md)
2. **Define capability-needs** (what skills this agent requires)
3. **Define context-category-needs** (business/technical/process levels)
4. **Write orchestration content only** (routing, coordination, evaluation)
5. **Validate against checklist** before committing
6. **Update registries** (agents.json, discovery-map.json if new capabilities)

### Verifying Existing Agent

1. **Measure current state** (lines, tokens, duplication %)
2. **Classify each section** using [CONTENT-ROUTING.md](./CONTENT-ROUTING.md)
3. **Identify extraction candidates** (> 50 lines duplicated/non-agent-specific)
4. **Plan extraction** (which skill gets which content)
5. **Execute extraction** (create skill supporting files first)
6. **Restructure agent** (remove duplicated sections, add routing)
7. **Validate result** using [VALIDATION-CHECKLIST.md](./VALIDATION-CHECKLIST.md)

### Extracting Content to Skills

1. **Identify duplicated content** (exists in 2+ agents OR exists in skill)
2. **Choose target skill** based on content type
3. **Create supporting file** in skill directory (e.g., WORKFLOW-AGENT-CREATION.md)
4. **Move content** to supporting file
5. **Add routing reference** in agent (point to skill + supporting file)
6. **Remove duplicated content** from agent
7. **Update skill registry** if token budget changes

---

## Common Patterns

### Pattern 1: Task Routing Table

Replace inline task workflows with routing table:

```markdown
## Skill Routing Table

| Task | Primary Skill | Supporting File |
|------|---------------|-----------------|
| Create Agent | governance skill | AGENT-CREATION-WORKFLOW.md |
| Create Skill | building-skills skill | SKILL-CREATION-WORKFLOW.md |
| Update Governance | governance skill | GOVERNANCE-UPDATE-WORKFLOW.md |
```

### Pattern 2: Capability Reference

Replace inline knowledge with capability reference:

```markdown
## MCP Operations

> **Skill:** Load `using-mcp` for MCP tool guidance
> **Supporting:** See FRAMEWORK-MCP-PATTERNS.md for framework-specific patterns
```

### Pattern 3: Context Reference

Replace inline domain knowledge with context reference:

```markdown
## Architecture Understanding

> **Context:** Auto-loaded via `context-category-needs.technical: advanced`
> **Skill:** For deep architecture patterns, load `understanding-framework-architecture` skill
```

---

## Anti-Patterns

### Anti-Pattern 1: Inline Duplication

**Wrong:**
```markdown
## MCP Tools for Framework Work
[397 lines of MCP documentation that exists in MCP skill]
```

**Right:**
```markdown
## MCP Operations
> **Skill:** `using-mcp`
```

### Anti-Pattern 2: Bloated Agent

**Wrong:** 1,950 lines with 67% duplicated content

**Right:** ~420 lines with 100% agent-specific content

### Anti-Pattern 3: Missing Skill Routing

**Wrong:** Agent handles everything inline

**Right:** Agent routes to skills via capability-needs declaration

---

## Supporting Files

| File | Purpose | Load When |
|------|---------|-----------|
| [AGENT-TEMPLATE.md](./AGENT-TEMPLATE.md) | Complete agent template | Creating new agent |
| [CONTENT-ROUTING.md](./CONTENT-ROUTING.md) | Decision matrix for content placement | Classifying content |
| [VALIDATION-CHECKLIST.md](./VALIDATION-CHECKLIST.md) | Step-by-step validation | Before commit |
| [EXAMPLES.md](./EXAMPLES.md) | Before/after real examples | Learning patterns |

---

## Related Skills

- `building-framework` - Framework rules and governance
- `building-skills` - How to build skills
- `verifying-quality` - Quality validation

---

## Research Foundation

This skill is based on industry best practices:

- **Google Cloud:** "One primary agent maintains context, subagents do actual work"
- **Anthropic:** "Agent Skills are modular capabilities... load information in stages as needed"
- **Microsoft Azure:** "Modular design - agents as composable, specialized entities"
- **UserJot:** "Subagents do one thing well... pure function execution"

---

**Version:** 1.0.0
**Last Updated:** 2025-12-15
**Capabilities Provided:** agent-design, agent-content-routing, agent-validation
