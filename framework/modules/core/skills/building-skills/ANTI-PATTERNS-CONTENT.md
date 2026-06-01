# Building Claude Skills: Content Anti-Patterns

## Anti-Pattern 2: Vague or Missing Description Field

### ❌ The Problem

```yaml
---
name: formatting-markdown
description: A skill for formatting markdown files.
---
```

**Issues:**
- When should user invoke this?
- What counts as "formatting"?
- Does it validate? Convert? Beautify?
- Is it for documentation? Code? Tickets?

### Real Examples of Bad Descriptions
```yaml
description: This skill helps with stuff.
```
→ What stuff? Too vague.

```yaml
description: Advanced markdown formatting with support for tables,
  code blocks, headers, lists, and more including special characters...
```
→ Too detailed, exceeds 1024 char limit.

```yaml
description: Formats markdown.
```
→ Too brief, no context about when to use.

### ✅ Correct Approach

```yaml
---
name: formatting-markdown
description: Standardizes markdown file formatting across the
  framework. Use when reviewing or preparing markdown files to ensure
  consistent header levels, list styles, code block syntax, and link
  formatting. Returns detailed formatting report with automatic fixes.
---
```

**Elements:**
1. **What it does** (Standardizes markdown formatting)
2. **When to use** (When reviewing or preparing markdown files)
3. **Key standards** (Headers, lists, code blocks, links)
4. **Output** (Formatting report with fixes)

### Formula: Description Structure
```
{What} {aspect}. Use when {trigger condition}. {Key features}. {Output}.
```

Example:
```
{Validates} {markdown links}. Use when {reviewing documentation}.
{Checks file existence, syntax, patterns}. {Returns error report with fixes}.
```

---

## Anti-Pattern 5: Generic Skills with Project-Specific Details

### ❌ The Problem

```markdown
# formatting-markdown

Formats markdown files for APM-R framework.

## APM-R Specific Rules

- Ticket files go in backlog/_workflow/
- Use YAML frontmatter per APM-R SKILL.md format
- Context files in ai/context/ follow strict naming
- Framework governance rules in ai/framework/
```

**Issues:**
- Not reusable in other projects
- References APM-R-specific directories
- Can't be shared globally
- Mislabeled as "generic"

### ✅ Correct Approach: Separate Skills

**Generic Skill:**
```markdown
# formatting-markdown

Standardizes markdown file formatting across any project.

## General Markdown Standards

- Consistent header levels (H1 for title, H2 for sections)
- Unified list markers (- for bullets, 1. for ordered)
- Consistent code block syntax (markdown, python, etc.)
- Link formatting ([text](url) style)
```

**APM-R Project-Specific Skill:**
```yaml
---
name: formatting-markdown-apmr
scope: project-specific
applicable-projects: apmr
---

# Formatting Markdown for APM-R

Uses generic formatting-markdown skill + APM-R specific rules.

## APM-R Specific Rules

- Ticket files use YAML frontmatter
- Context files follow strict naming convention
- Framework governance docs in ai/framework/
```

### Rule
**Generic skills: No project references. APM-R variant: Separate skill in apmr/ directory.**

---

## Anti-Pattern 7: Circular or Missing "See Also" Links

### ❌ The Problem

```markdown
## See Also
- [Examples](EXAMPLES.md)     # ← File doesn't exist yet
- [Standards](STANDARDS.md)   # ← File doesn't exist yet
- [Self](SKILL.md)            # ← Circular reference
```

**Issues:**
- Broken links block commits
- User can't access referenced files
- Circular references confuse navigation
- Maintenance nightmare

### ✅ Correct Approach

**In SKILL.md:**
```markdown
## See Also
- [Real-world examples](EXAMPLES.md) - Step-by-step walkthroughs
- [Detailed standards](STANDARDS.md) - Validation rules and specs
- [Common mistakes](ANTI-PATTERNS.md) - Anti-patterns and fixes
```

**Verification:**
1. Every referenced file exists ✅
2. No circular references (A → B → A) ✅
3. Links use relative paths (../...) ✅
4. Tested with link validator before commit ✅

---

## Anti-Pattern 8: No Testing Documentation

### ❌ The Problem

```markdown
# validating-links

Validates links.

[No testing section]
[No examples of invocation]
[No expected outputs shown]
[No failure scenarios documented]
```

**Issues:**
- User doesn't know how to test the skill
- Unclear expected behavior
- Hard to debug failures
- No validation checklist

### ✅ Correct Approach: Include Testing Guidance

```markdown
## Testing This Skill

### Test Checklist
- [ ] Syntax validation: Valid YAML frontmatter
- [ ] Scope validation: Correct scope declaration
- [ ] Link validation: All references work
- [ ] Invocation test: Works with Claude Code
- [ ] Model testing: Test with Sonnet, Opus, Haiku

### Example Invocation
"Use validating-links skill to validate framework/README.md"

### Expected Output
- List of broken links (if any)
- Suggested fixes
- Summary statistics

### Common Test Scenarios
1. Valid file with no broken links → Returns ✅ all-good
2. File with 1-2 broken links → Returns details and fixes
3. File with complex relative paths → Handles correctly
4. File with external URLs → Validates or skips appropriately
```

---

**Anti-Patterns Category:** Content & Documentation
**Status:** Phase 1A - Supporting file for building-claude-skills
**Last Updated:** Dec 6, 2025
**See Also:** [Structure Anti-Patterns](ANTI-PATTERNS-STRUCTURE.md), [Naming Anti-Patterns](ANTI-PATTERNS-NAMING.md), [MCP Anti-Patterns](ANTI-PATTERNS-MCP.md)
