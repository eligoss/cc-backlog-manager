/**
 * Agent Show Command
 *
 * Displays detailed SDK definition for a specific agent.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createSDKGenerator } from '../../lib/sdk/index.js';
import { CliContext } from '../../lib/cli-context.js';

export function createAgentShowCommand(): Command {
  return new Command('show')
    .description('Show SDK definition for an agent')
    .argument('<agent-id>', 'Agent ID to show (e.g., ai-framework-manager)')
    .option('-p, --path <path>', 'Project path', '.')
    .option('--json', 'Output as JSON')
    .option('--prompt', 'Show only the generated system prompt')
    .option('--sub-agents', 'Show sub-agent definitions')
    .action(async (agentId, options) => {
      try {
        const context = await CliContext.create({ path: options.path });
        const generator = await createSDKGenerator(context.projectRoot);

        // Check if agent is SDK-enabled
        const isEnabled = await generator.isSDKEnabled(agentId);
        if (!isEnabled) {
          console.warn(
            chalk.yellow(`Warning: Agent '${agentId}' is not SDK-enabled. Generating anyway...`)
          );
        }

        const generated = await generator.generateForAgent(agentId);

        if (options.json) {
          const output = {
            agentId,
            isSDKEnabled: isEnabled,
            definition: generated.definition,
            subAgents: Object.fromEntries(generated.subAgents),
            frameworkAgent: generated.frameworkAgent,
          };
          console.log(JSON.stringify(output, null, 2));
          return;
        }

        if (options.prompt) {
          console.log(generated.definition.prompt);
          return;
        }

        // Display formatted output
        console.log(chalk.bold(`\nAgent: ${agentId}\n`));
        console.log(chalk.dim('─'.repeat(60)));

        // SDK Configuration
        console.log(chalk.cyan('\n[SDK Configuration]'));
        console.log(`  Enabled:    ${isEnabled ? chalk.green('Yes') : chalk.red('No')}`);
        console.log(`  Model:      ${chalk.magenta(generated.definition.model)}`);
        console.log(`  Tools:      ${generated.definition.tools.join(', ')}`);

        // Framework metadata
        console.log(chalk.cyan('\n[Framework Metadata]'));
        console.log(`  Module:     ${generated.frameworkAgent.moduleId}`);
        console.log(`  Variant:    ${generated.frameworkAgent.variant}`);
        console.log(`  Token Budget: ${generated.frameworkAgent.tokenBudget}`);

        // Capabilities
        console.log(chalk.cyan('\n[Capability Needs]'));
        for (const cap of generated.frameworkAgent.capabilityNeeds) {
          console.log(`  - ${cap}`);
        }

        // Context
        console.log(chalk.cyan('\n[Context Files]'));
        for (const [category, level] of Object.entries(
          generated.frameworkAgent.contextCategoryNeeds
        )) {
          console.log(`  ${category}: ${level}`);
        }

        // Skills loaded
        console.log(chalk.cyan('\n[Skills Loaded]'));
        if (generated.skillsContent.length > 0) {
          console.log(`  ${generated.skillsContent.length} skill(s) loaded`);
        } else {
          console.log(chalk.dim('  No skills loaded'));
        }

        // Description
        console.log(chalk.cyan('\n[Description]'));
        console.log(`  ${generated.definition.description}`);

        // Sub-agents
        if (options.subAgents || generated.subAgents.size > 0) {
          console.log(chalk.cyan('\n[Sub-Agents]'));
          if (generated.subAgents.size === 0) {
            console.log(chalk.dim('  No sub-agents configured'));
          } else {
            for (const [type, def] of generated.subAgents) {
              console.log(`\n  ${chalk.bold(type)}:`);
              console.log(`    Model: ${def.model}`);
              console.log(`    Tools: ${def.tools.join(', ')}`);
              console.log(`    Description: ${def.description.substring(0, 80)}...`);
            }
          }
        }

        // Prompt preview
        console.log(chalk.cyan('\n[System Prompt Preview]'));
        const promptPreview = generated.definition.prompt.substring(0, 500);
        console.log(chalk.dim(promptPreview + '...'));

        console.log(chalk.dim('\n─'.repeat(60)));
        console.log(
          chalk.dim('\nRun with ') +
            chalk.cyan('--json') +
            chalk.dim(' for full definition or ') +
            chalk.cyan('--prompt') +
            chalk.dim(' for complete prompt')
        );
      } catch (error) {
        console.error(chalk.red('Error:'), (error as Error).message);
        process.exit(1);
      }
    });
}
