/**
 * Skill Pull Command
 *
 * Pull a skill from global ~/.claude/skills/ into current project
 * Allows importing globally deployed skills into project-specific locations
 */

import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import ora from "ora";
import { Command } from "commander";
import { CliContext } from "../../lib/cli-context.js";
import { GlobalSkillsManager } from "../../lib/global-skills-manager.js";
import { recordCLICommand } from "../../lib/telemetry/instrumentation/cli-instrumentation.js";

/**
 * Options for the pull command
 */
interface PullOptions {
  force?: boolean;
  dryRun?: boolean;
}

/**
 * Create the pull command
 */
export function createSkillPullCommand(): Command {
  return new Command("pull")
    .description("Pull skill from global ~/.claude/skills/ into project")
    .argument("<skill-id>", "Skill ID to pull")
    .option("--force", "Overwrite existing project skill")
    .option("--dry-run", "Preview changes without pulling")
    .action(async (skillId: string, options: PullOptions) => {
      const startTime = Date.now();
      let success = false;
      let error: Error | undefined;

      try {
        // Get CLI context
        const ctx = await CliContext.require();

        console.log(
          chalk.blue("\nAgentic Development Framework - Pull Skill\n"),
        );

        // Initialize global skills manager
        const manager = new GlobalSkillsManager();

        // Check if skill exists globally
        const spinner = ora(
          `Checking global skill ${chalk.bold(skillId)}...`,
        ).start();
        const exists = await manager.skillExists(skillId);

        if (!exists) {
          spinner.fail(`Global skill not found: ${chalk.bold(skillId)}`);
          const globalPath = path.join(
            GlobalSkillsManager.getGlobalSkillsPath(),
            skillId,
          );
          console.log(chalk.dim(`\nSearched in: ${globalPath}`));
          console.log(
            chalk.yellow(
              '\nUse "agentic-framework skill list --global" to see available skills.\n',
            ),
          );
          process.exit(1);
        }

        spinner.succeed(`Found global skill ${chalk.bold(skillId)}`);

        // Get skill info for metadata display
        const skillInfo = await manager.getSkillInfo(skillId);

        // Determine source and target paths
        const globalSkillPath = path.join(
          GlobalSkillsManager.getGlobalSkillsPath(),
          skillId,
        );
        const localSkillPath = path.join(
          ctx.projectRoot,
          ".claude",
          "skills",
          skillId,
        );

        // Check if skill already exists locally
        const localExists = await fs.pathExists(localSkillPath);
        if (localExists && !options.force) {
          console.log(
            chalk.yellow(
              `\nSkill ${chalk.bold(skillId)} already exists in project.`,
            ),
          );
          console.log(chalk.dim(`  Location: ${localSkillPath}`));
          console.log(
            chalk.dim("\nUse --force to overwrite existing skill.\n"),
          );
          process.exit(1);
        }

        // Dry run mode
        if (options.dryRun) {
          console.log(chalk.blue("\n[DRY RUN] Would pull skill:"));
          console.log(chalk.dim(`  Skill: ${skillId}`));
          if (skillInfo) {
            console.log(chalk.dim(`  Name: ${skillInfo.name}`));
            console.log(chalk.dim(`  Description: ${skillInfo.description}`));
            console.log(chalk.dim(`  Scope: ${skillInfo.scope}`));
            if (skillInfo.sourceModule) {
              console.log(
                chalk.dim(`  Source Module: ${skillInfo.sourceModule}`),
              );
            }
          }
          console.log(chalk.dim(`  From: ${globalSkillPath}`));
          console.log(chalk.dim(`  To: ${localSkillPath}`));
          if (localExists) {
            console.log(chalk.dim("  Action: overwrite (--force)"));
          } else {
            console.log(chalk.dim("  Action: create"));
          }
          console.log("");
          success = true;
          return;
        }

        // Pull skill
        const pullSpinner = ora(
          `Pulling skill ${chalk.bold(skillId)}...`,
        ).start();
        try {
          // Ensure target directory exists
          await fs.ensureDir(path.dirname(localSkillPath));

          // Copy skill directory from global to project
          await fs.copy(globalSkillPath, localSkillPath, {
            overwrite: true,
            filter: (src: string) => {
              // Filter out .DS_Store files
              return !src.endsWith(".DS_Store");
            },
          });

          pullSpinner.succeed(`Pulled skill ${chalk.bold(skillId)}`);
          console.log(chalk.dim(`  → ${localSkillPath}`));

          // Show skill info
          if (skillInfo) {
            console.log("");
            console.log(chalk.green("Skill Info:"));
            console.log(`  Name: ${skillInfo.name}`);
            console.log(`  Description: ${skillInfo.description}`);
            console.log(`  Scope: ${skillInfo.scope}`);
            if (skillInfo.sourceModule) {
              console.log(`  Source Module: ${skillInfo.sourceModule}`);
            }
            if (skillInfo.capabilities && skillInfo.capabilities.length > 0) {
              console.log(
                `  Capabilities: ${skillInfo.capabilities.join(", ")}`,
              );
            }
          }

          console.log("");
          success = true;
        } catch (err) {
          pullSpinner.fail(`Failed to pull skill ${chalk.bold(skillId)}`);
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
          "pull",
          { force: options.force || false, dryRun: options.dryRun || false },
          { skillId, pulled: success },
          durationMs,
          success,
          error,
        ).catch(() => {
          // Ignore telemetry errors
        });
      }
    });
}
