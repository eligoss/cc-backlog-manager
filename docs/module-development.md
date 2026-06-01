---
title: Module Development Guide
description: Create new modules with agents, skills, and CLI commands for the framework
audience: developer
last-updated: 2025-12-25
---

# Module Development Guide

This guide explains how to create new modules for the Agentic Development Framework.

## Module Structure

Every module follows this structure:

```
modules/my-module/
├── module.json              # Module manifest (required)
├── .claude/
│   ├── agents/              # Agent markdown files
│   │   └── ai-my-agent.md
│   └── skills/              # Skill directories
│       └── my-skill/
│           ├── SKILL.md     # Main skill file
│           └── *.md         # Supporting files
└── context/                 # Context templates (optional)
    └── my-context.md
```

## Creating a Module

### Step 1: Create Module Directory

```bash
mkdir -p modules/my-module/agents
mkdir -p modules/my-module/skills
```

### Step 2: Create module.json

The module manifest defines your module's identity and capabilities.

```json
{
  "$schema": "../../core/.claude/registries/schemas/module.schema.json",
  "id": "my-module",
  "version": "1.0.0",
  "name": "My Module",
  "description": "Description of what this module does",
  "provides": {
    "agents": ["ai-my-agent"],
    "skills": ["my-skill"],
    "capabilities": ["my-capability-1", "my-capability-2"],
    "scripts": [],
    "cli-commands": ["my-module command"]
  },
  "requires": {
    "core": ">=1.0.0"
  },
  "optional-dependencies": ["planning"],
  "context": {
    "business": [],
    "technical": ["my-technical-context.md"],
    "process": []
  },
  "entry-points": {
    "cli": [
      {
        "name": "my-command",
        "command": "agentic-framework my-module command",
        "description": "Run my automation"
      }
    ],
    "hooks": {
      "pre-commit": []
    }
  },
  "metadata": {
    "author": "Your Name",
    "license": "MIT",
    "category": "integration",
    "keywords": ["my-keyword"]
  }
}
```

### Step 3: Create Agent(s)

Agents are markdown files with YAML frontmatter.

**`.claude/commands/ai-my-agent.md`:**

```markdown
---
agent: ai-my-agent
role: My Agent Role
capability-needs:
  - my-capability-1
  - quality-assurance
context-category-needs:
  business: basic
  technical: advanced
  process: basic
token-budget: 2500
---

# My Agent

**Agent:** ai-my-agent
**Capability:** my-capability (Description)
**Framework:** v1.0.0 (Modular Architecture)

> **Auto-Discovery:** Required skills are automatically discovered based on `capability-needs`.

---

## Purpose

Describe what this agent does and its core responsibilities.

**Core Responsibilities:**
1. First responsibility
2. Second responsibility
3. Third responsibility

---

## When to Use This Agent

Use ai-my-agent when:
- Scenario 1
- Scenario 2

Do NOT use for:
- Anti-scenario 1
- Anti-scenario 2

---

## Skill Routing Table

| Task Category | Primary Skill | Notes |
|--------------|---------------|-------|
| Task Type 1 | my-skill | Description |
| Quality | verifying-quality | Auto-loaded |

---

## Agent-Specific Workflows

### Workflow 1: Main Workflow

**When:** Describe when to use this workflow

**Steps:**
1. Step one
2. Step two
3. Step three

**Validation:**
- [ ] Checklist item 1
- [ ] Checklist item 2

---

## Success Criteria

**You are effective when:**
- Criterion 1
- Criterion 2
- Criterion 3

---

**Version:** 1.0.0
**Token Budget:** ~2,500 tokens
**Last Updated:** YYYY-MM-DD
```

### Step 4: Create Skill(s)

Skills are directories with SKILL.md and supporting files.

**`.claude/skills/my-skill/SKILL.md`:**

```markdown
---
skill: my-skill
capabilities-provided:
  - my-capability-1
  - my-capability-2
---

# My Skill

**Skill:** my-skill
**Capabilities:** my-capability-1, my-capability-2
**Version:** 1.0.0

## Purpose

Describe what this skill provides.

## When to Use

Use this skill when:
- Scenario 1
- Scenario 2

## Quick Reference

### Key Concept 1

Explanation...

### Key Concept 2

Explanation...

## Detailed Workflows

### Workflow: Do Something

1. Step one
2. Step two
3. Step three

## Examples

See [EXAMPLES.md](./EXAMPLES.md) for detailed examples.

## Anti-Patterns

- **Don't do this:** Explanation
- **Don't do that:** Explanation

---

**Version:** 1.0.0
**Last Updated:** YYYY-MM-DD
```

