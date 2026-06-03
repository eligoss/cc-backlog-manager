# Discovery Engine Architecture

Complete explanation of the Discovery-Driven Architecture.

---

## Overview

The framework implements **discovery-driven architecture** where agents and skills are loosely coupled through abstract capabilities. Instead of hardcoding skill references, agents declare what capabilities they need, and the Discovery Engine automatically finds and loads matching skills.

**Key Benefits:**
- **Loose Coupling:** Agents and skills evolve independently
- **Single Source of Truth:** `discovery-map.json` defines all capability mappings
- **Fast Discovery:** <50ms per agent
- **Validated Coverage:** Ensures all agent needs have matching skills

---

## How It Works

**Flow: Agent Capability-Needs → Discovery Engine → Skills Auto-Loaded**

```
1. Agent declares in YAML frontmatter:
   capability-needs:
     - framework-governance
     - git-workflow-management

2. Discovery Engine queries discovery-map.json:
   "framework-governance"    → maps to skill "building-framework"
   "git-workflow-management" → maps to skill "committing-code"

3. Skills auto-loaded at agent invocation time
```

---

## Core Components

### Three JSON Registries

| Registry | Purpose |
|----------|---------|
| `agents.json` | Agent metadata with `capability-needs` |
| `skills.json` | Skill metadata with `capabilities-provided` |
| `discovery-map.json` | Capability mappings (single source of truth) |

**Location:** `.claude/registries/` (deployed) / `framework/modules/core/registries/` (source)

### JSON Schemas

**Location:** `framework/modules/core/registries/schemas/`

- `agents.schema.json` — Validates agent registry entries
- `module.schema.json` — Validates module manifests
- `command.schema.json` — Validates CLI command entries

---

## Workflow 1: How Agents Declare Capability-Needs

**Pattern:** Agents declare abstract capabilities in YAML frontmatter, not hardcoded skill references

**Example: ai-architect.md**
```yaml
---
agent: ai-architect
role: System Architect & Technical Design Lead
capability-needs:
  - architecture-design
  - quality-assurance
  - markdown-formatting
token-budget: 15000
---
```

**Process:**
1. Define agent's abstract capabilities (not skill names)
2. Add to agent YAML frontmatter
3. Update `agents.json` with same `capability-needs`
4. Discovery Engine auto-discovers matching skills at runtime

---

## Workflow 2: How Skills Declare Capabilities-Provided

**Pattern:** Skills declare what capabilities they provide in `skills.json`

**Example: skills.json entry**
```json
{
  "id": "building-framework",
  "taxonomy": "meta",
  "capabilities-provided": [
    "framework-governance",
    "pure-agent-validation"
  ],
  "description": "Maintain framework governance, rules, and consistency",
  "location": "framework/modules/core/skills/building-framework/",
  "token-budget": 3500
}
```

**Process:**
1. Define abstract capabilities the skill provides
2. Add to `skills.json` `capabilities-provided` array
3. Map capability in `discovery-map.json`
4. Discovery Engine routes agents needing this capability to this skill

---

## Workflow 3: How Discovery Engine Matches Needs to Skills

**Pattern:** `discovery-map.json` is single source of truth for capability routing

**Example: discovery-map.json entry**
```json
{
  "capability": "framework-governance",
  "description": "Maintain framework rules, governance, and consistency",
  "skills-providing": ["building-framework"],
  "used-by-agents": ["ai-framework-manager"]
}
```

**Discovery Algorithm:**
1. Agent declares: `capability-needs: ["framework-governance"]`
2. Discovery Engine queries `discovery-map.json` for "framework-governance"
3. Finds: `skills-providing: ["building-framework"]`
4. Auto-loads: Skill at `building-framework/SKILL.md`
5. Deduplicates: If multiple agents need same skill, loads once
6. Prioritizes: Skills with multiple `capabilities-provided` loaded first

---

## Workflow 4: How to Validate Capability Coverage

**Pattern:** Ensure all agent `capability-needs` have matching skills

Run `agentic-framework build` to validate:
- All agents in `agents.json` are schema-valid
- All skills in `skills.json` are schema-valid
- All capabilities in `discovery-map.json` are well-formed
- No missing capabilities (needed but not mapped)
- No orphaned capabilities (defined but unused)

```bash
agentic-framework build
```

**When to Run:**
- After creating a new agent (validate capability-needs resolve)
- After creating a new skill (validate mappings exist)
- After updating `discovery-map.json` (validate no broken mappings)
- Before committing framework changes

---

## Workflow 5: How to Add New Capabilities to Framework

**Pattern:** Add capability → Create/update skill → Map in discovery-map.json → Update agents

### Step-by-Step

**1. Define New Capability**
- Identify abstract capability name (e.g., `jira-integration`, `confluence-sync`)
- Use kebab-case, domain-agnostic terminology
- Check existing capabilities in `discovery-map.json` to avoid duplication

**2. Create or Update Skill**
- If new skill needed:
  - Create in `framework/modules/<module>/skills/<id>/SKILL.md`
  - Add to `skills.json` with `capabilities-provided: ["new-capability"]`
- If updating existing skill:
  - Add capability to `capabilities-provided` in `skills.json` and SKILL.md frontmatter

**3. Map Capability in Discovery System**
- Edit `discovery-map.json`, add:
```json
{
  "capability": "new-capability",
  "description": "Brief description of what this capability provides",
  "skills-providing": ["skill-id"],
  "used-by-agents": []
}
```

**4. Update Agents Using Capability**
- Add `new-capability` to agent YAML frontmatter `capability-needs`
- Update `agents.json` with same capability
- Update `discovery-map.json` `used-by-agents` array

**5. Validate**
```bash
agentic-framework build
```

---

**Version:** 2.0.0
**Last Updated:** 2025-12-15
