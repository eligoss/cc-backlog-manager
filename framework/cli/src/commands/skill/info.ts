/**
 * Skill Info Command
 *
 * Show detailed information about a skill (project or global)
 */

import chalk from "chalk";
import path from "path";
import fs from "fs-extra";
import { Command } from "commander";
import { CliContext } from "../../lib/cli-context.js";
import { GlobalSkillsManager } from "../../lib/global-skills-manager.js";
import { recordCLICommand } from "../../lib/telemetry/instrumentation/cli-instrumentation.js";

/**
 * Options for the info command
 */
interface InfoOptions {
  global?: boolean;
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
 * Display information about a global skill
 * @param manager - GlobalSkillsManager instance
 * @param skillId - Skill ID
 */
async function displayGlobalSkillInfo(
  manager: GlobalSkillsManager,
  skillId: string,
): Promise<void> {
  const skillInfo = await manager.getSkillInfo(skillId);

  if (!skillInfo) {
    console.error(
      chalk.red(`\nGlobal skill not found: ${chalk.bold(skillId)}\n`),
    );
    console.log(
      "Use " +
        chalk.cyan("agentic-framework skill list --global") +
        " to see available global skills.\n",
    );
    process.exit(1);
  }

  const globalSkillsPath = GlobalSkillsManager.getGlobalSkillsPath();
  const skillPath = path.join(globalSkillsPath, skillId);

  console.log(chalk.blue(`\nGlobal Skill: ${chalk.bold(skillId)}`));
  console.log(chalk.dim("─".repeat(50)));
  console.log("");

  console.log(chalk.blue("Name:         ") + chalk.cyan(skillInfo.name));
  console.log(chalk.blue("Description:  ") + chalk.cyan(skillInfo.description));
  console.log(chalk.blue("Scope:        ") + chalk.cyan(skillInfo.scope));
  console.log(
    chalk.blue("Module:       ") + chalk.cyan(skillInfo.sourceModule),
  );
  console.log("");

  console.log(chalk.blue("Deployment Info:"));
  console.log(
    chalk.blue("  Deployed from: ") + chalk.dim(skillInfo.deployedFrom),
  );
  console.log(
    chalk.blue("  Deployed at:   ") +
      chalk.dim(new Date(skillInfo.deployedAt).toLocaleString()),
  );
  console.log("");

  if (skillInfo.capabilities && skillInfo.capabilities.length > 0) {
    console.log(chalk.blue("Capabilities:"));
    for (const capability of skillInfo.capabilities) {
      console.log(chalk.cyan(`  - ${capability}`));
    }
    console.log("");
  }

  console.log(chalk.blue("Location:"));
  console.log(chalk.dim(`  ${skillPath}/`));
  console.log("");

  // List files in skill directory
  try {
    const files = await fs.readdir(skillPath);
    const skillFiles = files.filter((f) => !f.startsWith("."));

    if (skillFiles.length > 0) {
      console.log(chalk.blue("Files:"));
      for (const file of skillFiles) {
        console.log(chalk.cyan(`  - ${file}`));
      }
      console.log("");
    }
  } catch (_error) {
    // Ignore errors reading directory
  }
}

/**
 * Display information about a project skill
 * @param ctx - CLI context
 * @param skillId - Skill ID
 * @param manager - GlobalSkillsManager instance
 */
async function displayProjectSkillInfo(
  ctx: CliContext,
  skillId: string,
  manager: GlobalSkillsManager,
): Promise<void> {
  const skillPath = await findSkillInProject(ctx, skillId);

  if (!skillPath) {
    console.error(
      chalk.red(`\nProject skill not found: ${chalk.bold(skillId)}\n`),
    );
    console.log(chalk.dim("Searched in:"));
    console.log(chalk.dim(`  .claude/skills/${skillId}/`));
    console.log(chalk.dim(`  .claude/skills/project/${skillId}/\n`));
    console.log(
      "Use " +
        chalk.cyan("agentic-framework skill list") +
        " to see available skills.\n",
    );
    process.exit(1);
  }

  // Parse SKILL.md frontmatter
  const skillMdPath = path.join(skillPath, "SKILL.md");
  const content = await fs.readFile(skillMdPath, "utf-8");
  const metadata = parseSkillFrontmatter(content);

  if (!metadata) {
    console.error(
      chalk.red(`\nError: Invalid SKILL.md frontmatter in ${skillMdPath}\n`),
    );
    console.log(
      chalk.dim(
        "Make sure the file has valid YAML frontmatter with required fields: id, scope\n",
      ),
    );
    process.exit(1);
  }

  console.log(chalk.blue(`\nProject Skill: ${chalk.bold(skillId)}`));
  console.log(chalk.dim("─".repeat(50)));
  console.log("");

  console.log(chalk.blue("Name:         ") + chalk.cyan(metadata.name));
  console.log(chalk.blue("Description:  ") + chalk.cyan(metadata.description));
  console.log(chalk.blue("Scope:        ") + chalk.cyan(metadata.scope));
  if (metadata.module) {
    console.log(chalk.blue("Module:       ") + chalk.cyan(metadata.module));
  }
  console.log("");

  if (
    metadata.capabilitiesProvided &&
    metadata.capabilitiesProvided.length > 0
  ) {
    console.log(chalk.blue("Capabilities:"));
    for (const capability of metadata.capabilitiesProvided) {
      console.log(chalk.cyan(`  - ${capability}`));
    }
    console.log("");
  }

  console.log(chalk.blue("Location:"));
  console.log(chalk.dim(`  ${skillPath}/`));
  console.log("");

  // List files in skill directory
  try {
    const files = await fs.readdir(skillPath);
    const skillFiles = files.filter((f) => !f.startsWith("."));

    if (skillFiles.length > 0) {
      console.log(chalk.blue("Files:"));
      for (const file of skillFiles) {
        console.log(chalk.cyan(`  - ${file}`));
      }
      console.log("");
    }
  } catch (_error) {
    // Ignore errors reading directory
  }

  // Check if also deployed globally
  const isGlobal = await manager.skillExists(skillId);
  if (isGlobal) {
    console.log(chalk.green("✓ Also installed globally"));
    console.log(
      chalk.dim(
        `  Use ${chalk.cyan("--global")} flag to view global installation details\n`,
      ),
    );
  }
}

/**
 * Create the info command
 */
export function createSkillInfoCommand(): Command {
  return new Command("info")
    .description("Show skill details")
    .argument("<skill-id>", "Skill ID")
    .option("--global", "Show info for globally installed skill")
    .action(async (skillId: string, options: InfoOptions) => {
      const startTime = Date.now();
      let success = false;
      let found = false;
      let error: Error | undefined;

      try {
        const manager = new GlobalSkillsManager();

        console.log(
          chalk.blue("\nAgentic Development Framework - Skill Info\n"),
        );

        if (options.global) {
          // Show global skill info
          await displayGlobalSkillInfo(manager, skillId);
          found = true;
        } else {
          // Show project skill info
          const ctx = await CliContext.require();
          await displayProjectSkillInfo(ctx, skillId, manager);
          found = true;
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
          "info",
          { global: options.global || false },
          { skillId, found },
          durationMs,
          success,
          error,
        ).catch(() => {
          // Ignore telemetry errors
        });
      }
    });
}
