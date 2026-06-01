#!/bin/bash
# Session End Graphiti Hook
# Fires on Stop to remind about saving session learnings to Graphiti
#
# Deploy to: .claude/hooks/session-end-graphiti.sh

# Read stdin (stop info)
STOP_INFO=$(cat)

# Output advisory reminder about Graphiti save
cat << 'EOF'
{
  "continue": true,
  "messages": [
    {
      "level": "info",
      "message": "💾 Session End: Consider saving key learnings, decisions, or discoveries to Graphiti using add_memory(name='Session findings', episode_body='...', group_id='agentic-development-framework') for future reference."
    }
  ]
}
EOF
