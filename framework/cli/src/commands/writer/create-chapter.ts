/**
 * Writer Create Chapter Command
 *
 * CLI command for creating chapters within parts.
 *
 * Usage:
 *   agentic-framework writer create-chapter --part 001 --name opening --title "The Beginning"
 *   agentic-framework writer create-chapter --part 001 --name confrontation --dry-run
 *
 * @module commands/writer/create-chapter
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { CliContext } from '../../lib/cli-context.js';
import { recordCLICommand } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';

/**
 * Options for writer create-chapter command
 */
interface WriterCreateChapterCmdOptions {
  /** Part number (e.g., "001" or "1") */
  part?: string;
  /** Chapter name in kebab-case */
  name?: string;
  /** Chapter title (defaults to name) */
  title?: string;
  /** POV character */
  pov: string;
  /** Preview what would be created without creating files */
  dryRun: boolean;
  /** Project root path */
  path: string;
  /** Index signature for telemetry compatibility */
  [key: string]: unknown;
}

/**
 * Create the create-chapter command.
 *
 * @returns Commander command instance
 */
export function createCreateChapterCommand(): Command {
  const command = new Command('create-chapter');

  command
    .description('Create a new chapter within a part')
    .option('--part <part>', 'Part number (e.g., "001" or "1")')
    .option('-n, --name <name>', 'Chapter name in kebab-case')
    .option('-t, --title <title>', 'Chapter title (defaults to name)')
    .option('--pov <character>', 'POV character (defaults to "protagonist")')
    .option('--dry-run', 'Preview what would be created without creating files', false)
    .option('-p, --path <path>', 'Project root path', '.')
    .action(async (cmdOptions: WriterCreateChapterCmdOptions) => {
      try {
        await runCreateChapterCommand(cmdOptions);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`\nError: ${errorMessage}\n`);
        process.exit(1);
      }
    });

  return command;
}

/**
 * Get next chapter number within a part.
 *
 * @param partDir - Path to part directory
 * @returns Next available chapter number
 */
async function getNextChapterNumber(partDir: string): Promise<number> {
  if (!(await fs.pathExists(partDir))) {
    throw new Error(`Part directory not found: ${partDir}`);
  }

  let maxNumber = 0;
  const chapterPattern = /^chapter-(\d{3})-/;

  const items = await fs.readdir(partDir);
  for (const item of items) {
    const itemPath = path.join(partDir, item);
    const stat = await fs.stat(itemPath);

    if (stat.isDirectory()) {
      const match = chapterPattern.exec(item);
      if (match) {
        const number = parseInt(match[1], 10);
        maxNumber = Math.max(maxNumber, number);
      }
    }
  }

  return maxNumber + 1;
}

/**
 * Find part directory by number.
 *
 * @param manuscriptDir - Path to manuscript directory
 * @param partNumber - Part number (with or without leading zeros)
 * @returns Path to part directory
 */
async function findPartDirectory(manuscriptDir: string, partNumber: string): Promise<string> {
  const paddedNumber = partNumber.padStart(3, '0');
  const partPattern = new RegExp(`^part-${paddedNumber}-`);

  const items = await fs.readdir(manuscriptDir);
  for (const item of items) {
    if (partPattern.test(item)) {
      return path.join(manuscriptDir, item);
    }
  }

  throw new Error(`Part ${paddedNumber} not found. Create it first with: agentic-framework writer create-part`);
}

/**
 * Render template with variable substitution.
 *
 * @param content - Template content
 * @param vars - Template variables
 * @returns Rendered content
 */
