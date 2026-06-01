# Book Project Metadata Guide

**Version:** 2.0.0
**Module:** writer
**Last Updated:** 2026-01-10

---

## Overview

Every artifact in a book project requires YAML frontmatter with specific metadata fields. This document provides complete specifications for all artifact types.

**v2 Changes:**
- Added World File frontmatter with SSOT fields
- Added `domain`, `ssot`, `ssot-topic`, `mutability` fields
- Added Diagram File frontmatter

---

## World File Frontmatter (v2)

**Location:** `/world/{domain}/*.md`

**Purpose:** World-building documentation with single source of truth marking.

**Required Fields:**

```yaml
---
id: unique-identifier
title: "File Title"
type: world-fact
domain: magic              # history, magic, politics, geography, artifacts, core
last-updated: 2026-01-10
---
```

**SSOT Authority Fields (for source-of-truth files):**

```yaml
---
id: magic-crystal-mechanics
title: "Mana Crystal Mechanics"
type: world-fact
domain: magic
ssot: true                       # This is THE source of truth
ssot-topic: crystal-mechanics    # What topic this file is authoritative for
mutability: immutable            # immutable, append-only, expandable
last-updated: 2026-01-10
---
```

**Field Specifications:**

| Field | Type | Required | Values/Description |
|-------|------|----------|-------------------|
| `id` | string | Yes | Unique identifier (kebab-case) |
| `title` | string | Yes | Human-readable title |
| `type` | string | Yes | world-fact, domain-index, diagram |
| `domain` | string | Yes | history, magic, politics, geography, artifacts, core, creatures, transport |
| `ssot` | boolean | If authoritative | `true` marks this as single source of truth |
| `ssot-topic` | string | If ssot:true | What topic this file is authoritative for |
| `mutability` | string | Recommended | immutable, append-only, expandable |
| `last-updated` | date | Yes | Last modification date |

**Mutability Values:**

| Value | Meaning | Example |
|-------|---------|---------|
| `immutable` | Cannot change (historical facts) | Iron Peace signing date |
| `append-only` | Can add, never change existing | Timeline events |
| `expandable` | Can refine and expand details | Magic school descriptions |

**Example:**

```yaml
---
id: magic-fundamental-laws
title: "Fundamental Laws of Magic"
type: world-fact
domain: magic
ssot: true
ssot-topic: power-levels
mutability: immutable
last-updated: 2026-01-10
---

# Fundamental Laws of Magic

The 15-level power system governs all magical ability...
```

---

## Diagram File Frontmatter (v2)

**Location:** `/world/{domain}/diagrams/*.mmd`

**Purpose:** Visual diagrams (Mermaid only, no prose).

**Required Fields:**

```yaml
---
title: "Diagram Title"
type: diagram
domain: magic
references:
  - "../index.md"
  - "../schools/arcane.md"
---
```

**Field Specifications:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Diagram title |
| `type` | string | Yes | Always `diagram` |
| `domain` | string | Yes | Which domain this belongs to |
| `references` | array | Yes | Source files this diagram visualizes |

**Example:**

```yaml
---
title: "Magic Schools Hierarchy"
type: diagram
domain: magic
references:
  - "../index.md"
  - "../schools/arcane.md"
  - "../schools/elemental.md"
---

graph TB
    A[Arcane] --> B[Elemental]
    A --> C[Spiritforge]
```

**Important:** Diagram files contain ONLY frontmatter and Mermaid code. No prose explanations.

---

## BOOK.md Frontmatter

**Location:** `/manuscript/BOOK.md`

**Purpose:** Book-level metadata and tracking.

**Required Fields:**

```yaml
---
title: "Book Title Here"
author: "Author Name"
genre: fantasy
status: draft
word-count-target: 100000
word-count-current: 0
created: 2026-01-01
---
```

**Field Specifications:**

| Field | Type | Required | Values | Description |
|-------|------|----------|--------|-------------|
| `title` | string | Yes | Any | Book title (quoted) |
| `author` | string | Yes | Any | Author name (quoted) |
| `genre` | string | Yes | fantasy, sci-fi, fiction | Primary genre |
| `status` | string | Yes | draft, revision, final | Current status |
| `word-count-target` | integer | Yes | 50000-200000 | Target word count |
| `word-count-current` | integer | Yes | 0+ | Current word count |
| `created` | date | Yes | YYYY-MM-DD | Creation date |

