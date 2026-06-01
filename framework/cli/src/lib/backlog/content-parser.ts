/**
 * Content Parser Module
 *
 * Parses Jira descriptions to extract structured content:
 * - AS/WANT/SO THAT user story format
 * - Context paragraphs
 * - Requirements (bullet points)
 * - Technical notes
 *
 * Handles both Jira wiki markup and markdown formats.
 *
 * @module content-parser
 */

import { convertJiraToMarkdown } from './csv-extractor.js';

/**
 * AS/WANT/SO THAT structure
 */
export interface AsWantSoThat {
  asA: string;
  iWant: string;
  soThat: string | null;
}

/**
 * Parsed description sections
 */
export interface DescriptionSections {
  asWantSoThat: AsWantSoThat | null;
  context: string;
  requirements: string[];
  technicalNotes: string[];
}

/**
 * Extract AS/WANT/SO THAT from description.
 *
 * Handles multiple formats:
 * - Bold markdown: **AS** a user, **I WANT** X, **SO THAT** Y
 * - Plain text: AS a user, I WANT X, SO THAT Y
 * - Jira wiki: *AS* a user, *I WANT* X, *SO THAT* Y
 *
 * @param description - Raw description text
 * @returns Extracted AS/WANT/SO THAT or null if not found
 */
export function extractAsWantSoThat(description: string): AsWantSoThat | null {
  if (!description) {
    return null;
  }

  // Convert Jira markup first so patterns like *As a* become clean text
  let text = convertJiraToMarkdown(description);
  // Normalize to single string (join lines)
  text = text.replace(/\r\n/g, '\n');

  // Pattern variations for AS
  // Handles: **AS**, *AS*, AS (at start of line or sentence)
  const asPattern = /(?:\*{1,2})?AS\*{0,2}\s+(.+?)(?=[,.]?\s*(?:\*{1,2})?I\s*WANT|$)/is;

  // Pattern for I WANT
  const wantPattern = /(?:\*{1,2})?I\s*WANT\*{0,2}\s+(.+?)(?=[,.]?\s*(?:\*{1,2})?SO\s*THAT|[,.]?\s*$)/is;

  // Pattern for SO THAT
  const soThatPattern = /(?:\*{1,2})?SO\s*THAT\*{0,2}\s+(.+?)(?=[,.]?\s*$|\n\n)/is;

  const asMatch = text.match(asPattern);
  const wantMatch = text.match(wantPattern);

  if (!asMatch || !wantMatch) {
    return null;
  }

  const soThatMatch = text.match(soThatPattern);

  return {
    asA: cleanExtractedText(asMatch[1]),
    iWant: cleanExtractedText(wantMatch[1]),
    soThat: soThatMatch ? cleanExtractedText(soThatMatch[1]) : null,
  };
}

/**
 * Clean extracted text by removing trailing punctuation and extra whitespace.
 */
function cleanExtractedText(text: string): string {
  return text
    .replace(/\*{1,2}/g, '')  // Strip all bold/italic markers (**, *)
    .replace(/[,.]$/, '')  // Remove trailing comma or period
    .replace(/\s+/g, ' ')  // Collapse whitespace
    .trim();
}

/**
 * Check if a line is part of AS/WANT/SO THAT pattern.
 * Handles various formats including bold markdown and Jira wiki.
 */
function isAsWantSoThatLine(line: string): boolean {
  // Match patterns like: **AS**, *AS*, AS (with various bold markers)
  // Also handles converted markdown where *text* becomes **text**
  return /^\*{0,4}AS\*{0,4}\s+/i.test(line) ||
         /^\*{0,4}I\s*WANT\*{0,4}/i.test(line) ||
         /^\*{0,4}SO\s*THAT\*{0,4}/i.test(line);
}

/**
 * Extract context paragraphs from description.
 *
 * Context is prose text that is NOT:
 * - AS/WANT/SO THAT section
 * - Bullet points
 * - Headers
 * - Technical notes section
 *
 * @param description - Raw description text
 * @returns Context paragraphs joined with newlines
 */
export function extractContext(description: string): string {
  if (!description) {
    return '';
  }

  // Convert to markdown first
  const text = convertJiraToMarkdown(description);
  const lines = text.split('\n');

  const contextLines: string[] = [];
  let skipUntilBlankLine = false;
  let inTechnicalNotes = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Handle blank lines
    if (!trimmed) {
      skipUntilBlankLine = false;
      if (contextLines.length > 0 && contextLines[contextLines.length - 1] !== '') {
        contextLines.push('');
      }
      continue;
    }

    // Detect and skip AS/WANT/SO THAT section (may span multiple lines)
    if (isAsWantSoThatLine(trimmed)) {
      skipUntilBlankLine = true;
      continue;
    }

    // Skip continuation lines of AS/WANT/SO THAT
    if (skipUntilBlankLine) {
      continue;
    }

    // Detect technical notes section
    if (isTechnicalNotesHeader(trimmed)) {
      inTechnicalNotes = true;
      continue;
    }

    // Skip if in technical notes
    if (inTechnicalNotes) {
      continue;
    }

    // Skip bullets
    if (/^[-*]\s+/.test(trimmed)) {
      continue;
    }

    // Skip numbered lists
    if (/^\d+\.\s+/.test(trimmed)) {
      continue;
    }

    // Skip headers
    if (/^#{1,6}\s+/.test(trimmed) || /^h[1-6]\.\s+/i.test(trimmed)) {
      continue;
    }

    // Skip bold section headers (e.g., **Context:**, **Technical Notes:**)
    if (/^\*{1,2}[^*]+:\*{0,2}$/.test(trimmed)) {
      continue;
    }

    // This is context content
    contextLines.push(trimmed);
  }

  // Clean up: remove trailing empty lines
  while (contextLines.length > 0 && contextLines[contextLines.length - 1] === '') {
    contextLines.pop();
  }

  return contextLines.join('\n');
}

