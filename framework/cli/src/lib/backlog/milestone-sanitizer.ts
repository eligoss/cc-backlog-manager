/**
 * Milestone Name Sanitization Module
 *
 * Converts Jira milestone names to filesystem-safe filenames following the pattern:
 * - "APM-R: App: January 2026 (W51, W1, W3)" → "apm-r-app-january-2026-w51-w1-w3.md"
 *
 * This module is the source of truth for milestone filename generation. All import,
 * migration, and validation scripts must use this function to ensure consistency.
 *
 * Algorithm:
 * 1. Normalize unicode characters (NFKD → ASCII)
 * 2. Convert to lowercase
 * 3. Remove filesystem-unsafe characters: /\:*?"<>|,&.
 * 4. Replace spaces with hyphens
 * 5. Remove parentheses (keep content)
 * 6. Collapse consecutive hyphens
 * 7. Remove leading/trailing hyphens
 * 8. Handle empty → "untitled"
 * 9. Limit to 200 characters
 * 10. Add .md extension
 *
 * Edge Cases Handled:
 * - Unicode characters (removed or transliterated)
 * - Special characters (/, \, :, *, ?, ", |, <, >, etc.)
 * - Very long names (truncated to 200 chars)
 * - Names starting with numbers (allowed)
 * - Empty/whitespace-only names (default to "untitled")
 *
 * @module milestone-sanitizer
 */

/**
 * Convert Jira milestone name to filesystem-safe filename.
 *
 * @param milestoneName - Full Jira milestone name (e.g., "APM-R: App: January 2026 (W51, W1, W3)")
 * @returns Filesystem-safe filename with .md extension (e.g., "apm-r-app-january-2026-w51-w1-w3.md")
 *
 * @example
 * ```typescript
 * sanitizeMilestoneName("APM-R: App: January 2026 (W51, W1, W3)")
 * // Returns: 'apm-r-app-january-2026-w51-w1-w3.md'
 *
 * sanitizeMilestoneName("UC1-MVP")
 * // Returns: 'uc1-mvp.md'
 *
 * sanitizeMilestoneName("Demo")
 * // Returns: 'demo.md'
 *
 * sanitizeMilestoneName("Q1 2026: Planning & Design")
 * // Returns: 'q1-2026-planning-design.md'
 * ```
 */
export function sanitizeMilestoneName(milestoneName: string | null | undefined): string {
  // Handle null, undefined, or non-string input
  if (!milestoneName || typeof milestoneName !== 'string') {
    return 'untitled.md';
  }

  // Step 1: Normalize unicode characters
  // Convert accented characters to ASCII equivalents (e.g., é → e)
  // Note: Node.js doesn't have direct NFKD normalization like Python's unicodedata
  // We use NFD (canonical decomposition) which is similar for most cases
  const normalized = milestoneName.normalize('NFD');
  // Remove all diacritic marks (Unicode combining characters)
  const asciiName = normalized.replace(/[\u0300-\u036f]/g, '');

  // Step 2: Convert to lowercase
  const lowered = asciiName.toLowerCase();

  // Step 3: Remove filesystem-unsafe and special characters
  // Keep only: alphanumerics, hyphens, underscores, spaces (to be converted next)
  // Characters to remove: / \ : * ? " | < > , & . and others
  const unsafeChars = /[/\\:*?"<>|,&.]/g;
  const cleaned = lowered.replace(unsafeChars, '');

  // Step 4: Replace spaces (including tabs, newlines, etc.) with hyphens
  const spaced = cleaned.replace(/\s+/g, '-');

  // Step 5: Remove parentheses but keep their content
  // "something (details)" → "something-details"
  const parenthesized = spaced.replace(/[()]/g, '');

  // Step 6: Collapse multiple consecutive hyphens into single hyphen
  const dehyphenated = parenthesized.replace(/-+/g, '-');

  // Step 7: Remove leading and trailing hyphens
  let trimmed = dehyphenated.replace(/^-+|-+$/g, '');

  // Step 8: Handle empty string
  if (!trimmed) {
    return 'untitled.md';
  }

  // Step 9: Limit to 200 characters (filesystem safety on some systems)
  if (trimmed.length > 200) {
    trimmed = trimmed.substring(0, 200);
    // Remove trailing hyphens after truncation
    trimmed = trimmed.replace(/-+$/, '');
  }

  // Step 10: Add .md extension
  return `${trimmed}.md`;
}

/**
 * Validate that a filename matches the sanitization pattern.
 *
 * @param filename - Filename to validate
 * @returns True if filename is valid, False otherwise
 *
 * @example
 * ```typescript
 * validateMilestoneFilename('apm-r-app-january-2026.md')
 * // Returns: true
 *
 * validateMilestoneFilename('Invalid--Name.md')
 * // Returns: false (consecutive hyphens)
 *
 * validateMilestoneFilename('UPPERCASE.md')
 * // Returns: false (must be lowercase)
 * ```
 */
export function validateMilestoneFilename(filename: string): boolean {
  if (!filename) {
    return false;
  }

  // Must end with .md
  if (!filename.endsWith('.md')) {
    return false;
  }

  // Must be lowercase
  if (filename !== filename.toLowerCase()) {
    return false;
  }

  // Must not contain unsafe characters
  const unsafeChars = /[/\\:*?"<>|()]/;
  if (unsafeChars.test(filename)) {
    return false;
  }

  // Must not have consecutive hyphens
  if (filename.includes('--')) {
    return false;
  }

  // Must not start or end with hyphen
  const base = filename.replace('.md', '');
  if (base.startsWith('-') || base.endsWith('-')) {
    return false;
  }

  return true;
}
