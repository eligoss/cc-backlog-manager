/**
 * Writer Validate Immutability Command
 *
 * CLI command for validating world fact immutability.
 * Checks world facts against world.lock.json to enforce immutability rules.
 *
 * Usage:
 *   agentic-framework writer validate-immutability [options]
 *
 * @module commands/writer/validate-immutability
 */

import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { glob } from 'glob';
import { CliContext } from '../../lib/cli-context.js';
import { withCLITelemetry } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';
import {
  validateFactFiles,
  formatValidationResult,
  validateStagedFacts,
} from './lib/immutability-utils.js';

/**
 * Command options for validate-immutability command.
 */
interface CommandOptions {
  path?: string;
  stagedOnly?: boolean;
  verbose?: boolean;
}

/**
 * Create the validate-immutability command.
 *
 * @returns Commander command instance
 */
export function createValidateImmutabilityCommand(): Command {
  const command = new Command('validate-immutability');

  command
    .description('Validate world fact immutability against world.lock.json')
    .option('--path <path>', 'Path to world facts directory', './world')
    .option('--staged-only', 'Only validate staged files (for pre-commit hook)', false)
    .option('-v, --verbose', 'Show detailed validation output', false)
    .action(async (cmdOptions: CommandOptions) => {
      await withCLITelemetry(
        'writer',
        'validate-immutability',
        cmdOptions as Record<string, unknown>,
        async () => {
          try {
            await runValidateImmutabilityCommand(cmdOptions);
            return { success: true };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(chalk.red(`\nError: ${errorMessage}\n`));
            process.exit(1);
          }
        }
      );
    });

  return command;
}

/**
 * Run the validate-immutability command.
 *
 * @param cmdOptions - Command options
 */
async function runValidateImmutabilityCommand(cmdOptions: CommandOptions): Promise<void> {
  const { path: worldPath = './world', stagedOnly, verbose } = cmdOptions;

  // Get CLI context
  const ctx = await CliContext.require();

  // If staged-only, use git hook validator
  if (stagedOnly) {
    const result = await validateStagedFacts(ctx.projectRoot);
    console.log(result.message);
    process.exit(result.exitCode);
    return;
  }

  // Resolve world path
  const resolvedPath = ctx.paths.resolve('world') || path.join(ctx.projectRoot, worldPath);

  // Check if world directory exists
  if (!(await fs.pathExists(resolvedPath))) {
    throw new Error(`World directory not found: ${resolvedPath}`);
  }

  // Check if world.lock.json exists
  const lockFilePath = path.join(ctx.projectRoot, 'world.lock.json');
  if (!(await fs.pathExists(lockFilePath))) {
    console.log(chalk.yellow('\nNo world.lock.json found. World facts are not locked yet.'));
    console.log(chalk.dim('Run "agentic-framework writer lock-fact" to lock facts.\n'));
    return;
  }

  // Print header
  console.log('');
  console.log(chalk.bold('='.repeat(80)));
  console.log(chalk.bold('World Fact Immutability Validation'));
  console.log(chalk.bold('='.repeat(80)));
  console.log('');
  console.log(chalk.dim('Configuration:'));
  console.log(chalk.dim(`  Project Root:  ${ctx.projectRoot}`));
  console.log(chalk.dim(`  World Path:    ${resolvedPath}`));
  console.log(chalk.dim(`  Lock File:     ${lockFilePath}`));
  console.log('');

  // Find all world fact files
  const worldFactFiles = await glob('**/*.md', {
    cwd: resolvedPath,
    absolute: true,
    ignore: ['**/node_modules/**', '**/.git/**'],
  });

  if (worldFactFiles.length === 0) {
    console.log(chalk.yellow('No world fact files found in the specified path.\n'));
    return;
  }

  console.log(chalk.dim(`Found ${worldFactFiles.length} world fact files\n`));

  // Validate files
  const startTime = Date.now();
  const validationResult = await validateFactFiles(ctx.projectRoot, worldFactFiles);
  const duration = Date.now() - startTime;

  // Format and display results
  const formatted = formatValidationResult(validationResult);
  console.log(formatted);

  // Show summary
  console.log('');
  console.log(chalk.bold('Summary:'));
  console.log(chalk.dim(`  Files checked:    ${worldFactFiles.length}`));
  console.log(chalk.dim(`  Facts validated:  ${validationResult.factsValidated}`));
  console.log(chalk.dim(`  Errors:           ${validationResult.errors.length}`));
  console.log(chalk.dim(`  Warnings:         ${validationResult.warnings.length}`));
  console.log(chalk.dim(`  Duration:         ${duration}ms`));
  console.log('');

  // Show verbose details if requested
  if (verbose) {
    console.log(chalk.bold('Validation Details:'));
    console.log('');

    if (validationResult.errors.length > 0) {
      console.log(chalk.red('Errors:'));
      for (const error of validationResult.errors) {
        console.log(chalk.red(`  [${error.code}] ${error.factId}`));
        console.log(chalk.dim(`    File: ${error.file}`));
        console.log(chalk.dim(`    ${error.message}`));
        if (error.expectedHash && error.actualHash) {
          console.log(chalk.dim(`    Expected: ${error.expectedHash.substring(0, 16)}...`));
          console.log(chalk.dim(`    Actual:   ${error.actualHash.substring(0, 16)}...`));
        }
        console.log('');
      }
    }

    if (validationResult.warnings.length > 0) {
      console.log(chalk.yellow('Warnings:'));
      for (const warning of validationResult.warnings) {
        console.log(chalk.yellow(`  ${warning.factId}`));
        console.log(chalk.dim(`    File: ${warning.file}`));
        console.log(chalk.dim(`    ${warning.message}`));
        console.log('');
      }
    }
  }

  // Exit with error code if validation failed
  if (!validationResult.valid) {
    console.log(chalk.red('Validation failed. Fix errors before committing.\n'));
    process.exit(1);
  }

  console.log(chalk.green('✓ All validations passed\n'));
}
