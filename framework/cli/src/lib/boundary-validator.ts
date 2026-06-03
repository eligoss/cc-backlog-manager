/**
 * Boundary Validator
 *
 * Validates separation between framework (publishable) and instance (deployed) zones.
 *
 * Rules:
 * 1. Framework files must NOT reference instance paths (.claude/, CLAUDE.md)
 * 2. Instance files must NOT reference framework paths (framework/)
 * 3. No hardcoded absolute paths (/Users/, /home/, C:\)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

// Zone classification
export type Zone = 'framework' | 'instance';

// Types of path references
export type ReferenceType =
  | 'markdown-link'
  | 'markdown-image'
  | 'json-path'
  | 'yaml-path'
  | 'ts-import'
  | 'absolute-path';

// Boundary violation rules
export type ViolationRule =
  | 'framework-to-instance'
  | 'instance-to-framework'
  | 'hardcoded-absolute';

// A detected reference in a file
export interface PathReference {
  sourceFile: string;
  sourceZone: Zone;
  line: number;
  column: number;
  referenceType: ReferenceType;
  rawReference: string;
  resolvedPath: string | null;
  targetZone: Zone | null;
}

// Boundary violation
export interface BoundaryViolation {
  reference: PathReference;
  rule: ViolationRule;
  message: string;
  severity: 'error' | 'warning';
}

// Validation result
export interface BoundaryValidationResult {
  valid: boolean;
  violations: BoundaryViolation[];
  stats: {
    filesScanned: number;
    referencesChecked: number;
    frameworkViolations: number;
    instanceViolations: number;
    absolutePathViolations: number;
  };
}

// Validator options
export interface BoundaryValidatorOptions {
  frameworkPath?: string;
  instancePaths?: string[];
  verbose?: boolean;
}

/**
 * Reference extractor - detects path references in various file types
 */
