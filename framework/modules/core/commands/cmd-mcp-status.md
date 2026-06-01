---
description: Show MCP integration status for a project
cli-command: agentic-framework mcp status
---

# MCP Status

Shows the current MCP integration status for a project, including configuration, files, and prerequisites.

## What Gets Shown

### Configuration
- Whether MCP is enabled
- Graphiti group ID
- Serena project name and language

### Files
- .serena/project.yml existence
- Session start hook
- Session end hook

### Prerequisites
- Docker and Graphiti container status
- uvx and Serena availability

### Ready Status
- Whether Graphiti is ready to use
- Whether Serena is ready to use

## Usage

```bash
# Show status
agentic-framework mcp status

# JSON output (for scripting)
agentic-framework mcp status --json

# For a different project
agentic-framework mcp status --path /path/to/project
```

## Example Output

```
MCP Integration Status

Configuration:
  ✓ MCP enabled
  ✓ Graphiti: my-project
  ✓ Serena: my-project (typescript)

Files:
  ✓ .serena/project.yml
  ✓ .claude/hooks/session-start-mcp.sh
  ✓ .claude/hooks/session-end-graphiti.sh

MCP Prerequisites Status

  ✓ Docker v24.0.5
  ✓ Graphiti containers running
  ✓ uvx v0.1.24

Ready to Use:
  Graphiti: Yes
  Serena:   Yes

Seed knowledge bases:
  agentic-framework mcp seed
```
