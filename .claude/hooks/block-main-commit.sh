#!/bin/bash
# Block direct commits to main/master branch (but allow merges)
# Handles: git -C /path commit, cd /path && git commit, and plain git commit

INPUT=$(cat)

# Only block commits, not merges (merges are intentional after review)
if echo "$INPUT" | grep -qE '"command".*git commit' && ! echo "$INPUT" | grep -qE '"command".*git merge'; then
  # Extract the command from JSON
  CMD=$(echo "$INPUT" | grep -oE '"command"\s*:\s*"[^"]*"' | sed 's/"command"\s*:\s*"//' | sed 's/"$//')

  # Try to extract directory from git -C flag
  GIT_DIR=$(echo "$CMD" | grep -oE 'git -C [^ ]+' | sed 's/git -C //')

  # Try to extract directory from cd command (handles "cd /path && git commit")
  if [ -z "$GIT_DIR" ]; then
    GIT_DIR=$(echo "$CMD" | grep -oE '^\(cd [^)&]+' | sed 's/^(cd //' | sed 's/ *$//')
  fi
  if [ -z "$GIT_DIR" ]; then
    GIT_DIR=$(echo "$CMD" | grep -oE '^cd [^;&]+' | sed 's/^cd //' | sed 's/ *$//')
  fi

  # Get branch from the appropriate directory
  if [ -n "$GIT_DIR" ] && [ -d "$GIT_DIR" ]; then
    BRANCH=$(git -C "$GIT_DIR" branch --show-current 2>/dev/null)
  else
    BRANCH=$(git branch --show-current 2>/dev/null)
  fi

  if echo "$BRANCH" | grep -qE '^(main|master)$'; then
    echo "BLOCKED: Do not commit directly to $BRANCH. Use a feature branch or worktree." >&2
    exit 2
  fi
fi
exit 0
