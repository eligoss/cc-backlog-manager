/**
 * Create Skill Command
 *
 * Creates a new skill directory with template files.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { createUnifiedTemplateEngine } from '../lib/unified-template-engine/index.js';
import { recordCLICommand } from '../lib/telemetry/instrumentation/cli-instrumentation.js';
import { CliContext } from '../lib/cli-context.js';

interface CreateSkillOptions {
  capability: string;
  description?: string;
  scope?: string;
  module?: string;
  output?: string;
  dryRun?: boolean;
}

export function createCreateSkillCommand(): Command {
  return new Command('create-skill')
    .description('Create a new skill from template')
    .argument('<name>', 'Skill name in kebab-case (e.g., my-skill)')
    .requiredOption('--capability <capability>', 'Capability this skill provides')
    .option('--description <description>', 'Skill description')
    .option('--scope <scope>', 'Skill scope (generic, project, shared)', 'project')
    .option('--module <module>', 'Target module for the skill', 'core')
    .option('-o, --output <path>', 'Custom output directory')
    .option('--dry-run', 'Preview without creating files')
    .action(async (name: string, options: CreateSkillOptions) => {
      const startTime = Date.now();
      try {
        // Get CLI context
        const ctx = await CliContext.require();

        // Validate name format
        if (!/^[a-z][a-z0-9-]*$/.test(name)) {
          console.error(chalk.red('Error: Skill name must be kebab-case (e.g., my-skill)'));
          process.exit(1);
        }

        const engine = createUnifiedTemplateEngine({
          projectRoot: ctx.projectRoot,
          templateCategory: 'skill',
        });

        // Determine output directory
        let outputDir = options.output;
        if (!outputDir) {
          outputDir = path.join(
            ctx.projectRoot,
            'framework/modules',
            options.module || 'core',
            'skills',
            name
          );
        }

        // Prepare variables
        const variables: Record<string, string> = {
          id: name,
          name: name,
          capability: options.capability,
          description: options.description || `${name} skill description`,
          scope: options.scope || 'project',
          module: options.module || 'core',
          applicableProjects: 'any',
          title: name
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
        };

        const skillPath = path.join(outputDir, 'SKILL.md');

        const result = await engine.renderToFile('SKILL.md', {
          variables,
          outputPath: skillPath,
          dryRun: options.dryRun,
        }, 'skill');

        if (options.dryRun) {
          console.log(chalk.yellow('\n=== DRY RUN (preview only) ===\n'));
          console.log(chalk.gray(`Would create directory: ${outputDir}`));
          console.log(chalk.gray(`Would create file: ${result.outputPath}\n`));
          console.log(chalk.bold('Variables:'));
          for (const [key, value] of Object.entries(result.variables)) {
            console.log(`  ${chalk.cyan(key)}: ${value}`);
          }
          console.log(chalk.bold('\nSKILL.md preview:'));
          console.log(chalk.gray('─'.repeat(60)));
          // Show first 30 lines
          const lines = result.content.split('\n').slice(0, 30);
          console.log(lines.join('\n'));
          if (result.content.split('\n').length > 30) {
            console.log(chalk.gray('... (truncated)'));
          }
          console.log(chalk.gray('─'.repeat(60)));
          console.log(chalk.yellow('\n=== END DRY RUN ===\n'));
        } else {
          const durationMs = Date.now() - startTime;
          recordCLICommand(
            'create-skill',
            undefined,
            {
              capability: options.capability,
              scope: options.scope,
              module: options.module,
              dry_run: options.dryRun,
            },
            {
              skill_name: name,
              path: outputDir,
            },
            durationMs,
            true
          ).catch(() => {});

          console.log(chalk.green(`✓ Skill created successfully!`));
          console.log(chalk.gray(`  Directory: ${outputDir}`));
          console.log(chalk.gray(`  Skill ID: ${name}`));
          console.log();
          console.log(chalk.bold('Next steps:'));
          console.log(chalk.gray('  1. Edit SKILL.md to add workflow details and examples'));
          console.log(chalk.gray('  2. Create EXAMPLES.md if needed'));
          console.log(chalk.gray('  3. Update the module.json to register the skill'));
          console.log(chalk.gray('  4. Run `agentic-framework sync` to update registries'));
        }
      } catch (error) {
        console.error(chalk.red('Error creating skill:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
