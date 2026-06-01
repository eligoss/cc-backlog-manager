/**
 * Writer Create Part Command
 *
 * CLI command for creating new parts (story arcs) with auto-numbering.
 *
 * Usage:
 *   agentic-framework writer create-part --name rising-action --title "Rising Action"
 *   agentic-framework writer create-part --name climax --dry-run
 *
 * @module commands/writer/create-part
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { CliContext } from '../../lib/cli-context.js';
import { recordCLICommand } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';

/**
 * Options for writer create-part command
 */
interface WriterCreatePartCmdOptions {
  /** Part name in kebab-case */
  name?: string;
  /** Part title (defaults to name) */
  title?: string;
  /** Preview what would be created without creating files */
  dryRun: boolean;
  /** Project root path */
  path: string;
  /** Index signature for telemetry compatibility */
  [key: string]: unknown;
}

/**
 * Create the create-part command.
 *
 * @returns Commander command instance
 */
export function createCreatePartCommand(): Command {
  const command = new Command('create-part');

  command
    .description('Create a new part (story arc) with auto-numbering')
    .option('-n, --name <name>', 'Part name in kebab-case (e.g., "rising-action")')
    .option('-t, --title <title>', 'Part title (defaults to name)')
    .option('--dry-run', 'Preview what would be created without creating files', false)
    .option('-p, --path <path>', 'Project root path', '.')
    .action(async (cmdOptions: WriterCreatePartCmdOptions) => {
      try {
        await runCreatePartCommand(cmdOptions);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`\nError: ${errorMessage}\n`);
        process.exit(1);
      }
    });

  return command;
}

/**
 * Get next part number by scanning manuscript directory.
 *
 * @param manuscriptDir - Path to manuscript directory
 * @returns Next available part number
 */
