import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { FrameworkManifest, ManifestManager } from './manifest-manager.js';

/**
 * Detection methods for finding project root, in priority order.
 * - manifest: Found .agentic-framework.json (primary marker, most specific)
 * - git+claude: Found .git + CLAUDE.md (fallback for git repos with framework)
 * - cwd: No markers found, using current working directory
 */
export type DetectionMethod = 'manifest' | 'git+claude' | 'cwd';

/**
 * Project context containing resolved project information.
 * Provides project root path, manifest (if present), and detection metadata.
 */
export interface ProjectContext {
  /** Absolute path to the project root directory */
  projectRoot: string;
  /** Parsed .agentic-framework.json manifest, null if not found */
  manifest: FrameworkManifest | null;
  /** Whether we found a valid project with framework markers */
  isInsideProject: boolean;
  /** Method used to detect the project root */
  detectionMethod: DetectionMethod;
}

/**
 * Error thrown when a project context is required but not found.
 */
export class ProjectNotFoundError extends Error {
  constructor(startDir: string) {
    super(
      `Not inside an Agentic Framework project. ` +
        `Searched from '${startDir}' to filesystem root. ` +
        `Run 'agentic-framework init' to create a new project.`
    );
    this.name = 'ProjectNotFoundError';
  }
}

/** Cached project context for session (lazy singleton) */
let cachedContext: ProjectContext | null = null;

/**
 * Marker files and their detection priorities.
 * Lower priority number = higher precedence.
 */
const DETECTION_MARKERS: Array<{
  method: DetectionMethod;
  check: (dir: string) => Promise<boolean>;
  priority: number;
}> = [
  {
    method: 'manifest',
    priority: 1,
    check: async (dir: string) => {
      const manifestPath = path.join(dir, '.agentic-framework.json');
      return fs.pathExists(manifestPath);
    },
  },
  {
    method: 'git+claude',
    priority: 2,
    check: async (dir: string) => {
      const gitPath = path.join(dir, '.git');
      const claudePath = path.join(dir, 'CLAUDE.md');
      const [hasGit, hasClaude] = await Promise.all([
        fs.pathExists(gitPath),
        fs.pathExists(claudePath),
      ]);
      return hasGit && hasClaude;
    },
  },
];

/**
 * Check if a path is at or above the home directory or filesystem root.
 * Used to prevent scanning system directories.
 *
 * @param dir - Directory path to check
 * @returns true if we should stop walking up
 */
function isSystemBoundary(dir: string): boolean {
  const homeDir = os.homedir();
  const root = path.parse(dir).root;

  // Stop at home directory or filesystem root
  return dir === homeDir || dir === root;
}

/**
 * Try to load the framework manifest from a directory.
 *
 * @param dir - Directory containing the manifest
 * @returns Parsed manifest or null if not found/invalid
 */
async function tryLoadManifest(dir: string): Promise<FrameworkManifest | null> {
  try {
    const manager = new ManifestManager(dir);
    if (await manager.exists()) {
      return await manager.read();
    }
  } catch {
    // Manifest exists but failed to parse - return null
    return null;
  }
  return null;
}

/**
 * Check a single directory for project markers.
 *
 * @param dir - Directory to check
 * @returns Detection method if found, null otherwise
 */
async function checkDirectoryForMarkers(dir: string): Promise<DetectionMethod | null> {
  // Check markers in priority order
  for (const marker of DETECTION_MARKERS) {
    if (await marker.check(dir)) {
      return marker.method;
    }
  }
  return null;
}

/**
 * Walk up the directory tree to find a project root.
 *
 * @param startDir - Directory to start searching from
 * @returns Object with found directory and detection method, or null
 */
