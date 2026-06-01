import { Command } from "commander";
import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import { recordCLICommand } from "../lib/telemetry/instrumentation/cli-instrumentation.js";
import {
  detectAffectedModules,
  isGitRepository,
  branchExists,
} from "../lib/affected-modules.js";
import { getCliVersion } from "../lib/cli-version.js";

export interface BumpVersionOptions {
  projectRoot: string;
  type?: "major" | "minor" | "patch";
  version?: string;
  dryRun: boolean;
  /** Auto-detect affected modules and bump them */
  auto?: boolean;
  /** Specific module to bump (independent versioning) */
  module?: string;
  /** Stage files after update (for pre-commit hook) */
  stage?: boolean;
  /** Base branch for auto-detection (default: main) */
  baseBranch?: string;
  /** Only bump package.json, not module versions (for CI releases) */
  packageOnly?: boolean;
}

export interface ModuleBumpResult {
  moduleId: string;
  currentVersion: string;
  newVersion: string;
  moduleJsonPath: string;
}

export interface BumpVersionResult {
  /** For backward compat - CLI package version */
  currentVersion: string;
  newVersion: string;
  filesUpdated: number;
  dryRun: boolean;
  updatedFiles: string[];
  /** Module-specific results for independent versioning */
  moduleBumps?: ModuleBumpResult[];
  /** Whether auto-detection was used */
  autoDetected?: boolean;
}

export interface VersionParts {
  major: number;
  minor: number;
  patch: number;
}

/**
 * Parse semantic version string into components
 */
export function parseVersion(versionStr: string): VersionParts {
  if (!versionStr || typeof versionStr !== "string") {
    throw new Error(
      "Invalid version format: version must be a non-empty string",
    );
  }

  const parts = versionStr.split(".");

  // Handle different version formats
  if (parts.length === 1) {
    // X format -> X.0.0
    const major = parseInt(parts[0], 10);
    if (isNaN(major) || major < 0) {
      throw new Error(`Invalid version format: ${versionStr} (expected X.Y.Z)`);
    }
    return { major, minor: 0, patch: 0 };
  } else if (parts.length === 2) {
    // X.Y format -> X.Y.0
    const major = parseInt(parts[0], 10);
    const minor = parseInt(parts[1], 10);
    if (isNaN(major) || isNaN(minor) || major < 0 || minor < 0) {
      throw new Error(`Invalid version format: ${versionStr} (expected X.Y.Z)`);
    }
    return { major, minor, patch: 0 };
  } else if (parts.length === 3) {
    // X.Y.Z format
    const major = parseInt(parts[0], 10);
    const minor = parseInt(parts[1], 10);
    const patch = parseInt(parts[2], 10);
    if (
      isNaN(major) ||
      isNaN(minor) ||
      isNaN(patch) ||
      major < 0 ||
      minor < 0 ||
      patch < 0
    ) {
      throw new Error(
        `Invalid version format: ${versionStr} (parts must be non-negative integers)`,
      );
    }
    return { major, minor, patch };
  } else {
    throw new Error(`Invalid version format: ${versionStr} (expected X.Y.Z)`);
  }
}

/**
 * Validate version format (strict semver)
 */
