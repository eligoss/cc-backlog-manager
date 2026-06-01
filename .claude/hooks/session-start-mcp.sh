#!/bin/bash
# Session Start MCP Hook
# Fires on UserPromptSubmit to remind about Serena and Graphiti activation
#
# Deploy to: .claude/hooks/session-start-mcp.sh

# Read stdin (user prompt)
PROMPT=$(cat)

# Check if this looks like a new session (first substantive message)
# Skip for very short messages or commands
if [ ${#PROMPT} -lt 10 ]; then
  echo '{"continue": true}'
  exit 0
fi

# Output advisory reminder about MCP activation
cat << 'EOF'
{
  "continue": true,
  "messages": [
    {
      "level": "info",
      "message": "📍 MCP Activation Reminder: For this project, activate Serena first with activate_project('agentic-development-framework'), then search Graphiti for context with search_memory_facts(query, group_ids=['agentic-development-framework']). Use Serena's symbolic tools (get_symbols_overview, find_symbol) instead of Glob/Grep for code navigation."
    }
  ]
}
EOF
