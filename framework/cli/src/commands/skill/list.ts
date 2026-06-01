/**
 * Skill List Command
 *
 * List skills - project skills by default, global skills with --global flag
 */

import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import { Command } from "commander";
import { CliContext } from "../../lib/cli-context.js";
import { GlobalSkillsManager } from "../../lib/global-skills-manager.js";
import { recordCLICommand } from "../../lib/telemetry/instrumentation/cli-instrumentation.js";

/**
 * Options for the list command
 */
interface ListOptions {
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
}

/**
 * Project skill entry
 */
interface ProjectSkill {
  id: string;
  scope: string;
  module: string;
  path: string;
  isGlobal: boolean;
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

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Skip list items
    if (trimmed.startsWith("-")) continue;

    // Handle key-value pairs
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex > 0) {
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();

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

  // Validate required fields
  if (!metadata.id || !metadata.scope) {
    return null;
  }

  return metadata as SkillMetadata;
}

/**
 * Find all project skills
 * @param ctx - CLI context
 * @returns Array of ProjectSkill objects
 */
async function findAllProjectSkills(ctx: CliContext): Promise<ProjectSkill[]> {
  const skills: ProjectSkill[] = [];
  const manager = new GlobalSkillsManager();

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
          if (metadata) {
            const isGlobal = await manager.skillExists(metadata.id);
            skills.push({
              id: metadata.id,
              scope: metadata.scope,
              module: metadata.module || "unknown",
              path: skillPath,
              isGlobal,
            });
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
          if (metadata) {
            const isGlobal = await manager.skillExists(metadata.id);
            skills.push({
              id: metadata.id,
              scope: metadata.scope,
              module: metadata.module || "unknown",
              path: skillPath,
              isGlobal,
            });
          }
        }
      }
    }
  }

  return skills;
}

/**
 * Pad string to fixed width
 */
function padRight(str: string, width: number): string {
  return str + " ".repeat(Math.max(0, width - str.length));
}

/**
 * Display global skills in table format
 */
async function displayGlobalSkills(): Promise<number> {
  const manager = new GlobalSkillsManager();
  const skills = await manager.listSkills();

  console.log(
    chalk.blue(
      `Global Skills (${GlobalSkillsManager.getGlobalSkillsPath()}):\n`,
    ),
  );

  if (skills.length === 0) {
    console.log(chalk.yellow("No global skills installed.\n"));
    console.log(
      chalk.dim(
        "Deploy skills using: agentic-framework skill deploy <skill-id>\n",
      ),
    );
    return 0;
  }

  // Calculate column widths
  const idWidth = Math.max(20, ...skills.map((s) => s.id.length));
  const moduleWidth = Math.max(10, ...skills.map((s) => s.sourceModule.length));

  // Header
  console.log(
    chalk.bold(padRight("ID", idWidth)) +
      "  " +
      chalk.bold(padRight("Module", moduleWidth)) +
      "  " +
      chalk.bold("Deployed"),
  );
  console.log(chalk.dim("─".repeat(idWidth + moduleWidth + 22)));

  // Rows
  for (const skill of skills) {
    const deployedDate = new Date(skill.deployedAt).toISOString().split("T")[0];
    console.log(
      padRight(skill.id, idWidth) +
        "  " +
        padRight(skill.sourceModule, moduleWidth) +
        "  " +
        chalk.dim(deployedDate),
    );
  }

  console.log("");
  return skills.length;
}

/**
 * Display project skills in table format
 */
async function displayProjectSkills(ctx: CliContext): Promise<number> {
  const skills = await findAllProjectSkills(ctx);

  console.log(chalk.blue("Project Skills:\n"));

  if (skills.length === 0) {
    console.log(chalk.yellow("No project skills found.\n"));
    console.log(chalk.dim("Create skills in:"));
    console.log(chalk.dim("  .claude/skills/{skill-id}/SKILL.md"));
    console.log(chalk.dim("  .claude/skills/project/{skill-id}/SKILL.md\n"));
    return 0;
  }

  // Calculate column widths
  const idWidth = Math.max(25, ...skills.map((s) => s.id.length));
  const scopeWidth = Math.max(15, ...skills.map((s) => s.scope.length));
  const moduleWidth = Math.max(10, ...skills.map((s) => s.module.length));

  // Header
  console.log(
    chalk.bold(padRight("ID", idWidth)) +
      "  " +
      chalk.bold(padRight("Scope", scopeWidth)) +
      "  " +
      chalk.bold(padRight("Module", moduleWidth)) +
      "  " +
      chalk.bold("Global"),
  );
  console.log(chalk.dim("─".repeat(idWidth + scopeWidth + moduleWidth + 12)));

  // Rows
  for (const skill of skills) {
    const globalIndicator = skill.isGlobal ? chalk.green("✓") : "";
    console.log(
      padRight(skill.id, idWidth) +
        "  " +
        padRight(skill.scope, scopeWidth) +
        "  " +
        padRight(skill.module, moduleWidth) +
        "  " +
        globalIndicator,
    );
  }

  console.log("");
  return skills.length;
}

/**
 * Create the list command
 */
export function createSkillListCommand(): Command {
  return new Command("list")
    .description("List skills (project or global)")
    .option("--global", "List globally installed skills")
    .action(async (options: ListOptions) => {
      const startTime = Date.now();
      let success = false;
      let count = 0;
      let error: Error | undefined;

      try {
        console.log(
          chalk.blue("\nAgentic Development Framework - List Skills\n"),
        );

        if (options.global) {
          // List global skills
          count = await displayGlobalSkills();
        } else {
          // List project skills
          const ctx = await CliContext.require();
          count = await displayProjectSkills(ctx);
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
          "list",
          { global: options.global || false },
          { count },
          durationMs,
          success,
          error,
        ).catch(() => {
          // Ignore telemetry errors
        });
      }
    });
}
