#!/usr/bin/env node
import { Command } from "commander";
import { createRequire } from "module";
import chalk from "chalk";
import { ProjectNotFoundError } from "./lib/cli-context.js";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json");
import { initCommand } from "./commands/init.js";
import { addCommand } from "./commands/add.js";
import { removeCommand } from "./commands/remove.js";
import { listCommand } from "./commands/list.js";
import { infoCommand } from "./commands/info.js";
import { validateCommand } from "./commands/validate.js";
import { updateCommand } from "./commands/update.js";
import { statusCommand } from "./commands/status.js";
import { syncCommand } from "./commands/sync.js";
import { createDevCommand } from "./commands/dev.js";
import { createAgentCommand } from "./commands/agent/index.js";
import { createImportJiraCommand } from "./commands/backlog/import-jira.js";
import { createUpdateFieldsCommand } from "./commands/backlog/update-fields.js";
import { createValidateCommand } from "./commands/backlog/validate.js";
import { createMigrateMilestonesCommand } from "./commands/backlog/migrate-milestones.js";
import { createCreateTicketCommand } from "./commands/backlog/create-ticket.js";
import { createPullCommand } from "./commands/backlog/pull.js";
import { createDiffCommand } from "./commands/backlog/diff.js";
import { createPushCommand } from "./commands/backlog/push.js";
import { createPushVersionCommand } from "./commands/backlog/push-version.js";
import { createPushSprintCommand } from "./commands/backlog/push-sprint.js";
import { createCreatePageCommand } from "./commands/confluence/create-page.js";
import { createFetchPageCommand } from "./commands/confluence/fetch-page.js";
import { createImportReportsCommand } from "./commands/confluence/import-reports.js";
import { createValidateConfluenceCommand } from "./commands/confluence/validate.js";
import { createCreatePlanCommand } from "./commands/planning/create-plan.js";
import { createValidatePlanCommand } from "./commands/planning/validate-plan.js";
import { createTemplateCommandGroup } from "./commands/template/index.js";
import { createCreateAgentCommand } from "./commands/create-agent.js";
import { createCreateSkillCommand } from "./commands/create-skill.js";
import { createCreateModuleCommand } from "./commands/create-module.js";
import { createSkillCommand } from "./commands/skill/index.js";
import { createBuildCommand } from "./commands/build.js";
import { createGenerateCommandsCommand } from "./commands/generate-commands.js";
import { createGenerateAgentsCommand } from "./commands/generate-agents.js";
import { createTestCommand } from "./commands/test.js";
import { createMcpCommand } from "./commands/mcp/index.js";

const program = new Command();

// Commander 14 colored help output
program.configureHelp({
  styleTitle: (str) => chalk.bold.cyan(str),
  styleCommandText: (str) => chalk.green(str),
  styleCommandDescription: (str) => chalk.dim(str),
  styleDescriptionText: (str) => str,
  styleOptionText: (str) => chalk.yellow(str),
  styleArgumentText: (str) => chalk.magenta(str),
  styleSubcommandText: (str) => chalk.green(str),
});

program
  .name("agentic-framework")
  .description(
    "CLI for scaffolding and managing Agentic Development Framework projects",
  )
  .version(packageJson.version);

program
  .command("init [project-name]")
  .description(
    "Initialize a new project with selected modules (interactive wizard by default)",
  )
  .option("--no-interactive", "Skip interactive wizard (requires project-name)")
  .option(
    "-m, --modules <modules>",
    "Comma-separated list of modules (non-interactive mode)",
  )
  .option("--no-git", "Skip git initialization")
  .option("--with-mcp", "Enable both Graphiti and Serena MCP integrations")
  .option("--with-graphiti", "Enable Graphiti only (knowledge graph memory)")
  .option("--with-serena", "Enable Serena only (semantic code navigation)")
  .option(
    "--graphiti-group-id <id>",
    "Custom Graphiti group ID (default: project-name)",
  )
  .option(
    "--serena-project <name>",
    "Custom Serena project name (default: project-name)",
  )
  .option(
    "--serena-language <lang>",
    "Primary language for Serena (default: typescript)",
  )
  .action(initCommand);

program
  .command("add <module>")
  .description("Add a module to an existing project")
  .option("-p, --path <path>", "Project path", ".")
  .action(addCommand);

program
  .command("remove <module>")
  .description("Remove a module from a project")
  .option("-p, --path <path>", "Project path", ".")
  .option("-f, --force", "Force removal without confirmation")
  .option(
    "-n, --dry-run",
    "Preview what would be removed without making changes",
  )
  .action(removeCommand);

program
  .command("list")
  .description("List all available modules")
  .option("-v, --verbose", "Show detailed module information")
  .action(listCommand);

program
  .command("info <module>")
  .description("Show detailed information about a module")
  .action(infoCommand);

