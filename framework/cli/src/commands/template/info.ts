/**
 * Template Info Command
 *
 * Shows detailed information about a specific template.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createUnifiedTemplateEngine } from '../../lib/unified-template-engine/index.js';
import { recordCLICommand } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';
import { CliContext } from '../../lib/cli-context.js';

interface InfoOptions {
  category?: string;
  json?: boolean;
}

export function createInfoCommand(): Command {
  return new Command('info')
    .description('Show detailed information about a template')
    .argument('<name>', 'Template name (e.g., story.template or category/story.template)')
    .option('-c, --category <category>', 'Template category (can also be specified as category/name)')
    .option('--json', 'Output as JSON')
    .action(async (nameArg: string, options: InfoOptions) => {
      const startTime = Date.now();
      try {
        // Support both "name" and "category/name" formats
        let name = nameArg;
        let category = options.category;

        // If name contains a slash, parse it as "category/name"
        if (nameArg.includes('/') && !category) {
          const parts = nameArg.split('/');
          if (parts.length === 2) {
            category = parts[0];
            name = parts[1];
          }
        }

        const ctx = await CliContext.require();
        const engine = createUnifiedTemplateEngine({
          projectRoot: ctx.projectRoot,
          templateCategory: category,
        });

        const info = await engine.getInfo(name, category);

        if (!info) {
          console.error(chalk.red(`Template not found: ${name}`));
          console.log(chalk.gray(`\nUse 'agentic-framework template list' to see available templates.`));
          process.exit(1);
        }

        if (options.json) {
          console.log(JSON.stringify(info, null, 2));
          const durationMs = Date.now() - startTime;
          recordCLICommand(
            'template',
            'info',
            { category: options.category, json: options.json },
            { template_name: name },
            durationMs,
            true
          ).catch(() => {});
          return;
        }

        console.log(chalk.bold(`\nTemplate: ${chalk.cyan(name)}\n`));

        console.log(`  ${chalk.gray('Category:')}   ${info.category}`);
        console.log(`  ${chalk.gray('Source:')}     ${info.source}`);
        console.log(`  ${chalk.gray('Output:')}     ${info.output}`);
        if (info.description) {
          console.log(`  ${chalk.gray('Description:')} ${info.description}`);
        }

        console.log(`\n${chalk.bold('Variables:')}`);

        if (info.variables.required.length > 0) {
          console.log(`  ${chalk.yellow('Required:')}`);
          for (const v of info.variables.required) {
            const validation = info.validation?.[v];
            let constraints = '';
            if (validation) {
              const parts = [];
              if (validation.pattern) parts.push(`pattern: ${validation.pattern}`);
              if (validation.minLength !== undefined) parts.push(`min: ${validation.minLength}`);
              if (validation.maxLength !== undefined) parts.push(`max: ${validation.maxLength}`);
              if (validation.enum) parts.push(`values: ${validation.enum.join('|')}`);
              if (parts.length > 0) constraints = chalk.gray(` (${parts.join(', ')})`);
            }
            console.log(`    - ${chalk.red(v)}${constraints}`);
          }
        }

        if (info.variables.optional.length > 0) {
          console.log(`  ${chalk.gray('Optional:')}`);
          for (const v of info.variables.optional) {
            const defaultVal = info.defaults[v];
            const defaultStr = defaultVal ? chalk.gray(` = "${defaultVal}"`) : '';
            console.log(`    - ${v}${defaultStr}`);
          }
        }

        if (info.variables.computed.length > 0) {
          console.log(`  ${chalk.blue('Computed:')} ${chalk.gray('(auto-generated)')}`);
          for (const v of info.variables.computed) {
            let description = '';
            switch (v) {
              case 'date':
                description = 'Current date (YYYY-MM-DD)';
                break;
              case 'datetime':
                description = 'Current datetime (ISO 8601)';
                break;
              case 'year':
                description = 'Current year';
                break;
              case 'number':
                description = 'Auto-incremented number';
                break;
              case 'uuid':
                description = 'Random UUID';
                break;
              case 'user':
                description = 'Git user name';
                break;
            }
            console.log(`    - ${chalk.blue(v)} ${chalk.gray(`- ${description}`)}`);
          }
        }

        console.log(`\n${chalk.bold('Example:')}`);
        const varArgs = info.variables.required.map((v) => `--var ${v}="value"`).join(' ');
        console.log(chalk.gray(`  agentic-framework template render ${name} ${varArgs}`));
        console.log();

        const durationMs = Date.now() - startTime;
        recordCLICommand(
          'template',
          'info',
          { category: options.category, json: options.json },
          { template_name: name },
          durationMs,
          true
        ).catch(() => {});
      } catch (error) {
        console.error(chalk.red('Error getting template info:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
