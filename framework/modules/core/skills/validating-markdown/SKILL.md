---
id: validating-markdown
name: validating-markdown
description: Format markdown with YAML frontmatter and native syntax standards. Use before creating tickets, stories, documentation, or any markdown files. Ensures proper metadata structure and GitHub-flavored markdown compliance.
scope: generic
applicable-projects: any
module: core
capabilities-provided:
  - markdown-formatting
# Claude Code v2.1 features - read-only skill
tools:
  - Read
  - Glob
  - Grep
---

# Formatting Markdown Standards

## When to Use This Skill

You're creating or reviewing **markdown documentation** and need to:
- Add YAML frontmatter with proper metadata structure
- Format content using GitHub-flavored markdown syntax
- Validate link syntax and structure
- Ensure file structure compliance
- Prepare markdown for tickets, stories, or documentation
- Check metadata completeness and accuracy

**Example invocation:** "Use validating-markdown to prepare a story markdown file with proper structure and frontmatter"

---

## MCP Integration (Optional)

This skill uses **NO MCPs** - works with built-in tools only.
- No dependencies required
- No additional setup needed
- Full functionality with reference tools

---

## Quick Start: Markdown Formatting Checklist

### Before Creating Any Markdown File

**Step 1: Add YAML Frontmatter**
```yaml
---
documentType: [guide|epic|story|task|spike|bug|architecture|requirements|other]
description: One clear sentence describing content
tags: [relevant, keywords, for, search]
dependencies: []
soft_references: []
audience: [agent|human|mixed]
---
```

**Step 2: Write Content (Native Markdown Only)**
- Headers: `#`, `##`, `###`, `####`
- Emphasis: `**bold**`, `*italic*`, `~~strikethrough~~`
- Lists: `-` for unordered, `1.` for ordered
- Links: `[text](relative/path/file.md)` or `[text](https://example.com)`
- Code: Inline \`code\` or fenced blocks with language

**Step 3: Validate Structure**
- Frontmatter at top of file
- All required fields present
- No Jira markup syntax
- Links use proper markdown format

**Step 4: Check Links**
- Relative paths correct
- External URLs have protocols
- No broken file references

---

## Full Instructions

### Instruction 1: Create YAML Frontmatter

All markdown files MUST start with YAML frontmatter.

**Required Fields (Always Include):**
```yaml
documentType: [Choose one of: guide, epic, story, task, spike, bug, architecture, requirements, other]
description: [Single sentence, clear and concise]
tags: [Array of relevant keywords]
dependencies: [Files required for context]
soft_references: [Related but optional files]
audience: [agent|human|mixed]
```

**Optional Fields (Add Only If Relevant):**
- `author`, `date`, `status`
- `jira_key`, `jira_url`, `jira_project`
- `scope`, `milestone`, `team`, `component`
- `story_points`, `priority`, `labels`

**Field Guidelines:**
- **documentType:** Use predefined types; use "other" for custom
- **version:** Start at 1.0, increment on changes (1.1 for minor, 2.0 for major)
- **description:** Single sentence, clear purpose (max 150 chars)
- **tags:** 3-5 relevant keywords for search
- **dependencies:** List file paths needed for full context
- **soft_references:** Related files helpful but not required
- **audience:** Who will read this (agent, human, or both)

**Maximum:** Keep 10-12 fields maximum; only include relevant fields

**Example:**
```yaml
---
documentType: story
description: Implement user authentication for dashboard access
tags: [authentication, security, frontend, priority-high]
dependencies:
  - ai/context/technical-advanced.md
  - framework/architecture-decisions.md
soft_references:
  - backlog/sprints/2025-W49.md
audience: [agent, human]
---
```

---

### Instruction 2: Use Native Markdown Syntax Only

After YAML frontmatter, use **GitHub-flavored markdown exclusively**.

**Headers:**
```markdown
# Main Title (H1)
## Section (H2)
### Subsection (H3)
#### Minor Section (H4)
```

**Emphasis:**
```markdown
**bold text**           → Strong emphasis
*italic text*          → Light emphasis
~~strikethrough~~      → Deleted text
**_bold italic_**      → Combined
```

**Lists (Unordered):**
```markdown
- Item 1
  - Nested item
  - Another nested
