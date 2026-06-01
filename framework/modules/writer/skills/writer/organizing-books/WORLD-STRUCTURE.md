# World Data Structure

## Overview

The world-building system organizes all world facts with hash-based immutability controls to ensure consistency across a series while allowing controlled expansion.

## Directory Structure

```
world/
├── WORLD.md                       # World overview
├── world.lock.json               # Immutability lock (hash registry)
│
├── core/                         # IMMUTABLE - fundamental laws
│   ├── _manifest.json           # Directory manifest
│   ├── fundamental-laws.md      # Physics, causality
│   └── creation-myth.md         # World origins
│
├── magic/                        # IMMUTABLE
│   ├── _manifest.json
│   ├── overview.md              # Quick summary (~300 tokens)
│   └── systems/                 # Individual magic systems
│       └── {system-name}.md
│
├── geography/                    # EXPANDABLE
│   ├── _manifest.json
│   ├── overview.md              # Summary (~500 tokens)
│   ├── climate.md
│   └── regions/
│       ├── _index.md            # Quick reference
│       └── {region-name}/
│           ├── region.md
│           └── locations/
│
├── nations/                      # EXPANDABLE
│   ├── _manifest.json
│   ├── _index.md
│   └── {nation-name}/
│       ├── nation.md
│       ├── culture.md
│       └── government.md
│
├── history/                      # APPEND-ONLY
│   ├── _manifest.json
│   ├── timeline.md              # Master chronology
│   └── events/
│       └── {event-name}.md
│
├── characters/                   # EXPANDABLE
│   ├── _index.md
│   └── {character-name}/
│       └── profile.md
│
├── artifacts/                    # EXPANDABLE
│   ├── _manifest.json
│   └── {artifact-name}.md
│
└── baseline/                     # Book starting state
    ├── BASELINE.md
    ├── world-state.md
    └── character-states/
```

## Directory Types

### IMMUTABLE Directories

**Directories:** `core/`, `magic/`

**Characteristics:**
- Content is hash-locked at creation
- Cannot be modified after establishment
- Pre-commit hooks verify hash matches
- Changes require explicit unlock (with confirmation)

**Use Cases:**
- Fundamental laws of physics
- Magic system rules
- Creation myths
- Core world mechanics

**Rationale:** These establish the "rules of the game" that readers and the AI rely on. Changing them mid-series breaks consistency.

### APPEND-ONLY Directories

**Directories:** `history/`

**Characteristics:**
- Original content is hash-locked
- Can add new sections at end
- Original sections cannot be modified
- All additions logged in frontmatter

**Use Cases:**
- Historical events
- Timelines
- Past occurrences

**Rationale:** History cannot be rewritten, but new events can be discovered or added.

### EXPANDABLE Directories

**Directories:** `geography/`, `nations/`, `characters/`, `artifacts/`

**Characteristics:**
- Can add new sub-items (files, locations, characters)
- Existing sub-items cannot be modified
- Cannot remove established sub-items
- All expansions logged in manifest

**Use Cases:**
- Geographic regions (can add new ones)
- Nations and cultures
- Character roster
- Artifacts and items

**Rationale:** The world can grow, but established facts remain consistent.

## Manifest Files

Each directory contains a `_manifest.json` that:
- Lists all facts in that directory
- Stores content hashes for verification
- Tracks token estimates for context loading
- Records summaries for quick reference
- Logs expansion history

## World Lock File

`world.lock.json` at the root serves as the master registry:
- Maps all immutable facts to their hashes
- Tracks append-only fact versions
- Records expandable fact expansions
- Enforces validation rules via pre-commit hooks

## Token Management

Each fact includes:
- `token-count`: Full content token estimate
- `summary-token-count`: Summary-only token estimate
- `summary-available`: Whether summary exists

This enables:
- Loading summaries only when full detail not needed
- Budget-aware context loading
- Efficient multi-fact context assembly

## Baseline System

The `baseline/` directory stores the world state at the start of each book:
- Which facts are established
- Character locations and knowledge
- Active conflicts
- Reader knowledge vs. AI knowledge
- Token budget for baseline loading

This allows the AI to:
- Start each book with correct context
- Know what the reader knows at that point
- Maintain consistency across series
- Avoid spoiling future reveals

## File Naming Conventions

### Facts
- `{category-name}.md` for general facts
- `{specific-item}.md` for specific entities
- `_index.md` for directory quick reference
- `_manifest.json` for directory metadata

### IDs
- Pattern: `world-{category}-{name}`
- Examples:
  - `world-core-physics`
  - `world-magic-elementalism`
  - `world-geography-northern-wastes`
  - `world-nations-empire-of-sol`
  - `world-history-great-war`

## Hash Algorithm

All content hashes use SHA-256 of:
- YAML frontmatter (excluding `content-hash` field itself)
- Markdown content (normalized line endings)
- Computed on file creation
- Verified on pre-commit

## Version Management

Facts use semantic versioning:
- `1.0.0`: Initial establishment
- `1.1.0`: Minor addition (append-only)
- `1.0.1`: Metadata/summary update only
- `2.0.0`: Major change (requires unlock)

## Dependencies

Facts can declare dependencies:
```yaml
depends-on:
  - world-core-physics
  - world-magic-elementalism
```

This enables:
- Validation of fact relationships
- Context loading in correct order
- Impact analysis for changes

## Referenced-By Tracking

Facts track what references them:
```yaml
referenced-by:
  - book-01-chapter-05
  - book-02-chapter-12
```

This enables:
- Finding which content uses a fact
- Assessing impact of potential changes
- Consistency validation across books
