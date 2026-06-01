---
title: Telemetry & Observability
description: Comprehensive observability for AI agents with OpenTelemetry GenAI Semantic Conventions
audience: user
last-updated: 2026-01-31
---

# Telemetry & Observability

> **TL;DR:** Production-ready observability for the Agentic Development Framework with MCP tracking, OpenTelemetry GenAI Semantic Conventions v1.37+, and local-first usage analytics.

---

## Overview

The framework includes a comprehensive telemetry system that tracks:

- **Discovery operations** - Agent initialization, skill loading, capability matching
- **CLI commands** - Command execution, arguments, results
- **MCP operations** - Model Context Protocol tool calls across all 4 layers (**NEW**)
- **Sync operations** - File processing, changes, errors
- **Integration operations** - Jira, Confluence API interactions
- **Validation operations** - Ticket validation, markdown checking

All telemetry is:
- **Non-blocking** - Never impacts application performance
- **Privacy-conscious** - Automatic sanitization of sensitive data
- **Configurable** - Fine-grained control via config file + environment variables
- **Standards-based** - OpenTelemetry GenAI Semantic Conventions v1.37+ (**NEW**)

---

## Exporters

### 1. JSONL File Exporter

Writes events to JSON Lines format for local analysis.

**Default path:** `.claude/telemetry/events.jsonl`

**Features:**
- Daily rotation (configurable)
- Size-based rotation (e.g., 10MB)
- Automatic cleanup (keeps last 7 files)
- Buffered writes (100 events or 1 second)

**Query with jq:**

```bash
# Count events by type
cat .claude/telemetry/events.jsonl | jq -s 'group_by(.event_type) | map({type: .[0].event_type, count: length})'

# Find MCP tool calls by layer
cat .claude/telemetry/events.jsonl | jq 'select(.event_type == "mcp") | select(.layer == "2")'

# Average duration by operation
cat .claude/telemetry/events.jsonl | jq -s 'group_by(.operation) | map({op: .[0].operation, avg_ms: (map(.duration_ms) | add / length)})'

# Find errors
cat .claude/telemetry/events.jsonl | jq 'select(.error != null)'

# Token usage summary
cat .claude/telemetry/events.jsonl | jq -s '[.[] | select(.token_usage != null)] | {total_tokens: map(.token_usage.total_tokens) | add, total_cost: map(.cost_usd // 0) | add}'

# Most popular skills
cat .claude/telemetry/events.jsonl | jq -r '.skills_discovered[]?.skill_id' | sort | uniq -c | sort -rn
```

### 2. Session File Exporter

Creates separate log files per session for parallel run isolation.

**Default directory:** `.claude/telemetry/sessions/`

**Features:**
- One file per session (`sess_<session_id>.jsonl`)
- Automatic cleanup (keeps last 50 files or 7 days)
- Session correlation for tracing workflows

**Use case:** Debugging specific CLI runs without filtering

```bash
# Find latest session
ls -t .claude/telemetry/sessions/ | head -1

# View session events
cat .claude/telemetry/sessions/sess_abc123def456.jsonl | jq .
```

### 3. OpenTelemetry OTLP Exporter

Exports to OpenTelemetry collectors via OTLP HTTP/gRPC.

**Features:**
- Traces (spans) for distributed tracing
- Metrics (counters, histograms)
- OpenTelemetry GenAI Semantic Conventions v1.37+
- Standard backend integration (Honeycomb, Datadog, Grafana, SigNoz)

**GenAI attributes (v1.37+):**

```typescript
{
  "gen_ai.system": "mcp",                    // 'claude', 'mcp', 'framework'
  "gen_ai.request.model": "claude-sonnet-4",
  "gen_ai.usage.input_tokens": 150,
  "gen_ai.usage.output_tokens": 50,
  "gen_ai.usage.total_tokens": 200,
  "gen_ai.cost_usd": 0.0042,
  "gen_ai.agent.id": "ai-app-developer",
  "gen_ai.agent.variant": "slim",
  "mcp.layer": "2",
  "mcp.server.name": "framework",
  "mcp.tool.name": "agentic_init"
}
```

**Supported backends:**

| Backend | Setup |
|---------|-------|
| **Honeycomb** | `TELEMETRY_OTEL_ENDPOINT=https://api.honeycomb.io`<br>`TELEMETRY_OTEL_HEADERS='{"x-honeycomb-team":"YOUR_API_KEY"}'` |
| **Datadog** | `TELEMETRY_OTEL_ENDPOINT=https://trace.agent.datadoghq.com`<br>`TELEMETRY_OTEL_HEADERS='{"DD-API-KEY":"YOUR_API_KEY"}'` |
| **SigNoz** | `TELEMETRY_OTEL_ENDPOINT=http://localhost:4318` |
| **Grafana Cloud** | `TELEMETRY_OTEL_ENDPOINT=https://otlp-gateway-prod-us-east-0.grafana.net/otlp`<br>`TELEMETRY_OTEL_HEADERS='{"Authorization":"Basic YOUR_TOKEN"}'` |

