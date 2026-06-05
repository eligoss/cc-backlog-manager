#!/usr/bin/env node
/**
 * Pre-Commit Skill Reminder Hook
 *
 * Reminds agents to use the "committing-code" skill before making git commits.
 * The committing-code skill provides best practices for:
 * - Commit message formatting
 * - Jira ticket detection from branch names
 * - Co-author attribution
 * - Pre-commit validation
 *
 * This hook runs on PreToolUse events for Bash commands containing git commit.
 * It is non-blocking (always returns continue: true) and advisory.
 */

import {
  parseHookInput,
  sendResponse,
  advisory,
  passThrough,
  type ToolInput,
  type HookMessage,
} from './types.js';

// Git commit patterns to detect
const GIT_COMMIT_PATTERNS = [/\bgit\s+commit\b/i, /\bgit\s+.*\bcommit\b/i];

/**
 * Check if the command is a git commit command
 */
function isGitCommitCommand(command: string): boolean {
  return GIT_COMMIT_PATTERNS.some((pattern) => pattern.test(command));
}

async function main(): Promise<void> {
  try {
    const input = await parseHookInput<ToolInput>();

    // Only process Bash tool calls
    if (input.tool_name !== 'Bash') {
      sendResponse(passThrough());
      return;
    }

    // Get the command being executed
    const command = input.tool_input?.command as string | undefined;
    if (!command) {
      sendResponse(passThrough());
      return;
    }

    // Check if this is a git commit command
    if (!isGitCommitCommand(command)) {
      sendResponse(passThrough());
      return;
    }

    // Build reminder messages
    const messages: HookMessage[] = [
      {
        level: 'info',
        message: 'Git commit detected. Consider using the "committing-code" skill for best practices:',
      },
      {
        level: 'info',
        message: '• Jira ticket detection from branch name (auto-includes ticket ID)',
      },
      {
        level: 'info',
        message: '• Commit message formatting with Co-Authored-By attribution',
      },
      {
        level: 'info',
        message: '• Pre-commit validation and hook compliance',
      },
      {
        level: 'info',
        message: 'Invoke via: Skill tool with skill: "committing-code"',
      },
    ];

    const summary = 'Reminder: committing-code skill available';

    sendResponse(advisory(messages, summary));
  } catch (_error) {
    // On any error, pass through to avoid blocking
    sendResponse(passThrough());
  }
}

main();
