import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import {
  loadModule,
  getAvailableModules,
  getFrameworkRoot,
  ModuleManifest,
} from "../lib/module-loader.js";
import { generateRegistries } from "../lib/registry-generator.js";
import { ManifestManager } from "../lib/manifest-manager.js";
import { SyncEngine } from "../lib/sync-engine.js";
import { deployReferencesLibrary } from "../lib/references-library.js";
import { recordInitCommand } from "../lib/telemetry/instrumentation/cli-instrumentation.js";
import { scaffoldBacklogConfig } from "../lib/backlog-scaffold.js";
import {
  runInitWizard,
  detectExistingProject,
  appendGitignore,
  mergeCLAUDEmd,
  mergeSettingsLocal,
  ExistingProjectInfo,
  McpWizardConfig,
} from "../lib/wizard/index.js";
import {
  processSettingsTemplate,
  createSerenaProjectConfig,
  getMcpPermissions,
  getMcpHooks,
  createSessionStartHook,
  createSessionEndHook,
} from "../templates/index.js";
import type { SettingsLocal } from "../templates/index.js";
import { getCliVersion } from "../lib/cli-version.js";

/**
 * Configuration for init execution
 */
export interface InitConfig {
  projectName: string;
  projectPath: string;
  modules: string[];
  initGit: boolean;
  existingInfo?: ExistingProjectInfo;
  mcp?: McpWizardConfig;
}

interface InitOptions {
  modules?: string;
  git: boolean;
  interactive: boolean;
}

/**
 * Main init command handler
 */
export async function initCommand(
  projectName: string | undefined,
  options: InitOptions,
): Promise<void> {
  // Interactive mode (default)
  if (options.interactive !== false) {
    const result = await runInitWizard(projectName);
    if (!result || !result.confirmed) {
      return;
    }
    await executeInit({
      projectName: result.projectName,
      projectPath: result.projectPath,
      modules: result.modules,
      initGit: result.initGit,
      existingInfo: result.existingInfo,
      mcp: result.mcp,
    });
    return;
  }

  // Non-interactive mode (--no-interactive flag)
  if (!projectName) {
    console.error(
      chalk.red("Error: Project name required in non-interactive mode"),
    );
    console.error(
      chalk.dim(
        "Usage: agentic-framework init <project-name> --no-interactive",
      ),
    );
    process.exit(1);
  }

  const projectPath = process.cwd();
  const existingInfo = await detectExistingProject(projectPath);

  // Check if framework already initialized
  if (existingInfo.hasFrameworkManifest) {
    console.error(
      chalk.red("\nError: Framework already initialized in this directory."),
    );
    console.error(
      chalk.dim(
        'Use "agentic-framework sync" to re-sync or "add/remove" to manage modules.',
      ),
    );
    process.exit(1);
  }

  const requestedModules = options.modules?.split(",").map((m) => m.trim()) || [
    "core",
  ];

  await executeInit({
    projectName,
    projectPath,
    modules: requestedModules,
    initGit: options.git !== false,
    existingInfo,
  });
}

/**
 * Execute project initialization
 */