export function validateVersionFormat(version: string): boolean {
  // Strict semver validation: X.Y.Z with optional pre-release and build metadata
  const semverRegex =
    /^\d+\.\d+\.\d+(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/;
  return semverRegex.test(version);
}

/**
 * Increment version based on bump type
 */
export function incrementVersion(
  version: string,
  bumpType: "major" | "minor" | "patch",
): string {
  const { major, minor, patch } = parseVersion(version);

  switch (bumpType) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Invalid bump type: ${bumpType}`);
  }
}

/**
 * Detect current version from cli/package.json
 */
async function detectCurrentVersion(projectRoot: string): Promise<string> {
  const packageJsonPath = path.join(
    projectRoot,
    "framework",
    "cli",
    "package.json",
  );

  if (!(await fs.pathExists(packageJsonPath))) {
    throw new Error(`package.json not found at ${packageJsonPath}`);
  }

  try {
    const packageJson = await fs.readJson(packageJsonPath);

    if (!packageJson.version) {
      throw new Error("package.json does not contain a version field");
    }

    return packageJson.version;
  } catch (error) {
    if (error instanceof Error && error.message.includes("version field")) {
      throw error;
    }
    throw new Error(
      `Failed to read package.json: ${error instanceof Error ? error.message : "Unknown error"}`,
      { cause: error },
    );
  }
}

/**
 * Get module version from its module.json
 */
async function getModuleVersion(moduleJsonPath: string): Promise<string> {
  try {
    const content = await fs.readJson(moduleJsonPath);
    return content.version || "1.0.0";
  } catch {
    return "1.0.0";
  }
}

/**
 * Update version in a JSON file
 */
async function updateJsonFile(
  filePath: string,
  newVersion: string,
  dryRun: boolean,
): Promise<boolean> {
  if (!(await fs.pathExists(filePath))) {
    return false;
  }

  try {
    const content = await fs.readJson(filePath);

    if (content.version === newVersion) {
      return false; // No update needed
    }

    content.version = newVersion;

    if (!dryRun) {
      await fs.writeJson(filePath, content, { spaces: 2 });
    }

    return true;
  } catch (error) {
    console.error(
      `Warning: Failed to update ${filePath}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return false;
  }
}

/**
 * Update .agentic-framework.json with module version
 */
