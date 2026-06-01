/**
 * Generate Agents Command
 *
 * Generates Claude Code custom agent JSON files from slim agent markdown definitions.
 * These JSON files enable slim agents to be invoked as true subagents via the Task tool
 * with their own subagent_type (e.g., Task tool with subagent_type: "ai-app-developer-slim").
 *
 * The generated files are written to source module directories (framework/modules/<module>/agents/)
 * alongside the markdown files. They are then deployed to .claude/agents/ by the sync command.
 *
 * Usage:
 *     agentic-framework generate-agents              # Generate all slim agent JSONs
 *     agentic-framework generate-agents --dry-run    # Preview without writing
 *     agentic-framework generate-agents --force      # Overwrite existing files
 *     agentic-framework generate-agents --agent ai-app-developer-slim  # Single agent
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { AgentGenerator, GenerationItem } from '../lib/agent-generator.js';
import { recordCLICommand } from '../lib/telemetry/instrumentation/cli-instrumentation.js';
import { CliContext } from '../lib/cli-context.js';

interface GenerateAgentsOptions {
  agent?: string;
  dryRun?: boolean;
  force?: boolean;
}

export function createGenerateAgentsCommand(): Command {
  return new Command('generate-agents')
    .description('Generate Claude Code custom agent JSON files from slim agent markdown definitions')
    .option('-a, --agent <agent-id>', 'Generate for specific slim agent only')
    .option('--dry-run', 'Preview without creating files')
    .option('-f, --force', 'Overwrite existing agent JSON files')
    .action(async (options: GenerateAgentsOptions) => {
      const startTime = Date.now();

      try {
        // Get CLI context
        const ctx = await CliContext.require();

        console.log(chalk.blue('\nAgentic Framework - Generate Custom Agents\n'));

        if (options.dryRun) {
          console.log(chalk.yellow('=== DRY RUN (preview only) ===\n'));
        }

        // Initialize generator
        const generator = new AgentGenerator(ctx.projectRoot);

        // Generate agents
        const results = await generator.generateAll({
          dryRun: options.dryRun,
          force: options.force,
          agentId: options.agent,
        });

        // Display results
        console.log(chalk.bold('Slim Agents:'));

        const created: GenerationItem[] = [];
        const updated: GenerationItem[] = [];
        const skipped: GenerationItem[] = [];
        const failed: GenerationItem[] = [];

        for (const result of results) {
          const symbol = getActionSymbol(result.action);
          const statusText = getStatusText(result, options.dryRun);

          console.log(`  ${symbol} ${result.agentId} ${chalk.gray(statusText)}`);

          if (result.error) {
            console.log(chalk.red(`      Error: ${result.error}`));
          }

          switch (result.action) {
            case 'created':
              created.push(result);
              break;
            case 'updated':
              updated.push(result);
              break;
            case 'skipped':
              skipped.push(result);
              break;
            case 'failed':
              failed.push(result);
              break;
          }
        }

        // Summary
        console.log(chalk.bold('\n─── Summary ───'));
        console.log(`  Created: ${chalk.green(created.length)}`);
        console.log(`  Updated: ${chalk.cyan(updated.length)}`);
        console.log(`  Skipped: ${chalk.yellow(skipped.length)}`);
        console.log(`  Failed:  ${chalk.red(failed.length)}`);

        if (options.dryRun) {
          console.log(chalk.yellow('\n=== END DRY RUN ===\n'));
        } else if (created.length > 0 || updated.length > 0) {
          console.log(chalk.bold('\nNext steps:'));
          console.log(chalk.gray('  1. Review generated JSON files in framework/modules/<module>/agents/'));
          console.log(chalk.gray('  2. Run `agentic-framework sync` to deploy to .claude/agents/'));
          console.log(chalk.gray('  3. Slim agents will be available via Task tool with subagent_type'));
        }

        // Record telemetry
        const durationMs = Date.now() - startTime;
        recordCLICommand(
          'generate-agents',
          undefined,
          {
            agent: options.agent,
            dry_run: options.dryRun,
            force: options.force,
          },
          {
            created: created.length,
            updated: updated.length,
            skipped: skipped.length,
            failed: failed.length,
          },
          durationMs,
          failed.length === 0
        ).catch(() => {});

        if (failed.length > 0) {
          process.exit(1);
        }
      } catch (error) {
        console.error(
          chalk.red('Error generating agents:'),
          error instanceof Error ? error.message : error
        );
        process.exit(1);
      }
    });
}

/**
 * Get display symbol for action type.
 */
function getActionSymbol(action: GenerationItem['action']): string {
  switch (action) {
    case 'created':
      return chalk.green('✓');
    case 'updated':
      return chalk.cyan('↻');
    case 'skipped':
      return chalk.yellow('○');
    case 'failed':
      return chalk.red('✗');
    default:
      return ' ';
  }
}

/**
 * Get status text for display.
 */
function getStatusText(result: GenerationItem, dryRun?: boolean): string {
  const prefix = dryRun ? '(would ' : '(';
  const suffix = ')';

  switch (result.action) {
    case 'created':
      return `${prefix}create${suffix}`;
    case 'updated':
      return `${prefix}update${suffix}`;
    case 'skipped':
      return '(exists, use --force to overwrite)';
    case 'failed':
      return '(failed)';
    default:
      return '';
  }
}