export async function executeInit(config: InitConfig): Promise<void> {
  const startTime = Date.now();
  const {
    projectName,
    projectPath,
    modules: requestedModules,
    initGit,
    existingInfo,
    mcp,
  } = config;
  const manifestManager = new ManifestManager(projectPath);

  // Detect existing files if not provided
  const existing = existingInfo || (await detectExistingProject(projectPath));

  console.log(
    chalk.blue("\nAgentic Development Framework - Project Initialization\n"),
  );
  console.log(`Project: ${chalk.green(projectName)}`);
  console.log(`Path: ${chalk.dim(projectPath)}`);
  console.log(`Modules: ${chalk.yellow(requestedModules.join(", "))}\n`);

  // Validate modules
  // Ora 9: discardStdin prevents input twitching during long operations
  const spinner = ora({
    text: "Validating modules...",
    discardStdin: true,
  }).start();
  const availableModules = await getAvailableModules();
  const invalidModules = requestedModules.filter(
    (m) => !availableModules.includes(m),
  );

  if (invalidModules.length > 0) {
    spinner.fail(`Invalid modules: ${invalidModules.join(", ")}`);
    console.log(`\nAvailable modules: ${availableModules.join(", ")}`);
    process.exit(1);
  }

  const modules = [...requestedModules];

  // Warn if core is not included (optional but recommended)
  if (!modules.includes("core")) {
    console.log(chalk.yellow("\nNote: Installing without core module."));
    console.log(
      chalk.dim(
        "  - Framework management agents (ai-framework-manager, etc.) will not be available",
      ),
    );
    console.log(
      chalk.dim(
        "  - Shared skills (verifying-quality, committing-code) will not be available",
      ),
    );
    console.log(
      chalk.dim("  - Add core later with: agentic-framework add core\n"),
    );
  }
  spinner.succeed("Modules validated");

  // Create project directory structure
  spinner.start("Creating project structure...");
  try {
    await createProjectStructure(projectPath);
    spinner.succeed("Project structure created");
  } catch (error) {
    spinner.fail("Failed to create project structure");
    throw error;
  }

  // Create/merge Claude settings (using inline templates - no core dependency)
  spinner.start(
    existing.hasSettingsLocal
      ? "Merging Claude settings..."
      : "Creating Claude settings...",
  );
  try {
    // Use inline template (no longer depends on core module)
    // Process template to replace {{PROJECT_ROOT}} with actual path
    await mergeSettingsLocal(projectPath, processSettingsTemplate(projectPath));

    // Statusline will be synced by SyncEngine later

    spinner.succeed(
      existing.hasSettingsLocal
        ? "Claude settings merged"
        : "Claude settings created",
    );
  } catch (error) {
    spinner.fail("Failed to create Claude settings");
    throw error;
  }

  // Load modules
  spinner.start("Loading modules...");
  const installedModules: ModuleManifest[] = [];
  try {
    for (const moduleName of modules) {
      const module = await loadModule(moduleName);
      installedModules.push(module);
    }
    spinner.succeed(`Modules loaded (${installedModules.length} modules)`);
  } catch (error) {
    spinner.fail("Failed to load modules");
    throw error;
  }

  // Install modules using SyncEngine
  spinner.start("Installing agents, skills, and commands...");
  const frameworkRoot = getFrameworkRoot();
  const syncEngine = new SyncEngine(frameworkRoot, projectPath);
  try {
    await syncEngine.syncAgents(installedModules);
    await syncEngine.syncSkills(installedModules);
    await syncEngine.syncCommands(installedModules);

    spinner.succeed("Agents, skills, and commands installed");
  } catch (error) {
    spinner.fail("Failed to install agents, skills, and commands");
    throw error;
  }

  // Install templates
  spinner.start("Installing templates...");
  try {
    const templateItems = await syncEngine.syncTemplates(installedModules);
    if (templateItems.length > 0) {
      const modulesWithTemplates = new Set(
        templateItems.map((i) => i.name.replace("-templates", "")),
      );
      spinner.succeed(
        `Templates installed (${modulesWithTemplates.size} modules)`,
      );
    } else {
      spinner.succeed("No templates to install");
    }
  } catch (error) {
    spinner.fail("Failed to install templates");
    throw error;
  }

  // Deploy the external references library (copy-once)
  await deployReferencesLibrary(projectPath, installedModules);

  // Install schemas
  spinner.start("Installing schemas...");
  try {
    const schemaItems = await syncEngine.syncSchemas(installedModules);
    if (schemaItems.length > 0) {
      const modulesWithSchemas = new Set(
        schemaItems.map((i) => i.name.split("/")[0]),
      );
      spinner.succeed(
        `Schemas installed (${schemaItems.length} files from ${modulesWithSchemas.size} modules)`,
      );
    } else {
      spinner.succeed("No schemas to install");
    }
  } catch (error) {
    spinner.fail("Failed to install schemas");
    throw error;
  }

  // Install statusline
  spinner.start("Installing statusline...");
  try {
    await syncEngine.syncStatusline();
    spinner.succeed("Statusline installed");
  } catch (error) {
    spinner.fail("Failed to install statusline");
    throw error;
  }

  // Copy scripts
  spinner.start("Installing scripts...");
  try {
    for (const module of installedModules) {
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
    spinner.succeed("Scripts installed");
  } catch (error) {
    spinner.fail("Failed to install scripts");
    throw error;
  }

  // Create module-specific directories
  spinner.start('Creating module directories...');
  try {
    const allDirs = installedModules.flatMap(m => m.provides.directories ?? []);
    const uniqueDirs = [...new Set(allDirs)];
    for (const dir of uniqueDirs) {
      const resolved = path.resolve(projectPath, dir);
      const relative = path.relative(path.resolve(projectPath), resolved);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error(`Invalid directory path outside project root: ${dir}`);
      }
      await fs.ensureDir(resolved);
    }
    spinner.succeed(`Module directories created`);
  } catch (error) {
    spinner.fail('Failed to create module directories');
    throw error;
  }

  // Scaffold backlog config files if backlog module is installed
  if (modules.includes("backlog")) {
    spinner.start("Scaffolding backlog config files...");
    try {
      await scaffoldBacklogConfig(projectPath);
      spinner.succeed("Backlog config files scaffolded");
    } catch (error) {
      spinner.fail("Failed to scaffold backlog config files");
      throw error;
    }
  }

  // Generate registries
  spinner.start("Generating registries...");
  try {
    await generateRegistries(projectPath, installedModules);
    spinner.succeed("Registries generated");
  } catch (error) {
    spinner.fail("Failed to generate registries");
    throw error;
  }

  // Create project manifest
  spinner.start("Creating project manifest...");
  try {
    const frameworkVersion = await getCliVersion();
    const moduleIds = installedModules.map((m) => m.id);
    const manifest = await manifestManager.create(frameworkVersion, moduleIds);
    manifest.framework.cliVersion = frameworkVersion;
    await manifestManager.write(manifest);
    spinner.succeed("Project manifest created");
  } catch (error) {
    spinner.fail("Failed to create manifest");
    throw error;
  }

  // Create/merge entry point files
  spinner.start(
    existing.hasClaudeMd
      ? "Merging CLAUDE.md..."
      : "Creating entry point files...",
  );
  try {
    await createEntryPoints(projectPath, installedModules, existing);
    spinner.succeed(
      existing.hasClaudeMd ? "CLAUDE.md merged" : "Entry point files created",
    );
  } catch (error) {
    spinner.fail("Failed to create entry point files");
    throw error;
  }

  // Handle .gitignore
  if (existing.hasGitignore) {
    spinner.start("Updating .gitignore...");
    try {
      const result = await appendGitignore(projectPath);
      if (result.action === "appended") {
        spinner.succeed(".gitignore updated");
      } else {
        spinner.succeed(".gitignore unchanged (entries already exist)");
      }
    } catch (error) {
      spinner.fail("Failed to update .gitignore");
      throw error;
    }
  }

  // Initialize git (only if requested and not already initialized)
  if (initGit && !existing.hasGit) {
    spinner.start("Initializing git repository...");
    try {
      const { execSync } = await import("child_process");
      execSync("git init", { cwd: projectPath, stdio: "ignore" });
      if (!existing.hasGitignore) {
        await appendGitignore(projectPath);
      }
      spinner.succeed("Git repository initialized");
    } catch (_error) {
      spinner.warn("Git initialization failed (git may not be installed)");
    }
  } else if (existing.hasGit) {
    console.log(chalk.dim("  ✓ Git already initialized (skipped)"));
  }

  // Install git hooks from templates (if .git directory exists)
  if (await fs.pathExists(path.join(projectPath, ".git"))) {
    spinner.start("Installing git hooks...");
    try {
      const gitHooksDir = path.join(projectPath, ".git", "hooks");
      await fs.ensureDir(gitHooksDir);

      const frameworkRoot = getFrameworkRoot();
      const hookTemplatesDir = path.join(
        frameworkRoot,
        "modules",
        "core",
        "templates",
        "config",
        "hooks",
      );

      let gitHooksInstalled = 0;
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
        spinner.succeed(`Git hooks installed (${gitHooksInstalled} hooks)`);
      } else {
        spinner.warn("No git hook templates found");
      }
    } catch (_error) {
      spinner.warn("Failed to install git hooks (continuing anyway)");
    }
  }

  // Configure MCP if enabled
  if (mcp?.enabled) {
    spinner.start("Configuring MCP integrations...");
    try {
      await configureMcp(projectPath, mcp, manifestManager);
      spinner.succeed("MCP integrations configured");
    } catch (_error) {
      spinner.warn("Failed to configure MCP (continuing anyway)");
    }
  }

  // Success message
  console.log(chalk.green("\n✓ Framework initialized successfully!\n"));
  console.log("Next steps:");
  console.log(
    chalk.dim(
      `  1. ${existing.hasClaudeMd ? "Review merged CLAUDE.md" : "Open CLAUDE.md and review the generated framework setup"}`,
    ),
  );
  console.log(
    chalk.dim(
      "  2. Fill in project knowledge: .claude/skills/knowing-the-codebase|knowing-the-domain|knowing-backlog and references.yml",
    ),
  );
  console.log(
    chalk.dim("  3. Add custom skills to .claude/skills/project/ (optional)"),
  );
  console.log(
    chalk.dim("  4. Use /ai-* slash commands to interact with agents"),
  );
  if (mcp?.enabled) {
    console.log(
      chalk.dim("  5. Seed MCP knowledge bases: agentic-framework mcp seed\n"),
    );
  } else {
    console.log("");
  }
  console.log("Installed modules:");
  for (const module of installedModules) {
    console.log(chalk.dim(`  - ${module.name} (${module.id})`));
  }
  console.log(
    chalk.dim("\nProject-owned directories (preserved during updates):"),
  );
  console.log(chalk.dim("  - .claude/skills/project/ (your custom skills)\n"));

  // Record telemetry
  const durationMs = Date.now() - startTime;
  recordInitCommand(projectName, modules, durationMs, true).catch(() => {
    // Ignore telemetry errors
  });
}

