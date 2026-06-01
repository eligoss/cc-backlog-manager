# Building Claude Skills: Structural Anti-Patterns

## Anti-Pattern 1: Monolithic SKILL.md Files

### ❌ The Problem
```
SKILL.md: 2,500 lines
├── Official guidelines (200 lines)
├── 20 detailed examples (800 lines)
├── Complete standards (600 lines)
├── Advanced patterns (500 lines)
└── Common mistakes (400 lines)

User loads skill → Gets 2,500 lines of context
```

### Why This Fails
- **Token waste:** Loads everything even if only needed 20%
- **Cognitive overload:** User can't find relevant section
- **Slower discovery:** Takes longer to get to the point
- **Hard to maintain:** Changes require editing massive file

### ✅ Correct Approach: Progressive Disclosure
```
SKILL.md: 400 lines (overview + key instructions)
├── Official guidelines (quick reference)
├── When to use section
├── Instructions (3-5 steps)
├── Common patterns (summary)
└── "See Also" links to supporting files

EXAMPLES.md: 200 lines (on-demand)
STANDARDS.md: 150 lines (on-demand)
ANTI-PATTERNS.md: 150 lines (on-demand)
PATTERNS.md: 200 lines (on-demand)

User loads skill → Gets 400 lines
→ Loads EXAMPLES.md only if needed (+200 lines)
→ Loads STANDARDS.md only if needed (+150 lines)
```

### Key Rule
**SKILL.md < 500 lines. Everything else in supporting files.**

---

## Anti-Pattern 9: Insufficient Supporting File Organization

### ❌ The Problem

```
validating-links/
├── SKILL.md (50 lines) ← Too brief
├── EXAMPLES.md (1,200 lines) ← Too detailed, should split
└── [No STANDARDS.md, ANTI-PATTERNS.md]
```

**Issues:**
- SKILL.md too brief to be useful
- EXAMPLES.md too monolithic
- Missing standards documentation
- No anti-patterns guide

### ✅ Correct Approach: Balanced Structure

```
validating-links/
├── SKILL.md (300 lines)
│   ├── Overview and when to use
│   ├── Quick instructions (4 steps)
│   ├── Key patterns (3 patterns)
│   └── Links to supporting files
├── EXAMPLES.md (150 lines)
│   ├── Example 1: Relative paths (30 lines)
│   ├── Example 2: External URLs (30 lines)
│   └── Example 3: Handling typos (30 lines)
├── STANDARDS.md (100 lines)
│   ├── Link validation rules
│   ├── Supported URL types
│   └── Error categories
└── ANTI-PATTERNS.md (100 lines)
    ├── Wrong: Ignoring relative paths
    ├── Right: Resolve relative to file
    └── Common mistakes
```

### Sizing Guidelines
- SKILL.md: 200-500 lines (overview, quick reference)
- EXAMPLES.md: 100-300 lines (2-5 concrete examples)
- STANDARDS.md: 50-200 lines (rules, specifications)
- ANTI-PATTERNS.md: 50-200 lines (mistakes and fixes)
- Total: 400-1,200 lines progressive loading

---

## Anti-Pattern 10: Not Following the building-claude-skills Template

### ❌ The Problem

Creating skill without referencing building-claude-skills:
- Inconsistent structure across skills
- Different naming in different skills
- Different supporting file organizations
- Quality varies widely

### ✅ Correct Approach

**Always use building-claude-skills as template:**

1. Copy SKILL.md structure:
   - Exact YAML frontmatter format
   - "When to Use" section
   - "Quick Start" section
   - "Instructions" (numbered steps)
   - "Common Patterns"
   - "See Also" with supporting files

2. Validate against building-claude-skills checklist:
   - [ ] SKILL.md < 500 lines
   - [ ] Description answers WHEN to use
   - [ ] Scope declared
   - [ ] Gerund naming
   - [ ] Progressive disclosure
   - [ ] No hardcoded MCPs
   - [ ] All supporting files exist

3. Test against building-claude-skills:
   - Syntax check
   - Scope validation
   - Invocation test
   - Multiple models
   - Link validation

---

**Anti-Patterns Category:** Structure & Organization
**Status:** Phase 1A - Supporting file for building-claude-skills
**Last Updated:** Dec 6, 2025
**See Also:** [Naming Anti-Patterns](ANTI-PATTERNS-NAMING.md), [Content Anti-Patterns](ANTI-PATTERNS-CONTENT.md)
