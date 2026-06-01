---
context-level: basic
context-category: technical
token-target: 500
---

# Technical Context - Basic

## Tech Stack

- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js 22+
- **CLI Framework**: Commander.js
- **Testing**: Jest with 64% coverage requirement
- **Package Manager**: npm
- **Distribution**: Published to npm as `@agentic-framework/core`

## Architecture Overview

**Modular Discovery-Driven Framework**

The framework uses a plugin-like module system where components discover each other at runtime through capability matching. No hardcoded dependencies between agents and skills.

## Directory Structure

```
framework/                    # SOURCE (published to npm)
├── core/                    # Required infrastructure
│   ├── ai/
│   │   ├── agents/         # Framework management agents
│   │   ├── skills/shared/  # Cross-cutting skills
│   │   └── registries/     # Discovery metadata
│   ├── templates/          # Context templates
│   └── module.json         # Core manifest
├── modules/                # Optional modules
│   ├── backlog/           # Ticket management
│   ├── coding/            # Development agents
│   ├── planning/          # Multi-phase planning
│   ├── jira/              # Jira integration
│   ├── confluence/        # Confluence docs
│   └── reporting/         # Report generation
└── cli/                   # TypeScript CLI commands
```

## Key Patterns

- **Module Pattern**: Self-contained modules with `module.json` manifest
- **Capability Matching**: Runtime discovery of agent-skill relationships
- **Context Levels**: Cumulative loading (basic → advanced → expert)
- **Unified Agents**: Single agent definitions with execution mode determined by invocation

## Development Environment

**Prerequisites:**
- Node.js 22 or higher
- npm (comes with Node.js)
- TypeScript knowledge

**Setup:**
```bash
npm install
npm test          # Run test suite
npm run build     # Compile TypeScript
```

## Core Concepts

**Module**: Self-contained package of agents, skills, CLI commands, and context

**Agent**: AI persona with specific role (e.g., Framework Manager, App Developer)

**Skill**: Reusable capability invoked via Skill tool (e.g., git-workflow, qa-standards)

**Discovery Engine**: Matches agents to skills based on capability declarations

**CLI Commands**: TypeScript automation (init, add, remove, validate, routes sync)
