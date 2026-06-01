import matter from 'gray-matter';
import fs from 'fs-extra';

/**
 * Result of parsing frontmatter from a document
 */
export interface FrontmatterResult<T = Record<string, unknown>> {
  /** Parsed YAML frontmatter data */
  data: T;
  /** Content after the frontmatter */
  content: string;
  /** Original YAML string from frontmatter */
  matter: string;
}

/**
 * Parse YAML frontmatter from markdown content
 *
 * Uses gray-matter library to parse frontmatter with proper field order preservation.
 *
 * @param content - The markdown content with frontmatter
 * @returns Parsed frontmatter data, content, and original YAML string
 *
 * @example
 * ```typescript
 * const content = `---
 * title: "My Document"
 * tags:
 *   - one
 *   - two
 * ---
 * # Content`;
 *
 * const result = parseFrontmatter(content);
 * console.log(result.data.title); // "My Document"
 * console.log(result.content); // "# Content"
 * ```
 */
export function parseFrontmatter<T = Record<string, unknown>>(content: string): FrontmatterResult<T> {
  const parsed = matter(content);

  return {
    data: parsed.data as T,
    content: parsed.content,
    matter: parsed.matter || '',
  };
}

/**
 * Convert frontmatter data and content back to markdown with YAML frontmatter
 *
 * Preserves field order and formatting using gray-matter's stringify.
 *
 * @param data - The frontmatter data object
 * @param content - The markdown content
 * @returns Complete markdown string with frontmatter
 *
 * @example
 * ```typescript
 * const data = { title: "My Document", count: 42 };
 * const content = "# Content";
 *
 * const markdown = stringifyFrontmatter(data, content);
 * // Returns:
 * // ---
 * // title: My Document
 * // count: 42
 * // ---
 * // # Content
 * ```
 */
export function stringifyFrontmatter(
  data: Record<string, unknown>,
  content: string
): string {
  return matter.stringify(content, data);
}

/**
 * Update frontmatter in an existing file
 *
 * Reads the file, parses frontmatter, merges with updates, and writes back.
 * Preserves existing frontmatter fields and content.
 *
 * @param filePath - Path to the markdown file
 * @param updates - Object with frontmatter fields to update/add
 * @throws {Error} If file does not exist or cannot be read/written
 *
 * @example
 * ```typescript
 * await updateFrontmatter('document.md', { version: 2 });
 * ```
 */
export async function updateFrontmatter(
  filePath: string,
  updates: Record<string, unknown>
): Promise<void> {
  // Read existing file
  const content = await fs.readFile(filePath, 'utf-8');

  // Parse frontmatter
  const parsed = parseFrontmatter(content);

  // Merge updates with existing data
  const updatedData = {
    ...parsed.data,
    ...updates,
  };

  // Stringify and write back
  const updated = stringifyFrontmatter(updatedData, parsed.content);
  await fs.writeFile(filePath, updated, 'utf-8');
}
