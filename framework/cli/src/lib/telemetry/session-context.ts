/**
 * Session Context Management
 * Provides session tracking for telemetry correlation using AsyncLocalStorage
 *
 * Sessions allow correlating all telemetry events from a single CLI invocation,
 * making it easy to distinguish parallel agent runs and trace operations.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import { hostname } from 'os';
import { SessionContext } from './types.js';

/**
 * AsyncLocalStorage for session context propagation
 * This allows session context to be automatically propagated through async operations
 */
const sessionStorage = new AsyncLocalStorage<SessionContext>();

/**
 * Global session context (fallback when not using AsyncLocalStorage)
 */
let globalSessionContext: SessionContext | undefined;

/**
 * Generate a unique session ID
 * Format: sess_<12-char-uuid> (e.g., sess_abc123def456)
 */
export function generateSessionId(): string {
  return `sess_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

/**
 * Generate a correlation ID for tracing related operations
 * Format: corr_<8-char-uuid> (e.g., corr_abc12345)
 */
export function generateCorrelationId(): string {
  return `corr_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
}

/**
 * Generate a machine ID based on hostname
 * This is a hash to avoid exposing the actual hostname
 */
export function generateMachineId(): string {
  const hash = createHash('sha256').update(hostname()).digest('hex');
  return `machine_${hash.slice(0, 8)}`;
}

/**
 * Initialize a new session
 *
 * @param options - Session initialization options
 * @returns The created session context
 */
export function initSession(options: {
  parentSessionId?: string;
  includeMachineId?: boolean;
} = {}): SessionContext {
  const context: SessionContext = {
    session_id: generateSessionId(),
    session_start: new Date().toISOString(),
    parent_session_id: options.parentSessionId,
    machine_id: options.includeMachineId ? generateMachineId() : undefined,
  };

  // Store in global context
  globalSessionContext = context;

  return context;
}

/**
 * Initialize session and run a function within the session context
 * Uses AsyncLocalStorage for automatic context propagation
 *
 * @param options - Session initialization options
 * @param fn - Function to run within the session context
 * @returns The result of the function
 */
export function runWithSession<T>(
  options: {
    parentSessionId?: string;
    includeMachineId?: boolean;
  },
  fn: () => T
): T {
  const context = initSession(options);
  return sessionStorage.run(context, fn);
}

/**
 * Run a function within the session context (async version)
 *
 * @param options - Session initialization options
 * @param fn - Async function to run within the session context
 * @returns Promise resolving to the function result
 */
export async function runWithSessionAsync<T>(
  options: {
    parentSessionId?: string;
    includeMachineId?: boolean;
  },
  fn: () => Promise<T>
): Promise<T> {
  const context = initSession(options);
  return sessionStorage.run(context, fn);
}

/**
 * Get the current session context
 * First checks AsyncLocalStorage, then falls back to global context
 *
 * @returns Current session context or undefined if no session is active
 */
export function getSessionContext(): SessionContext | undefined {
  return sessionStorage.getStore() ?? globalSessionContext;
}

/**
 * Get the current session ID
 * Convenience method for getting just the session ID
 *
 * @returns Current session ID or undefined
 */
export function getSessionId(): string | undefined {
  return getSessionContext()?.session_id;
}

/**
 * Create a child session context (for delegated agents)
 * The child inherits the parent session ID for correlation
 *
 * @param parentContext - Parent session context
 * @param includeMachineId - Whether to include machine ID
 * @returns New child session context
 */
export function createChildSession(
  parentContext: SessionContext,
  includeMachineId = false
): SessionContext {
  return {
    session_id: generateSessionId(),
    parent_session_id: parentContext.session_id,
    session_start: new Date().toISOString(),
    machine_id: includeMachineId ? generateMachineId() : parentContext.machine_id,
  };
}

/**
 * Set a correlation ID for the current operation
 * Useful for tracing a specific operation across multiple events
 *
 * @param correlationId - Correlation ID to set (or generate if not provided)
 * @returns The correlation ID that was set
 */
export function setCorrelationId(correlationId?: string): string {
  const corrId = correlationId ?? generateCorrelationId();
  const context = getSessionContext();

  if (context) {
    context.correlation_id = corrId;
  }

  return corrId;
}

/**
 * Clear the correlation ID after an operation completes
 */
export function clearCorrelationId(): void {
  const context = getSessionContext();
  if (context) {
    context.correlation_id = undefined;
  }
}

/**
 * Run a function with a correlation ID
 * Automatically sets and clears the correlation ID
 *
 * @param fn - Function to run
 * @param correlationId - Optional correlation ID (generates one if not provided)
 * @returns The result of the function
 */
export async function withCorrelation<T>(
  fn: () => Promise<T>,
  correlationId?: string
): Promise<T> {
  const _corrId = setCorrelationId(correlationId);
  try {
    return await fn();
  } finally {
    clearCorrelationId();
  }
}

/**
 * Reset session context (mainly for testing)
 */
export function resetSessionContext(): void {
  globalSessionContext = undefined;
}

/**
 * Check if a session is currently active
 */
export function hasActiveSession(): boolean {
  return getSessionContext() !== undefined;
}
