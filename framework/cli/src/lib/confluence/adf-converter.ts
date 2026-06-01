/**
 * Confluence ADF (Atlassian Document Format) Converter
 *
 * Provides bidirectional conversion between ADF and Markdown.
 */

// Type definitions for ADF structures
export interface AdfNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
  text?: string;
  marks?: AdfMark[];
}

export interface AdfMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface AdfDocument {
  type: 'doc';
  version: number;
  content: AdfNode[];
}

/**
 * Convert ADF document to Markdown
 */
export function adfToMarkdown(adf: AdfDocument | AdfNode): string {
  const converter = new AdfToMarkdownConverter();
  return converter.convert(adf);
}

/**
 * Convert Markdown to ADF document
 */
export function markdownToAdf(markdown: string): AdfDocument {
  const converter = new MarkdownToAdfConverter();
  return converter.convert(markdown);
}

/**
 * ADF to Markdown Converter
 */
class AdfToMarkdownConverter {
  private output: string[] = [];
  private listDepth = 0;

  convert(adf: AdfDocument | AdfNode): string {
    this.output = [];
    this.listDepth = 0;

    if ('content' in adf && adf.content) {
      this.processNodes(adf.content);
    }

    return this.output.join('\n');
  }

  private processNodes(nodes: AdfNode[]): void {
    for (const node of nodes) {
      this.processNode(node);
    }
  }

  private processNode(node: AdfNode): void {
    if (!node || !node.type) {
      return;
    }

    const handlerName = `handle_${node.type}` as keyof this;
    if (typeof this[handlerName] === 'function') {
      (this[handlerName] as (node: AdfNode) => void).call(this, node);
    } else {
      this.processNodeContent(node);
    }
  }

  private processNodeContent(node: AdfNode): void {
    if (node.content) {
      this.processNodes(node.content);
    } else if (node.text) {
      this.output.push(node.text);
    }
  }

  // Node type handlers

  private handle_doc(node: AdfNode): void {
    if (node.content) {
      this.processNodes(node.content);
    }
  }

  private handle_paragraph(node: AdfNode): void {
    const text = node.content ? this.processInlineContent(node.content) : '';

    if (text || this.output.length === 0) {
      this.output.push(text);
    }
  }

  private handle_heading(node: AdfNode): void {
    const level = typeof node.attrs?.level === 'number' ? node.attrs.level : 1;
    const text = node.content ? this.processInlineContent(node.content) : '';
    this.output.push('#'.repeat(level) + ' ' + text);
  }

  private handle_blockquote(node: AdfNode): void {
    if (node.content) {
      const savedOutput = this.output;
      this.output = [];
      this.processNodes(node.content);
      const quoteContent = this.output.join('\n');
      this.output = savedOutput;

      for (const line of quoteContent.split('\n')) {
        this.output.push('> ' + line);
      }
    }
  }

  private handle_codeBlock(node: AdfNode): void {
    const language = typeof node.attrs?.language === 'string' ? node.attrs.language : '';
    this.output.push('```' + language);

    if (node.content) {
      for (const line of node.content) {
        if (line.text !== undefined) {
          this.output.push(line.text);
        }
      }
    }

    this.output.push('```');
  }

  private handle_bulletList(node: AdfNode): void {
    this.listDepth++;
    if (node.content) {
      this.processNodes(node.content);
    }
    this.listDepth--;
  }

  private handle_orderedList(node: AdfNode): void {
    this.listDepth++;
    let itemNum = 1;

    if (node.content) {
      for (const item of node.content) {
        if (item.type === 'listItem') {
          const savedOutput = this.output;
          this.output = [];
          if (item.content) {
            this.processNodes(item.content);
          }
          const itemContent = this.output.join('\n');
          this.output = savedOutput;

          const indent = '  '.repeat(this.listDepth - 1);
          const lines = itemContent.split('\n');

          for (let i = 0; i < lines.length; i++) {
            if (i === 0) {
              this.output.push(`${indent}${itemNum}. ${lines[i]}`);
            } else {
              this.output.push(`${indent}   ${lines[i]}`);
            }
          }

          itemNum++;
        }
      }
    }

    this.listDepth--;
  }