async function walkUpForProject(
  startDir: string
): Promise<{ dir: string; method: DetectionMethod } | null> {
  let currentDir = path.resolve(startDir);

  while (true) {
    const method = await checkDirectoryForMarkers(currentDir);
    if (method) {
      return { dir: currentDir, method };
    }

    // Check if we've reached system boundary
    if (isSystemBoundary(currentDir)) {
      return null;
    }

    // Move to parent directory
    const parentDir = path.dirname(currentDir);

    // Safety check: if we can't go up anymore
    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

/**
 * Find the project root by walking up the directory tree.
 *
 * Detection strategy (priority order):
 * 1. `.agentic-framework.json` - Primary marker (most specific)
 * 2. `.git` + `CLAUDE.md` - Fallback for git repos with framework
 * 3. If nothing found, returns current directory with `isInsideProject: false`
 *
 * The result is cached for the session to avoid repeated filesystem scans.
 *
 * @param startDir - Directory to start searching from (defaults to process.cwd())
 * @returns ProjectContext with resolved project information
 *
 * @example
 * ```typescript
 * const context = findProjectRoot();
 * if (context.isInsideProject) {
 *   console.log(`Found project at: ${context.projectRoot}`);
 *   console.log(`Detected via: ${context.detectionMethod}`);
 * }
 * ```
 */
export function findProjectRoot(startDir?: string): ProjectContext {
  // Return cached result if available and no explicit startDir provided
  if (cachedContext && !startDir) {
    return cachedContext;
  }

  // Use sync wrapper for the async implementation
  // This allows the function to be used synchronously in CLI commands
  const resolvedStartDir = startDir ? path.resolve(startDir) : process.cwd();

  // We need to run this synchronously for CLI compatibility
  // Using a synchronous implementation
  const result = findProjectRootSync(resolvedStartDir);

  // Cache the result if using default start directory
  if (!startDir) {
    cachedContext = result;
  }

  return result;
}

/**
 * Synchronous implementation of project root detection.
 *
 * @param startDir - Resolved absolute path to start searching from
 * @returns ProjectContext with resolved project information
 */
function findProjectRootSync(startDir: string): ProjectContext {
  let currentDir = startDir;

  while (true) {
    // Check markers in priority order (synchronous)
    for (const marker of DETECTION_MARKERS) {
      const detected = checkMarkerSync(currentDir, marker.method);
      if (detected) {
        const manifest = tryLoadManifestSync(currentDir);
        return {
          projectRoot: currentDir,
          manifest,
          isInsideProject: true,
          detectionMethod: marker.method,
        };
      }
    }

    // Check if we've reached system boundary
    if (isSystemBoundary(currentDir)) {
      break;
    }

    // Move to parent directory
    const parentDir = path.dirname(currentDir);

    // Safety check: if we can't go up anymore
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  // No project found, return cwd context
  return {
    projectRoot: startDir,
    manifest: null,
    isInsideProject: false,
    detectionMethod: 'cwd',
  };
}

/**
 * Synchronously check if a marker exists in a directory.
 *
 * @param dir - Directory to check
 * @param method - Detection method to check for
 * @returns true if marker is found
 */
function checkMarkerSync(dir: string, method: DetectionMethod): boolean {
  switch (method) {
    case 'manifest':
      return fs.pathExistsSync(path.join(dir, '.agentic-framework.json'));
    case 'git+claude': {
      const hasGit = fs.pathExistsSync(path.join(dir, '.git'));
      const hasClaude = fs.pathExistsSync(path.join(dir, 'CLAUDE.md'));
      return hasGit && hasClaude;
    }
    default:
      return false;
  }
}

/**
 * Synchronously try to load the framework manifest.
 *
 * @param dir - Directory containing the manifest
 * @returns Parsed manifest or null if not found/invalid
 */
function tryLoadManifestSync(dir: string): FrameworkManifest | null {
  const manifestPath = path.join(dir, '.agentic-framework.json');

  if (!fs.pathExistsSync(manifestPath)) {
    return null;
  }

  try {
    return fs.readJsonSync(manifestPath) as FrameworkManifest;
  } catch {
    // Manifest exists but failed to parse
    return null;
  }
}

/**
 * Find the project root, throwing an error if not inside a project.
 *
 * Use this when the command requires being inside a valid project.
 * Provides a clear error message guiding users to run `init`.
 *
 * @param startDir - Directory to start searching from (defaults to process.cwd())
 * @returns ProjectContext with resolved project information
 * @throws ProjectNotFoundError if not inside a project
 *
 * @example
 * ```typescript
 * try {
 *   const context = requireProjectContext();
 *   // Guaranteed to have isInsideProject: true
 *   console.log(`Working in: ${context.projectRoot}`);
 * } catch (error) {
 *   if (error instanceof ProjectNotFoundError) {
 *     console.error(error.message);
 *     process.exit(1);
 *   }
 * }
 * ```
 */
export function requireProjectContext(startDir?: string): ProjectContext {
  const context = findProjectRoot(startDir);

  if (!context.isInsideProject) {
    throw new ProjectNotFoundError(startDir || process.cwd());
  }

  return context;
}

/**
 * Async version of findProjectRoot for use in async contexts.
 * Provides better performance for operations that can be parallelized.
 *
 * @param startDir - Directory to start searching from (defaults to process.cwd())
 * @returns Promise resolving to ProjectContext
 *
 * @example
 * ```typescript
 * const context = await findProjectRootAsync();
 * if (context.isInsideProject) {
 *   console.log(`Detected via: ${context.detectionMethod}`);
 * }
 * ```
 */
export async function findProjectRootAsync(startDir?: string): Promise<ProjectContext> {
  const resolvedStartDir = startDir ? path.resolve(startDir) : process.cwd();

  const result = await walkUpForProject(resolvedStartDir);

  if (result) {
    const manifest = await tryLoadManifest(result.dir);
    return {
      projectRoot: result.dir,
      manifest,
      isInsideProject: true,
      detectionMethod: result.method,
    };
  }

  // No project found, return cwd context
  return {
    projectRoot: resolvedStartDir,
    manifest: null,
    isInsideProject: false,
    detectionMethod: 'cwd',
  };
}

/**
 * Async version of requireProjectContext.
 *
 * @param startDir - Directory to start searching from (defaults to process.cwd())
 * @returns Promise resolving to ProjectContext
 * @throws ProjectNotFoundError if not inside a project
 */
export async function requireProjectContextAsync(startDir?: string): Promise<ProjectContext> {
  const context = await findProjectRootAsync(startDir);

  if (!context.isInsideProject) {
    throw new ProjectNotFoundError(startDir || process.cwd());
  }

  return context;
}

/**
 * Clear the cached project context.
 *
 * Useful for testing or when the project structure has changed.
 * Subsequent calls to findProjectRoot() will re-scan the filesystem.
 *
 * @example
 * ```typescript
 * // In tests
 * beforeEach(() => {
 *   clearProjectCache();
 * });
 * ```
 */
export function clearProjectCache(): void {
  cachedContext = null;
}

/**
 * Get the cached project context without triggering a new scan.
 *
 * @returns Cached ProjectContext or null if not yet resolved
 */
export function getCachedContext(): ProjectContext | null {
  return cachedContext;
}
