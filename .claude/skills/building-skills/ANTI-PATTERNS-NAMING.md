# Building Claude Skills: Naming Anti-Patterns

## Anti-Pattern 6: Imperative Naming (Violates Gerund Convention)

### ❌ The Problem

```yaml
name: validate-links      # ← Imperative, wrong
name: LinkValidator       # ← Class name, wrong
name: link-validation     # ← Noun form, wrong
name: link_validator      # ← Underscore, wrong
```

**Issues:**
- Inconsistent with official convention
- Hard to categorize (validate? noun? class?)
- Doesn't match naming pattern across framework
- Length check fails

### ✅ Correct: Gerund Form (Verb + -ing)

```yaml
name: validating-links     # ✅ Correct
name: formatting-markdown  # ✅ Correct
name: updating-changelogs  # ✅ Correct
name: maintaining-governance  # ✅ Correct
```

### Naming Checklist
- [ ] Verb + -ing form (gerund)
- [ ] Lowercase only
- [ ] Hyphens for word separation
- [ ] No underscores
- [ ] No camelCase
- [ ] Max 64 characters

### Conversion Examples
| Wrong | Correct |
|-------|---------|
| validate-links | validating-links |
| LinkValidator | validating-links |
| link-validation | validating-links |
| checkLinks | validating-links |
| link_checker | validating-links |

---

## Anti-Pattern 3: Missing or Incorrect Scope Declaration

### ❌ The Problem

**Skill with no scope:**
```yaml
---
name: formatting-markdown
description: Formats markdown files
---
```

**Issues:**
- Is this reusable in other projects?
- Can it be shared globally?
- Does it have dependencies on APM-R?
- Where should directory be?

**Skill with wrong scope:**
```yaml
---
name: validating-appr-format  # ← Wrong: APM-R specific name
description: Validates markdown
scope: generic  # ← Wrong: Says generic but has APM-R dependency
---
```

### ✅ Correct Approach

**Generic Skill:**
```yaml
---
name: validating-links
description: Validates markdown links...
scope: generic
applicable-projects: any
---
```
- Directory: `.claude/skills/generic/validating-links/`
- Can be shared: `~/.claude/skills/generic/`
- No project-specific code

**Project-Specific Skill:**
```yaml
---
name: ticket-structure-validator
description: Validates APM-R ticket structure...
scope: project-specific
applicable-projects: apmr
---
```
- Directory: `.claude/skills/apmr/ticket-structure-validator/`
- Shared in: `~/.claude/skills/apmr/`
- APM-R specific knowledge embedded

### Scope Decision Tree (Use This!)

```
Is this skill reusable in a DIFFERENT project?
│
├─ YES → Generic skill
│   Directory: .claude/skills/generic/
│   Scope: generic
│   Applicable-projects: any
│
└─ NO → Project-specific skill
    Does it contain APM-R-specific knowledge?
    │
    ├─ YES → Project-specific skill
    │   Directory: .claude/skills/apmr/
    │   Scope: project-specific
    │   Applicable-projects: apmr
    │
    └─ NO → Reconsider - should be generic
```

---

**Anti-Patterns Category:** Naming Conventions
**Status:** Phase 1A - Supporting file for building-claude-skills
**Last Updated:** Dec 6, 2025
**See Also:** [Structure Anti-Patterns](ANTI-PATTERNS-STRUCTURE.md), [Content Anti-Patterns](ANTI-PATTERNS-CONTENT.md)
