/**
 * Backlog MCP Tools
 *
 * MCP tool wrappers for backlog CLI commands.
 * Provides ticket creation, validation, import, update, and migration.
 *
 * @module mcp/tools/backlog
 */

import { z } from 'zod';
import { Command } from 'commander';
import { defineTool } from '../tool-registry.js';
import { successResult, errorResult, ErrorCodes } from '../types.js';
import { createCreateTicketCommand } from '../../commands/backlog/create-ticket.js';
import { createValidateCommand } from '../../commands/backlog/validate.js';
import { createImportJiraCommand } from '../../commands/backlog/import-jira.js';
import { createUpdateFieldsCommand } from '../../commands/backlog/update-fields.js';
import { createMigrateMilestonesCommand } from '../../commands/backlog/migrate-milestones.js';
import { captureOutput } from '../result-formatter.js';

/**
 * Execute a Commander command with arguments
 */
async function executeCommanderCommand(
  command: Command,
  args: string[]
): Promise<void> {
  await command.parseAsync(args, { from: 'user' });
}

// ============================================================================
// Tool 1: Create Ticket
// ============================================================================

const CreateTicketSchema = z.object({
  type: z
    .enum(['story', 'task', 'bug', 'epic', 'spike'])
    .describe('Ticket type'),
  path: z
    .string()
    .default('./backlog')
    .describe('Output directory path'),
  name: z
    .string()
    .optional()
    .describe('Ticket name in kebab-case (auto-generated if not provided)'),
  summary: z
    .string()
    .optional()
    .describe('Ticket summary/title'),
  dryRun: z
    .boolean()
    .default(false)
    .describe('Preview template without creating file'),
});

export const backlogCreateTool = defineTool(
  'agentic_backlog_create',
  'Create a new backlog ticket from template with auto-numbering',
  CreateTicketSchema,
  async (args) => {
    try {
      const command = createCreateTicketCommand();
      const commandArgs: string[] = ['--type', args.type];

      if (args.path && args.path !== './backlog') {
        commandArgs.push('--path', args.path);
      }
      if (args.name) {
        commandArgs.push('--name', args.name);
      }
      if (args.summary) {
        commandArgs.push('--summary', args.summary);
      }
      if (args.dryRun) {
        commandArgs.push('--dry-run');
      }

      const { output } = await captureOutput(
        () => executeCommanderCommand(command, commandArgs),
        { stripColors: true }
      );

      if (output.exitCode !== undefined && output.exitCode !== 0) {
        return errorResult(
          ErrorCodes.COMMAND_FAILED,
          'Failed to create ticket',
          'Check the output for validation errors',
          { output: output.output }
        );
      }

      return successResult(
        {
          type: args.type,
          path: args.path,
          name: args.name,
          dryRun: args.dryRun,
        },
        args.dryRun
          ? 'Ticket template preview generated'
          : 'Ticket created successfully',
        output.output
      );
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : String(error),
        'Ensure the backlog module is installed and path is valid'
      );
    }
  }
);

// ============================================================================
// Tool 2: Validate Tickets
// ============================================================================

const ValidateSchema = z.object({
  path: z
    .string()
    .default('./backlog')
    .describe('Path to backlog directory'),
  verbose: z
    .boolean()
    .default(false)
    .describe('Show detailed progress and logging'),
  schemaOnly: z
    .boolean()
    .default(false)
    .describe('Only run JSON Schema validation'),
  rulesOnly: z
    .boolean()
    .default(false)
    .describe('Only run business rules validation'),
});

