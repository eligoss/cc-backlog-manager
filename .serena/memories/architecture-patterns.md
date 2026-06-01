# Architecture Patterns

## Module Pattern

**Location:** framework/modules/*/module.json
**Schema:** framework/modules/core/registries/schemas/module.schema.json

Structure:
```json
{
  "id": "module-name",
  "version": "1.0.0",
  "provides": {
    "agents": [{ "id": "...", "path": "...", "variant": "full|slim" }],
    "skills": [{ "id": "...", "path": "..." }],
    "capabilities": ["..."],
    "cli-commands": ["..."]
  },
  "optional-dependencies": ["core"]
}
```

## Agent Pattern

**Location:** .claude/commands/ai-*.md
**Registry:** .claude/registries/agents.json

YAML Frontmatter:
```yaml
---
agent-id: ai-xxx
variant: full|slim
token-budget: 3000|1000
capability-needs: [...]
context-category-needs:
  business: basic|advanced|expert
  technical: basic|advanced|expert
  process: basic|advanced|expert
essential-skills: [...]
available-skills: [...]
delegates-to: [...] # full only
parent-agent: ai-xxx # slim only
---
```

## Skill Pattern

**Location:** .claude/skills/skill-id/
**Registry:** .claude/registries/skills.json

Structure:
```
.claude/skills/skill-id/
├── SKILL.md           # Main skill content
└── [supporting files]
```

## Discovery Engine Pattern

**Registry:** .claude/registries/discovery-map.json

Flow:
1. Agent declares capability-needs in frontmatter
2. Discovery engine reads discovery-map.json
3. Finds skills-providing that capability
4. Skill auto-loaded as Tier 2

## Context Level Pattern

**Location:** .claude/context/{category}-{level}.md

Categories: business, technical, process
Levels: basic (500 tokens) → advanced (+1000) → expert (+1500)

Loading: Cumulative (expert loads all three levels)
