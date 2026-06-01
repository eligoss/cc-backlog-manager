/**
 * Writer Validate Command
 *
 * CLI command for validating book structure and metadata.
 *
 * Usage:
 *   agentic-framework writer validate
 *   agentic-framework writer validate --verbose
 *   agentic-framework writer validate --strict
 *
 * @module commands/writer/validate
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { CliContext } from '../../lib/cli-context.js';
import { recordCLICommand } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';

interface ValidationIssue {
  type: 'error' | 'warning';
  location: string;
  message: string;
  line?: number;
}

/**
 * Options for writer validate command
 */
interface WriterValidateCmdOptions {
  /** Verbose output */
  verbose?: boolean;
  /** Exit with error code on warnings */
  strict?: boolean;
  /** Project root path */
  path?: string;
  /** Index signature for telemetry compatibility */
  [key: string]: unknown;
}

/**
 * Parsed YAML frontmatter from markdown files
 */
interface Frontmatter {
  title?: string;
  type?: string;
  order?: number;
  status?: string;
  'scene-type'?: string;
  'scene-number'?: number;
  [key: string]: unknown;
}

/**
 * Create the validate command.
 *
 * @returns Commander command instance
 */
export function createValidateCommand(): Command {
  const command = new Command('validate');

  command
    .description('Validate book structure, references, and metadata')
    .option('-v, --verbose', 'Show detailed validation information', false)
    .option('--strict', 'Exit with error code on warnings', false)
    .option('-p, --path <path>', 'Project root path', '.')
    .action(async (cmdOptions: WriterValidateCmdOptions) => {
      try {
        await runValidateCommand(cmdOptions);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`\nError: ${errorMessage}\n`);
        process.exit(1);
      }
    });

  return command;
}

/**
 * Parse YAML frontmatter from markdown file.
 *
 * @param filePath - Path to markdown file
 * @returns Parsed frontmatter or null
 */
async function parseFrontmatter(filePath: string): Promise<Frontmatter | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return null;
    }
    return yaml.parse(frontmatterMatch[1]);
  } catch (_error) {
    return null;
  }
}

/**
 * Validate BOOK.md structure.
 *
 * @param projectRoot - Project root path
 * @returns Array of validation issues
 */
async function validateBookFile(projectRoot: string): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const bookPath = path.join(projectRoot, 'BOOK.md');

  if (!(await fs.pathExists(bookPath))) {
    issues.push({
      type: 'error',
      location: 'BOOK.md',
      message: 'BOOK.md not found. Run "agentic-framework writer init" first.',
    });
    return issues;
  }

  const frontmatter = await parseFrontmatter(bookPath);
  if (!frontmatter) {
    issues.push({
      type: 'error',
      location: 'BOOK.md',
      message: 'Invalid or missing YAML frontmatter',
    });
    return issues;
  }

  // Validate required fields
  const requiredFields = ['title', 'status', 'created'];
  for (const field of requiredFields) {
    if (!frontmatter[field]) {
      issues.push({
        type: 'error',
        location: 'BOOK.md',
        message: `Missing required field: ${field}`,
      });
    }
  }

  // Validate status
  const validStatuses = ['planning', 'drafting', 'revising', 'complete'];
  if (frontmatter.status && !validStatuses.includes(frontmatter.status)) {
    issues.push({
      type: 'warning',
      location: 'BOOK.md',
      message: `Invalid status: ${frontmatter.status}. Expected one of: ${validStatuses.join(', ')}`,
    });
  }

  return issues;
}

/**
 * Validate manuscript structure.
 *
 * @param projectRoot - Project root path
 * @param verbose - Show verbose output
 * @returns Array of validation issues
 */