async function updateFrameworkManifest(
  projectRoot: string,
  moduleId: string,
  newVersion: string,
  dryRun: boolean,
): Promise<boolean> {
  const manifestPath = path.join(projectRoot, ".agentic-framework.json");

  if (!(await fs.pathExists(manifestPath))) {
    return false;
  }

  try {
    const manifest = await fs.readJson(manifestPath);

    if (!manifest.modules) {
      manifest.modules = {};
    }

    // Handle both string and object formats for module version
    const currentValue = manifest.modules[moduleId];
    if (typeof currentValue === "string") {
      if (currentValue === newVersion) {
        return false;
      }
      manifest.modules[moduleId] = newVersion;
    } else if (typeof currentValue === "object" && currentValue !== null) {
      if (currentValue.version === newVersion) {
        return false;
      }
      currentValue.version = newVersion;
    } else {
      // Module not in manifest yet, add it
      manifest.modules[moduleId] = newVersion;
    }

    // Update timestamp and CLI version
    if (manifest.framework) {
      manifest.framework.updatedAt = new Date().toISOString();
      manifest.framework.cliVersion = await getCliVersion();
    }

    if (!dryRun) {
      await fs.writeJson(manifestPath, manifest, { spaces: 2 });
    }

    return true;
  } catch (error) {
    console.error(
      `Warning: Failed to update .agentic-framework.json: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return false;
  }
}

/**
 * Find module.json path for a specific module
 */
async function findModuleJsonPath(
  projectRoot: string,
  moduleId: string,
): Promise<string | null> {
  const possiblePaths = [
    path.join(projectRoot, "framework", "modules", moduleId, "module.json"),
    path.join(projectRoot, "modules", moduleId, "module.json"),
  ];

  for (const p of possiblePaths) {
    if (await fs.pathExists(p)) {
      return p;
    }
  }

  return null;
}

/**
 * Find all module.json files in the project
 */
async function findModuleJsonFiles(projectRoot: string): Promise<string[]> {
  const moduleFiles: string[] = [];

  async function scanDirectory(dir: string, depth: number = 0): Promise<void> {
    // Limit depth to avoid infinite recursion
    if (depth > 5) return;

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip certain directories
        const skipDirs = [
          "node_modules",
          ".git",
          "dist",
          "build",
          "coverage",
          "__tests__",
          "__fixtures__",
        ];
        if (entry.isDirectory() && !skipDirs.includes(entry.name)) {
          await scanDirectory(fullPath, depth + 1);
        } else if (entry.isFile() && entry.name === "module.json") {
          moduleFiles.push(fullPath);
        }
      }
    } catch {
      // Silently skip directories we can't read
    }
  }

  // Check framework/modules first (framework source repo)
  const frameworkModulesDir = path.join(projectRoot, "framework", "modules");
  if (await fs.pathExists(frameworkModulesDir)) {
    await scanDirectory(frameworkModulesDir);
  }

  // Also check modules/ (installed projects)
  const modulesDir = path.join(projectRoot, "modules");
  if (await fs.pathExists(modulesDir)) {
    await scanDirectory(modulesDir);
  }

  return moduleFiles;
}

/**
 * Stage files with git add
 */
function stageFiles(projectRoot: string, files: string[]): void {
  if (files.length === 0) return;

  try {
    execSync(`git add ${files.map((f) => `"${f}"`).join(" ")}`, {
      cwd: projectRoot,
      encoding: "utf-8",
      timeout: 10000,
    });
  } catch (error) {
    console.warn(
      `Warning: Failed to stage files: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Bump version for a specific module (independent versioning)
 */
async function bumpModuleVersion(
  projectRoot: string,
  moduleId: string,
  bumpType: "major" | "minor" | "patch",
  dryRun: boolean,
): Promise<ModuleBumpResult | null> {
  const moduleJsonPath = await findModuleJsonPath(projectRoot, moduleId);

  if (!moduleJsonPath) {
    console.warn(`Warning: module.json not found for module '${moduleId}'`);
    return null;
  }

  const currentVersion = await getModuleVersion(moduleJsonPath);
  const newVersion = incrementVersion(currentVersion, bumpType);

  // Update module.json
  await updateJsonFile(moduleJsonPath, newVersion, dryRun);

  // Update .agentic-framework.json
  await updateFrameworkManifest(projectRoot, moduleId, newVersion, dryRun);

  return {
    moduleId,
    currentVersion,
    newVersion,
    moduleJsonPath,
  };
}

/**
 * Auto-bump affected modules based on git changes
 */
async function autoBumpAffectedModules(
  projectRoot: string,
  bumpType: "major" | "minor" | "patch",
  baseBranch: string,
  dryRun: boolean,
): Promise<ModuleBumpResult[]> {
  const result = detectAffectedModules({
    baseBranch,
    projectRoot,
  });

  if (!result.hasChanges) {
    console.log("No changes detected compared to", baseBranch);
    return [];
  }

  console.log(`Detected ${result.modules.length} affected module(s):`);
  for (const mod of result.modules) {
    console.log(`  - ${mod.id} (${mod.changedFiles.length} file(s) changed)`);
  }
  console.log();

  const bumps: ModuleBumpResult[] = [];

  for (const affected of result.modules) {
    const bump = await bumpModuleVersion(
      projectRoot,
      affected.id,
      bumpType,
      dryRun,
    );
    if (bump) {
      bumps.push(bump);
    }
  }

  return bumps;
}

/**
 * Main version bump logic (updated to support independent versioning)
 */
export async function bumpVersion(
  options: BumpVersionOptions,
): Promise<BumpVersionResult> {
  const {
    projectRoot,
    type,
    version: customVersion,
    dryRun,
    auto,
    module: targetModule,
    stage,
    baseBranch = "main",
  } = options;

  // Mode 1: Auto-detect affected modules
  if (auto) {
    if (!isGitRepository(projectRoot)) {
      throw new Error("Auto-detection requires a git repository");
    }

    if (!branchExists(baseBranch, projectRoot)) {
      throw new Error(`Base branch '${baseBranch}' does not exist`);
    }

    const bumpType = type || "patch";

    if (dryRun) {
      console.log("\nDRY RUN MODE - No changes will be made\n");
    }

    console.log(
      `Auto-detecting affected modules (comparing to ${baseBranch})...\n`,
    );

    const moduleBumps = await autoBumpAffectedModules(
      projectRoot,
      bumpType,
      baseBranch,
      dryRun,
    );

    if (moduleBumps.length === 0) {
      console.log("No modules need version bumps.");
      return {
        currentVersion: "N/A",
        newVersion: "N/A",
        filesUpdated: 0,
        dryRun,
        updatedFiles: [],
        moduleBumps: [],
        autoDetected: true,
      };
    }

    const updatedFiles: string[] = [];
    for (const bump of moduleBumps) {
      const relativePath = path.relative(projectRoot, bump.moduleJsonPath);
      updatedFiles.push(relativePath);
      console.log(
        `${dryRun ? "Would bump" : "Bumped"} ${bump.moduleId}: ${bump.currentVersion} → ${bump.newVersion}`,
      );
    }

    // Always include .agentic-framework.json if it was updated
    const manifestPath = path.join(projectRoot, ".agentic-framework.json");
    if (await fs.pathExists(manifestPath)) {
      updatedFiles.push(".agentic-framework.json");
    }

    // Stage files if requested
    if (stage && !dryRun && updatedFiles.length > 0) {
      console.log("\nStaging updated files...");
      stageFiles(projectRoot, updatedFiles);
      console.log("Files staged.");
    }

    console.log();
    console.log(dryRun ? "Summary (DRY RUN):" : "Summary:");
    console.log(`  Modules bumped: ${moduleBumps.length}`);
    console.log(`  Files updated: ${updatedFiles.length}`);

    return {
      currentVersion: "N/A",
      newVersion: "N/A",
      filesUpdated: updatedFiles.length,
      dryRun,
      updatedFiles,
      moduleBumps,
      autoDetected: true,
    };
  }

  // Mode 2: Bump specific module
  if (targetModule) {
    const bumpType = type || "patch";

    if (dryRun) {
      console.log("\nDRY RUN MODE - No changes will be made\n");
    }

    const bump = await bumpModuleVersion(
      projectRoot,
      targetModule,
      bumpType,
      dryRun,
    );

    if (!bump) {
      throw new Error(`Module '${targetModule}' not found`);
    }

    const updatedFiles = [
      path.relative(projectRoot, bump.moduleJsonPath),
      ".agentic-framework.json",
    ];

    console.log(
      `${dryRun ? "Would bump" : "Bumped"} ${bump.moduleId}: ${bump.currentVersion} → ${bump.newVersion}`,
    );

    // Stage files if requested
    if (stage && !dryRun) {
      console.log("\nStaging updated files...");
      stageFiles(projectRoot, updatedFiles);
      console.log("Files staged.");
    }

    return {
      currentVersion: bump.currentVersion,
      newVersion: bump.newVersion,
      filesUpdated: updatedFiles.length,
      dryRun,
      updatedFiles,
      moduleBumps: [bump],
    };
  }

  // Mode 3: Package-only (for CI releases - only bump package.json, not modules)
  if (options.packageOnly) {
    if (!type && !customVersion) {
      throw new Error("--package-only requires --type or --set-version");
    }

    const currentVersion = await detectCurrentVersion(projectRoot);

    let newVersion: string;
    if (customVersion) {
      if (!validateVersionFormat(customVersion)) {
        throw new Error(
          `Invalid version format: ${customVersion} (expected X.Y.Z)`,
        );
      }
      newVersion = customVersion;
    } else if (type) {
      newVersion = incrementVersion(currentVersion, type);
    } else {
      throw new Error("Invalid state: no version or type specified");
    }

    if (dryRun) {
      console.log("\nDRY RUN MODE - No changes will be made\n");
    }

    console.log(`Current version: ${currentVersion}`);
    console.log(`New version: ${newVersion}`);
    console.log();

    const updatedFiles: string[] = [];
    let filesUpdated = 0;

    // ONLY update framework/cli/package.json
    const packageJsonPath = path.join(
      projectRoot,
      "framework",
      "cli",
      "package.json",
    );
    if (await updateJsonFile(packageJsonPath, newVersion, dryRun)) {
      filesUpdated++;
      updatedFiles.push("framework/cli/package.json");
      console.log(
        `${dryRun ? "Would update" : "Updated"} framework/cli/package.json`,
      );
    }

    // Stage files if requested
    if (stage && !dryRun && updatedFiles.length > 0) {
      console.log("\nStaging updated files...");
      stageFiles(projectRoot, updatedFiles);
      console.log("Files staged.");
    }

    console.log();
    console.log(dryRun ? "Summary (DRY RUN):" : "Summary:");
    console.log(`  Version: ${currentVersion} → ${newVersion}`);
    console.log(
      `  Files ${dryRun ? "to be updated" : "updated"}: ${filesUpdated}`,
    );
    console.log("  Note: Module versions unchanged (--package-only mode)");

    return {
      currentVersion,
      newVersion,
      filesUpdated,
      dryRun,
      updatedFiles,
    };
  }

  // Mode 4: Legacy behavior - bump all modules to same version (monolithic)
  // Validate options
  if (!type && !customVersion) {
    throw new Error(
      "Either --type, --version, --auto, or --module must be provided",
    );
  }

  if (type && customVersion) {
    throw new Error("Cannot specify both --type and --version");
  }

  // Detect current version
  const currentVersion = await detectCurrentVersion(projectRoot);

  // Calculate new version
  let newVersion: string;
  if (customVersion) {
    if (!validateVersionFormat(customVersion)) {
      throw new Error(
        `Invalid version format: ${customVersion} (expected X.Y.Z)`,
      );
    }
    newVersion = customVersion;
  } else if (type) {
    newVersion = incrementVersion(currentVersion, type);
  } else {
    throw new Error("Invalid state: no version or type specified");
  }

  if (dryRun) {
    console.log("\nDRY RUN MODE - No changes will be made\n");
  }

  console.log(`Current version: ${currentVersion}`);
  console.log(`New version: ${newVersion}`);
  console.log();

  // Update files
  const updatedFiles: string[] = [];
  let filesUpdated = 0;

  // Update framework/cli/package.json
  const packageJsonPath = path.join(
    projectRoot,
    "framework",
    "cli",
    "package.json",
  );
  if (await updateJsonFile(packageJsonPath, newVersion, dryRun)) {
    filesUpdated++;
    updatedFiles.push("framework/cli/package.json");
    console.log(
      `${dryRun ? "Would update" : "Updated"} framework/cli/package.json`,
    );
  }

  // Update all module.json files
  const moduleJsonFiles = await findModuleJsonFiles(projectRoot);
  for (const moduleJsonPath of moduleJsonFiles) {
    if (await updateJsonFile(moduleJsonPath, newVersion, dryRun)) {
      filesUpdated++;
      const relativePath = path.relative(projectRoot, moduleJsonPath);
      updatedFiles.push(relativePath);
      console.log(`${dryRun ? "Would update" : "Updated"} ${relativePath}`);

      // Also update .agentic-framework.json for each module
      try {
        const moduleContent = await fs.readJson(moduleJsonPath);
        if (moduleContent.id) {
          await updateFrameworkManifest(
            projectRoot,
            moduleContent.id,
            newVersion,
            dryRun,
          );
        }
      } catch {
        // Ignore errors reading module.json
      }
    }
  }

  // Include .agentic-framework.json if it exists
  const manifestPath = path.join(projectRoot, ".agentic-framework.json");
  if (
    (await fs.pathExists(manifestPath)) &&
    !updatedFiles.includes(".agentic-framework.json")
  ) {
    updatedFiles.push(".agentic-framework.json");
  }

  // Stage files if requested
  if (stage && !dryRun && updatedFiles.length > 0) {
    console.log("\nStaging updated files...");
    stageFiles(projectRoot, updatedFiles);
    console.log("Files staged.");
  }

  console.log();
  console.log(dryRun ? "Summary (DRY RUN):" : "Summary:");
  console.log(`  Version: ${currentVersion} → ${newVersion}`);
  console.log(
    `  Files ${dryRun ? "to be updated" : "updated"}: ${filesUpdated}`,
  );

  if (!dryRun && filesUpdated > 0 && !stage) {
    console.log();
    console.log("Next steps:");
    console.log("  1. Review changes: git diff");
    console.log(
      `  2. Commit: git add . && git commit -m "chore: bump version to ${newVersion}"`,
    );
  }

  return {
    currentVersion,
    newVersion,
    filesUpdated,
    dryRun,
    updatedFiles,
  };
}

/**
 * Create the bump-version command
 */
export function createBumpVersionCommand(): Command {
  const command = new Command("bump-version");

  command
    .description(
      "Bump framework version (supports independent module versioning)",
    )
    .option(
      "-t, --type <type>",
      "Version bump type: major|minor|patch (default: patch for --auto/--module)",
    )
    .option(
      "--set-version <version>",
      "Set specific version (X.Y.Z format) - monolithic mode only",
    )
    .option("--auto", "Auto-detect affected modules and bump their versions")
    .option("-m, --module <name>", "Bump specific module version only")
    .option(
      "--package-only",
      "Only bump package.json version, not module versions (for CI releases)",
    )
    .option(
      "--base-branch <branch>",
      "Base branch for auto-detection (default: main)",
      "main",
    )
    .option(
      "--stage",
      "Stage updated files with git add (for pre-commit hooks)",
    )
    .option(
      "--dry-run",
      "Show what would change without modifying files",
      false,
    )
    .option("-p, --path <path>", "Project root path", ".")
    .action(async (cmdOptions) => {
      const startTime = Date.now();
      // Lazy-load chalk for colored output (ESM only, not needed for tests)
      const chalk = await import("chalk").then((m) => m.default);

      try {
        // Validate bump type if provided
        if (
          cmdOptions.type &&
          !["major", "minor", "patch"].includes(cmdOptions.type)
        ) {
          console.error(
            chalk.red(
              `Error: Invalid bump type '${cmdOptions.type}'. Must be major, minor, or patch.`,
            ),
          );
          process.exit(1);
        }

        // Validate conflicting options
        if (cmdOptions.auto && cmdOptions.module) {
          console.error(
            chalk.red("Error: Cannot use --auto and --module together."),
          );
          process.exit(1);
        }

        if (cmdOptions.setVersion && (cmdOptions.auto || cmdOptions.module)) {
          console.error(
            chalk.red(
              "Error: --set-version can only be used in monolithic mode (without --auto or --module).",
            ),
          );
          process.exit(1);
        }

        if (cmdOptions.packageOnly && (cmdOptions.auto || cmdOptions.module)) {
          console.error(
            chalk.red(
              "Error: --package-only cannot be used with --auto or --module.",
            ),
          );
          process.exit(1);
        }

        const projectRoot =
          cmdOptions.path === "." ? process.cwd() : cmdOptions.path;

        const options: BumpVersionOptions = {
          projectRoot,
          type: cmdOptions.type,
          version: cmdOptions.setVersion,
          dryRun: cmdOptions.dryRun,
          auto: cmdOptions.auto,
          module: cmdOptions.module,
          stage: cmdOptions.stage,
          baseBranch: cmdOptions.baseBranch,
          packageOnly: cmdOptions.packageOnly,
        };

        const result = await bumpVersion(options);

        // Record telemetry
        const durationMs = Date.now() - startTime;
        recordCLICommand(
          "bump-version",
          undefined,
          {
            type: cmdOptions.type,
            version: cmdOptions.setVersion,
            dryRun: cmdOptions.dryRun,
            auto: cmdOptions.auto,
            module: cmdOptions.module,
            packageOnly: cmdOptions.packageOnly,
          },
          {
            from_version: result.currentVersion,
            to_version: result.newVersion,
            files_updated: result.filesUpdated,
            modules_bumped: result.moduleBumps?.length || 0,
          },
          durationMs,
          true,
        ).catch(() => {});
      } catch (error) {
        console.error(
          chalk.red(
            `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          ),
        );
        process.exit(1);
      }
    });

  return command;
}