export const backlogValidateTool = defineTool(
  'agentic_backlog_validate',
  'Validate backlog ticket files against schema and business rules',
  ValidateSchema,
  async (args) => {
    try {
      const command = createValidateCommand();
      const commandArgs: string[] = [];

      if (args.path && args.path !== './backlog') {
        commandArgs.push(args.path);
      }
      if (args.verbose) {
        commandArgs.push('--verbose');
      }
      if (args.schemaOnly) {
        commandArgs.push('--schema-only');
      }
      if (args.rulesOnly) {
        commandArgs.push('--rules-only');
      }

      const { output } = await captureOutput(
        () => executeCommanderCommand(command, commandArgs),
        { stripColors: true }
      );

      if (output.exitCode !== undefined && output.exitCode !== 0) {
        return errorResult(
          ErrorCodes.VALIDATION_FAILED,
          'Ticket validation failed',
          'Review the validation errors in the output',
          { output: output.output }
        );
      }

      return successResult(
        {
          path: args.path,
          schemaOnly: args.schemaOnly,
          rulesOnly: args.rulesOnly,
        },
        'All tickets are valid',
        output.output
      );
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : String(error),
        'Ensure the backlog directory exists and contains valid tickets'
      );
    }
  }
);

// ============================================================================
// Tool 3: Import from Jira
// ============================================================================

const ImportSchema = z.object({
  csvFile: z
    .string()
    .describe('Path to Jira CSV export file'),
  type: z
    .enum(['sprint', 'milestone'])
    .default('sprint')
    .describe('Import type'),
  sprint: z
    .string()
    .optional()
    .describe('Sprint ID for sprint imports (e.g., 2026-W1)'),
  milestone: z
    .string()
    .optional()
    .describe('Milestone ID for milestone imports (e.g., Jan2026)'),
  duplicate: z
    .enum(['error', 'skip', 'force'])
    .default('error')
    .describe('Duplicate handling mode'),
  dryRun: z
    .boolean()
    .default(false)
    .describe('Show what would be imported without creating files'),
  verbose: z
    .boolean()
    .default(false)
    .describe('Show detailed progress and logging'),
  path: z
    .string()
    .default('./backlog')
    .describe('Base path to backlog directory'),
});

export const backlogImportTool = defineTool(
  'agentic_backlog_import',
  'Import Jira tickets from CSV export file',
  ImportSchema,
  async (args) => {
    try {
      const command = createImportJiraCommand();
      const commandArgs: string[] = [args.csvFile];

      if (args.type && args.type !== 'sprint') {
        commandArgs.push('--type', args.type);
      }
      if (args.sprint) {
        commandArgs.push('--sprint', args.sprint);
      }
      if (args.milestone) {
        commandArgs.push('--milestone', args.milestone);
      }
      if (args.duplicate && args.duplicate !== 'error') {
        commandArgs.push('--duplicate', args.duplicate);
      }
      if (args.path && args.path !== './backlog') {
        commandArgs.push('--path', args.path);
      }
      if (args.dryRun) {
        commandArgs.push('--dry-run');
      }
      if (args.verbose) {
        commandArgs.push('--verbose');
      }

      const { output } = await captureOutput(
        () => executeCommanderCommand(command, commandArgs),
        { stripColors: true }
      );

      if (output.exitCode !== undefined && output.exitCode !== 0) {
        return errorResult(
          ErrorCodes.COMMAND_FAILED,
          'Failed to import tickets',
          'Check the output for import errors',
          { output: output.output }
        );
      }

      return successResult(
        {
          csvFile: args.csvFile,
          type: args.type,
          duplicate: args.duplicate,
          dryRun: args.dryRun,
        },
        args.dryRun
          ? 'Import preview generated'
          : 'Tickets imported successfully',
        output.output
      );
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : String(error),
        'Ensure CSV file exists and is valid Jira export format'
      );
    }
  }
);

// ============================================================================
// Tool 4: Update Fields
// ============================================================================

const UpdateFieldsSchema = z.object({
  remove: z
    .array(z.string())
    .optional()
    .describe('List of fields to remove'),
  add: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Fields to add with their values'),
  update: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Fields to update with their values'),
  pattern: z
    .string()
    .default('backlog/**/*.md')
    .describe('Glob pattern for files to update'),
  dryRun: z
    .boolean()
    .default(false)
    .describe('Preview changes without modifying files'),
  verbose: z
    .boolean()
    .default(false)
    .describe('Show detailed progress'),
  cwd: z
    .string()
    .optional()
    .describe('Working directory'),
});

