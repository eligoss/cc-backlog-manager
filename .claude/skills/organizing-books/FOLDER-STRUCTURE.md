# Book Project Folder Structure

**Version:** 2.0
**Module:** writer
**Last Updated:** 2026-01-10

---

## Overview

Book projects follow a hierarchical folder structure with domain-driven world organization. This document details the complete folder layout, what belongs where, and how files relate to each other.

**Key Changes in v2:**
- World organized by **domains** (history, magic, politics, geography)
- Diagrams live **inside their domains**
- No separate `baseline/` directory
- Each fact in **one file only** (SSOT)

---

## Complete Structure

```
book-project/
├── manuscript/                    # Core narrative content
│   ├── index.md                  # Manuscript overview
│   ├── part-001-{name}/          # Story arc 1
│   │   ├── PART.md              # Part metadata + prerequisites
│   │   ├── chapter-001-{name}/  # Chapter in part 1
│   │   │   ├── CHAPTER.md       # Chapter metadata
│   │   │   ├── scene-001-{name}.md
│   │   │   └── scene-002-{name}.md
│   │   └── chapter-002-{name}/
│   └── part-002-{name}/
├── characters/                    # Character profiles
│   ├── _index.md                 # Character registry
│   ├── index.md                  # VitePress navigation
│   ├── relationships.md          # Character relationships diagram
│   ├── {character-name}/
│   │   └── profile.md
│   └── legendary/                # Historical/legendary figures
│       └── {character-name}/
│           └── profile.md
├── world/                         # World-building (Domain-Driven)
│   ├── index.md                  # World overview with domain links
│   ├── history/                  # DOMAIN: Everything temporal
│   │   ├── index.md
│   │   ├── timeline-master.md   # SSOT for temporal facts
│   │   ├── diagrams/
│   │   │   └── timeline.mmd     # Mermaid only
│   │   ├── eras/
│   │   └── events/
│   ├── magic/                    # DOMAIN: All magic systems
│   │   ├── index.md
│   │   ├── fundamental-laws.md  # SSOT for power levels
│   │   ├── diagrams/
│   │   │   ├── schools.mmd
│   │   │   └── crystal-tech.mmd
│   │   ├── schools/
│   │   │   ├── arcane.md
│   │   │   ├── elemental.md
│   │   │   ├── spiritforge.md
│   │   │   ├── light.md
│   │   │   └── nature.md
│   │   ├── crystals/
│   │   │   ├── mechanics.md
│   │   │   ├── types.md
│   │   │   └── applications.md
│   │   └── spellcraft/
│   ├── politics/                 # DOMAIN: Nations, governments
│   │   ├── index.md
│   │   ├── diagrams/
│   │   │   └── nations.mmd
│   │   ├── arcane-empire/
│   │   │   ├── nation.md
│   │   │   ├── government.md
│   │   │   └── culture.md
│   │   ├── trade-league/
│   │   ├── light-dominion/
│   │   └── vardun-crown/
│   ├── geography/                # DOMAIN: Physical world
│   │   ├── index.md
│   │   ├── diagrams/
│   │   ├── fourfold-sea.md
│   │   ├── caldris/
│   │   │   ├── region.md
│   │   │   ├── nexus.md
│   │   │   ├── ordrune.md
│   │   │   └── ladris.md
│   │   └── [other-regions]/
│   ├── artifacts/                # DOMAIN: Plot-relevant objects
│   │   ├── ascendant-crystal.md
│   │   ├── sunburst-crystal.md
│   │   └── crimson-crystal.md
│   ├── core/                     # DOMAIN: Universal rules
│   │   ├── races.md
│   │   ├── classes.md
│   │   ├── economy.md
│   │   └── languages-calendar.md
│   ├── creatures/                # DOMAIN: Threats and monsters
│   │   └── overview.md
│   └── transport/                # DOMAIN: Movement systems
│       └── overview.md
├── build/                         # Generated outputs (gitignored)
│   ├── manuscript.md
│   └── exports/
├── BOOK.md                        # Book-level metadata
├── .gitignore
└── README.md
```

---

## Folder Purposes

### `/manuscript/`

**Purpose:** Contains the core narrative content organized hierarchically.

**What belongs here:**
- `BOOK.md` - Book-level metadata (title, author, genre, word-count-target)
- Part folders (`part-001-*/`) - Major story arcs
- Chapter folders within parts - Narrative chapters
- Scene files within chapters - Individual scenes

**What doesn't belong here:**
- Character profiles (goes in `/characters/`)
- World-building details (goes in `/world/`)
- Build outputs (goes in `/build/`)
- Research notes (create separate `/notes/` if needed)

**Hierarchy:**
```
BOOK.md (book metadata)
└── part-001-the-awakening/ (story arc)
    └── chapter-001-first-dawn/ (narrative chapter)
        └── scene-001-morning-light.md (individual scene)
```

---

### `/manuscript/BOOK.md`

**Purpose:** Book-level metadata and overview.

**Contents:**
- YAML frontmatter with book metadata
- Book summary paragraph
- Genre and target audience
- Word-count target and current progress
- Status tracking (draft, revision, final)

