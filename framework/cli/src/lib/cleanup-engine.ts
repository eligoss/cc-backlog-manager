/**
 * Cleanup Engine Module
 *
 * Symmetric counterpart to SyncEngine - removes module artifacts during module removal.
 * Handles comprehensive cleanup of all synced resources:
 * - Agents from .claude/commands/ and .claude/agents/
 * - Skills from .claude/skills/
 * - Templates from .claude/templates/{moduleId}/
 * - Schemas from .claude/registries/schemas/{moduleId}/
 * - Scripts from src/{moduleId}/
 *
 * Usage:
 *     const engine = new CleanupEngine('/path/to/project', false);
 *     const preview = await engine.previewCleanup(module);
 *     const result = await engine.cleanupModule(module);
 */

import fs from "fs-extra";
import path from "path";
import { type ModuleManifest } from "./module-loader.js";

export interface RemovedArtifacts {
  files: string[]; // Relative paths of removed files
  directories: string[]; // Relative paths of removed directories
}

export interface CleanupPreview {
  agents: string[]; // Agent names that will be removed
  skills: string[]; // Skill names that will be removed
  templates: string[]; // Template paths that will be removed
  schemas: string[]; // Schema paths that will be removed
  scripts: string[]; // Script paths that will be removed
  warnings: string[]; // Warnings about shared resources
}

/**
 * Removes module artifacts during module removal.
 *
 * The CleanupEngine handles:
 * - Removing agents from .claude/commands/ and .claude/agents/
 * - Removing skills from .claude/skills/ (with sharing warnings)
 * - Removing templates from .claude/templates/{moduleId}/
 * - Removing schemas from .claude/registries/schemas/{moduleId}/
 * - Removing scripts from src/{moduleId}/
 */
export class CleanupEngine {
  /** Files to skip during cleanup operations */
  private static readonly SKIP_FILES = new Set([
    ".DS_Store",
    ".gitkeep",
    ".gitignore",
    "Thumbs.db",
  ]);

