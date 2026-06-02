/**
 * Framework MCP Tools
 *
 * MCP tool definitions for agentic-framework CLI commands.
 * Provides programmatic access to all framework operations via MCP protocol.
 *
 * @module mcp/tools/framework
 */

import { z } from "zod";
import { defineTool } from "../tool-registry.js";
import { executeAndCapture } from "../result-formatter.js";
import { successResult, errorResult, ErrorCodes } from "../types.js";

// Import command handlers
import { initCommand } from "../../commands/init.js";
import { addCommand } from "../../commands/add.js";
import { removeCommand } from "../../commands/remove.js";
import { listCommand } from "../../commands/list.js";
import { infoCommand } from "../../commands/info.js";
import { validateCommand } from "../../commands/validate.js";
import { updateCommand } from "../../commands/update.js";
import { statusCommand } from "../../commands/status.js";
import { syncCommand } from "../../commands/sync.js";
import { bumpVersion } from "../../commands/bump-version.js";
import { devCommand } from "../../commands/dev.js";

// ============================================================================
// Init Command
// ============================================================================

const InitSchema = z.object({
  projectName: z
    .string()
    .optional()
    .describe("Project name (required in non-interactive mode)"),
  modules: z
    .string()
    .optional()
    .describe(
      'Comma-separated list of modules to install (e.g., "core,coding")',
    ),
  git: z.boolean().default(true).describe("Initialize git repository"),
  interactive: z
    .boolean()
    .default(false)
    .describe("Run in interactive mode (disabled for MCP)"),
});

export const initTool = defineTool(
  "agentic_init",
  "Initialize a new agentic framework project with specified modules",
  InitSchema,
  async (args) => {
    const result = await executeAndCapture(() =>
      initCommand(args.projectName, {
        modules: args.modules,
        git: args.git,
        interactive: false, // Force non-interactive for MCP
      }),
    );

    if (!result.success) {
      return result;
    }
    return successResult(
      {
        projectName: args.projectName,
        modules: args.modules?.split(",") || ["core"],
      },
      "Project initialized successfully",
      result.output,
    );
  },
);

// ============================================================================
// Add Command
// ============================================================================

const AddSchema = z.object({
  moduleName: z
    .string()
    .describe('Name of the module to add (e.g., "jira", "confluence")'),
  path: z.string().default(".").describe("Project path"),
});

export const addTool = defineTool(
  "agentic_add",
  "Add a module to an existing agentic framework project",
  AddSchema,
  async (args) => {
    const result = await executeAndCapture(() =>
      addCommand(args.moduleName, { path: args.path }),
    );

    if (!result.success) {
      return result;
    }
    return successResult(
      { module: args.moduleName, added: true },
      `Module '${args.moduleName}' added successfully`,
      result.output,
    );
  },
);

// ============================================================================
// Remove Command
// ============================================================================

const RemoveSchema = z.object({
  moduleName: z.string().describe("Name of the module to remove"),
  path: z.string().default(".").describe("Project path"),
  force: z
    .boolean()
    .default(true)
    .describe("Skip confirmation prompt (always true for MCP)"),
});

export const removeTool = defineTool(
  "agentic_remove",
  "Remove a module from an agentic framework project",
  RemoveSchema,
  async (args) => {
    const result = await executeAndCapture(() =>
      removeCommand(args.moduleName, {
        path: args.path,
        force: true, // Force for MCP
      }),
    );

    if (!result.success) {
      return result;
    }
    return successResult(
      { module: args.moduleName, removed: true },
      `Module '${args.moduleName}' removed successfully`,
      result.output,
    );
  },
);

// ============================================================================
// List Command
// ============================================================================

const ListSchema = z.object({
  verbose: z
    .boolean()
    .default(false)
    .describe("Show detailed module information"),
});

export const listTool = defineTool(
  "agentic_list",
  "List all available modules in the framework",
  ListSchema,
  async (args) => {
    const result = await executeAndCapture(() =>
      listCommand({ verbose: args.verbose }),
    );

    if (!result.success) {
      return result;
    }
    return successResult({}, "Available modules listed", result.output);
  },
);

// ============================================================================
// Info Command
// ============================================================================

const InfoSchema = z.object({
  moduleName: z
    .string()
    .describe("Name of the module to get information about"),
});

