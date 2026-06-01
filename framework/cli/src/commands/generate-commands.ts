/**
 * Generate Commands Command
 *
 * Generates Claude command wrapper files from module.json CLI command definitions.
 * These wrappers expose CLI commands as Claude slash commands (e.g., /cmd-backlog-create-ticket).
 *
 * Note: This command writes to SOURCE module directories (framework/modules/*), not
 * the bundled framework directory. This ensures the generated files become part of
 * the source code and are versioned with the project.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { getAvailableModules, loadModule } from '../lib/module-loader.js';
import { recordCLICommand } from '../lib/telemetry/instrumentation/cli-instrumentation.js';
import { CliContext } from '../lib/cli-context.js';
import { ManifestManager } from '../lib/manifest-manager.js';

interface CLICommandDef {
  name: string;
  type: string;
  skill?: string;
  template?: string;
  schema?: string;
  description: string;
}

interface GenerateCommandsOptions {
  module?: string;
  dryRun?: boolean;
  force?: boolean;
}

interface GenerationResult {
  created: string[];
  skipped: string[];
  errors: string[];
}

/**
 * Generate a command ID from CLI command name.
 * Example: "backlog create-ticket" -> "cmd-backlog-create-ticket"
 * Example: "validate --links" -> "cmd-validate-links"
 */
function generateCommandId(cliName: string): string {
  // Remove -- prefixes from flags, then replace spaces with dashes
  const cleaned = cliName
    .replace(/\s+--/g, ' ')  // Remove -- from flags
    .replace(/\s+/g, '-');    // Replace remaining spaces with dashes
  return 'cmd-' + cleaned;
}

/**
 * Generate a human-readable title from command name.
 * Example: "backlog create-ticket" -> "Backlog Create Ticket"
 */
