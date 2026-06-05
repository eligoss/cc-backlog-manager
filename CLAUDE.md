# Agentic Development Framework - Entry Point

Framework Version: **v1.0.0** | Architecture: **Modular Discovery-Driven**

## What is This?

A modular framework for AI-assisted software development. Compose intelligent workflows from independent modules - use only what you need.

## Documentation Index

| Topic | Document | Use When |
|-------|----------|----------|
| Getting Started | [docs/getting-started.md](docs/getting-started.md) | Initialize/manage projects |
| Architecture | [docs/architecture.md](docs/architecture.md) | Understanding internals |
| CLI Commands | [docs/cli-reference.md](docs/cli-reference.md) | Command usage & examples |
| Module Development | [docs/module-development.md](docs/module-development.md) | Creating new modules |
| **CI/CD Pipeline** | [docs/ci-cd-setup.md](docs/ci-cd-setup.md) | Understanding automated workflows |
| **Telemetry** | | |
| → Quick Feature Overview | [docs/telemetry-mcp-agent-feature.md](docs/telemetry-mcp-agent-feature.md) | New to telemetry? Start here |
| → Practical Guide | [docs/telemetry-guide.md](docs/telemetry-guide.md) | Step-by-step usage examples |
| → Technical Reference | [docs/telemetry.md](docs/telemetry.md) | API docs & advanced features |
| Troubleshooting | [docs/troubleshooting.md](docs/troubleshooting.md) | Common issues |

## Navigation

This is a focused, four-module framework — navigate it natively. Use normal code search (Glob/Grep/Read) and the registries to find things; there is no "don't explore" mandate.

- **Project knowledge** — invoke the `knowing-the-codebase`, `knowing-the-domain`, and `knowing-backlog` skills for project-specific context.
- **External references** — consult `references.yml` for curated links to external docs, APIs, and related codebases.
- **Framework metadata** — registry files in `framework/modules/core/registries/` describe agents, skills, and capabilities.
- **Operations** — prefer CLI commands for framework operations rather than editing generated files by hand.

## MCP Integration (Required)

This project uses **Graphiti** (knowledge graph) and **Serena** (semantic code analysis) MCPs for enhanced AI-assisted development.

### Session Start (Do First)

1. **Activate Serena:**
   ```
   activate_project("agentic-development-framework")
   ```

2. **Search Graphiti for context:**
   ```
   search_memory_facts(query="project architecture", group_ids=["agentic-development-framework"])
   search_nodes(query="modules capabilities", group_ids=["agentic-development-framework"])
   ```

### During Work

| Task | Use This | Not This |
|------|----------|----------|
| Find files by pattern | Serena `list_dir`, `find_file` | Glob |
| Search code content | Serena `search_for_pattern` | Grep |
| Understand file structure | Serena `get_symbols_overview` | Read full file |
| Read specific function | Serena `find_symbol` with `include_body=true` | Read full file |
| Check project context | Graphiti `search_memory_facts` | Re-explore codebase |

### Session End

Save key learnings to Graphiti:
```
add_memory(
  name="Session: <topic>",
  episode_body="<findings, decisions, discoveries>",
  group_id="agentic-development-framework"
)
```

### Configuration

- **Serena Project Name:** `agentic-development-framework`
- **Graphiti Group ID:** `agentic-development-framework`
- **Serena Memories:** `.serena/memories/` (5 code pattern files)

**CLI Commands Available** (`agentic-framework <command>`):

| Command | Purpose |
|---------|---------|
| `init` | Initialize new project with framework |
| `add` / `remove` | Add or remove modules |
| `list` / `info` | List modules or show module details |
| `build` | Validate framework artifacts (schema + markdown links) |
| `status` | Show framework status |
| `backlog pull` | Fetch tickets from Jira REST API to local markdown |
| `backlog diff` | Compare local ticket state against Jira remote |
| `backlog push` | Push local ticket changes to Jira |

## Quick Navigation

```
framework/              # SOURCE (published to npm)
├── modules/           # All modules (all optional)
│   ├── core/         # Framework infrastructure (optional, recommended)
│   │   ├── agents/   # Framework management agents
│   │   ├── skills/   # Shared skills (git, qa, markdown, mcp, knowledge)
│   │   ├── registries/ # Discovery metadata & schemas
│   │   └── templates/  # Scaffolding templates
│   ├── backlog/      # Ticket management
│   ├── coding/       # Development agents
│   └── confluence/   # Confluence documentation
└── cli/              # TypeScript scaffolding CLI
```