program
  .command("validate")
  .description("Validate framework integrity")
  .option("-p, --path <path>", "Project path", ".")
  .option("--strict", "Exit with error code on validation failures")
  .option("--json", "Output results as JSON")
  .option("-v, --verbose", "Show detailed validation information")
  .option("--versions", "Validate version consistency only")
  .option("--links", "Validate markdown links only")
  .action(validateCommand);

// Build command - unified validation with compile-time-like checking
program.addCommand(createBuildCommand());

program
  .command("update")
  .description("Update framework to latest version")
  .option("-p, --path <path>", "Project path", ".")
  .option("-f, --force", "Force update even if version is pinned")
  .option("-n, --dry-run", "Preview changes without applying")
  .action(updateCommand);

program
  .command("status")
  .description("Show framework and module status")
  .option("-p, --path <path>", "Project path", ".")
  .option("-v, --verbose", "Show detailed status information")
  .option("--json", "Output results as JSON")
  .action(statusCommand);

program
  .command("sync")
  .description(
    "Force re-sync skills, agents, commands, registries, and config files",
  )
  .option("-p, --path <path>", "Project path", ".")
  .option("--skills", "Sync skills only")
  .option("--agents", "Sync agents only")
  .option("--commands", "Sync CLI command wrappers only")
  .option("--registries", "Regenerate registries only")
  .option(
    "--config",
    "Sync infrastructure scripts (statusline, hooks - always update) and config files (create if missing, preserve existing)",
  )
  .option(
    "--reset-config",
    "Force reset settings.local.json to latest template (WARNING: overwrites customizations)",
  )
  .option("--mcp", "Include MCP config in sync (Serena project.yml, MCP hooks)")
  .option(
    "--reset-mcp",
    "Reset MCP config to defaults (regenerate from manifest)",
  )
  .option("-n, --dry-run", "Preview changes without applying")
  .option("--check", "Check if sync is needed (exit code 2 if needed)")
  .option("-f, --force", "Continue on errors")
  .action(syncCommand);

// Dev command
program.addCommand(createDevCommand());

// Agent commands (SDK integration)
program.addCommand(createAgentCommand());

// Backlog commands
const backlog = program
  .command("backlog")
  .description("Manage backlog tickets and imports");

backlog.addCommand(createCreateTicketCommand());
backlog.addCommand(createImportJiraCommand());
backlog.addCommand(createUpdateFieldsCommand());
backlog.addCommand(createValidateCommand());
backlog.addCommand(createMigrateMilestonesCommand());
backlog.addCommand(createPullCommand());
backlog.addCommand(createDiffCommand());
backlog.addCommand(createPushCommand());
backlog.addCommand(createPushVersionCommand());
backlog.addCommand(createPushSprintCommand());

// Confluence commands
const confluence = program
  .command("confluence")
  .description("Manage Confluence pages (create, fetch, import)");

confluence.addCommand(createCreatePageCommand());
confluence.addCommand(createFetchPageCommand());
confluence.addCommand(createImportReportsCommand());
confluence.addCommand(createValidateConfluenceCommand());

// Planning commands
const planning = program
  .command("planning")
  .description("Manage planning workflows (create plans, track progress)");

planning.addCommand(createCreatePlanCommand());
planning.addCommand(createValidatePlanCommand());

// Template commands
program.addCommand(createTemplateCommandGroup());

// Skill management commands (deploy, pull, list, remove, info)
program.addCommand(createSkillCommand());

// Create commands for artifacts
program.addCommand(createCreateAgentCommand());
program.addCommand(createCreateSkillCommand());
program.addCommand(createCreateModuleCommand());

// Generate commands (CLI wrappers for Claude slash commands)
program.addCommand(createGenerateCommandsCommand());

// Generate agents (custom agent JSON files for agent variants)
program.addCommand(createGenerateAgentsCommand());

// Test command (supports affected module detection)
program.addCommand(createTestCommand());

// MCP command group (Graphiti, Serena integration)
program.addCommand(createMcpCommand());

// Parse with top-level error handling to suppress stack traces for user-facing errors
try {
  await program.parseAsync();

  // Graceful shutdown: flush telemetry and exit cleanly
  // This ensures process doesn't hang on open handles (telemetry timers, inquirer readline)
  const { TelemetryManager } =
    await import("./lib/telemetry/telemetry-manager.js");
  const telemetry = TelemetryManager.getInstance();
  if (telemetry.isEnabled()) {
    await telemetry.shutdown().catch(() => {});
  }
  process.exit(0);
} catch (error) {
  // Handle ProjectNotFoundError without stack trace
  if (error instanceof ProjectNotFoundError) {
    console.error(`\nError: ${error.message}`);
    console.error(
      '\nRun "agentic-framework init <project-name>" to create a new project.\n',
    );
    process.exit(1);
  }
  // Re-throw unexpected errors
  throw error;
}
