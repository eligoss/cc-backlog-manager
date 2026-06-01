# Link Validation Standards & Rules

## Link Types & Validation Rules

### 1. Internal File Links

**Format:** `[text](path/to/file.md)`

**Validation Rules:**
- File must exist at specified relative path
- Path relative to current file location
- Must include file extension (.md, .py, .json, etc.)
- No spaces in filenames or paths
- No backslashes (use forward slashes)

**Valid Examples:**
```markdown
[Reference](path/to/file.md)         ✅ Relative path
[Up one level](../api/schema.json)   ✅ Using ../
[Same directory](./helper.md)        ✅ Using ./
[Deep path](../../root/docs/api.md)  ✅ Multiple levels
```

**Invalid Examples:**
```markdown
[Missing ext](path/to/file)                ❌ No file extension
[Wrong path](nonexistent/file.md)          ❌ File doesn't exist
[Windows path](path\to\file.md)            ❌ Backslashes not portable
[Absolute path](/root/file.md)             ❌ Absolute paths unreliable
[Spaces](path/with spaces/file.md)         ❌ Spaces in path
```

**Error Categories:**
- `file-not-found` - Target file doesn't exist
- `missing-extension` - Path missing file extension
- `invalid-path-format` - Contains backslashes or spaces
- `absolute-path-error` - Uses / prefix (absolute instead of relative)

---

### 2. Anchor/Heading Links

**Format:** `[text](file.md#anchor-id)` or `[text](#anchor-id)` (same file)

**Validation Rules:**
- Anchor must match actual heading in target file
- H1/H2/H3 headings become anchors automatically
- Anchor format: Spaces → hyphens, LOWERCASE
- Must match EXACTLY (case-sensitive on many platforms)
- GitHub Markdown: `# Main Heading` → `#main-heading`

**Valid Examples:**
```markdown
[Section](file.md#getting-started)      ✅ Matches "## Getting Started"
[API Reference](#api-reference)         ✅ Same file, heading exists
[Config](#installation-steps)           ✅ Matches "### Installation Steps"
```

**Invalid Examples:**
```markdown
[Reference](file.md#undefined)          ❌ Anchor doesn't exist
[Heading](#Main Heading)                ❌ Spaces in anchor
[Case mismatch](#Getting-Started)       ❌ Wrong case
[Typo](file.md#refrence)                ❌ Misspelled anchor
```

**Anchor Format Rules:**
```
"# Main Heading"           → #main-heading
"## API Reference"         → #api-reference
"### Phase 1A: Meta-Skills"→ #phase-1a-meta-skills
"#### Installation"        → #installation
```

**Error Categories:**
- `anchor-not-found` - Specified anchor doesn't exist
- `anchor-format-error` - Wrong character format (spaces, caps)
- `heading-not-found` - Target file exists but heading missing

---

### 3. External URLs

**Format:** `[text](https://example.com/path)`

**Validation Rules:**
- Must have protocol: `http://` or `https://`
- Must have valid domain name
- Path must be valid URL characters (no spaces)
- HTTPS preferred over HTTP
- Should be reachable (may require auth/JS)

**Valid Examples:**
```markdown
[Docs](https://example.com)                      ✅ HTTPS
[API Docs](https://api.example.com/v1/docs)    ✅ With path
[External](http://example.com)                   ✅ HTTP (legacy)
[With anchor](https://example.com/docs#section)✅ URL + anchor
```

**Invalid Examples:**
```markdown
[Missing protocol](example.com)                   ❌ No http(s)://
[Typo](htps://example.com)                      ❌ Protocol typo
[Spaces](https://example.com/invalid space)     ❌ Spaces in URL
[Wrong syntax]https://example.com              ❌ Missing parentheses
```

**Error Categories:**
- `missing-protocol` - No http:// or https://
- `invalid-protocol` - Typo in protocol (htps, htp)
- `invalid-characters` - Spaces or other invalid chars
- `invalid-syntax` - Wrong markdown format

---

## File Path Rules

### Relative Path Resolution

**Rule 1: Count Up & Down**
```
Current file: ai/context/business-advanced.md
Target file:  api/schema.json

Path from current to target:
  ai/context/ → .. (to ai/)
  ai/ → .. (to root)
  root → api/schema.json

Result: ../../api/schema.json ✅
```

**Rule 2: Same Directory**
```
Current: ai/context/file1.md
Target:  ai/context/file2.md

Same directory: can use ./file2.md or just file2.md
Both valid:
  [link](./file2.md)     ✅
  [link](file2.md)       ✅
```

**Rule 3: Complex Paths**
```
Current file: docs/api/getting-started.md
Target file:  ai/agents/ai-architect.md

Normalize the path:
  1. From docs/api/, go to root: ../../
  2. From root, go to ai/agents: ai/agents/
  3. Final path: ../../ai/agents/ai-architect.md ✅

Verify by testing:
  docs/api/ → .. → docs/ → .. → root
  root → ai/ → agents/ → ai-architect.md ✅
```

---

