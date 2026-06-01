#!/bin/bash
# Shared notification helper
# Auto-detects terminal (iTerm2/Warp/macOS) and sends appropriate notification.
# Source this file from other hook scripts: source "$(dirname "$0")/_lib/notify-helper.sh"

send_notification() {
  local title="${1:-Claude Code}"
  local message="${2:-Attention needed}"

  # macOS native notification (always available)
  if command -v osascript &>/dev/null; then
    osascript -e "display notification \"$message\" with title \"$title\"" 2>/dev/null &
  fi

  # iTerm2 notification via escape sequence
  if [[ "$TERM_PROGRAM" == "iTerm.app" ]]; then
    printf "\033]9;%s\007" "$message" 2>/dev/null
  fi

  # Warp terminal notification
  if [[ "$TERM_PROGRAM" == "WarpTerminal" ]]; then
    printf "\033]777;notify;%s;%s\007" "$title" "$message" 2>/dev/null
  fi

  # Generic terminal bell as fallback
  printf "\a" 2>/dev/null
}
