---
description: Configure MCP integrations (Graphiti, Serena) for a project
cli-command: agentic-framework mcp setup
---

# MCP Setup

Configures MCP (Model Context Protocol) integrations for AI memory and code navigation.

## What Gets Configured

### Graphiti (Knowledge Graph Memory)
- Group ID for project isolation
- Permissions in settings.local.json
- Session end hook for save reminders

### Serena (Semantic Code Navigation)
- .serena/project.yml configuration
- Memory directory setup
- Permissions in settings.local.json
- Session start hook for activation reminder

## Usage

### Interactive Mode (Recommended)
```bash
agentic-framework mcp setup
```

### Non-Interactive Mode
```bash
# Enable both Graphiti and Serena
agentic-framework mcp setup --graphiti --serena

# Custom configuration
agentic-framework mcp setup \
  --graphiti --graphiti-group-id my-project \
  --serena --serena-project my-project --serena-language typescript

# Skip prompts
agentic-framework mcp setup --no-interactive --graphiti --serena
```

## Options

| Option | Description |
|--------|-------------|
| `--graphiti` | Enable Graphiti only |
| `--serena` | Enable Serena only |
| `--graphiti-group-id <id>` | Custom group ID (default: project name) |
| `--serena-project <name>` | Custom project name (default: project name) |
| `--serena-language <lang>` | Primary language (default: typescript) |
| `--no-interactive` | Skip interactive prompts |

## After Setup

1. Ensure prerequisites are met: `agentic-framework mcp check`
2. Seed knowledge bases: `agentic-framework mcp seed`
3. In Claude session:
   - Activate Serena: `activate_project("YOUR_PROJECT")`
   - Search Graphiti: `search_memory_facts("context", group_ids=["YOUR_GROUP"])`
