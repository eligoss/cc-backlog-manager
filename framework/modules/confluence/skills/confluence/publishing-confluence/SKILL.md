---
id: publishing-confluence
module: confluence
name: publishing-confluence
description: Master Confluence page publishing, documentation management, and space organization. Use when creating/updating Confluence pages, managing page hierarchy, tracking versions, or implementing documentation workflows with quality gates.
scope: generic
applicable-projects: any
capabilities-provided:
  - confluence-integration
  - confluence-publish
  - confluence-fetch
  - documentation-management
  - format-conversion
  - markdown-to-adf
# Claude Code v2.1 features
context: fork
tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
cli-commands:
  create-page:
    command: "confluence create-page"
    description: "Create new Confluence page from markdown"
    options:
      - "-f, --file <file>: Path to markdown file (required)"
      - "--space <space>: Space key (overrides frontmatter)"
      - "--parent <parentId>: Parent page ID (overrides frontmatter)"
      - "--dry-run: Preview changes without creating page"
  fetch-page:
    command: "confluence fetch-page"
    description: "Fetch Confluence page to markdown"
    options:
      - "<page-id>: Confluence page ID (required)"
      - "-o, --output <file>: Output file path (required)"
  validate:
    command: "confluence validate"
    description: "Validate content before publishing"
    options:
      - "--path <path>: Path to markdown file or directory"
      - "--strict: Exit with error on warnings"
      - "--verbose: Show detailed validation information"
---

# Confluence Publishing Workflow

## When to Use This Skill

Use this skill when working with **Confluence documentation management** and you need to:

**Publishing Tasks:**
- Create new Confluence pages from markdown
- Update existing Confluence pages with local changes
- Manage page versions and conflict detection
- Publish documentation with quality gates

**Organization Tasks:**
- Organize pages in hierarchy (parent-child relationships)
- Manage Confluence spaces and page structure
- Maintain page metadata (pageId, version, URL)
- Track synchronization state between local and Confluence

**Workflow Tasks:**
- Implement documentation publishing workflow
- Set up automated documentation updates
- Manage draft → review → publish lifecycle
- Integrate with CLI commands for automation

**Example invocations:**
- "Use publishing-confluence to publish this documentation"
- "Use publishing-confluence to update existing page"
- "Use publishing-confluence to organize page hierarchy"

---

## Quick Start: Publishing a Page

**CLI Command:** `agentic-framework confluence create-page`

### Minimum Required YAML

```yaml
---
confluence-pageId: null        # null for CREATE, "123456" for UPDATE
confluence-space: "WA"         # Confluence space key
confluence-parent: "393217"    # Parent page ID (optional)
title: "My Documentation Page"
---

# Page Content

Your markdown content here...
```

### Create New Page

```bash
# Create page from markdown
agentic-framework confluence create-page docs/my-page.md --space WA

# After success, YAML auto-updated:
# confluence-pageId: "456789"
# confluence-url: "https://..."
# confluence-page-revision: 1
```

### Update Existing Page

```bash
# Update page (auto-detected if pageId exists)
agentic-framework confluence create-page docs/my-page.md --space WA

# CLI handles:
# - Version conflict detection
# - Incremental version update
# - Optimistic locking
```

---

## ADF Conversion Patterns

The CLI automatically converts markdown to **Atlassian Document Format (ADF)** when publishing pages. Understanding ADF helps troubleshoot conversion issues and format complex elements.

### ADF Structure Overview

ADF is JSON-based markup where:
- **Nodes:** Block-level elements (paragraphs, headings, lists, tables)
- **Marks:** Inline formatting (bold, italic, links, code)
- **Content Array:** Ordered list of child nodes
- **Attributes:** Node-specific properties (heading level, language, etc.)

**Basic Document:**
```json
{
  "version": 1,
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [{"type": "text", "text": "Hello, world!"}]
    }
  ]
}
```

### Core Node Types

