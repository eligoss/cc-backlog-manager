/**
 * Writer MCP Tools
 *
 * MCP tools for fantasy book writing CLI commands.
 * Provides tools for initializing projects, creating structure, validating,
 * building, analyzing, exporting, and managing world fact immutability.
 *
 * @module mcp/tools/writer
 */

import { z } from 'zod';
import { Command } from 'commander';
import { defineTool } from '../tool-registry.js';
import { successResult, errorResult, ErrorCodes } from '../types.js';
import { captureOutput } from '../result-formatter.js';
import { createInitCommand } from '../../commands/writer/init.js';
import { createCreatePartCommand } from '../../commands/writer/create-part.js';
import { createCreateChapterCommand } from '../../commands/writer/create-chapter.js';
import { createCreateSceneCommand } from '../../commands/writer/create-scene.js';
import { createCreateCharacterCommand } from '../../commands/writer/create-character.js';
import { createValidateCommand } from '../../commands/writer/validate.js';
import { createBuildCommand } from '../../commands/writer/build.js';
import { createAnalyzeCommand } from '../../commands/writer/analyze.js';
import { createExportCommand } from '../../commands/writer/export.js';
import { createValidateImmutabilityCommand } from '../../commands/writer/validate-immutability.js';
import { createLockFactCommand } from '../../commands/writer/lock-fact.js';
import { createUnlockFactCommand } from '../../commands/writer/unlock-fact.js';

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
// Tool 1: Init
// ============================================================================

const InitSchema = z.object({
  name: z.string().describe('Book project name in kebab-case'),
  title: z.string().optional().describe('Book title (defaults to name)'),
  path: z.string().default('.').describe('Project root path'),
  dryRun: z.boolean().default(false).describe('Preview without creating files'),
});

export const writerInitTool = defineTool(
  'agentic_writer_init',
  'Initialize a new book project with folder structure',
  InitSchema,
  async (args) => {
    try {
      const command = createInitCommand();
      const commandArgs = ['--name', args.name];
      if (args.title) commandArgs.push('--title', args.title);
      if (args.path !== '.') commandArgs.push('--path', args.path);
      if (args.dryRun) commandArgs.push('--dry-run');

      const { output } = await captureOutput(
        () => executeCommanderCommand(command, commandArgs),
        { stripColors: true }
      );

      if (output.exitCode !== undefined && output.exitCode !== 0) {
        return errorResult(ErrorCodes.COMMAND_FAILED, 'Init failed', undefined, output.output);
      }
      return successResult({ name: args.name, path: args.path }, 'Book project initialized', output.output);
    } catch (error) {
      return errorResult(ErrorCodes.COMMAND_FAILED, error instanceof Error ? error.message : String(error));
    }
  }
);

// ============================================================================
// Tool 2: Create Part
// ============================================================================

const CreatePartSchema = z.object({
  name: z.string().describe('Part name in kebab-case'),
  title: z.string().optional().describe('Part title'),
  path: z.string().default('.').describe('Project root path'),
  dryRun: z.boolean().default(false).describe('Preview without creating files'),
});

export const writerCreatePartTool = defineTool(
  'agentic_writer_create_part',
  'Create a new part (story arc) with auto-numbering',
  CreatePartSchema,
  async (args) => {
    try {
      const command = createCreatePartCommand();
      const commandArgs = ['--name', args.name];
      if (args.title) commandArgs.push('--title', args.title);
      if (args.path !== '.') commandArgs.push('--path', args.path);
      if (args.dryRun) commandArgs.push('--dry-run');

      const { output } = await captureOutput(
        () => executeCommanderCommand(command, commandArgs),
        { stripColors: true }
      );

      if (output.exitCode !== undefined && output.exitCode !== 0) {
        return errorResult(ErrorCodes.COMMAND_FAILED, 'Create part failed', undefined, output.output);
      }
      return successResult({ name: args.name }, 'Part created', output.output);
    } catch (error) {
      return errorResult(ErrorCodes.COMMAND_FAILED, error instanceof Error ? error.message : String(error));
    }
  }
);

// ============================================================================
// Tool 3: Create Chapter
// ============================================================================

const CreateChapterSchema = z.object({
  part: z.string().describe('Part number (e.g., "001" or "1")'),
  name: z.string().describe('Chapter name in kebab-case'),
  title: z.string().optional().describe('Chapter title'),
  pov: z.string().describe('POV character name'),
  path: z.string().default('.').describe('Project root path'),
  dryRun: z.boolean().default(false).describe('Preview without creating files'),
});

