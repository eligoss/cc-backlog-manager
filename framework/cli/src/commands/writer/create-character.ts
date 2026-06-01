/**
 * Writer Create Character Command
 *
 * CLI command for creating character profiles.
 *
 * Usage:
 *   agentic-framework writer create-character --name elara --display-name "Elara Moonwhisper" --type main
 *   agentic-framework writer create-character --name theron --role antagonist --dry-run
 *
 * @module commands/writer/create-character
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { CliContext } from '../../lib/cli-context.js';
import { recordCLICommand } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';

/**
 * Options for writer create-character command
 */
interface WriterCreateCharacterCmdOptions {
  /** Character ID in kebab-case */
  name?: string;
  /** Character display name (defaults to name) */
  displayName?: string;
  /** Character type: main, supporting, minor */
  type: string;
  /** Character role */
  role: string;
  /** Preview what would be created without creating files */
  dryRun: boolean;
  /** Project root path */
  path: string;
  /** Index signature for telemetry compatibility */
  [key: string]: unknown;
}

/**
 * Create the create-character command.
 *
 * @returns Commander command instance
 */
export function createCreateCharacterCommand(): Command {
  const command = new Command('create-character');

  command
    .description('Create a new character profile')
    .option('-n, --name <name>', 'Character ID in kebab-case (e.g., "elara-moonwhisper")')
    .option('-d, --display-name <displayName>', 'Character display name (defaults to name)')
    .option('-t, --type <type>', 'Character type: main, supporting, minor', 'supporting')
    .option('-r, --role <role>', 'Character role (e.g., "ally", "antagonist", "mentor")', 'ally')
    .option('--dry-run', 'Preview what would be created without creating files', false)
    .option('-p, --path <path>', 'Project root path', '.')
    .action(async (cmdOptions: WriterCreateCharacterCmdOptions) => {
      try {
        await runCreateCharacterCommand(cmdOptions);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`\nError: ${errorMessage}\n`);
        process.exit(1);
      }
    });

  return command;
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
 * Run the create-character command.
 *
 * @param cmdOptions - Command options
 */
