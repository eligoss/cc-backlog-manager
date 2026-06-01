#!/bin/bash
# Session Compact Context Hook (SessionStart:compact)
# Re-injects critical context after conversation compaction.
# Advisory — never blocks.

# Read stdin (Claude Code hook input)
INPUT=$(cat)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$PROJECT_ROOT" || exit 0

echo "CONTEXT RESTORE (post-compaction):"

# Project identity
if [[ -f "$PROJECT_ROOT/.agentic-framework.json" ]]; then
  PROJECT_NAME=$(basename "$PROJECT_ROOT")
  echo "  Project: $PROJECT_NAME"
fi

# Current branch
if git rev-parse --is-inside-work-tree &>/dev/null; then
  BRANCH=$(git branch --show-current 2>/dev/null)
  echo "  Branch: $BRANCH"

  # Show uncommitted changes count
  CHANGES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$CHANGES" -gt 0 ]]; then
    echo "  Uncommitted changes: $CHANGES files"
  fi
fi

# Remind about task list
echo "  TIP: Check TaskList to recover task state after compaction."

exit 0
