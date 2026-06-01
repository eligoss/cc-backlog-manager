# World Immutability Guide

## Overview

The writer module enforces three levels of mutability control to maintain world consistency across a book series while allowing controlled expansion.

## Three Mutability Types

### 1. IMMUTABLE

**What It Means:**
- Content is hash-locked at creation
- Cannot be modified after establishment
- Pre-commit hook verifies hash matches
- Changes require explicit unlock with confirmation

**Use Cases:**
- Core laws of physics
- Magic system rules
- Creation myths
- Fundamental world mechanics
- Established magical limitations
- Laws of causality

**Why This Matters:**
- Prevents accidental contradictions
- Ensures magic system consistency
- Maintains reader trust
- Protects "rules of the game"

**File Examples:**
- `world/core/fundamental-laws.md`
- `world/magic/systems/elementalism.md`
- `world/core/creation-myth.md`

**How to Modify:**
1. Run unlock command (requires confirmation)
2. Update content
3. Re-lock with new hash
4. Audit trail logged in world.lock.json

**Warning Signs You Need Immutable:**
- "This magic system works by..."
- "The laws of physics state..."
- "This is how the world was created..."
- "These rules cannot be broken..."

### 2. APPEND-ONLY

**What It Means:**
- Original content is hash-locked
- Can add new sections at the end
- Original sections cannot be modified
- All additions logged in frontmatter
- Each addition gets its own hash

**Use Cases:**
- Historical events
- Timelines
- Past occurrences
- Established lore

**Why This Matters:**
- History cannot be rewritten
- New discoveries can be added
- Original facts remain protected
- Chronology stays consistent

**File Examples:**
- `world/history/timeline.md`
- `world/history/events/great-war.md`

**Frontmatter Structure:**
```yaml
mutability: append-only
content-hash: "abc123..."  # Original content hash
additions:
  - date: "2026-03-15"
    author: "ai-writer-agent"
    description: "Added aftermath section"
    section: "## Aftermath"
    hash: "def456..."
  - date: "2026-04-20"
    description: "Added legacy section"
    section: "## Legacy"
    hash: "ghi789..."
```

**How to Add:**
1. Add new section at end of file
2. Update frontmatter `additions` array
3. Compute hash of new section
4. Original content hash remains unchanged

**Validation:**
- Original sections verified against original hash
- New sections verified against addition hashes
- Additions array must be sequential

**Warning Signs You Need Append-Only:**
- "This event happened in the past..."
- "The timeline shows..."
- "Historical records indicate..."
- "This occurred before the story begins..."

### 3. EXPANDABLE

**What It Means:**
- Can add new sub-items (files, entities)
- Cannot modify existing sub-items
- Cannot remove established sub-items
- All expansions logged in manifest
- Each sub-item is independently protected

**Use Cases:**
- Geographic regions (can add new ones)
- Nations and cultures
- Character roster
- Artifacts and items
- Locations within regions

**Why This Matters:**
- World can grow organically
- New locations can be discovered
- New characters can be introduced
- Existing facts remain consistent

**Directory Examples:**
- `world/geography/`
- `world/nations/`
- `world/characters/`
- `world/artifacts/`

**Manifest Structure:**
```json
{
  "directory": "world/geography",
  "type": "expandable",
  "created": "2026-01-15",
  "facts": [
    {
      "file": "regions/northern-wastes/region.md",
      "hash": "abc123...",
      "established": "2026-01-15",
      "version": "1.0.0",
      "immutable": true,
      "summary": "Frozen wasteland in the far north",
      "token-estimate": 450
    }
  ],
  "total-token-estimate": 2800,
  "last-validated": "2026-01-20T10:30:00Z"
}
```

**Frontmatter Structure:**
```yaml
mutability: expandable
expansions:
  - date: "2026-03-15"
    type: "location"
    added: "Frostpeak Keep"
    file: "locations/frostpeak-keep.md"
  - date: "2026-04-01"
    type: "location"
    added: "Crystal Caves"
    file: "locations/crystal-caves.md"
```

**How to Expand:**
1. Create new sub-item file
2. Add entry to parent's `expansions` array
3. Update manifest with new fact
4. New file gets its own hash protection

**Validation:**
- Parent file cannot be modified
- New sub-items get added to manifest
- Manifest tracks all expansions
- Cannot delete established sub-items

**Warning Signs You Need Expandable:**
- "A region of the world..."
- "A nation called..."
- "A character named..."
- "An artifact known as..."
- "They discovered a new location..."

## Decision Matrix

