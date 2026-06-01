/**
 * MCP Seed Command
 *
 * Seed knowledge bases (Graphiti and Serena) with project information.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import { CliContext } from '../../lib/cli-context.js';
import { ManifestManager } from '../../lib/manifest-manager.js';
import {
  checkAllPrerequisites,
  isGraphitiReady,
  isSerenaReady,
} from '../../lib/mcp/prerequisite-checker.js';
import { extractKnowledge, KnowledgeEpisode } from '../../lib/mcp/extractors/index.js';
import { McpConfig } from './setup.js';

interface SeedOptions {
  path: string;
  graphiti: boolean;
  serena: boolean;
  dryRun: boolean;
  verbose: boolean;
}

/**
 * Create the mcp seed command
 */
export function createMcpSeedCommand(): Command {
  return new Command('seed')
    .description('Seed knowledge bases with project information')
    .option('-p, --path <path>', 'Project path', '.')
    .option('--graphiti', 'Seed Graphiti only')
    .option('--serena', 'Seed Serena only')
    .option('-n, --dry-run', 'Preview what would be seeded without making changes')
    .option('-v, --verbose', 'Show detailed information')
    .action(async (options: SeedOptions) => {
      const ctx = options.path && options.path !== '.'
        ? await CliContext.create({ path: options.path })
        : await CliContext.require();
      const projectPath = ctx.projectRoot;

      console.log(chalk.blue('\nAgentic Development Framework - MCP Seed\n'));

      // Validate project
      const manifestManager = new ManifestManager(projectPath);
      if (!(await manifestManager.exists())) {
        console.error(chalk.red('Error: Not an agentic framework project'));
        console.log(chalk.dim('\nRun "agentic-framework init" first.\n'));
        process.exit(1);
      }

      // Load manifest and MCP config
      const manifest = await manifestManager.read();
      const mcpConfig = manifest.mcp as McpConfig | undefined;

      if (!mcpConfig?.enabled) {
        console.error(chalk.red('Error: MCP not configured'));
        console.log(chalk.dim('\nRun "agentic-framework mcp setup" first.\n'));
        process.exit(1);
      }

      // Determine what to seed
      const seedGraphiti = options.graphiti || (!options.graphiti && !options.serena && mcpConfig.graphiti?.enabled);
      const seedSerena = options.serena || (!options.graphiti && !options.serena && mcpConfig.serena?.enabled);

      // Check prerequisites
      const spinner = ora({ text: 'Checking prerequisites...', discardStdin: true }).start();
      const prereqs = await checkAllPrerequisites();
      spinner.stop();

      const graphitiReady = isGraphitiReady(prereqs);
      const serenaReady = isSerenaReady(prereqs);

      // Validate prerequisites
      if (seedGraphiti && !graphitiReady) {
        console.log(chalk.yellow('Warning: Graphiti prerequisites not met'));
        if (!options.dryRun) {
          console.log(chalk.dim('Run "agentic-framework mcp check --verbose" for setup instructions.'));
        }
      }

      if (seedSerena && !serenaReady) {
        console.log(chalk.yellow('Warning: Serena prerequisites not met'));
        if (!options.dryRun) {
          console.log(chalk.dim('Run "agentic-framework mcp check --verbose" for setup instructions.'));
        }
      }

      // Extract knowledge
      const extractSpinner = ora({ text: 'Extracting project knowledge...', discardStdin: true }).start();
      let knowledge;
      try {
        knowledge = await extractKnowledge(projectPath);
        extractSpinner.succeed(`Extracted knowledge from ${knowledge.projectType} project`);
      } catch (error) {
        extractSpinner.fail('Failed to extract knowledge');
        throw error;
      }

      // Show dry run info
      if (options.dryRun) {
        console.log(chalk.blue('\n[DRY RUN] The following would be seeded:\n'));

        if (seedGraphiti) {
          console.log(chalk.bold('Graphiti Episodes:'));
          for (const episode of knowledge.episodes) {
            console.log(`  ${chalk.green('+')} ${episode.name}`);
            if (options.verbose) {
              console.log(chalk.dim(`      Source: ${episode.source}`));
              console.log(chalk.dim(`      Length: ${episode.body.length} chars`));
            }
          }
          console.log('');
        }

        if (seedSerena) {
          console.log(chalk.bold('Serena Memories:'));
          for (const memory of knowledge.serenaMemories) {
            console.log(`  ${chalk.green('+')} ${memory.name} (${memory.category})`);
            if (options.verbose) {
              console.log(chalk.dim(`      Length: ${memory.content.length} chars`));
            }
          }
          console.log('');
        }

        console.log(chalk.dim('Run without --dry-run to apply changes.\n'));
        return;
      }

      // Seed Graphiti (creates seed file for manual import via Claude)
      let graphitiSuccess = 0;
      let _graphitiSeedPath = '';
      if (seedGraphiti) {
        const graphitiSpinner = ora({ text: 'Creating Graphiti seed file...', discardStdin: true }).start();

        try {
          const results = await seedGraphitiEpisodes(
            knowledge.episodes,
            mcpConfig.graphiti.groupId,
            projectPath
          );
          graphitiSuccess = results.success;
          _graphitiSeedPath = results.seedFilePath;

          graphitiSpinner.succeed(`Created Graphiti seed file with ${graphitiSuccess} episodes`);
        } catch (error) {
          graphitiSpinner.fail('Failed to create Graphiti seed file');
          if (options.verbose) {
            console.error(chalk.red(`  Error: ${(error as Error).message}`));
          }
        }
      }

      // Seed Serena
      let serenaSuccess = 0;
      if (seedSerena) {
        const serenaSpinner = ora({ text: 'Writing Serena memories...', discardStdin: true }).start();

        try {
          const serenaDir = path.join(projectPath, '.serena', 'memories');
          await fs.ensureDir(serenaDir);

          for (const memory of knowledge.serenaMemories) {
            // Sanitize memory name to prevent path traversal attacks
            // Replace path separators and other dangerous characters
            const safeName = memory.name
              .replace(/[/\\]/g, '-')
              .replace(/\.\./g, '--')
              .replace(/^\./, '_');
            const memoryPath = path.join(serenaDir, `${safeName}.md`);
            await fs.writeFile(memoryPath, memory.content, 'utf-8');
            serenaSuccess++;
          }

          serenaSpinner.succeed(`Wrote ${serenaSuccess} Serena memory files`);
        } catch (error) {
          serenaSpinner.fail('Failed to write Serena memories');
          if (options.verbose) {
            console.error(chalk.red(`  Error: ${(error as Error).message}`));
          }
        }
      }

      // Summary
      console.log(chalk.green('\n✓ Seeding completed!\n'));

      if (seedGraphiti) {
        console.log(chalk.bold('Graphiti:'));
        console.log(`  Group ID: ${chalk.cyan(mcpConfig.graphiti.groupId)}`);
        console.log(`  Episodes: ${chalk.cyan(graphitiSuccess)} extracted`);
        console.log(`  Seed file: ${chalk.dim('.graphiti-seed.json')}`);
        console.log('');
        console.log(chalk.yellow('  Note: Graphiti uses MCP protocol for data import.'));
        console.log(chalk.dim('  In your Claude session, ask:'));
        console.log(chalk.dim('    "Import .graphiti-seed.json into Graphiti using add_memory"'));
        console.log('');
      }

      if (seedSerena) {
        console.log(chalk.bold('Serena:'));
        console.log(`  Project: ${chalk.cyan(mcpConfig.serena.projectName)}`);
        console.log(`  Memories: ${chalk.cyan(serenaSuccess)} written`);
        console.log(`  Location: ${chalk.dim('.serena/memories/')}`);
        console.log('');
      }

      // Next steps
      console.log(chalk.dim('In your Claude session:'));
      if (seedSerena) {
        console.log(chalk.cyan(`  activate_project("${mcpConfig.serena.projectName}")`));
      }
      if (seedGraphiti) {
        console.log(chalk.cyan(`  # After importing seed file:`));
        console.log(chalk.cyan(`  search_memory_facts("project overview", group_ids=["${mcpConfig.graphiti.groupId}"])`));
      }
      console.log('');
    });
}

