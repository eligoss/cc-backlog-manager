---
title: MCP & Agent Telemetry Feature
description: Production-ready observability for AI agents with OpenTelemetry GenAI Semantic Conventions
audience: user
last-updated: 2026-01-31
---

# MCP & Agent Telemetry Feature

**Status:** ✅ Production Ready
**Version:** 1.4.0+
**Branch:** `feature/mcp-agent-telemetry`

---

## What is This?

A comprehensive telemetry system that automatically tracks:

- **🔧 MCP Operations** - All Model Context Protocol tool calls across 4 architectural layers
- **🤖 Agent Executions** - Claude commands, agents, and subagent spawning
- **📊 Performance Metrics** - Token usage, costs, duration, success rates
- **🔍 OpenTelemetry Integration** - Industry-standard GenAI Semantic Conventions v1.37+

**Key Benefits:**
- 📈 Track AI costs in real-time
- 🐛 Debug agent workflows with session correlation
- 🎯 Optimize performance with detailed metrics
- 🔌 Integrate with Honeycomb, Datadog, SigNoz, Grafana Cloud

---

## Quick Start (30 seconds)

### 1. Enable Console Output (Development)

```bash
# See telemetry in real-time
export TELEMETRY_CONSOLE_ENABLED=true
export TELEMETRY_CONSOLE_PRETTY=true

# Run any command
agentic-framework sync
```

**Output:**
```
2026-01-31T12:00:00.000Z  MCP  2.tool-call ✓ 1234ms
  Layer: 2
  Server: framework
  Tool: agentic_init
  Tokens: 150 (in: 100, out: 50)
```

### 2. Track Claude Agents (Opt-In)

```bash
# Enable agent tracking
export TELEMETRY_INSTR_AGENT=true

# Use agents in Claude Code
/ai-architect
/ai-app-developer
```

### 3. Query Your Data

```bash
# View MCP tool calls
cat .claude/telemetry/events.jsonl | jq 'select(.event_type == "mcp")'

# Calculate total AI costs
cat .claude/telemetry/events.jsonl | \
  jq -s '[.[] | select(.cost_usd)] | {total: (map(.cost_usd) | add)}'
```

---

## What Gets Tracked?

### MCP Operations (Default: ON)

Tracks all MCP tool calls across 4 layers:

| Layer | Description | Example Tools |
|-------|-------------|---------------|
| **Layer 1** | Reference MCPs | `graphiti_search_memory`, `jetbrains_execute_run` |
| **Layer 2** | CLI Tools | `agentic_init`, `jira_sync`, `confluence_create_page` |
| **Layer 3** | Dynamic Discovery | `mcp-find`, `mcp-add`, `mcp-exec` |
| **Layer 3b** | Web Search | `web_search`, `web_fetch` |

**Captured Metrics:**
- ✅ Tool name, server, layer
- ✅ Arguments (sensitive data auto-redacted)
- ✅ Duration, success/failure
- ✅ Token usage, cost (USD)

### Agent Executions (Default: OFF - Privacy)

Tracks Claude Code commands and agent invocations:

**Execution Types:**
- **Commands:** `/ai-architect`, `/ai-app-developer`, etc.
- **Agents:** Full agent invocations
- **Subagents:** Task tool spawned agents

**Captured Metrics:**
- ✅ Agent name, model (opus/sonnet/haiku)
- ✅ Parent agent (for subagents)
- ✅ Token usage, cost
- ✅ Success/failure, duration

---

## Configuration

### Method 1: Use .env File (Recommended)

```bash
# Copy template
cp .env.example .env

# Edit configuration
vim .env
```

**Example .env:**
```bash
# Development setup
TELEMETRY_CONSOLE_ENABLED=true
TELEMETRY_CONSOLE_PRETTY=true
TELEMETRY_INSTR_AGENT=true

# Production setup
TELEMETRY_OTEL_ENABLED=true
TELEMETRY_OTEL_ENDPOINT=https://api.honeycomb.io
TELEMETRY_OTEL_HEADERS={"x-honeycomb-team":"YOUR_API_KEY"}
```

