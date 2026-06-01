/**
 * Create Module Command
 *
 * Creates a new module directory with template files.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { createUnifiedTemplateEngine } from '../lib/unified-template-engine/index.js';
import { recordCLICommand } from '../lib/telemetry/instrumentation/cli-instrumentation.js';
import { CliContext } from '../lib/cli-context.js';

interface CreateModuleOptions {
  description?: string;
  category?: string;
  author?: string;
  output?: string;
  dryRun?: boolean;
}

export function createCreateModuleCommand(): Command {
  return new Command('create-module')
    .description('Create a new module from template')
    .argument('<name>', 'Module name in kebab-case (e.g., my-module)')
    .option('--description <description>', 'Module description')
    .option('--category <category>', 'Module category', 'workflow')
    .option('--author <author>', 'Module author')
    .option('-o, --output <path>', 'Custom output directory')
    .option('--dry-run', 'Preview without creating files')
    .action(async (name: string, options: CreateModuleOptions) => {
      const startTime = Date.now();
      try {
        // Get CLI context
        const ctx = await CliContext.require();

        // Validate name format
        if (!/^[a-z][a-z0-9-]*$/.test(name)) {
          console.error(chalk.red('Error: Module name must be kebab-case (e.g., my-module)'));
          process.exit(1);
        }

        const engine = createUnifiedTemplateEngine({
          projectRoot: ctx.projectRoot,
          templateCategory: 'module',
        });

        // Determine output directory
        let outputDir = options.output;
        if (!outputDir) {
          outputDir = path.join(ctx.projectRoot, 'framework/modules', name);
        }

        // Prepare variables
        const displayName = name
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        const variables: Record<string, string> = {
          id: name,
          name: displayName,
          description: options.description || `${displayName} module for the Agentic Development Framework`,
          category: options.category || 'workflow',
          author: options.author || 'Agentic Framework',
          version: '1.0.0',
        };

        const modulePath = path.join(outputDir, 'module.json');

        if (options.dryRun) {
          const result = await engine.render('module.json', {
            variables,
            dryRun: true,
          }, 'module');

          console.log(chalk.yellow('\n=== DRY RUN (preview only) ===\n'));
          console.log(chalk.gray(`Would create directory structure:`));
          console.log(chalk.gray(`  ${outputDir}/`));
          console.log(chalk.gray(`  ├── module.json`));
          console.log(chalk.gray(`  ├── agents/`));
          console.log(chalk.gray(`  ├── skills/`));
          console.log(chalk.gray(`  └── templates/`));
          console.log();
          console.log(chalk.bold('Variables:'));
          for (const [key, value] of Object.entries(result.variables)) {
            console.log(`  ${chalk.cyan(key)}: ${value}`);
          }
          console.log(chalk.bold('\nmodule.json preview:'));
          console.log(chalk.gray('─'.repeat(60)));
          console.log(result.content);
          console.log(chalk.gray('─'.repeat(60)));
          console.log(chalk.yellow('\n=== END DRY RUN ===\n'));
        } else {
          // Create directory structure
          await fs.ensureDir(outputDir);
          await fs.ensureDir(path.join(outputDir, 'agents'));
          await fs.ensureDir(path.join(outputDir, 'skills'));
          await fs.ensureDir(path.join(outputDir, 'templates'));

          // Create module.json
          const _result = await engine.renderToFile('module.json', {
            variables,
            outputPath: modulePath,
            dryRun: false,
          }, 'module');

          const durationMs = Date.now() - startTime;
          recordCLICommand(
            'create-module',
            undefined,
            {
              category: options.category,
              author: options.author,
              dry_run: options.dryRun,
            },
            {
              module_name: name,
              path: outputDir,
            },
            durationMs,
            true
          ).catch(() => {});

          console.log(chalk.green(`✓ Module created successfully!`));
          console.log(chalk.gray(`  Directory: ${outputDir}`));
          console.log(chalk.gray(`  Module ID: ${name}`));
          console.log();
          console.log(chalk.bold('Created structure:'));
          console.log(chalk.gray(`  ${outputDir}/`));
          console.log(chalk.gray(`  ├── module.json`));
          console.log(chalk.gray(`  ├── agents/`));
          console.log(chalk.gray(`  ├── skills/`));
          console.log(chalk.gray(`  └── templates/`));
          console.log();
          console.log(chalk.bold('Next steps:'));
          console.log(chalk.gray('  1. Add agents using `agentic-framework create-agent`'));
          console.log(chalk.gray('  2. Add skills using `agentic-framework create-skill`'));
          console.log(chalk.gray('  3. Update module.json with provided capabilities'));
          console.log(chalk.gray('  4. Run `agentic-framework sync` to register the module'));
        }
      } catch (error) {
        console.error(chalk.red('Error creating module:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
