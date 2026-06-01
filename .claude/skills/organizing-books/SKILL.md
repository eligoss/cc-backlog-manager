---
id: writer-organizing-books-workflow
module: writer
name: writer-organizing-books-workflow
description: Enforce book folder structure with domain-driven organization and single source of truth principles. Use when creating or restructuring book projects, world-building, or validating organization.
scope: project-specific
applicable-projects: writer
capabilities-provided:
  - book-organization
  - domain-structure
  - ssot-enforcement
cli-commands:
  init:
    command: "writer init"
    description: "Initialize a new book project"
  create-part:
    command: "writer create-part"
    description: "Create a new part (story arc)"
  create-chapter:
    command: "writer create-chapter"
    description: "Create a new chapter"
  create-scene:
    command: "writer create-scene"
    description: "Create a new scene"
  validate:
    command: "writer validate"
    description: "Validate book structure"
---

# Skill: Book Organization v2

**Skill Name:** writer-organizing-books-workflow

**Type:** Workflow Enforcement

**Purpose:** Enforce domain-driven book organization with single source of truth (SSOT) principles

**Version:** 2.0.0 (SSOT + DDD Hybrid)

---

## When to Use This Skill

- Starting or restructuring book projects
- Creating manuscript, character, or world files
- Enforcing SSOT principles (no duplicate facts)
- Validating domain organization
- Moving or splitting world files

---

## Quick Start

1. **Use CLI to create structures** - Don't create files manually
2. **Each fact lives in ONE file** - Mark with `ssot: true` in frontmatter
3. **Reference with markdown links** - `[text](path.md#anchor)` for cross-references
4. **Diagrams are visual only** - `.mmd` files contain only Mermaid, no prose
5. **Domains own their facts** - history/, magic/, politics/, geography/

---

## Core Principles (v2)

### Principle 1: Domain-Driven Organization

World content is organized by **domain**, not by file type:

| Domain | Purpose | Key Files |
|--------|---------|-----------|
| `history/` | Everything temporal | `timeline-master.md`, `events/` |
| `magic/` | All magic systems | `fundamental-laws.md`, `schools/`, `crystals/` |
| `politics/` | Nations, governments | `arcane-empire/`, `trade-league/` |
| `geography/` | Physical world | `caldris/`, `fourfold-sea.md` |
| `artifacts/` | Plot-relevant objects | `ascendant-crystal.md` |
| `core/` | Universal rules | `races.md`, `economy.md` |

See: [DOMAINS.md](./DOMAINS.md) for complete domain specifications.

### Principle 2: Single Source of Truth (SSOT)

Each fact exists in exactly ONE file:

```yaml
---
domain: magic
ssot: true                    # This file is authoritative
ssot-topic: crystal-mechanics # For what topic
---
```

- **Never duplicate facts** - Reference instead
- **Mark authority clearly** - Use `ssot: true` for authoritative files
- **Update one place** - Changes propagate via links

See: [SSOT-RULES.md](./SSOT-RULES.md) for reference patterns.

### Principle 3: Navigatable Links

Cross-references use standard markdown:

```markdown
See [Crystal Mechanics](../magic/crystals/mechanics.md#recharging) for details.
```

- Use relative paths
- Include anchor links for specific sections
- Works in VitePress, VS Code, and IDEs

### Principle 4: Diagrams Are Visual Only

Diagram files (`.mmd`) contain ONLY Mermaid code:

```
world/magic/diagrams/
├── schools.mmd          # Mermaid diagram, no prose
└── crystal-tech.mmd     # Mermaid diagram, no prose
```

- No prose descriptions in diagram files
- Place diagrams inside their domain's `diagrams/` folder
- Reference source files in frontmatter

### Principle 5: No Baseline Directory

Story opening state lives in **manuscript prerequisites**, not a separate baseline/:

```yaml
# In manuscript/part-001-the-journey/PART.md
prerequisites:
  world-state:
    time-period: "Crystal Era, ~100 years after Iron Peace"
    political-climate: "Uneasy peace, Trade League rising"
  protagonist-state:
    location: "Ladris, 80km from Nexus"
    emotional: "Grief with hope and fear"
```

Character states live in character profiles, not baseline files.

---

## World Structure (v2)

```
world/
├── index.md                    # World overview with domain links
├── history/
│   ├── index.md
│   ├── timeline-master.md      # SSOT for temporal facts
│   ├── diagrams/timeline.mmd
│   ├── eras/
│   └── events/
├── magic/
│   ├── index.md
│   ├── fundamental-laws.md     # SSOT for power levels
│   ├── diagrams/
│   ├── schools/
│   ├── crystals/
│   └── spellcraft/
├── politics/
│   ├── index.md
│   ├── diagrams/nations.mmd
│   ├── arcane-empire/
│   ├── trade-league/
│   ├── light-dominion/
│   └── vardun-crown/
├── geography/
│   ├── index.md
│   ├── diagrams/
│   ├── caldris/
│   └── [other regions]/
├── artifacts/
├── core/
├── creatures/
└── transport/
```

See: [FOLDER-STRUCTURE.md](./FOLDER-STRUCTURE.md) for complete layout.

---

## Anti-Patterns (v2)

**Duplicating facts across files**
- Each fact in ONE file only
- Reference, don't repeat
- Fix: Add markdown links to source

**Prose in diagram files**
- `.mmd` files contain only Mermaid code
- No explanatory text
- Fix: Move prose to domain index or source file

**Baseline files for story state**
- No separate `baseline/` directory
- Fix: Use manuscript prerequisites for world state
- Fix: Use character profiles for character state

**Cross-domain fact ownership**
- Each domain owns its facts completely
- Fix: Crystal mechanics → magic domain
- Fix: National history → politics domain (reference history)

**Creating files without CLI**
- Loses auto-numbering consistency
- Fix: Always use `writer create-*` commands

---

## Enforcement Checklist (v2)

**When creating world files:**
- [ ] File belongs to correct domain
- [ ] Authority files have `ssot: true`
- [ ] Cross-references use markdown links
- [ ] No duplicate facts from other files
- [ ] Diagram files contain only Mermaid

**When modifying facts:**
- [ ] Change in the SSOT file only
- [ ] Update links if path changes
- [ ] Run `writer validate` after changes

**When restructuring:**
- [ ] Use `git mv` to preserve history
- [ ] Update all relative links
- [ ] Verify diagrams moved to domain folders
- [ ] No baseline/ directory exists

---

## Progressive Disclosure

This skill uses progressive disclosure. Load supporting files as needed:

- [DOMAINS.md](./DOMAINS.md) - Complete domain specifications
- [SSOT-RULES.md](./SSOT-RULES.md) - Single source of truth patterns
- [FOLDER-STRUCTURE.md](./FOLDER-STRUCTURE.md) - Complete folder layout
- [METADATA-GUIDE.md](./METADATA-GUIDE.md) - YAML frontmatter specifications
- [IMMUTABILITY-GUIDE.md](./IMMUTABILITY-GUIDE.md) - Mutability control system

---

**Skill Version:** 2.0.0

**Module Version:** v2.0.0

**Token Budget:** ~2.5K (SKILL.md ~1.5K + supporting docs ~1K)

**Last Updated:** 2026-01-10

**Changes from v1:**
- Added domain-driven organization
- Added SSOT principles
- Removed baseline directory support
- Diagrams moved into domains
- Added navigatable link requirements