/**
 * Seed episodes to Graphiti by creating a seed file
 *
 * Graphiti uses MCP protocol (not HTTP REST API), so we generate a seed file
 * that contains all extracted knowledge. Users can then import this using
 * Claude's add_memory tool calls.
 */
async function seedGraphitiEpisodes(
  episodes: KnowledgeEpisode[],
  groupId: string,
  projectPath: string
): Promise<{ success: number; seedFilePath: string }> {
  // Escape groupId for safe inclusion in instructions (prevent quote injection)
  const escapedGroupId = JSON.stringify(groupId).slice(1, -1); // Remove surrounding quotes from JSON

  const seedFile = {
    groupId,
    projectPath,
    episodes: episodes.map(e => ({
      name: e.name,
      body: e.body,
      source: e.source,
      sourceType: e.sourceType,
    })),
    createdAt: new Date().toISOString(),
    instructions: `
To import this knowledge into Graphiti, use add_memory in your Claude session:

For each episode, run:
  add_memory(
    name="<episode.name>",
    episode_body="<episode.body>",
    group_id="${escapedGroupId}"
  )

Or use this Claude prompt:
  "Read .graphiti-seed.json and add each episode to Graphiti using add_memory"
`.trim(),
  };

  const seedFilePath = path.join(projectPath, '.graphiti-seed.json');
  await fs.writeJson(seedFilePath, seedFile, { spaces: 2 });

  return { success: episodes.length, seedFilePath };
}
