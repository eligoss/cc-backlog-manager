#!/bin/bash
# Stop PR Suggest Hook (Stop)
# Suggests creating a PR if commits exist on a feature branch.
# Advisory — never blocks.

# Read stdin (Claude Code hook input)
INPUT=$(cat)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$PROJECT_ROOT" || exit 0

if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  exit 0
fi

BRANCH=$(git branch --show-current 2>/dev/null)

# Only suggest PR for feature branches
if [[ "$BRANCH" == "main" || "$BRANCH" == "master" || -z "$BRANCH" ]]; then
  exit 0
fi

# Check for unpushed commits
UNPUSHED=$(git log --oneline "@{upstream}..HEAD" 2>/dev/null | wc -l | tr -d ' ')

if [[ "$UNPUSHED" -gt 0 ]]; then
  echo "TIP: Branch '$BRANCH' has $UNPUSHED unpushed commit(s)."
  echo "  Push and create PR: git push -u origin $BRANCH && gh pr create"
elif git log --oneline "origin/main..HEAD" 2>/dev/null | head -1 | grep -q .; then
  # Branch has commits ahead of main but is already pushed
  # Check if PR already exists
  if command -v gh &>/dev/null; then
    PR_URL=$(gh pr view --json url -q '.url' 2>/dev/null)
    if [[ -z "$PR_URL" ]]; then
      echo "TIP: Branch '$BRANCH' has commits not in main. Consider: gh pr create"
    fi
  fi
fi

exit 0