**Optional Fields:**

```yaml
series: "Series Name"
series-number: 1
subtitle: "The Dragon's Return"
updated: 2026-01-15
completion-percentage: 45
```

**Example:**

```yaml
---
title: "The Dragon's Crown"
author: "Jane Author"
genre: fantasy
status: draft
word-count-target: 100000
word-count-current: 23450
created: 2026-01-01
updated: 2026-01-15
series: "The Dragon Saga"
series-number: 1
completion-percentage: 23
---

# The Dragon's Crown

A young mage discovers an ancient prophecy that will change the fate of the kingdom...
```

---

## PART.md Frontmatter

**Location:** `/manuscript/part-{number}-{name}/PART.md`

**Purpose:** Part-level metadata and story arc summary.

**Required Fields:**

```yaml
---
part-number: 1
title: "The Awakening"
status: draft
word-count: 0
created: 2026-01-01
summary: |
  Brief summary of this story arc.
  Can be multiple lines.
bullet-points:
  - Key event 1
  - Key event 2
  - Key event 3
prerequisites:
  requires-parts: []
  world-state:
    time-elapsed: "start of book"
    location-shift: "village to academy"
establishes:
  - plot-point-1
  - character-development-1
---
```

**Field Specifications:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `part-number` | integer | Yes | Sequential part number (1, 2, 3...) |
| `title` | string | Yes | Part title (quoted) |
| `status` | string | Yes | draft, revision, final |
| `word-count` | integer | Yes | Current word count for this part |
| `created` | date | Yes | Creation date (YYYY-MM-DD) |
| `summary` | string (multiline) | Yes | Arc summary paragraph |
| `bullet-points` | array of strings | Yes | 3-7 key events in this arc |
| `prerequisites.requires-parts` | array of integers | Yes | Prior parts needed (empty if part 1) |
| `prerequisites.world-state` | object | Yes | World state context |
| `establishes` | array of strings | Yes | What this part sets up |

**Optional Fields:**

```yaml
updated: 2026-01-15
themes:
  - coming-of-age
  - sacrifice
chapter-count: 5
```

**Example:**

```yaml
---
part-number: 1
title: "The Awakening"
status: draft
word-count: 18450
created: 2026-01-01
updated: 2026-01-10
summary: |
  The protagonist discovers their latent magical abilities during a crisis
  in their village. They are recruited to the Academy and begin their
  training, facing initial challenges and meeting their mentor.
bullet-points:
  - Discovery of magic during village attack
  - Journey to the Academy with guardian
  - First day trials and sorting
  - Meeting the mentor who recognizes potential
  - First successful spell casting
  - Introduction to rival student
  - Revelation of ancient prophecy
prerequisites:
  requires-parts: []
  world-state:
    time-elapsed: "start of book"
    location-shift: "rural village to capital city academy"
    political-state: "peace, but rumors of darkness"
establishes:
  - protagonist-magical-ability
  - mentor-protagonist-relationship
  - academy-setting-and-rules
  - prophecy-introduction
  - rival-antagonism
themes:
  - coming-of-age
  - self-discovery
chapter-count: 7
---
```

---

## CHAPTER.md Frontmatter

**Location:** `/manuscript/part-*/chapter-{number}-{name}/CHAPTER.md`

**Purpose:** Chapter-level metadata and tracking.

**Required Fields:**

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
  character-states: {}
active-tensions:
  - Tension or question 1
  - Tension or question 2
establishes:
  - What this chapter sets up