### Method 2: Environment Variables

```bash
# Quick toggles
export TELEMETRY_CONSOLE_ENABLED=true
export TELEMETRY_INSTR_AGENT=true
export TELEMETRY_INSTR_MCP=true
```

---

## Real-World Examples

### Example 1: Track AI Costs Per Project

```bash
# Enable cost tracking
export TELEMETRY_INSTR_AGENT=true

# Work on your project
/ai-architect "Design authentication system"
/ai-app-developer "Implement user login"

# Calculate project costs
cat .claude/telemetry/events.jsonl | \
  jq -s '[.[] | select(.cost_usd)] |
         {total_cost: (map(.cost_usd) | add | . * 100 | round / 100),
          total_tokens: (map(.token_usage.total_tokens // 0) | add),
          operations: length}'
```

**Output:**
```json
{
  "total_cost": 2.45,
  "total_tokens": 125000,
  "operations": 37
}
```

### Example 2: Debug Slow MCP Operations

```bash
# Find operations taking >1 second
cat .claude/telemetry/events.jsonl | \
  jq 'select(.event_type == "mcp" and .duration_ms > 1000) |
      {tool: .tool_name, duration: .duration_ms, layer: .layer}'
```

**Output:**
```json
{
  "tool": "graphiti_search_memory",
  "duration": 2341,
  "layer": "1"
}
```

### Example 3: Monitor Agent Success Rates

```bash
# Group by agent and calculate success rate
cat .claude/telemetry/events.jsonl | \
  jq -s 'map(select(.event_type == "agent")) |
         group_by(.name) |
         map({agent: .[0].name,
              total: length,
              successful: (map(select(.success == true)) | length),
              success_rate: ((map(select(.success == true)) | length) / length * 100 | round)})'
```

---

## OpenTelemetry Integration

### Supported Platforms

**Pre-configured examples in `.env.example`:**

1. **Honeycomb** (Recommended for teams)
   ```bash
   TELEMETRY_OTEL_ENABLED=true
   TELEMETRY_OTEL_ENDPOINT=https://api.honeycomb.io
   TELEMETRY_OTEL_HEADERS={"x-honeycomb-team":"YOUR_API_KEY"}
   ```

2. **Datadog** (Enterprise APM)
   ```bash
   TELEMETRY_OTEL_ENDPOINT=https://trace.agent.datadoghq.com
   TELEMETRY_OTEL_HEADERS={"DD-API-KEY":"YOUR_API_KEY"}
   ```

3. **SigNoz** (Self-hosted, privacy-first)
   ```bash
   TELEMETRY_OTEL_ENDPOINT=http://localhost:4318
   ```

4. **Grafana Cloud** (Custom dashboards)
   ```bash
   TELEMETRY_OTEL_ENDPOINT=https://otlp-gateway-prod-us-east-0.grafana.net/otlp
   TELEMETRY_OTEL_HEADERS={"Authorization":"Basic YOUR_TOKEN"}
   ```

### GenAI Semantic Conventions

Standard attributes for AI/LLM observability:

```typescript
{
  "gen_ai.system": "mcp",              // 'claude', 'mcp', 'framework'
  "gen_ai.request.model": "opus",
  "gen_ai.usage.input_tokens": 150,
  "gen_ai.usage.output_tokens": 50,
  "gen_ai.usage.total_tokens": 200,
  "gen_ai.cost_usd": 0.0042,
  "mcp.layer": "2",
  "agent.execution_type": "command"
}
```

Compatible with Datadog LLM Observability, Honeycomb, Langfuse, and SigNoz.

---

## Privacy & Security

### Privacy-First Design

**Default Settings:**
- ✅ MCP telemetry: **ON** (tracks framework operations)
- ⚠️ Agent telemetry: **OFF** (opt-in for privacy)
- ✅ Local storage: **ON** (data stays on your machine)
- ✅ OTLP export: **OFF** (opt-in for cloud)

### Automatic Sanitization