export const writerCreateChapterTool = defineTool(
  'agentic_writer_create_chapter',
  'Create a new chapter within a part',
  CreateChapterSchema,
  async (args) => {
    try {
      const command = createCreateChapterCommand();
      const commandArgs = ['--part', args.part, '--name', args.name, '--pov', args.pov];
      if (args.title) commandArgs.push('--title', args.title);
      if (args.path !== '.') commandArgs.push('--path', args.path);
      if (args.dryRun) commandArgs.push('--dry-run');

      const { output } = await captureOutput(
        () => executeCommanderCommand(command, commandArgs),
        { stripColors: true }
      );

      if (output.exitCode !== undefined && output.exitCode !== 0) {
        return errorResult(ErrorCodes.COMMAND_FAILED, 'Create chapter failed', undefined, output.output);
      }
      return successResult({ part: args.part, name: args.name }, 'Chapter created', output.output);
    } catch (error) {
      return errorResult(ErrorCodes.COMMAND_FAILED, error instanceof Error ? error.message : String(error));
    }
  }
);

// ============================================================================
// Tool 4: Create Scene
// ============================================================================

const CreateSceneSchema = z.object({
  chapter: z.string().describe('Chapter path (e.g., "001/001")'),
  name: z.string().describe('Scene name in kebab-case'),
  title: z.string().optional().describe('Scene title'),
  pov: z.string().describe('POV character name'),
  sceneType: z.enum(['action', 'dialogue', 'introspection', 'transition']).describe('Scene type'),
  path: z.string().default('.').describe('Project root path'),
  dryRun: z.boolean().default(false).describe('Preview without creating files'),
});

export const writerCreateSceneTool = defineTool(
  'agentic_writer_create_scene',
  'Create a new scene within a chapter',
  CreateSceneSchema,
  async (args) => {
    try {
      const command = createCreateSceneCommand();
      const commandArgs = [
        '--chapter', args.chapter,
        '--name', args.name,
        '--pov', args.pov,
        '--scene-type', args.sceneType,
      ];
      if (args.title) commandArgs.push('--title', args.title);
      if (args.path !== '.') commandArgs.push('--path', args.path);
      if (args.dryRun) commandArgs.push('--dry-run');

      const { output } = await captureOutput(
        () => executeCommanderCommand(command, commandArgs),
        { stripColors: true }
      );

      if (output.exitCode !== undefined && output.exitCode !== 0) {
        return errorResult(ErrorCodes.COMMAND_FAILED, 'Create scene failed', undefined, output.output);
      }
      return successResult({ chapter: args.chapter, name: args.name }, 'Scene created', output.output);
    } catch (error) {
      return errorResult(ErrorCodes.COMMAND_FAILED, error instanceof Error ? error.message : String(error));
    }
  }
);

// ============================================================================
// Tool 5: Create Character
// ============================================================================

const CreateCharacterSchema = z.object({
  name: z.string().describe('Character name in kebab-case'),
  displayName: z.string().optional().describe('Character display name'),
  type: z.enum(['main', 'supporting', 'minor']).describe('Character type'),
  role: z.string().describe('Character role/description'),
  path: z.string().default('.').describe('Project root path'),
  dryRun: z.boolean().default(false).describe('Preview without creating files'),
});

export const writerCreateCharacterTool = defineTool(
  'agentic_writer_create_character',
  'Create a new character profile',
  CreateCharacterSchema,
  async (args) => {
    try {
      const command = createCreateCharacterCommand();
      const commandArgs = ['--name', args.name, '--type', args.type, '--role', args.role];
      if (args.displayName) commandArgs.push('--display-name', args.displayName);
      if (args.path !== '.') commandArgs.push('--path', args.path);
      if (args.dryRun) commandArgs.push('--dry-run');

      const { output } = await captureOutput(
        () => executeCommanderCommand(command, commandArgs),
        { stripColors: true }
      );

      if (output.exitCode !== undefined && output.exitCode !== 0) {
        return errorResult(ErrorCodes.COMMAND_FAILED, 'Create character failed', undefined, output.output);
      }
      return successResult({ name: args.name, type: args.type }, 'Character created', output.output);
    } catch (error) {
      return errorResult(ErrorCodes.COMMAND_FAILED, error instanceof Error ? error.message : String(error));
    }
  }
);

// ============================================================================
// Tool 6: Validate
// ============================================================================

