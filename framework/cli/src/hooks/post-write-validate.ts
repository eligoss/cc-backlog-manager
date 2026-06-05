#!/usr/bin/env node
/**
 * Post-Write Validation Hook
 *
 * Validates files after they are written.
 * Advisory mode: logs results but doesn't block operations.
 *
 * Checks:
 * - JSON schema validation for registry files
 * - Markdown link integrity
 * - YAML frontmatter structure for skills/agents
 */

import { parseHookInput, sendResponse, advisory, passThrough, type ToolResult, type HookMessage } from './types.js';
import fs from 'fs';
import path from 'path';

// Registry files that should be validated
const REGISTRY_FILES = [
  'agents.json',
  'skills.json',
  'discovery-map.json',
];

// Required frontmatter fields for different file types
const FRONTMATTER_REQUIREMENTS: Record<string, string[]> = {
  skill: ['id', 'name', 'description', 'scope', 'module', 'capabilities-provided'],
  agent: ['id', 'agent-name', 'role', 'variant'],
};

async function main(): Promise<void> {
  try {
    const input = await parseHookInput<ToolResult>();

    // Only process Write and Edit tools
    if (!['Write', 'Edit'].includes(input.tool_name)) {
      sendResponse(passThrough());
      return;
    }

    const messages: HookMessage[] = [];
    const filePath = input.tool_input.file_path as string | undefined;

    if (!filePath || !fs.existsSync(filePath)) {
      sendResponse(passThrough());
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);

    // Validate registry JSON files
    if (REGISTRY_FILES.includes(fileName)) {
      try {
        const parsed = JSON.parse(content);

        // Check for required structure based on file type
        if (fileName === 'agents.json') {
          if (!parsed.agents || !Array.isArray(parsed.agents)) {
            messages.push({
              level: 'warning',
              message: 'agents.json missing required "agents" array',
              file: filePath,
            });
          }
        } else if (fileName === 'skills.json') {
          if (!parsed.skills || !Array.isArray(parsed.skills)) {
            messages.push({
              level: 'warning',
              message: 'skills.json missing required "skills" array',
              file: filePath,
            });
          }
        }
      } catch (e) {
        const error = e as Error;
        messages.push({
          level: 'error',
          message: `Invalid JSON in ${fileName}: ${error.message}`,
          file: filePath,
        });
      }
    }

    // Validate skill/agent markdown files
    if (filePath.endsWith('.md') && content.startsWith('---')) {
      const frontmatterEnd = content.indexOf('---', 3);
      if (frontmatterEnd !== -1) {
        const frontmatterContent = content.substring(3, frontmatterEnd);

        // Determine file type and check required fields
        let fileType: string | null = null;
        if (filePath.includes('/skills/') && fileName === 'SKILL.md') {
          fileType = 'skill';
        } else if (filePath.includes('/agents/') && fileName.startsWith('ai-')) {
          fileType = 'agent';
        }

        if (fileType && FRONTMATTER_REQUIREMENTS[fileType]) {
          const requiredFields = FRONTMATTER_REQUIREMENTS[fileType];
          for (const field of requiredFields) {
            // Simple check for field presence
            if (!frontmatterContent.includes(`${field}:`)) {
              messages.push({
                level: 'warning',
                message: `Missing required frontmatter field: ${field}`,
                file: filePath,
              });
            }
          }
        }
      }
    }

    // Check for broken relative links in markdown
    if (filePath.endsWith('.md')) {
      const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      const fileDir = path.dirname(filePath);

      while ((match = linkPattern.exec(content)) !== null) {
        const linkPath = match[2];

        // Skip external URLs, anchors, and mailto links
        if (linkPath.startsWith('http') || linkPath.startsWith('#') || linkPath.startsWith('mailto:')) {
          continue;
        }

        // Resolve relative path
        const absolutePath = path.resolve(fileDir, linkPath.split('#')[0]);

        if (!fs.existsSync(absolutePath)) {
          messages.push({
            level: 'warning',
            message: `Broken link: ${linkPath}`,
            file: filePath,
          });
        }
      }
    }

    if (messages.length > 0) {
      const errorCount = messages.filter((m) => m.level === 'error').length;
      const warningCount = messages.filter((m) => m.level === 'warning').length;
      sendResponse(
        advisory(messages, `Post-write validation: ${errorCount} error(s), ${warningCount} warning(s)`)
      );
    } else {
      sendResponse(passThrough());
    }
  } catch (_error) {
    // On any error, pass through to avoid blocking
    sendResponse(passThrough());
  }
}

main();
