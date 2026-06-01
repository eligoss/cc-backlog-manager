/**
 * Create Agent Command
 *
 * Creates a new agent file from the agent template.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { createUnifiedTemplateEngine } from '../lib/unified-template-engine/index.js';
import { recordCLICommand } from '../lib/telemetry/instrumentation/cli-instrumentation.js';
import { CliContext } from '../lib/cli-context.js';

interface CreateAgentOptions {
  capability: string;
  description?: string;
  variant?: string;
  role?: string;
  module?: string;
  output?: string;
  dryRun?: boolean;
}

export function createCreateAgentCommand(): Command {
  return new Command('create-agent')
    .description('Create a new agent from template')
    .argument('<name>', 'Agent name in kebab-case (e.g., my-agent)')
    .requiredOption('--capability <capability>', 'Primary capability this agent provides')
    .option('--description <description>', 'Agent description')
    .option('--variant <variant>', 'Agent variant (full or slim)', 'full')
    .option('--role <role>', 'Agent role description')
    .option('--module <module>', 'Target module for the agent', 'core')
    .option('-o, --output <path>', 'Custom output path')
    .option('--dry-run', 'Preview without creating files')
    .action(async (name: string, options: CreateAgentOptions) => {
      const startTime = Date.now();
      try {
        // Get CLI context
        const ctx = await CliContext.require();

        // Validate name format
        if (!/^[a-z][a-z0-9-]*$/.test(name)) {
          console.error(chalk.red('Error: Agent name must be kebab-case (e.g., my-agent)'));
          process.exit(1);
        }

        const engine = createUnifiedTemplateEngine({
          projectRoot: ctx.projectRoot,
          templateCategory: 'agent',
        });

        // Determine output path
        let outputPath = options.output;
        if (!outputPath) {
          outputPath = path.join(
            ctx.projectRoot,
            'framework/modules',
            options.module || 'core',
            'agents',
            `ai-${name}.md`
          );
        }

        // Prepare variables
        const variables: Record<string, string> = {
          name,
          capability: options.capability,
          description: options.description || `${name} agent description`,
          variant: options.variant || 'full',
          role: options.role || 'Agent Role',
          title: name
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
        };

        const result = await engine.renderToFile('agent.template', {
          variables,
          outputPath,
          dryRun: options.dryRun,
        }, 'agent');

        if (options.dryRun) {
          console.log(chalk.yellow('\n=== DRY RUN (preview only) ===\n'));
          console.log(chalk.gray(`Would create: ${result.outputPath}\n`));
          console.log(chalk.bold('Variables:'));
          for (const [key, value] of Object.entries(result.variables)) {
            console.log(`  ${chalk.cyan(key)}: ${value}`);
          }
          console.log(chalk.bold('\nContent preview:'));
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
            'create-agent',
            undefined,
            {
              capability: options.capability,
              variant: options.variant,
              module: options.module,
              dry_run: options.dryRun,
            },
            {
              agent_name: `ai-${name}`,
              path: result.outputPath,
            },
            durationMs,
            true
          ).catch(() => {});

          console.log(chalk.green(`✓ Agent created successfully!`));
          console.log(chalk.gray(`  File: ${result.outputPath}`));
          console.log(chalk.gray(`  Agent ID: ai-${name}`));
          console.log();
          console.log(chalk.bold('Next steps:'));
          console.log(chalk.gray('  1. Edit the agent file to add responsibilities and workflows'));
          console.log(chalk.gray('  2. Update the module.json to register the agent'));
          console.log(chalk.gray('  3. Run `agentic-framework sync` to update registries'));
        }
      } catch (error) {
        console.error(chalk.red('Error creating agent:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
