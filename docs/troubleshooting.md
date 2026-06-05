---
title: Troubleshooting
description: Common issues and solutions for the Agentic Development Framework
audience: user
last-updated: 2025-12-25
---

# Troubleshooting

This guide covers common issues and how to resolve them.

## Installation Issues

### Command Not Found

**Symptom:** `agentic-framework: command not found`

**Solutions:**

```bash
# Use npx (recommended)
agentic-framework <command>

# Or install globally
npm install -g agentic-framework
```

### Node Version Error

**Symptom:** Build or runtime errors mentioning Node.js version

**Solution:**

```bash
# Check version (requires >= 22.0.0)
node --version

# Update Node.js if needed
nvm install 22
nvm use 22
```

### Project Already Exists

**Symptom:** `Error: Directory already exists`

**Solution:** The `init` command won't overwrite existing directories. Remove or rename the existing directory first.

## Module Issues

### Module Not Found

**Symptom:** `Error: Module 'xyz' not found`

**Solutions:**

```bash
# List available modules
agentic-framework list

# Check spelling - module names are lowercase
agentic-framework add jira     # correct
agentic-framework add Jira     # wrong
```

### Dependency Not Satisfied

**Symptom:** `Error: Required dependency 'core' not installed`

**Solution:** Install required dependencies first:

```bash
# Core is always required
agentic-framework add core

# Then install other modules
agentic-framework add planning
```

### Removing Core Module

**Note:** The core module CAN be removed, but you'll receive warnings about functionality loss.

**What happens when removing core:**
- Framework management agents are removed (ai-framework-manager, etc.)
- Shared skills are removed (verifying-quality, committing-code, etc.)
- Other modules may lose optional features
- You'll see a detailed warning before confirmation

**When to remove core:**
- Using framework with only domain-specific modules
- Custom setup without framework management tools

## Agent Issues

### Agent Not Finding Skills

**Symptom:** Agent doesn't use expected skills

**Causes:**
1. Skill not installed (module missing)
2. Capability mismatch

**Solutions:**

```bash
# Check installed modules
agentic-framework list

# Verify agent's capability-needs match skill's capabilities-provided
# Check agent frontmatter:
#   capability-needs:
#     - git-workflow
# Check skill frontmatter:
#   capabilities-provided:
#     - git-workflow
```

### Agent Not Available as Slash Command

**Symptom:** `/ai-agent-name` doesn't work in Claude Code

**Solutions:**

1. Check `.claude/commands/` directory exists
2. Verify agent file is present
3. Restart Claude Code

## Validation Issues

### Link Validation Failures

**Symptom:** `agentic-framework build` reports broken links

**Solutions:**

```bash
# Run verbose validation (build checks schemas + markdown links)
agentic-framework build --verbose

# Common causes:
# - Typos in file paths
# - Missing .md extension
# - Relative paths incorrect
```

### Plan Validation Failures

**Symptom:** `agentic-framework planning validate-plan` fails

**Solutions:**

```bash
# Run with verbose output
agentic-framework planning validate-plan --path ./plan --verbose

# Common issues:
# - Missing required YAML frontmatter fields
# - Invalid phase structure
# - Missing success criteria
```

## CLI Command Issues

### Dry Run First

Before running destructive commands, use `--dry-run`:

```bash
# Preview what would happen
agentic-framework planning create-plan --name test --dry-run
agentic-framework jira export --tickets ./backlog --dry-run
```

### Verbose Mode

Enable verbose output for debugging:

```bash
agentic-framework backlog validate --verbose
agentic-framework build --verbose
```

## Configuration Issues

### Environment Variables

The CLI respects environment variables with `AGENTIC_` prefix:

```bash
export AGENTIC_JIRA_URL="https://mycompany.atlassian.net"
export AGENTIC_JIRA_PROJECT="MYPROJ"
```

### Configuration File

Create `.agentic-framework.json` in project root:

```json
{
  "jira": {
    "url": "https://mycompany.atlassian.net",
    "project": "MYPROJ"
  },
  "confluence": {
    "space": "DEV"
  }
}
```

## Debugging Tools

### Framework Status

```bash
# Check framework status
agentic-framework status

# List installed modules
agentic-framework list
```

### Validate Everything

```bash
# Validate framework artifacts (schemas + markdown links)
agentic-framework build

# Quick schema-only check
agentic-framework build --quick
```

## Getting Help

### CLI Help

```bash
# General help
agentic-framework --help

# Command-specific help
agentic-framework init --help
agentic-framework add --help
```

### Documentation

- [Getting Started](getting-started.md) - Installation and setup
- [Architecture](architecture.md) - How the framework works
- [CLI Reference](cli-reference.md) - All commands
- [Module Development](module-development.md) - Creating modules

### Reporting Issues

If you encounter a bug:

1. Check existing issues: https://github.com/eligoss/agentic-development-framework/issues
2. Include: Node version, command run, error message, steps to reproduce
