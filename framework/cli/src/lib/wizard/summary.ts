/**
 * Summary generation for init wizard
 * Displays project configuration before execution
 */

import chalk from 'chalk';
import { ExistingProjectInfo, PlannedAction, generatePlannedActions } from './detection.js';
import { McpWizardConfig } from './init-wizard.js';

/**
 * Wizard answers from prompts
 */
export interface WizardAnswers {
  projectName: string;
  projectPath: string;
  modules: string[];
  initGit: boolean;
  existingInfo: ExistingProjectInfo;
  mcp?: McpWizardConfig;
}

/**
 * Project summary for confirmation
 */
export interface ProjectSummary {
  projectName: string;
  projectPath: string;
  modules: string[];
  gitStatus: 'will_init' | 'already_exists' | 'skip';
  actions: PlannedAction[];
  mcp?: McpWizardConfig;
}

/**
 * Generate project summary from wizard answers
 */
export function generateSummary(answers: WizardAnswers): ProjectSummary {
  let gitStatus: ProjectSummary['gitStatus'];

  if (answers.existingInfo.hasGit) {
    gitStatus = 'already_exists';
  } else if (answers.initGit) {
    gitStatus = 'will_init';
  } else {
    gitStatus = 'skip';
  }

  return {
    projectName: answers.projectName,
    projectPath: answers.projectPath,
    modules: answers.modules,
    gitStatus,
    actions: generatePlannedActions(answers.existingInfo),
    mcp: answers.mcp,
  };
}

/**
 * Render summary for display
 */
export function renderSummary(summary: ProjectSummary): string {
  const lines: string[] = [];

  lines.push(chalk.bold('\nProject Configuration'));
  lines.push(chalk.dim('─'.repeat(40)));
  lines.push(`${chalk.dim('Name:')}     ${summary.projectName}`);
  lines.push(`${chalk.dim('Path:')}     ${summary.projectPath}`);
  lines.push(`${chalk.dim('Modules:')}  ${summary.modules.join(', ')}`);

  // Git status
  let gitDisplay: string;
  switch (summary.gitStatus) {
    case 'already_exists':
      gitDisplay = 'Already initialized';
      break;
    case 'will_init':
      gitDisplay = 'Will initialize';
      break;
    case 'skip':
      gitDisplay = 'Skip';
      break;
  }
  lines.push(`${chalk.dim('Git:')}      ${gitDisplay}`);

  // MCP status
  if (summary.mcp?.enabled) {
    const mcpParts: string[] = [];
    if (summary.mcp.graphiti) {
      mcpParts.push(`Graphiti (${summary.mcp.graphitiGroupId})`);
    }
    if (summary.mcp.serena) {
      mcpParts.push(`Serena (${summary.mcp.serenaProject})`);
    }
    lines.push(`${chalk.dim('MCP:')}      ${mcpParts.join(', ')}`);
  } else {
    lines.push(`${chalk.dim('MCP:')}      Disabled`);
  }

  lines.push('');
  lines.push(chalk.bold('Actions:'));
  lines.push(formatPlannedActionsColored(summary.actions));
  lines.push('');

  return lines.join('\n');
}

/**
 * Format planned actions with colors
 */
function formatPlannedActionsColored(actions: PlannedAction[]): string {
  const lines: string[] = [];

  for (const action of actions) {
    let actionColor: (s: string) => string;
    switch (action.action) {
      case 'CREATE':
        actionColor = chalk.green;
        break;
      case 'MERGE':
        actionColor = chalk.yellow;
        break;
      case 'APPEND':
        actionColor = chalk.cyan;
        break;
      case 'SKIP':
        actionColor = chalk.dim;
        break;
      case 'BACKUP':
        actionColor = chalk.magenta;
        break;
      default:
        actionColor = chalk.white;
    }

    const actionStr = actionColor(action.action.padEnd(6));
    const desc = action.description ? chalk.dim(` (${action.description})`) : '';
    lines.push(`  ${actionStr}  ${action.file}${desc}`);
  }

  return lines.join('\n');
}

/**
 * Render existing files detection message
 */
export function renderExistingFilesMessage(info: ExistingProjectInfo): string {
  const lines: string[] = [];

  lines.push(chalk.yellow('\nDetected existing files:'));

  if (info.hasGit) {
    lines.push(chalk.dim('  ✓ Git repository initialized'));
  }
  if (info.hasClaudeMd) {
    lines.push(chalk.dim('  ✓ CLAUDE.md exists (will merge framework section)'));
  }
  if (info.hasGitignore) {
    lines.push(chalk.dim('  ✓ .gitignore exists (will append entries)'));
  }
  if (info.hasReadme) {
    lines.push(chalk.dim('  ✓ README.md exists (will preserve)'));
  }
  if (info.hasSettingsLocal) {
    lines.push(chalk.dim('  ✓ .claude/settings.local.json exists (will merge)'));
  }
  if (info.hasRoutesYml) {
    lines.push(chalk.dim('  ✓ routes.yml exists (will backup)'));
  }

  lines.push('');
  lines.push(chalk.dim('Framework will:'));
  if (info.hasGit) {
    lines.push(chalk.dim('  • Skip git init (already exists)'));
  }
  if (info.hasClaudeMd) {
    lines.push(chalk.dim('  • Add framework section to CLAUDE.md'));
  }
  if (info.hasGitignore) {
    lines.push(chalk.dim('  • Append missing entries to .gitignore'));
  }
  if (info.hasReadme) {
    lines.push(chalk.dim('  • Preserve your existing README.md'));
  }
  lines.push(chalk.dim('  • Create .claude/ and .claude/ directories'));
  lines.push('');

  return lines.join('\n');
}

/**
 * Render framework already initialized error
 */
export function renderFrameworkExistsError(): string {
  const lines: string[] = [];

  lines.push(chalk.red('\n⚠ Framework already initialized in this directory!'));
  lines.push('');
  lines.push('To manage your framework, use:');
  lines.push(chalk.dim('  agentic-framework sync     # Re-sync agents and skills'));
  lines.push(chalk.dim('  agentic-framework add      # Add new modules'));
  lines.push(chalk.dim('  agentic-framework remove   # Remove modules'));
  lines.push('');

  return lines.join('\n');
}
