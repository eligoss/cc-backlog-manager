/**
 * Writer Unlock Fact Command
 *
 * CLI command for unlocking world facts to allow modifications.
 * Requires a reason for audit trail purposes.
 *
 * Usage:
 *   agentic-framework writer unlock-fact --fact <fact-id> --reason "explanation"
 *   agentic-framework writer unlock-fact --fact <fact-id> --dry-run
 *
 * @module commands/writer/unlock-fact
 */

import { Command } from 'commander';
import chalk from 'chalk';
import readline from 'readline';
import { CliContext } from '../../lib/cli-context.js';
import { withCLITelemetry } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';
import { unlockFact, readLockFile } from './lib/lock-utils.js';

/**
 * Command options for unlock-fact command
 */
interface CommandOptions {
  fact?: string;
  reason?: string;
  dryRun?: boolean;
  yes?: boolean;
}

/**
 * Create the unlock-fact command.
 *
 * @returns Commander command instance
 */
export function createUnlockFactCommand(): Command {
  const command = new Command('unlock-fact');

  command
    .description('Unlock a world fact to allow modifications')
    .option('--fact <fact-id>', 'Fact ID to unlock (e.g., world-core-physics)')
    .option('--reason <reason>', 'Reason for unlocking (required for audit trail)')
    .option('--dry-run', 'Show what would be unlocked without making changes', false)
    .option('-y, --yes', 'Skip confirmation prompt', false)
    .action(async (cmdOptions: CommandOptions) => {
      await withCLITelemetry(
        'writer',
        'unlock-fact',
        cmdOptions as Record<string, unknown>,
        async () => {
          try {
            await runUnlockFactCommand(cmdOptions);
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
 * Prompt user for confirmation
 *
 * @param message - Confirmation message
 * @returns True if user confirms, false otherwise
 */
async function promptConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Run the unlock-fact command.
 *
 * @param cmdOptions - Command options
 */
async function runUnlockFactCommand(cmdOptions: CommandOptions): Promise<void> {
  const { fact: factId, reason, dryRun, yes } = cmdOptions;

  // Validate required options
  if (!factId) {
    throw new Error('--fact option is required');
  }

  if (!dryRun && !reason) {
    throw new Error('--reason option is required (unless using --dry-run)');
  }

  // Get CLI context
  const ctx = await CliContext.require();

  // Check if fact exists in lock file
  const lockFile = await readLockFile(ctx.projectRoot);
  const lockEntry = lockFile.facts[factId];
  if (!lockEntry) {
    throw new Error(`Fact "${factId}" not found in lock file. It may not be locked yet.`);
  }

  // Print header
  console.log('');
  console.log(chalk.bold('='.repeat(80)));
  console.log(chalk.bold(dryRun ? 'Unlock Fact (Dry Run)' : 'Unlock Fact'));
  console.log(chalk.bold('='.repeat(80)));
  console.log('');

  console.log(chalk.dim('Fact Details:'));
  console.log(chalk.dim(`  ID:           ${factId}`));
  console.log(chalk.dim(`  Mutability:   ${lockEntry.mutability}`));
  console.log(chalk.dim(`  Established:  ${lockEntry.established}`));
  console.log('');

  if (dryRun) {
    console.log(chalk.yellow('DRY RUN - No changes made\n'));
    console.log(chalk.dim('What would happen:'));
    console.log(chalk.dim(`  • Fact would be unlocked from ${lockEntry.mutability} registry`));
    console.log(chalk.dim('  • Audit trail entry would be created'));
    console.log('');
    console.log(chalk.dim('After unlocking, you could:'));
    console.log(chalk.dim('  1. Modify the fact file'));
    console.log(chalk.dim(`  2. Re-lock with: agentic-framework writer lock-fact --fact ${factId}`));
    console.log('');
    return;
  }

  // Show warning and get confirmation for immutable facts
  if (lockEntry.mutability === 'immutable' && !yes) {
    console.log(chalk.yellow('⚠ WARNING: You are about to unlock an IMMUTABLE fact.\n'));
    console.log(chalk.dim('Immutable facts are the foundation of world consistency.'));
    console.log(chalk.dim('Modifying them may create contradictions across your story.\n'));
    console.log(chalk.dim(`Reason for unlock: ${reason}\n`));

    const confirmed = await promptConfirmation(
      chalk.bold('Are you sure you want to proceed? (y/N): ')
    );

    if (!confirmed) {
      console.log(chalk.dim('\nUnlock cancelled.\n'));
      return;
    }
  }

  // Perform unlock
  const result = await unlockFact(ctx.projectRoot, factId, reason || 'Dry run');

  if (result.success) {
    console.log('');
    console.log(chalk.green(`✓ ${result.message}\n`));

    // Show next steps
    console.log(chalk.bold('Next Steps:'));
    console.log(chalk.dim('  1. Make your changes to the fact file'));
    console.log(chalk.dim(`  2. Re-lock the fact: agentic-framework writer lock-fact --fact ${factId}`));
    console.log(chalk.dim('  3. Verify consistency across affected books'));
    console.log('');

    // Show mutability-specific guidance
    switch (lockEntry.mutability) {
      case 'immutable':
        console.log(chalk.yellow('IMMUTABLE Fact Guidance:'));
        console.log(chalk.dim('  • Ensure changes do not contradict established lore'));
        console.log(chalk.dim('  • Update any dependent facts if necessary'));
        console.log(chalk.dim('  • Review all books that reference this fact'));
        break;

      case 'append-only':
        console.log(chalk.yellow('APPEND-ONLY Fact Guidance:'));
        console.log(chalk.dim('  • Consider adding a new section instead of modifying'));
        console.log(chalk.dim('  • If modifying original content, update carefully'));
        console.log(chalk.dim('  • Log any additions in frontmatter'));
        break;

      case 'expandable':
        console.log(chalk.yellow('EXPANDABLE Fact Guidance:'));
        console.log(chalk.dim('  • Consider creating a new sub-item instead'));
        console.log(chalk.dim('  • If modifying parent, ensure sub-items remain valid'));
        console.log(chalk.dim('  • Log any expansions in frontmatter'));
        break;
    }
    console.log('');
  } else {
    throw new Error(result.message);
  }
}
