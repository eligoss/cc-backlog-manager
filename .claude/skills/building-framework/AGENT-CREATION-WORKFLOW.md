# Agent Creation Workflow

Complete workflow for creating new agents in v12.0 Discovery-Driven Architecture.

---

## When to Use

Use this workflow when:
- Creating a brand new agent
- Converting an external prompt into a framework agent
- Rebuilding an agent from scratch

---

## Step 1: Define Agent Purpose & Capabilities

**Questions to answer:**
- What capability does this agent provide?
- What are the core responsibilities (5-9 items)?
- Who is the primary user?
- What capabilities does it NEED from skills? (for capability-needs)

**Output:** Clear purpose statement and list of required capabilities

---

## Step 2: Determine Context Requirements

Check `ai/registries/agents.json` for similar agents as reference.

**Select appropriate levels for each category:**

| Level | Business | Technical | Process |
|-------|----------|-----------|---------|
| none | No business knowledge needed | No technical knowledge needed | No process knowledge needed |
| basic | Core business concepts | Architecture overview | Standard workflows |
| advanced | Detailed use cases, personas | Detailed patterns, APIs | Complex processes |
| expert | Full domain knowledge | Complete technical depth | All process edge cases |

Discovery Engine will auto-load matching context files from context.json.

---

## Step 3: Create Agent File with YAML Frontmatter

**Location:** `ai/agents/ai-{agent-name}.md`

**Template:**
```yaml
---
agent: ai-{agent-name}
role: {Role Title}
capability-needs:
  - {capability-1}
  - {capability-2}
context-category-needs:
  business: basic|advanced|expert
  technical: basic|advanced|expert
  process: basic|advanced|expert
token-budget: {estimated-tokens}
---

# {Agent Name} Agent

**Agent:** ai-{agent-name}
**Capability:** {primary-capability}
**Framework:** v12.0 (Discovery-Driven Architecture)

> **Auto-Discovery:** Required skills are automatically discovered and loaded
> by the Discovery Engine based on this agent's `capability-needs`.

---

## Purpose

{Purpose statement}

**Core Responsibilities:**
1. {Responsibility 1}
2. {Responsibility 2}
...

---

## Skill Routing Table

| Task Category | Primary Skill | Supporting File |
|--------------|---------------|-----------------|
| {Task 1} | `{skill-id}` | {file.md} |
...

---

## Agent-Specific Tasks

### Task: {Task Name}
...

---

## Success Criteria

- {Criterion 1}
...

---

## Self-Evaluation

1. Did I follow skill routing?
...

---

**Version:** 12.0
**Token Budget:** {tokens}
```

**Guidelines:**
- Fill in purpose and core responsibilities
- Add agent-specific workflows (unique to this agent)
- Add auto-discovery note
- Add self-evaluation checklist
- Keep under 500 lines

---

## Step 4: Add Agent to Registry

**Edit:** `ai/registries/agents.json`

**Add new agent entry:**
```json
{
  "id": "ai-{agent-name}",
  "role": "{Role Title}",
  "file": "ai/agents/ai-{agent-name}.md",
  "description": "{Purpose}",
  "use-case": "{When to use}",
  "token-budget": {tokens},
  "capability-needs": ["{capability-1}", "{capability-2}"],
  "context-category-needs": {
    "business": "basic|advanced|expert",
    "technical": "basic|advanced|expert",
    "process": "basic|advanced|expert"
  }
}
```

**Validate JSON syntax:**
```bash
agentic-framework validate
```

---

## Step 5: Test Auto-Discovery

**Run Discovery Engine:**
```bash
agentic-framework validate --verbose
```

**Verify:**
- Correct skills are discovered
- Correct context files are discovered
- Check audit trail for capability routing

**Example output:**
```
Agent: ai-{agent-name}
Capability Needs: {capability-1}, {capability-2}

Discovered Skills:
- {skill-1} ({capability-1})
- {skill-2} ({capability-2})

Context Files Auto-Loaded:
- business-{level}: [files...]
- technical-{level}: [files...]
- process-{level}: [files...]
```

---

## Step 6: Validate Discovery Coverage

**Run:**
```bash
agentic-framework validate
```

**Ensure:**
- All capability-needs have matching skills in discovery-map.json
- If missing capabilities, either:
  - Add new skill to framework
  - OR adjust capability-needs to use existing capabilities

---

## Step 7: Update Documentation

**Update README.md:**
- Add to agent table
- Add to agent list
- Document when to use this agent

---

## Step 8: Pre-commit Validation

**On commit, hooks will:**
- Auto-sync agent to `.claude/commands/` (via `agentic-framework sync --agents`)
- Validate schemas (via `agentic-framework validate`)
- Check links (via `agentic-framework validate --links`)

---

## Validation Checklist

Before committing new agent:

- [ ] Agent file created in `ai/agents/` with YAML frontmatter
- [ ] Registry entry added to agents.json with complete schema
- [ ] capability-needs all resolve to skills (validated via discovery engine)
- [ ] context-category-needs resolve to context files
- [ ] Token budget under framework limits (< 3000 for agents)
- [ ] Discovery engine test passed
- [ ] Schema validation passed
- [ ] README.md updated
- [ ] Tested with real scenario

---

## Common Mistakes

### Mistake 1: Hardcoding Skill References

**Wrong:**
```markdown
## Required Skills
Load `committing-code` first...
```

**Right:**
```yaml
capability-needs:
  - git-workflow-management
```
Discovery Engine handles loading.

### Mistake 2: Inline Duplication

**Wrong:** Copy workflow from another agent

**Right:** Create skill or reference existing skill via capability-needs

### Mistake 3: Missing Registry Entry

**Wrong:** Create agent file without updating agents.json

**Right:** Always update agents.json FIRST (source of truth)

---

**Version:** 1.0.0
**Last Updated:** 2025-12-15
