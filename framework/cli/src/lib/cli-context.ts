/**
 * Unified CLI Context
 *
 * Combines project resolution and path resolution into a single, easy-to-use API
 * for all CLI commands. Provides both async and sync variants, with caching support.
 *
 * @module cli-context
 */

import path from 'path';
import fs from 'fs-extra';
import yaml from 'yaml';
import chalk from 'chalk';
import {
  findProjectRoot,
  findProjectRootAsync,
  clearProjectCache,
  ProjectContext,
  ProjectNotFoundError,
  type DetectionMethod,
} from './project-resolver.js';
import {
  createPathResolver,
  createPathResolverSync,
  type PathResolver,
  type RoutesConfig,
} from './path-resolver.js';
import type { FrameworkManifest } from './manifest-manager.js';

// Re-export for convenience
export * from './project-resolver.js';
export * from './path-resolver.js';

/**
 * Options for creating a CLI context
 */
export interface CliContextOptions {
  /**
   * Explicit project path (overrides auto-detection).
   * If provided, the context will be created for this path directly
   * without walking up the directory tree.
   */
  path?: string;

  /**
   * If true, don't use cached context.
   * Forces a fresh filesystem scan for project detection.
   */
  fresh?: boolean;
}

/**
 * Extended options for getCliContext helper functions
 */
export interface GetCliContextOptions extends CliContextOptions {
  /**
   * If true, the function will log an error and exit the process
   * when not inside a valid project. Otherwise returns null.
   */
  required?: boolean;
}

/**
 * Unified CLI context providing project detection and path resolution.
 *
 * This class combines the functionality of project-resolver and path-resolver
 * into a single, easy-to-use API. It provides:
 *
 * - Project root detection with multiple strategies
 * - Framework manifest access (if present)
 * - Semantic path resolution via routes.yml
 * - Both async and sync variants
 *
 * @example
 * ```typescript
 * // In a command handler:
 * const ctx = await CliContext.require();
 * const ticketsDir = ctx.paths.getTicketPath('story');
 * console.log(`Creating ticket in: ${ticketsDir}`);
 *
 * // Check if inside a project (without throwing):
 * const ctx = await CliContext.create();
 * if (ctx.isInsideProject) {
 *   console.log(`Project found at: ${ctx.projectRoot}`);
 * }
 *
 * // Use explicit path:
 * const ctx = await CliContext.create({ path: '/path/to/project' });
 * ```
 */
export class CliContext {
  /**
   * Absolute path to the project root directory.
   * This is always set, even if not inside a project (falls back to cwd).
   */
  readonly projectRoot: string;

  /**
   * Parsed framework manifest (.agentic-framework.json), or null if not found.
   */
  readonly manifest: FrameworkManifest | null;

  /**
   * Whether we found a valid project with framework markers.
   * If false, projectRoot falls back to cwd or provided path.
   */
  readonly isInsideProject: boolean;

  /**
   * Method used to detect the project root.
   * - 'manifest': Found .agentic-framework.json
   * - 'routes': Found routes.yml + CLAUDE.md
   * - 'git+claude': Found .git + CLAUDE.md
   * - 'cwd': No markers found
   */
  readonly detectionMethod: DetectionMethod;

  /**
   * Path resolver for semantic path resolution.
   * Provides methods like getTicketPath(), getPlanPath(), etc.
   */
  readonly paths: PathResolver;

  /**
   * Private constructor - use static factory methods instead.
   */
  private constructor(
    projectContext: ProjectContext,
    pathResolver: PathResolver
  ) {
    this.projectRoot = projectContext.projectRoot;
    this.manifest = projectContext.manifest;
    this.isInsideProject = projectContext.isInsideProject;
    this.detectionMethod = projectContext.detectionMethod;
    this.paths = pathResolver;
  }

  /**
   * Create a CLI context asynchronously.
   *
   * This is the preferred method for most use cases as it allows
   * parallel filesystem operations during project detection.
   *
   * @param options - Optional configuration for context creation
   * @returns Promise resolving to a CliContext instance
   *
   * @example
   * ```typescript
   * const ctx = await CliContext.create();
   * if (ctx.isInsideProject) {
   *   console.log(`Found project at: ${ctx.projectRoot}`);
   *   console.log(`Detection method: ${ctx.detectionMethod}`);
   * }
   * ```
   */
  static async create(options?: CliContextOptions): Promise<CliContext> {
    // Clear cache if fresh is requested
    if (options?.fresh) {
      clearProjectCache();
    }

    // Determine start path
    const startPath = options?.path ? path.resolve(options.path) : undefined;

    // Find project root
    const projectContext = await findProjectRootAsync(startPath);

    // Create path resolver
    const pathResolver = await createPathResolver(projectContext.projectRoot);

    return new CliContext(projectContext, pathResolver);
  }

