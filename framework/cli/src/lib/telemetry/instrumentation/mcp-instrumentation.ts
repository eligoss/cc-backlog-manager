/**
 * MCP Instrumentation
 * Helpers for tracking MCP operations across all layers
 */

import { MCPEvent } from '../types.js';
import { getTelemetry } from '../telemetry-manager.js';

/**
 * Sensitive argument keys to sanitize
 */
const SENSITIVE_KEYS = [
  'password',
  'token',
  'apikey',
  'api_key',
  'secret',
  'auth',
  'authorization',
  'credentials',
  'bearer',
  'jwt',
  'session',
  'cookie'
];

/**
 * Sanitize arguments by redacting sensitive values
 */
function sanitizeArguments(args: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(args)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some(sensitiveKey =>
      lowerKey.includes(sensitiveKey)
    );

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeArguments(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Token usage extractor function
 */
export type TokenExtractor<T> = (result: T) => {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
} | undefined;

/**
 * Cost extractor function
 */
export type CostExtractor<T> = (result: T) => number | undefined;

/**
 * Record an MCP operation
 */
export async function recordMCPOperation(params: {
  layer: '1' | '2' | '3' | '3b';
  operation_type: MCPEvent['operation_type'];
  server_name?: string;
  tool_name?: string;
  arguments?: Record<string, unknown>;
  duration_ms?: number;
  success: boolean;
  error?: Error;
  token_usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  cost_usd?: number;
  result?: {
    success: boolean;
    items_returned?: number;
    error_code?: string;
  };
}): Promise<void> {
  try {
    const telemetry = getTelemetry();

    // Check if MCP instrumentation is enabled
    if (!telemetry.isInstrumentationEnabled('mcp')) {
      return;
    }

    const event: MCPEvent = {
      timestamp: new Date().toISOString(),
      event_type: 'mcp',
      operation: `${params.layer}.${params.operation_type}`,
      layer: params.layer,
      operation_type: params.operation_type,
      server_name: params.server_name,
      tool_name: params.tool_name,
      arguments: params.arguments ? sanitizeArguments(params.arguments) : undefined,
      token_usage: params.token_usage,
      cost_usd: params.cost_usd,
      result: params.result,
      success: params.success,
      duration_ms: params.duration_ms,
      error: params.error ? {
        message: params.error.message,
        stack: params.error.stack
      } : undefined
    };

    await telemetry.recordEvent(event);
  } catch (error) {
    // Never throw - telemetry failures should not crash the app
    console.error('Failed to record MCP telemetry:', error);
  }
}

/**
 * Wrap an async function with MCP telemetry
 */
export async function withMCPTelemetry<T>(
  layer: '1' | '2' | '3' | '3b',
  operation_type: MCPEvent['operation_type'],
  server_name: string | undefined,
  tool_name: string | undefined,
  args: unknown,
  fn: () => Promise<T>,
  options?: {
    tokenExtractor?: TokenExtractor<T>;
    costExtractor?: CostExtractor<T>;
  }
): Promise<T> {
  const startTime = Date.now();
  let result: T | undefined;
  let error: Error | undefined;
  let success = false;

  try {
    result = await fn();
    success = true;
    return result;
  } catch (err) {
    error = err instanceof Error ? err : new Error(String(err));
    throw err;
  } finally {
    const duration_ms = Date.now() - startTime;

    // Extract token usage and cost if extractors provided
    // Note: result is guaranteed to be defined when success is true
    const token_usage = options?.tokenExtractor && success && result !== undefined
      ? options.tokenExtractor(result)
      : undefined;

    const cost_usd = options?.costExtractor && success && result !== undefined
      ? options.costExtractor(result)
      : undefined;

    // Sanitize arguments
    const sanitizedArgs = args && typeof args === 'object' && !Array.isArray(args)
      ? args as Record<string, unknown>
      : undefined;

    // Record telemetry (fire and forget)
    recordMCPOperation({
      layer,
      operation_type,
      server_name,
      tool_name,
      arguments: sanitizedArgs,
      duration_ms,
      success,
      error,
      token_usage,
      cost_usd,
      result: success ? { success: true } : undefined
    }).catch(() => {
      // Silently ignore telemetry errors
    });
  }
}

/**
 * Record an MCP tool call (convenience wrapper)
 */
export async function recordMCPToolCall(params: {
  layer: '1' | '2' | '3' | '3b';
  server_name: string;
  tool_name: string;
  arguments?: Record<string, unknown>;
  duration_ms: number;
  success: boolean;
  error?: Error;
  items_returned?: number;
  error_code?: string;
}): Promise<void> {
  return recordMCPOperation({
    layer: params.layer,
    operation_type: 'tool-call',
    server_name: params.server_name,
    tool_name: params.tool_name,
    arguments: params.arguments,
    duration_ms: params.duration_ms,
    success: params.success,
    error: params.error,
    result: {
      success: params.success,
      items_returned: params.items_returned,
      error_code: params.error_code
    }
  });
}

/**
 * Record an MCP gateway operation (mcp-find, mcp-add, mcp-exec, etc.)
 */
export async function recordMCPGatewayOperation(params: {
  operation_type: 'mcp-find' | 'mcp-add' | 'mcp-exec' | 'mcp-remove' | 'mcp-config-set';
  server_name?: string;
  tool_name?: string;
  arguments?: Record<string, unknown>;
  duration_ms: number;
  success: boolean;
  error?: Error;
  items_returned?: number;
}): Promise<void> {
  return recordMCPOperation({
    layer: '3',
    operation_type: params.operation_type,
    server_name: params.server_name,
    tool_name: params.tool_name,
    arguments: params.arguments,
    duration_ms: params.duration_ms,
    success: params.success,
    error: params.error,
    result: {
      success: params.success,
      items_returned: params.items_returned
    }
  });
}
