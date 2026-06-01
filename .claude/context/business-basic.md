---
context-level: basic
context-category: business
token-target: 500
---

# Business Context - Basic

## Framework Identity

The Agentic Development Framework is a modular, discovery-driven framework for AI-assisted software development. It enables developers to compose intelligent workflows from independent modules, using only what they need.

## Domain Vocabulary

| Term | Definition |
|------|------------|
| **Module** | Independent unit providing agents, skills, CLI commands, and context (e.g., `core`, `jira`, `planning`) |
| **Agent** | AI persona with specific role and responsibilities (e.g., Framework Manager, Architect, Developer) |
| **Skill** | Reusable capability invoked via Skill tool (e.g., `committing-code`, `verifying-quality`) |
| **Capability** | Abstract capability declared by agents (needs) or provided by skills (provides) |
| **Context Level** | Cumulative loading tier: `basic` (~500 tokens), `advanced` (+1000), `expert` (+1500) |
| **Execution Mode** | How an agent runs: `interactive` (with user prompts) or `autonomous` (for CI/CD, OpenClaw) |
| **Discovery Engine** | Runtime system matching agent capability-needs to skill capabilities-provided |
| **Scaffolding** | CLI-driven project initialization with selected modules |

## Core Use Cases

1. **Project Scaffolding** - Initialize new projects with framework structure via `agentic-framework init`
2. **Module Composition** - Add/remove modules to customize capabilities via `add`/`remove` commands
3. **Agent Orchestration** - Invoke specialized agents as slash commands or via Skill tool
4. **Workflow Automation** - Execute CLI commands for framework operations (validate, routes sync, bump-version)
5. **Context Management** - Fill business/technical/process context templates for project-specific knowledge

## Target Users

- **Individual Developers** - Solo practitioners seeking AI-assisted development workflows
- **Development Teams** - Teams standardizing AI-assisted processes and patterns
- **Framework Authors** - Builders creating reusable AI workflow components
- **Enterprise Teams** - Organizations requiring structured, auditable AI development

## Value Propositions

1. **Composability** - Mix and match modules; install only what you need
2. **Portability** - Self-contained structure travels with your repository
3. **Discovery-Driven** - No hardcoded dependencies; capabilities auto-matched at runtime
4. **Token Efficiency** - Context levels and agent variants minimize token usage
5. **Self-Describing** - Framework structure visible to AI; agents understand their environment
6. **Extensibility** - Add custom modules, agents, skills following documented patterns
