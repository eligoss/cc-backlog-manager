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
 * For framework projects, also reminds about "managing-versions" skill for:
 * - Version bumping (major/minor/patch)
 * - Changelog updates
 * - Affected module testing
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
import fs from 'fs';
import path from 'path';

// Git commit patterns to detect
const GIT_COMMIT_PATTERNS = [/\bgit\s+commit\b/i, /\bgit\s+.*\bcommit\b/i];

/**
 * Check if the command is a git commit command
 */
function isGitCommitCommand(command: string): boolean {
  return GIT_COMMIT_PATTERNS.some((pattern) => pattern.test(command));
}

/**
 * Check if we're in the agentic-development-framework project
 * by looking for the framework source directory structure
 */
function isFrameworkProject(startDir: string): boolean {
  let currentDir = startDir;

  while (currentDir !== path.dirname(currentDir)) {
    // Check for framework-specific markers
    const hasFrameworkDir = fs.existsSync(path.join(currentDir, 'framework', 'modules', 'core'));
    const hasManifest = fs.existsSync(path.join(currentDir, '.agentic-framework.json'));

    if (hasFrameworkDir && hasManifest) {
      // Additional check: look for selfDev flag or paths.source starting with "framework"
      try {
        const manifestPath = path.join(currentDir, '.agentic-framework.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        // Check for selfDev flag or paths.source starting with "framework"
        if (manifest.selfDev === true || manifest.paths?.source?.startsWith('framework')) {
          return true;
        }
      } catch {
        // Ignore parse errors
      }
    }
    currentDir = path.dirname(currentDir);
  }

  return false;
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

    // Check if we're in the framework project
    const cwd = process.cwd();
    const inFrameworkProject = isFrameworkProject(cwd);

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

    // Add framework-specific reminders
    if (inFrameworkProject) {
      messages.push({
        level: 'warning',
        message: '─── Framework Project Detected ───',
      });
      messages.push({
        level: 'warning',
        message:
          'Before committing, ensure you have used the "managing-versions" skill to:',
      });
      messages.push({
        level: 'warning',
        message: '• Bump affected module versions (agentic-framework bump-version)',
      });
      messages.push({
        level: 'warning',
        message: '• Update changelog entries for changes',
      });
      messages.push({
        level: 'warning',
        message: '• Run affected tests (agentic-framework test --affected)',
      });
      messages.push({
        level: 'info',
        message: 'Invoke via: Skill tool with skill: "managing-versions"',
      });
    }

    const summary = inFrameworkProject
      ? 'Reminder: committing-code + managing-versions skills available'
      : 'Reminder: committing-code skill available';

    sendResponse(advisory(messages, summary));
  } catch (_error) {
    // On any error, pass through to avoid blocking
    sendResponse(passThrough());
  }
}

main();
