#!/bin/bash
# Pre-Bash Safety Hook (PreToolUse:Bash)
# Blocks destructive commands like rm -rf /, force push to main.
# BLOCKING — exits with code 2 to prevent execution.

# Read stdin JSON from Claude Code
INPUT=$(cat)

# Extract the command from the tool input JSON
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# Destructive filesystem patterns
if echo "$COMMAND" | grep -qE 'rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|--recursive\s+--force|-[a-zA-Z]*f[a-zA-Z]*r)\s+/\s*$'; then
  echo "BLOCKED: 'rm -rf /' detected. This would destroy the entire filesystem."
  exit 2
fi

if echo "$COMMAND" | grep -qE 'rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|--recursive\s+--force|-[a-zA-Z]*f[a-zA-Z]*r)\s+/\*'; then
  echo "BLOCKED: 'rm -rf /*' detected. This would destroy the entire filesystem."
  exit 2
fi

# Force push to main/master
if echo "$COMMAND" | grep -qE 'git\s+push\s+.*--force.*\s+(origin\s+)?(main|master)\b'; then
  echo "BLOCKED: Force push to main/master detected. This rewrites shared history."
  exit 2
fi

if echo "$COMMAND" | grep -qE 'git\s+push\s+.*-f\s+.*\s+(origin\s+)?(main|master)\b'; then
  echo "BLOCKED: Force push to main/master detected. This rewrites shared history."
  exit 2
fi

# Drop all tables
if echo "$COMMAND" | grep -qiE 'DROP\s+(DATABASE|TABLE)\s+.*\*|DROP\s+SCHEMA\s+public\s+CASCADE'; then
  echo "BLOCKED: Destructive database operation detected."
  exit 2
fi

exit 0