  private handle_listItem(node: AdfNode): void {
    if (node.content) {
      const indent = '  '.repeat(Math.max(0, this.listDepth - 1));
      const savedOutput = this.output;
      this.output = [];
      this.processNodes(node.content);
      const itemContent = this.output.join('\n');
      this.output = savedOutput;

      const lines = itemContent.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (i === 0) {
          this.output.push(`${indent}- ${lines[i]}`);
        } else {
          // Check if continuation line is already a list item (starts with spaces and -)
          // If so, don't add extra indentation, otherwise add 2 spaces for paragraph continuation
          if (lines[i].match(/^\s*[-*+\d]/)) {
            this.output.push(`${indent}${lines[i]}`);
          } else {
            this.output.push(`${indent}  ${lines[i]}`);
          }
        }
      }
    }
  }

  private handle_table(node: AdfNode): void {
    this.output.push(''); // blank line before table

    if (node.content) {
      for (let rowIndex = 0; rowIndex < node.content.length; rowIndex++) {
        const row = node.content[rowIndex];
        if (row.type === 'tableRow') {
          const cells: string[] = [];

          if (row.content) {
            for (const cell of row.content) {
              if (cell.type === 'tableHeader' || cell.type === 'tableCell') {
                let cellText = '';
                if (cell.content) {
                  // Table cells contain paragraphs, we need to extract their inline content
                  for (const cellContent of cell.content) {
                    if (cellContent.type === 'paragraph' && cellContent.content) {
                      cellText += this.processInlineContent(cellContent.content);
                    }
                  }
                }
                cells.push(cellText);
              }
            }
          }

          this.output.push('| ' + cells.join(' | ') + ' |');

          // Add separator after header row
          if (rowIndex === 0) {
            const separator = cells.map(() => '---').join('|');
            this.output.push('|' + separator + '|');
          }
        }
      }
    }

    this.output.push(''); // blank line after table
  }

  private handle_rule(_node: AdfNode): void {
    this.output.push('---');
  }

  // Inline content processing

  private processInlineContent(nodes: AdfNode[]): string {
    let result = '';

    for (const node of nodes) {
      if (node.type === 'text') {
        let text = node.text || '';

        // Apply marks (bold, italic, code, etc.)
        if (node.marks && node.marks.length > 0) {
          const marks = node.marks;

          // Check for each mark type
          const hasCode = marks.some((m) => m.type === 'code');
          const hasEm = marks.some((m) => m.type === 'em');
          const hasStrong = marks.some((m) => m.type === 'strong');
          const hasStrike = marks.some((m) => m.type === 'strike');
          const linkMark = marks.find((m) => m.type === 'link');

          // Apply marks in order (code, em, strong, strikethrough, link)
          if (hasCode) {
            text = '`' + text + '`';
          }
          if (hasEm) {
            text = '*' + text + '*';
          }
          if (hasStrong) {
            text = '**' + text + '**';
          }
          if (hasStrike) {
            text = '~~' + text + '~~';
          }
          if (linkMark && typeof linkMark.attrs?.href === 'string') {
            text = '[' + text + '](' + linkMark.attrs.href + ')';
          }
        }

        result += text;
      } else if (node.type === 'hardBreak') {
        result += '\n';
      } else if (node.type === 'softBreak') {
        result += ' ';
      }
    }

    return result;
  }
}

/**
 * Markdown to ADF Converter
 */
class MarkdownToAdfConverter {
  private adf: AdfDocument = {
    version: 1,
    type: 'doc',
    content: [],
  };

  convert(markdown: string): AdfDocument {
    this.adf = {
      version: 1,
      type: 'doc',
      content: [],
    };

    const lines = markdown.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Skip empty lines
      if (!line.trim()) {
        i++;
        continue;
      }

      // Check for headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        this.adf.content.push(this.createHeading(level, text));
        i++;
        continue;
      }

      // Check for code blocks
      if (line.trim().startsWith('```')) {
        const [codeBlock, linesConsumed] = this.parseCodeBlock(lines.slice(i));
        if (codeBlock) {
          this.adf.content.push(codeBlock);
          i += linesConsumed;
          continue;
        }
      }

      // Check for unordered lists
      if (line.match(/^[\s]*[-*+]\s+/)) {
        const [listNode, linesConsumed] = this.parseList(lines.slice(i), false);
        if (listNode) {
          this.adf.content.push(listNode);
          i += linesConsumed;
          continue;
        }
      }

      // Check for ordered lists
      if (line.match(/^[\s]*\d+\.\s+/)) {
        const [listNode, linesConsumed] = this.parseList(lines.slice(i), true);
        if (listNode) {
          this.adf.content.push(listNode);
          i += linesConsumed;
          continue;
        }
      }