function formatTitle(cliName: string): string {
  return cliName
    .split(/[\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate markdown content for a command wrapper file.
 */
function generateCommandMarkdown(cmd: CLICommandDef, moduleId: string, moduleName: string): string {
  const commandId = generateCommandId(cmd.name);
  const title = formatTitle(cmd.name);

  let content = `---
command: ${commandId}
cli-command: "agentic-framework ${cmd.name}"
module: ${moduleId}
type: ${cmd.type}
description: "${cmd.description}"`;

  if (cmd.skill) {
    content += `
related-skill: ${cmd.skill}`;
  }

  content += `
---

# ${title}

**Command:** \`agentic-framework ${cmd.name}\`
**Module:** ${moduleName}
**Type:** ${cmd.type}

## Description

${cmd.description}

## Usage

\`\`\`bash
agentic-framework ${cmd.name} [options]
\`\`\`

## Execution

When invoked, run the CLI command:

\`\`\`bash
agentic-framework ${cmd.name}
\`\`\`

Use \`--help\` to see all available options:

\`\`\`bash
agentic-framework ${cmd.name} --help
\`\`\`
`;

  if (cmd.skill) {
    content += `
## Related

- **Skill:** \`${cmd.skill}\` - Provides detailed guidance for this command
`;
  }

  return content;
}

export function createGenerateCommandsCommand(): Command {
  return new Command('generate-commands')
    .description('Generate Claude command wrappers from CLI definitions in module.json files')
    .option('-m, --module <module>', 'Generate for specific module only')
    .option('--dry-run', 'Preview without creating files')
    .option('-f, --force', 'Overwrite existing command files')
    .action(async (options: GenerateCommandsOptions) => {
      const startTime = Date.now();

      try {
        // Get CLI context
        const ctx = await CliContext.require();

        // Read manifest to get source path
        const manifestManager = new ManifestManager(ctx.projectRoot);
        const manifest = await manifestManager.read();

        // Compute the source modules path
        // For self-dev projects, this is projectRoot + paths.source + '/modules'
        // For regular projects, this would just use the bundled path
        const sourcePath = manifest.paths?.source || 'framework';
        const sourceModulesPath = path.join(ctx.projectRoot, sourcePath, 'modules');

        const result: GenerationResult = {
          created: [],
          skipped: [],
          errors: [],
        };

        // Get all available modules
        const moduleNames = await getAvailableModules();

        if (options.dryRun) {
          console.log(chalk.yellow('\n=== DRY RUN (preview only) ===\n'));
        }

        console.log(chalk.dim(`Source path: ${sourceModulesPath}\n`));

        for (const moduleName of moduleNames) {
          // Filter by module if specified
          if (options.module && moduleName !== options.module) {
            continue;
          }

          try {
            const module = await loadModule(moduleName);

            // Access cli-commands from provides (may not be in TypeScript type)
            const cliCommandsRaw = (module.provides as Record<string, unknown>)['cli-commands'];

            // Validate that cli-commands is an array (handles malformed module.json)
            if (!Array.isArray(cliCommandsRaw) || cliCommandsRaw.length === 0) {
              continue;
            }

            const cliCommands = cliCommandsRaw as CLICommandDef[];

            // Use source module path instead of bundled path
            const sourceModulePath = path.join(sourceModulesPath, moduleName);

            // Verify the source module exists
            if (!(await fs.pathExists(sourceModulePath))) {
              console.warn(chalk.yellow(`  Warning: Source module not found at ${sourceModulePath}, skipping`));
              continue;
            }

            // Ensure commands directory exists in SOURCE
            const commandsDir = path.join(sourceModulePath, 'commands');

            if (!options.dryRun) {
              await fs.ensureDir(commandsDir);
            }

            console.log(chalk.bold(`\nModule: ${moduleName}`));
            console.log(chalk.gray(`  Commands directory: ${commandsDir}`));

            for (const cmd of cliCommands) {
              // Skip if command definition is just a string (legacy format)
              if (typeof cmd === 'string') {
                continue;
              }

              const commandId = generateCommandId(cmd.name);
              const fileName = `${commandId}.md`;
              const outputPath = path.join(commandsDir, fileName);

              // Check if file exists
              const exists = await fs.pathExists(outputPath);

              if (exists && !options.force) {
                console.log(chalk.gray(`  ${chalk.yellow('○')} ${commandId} (exists, use --force to overwrite)`));
                result.skipped.push(commandId);
                continue;
              }

              const content = generateCommandMarkdown(cmd, module.id, module.name);

              if (options.dryRun) {
                console.log(chalk.gray(`  ${chalk.blue('○')} ${commandId} (would create)`));
                result.created.push(commandId);
              } else {
                try {
                  await fs.writeFile(outputPath, content, 'utf-8');
                  console.log(chalk.gray(`  ${chalk.green('✓')} ${commandId}`));
                  result.created.push(commandId);
                } catch (writeError) {
                  console.log(chalk.gray(`  ${chalk.red('✗')} ${commandId} (${writeError})`));
                  result.errors.push(commandId);
                }
              }
            }
          } catch (moduleError) {
            console.error(chalk.red(`Error processing module ${moduleName}:`), moduleError);
            result.errors.push(`module:${moduleName}`);
          }
        }

        // Summary
        console.log(chalk.bold('\n─── Summary ───'));
        console.log(`  Created: ${chalk.green(result.created.length)}`);
        console.log(`  Skipped: ${chalk.yellow(result.skipped.length)}`);
        console.log(`  Errors:  ${chalk.red(result.errors.length)}`);

        if (options.dryRun) {
          console.log(chalk.yellow('\n=== END DRY RUN ===\n'));
        } else if (result.created.length > 0) {
          console.log(chalk.bold('\nNext steps:'));
          console.log(chalk.gray('  1. Review generated command files'));
          console.log(chalk.gray('  2. Run `agentic-framework sync` to deploy to .claude/commands/'));
        }

        // Record telemetry
        const durationMs = Date.now() - startTime;
        recordCLICommand(
          'generate-commands',
          undefined,
          {
            module: options.module,
            dry_run: options.dryRun,
            force: options.force,
          },
          {
            created: result.created.length,
            skipped: result.skipped.length,
            errors: result.errors.length,
          },
          durationMs,
          result.errors.length === 0
        ).catch(() => {});

        if (result.errors.length > 0) {
          process.exit(1);
        }
      } catch (error) {
        console.error(chalk.red('Error generating commands:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
