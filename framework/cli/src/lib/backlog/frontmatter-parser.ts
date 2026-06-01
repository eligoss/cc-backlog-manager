/**
 * Shared YAML frontmatter parser for ticket markdown files
 *
 * Provides consistent parsing behavior across diff-engine, push-engine,
 * and any other module that needs to extract frontmatter from ticket files.
 *
 * @module lib/backlog/frontmatter-parser
 */

export interface ParsedTicket {
  frontmatter: Record<string, unknown>;
  body: string;
}

/**
 * Parse YAML frontmatter from a markdown string.
 *
 * Handles:
 * - Splitting on first colon (preserves colons in values like timestamps)
 * - Stripping surrounding quotes from string values
 * - Null and empty values → null
 * - Boolean literals (true/false)
 * - JSON-style array values ([...])
 *
 * Returns the parsed frontmatter object and the remaining body text.
 */
export function parseFrontmatter(content: string): ParsedTicket {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!fmMatch) {
    return { frontmatter: {}, body: content };
  }

  const frontmatter: Record<string, unknown> = {};
  for (const line of fmMatch[1].split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx <= 0) continue;

    const key = line.slice(0, colonIdx).trim();
    let value: unknown = line.slice(colonIdx + 1).trim();

    // Handle null/empty
    if (value === 'null' || value === '') {
      value = null;
    }
    // Handle booleans
    else if (value === 'true') value = true;
    else if (value === 'false') value = false;
    // Strip surrounding quotes
    else if (typeof value === 'string' && /^["'].*["']$/.test(value)) {
      value = (value as string).slice(1, -1);
    }

    // Handle arrays
    if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      try {
        value = JSON.parse(value.replace(/'/g, '"'));
      } catch {
        /* keep as string */
      }
    }

    frontmatter[key] = value;
  }

  return { frontmatter, body: fmMatch[2] };
}
