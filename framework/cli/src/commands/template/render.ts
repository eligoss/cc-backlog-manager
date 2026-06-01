/**
 * Template Render Command
 *
 * Renders a template with provided variables.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { createUnifiedTemplateEngine } from '../../lib/unified-template-engine/index.js';
import { recordCLICommand } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';
import { CliContext } from '../../lib/cli-context.js';

interface RenderOptions {
  var?: string[];
  output?: string;
  category?: string;
  dryRun?: boolean;
  json?: boolean;
}

/**
 * Parse --var arguments into a variables object
 * Supports: --var key=value --var key2=value2
 */
function parseVariables(varArgs: string[] | undefined): Record<string, string> {
  const variables: Record<string, string> = {};

  if (!varArgs) return variables;

  for (const arg of varArgs) {
    const eqIndex = arg.indexOf('=');
    if (eqIndex === -1) {
      throw new Error(`Invalid variable format: ${arg}. Expected key=value`);
    }
    const key = arg.substring(0, eqIndex);
    const value = arg.substring(eqIndex + 1);
    variables[key] = value;
  }

  return variables;
}

export function createRenderCommand(): Command {
  return new Command('render')
    .description('Render a template with variables')
    .argument('<name>', 'Template name (e.g., story.template)')
    .option('--var <key=value...>', 'Variable values (can be used multiple times)', (val, prev: string[]) => {
      prev = prev || [];
      prev.push(val);
      return prev;
    }, [])
    .option('-o, --output <path>', 'Output file path (overrides template default)')
    .option('-c, --category <category>', 'Template category')
    .option('--dry-run', 'Preview without writing files')
    .option('--json', 'Output as JSON')
    .action(async (name: string, options: RenderOptions) => {
      const startTime = Date.now();
      try {
        const ctx = await CliContext.require();
        const variables = parseVariables(options.var);

        const engine = createUnifiedTemplateEngine({
          projectRoot: ctx.projectRoot,
          templateCategory: options.category,
        });

        // Resolve output path
        let outputPath = options.output;
        if (outputPath && !path.isAbsolute(outputPath)) {
          outputPath = path.resolve(ctx.projectRoot, outputPath);
        }

        const result = options.dryRun
          ? await engine.render(name, {
              variables,
              outputPath,
              dryRun: true,
            }, options.category)
          : await engine.renderToFile(name, {
              variables,
              outputPath,
              dryRun: false,
            }, options.category);

        if (options.json) {
          console.log(JSON.stringify({
            success: true,
            outputPath: result.outputPath,
            dryRun: result.dryRun,
            variables: result.variables,
            contentLength: result.content.length,
          }, null, 2));
          const durationMs = Date.now() - startTime;
          recordCLICommand(
            'template',
            'render',
            { category: options.category, dryRun: options.dryRun, json: options.json },
            { output_path: result.outputPath },
            durationMs,
            true
          ).catch(() => {});
          return;
        }

        if (options.dryRun) {
          console.log(chalk.yellow('\n=== DRY RUN (preview only) ===\n'));
          console.log(chalk.gray(`Output would be written to: ${result.outputPath}\n`));
          console.log(chalk.bold('Variables used:'));
          for (const [key, value] of Object.entries(result.variables)) {
            console.log(`  ${chalk.cyan(key)}: ${value}`);
          }
          console.log(chalk.bold('\nRendered content:'));
          console.log(chalk.gray('─'.repeat(60)));
          console.log(result.content);
          console.log(chalk.gray('─'.repeat(60)));
          console.log(chalk.yellow('\n=== END DRY RUN ===\n'));
        } else {
          console.log(chalk.green(`✓ Template rendered successfully!`));
          console.log(chalk.gray(`  Output: ${result.outputPath}`));
        }

        const durationMs = Date.now() - startTime;
        recordCLICommand(
          'template',
          'render',
          { category: options.category, dryRun: options.dryRun, json: options.json },
          { output_path: result.outputPath },
          durationMs,
          true
        ).catch(() => {});
      } catch (error) {
        if (options.json) {
          console.log(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          }, null, 2));
        } else {
          console.error(chalk.red('Error rendering template:'), error instanceof Error ? error.message : error);
        }
        process.exit(1);
      }
    });
}