| Content Type | Mutability | Example |
|--------------|------------|---------|
| Laws of physics | IMMUTABLE | "Magic requires energy exchange" |
| Magic system rules | IMMUTABLE | "Elementalists can control fire, water, earth, air" |
| Creation myth | IMMUTABLE | "The world was formed from primordial chaos" |
| Historical event | APPEND-ONLY | "The Great War (can add aftermath later)" |
| Timeline | APPEND-ONLY | "Year 1000: Empire founded (can add new years)" |
| Geographic region | EXPANDABLE | "Northern Wastes (can add new locations within)" |
| Nation | EXPANDABLE | "Empire of Sol (can add new cities)" |
| Character roster | EXPANDABLE | "Protagonist (can add new characters)" |
| Artifact list | EXPANDABLE | "Sword of Light (can add new artifacts)" |

## Pre-Commit Hook Validation

The writer module includes a pre-commit hook that:

1. **For IMMUTABLE facts:**
   - Computes current content hash
   - Compares to locked hash in world.lock.json
   - BLOCKS commit if mismatch
   - Requires explicit unlock to proceed

2. **For APPEND-ONLY facts:**
   - Verifies original content hash unchanged
   - Validates new additions logged in frontmatter
   - Checks additions are sequential
   - Computes hash for each new section

3. **For EXPANDABLE facts:**
   - Verifies parent file hash unchanged
   - Checks new sub-items logged in manifest
   - Validates expansions array updated
   - Ensures no deletions occurred

## Unlocking Process

When you need to modify IMMUTABLE content:

```bash
# View what would be unlocked
npx agentic-framework writer unlock-fact --fact world-core-physics --dry-run

# Unlock with confirmation
npx agentic-framework writer unlock-fact --fact world-core-physics --reason "Clarifying gravity rules"

# Make changes to the file

# Re-lock with new hash
npx agentic-framework writer lock-fact --fact world-core-physics
```

**Audit Trail:**
```json
{
  "fact-id": "world-core-physics",
  "unlocked": "2026-03-15T14:30:00Z",
  "reason": "Clarifying gravity rules",
  "original-hash": "abc123...",
  "new-hash": "def456...",
  "locked": "2026-03-15T15:00:00Z",
  "books-affected": ["book-01", "book-02"]
}
```

## Best Practices

### When Establishing New Facts

1. **Choose mutability level carefully**
   - Once set, harder to change later
   - Default to more restrictive
   - IMMUTABLE for "laws"
   - EXPANDABLE for "things"

2. **Write clear, complete rules**
   - IMMUTABLE facts should be comprehensive
   - Anticipate edge cases
   - Document limitations explicitly

3. **Use dependencies**
   - Declare what facts depend on others
   - Enables impact analysis
   - Helps with context loading

### When Expanding the World

1. **Check existing facts first**
   - Don't contradict IMMUTABLE facts
   - Build on APPEND-ONLY history
   - Add to EXPANDABLE categories

2. **Log all expansions**
   - Update frontmatter arrays
   - Update manifests
   - Include dates and descriptions

3. **Maintain token estimates**
   - Update token counts when adding
   - Keep summaries current
   - Monitor total context size

### When Planning a Series

1. **Establish core facts early**
   - Lock down magic systems in Book 1
   - Define fundamental laws upfront
   - Create comprehensive geography

2. **Leave room for discovery**
   - Use EXPANDABLE for locations
   - Plan for new characters
   - Allow historical reveals

3. **Track what readers know**
   - Use baseline system
   - Separate AI knowledge from reader knowledge
   - Plan reveals across books

## Error Messages

The pre-commit hook will show:

```
ERROR: Immutable fact modified
  Fact: world-core-physics
  File: world/core/fundamental-laws.md
  Expected hash: abc123...
  Actual hash: def456...

  This fact is IMMUTABLE and cannot be modified.
  To modify, run: npx agentic-framework writer unlock-fact --fact world-core-physics
```

```
ERROR: Append-only fact original content modified
  Fact: world-history-great-war
  File: world/history/events/great-war.md
  Original section hash mismatch

  Original content cannot be modified in APPEND-ONLY facts.
  Add new sections at the end and log in frontmatter.
```

```
ERROR: Expandable fact parent modified
  Fact: world-geography-northern-wastes
  File: world/geography/regions/northern-wastes/region.md
  Parent hash mismatch

  Parent facts in EXPANDABLE categories cannot be modified.
  Add new sub-items instead.
```

## Summary

- **IMMUTABLE**: Never changes (magic rules, physics, core laws)
- **APPEND-ONLY**: Can grow but never rewrite (history, timelines)
- **EXPANDABLE**: Can add new items but not change existing (regions, characters)

Choose the right level, establish facts carefully, and let the pre-commit hooks protect your consistency.
