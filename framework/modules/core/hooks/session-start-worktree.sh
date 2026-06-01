#!/bin/bash
# Session Start Worktree Hook (SessionStart:startup)
# Auto-creates git worktree when on main/master branch.
# Advisory — outputs info, never blocks.

# Read stdin (Claude Code hook input)
INPUT=$(cat)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$PROJECT_ROOT" || exit 0

# Only act in git repos
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  exit 0
fi

BRANCH=$(git branch --show-current 2>/dev/null)

if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
  echo "WARNING: You are on the '$BRANCH' branch."
  echo "Consider creating a worktree for your work:"
  echo "  git worktree add ../$(basename "$PROJECT_ROOT")-feature feature-branch"
  echo ""
  echo "Or create a feature branch:"
  echo "  git checkout -b feat/your-feature"
fi

exit 0
