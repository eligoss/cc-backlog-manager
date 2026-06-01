/**
 * Link Transformer Module
 *
 * Transforms relative markdown links to absolute paths when syncing agents/skills
 * to deployment folders. This ensures links remain valid regardless of where the
 * deployed files are accessed from.
 *
 * Usage:
 *     const transformer = new LinkTransformer("/path/to/framework");
 *     const transformedContent = await transformer.transformFile(sourcePath, targetPath);
 *
 * Link Type Handling:
 *     - {project} placeholders
 *       → Replace with actual project root path
 *     - Framework files (.claude/registries/*.json, .claude/context/*.md, etc.)
 *       → Transform to absolute path using framework root
 *     - Internal files (./EXAMPLES.md, ./STANDARDS.md)
 *       → Preserve as-is (same directory)
 *     - External URLs (http://, https://)
 *       → Preserve as-is
 *     - Anchor-only links (#section)
 *       → Preserve as-is
 *     - Images (.png, .jpg, .gif, .svg, .webp)
 *       → Preserve as-is
 *     - Combined links (file.md#section)
 *       → Transform path, preserve anchor, rejoin
 */

import path from 'path';
import fs from 'fs-extra';

/**
 * Transforms markdown links from relative to absolute paths.
 *
 * This class handles the transformation of relative markdown links to absolute
 * paths based on a framework root directory. It intelligently preserves certain
 * link types (internal files, URLs, anchors, images) while transforming
 * framework file references.
 */
export class LinkTransformer {
  /** Placeholder for project root in source files - replaced during sync */
  private static readonly PROJECT_PLACEHOLDER = '{project}';

  /** Framework file patterns that should be transformed to absolute paths */
  private static readonly FRAMEWORK_FILE_PATTERNS = [
    '.claude/registries/',
    '.claude/context/',
    '.claude/framework/',
    '.claude/commands/',
    '.claude/skills/',
    'README.md',
    'CLAUDE.md',
    'routes.yml',
    'backlog/',
    'confluence/',
    '.claude/plans/',
  ];

