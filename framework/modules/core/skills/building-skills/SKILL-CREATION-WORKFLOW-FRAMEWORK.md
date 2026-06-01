# Framework Skill Creation Workflow

Specialized workflow for creating skills in the APM-R AI Agentic Framework.

For general skill structure guidance, see [SKILL.md](./SKILL.md).

---

## When to Create a Skill

**Extraction criteria:**
- Content duplicated in 3+ agents
- Content is >200 tokens
- Content is stable (rarely changes)
- Represents a reusable capability

---

## Step 1: Identify Duplication & Define Capability

**Search across all agent files:**
```bash
# Find similar content
grep -r "## {Section Name}" ai/agents/
```

**Calculate duplication cost:**
- Tokens × Number of agents = Total duplicate tokens
- If > 600 tokens (200 × 3), consider extraction

**Define abstract capability name:**
- Use capability naming from existing `discovery-map.json`
- OR create new capability if needed
- Use kebab-case, domain-agnostic terminology

**Examples:**
- `markdown-formatting` (not "format-markdown")
- `quality-assurance` (not "run-quality-checks")
- `git-workflow-management` (not "git-commands")

---

## Step 2: Decide Skill Scope

**Use governance skill's SCOPE-DECISION-TREE.md to decide:**

| Scope | Criteria | Naming |
|-------|----------|--------|
| generic | Works with any project | `generic-{action}-{subject}-{category}` |
| apmr | Specific to this framework | `apmr-{action}-{subject}-{category}` |

**Categories (taxonomies):**
- `meta` - Skills about skills/agents/framework
- `workflows` - Process orchestration
- `guards` - Quality validation
- `knowledge` - Reference information
- `integrations` - External tool integration

---

## Step 3: Create Skill with Progressive Disclosure

**Location:** `ai/skills/{taxonomy}/{scope}-{name}-{category}/`

**Required files:**
- `SKILL.md` - Main entry point (< 500 lines)

**Optional supporting files:**
- `EXAMPLES.md` - Real-world examples
- `PATTERNS.md` - Design patterns
- `WORKFLOWS.md` - Step-by-step workflows
- `ANTI-PATTERNS.md` - What to avoid

**SKILL.md structure:**
```markdown
# {Skill Name}

**Skill:** {id}
**Taxonomy:** {taxonomy}
**Scope:** {scope}
**Token Budget:** {tokens}

---

## When to Use

Use this skill when:
- {Condition 1}
- {Condition 2}

---

## Core Principles / Quick Reference

{Main content - concise}

---

## Instructions

1. {Step 1}
2. {Step 2}
...

---

## Supporting Files

| File | Purpose | Load When |
|------|---------|-----------|
| EXAMPLES.md | Real examples | Learning patterns |
...

---

**Version:** 1.0.0
```

---

## Step 4: Add Skill to Registry

**Edit:** `ai/registries/skills.json`

**Add new skill entry:**
```json
{
  "id": "{scope}-{name}-{category}",
  "name": "{Human-Readable Name}",
  "scope": "generic|apmr",
  "taxonomy": "meta|workflows|guards|knowledge|integrations",
  "file": ".claude/skills/{id}/SKILL.md",
  "description": "{What this skill does - when to use}",
  "capabilities-provided": ["{capability-name}"],
  "use-when": ["{scenario-1}", "{scenario-2}"],
  "usage-hints": {
    "when": ["before-commit", "after-implementation"],
    "workflow-position": "pre-commit|first|early|mid|late|final|on-demand",
    "guidance": "{When/how to use this skill}"
  },
  "token-budget": {tokens}
}
```

**Validate JSON syntax:**
```bash
python3 -m jsonschema -i ai/registries/skills.json ai/registries/schemas/skill.schema.json
```

---

## Step 5: Map Capability in Discovery System

**Edit:** `ai/registries/discovery-map.json`

**Add or update capability mapping:**
```json
"{capability-name}": {
  "skills-providing": ["{skill-id}"],
  "used-by-agents": ["{agent-id-1}", "{agent-id-2}"],
  "description": "{Capability description}"
}
```

This enables auto-discovery: agents declaring this capability-need will auto-load this skill.

---

## Step 6: Update Agents Using Capability-Needs

**For each agent that needs this skill:**

1. Add capability to `capability-needs` in agent YAML frontmatter
2. Remove duplicated inline content from agent markdown
3. Agent will auto-discover skill via Discovery Engine

**Update:** `ai/registries/agents.json` with capability-needs

**Recalculate:** Agent token budgets (should decrease after extraction)

---

## Step 7: Test Auto-Discovery

**Run Discovery Engine for affected agents:**
```bash
python3 src/framework/discovery_engine.py discover {agent-id}
```

**Verify:**
- Skill appears in discovered skills list
- Check audit trail shows correct capability routing

**Run validation:**
```bash
python3 src/framework/discovery_engine.py validate
```

---

## Step 8: Sync to Deployment

**On commit:**
- Pre-commit will auto-sync skill to `.claude/skills/` (via guard_skills_sync.py)
- Pre-commit will validate schemas
- Links will be validated automatically

---

## Validation Checklist

- [ ] Duplication identified (3+ agents or reusable capability)
- [ ] Capability defined (abstract name, not skill name)
- [ ] Skill file created in `ai/skills/{taxonomy}/{id}/`
- [ ] skills.json entry added with capabilities-provided
- [ ] discovery-map.json updated with capability mapping
- [ ] Agents updated with capability-needs (not hardcoded skill references)
- [ ] agents.json updated with capability-needs arrays
- [ ] Discovery engine test passed (all agents auto-discover skill)
- [ ] Schema validation passed
- [ ] Token budgets recalculated
- [ ] All affected agents tested

---

## Common Mistakes

### Mistake 1: Wrong Taxonomy

**Wrong:** Put workflow skill in `meta/` folder

**Right:** Use correct taxonomy:
- `meta` - About framework itself
- `workflows` - Process orchestration
- `guards` - Validation
- `knowledge` - Reference info

### Mistake 2: Hardcoded Agent References

**Wrong:** Skill references specific agent names

**Right:** Skill is generic, agents reference skill via capability-needs

### Mistake 3: Missing Discovery Mapping

**Wrong:** Add skill but forget discovery-map.json

**Right:** Always update discovery-map.json for auto-discovery

---

**Version:** 1.0.0
**Last Updated:** 2025-12-15
