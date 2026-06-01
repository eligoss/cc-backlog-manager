/**
 * CLI embedded templates
 * These templates are embedded directly in the CLI to remove dependency on core module
 * for basic project initialization.
 */
export {
  settingsLocalTemplate,
  processSettingsTemplate,
} from './settings-local.js';
export type {
  SettingsLocal,
  HookConfig,
  HookGroup,
  StatusLineConfig,
  PermissionsConfig,
  HooksConfig,
} from './settings-local.js';
export { statuslineTemplate } from './statusline.js';

// MCP templates
export {
  createSerenaProjectConfig,
  validateSerenaProjectName,
} from './serena-project.js';
export {
  graphitiPermissions,
  serenaPermissions,
  getMcpPermissions,
  getMcpHooks,
  createSessionStartHook,
  createSessionEndHook,
  generateClaudeMdMcpSection,
} from './mcp-hooks.js';
