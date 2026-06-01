# Module Patterns

## Creating a New Module

### Step 1: Directory Structure

```
framework/modules/module-name/
├── module.json
├── ai/
│   ├── agents/
│   ├── skills/
│   └── context/
└── cli/
```

### Step 2: module.json Template

```json
{
  "id": "my-module",
  "name": "My Module",
  "version": "1.0.0",
  "framework-version": "^1.0.0",
  "description": "Module purpose",
  "provides": {
    "agents": [
      {
        "id": "ai-my-manager",
        "variant": "full",
        "path": "ai/agents/ai-my-manager.md"
      },
      {
        "id": "ai-my-manager-slim",
        "variant": "slim",
        "path": "ai/agents/ai-my-manager-slim.md"
      }
    ],
    "skills": [],
    "capabilities": [],
    "cli-commands": []
  },
  "optional-dependencies": ["core"]
}
```

### Step 3: Agent Files

Full agent (.claude/commands/ai-my-manager.md):
- variant: full
- token-budget: 3000
- context-level: advanced
- delegates-to: [ai-my-manager-slim]

Slim agent (.claude/commands/ai-my-manager-slim.md):
- variant: slim
- token-budget: 1000
- context-level: basic
- parent-agent: ai-my-manager

### Step 4: Register

```bash
agentic-framework sync --agents --skills
agentic-framework validate
```

## Reference Implementations

- **Simple module:** framework/modules/reporting/
- **Complex module:** framework/modules/core/
- **Integration module:** framework/modules/jira/