**Example:**
```yaml
---
title: "The Dragon's Crown"
author: "Author Name"
genre: fantasy
status: draft
word-count-target: 100000
word-count-current: 0
created: 2026-01-01
---

# The Dragon's Crown

A young mage discovers an ancient prophecy...
```

**This file is:**
- Created by `writer init` command
- Updated manually as book evolves
- Committed to version control
- The top of the narrative hierarchy

---

### `/manuscript/part-{number}-{name}/`

**Purpose:** Organize chapters by major story arcs (acts).

**Naming:**
- `part-001-the-awakening`
- `part-002-the-journey`
- `part-003-the-confrontation`

**Contents:**
- `PART.md` - Part metadata, summary, bullet points
- Chapter folders (`chapter-001-*/`, `chapter-002-*/`, etc.)

**When to create a new part:**
- Major shift in story direction
- New act in three-act structure
- Significant time jump or location change
- Every 20,000-40,000 words as a guideline

**Example structure:**
```
part-001-the-awakening/
├── PART.md
├── chapter-001-first-dawn/
├── chapter-002-the-discovery/
└── chapter-003-the-test/
```

---

### `/manuscript/part-*/PART.md`

**Purpose:** Part-level metadata and arc summary.

**Contents:**
- YAML frontmatter with part metadata
- Arc overview paragraph
- Bullet points listing key events (3-7 points)
- Thematic elements of this arc
- Prerequisites (which prior parts must be read)
- Establishes (what this part sets up for later)

**Example:**
```yaml
---
part-number: 1
title: "The Awakening"
status: draft
word-count: 0
created: 2026-01-01
summary: |
  The protagonist discovers their magical abilities
  and enters the academy.
bullet-points:
  - Discovery of latent magic during crisis
  - Journey to the Academy
  - First day and initial challenges
  - Meeting the mentor
  - First spell cast successfully
prerequisites:
  requires-parts: []
  world-state:
    time-elapsed: "start of book"
    location-shift: "village to academy"
establishes:
  - protagonist-magical-ability
  - mentor-relationship
  - academy-setting
---
```

---

### `/manuscript/part-*/chapter-{number}-{name}/`

**Purpose:** Organize scenes by narrative chapter.

**Naming:**
- `chapter-001-first-dawn`
- `chapter-002-the-discovery`
- `chapter-003-the-test`

**Contents:**
- `CHAPTER.md` - Chapter metadata
- Scene files (`scene-001-*.md`, `scene-002-*.md`, etc.)

**Chapter length guidelines:**
- 2,000-5,000 words typical
- 3-7 scenes per chapter
- Single narrative through-line
- Clear beginning and end

---

### `/manuscript/part-*/chapter-*/CHAPTER.md`

**Purpose:** Chapter-level metadata and summary.

**Contents:**
- YAML frontmatter with chapter metadata
- Chapter summary paragraph
- POV character for this chapter
- Prerequisites (character states, prior chapters)
- Active tensions in this chapter
- What this chapter establishes

**Example:**
```yaml
---
chapter-number: 1
title: "First Dawn"
status: draft
word-count: 0
created: 2026-01-01
pov-character: protagonist
prerequisites:
  requires-chapters: []
  character-states:
    protagonist:
      location: village-home
      emotional: anxious
      knowledge: unaware-of-magic
active-tensions:
  - Will the protagonist discover their magic?
  - What caused the disturbance?
establishes:
  - protagonist-normal-life
  - inciting-incident
---
```

---

### `/manuscript/part-*/chapter-*/scene-{number}-{name}.md`

**Purpose:** Individual narrative scenes (smallest unit).

**Naming:**
- `scene-001-morning-light.md`
- `scene-002-the-disturbance.md`
- `scene-003-first-spell.md`

**Contents:**
- YAML frontmatter with scene metadata
- Prose content (the actual writing)
- Scene beats and establishes

**Scene types:**
- `action` - Physical events, combat, chase
- `dialogue` - Character interaction, conversation
- `introspection` - Internal thought, reflection
- `transition` - Movement between locations/times

**Scene length guidelines:**
- 500-2,000 words typical
- Single location and time
- Clear narrative beat or purpose
- Advances plot or develops character

---

### `/characters/`

**Purpose:** Character profile storage and tracking.

**Structure:**
```
characters/
├── _index.md                 # Registry of all characters
├── protagonist/
│   └── profile.md
├── antagonist/
│   └── profile.md
└── supporting-cast/
    └── mentor/
        └── profile.md
```

**Character types:**
- Main characters (protagonist, antagonist)
- Major supporting (mentor, allies)
- Minor supporting (guards, shopkeepers)
- Grouped by role or relationship

**What belongs here:**
- Physical descriptions
- Personality traits
- Character arcs
- Relationships with other characters
- Voice patterns and dialogue examples
- Backstory and motivations

---

### `/characters/_index.md`

**Purpose:** Central registry of all characters.

**Contents:**
- List of all characters with IDs
- Character types and roles
- Cross-reference to profile locations
- Character relationship map

