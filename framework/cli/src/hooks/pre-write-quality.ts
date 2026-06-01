#!/usr/bin/env node
/**
 * Pre-Write Quality Hook
 *
 * Validates file writes before they happen.
 * Advisory mode: logs warnings but doesn't block operations.
 *
 * Checks:
 * - Protected files (e.g., .git/, node_modules/)
 * - Hardcoded absolute paths in framework files
 * - YAML syntax for markdown files with frontmatter
 */

import { parseHookInput, sendResponse, advisory, passThrough, type ToolInput, type HookMessage } from './types.js';

// Protected paths that should not be written directly
const PROTECTED_PATHS = [
  '.git/',
  'node_modules/',
  'dist/',
  '.claude/settings.json', // User settings, not framework
];

// Patterns that suggest hardcoded paths
const HARDCODED_PATH_PATTERNS = [
  /\/Users\/[^/]+\//g,
  /\/home\/[^/]+\//g,
  /C:\\Users\\[^\\]+\\/g,
];

async function main(): Promise<void> {
  try {
    const input = await parseHookInput<ToolInput>();

    // Only process Write and Edit tools
    if (!['Write', 'Edit'].includes(input.tool_name)) {
      sendResponse(passThrough());
      return;
    }

    const messages: HookMessage[] = [];
    const filePath = input.tool_input.file_path as string | undefined;
    const content = input.tool_input.content as string | undefined;

    if (!filePath) {
      sendResponse(passThrough());
      return;
    }

    // Check for protected paths
    for (const protectedPath of PROTECTED_PATHS) {
      if (filePath.includes(protectedPath)) {
        messages.push({
          level: 'warning',
          message: `Writing to protected path: ${protectedPath}`,
          file: filePath,
        });
      }
    }

    // Check for hardcoded paths in framework files
    if (content && filePath.includes('framework/')) {
      for (const pattern of HARDCODED_PATH_PATTERNS) {
        const matches = content.match(pattern);
        if (matches) {
          messages.push({
            level: 'warning',
            message: `Potential hardcoded path detected: ${matches[0]}`,
            file: filePath,
          });
        }
      }
    }

    // Check YAML frontmatter syntax for markdown files
    if (content && filePath.endsWith('.md') && content.startsWith('---')) {
      const frontmatterEnd = content.indexOf('---', 3);
      if (frontmatterEnd === -1) {
        messages.push({
          level: 'warning',
          message: 'Markdown file has unclosed YAML frontmatter',
          file: filePath,
        });
      } else {
        const frontmatter = content.substring(3, frontmatterEnd);
        // Basic YAML validation - check for common issues
        if (frontmatter.includes('\t')) {
          messages.push({
            level: 'warning',
            message: 'YAML frontmatter contains tabs (use spaces)',
            file: filePath,
          });
        }
      }
    }

    // Check JSON syntax for .json files
    if (content && filePath.endsWith('.json')) {
      try {
        JSON.parse(content);
      } catch (e) {
        const error = e as Error;
        messages.push({
          level: 'warning',
          message: `Invalid JSON syntax: ${error.message}`,
          file: filePath,
        });
      }
    }

    if (messages.length > 0) {
      sendResponse(advisory(messages, `Pre-write check found ${messages.length} issue(s)`));
    } else {
      sendResponse(passThrough());
    }
  } catch (_error) {
    // On any error, pass through to avoid blocking
    sendResponse(passThrough());
  }
}

main();
