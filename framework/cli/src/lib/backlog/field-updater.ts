/**
 * Field Updater
 *
 * Ported from Python:
 * - modules/backlog/src/backlog/update_milestones_remove_field.py
 * - modules/backlog/src/backlog/update_tickets_remove_milestone_field.py
 *
 * Utilities for adding, removing, and updating frontmatter fields in markdown files.
 *
 * Key operations:
 * - Remove fields from frontmatter
 * - Add fields to frontmatter
 * - Update existing fields
 * - Bulk operations with dry-run support
 *
 * Example:
 * ```typescript
 * // Remove a field
 * const result = removeField(content, 'milestone');
 *
 * // Add a field
 * const result = addField(content, 'status', 'active');
 *
 * // Update a field (add if not exists)
 * const result = updateField(content, 'version', '2.0');
 *
 * // Bulk update files
 * const results = await bulkUpdateFiles(
 *   ['file1.md', 'file2.md'],
 *   { remove: ['milestone'], add: { status: 'active' } },
 *   { dryRun: true }
 * );
 * ```
 */

import { parseFrontmatter, stringifyFrontmatter } from '../common/yaml-frontmatter.js';
import { safeRead, safeWrite } from '../common/file-utils.js';
import glob from 'fast-glob';

/**
 * Result of a field update operation
 */
export interface FieldUpdateResult {
  /** Updated content */
  content: string;
  /** Whether the content was modified */
  modified: boolean;
}

/**
 * Result of a bulk update operation
 */
export interface BulkUpdateResults {
  /** Total files processed */
  totalFiles: number;
  /** Number of files modified */
  modifiedFiles: number;
  /** Number of files skipped (no changes needed) */
  skippedFiles: number;
  /** List of errors encountered */
  errors: string[];
  /** Detailed changes per file */
  changes: FileChange[];
}

/**
 * Details about changes made to a file
 */
export interface FileChange {
  /** File path */
  file: string;
  /** Whether the file was modified */
  modified: boolean;
  /** Operations performed */
  operations: string[];
  /** Error message if operation failed */
  error?: string;
}

/**
 * Options for bulk update operations
 */
export interface BulkUpdateOptions {
  /** Dry run mode - don't write files */
  dryRun?: boolean;
  /** Verbose logging */
  verbose?: boolean;
}

/**
 * Field operations to perform
 */
export interface FieldOperations {
  /** Fields to remove */
  remove?: string[];
  /** Fields to add (only if not exists) */
  add?: Record<string, unknown>;
  /** Fields to update (add if not exists) */
  update?: Record<string, unknown>;
}

/**
 * Remove a field from frontmatter
 *
 * Removes the specified field while preserving all other fields and content.
 * Returns the updated content and whether it was modified.
 *
 * @param content - Markdown content with frontmatter
 * @param fieldName - Name of field to remove
 * @returns Updated content and modification status
 *
 * @example
 * ```typescript
 * const content = `---
 * title: Test
 * milestone: UC1
 * ---
 * Content`;
 *
 * const result = removeField(content, 'milestone');
 * console.log(result.modified); // true
 * console.log(result.content); // frontmatter without milestone field
 * ```
 */
export function removeField(content: string, fieldName: string): FieldUpdateResult {
  try {
    // Handle empty or invalid content
    if (!content || !content.trim()) {
      return { content, modified: false };
    }

    // Parse frontmatter
    const parsed = parseFrontmatter(content);

    // Check if field exists
    if (!(fieldName in parsed.data)) {
      return { content, modified: false };
    }

    // Create new data without the field
    const updatedData = { ...parsed.data };
    delete updatedData[fieldName];

    // Rebuild content
    const updatedContent = stringifyFrontmatter(updatedData, parsed.content);

    return {
      content: updatedContent,
      modified: true,
    };
  } catch {
    // If parsing fails (e.g., no frontmatter), return unchanged
    return { content, modified: false };
  }
}

/**
 * Add a field to frontmatter
 *
 * Adds a new field to frontmatter. By default, does not overwrite existing fields
 * unless force=true.
 *
 * @param content - Markdown content with frontmatter
 * @param fieldName - Name of field to add
 * @param value - Value for the field
 * @param force - If true, overwrite existing field (default: false)
 * @returns Updated content and modification status
 *
 * @example
 * ```typescript
 * const result = addField(content, 'status', 'active');
 * const resultForce = addField(content, 'status', 'active', true);
 * ```
 */
