import fs from 'fs-extra';
import path from 'path';

/**
 * Represents a version source file and its extracted version
 */
export interface VersionSource {
  /** The source file path (relative) */
  file: string;
  /** The extracted version string (normalized without 'v' prefix), or null if not found */
  version: string | null;
  /** Error message if extraction failed */
  error?: string;
}

/**
 * Result of version consistency validation
 */
export interface VersionValidationResult {
  /** Whether all versions are consistent */
  valid: boolean;
  /** All version sources checked */
  sources: VersionSource[];
  /** List of mismatch descriptions (only present if valid=false) */
  mismatches?: string[];
  /** List of errors (only present if valid=false) */
  errors?: string[];
}

/**
 * Validates version consistency across framework files
 *
 * Checks that version numbers match in:
 * - CLAUDE.md (Framework Version: **vX.Y.Z**)
 * - README.md (**Version:** X.Y.Z)
 * - framework/cli/package.json ("version": "X.Y.Z")
 *
 * @example
 * ```typescript
 * const validator = new VersionValidator('/path/to/framework');
 * const result = await validator.validateConsistency();
 * if (!result.valid) {
 *   console.error('Version mismatch:', result.mismatches);
 * }
 * ```
 */
export class VersionValidator {
  private readonly frameworkRoot: string;

  /**
   * Create a new VersionValidator
   * @param frameworkRoot - Absolute path to the framework root directory
   */
  constructor(frameworkRoot: string) {
    this.frameworkRoot = frameworkRoot;
  }

  /**
   * Extract version from CLAUDE.md
   *
   * Pattern: `Framework Version: **vX.Y.Z**` or `Framework Version: **X.Y.Z**`
   * Takes the first match if multiple versions are present.
   * Normalizes by removing 'v' prefix if present.
   *
   * @returns Version string (without 'v' prefix) or null if not found/file missing
   */
  async extractClaudeMdVersion(): Promise<string | null> {
    const filePath = path.join(this.frameworkRoot, 'CLAUDE.md');

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Pattern: Framework Version: **vX.Y.Z** or Framework Version: **X.Y.Z**
      const pattern = /Framework Version:\s*\*\*v?(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?(?:\+[a-zA-Z0-9.]+)?)\*\*/;
      const match = content.match(pattern);

      if (match && match[1]) {
        return match[1]; // Already normalized (v prefix removed by pattern)
      }

      return null;
    } catch (_error) {
      // File doesn't exist or can't be read
      return null;
    }
  }

  /**
   * Extract version from README.md
   *
   * Pattern: `**Version:** X.Y.Z` or `**Version:** vX.Y.Z`
   * Takes the first match if multiple versions are present.
   * Normalizes by removing 'v' prefix if present.
   *
   * @returns Version string (without 'v' prefix) or null if not found/file missing
   */
  async extractReadmeVersion(): Promise<string | null> {
    const filePath = path.join(this.frameworkRoot, 'README.md');

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Pattern: **Version:** vX.Y.Z or **Version:** X.Y.Z
      const pattern = /\*\*Version:\*\*\s*v?(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?(?:\+[a-zA-Z0-9.]+)?)/;
      const match = content.match(pattern);

      if (match && match[1]) {
        return match[1]; // Already normalized (v prefix removed by pattern)
      }

      return null;
    } catch (_error) {
      // File doesn't exist or can't be read
      return null;
    }
  }

  /**
   * Extract version from framework/cli/package.json
   *
   * Reads the standard "version" field from package.json.
   * Handles malformed JSON gracefully.
   *
   * @returns Version string or null if not found/file missing/invalid JSON
   */
  async extractPackageJsonVersion(): Promise<string | null> {
    const filePath = path.join(this.frameworkRoot, 'framework', 'cli', 'package.json');

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      if (!content.trim()) {
        return null;
      }

      const packageJson = JSON.parse(content);

      if (packageJson && typeof packageJson.version === 'string') {
        return packageJson.version;
      }

      return null;
    } catch (_error) {
      // File doesn't exist, can't be read, or invalid JSON
      return null;
    }
  }

  /**
   * Validate version consistency across all framework files
   *
   * Extracts versions from CLAUDE.md, README.md, and cli/package.json,
   * then checks that they all match. Normalizes versions by removing
   * 'v' prefix if present.
   *
   * @returns Validation result with detailed source information and any errors/mismatches
   */
  async validateConsistency(): Promise<VersionValidationResult> {
    const sources: VersionSource[] = [];
    const errors: string[] = [];

    // Extract from all sources
    const claudeVersion = await this.extractClaudeMdVersion();
    sources.push({
      file: 'CLAUDE.md',
      version: claudeVersion,
      error: claudeVersion === null ? 'Version not found or file missing' : undefined
    });

    const readmeVersion = await this.extractReadmeVersion();
    sources.push({
      file: 'README.md',
      version: readmeVersion,
      error: readmeVersion === null ? 'Version not found or file missing' : undefined
    });

    const packageVersion = await this.extractPackageJsonVersion();
    sources.push({
      file: 'framework/cli/package.json',
      version: packageVersion,
      error: packageVersion === null ? 'Version not found or file missing' : undefined
    });

    // Collect errors for missing versions
    for (const source of sources) {
      if (source.version === null) {
        errors.push(`${source.file}: ${source.error}`);
      }
    }

    // If any source is missing, validation fails
    if (errors.length > 0) {
      return {
        valid: false,
        sources,
        errors
      };
    }

    // Check for mismatches
    const versions = sources.map(s => s.version).filter((v): v is string => v !== null);
    const uniqueVersions = [...new Set(versions)];

    if (uniqueVersions.length > 1) {
      // Versions don't match
      const mismatches: string[] = [];

      // Create mismatch descriptions
      const baseVersion = versions[0];
      for (let i = 1; i < sources.length; i++) {
        if (sources[i].version !== baseVersion) {
          mismatches.push(
            `${sources[i].file} has version ${sources[i].version}, expected ${baseVersion}`
          );
        }
      }

      return {
        valid: false,
        sources,
        mismatches
      };
    }

    // All versions match
    return {
      valid: true,
      sources
    };
  }
}
