/**
 * Command Option Interfaces
 *
 * Centralized type definitions for CLI command options.
 * These interfaces provide type safety for Commander.js action handlers.
 *
 * @module types/command-options
 */

// =============================================================================
// Common/Shared Options
// =============================================================================

/**
 * Base options common to many commands
 */
export interface BaseCommandOptions {
  /** Enable verbose output */
  verbose?: boolean;
  /** Preview changes without executing */
  dryRun?: boolean;
  /** Project path override */
  path?: string;
}

/**
 * Options for commands that interact with external systems
 */
export interface ExternalSystemOptions extends BaseCommandOptions {
  /** Force operation even if conflicts exist */
  force?: boolean;
  /** Path to environment file with credentials */
  env?: string;
}

// =============================================================================
// Backlog Commands
// =============================================================================

/**
 * Options for backlog create-ticket command
 */
export interface CreateTicketOptions extends BaseCommandOptions {
  /** Ticket type: story, task, bug, epic, spike */
  type: string;
  /** Ticket name in kebab-case */
  name?: string;
  /** Ticket summary/title */
  summary?: string;
}

/**
 * Options for backlog validate command
 */
export interface BacklogValidateOptions extends BaseCommandOptions {
  /** Exit with error code on warnings */
  strict?: boolean;
}

/**
 * Options for backlog import-jira command
 */
export interface ImportJiraOptions extends BaseCommandOptions {
  /** Output directory for imported tickets */
  output?: string;
  /** Jira project key filter */
  project?: string;
  /** Ticket type filter */
  type?: string;
}

/**
 * Options for backlog update-fields command
 */
export interface UpdateFieldsOptions extends BaseCommandOptions {
  /** Field name to update */
  field?: string;
  /** New field value */
  value?: string;
  /** Scope: all, stories, tasks, etc. */
  scope?: string;
}

/**
 * Options for backlog migrate-milestones command
 */
export interface MigrateMilestonesOptions extends BaseCommandOptions {
  /** Target milestone format */
  format?: string;
}

// =============================================================================
// Jira Commands
// =============================================================================

/**
 * Options for jira sync command
 */
export interface JiraSyncOptions extends ExternalSystemOptions {
  /** Path to local file to sync to Jira */
  fromFile?: string;
  /** Jira issue key to sync from */
  fromJira?: string;
  /** Output path for downloaded tickets */
  output?: string;
}

/**
 * Options for jira export command
 */
export interface JiraExportOptions extends ExternalSystemOptions {
  /** Output format */
  format?: string;
  /** Include attachments */
  attachments?: boolean;
}

// =============================================================================
// Planning Commands
// =============================================================================

/**
 * Options for planning create-plan command
 */
export interface CreatePlanOptions extends BaseCommandOptions {
  /** Plan title */
  title?: string;
  /** Plan template to use */
  template?: string;
}

/**
 * Options for planning validate-plan command
 */
export interface ValidatePlanOptions extends BaseCommandOptions {
  /** Exit with error code on warnings */
  strict?: boolean;
}

// =============================================================================
// Confluence Commands
// =============================================================================

/**
 * Options for confluence validate command
 */
export interface ConfluenceValidateOptions extends BaseCommandOptions {
  /** Exit with error code on warnings */
  strict?: boolean;
  /** Include ADF validation */
  adf?: boolean;
}

/**
 * Options for confluence create-page command
 */
export interface CreatePageOptions extends ExternalSystemOptions {
  /** Page title */
  title: string;
  /** Parent page ID */
  parent?: string;
  /** Space key */
  space?: string;
}

/**
 * Options for confluence fetch-page command
 */
export interface FetchPageOptions extends ExternalSystemOptions {
  /** Page ID to fetch */
  pageId?: string;
  /** Output file path */
  output?: string;
}

/**
 * Options for confluence import-reports command
 */
export interface ImportReportsOptions extends ExternalSystemOptions {
  /** Source directory */
  source?: string;
  /** Target space */
  space?: string;
}

// =============================================================================
// Framework Commands
// =============================================================================

/**
 * Options for validate command
 */
export interface ValidateOptions extends BaseCommandOptions {
  /** Exit with error code on validation failure */
  strict?: boolean;
  /** Output as JSON */
  json?: boolean;
  /** Validate version consistency */
  versions?: boolean;
  /** Validate markdown links */
  links?: boolean;
}

/**
 * Options for init command
 */
export interface InitOptions {
  /** Comma-separated list of modules */
  modules?: string;
  /** Initialize git repository */
  git: boolean;
  /** Run in interactive mode */
  interactive: boolean;
}

/**
 * Options for add command
 */
export interface AddOptions {
  /** Project path */
  path: string;
}

/**
 * Options for remove command
 */
export interface RemoveOptions {
  /** Project path */
  path: string;
}

/**
 * Options for update command
 */
export interface UpdateOptions {
  /** Project path */
  path: string;
  /** Force update even if pinned */
  force: boolean;
  /** Preview changes without applying */
  dryRun: boolean;
}

/**
 * Options for bump-version command
 */
export interface BumpVersionOptions extends BaseCommandOptions {
  /** Version bump type: major, minor, patch */
  type?: string;
  /** Specific version to set */
  version?: string;
}

// =============================================================================
// Agent Commands
// =============================================================================

/**
 * Options for agent run command
 */
export interface AgentRunOptions extends BaseCommandOptions {
  /** Model override */
  model?: string;
  /** Phase sub-agent to run */
  phase?: string;
  /** Session ID to resume */
  session?: string;
  /** Suppress output */
  quiet?: boolean;
}

/**
 * Options for agent list command
 */
export interface AgentListOptions extends BaseCommandOptions {
  /** Filter by module */
  module?: string;
  /** Show SDK-enabled agents only */
  sdk?: boolean;
}

/**
 * Options for agent show command
 */
export interface AgentShowOptions extends BaseCommandOptions {
  /** Output format: text, json, yaml */
  format?: string;
}

// =============================================================================
// Template Commands
// =============================================================================

/**
 * Options for template render command
 */
export interface TemplateRenderOptions extends BaseCommandOptions {
  /** Template name */
  template: string;
  /** Output file path */
  output?: string;
  /** Template variables as JSON */
  variables?: string;
}

/**
 * Options for template validate command
 */
export interface TemplateValidateOptions extends BaseCommandOptions {
  /** Exit with error code on warnings */
  strict?: boolean;
}

// =============================================================================
// Skill Commands
// =============================================================================

/**
 * Options for skill deploy command
 */
export interface SkillDeployOptions extends BaseCommandOptions {
  /** Target deployment directory */
  target?: string;
}

/**
 * Options for skill list command
 */
export interface SkillListOptions extends BaseCommandOptions {
  /** Filter by module */
  module?: string;
  /** Show deployed skills only */
  deployed?: boolean;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Generic command options with string index signature
 * Use this when you need dynamic property access
 */
export interface GenericCommandOptions {
  [key: string]: string | boolean | number | undefined;
}

/**
 * Type guard to check if options has a specific property
 */
export function hasOption<K extends string>(
  options: GenericCommandOptions,
  key: K
): options is GenericCommandOptions & Record<K, NonNullable<unknown>> {
  return key in options && options[key] !== undefined;
}
