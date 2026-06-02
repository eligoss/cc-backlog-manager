/**
 * Markdown Link Validator
 *
 * Validates markdown links and detects anti-patterns in framework documentation files.
 * TypeScript implementation of Python link_validator.py algorithm.
 *
 * Features:
 * - Detects broken file links
 * - Identifies anti-patterns (backticked paths, unlinked references, plain paths)
 * - Two-tier strictness (framework files vs content files)
 * - Comprehensive path resolution (relative, absolute, project-relative)
 *
 * @module link-validator
 */

import * as fs from "fs/promises";
import * as path from "path";

/**
 * Represents a markdown link found in a file
 */
export interface MarkdownLink {
  /** Link text (the part in square brackets) */
  text: string;
  /** Link target path or URL */
  target: string;
  /** Line number (1-indexed) */
  line: number;
  /** Column start position */
  columnStart: number;
  /** Column end position */
  columnEnd: number;
}

/**
 * Represents a broken or invalid link
 */
export interface BrokenLink {
  /** Source file containing the broken link */
  file: string;
  /** Line number (1-indexed) */
  line: number;
  /** Link text */
  linkText: string;
  /** Target path that was broken */
  target: string;
  /** Reason why the link is broken */
  reason: string;
  /** Resolved absolute path (for debugging) */
  resolvedPath?: string;
}

/**
 * Represents a documentation anti-pattern
 */
export interface AntiPattern {
  /** Source file containing the anti-pattern */
  file: string;
  /** Line number (1-indexed) */
  line: number;
  /** Type of anti-pattern detected */
  patternType:
    | "backticked_path"
    | "unlinked_reference"
    | "plain_path_in_workflow";
  /** Pattern content */
  pattern: string;
  /** Suggested fix */
  suggestion: string;
}

/**
 * Validation results for markdown links
 */
export interface LinkValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** List of broken links found */
  brokenLinks: BrokenLink[];
  /** List of anti-patterns detected */
  antiPatterns: AntiPattern[];
  /** Number of files checked */
  filesChecked: number;
  /** Number of links checked */
  linksChecked: number;
}

/**
 * File-specific validation result
 */
interface FileValidationResult {
  file: string;
  isFrameworkFile: boolean;
  valid: boolean;
  brokenLinks: BrokenLink[];
  antiPatterns: AntiPattern[];
  linksChecked: number;
}

/**
 * Markdown Link Validator
 *
 * Validates markdown links in framework documentation with two-tier strictness:
 * - Framework core files (.claude/, src/, core/, cli/) → critical errors
 * - Content files (backlog/, docs/) → warnings only
 *
 * @example
 * ```typescript
 * const validator = new MarkdownLinkValidator('/path/to/framework');
 * const result = await validator.validateFile('.claude/commands/architect.md');
 * if (!result.valid) {
 *   console.log(`Found ${result.brokenLinks.length} broken links`);
 * }
 * ```
 */
export class MarkdownLinkValidator {
  /** Framework root directory */
  private readonly frameworkRoot: string;

  /** Framework core paths (critical) */
  private static readonly FRAMEWORK_CORE_PATHS = [
    ".claude/commands",
    ".claude/context",
    ".claude/framework",
    ".claude/shared",
    ".claude/skills",
    ".claude/registries",
    "core",
    "cli/src",
    "src/framework",
    "src/guards",
  ];

  /** Framework root files (critical) */
  private static readonly FRAMEWORK_ROOT_FILES = [
    "CLAUDE.md",
    "README.md",
  ];

  /** Content paths (non-critical warnings) */
  private static readonly CONTENT_PATHS = [
    "backlog",
    "confluence",
    "docs",
    ".claude",
  ];

  /** Markdown link regex: [text](path) */
  private static readonly LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

  /** Backticked path regex */
  private static readonly BACKTICK_PATTERN = /`([a-zA-Z0-9_\-/]+\.md)`/g;

  /** Unlinked "See:" reference regex */
  private static readonly SEE_PATTERN = /See:\s+([a-zA-Z0-9_\-/]+\.md)/g;

  /** Plain path in workflow regex */
  private static readonly WORKFLOW_PATTERN =
    /[→▶]\s*([a-zA-Z0-9_\-/]+\.md)\s*[→▶]?/g;

