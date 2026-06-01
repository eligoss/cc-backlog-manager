import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import {
  loadModule,
  getAvailableModules,
  getFrameworkRoot,
} from "../lib/module-loader.js";
import { scaffoldBacklogConfig } from "../lib/backlog-scaffold.js";
import { ManifestManager } from "../lib/manifest-manager.js";
import { generateRegistries } from "../lib/registry-generator.js";
import { SyncEngine } from "../lib/sync-engine.js";
import { recordCLICommand } from "../lib/telemetry/instrumentation/cli-instrumentation.js";

interface AddOptions {
  path: string;
}

export async function addCommand(
  moduleName: string,
  options: AddOptions,
): Promise<void> {
  const startTime = Date.now();
  const projectPath = path.resolve(options.path);

  console.log(chalk.blue(`\nAdding module: ${moduleName}\n`));

  // Validate project exists
  if (!(await fs.pathExists(path.join(projectPath, "CLAUDE.md")))) {
    console.error(
      chalk.red(
        "Error: Not an Agentic Framework project (CLAUDE.md not found)",
      ),
    );
    process.exit(1);
  }

  // Validate module exists
  // Ora 9: discardStdin prevents input twitching during long operations
  const spinner = ora({
    text: "Validating module...",
    discardStdin: true,
  }).start();
  const availableModules = await getAvailableModules();

  if (!availableModules.includes(moduleName)) {
    spinner.fail(`Module '${moduleName}' not found`);
    console.log(`\nAvailable modules: ${availableModules.join(", ")}`);
    process.exit(1);
  }
  spinner.succeed("Module validated");

  // Load and install module
  spinner.start(`Installing module: ${moduleName}...`);
  let moduleVersion: string;
  try {
    const module = await loadModule(moduleName);
    moduleVersion = module.version || "1.0.0";

    // Use SyncEngine for consistent deployment to .claude/ only
    const frameworkRoot = getFrameworkRoot();
    const syncEngine = new SyncEngine(frameworkRoot, projectPath);

    // Sync agents, skills, and commands using shared mechanism
    await syncEngine.syncAgents([module]);
    await syncEngine.syncSkills([module]);
    await syncEngine.syncCommands([module]);

    // Copy scripts
    if (module.provides.scripts && module.provides.scripts.length > 0) {
      const scriptsSourceDir = path.join(module._sourcePath || "", "src");
      if (await fs.pathExists(scriptsSourceDir)) {
        await fs.copy(
          scriptsSourceDir,
          path.join(projectPath, "src", module.id),
        );
      }
    }

    // Create module-specific directories
    const moduleDirs = module.provides.directories ?? [];
    for (const dir of moduleDirs) {
      const resolved = path.resolve(projectPath, dir);
      const relative = path.relative(path.resolve(projectPath), resolved);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error(`Invalid directory path outside project root: ${dir}`);
      }
      await fs.ensureDir(resolved);
    }

    // Scaffold backlog config files if the backlog module is being added
    if (moduleName === "backlog") {
      await scaffoldBacklogConfig(projectPath);
    }

    spinner.succeed(`Module installed: ${moduleName}`);
  } catch (error) {
    spinner.fail(`Failed to install module: ${moduleName}`);
    throw error;
  }

  // Update manifest with new module
  spinner.start("Updating manifest...");
  try {
    const manifestManager = new ManifestManager(projectPath);
    if (await manifestManager.exists()) {
      await manifestManager.addModule(moduleName, moduleVersion);
      spinner.succeed("Manifest updated");
    } else {
      spinner.warn("No manifest found - skipping manifest update");
    }
  } catch (error) {
    spinner.fail("Failed to update manifest");
    throw error;
  }

  // Update registries
  spinner.start("Updating registries...");
  try {
    const manifestManager = new ManifestManager(projectPath);
    if (await manifestManager.exists()) {
      const manifest = await manifestManager.read();
      const installedModuleIds = Object.keys(manifest.modules);

      // Load all installed modules to regenerate registries
      const installedModules = await Promise.all(
        installedModuleIds.map(async (id) => {
          try {
            return await loadModule(id);
          } catch {
            return null;
          }
        }),
      );

      // Filter out any modules that failed to load
      const validModules = installedModules.filter((m) => m !== null);
      await generateRegistries(projectPath, validModules);
    }
    spinner.succeed("Registries updated");
  } catch (error) {
    spinner.fail("Failed to update registries");
    throw error;
  }

  console.log(chalk.green(`\n✓ Module '${moduleName}' added successfully!\n`));

  // Record telemetry
  const durationMs = Date.now() - startTime;
  recordCLICommand(
    "add",
    undefined,
    { path: options.path },
    { module_added: moduleName },
    durationMs,
    true,
  ).catch(() => {});
}
