/**
 * Skill Deploy Command
 *
 * Deploy skills from current project to global ~/.claude/skills/
 * Only generic-scope skills can be deployed globally.
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
 * Options for the deploy command
 */
interface DeployOptions {
  force?: boolean;
  dryRun?: boolean;
  all?: boolean;
}

/**
 * Skill metadata parsed from SKILL.md frontmatter
 */
interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  scope: string;
  module?: string;
  capabilitiesProvided?: string[];
}

/**
 * Parse YAML frontmatter from SKILL.md file
 * @param content - Full content of SKILL.md file
 * @returns Parsed metadata or null if invalid
 */
function parseSkillFrontmatter(content: string): SkillMetadata | null {
  // Extract frontmatter between --- markers
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return null;
  }

  const frontmatter = frontmatterMatch[1];
  const metadata: Partial<SkillMetadata> = {};

  // Parse simple YAML format (key: value)
  const lines = frontmatter.split("\n");
  let currentKey: string | null = null;
  const capabilitiesProvided: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Handle list items (capabilities-provided)
    if (trimmed.startsWith("-")) {
      if (currentKey === "capabilities-provided") {
        capabilitiesProvided.push(trimmed.substring(1).trim());
      }
      continue;
    }

    // Handle key-value pairs
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex > 0) {
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      currentKey = key;

      if (key === "id") {
        metadata.id = value;
      } else if (key === "name") {
        metadata.name = value;
      } else if (key === "description") {
        metadata.description = value;
      } else if (key === "scope") {
        metadata.scope = value;
      } else if (key === "module") {
        metadata.module = value;
      }
    }
  }

  if (capabilitiesProvided.length > 0) {
    metadata.capabilitiesProvided = capabilitiesProvided;
  }

  // Validate required fields
  if (!metadata.id || !metadata.scope) {
    return null;
  }

  return metadata as SkillMetadata;
}

/**
 * Find skill directory in project
 * @param ctx - CLI context
 * @param skillId - Skill ID to find
 * @returns Absolute path to skill directory, or null if not found
 */
async function findSkillInProject(
  ctx: CliContext,
  skillId: string,
): Promise<string | null> {
  // Check .claude/skills/{skill-id}/
  const claudeSkillPath = path.join(
    ctx.projectRoot,
    ".claude",
    "skills",
    skillId,
  );
  if (await fs.pathExists(path.join(claudeSkillPath, "SKILL.md"))) {
    return claudeSkillPath;
  }

  // Check .claude/skills/project/{skill-id}/
  const projectSkillPath = path.join(
    ctx.projectRoot,
    ".claude",
    "skills",
    "project",
    skillId,
  );
  if (await fs.pathExists(path.join(projectSkillPath, "SKILL.md"))) {
    return projectSkillPath;
  }

  return null;
}

/**
 * Find all generic-scope skills in project
 * @param ctx - CLI context
 * @returns Array of {skillId, path, metadata} objects
 */
async function findAllGenericSkills(
  ctx: CliContext,
): Promise<Array<{ skillId: string; path: string; metadata: SkillMetadata }>> {
  const skills: Array<{
    skillId: string;
    path: string;
    metadata: SkillMetadata;
  }> = [];

  // Search .claude/skills/
  const claudeSkillsDir = path.join(ctx.projectRoot, ".claude", "skills");
  if (await fs.pathExists(claudeSkillsDir)) {
    const entries = await fs.readdir(claudeSkillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(claudeSkillsDir, entry.name);
        const skillMdPath = path.join(skillPath, "SKILL.md");
        if (await fs.pathExists(skillMdPath)) {
          const content = await fs.readFile(skillMdPath, "utf-8");
          const metadata = parseSkillFrontmatter(content);
          if (metadata && metadata.scope === "generic") {
            skills.push({ skillId: entry.name, path: skillPath, metadata });
          }
        }
      }
    }
  }

  // Search .claude/skills/project/
  const projectSkillsDir = path.join(
    ctx.projectRoot,
    ".claude",
    "skills",
    "project",
  );
  if (await fs.pathExists(projectSkillsDir)) {
    const entries = await fs.readdir(projectSkillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(projectSkillsDir, entry.name);
        const skillMdPath = path.join(skillPath, "SKILL.md");
        if (await fs.pathExists(skillMdPath)) {
          const content = await fs.readFile(skillMdPath, "utf-8");
          const metadata = parseSkillFrontmatter(content);
          if (metadata && metadata.scope === "generic") {
            skills.push({ skillId: entry.name, path: skillPath, metadata });
          }
        }
      }
    }
  }

  return skills;
}

