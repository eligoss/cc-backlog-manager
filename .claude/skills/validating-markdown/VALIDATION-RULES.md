# Validation Rules & Format Compliance

## Frontmatter Validation

### Required Fields Validation

#### documentType Validation
- **Rule:** Must be one of predefined values
- **Valid values:** guide, epic, story, task, spike, bug, architecture, requirements, other
- **Error:** Invalid type specified

✅ **Valid:**
```yaml
documentType: story
documentType: guide
documentType: architecture
documentType: other
```

❌ **Invalid:**
```yaml
documentType: Story          # Wrong case
documentType: unknown-type   # Not in list
documentType: user-story     # Not exact match
```

#### version Validation
- **Rule:** Must follow semantic versioning (X.Y)
- **Pattern:** `\d+\.\d+` (e.g., 1.0, 2.1)
- **Start value:** 1.0 for new documents
- **Increment rules:**
  - Minor change: 1.0 → 1.1
  - Major change: 1.1 → 2.0

✅ **Valid:**
```yaml
```

❌ **Invalid:**
```yaml
```

#### description Validation
- **Rule:** Single sentence, clear purpose
- **Max length:** 150 characters
- **Pattern:** No line breaks
- **Content:** Should start with action verb or subject

✅ **Valid:**
```yaml
description: Implement user authentication for dashboard
description: Guidelines for markdown formatting in files
description: Architecture decision for microservices
```

❌ **Invalid:**
```yaml
description: Implement user authentication for dashboard and also add role-based access control with advanced permission management features. # Too long (>150 chars)
description: Add authentication.
It should also support multi-factor.  # Multiple sentences
```

#### tags Validation
- **Rule:** Array of strings
- **Count:** Minimum 1, recommended 3-5
- **Format:** lowercase, hyphen-separated
- **No duplicates:** Each tag unique

✅ **Valid:**
```yaml
tags: [authentication, security, frontend]
tags: [framework, governance]
tags: [single-tag]
```

❌ **Invalid:**
```yaml
tags: Authentication           # Not an array
tags: [Authentication, SECURITY]  # Not lowercase
tags: [auth, auth, auth]      # Duplicates
```

#### dependencies & soft_references Validation
- **Rule:** Array of file paths
- **Format:** Relative paths with .md extension
- **Content:** Must reference real files (for dependencies)
- **Can be empty:** Use `[]`

✅ **Valid:**
```yaml
dependencies:
  - ai/context/technical-advanced.md
  - framework/architecture.md
dependencies: []
soft_references:
  - backlog/sprints/2025-W49.md
soft_references: []
```

❌ **Invalid:**
```yaml
dependencies: ai/context/file.md           # Not an array
dependencies: [file.md]                    # Missing path
dependencies: [/absolute/path/file.md]     # Absolute path
```

#### audience Validation
- **Rule:** Array of values from [agent, human, mixed]
- **Valid combinations:**
  - `[agent]` - AI agents only
  - `[human]` - Humans only
  - `[agent, human]` or `[human, agent]` - Both
  - `[mixed]` - Generic "both" indicator (alternative)

✅ **Valid:**
```yaml
audience: [agent]
audience: [human]
audience: [agent, human]
audience: [mixed]
```

❌ **Invalid:**
```yaml
audience: agent              # Not an array
audience: [unknown]          # Invalid value
audience: [agent, user]      # 'user' not valid
```

---

## Link Validation Rules

### Internal File Links

**Format:** `[text](path/to/file.md)`

**Validation Rules:**
1. File must exist at specified path
2. Path must be relative (no leading `/`)
3. Must include file extension
4. No spaces in path
5. No backslashes (use forward slashes)

✅ **Valid:**
```markdown
[Reference](../agents/ai-architect.md)     ✅
[Same dir](technical-guide.md)             ✅
[Deep path](../../root/docs/api.md)        ✅
```

❌ **Invalid:**
```markdown
[Reference](../agents/ai-architect)        ❌ No extension
[Reference](/absolute/path/ai-architect.md) ❌ Absolute path
[Reference](path\to\file.md)               ❌ Backslashes
[Reference](path/with spaces/file.md)      ❌ Spaces
```

### Anchor Links

**Format:** `[text](#section-name)` or `[text](file.md#section)`

**Validation Rules:**
1. Anchor must match actual heading
2. Format: lowercase-with-hyphens
3. Spaces converted to hyphens
4. Match heading exactly (case-sensitive)
5. No trailing/leading hyphens

✅ **Valid:**
```markdown
Heading: ## Getting Started
Link: [Jump here](#getting-started)  ✅

Heading: ### Phase 1A: Meta-Skills
Link: [Learn more](#phase-1a-meta-skills)  ✅
```

❌ **Invalid:**
```markdown
[Link](#GetStarted)              ❌ Wrong case
[Link](#undefined-section)       ❌ Section doesn't exist
[Link](#getting started)         ❌ Spaces (needs hyphens)
[Link](#-wrong-format-)          ❌ Leading/trailing hyphens
```

### External URL Links

**Format:** `[text](https://example.com/path)`

