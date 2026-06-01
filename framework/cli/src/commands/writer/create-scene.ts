/**
 * Writer Create Scene Command
 *
 * CLI command for creating scenes within chapters.
 *
 * Usage:
 *   agentic-framework writer create-scene --chapter 1.1 --name arrival --scene-type action
 *   agentic-framework writer create-scene --chapter 1.2 --name conversation --dry-run
 *
 * @module commands/writer/create-scene
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { CliContext } from '../../lib/cli-context.js';
import { recordCLICommand } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';

/**
 * Options for writer create-scene command
 */
interface WriterCreateSceneCmdOptions {
  /** Chapter in P.C format (e.g., "1.1" for part 1, chapter 1) */
  chapter?: string;
  /** Scene name in kebab-case */
  name?: string;
  /** Scene title (defaults to name) */
  title?: string;
  /** Scene type: action, dialogue, introspection, transition */
  sceneType: string;
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
 * Create the create-scene command.
 *
 * @returns Commander command instance
 */
export function createCreateSceneCommand(): Command {
  const command = new Command('create-scene');

  command
    .description('Create a new scene within a chapter')
    .option('--chapter <chapter>', 'Chapter in P.C format (e.g., "1.1" for part 1, chapter 1)')
    .option('-n, --name <name>', 'Scene name in kebab-case')
    .option('-t, --title <title>', 'Scene title (defaults to name)')
    .option('--scene-type <type>', 'Scene type: action, dialogue, introspection, transition', 'action')
    .option('--pov <character>', 'POV character (defaults to "protagonist")')
    .option('--dry-run', 'Preview what would be created without creating files', false)
    .option('-p, --path <path>', 'Project root path', '.')
    .action(async (cmdOptions: WriterCreateSceneCmdOptions) => {
      try {
        await runCreateSceneCommand(cmdOptions);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`\nError: ${errorMessage}\n`);
        process.exit(1);
      }
    });

  return command;
}

/**
 * Get next scene number within a chapter.
 *
 * @param chapterDir - Path to chapter directory
 * @returns Next available scene number
 */
async function getNextSceneNumber(chapterDir: string): Promise<number> {
  if (!(await fs.pathExists(chapterDir))) {
    throw new Error(`Chapter directory not found: ${chapterDir}`);
  }

  let maxNumber = 0;
  const scenePattern = /^scene-(\d{3})-.*\.md$/;

  const items = await fs.readdir(chapterDir);
  for (const item of items) {
    const match = scenePattern.exec(item);
    if (match) {
      const number = parseInt(match[1], 10);
      maxNumber = Math.max(maxNumber, number);
    }
  }

  return maxNumber + 1;
}

/**
 * Find chapter directory by P.C notation.
 *
 * @param manuscriptDir - Path to manuscript directory
 * @param chapterRef - Chapter reference in P.C format (e.g., "1.1")
 * @returns Path to chapter directory
 */