async function createProjectStructure(projectPath: string): Promise<void> {
  const directories = [
    ".claude/commands",
    ".claude/skills",
    ".claude/skills/project",
    ".claude/templates",
    ".claude/registries",
    ".claude/hooks",
  ];

  for (const dir of directories) {
    await fs.ensureDir(path.join(projectPath, dir));
  }
}

/**
 * Configure MCP integrations
 */
async function configureMcp(
  projectPath: string,
  mcp: McpWizardConfig,
  manifestManager: ManifestManager,
): Promise<void> {
  // Update manifest with MCP config
  const manifest = await manifestManager.read();
  manifest.mcp = {
    enabled: true,
    graphiti: {
      enabled: mcp.graphiti,
      groupId: mcp.graphitiGroupId,
    },
    serena: {
      enabled: mcp.serena,
      projectName: mcp.serenaProject,
      language: mcp.serenaLanguage,
    },
  };
  await manifestManager.write(manifest);

  // Create Serena project config if enabled
  if (mcp.serena) {
    const serenaDir = path.join(projectPath, ".serena");
    await fs.ensureDir(serenaDir);
    await fs.ensureDir(path.join(serenaDir, "memories"));

    const serenaConfig = createSerenaProjectConfig(
      mcp.serenaProject,
      mcp.serenaLanguage,
    );
    await fs.writeFile(
      path.join(serenaDir, "project.yml"),
      serenaConfig,
      "utf-8",
    );
  }

  // Create MCP hook scripts
  const hooksDir = path.join(projectPath, ".claude", "hooks");

  // Session start hook (MCP activation reminder)
  const sessionStartHook = createSessionStartHook(
    mcp.graphiti,
    mcp.serena,
    mcp.graphitiGroupId,
    mcp.serenaProject,
  );
  await fs.writeFile(
    path.join(hooksDir, "session-start-mcp.sh"),
    sessionStartHook,
    "utf-8",
  );
  await fs.chmod(path.join(hooksDir, "session-start-mcp.sh"), 0o755);

  // Session end hook (Graphiti save reminder)
  if (mcp.graphiti) {
    const sessionEndHook = createSessionEndHook(mcp.graphitiGroupId);
    await fs.writeFile(
      path.join(hooksDir, "session-end-graphiti.sh"),
      sessionEndHook,
      "utf-8",
    );
    await fs.chmod(path.join(hooksDir, "session-end-graphiti.sh"), 0o755);
  }

  // Update settings.local.json with MCP permissions and hooks
  const settingsPath = path.join(projectPath, ".claude", "settings.local.json");
  let settings: SettingsLocal = {};

  if (await fs.pathExists(settingsPath)) {
    settings = await fs.readJson(settingsPath);
  }

  // Merge MCP permissions
  const mcpPermissions = getMcpPermissions(mcp.graphiti, mcp.serena);
  const existingPermissions = settings.permissions?.allow || [];
  const newPermissions = [
    ...new Set([...existingPermissions, ...mcpPermissions]),
  ];
  settings.permissions = {
    ...(settings.permissions || {}),
    allow: newPermissions,
  };

  // Merge MCP hooks
  const mcpHooks = getMcpHooks(projectPath, mcp.graphiti, mcp.serena);
  settings.hooks = mergeHooks(settings.hooks, mcpHooks);

  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
}