/**
 * Extract requirements from description.
 *
 * Requirements are bullet points (- or *) that are NOT in the technical notes section.
 *
 * @param description - Raw description text
 * @returns Array of requirement strings
 */
export function extractRequirements(description: string): string[] {
  if (!description) {
    return [];
  }

  // Convert to markdown first
  const text = convertJiraToMarkdown(description);
  const lines = text.split('\n');

  const requirements: string[] = [];
  let inTechnicalNotes = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect technical notes section start
    if (/^(?:\*{1,2})?Technical\s*Notes:?\*{0,2}$/i.test(trimmed) ||
        /^#{1,3}\s*Technical\s*Notes/i.test(trimmed) ||
        /^h[1-4]\.\s*Technical\s*Notes/i.test(trimmed)) {
      inTechnicalNotes = true;
      continue;
    }

    // Detect next section header (exit technical notes)
    if (inTechnicalNotes &&
        (/^(?:\*{1,2})?[A-Z][^*]+:\*{0,2}$/i.test(trimmed) ||
         /^#{1,3}\s+/.test(trimmed))) {
      inTechnicalNotes = false;
    }

    // Skip if in technical notes
    if (inTechnicalNotes) {
      continue;
    }

    // Extract bullet points
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      const content = bulletMatch[1].trim();
      if (content) {
        requirements.push(content);
      }
    }
  }

  return requirements;
}

/**
 * Check if a line is a Technical Notes header.
 * Handles various formats including bold markdown and Jira wiki.
 * Note: After convertJiraToMarkdown, bold markers may double up (e.g., *** or ****)
 */
function isTechnicalNotesHeader(line: string): boolean {
  // Match: **Technical Notes:**, *Technical Notes*, Technical Notes:
  // After conversion may have extra asterisks like ***Technical Notes:****
  // Also h2. Technical Notes, ## Technical Notes
  return /^\*{0,}Technical\s*Notes:?\*{0,}$/i.test(line) ||
         /^#{1,3}\s*Technical\s*Notes/i.test(line) ||
         /^h[1-4]\.\s*Technical\s*Notes/i.test(line);
}

/**
 * Check if a line is a section header (used to detect end of a section).
 * Note: After convertJiraToMarkdown, bold markers may double up (e.g., *** or ****)
 */
function isSectionHeader(line: string): boolean {
  // Bold header like **Section:** or **Next Section:**
  // After conversion may have extra asterisks like ****Next Section:***
  // Match: asterisks, then text with colon, then asterisks
  if (/^\*+[^*]+:\*+$/i.test(line)) {
    return true;
  }
  // Markdown header
  if (/^#{1,3}\s+[^#]/.test(line)) {
    return true;
  }
  // Jira wiki header
  if (/^h[1-4]\.\s+/i.test(line)) {
    return true;
  }
  return false;
}

/**
 * Extract technical notes from description.
 *
 * Looks for a "Technical Notes" section and extracts its bullet points.
 *
 * @param description - Raw description text
 * @returns Array of technical note strings
 */
export function extractTechnicalNotes(description: string): string[] {
  if (!description) {
    return [];
  }

  // Convert to markdown first
  const text = convertJiraToMarkdown(description);
  const lines = text.split('\n');

  const notes: string[] = [];
  let inTechnicalNotes = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect technical notes section start
    if (isTechnicalNotesHeader(trimmed)) {
      inTechnicalNotes = true;
      continue;
    }

    // Detect next section header (exit technical notes)
    if (inTechnicalNotes && trimmed && isSectionHeader(trimmed)) {
      break;
    }

    // Extract bullet points if in technical notes
    if (inTechnicalNotes) {
      const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
      if (bulletMatch) {
        const content = bulletMatch[1].trim();
        if (content) {
          notes.push(content);
        }
      }
    }
  }

  return notes;
}

/**
 * Parse description into structured sections.
 *
 * Combines all extraction functions into a single call.
 *
 * @param description - Raw description text
 * @returns Structured description sections
 */
export function parseDescriptionSections(description: string): DescriptionSections {
  return {
    asWantSoThat: extractAsWantSoThat(description),
    context: extractContext(description),
    requirements: extractRequirements(description),
    technicalNotes: extractTechnicalNotes(description),
  };
}
