/**
 * Result Formatter
 *
 * Captures console output from CLI commands and converts to structured JSON.
 * Handles chalk colored output stripping and output truncation.
 *
 * @module mcp/result-formatter
 */

import type { CaptureOptions, CapturedOutput, MCPResult } from './types.js';
import { successResult, errorResult, ErrorCodes } from './types.js';

/**
 * ANSI escape code regex for stripping colors
 */
const ANSI_REGEX =
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

/**
 * Default maximum output length (100KB)
 */
const DEFAULT_MAX_LENGTH = 100 * 1024;

/**
 * Strip ANSI escape codes from a string
 */
export function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, '');
}

/**
 * Truncate string to max length with indicator
 */
export function truncateOutput(str: string, maxLength: number): { output: string; truncated: boolean } {
  if (str.length <= maxLength) {
    return { output: str, truncated: false };
  }
  return {
    output: str.slice(0, maxLength) + '\n... [output truncated]',
    truncated: true,
  };
}

/**
 * Error thrown when process.exit is called during capture
 */
class ProcessExitError extends Error {
  constructor(public readonly exitCode: number) {
    super(`Process exited with code ${exitCode}`);
    this.name = 'ProcessExitError';
  }
}

/**
 * Capture console output from a function execution
 *
 * This intercepts console.log, console.error, etc. to capture all output
 * from CLI commands that normally print to stdout/stderr.
 *
 * @param fn - The async function to execute
 * @param options - Capture options
 * @returns Captured output and function result
 */
export async function captureOutput<T>(
  fn: () => Promise<T>,
  options: CaptureOptions = {}
): Promise<{ output: CapturedOutput; result: T | undefined }> {
  const { stripColors = true, maxLength = DEFAULT_MAX_LENGTH } = options;

  const outputLines: string[] = [];
  let exitCode: number | undefined;

  // Store original console methods
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;

  // Store original process.exit
  const originalExit = process.exit;

  // Helper to capture output
  const capture = (...args: unknown[]) => {
    const line = args
      .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
      .join(' ');
    outputLines.push(stripColors ? stripAnsi(line) : line);
  };

  // Override console methods
  console.log = capture;
  console.error = capture;
  console.warn = capture;
  console.info = capture;

  // Override process.exit to capture exit code without actually exiting
  process.exit = ((code?: number) => {
    exitCode = code ?? 0;
    throw new ProcessExitError(exitCode);
  }) as typeof process.exit;

  let result: T | undefined;
  try {
    result = await fn();
  } catch (error) {
    // Re-throw if not a ProcessExitError
    if (!(error instanceof ProcessExitError)) {
      // Capture error message
      outputLines.push(error instanceof Error ? error.message : String(error));
      exitCode = 1;
    }
    // For ProcessExitError, we captured the exit code above
    result = undefined;
  } finally {
    // Restore original methods
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    console.info = originalInfo;
    process.exit = originalExit;
  }

  // Join and process output
  const rawOutput = outputLines.join('\n');
  const { output, truncated } = truncateOutput(rawOutput, maxLength);

  return {
    output: { output, truncated, exitCode },
    result,
  };
}

/**
 * Execute a CLI command and return MCP result
 *
 * This is a convenience wrapper that captures CLI output and formats it
 * as an MCPResult. Handles both successful execution and errors.
 *
 * @param fn - The async function to execute (CLI command)
 * @param captureOptions - Options for capturing output
 * @returns MCPResult with captured output
 */
export async function executeAndCapture(
  fn: () => Promise<void>,
  captureOptions?: CaptureOptions
): Promise<MCPResult> {
  try {
    const { output } = await captureOutput(fn, captureOptions);

    // If process.exit was called with non-zero, treat as failure
    if (output.exitCode !== undefined && output.exitCode !== 0) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        `Command failed with exit code ${output.exitCode}`,
        undefined,
        output.output
      );
    }

    return successResult(undefined, 'Command completed successfully', output.output);
  } catch (error) {
    return errorResult(
      ErrorCodes.COMMAND_FAILED,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Execute a CLI command with options and capture output
 *
 * @deprecated Use executeAndCapture with a lambda instead
 */
export async function executeCommand<TOptions, TResult>(
  commandFn: (options: TOptions) => Promise<TResult>,
  options: TOptions,
  captureOptions?: CaptureOptions
): Promise<{
  success: boolean;
  result?: TResult;
  output: string;
  exitCode?: number;
  error?: Error;
}> {
  try {
    const { output, result } = await captureOutput(
      () => commandFn(options),
      captureOptions
    );

    // If process.exit was called with non-zero, treat as failure
    if (output.exitCode !== undefined && output.exitCode !== 0) {
      return {
        success: false,
        output: output.output,
        exitCode: output.exitCode,
      };
    }

    return {
      success: true,
      result,
      output: output.output,
      exitCode: output.exitCode,
    };
  } catch (error) {
    return {
      success: false,
      output: error instanceof Error ? error.message : String(error),
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Parse structured data from command output
 *
 * Some commands output JSON when --json flag is used.
 * This helper extracts that JSON from the output.
 *
 * @param output - Raw command output
 * @returns Parsed JSON data or null if not found
 */
export function parseJsonOutput(output: string): Record<string, unknown> | null {
  // Try to find JSON in the output (commands may have headers before JSON)
  const jsonMatch = output.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) {
    return null;
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}