const ValidateSchema = z.object({
  path: z.string().default('.').describe('Project root path'),
  verbose: z.boolean().default(false).describe('Show detailed output'),
  strict: z.boolean().default(false).describe('Fail on warnings'),
});

export const writerValidateTool = defineTool(
  'agentic_writer_validate',
  'Validate book structure and metadata',
  ValidateSchema,
  async (args) => {
    try {
      const command = createValidateCommand();
      const commandArgs: string[] = [];
      if (args.path !== '.') commandArgs.push('--path', args.path);
      if (args.verbose) commandArgs.push('--verbose');
      if (args.strict) commandArgs.push('--strict');

      const { output } = await captureOutput(
        () => executeCommanderCommand(command, commandArgs),
        { stripColors: true }
      );

      if (output.exitCode !== undefined && output.exitCode !== 0) {
        return errorResult(ErrorCodes.VALIDATION_FAILED, 'Validation failed', undefined, output.output);
      }
      return successResult({ validated: true }, 'Validation passed', output.output);
    } catch (error) {
      return errorResult(ErrorCodes.COMMAND_FAILED, error instanceof Error ? error.message : String(error));
    }
  }
);

// ============================================================================
// Tool 7: Build
// ============================================================================

const BuildSchema = z.object({
  path: z.string().default('.').describe('Project root path'),
  verbose: z.boolean().default(false).describe('Show detailed output'),
  watch: z.boolean().default(false).describe('Watch for changes'),
});

export const writerBuildTool = defineTool(
  'agentic_writer_build',
  'Build project with validation, context, and analysis',
  BuildSchema,
  async (args) => {
    try {
      const command = createBuildCommand();
      const commandArgs: string[] = [];
      if (args.path !== '.') commandArgs.push('--path', args.path);
      if (args.verbose) commandArgs.push('--verbose');
      if (args.watch) commandArgs.push('--watch');

      const { output } = await captureOutput(
        () => executeCommanderCommand(command, commandArgs),
        { stripColors: true }
      );

      if (output.exitCode !== undefined && output.exitCode !== 0) {
        return errorResult(ErrorCodes.COMMAND_FAILED, 'Build failed', undefined, output.output);
      }
      return successResult({ built: true }, 'Build completed', output.output);
    } catch (error) {
      return errorResult(ErrorCodes.COMMAND_FAILED, error instanceof Error ? error.message : String(error));
    }
  }
);

// ============================================================================
// Tool 8: Analyze
// ============================================================================

const AnalyzeSchema = z.object({
  path: z.string().default('.').describe('Project root path'),
  verbose: z.boolean().default(false).describe('Show detailed output'),
  output: z.string().optional().describe('Output directory'),
});

export const writerAnalyzeTool = defineTool(
  'agentic_writer_analyze',
  'Run analysis (character graph, timeline, word counts)',
  AnalyzeSchema,
  async (args) => {
    try {
      const command = createAnalyzeCommand();
      const commandArgs: string[] = [];
      if (args.path !== '.') commandArgs.push('--path', args.path);
      if (args.verbose) commandArgs.push('--verbose');
      if (args.output) commandArgs.push('--output', args.output);

      const { output } = await captureOutput(
        () => executeCommanderCommand(command, commandArgs),
        { stripColors: true }
      );

      if (output.exitCode !== undefined && output.exitCode !== 0) {
        return errorResult(ErrorCodes.COMMAND_FAILED, 'Analysis failed', undefined, output.output);
      }
      return successResult({ analyzed: true }, 'Analysis completed', output.output);
    } catch (error) {
      return errorResult(ErrorCodes.COMMAND_FAILED, error instanceof Error ? error.message : String(error));
    }
  }
);

// ============================================================================
// Tool 9: Export
// ============================================================================

const ExportSchema = z.object({
  path: z.string().default('.').describe('Project root path'),
  format: z.enum(['markdown', 'html']).default('markdown').describe('Export format'),
  output: z.string().optional().describe('Output directory'),
});

export const writerExportTool = defineTool(
  'agentic_writer_export',
  'Export manuscript to markdown or HTML',
  ExportSchema,
  async (args) => {
    try {
      const command = createExportCommand();
      const commandArgs = ['--format', args.format];
      if (args.path !== '.') commandArgs.push('--path', args.path);
      if (args.output) commandArgs.push('--output', args.output);

      const { output } = await captureOutput(
        () => executeCommanderCommand(command, commandArgs),
        { stripColors: true }
      );

      if (output.exitCode !== undefined && output.exitCode !== 0) {
        return errorResult(ErrorCodes.COMMAND_FAILED, 'Export failed', undefined, output.output);
      }
      return successResult({ format: args.format }, 'Export completed', output.output);
    } catch (error) {
      return errorResult(ErrorCodes.COMMAND_FAILED, error instanceof Error ? error.message : String(error));
    }
  }
);