  /**
   * Create a CLI context synchronously.
   *
   * Use this when you need the context immediately and cannot use async/await,
   * such as in synchronous command handlers or initialization code.
   *
   * @param options - Optional configuration for context creation
   * @returns CliContext instance
   *
   * @example
   * ```typescript
   * const ctx = CliContext.createSync();
   * console.log(`Project root: ${ctx.projectRoot}`);
   * ```
   */
  static createSync(options?: CliContextOptions): CliContext {
    // Clear cache if fresh is requested
    if (options?.fresh) {
      clearProjectCache();
    }

    // Determine start path
    const startPath = options?.path ? path.resolve(options.path) : undefined;

    // Find project root synchronously
    const projectContext = findProjectRoot(startPath);

    // Load routes config synchronously
    const routesConfig = loadRoutesConfigSync(projectContext.projectRoot);

    // Create path resolver with pre-loaded config
    const pathResolver = createPathResolverSync(
      projectContext.projectRoot,
      routesConfig
    );

    return new CliContext(projectContext, pathResolver);
  }

  /**
   * Create a CLI context asynchronously, throwing if not inside a project.
   *
   * Use this when your command requires being inside a valid project.
   * Provides a clear error message guiding users to run `init`.
   *
   * @param options - Optional configuration for context creation
   * @returns Promise resolving to a CliContext instance
   * @throws ProjectNotFoundError if not inside a project
   *
   * @example
   * ```typescript
   * try {
   *   const ctx = await CliContext.require();
   *   // Guaranteed to have isInsideProject: true
   *   const storiesDir = ctx.paths.getTicketPath('story');
   *   console.log(`Working in: ${storiesDir}`);
   * } catch (error) {
   *   if (error instanceof ProjectNotFoundError) {
   *     console.error(error.message);
   *     process.exit(1);
   *   }
   * }
   * ```
   */
  static async require(options?: CliContextOptions): Promise<CliContext> {
    const context = await CliContext.create(options);

    if (!context.isInsideProject) {
      throw new ProjectNotFoundError(options?.path || process.cwd());
    }

    return context;
  }

  /**
   * Create a CLI context synchronously, throwing if not inside a project.
   *
   * Synchronous version of `require()` for use in sync command handlers.
   *
   * @param options - Optional configuration for context creation
   * @returns CliContext instance
   * @throws ProjectNotFoundError if not inside a project
   *
   * @example
   * ```typescript
   * const ctx = CliContext.requireSync();
   * console.log(`Working in project: ${ctx.projectRoot}`);
   * ```
   */
  static requireSync(options?: CliContextOptions): CliContext {
    const context = CliContext.createSync(options);

    if (!context.isInsideProject) {
      throw new ProjectNotFoundError(options?.path || process.cwd());
    }

    return context;
  }

  /**
   * Check if a specific module is installed in this project.
   *
   * @param moduleId - The module identifier to check
   * @returns true if the module is installed
   *
   * @example
   * ```typescript
   * const ctx = await CliContext.require();
   * if (ctx.hasModule('backlog')) {
   *   console.log('Backlog module is installed');
   * }
   * ```
   */
  hasModule(moduleId: string): boolean {
    if (!this.manifest) {
      return false;
    }
    return moduleId in this.manifest.modules;
  }

  /**
   * Get the version of a specific installed module.
   *
   * @param moduleId - The module identifier
   * @returns Module version string, or null if not installed
   *
   * @example
   * ```typescript
   * const ctx = await CliContext.require();
   * const version = ctx.getModuleVersion('planning');
   * if (version) {
   *   console.log(`Planning module version: ${version}`);
   * }
   * ```
   */
  getModuleVersion(moduleId: string): string | null {
    if (!this.manifest) {
      return null;
    }
    const moduleInfo = this.manifest.modules[moduleId];
    if (!moduleInfo) {
      return null;
    }
    // Handle both object format { version: string, ... } and string format
    if (typeof moduleInfo === 'string') {
      return moduleInfo;
    }
    return moduleInfo.version ?? null;
  }

