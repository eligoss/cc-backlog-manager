/**
 * MCP Check Command
 *
 * Check MCP prerequisites status (Docker, Graphiti, Serena).
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import {
  checkAllPrerequisites,
  isGraphitiReady,
  isSerenaReady,
} from '../../lib/mcp/prerequisite-checker.js';
import {
  formatPrerequisiteStatus,
  formatPrerequisiteStatusVerbose,
  getInstructionsForMissing,
} from '../../lib/mcp/install-instructions.js';

interface CheckOptions {
  json: boolean;
  verbose: boolean;
}

/**
 * Create the mcp check command
 */
export function createMcpCheckCommand(): Command {
  return new Command('check')
    .description('Check MCP prerequisites status')
    .option('--json', 'Output results as JSON')
    .option('-v, --verbose', 'Show detailed information and installation instructions')
    .action(async (options: CheckOptions) => {
      const spinner = ora({ text: 'Checking MCP prerequisites...', discardStdin: true }).start();

      try {
        const prereqs = await checkAllPrerequisites();
        spinner.stop();

        // JSON output
        if (options.json) {
          console.log(JSON.stringify(prereqs, null, 2));
          return;
        }

        // Human-readable output (use verbose version if requested)
        if (options.verbose) {
          console.log('\n' + formatPrerequisiteStatusVerbose(prereqs));
        } else {
          console.log('\n' + formatPrerequisiteStatus(prereqs));
        }

        // Summary
        const graphitiReady = isGraphitiReady(prereqs);
        const serenaReady = isSerenaReady(prereqs);

        console.log('\n' + chalk.bold('Summary:'));
        console.log(`  Graphiti: ${graphitiReady ? chalk.green('Ready') : chalk.yellow('Not ready')}`);
        console.log(`  Serena:   ${serenaReady ? chalk.green('Ready') : chalk.yellow('Not ready')}`);

        // Show instructions for missing prerequisites
        if (options.verbose && (!graphitiReady || !serenaReady)) {
          console.log('\n' + chalk.dim('─'.repeat(60)));
          console.log(getInstructionsForMissing(prereqs));
        } else if (!options.verbose && (!graphitiReady || !serenaReady)) {
          console.log(chalk.dim('\nRun with --verbose for installation instructions.'));
        }

        // Exit codes
        if (graphitiReady && serenaReady) {
          console.log(chalk.green('\n✓ All MCP prerequisites are met\n'));
          process.exit(0);
        } else if (graphitiReady || serenaReady) {
          console.log(chalk.yellow('\n! Some MCP prerequisites are missing\n'));
          process.exit(1);
        } else {
          console.log(chalk.red('\n✗ No MCP prerequisites are met\n'));
          process.exit(2);
        }
      } catch (error) {
        spinner.fail('Failed to check prerequisites');
        console.error(chalk.red(`\nError: ${(error as Error).message}`));
        process.exit(1);
      }
    });
}
