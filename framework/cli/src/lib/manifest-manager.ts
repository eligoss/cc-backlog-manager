import fs from "fs-extra";
import path from "path";

/**
 * Framework manifest schema (.agentic-framework.json)
 * Tracks installed framework version, modules, and project settings
 */
/**
 * MCP configuration stored in manifest
 */
export interface McpManifestConfig {
  enabled: boolean;
  graphiti: {
    enabled: boolean;
    groupId: string;
  };
  serena: {
    enabled: boolean;
    projectName: string;
    language: string;
  };
}

export interface FrameworkManifest {
  version: string; // Manifest schema version (e.g., "1.0.0")
  framework: {
    version: string; // Installed framework version
    cliVersion?: string; // CLI version that performed last sync/init
    installedAt: string; // ISO timestamp
    updatedAt: string; // ISO timestamp of last update
    pinned?: boolean; // If true, don't suggest updates
  };
  modules: Record<
    string,
    {
      version: string;
      installedAt: string;
    }
  >;
  projectSkills: string[]; // Paths to project-specific skills
  settings: {
    autoSyncSkills: boolean;
    linkTransformation: boolean;
  };
  paths?: {
    source?: string; // Path to framework source (for self-dev projects)
    deployed?: string; // Path to deployed artifacts
    projectData?: string; // Path to project data (ai/)
  };
  mcp?: McpManifestConfig; // MCP integration configuration
}

/**
 * Manages the framework manifest for a project
 * Handles reading, writing, and updating .agentic-framework.json
 */
export class ManifestManager {
  private readonly manifestFileName = ".agentic-framework.json";

  /**
   * Create a new ManifestManager instance
   * @param projectPath - Root path of the project
   */
  constructor(private projectPath: string) {}

  /**
   * Check if manifest exists in the project
   * @returns true if manifest file exists, false otherwise
   */
  async exists(): Promise<boolean> {
    const manifestPath = this.getManifestPath();
    return fs.pathExists(manifestPath);
  }

  /**
   * Read the manifest from disk
   * @returns The parsed FrameworkManifest
   * @throws Error if manifest does not exist or JSON is invalid
   */
  async read(): Promise<FrameworkManifest> {
    const manifestPath = this.getManifestPath();

    if (!(await fs.pathExists(manifestPath))) {
      throw new Error(
        `Manifest file not found at ${manifestPath}. Run 'agentic-framework init' to create one.`,
      );
    }

    try {
      const manifest = (await fs.readJson(manifestPath)) as FrameworkManifest;
      return manifest;
    } catch (error) {
      throw new Error(
        `Failed to parse manifest at ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  /**
   * Write the manifest to disk
   * @param manifest - The FrameworkManifest to write
   * @throws Error if write operation fails
   */
  async write(manifest: FrameworkManifest): Promise<void> {
    const manifestPath = this.getManifestPath();

    try {
      await fs.ensureDir(this.projectPath);
      await fs.writeJson(manifestPath, manifest, { spaces: 2 });
    } catch (error) {
      throw new Error(
        `Failed to write manifest to ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  /**
   * Create a new manifest with default values
   * @param frameworkVersion - The version of the framework being installed
   * @param modules - Array of module IDs to include in the manifest
   * @returns The newly created FrameworkManifest
   */
  async create(
    frameworkVersion: string,
    modules: string[],
  ): Promise<FrameworkManifest> {
    const now = new Date().toISOString();

    const manifest: FrameworkManifest = {
      version: "1.0.0",
      framework: {
        version: frameworkVersion,
        installedAt: now,
        updatedAt: now,
        pinned: false,
      },
      modules: {},
      projectSkills: [],
      settings: {
        autoSyncSkills: true,
        linkTransformation: true,
      },
    };

    // Populate modules with provided module IDs
    for (const moduleId of modules) {
      manifest.modules[moduleId] = {
        version: frameworkVersion,
        installedAt: now,
      };
    }

    return manifest;
  }

  /**
   * Get the full path to the manifest file
   * @returns Absolute path to .agentic-framework.json
   */
  getManifestPath(): string {
    return path.join(this.projectPath, this.manifestFileName);
  }

  /**
   * Add a module to the manifest
   * @param moduleId - Unique identifier for the module
   * @param version - Version of the module being added
   * @throws Error if manifest does not exist or write fails
   */
  async addModule(moduleId: string, version: string): Promise<void> {
    const manifest = await this.read();
    const now = new Date().toISOString();

    manifest.modules[moduleId] = {
      version,
      installedAt: now,
    };

    manifest.framework.updatedAt = now;

    await this.write(manifest);
  }

  /**
   * Remove a module from the manifest
   * @param moduleId - Unique identifier for the module to remove
   * @throws Error if manifest does not exist or write fails
   */
  async removeModule(moduleId: string): Promise<void> {
    const manifest = await this.read();
    const now = new Date().toISOString();

    delete manifest.modules[moduleId];
    manifest.framework.updatedAt = now;

    await this.write(manifest);
  }

  /**
   * Update the framework version in the manifest
   * @param version - New framework version
   * @throws Error if manifest does not exist or write fails
   */
  async updateFrameworkVersion(version: string): Promise<void> {
    const manifest = await this.read();
    const now = new Date().toISOString();

    manifest.framework.version = version;
    manifest.framework.updatedAt = now;

    await this.write(manifest);
  }

  /**
   * Register a project-specific skill path in the manifest
   * @param skillPath - File system path to the project skill
   * @throws Error if manifest does not exist or write fails
   */
  async registerProjectSkill(skillPath: string): Promise<void> {
    const manifest = await this.read();
    const now = new Date().toISOString();

    // Avoid duplicate registrations
    if (!manifest.projectSkills.includes(skillPath)) {
      manifest.projectSkills.push(skillPath);
    }

    manifest.framework.updatedAt = now;

    await this.write(manifest);
  }
}