      // Check for blockquotes
      if (line.trim().startsWith('>')) {
        const [quoteNode, linesConsumed] = this.parseBlockquote(lines.slice(i));
        if (quoteNode) {
          this.adf.content.push(quoteNode);
          i += linesConsumed;
          continue;
        }
      }

      // Check for horizontal rules
      if (line.match(/^[\s]*[-*_]{3,}[\s]*$/)) {
        this.adf.content.push({ type: 'rule' });
        i++;
        continue;
      }

      // Check for tables
      if (
        i + 1 < lines.length &&
        line.match(/^\|.*\|$/) &&
        lines[i + 1].match(/^\|[\s:|-]+\|$/)
      ) {
        const [tableNode, linesConsumed] = this.parseTable(lines.slice(i));
        if (tableNode) {
          this.adf.content.push(tableNode);
          i += linesConsumed;
          continue;
        }
      }

      // Default: paragraph
      const paragraph = this.createParagraph(line);
      this.adf.content.push(paragraph);
      i++;
    }

    return this.adf;
  }

  private createHeading(level: number, text: string): AdfNode {
    return {
      type: 'heading',
      attrs: { level },
      content: this.parseInline(text),
    };
  }

  private createParagraph(text: string): AdfNode {
    return {
      type: 'paragraph',
      content: this.parseInline(text),
    };
  }

  private parseInline(text: string): AdfNode[] {
    const content: AdfNode[] = [];
    let remaining = text;

    // Pattern for inline elements
    const pattern = /(\*\*|__|\*|_|`|\[|~~)/;

    while (remaining) {
      const match = remaining.match(pattern);

      if (!match || match.index === undefined) {
        // No more formatting, add remaining text
        if (remaining) {
          content.push({ type: 'text', text: remaining });
        }
        break;
      }

      // Add text before the match
      if (match.index > 0) {
        content.push({ type: 'text', text: remaining.substring(0, match.index) });
      }

      const marker = match[1];
      remaining = remaining.substring(match.index + match[0].length);

      // Handle different markers
      if (marker === '**' || marker === '__') {
        // Bold
        const closeMatch = remaining.match(/^([^*_]+?)(\*\*|__)/);
        if (closeMatch) {
          content.push({
            type: 'text',
            text: closeMatch[1],
            marks: [{ type: 'strong' }],
          });
          remaining = remaining.substring(closeMatch[0].length);
        } else {
          content.push({ type: 'text', text: marker });
        }
      } else if (marker === '*' || marker === '_') {
        // Italic
        const closeMatch = remaining.match(/^([^*_]+?)(\*|_)/);
        if (closeMatch) {
          content.push({
            type: 'text',
            text: closeMatch[1],
            marks: [{ type: 'em' }],
          });
          remaining = remaining.substring(closeMatch[0].length);
        } else {
          content.push({ type: 'text', text: marker });
        }
      } else if (marker === '`') {
        // Inline code
        const closeMatch = remaining.match(/^([^`]+?)`/);
        if (closeMatch) {
          content.push({
            type: 'text',
            text: closeMatch[1],
            marks: [{ type: 'code' }],
          });
          remaining = remaining.substring(closeMatch[0].length);
        } else {
          content.push({ type: 'text', text: marker });
        }
      } else if (marker === '[') {
        // Link [text](url)
        const linkMatch = remaining.match(/^([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          content.push({
            type: 'text',
            text: linkMatch[1],
            marks: [{ type: 'link', attrs: { href: linkMatch[2] } }],
          });
          remaining = remaining.substring(linkMatch[0].length);
        } else {
          content.push({ type: 'text', text: marker });
        }
      } else if (marker === '~~') {
        // Strikethrough
        const closeMatch = remaining.match(/^([^~]+?)~~/);
        if (closeMatch) {
          content.push({
            type: 'text',
            text: closeMatch[1],
            marks: [{ type: 'strike' }],
          });
          remaining = remaining.substring(closeMatch[0].length);
        } else {
          content.push({ type: 'text', text: marker });
        }
      }
    }

    return content.length > 0 ? content : [{ type: 'text', text: '' }];
  }

  private parseCodeBlock(lines: string[]): [AdfNode | null, number] {
    if (!lines[0].trim().startsWith('```')) {
      return [null, 0];
    }

    // Extract language if specified
    const firstLine = lines[0].trim();
    const language = firstLine.length > 3 ? firstLine.substring(3).trim() : undefined;

    // Find closing ```
    const codeLines: string[] = [];
    let i = 1;
    while (i < lines.length) {
      if (lines[i].trim() === '```') {
        // Found closing marker
        const codeBlock: AdfNode = {
          type: 'codeBlock',
          content: [{ type: 'text', text: codeLines.join('\n') }],
        };
        if (language) {
          codeBlock.attrs = { language };
        }
        return [codeBlock, i + 1];
      }
      codeLines.push(lines[i]);
      i++;
    }

    // No closing marker found
    return [null, 0];
  }

  private parseList(
    lines: string[],
    ordered: boolean,
    baseIndent: number | null = null
  ): [AdfNode | null, number] {
    if (!lines.length) {
      return [null, 0];
    }

    const listItems: AdfNode[] = [];
    let i = 0;

    // Pattern for detecting list items
    const pattern = ordered ? /^(\s*)(\d+\.)\s+(.+)$/ : /^(\s*)([-*+])\s+(.+)$/;

    // Auto-detect base indentation from first line if not provided
    if (baseIndent === null) {
      const match = lines[i].match(pattern);
      if (!match) {
        return [null, 0];
      }
      baseIndent = match[1].length;
    }

    // Parse list items at this level
    while (i < lines.length) {
      const match = lines[i].match(pattern);

      // Not a list item, stop processing
      if (!match) {
        break;
      }

      const currentIndent = match[1].length;

      // If indentation is less than base, we're done with this list
      if (currentIndent < baseIndent) {
        break;
      }

      // If indentation is greater than base, skip
      if (currentIndent > baseIndent) {
        i++;
        continue;
      }

      // This is a list item at our level
      const content = match[3];
      const listItem: AdfNode = {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: this.parseInline(content),
          },
        ],
      };
      listItems.push(listItem);
      i++;

      // Check for nested items
      while (i < lines.length) {
        const nextMatch = lines[i].match(pattern);
        if (!nextMatch) {
          break;
        }

        const nextIndent = nextMatch[1].length;

        // If next item is at base level or less, it's not a child
        if (nextIndent <= baseIndent) {
          break;
        }

        // Nested list found
        const [nestedList, consumed] = this.parseList(lines.slice(i), ordered, nextIndent);
        if (nestedList && listItem.content) {
          listItem.content.push(nestedList);
        }
        i += consumed;

        // Check again
        if (i >= lines.length) {
          break;
        }
        const checkMatch = lines[i].match(pattern);
        if (!checkMatch || checkMatch[1].length <= baseIndent) {
          break;
        }
      }
    }

    if (!listItems.length) {
      return [null, 0];
    }

    return [
      {
        type: ordered ? 'orderedList' : 'bulletList',
        content: listItems,
      },
      i,
    ];
  }

  private parseBlockquote(lines: string[]): [AdfNode | null, number] {
    const quoteLines: string[] = [];
    let i = 0;

    while (i < lines.length && lines[i].trim().startsWith('>')) {
      // Remove > marker and add to quote
      const quoteText = lines[i].trim().substring(1).trim();
      if (quoteText) {
        quoteLines.push(quoteText);
      }
      i++;
    }

    if (!quoteLines.length) {
      return [null, 0];
    }

    return [
      {
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: this.parseInline(quoteLines.join(' ')),
          },
        ],
      },
      i,
    ];
  }

  private parseTable(lines: string[]): [AdfNode | null, number] {
    if (lines.length < 2) {
      return [null, 0];
    }

    // Parse header row
    const headerRow = lines[0];
    const separatorRow = lines[1];

    // Validate separator row
    if (!separatorRow.match(/^\|[\s:|-]+\|$/)) {
      return [null, 0];
    }

    // Extract headers
    const headers = headerRow
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());

    // Parse data rows
    const dataRows: string[][] = [];
    let i = 2;
    while (i < lines.length && lines[i].match(/^\|.*\|$/)) {
      const cells = lines[i]
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim());
      dataRows.push(cells);
      i++;
    }

    // Build table ADF
    const tableRows: AdfNode[] = [];

    // Header row
    const headerCells: AdfNode[] = headers.map((header) => ({
      type: 'tableHeader',
      content: [
        {
          type: 'paragraph',
          content: this.parseInline(header),
        },
      ],
    }));
    tableRows.push({ type: 'tableRow', content: headerCells });

    // Data rows
    for (const rowCells of dataRows) {
      const cells: AdfNode[] = rowCells.map((cell) => ({
        type: 'tableCell',
        content: [
          {
            type: 'paragraph',
            content: this.parseInline(cell),
          },
        ],
      }));
      tableRows.push({ type: 'tableRow', content: cells });
    }

    return [
      {
        type: 'table',
        content: tableRows,
      },
      i,
    ];
  }
}
