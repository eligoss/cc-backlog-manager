---
context-level: advanced
context-category: technical
token-target: 1000
---

# Technical Context - Advanced

## CLI Architecture

**Command Structure:**
```
agentic-framework <command> [options]
```

**Core Commands:**
- `init` - Scaffold new project with selected modules
- `add <module>` - Install module to existing project
- `remove <module>` - Uninstall module
- `list` - Show available modules
- `info <module>` - Display module details
- `validate` - Check framework configuration integrity
- `routes sync` - Sync filesystem to routes.yml
- `bump-version` - Increment framework version
- `status` - Show current framework state

**CLI Libraries:**
Located in `framework/modules/*/cli/`:
- `backlog/cli/` - Ticket operations
- `jira/cli/` - Jira API integration
- `confluence/cli/` - Confluence API operations
- `planning/cli/` - Phase management

## Discovery Engine Implementation

**Agent Declaration:**
```yaml
# In agent frontmatter
capability-needs:
  - git-operations
  - quality-assurance
  - markdown-formatting
```

**Skill Declaration:**
```yaml
# In skill frontmatter
capabilities-provided:
  - git-operations
```

**Runtime Matching:**
Discovery engine reads all `agents.json` and `skills.json` files, builds capability graph, and makes skills available when agent declares matching needs.

## Module Manifest Structure

**File:** `module.json` in each module root

**Schema Enforcement:** `framework/modules/core/registries/schemas/module.schema.json`

**Required Fields:**
```json
{
  "id": "module-id",
  "version": "1.0.0",
  "type": "core|optional",
  "description": "Module purpose",
  "provides": {
    "agents": ["agent-id-1"],
    "skills": ["skill-id-1"],
    "cli-commands": ["command-1"],
    "context": ["context-type"]
  },
  "dependencies": {
    "modules": ["dependency-module-id"],
    "npm": {"package": "version"}
  }
}
```

## Agent Frontmatter Pattern

**Standard Fields:**
```yaml
---
agent: agent-id
role: "Agent Role Description"
capability-needs:
  - capability-1
  - capability-2
context-category-needs:
  - business
  - technical
context-level: advanced
token-budget: 3000
scope: |
  What this agent does
---
```

## Testing Strategy

**Test Suite:**
- 1213+ total tests
- 64% minimum coverage requirement
- Jest test framework
- Unit tests: Individual functions
- Integration tests: Module interactions
- CLI tests: Command execution validation

**Run Tests:**
```bash
npm test                    # All tests
npm test -- --coverage      # With coverage report
npm test -- <pattern>       # Specific test file
```

## Key Registry Files

**Location:** `framework/modules/core/registries/`

**Files:**
- `agents.json` - Agent metadata for discovery
- `skills.json` - Skill metadata for discovery
- `cli-commands.json` - CLI command metadata
- `schemas/module.schema.json` - Module manifest validation
- `schemas/agent-frontmatter.schema.json` - Agent YAML validation

## Critical Files

**routes.yml:** Filesystem navigation map
```yaml
framework:
  core:
    - ai/agents
    - ai/skills/shared
    - ai/registries
  modules:
    - backlog
    - coding
    - planning
```

**module.json:** Module manifest (one per module)

**agent.md files:** Agent prompt files with YAML frontmatter

**skill.md files:** Skill prompt files with YAML frontmatter

## Development Workflow

1. Modify source in `framework/`
2. Run tests: `npm test`
3. Validate: `agentic-framework validate`
4. Sync routes: `agentic-framework routes sync`
5. Update registries if adding agents/skills
6. Commit with conventional commits (feat:, fix:, docs:)