  /**
   * Get all installed module IDs.
   *
   * @returns Array of installed module identifiers
   *
   * @example
   * ```typescript
   * const ctx = await CliContext.require();
   * const modules = ctx.getInstalledModules();
   * console.log(`Installed modules: ${modules.join(', ')}`);
   * ```
   */
  getInstalledModules(): string[] {
    if (!this.manifest) {
      return [];
    }
    return Object.keys(this.manifest.modules);
  }

  /**
   * Get the framework version for this project.
   *
   * @returns Framework version string, or null if no manifest
   *
   * @example
   * ```typescript
   * const ctx = await CliContext.require();
   * console.log(`Framework version: ${ctx.getFrameworkVersion()}`);
   * ```
   */
  getFrameworkVersion(): string | null {
    return this.manifest?.framework?.version ?? null;
  }
}

/**
 * Load routes.yml configuration synchronously.
 *
 * @param projectRoot - Absolute path to the project root
 * @returns Parsed RoutesConfig or null if not found/invalid
 */
function loadRoutesConfigSync(projectRoot: string): RoutesConfig | null {
  const routesFilePath = path.join(projectRoot, 'routes.yml');

  try {
    if (!fs.pathExistsSync(routesFilePath)) {
      return null;
    }

    const content = fs.readFileSync(routesFilePath, 'utf-8');
    const parsed = yaml.parse(content);

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    // Validate that paths is an object if present
    if (parsed.paths && typeof parsed.paths !== 'object') {
      return null;
    }

    return {
      paths: parsed.paths || {},
      meta: parsed.meta,
    };
  } catch {
    // Return null on any parsing error - graceful degradation
    return null;
  }
}

/**
 * Get CLI context with standard error handling.
 *
 * This is a convenience function for command handlers that provides
 * consistent error handling. When `required: true` is set and the
 * context cannot be found, it logs an error and exits the process.
 *
 * @param options - Configuration options including `required` flag
 * @returns Promise resolving to CliContext, or null if not found and not required
 *
 * @example
 * ```typescript
 * // In a command handler that requires being in a project:
 * const ctx = await getCliContext({ required: true });
 * // If we get here, ctx is guaranteed to be non-null
 * const ticketsDir = ctx!.paths.getTicketPath('story');
 *
 * // In a command that works without a project:
 * const ctx = await getCliContext();
 * if (ctx?.isInsideProject) {
 *   console.log('Found project context');
 * } else {
 *   console.log('Working without project context');
 * }
 * ```
 */
export async function getCliContext(
  options?: GetCliContextOptions
): Promise<CliContext | null> {
  const { required = false, ...contextOptions } = options || {};

  try {
    if (required) {
      return await CliContext.require(contextOptions);
    } else {
      return await CliContext.create(contextOptions);
    }
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      console.error(
        chalk.red('\nError: Not inside an Agentic Framework project')
      );
      console.error(
        chalk.dim(`Searched from: ${options?.path || process.cwd()}`)
      );
      console.error(
        chalk.dim('\nRun "agentic-framework init <project-name>" to create a new project.\n')
      );
      process.exit(1);
    }

    // Re-throw unexpected errors
    throw error;
  }
}

/**
 * Get CLI context synchronously with standard error handling.
 *
 * Synchronous version of getCliContext for use in sync command handlers.
 *
 * @param options - Configuration options including `required` flag
 * @returns CliContext, or null if not found and not required
 *
 * @example
 * ```typescript
 * const ctx = getCliContextSync({ required: true });
 * console.log(`Project: ${ctx!.projectRoot}`);
 * ```
 */
export function getCliContextSync(
  options?: GetCliContextOptions
): CliContext | null {
  const { required = false, ...contextOptions } = options || {};

  try {
    if (required) {
      return CliContext.requireSync(contextOptions);
    } else {
      return CliContext.createSync(contextOptions);
    }
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      console.error(
        chalk.red('\nError: Not inside an Agentic Framework project')
      );
      console.error(
        chalk.dim(`Searched from: ${options?.path || process.cwd()}`)
      );
      console.error(
        chalk.dim('\nRun "agentic-framework init <project-name>" to create a new project.\n')
      );
      process.exit(1);
    }

    // Re-throw unexpected errors
    throw error;
  }
}

/**
 * Type guard to check if a value is a CliContext.
 *
 * @param value - Value to check
 * @returns true if value is a CliContext instance
 */
export function isCliContext(value: unknown): value is CliContext {
  return value instanceof CliContext;
}