---
```

**Field Specifications:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `chapter-number` | integer | Yes | Sequential within part (1, 2, 3...) |
| `title` | string | Yes | Chapter title (quoted) |
| `status` | string | Yes | draft, revision, final |
| `word-count` | integer | Yes | Current word count |
| `created` | date | Yes | Creation date |
| `pov-character` | string | Yes | Character ID for POV |
| `prerequisites.requires-chapters` | array | Yes | Prior chapter dependencies |
| `prerequisites.character-states` | object | Yes | Required character states |
| `active-tensions` | array of strings | Yes | Questions/tensions in chapter |
| `establishes` | array of strings | Yes | What chapter sets up |

**Optional Fields:**

```yaml
updated: 2026-01-15
scene-count: 4
location-primary: academy-courtyard
time-of-day: morning
```

**Example:**

```yaml
---
chapter-number: 1
title: "First Dawn"
status: draft
word-count: 3200
created: 2026-01-05
updated: 2026-01-06
pov-character: protagonist
prerequisites:
  requires-chapters: []
  character-states:
    protagonist:
      location: village-home
      emotional: anxious
      knowledge: unaware-of-magic
      physical: healthy
active-tensions:
  - Will the protagonist discover their powers?
  - What is causing the disturbance in the forest?
  - Why does the protagonist feel different today?
establishes:
  - protagonist-normal-life
  - inciting-incident-setup
  - first-hint-of-magic
scene-count: 3
location-primary: village
time-of-day: dawn-to-morning
---
```

---

## scene-*.md Frontmatter

**Location:** `/manuscript/part-*/chapter-*/scene-{number}-{name}.md`

**Purpose:** Scene-level metadata and prerequisites.

**Required Fields:**

```yaml
---
scene-number: 1
title: "Morning Light"
status: draft
word-count: 0
created: 2026-01-01
pov-character: protagonist
scene-type: action
prerequisites:
  prior-scene: null
  immediate:
    time: "dawn"
    location: "protagonist-bedroom"
    weather: "clear"
    lighting: "soft morning light"
  characters-present:
    - id: protagonist
      state: "waking"
  sensory:
    dominant: "sight"
    secondary: "sound"
    ambient: "touch"
  mood: "calm"
  tension-level: low
  pov-state:
    current-thought: ""
    current-fear: ""
    physical-sensation: ""
  relevant-world-facts: []
  token-budget:
    max-context: 1500
establishes:
  - scene-beat-1
---
```

**Field Specifications:**

| Field | Type | Required | Values/Description |
|-------|------|----------|-------------------|
| `scene-number` | integer | Yes | Sequential within chapter |
| `title` | string | Yes | Scene title (quoted) |
| `status` | string | Yes | draft, revision, final |
| `word-count` | integer | Yes | Current word count |
| `created` | date | Yes | Creation date |
| `pov-character` | string | Yes | Character ID for POV |
| `scene-type` | string | Yes | action, dialogue, introspection, transition |
| `prerequisites.prior-scene` | string or null | Yes | ID of prior scene or null |
| `prerequisites.immediate.time` | string | Yes | Time of day/period |
| `prerequisites.immediate.location` | string | Yes | Location ID |
| `prerequisites.immediate.weather` | string | Yes | Weather conditions |
| `prerequisites.immediate.lighting` | string | Yes | Lighting conditions |
| `prerequisites.characters-present` | array | Yes | Characters in scene |
| `prerequisites.sensory.dominant` | string | Yes | sight, sound, touch, smell, taste |
| `prerequisites.sensory.secondary` | string | Yes | Secondary sense |
| `prerequisites.sensory.ambient` | string | Yes | Background sense |
| `prerequisites.mood` | string | Yes | Overall mood/atmosphere |
| `prerequisites.tension-level` | string | Yes | low, medium, high |
| `prerequisites.pov-state` | object | Yes | POV character's internal state |
| `prerequisites.relevant-world-facts` | array | Yes | World facts needed for context |
| `prerequisites.token-budget.max-context` | integer | Yes | Max context tokens (500-2000) |
| `establishes` | array of strings | Yes | Scene beats/events |

**Optional Fields:**

```yaml
updated: 2026-01-15
notes: "Remember to foreshadow the mentor's arrival"
revision-focus: "Strengthen protagonist's voice"
```

**Example:**

```yaml
---
scene-number: 1
title: "Morning Light"
status: draft
word-count: 850
created: 2026-01-05
updated: 2026-01-06
pov-character: protagonist
scene-type: introspection
prerequisites:
  prior-scene: null
  immediate:
    time: "dawn, first light"
    location: "protagonist-bedroom"
    weather: "clear, crisp"
    lighting: "soft golden dawn light through window"
  characters-present:
    - id: protagonist
      state: "waking, slightly anxious"
  sensory:
    dominant: "sight"
    secondary: "touch"
    ambient: "sound"
  mood: "anticipation mixed with unease"
  tension-level: low
  pov-state:
    current-thought: "Something feels different today"
    current-fear: "undefined sense of change"
    physical-sensation: "tingling in fingertips"
  relevant-world-facts:
    - "magic-system:latent-magic-awakening"
    - "world:village-isolated-from-academy"
  token-budget:
    max-context: 1500