  /** Image file extensions to skip */
  private static readonly IMAGE_EXTENSIONS = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".svg",
    ".gif",
    ".webp",
    ".bmp",
    ".ico",
  ]);

  /** Placeholder paths to skip */
  private static readonly PLACEHOLDERS = new Set([
    "url",
    "path",
    "file",
    "link",
    "href",
    "src",
    // Example paths commonly used in documentation
    "path/to/file.md",
    "relative/path/file.md",
    "path.md",
    "../parent/file.md",
    "./same/file.md",
    "...",
    // Jira example placeholders
    "jira-url",
    "confluence-url",
  ]);

  /** Example link text patterns that indicate documentation examples */
  private static readonly EXAMPLE_LINK_TEXTS = new Set([
    "text",
    "link",
    "link text",
    "description",
    "title",
    "name",
    "email",
    "ftp",
    "jira-url",
  ]);

  /** Template patterns to exclude from anti-pattern detection */
  private static readonly TEMPLATE_PATTERNS = [
    /STORY-[a-z0-9-]+\.md/i,
    /TASK-[a-z0-9-]+\.md/i,
    /BUG-[a-z0-9-]+\.md/i,
    /SPIKE-[a-z0-9-]+\.md/i,
    /EPIC-[a-z0-9-]+\.md/i,
    /\d{4}-[a-z0-9-]+\.md/i,
    /YYYY-WNN\.md/i,
    /DAPM-XXXX[a-z0-9-]*\.md/i,
    /\[TYPE\]-[a-z0-9-[\]]+\.md/i,
    /\[number\]-[a-z0-9-[\]]+\.md/i,
    /\{[a-z0-9-]+\}[a-z0-9-]*\.md/i,
    /[a-z0-9-]+-template\.md/i,
    /[a-z0-9-]+-GUIDE\.md/i,
    /[a-z0-9-]+-INSTRUCTIONS\.md/i,
    /[a-z0-9-]+-report-\d{4}-\d{2}\.md/i,
    /[a-z0-9-]*status-\d{4}W\d{2}\.md/i,
    /README\.md/i,
  ];

  /**
   * Create a new MarkdownLinkValidator
   *
   * @param frameworkRoot - Absolute path to framework root directory
   */
  constructor(frameworkRoot: string) {
    this.frameworkRoot = path.resolve(frameworkRoot);
  }

  /**
   * Validate markdown links in a single file
   *
   * @param filePath - Absolute or relative path to markdown file
   * @returns File validation result
   * @throws Error if file cannot be read
   */
  async validateFile(filePath: string): Promise<FileValidationResult> {
    const absPath = path.resolve(filePath);

    // Check if file exists
    try {
      await fs.access(absPath);
    } catch (_error) {
      throw new Error(`File not found: ${filePath}`, { cause: _error });
    }

    // Read file content
    let content: string;
    try {
      content = await fs.readFile(absPath, "utf-8");
    } catch (error) {
      throw new Error(`Error reading file ${filePath}: ${error}`, {
        cause: error,
      });
    }

    // Determine if framework file
    const isFrameworkFile = this.isFrameworkFile(absPath);

    // Find all markdown links
    const links = this.findMarkdownLinks(content);

    // Validate each link
    const brokenLinks: BrokenLink[] = [];
    let linksChecked = 0;

    for (const link of links) {
      // Skip external URLs
      if (this.isExternalUrl(link.target)) {
        continue;
      }

      // Skip anchor-only links
      if (link.target.startsWith("#")) {
        continue;
      }

      // Skip image files (for MVP)
      if (this.isImageFile(link.target)) {
        continue;
      }

      // Skip placeholders
      if (this.isPlaceholder(link.target)) {
        continue;
      }

      // Skip documentation examples
      if (this.isExampleLink(link.text, link.target)) {
        continue;
      }

      linksChecked++;

      // Resolve link path
      const resolvedPath = this.resolveLinkPath(link.target, absPath);

      // Check if target exists
      const exists = await this.fileExists(resolvedPath);

      if (!exists) {
        brokenLinks.push({
          file: filePath,
          line: link.line,
          linkText: link.text,
          target: link.target,
          reason: `Target file not found: ${path.relative(this.frameworkRoot, resolvedPath)}`,
          resolvedPath,
        });
      }
    }

    // Detect anti-patterns
    const antiPatterns = this.detectAntiPatterns(content, filePath);

    const valid = brokenLinks.length === 0 && antiPatterns.length === 0;

    return {
      file: filePath,
      isFrameworkFile,
      valid,
      brokenLinks,
      antiPatterns,
      linksChecked,
    };
  }

  /**
   * Validate markdown links in multiple files
   *
   * @param files - Array of file paths to validate
   * @returns Aggregated validation result
   */
  async validateMarkdownLinks(files?: string[]): Promise<LinkValidationResult> {
    const filesToValidate = files || [];

    if (filesToValidate.length === 0) {
      return {
        valid: true,
        brokenLinks: [],
        antiPatterns: [],
        filesChecked: 0,
        linksChecked: 0,
      };
    }

    const results: FileValidationResult[] = [];

    for (const file of filesToValidate) {
      try {
        const result = await this.validateFile(file);
        results.push(result);
      } catch (error) {
        // Skip files that can't be read
        console.error(`Error validating ${file}: ${error}`);
      }
    }

    // Aggregate results
    const brokenLinks = results.flatMap((r) => r.brokenLinks);
    const antiPatterns = results.flatMap((r) => r.antiPatterns);
    const linksChecked = results.reduce((sum, r) => sum + r.linksChecked, 0);

    return {
      valid: brokenLinks.length === 0 && antiPatterns.length === 0,
      brokenLinks,
      antiPatterns,
      filesChecked: results.length,
      linksChecked,
    };
  }

  /**
   * Find all markdown links in content
   *
   * @param content - Markdown content to scan
   * @returns Array of detected markdown links
   */
  findMarkdownLinks(content: string): MarkdownLink[] {
    const links: MarkdownLink[] = [];
    const lines = content.split("\n");
    let inCodeBlock = false;

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Toggle code block state
      if (line.trim().startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        return;
      }

      // Skip code blocks
      if (inCodeBlock) {
        return;
      }

      // Reset regex state
      MarkdownLinkValidator.LINK_PATTERN.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = MarkdownLinkValidator.LINK_PATTERN.exec(line)) !== null) {
        const text = match[1];
        const target = match[2];

        links.push({
          text,
          target,
          line: lineNumber,
          columnStart: match.index,
          columnEnd: match.index + match[0].length,
        });
      }
    });

    return links;
  }

  /**
   * Detect anti-patterns in markdown content
   *
   * @param content - Markdown content to scan
   * @param filePath - Path to file (for reporting)
   * @returns Array of detected anti-patterns
   */
  detectAntiPatterns(content: string, filePath: string): AntiPattern[] {
    const antiPatterns: AntiPattern[] = [];
    const lines = content.split("\n");
    let inCodeBlock = false;

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Toggle code block state
      if (line.trim().startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        return;
      }

      // Skip code blocks
      if (inCodeBlock) {
        return;
      }

      // Detect backticked paths
      MarkdownLinkValidator.BACKTICK_PATTERN.lastIndex = 0;
      let match: RegExpExecArray | null;

      while (
        (match = MarkdownLinkValidator.BACKTICK_PATTERN.exec(line)) !== null
      ) {
        const mdPath = match[1];

        // Skip template patterns
        if (this.isTemplatePattern(mdPath)) {
          continue;
        }

        antiPatterns.push({
          file: filePath,
          line: lineNumber,
          patternType: "backticked_path",
          pattern: line.trim(),
          suggestion: `Replace \`${mdPath}\` with [${mdPath}](${mdPath})`,
        });
      }

      // Detect unlinked "See:" references
      MarkdownLinkValidator.SEE_PATTERN.lastIndex = 0;
      while ((match = MarkdownLinkValidator.SEE_PATTERN.exec(line)) !== null) {
        const mdPath = match[1];

        antiPatterns.push({
          file: filePath,
          line: lineNumber,
          patternType: "unlinked_reference",
          pattern: line.trim(),
          suggestion: `Replace "See: ${mdPath}" with "See: [${mdPath}](${mdPath})"`,
        });
      }

      // Detect plain paths in workflows
      MarkdownLinkValidator.WORKFLOW_PATTERN.lastIndex = 0;
      while (
        (match = MarkdownLinkValidator.WORKFLOW_PATTERN.exec(line)) !== null
      ) {
        const mdPath = match[1];

        antiPatterns.push({
          file: filePath,
          line: lineNumber,
          patternType: "plain_path_in_workflow",
          pattern: line.trim(),
          suggestion: `Replace plain path with [${mdPath}](${mdPath})`,
        });
      }
    });

    return antiPatterns;
  }

  /**
   * Check if a path is a template pattern (should not be flagged as anti-pattern)
   *
   * @param mdPath - Path to check
   * @returns True if path matches a template pattern
   */
  private isTemplatePattern(mdPath: string): boolean {
    return MarkdownLinkValidator.TEMPLATE_PATTERNS.some((pattern) =>
      pattern.test(mdPath),
    );
  }

  /**
   * Resolve a link path to an absolute path
   *
   * Handles:
   * - Relative paths: ../context/file.md
   * - Project-relative absolute paths: /.claude/commands/file.md
   * - Fully-qualified absolute paths: /Users/.../project/.claude/file.md
   * - Anchor removal: file.md#section → file.md
   * - URL decoding: my%20docs/file.md → my docs/file.md
   *
   * @param linkTarget - Link target path
   * @param sourceFile - Absolute path to source file
   * @returns Resolved absolute path
   */
  private resolveLinkPath(linkTarget: string, sourceFile: string): string {
    // Remove anchor fragments
    let targetPath = linkTarget.split("#")[0];

    // URL decode (handle spaces)
    try {
      targetPath = decodeURIComponent(targetPath);
    } catch (_error) {
      // If decoding fails, use original
    }

    // Handle fully-qualified absolute paths (start with framework root)
    if (targetPath.startsWith(this.frameworkRoot)) {
      return targetPath;
    }

    // Handle project-relative absolute paths (start with /)
    if (targetPath.startsWith("/")) {
      return path.join(this.frameworkRoot, targetPath.slice(1));
    }

    // Handle relative paths
    const sourceDir = path.dirname(sourceFile);
    return path.resolve(sourceDir, targetPath);
  }

  /**
   * Check if a file exists
   *
   * @param filePath - Absolute path to check
   * @returns True if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Check if a path is a framework core file (critical)
   *
   * @param filePath - Absolute path to check
   * @returns True if framework core file
   */
  isFrameworkFile(filePath: string): boolean {
    const absPath = path.resolve(filePath);

    // Check if in framework core directory
    for (const corePath of MarkdownLinkValidator.FRAMEWORK_CORE_PATHS) {
      const fullCorePath = path.join(this.frameworkRoot, corePath);
      if (absPath.startsWith(fullCorePath)) {
        return true;
      }
    }

    // Check if root-level framework file
    const fileName = path.basename(absPath);
    const fileDir = path.dirname(absPath);

    if (MarkdownLinkValidator.FRAMEWORK_ROOT_FILES.includes(fileName)) {
      if (fileDir === this.frameworkRoot) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a URL is external (HTTP/HTTPS) or uses another protocol
   *
   * @param url - URL to check
   * @returns True if external URL or protocol link
   */
  isExternalUrl(url: string): boolean {
    return (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("mailto:") ||
      url.startsWith("ftp://") ||
      url.startsWith("tel:")
    );
  }

  /**
   * Check if a link appears to be a documentation example
   *
   * @param linkText - The text of the link
   * @param target - The link target
   * @returns True if link appears to be an example
   */
  private isExampleLink(linkText: string, target: string): boolean {
    // Check if link text is a common example pattern
    const normalizedText = linkText.toLowerCase().trim();
    if (MarkdownLinkValidator.EXAMPLE_LINK_TEXTS.has(normalizedText)) {
      return true;
    }

    // Check for ticket reference patterns like [DAPM-123](...)
    if (/^[A-Z]+-\d+$/.test(linkText) && target === "...") {
      return true;
    }

    return false;
  }

  /**
   * Check if a path is an image file
   *
   * @param filePath - File path to check
   * @returns True if image file
   */
  private isImageFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return MarkdownLinkValidator.IMAGE_EXTENSIONS.has(ext);
  }

  /**
   * Check if a path is a placeholder
   *
   * @param linkPath - Path to check
   * @returns True if placeholder
   */
  isPlaceholder(linkPath: string): boolean {
    const normalized = linkPath.toLowerCase();
    return MarkdownLinkValidator.PLACEHOLDERS.has(normalized);
  }
}
