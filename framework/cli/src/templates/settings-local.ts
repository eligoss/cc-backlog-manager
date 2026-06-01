/**
 * Claude Code hook configuration
 */
export interface HookConfig {
  type: "command" | "prompt";
  command?: string;
  prompt?: string;
  statusMessage?: string;
}

/**
 * Hook matcher group
 */
export interface HookGroup {
  matcher: string;
  hooks: HookConfig[];
}

/**
 * Status line configuration
 */
export interface StatusLineConfig {
  type: "command" | "text";
  command?: string;
  text?: string;
  padding: number;
}

/**
 * Permissions configuration
 */
export interface PermissionsConfig {
  allow: string[];
}

/**
 * Hooks configuration by event type
 */
export interface HooksConfig {
  PreToolUse?: HookGroup[];
  PostToolUse?: HookGroup[];
  SubagentStart?: HookGroup[];
  SubagentStop?: HookGroup[];
  Stop?: HookGroup[];
  SessionStart?: HookGroup[];
  SessionEnd?: HookGroup[];
  UserPromptSubmit?: HookGroup[];
  PreCompact?: HookGroup[];
  Notification?: HookGroup[];
  [key: string]: HookGroup[] | undefined; // Allow dynamic access
}

/**
 * Claude Code settings.local.json structure
 */
export interface SettingsLocal {
  statusLine?: StatusLineConfig;
  permissions?: PermissionsConfig;
  hooks?: HooksConfig;
  [key: string]: unknown; // Allow additional properties
}

/**
 * Default settings.local.json template for Claude Code projects
 * This is embedded in the CLI to remove dependency on core module
 *
 * Note: {{PROJECT_ROOT}} is a placeholder that gets replaced with the actual
 * project path during sync. This ensures hooks work regardless of working directory.
 */
export const settingsLocalTemplate: SettingsLocal = {
  statusLine: {
    type: "command",
    command: "{{PROJECT_ROOT}}/.claude/statusline.sh",
    padding: 0,
  },
  permissions: {
    allow: [
      "Bash(git add:*)",
      "Bash(git checkout:*)",
      "Bash(git commit:*)",
      "Bash(git push:*)",
      "Bash(git rm:*)",
      "Bash(git mv:*)",
      "Bash(git reset:*)",
      "Bash(git tag:*)",
      "Bash(git check-ignore:*)",
      "Bash(npm run:*)",
      "Bash(npm test:*)",
      "Bash(npm install)",
      "Bash(agentic-framework:*)",
      "Bash(npx agentic-framework:*)",
      "Bash(npx jest:*)",
      "Bash(npx ts-node:*)",
      "Bash(npx tsc:*)",
      "Bash(node:*)",
      "Bash(ls:*)",
      "Bash(cat:*)",
      "Bash(find:*)",
      "Bash(grep:*)",
      "Bash(tree:*)",
      "Bash(wc:*)",
      "Bash(cp:*)",
      "Bash(rm:*)",
      "Bash(chmod:*)",
      "Bash(echo:*)",
      "WebSearch",
    ],
  },
};

/**
 * Process the settings template by replacing {{PROJECT_ROOT}} with actual path
 */
export function processSettingsTemplate(projectPath: string): SettingsLocal {
  const templateStr = JSON.stringify(settingsLocalTemplate);
  const processedStr = templateStr.replace(
    /\{\{PROJECT_ROOT\}\}/g,
    projectPath,
  );
  return JSON.parse(processedStr) as SettingsLocal;
}
