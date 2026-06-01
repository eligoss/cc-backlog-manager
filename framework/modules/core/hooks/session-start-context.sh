#!/bin/bash
# Session Start Context Hook (SessionStart:startup)
# Outputs context reminders about available skills and conventions.
# Advisory — never blocks.

# Read stdin (Claude Code hook input)
INPUT=$(cat)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$PROJECT_ROOT" || exit 0

# Check for CLAUDE.md
if [[ -f "$PROJECT_ROOT/CLAUDE.md" ]]; then
  echo "CONTEXT: Project CLAUDE.md found — refer to it for project-specific instructions."
fi

# Check for .agentic-framework.json (framework project)
if [[ -f "$PROJECT_ROOT/.agentic-framework.json" ]]; then
  echo "CONTEXT: Agentic Framework project detected."
  echo "  - Use /commit for git operations (invokes committing-code skill)"
  echo "  - Use /verify for quality checks (invokes verifying-quality skill)"
  echo "  - Run 'agentic-framework status' for framework health"
fi

# Show current branch
if git rev-parse --is-inside-work-tree &>/dev/null; then
  BRANCH=$(git branch --show-current 2>/dev/null)
  echo "CONTEXT: Current branch: $BRANCH"
fi

exit 0
