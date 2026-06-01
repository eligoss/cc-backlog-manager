/**
 * Template Validate Command
 *
 * Validates template.config.json files against the schema.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import fg from 'fast-glob';
import { validateConfig } from '../../lib/unified-template-engine/index.js';
import { recordCLICommand } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';
import { CliContext } from '../../lib/cli-context.js';

interface ValidateOptions {
  json?: boolean;
  strict?: boolean;
}

export function createValidateCommand(): Command {
  return new Command('validate')
    .description('Validate template configuration files')
    .argument('[path]', 'Path to template.config.json or directory containing templates', '.')
    .option('--json', 'Output as JSON')
    .option('--strict', 'Exit with error on warnings')
    .action(async (targetPath: string, options: ValidateOptions) => {
      const startTime = Date.now();
      try {
        const ctx = await CliContext.require();
        const resolvedPath = path.resolve(ctx.projectRoot, targetPath);
        const stat = await fs.stat(resolvedPath);

        let configFiles: string[] = [];

        if (stat.isFile()) {
          if (!resolvedPath.endsWith('template.config.json')) {
            console.error(chalk.red('Error: Expected template.config.json file'));
            process.exit(1);
          }
          configFiles = [resolvedPath];
        } else if (stat.isDirectory()) {
          // Find all template.config.json files
          configFiles = await fg('**/template.config.json', {
            cwd: resolvedPath,
            absolute: true,
            ignore: ['**/node_modules/**', '**/dist/**'],
          });
        }

        if (configFiles.length === 0) {
          if (options.json) {
            console.log(JSON.stringify({ files: [], valid: true }, null, 2));
          } else {
            console.log(chalk.yellow('No template.config.json files found.'));
          }
          const durationMs = Date.now() - startTime;
          recordCLICommand(
            'template',
            'validate',
            { json: options.json, strict: options.strict },
            { valid: true, errors: 0 },
            durationMs,
            true
          ).catch(() => {});
          return;
        }

        const results: Array<{
          file: string;
          valid: boolean;
          errors: Array<{ type: string; message: string }>;
          warnings: Array<{ type: string; message: string }>;
        }> = [];

        let hasErrors = false;
        let hasWarnings = false;

        for (const configFile of configFiles) {
          const relativePath = path.relative(ctx.projectRoot, configFile);

          try {
            const config = await fs.readJSON(configFile);
            const validation = await validateConfig(config);

            results.push({
              file: relativePath,
              valid: validation.valid,
              errors: validation.errors.map((e) => ({ type: e.type, message: e.message })),
              warnings: validation.warnings.map((w) => ({ type: w.type, message: w.message })),
            });

            if (!validation.valid) hasErrors = true;
            if (validation.warnings.length > 0) hasWarnings = true;
          } catch (parseError) {
            results.push({
              file: relativePath,
              valid: false,
              errors: [{ type: 'parse_error', message: parseError instanceof Error ? parseError.message : String(parseError) }],
              warnings: [],
            });
            hasErrors = true;
          }
        }

        if (options.json) {
          console.log(JSON.stringify({
            files: results,
            valid: !hasErrors,
            hasWarnings,
          }, null, 2));
        } else {
          console.log(chalk.bold(`\nValidating ${results.length} template config(s)...\n`));

          for (const result of results) {
            const statusIcon = result.valid
              ? result.warnings.length > 0
                ? chalk.yellow('⚠')
                : chalk.green('✓')
              : chalk.red('✗');

            console.log(`${statusIcon} ${chalk.cyan(result.file)}`);

            for (const error of result.errors) {
              console.log(chalk.red(`    ✗ ${error.message}`));
            }

            for (const warning of result.warnings) {
              console.log(chalk.yellow(`    ⚠ ${warning.message}`));
            }
          }

          console.log();

          if (hasErrors) {
            console.log(chalk.red(`Validation failed with errors.`));
          } else if (hasWarnings) {
            console.log(chalk.yellow(`Validation passed with warnings.`));
          } else {
            console.log(chalk.green(`All template configs are valid.`));
          }
        }

        const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
        const durationMs = Date.now() - startTime;
        recordCLICommand(
          'template',
          'validate',
          { json: options.json, strict: options.strict },
          { valid: !hasErrors, errors: totalErrors },
          durationMs,
          true
        ).catch(() => {});

        if (hasErrors || (options.strict && hasWarnings)) {
          process.exit(1);
        }
      } catch (error) {
        if (options.json) {
          console.log(JSON.stringify({
            valid: false,
            error: error instanceof Error ? error.message : String(error),
          }, null, 2));
        } else {
          console.error(chalk.red('Error validating templates:'), error instanceof Error ? error.message : error);
        }
        process.exit(1);
      }
    });
}
