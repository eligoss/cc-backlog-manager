/**
 * MCP Server Types
 *
 * Type definitions for the MCP server that wraps CLI commands.
 *
 * @module mcp/types
 */

import type { z } from 'zod';

/**
 * Successful result from an MCP tool
 */
export interface MCPSuccessResult {
  success: true;
  data?: Record<string, unknown>;
  message?: string;
  output?: string;
}

/**
 * Error result from an MCP tool
 */
export interface MCPErrorResult {
  success: false;
  error: {
    code: string;
    message: string;
    suggestion?: string;
    details?: unknown;
  };
}

/**
 * Result from an MCP tool (success or error)
 */
export type MCPResult = MCPSuccessResult | MCPErrorResult;

/**
 * MCP Tool definition (non-generic for easier use)
 */
export interface MCPTool {
  /** Tool name (e.g., 'agentic_validate') */
  name: string;
  /** Human-readable description */
  description: string;
  /** Zod schema for input validation */
  inputSchema: z.ZodType;
  /** Tool handler function */
  handler: (args: unknown) => Promise<MCPResult>;
}

/**
 * MCP Tool metadata for registration
 */
export interface MCPToolMetadata {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Options for capturing command output
 */
export interface CaptureOptions {
  /** Strip ANSI color codes from output */
  stripColors?: boolean;
  /** Maximum output length before truncation */
  maxLength?: number;
}

/**
 * Result from capturing command output
 */
export interface CapturedOutput {
  /** Captured stdout/stderr */
  output: string;
  /** Whether output was truncated */
  truncated: boolean;
  /** Original exit code (if process.exit was called) */
  exitCode?: number;
}

/**
 * Common error codes for MCP tools
 */
export const ErrorCodes = {
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_ARGUMENTS: 'INVALID_ARGUMENTS',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  COMMAND_FAILED: 'COMMAND_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Helper to create a success result
 */
export function successResult(
  data?: Record<string, unknown>,
  message?: string,
  output?: string
): MCPSuccessResult {
  return { success: true, data, message, output };
}

/**
 * Helper to create an error result
 */
export function errorResult(
  code: ErrorCode,
  message: string,
  suggestion?: string,
  details?: unknown
): MCPErrorResult {
  return {
    success: false,
    error: { code, message, suggestion, details },
  };
}