**Validation Rules:**
1. Must have protocol: `http://` or `https://`
2. HTTPS preferred over HTTP
3. No spaces in URL
4. Valid domain format
5. Valid path characters

✅ **Valid:**
```markdown
[Docs](https://example.com)                  ✅
[API](https://api.example.com/v1/docs)     ✅
[External](http://legacy.example.com)      ✅ (but warn about HTTP)
[With anchor](https://example.com#section) ✅
```

❌ **Invalid:**
```markdown
[Docs](example.com)                         ❌ No protocol
[API](htps://example.com)                   ❌ Protocol typo
[Docs](https://example.com/bad space)       ❌ Spaces
[Docs]https://example.com                   ❌ Missing parens
```

---

## Format Compliance

### Markdown Syntax Validation

**Valid Syntax:**
- Headers: `#`, `##`, `###`, `####`
- Emphasis: `**bold**`, `*italic*`, `~~strikethrough~~`
- Lists: `-` for unordered, `1.` for ordered
- Code: Inline \`code\` or \`\`\`language blocks
- Links: `[text](url)` format
- Tables: Markdown table syntax

**Invalid Syntax to Catch:**
- Jira markup: `h3.`, `{color}`, `{panel}`, etc.
- HTML tags instead of markdown
- Mixed markup systems

✅ **Valid:**
```markdown
## Section Header        ✅ Native markdown
**bold text**           ✅ Native markdown
- List item             ✅ Native markdown
[link](path/file.md)    ✅ Native markdown
```

❌ **Invalid:**
```markdown
h3. Jira Header         ❌ Jira markup
{color:red}Red{color}   ❌ Jira color
<strong>Bold</strong>   ❌ HTML instead of markdown
```

### Code Block Language Specification

**Rule:** All code blocks must specify language

✅ **Valid:**
```markdown
\`\`\`python
def hello():
    print("Hello")
\`\`\`

\`\`\`bash
echo "Hello"
\`\`\`

\`\`\`yaml
name: value
\`\`\`
```

❌ **Invalid:**
```markdown
\`\`\`
Code without language
\`\`\`
```

---

## Complete Validation Checklist

### Frontmatter Checklist
- [ ] YAML frontmatter present at top (between `---` markers)
- [ ] `documentType` is valid and predefined
- [ ] `version` follows semantic versioning (X.Y)
- [ ] `description` is single sentence, < 150 chars
- [ ] `tags` is array with 3-5 items
- [ ] `dependencies` is array (can be empty)
- [ ] `soft_references` is array (can be empty)
- [ ] `audience` is array with valid values
- [ ] No excess fields (max 12 total)
- [ ] All field names use snake_case

### Content Checklist
- [ ] No Jira markup syntax used
- [ ] All headers use markdown syntax
- [ ] Emphasis uses `**bold**` and `*italic*`
- [ ] Code blocks specify language
- [ ] Lists use `-` or `1.` format
- [ ] Internal links use relative paths
- [ ] External links have protocols
- [ ] Anchors match heading text exactly
- [ ] No backslashes in paths
- [ ] No spaces in filenames/paths

### Link Checklist
- [ ] All internal file links exist
- [ ] All relative paths navigate correctly
- [ ] All anchors match actual headings
- [ ] All external URLs have proper format
- [ ] No broken links
- [ ] No circular references
- [ ] Link text is descriptive

---

## Error Categories

### CRITICAL (Blocks publishing)
- ❌ Missing required metadata field
- ❌ Invalid documentType value
- ❌ Invalid version format
- ❌ Missing YAML frontmatter
- ❌ Broken internal file link
- ❌ Broken anchor link
- ❌ Invalid external URL format

### WARNING (Should fix before use)
- ⚠️ Using HTTP instead of HTTPS
- ⚠️ Field count > 12
- ⚠️ Tags not lowercase
- ⚠️ Jira markup in content
- ⚠️ Missing language in code block

### INFO (Nice to fix)
- ℹ️ Description could be clearer
- ℹ️ Link text could be more descriptive
- ℹ️ Path could be simplified

---

## Quick Fix Reference

| Issue | Pattern | Fix |
|-------|---------|-----|
| Invalid docType | `documentType: Story` | Use exact case: `story` |
| Bad version | `version: 1` | Use X.Y format: `1.0` |
| Not array | `tags: something` | Make array: `tags: [something]` |
| Long description | > 150 chars | Shorten to single sentence |
| File not found | `(nonexistent/file.md)` | Check actual path |
| No extension | `(file)` | Add: `(file.md)` |
| Absolute path | `(/path/file.md)` | Use relative: `(../path/file.md)` |
| Spaces in path | `(path/with spaces/file)` | Use hyphens: `(path-with-hyphens/file)` |
| Bad anchor | `(#Wrong-Format)` | Use lowercase-hyphens: `(#wrong-format)` |
| Missing protocol | `(example.com)` | Add: `(https://example.com)` |
| Jira markup | `h3. Header` | Use markdown: `### Header` |

---

**Last Updated:** 2025-12-07
**Standard Version:** 1.0
**Used by:** formatting-markdown-standards skill
