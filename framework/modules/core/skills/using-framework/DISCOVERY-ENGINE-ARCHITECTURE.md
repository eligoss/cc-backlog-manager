# Discovery Engine Architecture

Complete explanation of the Discovery-Driven Architecture in v12.0.

---

## Overview

Framework v12.0 implements **discovery-driven architecture** where agents and skills are loosely coupled through abstract capabilities. Instead of hardcoding skill references, agents declare what capabilities they need, and the Discovery Engine automatically finds and loads matching skills.

**Key Benefits:**
- **Loose Coupling:** Agents and skills evolve independently
- **Single Source of Truth:** discovery-map.json defines all capability mappings
- **Fast Discovery:** <50ms per agent (50% faster than requirement)
- **Validated Coverage:** Ensures all agent needs have matching skills
- **Pure Agent Pattern:** Enforced via JSON schemas (40+ banned terms)

---

## How It Works

**Flow: Agent Capability-Needs → Discovery Engine → Skills Auto-Loaded**

```
1. Agent declares in YAML frontmatter:
   capability-needs:
     - framework-governance
     - git-workflow-management

2. Discovery Engine queries discovery-map.json:
   "framework-governance" → maps to skill "building-framework"
   "git-workflow-management" → maps to skill "committing-code"

3. Skills auto-loaded at agent invocation time
```

---

## Core Components

### 1. Six JSON Registries

Replaced monolithic registry.yml with focused JSON files:

| Registry | Size | Purpose |
|----------|------|---------|
| agents.json | 4.4KB | Agent metadata with capability-needs |
| skills.json | 5.6KB | Skill metadata with capabilities-provided |
| discovery-map.json | 3.1KB | Capability mappings (single source of truth) |
| context.json | 3.2KB | Context file metadata with responsibility schemas |
| deployment.json | 548B | Scripts and MCP server config |
| operations.json | 260B | Jira/Confluence configuration |

### 2. Discovery Engine

**Location:** `src/framework/discovery_engine.py` (615 lines)

Implements 5 architectural patterns:
- **Meta-Controller Pattern:** Coordinates discovery workflow
- **Capability-Based Pattern:** Routes via abstract capabilities
- **Loose Coupling Pattern:** Agents/skills evolve independently
- **Layered Architecture Pattern:** Registry → Discovery → Loading layers
- **Dynamic Composition Pattern:** Runtime skill composition

### 3. JSON Schemas

**Location:** `ai/registries/schemas/` (5 schemas)

- agent.schema.json - Enforces Pure Agent Pattern (40+ banned terms)
- skill.schema.json - Validates skill structure and usage-hints
- discovery-map.schema.json - Validates capability mappings
- context.schema.json - Validates context file metadata
- deployment.schema.json - Validates scripts and MCP config

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
3. Update agents.json with same capability-needs
4. Discovery Engine auto-discovers matching skills at runtime

**Discovery Engine Command:**
```bash
python3 src/framework/discovery_engine.py discover ai-architect
```

**Output:**
```
Agent: ai-architect
Capability Needs: architecture-design, quality-assurance, markdown-formatting

Discovered Skills:
- verifying-quality (quality-assurance)
- validating-markdown (markdown-formatting)
```

---

## Workflow 2: How Skills Declare Capabilities-Provided

**Pattern:** Skills declare what capabilities they provide in skills.json

**Example: skills.json entry**
```json
{
  "id": "building-framework",
  "taxonomy": "meta",
  "capabilities-provided": [
    "framework-governance",
    "pure-agent-validation",
    "context-schema-validation"
  ],
  "description": "Maintain APM-R framework governance, rules, and consistency",
  "location": "ai/skills/meta/building-framework/",
  "token-budget": 3500
}
```

**Process:**
1. Define abstract capabilities the skill provides
2. Add to skills.json `capabilities-provided` array
3. Map capability in discovery-map.json
4. Discovery Engine routes agents needing this capability to this skill

