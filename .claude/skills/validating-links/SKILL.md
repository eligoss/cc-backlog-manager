---
id: validating-links
module: core
name: validating-links
description: Validate markdown links by checking file existence, paths, and URL syntax. Use when reviewing documentation for broken links, typos, or incorrect formats.
scope: generic
applicable-projects: any
capabilities-provided:
  - link-validation
# Claude Code v2.1 features - read-only skill
tools:
  - Read
  - Glob
  - Grep
---

# Validating Links

## When to Use This Skill

You're reviewing **markdown documentation** and need to:
- Check for broken internal links (files that don't exist)
- Validate external URLs and formats
- Fix relative path errors (../../../file.md)
- Ensure consistent link syntax `[text](url)`
- Generate error reports with fix suggestions

**Example invocation:** "Use validating-links to check all markdown files in the framework for broken links"

---

## MCP Integration (Optional)

This skill uses **optional File System MCP** for batch operations:

**Available with File System MCP:**
- Recursive file scanning in single operation
- Batch validation across thousands of files
- Advanced link extraction patterns
- Performance optimization for large codebases

**Without File System MCP (Fallback):**
- Uses standard file operations (Bash, Read tools)
- Single file validation at a time
- Full functionality maintained
- No additional setup needed

---

## Quick Start: Validate Links

### Step 1: Identify Target Files
- Single file: `docs/README.md`
- Directory: `ai/context/` (all .md files)
- Pattern: `**/*.md` (recursive)

### Step 2: Run Validation
Validates three link types:
1. **Internal files:** `[text](path/to/file.md)` - Check file exists
2. **Anchors:** `[text](file.md#section)` - Validate heading exists
3. **External URLs:** `[text](https://example.com)` - Check URL format

### Step 3: Review Error Report
Shows:
- Line number and file location
- Exact broken link
- Error type (missing-file, invalid-syntax, broken-anchor)
- Suggested fix

### Step 4: Apply Fixes & Re-validate
- Correct paths, URLs, or anchor formats
- Re-run validation to confirm

---

## Full Instructions

### Instruction 1: Collect Files to Validate
Choose your validation scope:

**Option A - Single file:**
```bash
file: docs/README.md
```

**Option B - Directory (all markdown):**
```bash
directory: ai/context/
find: *.md
```

**Option C - Pattern (recursive):**
```bash
pattern: **/*.md
from: project-root
```

### Instruction 2: Identify Link Types in Files

Three markdown link types require different validation:

**Type 1: Internal File Links**
```markdown
[link text](path/to/file.md)
[click here](../api/schema.md)
```
Validation: Check if file exists at path relative to current file

**Type 2: Anchor Links (Sections)**
```markdown
[heading link](#section-name)
[ref](file.md#anchor-id)
```
Validation: Check if target heading exists in referenced file

**Type 3: External URLs**
```markdown
[external](https://example.com)
[doc](https://example.com/path)
```
Validation: Check URL format is valid (protocol + domain)

### Instruction 3: Validate Each Link

For each markdown link found:

```
1. Extract link format: [text](url)
2. Determine link type (file/anchor/URL)
3. For file links: Check target file exists
4. For anchor links: Verify heading in target file
5. For URLs: Validate protocol and format
6. Document result: ✅ valid or ❌ broken
7. If broken: Note error type and location
```

### Instruction 4: Generate Error Report

```
FILE: ai/context/business-advanced.md
  Line 45: [Reference](../../MISSING-FILE.md)
    Error: File not found
    Location: Expected at ai/MISSING-FILE.md
    Fix: Correct path to existing file

  Line 78: [Heading](#undefined-section)
    Error: Heading "#undefined-section" not found
    Available: [#overview] [#context] [#use-cases]
    Fix: Update anchor to valid heading

  Line 92: [invalid link](http:/missing-slash)
    Error: Invalid URL format
    Fix: Use proper URL: http://example.com
```

### Instruction 5: Apply Fixes

1. Update all broken file paths
2. Add missing anchors to target files (if needed)
3. Fix URL formatting errors
4. Re-validate after each fix
5. Report final validation results

---

## Common Patterns

### Pattern 1: Relative Path Resolution

**Problem:** Wrong relative path from current file
```markdown
❌ Current file: ai/context/file.md
❌ Link: [text](api/schema.md)     → Looks for ai/api/schema.md
✅ Link: [text](../api/schema.md)  → Looks for api/schema.md
```

**Solution:**
- From `ai/context/` → parent is `ai/`
- To reach `api/schema.md` → use `../api/schema.md`
- Count `../` up to common parent, then navigate down

### Pattern 2: Cross-Directory Navigation

**Problem:** Deep nesting causes confusion
```markdown
❌ [link](/ai/context/file.md)  → Absolute path (wrong for markdown)
✅ [link](../../ai/context/file.md)  → Correct relative from docs/
```

**Rule:** Start at current file, count `../` levels up, then navigate down

### Pattern 3: URL Format Validation

**Problem:** Syntax errors in external links
```markdown
❌ [link]http://example.com    → Missing parentheses
✅ [link](http://example.com)  → Correct markdown syntax

✅ https://example.com         → HTTPS preferred
⚠️  http://example.com         → HTTP (legacy, still valid)
```

### Pattern 4: Anchor/Heading Matching

**Problem:** Anchor names don't match actual headings
```markdown
File: documentation.md
# Main Heading
## Sub Heading

❌ [link](#submain)      → Wrong anchor format
✅ [link](#sub-heading)  → GitHub markdown: spaces→hyphens
```

**Note:** Different platforms have different anchor conventions

---

## Common Mistakes

### ❌ Mistake 1: Assuming Absolute Paths
```markdown
❌ [link](/ai/context/file.md)
- Assumes filesystem root
- Breaks when moved
- Fails in offline viewers
```
**Fix:** Use relative paths `[link](../../ai/context/file.md)`

### ❌ Mistake 2: Windows-Style Backslashes
```markdown
❌ [link](path\to\file.md)  → Breaks on Unix
✅ [link](path/to/file.md)  → Works everywhere
```

### ❌ Mistake 3: Case Sensitivity Issues
```markdown
# On Unix systems (Linux, Mac):
❌ [link](MyFile.md) if actual file is myfile.md
✅ Case must match exactly
```

### ❌ Mistake 4: Redundant Path Navigation
```markdown
❌ [link](./ai/../context/../context/file.md)
✅ [link](./ai/context/file.md)
```
Normalize paths for clarity

---

## Supported Link Types

### Internal Files
- `[text](path/to/file.md)` - Relative to current file
- `[text](../parent/file.md)` - Navigate up with `../`
- `[text](./same/file.md)` - Same directory prefix (optional)

### Anchors (Section Links)
- `[text](#heading)` - Same file heading (lowercase, hyphens)
- `[text](file.md#heading)` - Another file with heading
- Format: H1/H2/H3 headers become `#lowercase-with-hyphens`

### External URLs
- `[text](https://example.com)` - HTTPS preferred
- `[text](http://example.com)` - HTTP (legacy)
- `[text](https://example.com/path)` - With path
- `[text](https://example.com/path#anchor)` - With anchor

### Email & Other
- `[email](mailto:user@example.com)` - Email links
- `[ftp](ftp://example.com/file)` - Other protocols

---

## See Also

### Supporting Files
- [Real validation examples](EXAMPLES.md) - Step-by-step walkthroughs with before/after
- [Link validation standards](STANDARDS.md) - Detailed rules, error categories, fix patterns

### Related Skills
- building-skills - Create new validation skills

---

## Testing & Quality Status

✅ **Tested with:**
- Claude 3.5 Sonnet (full functionality)
- Claude Opus (full functionality)
- Claude Haiku (basic single-file validation)

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
**Created:** 2025-12-06
**Built using:** building-claude-skills as template
