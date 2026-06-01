---
id: converting-adf
module: confluence
name: ADF Conversion Patterns
description: Convert markdown to Atlassian Document Format (ADF) for Confluence pages. Use when troubleshooting ADF conversion issues, understanding format requirements, or manually constructing ADF for complex content.
scope: generic
applicable-projects: any
capabilities-provided:
  - adf-conversion
  - adf-validation
  - markdown-to-adf
cli-commands:
  validate:
    command: "confluence validate"
    description: "Validate markdown for ADF conversion compatibility"
    options:
      - "--path <path>: Path to markdown file or directory"
      - "--strict: Exit with error on warnings"
      - "--verbose: Show detailed validation information"
---

# ADF Conversion Patterns

## When to Use This Skill

Use this skill when working with **Atlassian Document Format (ADF)** and you need to:

**Conversion Tasks:**
- Understand why markdown isn't rendering correctly in Confluence
- Debug ADF conversion errors or malformed output
- Manually construct ADF for complex layouts
- Validate ADF structure before publishing

**Format Reference:**
- Look up ADF node types and their attributes
- Understand mark types (bold, italic, code, links)
- Reference table, list, or panel structures
- Check supported elements vs. unsupported features

**Troubleshooting:**
- Fix "Invalid document structure" errors
- Resolve content not rendering issues
- Handle complex nested structures
- Address format conversion edge cases

**Example invocations:**
- "Use converting-adf to fix this malformed table"
- "Use converting-adf to understand why my markdown isn't converting"
- "Use converting-adf to manually build an ADF panel"

---

## ADF Structure Overview

ADF is JSON-based markup used by Confluence and other Atlassian products.

**Document Root:**
```json
{
  "version": 1,
  "type": "doc",
  "content": [
    // Block-level nodes go here
  ]
}
```

**Key Concepts:**
- **Nodes:** Block-level elements (paragraphs, headings, lists, tables)
- **Marks:** Inline formatting (bold, italic, links, code)
- **Content Array:** Ordered list of child nodes
- **Attributes:** Node-specific properties (heading level, language, etc.)

---

## Node Types Reference

### Text Content Nodes

| Node Type | Purpose | Markdown | Attributes |
|-----------|---------|----------|------------|
| `paragraph` | Text paragraph | Plain text | - |
| `heading` | Headers h1-h6 | `# Header` | level: 1-6 |
| `codeBlock` | Code block | ` ```lang ` | language (optional) |
| `blockquote` | Quote block | `> Quote` | - |
| `rule` | Horizontal rule | `---` | - |

### List Nodes

| Node Type | Purpose | Markdown | Contains |
|-----------|---------|----------|----------|
| `bulletList` | Unordered list | `- Item` | listItem nodes |
| `orderedList` | Numbered list | `1. Item` | listItem nodes |
| `listItem` | List entry | Nested | paragraph + optional nested list |

### Table Nodes

| Node Type | Purpose | Markdown | Contains |
|-----------|---------|----------|----------|
| `table` | Table container | `| ... |` | tableRow nodes |
| `tableRow` | Table row | Row | tableHeader or tableCell nodes |
| `tableHeader` | Header cell | `| --- |` | paragraph |
| `tableCell` | Body cell | `| val |` | paragraph |

### Confluence-Specific Nodes

| Node Type | Purpose | Markdown Equivalent | Attributes |
|-----------|---------|---------------------|------------|
| `panel` | Colored info box | N/A | panelType: info, warning, error, success, note |
| `expand` | Collapsible section | N/A | title (optional) |
| `status` | Status lozenge | N/A | text, color |

---

## Mark Types Reference

Marks are applied to text nodes for inline formatting.

| Mark | Markdown | ADF Structure |
|------|----------|---------------|
| `strong` | `**bold**` | `{"type": "strong"}` |
| `em` | `*italic*` | `{"type": "em"}` |
| `code` | `` `code` `` | `{"type": "code"}` |
| `strike` | `~~strike~~` | `{"type": "strike"}` |
| `underline` | N/A | `{"type": "underline"}` |
| `link` | `[text](url)` | `{"type": "link", "attrs": {"href": "url"}}` |
| `subsup` | N/A | `{"type": "subsup", "attrs": {"type": "sub"}}` |

**Multiple Marks Example:**
```json
{
  "type": "text",
  "text": "bold italic link",
  "marks": [
    {"type": "strong"},
    {"type": "em"},
    {"type": "link", "attrs": {"href": "https://example.com"}}
  ]
}
```

---

## Common Conversion Patterns

### Pattern 1: Basic Paragraph with Formatting

**Markdown:**
```markdown
This is **bold** and *italic* with a [link](url).
```

**ADF:**
```json
{
  "type": "paragraph",
  "content": [
    {"type": "text", "text": "This is "},
    {"type": "text", "text": "bold", "marks": [{"type": "strong"}]},
    {"type": "text", "text": " and "},
    {"type": "text", "text": "italic", "marks": [{"type": "em"}]},
    {"type": "text", "text": " with a "},
    {"type": "text", "text": "link", "marks": [{"type": "link", "attrs": {"href": "url"}}]},
    {"type": "text", "text": "."}
  ]
}
```

### Pattern 2: List with Nested Items

**Critical Rule:** Each listItem MUST contain a paragraph before any nested list.

**Markdown:**
```markdown
- Item 1
- Item 2
  - Nested item
