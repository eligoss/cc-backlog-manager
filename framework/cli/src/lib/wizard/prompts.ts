/**
 * Interactive prompts for init wizard
 * Uses inquirer for user input
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import path from 'path';
import { ModuleGroup, buildModuleChoices } from './module-groups.js';
import { ExistingProjectInfo, hasExistingFiles } from './detection.js';
import { renderExistingFilesMessage, renderSummary, ProjectSummary } from './summary.js';
import { McpWizardConfig } from './init-wizard.js';
import {
  checkAllPrerequisites,
  isGraphitiReady,
  isSerenaReady,
} from '../mcp/prerequisite-checker.js';
import { formatPrerequisiteStatus } from '../mcp/install-instructions.js';

/**
 * Prompt for project location (current directory or new)
 */
export async function promptProjectLocation(
  providedName?: string
): Promise<{ projectName: string; projectPath: string }> {
  // If name was provided via CLI, use current directory (name is metadata only)
  if (providedName) {
    return {
      projectName: providedName,
      projectPath: process.cwd(),
    };
  }

  // Ask user where to initialize
  const { location } = await inquirer.prompt<{ location: 'current' | 'new' }>([
    {
      type: 'list',
      name: 'location',
      message: 'Where to initialize the framework?',
      choices: [
        { name: 'Current directory (.)', value: 'current' },
        { name: 'New project directory', value: 'new' },
      ],
    },
  ]);

  if (location === 'current') {
    const currentDir = process.cwd();
    const projectName = path.basename(currentDir);
    return {
      projectName,
      projectPath: currentDir,
    };
  }

  // Prompt for project name
  const { projectName } = await inquirer.prompt<{ projectName: string }>([
    {
      type: 'input',
      name: 'projectName',
      message: 'What is your project name?',
      default: 'my-project',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Project name is required';
        }
        // Validate directory name (no special chars except - and _)
        if (!/^[a-zA-Z0-9_-]+$/.test(input)) {
          return 'Project name can only contain letters, numbers, hyphens, and underscores';
        }
        return true;
      },
    },
  ]);

  return {
    projectName,
    projectPath: path.resolve(process.cwd(), projectName),
  };
}

/**
 * Prompt for confirmation when existing files detected
 */
export async function promptExistingFilesConfirmation(
  info: ExistingProjectInfo
): Promise<boolean> {
  if (!hasExistingFiles(info)) {
    return true;
  }

  console.log(renderExistingFilesMessage(info));

  const { proceed } = await inquirer.prompt<{ proceed: boolean }>([
    {
      type: 'confirm',
      name: 'proceed',
      message: 'Continue with framework initialization?',
      default: true,
    },
  ]);

  return proceed;
}

/**
 * Prompt for module selection
 */
export async function promptModules(groups: ModuleGroup[]): Promise<string[]> {
  const choices = buildModuleChoices(groups);

  console.log(chalk.bold('\nSelect modules to install:'));

  const { modules } = await inquirer.prompt<{ modules: string[] }>([
    {
      type: 'checkbox',
      name: 'modules',
      message: 'Use space to toggle, enter to confirm',
      choices,
      pageSize: 15,
      loop: false,
    },
  ]);

  // Ensure core is always included
  if (!modules.includes('core')) {
    modules.unshift('core');
  }

  return modules;
}

/**
 * Prompt for git initialization
 */
export async function promptGitInit(hasExistingGit: boolean): Promise<boolean> {
  if (hasExistingGit) {
    console.log(chalk.dim('\n✓ Git repository already initialized'));
    return false; // Don't init, but also don't skip git-related files
  }

  const { initGit } = await inquirer.prompt<{ initGit: boolean }>([
    {
      type: 'confirm',
      name: 'initGit',
      message: 'Initialize a git repository?',
      default: true,
    },
  ]);

  return initGit;
}

/**
 * Prompt for MCP setup
 */