/**
 * Deploy a single skill to global location
 * @param manager - GlobalSkillsManager instance
 * @param skillId - Skill ID
 * @param skillPath - Absolute path to skill directory
 * @param metadata - Parsed skill metadata
 * @param ctx - CLI context
 * @param options - Deploy options
 * @returns true if deployed, false if skipped
 */
async function deploySkill(
  manager: GlobalSkillsManager,
  skillId: string,
  skillPath: string,
  metadata: SkillMetadata,
  ctx: CliContext,
  options: DeployOptions,
): Promise<boolean> {
  // Check if skill already exists globally
  const exists = await manager.skillExists(skillId);
  if (exists && !options.force) {
    console.log(
      chalk.yellow(`\nSkill ${chalk.bold(skillId)} already exists globally.`),
    );
    console.log(chalk.dim("Use --force to overwrite existing skill.\n"));
    return false;
  }

  // Dry run mode
  if (options.dryRun) {
    console.log(
      chalk.blue(`\n[DRY RUN] Would deploy skill: ${chalk.bold(skillId)}`),
    );
    console.log(chalk.dim(`  From: ${skillPath}`));
    console.log(
      chalk.dim(
        `  To: ${path.join(GlobalSkillsManager.getGlobalSkillsPath(), skillId)}`,
      ),
    );
    console.log(chalk.dim(`  Scope: ${metadata.scope}`));
    if (exists) {
      console.log(chalk.dim("  Action: overwrite (--force)"));
    } else {
      console.log(chalk.dim("  Action: create"));
    }
    return true;
  }

  // Deploy skill
  const spinner = ora(`Deploying skill ${chalk.bold(skillId)}...`).start();
  try {
    await manager.deploySkill(skillPath, skillId, {
      name: metadata.name,
      description: metadata.description,
      scope: metadata.scope,
      sourceModule: metadata.module || "unknown",
      deployedFrom: ctx.projectRoot,
      capabilities: metadata.capabilitiesProvided,
    });

    const globalPath = path.join(
      GlobalSkillsManager.getGlobalSkillsPath(),
      skillId,
    );
    spinner.succeed(`Deployed skill ${chalk.bold(skillId)}`);
    console.log(chalk.dim(`  → ${globalPath}\n`));
    return true;
  } catch (error) {
    spinner.fail(`Failed to deploy skill ${chalk.bold(skillId)}`);
    throw error;
  }
}

/**
 * Create the deploy command
 */