```

**ADF:**
```json
{
  "type": "bulletList",
  "content": [
    {
      "type": "listItem",
      "content": [
        {"type": "paragraph", "content": [{"type": "text", "text": "Item 1"}]}
      ]
    },
    {
      "type": "listItem",
      "content": [
        {"type": "paragraph", "content": [{"type": "text", "text": "Item 2"}]},
        {
          "type": "bulletList",
          "content": [
            {
              "type": "listItem",
              "content": [
                {"type": "paragraph", "content": [{"type": "text", "text": "Nested item"}]}
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### Pattern 3: Table with Formatted Cells

**Markdown:**
```markdown
| Command | Status |
|---------|--------|
| **npm install** | Done |
```

**ADF:**
```json
{
  "type": "table",
  "content": [
    {
      "type": "tableRow",
      "content": [
        {
          "type": "tableHeader",
          "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": "Command"}]}
          ]
        },
        {
          "type": "tableHeader",
          "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": "Status"}]}
          ]
        }
      ]
    },
    {
      "type": "tableRow",
      "content": [
        {
          "type": "tableCell",
          "content": [
            {"type": "paragraph", "content": [
              {"type": "text", "text": "npm install", "marks": [{"type": "strong"}]}
            ]}
          ]
        },
        {
          "type": "tableCell",
          "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": "Done"}]}
          ]
        }
      ]
    }
  ]
}
```

### Pattern 4: Confluence Panel

**ADF Only (no markdown equivalent):**
```json
{
  "type": "panel",
  "attrs": {"panelType": "warning"},
  "content": [
    {
      "type": "paragraph",
      "content": [
        {"type": "text", "text": "Warning: ", "marks": [{"type": "strong"}]},
        {"type": "text", "text": "This action cannot be undone."}
      ]
    }
  ]
}
```

**Panel Types:**
- `info` - Blue background
- `note` - Yellow background
- `warning` - Orange background
- `error` - Red background
- `success` - Green background

### Pattern 5: Code Block

**Markdown:**
````markdown
```typescript
const x = 1;
```
````

**ADF:**
```json
{
  "type": "codeBlock",
  "attrs": {"language": "typescript"},
  "content": [
    {"type": "text", "text": "const x = 1;"}
  ]
}
```

---

## Validation Checklist

Before publishing, ensure your ADF:

1. **Document Structure**
   - [ ] Root has `version: 1` and `type: "doc"`
   - [ ] Content is non-empty array
   - [ ] No trailing commas in JSON

2. **Text Nodes**
   - [ ] All text wrapped in block elements
   - [ ] Marks only on text nodes (not paragraphs)
   - [ ] No empty text nodes

3. **Lists**
   - [ ] Each listItem contains paragraph first
   - [ ] Nested lists inside listItem, after paragraph
   - [ ] No empty content arrays

4. **Tables**
   - [ ] Table contains tableRow nodes
   - [ ] First row uses tableHeader for headers
   - [ ] Each cell contains paragraph

5. **Headings**
   - [ ] Level attribute between 1-6
   - [ ] Content contains text nodes

---

## Troubleshooting

### Error: "Invalid document structure"

**Causes:**
- Missing `version: 1` or `type: "doc"` in root
- Invalid JSON syntax (trailing commas, unquoted keys)
- Wrong nesting (e.g., paragraph inside text)

**Solution:**
```json
{
  "version": 1,
  "type": "doc",
  "content": [...]
}
```

### Error: List items not rendering

**Cause:** ListItem missing paragraph wrapper.

**Wrong:**
```json
{"type": "listItem", "content": [{"type": "text", "text": "Item"}]}
```

**Correct:**
```json
{"type": "listItem", "content": [
  {"type": "paragraph", "content": [{"type": "text", "text": "Item"}]}
]}
```

### Error: Formatting not appearing

**Cause:** Marks applied to wrong node type.

**Wrong:** Marks on paragraph
```json
{"type": "paragraph", "marks": [{"type": "strong"}], ...}
```

**Correct:** Marks on text
```json
{"type": "text", "text": "bold", "marks": [{"type": "strong"}]}
```

### Error: Table cells empty

**Cause:** Cell missing paragraph wrapper.

**Correct:**
```json
{
  "type": "tableCell",
  "content": [
    {"type": "paragraph", "content": [{"type": "text", "text": "Value"}]}
  ]
}
```

### Error: Complex markdown not converting

**Solutions:**
1. Simplify deeply nested structures
2. Remove HTML (use native markdown)
3. Split large tables
4. Use panels for callouts instead of blockquotes

---

## Unsupported Features

The following markdown features have no ADF equivalent:

- Task lists (`- [ ]`) - use status lozenges instead
- Footnotes
- Definition lists
- Raw HTML
- Emoji shortcodes (use actual Unicode emoji)
- Images with complex sizing (use basic `![alt](url)`)

---

## CLI Commands Reference

| Command | Purpose |
|---------|---------|
| `confluence validate --path <file>` | Validate markdown for ADF compatibility |
| `confluence validate --strict` | Fail on warnings |
| `confluence validate --verbose` | Show detailed validation output |

---

## See Also

### Related Skills
- **publishing-confluence** - Complete publishing workflow (invoke via Skill tool)
- **validating-markdown** - Markdown standards (invoke via Skill tool)

### External Resources
- **ADF Specification:** https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/
- **Confluence REST API:** https://developer.atlassian.com/cloud/confluence/rest/v2/intro/

---

**Version:** 1.0
**Created:** 2026-01-07
**Status:** Production-Ready
**Module:** confluence
**Capabilities:** adf-conversion, adf-validation, markdown-to-adf