**Example:**
```markdown
# Character Registry

## Main Characters

- **protagonist** - Main POV character, young mage
- **antagonist** - Dark sorcerer seeking power
- **mentor** - Academy master, teaches protagonist

## Supporting Characters

- **ally-1** - Fellow student, friend
- **guardian** - Protects protagonist in part 1
```

---

### `/world/` (Phase 2B)

**Purpose:** World-building documentation and reference.

**Structure:**
```
world/
├── _index.md                 # World registry
├── locations/
│   ├── kingdom-north/
│   │   └── details.md
│   └── academy/
│       └── details.md
├── magic-system/
│   ├── overview.md
│   ├── mana-costs.md
│   └── spell-types.md
├── history/
│   ├── timeline.md
│   └── major-events.md
└── cultures/
    └── kingdom-culture.md
```

**What belongs here:**
- Locations and maps
- Magic system rules
- History and timeline
- Cultures and societies
- Economy and politics
- Technology level
- Flora and fauna

---

### `/build/`

**Purpose:** Generated outputs from manuscript compilation.

**Important:** This folder is `.gitignore`d - not committed to version control.

**Contents:**
- `manuscript.md` - Compiled full manuscript
- `manuscript.docx` - Word export for editors
- `manuscript.pdf` - PDF for distribution
- `exports/` - Individual part exports

**Generation:**
- Built by CLI commands
- Regenerated on demand
- Not edited manually
- Not tracked in git

---

## File Relationships

### Hierarchical References

**Book → Part:**
- BOOK.md references all parts
- Part count tracked in BOOK.md

**Part → Chapter:**
- PART.md lists chapters in this arc
- Chapter count tracked in PART.md

**Chapter → Scene:**
- CHAPTER.md lists scenes in this chapter
- Scene count tracked in CHAPTER.md

### Cross-References

**Scenes → Characters:**
- Scenes reference character IDs
- Characters listed in `characters-present`

**Scenes → World:**
- Scenes reference locations
- Scenes reference world facts (magic rules, history)

**Chapters → Prerequisites:**
- Chapters declare prior chapter dependencies
- Chapters declare character state requirements

**Parts → Prerequisites:**
- Parts declare prior part dependencies
- Parts declare world state requirements

---

## Validation Rules

The `writer validate` command checks:

1. **Naming conventions**
   - All folders follow `{type}-{number}-{name}` pattern
   - Numbers are zero-padded 3 digits
   - Names are kebab-case

2. **Hierarchy integrity**
   - Every chapter is in a part
   - Every scene is in a chapter
   - No orphaned files

3. **Metadata completeness**
   - All required frontmatter fields present
   - Field values match expected types
   - Status values are valid (draft, revision, final)

4. **Cross-references**
   - Character IDs exist in `/characters/_index.md`
   - Location IDs exist in `/world/_index.md`
   - Prior scenes/chapters exist

5. **Prerequisites**
   - Prior-scene references valid scene
   - Required chapters exist
   - Character states reference valid characters

---

## Git Workflow

**What to commit:**
- All `/manuscript/` files (BOOK.md, PART.md, CHAPTER.md, scene-*.md)
- All `/characters/` files
- All `/world/` files
- `.gitignore` file
- `README.md`

**What NOT to commit:**
- `/build/` folder (generated outputs)
- Temporary files
- Editor backups

**Commit messages:**
- `init(writer): create book project {name}`
- `feat(writer): add part {N} - {title}`
- `feat(writer): add chapter {P.C} - {title}`
- `feat(writer): add scene {P.C.S} - {title}`
- `feat(writer): add character {name}`
- `feat(writer): add world location {name}`
- `fix(writer): resolve validation issues`
- `docs(writer): update character {name} backstory`

---

## Scalability

**Small book (50K words):**
- 1-2 parts
- 10-15 chapters
- 30-50 scenes

**Medium book (80K-100K words):**
- 3 parts
- 20-30 chapters
- 60-100 scenes

**Large book (120K+ words):**
- 3-5 parts
- 30-40 chapters
- 100-150 scenes

**Series:**
- Create separate book projects (book-1/, book-2/)
- Share `/world/` via symlinks or submodules
- Cross-reference characters across books

---

## Quick Reference

| Artifact | Location | Created By | Contains |
|----------|----------|------------|----------|
| Book metadata | `/manuscript/BOOK.md` | `writer init` | Title, author, genre |
| Part metadata | `/manuscript/part-*/PART.md` | `writer create-part` | Arc summary, bullets |
| Chapter metadata | `/manuscript/part-*/chapter-*/CHAPTER.md` | `writer create-chapter` | POV, tensions |
| Scene | `/manuscript/part-*/chapter-*/scene-*.md` | `writer create-scene` | Prose, prerequisites |
| Character | `/characters/{name}/profile.md` | Manual or CLI | Traits, arc, voice |
| World | `/world/{category}/{name}/` | Manual or CLI | Locations, magic, history |
| Build output | `/build/manuscript.md` | Build command | Compiled manuscript |

---

**Related Documents:**
- [SKILL.md](./SKILL.md) - Main skill documentation
- [METADATA-GUIDE.md](./METADATA-GUIDE.md) - Frontmatter specifications

---

**Version:** 1.0
**Last Updated:** 2026-01-01
