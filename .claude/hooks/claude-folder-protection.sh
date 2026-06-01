#!/bin/bash
# Claude Folder Protection Hook
# Warns when editing files in protected .claude/ subdirectories (advisory mode)
#
# Protected paths that will trigger warnings:
# - .claude/skills/     - Synced from framework
# - .claude/commands/   - Synced from framework
# - .claude/hooks/      - Synced from framework
#
# This wrapper script invokes the compiled TypeScript hook.
# Deploy to: .claude/hooks/claude-folder-protection.sh

# Find the framework CLI
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Try to find the CLI in different locations
if [ -f "$PROJECT_ROOT/framework/cli/dist/hooks/claude-folder-protection.js" ]; then
  CLI_HOOKS="$PROJECT_ROOT/framework/cli/dist/hooks"
elif [ -f "$PROJECT_ROOT/node_modules/agentic-framework/dist/hooks/claude-folder-protection.js" ]; then
  CLI_HOOKS="$PROJECT_ROOT/node_modules/agentic-framework/dist/hooks"
else
  # Hook not available, pass through
  cat
  exit 0
fi

# Run the TypeScript hook
node "$CLI_HOOKS/claude-folder-protection.js"
