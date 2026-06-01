import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import { ManifestManager, FrameworkManifest } from "../lib/manifest-manager.js";
import {
  loadModule,
  getAvailableModules,
  getFrameworkRoot,
  ModuleManifest,
} from "../lib/module-loader.js";
import { generateRegistries } from "../lib/registry-generator.js";
import { SyncEngine } from "../lib/sync-engine.js";
import { CliContext } from "../lib/cli-context.js";
import { recordCLICommand } from "../lib/telemetry/instrumentation/cli-instrumentation.js";
import { getCliVersion } from "../lib/cli-version.js";

export interface UpdateOptions {
  path: string; // Project path (default: '.')
  force: boolean; // Force update even if pinned
  dryRun: boolean; // Preview changes without applying
}

interface UpdatePlan {
  currentVersion: string;
  latestVersion: string;
  modulesToUpdate: Array<{
    name: string;
    currentVersion: string;
    latestVersion: string;
  }>;
  willUpdate: boolean;
}

/**
 * Update command: Update framework to latest version
 * Preserves project-specific directories (.claude/context, .claude/skills/project)
 * Updates framework-managed files (agents, registries, .claude/*)
 */
export async function updateCommand(options: UpdateOptions): Promise<void> {
  const startTime = Date.now();
  const ctx =
    options.path && options.path !== "."
      ? await CliContext.create({ path: options.path })
      : await CliContext.require();
  const projectPath = ctx.projectRoot;

  console.log(chalk.blue("\nAgentic Development Framework - Update\n"));

  // Step 1: Validate project has manifest
  // Ora 9: discardStdin prevents input twitching during long operations
  const spinner = ora({
    text: "Validating project...",
    discardStdin: true,
  }).start();
  const manifestManager = new ManifestManager(projectPath);

  if (!(await manifestManager.exists())) {
    spinner.fail("Not an agentic framework project");
    console.error(
      chalk.red(`\nError: No .agentic-framework.json found at ${projectPath}`),
    );
    console.log(
      chalk.dim(
        "\nThis directory does not appear to be an agentic framework project.",
      ),
    );
    console.log(
      chalk.dim(
        `Run 'agentic-framework init <project-name>' to create a new project.\n`,
      ),
    );
    process.exit(1);
  }

  let manifest: FrameworkManifest;
  try {
    manifest = await manifestManager.read();
    spinner.succeed("Project validated");
  } catch (error) {
    spinner.fail("Failed to read manifest");
    throw error;
  }

  // Step 2: Check if version is pinned
  if (manifest.framework.pinned && !options.force) {
    console.log(chalk.yellow("\n⚠ Framework version is pinned\n"));
    console.log(
      `Current version: ${chalk.cyan(manifest.framework.version)} (pinned)`,
    );
    console.log(
      chalk.dim(
        "\nThis project has pinned its framework version to prevent automatic updates.",
      ),
    );
    console.log(chalk.dim("To update anyway, use the --force flag:\n"));
    console.log(chalk.dim("  agentic-framework update --force\n"));
    process.exit(0);
  }

  // Step 3: Determine what needs updating
  spinner.start("Checking for updates...");
  const updatePlan = await determineUpdates(manifest);
  spinner.succeed("Update check complete");

  if (!updatePlan.willUpdate) {
    console.log(chalk.green("\n✓ Already up to date!\n"));
    console.log(`Framework version: ${chalk.cyan(updatePlan.currentVersion)}`);
    console.log(
      chalk.dim(
        `Last updated: ${new Date(manifest.framework.updatedAt).toLocaleString()}\n`,
      ),
    );
    process.exit(0);
  }

  // Step 4: Display update plan
  console.log(chalk.yellow("\nUpdates available:\n"));
  console.log(
    `Framework: ${chalk.cyan(updatePlan.currentVersion)} → ${chalk.green(updatePlan.latestVersion)}`,
  );

  if (updatePlan.modulesToUpdate.length > 0) {
    console.log(chalk.yellow("\nModules to update:"));
    for (const module of updatePlan.modulesToUpdate) {
      console.log(
        chalk.dim(
          `  - ${module.name}: ${module.currentVersion} → ${module.latestVersion}`,
        ),
      );
    }
  }

  // Step 5: Dry run mode - exit after showing plan
  if (options.dryRun) {
    console.log(chalk.blue("\n[DRY RUN] No changes will be made\n"));
    console.log(chalk.dim("Changes that would be applied:\n"));
    console.log(
      chalk.dim("  ✓ Update framework-managed agents in .claude/commands/"),
    );
    console.log(
      chalk.dim("  ✓ Update framework-managed skills in .claude/skills/"),
    );
    console.log(
      chalk.dim("  ✓ Update CLI command wrappers in .claude/commands/"),
    );
    console.log(chalk.dim("  ✓ Regenerate registries in .claude/registries/"));
    console.log(chalk.dim("  ✓ Create module directories (backlog/, reports/, etc.)"));
    console.log(chalk.dim("  ✓ Update manifest (.agentic-framework.json)\n"));
    console.log(chalk.yellow("Preserved (never touched):\n"));
    console.log(
      chalk.dim("  • .claude/context/* (project-owned domain knowledge)"),
    );
    console.log(
      chalk.dim("  • .claude/skills/project/* (project-owned custom skills)\n"),
    );
    console.log(
      chalk.dim("To apply these changes, run without --dry-run flag.\n"),
    );
    process.exit(0);
  }

  // Step 6: Confirm with user (unless --force)
  console.log(chalk.yellow("\nWhat will be updated:\n"));
  console.log(chalk.green("  ✓ Framework-managed agents (.claude/commands/)"));
  console.log(chalk.green("  ✓ Framework-managed skills (.claude/skills/)"));
  console.log(chalk.green("  ✓ Registries (.claude/registries/)"));
  console.log(chalk.green("  ✓ Manifest (.agentic-framework.json)"));
  console.log(chalk.yellow("\nWhat will be preserved:\n"));
  console.log(chalk.cyan("  • .claude/context/* (your domain knowledge)"));
  console.log(chalk.cyan("  • .claude/skills/project/* (your custom skills)"));

  // Step 7: Apply updates
  console.log(chalk.blue("\nApplying updates...\n"));

  // Load modules to update
  spinner.start("Loading modules...");
  const installedModuleNames = Object.keys(manifest.modules);
  const updatedModules: ModuleManifest[] = [];

  try {
    for (const moduleName of installedModuleNames) {
      const module = await loadModule(moduleName);
      updatedModules.push(module);
    }
    spinner.succeed("Modules loaded");
  } catch (error) {
    spinner.fail("Failed to load modules");
    throw error;
  }

  // Preflight: validate all module directory paths before any project mutation
  spinner.start("Validating module directory paths...");
  try {
    const allDirs = updatedModules.flatMap(m => m.provides.directories ?? []);
    const uniqueDirs = [...new Set(allDirs)];
    for (const dir of uniqueDirs) {
      const resolved = path.resolve(projectPath, dir);
      const relative = path.relative(path.resolve(projectPath), resolved);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error(`Invalid directory path outside project root: ${dir}`);
      }
    }
    spinner.succeed("Module directory paths validated");
  } catch (error) {
    spinner.fail("Invalid module directory path");
    throw error;
  }

  // Update agents and skills using SyncEngine
  spinner.start("Updating agents and skills...");
  try {
    const frameworkRoot = getFrameworkRoot();
    const syncEngine = new SyncEngine(frameworkRoot, projectPath);

    // Sync agents, skills, and commands with link transformation
    await syncEngine.syncAgents(updatedModules);
    await syncEngine.syncSkills(updatedModules);
    await syncEngine.syncCommands(updatedModules);

    // Also sync project skills to preserve user customizations
    await syncEngine.syncProjectSkills();

    spinner.succeed("Agents, skills, and commands updated");
  } catch (error) {
    spinner.fail("Failed to update agents and skills");
    throw error;
  }

  // Update scripts
  spinner.start("Updating scripts...");
  try {
    for (const module of updatedModules) {
      if (module.provides.scripts && module.provides.scripts.length > 0) {
        const scriptsSourceDir = path.join(module._sourcePath || "", "src");
        if (await fs.pathExists(scriptsSourceDir)) {
          await fs.copy(
            scriptsSourceDir,
            path.join(projectPath, "src", module.id),
          );
        }
      }
    }
    spinner.succeed("Scripts updated");
  } catch (error) {
    spinner.fail("Failed to update scripts");
    throw error;
  }

  // Create module-specific directories (paths already validated in preflight)
  spinner.start('Creating module directories...');
  try {
    const allDirs = updatedModules.flatMap(m => m.provides.directories ?? []);
    const uniqueDirs = [...new Set(allDirs)];
    for (const dir of uniqueDirs) {
      await fs.ensureDir(path.resolve(projectPath, dir));
    }
    spinner.succeed('Module directories created');
  } catch (error) {
    spinner.fail('Failed to create module directories');
    throw error;
  }

  // Step 8: Regenerate registries
  spinner.start("Regenerating registries...");
  try {
    await generateRegistries(projectPath, updatedModules);
    spinner.succeed("Registries regenerated");
  } catch (error) {
    spinner.fail("Failed to regenerate registries");
    throw error;
  }

  // Step 9: Update manifest
  spinner.start("Updating manifest...");
  try {
    const now = new Date().toISOString();
    manifest.framework.version = updatePlan.latestVersion;
    manifest.framework.updatedAt = now;
    manifest.framework.cliVersion = await getCliVersion();

    // Update module versions
    for (const module of updatedModules) {
      if (manifest.modules[module.id]) {
        manifest.modules[module.id].version = module.version;
      }
    }

    await manifestManager.write(manifest);
    spinner.succeed("Manifest updated");
  } catch (error) {
    spinner.fail("Failed to update manifest");
    throw error;
  }

  // Step 10: Success message
  console.log(chalk.green("\n✓ Framework updated successfully!\n"));
  console.log(
    `Framework version: ${chalk.cyan(updatePlan.currentVersion)} → ${chalk.green(updatePlan.latestVersion)}`,
  );
  console.log(
    chalk.dim(
      `Updated at: ${new Date(manifest.framework.updatedAt).toLocaleString()}`,
    ),
  );
  console.log(chalk.yellow("\nUpdated components:"));
  for (const module of updatedModules) {
    console.log(chalk.dim(`  - ${module.name} (${module.id})`));
  }
  console.log(chalk.cyan("\nPreserved components:"));
  console.log(chalk.dim("  - .claude/context/* (your domain knowledge)"));
  console.log(chalk.dim("  - .claude/skills/project/* (your custom skills)\n"));

  // Record telemetry
  const durationMs = Date.now() - startTime;
  recordCLICommand(
    "update",
    undefined,
    { force: options.force, dryRun: options.dryRun },
    {
      updated: true,
      from_version: updatePlan.currentVersion,
      to_version: updatePlan.latestVersion,
    },
    durationMs,
    true,
  ).catch(() => {});
}