async function findChapterDirectory(manuscriptDir: string, chapterRef: string): Promise<string> {
  const parts = chapterRef.split('.');
  if (parts.length !== 2) {
    throw new Error('Chapter must be in P.C format (e.g., "1.1" for part 1, chapter 1)');
  }

  const partNumber = parts[0].padStart(3, '0');
  const chapterNumber = parts[1].padStart(3, '0');

  // Find part directory
  const partPattern = new RegExp(`^part-${partNumber}-`);
  const partItems = await fs.readdir(manuscriptDir);
  let partDir: string | null = null;

  for (const item of partItems) {
    if (partPattern.test(item)) {
      partDir = path.join(manuscriptDir, item);
      break;
    }
  }

  if (!partDir) {
    throw new Error(`Part ${partNumber} not found. Create it first with: agentic-framework writer create-part`);
  }

  // Find chapter directory
  const chapterPattern = new RegExp(`^chapter-${chapterNumber}-`);
  const chapterItems = await fs.readdir(partDir);
  for (const item of chapterItems) {
    if (chapterPattern.test(item)) {
      return path.join(partDir, item);
    }
  }

  throw new Error(`Chapter ${chapterNumber} not found in part ${partNumber}. Create it first with: agentic-framework writer create-chapter`);
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
 * Run the create-scene command.
 *
 * @param cmdOptions - Command options
 */
async function runCreateSceneCommand(cmdOptions: WriterCreateSceneCmdOptions): Promise<void> {
  const startTime = Date.now();
  const {
    chapter,
    name,
    title,
    sceneType = 'action',
    pov = 'protagonist',
    dryRun,
    path: pathOption,
  } = cmdOptions;

  // Validate required options
  if (!chapter) {
    throw new Error('Chapter is required. Use --chapter <P.C> (e.g., "1.1") to specify it.');
  }

  if (!name) {
    throw new Error('Scene name is required. Use --name <name> to specify it.');
  }

  // Validate name format
  const namePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!namePattern.test(name)) {
    throw new Error('Scene name must be kebab-case: lowercase letters, numbers, and hyphens only');
  }

  if (name.length < 3 || name.length > 40) {
    throw new Error('Scene name must be 3-40 characters long');
  }

  // Validate scene type
  const validSceneTypes = ['action', 'dialogue', 'introspection', 'transition'];
  if (!validSceneTypes.includes(sceneType)) {
    throw new Error(`Scene type must be one of: ${validSceneTypes.join(', ')}`);
  }

  // Use CliContext
  const ctx = pathOption && pathOption !== '.'
    ? await CliContext.create({ path: pathOption })
    : await CliContext.require();

  const projectRoot = ctx.projectRoot;
  const manuscriptDir = path.join(projectRoot, 'manuscript');

  // Find chapter directory
  const chapterDir = await findChapterDirectory(manuscriptDir, chapter);

  // Get next scene number
  const sceneNumber = await getNextSceneNumber(chapterDir);
  const sceneNumberStr = sceneNumber.toString().padStart(3, '0');
  const fileName = `scene-${sceneNumberStr}-${name}.md`;
  const sceneFile = path.join(chapterDir, fileName);

  // Check if file exists
  if (await fs.pathExists(sceneFile)) {
    throw new Error(`Scene file already exists: ${sceneFile}`);
  }

  const sceneTitle = title || name;
  const currentDate = new Date().toISOString().split('T')[0];

  // Load template
  const templatePath = path.join(
    ctx.projectRoot,
    'framework/modules/writer/skills/writer/organizing-books/templates/scene.template.md'
  );

  let templateContent: string;
  if (await fs.pathExists(templatePath)) {
    templateContent = await fs.readFile(templatePath, 'utf-8');
  } else {
    // Fallback inline template
    templateContent = `---
scene-number: {{number}}
title: "{{title}}"
status: draft
word-count: 0
created: {{date}}
pov-character: {{pov}}
scene-type: {{sceneType}}
prerequisites:
  prior-scene: null
  immediate:
    time: ""
    location: ""
    weather: ""
    lighting: ""
  characters-present:
    - id: {{pov}}
      state: ""
  sensory:
    dominant: ""
    secondary: ""
    ambient: ""
  mood: ""
  tension-level: medium
  pov-state:
    current-thought: ""
    current-fear: ""
    physical-sensation: ""
  relevant-world-facts: []
  token-budget:
    max-context: 1500
establishes:
  - [What beat or event does this scene establish?]
---

# Scene {{number}}: {{title}}

[Write your scene prose here. Remember to:
- Maintain POV character's voice and perspective
- Use sensory details matching the prerequisites
- Show character emotions through action and thought
- Advance the plot or develop character
- End with a hook or transition to the next scene]

## Writing Checklist

Before marking this scene as complete, ensure:
- [ ] POV voice is consistent
- [ ] Sensory details reflect prerequisites (dominant, secondary, ambient)
- [ ] Scene type matches content ({{sceneType}})
- [ ] Characters present are all accounted for
- [ ] Mood and tension level are conveyed
- [ ] POV state (thought, fear, sensation) is shown
- [ ] Scene establishes the beats listed in frontmatter
- [ ] Scene word count is updated
- [ ] Transitions smoothly from prior scene (if applicable)

## Scene Notes

[Optional: Add notes about this scene for future reference or revision.]
`;
  }

  // Render template
  const vars = {
    number: sceneNumberStr,
    title: sceneTitle,
    name: name,
    pov: pov,
    sceneType: sceneType,
    date: currentDate,
    chapterPath: chapterDir,
  };

  const sceneContent = renderTemplate(templateContent, vars);

  // Dry run
  if (dryRun) {
    console.log('\nDRY RUN - No files created\n');
    console.log('Scene Details:');
    console.log(`  Number:     ${sceneNumberStr}`);
    console.log(`  Name:       ${name}`);
    console.log(`  Title:      ${sceneTitle}`);
    console.log(`  Scene Type: ${sceneType}`);
    console.log(`  POV:        ${pov}`);
    console.log(`  Chapter:    ${path.basename(chapterDir)}`);
    console.log(`  File:       ${sceneFile}\n`);
    console.log('Would create:');
    console.log(`  ✓ ${sceneFile} (${sceneContent.length} bytes)\n`);
    console.log('Next steps:');
    console.log('  1. Remove --dry-run flag to create scene');
    console.log('  2. Edit scene file to write the prose');
    console.log('  3. Fill in prerequisites (location, mood, sensory details)');
    return;
  }

  // Create scene file
  await fs.writeFile(sceneFile, sceneContent, 'utf-8');

  // Record telemetry
  const durationMs = Date.now() - startTime;
  recordCLICommand(
    'writer',
    'create-scene',
    { chapter, name, title: sceneTitle, sceneType, pov, dryRun },
    { scene_number: sceneNumberStr, path: sceneFile },
    durationMs,
    true
  ).catch(() => {});

  // Output success
  console.log('\nScene created successfully!\n');
  console.log(`Scene Number:  ${sceneNumberStr}`);
  console.log(`Scene Name:    ${name}`);
  console.log(`Scene Title:   ${sceneTitle}`);
  console.log(`Scene Type:    ${sceneType}`);
  console.log(`POV Character: ${pov}`);
  console.log(`Chapter:       ${path.basename(chapterDir)}\n`);
  console.log('Created:');
  console.log(`  📄 ${sceneFile}\n`);
  console.log('Next steps:');
  console.log('  1. Edit the scene file to write the prose');
  console.log('  2. Fill in scene prerequisites (location, mood, sensory details)');
  console.log('  3. Update word count when complete\n');
}
