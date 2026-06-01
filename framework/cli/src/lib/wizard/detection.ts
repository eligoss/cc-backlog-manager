/**
 * Existing project detection for init wizard
 * Detects pre-existing files and directories
 */

import fs from 'fs-extra';
import path from 'path';

/**
 * Information about existing project files
 */
export interface ExistingProjectInfo {
  hasGit: boolean;
  hasClaudeMd: boolean;
  hasGitignore: boolean;
  hasReadme: boolean;
  hasRoutesYml: boolean;
  hasFrameworkManifest: boolean; // .agentic-framework.json
  hasAiDir: boolean;
  hasClaudeDir: boolean;
  hasSettingsLocal: boolean;
  isEmpty: boolean;
}

/**
 * Detect existing project files and directories
 */
export async function detectExistingProject(projectPath: string): Promise<ExistingProjectInfo> {
  const [
    hasGit,
    hasClaudeMd,
    hasGitignore,
    hasReadme,
    hasRoutesYml,
    hasFrameworkManifest,
    hasAiDir,
    hasClaudeDir,
    hasSettingsLocal,
  ] = await Promise.all([
    fs.pathExists(path.join(projectPath, '.git')),
    fs.pathExists(path.join(projectPath, 'CLAUDE.md')),
    fs.pathExists(path.join(projectPath, '.gitignore')),
    fs.pathExists(path.join(projectPath, 'README.md')),
    fs.pathExists(path.join(projectPath, 'routes.yml')),
    fs.pathExists(path.join(projectPath, '.agentic-framework.json')),
    fs.pathExists(path.join(projectPath, 'ai')),
    fs.pathExists(path.join(projectPath, '.claude')),
    fs.pathExists(path.join(projectPath, '.claude/settings.local.json')),
  ]);

  // Check if directory is empty or doesn't exist
  let isEmpty = true;
  if (await fs.pathExists(projectPath)) {
    const contents = await fs.readdir(projectPath);
    // Consider empty if only contains hidden files like .git
    isEmpty = contents.length === 0;
  }

  return {
    hasGit,
    hasClaudeMd,
    hasGitignore,
    hasReadme,
    hasRoutesYml,
    hasFrameworkManifest,
    hasAiDir,
    hasClaudeDir,
    hasSettingsLocal,
    isEmpty,
  };
}

/**
 * Check if any existing files were detected
 */
export function hasExistingFiles(info: ExistingProjectInfo): boolean {
  return (
    info.hasGit ||
    info.hasClaudeMd ||
    info.hasGitignore ||
    info.hasReadme ||
    info.hasRoutesYml ||
    info.hasAiDir ||
    info.hasClaudeDir
  );
}

/**
 * Action types for file operations
 */
export type FileAction = 'CREATE' | 'MERGE' | 'APPEND' | 'SKIP' | 'BACKUP';

/**
 * Planned action for a file
 */
export interface PlannedAction {
  file: string;
  action: FileAction;
  description?: string;
}

/**
 * Generate list of planned actions based on existing files
 */
export function generatePlannedActions(info: ExistingProjectInfo): PlannedAction[] {
  const actions: PlannedAction[] = [];

  // .agentic-framework.json - always created (error if exists handled separately)
  actions.push({ file: '.agentic-framework.json', action: 'CREATE' });

  // routes.yml
  if (info.hasRoutesYml) {
    actions.push({ file: 'routes.yml', action: 'BACKUP', description: 'backup existing, create new' });
  } else {
    actions.push({ file: 'routes.yml', action: 'CREATE' });
  }

  // CLAUDE.md
  if (info.hasClaudeMd) {
    actions.push({ file: 'CLAUDE.md', action: 'MERGE', description: 'add framework section' });
  } else {
    actions.push({ file: 'CLAUDE.md', action: 'CREATE' });
  }

  // .gitignore
  if (info.hasGitignore) {
    actions.push({ file: '.gitignore', action: 'APPEND', description: 'add framework entries' });
  } else {
    actions.push({ file: '.gitignore', action: 'CREATE' });
  }

  // README.md
  if (info.hasReadme) {
    actions.push({ file: 'README.md', action: 'SKIP', description: 'already exists' });
  } else {
    actions.push({ file: 'README.md', action: 'CREATE' });
  }

  // .claude/ directory
  actions.push({ file: '.claude/commands/', action: 'CREATE' });
  actions.push({ file: '.claude/skills/', action: 'CREATE' });
  actions.push({ file: '.claude/skills/project/', action: 'CREATE' });
  actions.push({ file: '.claude/context/', action: 'CREATE', description: 'skip existing files' });
  actions.push({ file: '.claude/registries/', action: 'CREATE' });

  // settings.local.json
  if (info.hasSettingsLocal) {
    actions.push({ file: '.claude/settings.local.json', action: 'MERGE', description: 'preserve user settings' });
  } else {
    actions.push({ file: '.claude/settings.local.json', action: 'CREATE' });
  }

  return actions;
}

/**
 * Format planned actions for display
 */
export function formatPlannedActions(actions: PlannedAction[]): string {
  const lines: string[] = [];

  for (const action of actions) {
    const actionStr = action.action.padEnd(6);
    const desc = action.description ? ` (${action.description})` : '';
    lines.push(`  ${actionStr}  ${action.file}${desc}`);
  }

  return lines.join('\n');
}