/**
 * Normalize a hook command path for comparison
 */
function normalizeHookPath(command: string): string {
  const match = command.match(/([^/]+\.sh)$/);
  return match ? match[1] : command;
}

/**
 * Merge hook configurations with proper deduplication
 */
function mergeHooks(
  existing: SettingsLocal["hooks"],
  newHooks: SettingsLocal["hooks"],
): SettingsLocal["hooks"] {
  if (!existing || !newHooks) {
    return newHooks || existing || {};
  }

  const merged = { ...existing };

  for (const [event, hooks] of Object.entries(newHooks)) {
    if (!hooks) continue; // Skip undefined hook groups

    if (!merged[event]) {
      merged[event] = hooks;
    } else {
      // Merge hook arrays, avoiding duplicates by script name
      const existingScripts = new Set(
        (merged[event] || [])
          .flatMap((h) =>
            h.hooks.map((hh) =>
              hh.command ? normalizeHookPath(hh.command) : "",
            ),
          )
          .filter(Boolean),
      );

      for (const hook of hooks) {
        const hookScripts = hook.hooks
          .map((h) => (h.command ? normalizeHookPath(h.command) : ""))
          .filter(Boolean);
        const hasNew = hookScripts.some(
          (script) => !existingScripts.has(script),
        );
        if (hasNew && merged[event]) {
          merged[event].push(hook);
        }
      }
    }
  }

  return merged;
}

