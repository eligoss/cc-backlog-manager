/**
 * Template List Command
 *
 * Lists all available templates with optional category filtering.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createUnifiedTemplateEngine } from '../../lib/unified-template-engine/index.js';
import { recordCLICommand } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';
import { CliContext } from '../../lib/cli-context.js';

interface ListOptions {
  category?: string;
  json?: boolean;
}

export function createListCommand(): Command {
  return new Command('list')
    .description('List all available templates')
    .option('-c, --category <category>', 'Filter by template category')
    .option('--json', 'Output as JSON')
    .action(async (options: ListOptions) => {
      const startTime = Date.now();
      try {
        const ctx = await CliContext.require();
        const engine = createUnifiedTemplateEngine({
          projectRoot: ctx.projectRoot,
        });

        const templates = await engine.listTemplates(options.category);

        if (templates.length === 0) {
          if (options.json) {
            console.log(JSON.stringify({ templates: [] }, null, 2));
          } else {
            console.log(chalk.yellow('No templates found.'));
            if (options.category) {
              console.log(chalk.gray(`Try without --category to see all templates.`));
            }
          }
          const durationMs = Date.now() - startTime;
          recordCLICommand(
            'template',
            'list',
            { category: options.category, json: options.json },
            { templates_count: 0 },
            durationMs,
            true
          ).catch(() => {});
          return;
        }

        if (options.json) {
          console.log(JSON.stringify({ templates }, null, 2));
          const durationMs = Date.now() - startTime;
          recordCLICommand(
            'template',
            'list',
            { category: options.category, json: options.json },
            { templates_count: templates.length },
            durationMs,
            true
          ).catch(() => {});
          return;
        }

        // Group by category
        const byCategory = new Map<string, typeof templates>();
        for (const template of templates) {
          const list = byCategory.get(template.category) || [];
          list.push(template);
          byCategory.set(template.category, list);
        }

        console.log(chalk.bold('\nAvailable Templates:\n'));

        for (const [category, categoryTemplates] of byCategory) {
          console.log(chalk.cyan(`  ${category}/`));
          for (const t of categoryTemplates) {
            const source = chalk.gray(`(${t.source})`);
            const required = t.requiredVariables.length > 0
              ? chalk.yellow(` [${t.requiredVariables.join(', ')}]`)
              : '';
            console.log(`    ${chalk.green(t.name)}${required} ${source}`);
            if (t.description) {
              console.log(chalk.gray(`      ${t.description}`));
            }
          }
          console.log();
        }

        console.log(chalk.gray(`Total: ${templates.length} template(s)`));
        console.log(chalk.gray(`\nUse 'agentic-framework template info <name>' for details.`));

        const durationMs = Date.now() - startTime;
        recordCLICommand(
          'template',
          'list',
          { category: options.category, json: options.json },
          { templates_count: templates.length },
          durationMs,
          true
        ).catch(() => {});
      } catch (error) {
        console.error(chalk.red('Error listing templates:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
