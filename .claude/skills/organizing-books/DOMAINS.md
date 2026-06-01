---
title: "Domain Organization Guide"
type: skill-support
skill: writer-organizing-books-workflow
---

# Domain Organization Guide

Complete specifications for the domain-driven world structure.

## Domain Definitions

### History Domain (`world/history/`)

**Purpose:** Everything temporal - eras, events, timeline

**Authority Files:**
| File | SSOT Topic | Description |
|------|------------|-------------|
| `timeline-master.md` | temporal-facts | Complete historical record |
| `events/*.md` | specific-events | Individual event narratives |

**Subdirectories:**
- `eras/` - Era descriptions and philosophy
- `events/` - Individual historical events
- `diagrams/` - Timeline visualizations (.mmd only)

**Cross-Domain References:**
- Reference `politics/` for national histories
- Reference `magic/` for magical history context

---

### Magic Domain (`world/magic/`)

**Purpose:** All magic systems, crystals, power levels

**Authority Files:**
| File | SSOT Topic | Description |
|------|------------|-------------|
| `fundamental-laws.md` | power-levels | 15-level power system |
| `index.md` | magic-overview | Five schools summary |
| `crystals/mechanics.md` | crystal-mechanics | How crystals work |
| `crystals/types.md` | crystal-types | Crystal generations |
| `crystals/applications.md` | crystal-uses | Devices and infrastructure |

**Subdirectories:**
- `schools/` - Individual magic school details (arcane, elemental, spiritforge, light, nature)
- `crystals/` - Crystal technology (mechanics, types, applications)
- `spellcraft/` - Casting mechanics, spell libraries
- `diagrams/` - Magic system visualizations (.mmd only)

---

### Politics Domain (`world/politics/`)

**Purpose:** Nations, governments, cultures, political dynamics

**Authority Files:**
| File | SSOT Topic | Description |
|------|------------|-------------|
| `index.md` | politics-overview | Four powers summary |
| `[nation]/nation.md` | national-identity | Core nation identity |
| `[nation]/government.md` | governance | Political structure |
| `[nation]/culture.md` | cultural-facts | Social norms and values |

**Nation Directories:**
- `arcane-empire/` - Caldris (Arcane State)
- `trade-league/` - Sunshine Coast (former colonies)
- `light-dominion/` - Ormyr (faith-state)
- `vardun-crown/` - Karrak (warrior culture)

**Diagrams:** `diagrams/nations.mmd`

---

### Geography Domain (`world/geography/`)

**Purpose:** Physical world, regions, cities, routes

**Authority Files:**
| File | SSOT Topic | Description |
|------|------------|-------------|
| `index.md` | geography-overview | World map logic |
| `fourfold-sea.md` | central-trade | Maritime trade theater |
| `[region]/region.md` | regional-geography | Continental details |
| `[region]/[city].md` | city-facts | City specifications |

**Region Directories:**
- `caldris/` - The White Ring (Arcane Empire territory)
- `sunshine-coast/` - Coinshore (Trade League)
- `ormyr/` - Light Dominion continent
- `karrak/` - Vardun Crown territory

**Diagrams:** `diagrams/world-map.mmd`, `diagrams/caldris-map.mmd`

---

### Artifacts Domain (`world/artifacts/`)

**Purpose:** Plot-relevant objects with detailed specifications

**Authority Files:**
| File | SSOT Topic | Description |
|------|------------|-------------|
| `ascendant-crystal.md` | ascendant-artifact | The protagonist's crystal |
| `sunburst-crystal.md` | sunburst-artifact | Lost prototype |
| `crimson-crystal.md` | crimson-artifact | Future threat |

---

### Core Domain (`world/core/`)

**Purpose:** Universal rules not specific to other domains

**Files:**
- `races.md` - Playable races
- `classes.md` - Magical vocations
- `languages-calendar.md` - Languages and time
- `economy.md` - Trade and currency
- `religion.md` - Faith systems
- `architecture.md` - Building styles
- `warfare.md` - Military systems

---

### Creatures Domain (`world/creatures/`)

**Purpose:** Threats and monsters by danger level

**Files:**
- `overview.md` - Creature classification
- `common-threats.md` - Everyday dangers
- `serious-threats.md` - Significant monsters
- `catastrophic-threats.md` - World-level threats

---

### Transport Domain (`world/transport/`)

**Purpose:** Movement systems and routes

**Files:**
- `overview.md` - Transport methods
- `[nation]-routes.md` - Nation-specific systems

---

## Domain Boundary Rules

### What Goes Where

| Content Type | Domain | Example |
|--------------|--------|---------|
| When something happened | history | "Iron Peace signed ~100 years ago" |
| How magic works | magic | "15-level power system" |
| Who rules where | politics | "Apex Order governs Caldris" |
| Where things are | geography | "Nexus is coastal" |
| Plot objects | artifacts | "Ascendant Crystal properties" |
| Universal rules | core | "Common language exists" |

### Cross-Domain References

When content spans domains, the rule is:
1. **Primary fact** lives in its natural domain
2. **Other domains reference** with markdown links

**Example:**
- Crystal technology → `magic/crystals/`
- How Trade League uses crystals → `politics/trade-league/nation.md` (references magic)
- Where crystals are mined → `geography/caldris/region.md` (references magic)

### Diagram Placement

Diagrams live **inside their domain**:

```
world/history/diagrams/timeline.mmd      # NOT world/diagrams/
world/magic/diagrams/schools.mmd         # NOT world/diagrams/
world/politics/diagrams/nations.mmd      # NOT world/diagrams/
world/geography/diagrams/world-map.mmd   # NOT world/diagrams/
```

---

## Creating New Domain Content

### Adding a New File

1. Determine correct domain
2. Choose appropriate subdirectory
3. Add SSOT frontmatter if authoritative
4. Reference related files with markdown links
5. Run `writer validate` to check structure

### Adding a New Subdirectory

1. Ensure it belongs to the domain's purpose
2. Create `index.md` for navigation
3. Update domain `index.md` to link new subdirectory

### Moving Content Between Domains

1. Use `git mv` to preserve history
2. Update all incoming links
3. Update the file's `domain:` frontmatter
4. Verify no orphaned references

---

**Version:** 2.0.0
**Last Updated:** 2026-01-10
