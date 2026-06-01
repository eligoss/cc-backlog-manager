import fs from "fs-extra";
import path from "path";
import os from "os";

/**
 * Global skill metadata
 * Tracks information about skills deployed to ~/.claude/skills/
 */
export interface GlobalSkillInfo {
  id: string;
  name: string;
  description: string;
  scope: string;
  deployedAt: string; // ISO timestamp
  deployedFrom: string; // Source project path
  sourceModule: string; // Module that provided the skill
  version?: string; // Optional version
  capabilities?: string[]; // Optional capabilities provided
}

/**
 * Global skills manifest schema
 * Stored at ~/.claude/skills/.global-skills-manifest.json
 */
export interface GlobalSkillsManifest {
  version: string; // Manifest schema version "1.0.0"
  skills: Record<string, GlobalSkillInfo>;
  updatedAt: string; // ISO timestamp
}

/**
 * Manages global skills deployed to ~/.claude/skills/
 * Handles deployment, removal, and tracking of globally available skills
 */
export class GlobalSkillsManager {
  private readonly manifestFileName = ".global-skills-manifest.json";

  /**
   * Get the path to the global skills directory (~/.claude/skills/)
   * @returns Absolute path to global skills directory
   */
  static getGlobalSkillsPath(): string {
    return path.join(os.homedir(), ".claude", "skills");
  }

  /**
   * Ensure the global skills directory exists
   * Creates ~/.claude/skills/ if it doesn't exist
   */
  async ensureGlobalSkillsDir(): Promise<void> {
    const globalSkillsPath = GlobalSkillsManager.getGlobalSkillsPath();
    try {
      await fs.ensureDir(globalSkillsPath);
    } catch (error) {
      throw new Error(
        `Failed to create global skills directory at ${globalSkillsPath}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  /**
   * Get the full path to the global skills manifest
   * @returns Absolute path to .global-skills-manifest.json
   */
  private getManifestPath(): string {
    return path.join(
      GlobalSkillsManager.getGlobalSkillsPath(),
      this.manifestFileName,
    );
  }

  /**
   * Read the global skills manifest
   * Creates an empty manifest if it doesn't exist
   * @returns The parsed GlobalSkillsManifest
   */
  async readManifest(): Promise<GlobalSkillsManifest> {
    const manifestPath = this.getManifestPath();

    // Create empty manifest if it doesn't exist
    if (!(await fs.pathExists(manifestPath))) {
      const emptyManifest: GlobalSkillsManifest = {
        version: "1.0.0",
        skills: {},
        updatedAt: new Date().toISOString(),
      };
      await this.writeManifest(emptyManifest);
      return emptyManifest;
    }

    try {
      const manifest = (await fs.readJson(
        manifestPath,
      )) as GlobalSkillsManifest;
      return manifest;
    } catch (error) {
      throw new Error(
        `Failed to parse global skills manifest at ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  /**
   * Write the global skills manifest to disk
   * @param manifest - The GlobalSkillsManifest to write
   * @throws Error if write operation fails
   */
  async writeManifest(manifest: GlobalSkillsManifest): Promise<void> {
    const manifestPath = this.getManifestPath();

    try {
      await this.ensureGlobalSkillsDir();
      await fs.writeJson(manifestPath, manifest, { spaces: 2 });
    } catch (error) {
      throw new Error(
        `Failed to write global skills manifest to ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  /**
   * Deploy a skill directory from source to global location
   * @param sourcePath - Full path to source skill directory
   * @param skillId - Unique skill identifier
   * @param metadata - Skill metadata (description, module, etc.)
   * @throws Error if deployment fails
   */
  async deploySkill(
    sourcePath: string,
    skillId: string,
    metadata: Partial<GlobalSkillInfo>,
  ): Promise<void> {
    // Validate source path exists
    if (!(await fs.pathExists(sourcePath))) {
      throw new Error(`Source skill directory not found: ${sourcePath}`);
    }

    const stats = await fs.stat(sourcePath);
    if (!stats.isDirectory()) {
      throw new Error(`Source path is not a directory: ${sourcePath}`);
    }

    // Ensure global skills directory exists
    await this.ensureGlobalSkillsDir();

    // Destination path
    const globalSkillsPath = GlobalSkillsManager.getGlobalSkillsPath();
    const destPath = path.join(globalSkillsPath, skillId);

    try {
      // Copy skill directory, filtering out .DS_Store files
      await fs.copy(sourcePath, destPath, {
        overwrite: true,
        filter: (src: string) => {
          return !src.endsWith(".DS_Store");
        },
      });

      // Update manifest
      const manifest = await this.readManifest();
      const now = new Date().toISOString();

      const skillInfo: GlobalSkillInfo = {
        id: skillId,
        name: metadata.name || skillId,
        description: metadata.description || "",
        scope: metadata.scope || "shared",
        deployedAt: now,
        deployedFrom: metadata.deployedFrom || "",
        sourceModule: metadata.sourceModule || "",
        version: metadata.version,
        capabilities: metadata.capabilities,
      };

      manifest.skills[skillId] = skillInfo;
      manifest.updatedAt = now;

      await this.writeManifest(manifest);
    } catch (error) {
      throw new Error(
        `Failed to deploy skill ${skillId} from ${sourcePath} to ${destPath}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  /**
   * Remove a skill from the global location
   * @param skillId - Unique skill identifier
   * @throws Error if removal fails
   */
  async removeSkill(skillId: string): Promise<void> {
    const globalSkillsPath = GlobalSkillsManager.getGlobalSkillsPath();
    const skillPath = path.join(globalSkillsPath, skillId);

    // Check if skill exists
    if (!(await fs.pathExists(skillPath))) {
      throw new Error(`Global skill not found: ${skillId} at ${skillPath}`);
    }

    try {
      // Remove skill directory
      await fs.remove(skillPath);

      // Update manifest
      const manifest = await this.readManifest();
      delete manifest.skills[skillId];
      manifest.updatedAt = new Date().toISOString();

      await this.writeManifest(manifest);
    } catch (error) {
      throw new Error(
        `Failed to remove global skill ${skillId} from ${skillPath}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  /**
   * List all global skills
   * @returns Array of GlobalSkillInfo for all deployed skills
   */
  async listSkills(): Promise<GlobalSkillInfo[]> {
    const manifest = await this.readManifest();
    return Object.values(manifest.skills);
  }

  /**
   * Check if a skill exists in the global location
   * @param skillId - Unique skill identifier
   * @returns True if skill exists, false otherwise
   */
  async skillExists(skillId: string): Promise<boolean> {
    const manifest = await this.readManifest();
    return skillId in manifest.skills;
  }

  /**
   * Get information about a specific global skill
   * @param skillId - Unique skill identifier
   * @returns GlobalSkillInfo if skill exists, null otherwise
   */
  async getSkillInfo(skillId: string): Promise<GlobalSkillInfo | null> {
    const manifest = await this.readManifest();
    return manifest.skills[skillId] || null;
  }
}
