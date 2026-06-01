#!/bin/bash
# Notification Hook (Notification:permission_prompt|idle_prompt)
# Sends macOS notification and terminal escape when Claude needs attention.
# Advisory — never blocks.

# Read stdin JSON from Claude Code
INPUT=$(cat)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source shared notification helper
if [[ -f "$SCRIPT_DIR/_lib/notify-helper.sh" ]]; then
  source "$SCRIPT_DIR/_lib/notify-helper.sh"
else
  # Inline fallback if helper not found
  send_notification() {
    local title="${1:-Claude Code}"
    local message="${2:-Attention needed}"
    if command -v osascript &>/dev/null; then
      osascript -e "display notification \"$message\" with title \"$title\"" 2>/dev/null &
    fi
    printf "\a" 2>/dev/null
  }
fi

# Determine notification type from hook matcher context
# Claude Code passes the event type in the hook context
EVENT_TYPE=$(echo "$INPUT" | jq -r '.hook_event_name // "notification"' 2>/dev/null)
MATCHER=$(echo "$INPUT" | jq -r '.hook_matcher // empty' 2>/dev/null)

case "$MATCHER" in
  permission_prompt)
    send_notification "Claude Code" "Permission needed — please approve or deny"
    ;;
  idle_prompt)
    send_notification "Claude Code" "Waiting for your input"
    ;;
  *)
    send_notification "Claude Code" "Attention needed"
    ;;
esac

exit 0