export function createSkillDeployCommand(): Command {
  return new Command("deploy")
    .description("Deploy skill to global ~/.claude/skills/")
    .argument("[skill-id]", "Skill ID to deploy (or use --all)")
    .option("--force", "Overwrite existing global skill")
    .option("--dry-run", "Preview changes without deploying")
    .option("--all", "Deploy all generic-scope skills")
    .action(async (skillId: string | undefined, options: DeployOptions) => {
      const startTime = Date.now();
      let success = false;
      let deployedCount = 0;
      let error: Error | undefined;

      try {
        // Get CLI context
        const ctx = await CliContext.require();

        console.log(
          chalk.blue("\nAgentic Development Framework - Deploy Skills\n"),
        );

        // Validate arguments
        if (!skillId && !options.all) {
          console.error(
            chalk.red("Error: Either provide a skill-id or use --all flag\n"),
          );
          console.log("Usage:");
          console.log("  agentic-framework skill deploy <skill-id>");
          console.log("  agentic-framework skill deploy --all\n");
          process.exit(1);
        }

        if (skillId && options.all) {
          console.error(
            chalk.red(
              "Error: Cannot use both skill-id argument and --all flag\n",
            ),
          );
          process.exit(1);
        }

        // Initialize global skills manager
        const manager = new GlobalSkillsManager();

        // Deploy all generic skills
        if (options.all) {
          const spinner = ora("Finding generic-scope skills...").start();
          const allSkills = await findAllGenericSkills(ctx);
          spinner.succeed(`Found ${allSkills.length} generic-scope skill(s)`);

          if (allSkills.length === 0) {
            console.log(
              chalk.yellow("\nNo generic-scope skills found in project.\n"),
            );
            success = true;
            return;
          }

          // Show skills to be deployed
          console.log(chalk.yellow("\nSkills to deploy:\n"));
          for (const skill of allSkills) {
            console.log(
              `  ${chalk.green("✓")} ${chalk.bold(skill.skillId)} ${chalk.dim(`(${skill.metadata.module || "unknown"})`)}`,
            );
          }

          if (options.dryRun) {
            console.log(chalk.blue("\n[DRY RUN] No changes will be made\n"));
            for (const skill of allSkills) {
              await deploySkill(
                manager,
                skill.skillId,
                skill.path,
                skill.metadata,
                ctx,
                options,
              );
            }
            success = true;
            return;
          }

          // Deploy each skill
          console.log("");
          let deployed = 0;
          let skipped = 0;

          for (const skill of allSkills) {
            const result = await deploySkill(
              manager,
              skill.skillId,
              skill.path,
              skill.metadata,
              ctx,
              options,
            );
            if (result) {
              deployed++;
            } else {
              skipped++;
            }
          }

          deployedCount = deployed;

          // Summary
          console.log(chalk.green("✓ Deployment complete!\n"));
          console.log("Summary:");
          console.log(`  Deployed: ${chalk.cyan(deployed)}`);
          if (skipped > 0) {
            console.log(
              `  Skipped: ${chalk.yellow(skipped)} (use --force to overwrite)`,
            );
          }
          console.log("");

          success = true;
          return;
        }

        // Deploy single skill
        const spinner = ora(`Finding skill ${chalk.bold(skillId)}...`).start();
        const skillPath = await findSkillInProject(ctx, skillId ?? "");

        if (!skillPath) {
          spinner.fail(`Skill not found: ${chalk.bold(skillId)}`);
          console.log(chalk.dim("\nSearched in:"));
          console.log(chalk.dim(`  .claude/skills/${skillId}/`));
          console.log(chalk.dim(`  .claude/skills/project/${skillId}/\n`));
          console.log(
            chalk.yellow(
              "Make sure the skill exists and contains a SKILL.md file.\n",
            ),
          );
          process.exit(1);
        }

        spinner.succeed(`Found skill ${chalk.bold(skillId)}`);

        // Parse SKILL.md frontmatter
        const skillMdPath = path.join(skillPath, "SKILL.md");
        const content = await fs.readFile(skillMdPath, "utf-8");
        const metadata = parseSkillFrontmatter(content);

        if (!metadata) {
          console.error(
            chalk.red(
              `\nError: Invalid SKILL.md frontmatter in ${skillMdPath}`,
            ),
          );
          console.log(
            chalk.dim(
              "Make sure the file has valid YAML frontmatter with required fields: id, scope\n",
            ),
          );
          process.exit(1);
        }

        // STRICT scope enforcement
        if (metadata.scope !== "generic") {
          console.error(
            chalk.red(
              `\nError: Cannot deploy project-specific skill globally.`,
            ),
          );
          console.log(
            chalk.yellow(
              `\nSkill ${chalk.bold(skillId)} has scope: ${chalk.bold(metadata.scope)}`,
            ),
          );
          console.log(
            chalk.dim(
              "Only generic-scope skills can be deployed to ~/.claude/skills/",
            ),
          );
          console.log(
            chalk.dim(
              "\nProject-specific skills are meant to stay within the project context.\n",
            ),
          );
          process.exit(1);
        }

        // Deploy the skill
        const result = await deploySkill(
          manager,
          skillId ?? "",
          skillPath,
          metadata,
          ctx,
          options,
        );
        if (result) {
          deployedCount = 1;
        }

        success = true;
      } catch (err) {
        error = err instanceof Error ? err : new Error(String(err));
        console.error(chalk.red(`\nError: ${error.message}\n`));
        process.exit(1);
      } finally {
        // Record telemetry
        const durationMs = Date.now() - startTime;
        recordCLICommand(
          "skill",
          "deploy",
          {
            force: options.force || false,
            dryRun: options.dryRun || false,
            all: options.all || false,
          },
          { skillId, deployed: deployedCount },
          durationMs,
          success,
          error,
        ).catch(() => {
          // Ignore telemetry errors
        });
      }
    });
}