### 4. Console Exporter (Development) ⭐ NEW

Pretty-printed, colorized output for development debugging.

**Features:**
- Event-type badges (MCP, CLI, DISC, SYNC, INTG, VALID)
- Color-coded status (✓/✗)
- Token usage and cost display
- JSON fallback when `pretty=false`

**Example output:**

```
2026-01-31T12:00:00.000Z  MCP  2.tool-call ✓ 1234ms
  Layer: 2
  Server: framework
  Tool: agentic_init
  Tokens: 150 (in: 100, out: 50)

2026-01-31T12:00:05.000Z  CLI  backlog create-ticket ✓ 523ms
  Command: backlog create-ticket
```

**Enable:**

```bash
export TELEMETRY_CONSOLE_ENABLED=true
export TELEMETRY_CONSOLE_PRETTY=true
```

---

## MCP Telemetry ⭐ NEW

### MCP Architecture Layers

The framework tracks MCP operations across all 4 layers:

| Layer | Description | Example Tools |
|-------|-------------|---------------|
| **Layer 1** | Reference MCPs | `graphiti_*`, `jetbrains_*` |
| **Layer 2** | CLI Tools | `agentic_*`, `jira_*`, `confluence_*` |
| **Layer 3** | Dynamic Discovery | `mcp-find`, `mcp-add`, `mcp-exec` |
| **Layer 3b** | Web Search | `web_search`, `web_fetch` |

### MCP Event Structure

```typescript
{
  "timestamp": "2026-01-31T12:00:00.000Z",
  "event_type": "mcp",
  "operation": "2.tool-call",
  "layer": "2",
  "operation_type": "tool-call",
  "server_name": "framework",
  "tool_name": "agentic_init",
  "arguments": {
    "projectPath": "/path/to/project",
    "modules": ["core", "coding"],
    // Sensitive fields automatically redacted:
    // "apiKey": "[REDACTED]",
    // "password": "[REDACTED]"
  },
  "token_usage": {
    "input_tokens": 100,
    "output_tokens": 50,
    "total_tokens": 150
  },
  "cost_usd": 0.0042,
  "result": {
    "success": true,
    "items_returned": 5
  },
  "success": true,
  "duration_ms": 1234,
  "session_id": "sess_abc123def456"
}
```

### Tracked Metrics

- **Operation counts** by layer, server, tool
- **Token usage** (input, output, total)
- **Cost tracking** (USD)
- **Performance** (duration, success rate)
- **Error rates** by layer/operation

### Argument Sanitization

Automatically redacts sensitive fields:
- `password`, `token`, `apiKey`, `api_key`
- `secret`, `auth`, `authorization`
- `credentials`, `bearer`, `jwt`
- `session`, `cookie`

Nested objects are recursively sanitized.

---

## Configuration

### Configuration File

**Location:** `telemetry.config.json` (project root)

**Example:**

```json
{
  "telemetry": {
    "enabled": true,
    "level": "info",
    "session": {
      "enabled": true,
      "includeMachineId": false
    },
    "exporters": {
      "jsonFile": {
        "enabled": true,
        "path": ".claude/telemetry/events.jsonl",
        "maxSize": "10MB",
        "rotation": "daily"
      },
      "sessionFile": {
        "enabled": true,
        "directory": ".claude/telemetry/sessions",
        "maxFiles": 50,
        "maxAgeDays": 7
      },
      "otel": {
        "enabled": false,
        "endpoint": "http://localhost:4318",
        "serviceName": "agentic-framework"
      },
      "console": {
        "enabled": false,
        "pretty": true,
        "level": "info",
        "colors": true
      }
    },
    "instrumentation": {
      "discovery": true,
      "sync": true,
      "cli": true,
      "integrations": true,
      "validator": true,
      "mcp": true
    }
  }
}
```

### Environment Variables