async function validateManuscriptStructure(projectRoot: string, _verbose: boolean): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const manuscriptDir = path.join(projectRoot, 'manuscript');

  if (!(await fs.pathExists(manuscriptDir))) {
    issues.push({
      type: 'error',
      location: 'manuscript/',
      message: 'Manuscript directory not found',
    });
    return issues;
  }

  // Validate parts
  const partPattern = /^part-(\d{3})-(.+)$/;
  const items = await fs.readdir(manuscriptDir);
  const partDirs = items.filter(item => partPattern.test(item));

  if (partDirs.length === 0) {
    issues.push({
      type: 'warning',
      location: 'manuscript/',
      message: 'No parts found. Create parts with "agentic-framework writer create-part"',
    });
    return issues;
  }

  for (const partDir of partDirs) {
    const partPath = path.join(manuscriptDir, partDir);
    const partFile = path.join(partPath, 'PART.md');

    if (!(await fs.pathExists(partFile))) {
      issues.push({
        type: 'error',
        location: `${partDir}/PART.md`,
        message: 'PART.md not found',
      });
      continue;
    }

    // Validate part frontmatter
    const partFrontmatter = await parseFrontmatter(partFile);
    if (!partFrontmatter) {
      issues.push({
        type: 'error',
        location: `${partDir}/PART.md`,
        message: 'Invalid or missing YAML frontmatter',
      });
      continue;
    }

    if (!partFrontmatter['part-number']) {
      issues.push({
        type: 'error',
        location: `${partDir}/PART.md`,
        message: 'Missing part-number in frontmatter',
      });
    }

    // Validate chapters
    const chapterPattern = /^chapter-(\d{3})-(.+)$/;
    const partItems = await fs.readdir(partPath);
    const chapterDirs = partItems.filter(item => {
      const itemPath = path.join(partPath, item);
      return fs.statSync(itemPath).isDirectory() && chapterPattern.test(item);
    });

    for (const chapterDir of chapterDirs) {
      const chapterPath = path.join(partPath, chapterDir);
      const chapterFile = path.join(chapterPath, 'CHAPTER.md');

      if (!(await fs.pathExists(chapterFile))) {
        issues.push({
          type: 'error',
          location: `${partDir}/${chapterDir}/CHAPTER.md`,
          message: 'CHAPTER.md not found',
        });
        continue;
      }

      // Validate chapter frontmatter
      const chapterFrontmatter = await parseFrontmatter(chapterFile);
      if (!chapterFrontmatter) {
        issues.push({
          type: 'error',
          location: `${partDir}/${chapterDir}/CHAPTER.md`,
          message: 'Invalid or missing YAML frontmatter',
        });
        continue;
      }

      if (!chapterFrontmatter['chapter-number']) {
        issues.push({
          type: 'error',
          location: `${partDir}/${chapterDir}/CHAPTER.md`,
          message: 'Missing chapter-number in frontmatter',
        });
      }

      if (!chapterFrontmatter['pov-character']) {
        issues.push({
          type: 'warning',
          location: `${partDir}/${chapterDir}/CHAPTER.md`,
          message: 'Missing pov-character in frontmatter',
        });
      }

      // Validate scenes
      const scenePattern = /^scene-(\d{3})-(.+)\.md$/;
      const chapterItems = await fs.readdir(chapterPath);
      const sceneFiles = chapterItems.filter(item => scenePattern.test(item));

      for (const sceneFile of sceneFiles) {
        const scenePath = path.join(chapterPath, sceneFile);
        const sceneFrontmatter = await parseFrontmatter(scenePath);

        if (!sceneFrontmatter) {
          issues.push({
            type: 'error',
            location: `${partDir}/${chapterDir}/${sceneFile}`,
            message: 'Invalid or missing YAML frontmatter',
          });
          continue;
        }

        if (!sceneFrontmatter['scene-number']) {
          issues.push({
            type: 'error',
            location: `${partDir}/${chapterDir}/${sceneFile}`,
            message: 'Missing scene-number in frontmatter',
          });
        }

        const validSceneTypes = ['action', 'dialogue', 'introspection', 'transition'];
        if (sceneFrontmatter['scene-type'] && !validSceneTypes.includes(sceneFrontmatter['scene-type'])) {
          issues.push({
            type: 'warning',
            location: `${partDir}/${chapterDir}/${sceneFile}`,
            message: `Invalid scene-type: ${sceneFrontmatter['scene-type']}. Expected one of: ${validSceneTypes.join(', ')}`,
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Validate character files.
 *
 * @param projectRoot - Project root path
 * @returns Array of validation issues
 */
async function validateCharacters(projectRoot: string): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const charactersDir = path.join(projectRoot, 'characters');

  if (!(await fs.pathExists(charactersDir))) {
    issues.push({
      type: 'warning',
      location: 'characters/',
      message: 'Characters directory not found',
    });
    return issues;
  }

  const items = await fs.readdir(charactersDir);
  for (const item of items) {
    if (item.startsWith('.')) continue;

    const characterPath = path.join(charactersDir, item);
    const stat = await fs.stat(characterPath);

    if (stat.isDirectory()) {
      const profileFile = path.join(characterPath, 'profile.md');

      if (!(await fs.pathExists(profileFile))) {
        issues.push({
          type: 'error',
          location: `characters/${item}/profile.md`,
          message: 'profile.md not found',
        });
        continue;
      }

      const frontmatter = await parseFrontmatter(profileFile);
      if (!frontmatter) {
        issues.push({
          type: 'error',
          location: `characters/${item}/profile.md`,
          message: 'Invalid or missing YAML frontmatter',
        });
        continue;
      }

      if (!frontmatter.id || frontmatter.id !== item) {
        issues.push({
          type: 'error',
          location: `characters/${item}/profile.md`,
          message: `Character ID mismatch: frontmatter.id (${frontmatter.id}) should match folder name (${item})`,
        });
      }

      const validTypes = ['main', 'supporting', 'minor'];
      if (frontmatter.type && !validTypes.includes(frontmatter.type)) {
        issues.push({
          type: 'warning',
          location: `characters/${item}/profile.md`,
          message: `Invalid character type: ${frontmatter.type}. Expected one of: ${validTypes.join(', ')}`,
        });
      }
    }
  }

  return issues;
}

/**
 * Run the validate command.
 *
 * @param cmdOptions - Command options
 */
async function runValidateCommand(cmdOptions: WriterValidateCmdOptions): Promise<void> {
  const startTime = Date.now();
  const {
    verbose,
    strict,
    path: pathOption,
  } = cmdOptions;

  // Use CliContext
  const ctx = pathOption && pathOption !== '.'
    ? await CliContext.create({ path: pathOption })
    : await CliContext.require();

  const projectRoot = ctx.projectRoot;

  console.log('Validating book structure...\n');

  // Run validations
  const allIssues: ValidationIssue[] = [];

  const bookIssues = await validateBookFile(projectRoot);
  allIssues.push(...bookIssues);

  const manuscriptIssues = await validateManuscriptStructure(projectRoot, verbose ?? false);
  allIssues.push(...manuscriptIssues);

  const characterIssues = await validateCharacters(projectRoot);
  allIssues.push(...characterIssues);

  // Categorize issues
  const errors = allIssues.filter(issue => issue.type === 'error');
  const warnings = allIssues.filter(issue => issue.type === 'warning');

  // Output results
  if (errors.length > 0) {
    console.log('Errors:\n');
    errors.forEach(issue => {
      const lineInfo = issue.line ? `:${issue.line}` : '';
      console.log(`  ❌ ${issue.location}${lineInfo}`);
      console.log(`     ${issue.message}\n`);
    });
  }

  if (warnings.length > 0 && verbose) {
    console.log('Warnings:\n');
    warnings.forEach(issue => {
      const lineInfo = issue.line ? `:${issue.line}` : '';
      console.log(`  ⚠️  ${issue.location}${lineInfo}`);
      console.log(`     ${issue.message}\n`);
    });
  }

  // Summary
  console.log('Validation Summary:');
  console.log(`  Errors:   ${errors.length}`);
  console.log(`  Warnings: ${warnings.length}\n`);

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Book structure is valid!\n');
  } else if (errors.length === 0) {
    console.log('✅ No critical errors found\n');
  }

  // Record telemetry
  const durationMs = Date.now() - startTime;
  const success = errors.length === 0;
  recordCLICommand(
    'writer',
    'validate',
    { verbose, strict },
    { errors: errors.length, warnings: warnings.length },
    durationMs,
    success
  ).catch(() => {});

  // Exit with appropriate code
  if (errors.length > 0) {
    process.exit(1);
  }

  if (strict && warnings.length > 0) {
    process.exit(1);
  }
}