export async function promptMcpSetup(projectName: string): Promise<McpWizardConfig | undefined> {
  console.log(chalk.bold('\nAI Memory Integration (Optional)'));
  console.log(chalk.dim('MCP integrations provide persistent memory and semantic code navigation.\n'));

  // Check prerequisites first
  const prereqs = await checkAllPrerequisites();
  const graphitiReady = isGraphitiReady(prereqs);
  const serenaReady = isSerenaReady(prereqs);

  // Show prerequisite status
  console.log(formatPrerequisiteStatus(prereqs));
  console.log('');

  // Ask about MCP setup
  const { mcpChoice } = await inquirer.prompt<{ mcpChoice: string }>([
    {
      type: 'list',
      name: 'mcpChoice',
      message: 'Enable AI memory integration?',
      choices: [
        {
          name: `Full MCP (Graphiti + Serena) ${chalk.dim('[recommended]')}`,
          value: 'both',
        },
        {
          name: `Graphiti only - Knowledge graph memory ${!graphitiReady ? chalk.yellow('(not ready)') : ''}`,
          value: 'graphiti',
        },
        {
          name: `Serena only - Semantic code navigation ${!serenaReady ? chalk.yellow('(not ready)') : ''}`,
          value: 'serena',
        },
        {
          name: `No - Skip ${chalk.dim('(add later with "agentic-framework mcp setup")')}`,
          value: 'none',
        },
      ],
    },
  ]);

  if (mcpChoice === 'none') {
    return undefined;
  }

  const enableGraphiti = mcpChoice === 'both' || mcpChoice === 'graphiti';
  const enableSerena = mcpChoice === 'both' || mcpChoice === 'serena';

  // Graphiti configuration
  let graphitiGroupId = projectName;
  if (enableGraphiti) {
    const { groupId } = await inquirer.prompt<{ groupId: string }>([
      {
        type: 'input',
        name: 'groupId',
        message: 'Graphiti group ID:',
        default: projectName,
        validate: (input: string) => {
          if (!input.trim()) return 'Group ID is required';
          if (!/^[a-zA-Z0-9_-]+$/.test(input)) {
            return 'Group ID can only contain letters, numbers, hyphens, and underscores';
          }
          return true;
        },
      },
    ]);
    graphitiGroupId = groupId;
  }

  // Serena configuration
  let serenaProject = projectName;
  let serenaLanguage = 'typescript';
  if (enableSerena) {
    const serenaAnswers = await inquirer.prompt<{
      projectName: string;
      language: string;
    }>([
      {
        type: 'input',
        name: 'projectName',
        message: 'Serena project name:',
        default: projectName,
        validate: (input: string) => {
          if (!input.trim()) return 'Project name is required';
          if (!/^[a-zA-Z0-9_-]+$/.test(input)) {
            return 'Project name can only contain letters, numbers, hyphens, and underscores';
          }
          return true;
        },
      },
      {
        type: 'list',
        name: 'language',
        message: 'Primary language:',
        choices: [
          { name: 'TypeScript', value: 'typescript' },
          { name: 'JavaScript', value: 'javascript' },
          { name: 'Python', value: 'python' },
          { name: 'Go', value: 'go' },
          { name: 'Rust', value: 'rust' },
          { name: 'Java', value: 'java' },
          { name: 'Other', value: 'other' },
        ],
        default: 'typescript',
      },
    ]);
    serenaProject = serenaAnswers.projectName;
    serenaLanguage = serenaAnswers.language;
  }

  return {
    enabled: true,
    graphiti: enableGraphiti,
    serena: enableSerena,
    graphitiGroupId,
    serenaProject,
    serenaLanguage,
  };
}

/**
 * Prompt for final confirmation
 */
export async function promptConfirmation(summary: ProjectSummary): Promise<boolean> {
  console.log(renderSummary(summary));

  const { proceed } = await inquirer.prompt<{ proceed: boolean }>([
    {
      type: 'confirm',
      name: 'proceed',
      message: 'Proceed with framework initialization?',
      default: true,
    },
  ]);

  return proceed;
}