Environment variables override config file settings.

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `TELEMETRY_ENABLED` | boolean | `true` | Master switch for all telemetry |
| `TELEMETRY_LEVEL` | string | `info` | Log level: `debug`, `info`, `warn`, `error` |
| **JSON File Exporter** |
| `TELEMETRY_JSON_ENABLED` | boolean | `true` | Enable JSONL file export |
| `TELEMETRY_JSON_PATH` | string | `.claude/telemetry/events.jsonl` | Output file path |
| **Session File Exporter** |
| `TELEMETRY_SESSION_FILE_ENABLED` | boolean | `true` | Enable session files |
| `TELEMETRY_SESSION_FILE_DIR` | string | `.claude/telemetry/sessions` | Session directory |
| `TELEMETRY_SESSION_FILE_MAX_FILES` | number | `50` | Max session files to keep |
| `TELEMETRY_SESSION_FILE_MAX_AGE_DAYS` | number | `7` | Max age in days |
| **OTLP Exporter** |
| `TELEMETRY_OTEL_ENABLED` | boolean | `false` | Enable OTLP export |
| `TELEMETRY_OTEL_ENDPOINT` | string | `http://localhost:4318` | OTLP endpoint URL |
| `TELEMETRY_OTEL_SERVICE_NAME` | string | `agentic-framework` | Service name |
| **Console Exporter** ⭐ NEW |
| `TELEMETRY_CONSOLE_ENABLED` | boolean | `false` | Enable console output |
| `TELEMETRY_CONSOLE_PRETTY` | boolean | `true` | Pretty-print events |
| `TELEMETRY_CONSOLE_COLORS` | boolean | `true` | Enable colors |
| `TELEMETRY_CONSOLE_LEVEL` | string | `info` | Console log level |
| **Instrumentation** |
| `TELEMETRY_INSTR_DISCOVERY` | boolean | `true` | Track discovery operations |
| `TELEMETRY_INSTR_SYNC` | boolean | `true` | Track sync operations |
| `TELEMETRY_INSTR_CLI` | boolean | `true` | Track CLI commands |
| `TELEMETRY_INSTR_MCP` | boolean | `true` | Track MCP operations ⭐ NEW |
| **Session** |
| `TELEMETRY_SESSION_ENABLED` | boolean | `true` | Enable session tracking |
| `TELEMETRY_SESSION_MACHINE_ID` | boolean | `false` | Include machine ID |

**Priority:** Environment variables > Config file > Defaults

---

## Privacy & Security

### Automatic Sanitization

All telemetry exporters automatically sanitize sensitive data:

```typescript
// Before sanitization
{
  "arguments": {
    "username": "alice",
    "password": "secret123",
    "apiKey": "sk-abc123",
    "config": {
      "token": "xyz789"
    }
  }
}

// After sanitization
{
  "arguments": {
    "username": "alice",
    "password": "[REDACTED]",
    "apiKey": "[REDACTED]",
    "config": {
      "token": "[REDACTED]"
    }
  }
}
```

### .gitignore Coverage

Telemetry files are automatically excluded from version control:

```gitignore
# Agentic Framework
.claude/telemetry/
telemetry.config.json
```

Added during `agentic-framework init`.

### GDPR Compliance

- **No PII collection** - Only operation metadata
- **Local-first** - Telemetry stored locally by default
- **Opt-out** - Set `TELEMETRY_ENABLED=false`
- **Data retention** - Configurable cleanup (7 days default)

---

## Common Recipes

### Find Most Popular Skills

```bash
cat .claude/telemetry/events.jsonl | \
  jq -r '.skills_discovered[]?.skill_id' | \
  sort | uniq -c | sort -rn
```

**Why:** Identify which skills are most valuable to agents. Consider promoting these or building similar ones.

### MCP Cost Analysis by Tool ⭐ NEW

```bash
cat .claude/telemetry/events.jsonl | \
  jq -s '[.[] | select(.cost_usd != null)] |
         group_by(.tool_name) |
         map({tool: .[0].tool_name, total_cost: map(.cost_usd) | add})'
```

**Why:** Track LLM costs by MCP tool to optimize spending.

### Measure Discovery Performance

```bash
cat .claude/telemetry/events.jsonl | \
  jq -s 'map(select(.event_type == "discovery")) |
         map(.discovery_duration_ms) |
         add / length'
```

**Why:** Discovery should be fast (<50ms). If it's slow, you might have too many modules or need caching.

### Track MCP Layer Usage ⭐ NEW

```bash
cat .claude/telemetry/events.jsonl | \
  jq -r 'select(.event_type == "mcp") | .layer' | \
  sort | uniq -c
```

**Why:** Understand which MCP layers are used most. Layer 2 (CLI tools) should be most common.

### Identify Problem Areas

```bash
cat .claude/telemetry/events.jsonl | \
  jq 'select(.success == false) |
      {type: .event_type, operation: .operation, error: .error.message}'
```

**Why:** Surface errors and failures. Fix the most common issues first.

---

## Development Workflow

### 1. Enable Console Exporter

```bash
export TELEMETRY_CONSOLE_ENABLED=true
export TELEMETRY_CONSOLE_PRETTY=true

agentic-framework init test-project
```

**Output:**

```
2026-01-31T12:00:00.000Z  MCP  2.tool-call ✓ 1234ms
  Layer: 2
  Server: framework
  Tool: agentic_init
  Tokens: 150 (in: 100, out: 50)

2026-01-31T12:00:05.000Z  CLI  init ✓ 5234ms
  Command: init
```

