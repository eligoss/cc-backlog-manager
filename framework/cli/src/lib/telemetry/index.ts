/**
 * Telemetry Module
 * Public API for framework telemetry
 */

// Export types
export type {
  TelemetryEvent,
  TelemetryEventType,
  TelemetryLevel,
  TelemetryConfig,
  TelemetryExporter,
  TelemetrySpan,
  SpanAttributes,
  DiscoveryEvent,
  SyncEvent,
  CLIEvent,
  IntegrationEvent,
  ValidationEvent,
  MCPEvent,
  AgentEvent,
  JsonFileExporterConfig,
  SessionFileExporterConfig,
  OtelExporterConfig,
  ConsoleExporterConfig,
  InstrumentationConfig,
  SessionConfig,
  SessionContext
} from './types.js';

// Export configuration
export { loadTelemetryConfig, getDefaultConfig } from './config.js';

// Export telemetry manager
export { TelemetryManager, getTelemetry } from './telemetry-manager.js';

// Export session context utilities
export {
  initSession,
  getSessionContext,
  getSessionId,
  hasActiveSession,
  generateSessionId,
  generateCorrelationId,
  createChildSession,
  setCorrelationId,
  clearCorrelationId,
  withCorrelation,
  runWithSession,
  runWithSessionAsync,
  resetSessionContext
} from './session-context.js';

// Export exporters
export { JsonFileExporter } from './exporters/json-file-exporter.js';
export { SessionFileExporter } from './exporters/session-file-exporter.js';
export { OtelExporter } from './exporters/otel-exporter.js';
export { ConsoleExporter } from './exporters/console-exporter.js';

// Export MCP instrumentation
export {
  recordMCPOperation,
  withMCPTelemetry,
  recordMCPToolCall,
  recordMCPGatewayOperation
} from './instrumentation/mcp-instrumentation.js';
export type {
  TokenExtractor,
  CostExtractor
} from './instrumentation/mcp-instrumentation.js';

// Convenience functions
import { getTelemetry } from './telemetry-manager.js';
import type { TelemetryEvent, SpanAttributes, TelemetrySpan } from './types.js';

/**
 * Record a telemetry event
 */
export async function recordEvent(event: Partial<TelemetryEvent>): Promise<void> {
  const telemetry = getTelemetry();
  await telemetry.recordEvent(event);
}

/**
 * Start a telemetry span
 */
export function startSpan(name: string, attributes?: SpanAttributes): TelemetrySpan {
  const telemetry = getTelemetry();
  return telemetry.startSpan(name, attributes);
}

/**
 * Wrap a function with automatic telemetry
 */
export async function withTelemetry<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: SpanAttributes
): Promise<T> {
  const telemetry = getTelemetry();
  return telemetry.withTelemetry(name, fn, attributes);
}

/**
 * Check if telemetry is enabled
 */
export function isTelemetryEnabled(): boolean {
  const telemetry = getTelemetry();
  return telemetry.isEnabled();
}

/**
 * Check if a specific instrumentation is enabled
 */
export function isInstrumentationEnabled(
  type: 'discovery' | 'sync' | 'cli' | 'mcp'
): boolean {
  const telemetry = getTelemetry();
  return telemetry.isInstrumentationEnabled(type);
}

/**
 * Get current session ID (convenience function)
 */
export function getCurrentSessionId(): string | undefined {
  const telemetry = getTelemetry();
  return telemetry.getSessionId();
}

/**
 * Check if session tracking is enabled and active
 */
export function isSessionEnabled(): boolean {
  const telemetry = getTelemetry();
  return telemetry.isSessionEnabled();
}
