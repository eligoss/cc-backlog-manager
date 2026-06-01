/**
 * Framework-owned settings.json template
 *
 * This file generates .claude/settings.json which is ALWAYS overwritten on sync.
 * Claude Code merges settings.json (framework) with settings.local.json (user).
 *
 * User customizations belong in settings.local.json — this file is framework-owned.
 */

import type { HooksConfig } from "./settings-local.js";

/**
 * Claude Code settings.json structure (framework-owned)
 */
export interface SettingsJson {
  hooks: HooksConfig;
  [key: string]: unknown;
}

/**
 * Default settings.json template with all framework hook configurations.
 *
 * Note: {{PROJECT_ROOT}} is replaced with actual project path during sync.
 */
export const settingsJsonTemplate: SettingsJson = {
  hooks: {
    SessionStart: [
      {
        matcher: "startup",
        hooks: [
          {
            type: "command",
            command: "{{PROJECT_ROOT}}/.claude/hooks/session-start-worktree.sh",
            statusMessage: "Checking git worktree...",
          },
          {
            type: "command",
            command: "{{PROJECT_ROOT}}/.claude/hooks/session-start-context.sh",
            statusMessage: "Loading session context...",
          },
        ],
      },
      {
        matcher: "compact",
        hooks: [
          {
            type: "command",
            command:
              "{{PROJECT_ROOT}}/.claude/hooks/session-compact-context.sh",
            statusMessage: "Re-injecting context after compaction...",
          },
        ],
      },
    ],
    SessionEnd: [
      {
        matcher: ".*",
        hooks: [
          {
            type: "command",
            command: "{{PROJECT_ROOT}}/.claude/hooks/session-end-reminder.sh",
            statusMessage: "Checking session end state...",
          },
        ],
      },
    ],
    PreToolUse: [
      {
        matcher: "Write|Edit",
        hooks: [
          {
            type: "command",
            command: "{{PROJECT_ROOT}}/.claude/hooks/pre-write-quality.sh",
            statusMessage: "Validating file write...",
          },
        ],
      },
      {
        matcher: "Bash",
        hooks: [
          {
            type: "command",
            command:
              "{{PROJECT_ROOT}}/.claude/hooks/pre-commit-skill-reminder.sh",
            statusMessage: "Checking git operations...",
          },
          {
            type: "command",
            command: "{{PROJECT_ROOT}}/.claude/hooks/pre-bash-safety.sh",
            statusMessage: "Checking command safety...",
          },
        ],
      },
    ],
    PostToolUse: [
      {
        matcher: "Write|Edit",
        hooks: [
          {
            type: "command",
            command: "{{PROJECT_ROOT}}/.claude/hooks/post-write-validate.sh",
            statusMessage: "Running post-write validation...",
          },
          {
            type: "command",
            command: "{{PROJECT_ROOT}}/.claude/hooks/post-write-format.sh",
            statusMessage: "Auto-formatting file...",
          },
        ],
      },
    ],
    SubagentStart: [
      {
        matcher: ".*",
        hooks: [
          {
            type: "command",
            command:
              "{{PROJECT_ROOT}}/.claude/hooks/subagent-context-loader.sh",
            statusMessage: "Loading context for subagent...",
          },
          {
            type: "command",
            command: "{{PROJECT_ROOT}}/.claude/hooks/skill-reminder.sh",
            statusMessage: "Checking available skills...",
          },
        ],
      },
    ],
    Stop: [
      {
        matcher: ".*",
        hooks: [
          {
            type: "command",
            command: "{{PROJECT_ROOT}}/.claude/hooks/stop-quality-check.sh",
            statusMessage: "Running final quality check...",
          },
          {
            type: "command",
            command: "{{PROJECT_ROOT}}/.claude/hooks/stop-commit-check.sh",
            statusMessage: "Checking for uncommitted changes...",
          },
          {
            type: "command",
            command: "{{PROJECT_ROOT}}/.claude/hooks/stop-pr-suggest.sh",
            statusMessage: "Checking PR status...",
          },
        ],
      },
    ],
    Notification: [
      {
        matcher: "permission_prompt|idle_prompt",
        hooks: [
          {
            type: "command",
            command: "{{PROJECT_ROOT}}/.claude/hooks/notify.sh",
            statusMessage: "Sending notification...",
          },
        ],
      },
    ],
  },
};

/**
 * Process the settings.json template by replacing {{PROJECT_ROOT}} with actual path.
 * Optionally filters out disabled hooks.
 */
export function processSettingsJsonTemplate(
  projectPath: string,
  disabledHooks: string[] = [],
): SettingsJson {
  let settings = JSON.parse(
    JSON.stringify(settingsJsonTemplate),
  ) as SettingsJson;

  // Filter out disabled hooks by matching script names
  if (disabledHooks.length > 0 && settings.hooks) {
    for (const eventType of Object.keys(settings.hooks)) {
      const groups = settings.hooks[eventType];
      if (!Array.isArray(groups)) continue;

      for (const group of groups) {
        group.hooks = group.hooks.filter((hook) => {
          if (hook.type !== "command" || !hook.command) return true;
          // Extract script name without extension from command path
          const scriptName = hook.command
            .replace(/.*\//, "")
            .replace(/\.\w+$/, "");
          return !disabledHooks.includes(scriptName);
        });
      }

      // Remove empty groups
      settings.hooks[eventType] = groups.filter((g) => g.hooks.length > 0);

      // Remove empty event types
      if (
        Array.isArray(settings.hooks[eventType]) &&
        (settings.hooks[eventType] as unknown[]).length === 0
      ) {
        delete settings.hooks[eventType];
      }
    }
  }

  // Replace {{PROJECT_ROOT}} placeholders
  const templateStr = JSON.stringify(settings);
  const processedStr = templateStr.replace(
    /\{\{PROJECT_ROOT\}\}/g,
    projectPath,
  );
  settings = JSON.parse(processedStr) as SettingsJson;

  return settings;
}
