#!/usr/bin/env node
/**
 * Stop Quality Check Hook
 *
 * Runs when an agent completes, providing a final quality summary.
 * Advisory mode: logs summary but doesn't block completion.
 *
 * Checks:
 * - Uncommitted changes in git
 * - Recently modified framework files
 * - Registry synchronization status
 */

import { parseHookInput, sendResponse, advisory, passThrough, type StopInfo, type HookMessage } from './types.js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Check for uncommitted git changes
 */
function checkGitStatus(): HookMessage[] {
  const messages: HookMessage[] = [];

  try {
    const status = execSync('git status --porcelain', {
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();

    if (status) {
      const changedFiles = status.split('\n').length;
      messages.push({
        level: 'info',
        message: `${changedFiles} uncommitted file(s) in working directory`,
      });

      // Check for modified registry files
      const registryFiles = status.split('\n').filter(
        (line) =>
          line.includes('agents.json') ||
          line.includes('skills.json') ||
          line.includes('discovery-map.json')
      );

      if (registryFiles.length > 0) {
        messages.push({
          level: 'warning',
          message: 'Registry files have uncommitted changes - consider running sync',
        });
      }
    }
  } catch {
    // Git not available or not in a git repo
  }

  return messages;
}

/**
 * Check for framework validation issues
 */
function checkFrameworkValidation(frameworkRoot: string): HookMessage[] {
  const messages: HookMessage[] = [];

  // Check if routes.yml exists and is readable
  const routesPath = path.join(frameworkRoot, 'routes.yml');
  if (!fs.existsSync(routesPath)) {
    messages.push({
      level: 'warning',
      message: 'routes.yml not found - run "agentic-framework routes sync"',
    });
  }

  // Check if registries exist
  const registryDir = path.join(frameworkRoot, '.claude', 'registries');
  const requiredRegistries = ['agents.json', 'skills.json', 'discovery-map.json'];

  for (const registry of requiredRegistries) {
    const registryPath = path.join(registryDir, registry);
    if (!fs.existsSync(registryPath)) {
      messages.push({
        level: 'warning',
        message: `Missing registry: ${registry}`,
        file: registryPath,
      });
    }
  }

  return messages;
}

/**
 * Find the framework root
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

async function main(): Promise<void> {
  try {
    const _input = await parseHookInput<StopInfo>();
    const messages: HookMessage[] = [];

    // Get the working directory
    const cwd = process.cwd();
    const frameworkRoot = findFrameworkRoot(cwd);

    if (!frameworkRoot) {
      // Not in a framework project, pass through
      sendResponse(passThrough());
      return;
    }

    // Collect all checks
    messages.push(...checkGitStatus());
    messages.push(...checkFrameworkValidation(frameworkRoot));

    if (messages.length > 0) {
      const warnings = messages.filter((m) => m.level === 'warning').length;
      const info = messages.filter((m) => m.level === 'info').length;

      sendResponse(
        advisory(
          messages,
          `Session complete: ${warnings} warning(s), ${info} info message(s)`
        )
      );
    } else {
      sendResponse(
        advisory(
          [{ level: 'info', message: 'Session complete - all checks passed' }],
          'Session complete - no issues detected'
        )
      );
    }
  } catch (_error) {
    // On any error, pass through to avoid blocking
    sendResponse(passThrough());
  }
}

main();