## Error Detection & Reporting

### Error Severity Levels

**CRITICAL (Blocks publishing):**
- ❌ File not found (target doesn't exist)
- ❌ Invalid URL format (missing protocol)
- ❌ Broken anchor (heading doesn't exist)

**WARNING (Should fix before merge):**
- ⚠️ HTTP instead of HTTPS
- ⚠️ Relative path could be clearer
- ⚠️ Case sensitivity issues

**INFO (Nice to fix):**
- ℹ️ Long paths could be simplified
- ℹ️ Mixed path formats in same document

---

### Error Report Format

```
FILE: path/to/file.md

Line N: [text](url)
  Error: error-type
  Details: Specific problem description
  Expected: What should be there
  Fix: Suggested correction
  Severity: CRITICAL | WARNING | INFO
```

**Example Report:**
```
FILE: ai/context/technical-basic.md

Line 45: [reference](../shared/missing.md)
  Error: file-not-found
  Details: File does not exist at ai/shared/missing.md
  Expected: File should exist or path should be corrected
  Fix: Change to [reference](../context/technical-advanced.md)
  Severity: CRITICAL

Line 78: [docs](http://example.com)
  Error: insecure-protocol
  Details: Using HTTP instead of HTTPS
  Expected: HTTPS for security
  Fix: Change to https://example.com
  Severity: WARNING
```

---

## Validation Checklist

Use this checklist to validate links in any markdown document:

### File Links
- [ ] File extension included (.md, .py, .json, etc.)
- [ ] Target file exists at specified path
- [ ] Path is relative (not absolute /path)
- [ ] No backslashes (use / on all platforms)
- [ ] No spaces in filenames
- [ ] Path navigates correctly (../../../)

### Anchor Links
- [ ] Anchor format: lowercase-with-hyphens
- [ ] Matches actual heading in target file
- [ ] Heading text normalized correctly
- [ ] Case matches (most systems case-sensitive)
- [ ] No spaces in anchor name

### External URLs
- [ ] Protocol present: http:// or https://
- [ ] No typos in protocol
- [ ] No spaces in URL
- [ ] Domain is valid
- [ ] Path characters are valid
- [ ] HTTPS preferred over HTTP

### General
- [ ] Markdown syntax correct: `[text](url)`
- [ ] No circular references
- [ ] Link text is descriptive
- [ ] No duplicate links
- [ ] Links tested in target platform

---

## Common Platform Differences

### GitHub Markdown
- Spaces in headings → hyphens: `"Main Heading"` → `#main-heading`
- Lowercase only
- Numbers allowed
- Special chars removed or converted

**Example:**
```markdown
Heading: ### Phase 1A: Meta-Skills
Anchor:  #phase-1a-meta-skills
Link:    [ref](file.md#phase-1a-meta-skills) ✅
```

### GitLab Markdown
- Similar to GitHub
- May handle special characters differently
- Verify in target platform

### Confluence/JIRA
- Different anchor format
- May use different URL structure
- Test before publishing

---

## Best Practices

### ✅ DO:
- Use relative paths for internal links
- Keep directory structure consistent
- Use HTTPS for external URLs
- Normalize paths for clarity
- Test links before merging
- Use descriptive link text
- Keep anchors simple and clear

### ❌ DON'T:
- Use absolute paths (starting with /)
- Mix relative and absolute in same file
- Use Windows backslashes
- Use spaces in filenames or anchors
- Create complex nested paths (use ../)
- Link to non-existent files
- Use vague link text like "click here"
- Ignore case sensitivity

---

## Tools & Automation

### Manual Validation
```bash
# Check if file exists
ls -la path/to/file.md

# View headings in file
grep "^#" file.md

# Test relative path
cd ai/context/
cd ../../api/   # Should work if path is correct
```

### Scripting (Python example)
```python
import os
from pathlib import Path

def validate_link(current_file, target_path):
    """Validate link from current file to target"""
    current_dir = Path(current_file).parent
    target = (current_dir / target_path).resolve()
    return target.exists()

# Usage
result = validate_link("ai/context/file.md", "../../api/schema.json")
print(f"Link valid: {result}")
```

---

## Quick Reference: Error Fix Patterns

| Error | Pattern | Fix |
|-------|---------|-----|
| File not found | `(nonexistent/file.md)` | Check actual path, correct |
| Missing ext | `(file)` | Add extension: `(file.md)` |
| Windows path | `(path\to\file)` | Use `/`: `(path/to/file)` |
| No protocol | `(example.com)` | Add: `(https://example.com)` |
| Bad anchor | `(file.md#wrong)` | Fix to actual heading: `(file.md#correct)` |
| HTTP not HTTPS | `(http://)` | Change to `(https://)` |
| Absolute path | `(/root/file)` | Use relative: `(../file)` |
| Spaces in path | `(path/with spaces/file)` | Use hyphens: `(path-with-dashes/file)` |

---

**Last Updated:** 2025-12-06
**Standard Version:** 1.0
**Used by:** validating-links skill