Sensitive data is **automatically redacted** before export:

**Redacted Fields:**
- `password`, `token`, `apiKey`, `api_key`
- `secret`, `auth`, `authorization`
- `credentials`, `bearer`, `jwt`
- `session`, `cookie`

**Example:**
```json
// Before sanitization
{
  "arguments": {
    "username": "alice",
    "password": "secret123",
    "apiKey": "sk-abc123"
  }
}

// After sanitization
{
  "arguments": {
    "username": "alice",
    "password": "[REDACTED]",
    "apiKey": "[REDACTED]"
  }
}
```

### Gitignore Coverage

**Automatically excluded from version control:**
- `.claude/telemetry/` (telemetry data)
- `telemetry.config.json` (project config)
- `.env` (environment variables)

---

## Performance Impact

**Overhead:** <1ms per operation
**Design:** Fire-and-forget async, non-blocking
**Buffering:** 100 events or 1 second (whichever comes first)

**Benchmarks:**
- Event recording: <0.5ms
- Console export: ~1-2ms
- JSONL export: <5ms (buffered)
- OTLP export: 2-10ms (network-dependent)

✅ **Telemetry never blocks your application.**

---

## Documentation

**Complete Guides:**
- 📖 [Telemetry User Guide](telemetry-guide.md) - Practical examples and workflows
- 📚 [Telemetry Technical Reference](telemetry.md) - API documentation and advanced features
- ⚙️ [.env.example](../.env.example) - Configuration template with all options

**Quick Links:**
- [Quick Start](#quick-start-30-seconds)
- [Configuration](#configuration)
- [Real-World Examples](#real-world-examples)
- [OpenTelemetry Integration](#opentelemetry-integration)

---

## Common Questions

**Q: Will this slow down my CLI commands?**
A: No. Overhead is <1ms per operation with fire-and-forget async design.

**Q: Is my agent data sent to third parties?**
A: No, by default. Data is stored locally. OTLP export is opt-in.

**Q: Can I track costs without enabling agent telemetry?**
A: Yes. MCP operations include cost tracking when available.

**Q: How do I disable telemetry?**
A: `export TELEMETRY_ENABLED=false` or add to `.env` file.

**Q: Where is my data stored?**
A: Local: `.claude/telemetry/events.jsonl` and `.claude/telemetry/sessions/`

**Q: Can I use this in production?**
A: Yes! It's production-ready with comprehensive testing and privacy safeguards.

---

## What's Next?

### For Development:
```bash
# 1. Enable console output
export TELEMETRY_CONSOLE_ENABLED=true
export TELEMETRY_CONSOLE_PRETTY=true

# 2. Run your workflow
agentic-framework init my-project
```

### For Production:
```bash
# 1. Copy .env template
cp .env.example .env

# 2. Configure OTLP endpoint (Honeycomb, Datadog, etc.)
vim .env

# 3. Deploy
agentic-framework <your-commands>
```

### For Analysis:
```bash
# Query local data
cat .claude/telemetry/events.jsonl | jq '.'

# Export to CSV for Excel
cat .claude/telemetry/events.jsonl | \
  jq -r '[.timestamp, .event_type, .duration_ms, .cost_usd] | @csv' \
  > telemetry.csv
```

---

## Get Started

**Enable telemetry in 3 steps:**

1. **Copy configuration:**
   ```bash
   cp .env.example .env
   ```

2. **Enable features you want:**
   ```bash
   # Edit .env
   TELEMETRY_CONSOLE_ENABLED=true
   TELEMETRY_INSTR_AGENT=true  # Opt-in for agent tracking
   ```

3. **Use the framework:**
   ```bash
   agentic-framework <any-command>
   ```

**View your data:**
```bash
cat .claude/telemetry/events.jsonl | jq '.'
```

---

**Questions?** See the [complete guides](telemetry-guide.md) or check [troubleshooting](telemetry.md#troubleshooting).

**Feedback?** Open an issue: https://github.com/eligoss/agentic-development-framework/issues
