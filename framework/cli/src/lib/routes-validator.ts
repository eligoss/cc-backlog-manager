import path from "path";
import fs from "fs-extra";
import yaml from "yaml";

/**
 * Represents an entry in routes.yml
 */
export interface RoutesEntry {
  path: string;
  description?: string;
  exists: boolean;
}

/**
 * Result of routes validation
 */
export interface RoutesValidationResult {
  valid: boolean;
  missing: string[]; // In routes.yml but not filesystem
  undefined: string[]; // In filesystem but not routes.yml
  synced: string[]; // Present in both
}

/**
 * Directories to exclude from filesystem scan
 */
const EXCLUDED_DIRS = new Set([
  ".git",
  ".env",
  "__pycache__",
  ".pytest_cache",
  "node_modules",
  ".DS_Store",
  ".vscode",
  ".obsidian",
  ".claude",
]);

/**
 * Directories that are expected to be missing (planned future structure)
 */
const PLANNED_DIRS = new Set([
  "confluence/published",
  "confluence/imports/confluence-exports",
  "confluence/imports/report-data",
  "reports/APM-R/performance",
  "reports/APM-R/team-metrics",
  "reports/APM-R/published",
  "docs/business",
]);

/**
 * Validates and synchronizes routes.yml with filesystem structure
 */
export class RoutesValidator {
  public readonly frameworkRoot: string;
  private routesFile: string;

  constructor(frameworkRoot: string) {
    this.frameworkRoot = path.resolve(frameworkRoot);
    this.routesFile = path.join(this.frameworkRoot, "routes.yml");
  }

  /**
   * Recursively scan filesystem and return set of relative directory paths
   */
  async scanFilesystem(): Promise<string[]> {
    const paths: string[] = [];

    const scan = async (dir: string, relativePath: string = "") => {
      let entries: fs.Dirent[];

      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch (_error) {
        // Skip directories we can't read
        return;
      }

      // Filter out excluded and hidden directories
      const directories = entries.filter((entry) => {
        if (!entry.isDirectory()) return false;
        if (EXCLUDED_DIRS.has(entry.name)) return false;
        if (entry.name.startsWith(".")) return false;
        return true;
      });

      for (const dirEntry of directories) {
        const dirPath = path.join(dir, dirEntry.name);
        const relPath = relativePath
          ? `${relativePath}/${dirEntry.name}`
          : dirEntry.name;

        // Check if directory is meaningful
        if (await this.isMeaningfulDirectory(dirPath)) {
          // Normalize path separators to forward slashes
          const normalizedPath = relPath.replace(/\\/g, "/");

          // Check depth (skip deeply nested directories > 4 levels)
          const depth = normalizedPath.split("/").length;
          if (depth <= 4) {
            paths.push(normalizedPath);

            // Recursively scan subdirectories
            await scan(dirPath, normalizedPath);
          }
        }
      }
    };

    await scan(this.frameworkRoot);
    return paths.sort();
  }

  /**
   * Check if directory is meaningful (not empty or .gitkeep only)
   */
  private async isMeaningfulDirectory(dirPath: string): Promise<boolean> {
    try {
      const entries = await fs.readdir(dirPath);

      // Filter out non-meaningful files
      const meaningfulFiles = entries.filter(
        (name) =>
          name !== ".gitkeep" && name !== ".DS_Store" && name !== ".gitignore",
      );

      if (meaningfulFiles.length === 0) {
        return false;
      }

      // Check if there are actual files (not just directories)
      const hasFiles = await Promise.all(
        meaningfulFiles.map(async (name) => {
          const fullPath = path.join(dirPath, name);
          const stat = await fs.stat(fullPath);
          return stat.isFile();
        }),
      );

      // Check if there are subdirectories
      const hasSubdirs = await Promise.all(
        meaningfulFiles.map(async (name) => {
          const fullPath = path.join(dirPath, name);
          const stat = await fs.stat(fullPath);
          return stat.isDirectory() && !EXCLUDED_DIRS.has(name);
        }),
      );

      return hasFiles.some((x) => x) || hasSubdirs.some((x) => x);
    } catch (_error) {
      return false;
    }
  }

