/**
 * Telemetry Types
 * TypeScript interfaces for telemetry events, configuration, and exporters
 */

/**
 * Telemetry event types
 */
export type TelemetryEventType = 'discovery' | 'sync' | 'cli' | 'integration' | 'validation' | 'mcp' | 'agent';

/**
 * Telemetry log levels
 */
export type TelemetryLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Session context for correlating events
 */
export interface SessionContext {
  /** Unique session identifier (e.g., sess_abc123def456) */
  session_id: string;
  /** Parent session ID for delegated/spawned agents */
  parent_session_id?: string;
  /** Correlation ID for tracing related operations within a session */
  correlation_id?: string;
  /** Timestamp when the session started */
  session_start?: string;
  /** Machine/environment identifier (optional) */
  machine_id?: string;
}

/**
 * Base telemetry event structure
 */
export interface BaseTelemetryEvent {
  timestamp: string;
  event_type: TelemetryEventType;
  operation: string;
  /** Session ID for correlating events across a Claude session */
  session_id?: string;
  /** Parent session ID for delegated agents */
  parent_session_id?: string;
  /** Correlation ID for tracing related operations */
  correlation_id?: string;
  success?: boolean;
  duration_ms?: number;
  error?: {
    message: string;
    stack?: string;
  };
}

/**
 * Discovery operation event
 */
export interface DiscoveryEvent extends BaseTelemetryEvent {
  event_type: 'discovery';
  agent_id: string;
  module_id: string;
  variant?: 'full' | 'slim';
  capabilities_requested: string[];
  skills_discovered: Array<{
    skill_id: string;
    module: string;
    source: string;
  }>;
  unfulfilled_capabilities: string[];
  discovery_duration_ms: number;
  cache_hit?: boolean;
}

/**
 * Sync operation event
 */
export interface SyncEvent extends BaseTelemetryEvent {
  event_type: 'sync';
  files_processed: number;
  changes_detected: number;
  files_written: number;
  errors: number;
}

/**
 * CLI command event
 */
export interface CLIEvent extends BaseTelemetryEvent {
  event_type: 'cli';
  command: string;
  subcommand?: string;
  options?: Record<string, unknown>;
  result?: {
    skills_synced?: number;
    agents_synced?: number;
    errors?: number;
    [key: string]: unknown;
  };
}

/**
 * Integration operation event (Jira, Confluence, etc.)
 */
export interface IntegrationEvent extends BaseTelemetryEvent {
  event_type: 'integration';
  integration_type: 'jira' | 'confluence';
  items_processed?: number;
  api_calls?: number;
  retries?: number;
  rate_limit_hits?: number;
}

/**
 * Validation event
 */
export interface ValidationEvent extends BaseTelemetryEvent {
  event_type: 'validation';
  validator_type: string;
  items_validated: number;
  errors_found: number;
  warnings_found: number;
}

/**
 * MCP operation event
 */
export interface MCPEvent extends BaseTelemetryEvent {
  event_type: 'mcp';
  /** MCP architecture layer: 1=Reference MCPs, 2=CLI tools, 3=Dynamic discovery, 3b=Web */
  layer: '1' | '2' | '3' | '3b';
  operation_type: 'mcp-find' | 'mcp-add' | 'mcp-exec' | 'mcp-remove' | 'mcp-config-set' | 'tool-call';
  /** MCP server name (e.g., 'MCP_DOCKER', 'graphiti', 'jetbrains') */
  server_name?: string;
  /** Tool name (e.g., 'agentic_init', 'search_memory_facts') */
  tool_name?: string;
  /** Sanitized arguments (secrets removed) */
  arguments?: Record<string, unknown>;
  /** Token usage metrics */
  token_usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  /** Estimated cost in USD */
  cost_usd?: number;
  /** Operation result */
  result?: {
    success: boolean;
    items_returned?: number;
    error_code?: string;
  };
}

/**
 * Claude Agent/Command execution event
 */
export interface AgentEvent extends BaseTelemetryEvent {
  event_type: 'agent';
  /** Type of execution: 'command', 'agent', 'subagent' */
  execution_type: 'command' | 'agent' | 'subagent';
  /** Name of the command/agent executed (e.g., '/ai-architect', 'ai-app-developer-slim') */
  name: string;
  /** Parent agent ID if this is a subagent */
  parent_agent_id?: string;
  /** Subagent type if spawned via Task tool */
  subagent_type?: string;
  /** Model used (e.g., 'opus', 'sonnet', 'haiku') */
  model?: string;
  /** Prompt/task provided to the agent */
  prompt?: string; // Truncated for privacy
  /** Token usage metrics */
  token_usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  /** Estimated cost in USD */
  cost_usd?: number;
  /** Execution result */
  result?: {
    success: boolean;
    output_summary?: string; // Truncated
    error_code?: string;
  };
}

