/**
 * MCP Status Command
 *
 * Show MCP integration status for a project.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import { CliContext } from '../../lib/cli-context.js';
import { ManifestManager } from '../../lib/manifest-manager.js';
import {
  checkAllPrerequisites,
  isGraphitiReady,
  isSerenaReady,
} from '../../lib/mcp/prerequisite-checker.js';
import { formatPrerequisiteStatus } from '../../lib/mcp/install-instructions.js';
import { McpConfig } from './setup.js';

interface StatusOptions {
  path: string;
  json: boolean;
}

/**
 * Create the mcp status command
 */
export function createMcpStatusCommand(): Command {
  return new Command('status')
    .description('Show MCP integration status')
    .option('-p, --path <path>', 'Project path', '.')
    .option('--json', 'Output results as JSON')
    .action(async (options: StatusOptions) => {
      const ctx = options.path && options.path !== '.'
        ? await CliContext.create({ path: options.path })
        : await CliContext.require();
      const projectPath = ctx.projectRoot;

      // Validate project
      const manifestManager = new ManifestManager(projectPath);
      if (!(await manifestManager.exists())) {
        console.error(chalk.red('Error: Not an agentic framework project'));
        console.log(chalk.dim('\nRun "agentic-framework init" first.\n'));
        process.exit(1);
      }

      const spinner = ora({ text: 'Checking MCP status...', discardStdin: true }).start();

      try {
        // Load manifest
        const manifest = await manifestManager.read();
        const mcpConfig = manifest.mcp as McpConfig | undefined;

        // Check prerequisites
        const prereqs = await checkAllPrerequisites();

        // Check for Serena project config
        const serenaConfigPath = path.join(projectPath, '.serena', 'project.yml');
        const hasSerenaConfig = await fs.pathExists(serenaConfigPath);

        // Check for MCP hooks
        const hooksDir = path.join(projectPath, '.claude', 'hooks');
        const hasSessionStartHook = await fs.pathExists(path.join(hooksDir, 'session-start-mcp.sh'));
        const hasSessionEndHook = await fs.pathExists(path.join(hooksDir, 'session-end-graphiti.sh'));

        spinner.stop();

        // JSON output
        if (options.json) {
          const status = {
            configured: !!mcpConfig?.enabled,
            config: mcpConfig || null,
            prerequisites: prereqs,
            files: {
              serenaConfig: hasSerenaConfig,
              sessionStartHook: hasSessionStartHook,
              sessionEndHook: hasSessionEndHook,
            },
            ready: {
              graphiti: isGraphitiReady(prereqs) && mcpConfig?.graphiti?.enabled,
              serena: isSerenaReady(prereqs) && mcpConfig?.serena?.enabled,
            },
          };
          console.log(JSON.stringify(status, null, 2));
          return;
        }

        // Human-readable output
        console.log(chalk.blue('\nMCP Integration Status\n'));

        // Configuration status
        console.log(chalk.bold('Configuration:'));
        if (!mcpConfig?.enabled) {
          console.log(`  ${chalk.yellow('!')} MCP not configured`);
          console.log(chalk.dim('  Run "agentic-framework mcp setup" to configure\n'));
        } else {
          console.log(`  ${chalk.green('✓')} MCP enabled`);

          if (mcpConfig.graphiti?.enabled) {
            console.log(`  ${chalk.green('✓')} Graphiti: ${chalk.cyan(mcpConfig.graphiti.groupId)}`);
          } else {
            console.log(`  ${chalk.dim('○')} Graphiti: disabled`);
          }

          if (mcpConfig.serena?.enabled) {
            console.log(`  ${chalk.green('✓')} Serena: ${chalk.cyan(mcpConfig.serena.projectName)} (${mcpConfig.serena.language})`);
          } else {
            console.log(`  ${chalk.dim('○')} Serena: disabled`);
          }
        }

        // Files status
        console.log('\n' + chalk.bold('Files:'));
        console.log(`  ${hasSerenaConfig ? chalk.green('✓') : chalk.dim('○')} .serena/project.yml`);
        console.log(`  ${hasSessionStartHook ? chalk.green('✓') : chalk.dim('○')} .claude/hooks/session-start-mcp.sh`);
        console.log(`  ${hasSessionEndHook ? chalk.green('✓') : chalk.dim('○')} .claude/hooks/session-end-graphiti.sh`);

        // Prerequisites status
        console.log('\n' + formatPrerequisiteStatus(prereqs));

        // Ready status
        const graphitiReady = isGraphitiReady(prereqs) && mcpConfig?.graphiti?.enabled;
        const serenaReady = isSerenaReady(prereqs) && mcpConfig?.serena?.enabled;

        console.log('\n' + chalk.bold('Ready to Use:'));
        if (mcpConfig?.graphiti?.enabled) {
          console.log(`  Graphiti: ${graphitiReady ? chalk.green('Yes') : chalk.yellow('No (check prerequisites)')}`);
        }
        if (mcpConfig?.serena?.enabled) {
          console.log(`  Serena:   ${serenaReady ? chalk.green('Yes') : chalk.yellow('No (check prerequisites)')}`);
        }

        // Suggestions
        if (!mcpConfig?.enabled) {
          console.log(chalk.dim('\nSetup MCP:'));
          console.log(chalk.cyan('  agentic-framework mcp setup'));
        } else if (graphitiReady || serenaReady) {
          console.log(chalk.dim('\nSeed knowledge bases:'));
          console.log(chalk.cyan('  agentic-framework mcp seed'));
        }

        console.log('');
      } catch (error) {
        spinner.fail('Failed to check status');
        throw error;
      }
    });
}
