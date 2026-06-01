/**
 * MCP Setup Command
 *
 * Configure MCP integrations after project initialization.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs-extra';
import { CliContext } from '../../lib/cli-context.js';
import { ManifestManager, McpManifestConfig } from '../../lib/manifest-manager.js';
import {
  checkAllPrerequisites,
  isGraphitiReady,
  isSerenaReady,
  McpPrerequisites,
} from '../../lib/mcp/prerequisite-checker.js';
import {
  formatPrerequisiteStatus,
  getPostInitInstructions,
} from '../../lib/mcp/install-instructions.js';
import { createSerenaProjectConfig } from '../../templates/serena-project.js';
import {
  getMcpPermissions,
  getMcpHooks,
  createSessionStartHook,
  createSessionEndHook,
} from '../../templates/mcp-hooks.js';
import type { SettingsLocal, HookGroup } from '../../templates/settings-local.js';

interface SetupOptions {
  path: string;
  graphiti: boolean;
  serena: boolean;
  graphitiGroupId?: string;
  serenaProject?: string;
  serenaLanguage?: string;
  noInteractive: boolean;
}

// Re-export McpManifestConfig for backward compatibility
export type McpConfig = McpManifestConfig;

/**
 * Create the mcp setup command
 */
export function createMcpSetupCommand(): Command {
  return new Command('setup')
    .description('Configure MCP integrations (Graphiti, Serena)')
    .option('-p, --path <path>', 'Project path', '.')
    .option('--graphiti', 'Enable Graphiti only')
    .option('--serena', 'Enable Serena only')
    .option('--graphiti-group-id <id>', 'Graphiti group ID')
    .option('--serena-project <name>', 'Serena project name')
    .option('--serena-language <lang>', 'Primary language for Serena', 'typescript')
    .option('--no-interactive', 'Skip interactive prompts')
    .action(async (options: SetupOptions) => {
      const ctx = options.path && options.path !== '.'
        ? await CliContext.create({ path: options.path })
        : await CliContext.require();
      const projectPath = ctx.projectRoot;
      const projectName = path.basename(projectPath);

      console.log(chalk.blue('\nAgentic Development Framework - MCP Setup\n'));

      // Validate project
      const manifestManager = new ManifestManager(projectPath);
      if (!(await manifestManager.exists())) {
        console.error(chalk.red('Error: Not an agentic framework project'));
        console.log(chalk.dim('\nRun "agentic-framework init" first.\n'));
        process.exit(1);
      }

      // Check prerequisites
      const spinner = ora({ text: 'Checking prerequisites...', discardStdin: true }).start();
      const prereqs = await checkAllPrerequisites();
      spinner.stop();

      console.log(formatPrerequisiteStatus(prereqs) + '\n');

      // Determine what to enable
      let enableGraphiti = options.graphiti;
      let enableSerena = options.serena;
      let graphitiGroupId = options.graphitiGroupId || projectName;
      let serenaProjectName = options.serenaProject || projectName;
      let serenaLanguage = options.serenaLanguage || 'typescript';

      // Interactive mode
      if (options.noInteractive === false && !options.graphiti && !options.serena) {
        const answers = await promptMcpSetup(prereqs, projectName);
        enableGraphiti = answers.enableGraphiti;
        enableSerena = answers.enableSerena;
        graphitiGroupId = answers.graphitiGroupId;
        serenaProjectName = answers.serenaProjectName;
        serenaLanguage = answers.serenaLanguage;
      } else if (!options.graphiti && !options.serena) {
        // Default: enable both
        enableGraphiti = true;
        enableSerena = true;
      }

      if (!enableGraphiti && !enableSerena) {
        console.log(chalk.yellow('No MCP integrations selected. Exiting.\n'));
        return;
      }

      // Create MCP configuration
      const mcpConfig: McpConfig = {
        enabled: true,
        graphiti: {
          enabled: enableGraphiti,
          groupId: graphitiGroupId,
        },
        serena: {
          enabled: enableSerena,
          projectName: serenaProjectName,
          language: serenaLanguage,
        },
      };

      // Apply configuration
      const setupSpinner = ora({ text: 'Configuring MCP...', discardStdin: true }).start();

      try {
        // Update manifest with MCP config
        const manifest = await manifestManager.read();
        manifest.mcp = mcpConfig;
        await manifestManager.write(manifest);

        // Create Serena project config if enabled
        let serenaConfigBackedUp = false;
        if (enableSerena) {
          setupSpinner.text = 'Creating Serena configuration...';
          const serenaDir = path.join(projectPath, '.serena');
          const serenaConfigPath = path.join(serenaDir, 'project.yml');
          await fs.ensureDir(serenaDir);

          // Back up existing config if it exists
          if (await fs.pathExists(serenaConfigPath)) {
            const backupPath = path.join(serenaDir, 'project.yml.bak');
            await fs.copy(serenaConfigPath, backupPath);
            serenaConfigBackedUp = true;
          }

          const serenaConfig = createSerenaProjectConfig(serenaProjectName, serenaLanguage);
          await fs.writeFile(serenaConfigPath, serenaConfig, 'utf-8');

          // Create memories directory
          await fs.ensureDir(path.join(serenaDir, 'memories'));
        }

        // Create MCP hook scripts
        setupSpinner.text = 'Creating MCP hooks...';
        const hooksDir = path.join(projectPath, '.claude', 'hooks');
        await fs.ensureDir(hooksDir);

        // Session start hook (MCP activation reminder)
        const sessionStartHook = createSessionStartHook(
          enableGraphiti,
          enableSerena,
          graphitiGroupId,
          serenaProjectName
        );
        await fs.writeFile(
          path.join(hooksDir, 'session-start-mcp.sh'),
          sessionStartHook,
          'utf-8'
        );
        await fs.chmod(path.join(hooksDir, 'session-start-mcp.sh'), 0o755);

        // Session end hook (Graphiti save reminder)
        if (enableGraphiti) {
          const sessionEndHook = createSessionEndHook(graphitiGroupId);
          await fs.writeFile(
            path.join(hooksDir, 'session-end-graphiti.sh'),
            sessionEndHook,
            'utf-8'
          );
          await fs.chmod(path.join(hooksDir, 'session-end-graphiti.sh'), 0o755);
        }

        // Update settings.local.json with MCP permissions
        setupSpinner.text = 'Updating settings...';
        const settingsPath = path.join(projectPath, '.claude', 'settings.local.json');
        let settings: SettingsLocal = {};

        if (await fs.pathExists(settingsPath)) {
          settings = await fs.readJson(settingsPath);
        }

        // Merge MCP permissions
        const mcpPermissions = getMcpPermissions(enableGraphiti, enableSerena);
        const existingPermissions = settings.permissions?.allow || [];
        const newPermissions = [...new Set([...existingPermissions, ...mcpPermissions])];
        settings.permissions = { ...(settings.permissions || {}), allow: newPermissions };

        // Merge MCP hooks (uses {{PROJECT_ROOT}} placeholder for portability)
        const mcpHooks = getMcpHooks(projectPath, enableGraphiti, enableSerena);
        settings.hooks = mergeHooks(settings.hooks, mcpHooks);

        await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');

        setupSpinner.succeed('MCP configured successfully');

        // Show post-setup instructions
        console.log(getPostInitInstructions(enableGraphiti, enableSerena, serenaProjectName, prereqs));

        // Summary
        console.log(chalk.bold('\nConfiguration saved:'));
        if (enableGraphiti) {
          console.log(`  ${chalk.green('✓')} Graphiti group_id: ${chalk.cyan(graphitiGroupId)}`);
        }
        if (enableSerena) {
          console.log(`  ${chalk.green('✓')} Serena project: ${chalk.cyan(serenaProjectName)}`);
          console.log(`  ${chalk.green('✓')} Language: ${chalk.cyan(serenaLanguage)}`);
          if (serenaConfigBackedUp) {
            console.log(chalk.dim('      (Previous config backed up to .serena/project.yml.bak)'));
          }
        }

        console.log(chalk.dim('\nTo seed knowledge bases, run:'));
        console.log(chalk.cyan('  agentic-framework mcp seed\n'));
      } catch (error) {
        setupSpinner.fail('Failed to configure MCP');
        throw error;
      }
    });
}

