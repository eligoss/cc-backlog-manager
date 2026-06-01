/**
 * CLI Command Instrumentation Helpers
 * Helper functions for instrumenting CLI commands
 */

import { getTelemetry } from '../telemetry-manager.js';
import type { CLIEvent } from '../types.js';

/**
 * Record a CLI command execution
 */
export async function recordCLICommand(
  command: string,
  subcommand: string | undefined,
  options: Record<string, unknown>,
  result: Record<string, unknown> | undefined,
  durationMs: number,
  success: boolean = true,
  error?: Error
): Promise<void> {
  const telemetry = getTelemetry();

  if (!telemetry.isInstrumentationEnabled('cli')) {
    return;
  }

  const event: Partial<CLIEvent> = {
    event_type: 'cli',
    operation: subcommand ? `${command}_${subcommand}` : command,
    command,
    subcommand,
    options,
    result,
    success,
    duration_ms: durationMs
  };

  if (error) {
    event.error = {
      message: error.message,
      stack: error.stack
    };
  }

  await telemetry.recordEvent(event);
}

/**
 * Wrap a CLI command function with automatic telemetry
 */
export async function withCLITelemetry<T>(
  command: string,
  subcommand: string | undefined,
  options: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let result: T | undefined;
  let success = true;
  let error: Error | undefined;

  try {
    result = await fn();
    return result;
  } catch (err) {
    success = false;
    error = err as Error;
    throw err;
  } finally {
    const durationMs = Date.now() - startTime;

    // Extract result data if it's an object
    const resultData = result && typeof result === 'object'
      ? (result as Record<string, unknown>)
      : undefined;

    // Record telemetry asynchronously (don't await)
    recordCLICommand(
      command,
      subcommand,
      options,
      resultData,
      durationMs,
      success,
      error
    ).catch(() => {
      // Ignore telemetry errors
    });
  }
}

/**
 * Record a sync command
 */
export async function recordSyncCommand(
  options: Record<string, unknown>,
  skillsSynced: number,
  agentsSynced: number,
  errors: number,
  durationMs: number
): Promise<void> {
  await recordCLICommand(
    'sync',
    undefined,
    options,
    {
      skills_synced: skillsSynced,
      agents_synced: agentsSynced,
      errors
    },
    durationMs,
    errors === 0
  );
}

/**
 * Record a validate command
 */
export async function recordValidateCommand(
  options: Record<string, unknown>,
  validationResults: Record<string, unknown>,
  durationMs: number,
  success: boolean
): Promise<void> {
  await recordCLICommand(
    'validate',
    undefined,
    options,
    validationResults,
    durationMs,
    success
  );
}

/**
 * Record an init command
 */
export async function recordInitCommand(
  projectName: string,
  modules: string[],
  durationMs: number,
  success: boolean
): Promise<void> {
  await recordCLICommand(
    'init',
    undefined,
    { project: projectName, modules },
    { modules_installed: modules.length },
    durationMs,
    success
  );
}