export const infoTool = defineTool(
  "agentic_info",
  "Show detailed information about a specific module",
  InfoSchema,
  async (args) => {
    const result = await executeAndCapture(() => infoCommand(args.moduleName));

    if (!result.success) {
      return result;
    }
    return successResult(
      { module: args.moduleName },
      `Module '${args.moduleName}' information`,
      result.output,
    );
  },
);

// ============================================================================
// Validate Command
// ============================================================================

const ValidateSchema = z.object({
  path: z.string().default(".").describe("Project path"),
  strict: z
    .boolean()
    .default(false)
    .describe("Exit with error on validation failures"),
  json: z.boolean().default(false).describe("Output as JSON"),
  verbose: z
    .boolean()
    .default(false)
    .describe("Show detailed validation information"),
  versions: z
    .boolean()
    .default(false)
    .describe("Validate version consistency only"),
  links: z.boolean().default(false).describe("Validate markdown links only"),
});

export const validateTool = defineTool(
  "agentic_validate",
  "Validate framework integrity including agents, skills, registries, versions, and links",
  ValidateSchema,
  async (args) => {
    const result = await executeAndCapture(() =>
      validateCommand({
        path: args.path,
        strict: args.strict,
        json: args.json,
        verbose: args.verbose,
        versions: args.versions,
        links: args.links,
      }),
    );

    if (!result.success) {
      return errorResult(
        ErrorCodes.VALIDATION_FAILED,
        "Validation failed",
        undefined,
        result.error?.details as string,
      );
    }
    return successResult(
      { validated: true },
      "Validation completed",
      result.output,
    );
  },
);

// ============================================================================
// Update Command
// ============================================================================

const UpdateSchema = z.object({
  path: z.string().default(".").describe("Project path"),
  force: z
    .boolean()
    .default(false)
    .describe("Force update even if version is pinned"),
  dryRun: z
    .boolean()
    .default(false)
    .describe("Preview changes without applying"),
});

export const updateTool = defineTool(
  "agentic_update",
  "Update framework to the latest version",
  UpdateSchema,
  async (args) => {
    const result = await executeAndCapture(() =>
      updateCommand({
        path: args.path,
        force: args.force,
        dryRun: args.dryRun,
      }),
    );

    if (!result.success) {
      return result;
    }
    return successResult(
      { updated: true },
      "Framework updated successfully",
      result.output,
    );
  },
);

// ============================================================================
// Status Command
// ============================================================================

const StatusSchema = z.object({
  path: z.string().default(".").describe("Project path"),
  verbose: z
    .boolean()
    .default(false)
    .describe("Show detailed status including validation"),
  json: z.boolean().default(false).describe("Output as JSON"),
});

export const statusTool = defineTool(
  "agentic_status",
  "Show framework and module status for the current project",
  StatusSchema,
  async (args) => {
    const result = await executeAndCapture(() =>
      statusCommand({
        path: args.path,
        verbose: args.verbose,
        json: args.json,
      }),
    );

    if (!result.success) {
      return result;
    }
    return successResult({}, "Framework status retrieved", result.output);
  },
);

// ============================================================================
// Sync Command
// ============================================================================

const SyncSchema = z.object({
  path: z.string().default(".").describe("Project path"),
  skills: z.boolean().default(false).describe("Sync skills only"),
  agents: z.boolean().default(false).describe("Sync agents only"),
  registries: z.boolean().default(false).describe("Sync registries only"),
  commands: z
    .boolean()
    .default(false)
    .describe("Sync CLI command wrappers only"),
  config: z.boolean().default(false).describe("Sync config files only"),
  dryRun: z
    .boolean()
    .default(false)
    .describe("Preview changes without applying"),
  check: z
    .boolean()
    .default(false)
    .describe("Check if sync is needed without making changes"),
  force: z.boolean().default(false).describe("Continue on errors"),
});

export const syncTool = defineTool(
  "agentic_sync",
  "Force re-sync skills, agents, commands, registries, and config files",
  SyncSchema,
  async (args) => {
    const result = await executeAndCapture(() =>
      syncCommand({
        path: args.path,
        skills: args.skills,
        agents: args.agents,
        commands: args.commands,
        registries: args.registries,
        config: args.config,
        resetConfig: false,
        mcp: false,
        resetMcp: false,
        dryRun: args.dryRun,
        check: args.check,
        force: args.force,
      }),
    );

    if (!result.success) {
      return result;
    }
    return successResult(
      { synced: true },
      "Framework synced successfully",
      result.output,
    );
  },
);

