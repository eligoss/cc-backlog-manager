/**
 * WikiConverter - Converts Markdown to Jira Wiki Markup
 *
 * Migrated from: modules/jira/src/jira/export_to_jira.py (MarkdownToJiraConverter)
 *
 * Conversion Rules:
 * - Headers: # → h1., ## → h2., ### → h3.
 * - Bold: **text** → *text*
 * - Italic: _text_ → _text_ (preserved)
 * - Inline code: `code` → {{code}}
 * - Code blocks: ```lang → {code:lang}, ``` → {code}
 * - Links: [text](url) → [text|url]
 * - Lists: - item → * item, 1. item → # item
 *
 * Optional cleanup (matching Python implementation):
 * - Remove title (first h1 heading)
 * - Remove horizontal rules (---)
 * - Remove metadata lines
 * - Convert bold labels to h3 headings
 */

export interface WikiConverterOptions {
  /** Remove the first h1 heading (title) */
  removeTitle?: boolean;
  /** Remove horizontal rules (---) */
  removeHorizontalRules?: boolean;
  /** Remove metadata line (Type: Task | Status: ...) */
  removeMetadataLine?: boolean;
  /** Remove Description heading */
  removeDescriptionHeading?: boolean;
  /** Remove Acceptance Criteria section */
  removeAcceptanceCriteria?: boolean;
  /** Convert bold labels (e.g., **Context:**) to h3 headings */
  convertBoldLabelsToHeadings?: boolean;
}

export class WikiConverter {
  /**
   * Convert markdown to Jira wiki markup
   *
   * @param markdown - Markdown text to convert
   * @param options - Optional cleanup and conversion options
   * @returns Jira wiki markup text
   */
  convert(markdown: string, options: WikiConverterOptions = {}): string {
    if (!markdown) {
      return '';
    }

    let jira = markdown;

    // Apply optional cleanup operations (in order from Python implementation)
    if (options.removeTitle) {
      jira = this.removeTitle(jira);
    }

    if (options.removeHorizontalRules) {
      jira = this.removeHorizontalRules(jira);
    }

    if (options.removeMetadataLine) {
      jira = this.removeMetadataLine(jira);
    }

    if (options.removeDescriptionHeading) {
      jira = this.removeDescriptionHeading(jira);
    }

    if (options.removeAcceptanceCriteria) {
      jira = this.removeAcceptanceCriteria(jira);
    }

    // Only trim if we did cleanup operations (preserve formatting for basic conversions)
    const didCleanup = options.removeTitle || options.removeHorizontalRules ||
                       options.removeMetadataLine || options.removeDescriptionHeading ||
                       options.removeAcceptanceCriteria;
    if (didCleanup) {
      jira = jira.trim();
    }

    // Convert bold labels to h3 headings (must be done before header conversion)
    if (options.convertBoldLabelsToHeadings) {
      jira = this.convertBoldLabelsToHeadings(jira);
    }

    // Apply core markdown to wiki conversions
    // Order matters: code blocks first to protect their content, then inline code
    jira = this.convertCodeBlocks(jira);
    jira = this.convertHeaders(jira);
    jira = this.convertBold(jira);
    jira = this.convertLinks(jira);
    jira = this.convertInlineCode(jira);
    jira = this.convertLists(jira);

    // Trim only newlines, preserve leading/trailing spaces on single lines
    return jira.replace(/^\n+|\n+$/g, '');
  }

