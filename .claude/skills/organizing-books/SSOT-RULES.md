---
title: "Single Source of Truth Rules"
type: skill-support
skill: writer-organizing-books-workflow
---

# Single Source of Truth (SSOT) Rules

Guidelines for maintaining one authoritative source for each fact.

## The Core Principle

**Each fact exists in exactly ONE file.** All other mentions reference that file.

### What Counts as a Fact?

| Is a Fact | Not a Fact |
|-----------|------------|
| "Iron Peace signed ~100 years ago" | Narrative mention in manuscript |
| "Ascendant Crystal is self-sustaining" | Character's speculation about it |
| "Nexus is 80km from Ladris" | Character traveling that distance |
| "15 power levels exist" | Reference to power system |

Facts are **world truths**. Narrative uses of facts are not duplications.

---

## SSOT Frontmatter

Authority files use these frontmatter fields:

```yaml
---
id: magic-crystal-mechanics
title: "Mana Crystal Mechanics"
domain: magic                    # Which domain owns this
ssot: true                       # This is THE source of truth
ssot-topic: crystal-mechanics    # What topic this covers
mutability: immutable            # Can this change?
last-updated: 2026-01-10
---
```

### Field Definitions

| Field | Required | Purpose |
|-------|----------|---------|
| `domain` | Yes | Which domain owns this file |
| `ssot` | If authoritative | Marks as single source of truth |
| `ssot-topic` | If ssot:true | What topic this file is authoritative for |
| `mutability` | Recommended | immutable, append-only, or expandable |

---

## Reference Patterns

### Pattern 1: Inline Link

For quick references in prose:

```markdown
The [15-level power system](../magic/fundamental-laws.md#power-levels)
determines mage classifications.
```

### Pattern 2: Cross-Reference Section

For comprehensive references at file end:

```markdown
## Cross-Reference

- [Crystal Mechanics](../magic/crystals/mechanics.md) - How crystals work
- [Crystal Types](../magic/crystals/types.md) - Blue, Ascendant, Sunburst, Crimson
- [Politics Overview](../politics/index.md) - Four powers
```

### Pattern 3: Anchor Links

For specific sections:

```markdown
See [Recharging Mechanics](../magic/crystals/mechanics.md#recharging-mechanics)
for details on crystal power cycles.
```

**Anchor Convention:**
- Lowercase with hyphens: `#recharging-mechanics`
- Match actual heading text
- Use kebab-case

---

## What NOT to Do

### Anti-Pattern 1: Duplicating Facts

```markdown
# In world/politics/arcane-empire/nation.md
## Crystal Technology

The Blue Crystal uses the following grades:
- Industrial: Basic stability...
- Commercial: Standard reliability...
[COPYING FROM magic/crystals/mechanics.md - WRONG!]
```

**Correct:**
```markdown
## Crystal Technology

Caldris is catching up on crystal technology invented by the Trade League.
See [Crystal Mechanics](../../magic/crystals/mechanics.md) for grade specifications.
```

### Anti-Pattern 2: Parallel Versions

Having both `timeline.md` AND `timeline-master.md` with overlapping content.

**Correct:** One authoritative file, others reference it or are deleted.

### Anti-Pattern 3: Prose in Diagrams

```markdown
# world/diagrams/timeline.md

## Era Descriptions

The Pre-Arcane Era lasted from ~1300-1100 years ago...
[PROSE IN DIAGRAM FILE - WRONG!]
```

**Correct:** Diagrams (`.mmd`) contain only Mermaid code. Prose in domain files.

---

## When Facts Need to Appear Multiple Times

Sometimes the same fact is relevant in multiple contexts.

### Solution: Reference, Don't Repeat

**In `history/events/iron-peace.md`:**
```markdown
The Iron Peace treaty (~100 years ago) established the Four Powers as
recognized sovereigns. This created the political framework still
governing Asterra.

See: [Politics Overview](../../politics/index.md) for current Four Powers status.
```

**In `politics/index.md`:**
```markdown
The Four Powers were established by the [Iron Peace](../history/events/iron-peace.md)
treaty (~100 years ago).
```

Both reference, neither duplicates the full event narrative.

---

## Updating SSOT Files

### Process

1. **Identify the SSOT file** for the fact you're changing
2. **Make the change** in that one file
3. **Check references** - links still work?
4. **Run validation** - `writer validate`

### What Happens to References?

- Markdown links automatically show updated content
- No need to update every file that references the fact
- Only update if the file path or anchor changes

---

## Finding the SSOT for a Fact

### Method 1: Check Frontmatter

Look for `ssot: true` and `ssot-topic:` matching your topic.

### Method 2: Domain Logic

| Fact Type | Look In |
|-----------|---------|
| When something happened | `history/timeline-master.md` or `events/` |
| How magic works | `magic/` directory |
| Who rules where | `politics/[nation]/` |
| Where things are | `geography/[region]/` |
| Plot objects | `artifacts/` |

### Method 3: Search

```bash
grep -r "ssot-topic: crystal-mechanics" world/
```

---

## Validation

Run `writer validate` to check:
- All `ssot: true` files have `ssot-topic`
- No duplicate `ssot-topic` values
- Links resolve correctly
- Domain frontmatter matches file location

---

**Version:** 2.0.0
**Last Updated:** 2026-01-10