async function runCreateCharacterCommand(cmdOptions: WriterCreateCharacterCmdOptions): Promise<void> {
  const startTime = Date.now();
  const {
    name,
    displayName,
    type = 'supporting',
    role = 'ally',
    dryRun,
    path: pathOption,
  } = cmdOptions;

  // Validate required options
  if (!name) {
    throw new Error('Character name is required. Use --name <name> to specify it.');
  }

  // Validate name format
  const namePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!namePattern.test(name)) {
    throw new Error('Character name must be kebab-case: lowercase letters, numbers, and hyphens only');
  }

  if (name.length < 2 || name.length > 30) {
    throw new Error('Character name must be 2-30 characters long');
  }

  // Validate type
  const validTypes = ['main', 'supporting', 'minor'];
  if (!validTypes.includes(type)) {
    throw new Error(`Character type must be one of: ${validTypes.join(', ')}`);
  }

  // Use CliContext
  const ctx = pathOption && pathOption !== '.'
    ? await CliContext.create({ path: pathOption })
    : await CliContext.require();

  const projectRoot = ctx.projectRoot;
  const charactersDir = path.join(projectRoot, 'characters');

  // Ensure characters directory exists
  if (!(await fs.pathExists(charactersDir))) {
    throw new Error('Characters directory not found. Run "agentic-framework writer init" first.');
  }

  const characterFolder = path.join(charactersDir, name);

  // Check if character exists
  if (await fs.pathExists(characterFolder)) {
    throw new Error(`Character already exists: ${characterFolder}`);
  }

  const characterDisplayName = displayName || name;
  const currentDate = new Date().toISOString().split('T')[0];

  // Load template
  const templatePath = path.join(
    ctx.projectRoot,
    'framework/modules/writer/skills/writer/organizing-books/templates/character.template.md'
  );

  let templateContent: string;
  if (await fs.pathExists(templatePath)) {
    templateContent = await fs.readFile(templatePath, 'utf-8');
  } else {
    // Fallback inline template
    templateContent = `---
id: {{name}}
name: "{{displayName}}"
type: {{type}}
role: {{role}}
created: {{date}}
status: active

# Physical
age:
appearance: |
  [Describe the character's physical appearance. Include:
  - Build and height
  - Hair and eye color
  - Distinctive features
  - Typical clothing or style
  - Mannerisms or physical habits]

# Personality
traits:
  - [Positive trait 1]
  - [Negative trait 1]
  - [Neutral trait 1]
  - [Add 2-4 more traits]

motivations:
  - [Primary motivation - what drives this character?]
  - [Secondary motivation]

fears:
  - [Primary fear - what does this character fear most?]
  - [Secondary fear]

# Voice
speech-patterns:
  internal: "[How does this character think?]"
  dialogue: "[How does this character speak?]"

voice-example: |
  "[Provide an example of this character's dialogue that captures their voice.]"

# Arc
starting-state: |
  [Describe this character's state at the beginning of the book.]

character-arc: |
  [Describe this character's intended development throughout the book.]
---

# {{displayName}}

## Summary

[Provide a 2-3 sentence summary of who this character is and their role in
the story.]

## Background

[Provide the character's backstory and history. Include:
- Where they came from
- Significant past events that shaped them
- Family and upbringing
- How they arrived at their current situation
- Relevant secrets or hidden information]

## Relationships

[Describe this character's key relationships with other characters.]

**[Other Character Name]:**
- Relationship type: [ally, enemy, mentor, student, rival, etc.]
- Dynamic: [How do they interact? What's the emotional tone?]
- History: [How did they meet? What's their shared past?]
- Arc: [How will this relationship evolve?]

## Skills and Abilities

[What can this character do? Include:
- Combat or physical skills
- Magical or supernatural abilities
- Knowledge and expertise
- Social or interpersonal skills
- Unique talents or gifts]

## Weaknesses and Flaws

[What are this character's limitations? Include:
- Physical weaknesses
- Emotional vulnerabilities
- Knowledge gaps
- Personality flaws
- Fatal flaw (for main characters)]

## Role in Story

[Explain this character's narrative function. Include:
- Plot role (how do they advance the story?)
- Thematic role (what theme do they represent or explore?)
- Relationship to protagonist
- Key scenes or moments featuring this character]

## Notes

[Any additional notes for writing this character.]
`;
  }

  // Render template
  const vars = {
    name: name,
    displayName: characterDisplayName,
    type: type,
    role: role,
    date: currentDate,
  };

  const characterContent = renderTemplate(templateContent, vars);

  // Dry run
  if (dryRun) {
    console.log('\nDRY RUN - No files created\n');
    console.log('Character Details:');
    console.log(`  ID:           ${name}`);
    console.log(`  Display Name: ${characterDisplayName}`);
    console.log(`  Type:         ${type}`);
    console.log(`  Role:         ${role}`);
    console.log(`  Folder:       ${characterFolder}\n`);
    console.log('Would create:');
    console.log(`  ✓ ${characterFolder}/`);
    console.log(`  ✓ ${characterFolder}/profile.md (${characterContent.length} bytes)\n`);
    console.log('Next steps:');
    console.log('  1. Remove --dry-run flag to create character');
    console.log('  2. Edit profile.md to fill in character details');
    console.log('  3. Reference character in scenes and chapters');
    return;
  }

  // Create character folder and file
  await fs.ensureDir(characterFolder);
  const profileFile = path.join(characterFolder, 'profile.md');
  await fs.writeFile(profileFile, characterContent, 'utf-8');

  // Record telemetry
  const durationMs = Date.now() - startTime;
  recordCLICommand(
    'writer',
    'create-character',
    { name, displayName: characterDisplayName, type, role, dryRun },
    { character_id: name, path: characterFolder },
    durationMs,
    true
  ).catch(() => {});

  // Output success
  console.log('\nCharacter created successfully!\n');
  console.log(`Character ID:   ${name}`);
  console.log(`Display Name:   ${characterDisplayName}`);
  console.log(`Type:           ${type}`);
  console.log(`Role:           ${role}\n`);
  console.log('Created:');
  console.log(`  📁 ${characterFolder}`);
  console.log(`  📄 ${profileFile}\n`);
  console.log('Next steps:');
  console.log('  1. Edit profile.md to fill in character background, appearance, and personality');
  console.log('  2. Define character voice and speech patterns');
  console.log('  3. Reference this character in scene POV and characters-present metadata\n');
}