async function createEntryPoints(
  projectPath: string,
  modules: ModuleManifest[],
  existing: ExistingProjectInfo,
): Promise<void> {
  const moduleList = modules.map((m) => `- ${m.name} (${m.id})`).join("\n");
  const agentList = modules
    .flatMap((m) => m.provides.agents || [])
    .map((a) => `- /${a}`)
    .join("\n");

  // Generate framework content for CLAUDE.md
  const frameworkContent = `# Project Entry Point

Framework: Agentic Development Framework v1.0.0

## Installed Modules

${moduleList}

## Available Agents (Slash Commands)

${agentList}

## Quick Start

1. Use slash commands to interact with agents
2. Add more modules with \`agentic-framework add <module>\`

## Project Knowledge

Before any project work, invoke the relevant project-knowledge skill via the Skill tool:

- **knowing-the-codebase** — tech stack, architecture, conventions, testing & CI, git workflow (before writing code or designing).
- **knowing-the-domain** — platform, business domain, users, product context (before product/ticket/doc work).
- **knowing-backlog** — Jira project, workflow, ticket conventions, integration config (before backlog/Confluence work).

These ship as fillable templates in \`.claude/skills/\` — fill them in for your project. External docs, APIs, and related codebases are indexed in \`references.yml\` at the project root.

## Navigation

- \`.claude/agents/\` - Agent documentation
- \`.claude/skills/\` - Skill documentation
- \`.claude/registries/\` - Discovery metadata`;

  // Merge or create CLAUDE.md
  await mergeCLAUDEmd(projectPath, frameworkContent);

  // Create README only if it doesn't exist
  if (!existing.hasReadme) {
    const readme = `# Project

This project uses the [Agentic Development Framework](https://github.com/agentic-framework/agentic-development-framework).

## Installed Modules

${moduleList}

## Getting Started

1. Use agent slash commands for AI assistance
2. Add more modules as needed

## Adding Modules

\`\`\`bash
agentic-framework add jira
agentic-framework add confluence
\`\`\`

## Available Commands

\`\`\`bash
agentic-framework list     # List available modules
agentic-framework add      # Add a module
agentic-framework remove   # Remove a module
agentic-framework build    # Validate configuration
\`\`\`
`;

    await fs.writeFile(path.join(projectPath, "README.md"), readme);
  }
}
