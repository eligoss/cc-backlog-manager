/**
 * Affected Modules Detection
 *
 * Detects which modules have been modified by analyzing git diff against
 * a base branch (default: main). Used for:
 * - Selective version bumping
 * - Running affected tests only
 *
 * @module lib/affected-modules
 */

import { execSync } from 'child_process';

/**
 * Represents a module that has been affected by changes
 */
export interface AffectedModule {
  /** Module identifier (e.g., 'backlog', 'jira', 'core') */
  id: string;
  /** List of changed files that belong to this module */
  changedFiles: string[];
}

/**
 * Options for detecting affected modules
 */
export interface AffectedModulesOptions {
  /** Base branch to compare against (default: 'main') */
  baseBranch?: string;
  /** Project root path (default: cwd) */
  projectRoot?: string;
  /** Include staged changes only (default: false - includes all uncommitted) */
  stagedOnly?: boolean;
}

/**
 * Result of affected modules detection
 */
export interface AffectedModulesResult {
  /** List of affected modules */
  modules: AffectedModule[];
  /** All changed files */
  changedFiles: string[];
  /** Base branch used for comparison */
  baseBranch: string;
  /** Whether there are any changes */
  hasChanges: boolean;
}

/**
 * Mapping of file path patterns to module IDs
 *
 * Order matters - more specific patterns should come first
 */