async function getNextPartNumber(manuscriptDir: string): Promise<number> {
  if (!(await fs.pathExists(manuscriptDir))) {
    return 1;
  }

  let maxNumber = 0;
  const partPattern = /^part-(\d{3})-/;

  const items = await fs.readdir(manuscriptDir);
  for (const item of items) {
    const itemPath = path.join(manuscriptDir, item);
    const stat = await fs.stat(itemPath);

    if (stat.isDirectory()) {
      const match = partPattern.exec(item);
      if (match) {
        const number = parseInt(match[1], 10);
        maxNumber = Math.max(maxNumber, number);
      }
    }
  }

  return maxNumber + 1;
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
 * Run the create-part command.
 *
 * @param cmdOptions - Command options
 */
async function runCreatePartCommand(cmdOptions: WriterCreatePartCmdOptions): Promise<void> {
  const startTime = Date.now();
  const {
    name,
    title,
    dryRun,
    path: pathOption,
  } = cmdOptions;

  // Validate required options
  if (!name) {
    throw new Error('Part name is required. Use --name <name> to specify it.');
  }

  // Validate name format
  const namePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!namePattern.test(name)) {
    throw new Error('Part name must be kebab-case: lowercase letters, numbers, and hyphens only');
  }

  if (name.length < 3 || name.length > 40) {
    throw new Error('Part name must be 3-40 characters long');
  }

  // Use CliContext
  const ctx = pathOption && pathOption !== '.'
    ? await CliContext.create({ path: pathOption })
    : await CliContext.require();

  const projectRoot = ctx.projectRoot;
  const manuscriptDir = path.join(projectRoot, 'manuscript');

  // Ensure manuscript directory exists
  if (!(await fs.pathExists(manuscriptDir))) {
    throw new Error('Manuscript directory not found. Run "agentic-framework writer init" first.');
  }

  // Get next part number
  const partNumber = await getNextPartNumber(manuscriptDir);
  const partNumberStr = partNumber.toString().padStart(3, '0');
  const folderName = `part-${partNumberStr}-${name}`;
  const partFolder = path.join(manuscriptDir, folderName);

  // Check if folder exists
  if (await fs.pathExists(partFolder)) {
    throw new Error(`Part folder already exists: ${partFolder}`);
  }

  const partTitle = title || name;
  const currentDate = new Date().toISOString().split('T')[0];

  // Load template
  const templatePath = path.join(
    ctx.projectRoot,
    'framework/modules/writer/skills/writer/organizing-books/templates/part.template.md'
  );

  let templateContent: string;
  if (await fs.pathExists(templatePath)) {
    templateContent = await fs.readFile(templatePath, 'utf-8');
  } else {
    // Fallback to inline template if file not found
    templateContent = `---
part-number: {{number}}
title: "{{title}}"
status: draft
word-count: 0
created: {{date}}
summary: |
  [Describe the main narrative arc of this part.]
bullet-points:
  - [First key event]
  - [Second key event]
  - [Third key event]
prerequisites:
  requires-parts: []
  world-state:
    time-elapsed: ""
    location-shift: ""
    political-state: ""
establishes:
  - [What plot point does this part establish?]
  - [What character development occurs?]
---

# Part {{number}}: {{title}}

## Arc Overview

[Provide a detailed overview of this story arc. Explain the main narrative thread,
the protagonist's journey during this part, and how it fits into the overall book
structure. This should be 2-4 paragraphs.]

## Chapters in This Part

[This section will list chapters as they are created.]

## Thematic Elements

[What are the key themes explored in this part?]

**Key Themes:**
- [Theme 1]: [Brief explanation]
- [Theme 2]: [Brief explanation]

## Narrative Goals

[What should be accomplished by the end of this part?]

**Plot Goals:**
- [Goal 1]
- [Goal 2]

**Character Goals:**
- [What development should the protagonist achieve?]
- [What relationships should evolve?]

**World Goals:**
- [What about the world should be revealed or changed?]

## Notes

[Any additional notes for writing this part.]
`;
  }

  // Render template
  const vars = {
    number: partNumberStr,
    title: partTitle,
    name: name,
    date: currentDate,
  };

  const partContent = renderTemplate(templateContent, vars);

  // Dry run
  if (dryRun) {
    console.log('\nDRY RUN - No files created\n');
    console.log('Part Details:');
    console.log(`  Number: ${partNumberStr}`);
    console.log(`  Name:   ${name}`);
    console.log(`  Title:  ${partTitle}`);
    console.log(`  Folder: ${partFolder}\n`);
    console.log('Would create:');
    console.log(`  ✓ ${partFolder}/`);
    console.log(`  ✓ ${partFolder}/PART.md (${partContent.length} bytes)\n`);
    console.log('Next steps:');
    console.log('  1. Remove --dry-run flag to create part');
    console.log('  2. Edit PART.md to define the story arc');
    console.log('  3. Create chapters with: agentic-framework writer create-chapter');
    return;
  }

  // Create part folder and file
  await fs.ensureDir(partFolder);
  const partFile = path.join(partFolder, 'PART.md');
  await fs.writeFile(partFile, partContent, 'utf-8');

  // Record telemetry
  const durationMs = Date.now() - startTime;
  recordCLICommand(
    'writer',
    'create-part',
    { name, title: partTitle, dryRun },
    { part_number: partNumberStr, path: partFolder },
    durationMs,
    true
  ).catch(() => {});

  // Output success
  console.log('\nPart created successfully!\n');
  console.log(`Part Number: ${partNumberStr}`);
  console.log(`Part Name:   ${name}`);
  console.log(`Part Title:  ${partTitle}\n`);
  console.log('Created:');
  console.log(`  📁 ${partFolder}`);
  console.log(`  📄 ${partFile}\n`);
  console.log('Next steps:');
  console.log('  1. Edit PART.md to define the story arc and narrative goals');
  console.log(`  2. Create first chapter: agentic-framework writer create-chapter --part ${partNumberStr} --name opening\n`);
}
