import path from 'path';
import fs from 'fs-extra';
import yaml from 'yaml';

/**
 * Ticket types supported by the backlog module
 */
export type TicketType = 'story' | 'task' | 'bug' | 'epic' | 'spike';

/**
 * Configuration structure parsed from routes.yml
 *
 * Example structure:
 * ```yaml
 * paths:
 *   backlog:
 *     root: ".claude/backlog/"
 *     tickets: ".claude/backlog/tickets/"
 *   agents:
 *     root: ".claude/agents/"
 * meta:
 *   last-updated: "2024-12-27"
 *   sync-status: "synchronized"
 * ```
 */
export interface RoutesConfig {
  /** Nested path mappings by category and key */
  paths: Record<string, Record<string, string>>;
  /** Optional metadata about the routes file */
  meta?: Record<string, string>;
}

/**
 * Path resolver interface for semantic path resolution
 *
 * Provides both generic route-based resolution and semantic accessors
 * for common framework paths. All returned paths are absolute.
 */
export interface PathResolver {
  /** The project root directory (absolute path) */
  readonly projectRoot: string;

  /** The parsed routes configuration, or null if not available */
  readonly routesConfig: RoutesConfig | null;

  /**
   * Resolve a path from routes.yml using dot notation
   *
   * @param routeKey - Dot-separated key (e.g., 'backlog.tickets')
   * @returns Absolute path or null if route not found
   *
   * @example
   * ```typescript
   * resolver.resolve('backlog.tickets')  // '/project/.claude/backlog/tickets'
   * resolver.resolve('agents.root')      // '/project/.claude/agents'
   * ```
   */
  resolve(routeKey: string): string | null;

  /**
   * Get the path for a specific ticket type directory
   *
   * @param type - The ticket type (story, task, bug, epic, spike)
   * @returns Absolute path to the ticket type directory
   *
   * @example
   * ```typescript
   * resolver.getTicketPath('story')  // '/project/.claude/backlog/tickets/stories'
   * resolver.getTicketPath('bug')    // '/project/.claude/backlog/tickets/bugs'
   * ```
   */
  getTicketPath(type: TicketType): string;

  /**
   * Get the path for plans directory, optionally with a category
   *
   * @param category - Optional category subdirectory
   * @returns Absolute path to plans directory or category subdirectory
   *
   * @example
   * ```typescript
   * resolver.getPlanPath()           // '/project/.claude/plans'
   * resolver.getPlanPath('framework') // '/project/.claude/plans/framework'
   * ```
   */
  getPlanPath(category?: string): string;

  /**
   * Get the path to the context directory
   *
   * @returns Absolute path to the context directory
   */
  getContextPath(): string;

  /**
   * Get the path to the agents directory
   *
   * @returns Absolute path to the agents directory
   */
  getAgentPath(): string;

  /**
   * Get the path to the skills directory
   *
   * @returns Absolute path to the skills directory
   */
  getSkillPath(): string;

  /**
   * Get the path to the registries directory
   *
   * @returns Absolute path to the registries directory
   */
  getRegistryPath(): string;
}

/**
 * Default paths used when routes.yml is missing or incomplete
 */
const DEFAULT_PATHS = {
  backlog: '.claude/backlog',
  tickets: '.claude/backlog/tickets',
  plans: '.claude/plans',
  context: '.claude/context',
  agents: '.claude/commands',
  skills: '.claude/skills',
  registries: '.claude/registries',
} as const;

/**
 * Mapping of ticket types to their directory names (pluralized)
 */
const TICKET_TYPE_DIRS: Record<TicketType, string> = {
  story: 'stories',
  task: 'tasks',
  bug: 'bugs',
  epic: 'epics',
  spike: 'spikes',
};

/**
 * Implementation of the PathResolver interface
 */
class PathResolverImpl implements PathResolver {
  readonly projectRoot: string;
  readonly routesConfig: RoutesConfig | null;

  constructor(projectRoot: string, routesConfig: RoutesConfig | null) {
    this.projectRoot = projectRoot;
    this.routesConfig = routesConfig;
  }

  /**
   * Resolve a path from routes.yml using dot notation
   */
  resolve(routeKey: string): string | null {
    if (!this.routesConfig?.paths) {
      return null;
    }

    const [category, key] = routeKey.split('.');
    if (!category) {
      return null;
    }

    const categoryPaths = this.routesConfig.paths[category];
    if (!categoryPaths) {
      return null;
    }

    // If no key specified, try 'root' as default
    const pathKey = key || 'root';
    const relativePath = categoryPaths[pathKey];

    if (typeof relativePath !== 'string') {
      return null;
    }

    // Normalize path: remove trailing slashes
    const normalizedPath = relativePath.replace(/\/+$/, '');
    if (!normalizedPath) {
      return null;
    }

    return path.join(this.projectRoot, normalizedPath);
  }

