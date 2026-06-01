---
title: Telemetry User Guide
description: Practical guide to using telemetry in the Agentic Development Framework
audience: user
last-updated: 2026-01-31
---

# Telemetry User Guide

A practical guide to monitoring and analyzing your AI agents with telemetry.

## Table of Contents

- [Quick Start](#quick-start)
- [Common Use Cases](#common-use-cases)
- [Configuration](#configuration)
- [Analyzing Telemetry Data](#analyzing-telemetry-data)
- [Integrating with Observability Platforms](#integrating-with-observability-platforms)
- [Privacy & Best Practices](#privacy--best-practices)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Step 1: Check if Telemetry is Working

Telemetry is **enabled by default**. Run any command:

```bash
agentic-framework list
```

Check if events were recorded:

```bash
cat .claude/telemetry/events.jsonl | jq '.'
```

✅ **You should see JSON events** - telemetry is working!

### Step 2: Enable Console Output (Development)

For real-time feedback during development:

```bash
# Enable console output
export TELEMETRY_CONSOLE_ENABLED=true
export TELEMETRY_CONSOLE_PRETTY=true

# Run any command
agentic-framework sync
```

**You'll see colorized output:**
```
2026-01-31T12:00:00.000Z  CLI  sync ✓ 68ms
  Command: sync
```

### Step 3: Use .env File (Recommended)

Instead of setting environment variables manually:

```bash
# Copy the template
cp .env.example .env

# Edit with your preferences
nano .env

# Framework automatically loads .env
agentic-framework init my-project
```

---

## Common Use Cases

### Use Case 1: Monitor Agent Performance

**Goal:** See which agents are being used and how fast they are.

**Steps:**

1. **Run your workflow:**
   ```bash
   # Enable agent tracking (opt-in for privacy)
   export TELEMETRY_INSTR_AGENT=true

   # Use agents
   /ai-architect  # In Claude Code
   /ai-app-developer
   ```

2. **Query agent performance:**
   ```bash
   cat .claude/telemetry/events.jsonl | \
     jq 'select(.event_type == "agent") |
         {name: .name, duration: .duration_ms, tokens: .token_usage.total_tokens}' | \
     jq -s 'group_by(.name) |
            map({agent: .[0].name,
                 avg_duration: (map(.duration) | add / length | round),
                 total_tokens: (map(.tokens // 0) | add)})'
   ```

**Example output:**
```json
[
  {
    "agent": "/ai-architect",
    "avg_duration": 5234,
    "total_tokens": 15000
  },
  {
    "agent": "/ai-app-developer",
    "avg_duration": 3421,
    "total_tokens": 8500
  }
]
```

### Use Case 2: Track MCP Tool Usage

**Goal:** Understand which MCP tools are being called and their performance.

**Steps:**

1. **Use MCP tools in your workflow:**
   ```bash
   agentic-framework init test-project --modules core,coding
   ```

2. **Query MCP tool usage:**
   ```bash
   cat .claude/telemetry/events.jsonl | \
     jq 'select(.event_type == "mcp") |
         {tool: .tool_name, layer: .layer, duration: .duration_ms, success: .success}'
   ```

3. **Find most-used tools:**
   ```bash
   cat .claude/telemetry/events.jsonl | \
     jq -r 'select(.event_type == "mcp") | .tool_name' | \
     sort | uniq -c | sort -rn
   ```

**Example output:**
```
  23 agentic_init
  18 agentic_sync
  12 graphiti_search_memory_facts
   5 web_search
```

### Use Case 3: Cost Tracking

**Goal:** Monitor LLM costs to stay within budget.

**Steps:**

1. **Enable cost tracking:**
   ```bash
   export TELEMETRY_INSTR_AGENT=true
   export TELEMETRY_INSTR_MCP=true
   ```

2. **Calculate total costs:**
   ```bash
   cat .claude/telemetry/events.jsonl | \
     jq -s '[.[] | select(.cost_usd != null)] |
            {total_cost: (map(.cost_usd) | add | . * 100 | round / 100),
             total_tokens: (map(.token_usage.total_tokens // 0) | add)}'
   ```

**Example output:**
```json
{
  "total_cost": 2.45,
  "total_tokens": 125000
}
```

3. **Cost breakdown by operation:**
   ```bash
   cat .claude/telemetry/events.jsonl | \
     jq -s '[.[] | select(.cost_usd != null)] |
            group_by(.event_type) |
            map({type: .[0].event_type, cost: (map(.cost_usd) | add | . * 100 | round / 100)})'
   ```

### Use Case 4: Debug Failures

**Goal:** Find and understand errors in your workflow.

**Steps:**

1. **Find all failures:**
   ```bash
   cat .claude/telemetry/events.jsonl | \
     jq 'select(.success == false) |
         {type: .event_type, operation: .operation, error: .error.message, timestamp: .timestamp}'
   ```

2. **Group errors by type:**
   ```bash
   cat .claude/telemetry/events.jsonl | \
     jq -s 'map(select(.success == false)) |
            group_by(.error.message) |
            map({error: .[0].error.message, count: length})'
   ```

3. **Find errors in specific time range:**
   ```bash
   # Last hour
   cat .claude/telemetry/events.jsonl | \
     jq --arg cutoff "$(date -u -v-1H +%Y-%m-%dT%H:%M:%S)" \
        'select(.success == false and .timestamp > $cutoff)'
   ```

### Use Case 5: Session Analysis

**Goal:** Trace all operations in a specific CLI session.

**Steps:**

1. **Find your session ID:**
   ```bash
   # Get latest session
   ls -t .claude/telemetry/sessions/ | head -1
   ```

2. **View all events in that session:**
   ```bash
   cat .claude/telemetry/sessions/sess_abc123def456.jsonl | jq '.'
   ```

3. **Visualize session timeline:**
   ```bash
   cat .claude/telemetry/sessions/sess_abc123def456.jsonl | \
     jq -r '[.timestamp, .event_type, .operation, .duration_ms] | @tsv' | \
     column -t -s $'\t'
   ```

**Example output:**
```
2026-01-31T12:00:00.123Z  cli        init           5234
2026-01-31T12:00:05.456Z  discovery  agent_loading  12
2026-01-31T12:00:05.789Z  mcp        2.tool-call    1234
```

---

## Configuration

### Method 1: Environment Variables (Quick)

Set variables in your shell:

```bash
# Enable console output
export TELEMETRY_CONSOLE_ENABLED=true

# Enable agent tracking
export TELEMETRY_INSTR_AGENT=true

# Run commands
agentic-framework sync
```

### Method 2: .env File (Recommended)

**Best for:** Persistent configuration, sharing with team

1. **Copy template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit .env:**
   ```bash
   # Enable console output for development
   TELEMETRY_CONSOLE_ENABLED=true
   TELEMETRY_CONSOLE_PRETTY=true

   # Track agent executions
   TELEMETRY_INSTR_AGENT=true

   # Keep logs for 30 days
   TELEMETRY_SESSION_FILE_MAX_AGE_DAYS=30
   ```

3. **Framework automatically loads .env** - no additional steps needed!

### Method 3: Config File (Advanced)

**Best for:** Complex setups, multiple exporters

Create `telemetry.config.json`:

```json
{
  "telemetry": {
    "enabled": true,
    "level": "info",
    "exporters": {
      "jsonFile": {
        "enabled": true,
        "path": ".claude/telemetry/events.jsonl",
        "maxSize": "10MB",
        "rotation": "daily"
      },
      "console": {
        "enabled": true,
        "pretty": true,
        "colors": true
      },
      "otel": {
        "enabled": true,
        "endpoint": "https://api.honeycomb.io",
        "serviceName": "my-project"
      }
    },
    "instrumentation": {
      "discovery": true,
      "sync": true,
      "cli": true,
      "mcp": true,
      "agent": true
    }
  }
}
```

**Priority:** Environment variables > Config file > Defaults

---

## Analyzing Telemetry Data

### Using jq (Command Line)

**Count events by type:**
```bash
cat .claude/telemetry/events.jsonl | \
  jq -r '.event_type' | sort | uniq -c
```

**Average duration by operation:**
```bash
cat .claude/telemetry/events.jsonl | \
  jq -s 'group_by(.operation) |
         map({op: .[0].operation,
              avg: (map(.duration_ms) | add / length | round)})'
```

**Filter by time range:**
```bash
# Last 24 hours
cat .claude/telemetry/events.jsonl | \
  jq --arg cutoff "$(date -u -v-24H +%Y-%m-%dT%H:%M:%S)" \
     'select(.timestamp > $cutoff)'
```

### Using SQLite (Advanced)

Convert JSONL to SQLite for complex queries:

```bash
# Install sqlite-utils
pip install sqlite-utils

# Import telemetry
sqlite-utils insert telemetry.db events .claude/telemetry/events.jsonl --nl

# Query with SQL
sqlite-utils query telemetry.db \
  "SELECT event_type, COUNT(*) as count, AVG(duration_ms) as avg_duration
   FROM events
   GROUP BY event_type"
```

### Exporting to CSV (Excel/Google Sheets)

```bash
# Export all events
cat .claude/telemetry/events.jsonl | \
  jq -r '[.timestamp, .event_type, .operation, .duration_ms, .success] | @csv' \
  > telemetry.csv

# Open in Excel or Google Sheets
```

---

## Integrating with Observability Platforms

### Option 1: Honeycomb (Recommended)

**Best for:** Real-time traces, powerful querying, easy setup

**Setup:**

1. **Sign up:** https://honeycomb.io (free tier available)

2. **Get API key:** Settings → Team Settings → API Keys

3. **Configure .env:**
   ```bash
   TELEMETRY_OTEL_ENABLED=true
   TELEMETRY_OTEL_ENDPOINT=https://api.honeycomb.io
   TELEMETRY_OTEL_HEADERS={"x-honeycomb-team":"YOUR_API_KEY"}
   ```

4. **Run commands:**
   ```bash
   agentic-framework sync
   ```

5. **View in Honeycomb:** https://ui.honeycomb.io

**Features:**
- Real-time trace visualization
- Query builder (BubbleUp, heatmaps)
- GenAI semantic conventions support
- Cost tracking dashboards

### Option 2: Datadog

**Best for:** Enterprise monitoring, APM, log aggregation

**Setup:**

1. **Get API key:** https://app.datadoghq.com → API Keys

2. **Configure .env:**
   ```bash
   TELEMETRY_OTEL_ENABLED=true
   TELEMETRY_OTEL_ENDPOINT=https://trace.agent.datadoghq.com
   TELEMETRY_OTEL_HEADERS={"DD-API-KEY":"YOUR_API_KEY"}
   ```

3. **View traces:** Datadog → APM → Traces

### Option 3: SigNoz (Self-Hosted)

**Best for:** Privacy-first, on-premise, cost control

**Setup:**

1. **Run SigNoz locally:**
   ```bash
   git clone https://github.com/SigNoz/signoz.git
   cd signoz/deploy
   docker-compose up -d
   ```

2. **Configure .env:**
   ```bash
   TELEMETRY_OTEL_ENABLED=true
   TELEMETRY_OTEL_ENDPOINT=http://localhost:4318
   ```

3. **View traces:** `http://localhost:3301`

### Option 4: Grafana Cloud

**Best for:** Grafana users, custom dashboards

**Setup:**

1. **Get credentials:** Grafana Cloud → OTLP → Generate token

2. **Configure .env:**
   ```bash
   TELEMETRY_OTEL_ENABLED=true
   TELEMETRY_OTEL_ENDPOINT=https://otlp-gateway-prod-us-east-0.grafana.net/otlp
   TELEMETRY_OTEL_HEADERS={"Authorization":"Basic YOUR_BASE64_TOKEN"}
   ```

3. **View in Grafana:** https://grafana.com

---

## Privacy & Best Practices

### Privacy Settings

**Default (Privacy-First):**
```bash
TELEMETRY_ENABLED=true              # Basic telemetry
TELEMETRY_INSTR_AGENT=false         # Agent tracking OFF by default
TELEMETRY_SESSION_MACHINE_ID=false  # No machine ID
```

**Development (More Tracking):**
```bash
TELEMETRY_INSTR_AGENT=true          # Track agents/commands
TELEMETRY_CONSOLE_ENABLED=true      # See events in real-time
```

**Production (Minimal):**
```bash
TELEMETRY_ENABLED=true
TELEMETRY_INSTR_DISCOVERY=true
TELEMETRY_INSTR_CLI=true
TELEMETRY_INSTR_MCP=true
TELEMETRY_INSTR_AGENT=false         # No agent tracking
TELEMETRY_OTEL_ENABLED=true
```

### What Gets Tracked vs. What Doesn't

**✅ Automatically Tracked:**
- Operation names (e.g., "init", "sync", "tool-call")
- Duration, success/failure
- Agent IDs, skill IDs, module names
- Token counts (when agent tracking enabled)
- Session correlation

**❌ Never Tracked:**
- User passwords, API keys (automatically sanitized)
- Code content
- File contents
- Personal data
- Secrets from environment variables

**⚠️ Tracked Only When Enabled:**
- Claude commands/agents (`TELEMETRY_INSTR_AGENT=true`)
- Prompt summaries (truncated, when agent tracking enabled)
- Output summaries (truncated, when agent tracking enabled)

### Best Practices

**DO:**
- ✅ Use `.env` file for persistent configuration
- ✅ Enable console exporter during development
- ✅ Query telemetry regularly to understand usage
- ✅ Archive old JSONL files monthly
- ✅ Set up OTLP export for production monitoring

**DON'T:**
- ❌ Commit `.env` to version control (already in .gitignore)
- ❌ Commit `telemetry.config.json` (already in .gitignore)
- ❌ Enable agent tracking in shared/public environments without consent
- ❌ Parse JSONL with regex (use `jq` instead)
- ❌ Disable telemetry permanently (you'll lose valuable insights)

### Data Retention

**Local Files (Default):**
```bash
# Session files
TELEMETRY_SESSION_FILE_MAX_FILES=50      # Keep last 50 sessions
TELEMETRY_SESSION_FILE_MAX_AGE_DAYS=7    # Or 7 days

# JSONL rotation
TELEMETRY_JSON_PATH=.claude/telemetry/events.jsonl
# Rotates at 10MB, keeps last 7 files
```

**Manual Cleanup:**
```bash
# Archive old sessions
find .claude/telemetry/sessions -type f -mtime +30 -exec gzip {} \;

# Keep only last 1000 events
tail -1000 .claude/telemetry/events.jsonl > .claude/telemetry/events.tmp
mv .claude/telemetry/events.tmp .claude/telemetry/events.jsonl
```

---

## Troubleshooting

### No Events in JSONL File

**Symptoms:** `.claude/telemetry/events.jsonl` is empty or doesn't exist

**Causes & Fixes:**

1. **Telemetry disabled:**
   ```bash
   # Check
   echo $TELEMETRY_ENABLED

   # Fix
   export TELEMETRY_ENABLED=true
   ```

2. **Events are buffered:**
   - Wait 1 second (automatic flush)
   - Or run 100+ operations (buffer fills)

3. **Wrong directory:**
   - Telemetry writes to project root, not current directory
   - Check: `ls .claude/telemetry/`

### Console Exporter Not Working

**Symptoms:** No colorized output in terminal

**Causes & Fixes:**

1. **Not enabled:**
   ```bash
   export TELEMETRY_CONSOLE_ENABLED=true
   ```

2. **CI/test environment:**
   - Console exporter auto-detects CI (disabled in tests)
   - Force enable: `TELEMETRY_CONSOLE_ENABLED=true`

3. **Colors disabled:**
   ```bash
   export TELEMETRY_CONSOLE_COLORS=true
   ```

### OTLP Export Failing

**Symptoms:** No traces in Honeycomb/Datadog/etc.

**Causes & Fixes:**

1. **Wrong endpoint:**
   ```bash
   # Test endpoint
   curl -v $TELEMETRY_OTEL_ENDPOINT

   # Common endpoints
   # Honeycomb: https://api.honeycomb.io
   # Datadog: https://trace.agent.datadoghq.com
   # Local: http://localhost:4318
   ```

2. **Missing/wrong headers:**
   ```bash
   # Honeycomb
   TELEMETRY_OTEL_HEADERS='{"x-honeycomb-team":"YOUR_API_KEY"}'

   # Datadog
   TELEMETRY_OTEL_HEADERS='{"DD-API-KEY":"YOUR_API_KEY"}'
   ```

3. **Network timeout:**
   - Default timeout: 30s
   - Check firewall/VPN
   - Try local collector first

### Agent Events Not Appearing

**Symptoms:** No `event_type: "agent"` events

**Cause:** Agent tracking is **opt-in** by default (privacy)

**Fix:**
```bash
export TELEMETRY_INSTR_AGENT=true
```

### High Memory Usage

**Symptoms:** Framework using lots of RAM

**Cause:** Large event buffer + slow export

**Fix:**
```json
{
  "telemetry": {
    "exporters": {
      "jsonFile": {
        "maxSize": "5MB",
        "rotation": "size"
      }
    }
  }
}
```

### Sensitive Data in Logs

**Symptoms:** Seeing passwords/tokens in telemetry

**This shouldn't happen!** Automatic sanitization should prevent this.

**Debug:**
```bash
# Check for sensitive data
cat .claude/telemetry/events.jsonl | \
  jq '.arguments' | \
  grep -i "password\|token\|apikey\|secret"

# Should only see: "[REDACTED]"
```

**If found:**
1. Report as security issue: https://github.com/eligoss/agentic-development-framework/issues
2. Immediately delete telemetry files
3. Disable telemetry: `TELEMETRY_ENABLED=false`

---

## Quick Reference

### Common Commands

```bash
# View latest events
tail -10 .claude/telemetry/events.jsonl | jq '.'

# Count by type
cat .claude/telemetry/events.jsonl | jq -r '.event_type' | sort | uniq -c

# Find errors
cat .claude/telemetry/events.jsonl | jq 'select(.success == false)'

# Total cost
cat .claude/telemetry/events.jsonl | jq -s '[.[] | select(.cost_usd)] | map(.cost_usd) | add'

# Export to CSV
cat .claude/telemetry/events.jsonl | jq -r '[.timestamp, .event_type, .duration_ms] | @csv' > export.csv
```

### Environment Variables Cheat Sheet

```bash
# Master controls
TELEMETRY_ENABLED=true
TELEMETRY_LEVEL=info

# What to track
TELEMETRY_INSTR_MCP=true
TELEMETRY_INSTR_AGENT=false  # Opt-in

# Development
TELEMETRY_CONSOLE_ENABLED=true
TELEMETRY_CONSOLE_PRETTY=true

# Production
TELEMETRY_OTEL_ENABLED=true
TELEMETRY_OTEL_ENDPOINT=https://api.honeycomb.io
TELEMETRY_OTEL_HEADERS='{"x-honeycomb-team":"YOUR_KEY"}'
```

### .env Template

See `.env.example` for complete template with all options documented.

---

## Getting Help

**Documentation:**
- Technical Reference: [docs/telemetry.md](telemetry.md)
- This Guide: [docs/telemetry-guide.md](telemetry-guide.md)

**Examples:**
- `.env.example` - Configuration template
- JSONL query examples (above)
- Platform integration guides (above)

**Support:**
- GitHub Issues: https://github.com/eligoss/agentic-development-framework/issues
- Check troubleshooting section first

---

**Happy monitoring! 📊**
