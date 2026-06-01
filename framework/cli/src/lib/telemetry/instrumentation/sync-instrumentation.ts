/**
 * Sync Engine Instrumentation Helpers
 * Helper functions for instrumenting sync engine operations
 */

import { getTelemetry } from '../telemetry-manager.js';
import type { SyncEvent } from '../types.js';

/**
 * Record a sync operation
 */
export async function recordSyncOperation(
  operation: 'sync_skills' | 'sync_agents' | 'sync_all' | 'check_sync',
  filesProcessed: number,
  changesDetected: number,
  filesWritten: number,
  durationMs: number,
  errors: number = 0,
  success: boolean = true
): Promise<void> {
  const telemetry = getTelemetry();

  if (!telemetry.isInstrumentationEnabled('sync')) {
    return;
  }

  const event: Partial<SyncEvent> = {
    event_type: 'sync',
    operation,
    files_processed: filesProcessed,
    changes_detected: changesDetected,
    files_written: filesWritten,
    errors,
    success,
    duration_ms: durationMs
  };

  await telemetry.recordEvent(event);
}

/**
 * Record a skills sync operation
 */
export async function recordSkillsSync(
  skillsProcessed: number,
  changesDetected: number,
  filesWritten: number,
  durationMs: number,
  errors: number = 0
): Promise<void> {
  await recordSyncOperation(
    'sync_skills',
    skillsProcessed,
    changesDetected,
    filesWritten,
    durationMs,
    errors,
    errors === 0
  );
}

/**
 * Record an agents sync operation
 */
export async function recordAgentsSync(
  agentsProcessed: number,
  changesDetected: number,
  filesWritten: number,
  durationMs: number,
  errors: number = 0
): Promise<void> {
  await recordSyncOperation(
    'sync_agents',
    agentsProcessed,
    changesDetected,
    filesWritten,
    durationMs,
    errors,
    errors === 0
  );
}

/**
 * Record a complete sync operation
 */
export async function recordSyncAll(
  totalFiles: number,
  changesDetected: number,
  filesWritten: number,
  durationMs: number,
  errors: number = 0
): Promise<void> {
  await recordSyncOperation(
    'sync_all',
    totalFiles,
    changesDetected,
    filesWritten,
    durationMs,
    errors,
    errors === 0
  );
}

/**
 * Record a sync check operation
 */
export async function recordSyncCheck(
  filesChecked: number,
  changesDetected: number,
  durationMs: number
): Promise<void> {
  await recordSyncOperation(
    'check_sync',
    filesChecked,
    changesDetected,
    0, // No files written in check mode
    durationMs,
    0,
    true
  );
}