export const backlogUpdateTool = defineTool(
  'agentic_backlog_update',
  'Bulk update frontmatter fields in backlog ticket files',
  UpdateFieldsSchema,
  async (args) => {
    try {
      const command = createUpdateFieldsCommand();
      const commandArgs: string[] = [];

      if (args.remove && args.remove.length > 0) {
        commandArgs.push('--remove', args.remove.join(','));
      }
      if (args.add) {
        Object.entries(args.add).forEach(([k, v]) => {
          commandArgs.push('--add', `${k}=${JSON.stringify(v)}`);
        });
      }
      if (args.update) {
        Object.entries(args.update).forEach(([k, v]) => {
          commandArgs.push('--update', `${k}=${JSON.stringify(v)}`);
        });
      }
      if (args.pattern && args.pattern !== 'backlog/**/*.md') {
        commandArgs.push('--pattern', args.pattern);
      }
      if (args.cwd) {
        commandArgs.push('--cwd', args.cwd);
      }
      if (args.dryRun) {
        commandArgs.push('--dry-run');
      }
      if (args.verbose) {
        commandArgs.push('--verbose');
      }

      const { output } = await captureOutput(
        () => executeCommanderCommand(command, commandArgs),
        { stripColors: true }
      );

      if (output.exitCode !== undefined && output.exitCode !== 0) {
        return errorResult(
          ErrorCodes.COMMAND_FAILED,
          'Failed to update fields',
          'Check the output for update errors',
          { output: output.output }
        );
      }

      return successResult(
        {
          pattern: args.pattern,
          operations: {
            remove: args.remove,
            add: args.add,
            update: args.update,
          },
          dryRun: args.dryRun,
        },
        args.dryRun
          ? 'Field update preview generated'
          : 'Fields updated successfully',
        output.output
      );
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : String(error),
        'Ensure at least one operation (remove, add, or update) is specified'
      );
    }
  }
);

// ============================================================================
// Tool 5: Migrate Milestones
// ============================================================================

const MigrateMilestonesSchema = z.object({
  path: z
    .string()
    .default('./backlog')
    .describe('Path to backlog directory'),
  dryRun: z
    .boolean()
    .default(false)
    .describe('Preview changes without applying them'),
  validate: z
    .boolean()
    .default(false)
    .describe('Validate milestone architecture after migration'),
  verbose: z
    .boolean()
    .default(false)
    .describe('Show detailed progress and logging'),
});

export const backlogMigrateTool = defineTool(
  'agentic_backlog_migrate',
  'Migrate milestone files to Jira-based sanitized naming',
  MigrateMilestonesSchema,
  async (args) => {
    try {
      const command = createMigrateMilestonesCommand();
      const commandArgs: string[] = [];

      if (args.path && args.path !== './backlog') {
        commandArgs.push(args.path);
      }
      if (args.dryRun) {
        commandArgs.push('--dry-run');
      }
      if (args.validate) {
        commandArgs.push('--validate');
      }
      if (args.verbose) {
        commandArgs.push('--verbose');
      }

      const { output } = await captureOutput(
        () => executeCommanderCommand(command, commandArgs),
        { stripColors: true }
      );

      if (output.exitCode !== undefined && output.exitCode !== 0) {
        return errorResult(
          ErrorCodes.COMMAND_FAILED,
          'Milestone migration failed',
          'Check the output for migration errors',
          { output: output.output }
        );
      }

      return successResult(
        {
          path: args.path,
          dryRun: args.dryRun,
          validate: args.validate,
        },
        args.dryRun
          ? 'Migration preview generated'
          : 'Milestones migrated successfully',
        output.output
      );
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : String(error),
        'Ensure the backlog/milestones directory exists'
      );
    }
  }
);

// ============================================================================
// Export all backlog tools
// ============================================================================

export const backlogTools = [
  backlogCreateTool,
  backlogValidateTool,
  backlogImportTool,
  backlogUpdateTool,
  backlogMigrateTool,
];
