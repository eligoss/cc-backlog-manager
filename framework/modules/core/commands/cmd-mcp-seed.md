---
description: Seed MCP knowledge bases (Graphiti and Serena) with project information
cli-command: agentic-framework mcp seed
---

# MCP Seed

Seeds knowledge bases with project information for AI memory and code navigation.

## What Gets Seeded

### Graphiti (Knowledge Graph Memory)
- Project Overview (CLAUDE.md, README.md)
- Module Catalog (installed modules and their capabilities)
- Agent Registry (available slash commands)
- Skill Registry (available skills)
- Context Summaries (business, technical, process context)

### Serena (Semantic Code Navigation)
- Project Overview (structure, framework version)
- Architecture Patterns (module system, discovery engine)
- CLI Structure (commands, libraries)

## Usage

```bash
# Seed all configured MCP integrations
agentic-framework mcp seed

# Seed Graphiti only
agentic-framework mcp seed --graphiti

# Seed Serena only
agentic-framework mcp seed --serena

# Preview what would be seeded
agentic-framework mcp seed --dry-run

# Verbose output
agentic-framework mcp seed --verbose
```

## Prerequisites

Before seeding, ensure MCP is configured:
```bash
agentic-framework mcp status
```

If MCP is not configured:
```bash
agentic-framework mcp setup
```

## After Seeding

In your Claude session, use the seeded knowledge:

### Graphiti
```
search_memory_facts("project overview", group_ids=["YOUR_GROUP_ID"])
search_nodes("modules capabilities", group_ids=["YOUR_GROUP_ID"])
```

### Serena
```
activate_project("YOUR_PROJECT_NAME")
get_symbols_overview("src/")
```