establishes:
  - protagonist-waking-on-fateful-day
  - first-physical-sign-of-magic
  - protagonist-anxiety-about-change
notes: "First hint of protagonist's magic should be subtle"
revision-focus: "Internal voice should show character personality"
---

# Scene 1: Morning Light

The protagonist woke to the first rays of dawn streaming through the window...
```

---

## character/profile.md Frontmatter

**Location:** `/characters/{character-id}/profile.md`

**Purpose:** Character profile and tracking.

**Required Fields:**

```yaml
---
id: protagonist
name: "Character Name"
type: main
role: protagonist
created: 2026-01-01
status: active
age: 17
appearance: |
  Physical description paragraph.
traits:
  - Trait 1
  - Trait 2
motivations:
  - Primary motivation
fears:
  - Primary fear
speech-patterns:
  internal: "First-person present tense"
  dialogue: "Hesitant, questions a lot"
voice-example: |
  "I... I'm not sure. Maybe we should wait?"
starting-state: |
  State at book beginning.
character-arc: |
  Intended development.
---
```

**Field Specifications:**

| Field | Type | Required | Values/Description |
|-------|------|----------|-------------------|
| `id` | string | Yes | Unique character ID (kebab-case) |
| `name` | string | Yes | Character's name (quoted) |
| `type` | string | Yes | main, supporting, minor |
| `role` | string | Yes | protagonist, antagonist, mentor, ally, etc. |
| `created` | date | Yes | Creation date |
| `status` | string | Yes | active, inactive, deceased |
| `age` | integer or string | Yes | Age or age range |
| `appearance` | string (multiline) | Yes | Physical description |
| `traits` | array of strings | Yes | 3-7 personality traits |
| `motivations` | array of strings | Yes | What drives character |
| `fears` | array of strings | Yes | What character fears |
| `speech-patterns.internal` | string | Yes | Internal thought style |
| `speech-patterns.dialogue` | string | Yes | Dialogue style |
| `voice-example` | string (multiline) | Yes | Example of character voice |
| `starting-state` | string (multiline) | Yes | State at book start |
| `character-arc` | string (multiline) | Yes | Planned development |

**Optional Fields:**

```yaml
aliases:
  - "Nickname"
  - "Title"
relationships:
  mentor: "respectful, seeking approval"
  rival: "competitive, insecure"
backstory: |
  Detailed backstory paragraph.
skills:
  - Combat training
  - Magic affinity
weaknesses:
  - Impulsive
  - Trusts too easily
```

**Example:**

```yaml
---
id: protagonist
name: "Elara Moonwhisper"
type: main
role: protagonist
created: 2026-01-01
status: active
age: 17
appearance: |
  Seventeen, slight build, silver-blonde hair often tied back hastily.
  Gray eyes that seem to shift color with emotion. Often wears simple
  village clothes in earth tones. Has a nervous habit of fidgeting
  with a silver bracelet (family heirloom).
traits:
  - Curious and eager to learn
  - Anxious about expectations
  - Compassionate toward others
  - Self-doubting despite ability
  - Quietly determined
motivations:
  - Discover the truth about her powers
  - Protect her village and family
  - Prove she belongs at the Academy
  - Understand the ancient prophecy
fears:
  - Losing control of her magic
  - Disappointing her mentor
  - Being rejected by peers
  - The prophecy's implications
speech-patterns:
  internal: "First-person present, questioning, observant"
  dialogue: "Hesitant at first, grows more confident. Often asks questions."
voice-example: |
  "I... I didn't mean to. The magic just—it just happened. I don't
  understand how I did it. Can you teach me to control it?"