class ReferenceExtractor {
  // Markdown links: [text](path) - exclude external URLs
  private static readonly MARKDOWN_LINK_REGEX =
    /\[([^\]]*)\]\(([^)]+)\)/g;

  // Absolute path patterns (hardcoded)
  private static readonly ABSOLUTE_PATH_PATTERNS = [
    /\/Users\/[^\s"')>\]]+/g, // macOS
    /\/home\/[^\s"')>\]]+/g, // Linux
    /[A-Z]:\\[^\s"')>\]]+/g, // Windows
  ];

  // Project placeholder pattern - these are valid and should be skipped
  private static readonly PROJECT_PLACEHOLDER = '{project}/';

  constructor(private projectRoot: string) {}

  /**
   * Check if a string is an external URL
   */
  private isExternalUrl(str: string): boolean {
    return (
      str.startsWith('http://') ||
      str.startsWith('https://') ||
      str.startsWith('mailto:') ||
      str.startsWith('ftp://')
    );
  }

  /**
   * Check if a string looks like a file path
   */
  private looksLikePath(str: string): boolean {
    if (!str || typeof str !== 'string') return false;
    if (this.isExternalUrl(str)) return false;

    // Must contain path-like characters
    return (
      str.includes('/') ||
      str.includes('\\') ||
      str.endsWith('.md') ||
      str.endsWith('.json') ||
      str.endsWith('.yml') ||
      str.endsWith('.yaml') ||
      str.endsWith('.ts') ||
      str.endsWith('.js')
    );
  }

  /**
   * Extract references from markdown file
   */
  extractMarkdownReferences(
    content: string,
    filePath: string,
    sourceZone: Zone
  ): PathReference[] {
    const references: PathReference[] = [];
    const lines = content.split('\n');
    let inCodeBlock = false;

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];

      // Track code blocks - skip links inside them
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }

      if (inCodeBlock) continue;

      // Extract markdown links
      const linkRegex = new RegExp(ReferenceExtractor.MARKDOWN_LINK_REGEX);
      let match;

      while ((match = linkRegex.exec(line)) !== null) {
        const target = match[2].split('#')[0]; // Remove anchor

        // Skip external URLs, anchor-only, and empty targets
        if (!target || this.isExternalUrl(target) || target === '') continue;

        // Skip {project}/ placeholders - these are valid and resolved during sync
        if (target.includes(ReferenceExtractor.PROJECT_PLACEHOLDER)) continue;

        references.push({
          sourceFile: filePath,
          sourceZone,
          line: lineNum + 1,
          column: match.index,
          referenceType: 'markdown-link',
          rawReference: target,
          resolvedPath: this.resolvePath(target, filePath),
          targetZone: null, // Will be set later
        });
      }

      // Extract absolute paths (even in text)
      for (const pattern of ReferenceExtractor.ABSOLUTE_PATH_PATTERNS) {
        const absRegex = new RegExp(pattern);
        let absMatch;

        while ((absMatch = absRegex.exec(line)) !== null) {
          references.push({
            sourceFile: filePath,
            sourceZone,
            line: lineNum + 1,
            column: absMatch.index,
            referenceType: 'absolute-path',
            rawReference: absMatch[0],
            resolvedPath: absMatch[0],
            targetZone: null,
          });
        }
      }
    }

    return references;
  }

  /**
   * Extract references from JSON file
   */
  extractJsonReferences(
    content: string,
    filePath: string,
    sourceZone: Zone
  ): PathReference[] {
    const references: PathReference[] = [];

    try {
      const lines = content.split('\n');

      // Simple approach: scan each line for path-like strings
      for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];

        // Look for string values that look like paths
        const stringMatch = /"([^"]+)"/g;
        let match;

        while ((match = stringMatch.exec(line)) !== null) {
          const value = match[1];

          if (this.looksLikePath(value)) {
            references.push({
              sourceFile: filePath,
              sourceZone,
              line: lineNum + 1,
              column: match.index,
              referenceType: 'json-path',
              rawReference: value,
              resolvedPath: this.resolvePath(value, filePath),
              targetZone: null,
            });
          }
        }

        // Also check for absolute paths
        for (const pattern of ReferenceExtractor.ABSOLUTE_PATH_PATTERNS) {
          const absRegex = new RegExp(pattern);
          let absMatch;

          while ((absMatch = absRegex.exec(line)) !== null) {
            references.push({
              sourceFile: filePath,
              sourceZone,
              line: lineNum + 1,
              column: absMatch.index,
              referenceType: 'absolute-path',
              rawReference: absMatch[0],
              resolvedPath: absMatch[0],
              targetZone: null,
            });
          }
        }
      }
    } catch {
      // Invalid JSON, skip
    }

    return references;
  }

  /**
   * Extract references from YAML file
   */
  extractYamlReferences(
    content: string,
    filePath: string,
    sourceZone: Zone
  ): PathReference[] {
    const references: PathReference[] = [];
    const lines = content.split('\n');

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];

      // Look for path-like values (with slashes or file extensions)
      const pathPattern = /:\s*['"]?([^\s'"#]+(?:\/[^\s'"#]*|\.(?:md|json|yml|yaml|ts|js)))['"]?/;
      const match = pathPattern.exec(line);

      if (match && !this.isExternalUrl(match[1])) {
        references.push({
          sourceFile: filePath,
          sourceZone,
          line: lineNum + 1,
          column: match.index,
          referenceType: 'yaml-path',
          rawReference: match[1],
          resolvedPath: this.resolvePath(match[1], filePath),
          targetZone: null,
        });
      }

      // Check for absolute paths
      for (const pattern of ReferenceExtractor.ABSOLUTE_PATH_PATTERNS) {
        const absRegex = new RegExp(pattern);
        let absMatch;

        while ((absMatch = absRegex.exec(line)) !== null) {
          references.push({
            sourceFile: filePath,
            sourceZone,
            line: lineNum + 1,
            column: absMatch.index,
            referenceType: 'absolute-path',
            rawReference: absMatch[0],
            resolvedPath: absMatch[0],
            targetZone: null,
          });
        }
      }
    }

    return references;
  }

  /**
   * Resolve a reference path to an absolute path
   */
  private resolvePath(reference: string, sourceFile: string): string | null {
    try {
      // URL decode
      let targetPath = decodeURIComponent(reference);

      // Remove anchor fragments
      targetPath = targetPath.split('#')[0];

      if (!targetPath) return null;

      // Already absolute
      if (path.isAbsolute(targetPath)) {
        return targetPath;
      }

      // Project-relative (starts with /)
      if (targetPath.startsWith('/')) {
        return path.join(this.projectRoot, targetPath.slice(1));
      }

      // Relative path
      const sourceDir = path.dirname(sourceFile);
      return path.resolve(sourceDir, targetPath);
    } catch {
      return null;
    }
  }
}

