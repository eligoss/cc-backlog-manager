/**
 * Sync Engine Module
 *
 * Synchronizes skills and agents from module source directories to deployment
 * directories (.claude/skills/ and .claude/commands/). Uses LinkTransformer to
 * transform markdown links during sync.
 *
 * Usage:
 *     const engine = new SyncEngine('/path/to/framework', '/path/to/project');
 *     const modules = await loadAllModules();
 *     const report = await engine.syncAll(modules);
 *
 * Project structure managed:
 *     project/
 *     ├── .claude/skills/project/      # Project-owned skills (synced TO .claude/skills/)
 *     ├── .claude/skills/              # Target for framework + project skills
 *     ├── .claude/commands/            # Target for agents (slash commands)
 *     └── .claude/agents/             # Target for agents (Task tool invocation)
 *
 * Module structure synced FROM:
 *     core/
 *     ├── agents/ai-*.md            # Agents to sync
 *     └── skills/shared/*           # Skills to sync (taxonomy structure)
 */

import fs from "fs-extra";
import path from "path";
import yaml from "yaml";
import { LinkTransformer } from "./link-transformer.js";
import { getFrameworkRoot, type ModuleManifest } from "./module-loader.js";
import { recordSyncAll } from "./telemetry/instrumentation/sync-instrumentation.js";
import { statuslineTemplate } from "../templates/statusline.js";
import { processSettingsJsonTemplate } from "../templates/settings-json.js";

export interface SyncReport {
  skills: SyncItem[];
  agents: SyncItem[];
  commands: SyncItem[];
  hooks: SyncItem[];
  statusline?: SyncItem;
  config?: ConfigSyncResult;
  errors: SyncError[];
  stats: {
    skillsSynced: number;
    agentsSynced: number;
    commandsSynced: number;
    hooksSynced: number;
    errors: number;
  };
}

export interface SyncCheckResult {
  inSync: boolean;
  skillsNeedSync: string[];
  agentsNeedSync: string[];
  commandsNeedSync: string[];
  projectSkillsNeedSync: string[];
}

export interface SyncItem {
  name: string;
  source: string;
  target: string;
  action: "created" | "updated" | "skipped";
}

export interface SyncError {
  item: string;
  error: string;
}

export interface SyncValidationViolation {
  file: string;
  line: number;
  match: string;
  context: string;
}

export interface ConfigSyncResult {
  agenticFramework: "created" | "updated" | "skipped";
  settingsLocal: "created" | "skipped";
  settingsJson: "created" | "updated" | "skipped";
}

/**
 * Synchronizes skills and agents from modules to deployment directories.
 *
 * The SyncEngine handles:
 * - Copying skills from module taxonomy structures to flat .claude/skills/
 * - Copying agents to .claude/commands/
 * - Copying project skills from .claude/skills/project/ to .claude/skills/
 * - Transforming markdown links in all .md files using LinkTransformer
 * - Reporting all sync actions and errors
 */
export class SyncEngine {
  /** Files to skip during sync operations */
  private static readonly SKIP_FILES = new Set([
    ".DS_Store",
    ".gitkeep",
    ".gitignore",
    "Thumbs.db",
  ]);

  /**
   * Folders in .claude/ that are protected from deletion during sync operations.
   * These folders contain user-owned data that must never be removed.
   */
  private static readonly PROTECTED_FOLDERS = new Set(["context"]);

