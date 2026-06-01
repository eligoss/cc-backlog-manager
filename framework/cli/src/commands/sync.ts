import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import ora from "ora";
import { ManifestManager, FrameworkManifest } from "../lib/manifest-manager.js";
import {
  loadModule,
  ModuleManifest,
  getFrameworkRoot,
  getAvailableModules,
} from "../lib/module-loader.js";
import { SyncEngine } from "../lib/sync-engine.js";
import { generateRegistries } from "../lib/registry-generator.js";
import { recordSyncCommand } from "../lib/telemetry/instrumentation/cli-instrumentation.js";
import { CliContext } from "../lib/cli-context.js";
import { processSettingsTemplate } from "../templates/index.js";
import { getCliVersion } from "../lib/cli-version.js";

export interface SyncOptions {
  path: string;
  skills: boolean;
  agents: boolean;
  commands: boolean;
  registries: boolean;
  config: boolean;
  resetConfig: boolean; // Force reset settings.local.json to template
  mcp: boolean; // Include MCP config in sync
  resetMcp: boolean; // Reset MCP config to defaults
  dryRun: boolean;
  check: boolean;
  force: boolean;
}

/**
 * Sync command: Force re-sync skills, agents, and registries
 * Use when deployment files are out of sync with module sources
 */
export async function syncCommand(options: SyncOptions): Promise<void> {
  const startTime = Date.now();
  const ctx =
    options.path && options.path !== "."
      ? await CliContext.create({ path: options.path })
      : await CliContext.require();
  const projectPath = ctx.projectRoot;

  console.log(chalk.blue("\nAgentic Development Framework - Sync\n"));

  // Validate project has manifest
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

  // Detect empty manifest state
  const installedModuleNames = Object.keys(manifest.modules);

  if (installedModuleNames.length === 0) {
    spinner.warn("No modules installed");
    console.log(chalk.yellow("\n⚠ Your project has no modules installed\n"));
    console.log("Available modules:");

    const availableModules = await getAvailableModules();
    availableModules.forEach((mod) => {
      console.log(chalk.dim(`  • ${mod}`));
    });

    console.log(
      chalk.dim("\nAdd modules with: agentic-framework add <module>"),
    );
    console.log(chalk.dim("Example: agentic-framework add core coding\n"));

    process.exit(0); // Exit early - nothing to sync
  }

  // Resolve framework root for self-dev projects
  let frameworkRoot: string = projectPath; // Default for regular projects
  if (manifest.paths?.source) {
    frameworkRoot = path.join(projectPath, manifest.paths.source);
  }

  // Determine what to sync
  const syncAll =
    !options.skills &&
    !options.agents &&
    !options.commands &&
    !options.registries &&
    !options.config;
  const syncSkills = syncAll || options.skills;
  const syncAgents = syncAll || options.agents;
  const syncCommands = syncAll || options.commands;
  const syncRegistries = syncAll || options.registries;
  const syncConfig = syncAll || options.config;

  // Display sync plan
  console.log(chalk.yellow("\nSync plan:\n"));
  if (syncSkills) {
    console.log(`  ${chalk.green("✓")} Skills (.claude/skills/)`);
  }
  if (syncAgents) {
    console.log(
      `  ${chalk.green("✓")} Agents (.claude/commands/ + .claude/agents/)`,
    );
  }
  if (syncCommands) {
    console.log(`  ${chalk.green("✓")} Commands (.claude/commands/)`);
  }
  if (syncRegistries) {
    console.log(`  ${chalk.green("✓")} Registries (.claude/registries/)`);
  }
  if (syncConfig) {
    console.log(`  ${chalk.green("✓")} Config files (.claude/)`);
  }

  // Dry run mode
  if (options.dryRun) {
    console.log(chalk.blue("\n[DRY RUN] No changes will be made\n"));
    console.log(chalk.dim("Changes that would be applied:\n"));
    if (syncSkills) {
      console.log(chalk.dim("  • Sync skills from modules to .claude/skills/"));
      console.log(
        chalk.dim(
          "  • Sync project skills from .claude/skills/project/ to .claude/skills/",
        ),
      );
    }
    if (syncAgents) {
      console.log(
        chalk.dim(
          "  • Sync agents from modules to .claude/commands/ and .claude/agents/",
        ),
      );
    }
    if (syncCommands) {
      console.log(
        chalk.dim(
          "  • Sync CLI command wrappers from modules to .claude/commands/",
        ),
      );
    }
    if (syncRegistries) {
      console.log(
        chalk.dim("  • Regenerate all registries in .claude/registries/"),
      );
    }
    if (syncConfig) {
      console.log(
        chalk.dim(
          "  • Create missing config files in .claude/ (existing files preserved)",
        ),
      );
    }
    console.log(chalk.dim("\nTo apply changes, run without --dry-run flag.\n"));
    process.exit(0);
  }

  // Check mode - verify if sync is needed without making changes
  if (options.check) {
    console.log(chalk.blue("\n[CHECK MODE] Verifying sync status...\n"));

    // Load installed modules
    const checkModeModules: ModuleManifest[] = [];

    spinner.start("Loading modules...");
    for (const moduleName of installedModuleNames) {
      try {
        const module = await loadModule(moduleName);
        checkModeModules.push(module);
      } catch (_error) {
        console.warn(
          chalk.yellow(`\nWarning: Module '${moduleName}' not found, skipping`),
        );
      }
    }
    spinner.succeed(`Loaded ${checkModeModules.length} module(s)`);

    // Validate that modules registered are actually found
    if (checkModeModules.length === 0 && installedModuleNames.length > 0) {
      spinner.fail("Modules registered but not found");
      console.log(chalk.red("\n✗ Sync cannot proceed - modules not found\n"));
      console.log("Registered modules:");
      installedModuleNames.forEach((name) => {
        console.log(chalk.dim(`  • ${name} (not found)`));
      });
      console.log(
        chalk.dim(
          '\nRun "agentic-framework validate" to check module installation.',
        ),
      );
      console.log(
        chalk.dim("Or remove invalid modules from .agentic-framework.json\n"),
      );
      process.exit(3); // Exit code 3 = broken state
    }

    // Initialize sync engine and check sync status
    const syncEngine = new SyncEngine(frameworkRoot, projectPath);

    spinner.start("Checking sync status...");
    const checkResult = await syncEngine.checkSync(checkModeModules);

    if (checkResult.inSync) {
      spinner.succeed("All files are in sync");
      console.log(chalk.green("\n✓ No sync needed\n"));
      process.exit(0);
    } else {
      spinner.fail("Files are out of sync");
      console.log(chalk.yellow("\n⚠ Sync needed:\n"));

      if (checkResult.skillsNeedSync.length > 0) {
        console.log(chalk.yellow("  Skills:"));
        checkResult.skillsNeedSync.forEach((skill) => {
          console.log(chalk.dim(`    • ${skill}`));
        });
      }

      if (checkResult.agentsNeedSync.length > 0) {
        console.log(chalk.yellow("  Agents:"));
        checkResult.agentsNeedSync.forEach((agent) => {
          console.log(chalk.dim(`    • ${agent}`));
        });
      }

      if (checkResult.commandsNeedSync.length > 0) {
        console.log(chalk.yellow("  Commands:"));
        checkResult.commandsNeedSync.forEach((command) => {
          console.log(chalk.dim(`    • ${command}`));
        });
      }

      if (checkResult.projectSkillsNeedSync.length > 0) {
        console.log(chalk.yellow("  Project Skills:"));
        checkResult.projectSkillsNeedSync.forEach((skill) => {
          console.log(chalk.dim(`    • ${skill}`));
        });
      }

      console.log(
        chalk.dim('\nRun "agentic-framework sync" to update files.\n'),
      );
      process.exit(2); // Exit code 2 indicates sync is needed
    }
  }

  // Load installed modules
  const installedModules: ModuleManifest[] = [];

  spinner.start("Loading modules...");
  for (const moduleName of installedModuleNames) {
    try {
      const module = await loadModule(moduleName);
      installedModules.push(module);
    } catch (_error) {
      console.warn(
        chalk.yellow(`\nWarning: Module '${moduleName}' not found, skipping`),
      );
    }
  }
  spinner.succeed(`Loaded ${installedModules.length} module(s)`);

  // Add warning if some modules failed to load
  const failedCount = installedModuleNames.length - installedModules.length;
  if (failedCount > 0) {
    console.warn(
      chalk.yellow(
        `\nWarning: ${failedCount} module(s) could not be loaded (see warnings above)`,
      ),
    );
  }

  // Initialize sync engine
  const syncEngine = new SyncEngine(frameworkRoot, projectPath);
  let totalSkillsSynced = 0;
  let totalAgentsSynced = 0;
  let totalCommandsSynced = 0;
  let anyChanges = false; // Track if any actual changes were made

  // Sync skills
  if (syncSkills) {
    spinner.start("Syncing skills...");
    try {
      const skillItems = await syncEngine.syncSkills(installedModules);
      const projectSkillItems = await syncEngine.syncProjectSkills();
      totalSkillsSynced =
        skillItems.filter((i) => i.action !== "skipped").length +
        projectSkillItems.filter((i) => i.action !== "skipped").length;
      if (totalSkillsSynced > 0) anyChanges = true;
      spinner.succeed(`Skills synced (${totalSkillsSynced} total)`);
    } catch (error) {
      spinner.fail("Failed to sync skills");
      if (!options.force) {
        throw error;
      }
      console.warn(chalk.yellow("Continuing due to --force flag"));
    }
  }

  // Sync agents
  if (syncAgents) {
    spinner.start("Syncing agents...");
    try {
      const agentItems = await syncEngine.syncAgents(installedModules);
      totalAgentsSynced = agentItems.filter(
        (i) => i.action !== "skipped",
      ).length;
      if (totalAgentsSynced > 0) anyChanges = true;
      spinner.succeed(`Agents synced (${totalAgentsSynced} total)`);
    } catch (error) {
      spinner.fail("Failed to sync agents");
      if (!options.force) {
        throw error;
      }
      console.warn(chalk.yellow("Continuing due to --force flag"));
    }
  }

  // Sync commands (CLI command wrappers)
  if (syncCommands) {
    spinner.start("Syncing commands...");
    try {
      const commandItems = await syncEngine.syncCommands(installedModules);
      totalCommandsSynced = commandItems.filter(
        (i) => i.action !== "skipped",
      ).length;
      if (totalCommandsSynced > 0) anyChanges = true;
      spinner.succeed(`Commands synced (${totalCommandsSynced} total)`);
    } catch (error) {
      spinner.fail("Failed to sync commands");
      if (!options.force) {
        throw error;
      }
      console.warn(chalk.yellow("Continuing due to --force flag"));
    }
  }

  // Regenerate registries
  if (syncRegistries) {
    spinner.start("Regenerating registries...");
    try {
      await generateRegistries(projectPath, installedModules);
      anyChanges = true; // Registries are always regenerated
      spinner.succeed("Registries regenerated");
    } catch (error) {
      spinner.fail("Failed to regenerate registries");
      if (!options.force) {
        throw error;
      }
      console.warn(chalk.yellow("Continuing due to --force flag"));
    }
  }

  // Sync infrastructure scripts (always overwrite) and config files (only create if missing)
  // Uses inline templates - no core module dependency
  let infrastructureFilesUpdated = 0;
  let hooksUpdated = 0;
  let configFilesCreated = 0;
  if (syncConfig) {
    // Deploy infrastructure scripts (always overwrite)
    spinner.start("Syncing infrastructure scripts...");
    try {
      const statuslineItem = await syncEngine.syncStatusline();
      if (statuslineItem.action !== "skipped") {
        infrastructureFilesUpdated++;
      }

      anyChanges = true; // Infrastructure scripts are always overwritten
      spinner.succeed(
        `Infrastructure scripts synced (${infrastructureFilesUpdated} updated)`,
      );
    } catch (error) {
      spinner.fail("Failed to sync infrastructure scripts");
      if (!options.force) {
        throw error;
      }
      console.warn(chalk.yellow("Continuing due to --force flag"));
    }

    // Deploy hook scripts from CLI's bundled framework (always overwrite)
    spinner.start("Syncing hook scripts...");
    try {
      const hooksDir = path.join(projectPath, ".claude", "hooks");
      await fs.ensureDir(hooksDir);

      // Find hook scripts in CLI's bundled core module (NOT project's frameworkRoot)
      const cliFrameworkRoot = getFrameworkRoot();
      const coreHooksDir = path.join(
        cliFrameworkRoot,
        "modules",
        "core",
        "hooks",
      );
      // Recursive sync of hook scripts (supports subdirectories like _lib/)
      const syncHooksDir = async (
        srcDir: string,
        destDir: string,
      ): Promise<void> => {
        if (!(await fs.pathExists(srcDir))) return;
        const entries = await fs.readdir(srcDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subDest = path.join(destDir, entry.name);
            await fs.ensureDir(subDest);
            await syncHooksDir(path.join(srcDir, entry.name), subDest);
          } else if (entry.name.endsWith(".sh")) {
            const srcPath = path.join(srcDir, entry.name);
            const destPath = path.join(destDir, entry.name);
            await fs.copyFile(srcPath, destPath);
            await fs.chmod(destPath, 0o755);
            hooksUpdated++;
          }
        }
      };
      await syncHooksDir(coreHooksDir, hooksDir);

      if (hooksUpdated > 0) {
        anyChanges = true; // Hook scripts were updated
        spinner.succeed(`Hook scripts synced (${hooksUpdated} updated)`);
      } else {
        spinner.succeed("Hook scripts synced (none found in core module)");
      }
    } catch (error) {
      spinner.fail("Failed to sync hook scripts");
      if (!options.force) {
        throw error;
      }
      console.warn(chalk.yellow("Continuing due to --force flag"));
    }

    // Deploy git hooks from templates (if .git directory exists)
    spinner.start("Syncing git hooks...");
    try {
      const gitHooksDir = path.join(projectPath, ".git", "hooks");
      let gitHooksInstalled = 0;

      if (await fs.pathExists(path.join(projectPath, ".git"))) {
        await fs.ensureDir(gitHooksDir);

        // Find git hook templates in core module
        const cliFrameworkRoot = getFrameworkRoot();
        const hookTemplatesDir = path.join(
          cliFrameworkRoot,
          "modules",
          "core",
          "templates",
          "config",
          "hooks",
        );

        if (await fs.pathExists(hookTemplatesDir)) {
          const templates = await fs.readdir(hookTemplatesDir);

          for (const template of templates) {
            if (template.endsWith(".template")) {
              // Map template to git hook name
              const hookName = template
                .replace(".sh.template", "")
                .replace("pre-commit-sync", "pre-commit")
                .replace("pre-push", "pre-push");

              const srcPath = path.join(hookTemplatesDir, template);
              const destPath = path.join(gitHooksDir, hookName);

              // Read template and replace {{PROJECT_ROOT}}
              let content = await fs.readFile(srcPath, "utf-8");
              content = content.replace(/\{\{PROJECT_ROOT\}\}/g, projectPath);

              // Write and make executable
              await fs.writeFile(destPath, content, "utf-8");
              await fs.chmod(destPath, 0o755);
              gitHooksInstalled++;
            }
          }
        }

        if (gitHooksInstalled > 0) {
          anyChanges = true;
          spinner.succeed(`Git hooks synced (${gitHooksInstalled} installed)`);
        } else {
          spinner.succeed("Git hooks synced (no templates found)");
        }
      } else {
        spinner.info("Git hooks skipped (not a git repository)");
      }
    } catch (error) {
      spinner.fail("Failed to sync git hooks");
      if (!options.force) {
        throw error;
      }
      console.warn(chalk.yellow("Continuing due to --force flag"));
    }

    // Deploy config files (create or merge core configs) - uses inline templates
    spinner.start("Syncing config files...");
    try {
      const settingsPath = path.join(
        projectPath,
        ".claude",
        "settings.local.json",
      );
      const settingsExists = await fs.pathExists(settingsPath);

      // Create if doesn't exist OR force reset if --reset-config flag
      if (!settingsExists || options.resetConfig) {
        await fs.ensureDir(path.dirname(settingsPath));
        const processedSettings = processSettingsTemplate(projectPath);
        await fs.writeFile(
          settingsPath,
          JSON.stringify(processedSettings, null, 2),
          "utf-8",
        );
        configFilesCreated++;
        anyChanges = true; // Config file was created or reset

        if (options.resetConfig && settingsExists) {
          spinner.warn(
            "Config file reset to template (previous version overwritten)",
          );
        }
      } else {
        // Merge core configurations into existing file (preserves user customizations)
        const existing = await fs.readJson(settingsPath);
        const template = processSettingsTemplate(projectPath);
        let merged = false;

        // Merge statusLine if missing or null
        if (!existing.statusLine) {
          existing.statusLine = template.statusLine;
          merged = true;
        }

        // Note: hooks are NOT merged here — they live in settings.json (framework-owned)

        if (merged) {
          await fs.writeFile(
            settingsPath,
            JSON.stringify(existing, null, 2),
            "utf-8",
          );
          anyChanges = true;
          spinner.succeed("Config files synced (core configurations merged)");
        } else {
          spinner.succeed("Config files synced (all exist, preserved)");
        }
      }

      if (configFilesCreated > 0 && !options.resetConfig) {
        spinner.succeed(`Config files synced (${configFilesCreated} created)`);
      } else if (!options.resetConfig && configFilesCreated === 0) {
        // Already shown success message above in merge branch
      }

      // Migration: remove hooks from settings.local.json (hooks now in settings.json)
      try {
        if (await fs.pathExists(settingsPath)) {
          const settingsLocal = await fs.readJson(settingsPath);
          if (settingsLocal.hooks) {
            delete settingsLocal.hooks;
            await fs.writeJson(settingsPath, settingsLocal, { spaces: 2 });
          }
        }
      } catch (_migrationError) {
        // Skip migration silently
      }

      // Sync framework-owned settings.json (always overwrite hooks)
      await syncEngine.syncSettingsJson();
      anyChanges = true;
    } catch (error) {
      spinner.fail("Failed to sync config files");
      if (!options.force) {
        throw error;
      }
      console.warn(chalk.yellow("Continuing due to --force flag"));
    }
  }

  // Update manifest timestamp and CLI version only if actual changes were made
  if (anyChanges) {
    spinner.start("Updating manifest...");
    try {
      manifest.framework.updatedAt = new Date().toISOString();
      manifest.framework.cliVersion = await getCliVersion();
      await manifestManager.write(manifest);
      spinner.succeed("Manifest updated");
    } catch (error) {
      spinner.fail("Failed to update manifest");
      throw error;
    }
  }

  // Success summary
  console.log(chalk.green("\n✓ Sync completed successfully!\n"));
  console.log("Summary:");
  if (syncSkills) {
    console.log(`  Skills synced: ${chalk.cyan(totalSkillsSynced)}`);
  }
  if (syncAgents) {
    console.log(`  Agents synced: ${chalk.cyan(totalAgentsSynced)}`);
  }
  if (syncCommands) {
    console.log(`  Commands synced: ${chalk.cyan(totalCommandsSynced)}`);
  }
  if (syncRegistries) {
    console.log(`  Registries: ${chalk.cyan("regenerated")}`);
  }
  if (syncConfig) {
    console.log(
      `  Infrastructure: ${chalk.cyan(`${infrastructureFilesUpdated} updated`)}`,
    );
    console.log(`  Hooks: ${chalk.cyan(`${hooksUpdated} updated`)}`);
    console.log(
      `  Config files: ${chalk.cyan(configFilesCreated > 0 ? `${configFilesCreated} created` : "all exist, preserved")}`,
    );
  }
  console.log(`  Updated: ${chalk.dim(new Date().toLocaleString())}\n`);

  // Record telemetry
  const durationMs = Date.now() - startTime;
  recordSyncCommand(
    {
      skills: syncSkills,
      agents: syncAgents,
      commands: syncCommands,
      registries: syncRegistries,
      dryRun: options.dryRun,
      check: options.check,
      force: options.force,
    },
    totalSkillsSynced,
    totalAgentsSynced + totalCommandsSynced, // Include commands in agents count for telemetry
    0, // No errors if we reached here
    durationMs,
  ).catch(() => {
    // Ignore telemetry errors
  });
}
