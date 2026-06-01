/**
 * Init wizard orchestration
 * Main entry point for interactive project initialization
 */

import chalk from 'chalk';
import { getAvailableModules, loadModule } from '../module-loader.js';
import { detectExistingProject, ExistingProjectInfo } from './detection.js';
import { getModuleInfo, groupModules, ModuleInfo } from './module-groups.js';
import {
  promptProjectLocation,
  promptExistingFilesConfirmation,
  promptModules,
  promptGitInit,
  promptMcpSetup,
  promptConfirmation,
} from './prompts.js';
import { generateSummary, renderFrameworkExistsError } from './summary.js';

/**
 * MCP configuration from wizard
 */
export interface McpWizardConfig {
  enabled: boolean;
  graphiti: boolean;
  serena: boolean;
  graphitiGroupId: string;
  serenaProject: string;
  serenaLanguage: string;
}

/**
 * Result from wizard completion
 */
export interface WizardResult {
  projectName: string;
  projectPath: string;
  modules: string[];
  initGit: boolean;
  existingInfo: ExistingProjectInfo;
  confirmed: boolean;
  mcp?: McpWizardConfig;
}

/**
 * Run the init wizard
 * @param providedName Optional project name from CLI
 * @returns WizardResult if confirmed, null if cancelled
 */
export async function runInitWizard(providedName?: string): Promise<WizardResult | null> {
  console.log(chalk.blue('\nAgentic Development Framework - Interactive Setup\n'));

  try {
    // Step 1: Get project location
    const { projectName, projectPath } = await promptProjectLocation(providedName);

    // Step 2: Detect existing files
    const existingInfo = await detectExistingProject(projectPath);

    // Step 3: Check if framework already initialized
    if (existingInfo.hasFrameworkManifest) {
      console.log(renderFrameworkExistsError());
      return null;
    }

    // Step 4: Confirm existing files handling
    if (!(await promptExistingFilesConfirmation(existingInfo))) {
      console.log(chalk.yellow('\nSetup cancelled.'));
      return null;
    }

    // Step 5: Load available modules
    const availableModuleIds = await getAvailableModules();
    const moduleInfos: ModuleInfo[] = [];

    for (const moduleId of availableModuleIds) {
      try {
        const manifest = await loadModule(moduleId);
        moduleInfos.push(getModuleInfo(manifest));
      } catch {
        // Skip modules that fail to load
        console.warn(chalk.yellow(`Warning: Could not load module '${moduleId}'`));
      }
    }

    // Step 6: Group modules and prompt for selection
    const groups = groupModules(moduleInfos);
    const selectedModules = await promptModules(groups);

    // Step 7: Git initialization (if not already initialized)
    const initGit = await promptGitInit(existingInfo.hasGit);

    // Step 8: MCP setup (optional)
    const mcpConfig = await promptMcpSetup(projectName);

    // Step 9: Generate summary and get confirmation
    const summary = generateSummary({
      projectName,
      projectPath,
      modules: selectedModules,
      initGit,
      existingInfo,
      mcp: mcpConfig,
    });

    const confirmed = await promptConfirmation(summary);

    if (!confirmed) {
      console.log(chalk.yellow('\nSetup cancelled.'));
      return null;
    }

    return {
      projectName,
      projectPath,
      modules: selectedModules,
      initGit,
      existingInfo,
      confirmed: true,
      mcp: mcpConfig,
    };
  } catch (error) {
    // Handle Ctrl+C gracefully
    if ((error as NodeJS.ErrnoException).code === 'ERR_USE_AFTER_CLOSE') {
      console.log(chalk.yellow('\n\nSetup cancelled.'));
      return null;
    }
    throw error;
  }
}
