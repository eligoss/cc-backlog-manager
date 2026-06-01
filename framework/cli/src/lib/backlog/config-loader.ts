/**
 * Backlog configuration loader
 *
 * Reads project-scoped backlog.config.json and resolves Jira credentials
 * from the configured .env file.
 *
 * @module lib/backlog/config-loader
 */

import path from 'path';
import fs from 'fs-extra';
import dotenv from 'dotenv';

/**
 * Resolved backlog configuration with all defaults applied.
 * When used as input for loadBacklogConfig, only jiraProject and jiraBaseUrl
 * are required; all other fields are populated from defaults.
 */
export interface BacklogConfig {
  jiraProject: string;
  jiraBaseUrl: string;
  envFile: string;
  components: string[];
  defaults: {
    ticketPath: string;
    epicPath: string;
    sprintPath: string;
    milestonePath: string;
  };
}

/** Credentials resolved from .env file for Jira API authentication */
export interface JiraCredentials {
  baseUrl: string;
  email: string;
  apiToken: string;
}

const CONFIG_FILENAME = 'backlog.config.json';

const DEFAULT_CONFIG: Omit<BacklogConfig, 'jiraProject' | 'jiraBaseUrl'> = {
  envFile: '.env',
  components: [],
  defaults: {
    ticketPath: './backlog/tickets',
    epicPath: './backlog/epics',
    sprintPath: './backlog/sprints',
    milestonePath: './backlog/milestones',
  },
};

/**
 * Load and validate backlog.config.json from the given directory.
 *
 * Merges user-provided values with defaults for optional fields.
 * Throws if the file is missing or required fields are absent.
 *
 * @param basePath - Directory containing backlog.config.json
 * @returns Fully resolved BacklogConfig with defaults applied
 */
export async function loadBacklogConfig(
  basePath: string
): Promise<BacklogConfig> {
  const configPath = path.join(basePath, CONFIG_FILENAME);

  if (!(await fs.pathExists(configPath))) {
    throw new Error(
      `backlog.config.json not found in ${basePath}. ` +
        `Create one with at least { "jiraProject": "...", "jiraBaseUrl": "..." }`
    );
  }

  const raw = await fs.readJson(configPath);

  if (!raw.jiraProject || typeof raw.jiraProject !== 'string') {
    throw new Error(
      'backlog.config.json: "jiraProject" is required and must be a string'
    );
  }
  if (!raw.jiraBaseUrl || typeof raw.jiraBaseUrl !== 'string') {
    throw new Error(
      'backlog.config.json: "jiraBaseUrl" is required and must be a string'
    );
  }

  return {
    jiraProject: raw.jiraProject,
    jiraBaseUrl: raw.jiraBaseUrl.replace(/\/+$/, ''),
    envFile: raw.envFile ?? DEFAULT_CONFIG.envFile,
    components: Array.isArray(raw.components)
      ? raw.components
      : DEFAULT_CONFIG.components,
    defaults: {
      ...DEFAULT_CONFIG.defaults,
      ...(raw.defaults ?? {}),
    },
  };
}

/**
 * Resolve Jira credentials from the .env file specified in config.
 *
 * Parses the .env file without mutating process.env to avoid side effects.
 * Throws if JIRA_EMAIL or JIRA_API_TOKEN are not found.
 *
 * @param config - Resolved backlog configuration
 * @param basePath - Base directory for resolving the .env file path
 * @param envOverride - Optional override path for the .env file
 * @returns Resolved Jira credentials
 */
export function resolveCredentials(
  config: BacklogConfig,
  basePath: string,
  envOverride?: string
): JiraCredentials {
  const envPath = path.resolve(basePath, envOverride ?? config.envFile);
  let envContent: string;
  try {
    envContent = fs.readFileSync(envPath, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `Environment file not found: ${envPath}. Create it with JIRA_EMAIL and JIRA_API_TOKEN.`,
        { cause: err }
      );
    }
    throw err;
  }
  const parsed = dotenv.parse(envContent);

  const email = parsed.JIRA_EMAIL;
  const apiToken = parsed.JIRA_API_TOKEN;

  if (!email) {
    throw new Error(`JIRA_EMAIL not found in ${envPath}`);
  }
  if (!apiToken) {
    throw new Error(`JIRA_API_TOKEN not found in ${envPath}`);
  }

  return {
    baseUrl: config.jiraBaseUrl,
    email,
    apiToken,
  };
}
