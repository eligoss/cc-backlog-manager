---
description: Check MCP prerequisites status (Docker, Graphiti, Serena)
cli-command: agentic-framework mcp check
---

# MCP Check

Checks the status of MCP prerequisites to ensure Graphiti and Serena can be used.

## What Gets Checked

### Docker (for Graphiti)
- Docker is installed
- Docker daemon is running

### Graphiti Containers
- Graphiti/FalkorDB containers exist
- Containers are running

### Serena
- uvx is installed (Python tool runner)
- Serena is cached/available

## Usage

```bash
# Check all prerequisites
agentic-framework mcp check

# JSON output (for scripting)
agentic-framework mcp check --json

# Show installation instructions for missing prerequisites
agentic-framework mcp check --verbose
```

## Exit Codes

- **0**: All prerequisites met
- **1**: Some prerequisites missing
- **2**: No prerequisites met

## Example Output

```
MCP Prerequisites Status

  ✓ Docker v24.0.5
  ✓ Graphiti containers running
      graphiti, falkordb
  ✓ uvx v0.1.24
      Serena will be installed on first use

Summary:
  Graphiti: Ready
  Serena:   Ready

✓ All MCP prerequisites are met
```