  /**
   * Folders in .claude/ that are protected from deletion during cleanup operations.
   * These folders contain user-owned data that must never be removed.
   */
  private static readonly PROTECTED_FOLDERS = new Set(["context", "hooks"]);

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
    return CleanupEngine.PROTECTED_FOLDERS.has(normalizedPath);
  }

  private readonly projectPath: string;
  private readonly dryRun: boolean;

  /**
   * Initialize the CleanupEngine.
   *
   * @param projectPath - Absolute path to the project directory
   * @param dryRun - If true, preview operations without making changes
   */
  constructor(projectPath: string, dryRun: boolean = false) {
    this.projectPath = path.resolve(projectPath);
    this.dryRun = dryRun;
  }

  /**
   * Preview cleanup operations for a module without making changes.
   *
   * @param module - Module manifest to preview cleanup for
   * @returns Preview showing what would be removed and any warnings
   */
  async previewCleanup(module: ModuleManifest): Promise<CleanupPreview> {
    const preview: CleanupPreview = {
      agents: [],
      skills: [],
      templates: [],
      schemas: [],
      scripts: [],
      warnings: [],
    };

    // Preview agents
    if (module.provides.agents) {
      preview.agents = module.provides.agents;
    }

    // Preview skills (and add sharing warning)
    if (module.provides.skills) {
      preview.skills = module.provides.skills;
      preview.warnings.push(
        `Skills may be shared with other modules. If another module provides the same skill name, it will need to be re-added.`,
      );
    }

    // Preview templates
    const templatesDir = path.join(
      this.projectPath,
      ".claude/templates",
      module.id,
    );
    if (await fs.pathExists(templatesDir)) {
      preview.templates = [`.claude/templates/${module.id}/`];
    }

    // Preview schemas
    const schemasDir = path.join(
      this.projectPath,
      ".claude/registries/schemas",
      module.id,
    );
    if (await fs.pathExists(schemasDir)) {
      preview.schemas = [`.claude/registries/schemas/${module.id}/`];
    }

    // Preview scripts
    const scriptsDir = path.join(this.projectPath, "src", module.id);
    if (await fs.pathExists(scriptsDir)) {
      preview.scripts = [`src/${module.id}/`];
    }

    return preview;
  }

  /**
   * Clean up all artifacts for a module.
   *
   * @param module - Module manifest
   * @returns Combined result of all cleanup operations
   */
  async cleanupModule(module: ModuleManifest): Promise<RemovedArtifacts> {
    const allFiles: string[] = [];
    const allDirectories: string[] = [];

    // Clean up agents
    const agentsResult = await this.cleanupAgents(module.provides.agents || []);
    allFiles.push(...agentsResult.files);
    allDirectories.push(...agentsResult.directories);

    // Clean up skills
    const skillsResult = await this.cleanupSkills(module.provides.skills || []);
    allFiles.push(...skillsResult.files);
    allDirectories.push(...skillsResult.directories);

    // Clean up templates
    const templatesResult = await this.cleanupTemplates(module.id);
    allFiles.push(...templatesResult.files);
    allDirectories.push(...templatesResult.directories);

    // Clean up schemas
    const schemasResult = await this.cleanupSchemas(module.id);
    allFiles.push(...schemasResult.files);
    allDirectories.push(...schemasResult.directories);

    // Clean up scripts
    const scriptsResult = await this.cleanupScripts(module.id);
    allFiles.push(...scriptsResult.files);
    allDirectories.push(...scriptsResult.directories);

    return {
      files: allFiles,
      directories: allDirectories,
    };
  }

  /**
   * Remove agents from both .claude/commands/ and .claude/agents/.
   *
   * @param agentIds - List of agent IDs to remove (e.g., 'ai-framework-manager')
   * @returns List of removed files and directories
   */
  async cleanupAgents(agentIds: string[]): Promise<RemovedArtifacts> {
    const files: string[] = [];
    const directories: string[] = [];

    for (const agentId of agentIds) {
      // Remove from .claude/commands/ (slash commands)
      const commandPath = path.join(
        this.projectPath,
        ".claude/commands",
        `${agentId}.md`,
      );
      if (await fs.pathExists(commandPath)) {
        if (!this.dryRun) {
          await fs.remove(commandPath);
        }
        files.push(path.relative(this.projectPath, commandPath));
      }

      // Remove from .claude/agents/ (Task tool invocation)
      const agentPath = path.join(
        this.projectPath,
        ".claude/agents",
        `${agentId}.md`,
      );
      if (await fs.pathExists(agentPath)) {
        if (!this.dryRun) {
          await fs.remove(agentPath);
        }
        files.push(path.relative(this.projectPath, agentPath));
      }
    }

    return { files, directories };
  }

  /**
   * Remove skills from .claude/skills/.
   *
   * Skills are deployed flat by skill name, so removal is straightforward.
   * Warning: Multiple modules may provide skills with the same name.
   *
   * @param skillNames - List of skill names to remove
   * @returns List of removed files and directories
   */
  async cleanupSkills(skillNames: string[]): Promise<RemovedArtifacts> {
    const files: string[] = [];
    const directories: string[] = [];

    for (const skillName of skillNames) {
      const skillDir = path.join(this.projectPath, ".claude/skills", skillName);
      if (await fs.pathExists(skillDir)) {
        if (!this.dryRun) {
          await fs.remove(skillDir);
        }
        directories.push(path.relative(this.projectPath, skillDir));
      }
    }

    return { files, directories };
  }

  /**
   * Remove templates from .claude/templates/{moduleId}/.
   *
   * Each module's templates are in a module-specific subdirectory.
   *
   * @param moduleId - Module ID
   * @returns List of removed files and directories
   */
  async cleanupTemplates(moduleId: string): Promise<RemovedArtifacts> {
    const files: string[] = [];
    const directories: string[] = [];

    const templatesDir = path.join(
      this.projectPath,
      ".claude/templates",
      moduleId,
    );
    if (await fs.pathExists(templatesDir)) {
      if (!this.dryRun) {
        await fs.remove(templatesDir);
      }
      directories.push(path.relative(this.projectPath, templatesDir));
    }

    return { files, directories };
  }

  /**
   * Remove schemas from .claude/registries/schemas/{moduleId}/.
   *
   * Each module's schemas are in a module-specific subdirectory.
   *
   * @param moduleId - Module ID
   * @returns List of removed files and directories
   */
  async cleanupSchemas(moduleId: string): Promise<RemovedArtifacts> {
    const files: string[] = [];
    const directories: string[] = [];

    const schemasDir = path.join(
      this.projectPath,
      ".claude/registries/schemas",
      moduleId,
    );
    if (await fs.pathExists(schemasDir)) {
      if (!this.dryRun) {
        await fs.remove(schemasDir);
      }
      directories.push(path.relative(this.projectPath, schemasDir));
    }

    return { files, directories };
  }

  /**
   * Remove scripts from src/{moduleId}/.
   *
   * @param moduleId - Module ID
   * @returns List of removed files and directories
   */
  async cleanupScripts(moduleId: string): Promise<RemovedArtifacts> {
    const files: string[] = [];
    const directories: string[] = [];

    const scriptsDir = path.join(this.projectPath, "src", moduleId);
    if (await fs.pathExists(scriptsDir)) {
      if (!this.dryRun) {
        await fs.remove(scriptsDir);
      }
      directories.push(path.relative(this.projectPath, scriptsDir));
    }

    return { files, directories };
  }
}
