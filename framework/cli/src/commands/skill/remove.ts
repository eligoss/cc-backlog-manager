/**
 * Skill Remove Command
 *
 * Remove skills from global ~/.claude/skills/
 * Provides confirmation prompt unless --force flag is used.
 */

import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { Command } from "commander";
import { GlobalSkillsManager } from "../../lib/global-skills-manager.js";
import { recordCLICommand } from "../../lib/telemetry/instrumentation/cli-instrumentation.js";

/**
 * Options for the remove command
 */
interface RemoveOptions {
  force?: boolean;
}

/**
 * Create the remove command
 */
export function createSkillRemoveCommand(): Command {
  return new Command("remove")
    .description("Remove skill from global ~/.claude/skills/")
    .argument("<skill-id>", "Skill ID to remove")
    .option("--force", "Skip confirmation prompt")
    .action(async (skillId: string, options: RemoveOptions) => {
      const startTime = Date.now();
      let success = false;
      let error: Error | undefined;

      try {
        console.log(
          chalk.blue("\nAgentic Development Framework - Remove Global Skill\n"),
        );

        // Initialize global skills manager
        const manager = new GlobalSkillsManager();

        // Check if skill exists
        const exists = await manager.skillExists(skillId);
        if (!exists) {
          console.error(
            chalk.red(`Global skill not found: ${chalk.bold(skillId)}\n`),
          );
          console.log(
            chalk.dim(
              'Use "agentic-framework skill list" to see deployed skills.\n',
            ),
          );
          process.exit(1);
        }

        // Get skill info to display details
        const skillInfo = await manager.getSkillInfo(skillId);
        if (!skillInfo) {
          console.error(
            chalk.red(
              `Failed to retrieve skill information for: ${chalk.bold(skillId)}\n`,
            ),
          );
          process.exit(1);
        }

        // Show skill details
        console.log(chalk.blue("About to remove global skill:\n"));
        console.log(`  ${chalk.bold("ID:")} ${skillInfo.id}`);
        console.log(`  ${chalk.bold("Name:")} ${skillInfo.name}`);
        console.log(`  ${chalk.bold("Description:")} ${skillInfo.description}`);
        console.log(
          `  ${chalk.bold("Deployed from:")} ${chalk.dim(skillInfo.deployedFrom)}`,
        );
        console.log(
          `  ${chalk.bold("Deployed at:")} ${chalk.dim(new Date(skillInfo.deployedAt).toLocaleDateString())}`,
        );
        console.log("");

        // Confirmation prompt (unless --force)
        if (!options.force) {
          // Check if running in TTY (interactive terminal)
          if (!process.stdin.isTTY) {
            console.error(chalk.red("Interactive confirmation requires TTY"));
            console.error(chalk.dim("Use --force flag to skip confirmation\n"));
            process.exit(1);
          }

          const { confirm } = await inquirer.prompt([
            {
              type: "confirm",
              name: "confirm",
              message: "Remove this global skill?",
              default: false,
            },
          ]);

          if (!confirm) {
            console.log(chalk.yellow("\nRemoval cancelled.\n"));
            success = true;
            return;
          }
        }

        // Remove skill
        const spinner = ora(`Removing skill ${chalk.bold(skillId)}...`).start();
        try {
          await manager.removeSkill(skillId);
          spinner.succeed(`Removed skill ${chalk.bold(skillId)}`);
          console.log(chalk.green("\n✓ Skill removed successfully!\n"));
          success = true;
        } catch (err) {
          spinner.fail(`Failed to remove skill ${chalk.bold(skillId)}`);
          throw err;
        }
      } catch (err) {
        error = err instanceof Error ? err : new Error(String(err));
        console.error(chalk.red(`\nError: ${error.message}\n`));
        process.exit(1);
      } finally {
        // Record telemetry
        const durationMs = Date.now() - startTime;
        recordCLICommand(
          "skill",
          "remove",
          { force: options.force || false },
          { skillId, removed: success },
          durationMs,
          success,
          error,
        ).catch(() => {
          // Ignore telemetry errors
        });
      }
    });
}
