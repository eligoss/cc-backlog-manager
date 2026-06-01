/**
 * Claude Code Hook Types
 *
 * Type definitions for Claude Code hooks input/output format.
 * Based on Claude Code v2.1.x hook system.
 */

/**
 * Tool input passed to PreToolUse hooks
 */
export interface ToolInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
}

/**
 * Tool result passed to PostToolUse hooks
 */
export interface ToolResult {
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_result: unknown;
}

/**
 * Session info passed to SessionStart/SessionEnd hooks
 */
export interface SessionInfo {
  session_id: string;
  working_directory: string;
  agent?: string;
}

/**
 * Subagent info passed to SubagentStart hook
 */
export interface SubagentInfo {
  subagent_id: string;
  parent_agent?: string;
  prompt: string;
  model?: string;
}

/**
 * Stop info passed to Stop/SubagentStop hooks
 */
export interface StopInfo {
  reason: string;
  session_id: string;
  final_message?: string;
}

/**
 * Hook response format
 *
 * Advisory mode: warnings/info are logged but don't block
 * Blocking mode: errors would block the operation (not used in our implementation)
 */
export interface HookResponse {
  /** Continue with the operation */
  continue: boolean;
  /** Optional modified input (for PreToolUse) */
  updatedInput?: Record<string, unknown>;
  /** Advisory messages to log */
  messages?: HookMessage[];
  /** Summary for final reports */
  summary?: string;
}

export interface HookMessage {
  level: 'info' | 'warning' | 'error';
  message: string;
  file?: string;
  line?: number;
}

/**
 * Read JSON from stdin
 */
export async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data);
    });
  });
}

/**
 * Parse hook input from stdin
 */
export async function parseHookInput<T>(): Promise<T> {
  const input = await readStdin();
  try {
    return JSON.parse(input) as T;
  } catch {
    // Return empty object if parsing fails
    return {} as T;
  }
}

/**
 * Send hook response to stdout
 */
export function sendResponse(response: HookResponse): void {
  console.log(JSON.stringify(response));
}

/**
 * Create advisory response (continue with messages)
 */
export function advisory(messages: HookMessage[], summary?: string): HookResponse {
  return {
    continue: true,
    messages,
    summary,
  };
}

/**
 * Create pass-through response (no changes)
 */
export function passThrough(): HookResponse {
  return { continue: true };
}
