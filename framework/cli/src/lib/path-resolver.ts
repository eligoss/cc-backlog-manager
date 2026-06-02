import path from 'path';

/**
 * Ticket types supported by the backlog module
 */
export type TicketType = 'story' | 'task' | 'bug' | 'epic' | 'spike';

/**
 * Path resolver interface for semantic path resolution
 *
 * Provides semantic accessors for common framework paths, all derived from
 * the project root using the framework's default directory layout. All
 * returned paths are absolute.
 */
export interface PathResolver {
  /** The project root directory (absolute path) */
  readonly projectRoot: string;

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
 * Default project-relative paths for framework directories
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

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Get the path for a specific ticket type directory
   */
  getTicketPath(type: TicketType): string {
    const dirName = TICKET_TYPE_DIRS[type];
    return path.join(this.projectRoot, DEFAULT_PATHS.tickets, dirName);
  }

  /**
   * Get the path for plans directory
   */
  getPlanPath(category?: string): string {
    const basePath = path.join(this.projectRoot, DEFAULT_PATHS.plans);

    if (category) {
      return path.join(basePath, category);
    }

    return basePath;
  }

  /**
   * Get the path to the context directory
   */
  getContextPath(): string {
    return path.join(this.projectRoot, DEFAULT_PATHS.context);
  }

  /**
   * Get the path to the agents directory
   */
  getAgentPath(): string {
    return path.join(this.projectRoot, DEFAULT_PATHS.agents);
  }

  /**
   * Get the path to the skills directory
   */
  getSkillPath(): string {
    return path.join(this.projectRoot, DEFAULT_PATHS.skills);
  }

  /**
   * Get the path to the registries directory
   */
  getRegistryPath(): string {
    return path.join(this.projectRoot, DEFAULT_PATHS.registries);
  }
}

/**
 * Create a PathResolver instance for the given project root
 *
 * @param projectRoot - Absolute path to the project root directory
 * @returns A PathResolver instance
 *
 * @example
 * ```typescript
 * const resolver = await createPathResolver('/path/to/project');
 * const storiesDir = resolver.getTicketPath('story');
 * const plansDir = resolver.getPlanPath('framework');
 * ```
 */
export async function createPathResolver(projectRoot: string): Promise<PathResolver> {
  return new PathResolverImpl(path.resolve(projectRoot));
}

/**
 * Create a PathResolver synchronously
 *
 * @param projectRoot - Absolute path to the project root directory
 * @returns A PathResolver instance
 */
export function createPathResolverSync(projectRoot: string): PathResolver {
  return new PathResolverImpl(path.resolve(projectRoot));
}

/**
 * Get default project-relative paths for framework directories
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