| Node Type | Purpose | Markdown | Key Attributes |
|-----------|---------|----------|----------------|
| `paragraph` | Text paragraph | Plain text | - |
| `heading` | Headers (h1-h6) | `# Header` | level: 1-6 |
| `bulletList` | Unordered list | `- Item` | - |
| `orderedList` | Numbered list | `1. Item` | - |
| `listItem` | List item | Nested under list | - |
| `codeBlock` | Code block | ` ```lang ` | language (optional) |
| `table` | Table | `| ... |` | - |
| `panel` | Info/warning panel | N/A (ADF-only) | panelType: info, warning, error, success |
| `expand` | Expandable section | N/A (ADF-only) | title (optional) |

### Text Marks (Inline Formatting)

| Mark | Markdown | ADF Structure |
|------|----------|---------------|
| `strong` | `**bold**` | `{"type": "text", "text": "bold", "marks": [{"type": "strong"}]}` |
| `em` | `*italic*` | `{"type": "text", "text": "italic", "marks": [{"type": "em"}]}` |
| `code` | `` `code` `` | `{"type": "text", "text": "code", "marks": [{"type": "code"}]}` |
| `link` | `[text](url)` | `{"type": "text", "text": "text", "marks": [{"type": "link", "attrs": {"href": "url"}}]}` |

**Multiple Marks Example:**
```json
{
  "type": "text",
  "text": "bold italic link",
  "marks": [
    {"type": "strong"},
    {"type": "em"},
    {"type": "link", "attrs": {"href": "url"}}
  ]
}
```

### Essential Conversion Patterns

**Lists with Nesting:**
- Each list item MUST contain a paragraph
- Nested lists are children of parent list item
- Mix bullet and ordered lists freely

**Tables:**
- Tables contain rows, rows contain cells/headers
- Each cell contains paragraph with formatted text
- Apply marks to text nodes within paragraphs

**Code Blocks:**
- Specify language for syntax highlighting
- Preserve exact whitespace and line breaks
- No marks applied to code text

**Panels (Confluence-specific):**
- Highlight important information with colored background
- Panel types: `info` (blue), `note` (yellow), `warning` (orange), `error` (red), `success` (green)
- Can contain any block elements (paragraphs, lists, code)

### Validation Checklist

Before publishing, ensure:
1. Document has `version: 1` and `type: "doc"` (CLI handles this)
2. All text nodes are wrapped in block elements
3. List items contain paragraphs
4. Headings have `level` attribute (1-6)
5. Table cells contain paragraphs
6. Marks are applied to text nodes only
7. No empty content arrays

### Troubleshooting ADF Issues

**"Invalid document structure" Error:**
- Validate JSON syntax (no trailing commas)
- Ensure root is `doc` with `content` array
- Check proper parent-child nesting
- Compare with working examples

**Content Not Rendering:**
- Check for empty `"content": []` arrays
- Ensure marks only on text nodes
- Add required attributes (e.g., `level` for headings)
- Test with minimal ADF first

**Complex Markdown Not Converting:**
- Simplify deeply nested structures
- Convert custom HTML to native markdown
- Use Confluence-specific elements (panels, expand)
- Document unsupported features as comments

**See:** [ADF-EXAMPLES.md](./ADF-EXAMPLES.md) for complete conversion examples with tables, nested lists, and complex formatting.

---

## Instructions

### 1. Understand the Publishing Workflow

**Three-Stage Lifecycle:**

```
1. DRAFT → Local markdown with confluence-pageId: null
2. PUBLISHED → Page created in Confluence, pageId populated
3. SYNCHRONIZED → Local changes synced to Confluence
```

**Directory Organization:**

```
docs/
├── drafts/              # Unpublished pages (pageId: null)
│   └── new-feature.md
└── published/           # Published pages (pageId set)
    └── architecture.md
