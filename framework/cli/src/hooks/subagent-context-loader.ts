#!/usr/bin/env node
/**
 * Subagent Context Loader Hook
 *
 * Auto-loads context files when subagents are started.
 * Uses the framework's context-category-needs from agents.json
 * to determine which context files to inject.
 *
 * This hook runs on SubagentStart events.
 */

import { parseHookInput, sendResponse, advisory, passThrough, type SubagentInfo, type HookMessage } from './types.js';
import fs from 'fs';
import path from 'path';

// Context level hierarchy (cumulative loading)
const CONTEXT_LEVELS = ['basic', 'advanced', 'expert'];

/**
 * Find the framework root by looking for .agentic-framework.json or routes.yml
 */
function findFrameworkRoot(startDir: string): string | null {
  let currentDir = startDir;

  while (currentDir !== path.dirname(currentDir)) {
    if (
      fs.existsSync(path.join(currentDir, '.agentic-framework.json')) ||
      fs.existsSync(path.join(currentDir, 'routes.yml'))
    ) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

/**
 * Load agents registry
 */
function loadAgentsRegistry(frameworkRoot: string): Record<string, unknown>[] {
  const registryPath = path.join(frameworkRoot, '.claude', 'registries', 'agents.json');

  if (!fs.existsSync(registryPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(registryPath, 'utf-8');
    const registry = JSON.parse(content);
    return registry.agents || [];
  } catch {
    return [];
  }
}

/**
 * Get context files for an agent based on context-category-needs
 */
function getContextFiles(
  agentId: string,
  agents: Record<string, unknown>[],
  frameworkRoot: string
): { files: string[]; categories: Record<string, string> } {
  const agent = agents.find((a) => (a as { id: string }).id === agentId) as
    | { 'context-category-needs': Record<string, string>; 'context-files': string[] }
    | undefined;

  if (!agent) {
    return { files: [], categories: {} };
  }

  const contextNeeds = agent['context-category-needs'] || {};
  const contextDir = path.join(frameworkRoot, '.claude', 'context');

  const files: string[] = [];

  // For each category (business, technical, process), load up to the specified level
  for (const [category, level] of Object.entries(contextNeeds)) {
    const levelIndex = CONTEXT_LEVELS.indexOf(level);

    for (let i = 0; i <= levelIndex; i++) {
      const fileName = `${category}-${CONTEXT_LEVELS[i]}.md`;
      const filePath = path.join(contextDir, fileName);

      if (fs.existsSync(filePath)) {
        files.push(filePath);
      }
    }
  }

  return { files, categories: contextNeeds };
}

async function main(): Promise<void> {
  try {
    const input = await parseHookInput<SubagentInfo>();
    const messages: HookMessage[] = [];

    // Get the working directory
    const cwd = process.cwd();
    const frameworkRoot = findFrameworkRoot(cwd);

    if (!frameworkRoot) {
      // Not in a framework project, pass through
      sendResponse(passThrough());
      return;
    }

    // After null check, we know frameworkRoot is a string
    const projectRoot = frameworkRoot;

    // Try to detect agent ID from the prompt
    // Look for patterns like "You are ai-app-developer" or "ai-framework-manager"
    const agentPattern = /ai-[\w-]+(?:-slim)?/g;
    const matches = input.prompt?.match(agentPattern) || [];

    const agentId = matches[0];
    if (!agentId) {
      // No agent detected, pass through
      sendResponse(passThrough());
      return;
    }

    const agents = loadAgentsRegistry(projectRoot);
    const { files, categories } = getContextFiles(agentId, agents, projectRoot);

    if (files.length > 0) {
      messages.push({
        level: 'info',
        message: `Auto-loading ${files.length} context file(s) for ${agentId}`,
      });

      for (const file of files) {
        messages.push({
          level: 'info',
          message: `Loaded: ${path.basename(file)}`,
          file,
        });
      }

      const categoryList = Object.entries(categories)
        .map(([cat, level]) => `${cat}:${level}`)
        .join(', ');

      sendResponse(
        advisory(
          messages,
          `Context loaded for ${agentId}: ${categoryList}`
        )
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