function renderTemplate(content: string, vars: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

/**
 * Run the create-chapter command.
 *
 * @param cmdOptions - Command options
 */
async function runCreateChapterCommand(cmdOptions: WriterCreateChapterCmdOptions): Promise<void> {
  const startTime = Date.now();
  const {
    part,
    name,
    title,
    pov = 'protagonist',
    dryRun,
    path: pathOption,
  } = cmdOptions;

  // Validate required options
  if (!part) {
    throw new Error('Part number is required. Use --part <number> to specify it.');
  }

  if (!name) {
    throw new Error('Chapter name is required. Use --name <name> to specify it.');
  }

  // Validate name format
  const namePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!namePattern.test(name)) {
    throw new Error('Chapter name must be kebab-case: lowercase letters, numbers, and hyphens only');
  }

  if (name.length < 3 || name.length > 40) {
    throw new Error('Chapter name must be 3-40 characters long');
  }

  // Use CliContext
  const ctx = pathOption && pathOption !== '.'
    ? await CliContext.create({ path: pathOption })
    : await CliContext.require();

  const projectRoot = ctx.projectRoot;
  const manuscriptDir = path.join(projectRoot, 'manuscript');

  // Find part directory
  const partDir = await findPartDirectory(manuscriptDir, part);

  // Get next chapter number
  const chapterNumber = await getNextChapterNumber(partDir);
  const chapterNumberStr = chapterNumber.toString().padStart(3, '0');
  const folderName = `chapter-${chapterNumberStr}-${name}`;
  const chapterFolder = path.join(partDir, folderName);

  // Check if folder exists
  if (await fs.pathExists(chapterFolder)) {
    throw new Error(`Chapter folder already exists: ${chapterFolder}`);
  }

  const chapterTitle = title || name;
  const currentDate = new Date().toISOString().split('T')[0];

  // Load template
  const templatePath = path.join(
    ctx.projectRoot,
    'framework/modules/writer/skills/writer/organizing-books/templates/chapter.template.md'
  );

  let templateContent: string;
  if (await fs.pathExists(templatePath)) {
    templateContent = await fs.readFile(templatePath, 'utf-8');
  } else {
    // Fallback inline template
    templateContent = `---
chapter-number: {{number}}
title: "{{title}}"
status: draft
word-count: 0
created: {{date}}
pov-character: {{pov}}
prerequisites:
  requires-chapters: []
  character-states:
    {{pov}}:
      location: ""
      emotional: ""
      knowledge: ""
      physical: ""
active-tensions:
  - [What question or tension drives this chapter?]
  - [What conflict or challenge exists?]
establishes:
  - [What does this chapter set up for later?]
  - [What plot point or character development occurs?]
---

# Chapter {{number}}: {{title}}

## Chapter Summary

[Provide a 2-3 sentence summary of what happens in this chapter.]

## Scenes

[Scenes will be created here using: agentic-framework writer create-scene]

## Chapter Goals

**Narrative Goals:**
- [What plot advancement occurs?]
- [What information is revealed?]

**Character Goals:**
- [What does the POV character learn or experience?]
- [How do relationships change?]

**Pacing Goals:**
- [Is this chapter fast-paced action or slower character development?]
- [Where are the beats and how are they spaced?]

## Notes

[Notes for writing this chapter. Consider:
- POV character's voice and perspective
- Mood and tone
- Foreshadowing elements
- Callbacks to earlier chapters
- Setup for future chapters]
`;
  }

  // Render template
  const vars = {
    number: chapterNumberStr,
    title: chapterTitle,
    name: name,
    pov: pov,
    date: currentDate,
    partPath: partDir,
  };

  const chapterContent = renderTemplate(templateContent, vars);

  // Dry run
  if (dryRun) {
    console.log('\nDRY RUN - No files created\n');
    console.log('Chapter Details:');
    console.log(`  Number:  ${chapterNumberStr}`);
    console.log(`  Name:    ${name}`);
    console.log(`  Title:   ${chapterTitle}`);
    console.log(`  POV:     ${pov}`);
    console.log(`  Part:    ${path.basename(partDir)}`);
    console.log(`  Folder:  ${chapterFolder}\n`);
    console.log('Would create:');
    console.log(`  ✓ ${chapterFolder}/`);
    console.log(`  ✓ ${chapterFolder}/CHAPTER.md (${chapterContent.length} bytes)\n`);
    console.log('Next steps:');
    console.log('  1. Remove --dry-run flag to create chapter');
    console.log('  2. Edit CHAPTER.md to define chapter goals');
    console.log('  3. Create scenes with: agentic-framework writer create-scene');
    return;
  }

  // Create chapter folder and file
  await fs.ensureDir(chapterFolder);
  const chapterFile = path.join(chapterFolder, 'CHAPTER.md');
  await fs.writeFile(chapterFile, chapterContent, 'utf-8');

  // Record telemetry
  const durationMs = Date.now() - startTime;
  recordCLICommand(
    'writer',
    'create-chapter',
    { part, name, title: chapterTitle, pov, dryRun },
    { chapter_number: chapterNumberStr, path: chapterFolder },
    durationMs,
    true
  ).catch(() => {});

  // Output success
  console.log('\nChapter created successfully!\n');
  console.log(`Chapter Number: ${chapterNumberStr}`);
  console.log(`Chapter Name:   ${name}`);
  console.log(`Chapter Title:  ${chapterTitle}`);
  console.log(`POV Character:  ${pov}`);
  console.log(`Part:           ${path.basename(partDir)}\n`);
  console.log('Created:');
  console.log(`  📁 ${chapterFolder}`);
  console.log(`  📄 ${chapterFile}\n`);
  console.log('Next steps:');
  console.log('  1. Edit CHAPTER.md to define chapter goals and tensions');
  console.log(`  2. Create first scene: agentic-framework writer create-scene --chapter ${part}.${chapterNumber} --name arrival\n`);
}