**Note:** Core module is optional. Install only the modules you need:
- **With core:** Full functionality including framework management agents and shared skills
- **Without core:** Minimal setup with just domain-specific modules (shared skills unavailable)

## Using the Framework

### As Slash Commands

Agents are available as `/commands`:
- `/ai-framework-manager` - Framework architecture, governance, and orchestration
- `/ai-architect` - Architecture design (if coding module installed)
- `/ai-app-developer` - Code implementation (if coding module installed)
- `/ai-backlog-manager` - Backlog planning, ticket creation (if backlog module installed)

### As Skills

Skills are invoked via the Skill tool:
- `committing-code` - Git operations
- `verifying-quality` - Quality validation
- `validating-markdown` - Markdown standards
- `gathering-intelligence` - Parallel scout dispatch for enriched context

### CLI Commands as Slash Commands

CLI commands are also available as slash commands (e.g., `/cmd-backlog-create-ticket`). See [CLI Reference](docs/cli-reference.md) for full command list.

## Module System

Each module provides:
- **Agents** - AI agents with specific roles
- **Skills** - Reusable capabilities (including `knowing-*` knowledge skills for project context)
- **CLI Commands** - TypeScript automation

Check `module.json` in each module directory for capabilities.

## Skill-CLI Integration

Skills declare CLI commands they provide, making skills executable and not just instructional. This bridges AI guidance with automation.

| Type | Purpose | Example |
|------|---------|---------|
| **create** | Generate artifacts from templates | `backlog create-ticket` |
| **validate** | Check structure and content | `backlog validate`, `backlog diff` |
| **sync** | Bidirectional sync with external systems | `backlog pull`, `backlog push` |

When a skill instructs you to use a CLI command, execute it via the CLI. See [CLI Reference](docs/cli-reference.md) for command details and examples.

## Discovery Engine

The framework uses a **three-tier skill loading model**:

| Tier | Name | Loading | Configuration |
|------|------|---------|---------------|
| **Tier 1** | Essential | Pre-loaded | `essential-skills` in agent frontmatter |
| **Tier 2** | Role-Based | Auto-discovered | `capability-needs` in agent frontmatter |
| **Tier 3** | Available | On-demand | `available-skills` in agent frontmatter |

Agent prompts include a **Skill Routing Table** showing all tiers. For details on how discovery works, see [Architecture](docs/architecture.md).

### Project Knowledge

Project-specific context lives in three on-demand **knowledge skills**, not context files:

- `knowing-the-codebase` — tech stack, architecture, conventions, testing & CI
- `knowing-the-domain` — business domain, users, product context
- `knowing-backlog` — backlog conventions, ticket patterns, sizing

Fill these in per project, and list external doc/codebase pointers in `references.yml`.

## Commands, Agents, and Skills

| Concept | Purpose | Location | Invocation |
|---------|---------|----------|------------|
| **Agents** | AI agents, orchestrators | `.claude/commands/` + `.claude/agents/` | `/ai-xxx` slash command + `Task tool` |
| **Skills** | Knowledge injection, patterns | `.claude/skills/` | `Skill tool` on-demand |

## Agent Variants

| Variant | Token Budget | Role |
|---------|-------------|------|
| **Full** | 3000 | Orchestrator, can delegate |
| **Slim** | 1000 | Focused execution, single task |
| **Scout** | 800 | Parallel research, returns structured summary (stateless) |

Full agents can delegate to slim variants via Task tool. Scout agents (`ai-scout-*`) are dispatched in parallel by orchestrators for intelligence gathering. See [Architecture](docs/architecture.md) for delegation patterns.

## Intelligence Gathering

Orchestrator agents can dispatch **scout sub-agents** in parallel before complex tasks to gather enriched context. This is controlled by the `gathering-intelligence` skill.

**How it works:**
1. Orchestrator evaluates task complexity (agent-discretion, not always-on)
2. Invokes `gathering-intelligence` skill which provides a decision matrix
3. Dispatches relevant scouts in parallel via Task tool (haiku-powered)
4. Scouts return structured summaries; orchestrator synthesizes and proceeds
5. Domain-specific verification gate validates final output