  /**
   * Remove title (first h1 heading)
   */
  private removeTitle(text: string): string {
    // Remove first h1 heading line
    return text.replace(/^# .+$\n*/m, '');
  }

  /**
   * Remove horizontal rules (---)
   */
  private removeHorizontalRules(text: string): string {
    return text.replace(/^---+$\n*/gm, '');
  }

  /**
   * Remove metadata line (Type: Task | Status: Ready For Review | Priority: P1 | Effort: 5 points)
   */
  private removeMetadataLine(text: string): string {
    return text.replace(/^\*\*Type:\*\*.*?(?=\n|$)/gm, '');
  }

  /**
   * Remove "Description" heading (Jira provides this section already)
   */
  private removeDescriptionHeading(text: string): string {
    return text.replace(/^## Description\s*$\n*/gim, '');
  }

  /**
   * Remove Acceptance Criteria section (from ## Acceptance Criteria to end or next ##)
   */
  private removeAcceptanceCriteria(text: string): string {
    return text.replace(/## Acceptance Criteria.*?(?=\n##|\n*$)/gs, '');
  }

  /**
   * Convert section headers formatted as bold to h3 headings
   *
   * Examples:
   * - **Context:** → h3. Context
   * - **Requirements:** → h3. Requirements
   * - **Technical Notes:** → h3. Technical Notes
   */
  private convertBoldLabelsToHeadings(text: string): string {
    return text.replace(/^\*\*([^*:]+):\*\*\s*$/gm, 'h3. $1');
  }

  /**
   * Convert markdown headers to Jira wiki headers
   *
   * - # Header → h1. Header
   * - ## Header → h2. Header
   * - ### Header → h3. Header
   */
  private convertHeaders(text: string): string {
    let result = text;

    // Convert headers (order matters: ### before ## before #)
    result = result.replace(/^### (.+)$/gm, 'h3. $1');
    result = result.replace(/^## (.+)$/gm, 'h2. $1');
    result = result.replace(/^# (.+)$/gm, 'h1. $1');

    return result;
  }

  /**
   * Convert bold formatting from markdown to Jira wiki
   *
   * - **text** → *text*
   * - ***text*** → *text* (multiple asterisks normalized)
   *
   * Note: Jira uses single asterisk for bold, not double
   */
  private convertBold(text: string): string {
    // Handle multiple asterisks (***text*** → *text*)
    let result = text.replace(/\*\*\*([^*]+)\*\*\*/g, '*$1*');

    // Convert double asterisks to single (Jira bold format)
    result = result.replace(/\*\*([^*]+)\*\*/g, '*$1*');

    return result;
  }

  /**
   * Convert links from markdown to Jira wiki format
   *
   * - [text](url) → [text|url]
   *
   * Note: Uses non-greedy matching to handle nested brackets
   */
  private convertLinks(text: string): string {
    // Match [text](url) where text can contain brackets
    // Use a more sophisticated approach to handle nested brackets
    return text.replace(/\[(.+?)\]\(([^)]+)\)/g, '[$1|$2]');
  }

  /**
   * Convert fenced code blocks to Jira wiki format
   *
   * - ```language → {code:language}
   * - ``` → {code}
   * - Closing ``` → {code}
   */
  private convertCodeBlocks(text: string): string {
    let result = text;

    // Convert opening fence with language hint
    result = result.replace(/```(\w+)\n/g, '{code:$1}\n');

    // Convert opening fence without language
    result = result.replace(/```\n/g, '{code}\n');

    // Convert closing fence
    result = result.replace(/```/g, '{code}');

    return result;
  }

  /**
   * Convert inline code from markdown to Jira wiki format
   *
   * - `code` → {{code}}
   *
   * Note: Code blocks are converted first, so backticks inside {code}...{code}
   * blocks are protected from conversion
   */
  private convertInlineCode(text: string): string {
    // Split by code blocks to avoid converting backticks inside them
    const codeBlockPattern = /\{code[^}]*\}[\s\S]*?\{code\}/g;
    const parts: Array<{ text: string; isCodeBlock: boolean }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    // Find all code blocks
    while ((match = codeBlockPattern.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({ text: text.substring(lastIndex, match.index), isCodeBlock: false });
      }
      // Add code block (preserve as-is)
      parts.push({ text: match[0], isCodeBlock: true });
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex), isCodeBlock: false });
    }

    // If no code blocks found, process entire text
    if (parts.length === 0) {
      return text.replace(/`([^`]+)`/g, '{{$1}}');
    }

    // Convert inline code only in non-code-block parts
    return parts
      .map(part => {
        if (part.isCodeBlock) {
          return part.text; // Preserve code blocks
        }
        return part.text.replace(/`([^`]+)`/g, '{{$1}}');
      })
      .join('');
  }

  /**
   * Convert lists from markdown to Jira wiki format
   *
   * - Unordered: - item → * item
   * - Ordered: 1. item → # item
   *
   * Preserves indentation for nested lists
   */
  private convertLists(text: string): string {
    let result = text;

    // Convert unordered lists (- to *)
    // Preserve leading whitespace for nested lists
    result = result.replace(/^(\s*)- /gm, '$1* ');

    // Convert ordered lists (1. to #, 2. to #, etc.)
    // Preserve leading whitespace for nested lists
    result = result.replace(/^(\s*)\d+\. /gm, '$1# ');

    return result;
  }
}

/**
 * Convenience function to convert markdown to Jira wiki markup
 *
 * @param markdown - Markdown text to convert
 * @param options - Optional conversion options
 * @returns Jira wiki markup text
 */
export function convertMarkdownToJiraWiki(
  markdown: string,
  options?: WikiConverterOptions
): string {
  const converter = new WikiConverter();
  return converter.convert(markdown, options);
}

/**
 * Convert Jira wiki markup to Markdown.
 * Reverse of convertMarkdownToJiraWiki.
 */
export function convertJiraWikiToMarkdown(wiki: string): string {
  if (!wiki) return '';

  let result = wiki;

  // Use placeholders to protect code block content from inline formatting passes
  const codeBlocks: string[] = [];

  // Code blocks first (before other inline conversions interfere)
  result = result.replace(/\{code(?::([^}]*))?\}([\s\S]*?)\{code\}/g, (_match, lang, code) => {
    const language = lang || '';
    const block = '```' + language + '\n' + code.trim() + '\n```';
    codeBlocks.push(block);
    return `\x00CODEBLOCK_${codeBlocks.length - 1}\x00`;
  });

  // Noformat blocks
  result = result.replace(/\{noformat\}([\s\S]*?)\{noformat\}/g, (_match, content) => {
    const block = '```\n' + content.trim() + '\n```';
    codeBlocks.push(block);
    return `\x00CODEBLOCK_${codeBlocks.length - 1}\x00`;
  });

  // Panel blocks
  result = result.replace(
    /\{panel(?::title=([^}]*))?\}([\s\S]*?)\{panel\}/g,
    (_match, title, content) => {
      const trimmed = content.trim();
      const lines = trimmed.split('\n').map((line: string) => '> ' + line);
      if (title) {
        return '> **' + title + '**\n' + lines.join('\n');
      }
      return lines.join('\n');
    }
  );

  // Process line by line for headings, lists, tables
  const lines = result.split('\n');
  const processed: string[] = [];
  let orderedListCounters: number[] = [0];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headings
    const headingMatch = line.match(/^h([1-6])\.\s+(.*)$/);
    if (headingMatch) {
      const level = parseInt(headingMatch[1], 10);
      processed.push('#'.repeat(level) + ' ' + headingMatch[2]);
      orderedListCounters = [0];
      continue;
    }

    // Table header rows: ||Header 1||Header 2||
    const tableHeaderMatch = line.match(/^\|\|(.+)\|\|$/);
    if (tableHeaderMatch) {
      const cells = line.split('||').filter(c => c.length > 0);
      const headerRow = '| ' + cells.map(c => c.trim()).join(' | ') + ' |';
      const separatorRow = '| ' + cells.map(() => '---').join(' | ') + ' |';
      processed.push(headerRow);
      processed.push(separatorRow);
      continue;
    }

    // Table data rows: |Cell 1|Cell 2|
    const tableDataMatch = line.match(/^\|(.+)\|$/);
    if (tableDataMatch && !line.includes('||')) {
      const cells = line.split('|').filter(c => c.length > 0);
      processed.push('| ' + cells.map(c => c.trim()).join(' | ') + ' |');
      continue;
    }

    // Unordered lists: *, **, ***
    const ulMatch = line.match(/^(\*+)\s+(.*)$/);
    if (ulMatch) {
      const depth = ulMatch[1].length - 1;
      const indent = '  '.repeat(depth);
      processed.push(indent + '- ' + ulMatch[2]);
      orderedListCounters = [0];
      continue;
    }

    // Ordered lists: #, ##, ###
    const olMatch = line.match(/^(#+)\s+(.*)$/);
    if (olMatch) {
      const depth = olMatch[1].length - 1;
      const indent = '   '.repeat(depth);
      while (orderedListCounters.length <= depth) orderedListCounters.push(0);
      // Reset deeper counters when coming back to a shallower level
      if (orderedListCounters.length > depth + 1) {
        orderedListCounters.length = depth + 1;
      }
      orderedListCounters[depth]++;
      processed.push(indent + orderedListCounters[depth] + '. ' + olMatch[2]);
      continue;
    }

    orderedListCounters = [0];
    processed.push(line);
  }

  result = processed.join('\n');

  // Inline formatting
  result = result.replace(/\{\{([^}]+)\}\}/g, '`$1`');

  // Bold: *text* → **text** (use placeholder to prevent double-matching)
  const boldPlaceholder = '\x00BOLD\x00';
  result = result.replace(/(?<![`\w*])\*([^\s*][^*]*[^\s*])\*(?![`\w*])/g, boldPlaceholder + '$1' + boldPlaceholder);
  result = result.replace(/(?<![`\w*])\*([^\s*]+)\*(?![`\w*])/g, boldPlaceholder + '$1' + boldPlaceholder);
  result = result.replaceAll(boldPlaceholder, '**');

  // Italic: _text_ → *text*
  result = result.replace(/(?<![`\w])_([^\s_][^_]*[^\s_])_(?![`\w])/g, '*$1*');
  result = result.replace(/(?<![`\w])_([^\s_]+)_(?![`\w])/g, '*$1*');

  // Links
  result = result.replace(/\[([^|\]]+)\|([^\]]+)\]/g, '[$1]($2)');
  result = result.replace(/\[(https?:\/\/[^\]]+)\]/g, '[$1]($1)');

  // Restore protected code blocks (use replaceAll to handle edge cases with duplicate placeholders)
  for (let i = 0; i < codeBlocks.length; i++) {
    result = result.replaceAll(`\x00CODEBLOCK_${i}\x00`, codeBlocks[i]);
  }

  return result;
}
