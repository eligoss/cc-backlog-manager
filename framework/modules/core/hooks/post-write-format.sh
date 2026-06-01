#!/bin/bash
# Post-Write Format Hook (PostToolUse:Write|Edit)
# Auto-formats files with prettier/eslint if config exists.
# Advisory, runs async — never blocks.

# Read stdin JSON from Claude Code
INPUT=$(cat)

# Extract the file path from tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // empty' 2>/dev/null)

if [[ -z "$FILE_PATH" || ! -f "$FILE_PATH" ]]; then
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$PROJECT_ROOT" || exit 0

# Only format files within the project
case "$FILE_PATH" in
  "$PROJECT_ROOT"*) ;;
  *) exit 0 ;;
esac

# Get file extension
EXT="${FILE_PATH##*.}"

# Check for prettier and format supported file types
if [[ -f "$PROJECT_ROOT/.prettierrc" || -f "$PROJECT_ROOT/.prettierrc.json" || -f "$PROJECT_ROOT/.prettierrc.yml" || -f "$PROJECT_ROOT/prettier.config.js" || -f "$PROJECT_ROOT/prettier.config.mjs" ]]; then
  case "$EXT" in
    ts|tsx|js|jsx|json|css|scss|md|yaml|yml|html)
      if command -v npx &>/dev/null; then
        npx prettier --write "$FILE_PATH" 2>/dev/null &
      fi
      ;;
  esac
fi

# Check for eslint and fix supported file types
if [[ -f "$PROJECT_ROOT/.eslintrc" || -f "$PROJECT_ROOT/.eslintrc.json" || -f "$PROJECT_ROOT/.eslintrc.js" || -f "$PROJECT_ROOT/eslint.config.js" || -f "$PROJECT_ROOT/eslint.config.mjs" ]]; then
  case "$EXT" in
    ts|tsx|js|jsx)
      if command -v npx &>/dev/null; then
        npx eslint --fix "$FILE_PATH" 2>/dev/null &
      fi
      ;;
  esac
fi

exit 0