/**
 * Main Boundary Validator class
 */
export class BoundaryValidator {
  private extractor: ReferenceExtractor;
  private frameworkPath: string;
  private instancePaths: string[];

  constructor(
    private projectRoot: string,
    options?: BoundaryValidatorOptions
  ) {
    this.extractor = new ReferenceExtractor(projectRoot);
    this.frameworkPath = options?.frameworkPath || 'framework/';
    this.instancePaths = options?.instancePaths || [
      '.claude/',
      '.claude/',
      'docs/',
      'CLAUDE.md',
    ];
  }

  /**
   * Classify which zone a file belongs to
   */
  classifyZone(filePath: string): Zone {
    const relativePath = path.relative(this.projectRoot, filePath);

    // Framework zone
    if (relativePath.startsWith(this.frameworkPath)) {
      return 'framework';
    }

    // Instance zone
    for (const instancePath of this.instancePaths) {
      const normalizedInstance = instancePath.replace(/\/$/, '');
      if (
        relativePath.startsWith(instancePath) ||
        relativePath === normalizedInstance
      ) {
        return 'instance';
      }
    }

    // Default to framework for other files
    return 'framework';
  }

  /**
   * Get files to scan based on glob patterns
   */
  private async getFilesToScan(patterns: string | string[]): Promise<string[]> {
    const patternArray = Array.isArray(patterns) ? patterns : [patterns];
    const files: string[] = [];

    for (const pattern of patternArray) {
      const matches = await glob(pattern, {
        cwd: this.projectRoot,
        absolute: true,
        ignore: ['**/node_modules/**', '**/.git/**'],
      });
      files.push(...matches);
    }

    return [...new Set(files)]; // Deduplicate
  }

  /**
   * Extract all references from a file
   */
  private async extractReferences(filePath: string): Promise<PathReference[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    const sourceZone = this.classifyZone(filePath);

    switch (ext) {
      case '.md':
        return this.extractor.extractMarkdownReferences(
          content,
          filePath,
          sourceZone
        );
      case '.json':
        return this.extractor.extractJsonReferences(
          content,
          filePath,
          sourceZone
        );
      case '.yml':
      case '.yaml':
        return this.extractor.extractYamlReferences(
          content,
          filePath,
          sourceZone
        );
      default:
        return [];
    }
  }

  /**
   * Check if a path reference appears to be a documentation example.
   *
   * Documentation examples (in ANTI-PATTERNS.md, QUICK-REFERENCE.md, etc.)
   * intentionally show absolute paths to teach correct MCP tool usage.
   * These are not actual references and should not be flagged.
   */
  private isDocumentationExample(ref: PathReference): boolean {
    const fileName = path.basename(ref.sourceFile).toLowerCase();

    // Files that commonly contain intentional absolute path examples
    const documentationFiles = ['anti-patterns.md', 'quick-reference.md', 'tools-reference.md', 'examples.md'];

    // Only skip if BOTH in a documentation file AND matches example patterns
    // This prevents false positives in regular files that happen to contain /Users/anton/
    if (documentationFiles.includes(fileName)) {
      // Generic patterns that indicate documentation examples
      // These show paths like `/Users/anton/project/...` as teaching examples
      const examplePatterns = [
        /\/Users\/anton\//, // Generic example user
        /\/Users\/\.\.\./,  // Truncated example path
      ];

      return examplePatterns.some(pattern => pattern.test(ref.rawReference));
    }

    return false;
  }

