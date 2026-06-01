# Agentic Development Framework

A modular, portable framework for AI-assisted software development. Build intelligent workflows with composable modules for coding, documentation, and project management.

## Quick Start

```bash
# Initialize a new project with selected modules
agentic-framework init my-project --modules core,coding,backlog

# Add modules to existing project
agentic-framework add confluence

# List available modules
agentic-framework list
```

## Architecture

```
agentic-development-framework/
├── framework/              # SOURCE (published to npm)
│   ├── core/              # Always required - framework infrastructure
│   ├── modules/           # Optional modules - install as needed
│   │   ├── backlog/      # Ticket-based backlog management
│   │   ├── confluence/   # Confluence documentation
│   │   ├── coding/       # Development agents (architect, developer)
│   │   └── reporting/    # Report generation
│   └── cli/              # TypeScript scaffolding CLI
└── examples/             # Example projects
```

## Available Modules

| Module | Description | Agents | Key Capabilities |
|--------|-------------|--------|------------------|
| **core** | Framework infrastructure (always required) | ai-framework-manager, ai-framework-developer | Governance, versioning, discovery |
| **backlog** | Ticket-based backlog management | ai-backlog-manager | Epic breakdown, sprint planning, Jira sync |
| **confluence** | Confluence documentation | ai-confluence-manager | Page creation, publishing |
| **coding** | Software development | ai-architect, ai-app-developer, ai-ios-developer | Architecture design, implementation, iOS development |
| **reporting** | Report generation | ai-report-manager | Status reports, metrics |

## Module System

Each module is self-contained with its own:
- **Agents** - AI agents with specific roles
- **Skills** - Reusable capabilities and workflows
- **CLI Commands** - TypeScript automation utilities
- **Context** - Domain-specific knowledge templates

### Module Manifest (module.json)

```json
{
  "id": "backlog",
  "version": "1.0.0",
  "name": "Backlog Management",
  "description": "Ticket-based backlog management with epic breakdown",
  "provides": {
    "agents": ["ai-backlog-manager"],
    "skills": ["organizing-backlog", "building-tickets"],
    "capabilities": ["ticket-decomposition", "epic-breakdown", "sprint-planning"]
  },
  "requires": {
    "core": ">=1.0.0"
  },
  "optional-dependencies": []
}
```

## Discovery-Driven Architecture

The framework uses capability-based auto-discovery:

1. **Agents declare needs**: `capability-needs: [organizing-backlog, quality-assurance]`
2. **Skills declare capabilities**: `capabilities-provided: [ticket-decomposition, epic-breakdown]`
3. **Discovery Engine matches**: Automatically loads required skills at runtime

No hardcoded dependencies - modules and skills evolve independently.

## Getting Started

### 1. Initialize Project

```bash
agentic-framework init my-project \
  --modules core,coding,backlog \
  --context-template minimal
```

### 2. Fill Context Templates

Edit the generated context files in `ai/context/`:
- `business-basic.md` - Product overview, user roles
- `technical-basic.md` - Tech stack, architecture
- `process-basic.md` - Workflow, team structure

### 3. Use Agents

Agents are available as slash commands:
```
/ai-architect        # Architecture design
/ai-app-developer    # Code implementation
/ai-ios-developer    # iOS development
/ai-backlog-manager  # Backlog management
```

### 4. Add More Modules

```bash
agentic-framework add confluence
```

## Skill Naming Convention

Skills follow `[module]-[capability]-[type]` pattern:

```
committing-code           # Core: Git operations
verifying-quality         # Core: Quality validation
organizing-backlog        # Backlog: Backlog management
syncing-with-jira         # Backlog: Jira sync workflow
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `init <project> --modules <list>` | Create new project with modules |
| `add <module>` | Add module to existing project |
| `remove <module>` | Remove module from project |
| `list` | List available modules |
| `info <module>` | Show module details |
| `validate` | Validate project configuration |

## Project Structure After Initialization

```
my-project/
├── .claude/
│   ├── commands/           # Agents as slash commands
│   └── skills/             # Skills for Claude
├── ai/
│   ├── agents/             # Agent markdown files
│   ├── skills/             # Skill documentation
│   ├── context/            # Context files (fill these in)
│   └── registries/         # Discovery metadata
├── src/                    # Python automation scripts
├── CLAUDE.md               # Entry point
└── routes.yml              # Filesystem navigation
```

## Portability

This framework is designed to be project-agnostic:

1. **Core module** - Pure infrastructure, no project knowledge
2. **Context templates** - Fill with your project's specifics
3. **Optional modules** - Install only what you need
4. **Capability-based** - Skills auto-discovered, not hardcoded

Use it for any software project - not tied to specific tech stacks or domains.

## Documentation

- [Getting Started](./docs/getting-started.md) - Initialize and manage projects
- [Architecture](./docs/architecture.md) - Framework internals
- [CLI Reference](./docs/cli-reference.md) - Command usage and examples
- [Module Development](./docs/module-development.md) - Creating new modules
- **[CI/CD Setup](./docs/ci-cd-setup.md)** - Continuous integration and deployment
- [Troubleshooting](./docs/troubleshooting.md) - Common issues

## Contributing

1. Fork the repository
2. Create feature branch from `main`
3. Follow module structure patterns
4. Run tests and linter locally (pre-commit hooks will help)
5. Submit pull request (automated checks will run)
6. See [CI/CD Setup](./docs/ci-cd-setup.md) for workflow details

## License

MIT