/**
 * Union type of all telemetry events
 */
export type TelemetryEvent =
  | DiscoveryEvent
  | SyncEvent
  | CLIEvent
  | IntegrationEvent
  | ValidationEvent
  | MCPEvent
  | AgentEvent;

/**
 * JSON file exporter configuration
 */
export interface JsonFileExporterConfig {
  enabled: boolean;
  path: string;
  maxSize: string; // e.g., "10MB"
  rotation: 'daily' | 'size' | 'none';
}

/**
 * Session file exporter configuration
 * Creates separate log files per session for easy parallel run distinction
 */
export interface SessionFileExporterConfig {
  enabled: boolean;
  /** Directory for session log files */
  directory: string;
  /** Maximum number of session files to keep */
  maxFiles: number;
  /** Maximum age of session files in days */
  maxAgeDays: number;
}

/**
 * OpenTelemetry exporter configuration
 */
export interface OtelExporterConfig {
  enabled: boolean;
  endpoint: string;
  serviceName: string;
  headers?: Record<string, string>;
}

/**
 * Console exporter configuration
 */
export interface ConsoleExporterConfig {
  enabled: boolean;
  pretty: boolean;
  level: TelemetryLevel;
  colors: boolean;
}

/**
 * Instrumentation configuration
 */
export interface InstrumentationConfig {
  discovery: boolean;
  sync: boolean;
  cli: boolean;
  integrations?: boolean;
  validator?: boolean;
  mcp?: boolean;
  agent?: boolean;
}

/**
 * Session configuration
 */
export interface SessionConfig {
  /** Enable session tracking */
  enabled: boolean;
  /** Include machine identifier in session context */
  includeMachineId: boolean;
}

/**
 * Complete telemetry configuration
 */
export interface TelemetryConfig {
  enabled: boolean;
  level: TelemetryLevel;
  session: SessionConfig;
  exporters: {
    jsonFile: JsonFileExporterConfig;
    sessionFile: SessionFileExporterConfig;
    otel: OtelExporterConfig;
    console: ConsoleExporterConfig;
  };
  instrumentation: InstrumentationConfig;
}

/**
 * Telemetry exporter interface
 */
export interface TelemetryExporter {
  export(event: TelemetryEvent): Promise<void>;
  flush?(): Promise<void>;
  shutdown?(): Promise<void>;
}

/**
 * Span attributes for OpenTelemetry
 * Includes OpenTelemetry GenAI Semantic Conventions v1.37+
 */
export interface SpanAttributes {
  // OpenTelemetry GenAI Semantic Conventions v1.37+
  'gen_ai.system'?: string; // 'claude', 'mcp', 'framework'
  'gen_ai.request.model'?: string; // 'claude-sonnet-4', 'haiku'
  'gen_ai.response.finish_reasons'?: string[];
  'gen_ai.usage.input_tokens'?: number;
  'gen_ai.usage.output_tokens'?: number;
  'gen_ai.usage.total_tokens'?: number;
  'gen_ai.response.id'?: string;
  'gen_ai.prompt'?: string; // Sanitized

  // Framework-specific GenAI attributes
  'gen_ai.operation.name'?: string;
  'gen_ai.agent.id'?: string;
  'gen_ai.agent.variant'?: 'full' | 'slim';
  'gen_ai.capability'?: string;
  'gen_ai.skill.id'?: string;
  'gen_ai.context.level'?: 'basic' | 'advanced' | 'expert';

  // MCP-specific attributes
  'mcp.layer'?: '1' | '2' | '3' | '3b';
  'mcp.server.name'?: string;
  'mcp.tool.name'?: string;
  'mcp.operation.type'?: string;

  // Framework attributes
  'framework.module'?: string;
  'framework.operation'?: string;
  'framework.version'?: string;

  // CLI attributes
  'cli.command'?: string;
  'cli.subcommand'?: string;

  // Integration attributes
  'integration.type'?: 'jira' | 'confluence';
  'integration.operation'?: string;

  [key: string]: string | number | boolean | string[] | undefined;
}

/**
 * Telemetry span interface
 */
export interface TelemetrySpan {
  end(): void;
  recordException(error: Error): void;
  setAttribute(key: string, value: string | number | boolean): void;
  setAttributes(attributes: SpanAttributes): void;
}