```

**Workflow Steps:**

1. **Create Draft:** Author markdown in `drafts/` with Confluence metadata
2. **Validate:** Run quality checks (formatting, links, structure)
3. **Publish:** Execute `confluence create-page` CLI command
4. **Move File:** Move from `drafts/` → `published/` after success
5. **Sync:** Update existing pages with `confluence create-page` (auto-detects UPDATE mode)

### 2. Manage Page Metadata

**Required YAML Frontmatter:**

```yaml
---
# Confluence Metadata
confluence-pageId: null               # Auto-populated on create
confluence-url: null                  # Auto-populated on create
confluence-space: "WA"                # Target Confluence space
confluence-parent: "393217"           # Parent page ID (optional)
confluence-page-revision: null              # Auto-managed for version control

# Content Metadata
title: "Page Title"                   # Required
documentType: confluence-page         # Optional
pageType: report                      # Optional: report, page, architecture, process
tags:                                 # Optional
  - documentation
  - apm-r
author: "AI Agent"                    # Optional
lastSyncDate: null                    # Auto-populated
---
```

**Metadata Lifecycle:**

| Field | Draft (CREATE) | After CREATE | After UPDATE |
|-------|----------------|--------------|--------------|
| `confluence-pageId` | `null` | `"123456"` | `"123456"` (unchanged) |
| `confluence-url` | `null` | `"https://..."` | `"https://..."` (unchanged) |
| `confluence-page-revision` | `null` | `1` | Incremented (e.g., `2`) |
| `lastSyncDate` | `null` | ISO timestamp | Updated timestamp |

**Auto-Detection Logic:**

```
IF confluence-pageId is null OR missing:
  → CREATE mode: Create new page
ELSE:
  → UPDATE mode: Update existing page with version check
```

### 3. Handle CREATE vs UPDATE

#### CREATE Mode

**Trigger:** `confluence-pageId: null` or missing

**CLI Behavior:**
1. Read markdown file and YAML metadata
2. Convert markdown → ADF (Atlassian Document Format)
3. Call Confluence REST API: `POST /pages`
4. Receive response: pageId, URL, version
5. Update YAML frontmatter with Confluence metadata
6. Save updated markdown file

**After CREATE:**
```yaml
confluence-pageId: "123456"  # ← Populated
confluence-url: "https://..."  # ← Populated
confluence-page-revision: 1  # ← Set to 1
lastSyncDate: "2025-12-24T10:30:00Z"  # ← Timestamp
```

**Best Practices:**
- ✅ Move file from `drafts/` to `published/` after CREATE
- ✅ Verify pageId and URL populated before continuing
- ✅ Confirm page visible in Confluence UI
- ❌ Don't manually edit pageId field
- ❌ Don't publish same draft twice

#### UPDATE Mode

**Trigger:** `confluence-pageId: "123456"` (exists)

**CLI Behavior:**
1. Fetch current page version from Confluence API
2. Compare local version vs. Confluence version
3. **If mismatch:** Abort with conflict error (prevent overwrites)
4. **If match:** Convert markdown → ADF and update page
5. Call Confluence REST API: `PUT /pages/{id}` with version
6. Increment version in YAML frontmatter
7. Update lastSyncDate timestamp

**Version Conflict Detection:**

```
Local YAML: confluence-page-revision: 3
Confluence API: version: 5

→ CONFLICT DETECTED
→ Abort update, warn user
```

**Best Practices:**
- ✅ Always fetch latest version before local edits
- ✅ Handle conflicts by merging changes manually
- ✅ Track version in YAML for optimistic locking
- ❌ Don't skip version checks
- ❌ Don't force push without reviewing conflicts

### 4. Organize Page Hierarchy

**Parent-Child Relationships:**

```
Space: WA
├── Architecture (pageId: 393217)
│   ├── System Design (pageId: 456789)
│   └── API Documentation (pageId: 567890)
└── Processes (pageId: 678901)
    └── Development Workflow (pageId: 789012)