export function addField(
  content: string,
  fieldName: string,
  value: unknown,
  force = false
): FieldUpdateResult {
  try {
    // Parse frontmatter (or create if missing)
    const parsed = parseFrontmatter(content);

    // Check if field already exists
    if (fieldName in parsed.data && !force) {
      return { content, modified: false };
    }

    // Add/update field
    const updatedData = {
      ...parsed.data,
      [fieldName]: value,
    };

    // Rebuild content
    const updatedContent = stringifyFrontmatter(updatedData, parsed.content);

    return {
      content: updatedContent,
      modified: true,
    };
  } catch {
    // If no frontmatter exists, create it
    try {
      const updatedContent = stringifyFrontmatter({ [fieldName]: value }, content);
      return {
        content: updatedContent,
        modified: true,
      };
    } catch {
      return { content, modified: false };
    }
  }
}

/**
 * Update a field in frontmatter
 *
 * Updates an existing field or adds it if it doesn't exist.
 * This is equivalent to addField with force=true.
 *
 * @param content - Markdown content with frontmatter
 * @param fieldName - Name of field to update
 * @param value - New value for the field
 * @returns Updated content and modification status
 *
 * @example
 * ```typescript
 * const result = updateField(content, 'status', 'completed');
 * ```
 */
export function updateField(content: string, fieldName: string, value: unknown): FieldUpdateResult {
  return addField(content, fieldName, value, true);
}

/**
 * Perform bulk field updates on multiple files
 *
 * Applies field operations (remove/add/update) to a list of files.
 * Supports dry-run mode for previewing changes.
 *
 * @param files - Array of file paths to process
 * @param operations - Field operations to perform
 * @param options - Options for bulk update (dryRun, verbose)
 * @returns Results summary with modified files, errors, and changes
 *
 * @example
 * ```typescript
 * const results = await bulkUpdateFiles(
 *   ['ticket1.md', 'ticket2.md'],
 *   {
 *     remove: ['milestone'],
 *     add: { status: 'active' },
 *     update: { version: '2.0' }
 *   },
 *   { dryRun: true }
 * );
 *
 * console.log(`Modified: ${results.modifiedFiles}/${results.totalFiles}`);
 * ```
 */
export async function bulkUpdateFiles(
  files: string[],
  operations: FieldOperations,
  options: BulkUpdateOptions = {}
): Promise<BulkUpdateResults> {
  const results: BulkUpdateResults = {
    totalFiles: files.length,
    modifiedFiles: 0,
    skippedFiles: 0,
    errors: [],
    changes: [],
  };

  for (const file of files) {
    try {
      // Read file
      const content = await safeRead(file);

      // Apply operations in order: remove, add, update
      let currentContent = content;
      let fileModified = false;
      const fileOperations: string[] = [];

      // Remove fields
      if (operations.remove) {
        for (const fieldName of operations.remove) {
          const result = removeField(currentContent, fieldName);
          if (result.modified) {
            currentContent = result.content;
            fileModified = true;
            fileOperations.push(`remove:${fieldName}`);
          }
        }
      }

      // Add fields
      if (operations.add) {
        for (const [fieldName, value] of Object.entries(operations.add)) {
          const result = addField(currentContent, fieldName, value, false);
          if (result.modified) {
            currentContent = result.content;
            fileModified = true;
            fileOperations.push(`add:${fieldName}`);
          }
        }
      }

      // Update fields
      if (operations.update) {
        for (const [fieldName, value] of Object.entries(operations.update)) {
          const result = updateField(currentContent, fieldName, value);
          if (result.modified) {
            currentContent = result.content;
            fileModified = true;
            fileOperations.push(`update:${fieldName}`);
          }
        }
      }

      // Record changes
      results.changes.push({
        file,
        modified: fileModified,
        operations: fileOperations,
      });

      if (fileModified) {
        results.modifiedFiles++;

        // Write file if not dry-run
        if (!options.dryRun) {
          await safeWrite(file, currentContent);
        }
      } else {
        results.skippedFiles++;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.errors.push(`${file}: ${errorMsg}`);
      results.changes.push({
        file,
        modified: false,
        operations: [],
        error: errorMsg,
      });
    }
  }

  return results;
}

/**
 * Find files matching glob pattern(s)
 *
 * Helper function to find files for bulk operations.
 *
 * @param patterns - Glob pattern(s) to match
 * @param cwd - Working directory (default: process.cwd())
 * @returns Array of absolute file paths
 *
 * @example
 * ```typescript
 * const files = await findFiles('backlog/tickets/**\/*.md');
 * const results = await bulkUpdateFiles(files, operations);
 * ```
 */
export async function findFiles(
  patterns: string | string[],
  cwd: string = process.cwd()
): Promise<string[]> {
  const patternsArray = Array.isArray(patterns) ? patterns : [patterns];

  return await glob(patternsArray, {
    cwd,
    absolute: true,
    onlyFiles: true,
  });
}