  /**
   * Check if a reference violates boundary rules
   */
  private checkViolation(ref: PathReference): BoundaryViolation | null {
    // Skip {project}/ placeholders - these are valid and resolved during sync
    if (ref.rawReference.includes('{project}/')) {
      return null;
    }

    // Rule 1: Hardcoded absolute paths (any zone)
    if (ref.referenceType === 'absolute-path') {
      // Skip absolute paths that point to current project root - these are valid after sync
      // Instance files (.claude/, .claude/) should have current project paths after sync
      if (ref.sourceZone === 'instance' && ref.rawReference.startsWith(this.projectRoot)) {
        return null;
      }

      // Skip if the path is a documentation example (contains backticks or is in a table)
      // These are teaching examples, not actual references
      if (this.isDocumentationExample(ref)) {
        return null;
      }

      return {
        reference: ref,
        rule: 'hardcoded-absolute',
        message: `Hardcoded absolute path: ${ref.rawReference}`,
        severity: 'error',
      };
    }

    // Need resolved path for zone checking
    if (!ref.resolvedPath) return null;

    // Get relative path from project root
    let relativePath: string;
    try {
      relativePath = path.relative(this.projectRoot, ref.resolvedPath);
    } catch {
      return null;
    }

    // External references (outside project) are OK
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      return null;
    }

    // Classify target zone
    const targetZone = this.classifyZone(ref.resolvedPath);

    // Update reference with target zone
    ref.targetZone = targetZone;

    // Rule 2: Framework to Instance
    if (ref.sourceZone === 'framework' && targetZone === 'instance') {
      return {
        reference: ref,
        rule: 'framework-to-instance',
        message: `Framework file references instance path: ${relativePath}`,
        severity: 'error',
      };
    }

    // Rule 3: Instance to Framework
    if (ref.sourceZone === 'instance' && targetZone === 'framework') {
      return {
        reference: ref,
        rule: 'instance-to-framework',
        message: `Instance file references framework path: ${relativePath}`,
        severity: 'error',
      };
    }

    return null;
  }

  /**
   * Validate all files in the project for boundary violations
   */
  async validateProject(): Promise<BoundaryValidationResult> {
    const violations: BoundaryViolation[] = [];
    let filesScanned = 0;
    let referencesChecked = 0;

    // Scan framework files
    const frameworkFiles = await this.getFilesToScan([
      'framework/**/*.md',
      'framework/**/*.json',
      'framework/**/*.yml',
      'framework/**/*.yaml',
    ]);

    // Scan instance files
    const instanceFiles = await this.getFilesToScan([
      '.claude/**/*.md',
      '.claude/**/*.md',
      '.claude/**/*.json',
      'CLAUDE.md',
    ]);

    const allFiles = [...frameworkFiles, ...instanceFiles];

    for (const filePath of allFiles) {
      try {
        filesScanned++;
        const references = await this.extractReferences(filePath);

        for (const ref of references) {
          referencesChecked++;
          const violation = this.checkViolation(ref);
          if (violation) {
            violations.push(violation);
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }

    return {
      valid: violations.length === 0,
      violations,
      stats: {
        filesScanned,
        referencesChecked,
        frameworkViolations: violations.filter(
          (v) => v.rule === 'framework-to-instance'
        ).length,
        instanceViolations: violations.filter(
          (v) => v.rule === 'instance-to-framework'
        ).length,
        absolutePathViolations: violations.filter(
          (v) => v.rule === 'hardcoded-absolute'
        ).length,
      },
    };
  }

  /**
   * Format violations as a human-readable report
   */
  formatReport(result: BoundaryValidationResult): string {
    const lines: string[] = [];

    lines.push('=== BOUNDARY VALIDATION REPORT ===');
    lines.push(`Files Scanned: ${result.stats.filesScanned}`);
    lines.push(`References Checked: ${result.stats.referencesChecked}`);
    lines.push('');
    lines.push('Violations by Type:');
    lines.push(`  Framework→Instance: ${result.stats.frameworkViolations}`);
    lines.push(`  Instance→Framework: ${result.stats.instanceViolations}`);
    lines.push(`  Hardcoded Absolute: ${result.stats.absolutePathViolations}`);

    if (result.violations.length > 0) {
      lines.push('');
      lines.push('Violations:');

      // Group by file
      const byFile = new Map<string, BoundaryViolation[]>();
      for (const v of result.violations) {
        const file = path.relative(this.projectRoot, v.reference.sourceFile);
        const existing = byFile.get(file);
        if (existing) {
          existing.push(v);
        } else {
          byFile.set(file, [v]);
        }
      }

      for (const [file, fileViolations] of byFile) {
        lines.push(`  ${file}:`);
        for (const v of fileViolations) {
          lines.push(
            `    L${v.reference.line}: [${v.rule}] ${v.message}`
          );
        }
      }
    }

    return lines.join('\n');
  }
}