/**
 * Determine what needs to be updated
 * Compares installed versions with available versions
 */
async function determineUpdates(
  manifest: FrameworkManifest,
): Promise<UpdatePlan> {
  const currentVersion = manifest.framework.version;

  // Get latest framework version from core module (source of truth)
  let latestVersion = currentVersion;
  try {
    const coreModule = await loadModule("core");
    latestVersion = coreModule.version;
  } catch {
    // If core module not found, check package.json via available modules
    const availableModules = await getAvailableModules();
    if (availableModules.length > 0) {
      try {
        const firstModule = await loadModule(availableModules[0]);
        latestVersion = firstModule.version;
        console.log(
          chalk.yellow(
            `Warning: Core module unavailable, using version from '${availableModules[0]}' module`,
          ),
        );
      } catch {
        // Keep current version as latest if we can't determine
      }
    }
  }

  const modulesToUpdate: UpdatePlan["modulesToUpdate"] = [];

  // Check each installed module
  for (const [moduleId, moduleInfo] of Object.entries(manifest.modules)) {
    try {
      const module = await loadModule(moduleId);
      if (module.version !== moduleInfo.version) {
        modulesToUpdate.push({
          name: moduleId,
          currentVersion: moduleInfo.version,
          latestVersion: module.version,
        });
      }
    } catch {
      // Module no longer available - skip
      console.warn(
        chalk.yellow(
          `Warning: Module '${moduleId}' not found in available modules`,
        ),
      );
    }
  }

  return {
    currentVersion,
    latestVersion,
    modulesToUpdate,
    willUpdate: currentVersion !== latestVersion || modulesToUpdate.length > 0,
  };
}