  /**
   * Check if a path is a protected folder that should never be deleted.
   *
   * @param folderPath - Path relative to .claude/ directory
   * @returns True if the folder is protected
   */
  static isProtectedFolder(folderPath: string): boolean {
    const normalizedPath = folderPath
      .replace(/^\.claude\//, "")
      .replace(/\/$/, "");
    return SyncEngine.PROTECTED_FOLDERS.has(normalizedPath);
  }

  private readonly frameworkRoot: string;
  private readonly projectPath: string;
  private readonly linkTransformer: LinkTransformer;

  /**
   * Initialize the SyncEngine.
   *
   * @param frameworkRoot - Absolute path to the framework root directory
   * @param projectPath - Absolute path to the project directory
   */
  constructor(frameworkRoot: string, projectPath: string) {
    this.frameworkRoot = path.resolve(frameworkRoot);
    this.projectPath = path.resolve(projectPath);
    // Pass projectPath as second arg for {project}/ placeholder resolution
    this.linkTransformer = new LinkTransformer(
      this.frameworkRoot,
      this.projectPath,
    );
  }

  /**
   * Sync all skills from installed modules to .claude/skills/.
   *
   * Processes each module's skills/ directory, recursively copies skill
   * directories to a flat structure in .claude/skills/, and transforms all
   * markdown links.
   *
   * @param modules - List of installed module manifests
   * @returns List of sync actions performed
   */
  async syncSkills(modules: ModuleManifest[]): Promise<SyncItem[]> {
    const items: SyncItem[] = [];
    const targetDir = path.join(this.projectPath, ".claude/skills");

    // Ensure target directory exists
    await fs.ensureDir(targetDir);

    for (const module of modules) {
      if (!module._sourcePath) {
        continue;
      }

      const skillsSourceDir = path.join(module._sourcePath, "skills");

      if (!(await fs.pathExists(skillsSourceDir))) {
        continue;
      }

      // Find all skill directories (may be nested in taxonomy structure)
      const skillDirs = await this.findSkillDirectories(skillsSourceDir);

      for (const skillDir of skillDirs) {
        const skillName = path.basename(skillDir);
        const targetPath = path.join(targetDir, skillName);

        // Copy-once: never overwrite a user-filled project-knowledge skill.
        if (
          (await this.isProjectKnowledgeSkill(skillDir)) &&
          (await fs.pathExists(targetPath))
        ) {
          items.push({
            name: skillName,
            source: skillDir,
            target: targetPath,
            action: "skipped",
          });
          continue;
        }

        try {
          await this.copySkillDirectory(skillDir, targetPath);

          items.push({
            name: skillName,
            source: skillDir,
            target: targetPath,
            action: "updated",
          });
        } catch (_error) {
          items.push({
            name: skillName,
            source: skillDir,
            target: targetPath,
            action: "skipped",
          });
        }
      }
    }

    return items;
  }

  /**
   * Sync all agents from installed modules to .claude/commands/ and .claude/agents/.
   *
   * Copies all ai-*.md agent files from each module's agents/ directory
   * to both .claude/commands/ (for slash commands) and .claude/agents/
   * (for programmatic Task tool invocation), transforming markdown links
   * in the process.
   *
   * @param modules - List of installed module manifests
   * @returns List of sync actions performed
   */
  async syncAgents(modules: ModuleManifest[]): Promise<SyncItem[]> {
    const items: SyncItem[] = [];
    const commandsDir = path.join(this.projectPath, ".claude/commands");
    const agentsDir = path.join(this.projectPath, ".claude/agents");

    // Ensure primary target directory exists
    await fs.ensureDir(commandsDir);

    // Best-effort creation of agents dir — if this fails, it will be
    // retried per-file in the inner try-catch without blocking commands/
    try {
      await fs.ensureDir(agentsDir);
    } catch {
      // Will be retried per-file
    }

    for (const module of modules) {
      if (!module._sourcePath) {
        continue;
      }

      const agentsSourceDir = path.join(module._sourcePath, "agents");

      if (!(await fs.pathExists(agentsSourceDir))) {
        continue;
      }

      // Find all agent files (ai-*.md pattern)
      const agentFiles = await this.findAgentFiles(agentsSourceDir);

      for (const agentFile of agentFiles) {
        const agentName = path.basename(agentFile, ".md");
        const fileName = path.basename(agentFile);
        const commandsTarget = path.join(commandsDir, fileName);
        const agentsTarget = path.join(agentsDir, fileName);

        try {
          const deployTo = await this.getAgentDeployTarget(agentFile);

          // Deploy to .claude/commands/ (slash commands) if not agent-only
          if (deployTo !== "agent") {
            await this.copyAgentFile(agentFile, commandsTarget);
          }

          // Deploy to .claude/agents/ (Task tool / Agent tool invocation) if not command-only
          if (deployTo !== "command") {
            try {
              await fs.ensureDir(agentsDir);
              await this.copyAgentFile(agentFile, agentsTarget);
            } catch (agentsError) {
              console.warn(
                `Warning: Failed to deploy ${agentName} to .claude/agents/: ${agentsError instanceof Error ? agentsError.message : String(agentsError)}`,
              );
            }
          }

          items.push({
            name: agentName,
            source: agentFile,
            target: deployTo === "agent" ? agentsTarget : commandsTarget,
            action: "updated",
          });
        } catch (_error) {
          items.push({
            name: agentName,
            source: agentFile,
            target: commandsTarget,
            action: "skipped",
          });
        }
      }
    }

    return items;
  }

  /**
   * Sync all CLI command wrappers from installed modules to .claude/commands/.
   *
   * Copies all cmd-*.md command files from each module's commands/ directory
   * to .claude/commands/, transforming markdown links in the process.
   *
   * @param modules - List of installed module manifests
   * @returns List of sync actions performed
   */
  async syncCommands(modules: ModuleManifest[]): Promise<SyncItem[]> {
    const items: SyncItem[] = [];
    const targetDir = path.join(this.projectPath, ".claude/commands");

    // Ensure target directory exists
    await fs.ensureDir(targetDir);

    for (const module of modules) {
      if (!module._sourcePath) {
        continue;
      }

      const commandsSourceDir = path.join(module._sourcePath, "commands");

      if (!(await fs.pathExists(commandsSourceDir))) {
        continue;
      }

      // Find all command files (cmd-*.md pattern)
      const commandFiles = await this.findCommandFiles(commandsSourceDir);

      for (const commandFile of commandFiles) {
        const commandName = path.basename(commandFile, ".md");
        const targetPath = path.join(targetDir, path.basename(commandFile));

        try {
          // Reuse agent copy logic (transforms markdown links)
          await this.copyAgentFile(commandFile, targetPath);

          items.push({
            name: commandName,
            source: commandFile,
            target: targetPath,
            action: "updated",
          });
        } catch (_error) {
          items.push({
            name: commandName,
            source: commandFile,
            target: targetPath,
            action: "skipped",
          });
        }
      }
    }

    return items;
  }

  /**
   * Sync project skills from .claude/skills/project/ to .claude/skills/.
   *
   * Project skills are skills owned by the project (not from framework modules).
   * They are synced alongside framework skills to .claude/skills/.
   *
   * @returns List of sync actions performed
   */
  async syncProjectSkills(): Promise<SyncItem[]> {
    const items: SyncItem[] = [];
    const projectSkillsDir = path.join(
      this.projectPath,
      ".claude/skills/project",
    );
    const targetDir = path.join(this.projectPath, ".claude/skills");

    if (!(await fs.pathExists(projectSkillsDir))) {
      return items;
    }

    // Ensure target directory exists
    await fs.ensureDir(targetDir);

    // Find all skill directories in project skills
    const skillDirs = await this.findSkillDirectories(projectSkillsDir);

    for (const skillDir of skillDirs) {
      const skillName = path.basename(skillDir);
      const targetPath = path.join(targetDir, skillName);

      try {
        await this.copySkillDirectory(skillDir, targetPath);

        items.push({
          name: skillName,
          source: skillDir,
          target: targetPath,
          action: "updated",
        });
      } catch (_error) {
        items.push({
          name: skillName,
          source: skillDir,
          target: targetPath,
          action: "skipped",
        });
      }
    }

    return items;
  }

  /**
   * Sync module templates to .claude/templates/{module}/.
   *
   * Each module may have a templates/ directory at its root containing
   * template files. These are deployed to .claude/templates/{module-id}/
   * for use by CLI commands.
   *
   * @param modules - List of installed module manifests
   * @returns List of sync actions performed
   */
  async syncTemplates(modules: ModuleManifest[]): Promise<SyncItem[]> {
    const items: SyncItem[] = [];

    for (const module of modules) {
      if (!module._sourcePath) {
        continue;
      }

      const templatesSourceDir = path.join(module._sourcePath, "templates");

      if (!(await fs.pathExists(templatesSourceDir))) {
        continue;
      }

      const targetDir = path.join(
        this.projectPath,
        ".claude/templates",
        module.id,
      );

      try {
        // Recursively copy all template files
        await this.copyTemplateDirectory(templatesSourceDir, targetDir);

        items.push({
          name: `${module.id}-templates`,
          source: templatesSourceDir,
          target: targetDir,
          action: "updated",
        });
      } catch (_error) {
        items.push({
          name: `${module.id}-templates`,
          source: templatesSourceDir,
          target: targetDir,
          action: "skipped",
        });
      }
    }

    return items;
  }

  /**
   * Sync module schemas to .claude/registries/schemas/{module}/.
   *
   * Schemas are JSON schema files used by modules for validation.
   * Each module's schemas are copied to a module-specific subdirectory
   * in .claude/registries/schemas/.
   *
   * @param modules - List of installed module manifests
   * @returns List of sync actions performed
   */
  async syncSchemas(modules: ModuleManifest[]): Promise<SyncItem[]> {
    const items: SyncItem[] = [];
    const schemasTargetDir = path.join(
      this.projectPath,
      ".claude/registries/schemas",
    );

    // Ensure target directory exists
    await fs.ensureDir(schemasTargetDir);

    for (const module of modules) {
      if (!module._sourcePath) {
        continue;
      }

      const schemasSourceDir = path.join(module._sourcePath, "schemas");

      if (!(await fs.pathExists(schemasSourceDir))) {
        continue;
      }

      // Create module-specific target directory
      const moduleSchemaDir = path.join(schemasTargetDir, module.id);
      await fs.ensureDir(moduleSchemaDir);

      // Read all schema files in the source directory
      const entries = await fs.readdir(schemasSourceDir, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        // Skip directories and special files
        if (entry.isDirectory() || SyncEngine.SKIP_FILES.has(entry.name)) {
          continue;
        }

        const sourcePath = path.join(schemasSourceDir, entry.name);
        const targetPath = path.join(moduleSchemaDir, entry.name);

        try {
          // Copy schema files directly (no transformation needed for JSON)
          await fs.copy(sourcePath, targetPath, { overwrite: true });

          items.push({
            name: `${module.id}/${entry.name}`,
            source: sourcePath,
            target: targetPath,
            action: "updated",
          });
        } catch (_error) {
          items.push({
            name: `${module.id}/${entry.name}`,
            source: sourcePath,
            target: targetPath,
            action: "skipped",
          });
        }
      }
    }

    return items;
  }

  /**
   * Sync hooks to .claude/hooks/.
   *
   * Core hooks are ALWAYS deployed from the framework (regardless of installed modules).
   * Additional module-specific hooks can be provided by installed modules.
   * These hooks integrate with Claude Code's hook system.
   *
   * @param modules - List of installed module manifests (for module-specific hooks)
   * @returns List of sync actions performed
   */
  async syncHooks(modules: ModuleManifest[]): Promise<SyncItem[]> {
    const items: SyncItem[] = [];
    const targetDir = path.join(this.projectPath, ".claude/hooks");

    // Ensure target directory exists
    await fs.ensureDir(targetDir);

    // Helper to sync hooks from a directory
    const syncHooksFromDir = async (
      hooksSourceDir: string,
      hooksTargetDir: string = targetDir,
    ): Promise<void> => {
      if (!(await fs.pathExists(hooksSourceDir))) {
        return;
      }

      // Find all hook scripts (*.sh or *.js files)
      const entries = await fs.readdir(hooksSourceDir, { withFileTypes: true });

      for (const entry of entries) {
        // Skip special files
        if (SyncEngine.SKIP_FILES.has(entry.name)) {
          continue;
        }

        // Recurse into subdirectories (e.g., _lib/)
        if (entry.isDirectory()) {
          const subSourceDir = path.join(hooksSourceDir, entry.name);
          const subTargetDir = path.join(hooksTargetDir, entry.name);
          await fs.ensureDir(subTargetDir);
          await syncHooksFromDir(subSourceDir, subTargetDir);
          continue;
        }

        // Only sync shell scripts and JavaScript files
        if (!entry.name.endsWith(".sh") && !entry.name.endsWith(".js")) {
          continue;
        }

        const sourcePath = path.join(hooksSourceDir, entry.name);
        const targetPath = path.join(hooksTargetDir, entry.name);

        try {
          // Copy the hook file
          await fs.copy(sourcePath, targetPath, { overwrite: true });

          // Make shell scripts executable
          if (entry.name.endsWith(".sh")) {
            await fs.chmod(targetPath, 0o755);
          }

          items.push({
            name: entry.name,
            source: sourcePath,
            target: targetPath,
            action: "updated",
          });
        } catch (_error) {
          items.push({
            name: entry.name,
            source: sourcePath,
            target: targetPath,
            action: "skipped",
          });
        }
      }
    };

    // 1. ALWAYS sync core hooks from framework (infrastructure)
    const frameworkRoot = getFrameworkRoot();
    const coreHooksDir = path.join(frameworkRoot, "modules", "core", "hooks");
    await syncHooksFromDir(coreHooksDir);

    // 2. Sync module-specific hooks (if any module provides additional hooks)
    for (const module of modules) {
      if (!module._sourcePath) {
        continue;
      }

      // Skip core module (already synced above)
      if (module.id === "core") {
        continue;
      }

      const moduleHooksDir = path.join(module._sourcePath, "hooks");
      await syncHooksFromDir(moduleHooksDir);
    }

    return items;
  }

  /**
   * Sync statusline script to .claude/statusline.sh.
   *
   * The statusline provides real-time feedback in the Claude Code status bar.
   * This is framework infrastructure that should always be updated during sync.
   *
   * @returns Sync item indicating action taken
   */
  async syncStatusline(): Promise<SyncItem> {
    const targetPath = path.join(this.projectPath, ".claude/statusline.sh");

    try {
      await fs.ensureDir(path.dirname(targetPath));
      await fs.writeFile(targetPath, statuslineTemplate, "utf-8");
      await fs.chmod(targetPath, 0o755);

      return {
        name: "statusline.sh",
        source: "inline-template",
        target: targetPath,
        action: "updated",
      };
    } catch (_error) {
      return {
        name: "statusline.sh",
        source: "inline-template",
        target: targetPath,
        action: "skipped",
      };
    }
  }

  /**
   * Sync configuration files.
   *
   * Updates .agentic-framework.json with lastSyncAt timestamp and creates
   * .claude/settings.local.json if it doesn't exist (preserves user customizations).
   *
   * @returns Config sync result indicating actions taken
   */
  async syncConfig(): Promise<ConfigSyncResult> {
    const result: ConfigSyncResult = {
      agenticFramework: "skipped",
      settingsLocal: "skipped",
      settingsJson: "skipped",
    };

    // Update .agentic-framework.json
    const agenticFrameworkPath = path.join(
      this.projectPath,
      ".agentic-framework.json",
    );
    try {
      if (await fs.pathExists(agenticFrameworkPath)) {
        const config = await fs.readJson(agenticFrameworkPath);
        config.framework = config.framework || {};
        config.framework.lastSyncAt = new Date().toISOString();
        await fs.writeJson(agenticFrameworkPath, config, { spaces: 2 });
        result.agenticFramework = "updated";
      }
    } catch (_error) {
      // If we can't update, skip silently
    }

    // Create .claude/settings.local.json if missing
    const settingsLocalPath = path.join(
      this.projectPath,
      ".claude/settings.local.json",
    );
    try {
      if (!(await fs.pathExists(settingsLocalPath))) {
        // Load template from core module
        const templatePath = path.join(
          this.frameworkRoot,
          "framework/modules/core/templates/config/settings.local.json.template",
        );

        if (await fs.pathExists(templatePath)) {
          const templateContent = await fs.readFile(templatePath, "utf-8");
          await fs.ensureDir(path.dirname(settingsLocalPath));
          await fs.writeFile(settingsLocalPath, templateContent, "utf-8");
          result.settingsLocal = "created";
        }
      }
    } catch (_error) {
      // If we can't create, skip silently
    }

    // Migration: remove hooks from settings.local.json if they exist
    // (hooks now live in settings.json, framework-owned)
    try {
      if (await fs.pathExists(settingsLocalPath)) {
        const settingsLocal = await fs.readJson(settingsLocalPath);
        if (settingsLocal.hooks) {
          delete settingsLocal.hooks;
          await fs.writeJson(settingsLocalPath, settingsLocal, { spaces: 2 });
        }
      }
    } catch (_migrationError) {
      // Skip migration silently
    }

    // Sync settings.json (framework-owned, always overwritten)
    result.settingsJson = await this.syncSettingsJson();

    return result;
  }

  /**
   * Sync framework-owned settings.json with hook configurations.
   * Always overwrites hooks but preserves non-hook keys from existing file.
   */
  async syncSettingsJson(): Promise<"created" | "updated"> {
    const settingsJsonPath = path.join(
      this.projectPath,
      ".claude/settings.json",
    );
    const existed = await fs.pathExists(settingsJsonPath);

    // Read disabled hooks from manifest
    let disabledHooks: string[] = [];
    try {
      const manifestPath = path.join(
        this.projectPath,
        ".agentic-framework.json",
      );
      if (await fs.pathExists(manifestPath)) {
        const manifest = await fs.readJson(manifestPath);
        disabledHooks = manifest.hooks?.disabled || [];
      }
    } catch (_e) {
      // ignore
    }

    const settings = processSettingsJsonTemplate(
      this.projectPath,
      disabledHooks,
    );

    // Preserve non-hook keys from existing settings.json
    if (existed) {
      try {
        const existing = await fs.readJson(settingsJsonPath);
        for (const [key, value] of Object.entries(existing)) {
          if (key !== "hooks") {
            (settings as Record<string, unknown>)[key] = value;
          }
        }
      } catch (_e) {
        // ignore parse errors
      }
    }

    await fs.ensureDir(path.dirname(settingsJsonPath));
    await fs.writeJson(settingsJsonPath, settings, { spaces: 2 });

    return existed ? "updated" : "created";
  }

  /**
   * Check if sync is needed without making changes.
   *
   * Compares source files with deployed files to determine if synchronization
   * is required. Used by pre-commit hooks to validate that deployment files
   * are up to date.
   *
   * @param modules - List of installed module manifests
   * @returns Check result indicating if sync is needed
   */
  async checkSync(modules: ModuleManifest[]): Promise<SyncCheckResult> {
    const skillsNeedSync: string[] = [];
    const agentsNeedSync: string[] = [];
    const commandsNeedSync: string[] = [];
    const projectSkillsNeedSync: string[] = [];

    // Check framework skills
    for (const module of modules) {
      if (!module._sourcePath) {
        continue;
      }

      const skillsSourceDir = path.join(module._sourcePath, "skills");
      if (await fs.pathExists(skillsSourceDir)) {
        const skillDirs = await this.findSkillDirectories(skillsSourceDir);

        for (const skillDir of skillDirs) {
          const skillName = path.basename(skillDir);
          const targetPath = path.join(
            this.projectPath,
            ".claude/skills",
            skillName,
          );

          if (!(await this.isDirectoryInSync(skillDir, targetPath))) {
            skillsNeedSync.push(skillName);
          }
        }
      }

      // Check agents (deployed based on deploy-to frontmatter field)
      const agentsSourceDir = path.join(module._sourcePath, "agents");
      if (await fs.pathExists(agentsSourceDir)) {
        const agentFiles = await this.findAgentFiles(agentsSourceDir);

        for (const agentFile of agentFiles) {
          const agentName = path.basename(agentFile, ".md");
          const deployTo = await this.getAgentDeployTarget(agentFile);
          const commandsTarget = path.join(
            this.projectPath,
            ".claude/commands",
            path.basename(agentFile),
          );
          const agentsTarget = path.join(
            this.projectPath,
            ".claude/agents",
            path.basename(agentFile),
          );

          let needsSync = false;
          if (deployTo !== "agent") {
            needsSync =
              needsSync ||
              !(await this.isFileInSync(agentFile, commandsTarget));
          }
          if (deployTo !== "command") {
            needsSync =
              needsSync || !(await this.isFileInSync(agentFile, agentsTarget));
          }
          if (needsSync) {
            agentsNeedSync.push(agentName);
          }
        }
      }

      // Check commands
      const commandsSourceDir = path.join(module._sourcePath, "commands");
      if (await fs.pathExists(commandsSourceDir)) {
        const commandFiles = await this.findCommandFiles(commandsSourceDir);

        for (const commandFile of commandFiles) {
          const commandName = path.basename(commandFile, ".md");
          const targetPath = path.join(
            this.projectPath,
            ".claude/commands",
            path.basename(commandFile),
          );

          if (!(await this.isFileInSync(commandFile, targetPath))) {
            commandsNeedSync.push(commandName);
          }
        }
      }
    }

    // Check project skills
    const projectSkillsDir = path.join(
      this.projectPath,
      ".claude/skills/project",
    );
    if (await fs.pathExists(projectSkillsDir)) {
      const skillDirs = await this.findSkillDirectories(projectSkillsDir);

      for (const skillDir of skillDirs) {
        const skillName = path.basename(skillDir);
        const targetPath = path.join(
          this.projectPath,
          ".claude/skills",
          skillName,
        );

        if (!(await this.isDirectoryInSync(skillDir, targetPath))) {
          projectSkillsNeedSync.push(skillName);
        }
      }
    }

    // Check for missing files (deleted but still registered)
    const missingFiles = await this.checkMissingFiles(modules);

    // Merge missing files into needs-sync lists
    const allSkillsNeedSync = [
      ...new Set([...skillsNeedSync, ...missingFiles.missingSkills]),
    ];
    const allAgentsNeedSync = [
      ...new Set([...agentsNeedSync, ...missingFiles.missingAgents]),
    ];
    const allCommandsNeedSync = [
      ...new Set([...commandsNeedSync, ...missingFiles.missingCommands]),
    ];

    return {
      inSync:
        allSkillsNeedSync.length === 0 &&
        allAgentsNeedSync.length === 0 &&
        allCommandsNeedSync.length === 0 &&
        projectSkillsNeedSync.length === 0,
      skillsNeedSync: allSkillsNeedSync,
      agentsNeedSync: allAgentsNeedSync,
      commandsNeedSync: allCommandsNeedSync,
      projectSkillsNeedSync,
    };
  }

  /**
   * Check if deployed files are missing (regardless of content).
   *
   * Detects when files have been deleted from .claude/ but modules
   * are still registered in the manifest.
   *
   * @param modules - List of installed module manifests
   * @returns Lists of missing skills, agents, and commands
   */
  async checkMissingFiles(modules: ModuleManifest[]): Promise<{
    missingSkills: string[];
    missingAgents: string[];
    missingCommands: string[];
  }> {
    const missingSkills: string[] = [];
    const missingAgents: string[] = [];
    const missingCommands: string[] = [];

    for (const module of modules) {
      if (!module._sourcePath) continue;

      // Check skills
      const skillsSourceDir = path.join(module._sourcePath, "skills");
      if (await fs.pathExists(skillsSourceDir)) {
        const skillDirs = await this.findSkillDirectories(skillsSourceDir);
        for (const skillDir of skillDirs) {
          const skillName = path.basename(skillDir);
          const targetPath = path.join(
            this.projectPath,
            ".claude/skills",
            skillName,
          );
          if (!(await fs.pathExists(targetPath))) {
            missingSkills.push(skillName);
          }
        }
      }

      // Check agents (ai-*.md files) — deployed based on deploy-to frontmatter
      const agentsSourceDir = path.join(module._sourcePath, "agents");
      if (await fs.pathExists(agentsSourceDir)) {
        const agentFiles = await this.findAgentFiles(agentsSourceDir);
        for (const agentFile of agentFiles) {
          const fileName = path.basename(agentFile);
          const deployTo = await this.getAgentDeployTarget(agentFile);
          const commandsTarget = path.join(
            this.projectPath,
            ".claude/commands",
            fileName,
          );
          const agentsTarget = path.join(
            this.projectPath,
            ".claude/agents",
            fileName,
          );
          let missing = false;
          if (deployTo !== "agent") {
            missing = missing || !(await fs.pathExists(commandsTarget));
          }
          if (deployTo !== "command") {
            missing = missing || !(await fs.pathExists(agentsTarget));
          }
          if (missing) {
            missingAgents.push(path.basename(agentFile, ".md"));
          }
        }
      }

      // Check commands (cmd-*.md files)
      const commandsSourceDir = path.join(module._sourcePath, "commands");
      if (await fs.pathExists(commandsSourceDir)) {
        const commandFiles = (await fs.readdir(commandsSourceDir)).filter(
          (f) => f.startsWith("cmd-") && f.endsWith(".md"),
        );
        for (const commandFile of commandFiles) {
          const targetPath = path.join(
            this.projectPath,
            ".claude/commands",
            commandFile,
          );
          if (!(await fs.pathExists(targetPath))) {
            missingCommands.push(path.basename(commandFile, ".md"));
          }
        }
      }
    }

    return {
      missingSkills,
      missingAgents,
      missingCommands,
    };
  }

  /**
   * Run full sync (skills + agents + project skills).
   *
   * Performs a complete synchronization of all framework skills, agents, and
   * project skills to their deployment directories.
   *
   * @param modules - List of installed module manifests
   * @returns Complete sync report with all actions and errors
   */
  async syncAll(modules: ModuleManifest[]): Promise<SyncReport> {
    const startTime = Date.now();
    const errors: SyncError[] = [];

    // Sync framework skills
    let skillItems: SyncItem[] = [];
    try {
      skillItems = await this.syncSkills(modules);
    } catch (error) {
      errors.push({
        item: "skills",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Sync agents
    let agentItems: SyncItem[] = [];
    try {
      agentItems = await this.syncAgents(modules);
    } catch (error) {
      errors.push({
        item: "agents",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Sync commands (CLI command wrappers)
    let commandItems: SyncItem[] = [];
    try {
      commandItems = await this.syncCommands(modules);
    } catch (error) {
      errors.push({
        item: "commands",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Sync project skills
    try {
      const projectSkillItems = await this.syncProjectSkills();
      skillItems = [...skillItems, ...projectSkillItems];
    } catch (error) {
      errors.push({
        item: "project-skills",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Sync hooks
    let hookItems: SyncItem[] = [];
    try {
      hookItems = await this.syncHooks(modules);
    } catch (error) {
      errors.push({
        item: "hooks",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Sync statusline
    let statuslineItem: SyncItem | undefined;
    try {
      statuslineItem = await this.syncStatusline();
    } catch (error) {
      errors.push({
        item: "statusline",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Sync config files
    let configResult: ConfigSyncResult | undefined;
    try {
      configResult = await this.syncConfig();
    } catch (error) {
      errors.push({
        item: "config",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Validate synced output for hardcoded absolute paths
    // This ensures source files use {project}/ placeholders correctly
    const allSyncedItems = [...skillItems, ...agentItems, ...commandItems];
    try {
      await this.validateSyncOutput(allSyncedItems);
    } catch (validationError) {
      errors.push({
        item: "validation",
        error:
          validationError instanceof Error
            ? validationError.message
            : String(validationError),
      });
    }

    const result: SyncReport = {
      skills: skillItems,
      agents: agentItems,
      commands: commandItems,
      hooks: hookItems,
      statusline: statuslineItem,
      config: configResult,
      errors,
      stats: {
        skillsSynced: skillItems.filter((i) => i.action !== "skipped").length,
        agentsSynced: agentItems.filter((i) => i.action !== "skipped").length,
        commandsSynced: commandItems.filter((i) => i.action !== "skipped")
          .length,
        hooksSynced: hookItems.filter((i) => i.action !== "skipped").length,
        errors: errors.length,
      },
    };

    // Record telemetry
    const durationMs = Date.now() - startTime;
    const totalFiles =
      skillItems.length +
      agentItems.length +
      commandItems.length +
      hookItems.length;
    const changesDetected =
      skillItems.filter((i) => i.action !== "skipped").length +
      agentItems.filter((i) => i.action !== "skipped").length +
      commandItems.filter((i) => i.action !== "skipped").length +
      hookItems.filter((i) => i.action !== "skipped").length;
    const filesWritten = changesDetected; // Files with changes are written

    recordSyncAll(
      totalFiles,
      changesDetected,
      filesWritten,
      durationMs,
      errors.length,
    ).catch(() => {
      // Ignore telemetry errors
    });

    return result;
  }

  /**
   * Find all skill directories within a source directory.
   *
   * Skills may be nested in taxonomy structures (shared/, core/, etc.).
   * This method recursively finds all directories that contain SKILL.md files.
   *
   * @param sourceDir - Root directory to search for skills
   * @returns List of absolute paths to skill directories
   */
  private async findSkillDirectories(sourceDir: string): Promise<string[]> {
    const skillDirs: string[] = [];

    const entries = await fs.readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const fullPath = path.join(sourceDir, entry.name);

      // Check if this directory is a skill (contains SKILL.md)
      const skillMdPath = path.join(fullPath, "SKILL.md");
      if (await fs.pathExists(skillMdPath)) {
        skillDirs.push(fullPath);
      } else {
        // Recurse into subdirectories (taxonomy structure)
        const subSkills = await this.findSkillDirectories(fullPath);
        skillDirs.push(...subSkills);
      }
    }

    return skillDirs;
  }

  /**
   * Find all agent files within a source directory.
   *
   * Agent files follow the ai-*.md naming pattern.
   *
   * @param sourceDir - Directory to search for agent files
   * @returns List of absolute paths to agent files
   */
  private async findAgentFiles(sourceDir: string): Promise<string[]> {
    const agentFiles: string[] = [];

    const entries = await fs.readdir(sourceDir);

    for (const entry of entries) {
      if (entry.startsWith("ai-") && entry.endsWith(".md")) {
        const fullPath = path.join(sourceDir, entry);
        const stats = await fs.stat(fullPath);

        if (stats.isFile()) {
          agentFiles.push(fullPath);
        }
      }
    }

    return agentFiles;
  }

  /**
   * Read the deploy-to field from an agent markdown file's YAML frontmatter.
   * Returns 'both' if field is absent (backward-compatible default).
   */
  private async getAgentDeployTarget(
    filePath: string,
  ): Promise<"command" | "agent" | "both"> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      if (match) {
        const frontmatter = yaml.parse(match[1]) as Record<string, unknown>;
        const deployTo = frontmatter["deploy-to"];
        if (
          deployTo === "command" ||
          deployTo === "agent" ||
          deployTo === "both"
        ) {
          return deployTo;
        }
      }
    } catch {
      // If parsing fails, default to both
    }
    return "both";
  }

  /**
   * Read the project-knowledge marker from a source skill's SKILL.md frontmatter.
   * Project-knowledge skills ship as user-filled templates and must be copied
   * once (never overwritten on re-sync) to preserve filled-in content.
   */
  private async isProjectKnowledgeSkill(skillDir: string): Promise<boolean> {
    try {
      const content = await fs.readFile(
        path.join(skillDir, "SKILL.md"),
        "utf-8",
      );
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      if (match) {
        const frontmatter = yaml.parse(match[1]) as Record<string, unknown>;
        return frontmatter["project-knowledge"] === true;
      }
    } catch {
      // If parsing fails, treat as a normal skill (safe default: overwrite)
    }
    return false;
  }

  /**
   * Find all command files within a source directory.
   *
   * Command files follow the cmd-*.md naming pattern.
   *
   * @param sourceDir - Directory to search for command files
   * @returns List of absolute paths to command files
   */
  private async findCommandFiles(sourceDir: string): Promise<string[]> {
    const commandFiles: string[] = [];

    const entries = await fs.readdir(sourceDir);

    for (const entry of entries) {
      if (entry.startsWith("cmd-") && entry.endsWith(".md")) {
        const fullPath = path.join(sourceDir, entry);
        const stats = await fs.stat(fullPath);

        if (stats.isFile()) {
          commandFiles.push(fullPath);
        }
      }
    }

    return commandFiles;
  }

  /**
   * Copy a skill directory to the target location.
   *
   * Recursively copies all files in the skill directory, skipping special files
   * (.DS_Store, etc.) and transforming markdown links in .md files.
   *
   * @param source - Source skill directory
   * @param target - Target deployment directory
   */
  private async copySkillDirectory(
    source: string,
    target: string,
  ): Promise<void> {
    // Ensure target directory exists
    await fs.ensureDir(target);

    const entries = await fs.readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      // Skip special files
      if (SyncEngine.SKIP_FILES.has(entry.name)) {
        continue;
      }

      const sourcePath = path.join(source, entry.name);
      const targetPath = path.join(target, entry.name);

      if (entry.isDirectory()) {
        // Recursively copy subdirectories
        await this.copySkillDirectory(sourcePath, targetPath);
      } else if (entry.isFile()) {
        if (entry.name.endsWith(".md")) {
          // Transform markdown files
          await this.transformMarkdownLinks(sourcePath, targetPath);
        } else {
          // Copy other files as-is
          await fs.copy(sourcePath, targetPath, { overwrite: true });
        }
      }
    }
  }

  /**
   * Copy a template directory to the target location.
   *
   * Recursively copies all files in the template directory, skipping special files
   * (.DS_Store, etc.). Template files are copied as-is without link transformation.
   *
   * @param source - Source template directory
   * @param target - Target deployment directory
   */
  private async copyTemplateDirectory(
    source: string,
    target: string,
  ): Promise<void> {
    // Ensure target directory exists
    await fs.ensureDir(target);

    const entries = await fs.readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      // Skip special files
      if (SyncEngine.SKIP_FILES.has(entry.name)) {
        continue;
      }

      const sourcePath = path.join(source, entry.name);
      const targetPath = path.join(target, entry.name);

      if (entry.isDirectory()) {
        // Recursively copy subdirectories
        await this.copyTemplateDirectory(sourcePath, targetPath);
      } else if (entry.isFile()) {
        // Copy files as-is (templates don't need link transformation)
        await fs.copy(sourcePath, targetPath, { overwrite: true });
      }
    }
  }

  /**
   * Copy an agent file to the target location.
   *
   * Copies the agent file and transforms markdown links.
   *
   * @param source - Source agent file path
   * @param target - Target deployment file path
   */
  private async copyAgentFile(source: string, target: string): Promise<void> {
    // Agents are always markdown files, so transform links
    await this.transformMarkdownLinks(source, target);
  }

  /**
   * Transform markdown links in a file and write to target.
   *
   * Uses LinkTransformer to transform relative links to absolute paths,
   * ensuring links remain valid in the deployment location.
   *
   * @param sourcePath - Source file path
   * @param targetPath - Target file path
   */
  private async transformMarkdownLinks(
    sourcePath: string,
    targetPath: string,
  ): Promise<void> {
    const transformedContent = await this.linkTransformer.transformFile(
      sourcePath,
      targetPath,
    );
    await fs.writeFile(targetPath, transformedContent, "utf-8");
  }

  /**
   * Check if a file is in sync between source and target.
   *
   * Compares the transformed content of the source file with the target file.
   * For markdown files, applies link transformation before comparison.
   *
   * @param sourcePath - Source file path
   * @param targetPath - Target file path
   * @returns True if files are in sync, false otherwise
   */
  private async isFileInSync(
    sourcePath: string,
    targetPath: string,
  ): Promise<boolean> {
    // Check if target exists
    if (!(await fs.pathExists(targetPath))) {
      return false;
    }

    try {
      // Read target content
      const targetContent = await fs.readFile(targetPath, "utf-8");

      // For markdown files, transform source and compare
      if (sourcePath.endsWith(".md")) {
        const transformedContent = await this.linkTransformer.transformFile(
          sourcePath,
          targetPath,
        );
        return transformedContent === targetContent;
      }

      // For non-markdown files, direct comparison
      const sourceContent = await fs.readFile(sourcePath, "utf-8");
      return sourceContent === targetContent;
    } catch (_error) {
      // If we can't read/compare, assume out of sync
      return false;
    }
  }

  /**
   * Check if a directory is in sync between source and target.
   *
   * Recursively compares all files in the directory, accounting for
   * transformed markdown links.
   *
   * @param sourceDir - Source directory path
   * @param targetDir - Target directory path
   * @returns True if directories are in sync, false otherwise
   */
  private async isDirectoryInSync(
    sourceDir: string,
    targetDir: string,
  ): Promise<boolean> {
    // Check if target directory exists
    if (!(await fs.pathExists(targetDir))) {
      return false;
    }

    try {
      const sourceEntries = await fs.readdir(sourceDir, {
        withFileTypes: true,
      });

      for (const entry of sourceEntries) {
        // Skip special files
        if (SyncEngine.SKIP_FILES.has(entry.name)) {
          continue;
        }

        const sourcePath = path.join(sourceDir, entry.name);
        const targetPath = path.join(targetDir, entry.name);

        if (entry.isDirectory()) {
          // Recursively check subdirectories
          if (!(await this.isDirectoryInSync(sourcePath, targetPath))) {
            return false;
          }
        } else if (entry.isFile()) {
          // Check individual file
          if (!(await this.isFileInSync(sourcePath, targetPath))) {
            return false;
          }
        }
      }

      return true;
    } catch (_error) {
      // If we can't read/compare, assume out of sync
      return false;
    }
  }

  /**
   * Validate synced output files for hardcoded absolute paths.
   *
   * This method ensures that no hardcoded user-specific absolute paths
   * (like /Users/username/...) remain in synced files. These paths indicate
   * that source files were not properly updated to use {project} placeholders.
   *
   * @param syncedItems - List of items that were synced
   * @throws Error if any violations are detected
   */
  async validateSyncOutput(syncedItems: SyncItem[]): Promise<void> {
    const violations: SyncValidationViolation[] = [];

    // Pattern to detect hardcoded absolute paths (Unix and Windows)
    // Matches: /Users/, /home/, /var/, C:\, D:\, etc.
    // But NOT {project}/ placeholders (those are valid)
    const absolutePathPattern =
      /(?<!{project})\/(?:Users|home|var)\/[^\s)>\]]+|[A-Z]:\\/g;

    for (const item of syncedItems) {
      // Skip items that weren't actually synced
      if (item.action === "skipped") {
        continue;
      }

      // Only check markdown files
      if (!item.target.endsWith(".md")) {
        continue;
      }

      try {
        const content = await fs.readFile(item.target, "utf-8");
        const lines = content.split("\n");

        lines.forEach((line, idx) => {
          // Skip lines that are inside code blocks (backticks)
          // Simple heuristic: skip lines that are examples or documentation
          const isCodeExample =
            line.includes("```") ||
            line.trim().startsWith("`") ||
            /^\s*#/.test(line) || // Shell comments in examples
            /read_file\(|write_file\(|edit_file\(/.test(line); // MCP tool examples

          if (isCodeExample) {
            return;
          }

          const matches = line.match(absolutePathPattern);
          if (matches) {
            for (const match of matches) {
              violations.push({
                file: item.target,
                line: idx + 1,
                match,
                context: line.trim().substring(0, 100),
              });
            }
          }
        });
      } catch (_error) {
        // If we can't read the file, skip validation for it
        continue;
      }
    }

    if (violations.length > 0) {
      const violationReport = violations
        .slice(0, 10) // Limit to first 10 for readability
        .map(
          (v) =>
            `  ${v.file}:${v.line} - "${v.match}"\n    Context: ${v.context}`,
        )
        .join("\n");

      const moreMsg =
        violations.length > 10
          ? `\n  ... and ${violations.length - 10} more violations`
          : "";

      throw new Error(
        `Sync validation failed - hardcoded absolute paths detected in output:\n` +
          `${violationReport}${moreMsg}\n\n` +
          `Fix: Update source files to use {project}/ placeholders instead of absolute paths.`,
      );
    }
  }
}
