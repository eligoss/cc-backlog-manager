# MCP and Agent Telemetry Implementation

## Overview
Comprehensive telemetry system with MCP tracking and Claude agent monitoring, implementing OpenTelemetry GenAI Semantic Conventions v1.37+.

## Key Files

### Type Definitions
- **`framework/cli/src/lib/telemetry/types.ts`**
  - `MCPEvent` interface (lines 122-150): Tracks MCP operations across 4 layers
  - `AgentEvent` interface (lines 152-182): Tracks Claude commands/agents/subagents
  - `TelemetryEventType` includes 'mcp' and 'agent'
  - GenAI semantic convention attributes in `SpanAttributes` (lines 240+)

### Exporters
- **`framework/cli/src/lib/telemetry/exporters/console-exporter.ts`** (266 lines)
  - Pretty-printed, colorized console output
  - Event-type badges: MCP, AGENT, CLI, DISC, SYNC, INTG, VALID
  - `printMCPDetails()` (lines 139-164)
  - `printAgentDetails()` (lines 170-192)

- **`framework/cli/src/lib/telemetry/exporters/otel-exporter.ts`**
  - GenAI attributes for MCP events (lines 198-233)
  - GenAI attributes for Agent events (lines 269-302)
  - `gen_ai.system`, `gen_ai.usage.*`, `mcp.layer`, `agent.execution_type`

### Instrumentation
- **`framework/cli/src/lib/telemetry/instrumentation/mcp-instrumentation.ts`** (246 lines)
  - `recordMCPOperation()`: Records MCP events with automatic sanitization
  - `withMCPTelemetry()`: Wrapper for async functions with timing
  - `recordMCPToolCall()`, `recordMCPGatewayOperation()`: Convenience wrappers
  - Automatic argument sanitization (lines 12-50): Redacts password, token, apiKey, etc.

- **`framework/cli/src/mcp/tool-registry.ts`**
  - `execute()` method wrapped with `withMCPTelemetry()` (lines 80-130)
  - `getToolLayer()`: Detects layer from tool name (lines 80-94)
  - Layer 1: graphiti_*, jetbrains_*
  - Layer 2: agentic_*, jira_*, confluence_*
  - Layer 3b: web_*
  - Layer 3: everything else

### Configuration
- **`framework/cli/src/lib/telemetry/config.ts`**
  - Default config: `mcp: true`, `agent: false` (privacy)
  - Environment variables: `TELEMETRY_INSTR_MCP`, `TELEMETRY_INSTR_AGENT`
  - Console exporter config: `TELEMETRY_CONSOLE_ENABLED`, `TELEMETRY_CONSOLE_PRETTY`
  - Lines 185-196: MCP and agent instrumentation overrides

- **`.env.example`** (134 lines)
  - Comprehensive template with all telemetry environment variables
  - Examples for Honeycomb, Datadog, SigNoz, Grafana Cloud
  - Privacy and configuration patterns documented

### Manager
- **`framework/cli/src/lib/telemetry/telemetry-manager.ts`**
  - Console exporter registration (lines 211-215)
  - `isInstrumentationEnabled()` supports 'mcp' and 'agent' (lines 230-238)

### Documentation
- **`docs/telemetry.md`**: Technical reference (API documentation)
- **`docs/telemetry-guide.md`**: Practical user guide (769 lines)
- Both linked in `CLAUDE.md` documentation index

### Tests
- **Unit Tests (91 tests, >80% coverage):**
  - `framework/cli/src/lib/telemetry/__tests__/mcp-instrumentation.test.ts` (887 lines, 36 tests)
  - `framework/cli/src/lib/telemetry/__tests__/console-exporter.test.ts` (759 lines, 28 tests)
  - `framework/cli/src/lib/telemetry/__tests__/genai-attributes.test.ts` (591 lines, 27 tests)

- **Integration Tests (28 tests, 100% pass rate):**
  - `framework/cli/src/lib/telemetry/__tests__/mcp-integration.test.ts` (661 lines, 16 tests)
  - `framework/cli/src/__tests__/e2e/telemetry-mcp.test.ts` (629 lines, 12 tests)

## Architecture Patterns

### MCP Layer Detection
Tool name prefix determines layer:
- `graphiti_*`, `jetbrains_*` → Layer 1 (Reference MCPs)
- `agentic_*`, `jira_*`, `confluence_*` → Layer 2 (CLI Tools)
- `web_*` → Layer 3b (Web Search)
- All others → Layer 3 (Dynamic Discovery)

### Argument Sanitization
Recursive sanitization of sensitive keys (case-insensitive):
- password, token, apiKey, api_key, secret, auth, authorization
- credentials, bearer, jwt, session, cookie
- Nested objects sanitized recursively

### Event Flow
1. Operation occurs (MCP tool call, agent execution, CLI command)
2. Instrumentation wrapper captures timing, args, success/failure
3. `recordEvent()` called with event data
4. Event buffered (max 100 events or 1 second)
5. Exported to all enabled exporters (JSONL, Session, OTLP, Console)

## Configuration Patterns

### Development (Console Output)
```bash
TELEMETRY_CONSOLE_ENABLED=true
TELEMETRY_CONSOLE_PRETTY=true
TELEMETRY_INSTR_AGENT=true
```

### Production (OTLP Only)
```bash
TELEMETRY_CONSOLE_ENABLED=false
TELEMETRY_OTEL_ENABLED=true
TELEMETRY_OTEL_ENDPOINT=https://api.honeycomb.io
TELEMETRY_INSTR_AGENT=false  # Privacy
```

### Privacy-First (Minimal Tracking)
```bash
TELEMETRY_INSTR_MCP=true     # Track MCP operations
TELEMETRY_INSTR_AGENT=false  # No agent tracking (default)
TELEMETRY_OTEL_ENABLED=false # Local only
```

## Key Design Decisions

1. **Agent Tracking Opt-In**: Privacy-first design, disabled by default
2. **Automatic Sanitization**: All sensitive data redacted before export
3. **Non-Blocking**: Fire-and-forget async, <1ms overhead
4. **GenAI Conventions**: OpenTelemetry v1.37+ semantic conventions
5. **Local-First**: JSONL files by default, OTLP opt-in
6. **.env Support**: Environment variable overrides for all settings

## Usage Examples

### Query MCP Events
```bash
cat .claude/telemetry/events.jsonl | jq 'select(.event_type == "mcp")'
```

### Query Agent Events
```bash
cat .claude/telemetry/events.jsonl | jq 'select(.event_type == "agent")'
```

### Cost Tracking
```bash
cat .claude/telemetry/events.jsonl | \
  jq -s '[.[] | select(.cost_usd)] | {total: (map(.cost_usd) | add)}'
```

## Git Information
- **Branch**: `feature/mcp-agent-telemetry`
- **Commit**: `fa1a37c9` - Add comprehensive MCP and agent telemetry integration
- **Files Changed**: 21 files, +5735/-451 lines
- **Date**: 2026-01-31
