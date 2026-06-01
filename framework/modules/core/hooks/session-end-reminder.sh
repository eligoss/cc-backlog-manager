#!/bin/bash
# Session End Reminder Hook (SessionEnd)
# Warns about uncommitted changes and suggests creating a PR.
# Advisory — never blocks.

# Read stdin (Claude Code hook input)
INPUT=$(cat)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$PROJECT_ROOT" || exit 0

if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  exit 0
fi

# Check for uncommitted changes
CHANGES=$(git status --porcelain 2>/dev/null)
if [[ -n "$CHANGES" ]]; then
  COUNT=$(echo "$CHANGES" | wc -l | tr -d ' ')
  echo "WARNING: $COUNT uncommitted file(s) detected."
  echo "Consider committing your work before ending the session."
fi

# Check if on feature branch with unpushed commits
BRANCH=$(git branch --show-current 2>/dev/null)
if [[ "$BRANCH" != "main" && "$BRANCH" != "master" && -n "$BRANCH" ]]; then
  UNPUSHED=$(git log --oneline "@{upstream}..HEAD" 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$UNPUSHED" -gt 0 ]]; then
    echo "TIP: You have $UNPUSHED unpushed commit(s) on '$BRANCH'."
    echo "Consider pushing and creating a PR: gh pr create"
  fi
fi

exit 0
