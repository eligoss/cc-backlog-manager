# Agentic Development Framework - Project Overview

## Identity
- **Name:** Agentic Development Framework
- **Version:** 1.4.0
- **Serena Project Name:** agentic-development-framework
- **Group ID (Graphiti):** agentic-development-framework

## Tech Stack
- **Language:** TypeScript (strict mode)
- **Runtime:** Node.js 22+
- **CLI Framework:** Commander.js
- **Testing:** Jest (64% coverage requirement)
- **Package Manager:** npm

## Key Entry Points

### CLI
- **Binary:** framework/cli/bin/agentic-framework
- **Main:** framework/cli/src/cli.ts
- **Commands:** framework/cli/src/commands/

### Modules
- **Manifests:** framework/modules/*/module.json
- **Agents:** .claude/commands/ai-*.md
- **Skills:** .claude/skills/*/

### Registries
- **agents.json:** .claude/registries/agents.json
- **skills.json:** .claude/registries/skills.json
- **discovery-map.json:** .claude/registries/discovery-map.json

## Quick Navigation

To find an agent's implementation:
1. Use `find_symbol` with agent ID pattern
2. Check .claude/commands/ directory

To find a skill:
1. Check .claude/skills/skill-id/
2. Main file is usually SKILL.md

## Related Graphiti Queries
- "What modules exist?" → Module catalog
- "What does ai-architect do?" → Agent details
- "How does discovery work?" → Discovery engine