### Step 5: Add CLI Commands (Optional)

CLI commands provide automation. Commands are implemented in TypeScript in the `cli/` directory.

**Adding a CLI command:**

1. Create command file: `cli/src/commands/my-module/my-command.ts`
2. Declare in module.json: `"cli-commands": ["my-module my-command"]`
3. Build CLI: `npm run build` in cli directory

See existing commands in `cli/src/commands/` for examples.

## Capability System

### Declaring Capabilities

**In module.json:**
```json
{
  "provides": {
    "capabilities": ["my-capability-1", "my-capability-2"]
  }
}
```

**In skill SKILL.md frontmatter:**
```yaml
capabilities-provided:
  - my-capability-1
  - my-capability-2
```

### Requiring Capabilities

**In agent frontmatter:**
```yaml
capability-needs:
  - my-capability-1
  - quality-assurance
```

### Discovery Engine

The Discovery Engine automatically:
1. Reads agent `capability-needs`
2. Scans all installed modules for skills with matching `capabilities-provided`
3. Returns list of skills to load

No hardcoded dependencies required.

## Naming Conventions

### Module IDs
- Lowercase kebab-case
- 2-4 words maximum
- Examples: `backlog`, `confluence`, `planning`, `code-review`

### Agent IDs
- Prefix: `ai-`
- Role-based naming
- Examples: `ai-planning-manager`, `ai-backlog-manager`, `ai-app-developer`

### Skill IDs
- Pattern: `[module]-[capability]-[type]`
- Types: `workflow`, `guard`, `meta`, `knowledge`
- Examples: `planning-planning-phases`, `backlog-sync-workflow`

### Capability Names
- Descriptive, hyphenated
- Action-oriented
- Examples: `plan-creation`, `ticket-decomposition`, `quality-assurance`

## Dependencies

### Required Dependencies

```json
{
  "requires": {
    "core": ">=1.0.0",
    "planning": ">=1.0.0"
  }
}
```

Module will not install without required dependencies.

### Optional Dependencies

```json
{
  "optional-dependencies": ["backlog", "confluence"]
}
```

Module works without these, but offers enhanced features when present.

## Testing Your Module

### 1. Validate module.json

```bash
# JSON Schema validation happens automatically during CLI operations
agentic-framework info my-module
```

### 2. Test Installation

```bash
# Create test project
agentic-framework init test-project --modules core,my-module

# Verify files deployed
ls test-project/.claude/commands/
ls test-project/.claude/skills/
ls test-project/.claude/commands/
```

### 3. Test Discovery

```bash
# In the framework repo, run tests
cd cli
npm test
```

### 4. Test Agent Usage

In a test project, use the agent as a slash command:
```
/ai-my-agent
```

## Best Practices

### Agent Design

1. **Single Responsibility** - One clear purpose per agent
2. **Capability-Driven** - Declare needs, don't hardcode skills
3. **Token Budget** - Keep under 3,000 tokens per agent
4. **Skill Routing** - Document which skills handle which tasks

### Skill Design

1. **Progressive Disclosure** - SKILL.md is brief, details in supporting files
2. **Self-Contained** - Each skill directory has everything it needs
3. **Clear Capabilities** - List exactly what capabilities are provided
4. **Examples** - Include EXAMPLES.md with real usage

### Script Design

1. **Argparse** - Use Python argparse for CLI
2. **Dry Run** - Support `--dry-run` for preview
3. **Exit Codes** - 0=success, 1=error, 2=changes made
4. **Emoji Output** - Use consistent emoji prefixes

## Module Categories

When setting `metadata.category`:

| Category | Description |
|----------|-------------|
| `core` | Framework infrastructure |
| `workflow` | Process and planning |
| `integration` | External system integration |
| `development` | Software development |
| `documentation` | Documentation and reporting |

## Contributing Modules

1. Fork the repository
2. Create module in `modules/` directory
3. Follow structure and naming conventions
4. Add tests
5. Submit pull request

## Example: Complete Module

See `modules/planning/` for a complete example module with:
- Agent: `ai-planning-manager`
- Skills: `planning-planning-phases`, `planning-planning-phases`
- CLI Commands: `planning create-plan`
- Full module.json with all sections