/**
 * Interactive prompts for MCP setup
 */
async function promptMcpSetup(
  prereqs: McpPrerequisites,
  projectName: string
): Promise<{
  enableGraphiti: boolean;
  enableSerena: boolean;
  graphitiGroupId: string;
  serenaProjectName: string;
  serenaLanguage: string;
}> {
  const graphitiReady = isGraphitiReady(prereqs);
  const serenaReady = isSerenaReady(prereqs);

  // Choose MCP integrations
  const { mcpChoice } = await inquirer.prompt<{ mcpChoice: string }>([
    {
      type: 'list',
      name: 'mcpChoice',
      message: 'Which MCP integrations do you want to enable?',
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
          name: 'Skip MCP setup',
          value: 'none',
        },
      ],
    },
  ]);

  if (mcpChoice === 'none') {
    return {
      enableGraphiti: false,
      enableSerena: false,
      graphitiGroupId: projectName,
      serenaProjectName: projectName,
      serenaLanguage: 'typescript',
    };
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
  let serenaProjectName = projectName;
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
    serenaProjectName = serenaAnswers.projectName;
    serenaLanguage = serenaAnswers.language;
  }

  return {
    enableGraphiti,
    enableSerena,
    graphitiGroupId,
    serenaProjectName,
    serenaLanguage,
  };
}

