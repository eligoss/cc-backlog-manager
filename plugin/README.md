# Agentic Framework Plugin

This directory contains the plugin manifest for packaging the Agentic Development Framework as a Claude Code plugin.

## Status

**Future Feature** - Plugin mode is currently in development.

## Usage (Future)

Once released, the plugin will be installable via:

```bash
# From Claude Code
/plugin install agentic-framework

# Or from marketplace
/plugin marketplace search agentic
```

## What the Plugin Provides

- **Skills**: 12+ reusable skills for development workflows
- **Agents**: 4 core agents (Framework Manager, App Developer, Architect, Backlog Manager)
- **Hooks**: Quality validation hooks (PreToolUse, PostToolUse, Stop)
- **MCP Tools**: Framework CLI exposed as MCP tools
- **Commands**: CLI commands as slash commands

## Development

To test plugin packaging locally:

```bash
# Build the framework
cd framework/cli && npm run build

# Package as plugin (not yet implemented)
agentic-framework plugin package

# Install locally for testing
/plugin install file:./plugin
```

## Requirements

- Node.js >= 22.0.0
- Claude Code >= 2.1.0

## License

MIT