starting-state: |
  Living in a rural village, unaware of magical heritage. Anxious about
  an undefined sense of being different. Close relationship with
  grandmother who hints at family secrets.
character-arc: |
  From anxious, self-doubting village girl to confident young mage who
  accepts her destiny. Learns to trust her instincts and embrace her
  power. Grows from reactive to proactive.
relationships:
  mentor: "Initially intimidated, grows to deep respect and trust"
  rival: "Starts antagonistic, develops mutual respect"
  guardian: "Protective relationship, sees as parental figure"
backstory: |
  Orphaned as an infant, raised by grandmother in remote village.
  Always felt different but couldn't explain why. Dreams of ancient
  battles and magic. Family has hidden magical lineage.
skills:
  - Quick learner
  - Herbalism (from grandmother)
  - Archery (village training)
  - Empathy and intuition
weaknesses:
  - Self-doubt undermines ability
  - Impulsive when protecting others
  - Difficulty asking for help
  - Trusts too quickly
---
```

---

## Metadata Validation Rules

The `writer validate` command checks:

1. **Required fields present**
   - All fields in "Required Fields" must exist
   - No missing YAML frontmatter

2. **Field types correct**
   - Integers are numeric
   - Dates match YYYY-MM-DD format
   - Arrays are proper YAML lists
   - Multiline strings use `|` or `>` syntax

3. **Field values valid**
   - Status: draft, revision, or final
   - Scene-type: action, dialogue, introspection, or transition
   - Tension-level: low, medium, or high
   - Sensory: sight, sound, touch, smell, or taste

4. **Cross-references valid**
   - Character IDs exist in `/characters/_index.md`
   - Location IDs exist in `/world/_index.md`
   - Prior scenes exist
   - Required chapters exist

5. **Naming conventions**
   - IDs are kebab-case
   - Numbers are zero-padded 3 digits
   - Titles are quoted strings

---

## Metadata Evolution

**During drafting:**
- `status: draft`
- Word counts may be 0 or estimates
- Establishes and prerequisites are placeholders

**During revision:**
- `status: revision`
- Word counts accurate
- All cross-references validated
- Prerequisites complete

**Final version:**
- `status: final`
- All metadata complete and accurate
- All validations pass
- Ready for export/publication

---

## Quick Reference Table

| Artifact | Location | Key Fields |
|----------|----------|-----------|
| Book | `/manuscript/BOOK.md` | title, author, genre, status, word-count-target |
| Part | `/manuscript/part-*/PART.md` | part-number, title, summary, bullet-points, prerequisites |
| Chapter | `/manuscript/part-*/chapter-*/CHAPTER.md` | chapter-number, title, pov-character, active-tensions |
| Scene | `/manuscript/part-*/chapter-*/scene-*.md` | scene-number, title, scene-type, prerequisites, establishes |
| Character | `/characters/{id}/profile.md` | id, name, type, role, traits, motivations, voice-example |

---

## Common Mistakes

❌ **Missing frontmatter entirely**
- Every file needs `---` delimiters
- Every file needs required fields

❌ **Inconsistent field names**
- Use `title` not `name` for titles
- Use `pov-character` not `pov` or `character`

❌ **Invalid status values**
- Must be: draft, revision, or final
- Not: in-progress, complete, done

❌ **Missing prerequisites in scenes**
- Scenes must declare all prerequisite fields
- Cannot be omitted even if null

❌ **Incorrect date format**
- Must be: YYYY-MM-DD
- Not: MM/DD/YYYY or DD-MM-YYYY

❌ **Character IDs not in kebab-case**
- Must be: protagonist, dark-lord, mentor-sage
- Not: Protagonist, DarkLord, mentor_sage

---

**Related Documents:**
- [SKILL.md](./SKILL.md) - Main skill documentation
- [FOLDER-STRUCTURE.md](./FOLDER-STRUCTURE.md) - Complete folder layout
- [DOMAINS.md](./DOMAINS.md) - Domain organization rules
- [SSOT-RULES.md](./SSOT-RULES.md) - Single source of truth patterns

---

**Version:** 2.0.0
**Last Updated:** 2026-01-10