### 2. Query JSONL Events

```bash
# Find slow operations (>1 second)
cat .claude/telemetry/events.jsonl | jq 'select(.duration_ms > 1000)'

# MCP operations by server
cat .claude/telemetry/events.jsonl | jq -s 'group_by(.server_name) | map({server: .[0].server_name, count: length})'

# Error summary
cat .claude/telemetry/events.jsonl | jq -s '[.[] | select(.error != null)] | group_by(.event_type) | map({type: .[0].event_type, errors: length})'
```

### 3. Debug Session Workflows

```bash
# List recent sessions
ls -t .claude/telemetry/sessions/ | head -5

# View specific session
export SESSION_ID=sess_abc123def456
cat .claude/telemetry/sessions/${SESSION_ID}.jsonl | jq .
```

---

## Performance Impact

Telemetry is designed to be **non-blocking** and **low-overhead**:

| Operation | Overhead | Notes |
|-----------|----------|-------|
| Event recording | <1ms | Fire-and-forget async export |
| Console export | ~1-2ms | Synchronous `console.log` |
| JSONL export | <5ms | Buffered writes (1s interval) |
| OTLP export | 2-10ms | Network-dependent, configurable timeout |

**Buffering strategy:**
- Events buffered in memory (max 100 events or 1 second)
- Background flush every 1 second
- Graceful shutdown flushes all pending events

---

## OpenTelemetry GenAI Semantic Conventions ⭐ NEW

The framework follows [OpenTelemetry GenAI Semantic Conventions v1.37+](https://opentelemetry.io/docs/specs/semconv/gen-ai/) for standardized AI/LLM observability.

### Standard Attributes

| Attribute | Example | Description |
|-----------|---------|-------------|
| `gen_ai.system` | `mcp`, `claude`, `framework` | AI system identifier |
| `gen_ai.request.model` | `claude-sonnet-4` | Model name |
| `gen_ai.usage.input_tokens` | `150` | Input token count |
| `gen_ai.usage.output_tokens` | `50` | Output token count |
| `gen_ai.usage.total_tokens` | `200` | Total tokens |
| `gen_ai.cost_usd` | `0.0042` | Cost in USD |
| `gen_ai.agent.id` | `ai-app-developer` | Agent identifier |
| `gen_ai.agent.variant` | `slim` | Agent variant |

### Platform Support

These conventions are supported by:
- **Datadog** - [LLM Observability](https://www.datadoghq.com/blog/llm-otel-semantic-convention/)
- **Honeycomb** - Native GenAI support
- **Langfuse** - [Claude Agent SDK integration](https://langfuse.com/integrations/frameworks/claude-agent-sdk)
- **SigNoz** - [Claude Code monitoring](https://signoz.io/blog/claude-code-monitoring-with-opentelemetry/)
- **Grafana** - OpenTelemetry data source

---

## Troubleshooting

### No events in JSONL file

**Check:**
1. Telemetry enabled: `TELEMETRY_ENABLED=true`
2. JSON exporter enabled: `TELEMETRY_JSON_ENABLED=true`
3. File permissions (directory must be writable)
4. Buffer flush interval (wait 1 second)

**Debug:**

```bash
export TELEMETRY_CONSOLE_ENABLED=true
agentic-framework list
# Should see console output immediately
```

### OTLP export failing

**Check:**
1. Endpoint reachable: `curl -v http://localhost:4318`
2. Headers correct: `TELEMETRY_OTEL_HEADERS='{"x-api-key":"..."}'`
3. Network timeout (default 30s)

**Debug:**

```bash
# Enable verbose OpenTelemetry logging
export OTEL_LOG_LEVEL=debug
export TELEMETRY_OTEL_ENABLED=true

agentic-framework list
```

### Sensitive data in logs

**Verify sanitization:**

```bash
cat .claude/telemetry/events.jsonl | jq '.arguments' | grep -i "password\|token\|apikey"
# Should only see "[REDACTED]"
```

---

## References

- [OpenTelemetry GenAI Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- [SigNoz Claude Code Monitoring](https://signoz.io/blog/claude-code-monitoring-with-opentelemetry/)
- [Datadog LLM Observability](https://www.datadoghq.com/blog/llm-otel-semantic-convention/)
- [Langfuse Claude Agent SDK](https://langfuse.com/integrations/frameworks/claude-agent-sdk)
- [Model Context Protocol Best Practices](https://modelcontextprotocol.info/docs/best-practices/)
- [Claude Code Observability - Official Docs](https://code.claude.com/docs/en/monitoring-usage)

---

**Version:** 1.4.0 | **Last Updated:** 2026-01-31
