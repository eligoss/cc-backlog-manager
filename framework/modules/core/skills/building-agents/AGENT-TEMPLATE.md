# Slim Agent Template

This template defines the structure for agents that follow routing/orchestration patterns.

---

## YAML Frontmatter (Required)

```yaml
---
agent: ai-{agent-name}
role: {Role Title}
capability-needs:
  - {capability-1}
  - {capability-2}
token-budget: {2000-3000}
---
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `agent` | Yes | Agent identifier (ai-{name} pattern) |
| `role` | Yes | Human-readable role title |
| `framework-version` | Yes | Current framework version |
| `capability-needs` | Yes | Array of capabilities this agent requires |
| `token-budget` | Yes | Target token budget (< 3000) |

---

## Section Structure

### Recommended Order and Budget

| Section | Lines | Tokens | Required |
|---------|-------|--------|----------|
| Title + Purpose | 20-30 | ~150 | Yes |
| Auto-Discovery Note | 5-10 | ~50 | Yes |
| Core Responsibilities | 15-25 | ~120 | Yes |
| Skill Routing Table | 20-30 | ~150 | Yes |
| Agent-Specific Tasks | 100-200 | ~1000 | Yes |
| Success Criteria | 10-20 | ~80 | Yes |
| Self-Evaluation | 10-20 | ~80 | Yes |
| Footer/Metadata | 15-25 | ~100 | Yes |
| **TOTAL** | **~350-420** | **~1850-2350** | — |

---

## Complete Template

```markdown
# {Agent Name} Agent

**Agent:** ai-{agent-name}
**Capability:** {primary-capability}
**Framework:** v12.0 (Discovery-Driven Architecture)
**Version:** 12.0

> **Auto-Discovery:** Required skills are automatically discovered and loaded
> by the Discovery Engine based on this agent's `capability-needs`.
> See [ai/registries/agents.json]({project}/ai/registries/agents.json) and
> [ai/registries/discovery-map.json]({project}/ai/registries/discovery-map.json)
> for capability mappings.

---

## Purpose

{1-2 sentence description of agent purpose}

**Core Responsibilities:**
1. {Responsibility 1}
2. {Responsibility 2}
3. {Responsibility 3}
4. {Responsibility 4}
5. {Responsibility 5}

---

## Skill Routing Table

| Task Category | Primary Skill | Supporting File |
|--------------|---------------|-----------------|
| {Task 1} | `{skill-id}` | {SUPPORTING-FILE.md} |
| {Task 2} | `{skill-id}` | {SUPPORTING-FILE.md} |
| {Task 3} | `{skill-id}` | {SUPPORTING-FILE.md} |

> **Note:** For tasks not listed, check agent's `capability-needs` in
> agents.json - Discovery Engine will auto-load appropriate skills.

---

## Agent-Specific Tasks

### Task: {Task Name 1}

**When:** {When to use this task}

**Workflow:**
1. {Step 1}
2. {Step 2}
3. {Step 3}

**Validation:**
- [ ] {Validation check 1}
- [ ] {Validation check 2}

---

### Task: {Task Name 2}

**When:** {When to use this task}

**Workflow:**
1. {Step 1}
2. {Step 2}
3. {Step 3}

---

## Success Criteria

You are effective when:
- {Criterion 1}
- {Criterion 2}
- {Criterion 3}
- {Criterion 4}

---

## Self-Evaluation

After completing tasks:

1. Did I follow the skill routing table?
2. Did I leverage auto-discovery instead of inline knowledge?
3. Did I validate against success criteria?
4. Did I document any issues or assumptions?

> **Skill:** Use `verifying-quality`
> for complete evaluation protocol

---

**Version:** 12.0
**Token Budget:** {budget} tokens
**Last Updated:** {date}
```

---

## Token Budget Guidelines

### Slim Agent (< 3,000 tokens)

**Characteristics:**
- Pure routing/orchestration
- Skill routing table for all task types
- Minimal inline workflows

**Example agents:** ai-confluence-manager, ai-app-developer

### Standard Agent (3,000-4,000 tokens)

**Characteristics:**
- Some agent-specific workflows
- Skill routing for reusable tasks
- Domain-specific coordination logic

**Example agents:** ai-backlog-manager, ai-framework-developer

### Heavy Agent (4,000-5,000 tokens) - Avoid

**When acceptable:**
- Agent has unique, non-extractable workflows
- Agent coordinates multiple complex systems
- No skill covers the agent's specialty

**Requires justification:** Document why content can't be extracted to skills.

---

## Section Templates

### Purpose Section Template

```markdown
## Purpose

{Agent name} provides {primary capability} by {how it achieves it}.

**Core Responsibilities:**
1. {Action verb} {what} for {whom/what}
2. {Action verb} {what} for {whom/what}
3. {Action verb} {what} for {whom/what}
```

### Skill Routing Table Template

```markdown
## Skill Routing Table

| Task Category | Primary Skill | When to Load |
|--------------|---------------|--------------|
| {Category} | `{skill-id}` | {Trigger condition} |

> **Auto-Discovery:** All skills in `capability-needs` are auto-loaded.
> This table shows which skill handles which task type for clarity.
```

### Agent-Specific Task Template

```markdown
### Task: {Task Name}

**When:** {Specific trigger conditions}

**Prerequisites:**
- {Prerequisite 1}
- {Prerequisite 2}

**Workflow:**
1. {Step with clear action}
2. {Step with clear action}
3. {Step with clear action}

**Validation:**
- [ ] {Measurable validation criterion}
- [ ] {Measurable validation criterion}

> **Skill:** For {related capability}, load `{skill-id}`
```

---

## What NOT to Include

### Never include in agent:

1. **Reusable workflows** - Belongs in skills
2. **Architecture documentation** - Belongs in skills or docs
3. **Code examples** - Belongs in skill supporting files
4. **Reference documentation** - Belongs in docs folder
5. **Duplicated content** - Reference source instead

### Red flags (content to extract):

- Section > 100 lines → Consider extraction
- Content exists in another agent → Extract to skill
- Content is not agent-specific → Move to skill
- Examples and templates → Move to skill supporting file

---

## Validation Before Commit

Before committing a new or modified agent:

1. **Line count:** `wc -l ai/agents/ai-{name}.md` → Must be < 500
2. **Token estimate:** Lines × 5.5 → Must be < 3,000
3. **Duplication check:** Search for similar content in other agents
4. **Routing check:** All task types have skill routing
5. **Discovery check:** `agentic-framework build --verbose`
6. **Link check:** `agentic-framework build`

---

**Version:** 1.0.0
**Last Updated:** 2025-12-15