// ============================================================================
// Bump Version Command
// ============================================================================

const BumpVersionSchema = z.object({
  projectRoot: z.string().default(".").describe("Project root path"),
  type: z
    .enum(["major", "minor", "patch"])
    .optional()
    .describe("Version bump type"),
  version: z
    .string()
    .optional()
    .describe("Set specific version (X.Y.Z format)"),
  dryRun: z
    .boolean()
    .default(false)
    .describe("Show what would change without modifying files"),
});

export const bumpVersionTool = defineTool(
  "agentic_bump_version",
  "Bump framework version across all modules",
  BumpVersionSchema,
  async (args) => {
    try {
      const result = await bumpVersion({
        projectRoot: args.projectRoot,
        type: args.type,
        version: args.version,
        dryRun: args.dryRun,
      });

      return successResult(
        {
          currentVersion: result.currentVersion,
          newVersion: result.newVersion,
          filesUpdated: result.filesUpdated,
          updatedFiles: result.updatedFiles,
        },
        `Version bumped: ${result.currentVersion} → ${result.newVersion}`,
        `${result.filesUpdated} files ${result.dryRun ? "would be updated" : "updated"}`,
      );
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : "Bump version failed",
        "Check that you are in a framework project and the version format is correct",
      );
    }
  },
);

// ============================================================================
// Build Command
// ============================================================================

const BuildSchema = z.object({
  path: z.string().default(".").describe("Project path"),
  quick: z
    .boolean()
    .default(false)
    .describe("Quick mode: schema validation only (skip links)"),
  externalLinks: z
    .boolean()
    .default(false)
    .describe("Also check external URLs (slower)"),
  emitSchemas: z
    .boolean()
    .default(false)
    .describe("Generate JSON schemas for WebStorm/IDE"),
  schemaDir: z
    .string()
    .optional()
    .describe("Output directory for JSON schemas"),
  json: z.boolean().default(false).describe("Output results as JSON"),
  verbose: z
    .boolean()
    .default(false)
    .describe("Show detailed output with suggestions"),
  ci: z
    .boolean()
    .default(false)
    .describe("CI mode: minimal output, strict exit codes"),
});

export const buildTool = defineTool(
  "agentic_build",
  "Validate framework artifacts with compile-time-like checking (unified validation)",
  BuildSchema,
  async (args) => {
    // Use validate with strict mode as build equivalent
    const result = await executeAndCapture(() =>
      validateCommand({
        path: args.path,
        strict: true,
        json: args.json,
        verbose: args.verbose,
      }),
    );

    if (!result.success) {
      return errorResult(
        ErrorCodes.VALIDATION_FAILED,
        "Build failed",
        undefined,
        result.error?.details as string,
      );
    }
    return successResult(
      { validated: true },
      "Build completed successfully",
      result.output,
    );
  },
);

// ============================================================================
// Dev Command
// ============================================================================

const DevSchema = z.object({
  sync: z.boolean().default(false).describe("Force sync agents and skills"),
  status: z.boolean().default(false).describe("Show current dev setup status"),
  clean: z.boolean().default(false).describe("Remove dev setup"),
  link: z
    .boolean()
    .default(false)
    .describe("Build and install CLI globally (npm link)"),
  unlink: z
    .boolean()
    .default(false)
    .describe("Remove global CLI installation (npm unlink)"),
  build: z
    .boolean()
    .default(true)
    .describe("Skip build step when using --link"),
});

export const devTool = defineTool(
  "agentic_dev",
  "Set up framework for self-development (framework contributors only)",
  DevSchema,
  async (args) => {
    const result = await executeAndCapture(() =>
      devCommand({
        sync: args.sync,
        status: args.status,
        clean: args.clean,
        link: args.link,
        unlink: args.unlink,
        build: args.build,
      }),
    );

    if (!result.success) {
      return result;
    }
    return successResult(
      { devSetup: true },
      "Dev setup completed",
      result.output,
    );
  },
);

// ============================================================================
// Export All Tools
// ============================================================================

export const frameworkTools = [
  initTool,
  addTool,
  removeTool,
  listTool,
  infoTool,
  validateTool,
  updateTool,
  statusTool,
  syncTool,
  bumpVersionTool,
  buildTool,
  devTool,
];
