# Building Claude Skills: MCP Integration Anti-Patterns

## Anti-Pattern 4: Hardcoded MCP Dependencies

### ❌ The Problem

```markdown
## Instructions

This skill requires the **atlassian MCP** to work.

1. Load atlassian MCP: `mcp__MCP_DOCKER__code-mode ...`
2. Search for issues
3. Create new issue
4. Update issue fields
```

**Issues:**
- If MCP unavailable → Skill fails completely
- No graceful fallback
- Tight coupling to MCP
- User can't use skill without MCP

### ✅ Correct Approach: Optional MCP

```markdown
## MCP Integration (Optional)

This skill works with OR without the **atlassian MCP**:

**With atlassian MCP (Batch Operations):**
- Faster: Bulk operations in single API call
- Requires: `atlassian` MCP available
- Command: `mcp__MCP_DOCKER__code-mode "task" --servers ["atlassian"]`

**Without MCP (Graceful Fallback):**
- Uses Python scripts: `src/jira/create_jira_story.py`
- Speed: Slower for large batches
- Availability: Always works
- No additional setup needed

## Instructions

1. [Perform task with whatever is available]
2. If MCP loaded: Use batch operations
3. If no MCP: Use Python script fallback
4. Result is the same either way
```

### Key Principle
**Never make skill unusable if MCP unavailable. Always provide fallback.**

---

## Preventing Anti-Patterns: Checklist

### Before Creating a Skill

- [ ] Read building-claude-skills (this entire skill)
- [ ] Review EXAMPLES.md in building-claude-skills
- [ ] Check ANTI-PATTERNS.md (this file)
- [ ] Decide scope: Generic or Project-Specific?
- [ ] Plan directory: .claude/skills/{generic|apmr}/
- [ ] Plan supporting files needed

### While Creating SKILL.md

- [ ] YAML frontmatter correct
- [ ] Description < 1024 chars, answers WHEN
- [ ] Scope declared (generic | project-specific)
- [ ] Name in gerund form (verb + -ing)
- [ ] Main file target: < 500 lines
- [ ] Instructions: 3-5 numbered steps
- [ ] Common Patterns: 2-4 patterns
- [ ] See Also: Links to supporting files
- [ ] No MCP hardcoding

### After Creating Supporting Files

- [ ] EXAMPLES.md exists and is concrete
- [ ] STANDARDS.md exists if needed
- [ ] ANTI-PATTERNS.md exists if complex
- [ ] All referenced files exist (no broken links)
- [ ] No circular references
- [ ] Link validator passes
- [ ] Consistent file organization

### Before Submitting

- [ ] Syntax validation: YAML, markdown
- [ ] Scope validation: Correct declaration
- [ ] Link validation: All references work
- [ ] Tested: Syntax, scope, invocation
- [ ] Model tested: Claude 3.5 Sonnet, Opus, Haiku
- [ ] Checklist complete

---

## Quick Reference: Common Anti-Pattern Fixes

| Anti-Pattern | Fix |
|---|---|
| Monolithic SKILL.md | Split into supporting files, keep main < 500 lines |
| Vague description | Describe WHEN to use, include key features, be specific |
| Missing scope | Add scope field to YAML frontmatter (generic\|project-specific) |
| No applicable-projects | Add applicable-projects field (any or apmr) |
| Hardcoded MCP | Make MCP optional, provide graceful fallback |
| Project details in generic | Move to separate project-specific skill in apmr/ |
| Wrong naming | Use gerund form (verb + -ing), lowercase-hyphens |
| No See Also links | Create supporting files and link from SKILL.md |
| Circular references | Check links point forward only, not backward |
| No testing guide | Include testing checklist and example invocations |

---

**Anti-Patterns Category:** MCP Integration & Validation
**Status:** Phase 1A - Supporting file for building-claude-skills
**Last Updated:** Dec 6, 2025
**See Also:** [Structure Anti-Patterns](ANTI-PATTERNS-STRUCTURE.md), [Naming Anti-Patterns](ANTI-PATTERNS-NAMING.md), [Content Anti-Patterns](ANTI-PATTERNS-CONTENT.md)
