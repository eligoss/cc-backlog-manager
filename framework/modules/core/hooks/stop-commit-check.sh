#!/bin/bash
# Stop Commit Check Hook (Stop)
# Checks for uncommitted work before stopping.
# Advisory — never blocks.

# Read stdin (Claude Code hook input)
INPUT=$(cat)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$PROJECT_ROOT" || exit 0

if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  exit 0
fi

CHANGES=$(git status --porcelain 2>/dev/null)
if [[ -n "$CHANGES" ]]; then
  COUNT=$(echo "$CHANGES" | wc -l | tr -d ' ')
  echo "REMINDER: $COUNT uncommitted file(s). Consider committing before stopping."
fi

exit 0