// ============================================================================
// Tool 10: Validate Immutability
// ============================================================================

const ValidateImmutabilitySchema = z.object({
  path: z.string().default('.').describe('Project root path'),
  verbose: z.boolean().default(false).describe('Show detailed output'),
});

export const writerValidateImmutabilityTool = defineTool(
  'agentic_writer_validate_immutability',
  'Verify world fact immutability',
  ValidateImmutabilitySchema,
  async (args) => {
    try {
      const command = createValidateImmutabilityCommand();
      const commandArgs: string[] = [];
      if (args.path !== '.') commandArgs.push('--path', args.path);
      if (args.verbose) commandArgs.push('--verbose');

      const { output } = await captureOutput(
        () => executeCommanderCommand(command, commandArgs),
        { stripColors: true }
      );

      if (output.exitCode !== undefined && output.exitCode !== 0) {
        return errorResult(ErrorCodes.VALIDATION_FAILED, 'Immutability check failed', undefined, output.output);
      }
      return successResult({ validated: true }, 'Immutability validated', output.output);
    } catch (error) {
      return errorResult(ErrorCodes.COMMAND_FAILED, error instanceof Error ? error.message : String(error));
    }
  }
);

// ============================================================================
// Tool 11: Lock Fact
// ============================================================================

const LockFactSchema = z.object({
  factId: z.string().describe('Fact ID to lock'),
  path: z.string().default('.').describe('Project root path'),
  dryRun: z.boolean().default(false).describe('Preview without modifying files'),
});

export const writerLockFactTool = defineTool(
  'agentic_writer_lock_fact',
  'Lock a world fact to immutable',
  LockFactSchema,
  async (args) => {
    try {
      const command = createLockFactCommand();
      const commandArgs = ['--fact-id', args.factId];
      if (args.path !== '.') commandArgs.push('--path', args.path);
      if (args.dryRun) commandArgs.push('--dry-run');

      const { output } = await captureOutput(
        () => executeCommanderCommand(command, commandArgs),
        { stripColors: true }
      );

      if (output.exitCode !== undefined && output.exitCode !== 0) {
        return errorResult(ErrorCodes.COMMAND_FAILED, 'Lock failed', undefined, output.output);
      }
      return successResult({ factId: args.factId, locked: true }, 'Fact locked', output.output);
    } catch (error) {
      return errorResult(ErrorCodes.COMMAND_FAILED, error instanceof Error ? error.message : String(error));
    }
  }
);

// ============================================================================
// Tool 12: Unlock Fact
// ============================================================================

const UnlockFactSchema = z.object({
  factId: z.string().describe('Fact ID to unlock'),
  reason: z.string().describe('Reason for unlocking'),
  path: z.string().default('.').describe('Project root path'),
  dryRun: z.boolean().default(false).describe('Preview without modifying files'),
});

export const writerUnlockFactTool = defineTool(
  'agentic_writer_unlock_fact',
  'Unlock a world fact for modification',
  UnlockFactSchema,
  async (args) => {
    try {
      const command = createUnlockFactCommand();
      const commandArgs = ['--fact-id', args.factId, '--reason', args.reason];
      if (args.path !== '.') commandArgs.push('--path', args.path);
      if (args.dryRun) commandArgs.push('--dry-run');

      const { output } = await captureOutput(
        () => executeCommanderCommand(command, commandArgs),
        { stripColors: true }
      );

      if (output.exitCode !== undefined && output.exitCode !== 0) {
        return errorResult(ErrorCodes.COMMAND_FAILED, 'Unlock failed', undefined, output.output);
      }
      return successResult({ factId: args.factId, unlocked: true }, 'Fact unlocked', output.output);
    } catch (error) {
      return errorResult(ErrorCodes.COMMAND_FAILED, error instanceof Error ? error.message : String(error));
    }
  }
);

// ============================================================================
// Export All Tools
// ============================================================================

export const writerTools = [
  writerInitTool,
  writerCreatePartTool,
  writerCreateChapterTool,
  writerCreateSceneTool,
  writerCreateCharacterTool,
  writerValidateTool,
  writerBuildTool,
  writerAnalyzeTool,
  writerExportTool,
  writerValidateImmutabilityTool,
  writerLockFactTool,
  writerUnlockFactTool,
];