```

**Setting Parent:**

```yaml
---
confluence-space: "WA"
confluence-parent: "393217"  # Parent page ID
title: "System Design"
---
```

**Finding Parent Page ID:**

**Option 1: Use Confluence UI**
- Navigate to parent page
- URL contains page ID: `/pages/393217/Architecture`
- Use this ID in `confluence-parent` field

**Option 2: Use CLI to List Pages**
```bash
agentic-framework confluence list-pages --space WA
```

**Hierarchy Best Practices:**
- ✅ Organize by topic (Architecture, Processes, APIs)
- ✅ Keep hierarchy shallow (2-3 levels max)
- ✅ Use consistent naming conventions
- ❌ Don't create deeply nested structures (>4 levels)
- ❌ Don't change parent frequently

### 5. Implement Quality Gates

**Pre-Publish Validation Checklist:**

1. **YAML Validation**
   - Required fields present: `title`, `confluence-space`
   - Valid space key
   - Parent page ID exists (if specified)

2. **Markdown Validation**
   - Native markdown syntax only (no HTML)
   - All links valid
   - Code blocks have language specified
   - Tables properly formatted

3. **Content Quality**
   - Title is descriptive and unique
   - Content well-structured
   - No placeholder text ("TODO", "FIXME")
   - Formatting consistent

4. **Confluence-Specific**
   - Space exists and user has write permissions
   - Parent page exists (if specified)
   - No duplicate page titles in same parent

**Automated Quality Gate:**

```bash
# Validate before publishing
agentic-framework confluence validate-page docs/my-page.md
```

---

## Common Patterns

### Pattern 1: Publish New Documentation

**When:** Creating new documentation page from scratch

**Steps:**
1. Create draft markdown in `drafts/` directory
2. Add Confluence YAML metadata (pageId: null)
3. Validate content and formatting
4. Publish: `confluence create-page drafts/new-doc.md --space WA`
5. Verify page created (check pageId populated)
6. Move file: `mv drafts/new-doc.md published/new-doc.md`
7. Commit changes with updated YAML

**See:** [EXAMPLES.md](./EXAMPLES.md) for complete examples

### Pattern 2: Update Existing Documentation

**When:** Modifying published documentation with local changes

**Steps:**
1. Locate published page in `published/` directory
2. Edit markdown content (preserve YAML metadata)
3. Validate changes
4. Update: `confluence create-page published/doc.md --space WA`
5. CLI auto-detects UPDATE mode and checks version
6. Commit changes

**See:** [EXAMPLES.md](./EXAMPLES.md) for update workflow examples

### Pattern 3: Fetch and Synchronize from Confluence

**When:** Pulling latest changes from Confluence to local

**Steps:**
1. Identify Confluence page ID to fetch
2. Fetch: `confluence fetch-page <pageId> --output published/doc.md`
3. CLI downloads ADF and converts to markdown
4. Review fetched content
5. Commit if needed

### Pattern 4: Resolve Version Conflict

**When:** Update fails due to version mismatch

**Steps:**
1. Detect conflict (CLI reports version mismatch)
2. Fetch latest version: `confluence fetch-page <pageId> --output temp.md`
3. Compare local vs. fetched content (use diff tool)
4. Merge changes manually
5. Update local file with merged content and latest version
6. Retry update

**See:** [EXAMPLES.md](./EXAMPLES.md) for conflict resolution examples

---

## Best Practices

### File Organization
- ✅ Use `drafts/` for unpublished pages (pageId: null)
- ✅ Use `published/` for published pages (pageId set)
- ✅ Move files after successful publication
- ✅ Maintain directory structure mirroring Confluence hierarchy
- ❌ Don't mix drafts and published in same directory
- ❌ Don't manually edit pageId, version, or URL fields

### Metadata Management
- ✅ Always include required YAML fields
- ✅ Let CLI auto-populate pageId, version, URL
- ✅ Track version for conflict detection
- ✅ Use consistent space keys
- ❌ Don't skip metadata validation
- ❌ Don't modify auto-populated fields manually

### Version Control
- ✅ Commit YAML updates after publish/update
- ✅ Include meaningful commit messages
- ✅ Track lastSyncDate for audit trail
- ✅ Fetch latest before making local changes
- ❌ Don't skip version conflict checks
- ❌ Don't force push without merging conflicts

### Quality Assurance
- ✅ Validate before publishing
- ✅ Test markdown → ADF conversion locally
- ✅ Review rendered output in Confluence UI
- ✅ Check links and images after publishing
- ❌ Don't skip validation
- ❌ Don't publish without reviewing rendered output

---

## Troubleshooting

### Issue: "Page Not Found" (404)

**Symptoms:** CLI reports "Page not found" when updating

**Solutions:**
1. Verify pageId in Confluence UI (check URL)
2. Confirm page exists in target space
3. Fetch page list: `confluence list-pages --space WA`
4. Update pageId if page was moved/recreated

### Issue: Version Conflict

**Symptoms:** Update fails with "Version mismatch" error

**Solutions:**
1. Fetch latest version: `confluence fetch-page <pageId>`
2. Compare local vs. fetched content
3. Merge changes manually
4. Update local version number
5. Retry update

### Issue: Authentication Failed (401)

**Symptoms:** CLI reports "Unauthorized"

**Solutions:**
1. Check `.env` file exists with:
   ```
   CONFLUENCE_URL=https://yoursite.atlassian.net/wiki
   CONFLUENCE_USERNAME=your-email@example.com
   CONFLUENCE_API_TOKEN=your-api-token
   ```
2. Regenerate API token: https://id.atlassian.com/manage-profile/security/api-tokens
3. Verify URL format (include `/wiki` for Cloud)

### Issue: Permission Denied (403)

**Symptoms:** CLI reports "Forbidden"

**Solutions:**
1. Verify user has "Can edit" permission in Confluence space
2. Check space permissions in Confluence admin
3. Confirm page is not locked for editing

### Issue: Invalid ADF Structure

**Symptoms:** Page created but content appears malformed or blank

**Solutions:**
1. Validate markdown syntax
2. Simplify complex structures
3. Remove HTML (use native markdown)
4. Reference [converting-adf](../converting-adf/SKILL.md)

---

## CLI Commands Reference

| Command | Purpose | Mode Detection |
|---------|---------|----------------|
| `confluence create-page <file> --space <key>` | Create or update page | Auto (based on pageId) |
| `confluence fetch-page <id> --output <file>` | Fetch page to markdown | N/A |
| `confluence validate-page <file>` | Validate before publish | N/A |
| `confluence list-pages --space <key>` | List pages in space | N/A |

**AUTO-DETECT Mode:**
- If `confluence-pageId: null` or missing → **CREATE** new page
- If `confluence-pageId: "123456"` → **UPDATE** existing page

**Common Options:**
- `--space <key>` - Confluence space key (required for CREATE)
- `--parent-id <id>` - Parent page ID (optional)
- `--dry-run` - Preview changes without publishing (optional)
- `--output <file>` - Output file path (for fetch)

---

## See Also

### Related Skills
- **syncing-with-jira** - Jira sync workflow (invoke via Skill tool)
- **validating-markdown** - Markdown standards (invoke via Skill tool)
- **verifying-quality** - Quality validation (invoke via Skill tool)

### Supporting Files
- [EXAMPLES.md](./EXAMPLES.md) - Complete workflow examples with commands and output
- [ADF-EXAMPLES.md](./ADF-EXAMPLES.md) - ADF conversion examples with tables, nested lists, complex formatting

### Module Documentation
- **Confluence Module:** `framework/modules/confluence/module.json`
- **CLI Source:** `framework/modules/confluence/src/cli/`
- **Agents:** `framework/modules/confluence/agents/`

### External Resources
- **Confluence REST API v2:** https://developer.atlassian.com/cloud/confluence/rest/v2/intro/
- **API Token Management:** https://id.atlassian.com/manage-profile/security/api-tokens

---

**Version:** 1.1
**Created:** 2025-12-24
**Updated:** 2026-01-07
**Status:** Production-Ready (Phase 4 - Confluence Skills)
**Module:** confluence
**Capabilities:** confluence-publish, confluence-fetch, documentation-management, format-conversion, markdown-to-adf
