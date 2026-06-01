/**
 * Writer Init Command
 *
 * CLI command for initializing a new book project with folder structure.
 *
 * Usage:
 *   agentic-framework writer init --name my-book --title "My Fantasy Epic"
 *   agentic-framework writer init --name my-book --dry-run
 *
 * @module commands/writer/init
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { CliContext } from '../../lib/cli-context.js';
import { recordCLICommand } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';

/**
 * Command options for the writer init command.
 */
interface CommandOptions {
  name?: string;
  title?: string;
  dryRun: boolean;
  path: string;
}

/**
 * Create the init command.
 *
 * @returns Commander command instance
 */
export function createInitCommand(): Command {
  const command = new Command('init');

  command
    .description('Initialize a new book project with folder structure')
    .option('-n, --name <name>', 'Book project name in kebab-case (e.g., "my-fantasy-epic")')
    .option('-t, --title <title>', 'Book title (e.g., "My Fantasy Epic")')
    .option('--dry-run', 'Preview what would be created without creating files', false)
    .option('-p, --path <path>', 'Project root path', '.')
    .action(async (cmdOptions: CommandOptions) => {
      try {
        await runInitCommand(cmdOptions);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`\nError: ${errorMessage}\n`);
        process.exit(1);
      }
    });

  return command;
}

/**
 * Run the init command.
 *
 * @param cmdOptions - Command options
 */
async function runInitCommand(cmdOptions: CommandOptions): Promise<void> {
  const startTime = Date.now();
  const {
    name,
    title,
    dryRun,
    path: pathOption,
  } = cmdOptions;

  // Validate required options
  if (!name) {
    throw new Error('Book name is required. Use --name <name> to specify it.');
  }

  // Validate name format (kebab-case)
  const namePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!namePattern.test(name)) {
    throw new Error('Book name must be kebab-case: lowercase letters, numbers, and hyphens only (no leading/trailing hyphens)');
  }

  // Use CliContext for project detection
  const ctx = pathOption && pathOption !== '.'
    ? await CliContext.create({ path: pathOption })
    : await CliContext.require();

  const projectRoot = ctx.projectRoot;
  const bookTitle = title || name;
  const currentDate = new Date().toISOString().split('T')[0];

  // Define directory structure
  const dirs = [
    'manuscript',
    'characters',
    'world',
    'world/rules',
    'world/regions',
    'world/nations',
    'world/magic-systems',
    'world/history',
    'build',
    'build/context',
    'build/analysis',
  ];

  // Create BOOK.md content
  const bookContent = `---
title: "${bookTitle}"
author: ""
status: planning
created: ${currentDate}
word-count: 0
target-word-count: 100000

# Metadata
genre: fantasy
sub-genres: []
themes: []
target-audience: ""
pov-style: "third-person limited"
tense: "past"

# Structure
parts: []
estimated-chapters: 0
estimated-scenes: 0

# World
world-complexity: medium
magic-system: ""
tech-level: "medieval"

# Project Management
baseline-locked: false
version: "0.1.0"
---

# ${bookTitle}

## Synopsis

[Provide a brief synopsis of your book. What is the core story? Who is the protagonist?
What is the main conflict? This should be 2-4 paragraphs.]

## Premise

[What is the central premise or "what if" of your story? This is the core idea that
drives the narrative.]

## Target Audience

[Who is this book for? Age range, interests, comparable titles?]

## Themes

[What are the major themes you want to explore in this book?]

**Primary Themes:**
- [Theme 1]: [Brief explanation]
- [Theme 2]: [Brief explanation]

**Secondary Themes:**
- [Theme 3]: [Brief explanation]

## Story Structure

[How is the book structured? How many parts? What is the overall arc?]

## Writing Goals

[What do you want to achieve with this book?]

**Narrative Goals:**
- [Goal 1]
- [Goal 2]

**Personal Goals:**
- [What do you want to learn or accomplish as a writer?]

## Notes

[Any additional notes about the project, approach, or inspirations.]
`;

  // Create world.lock.json content
  const worldLockContent = {
    version: '1.0.0',
    locked: false,
    baseline: null,
    facts: {
      immutable: [],
      'append-only': [],
      expandable: [],
    },
    hashes: {},
    lastUpdated: currentDate,
  };

  // Dry run: show what would be created
  if (dryRun) {
    console.log('\nDRY RUN - No files created\n');
    console.log('Book Project Details:');
    console.log(`  Name:  ${name}`);
    console.log(`  Title: ${bookTitle}`);
    console.log(`  Root:  ${projectRoot}\n`);
    console.log('Would create directories:');
    dirs.forEach(dir => {
      console.log(`  ✓ ${dir}/`);
    });
    console.log('\nWould create files:');
    console.log(`  ✓ BOOK.md (${bookContent.length} bytes)`);
    console.log(`  ✓ world.lock.json (${JSON.stringify(worldLockContent, null, 2).length} bytes)`);
    console.log('\nNext steps:');
    console.log('  1. Remove --dry-run flag to create project');
    console.log('  2. Edit BOOK.md to define your book');
    console.log('  3. Create parts with: agentic-framework writer create-part');
    return;
  }

  // Create directories
  for (const dir of dirs) {
    const dirPath = path.join(projectRoot, dir);
    await fs.ensureDir(dirPath);
  }

  // Create BOOK.md
  const bookPath = path.join(projectRoot, 'BOOK.md');
  await fs.writeFile(bookPath, bookContent, 'utf-8');

  // Create world.lock.json
  const lockPath = path.join(projectRoot, 'world.lock.json');
  await fs.writeFile(lockPath, JSON.stringify(worldLockContent, null, 2), 'utf-8');

  // Create .gitkeep files for empty directories
  const gitkeepDirs = ['world/rules', 'world/regions', 'world/nations', 'world/magic-systems', 'world/history', 'build/context', 'build/analysis'];
  for (const dir of gitkeepDirs) {
    const gitkeepPath = path.join(projectRoot, dir, '.gitkeep');
    await fs.writeFile(gitkeepPath, '', 'utf-8');
  }

  // Record telemetry
  const durationMs = Date.now() - startTime;
  recordCLICommand(
    'writer',
    'init',
    { name, title: bookTitle, dryRun },
    { book_name: name, project_root: projectRoot },
    durationMs,
    true
  ).catch(() => {});

  // Output success
  console.log('\nBook project initialized successfully!\n');
  console.log(`Book Name:  ${name}`);
  console.log(`Book Title: ${bookTitle}\n`);
  console.log('Created directories:');
  dirs.forEach(dir => {
    console.log(`  📁 ${dir}/`);
  });
  console.log('\nCreated files:');
  console.log(`  📄 ${bookPath}`);
  console.log(`  📄 ${lockPath}\n`);
  console.log('Next steps:');
  console.log('  1. Edit BOOK.md to define your book details');
  console.log('  2. Create your first part: agentic-framework writer create-part --name prologue');
  console.log('  3. Initialize world baseline: agentic-framework writer init-baseline\n');
}