  /** Image file extensions to preserve as-is */
  private static readonly IMAGE_EXTENSIONS = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.webp',
  ]);

  /** Markdown link pattern: [text](path) or [text](path#anchor) */
  private static readonly LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

  private readonly frameworkRoot: string;
  private readonly projectRoot: string;

  /**
   * Initialize the LinkTransformer.
   *
   * @param frameworkRoot - Absolute path to the framework source directory (where modules are)
   * @param projectRoot - Absolute path to the project root (where deployed files go).
   *                      If not provided, defaults to frameworkRoot for backward compatibility.
   * @throws {Error} If framework_root is empty, doesn't exist, or is not a directory
   */
  constructor(frameworkRoot: string, projectRoot?: string) {
    if (!frameworkRoot) {
      throw new Error('frameworkRoot cannot be empty');
    }

    this.frameworkRoot = path.resolve(frameworkRoot);
    // projectRoot is where {project}/ placeholders should resolve to
    this.projectRoot = projectRoot ? path.resolve(projectRoot) : this.frameworkRoot;

    if (!fs.pathExistsSync(this.frameworkRoot)) {
      throw new Error(`frameworkRoot does not exist: ${this.frameworkRoot}`);
    }

    if (!fs.statSync(this.frameworkRoot).isDirectory()) {
      throw new Error(`frameworkRoot is not a directory: ${this.frameworkRoot}`);
    }
  }

  /**
   * Transform all links in a markdown file.
   *
   * Reads the source file, transforms all markdown links according to the
   * transformation rules, and returns the transformed content.
   *
   * @param sourcePath - Path to the source markdown file
   * @param targetPath - Path where the file will be deployed (used for context)
   * @returns Transformed markdown content with absolute links where appropriate
   * @throws {Error} If source_path does not exist or is not a file
   */
  async transformFile(sourcePath: string, _targetPath: string): Promise<string> {
    const resolvedSourcePath = path.resolve(sourcePath);

    if (!(await fs.pathExists(resolvedSourcePath))) {
      throw new Error(`Source file not found: ${resolvedSourcePath}`);
    }

    const stats = await fs.stat(resolvedSourcePath);
    if (!stats.isFile()) {
      throw new Error(`Source path is not a file: ${resolvedSourcePath}`);
    }

    // Read source content
    const content = await fs.readFile(resolvedSourcePath, 'utf-8');

    // Transform all links
    return this.transformContent(content, resolvedSourcePath);
  }

  /**
   * Transform content string directly (useful for testing).
   *
   * @param content - Markdown content to transform
   * @param sourcePath - Path to the source file (for resolving relative links)
   * @returns Transformed markdown content
   */
  transformContent(content: string, sourcePath: string): string {
    const resolvedSourcePath = path.resolve(sourcePath);

    // First, replace {project} placeholders with actual project root
    let transformedContent = this.replaceProjectPlaceholders(content);

    // Then, replace all relative links in content
    transformedContent = transformedContent.replace(
      LinkTransformer.LINK_PATTERN,
      (match, linkText, linkPath) => {
        // Transform the link path
        const transformedPath = this.transformLink(linkPath, resolvedSourcePath);

        // Return the transformed markdown link
        return `[${linkText}](${transformedPath})`;
      }
    );

    return transformedContent;
  }

  /**
   * Replace {project} placeholders with actual project root path.
   *
   * This allows source files to use portable placeholders like:
   *   [agents.json]({project}/.claude/registries/agents.json)
   *
   * Which get transformed to actual paths during sync:
   *   [agents.json](/path/to/project/.claude/registries/agents.json)
   *
   * @param content - Content with potential {project} placeholders
   * @returns Content with placeholders replaced by actual project root
   */
  private replaceProjectPlaceholders(content: string): string {
    // Replace all occurrences of {project} with the project root (deployment target)
    return content.replace(
      new RegExp(LinkTransformer.PROJECT_PLACEHOLDER.replace(/[{}]/g, '\\$&'), 'g'),
      this.projectRoot
    );
  }

  /**
   * Transform a single link path.
   *
   * Determines the link type and applies the appropriate transformation:
   * - External URLs: preserved as-is
   * - Anchor-only: preserved as-is
   * - Images: preserved as-is
   * - Internal files (./...): preserved as-is
   * - Placeholder paths (url, path, file, etc.): preserved as-is
   * - Framework files: transformed to absolute paths
   *
   * @param linkPath - The link path to transform
   * @param sourceFile - The source file containing the link
   * @returns Transformed link path
   */
  private transformLink(linkPath: string, sourceFile: string): string {
    // Empty link - preserve as-is
    if (!linkPath || !linkPath.trim()) {
      return linkPath;
    }

    // External URL - preserve as-is
    if (this.isExternalUrl(linkPath)) {
      return linkPath;
    }

    // Anchor-only link - preserve as-is
    if (linkPath.startsWith('#')) {
      return linkPath;
    }

    // Image link - preserve as-is
    if (this.isImageLink(linkPath)) {
      return linkPath;
    }

    // Internal file (starts with ./) - preserve as-is
    if (this.isInternalFile(linkPath)) {
      return linkPath;
    }

    // Placeholder path - preserve as-is
    if (this.isPlaceholderPath(linkPath)) {
      return linkPath;
    }

    // Handle combined links (file.md#section)
    let anchor: string | null = null;
    let pathWithoutAnchor = linkPath;

    if (linkPath.includes('#')) {
      const parts = linkPath.split('#');
      pathWithoutAnchor = parts[0];
      anchor = parts.slice(1).join('#');
    }

    // Resolve the relative path to an absolute path
    const sourceDir = path.dirname(sourceFile);
    const resolvedPath = this.resolveRelativePath(pathWithoutAnchor, sourceDir);

    // Check if this is a framework file
    if (this.isFrameworkFile(resolvedPath)) {
      try {
        // Get path relative to framework root
        const relativePath = path.relative(this.frameworkRoot, resolvedPath);

        // Check if path is actually under framework root
        if (!relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
          // Build absolute path
          const absolutePath = path.join(this.frameworkRoot, relativePath);

          // Add anchor back if it existed
          if (anchor) {
            return `${absolutePath}#${anchor}`;
          }

          return absolutePath;
        }

        // Path is not under framework root - preserve original
        if (anchor) {
          return `${pathWithoutAnchor}#${anchor}`;
        }
        return pathWithoutAnchor;
      } catch (_error) {
        // Error computing relative path - preserve original
        if (anchor) {
          return `${pathWithoutAnchor}#${anchor}`;
        }
        return pathWithoutAnchor;
      }
    }

    // Not a framework file - preserve original
    if (anchor) {
      return `${pathWithoutAnchor}#${anchor}`;
    }
    return pathWithoutAnchor;
  }

  /**
   * Check if a resolved path is a framework file that should be transformed.
   *
   * Framework files include:
   * - .claude/registries/*.json
   * - .claude/context/**\/*.md
   * - .claude/framework/**\/*.md
   * - .claude/commands/**\/*.md
   * - .claude/skills/**\/*.md
   * - .claude/plans/**\/*.md
   * - README.md, CLAUDE.md, routes.yml
   * - backlog/**\/*.md
   * - confluence/**\/*.md
   *
   * @param resolvedPath - Absolute path to check
   * @returns True if this is a framework file, False otherwise
   */
  private isFrameworkFile(resolvedPath: string): boolean {
    try {
      // Get path relative to framework root
      const relativePath = path.relative(this.frameworkRoot, resolvedPath);

      // If path is outside framework root, it's not a framework file
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        return false;
      }

      // Normalize to forward slashes for consistent matching
      const normalizedPath = relativePath.split(path.sep).join('/');

      // Check against framework file patterns
      for (const pattern of LinkTransformer.FRAMEWORK_FILE_PATTERNS) {
        if (normalizedPath === pattern || normalizedPath.startsWith(pattern)) {
          return true;
        }
      }

      return false;
    } catch (_error) {
      // Path is not under framework root
      return false;
    }
  }

  /**
   * Check if a link is an internal file (starts with ./).
   *
   * Internal files are in the same directory as the source file and should
   * be preserved as-is.
   *
   * @param linkPath - Link path to check
   * @returns True if this is an internal file link, False otherwise
   */
  private isInternalFile(linkPath: string): boolean {
    return linkPath.startsWith('./');
  }

  /**
   * Check if a link is a placeholder path used in documentation examples.
   *
   * Placeholder paths are generic examples like 'url', 'path', 'file', etc.
   * that appear in markdown syntax examples and should be preserved as-is.
   *
   * @param linkPath - Link path to check
   * @returns True if this is a placeholder path, False otherwise
   */
  private isPlaceholderPath(linkPath: string): boolean {
    // Common placeholder values used in documentation
    const placeholders = new Set(['url', 'path', 'file', 'link', 'href', 'src', 'target']);
    return placeholders.has(linkPath.toLowerCase().trim());
  }

  /**
   * Check if a link is an external URL.
   *
   * External URLs start with http:// or https:// and should be preserved as-is.
   *
   * @param linkPath - Link path to check
   * @returns True if this is an external URL, False otherwise
   */
  private isExternalUrl(linkPath: string): boolean {
    return linkPath.startsWith('http://') || linkPath.startsWith('https://');
  }

  /**
   * Check if a link is an image file.
   *
   * Image files have extensions like .png, .jpg, .gif, etc. and should be
   * preserved as-is.
   *
   * @param linkPath - Link path to check
   * @returns True if this is an image link, False otherwise
   */
  private isImageLink(linkPath: string): boolean {
    // Extract path without anchor
    const pathOnly = linkPath.split('#')[0];
    const ext = path.extname(pathOnly).toLowerCase();
    return LinkTransformer.IMAGE_EXTENSIONS.has(ext);
  }

  /**
   * Resolve a relative path to an absolute path.
   *
   * Handles relative paths like:
   * - ../registry.yml
   * - ../context/business-advanced.md
   * - ../../README.md
   *
   * @param linkPath - Relative link path
   * @param fromDir - Directory containing the source file
   * @returns Resolved absolute path
   */
  private resolveRelativePath(linkPath: string, fromDir: string): string {
    // Combine the source directory with the relative link path
    const combinedPath = path.join(fromDir, linkPath);

    // Resolve to absolute path (handles .. and . components)
    const resolvedPath = path.resolve(combinedPath);

    return resolvedPath;
  }
}