const FILE_TO_MODULE_MAPPING: Array<{ pattern: RegExp; moduleId: string }> = [
  // Module content files (most specific)
  { pattern: /^framework\/modules\/backlog\//, moduleId: 'backlog' },
  { pattern: /^framework\/modules\/confluence\//, moduleId: 'confluence' },
  { pattern: /^framework\/modules\/coding\//, moduleId: 'coding' },
  { pattern: /^framework\/modules\/reporting\//, moduleId: 'reporting' },
  { pattern: /^framework\/modules\/writer\//, moduleId: 'writer' },
  { pattern: /^framework\/modules\/planning\//, moduleId: 'planning' },
  { pattern: /^framework\/modules\/core\//, moduleId: 'core' },

  // CLI command implementations (map to their modules)
  { pattern: /^framework\/cli\/src\/commands\/backlog\//, moduleId: 'backlog' },
  { pattern: /^framework\/cli\/src\/commands\/writer\//, moduleId: 'writer' },
  { pattern: /^framework\/cli\/src\/commands\/planning\//, moduleId: 'planning' },
  { pattern: /^framework\/cli\/src\/commands\/confluence\//, moduleId: 'confluence' },

  // CLI library implementations (map to their modules)
  { pattern: /^framework\/cli\/src\/lib\/backlog\//, moduleId: 'backlog' },
  { pattern: /^framework\/cli\/src\/lib\/jira\//, moduleId: 'backlog' },
  { pattern: /^framework\/cli\/src\/lib\/confluence\//, moduleId: 'confluence' },
  { pattern: /^framework\/cli\/src\/lib\/planning\//, moduleId: 'planning' },

  // Generic CLI files belong to core
  { pattern: /^framework\/cli\//, moduleId: 'core' },

  // AI directory files (skills, agents, context)
  { pattern: /^ai\/skills\/.*backlog/, moduleId: 'backlog' },
  { pattern: /^ai\/skills\/.*confluence/, moduleId: 'confluence' },
  { pattern: /^ai\/skills\/.*writer/, moduleId: 'writer' },
  { pattern: /^ai\/agents\/.*backlog/, moduleId: 'backlog' },
  { pattern: /^ai\/agents\/.*confluence/, moduleId: 'confluence' },
  { pattern: /^ai\/agents\/.*writer/, moduleId: 'writer' },
  { pattern: /^ai\//, moduleId: 'core' },

  // Deployed files
  { pattern: /^\.claude\//, moduleId: 'core' },
];

/**
 * Module to test pattern mapping
 *
 * Maps module IDs to Jest test path patterns (regex-compatible)
 * These patterns are used with Jest's --testPathPatterns option
 */
export const MODULE_TEST_PATTERNS: Record<string, string[]> = {
  backlog: [
    'backlog',  // Matches any test file with 'backlog' in path
  ],
  confluence: [
    'confluence',  // Matches any test file with 'confluence' in path
  ],
  writer: [
    'writer',  // Matches any test file with 'writer' in path
  ],
  planning: [
    'planning',  // Matches any test file with 'planning' in path
  ],
  coding: [
    // Coding module has no specific tests yet
  ],
  reporting: [
    // Reporting module has no specific tests yet
  ],
  core: [
    // Core module tests - match directories that are framework infrastructure
    'lib/__tests__',
    'commands/__tests__',
    'mcp/__tests__',
    'schemas/__tests__',
    'telemetry/__tests__',
    'validation/__tests__',
    'sdk/__tests__',
    'build/__tests__',
    'common/__tests__',
    'unified-template-engine/__tests__',
    'e2e/cli-commands',
    'e2e/context-level-variants',
    'e2e/init-wizard',
  ],
};

/**
 * Get changed files from git diff
 *
 * @param baseBranch - Base branch to compare against
 * @param projectRoot - Project root path
 * @param stagedOnly - Only include staged changes
 * @returns Array of changed file paths (relative to project root)
 */
export function getChangedFiles(
  baseBranch: string = 'main',
  projectRoot: string = process.cwd(),
  stagedOnly: boolean = false
): string[] {
  try {
    let command: string;

    if (stagedOnly) {
      // Get only staged changes
      command = 'git diff --cached --name-only';
    } else {
      // Get all changes compared to base branch
      // First, get the merge base to find common ancestor
      const mergeBase = execSync(`git merge-base ${baseBranch} HEAD`, {
        cwd: projectRoot,
        encoding: 'utf-8',
        timeout: 10000,
      }).trim();

      // Then get diff from merge base to HEAD plus any uncommitted changes
      command = `git diff --name-only ${mergeBase} HEAD && git diff --name-only`;
    }

    const output = execSync(command, {
      cwd: projectRoot,
      encoding: 'utf-8',
      timeout: 10000,
    }).trim();

    if (!output) {
      return [];
    }

    // Deduplicate and filter empty lines
    const files = [...new Set(output.split('\n').filter(Boolean))];
    return files;
  } catch (error) {
    // If git command fails (not in repo, branch doesn't exist, etc.)
    // Return empty array rather than throwing
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      // Only warn if it's not a common "no changes" scenario
      if (!message.includes('not a git repository') && !message.includes('unknown revision')) {
        console.warn(`Warning: Could not get changed files: ${error.message}`);
      }
    }
    return [];
  }
}

/**
 * Map a file path to its module ID
 *
 * @param filePath - Relative file path
 * @returns Module ID or null if no match
 */
export function mapFileToModule(filePath: string): string | null {
  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');

  for (const { pattern, moduleId } of FILE_TO_MODULE_MAPPING) {
    if (pattern.test(normalizedPath)) {
      return moduleId;
    }
  }

  return null;
}

/**
 * Detect affected modules from changed files
 *
 * @param options - Detection options
 * @returns Result containing affected modules and metadata
 */
export function detectAffectedModules(
  options: AffectedModulesOptions = {}
): AffectedModulesResult {
  const {
    baseBranch = 'main',
    projectRoot = process.cwd(),
    stagedOnly = false,
  } = options;

  const changedFiles = getChangedFiles(baseBranch, projectRoot, stagedOnly);

  if (changedFiles.length === 0) {
    return {
      modules: [],
      changedFiles: [],
      baseBranch,
      hasChanges: false,
    };
  }

  // Group files by module
  const moduleFilesMap = new Map<string, string[]>();

  for (const file of changedFiles) {
    const moduleId = mapFileToModule(file);
    if (moduleId) {
      const existing = moduleFilesMap.get(moduleId) || [];
      existing.push(file);
      moduleFilesMap.set(moduleId, existing);
    }
  }

  // Convert to array of AffectedModule
  const modules: AffectedModule[] = Array.from(moduleFilesMap.entries())
    .map(([id, changedFiles]) => ({ id, changedFiles }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    modules,
    changedFiles,
    baseBranch,
    hasChanges: true,
  };
}

/**
 * Get test patterns for affected modules
 *
 * @param moduleIds - Array of module IDs
 * @returns Array of Jest test patterns
 */
export function getTestPatternsForModules(moduleIds: string[]): string[] {
  const patterns: string[] = [];

  for (const moduleId of moduleIds) {
    const modulePatterns = MODULE_TEST_PATTERNS[moduleId];
    if (modulePatterns) {
      patterns.push(...modulePatterns);
    }
  }

  // Deduplicate patterns
  return [...new Set(patterns)];
}

/**
 * Build Jest command for running affected tests
 *
 * @param moduleIds - Array of affected module IDs
 * @param additionalArgs - Additional Jest arguments
 * @returns Jest command string or null if no tests to run
 */
export function buildJestCommand(
  moduleIds: string[],
  additionalArgs: string[] = []
): string | null {
  const patterns = getTestPatternsForModules(moduleIds);

  if (patterns.length === 0) {
    return null;
  }

  // Deduplicate and join with |
  const uniquePatterns = [...new Set(patterns)];
  const testPathPattern = uniquePatterns.join('|');

  const args = [
    'jest',
    `--testPathPatterns="${testPathPattern}"`,
    '--passWithNoTests',
    ...additionalArgs,
  ];

  return `npx ${args.join(' ')}`;
}

/**
 * Check if we're in a git repository
 *
 * @param projectRoot - Project root path
 * @returns true if in a git repository
 */
export function isGitRepository(projectRoot: string = process.cwd()): boolean {
  try {
    execSync('git rev-parse --git-dir', {
      cwd: projectRoot,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a branch exists
 *
 * @param branchName - Branch name to check
 * @param projectRoot - Project root path
 * @returns true if branch exists
 */
export function branchExists(
  branchName: string,
  projectRoot: string = process.cwd()
): boolean {
  try {
    execSync(`git rev-parse --verify ${branchName}`, {
      cwd: projectRoot,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}