**Available scouts:**

| Scout | Purpose |
|-------|---------|
| `ai-scout-backlog` | Related tickets, sizing patterns, backlog alignment |
| `ai-scout-codebase` | Code patterns, architecture, dependencies |
| `ai-scout-knowledge` | Past decisions, historical context, constraints |

**Integrated agents:** ai-backlog-manager, ai-app-developer, ai-framework-manager, ai-architect
**Pattern template:** `docs/patterns/intelligence-gathering-pattern.md` for adding to more agents

## Model Selection Matrix

| Model | Best For | Task Characteristics |
|-------|----------|---------------------|
| **Opus** | Strategic, multi-component | Architecture decisions, novel problems, 6+ files, user interaction |
| **Sonnet** | Standard patterns, clear scope | 2-5 files, single feature/bug, standard refactoring, tests |
| **Haiku** | Templated, mechanical | Single file, validation, format conversion, metadata updates |

## SDK Execution

Run agents programmatically via Claude Agent SDK for CI/CD, batch processing, or scheduled tasks.

```bash
agentic-framework agent list                    # List SDK-enabled agents
agentic-framework agent run <agent> "task"      # Execute agent
agentic-framework agent run <agent> "task" --dry-run  # Preview
```

See [CLI Reference](docs/cli-reference.md) for full documentation.

## Key Files

| File | Purpose |
|------|---------|
| `framework/modules/core/module.json` | Core module manifest |
| `framework/modules/*/module.json` | Module manifests |
| `framework/modules/core/registries/schemas/module.schema.json` | Module JSON Schema |
| `references.yml` | Curated external doc/codebase references |

## Getting Started

```bash
# Full setup (recommended)
agentic-framework init my-project --modules core,coding,backlog

# Minimal setup
agentic-framework init my-project --modules coding

# Add modules
agentic-framework add confluence
```

## Project Knowledge Skills

After scaffolding, fill in the three knowledge skills with your project's specifics:
- `knowing-the-codebase` - tech stack, architecture, conventions, testing & CI
- `knowing-the-domain` - business domain, users, product context
- `knowing-backlog` - backlog conventions, ticket patterns, sizing

Add external doc and related-codebase pointers to `references.yml`.

## Commit Messages & CI/CD Integration

This project uses **traditional commits** (50/72 rule, imperative mood, no prefixes) that integrate with automated CI/CD workflows.

### Commit Format

Follow the 50/72 rule as specified in global CLAUDE.md:
- **Subject:** Max 50 characters, imperative mood, no prefix
- **Body:** Wrap at 72 characters, explain why not what

**Examples:**
```
Add telemetry support via MCP server
Update documentation with CI/CD guide
Fix validation error in schema parser
```

### Git Hooks

The repository includes automated quality gates via git hooks:
- **Pre-commit:** Fast checks (<8s) - branch naming, ESLint auto-fix, build, link validation
- **Pre-push:** Comprehensive validation (30-90s) - mirrors CI/CD to catch issues before push

**Note:** Hooks enforce quality standards automatically. Use `--no-verify` only when absolutely necessary.

### CI/CD Auto-Release Integration

Commit messages determine automatic version bumps when PRs merge to `main`:

| Commit Pattern | Version Bump | Example |
|----------------|--------------|---------|
| Starts with "Add", "Implement", "Introduce" | **Minor** (1.7.0 → 1.8.0) | "Add telemetry support" |
| Contains `[minor]` tag | **Minor** (1.7.0 → 1.8.0) | "Update API [minor]" |
| Contains `BREAKING CHANGE` in body | **Skip auto-release** (use manual) | See below |
| Everything else | **Patch** (1.7.0 → 1.7.1) | "Fix validation bug" |

**Breaking changes:**
```
Redesign module system

BREAKING CHANGE: Module manifests now require version field.
See migration guide in docs/migration.md
```

For breaking changes, auto-release skips and you must use the manual release workflow for major version bumps.

**See:** [CI/CD Setup Guide](docs/ci-cd-setup.md) for complete workflow documentation.

---

**Version:** 1.0.0 | **Architecture:** Modular Discovery-Driven | **Modules:** core, backlog, coding, confluence
