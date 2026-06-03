---
title: Getting Started
description: Initialize and manage AI-assisted development projects with the framework CLI
audience: user
last-updated: 2025-12-25
---

# Getting Started

The Agentic Framework CLI is a scaffolding tool for creating and managing AI-assisted development projects.

## Installation

```bash
# Use directly with npx (recommended)
agentic-framework <command>

# Or install globally
npm install -g agentic-framework
agentic-framework <command>
```

## Commands

### init - Create New Project

Initialize a new project with selected modules.

```bash
agentic-framework init <project-name> [options]
```

**Options:**
- `-m, --modules <list>` - Comma-separated list of modules to install (default: "core")

**Examples:**

```bash
# Minimal project (core only)
agentic-framework init my-project

# Development project with coding and backlog
agentic-framework init my-app --modules core,coding,backlog

# Full-featured project
agentic-framework init enterprise-app --modules core,coding,backlog,confluence
```

**What Gets Created:**

```
my-project/
├── .claude/
│   ├── commands/           # Agents as slash commands
│   └── skills/             # Skills for Claude
├── .claude/
│   ├── agents/             # Agent markdown files
│   ├── skills/             # Skill documentation (incl. knowing-* knowledge skills)
│   └── registries/         # Discovery metadata
├── src/                    # Source files (optional)
├── CLAUDE.md               # Claude entry point
├── references.yml          # Curated external doc/codebase references
└── .gitignore
```

### add - Add Module

Add a module to an existing project.

```bash
agentic-framework add <module-name>
```

**Examples:**

```bash
# Add Jira integration
agentic-framework add jira

# Add Confluence documentation
agentic-framework add confluence

# Add backlog management
agentic-framework add backlog
```

**Dependency Handling:**
- Modules with dependencies will prompt for confirmation
- Required modules are installed automatically
- Optional dependencies are suggested but not required

### remove - Remove Module

Remove a module from a project, including all its artifacts.

```bash
agentic-framework remove <module-name> [options]
```

**Options:**
- `-f, --force`: Skip confirmation prompt
- `-n, --dry-run`: Preview what would be removed without making changes
- `-p, --path <path>`: Project path (default: current directory)

**What Gets Removed:**
- Agents from `.claude/commands/` and `.claude/agents/`
- Skills from `.claude/skills/`
- Templates from `.claude/templates/{module}/`
- Schemas from `.claude/registries/schemas/{module}/`
- Scripts from `src/{module}/`
- Module entry from manifest
- Regenerates registries

**Protected (Not Removed):**
- Knowledge skills (`.claude/skills/knowing-*`) - may be user-customized
- Hooks (`.claude/hooks/`) - framework infrastructure

**Examples:**

```bash
# Preview removal (dry-run)
agentic-framework remove jira --dry-run

# Remove with confirmation
agentic-framework remove jira

# Remove without confirmation (CI/automation)
agentic-framework remove jira --force
```

**Safety Checks:**
- Shows preview of all artifacts to be removed
- Warns about potentially shared skills
- Prompts for confirmation (unless --force or --dry-run)
- Special warning for core module removal

### list - List Available Modules

Show all available modules with descriptions.

```bash
agentic-framework list
```

**Output:**

```
Available Modules:

  core (v1.0.0) - Framework Core
    Framework infrastructure (always required)
    Agents: ai-framework-manager, ai-framework-developer
    Capabilities: framework-governance, git-workflow-management, quality-assurance

  backlog (v1.0.0) - Backlog Management
    Ticket-based backlog management
    Agents: ai-backlog-manager
    Requires: core

    Requires: core

  ...
```

### info - Module Details

Show detailed information about a specific module.

```bash
agentic-framework info <module-name>
```

**Examples:**

```bash
agentic-framework info backlog
```

**Output:**

```
Module: planning (v1.0.0)
Name: Planning & Workflow
Description: Multi-phase planning workflows with progress tracking

Provides:
  Agents: ai-planning-manager
  Skills: planning-planning-phases, planning-planning-phases
  Capabilities: plan-creation, phase-decomposition, progress-tracking
  CLI Commands: planning create-plan

Dependencies:
  Required: core (>=1.0.0)
  Optional: coding
```

## Module Selection Guide

### Minimal Setup
```bash
agentic-framework init my-project --modules core
```
- Framework infrastructure only
- Good for: Learning the framework, custom implementations

### Development Project
```bash
agentic-framework init my-project --modules core,coding,backlog
```
- Architecture and development agents
- Backlog management
- Good for: Software development projects

### Documentation-Heavy Project
```bash
agentic-framework init my-project --modules core,confluence
```
- Confluence integration
- Good for: Documentation projects

### Full-Featured Project
```bash
agentic-framework init my-project --modules core,coding,backlog,confluence
```
- All capabilities
- Good for: Enterprise projects with full tooling needs

## After Initialization

### 1. Fill Knowledge Skills

The most important step after initialization is filling in the project knowledge skills:

```
.claude/skills/
├── knowing-the-codebase/   # Tech stack, architecture, conventions, testing & CI
├── knowing-the-domain/     # Business domain, users, product context
└── knowing-backlog/        # Backlog conventions, ticket patterns, sizing
```

Also add external doc and related-codebase pointers to `references.yml`.

### 2. Verify Installation

```bash
cd my-project
cat CLAUDE.md  # Review entry point
ls .claude/commands/  # Check available agents
ls .claude/skills/    # Check available skills
```

### 3. Start Using Agents

In Claude Code, use slash commands:
```
/ai-architect        # Architecture design
/ai-app-developer    # Code implementation
/ai-backlog-manager # Backlog management
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FRAMEWORK_ROOT` | Path to framework installation | Auto-detected |

### Project Configuration

Project configuration is stored in `.claude/registries/`:
- `agents.json` - Installed agents
- `skills.json` - Installed skills
- `modules.json` - Installed modules

## Troubleshooting

### "Module not found"

Ensure you're using a valid module name from `agentic-framework list`.

### "Dependency not satisfied"

Install required dependencies first:
```bash
agentic-framework add core  # Always required
agentic-framework add backlog  # Then optional modules
```

### "Project already exists"

The `init` command will not overwrite existing directories. Remove or rename the existing directory first.

### Build Errors

Ensure Node.js >= 22.0.0:
```bash
node --version  # Should be v22.x.x or higher
```

## Version Information

```bash
agentic-framework --version
```
