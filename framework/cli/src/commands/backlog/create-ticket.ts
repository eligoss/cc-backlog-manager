/**
 * Backlog Create Ticket Command
 *
 * CLI command for creating new backlog tickets from templates.
 * Uses UnifiedTemplateEngine to render ticket templates.
 *
 * Usage:
 *   agentic-framework backlog create-ticket --type <type> [options]
 *
 * @module commands/backlog/create-ticket
 */

import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { createUnifiedTemplateEngine } from '../../lib/unified-template-engine/index.js';
import { CliContext, type TicketType } from '../../lib/cli-context.js';
import { recordCLICommand } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';
import type { CreateTicketOptions } from '../../types/command-options.js';

/**
 * Valid ticket types
 */
const TICKET_TYPES = ['story', 'task', 'bug', 'epic', 'spike'];

/**
 * Mapping of ticket types to their correct plural directory names
 */
const TICKET_TYPE_DIRS: Record<string, string> = {
  story: 'stories',
  task: 'tasks',
  bug: 'bugs',
  epic: 'epics',
  spike: 'spikes',
};

/**
 * Create the create-ticket command.
 *
 * @returns Commander command instance
 */
export function createCreateTicketCommand(): Command {
  const command = new Command('create-ticket');

  command
    .description('Create a new ticket from template')
    .requiredOption('-t, --type <type>', `Ticket type: ${TICKET_TYPES.join(', ')}`)
    .option('-p, --path <path>', 'Output directory path', './backlog')
    .option('-n, --name <name>', 'Ticket name in kebab-case (auto-generated if not provided)')
    .option('-s, --summary <summary>', 'Ticket summary/title')
    .option('--dry-run', 'Preview template without creating file', false)
    .action(async (options) => {
      try {
        await runCreateTicketCommand(options);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`\nError: ${errorMessage}\n`));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Run the create-ticket command.
 *
 * @param options - Command options
 */
async function runCreateTicketCommand(options: CreateTicketOptions): Promise<void> {
  const startTime = Date.now();
  const { type, path: outputPath, name, summary, dryRun } = options;

  // Validate ticket type
  if (!TICKET_TYPES.includes(type)) {
    throw new Error(
      `Invalid ticket type: ${type}. Must be one of: ${TICKET_TYPES.join(', ')}`
    );
  }

  // Get CLI context for project detection and path resolution
  const ctx = await CliContext.require();

  // Print header
  console.log('');
  console.log(chalk.bold('='.repeat(80)));
  console.log(chalk.bold('Create Backlog Ticket'));
  console.log(chalk.bold('='.repeat(80)));
  console.log('');

  // Determine ticket directory:
  // - If --path is provided, use it as override
  // - Otherwise, use CliContext path resolution
  const ticketDir = outputPath
    ? path.join(path.resolve(outputPath), 'tickets', TICKET_TYPE_DIRS[type])
    : ctx.paths.getTicketPath(type as TicketType);

  console.log(chalk.dim('Configuration:'));
  console.log(chalk.dim(`  Project Root:     ${ctx.projectRoot}`));
  console.log(chalk.dim(`  Ticket Type:      ${type}`));
  console.log(chalk.dim(`  Ticket Directory: ${ticketDir}`));
  console.log(chalk.dim(`  Dry Run:          ${dryRun ? 'YES' : 'NO'}`));
  console.log('');

  // Create unified template engine
  const engine = createUnifiedTemplateEngine({
    projectRoot: ctx.projectRoot,
    templateCategory: 'backlog-ticket-standards',
  });

  // Get current date
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Determine ticket name
  let ticketName = name;
  if (!ticketName) {
    // Auto-generate ticket name based on type
    await fs.ensureDir(ticketDir);

    // Get next number for this type
    const nextNum = await engine.getNextNumber(ticketDir, {
      pattern: `${type.toUpperCase()}-{num}`,
      padding: 3,
      startFrom: 1,
    });
    const paddedNum = nextNum.toString().padStart(3, '0');
    ticketName = `${type.toUpperCase()}-${paddedNum}`;

    console.log(chalk.green(`✓ Auto-generated ticket name: ${ticketName}`));
  }

  // Get summary (use ticket name if not provided)
  const ticketSummary = summary || `${type.charAt(0).toUpperCase() + type.slice(1)}: ${ticketName}`;

  // Prepare template variables
  const variables = {
    name: ticketName,
    summary: ticketSummary,
    date: date,
  };

  console.log(chalk.dim('Template Variables:'));
  console.log(chalk.dim(`  name:    ${variables.name}`));
  console.log(chalk.dim(`  summary: ${variables.summary}`));
  console.log(chalk.dim(`  date:    ${variables.date}`));
  console.log('');

  // Render template
  // Template files are named: story.template.md, task.template.md, etc.
  // Config keys are: story.template, task.template, etc.
  const templateName = `${type}.template`;
  console.log(chalk.cyan(`Rendering template: ${templateName}...`));

  // Determine output file path
  const outputFilePath = path.join(ticketDir, `${ticketName}.md`);

  // Check if file already exists
  if (!dryRun && (await fs.pathExists(outputFilePath))) {
    throw new Error(`File already exists: ${outputFilePath}`);
  }

  const result = await engine.renderToFile(templateName, {
    variables,
    outputPath: outputFilePath,
    dryRun,
  }, 'backlog-ticket-standards');

  if (dryRun) {
    // Dry run - just print the rendered content
    console.log('');
    console.log(chalk.bold('=== Rendered Template (Dry Run) ==='));
    console.log('');
    console.log(result.content);
    console.log('');
    console.log(chalk.yellow('✓ Dry run complete - no files created'));

    const durationMs = Date.now() - startTime;
    recordCLICommand(
      'backlog',
      'create-ticket',
      { type, dry_run: dryRun },
      { ticket_id: ticketName, path: outputFilePath },
      durationMs,
      true
    ).catch(() => {});
    return;
  }

  const durationMs = Date.now() - startTime;
  recordCLICommand(
    'backlog',
    'create-ticket',
    { type, dry_run: dryRun },
    { ticket_id: ticketName, path: outputFilePath },
    durationMs,
    true
  ).catch(() => {});

  console.log('');
  console.log(chalk.green('✓ Ticket created successfully!'));
  console.log('');
  console.log(chalk.dim('File Location:'));
  console.log(chalk.bold(`  ${outputFilePath}`));
  console.log('');
  console.log(chalk.dim('Next Steps:'));
  console.log(chalk.dim('  1. Edit the ticket to fill in details'));
  console.log(chalk.dim('  2. Validate with: agentic-framework backlog validate'));
  console.log(chalk.dim('  3. Export to Jira when ready'));
  console.log('');
}
