---
context-level: advanced
context-category: business
token-target: 1000
---

# Business Context - Advanced

## Module Ecosystem

### Core Module (Required)
- **Framework Infrastructure** - Discovery engine, routing, validation, version management
- **Shared Skills** - Git workflows, QA standards, markdown formatting, MCP usage
- **Framework Agents** - Framework Manager, Framework Developer (for framework self-development)
- **CLI Foundation** - TypeScript scaffolding commands (init, add, remove, list, validate, routes sync)

### Optional Modules
| Module | Purpose | Key Agents | Primary Use Case |
|--------|---------|------------|------------------|
| **backlog** | Ticket management | Backlog Manager | Creating/managing Jira tickets |
| **coding** | Development | Architect, App Developer | Architecture design, code implementation |
| **planning** | Multi-phase work | Planning Manager | Complex tasks requiring structured phases |
| **jira** | Jira integration | Jira Manager | Direct Jira API operations |
| **confluence** | Documentation | Confluence Manager | Documentation generation/publishing |
| **reporting** | Report generation | Report Manager | Status reports, summaries |

## Feature Deep Dive

### Discovery Engine Mechanics
Agents declare `capability-needs` in YAML frontmatter. Skills declare `capabilities-provided`. At runtime, the discovery engine matches needs to providers without hardcoded dependencies. Example:

```yaml
# Agent frontmatter
capability-needs: [planning, quality-assurance, git-workflow]

# Skills auto-discovered
# - planning-planning-phases (if planning module installed)
# - verifying-quality (from core)
# - committing-code (from core)
```

### Context Loading System
Cumulative loading minimizes tokens while providing depth on demand:
- **Basic** - Essential vocabulary, loaded for all tasks
- **Advanced** - Basic + tactical details for complex implementation
- **Expert** - Basic + Advanced + strategic depth for architectural decisions

Each level adds approximately 500-1500 tokens. Agents request appropriate level based on task complexity.

### Agent Execution Modes
**Interactive** (default):
- User prompts for decisions and clarification
- Full tool access including AskUserQuestion

**Autonomous** (--autonomous flag):
- No user interaction, makes reasonable defaults
- Excludes AskUserQuestion tool
- Uses `permissionMode: acceptEdits` for CI/CD and OpenClaw

## User Workflows

### Initial Setup
1. `agentic-framework init my-project --modules core,coding,planning`
2. Framework scaffolds `ai/` directory with agents, skills, context templates
3. Developer fills context templates (business, technical, process)
4. Framework ready for agent invocation

### Daily Operations
1. Invoke agents via slash commands: `/ai-architect`, `/ai-planning-manager`
2. Agents auto-discover needed skills from installed modules
3. Skills execute specialized tasks (git commits, ticket creation, QA validation)
4. CLI commands handle framework operations (validate, routes sync, bump-version)

### Module Management
- `agentic-framework add jira` - Install Jira module, new capabilities available
- `agentic-framework remove jira` - Uninstall, capabilities removed
- `agentic-framework list` - See installed modules
- `agentic-framework info jira` - View module details

## Integration Patterns

### How Modules Provide Capabilities
Each `module.json` declares:
```json
{
  "capabilities": ["planning", "ticket-management", "quality-assurance"],
  "agents": [...],
  "skills": [...]
}
```

Discovery engine indexes capabilities at load time.

### How Agents Declare Needs
Agent YAML frontmatter:
```yaml
capability-needs:
  - planning
  - git-workflow
```

Discovery engine matches to installed skills providing these capabilities.

### Cross-Module Dependencies
None. Modules are fully independent. Capability-based discovery enables runtime composition without static dependencies.

## Backlog Priorities

### Current Focus (v1.0.x)
- Stability and bug fixes
- Documentation completeness
- Example projects demonstrating patterns
- Community feedback integration

### Near-term (v1.1.x)
- Additional modules (testing, deployment, monitoring)
- Enhanced discovery engine features
- Performance optimizations
- Integration templates

### Long-term (v2.x)
- Multi-repository orchestration
- Advanced delegation patterns
- Framework marketplace for third-party modules
- Enterprise governance features