  /**
   * Parse routes.yml and extract all defined paths
   */
  async parseRoutesYml(): Promise<RoutesEntry[]> {
    if (!(await fs.pathExists(this.routesFile))) {
      throw new Error(`routes.yml not found at ${this.routesFile}`);
    }

    const content = await fs.readFile(this.routesFile, "utf-8");
    const routes = yaml.parse(content) || {};

    const uniquePaths = new Map<string, RoutesEntry>();

    if (!routes.paths || typeof routes.paths !== "object") {
      return [];
    }

    // Extract paths from the nested structure
    for (const [_category, pathsDict] of Object.entries(routes.paths)) {
      if (typeof pathsDict !== "object" || pathsDict === null) {
        continue;
      }

      for (const [_key, value] of Object.entries(pathsDict)) {
        if (typeof value === "string") {
          // Normalize path (remove trailing slash)
          const normalizedPath = value.replace(/\/+$/, "");

          if (!normalizedPath) {
            continue; // Skip empty paths
          }

          // Check if path exists on filesystem
          const fullPath = path.join(this.frameworkRoot, normalizedPath);
          const exists = await fs.pathExists(fullPath);

          // Add to unique paths map
          if (!uniquePaths.has(normalizedPath)) {
            uniquePaths.set(normalizedPath, {
              path: normalizedPath,
              exists,
            });
          }
        }
      }
    }

    return Array.from(uniquePaths.values()).sort((a, b) =>
      a.path.localeCompare(b.path),
    );
  }

  /**
   * Validate routes.yml against filesystem structure
   */
  async validateRoutes(): Promise<RoutesValidationResult> {
    const filesystemPaths = new Set(await this.scanFilesystem());
    const routeEntries = await this.parseRoutesYml();
    const routesPaths = new Set(routeEntries.map((e) => e.path));

    const missing: string[] = [];
    const undefinedPaths: string[] = [];
    const synced: string[] = [];

    // Check for paths in routes.yml but not in filesystem
    for (const routePath of Array.from(routesPaths).sort()) {
      if (!filesystemPaths.has(routePath)) {
        // Skip planned directories
        if (!PLANNED_DIRS.has(routePath)) {
          missing.push(routePath);
        }
      } else {
        synced.push(routePath);
      }
    }

    // Check for paths in filesystem but not in routes.yml
    for (const fsPath of Array.from(filesystemPaths).sort()) {
      if (!routesPaths.has(fsPath)) {
        // Skip planned directories
        if (!PLANNED_DIRS.has(fsPath)) {
          undefinedPaths.push(fsPath);
        }
      }
    }

    return {
      valid: missing.length === 0 && undefinedPaths.length === 0,
      missing,
      undefined: undefinedPaths,
      synced,
    };
  }

  /**
   * Generate updated routes.yml content based on current filesystem
   */
  async generateRoutesYml(): Promise<string> {
    // Load current routes.yml to preserve metadata
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentRoutes: any = {};
    try {
      const content = await fs.readFile(this.routesFile, "utf-8");
      currentRoutes = yaml.parse(content) || {};
    } catch (_error) {
      // If routes.yml doesn't exist, start fresh with the initial value
    }

    const filesystemPaths = await this.scanFilesystem();

    // Build organized paths structure
    const organizedPaths: Record<string, Record<string, string>> = {};

    // Group paths by top-level directory
    const topLevelCategories = new Set(
      filesystemPaths.map((p) => p.split("/")[0]),
    );

    for (const category of Array.from(topLevelCategories).sort()) {
      organizedPaths[category] = {
        root: `${category}/`,
      };

      // Add all sub-paths for this category
      const subPaths = filesystemPaths
        .filter((p) => p.startsWith(`${category}/`))
        .sort();

      for (const subPath of subPaths) {
        // Generate key from path (remove category prefix, replace / with -)
        const key = subPath.slice(category.length + 1).replace(/\//g, "-");
        organizedPaths[category][key] = `${subPath}/`;
      }
    }

    // Build final routes object
    const updated: Record<string, unknown> = {
      ...currentRoutes,
      paths: organizedPaths,
    };

    // Update meta section
    if (!updated.meta || typeof updated.meta !== "object") {
      updated.meta = {};
    }

    (updated.meta as Record<string, unknown>)["last-updated"] = new Date()
      .toISOString()
      .split("T")[0];
    (updated.meta as Record<string, unknown>)["sync-status"] = "synchronized";

    // Convert to YAML with proper formatting
    return yaml.stringify(updated, {
      lineWidth: 0, // Disable line wrapping
      defaultStringType: "PLAIN",
      defaultKeyType: "PLAIN",
    });
  }

  /**
   * Apply updates to routes.yml file
   */
  async applyFix(): Promise<boolean> {
    try {
      const updatedContent = await this.generateRoutesYml();
      await fs.writeFile(this.routesFile, updatedContent, "utf-8");
      return true;
    } catch (_error) {
      return false;
    }
  }
}
