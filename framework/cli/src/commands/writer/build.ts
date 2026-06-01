/**
 * Writer Build Command
 *
 * CLI command for building book projects with validation, context generation,
 * analysis, and export.
 *
 * Usage:
 *   agentic-framework writer build
 *   agentic-framework writer build --watch
 *   agentic-framework writer build --verbose
 *
 * @module commands/writer/build
 */

import { Command } from 'commander';
import { withCLITelemetry } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';

/**
 * Options for writer build command
 */
interface WriterBuildCmdOptions {
  /** Watch mode - rebuild on file changes */
  watch?: boolean;
  /** Verbose output */
  verbose?: boolean;
  /** Project root path */
  path?: string;
  /** Index signature for telemetry compatibility */
  [key: string]: unknown;
}

/**
 * Create the build command.
 *
 * @returns Commander command instance
 */
export function createBuildCommand(): Command {
  const command = new Command('build');

  command
    .description('Build book project: validate, generate context, analyze')
    .option('-w, --watch', 'Watch mode - rebuild on file changes', false)
    .option('-v, --verbose', 'Verbose output', false)
    .option('-p, --path <path>', 'Project root path', '.')
    .action(async (cmdOptions: WriterBuildCmdOptions) => {
      await withCLITelemetry(
        'writer',
        'build',
        cmdOptions,
        async () => {
          try {
            await runBuildCommand(cmdOptions);
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
 * Run the build command.
 *
 * @param cmdOptions - Command options
 */
async function runBuildCommand(cmdOptions: WriterBuildCmdOptions): Promise<void> {
  const startTime = Date.now();

  // Resolve project root
  const projectRoot = path.resolve(cmdOptions.path ?? '.');

  console.log('');
  console.log(chalk.bold('='.repeat(80)));
  console.log(chalk.bold('Writer Build System'));
  console.log(chalk.bold('='.repeat(80)));
  console.log('');
  console.log(chalk.dim(`Project Root: ${projectRoot}`));
  console.log('');

  // Verify this is a book project
  await verifyBookProject(projectRoot);

  // Ensure build directory exists
  const buildDir = path.join(projectRoot, 'build');
  await fs.ensureDir(buildDir);

  // Step 1: Validate structure
  console.log(chalk.bold('Step 1: Validating structure...'));
  const validationResult = await validateStructure(projectRoot, cmdOptions.verbose ?? false);
  if (validationResult.errors.length > 0) {
    console.log(chalk.red(`  ✗ ${validationResult.errors.length} errors found`));
    for (const err of validationResult.errors) {
      console.log(chalk.dim(`    - ${err}`));
    }
  } else {
    console.log(chalk.green('  ✓ Structure valid'));
  }
  console.log('');

  // Step 2: Generate context files
  console.log(chalk.bold('Step 2: Generating context files...'));
  const contextResult = await generateContext(projectRoot, cmdOptions.verbose ?? false);
  console.log(chalk.green(`  ✓ Generated ${contextResult.filesGenerated} context files`));
  console.log('');

  // Step 3: Run analysis
  console.log(chalk.bold('Step 3: Running analysis...'));
  const analysisResult = await runAnalysis(projectRoot, cmdOptions.verbose ?? false);
  console.log(chalk.green('  ✓ Analysis complete'));
  if (cmdOptions.verbose) {
    console.log(chalk.dim(`    Word count: ${analysisResult.wordCount.toLocaleString()}`));
    console.log(chalk.dim(`    Chapters: ${analysisResult.chapterCount}`));
    console.log(chalk.dim(`    Characters: ${analysisResult.characterCount}`));
  }
  console.log('');

  const duration = Date.now() - startTime;

  // Summary
  console.log(chalk.bold('Build Summary:'));
  console.log(chalk.dim(`  Duration:     ${duration}ms`));
  console.log(chalk.dim(`  Errors:       ${validationResult.errors.length}`));
  console.log(chalk.dim(`  Warnings:     ${validationResult.warnings.length}`));
  console.log(chalk.dim(`  Output:       ${buildDir}`));
  console.log('');

  if (validationResult.errors.length === 0) {
    console.log(chalk.green('✓ Build completed successfully\n'));
  } else {
    console.log(chalk.yellow('⚠ Build completed with errors\n'));
  }

  if (cmdOptions.watch) {
    console.log(chalk.dim('Watch mode is not yet fully implemented.\n'));
  }
}

/**
 * Verify this is a valid book project
 */
async function verifyBookProject(projectRoot: string): Promise<void> {
  const manuscriptDir = path.join(projectRoot, 'manuscript');

  if (!(await fs.pathExists(manuscriptDir))) {
    throw new Error(
      `Not a valid book project: missing manuscript directory. Run 'agentic-framework writer init' first.`
    );
  }
}

/**
 * Validate manuscript structure
 */
async function validateStructure(
  projectRoot: string,
  _verbose: boolean
): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const manuscriptPath = path.join(projectRoot, 'manuscript');

  // Check for BOOK.md
  const bookMd = path.join(manuscriptPath, 'BOOK.md');
  if (!(await fs.pathExists(bookMd))) {
    errors.push('Missing BOOK.md in manuscript directory');
  }

  // Find parts
  const items = await fs.readdir(manuscriptPath);
  const parts = items.filter((item) => item.startsWith('part-'));

  if (parts.length === 0) {
    warnings.push('No parts found in manuscript');
  }

  // Validate each part
  for (const part of parts) {
    const partPath = path.join(manuscriptPath, part);
    const stat = await fs.stat(partPath);
    if (!stat.isDirectory()) continue;

    const partMd = path.join(partPath, 'PART.md');
    if (!(await fs.pathExists(partMd))) {
      errors.push(`Missing PART.md in ${part}`);
    }

    // Find chapters
    const partItems = await fs.readdir(partPath);
    const chapters = partItems.filter((item) => item.startsWith('chapter-'));

    for (const chapter of chapters) {
      const chapterPath = path.join(partPath, chapter);
      const chapterStat = await fs.stat(chapterPath);
      if (!chapterStat.isDirectory()) continue;

      const chapterMd = path.join(chapterPath, 'CHAPTER.md');
      if (!(await fs.pathExists(chapterMd))) {
        errors.push(`Missing CHAPTER.md in ${part}/${chapter}`);
      }
    }
  }

  // Write validation report
  const validationDir = path.join(projectRoot, 'build', 'validation');
  await fs.ensureDir(validationDir);
  await fs.writeFile(
    path.join(validationDir, 'validation-report.json'),
    JSON.stringify({ errors, warnings, timestamp: new Date().toISOString() }, null, 2)
  );

  return { errors, warnings };
}

/**
 * Generate context files
 */
async function generateContext(
  projectRoot: string,
  _verbose: boolean
): Promise<{ filesGenerated: number }> {
  const contextDir = path.join(projectRoot, 'build', 'context');
  await fs.ensureDir(contextDir);

  let filesGenerated = 0;

  // Generate baseline summary
  const baselineSummary = `# Baseline Summary

Generated: ${new Date().toISOString()}

This file contains the generated context for the book baseline.
`;
  await fs.writeFile(path.join(contextDir, 'baseline-summary.md'), baselineSummary);
  filesGenerated++;

  return { filesGenerated };
}

/**
 * Run analysis
 */
async function runAnalysis(
  projectRoot: string,
  _verbose: boolean
): Promise<{ wordCount: number; chapterCount: number; characterCount: number }> {
  let wordCount = 0;
  let chapterCount = 0;
  let characterCount = 0;

  const manuscriptPath = path.join(projectRoot, 'manuscript');

  // Count words and chapters
  try {
    const parts = (await fs.readdir(manuscriptPath)).filter((p) => p.startsWith('part-'));

    for (const part of parts) {
      const partPath = path.join(manuscriptPath, part);
      const partStat = await fs.stat(partPath);
      if (!partStat.isDirectory()) continue;

      const chapters = (await fs.readdir(partPath)).filter((c) => c.startsWith('chapter-'));
      chapterCount += chapters.length;

      for (const chapter of chapters) {
        const chapterPath = path.join(partPath, chapter);
        const chapterStat = await fs.stat(chapterPath);
        if (!chapterStat.isDirectory()) continue;

        const scenes = (await fs.readdir(chapterPath)).filter((s) => s.startsWith('scene-'));

        for (const scene of scenes) {
          const scenePath = path.join(chapterPath, scene);
          const content = await fs.readFile(scenePath, 'utf-8');
          wordCount += content.split(/\s+/).filter(w => w.length > 0).length;
        }
      }
    }
  } catch (_err) {
    // Manuscript may not exist yet
  }

  // Count characters
  const charactersPath = path.join(projectRoot, 'characters');
  if (await fs.pathExists(charactersPath)) {
    const charFiles = await fs.readdir(charactersPath);
    characterCount = charFiles.filter((f) => f.endsWith('.md')).length;
  }

  // Write analysis results
  const analysisDir = path.join(projectRoot, 'build', 'analysis');
  await fs.ensureDir(analysisDir);

  const wordCountsJson = {
    total: wordCount,
    chapters: chapterCount,
    averagePerChapter: chapterCount > 0 ? Math.round(wordCount / chapterCount) : 0,
    timestamp: new Date().toISOString(),
  };
  await fs.writeFile(
    path.join(analysisDir, 'word-counts.json'),
    JSON.stringify(wordCountsJson, null, 2)
  );

  return { wordCount, chapterCount, characterCount };
}
