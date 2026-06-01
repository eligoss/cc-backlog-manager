/**
 * Writer Lock Fact Command
 *
 * CLI command for locking world facts with hash-based immutability.
 * Computes hash and adds to world.lock.json registry.
 *
 * Usage:
 *   agentic-framework writer lock-fact --fact <fact-id>
 *   agentic-framework writer lock-fact --path <file-path>
 *
 * @module commands/writer/lock-fact
 */

import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { glob } from 'glob';
import { CliContext } from '../../lib/cli-context.js';
import { withCLITelemetry } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';
import { parseFrontmatter } from '../../lib/common/yaml-frontmatter.js';
import { lockFact, writeLockFile } from './lib/lock-utils.js';

/**
 * Command options for the lock-fact command.
 */
interface CommandOptions {
  fact?: string;
  path?: string;
  init?: boolean;
}

/**
 * Create the lock-fact command.
 *
 * @returns Commander command instance
 */
export function createLockFactCommand(): Command {
  const command = new Command('lock-fact');

  command
    .description('Lock a world fact with hash-based immutability')
    .option('--fact <fact-id>', 'Fact ID to lock (e.g., world-core-physics)')
    .option('--path <file-path>', 'Path to fact file to lock')
    .option('--init', 'Initialize world.lock.json if it does not exist', false)
    .action(async (cmdOptions: CommandOptions) => {
      await withCLITelemetry(
        'writer',
        'lock-fact',
        cmdOptions as Record<string, unknown>,
        async () => {
          try {
            await runLockFactCommand(cmdOptions);
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
 * Run the lock-fact command.
 *
 * @param cmdOptions - Command options
 */
async function runLockFactCommand(cmdOptions: CommandOptions): Promise<void> {
  const { fact: factId, path: filePath, init } = cmdOptions;

  // Get CLI context
  const ctx = await CliContext.require();

  // Check if world.lock.json exists
  const lockFilePath = path.join(ctx.projectRoot, 'world.lock.json');
  const lockFileExists = await fs.pathExists(lockFilePath);

  // Initialize lock file if --init or if it doesn't exist
  if (!lockFileExists) {
    if (init) {
      console.log(chalk.dim('Initializing world.lock.json...\n'));
      await writeLockFile(ctx.projectRoot, { version: '1.0.0', facts: {} });
      console.log(chalk.green(`✓ Created ${lockFilePath}\n`));
    } else {
      console.log(chalk.yellow('No world.lock.json found.'));
      console.log(chalk.dim('Run with --init to create it, or create it manually.\n'));
      throw new Error('Lock file not found. Use --init to create it.');
    }
  }

  // Determine file path to lock
  let targetFilePath: string;

  if (filePath) {
    // Use provided path
    targetFilePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(ctx.projectRoot, filePath);
  } else if (factId) {
    // Find file by fact ID
    const worldPath = ctx.paths.resolve('world') || path.join(ctx.projectRoot, 'world');

    if (!(await fs.pathExists(worldPath))) {
      throw new Error(`World directory not found: ${worldPath}`);
    }

    // Search for file with this fact ID
    const worldFactFiles = await glob('**/*.md', {
      cwd: worldPath,
      absolute: true,
      ignore: ['**/node_modules/**', '**/.git/**'],
    });

    let foundFile: string | null = null;
    for (const file of worldFactFiles) {
      const content = await fs.readFile(file, 'utf-8');
      const { data } = parseFrontmatter(content);
      if (data.id === factId) {
        foundFile = file;
        break;
      }
    }

    if (!foundFile) {
      throw new Error(`Fact with ID "${factId}" not found in world directory`);
    }

    targetFilePath = foundFile;
  } else {
    throw new Error('Either --fact or --path must be provided');
  }

  // Check if file exists
  if (!(await fs.pathExists(targetFilePath))) {
    throw new Error(`File not found: ${targetFilePath}`);
  }

  // Print header
  console.log('');
  console.log(chalk.bold('='.repeat(80)));
  console.log(chalk.bold('Lock World Fact'));
  console.log(chalk.bold('='.repeat(80)));
  console.log('');

  // Read file to get metadata
  const content = await fs.readFile(targetFilePath, 'utf-8');
  const { data } = parseFrontmatter(content);

  const displayFactId = data.id as string;
  const mutability = data.mutability as string;

  console.log(chalk.dim('Fact Details:'));
  console.log(chalk.dim(`  ID:           ${displayFactId}`));
  console.log(chalk.dim(`  File:         ${path.relative(ctx.projectRoot, targetFilePath)}`));
  console.log(chalk.dim(`  Mutability:   ${mutability}`));
  console.log(chalk.dim(`  Established:  ${data.established}`));
  console.log(chalk.dim(`  Version:      ${data.version || '1.0.0'}`));
  console.log('');

  // Lock the fact
  const result = await lockFact(ctx.projectRoot, targetFilePath);

  if (result.success) {
    console.log(chalk.green(`✓ ${result.message}\n`));

    // Show what this means for each mutability type
    console.log(chalk.bold('What this means:'));
    switch (mutability) {
      case 'immutable':
        console.log(chalk.dim('  • Content is now hash-locked'));
        console.log(chalk.dim('  • Cannot be modified without explicit unlock'));
        console.log(chalk.dim('  • Pre-commit hook will verify hash'));
        console.log(chalk.dim('  • Use "unlock-fact" to make changes'));
        break;

      case 'append-only':
        console.log(chalk.dim('  • Original content is hash-locked'));
        console.log(chalk.dim('  • New sections can be added at the end'));
        console.log(chalk.dim('  • Additions must be logged in frontmatter'));
        console.log(chalk.dim('  • Original sections cannot be modified'));
        break;

      case 'expandable':
        console.log(chalk.dim('  • Parent content is hash-locked'));
        console.log(chalk.dim('  • New sub-items can be added'));
        console.log(chalk.dim('  • Expansions must be logged in frontmatter'));
        console.log(chalk.dim('  • Parent content cannot be modified'));
        break;
    }
    console.log('');
  } else {
    if (result.message.includes('already locked')) {
      console.log(chalk.yellow('⚠ This fact is already locked.\n'));
      console.log(chalk.dim('To modify it:'));
      console.log(chalk.dim(`  1. Unlock: agentic-framework writer unlock-fact --fact ${displayFactId}`));
      console.log(chalk.dim('  2. Make changes'));
      console.log(chalk.dim(`  3. Re-lock: agentic-framework writer lock-fact --fact ${displayFactId}\n`));
    } else {
      throw new Error(result.message);
    }
  }
}