/**
 * Valid MCP hook names (whitelist for security)
 */
const VALID_MCP_HOOK_NAMES = [
  'session-start-mcp.sh',
  'session-end-graphiti.sh',
] as const;

/**
 * Normalize a hook command path for comparison
 * Extracts the script name from either absolute path or {{PROJECT_ROOT}} template
 */
function normalizeHookPath(command: string): string {
  // Extract just the script filename for comparison
  // e.g., "/Users/.../session-start-mcp.sh" -> "session-start-mcp.sh"
  // e.g., "{{PROJECT_ROOT}}/.claude/hooks/session-start-mcp.sh" -> "session-start-mcp.sh"
  const match = command.match(/([^/]+\.sh)$/);
  if (!match) return command;

  const hookName = match[1];

  // Validate against whitelist to prevent path traversal attacks
  if (!VALID_MCP_HOOK_NAMES.includes(hookName as typeof VALID_MCP_HOOK_NAMES[number])) {
    // Return original command if not in whitelist (allows non-MCP hooks to pass through)
    return command;
  }

  return hookName;
}

/**
 * Check if a hook command already exists (comparing by normalized path)
 */
function hookCommandExists(
  existingHooks: HookGroup[],
  newCommand: string
): boolean {
  const normalizedNew = normalizeHookPath(newCommand);
  for (const group of existingHooks) {
    for (const hook of group.hooks) {
      if (hook.command && normalizeHookPath(hook.command) === normalizedNew) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Merge hook configurations with proper deduplication
 * - Compares hooks by script name (not full path) to handle absolute vs template paths
 * - Prefers new hooks (with {{PROJECT_ROOT}}) over existing absolute paths
 */
function mergeHooks(
  existing: SettingsLocal['hooks'],
  newHooks: SettingsLocal['hooks']
): SettingsLocal['hooks'] {
  if (!existing || !newHooks) {
    return newHooks || existing || {};
  }

  const merged: SettingsLocal['hooks'] = {};

  // Process existing hooks, replacing absolute paths with template paths where applicable
  for (const [event, eventHooks] of Object.entries(existing)) {
    if (!eventHooks) continue; // Skip undefined hook groups

    const processedHooks: HookGroup[] = [];

    for (const hookGroup of eventHooks) {
      const processedGroup = { ...hookGroup };

      // Check if this hook should be replaced by a new template version
      if (hookGroup.hooks) {
        const shouldReplace = hookGroup.hooks.some((h) => {
          if (!h.command) return false;
          // If it's an absolute path and we have a new template version, skip it
          if (!h.command.includes('{{PROJECT_ROOT}}') && h.command.includes('/.claude/hooks/')) {
            const normalizedPath = normalizeHookPath(h.command);
            // Check if new hooks have a template version of this
            for (const [newEvent, newEventHooks] of Object.entries(newHooks)) {
              if (newEvent === event && newEventHooks) {
                for (const newGroup of newEventHooks) {
                  for (const newHook of newGroup.hooks) {
                    if (newHook.command && normalizeHookPath(newHook.command) === normalizedPath) {
                      return true; // Replace absolute with template
                    }
                  }
                }
              }
            }
          }
          return false;
        });

        if (!shouldReplace) {
          processedHooks.push(processedGroup);
        }
      } else {
        processedHooks.push(processedGroup);
      }
    }

    if (processedHooks.length > 0) {
      merged[event] = processedHooks;
    }
  }

  // Add new hooks, avoiding duplicates
  for (const [event, hooks] of Object.entries(newHooks)) {
    if (!hooks) continue; // Skip undefined hook groups

    if (!merged[event]) {
      merged[event] = hooks;
    } else {
      for (const hook of hooks) {
        const hookCommands = hook.hooks.map((h) => h.command).filter(Boolean) as string[];
        const allExist = hookCommands.every((cmd) =>
          hookCommandExists(merged[event] ?? [], cmd)
        );

        if (!allExist && merged[event]) {
          merged[event].push(hook);
        }
      }
    }
  }

  return merged;
}
