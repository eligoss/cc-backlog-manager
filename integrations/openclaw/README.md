# OpenClaw Integration

Run framework agents autonomously via OpenClaw or CI/CD pipelines.

## Setup

1. Install the framework CLI:
   ```bash
   npm install -g agentic-framework
   ```

2. Initialize your project:
   ```bash
   agentic-framework init my-project --modules core,coding
   ```

3. Export the agent manifest:
   ```bash
   agentic-framework openclaw export
   ```

## Running Agents

### Via CLI
```bash
# Interactive (default)
agentic-framework agent run ai-app-developer "Implement login feature"

# Autonomous (no permission prompts)
agentic-framework agent run ai-app-developer "Implement login feature" --autonomous

# Dry run (preview without executing)
agentic-framework agent run ai-app-developer "Implement login feature" --autonomous --dry-run
```

### Via OpenClaw
Point OpenClaw to `integrations/openclaw/manifest.json` for agent discovery. Each agent supports autonomous execution with `--autonomous` flag which:

- Sets `permissionMode: acceptEdits` (no user prompts for file operations)
- Removes `AskUserQuestion` from available tools
- Agents make reasonable defaults instead of asking

## Available Agents

| Agent | Model | Module | Use For |
|-------|-------|--------|---------|
| `ai-app-developer` | sonnet | coding | Feature implementation, bug fixes |
| `ai-architect` | opus | coding | Architecture design, tech decisions |
| `ai-backlog-manager` | sonnet | backlog | Ticket creation, sprint planning |
| `ai-confluence-manager` | sonnet | confluence | Documentation publishing |
| `ai-framework-manager` | opus | core | Framework improvements |
| `ai-framework-developer` | sonnet | core | Framework code changes |

## Manifest Format

The `manifest.json` provides machine-readable agent catalog with:
- Agent IDs, models, and capabilities
- Execution commands with `{agent-id}` and `{prompt}` placeholders
- Permission mode for autonomous execution
