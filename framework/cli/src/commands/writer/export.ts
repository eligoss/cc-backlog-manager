/**
 * Writer Export Command
 *
 * CLI command for exporting book manuscripts to various formats.
 *
 * Usage:
 *   agentic-framework writer export
 *   agentic-framework writer export --format md
 *   agentic-framework writer export --format html
 *   agentic-framework writer export --verbose
 *
 * @module commands/writer/export
 */

import { Command } from 'commander';
import { withCLITelemetry } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';

/**
 * Options for writer export command
 */
interface WriterExportCmdOptions {
  /** Output format: md, html, or both (comma-separated) */
  format: string;
  /** Output directory */
  output: string;
  /** Verbose output */
  verbose: boolean;
  /** Project root path */
  path: string;
  /** Index signature for telemetry compatibility */
  [key: string]: unknown;
}

/**
 * Create the export command.
 *
 * @returns Commander command instance
 */
export function createExportCommand(): Command {
  const command = new Command('export');

  command
    .description('Export manuscript to markdown or HTML')
    .option(
      '-f, --format <format>',
      'Output format: md, html, or both (comma-separated)',
      'md,html'
    )
    .option('-o, --output <path>', 'Output directory', 'build/export')
    .option('-v, --verbose', 'Verbose output', false)
    .option('-p, --path <path>', 'Project root path', '.')
    .action(async (cmdOptions: WriterExportCmdOptions) => {
      await withCLITelemetry(
        'writer',
        'export',
        cmdOptions,
        async () => {
          try {
            await runExportCommand(cmdOptions);
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
 * Run the export command.
 *
 * @param cmdOptions - Command options
 */
async function runExportCommand(cmdOptions: WriterExportCmdOptions): Promise<void> {
  const startTime = Date.now();

  // Parse formats
  const formats = cmdOptions.format
    .split(',')
    .map((f: string) => f.trim().toLowerCase());

  // Validate formats
  for (const format of formats) {
    if (!['md', 'html'].includes(format)) {
      throw new Error(`Invalid format: ${format}. Supported formats: md, html`);
    }
  }

  // Resolve project root
  const projectRoot = path.resolve(cmdOptions.path);

  console.log('');
  console.log(chalk.bold('='.repeat(80)));
  console.log(chalk.bold('Writer Export'));
  console.log(chalk.bold('='.repeat(80)));
  console.log('');
  console.log(chalk.dim(`Project Root: ${projectRoot}`));
  console.log(chalk.dim(`Formats: ${formats.join(', ')}`));
  console.log('');

  // Verify this is a book project
  await verifyBookProject(projectRoot);

  // Ensure export directory exists
  const exportDir = path.join(projectRoot, cmdOptions.output);
  await fs.ensureDir(exportDir);

  // Collect manuscript content
  console.log(chalk.bold('Collecting manuscript...\n'));
  const manuscript = await collectManuscript(projectRoot, cmdOptions.verbose);

  const exportedFiles: string[] = [];

  // Export to markdown
  if (formats.includes('md')) {
    console.log(chalk.dim('  Exporting to markdown...'));
    const mdPath = path.join(exportDir, 'manuscript.md');
    await fs.writeFile(mdPath, manuscript);
    exportedFiles.push(mdPath);
    const stats = await fs.stat(mdPath);
    console.log(chalk.green(`  ✓ manuscript.md (${(stats.size / 1024).toFixed(2)} KB)`));
  }

  // Export to HTML
  if (formats.includes('html')) {
    console.log(chalk.dim('  Exporting to HTML...'));
    const htmlPath = path.join(exportDir, 'manuscript.html');
    const html = convertToHtml(manuscript);
    await fs.writeFile(htmlPath, html);
    exportedFiles.push(htmlPath);
    const stats = await fs.stat(htmlPath);
    console.log(chalk.green(`  ✓ manuscript.html (${(stats.size / 1024).toFixed(2)} KB)`));
  }

  const duration = Date.now() - startTime;

  console.log('');
  console.log(chalk.bold('Export Summary:'));
  console.log(chalk.dim(`  Duration:     ${duration}ms`));
  console.log(chalk.dim(`  Files:        ${exportedFiles.length}`));
  console.log(chalk.dim(`  Output:       ${exportDir}`));
  console.log('');

  // Word count
  const words = manuscript.split(/\s+/).filter((w) => w.length > 0).length;
  console.log(chalk.dim(`  Word count:   ${words.toLocaleString()}`));
  console.log('');

  console.log(chalk.green('✓ Export completed successfully\n'));
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
 * Collect manuscript content in order
 */
async function collectManuscript(projectRoot: string, _verbose: boolean): Promise<string> {
  const parts: string[] = [];

  const manuscriptPath = path.join(projectRoot, 'manuscript');

  // Read book metadata
  const bookMd = path.join(manuscriptPath, 'BOOK.md');
  if (await fs.pathExists(bookMd)) {
    const content = await fs.readFile(bookMd, 'utf-8');
    parts.push(content);
    parts.push('\n\n---\n\n');
  }

  // Read parts in order
  const partDirs = (await fs.readdir(manuscriptPath))
    .filter((p) => p.startsWith('part-'))
    .sort();

  for (const partDir of partDirs) {
    const partPath = path.join(manuscriptPath, partDir);
    const partStat = await fs.stat(partPath);
    if (!partStat.isDirectory()) continue;

    // Part header
    const partMd = path.join(partPath, 'PART.md');
    if (await fs.pathExists(partMd)) {
      const content = await fs.readFile(partMd, 'utf-8');
      parts.push(content);
      parts.push('\n\n');
    }

    // Chapters in order
    const chapterDirs = (await fs.readdir(partPath))
      .filter((c) => c.startsWith('chapter-'))
      .sort();

    for (const chapterDir of chapterDirs) {
      const chapterPath = path.join(partPath, chapterDir);
      const chapterStat = await fs.stat(chapterPath);
      if (!chapterStat.isDirectory()) continue;

      // Chapter header
      const chapterMd = path.join(chapterPath, 'CHAPTER.md');
      if (await fs.pathExists(chapterMd)) {
        const content = await fs.readFile(chapterMd, 'utf-8');
        parts.push(content);
        parts.push('\n\n');
      }

      // Scenes in order
      const scenes = (await fs.readdir(chapterPath))
        .filter((s) => s.startsWith('scene-'))
        .sort();

      for (const scene of scenes) {
        const scenePath = path.join(chapterPath, scene);
        const content = await fs.readFile(scenePath, 'utf-8');
        parts.push(content);
        parts.push('\n\n');
      }
    }

    parts.push('---\n\n');
  }

  return parts.join('');
}

/**
 * Convert markdown to HTML
 */
function convertToHtml(markdown: string): string {
  // Simple conversion - replace markdown with HTML
  let html = markdown;

  // Escape HTML
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');

  // Wrap in HTML document
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Manuscript</title>
  <style>
    body {
      font-family: Georgia, 'Times New Roman', serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
      line-height: 1.6;
      color: #333;
    }
    h1, h2, h3 { margin-top: 2em; }
    hr { margin: 3em 0; border: none; border-top: 1px solid #ccc; }
    p { text-align: justify; text-indent: 2em; }
    p:first-of-type { text-indent: 0; }
  </style>
</head>
<body>
<p>${html}</p>
</body>
</html>`;
}