---

## Workflow 3: How Discovery Engine Matches Needs to Skills

**Pattern:** discovery-map.json is single source of truth for capability routing

**Example: discovery-map.json entry**
```json
{
  "capability": "framework-governance",
  "description": "Maintain framework rules, governance, and consistency",
  "skills-providing": [
    "building-framework"
  ],
  "used-by-agents": [
    "ai-framework-manager",
    "ai-framework-developer"
  ]
}
```

**Discovery Algorithm:**
1. Agent declares: `capability-needs: ["framework-governance"]`
2. Discovery Engine queries discovery-map.json for "framework-governance"
3. Finds: `skills-providing: ["building-framework"]`
4. Auto-loads: Skill at [SKILL.md](../building-framework/SKILL.md)
5. Deduplicates: If multiple agents need same skill, loads once
6. Prioritizes: Skills with multiple capabilities-provided loaded first

**Performance:** <50ms per agent discovery (tested with 8 agents, 10 skills, 11 capabilities)

---

## Workflow 4: How to Validate Capability Coverage

**Pattern:** Ensure all agent capability-needs have matching skills

**Discovery Engine Validation Command:**
```bash
python3 src/framework/discovery_engine.py validate
```

**What It Checks:**
- All agents in agents.json are valid
- All skills in skills.json are valid
- All capabilities in discovery-map.json exist
- All agent capability-needs have matching skills in discovery-map
- No orphaned capabilities (defined but unused)
- No missing capabilities (needed but not mapped)

**Example Output:**
```
✅ Validation passed: 18/18 tests
- 8 agents validated
- 10 skills validated
- 11 capabilities mapped
- 6 context files available
- 0 missing capabilities
- 0 orphaned capabilities

Capability Coverage:
- framework-governance: 1 skill → 2 agents
- git-workflow-management: 1 skill → 3 agents
- quality-assurance: 1 skill → 5 agents
- markdown-formatting: 1 skill → 6 agents
[...11 capabilities total...]

Performance: 0.03s (30ms)
```

**When to Run:**
- After creating new agent (validate capability-needs resolve)
- After creating new skill (validate mappings exist)
- After updating discovery-map.json (validate no broken mappings)
- Before committing framework changes (pre-commit validation)
- Weekly health check (ensure coverage complete)

---

## Workflow 5: How to Add New Capabilities to Framework

**Pattern:** Add capability → Create/update skill → Map in discovery-map.json → Update agents

### Step-by-Step

**1. Define New Capability**
- Identify abstract capability name (e.g., "jira-integration", "confluence-sync")
- Use kebab-case, domain-agnostic terminology
- Check existing capabilities in discovery-map.json to avoid duplication

**2. Create or Update Skill**
- If new skill needed:
  - Create in `ai/skills/{taxonomy}/{id}/SKILL.md`
  - Add to skills.json with `capabilities-provided: ["new-capability"]`
- If updating existing skill:
  - Add capability to `capabilities-provided` in skills.json

**3. Map Capability in Discovery System**
- Edit discovery-map.json
- Add new capability entry:
```json
{
  "capability": "new-capability",
  "description": "Brief description of what this capability provides",
  "skills-providing": ["skill-id-1", "skill-id-2"],
  "used-by-agents": []
}
```

**4. Update Agents Using Capability**
- Add `new-capability` to agent YAML frontmatter `capability-needs`
- Update agents.json with same capability
- Update discovery-map.json `used-by-agents` array

**5. Validate Discovery**
```bash
# Test agent discovers new capability
python3 src/framework/discovery_engine.py discover {agent-id}

# Validate all mappings
python3 src/framework/discovery_engine.py validate
```

**6. Commit Changes**
```bash
git add ai/registries/agents.json ai/registries/skills.json ai/registries/discovery-map.json
git commit -m "feat(framework): add {new-capability} capability to discovery system"
```

---

**Version:** 1.0.0
**Last Updated:** 2025-12-15
