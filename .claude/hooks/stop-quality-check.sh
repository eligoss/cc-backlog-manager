#!/bin/bash
# Stop Quality Check Hook
# Runs when an agent completes, providing a final quality summary (advisory mode)
#
# This wrapper script invokes the compiled TypeScript hook.
# Deploy to: .claude/hooks/stop-quality-check.sh

# Find the framework CLI
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Try to find the CLI in different locations
if [ -f "$PROJECT_ROOT/framework/cli/dist/hooks/stop-quality-check.js" ]; then
  CLI_HOOKS="$PROJECT_ROOT/framework/cli/dist/hooks"
elif [ -f "$PROJECT_ROOT/node_modules/agentic-framework/dist/hooks/stop-quality-check.js" ]; then
  CLI_HOOKS="$PROJECT_ROOT/node_modules/agentic-framework/dist/hooks"
else
  # Hook not available, pass through
  cat
  exit 0
fi

# Run the TypeScript hook
node "$CLI_HOOKS/stop-quality-check.js"