  /**
   * Get the path for a specific ticket type directory
   */
  getTicketPath(type: TicketType): string {
    const dirName = TICKET_TYPE_DIRS[type];

    // Try to resolve from routes.yml first
    const ticketsPath = this.resolve('backlog.tickets');
    if (ticketsPath) {
      return path.join(ticketsPath, dirName);
    }

    // Fall back to default
    return path.join(this.projectRoot, DEFAULT_PATHS.tickets, dirName);
  }

  /**
   * Get the path for plans directory
   */
  getPlanPath(category?: string): string {
    // Try to resolve from routes.yml first
    const plansPath = this.resolve('plans.root') || this.resolve('planning.root');
    const basePath = plansPath || path.join(this.projectRoot, DEFAULT_PATHS.plans);

    if (category) {
      return path.join(basePath, category);
    }

    return basePath;
  }

  /**
   * Get the path to the context directory
   */
  getContextPath(): string {
    const contextPath = this.resolve('context.root');
    return contextPath || path.join(this.projectRoot, DEFAULT_PATHS.context);
  }

  /**
   * Get the path to the agents directory
   */
  getAgentPath(): string {
    const agentPath = this.resolve('agents.root');
    return agentPath || path.join(this.projectRoot, DEFAULT_PATHS.agents);
  }

  /**
   * Get the path to the skills directory
   */
  getSkillPath(): string {
    const skillPath = this.resolve('skills.root');
    return skillPath || path.join(this.projectRoot, DEFAULT_PATHS.skills);
  }

  /**
   * Get the path to the registries directory
   */
  getRegistryPath(): string {
    const registryPath = this.resolve('registries.root');
    return registryPath || path.join(this.projectRoot, DEFAULT_PATHS.registries);
  }
}

/**
 * Parse routes.yml file and return the configuration
 *
 * @param routesFilePath - Absolute path to the routes.yml file
 * @returns Parsed routes configuration or null if parsing fails
 */
async function parseRoutesYml(routesFilePath: string): Promise<RoutesConfig | null> {
  try {
    if (!await fs.pathExists(routesFilePath)) {
      return null;
    }

    const content = await fs.readFile(routesFilePath, 'utf-8');
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
  } catch (_error) {
    // Return null on any parsing error - graceful degradation
    return null;
  }
}

/**
 * Create a PathResolver instance for the given project root
 *
 * The resolver will attempt to load routes.yml from the project root.
 * If the file doesn't exist or cannot be parsed, the resolver will
 * still function using default paths.
 *
 * @param projectRoot - Absolute path to the project root directory
 * @returns A PathResolver instance
 *
 * @example
 * ```typescript
 * const resolver = await createPathResolver('/path/to/project');
 *
 * // Use semantic accessors
 * const storiesDir = resolver.getTicketPath('story');
 * const plansDir = resolver.getPlanPath('framework');
 *
 * // Or use generic resolution
 * const customPath = resolver.resolve('backlog.archive');
 * ```
 */
export async function createPathResolver(projectRoot: string): Promise<PathResolver> {
  const absoluteRoot = path.resolve(projectRoot);
  const routesFilePath = path.join(absoluteRoot, 'routes.yml');

  const routesConfig = await parseRoutesYml(routesFilePath);

  return new PathResolverImpl(absoluteRoot, routesConfig);
}

/**
 * Create a PathResolver synchronously with pre-loaded routes config
 *
 * This is useful when routes.yml has already been loaded elsewhere.
 *
 * @param projectRoot - Absolute path to the project root directory
 * @param routesConfig - Pre-parsed routes configuration (or null)
 * @returns A PathResolver instance
 */
export function createPathResolverSync(
  projectRoot: string,
  routesConfig: RoutesConfig | null
): PathResolver {
  const absoluteRoot = path.resolve(projectRoot);
  return new PathResolverImpl(absoluteRoot, routesConfig);
}

/**
 * Get default paths for when routes.yml is not available
 *
 * @returns Object containing all default path mappings
 */
export function getDefaultPaths(): typeof DEFAULT_PATHS {
  return { ...DEFAULT_PATHS };
}

/**
 * Get ticket type directory mappings
 *
 * @returns Object mapping ticket types to directory names
 */
export function getTicketTypeDirs(): Record<TicketType, string> {
  return { ...TICKET_TYPE_DIRS };
}