- Item 2
```

**Lists (Ordered):**
```markdown
1. First step
2. Second step
   1. Sub-step
   2. Another sub
3. Third step
```

**Code (Inline):**
```markdown
Use the `command` function to execute code
```

**Code (Blocks):**
````markdown
```python
def hello():
    print("Hello, World!")
```

```bash
# Comment
docker run -it ubuntu bash
```
````

**Links (Internal Files):**
```markdown
[Reference text](path/to/file.md)           # Same directory
[Reference](../parent/file.md)              # Navigate up
[Heading link](file.md#section-name)        # With anchor
```

**Links (External URLs):**
```markdown
[Documentation](https://example.com)
[API](https://api.example.com/v1)
```

**Tables:**
```markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

**Horizontal Rule:**
```markdown
---
```

**Block Quotes:**
```markdown
> This is a quote
> Multi-line quote
```

---

### Instruction 3: Validate Link Syntax

Links must use proper markdown format with correct paths.

**Internal File Links - Rules:**
- Format: `[text](path/to/file.md)`
- Must include file extension
- Use relative paths (no absolute /path)
- Forward slashes only (no backslashes)
- No spaces in filenames

✅ **Correct:**
```markdown
[Agent reference](../agents/ai-architect.md)
[Context](../context/business-advanced.md)
[Same dir](technical-guide.md)
[Root](../../CLAUDE.md)
```

❌ **Incorrect:**
```markdown
[Agent](../agents/ai-architect)          # Missing .md
[Context](../context/business-advanced.md)  # Would work
`../agents/file.md`                       # Backticks (not a link)
[Path](/absolute/path.md)                # Absolute path
```

**Anchor Links - Rules:**
- Format: `[text](#section-name)` or `[text](file.md#section)`
- Lowercase with hyphens
- Match actual heading text
- No spaces in anchor

✅ **Correct:**
```markdown
Heading: ## Getting Started
Link: [Jump to start](#getting-started)

Heading: ### Phase 1A: Meta-Skills
Link: [Learn more](file.md#phase-1a-meta-skills)
```

❌ **Incorrect:**
```markdown
[Link](#Getting Started)        # Spaces in anchor
[Link](#undefined-section)      # Section doesn't exist
[Link](#GetStarted)             # Wrong case
```

**External URLs - Rules:**
- Must have protocol: `http://` or `https://`
- HTTPS preferred over HTTP
- No spaces in URL
- Valid domain and path

✅ **Correct:**
```markdown
[Docs](https://example.com)
[API](https://api.example.com/v1/docs)
[Legacy](http://example.com)
[With anchor](https://example.com/docs#section)
```

❌ **Incorrect:**
```markdown
[Docs](example.com)              # Missing protocol
[API](htps://example.com)        # Protocol typo
[Docs](https://example.com/bad path)  # Spaces
```

---

### Instruction 4: Check Document Structure

Verify overall file structure before finalizing.

**Required Checks:**
- [ ] YAML frontmatter present at top (lines 1-n before first ----)
- [ ] All required metadata fields included
- [ ] Only 10-12 metadata fields (no excess)
- [ ] Single sentence description
- [ ] Content starts after frontmatter
- [ ] No Jira markup (h3., {color}, etc.)
- [ ] Native markdown syntax only
- [ ] Links use proper format
- [ ] Code blocks specify language

**Example Valid Structure:**
```markdown
---
documentType: story
description: Add authentication to dashboard
tags: [auth, security]
dependencies: []
soft_references: []
audience: [agent, human]
---

# Document Title

## Section One
Content here with [link](path/to/file.md)

### Subsection
More content

## Section Two
Final content

## See Also
- [Related file](../related/file.md)
- [Other doc](../docs/other.md)
```

---

### Instruction 5: Apply to Common Document Types

**Story/Epic Format:**
```yaml
---
documentType: story
description: [User story objective]
tags: [feature, priority]
dependencies: []
soft_references: []
audience: [agent, human]
jira_key: APMR-123
---
```

**Technical Guide Format:**
```yaml
---
documentType: guide
description: [Topic overview]
tags: [technical, how-to]
dependencies: [required files]
soft_references: [optional references]
audience: [agent]
---
```

**Architecture Decision Format:**
```yaml
---
documentType: architecture
description: [Decision statement]
tags: [architecture, design-decision]
dependencies: [related architecture docs]
soft_references: []
audience: [human]
---
```

---

## Common Patterns

### Pattern 1: Frontmatter for Tickets

Every ticket/story needs basic metadata:

```yaml
---
documentType: story
description: Brief objective statement
tags: [category, priority-level]
dependencies: []
soft_references: []
jira_key: PROJECT-123
---
```

Keep description to one sentence. Use tags for categorization and priority.

### Pattern 2: Internal File Links

Use relative paths from current file location:

```
Current: ai/context/file.md
Target:  ai/agents/agent.md

From ai/context/ to ai/agents/:
  Up one level: ../
  Into agents: agents/
  Final: ../agents/agent.md

Result: [Link](../agents/agent.md) ✅
```

### Pattern 3: Consistent Code Blocks

Always specify language for syntax highlighting:

```markdown
❌ [code block without language]
```python
x = 10
```    ✅ [code block with language]
```

### Pattern 4: Link Text Best Practices

Use descriptive link text:

```markdown
✅ [Agent Architecture Guide](../agents/ai-architect.md)
❌ [Click Here](../agents/ai-architect.md)
❌ [Link](../agents/ai-architect.md)
```

---

## Common Mistakes

### ❌ Mistake 1: Mixing Markup Systems
```markdown
WRONG: h3. This is a Jira header
WRONG: {color:red}Colored text{color}
CORRECT: ### This is a Markdown header
CORRECT: **Bold text** in markdown
```

### ❌ Mistake 2: Using Backticks for File References
```markdown
WRONG: See `../agents/file.md` for details
CORRECT: See [agent guide](../agents/file.md) for details
```

### ❌ Mistake 3: Missing File Extensions
```markdown
WRONG: [Link](../path/file)
CORRECT: [Link](../path/file.md)
```

### ❌ Mistake 4: Absolute Paths in Links
```markdown
WRONG: [Link](/absolute/path/file.md)
CORRECT: [Link](../../relative/path/file.md)
```

### ❌ Mistake 5: Incomplete Frontmatter
```markdown
WRONG: Missing dependencies field
WRONG: documentType value not predefined
WRONG: version not semantic (use 1.0, not 1)
CORRECT: All required fields present
```

---

## See Also

### Supporting Files
- [Link standards and rules](YAML-SCHEMA.md) - Complete frontmatter schema with examples
- [Validation rules](VALIDATION-RULES.md) - Link validation, format compliance, error detection
- [Real-world examples](EXAMPLES.md) - Common scenarios, before/after, edge cases

### Related Skills
- building-skills - Create new skills with proper structure
- generic-validating-links-guard - Validate links after formatting

---

## Testing & Quality Status

✅ **Tested with:**
- Claude 3.5 Sonnet (full functionality)
- Claude Opus (full functionality)
- Claude Haiku (basic formatting)

✅ **Quality Gates Passed:**
- [x] Structure compliance (YAML, naming, scope)
- [x] Content quality (clear instructions, examples)
- [x] Progressive disclosure (SKILL.md < 500 lines)
- [x] Testing across 3 models documented
- [x] Documentation ready

---

**Skill Version:** 1.0
**Status:** Phase 1B Infrastructure Skill
**Phase:** Phase 1B (Week 1, Day 1-2)
**Created:** 2025-12-07
**Built using:** building-claude-skills as template
