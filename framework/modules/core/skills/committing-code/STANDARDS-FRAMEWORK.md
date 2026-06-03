# Managing Git Workflows: Framework Versioning Standards

## Plan-Based Work Format

### Plan Creation Commits

**Pattern:**
```
PLAN-<NUMBER>: <Short-Description>

✨ Objective 1 description
🎯 Objective 2 description
📋 Objective 3 description
🔧 Objective 4 description (if applicable)

Plan file: ai/plans/{category}/{number}-{name}/PLAN.md
Status: 🔶 PROPOSED - PENDING REVIEW
```

**Rules:**
- Number: Zero-padded 3 digits (001, 002, 003...)
- Short-description: 2-4 words, kebab-case style in folder names
- Emojis: Different emoji per objective/bullet point
- Each objective: Clear and actionable
- Plan file location: ai/plans/framework/{number}-{name}/ or ai/plans/apm-r/{number}-{name}/
- Status: Always include initial status (PROPOSED or IN PROGRESS)

**Example:**
```
PLAN-001: Framework consolidation v11.1

✨ Consolidate routes and registry architecture
🎯 Create shared knowledge skills
📋 Update all framework references
🔧 Clean up legacy files
📚 Document architecture patterns

Plan file: ai/plans/framework/001-consolidation-v11.1/PLAN.md
Status: 🔶 PROPOSED - PENDING REVIEW
```

### Phase Execution Commits

**Pattern:**
```
PLAN-<NUMBER>-PHASE-<NUMBER>: <Phase-Title>

✅ Deliverable 1 completed
✅ Deliverable 2 completed
✅ Deliverable 3 completed
✅ Deliverable 4 completed (if applicable)

Validation: All success metrics met
Next phase: PLAN-<NUMBER>-PHASE-<NEXT> ready to start
```

**Rules:**
- Plan number: Zero-padded 3 digits (001, 002, 003...)
- Phase number: Sequential, zero-padded 2 digits (01, 02, 03...)
- Deliverables: Use ✅ emoji for each concrete deliverable
- Deliverables: Describe what was actually completed, not what was planned
- Validation: Note that success metrics were validated
- Next phase: Indicate readiness for next phase (if applicable)
- Each commit is atomic: One phase per commit

**Example Phase Commit:**
```
PLAN-001-PHASE-01: Create generic skills and infrastructure

✅ Created generic-shared-understanding-framework-architecture-knowledge skill
✅ Created building-skills skill
✅ Created DISCOVERY-ENGINE-ARCHITECTURE.md with complete design rationale
✅ Updated ai/registry.yml with new skill metadata
✅ Updated README.md with skill references

Validation: All 4 new skills tested and functional
Next phase: PLAN-001-PHASE-02 ready (Update framework agents)
```

### Plan Completion Commits

**Pattern:**
```
PLAN-<NUMBER>-COMPLETE: <Plan-Name> - All Phases Done

✅ Phase 1: [description] - COMPLETE
✅ Phase 2: [description] - COMPLETE
✅ Phase 3: [description] - COMPLETE
✅ Phase N: [description] - COMPLETE

Total phases: N (all completed)
Status file: ai/plans/{category}/{number}-{name}/PROGRESS.md
Version tag: [if applicable] vX.Y.Z

See: ai/plans/README.md for plan retention policy
```

**Rules:**
- Format: `PLAN-{number}-COMPLETE: {Plan-Name} - All Phases Done`
- List all phases with ✅ emoji and status
- Include total phase count
- Reference PROGRESS.md file for detailed tracking
- If framework version was updated: Include version tag (e.g., v11.1)
- Include reference to plan retention policy

**Example Completion Commit:**
```
PLAN-001-COMPLETE: Framework Consolidation v11.1 - All Phases Done

✅ Phase 1: Create generic skills and infrastructure - COMPLETE
✅ Phase 2: Update framework agents - COMPLETE
✅ Phase 3: Clean up legacy documentation - COMPLETE
✅ Phase 4: Update all references - COMPLETE
✅ Phase 5: Validation and documentation - COMPLETE

Total phases: 5 (all completed)
Status file: ai/plans/framework/001-consolidation-v11.1/PROGRESS.md
Version tag: v11.1

Plan remains in repository as historical record.
See: ai/plans/README.md for retention policy.
```

---

## Framework Improvement Format

**Pattern:**
```
[vX.Y] <type>: <description>
```

**Examples:**
```
[v11.0] feat: add skills integration
[v10.1] fix: resolve link validation bug
[v9.2] docs: update governance rules
```

**Rules:**
- Version tag in brackets: `[vX.Y]`
- Type: feat, fix, refactor, docs, etc.
- Description: Specific change being made
- Subject length: Max 50 chars total

## Versioning

**Format:** Semantic versioning
- `vX.Y.Z` (Major.Minor.Patch)
- Example: v11.0, v11.0.1, v11.1

**When to bump:**
- **Major (X):** Breaking changes, large architecture shifts
- **Minor (Y):** New features, non-breaking additions
- **Patch (Z):** Bug fixes, small improvements

## Tagging

**Create tag for each version:**
```bash
git tag -a v11.0 -m "v11.0: Skills-Based Architecture"
git push origin --tags
```

**Tag naming:** `vX.Y.Z` only (no prefix)

## Changelog

**Update format:** Keep consistent with existing
- List changes by type (Features, Fixes, etc.)
- Include ticket numbers
- Include author names
- Date each version

**Example:**
```
## v11.0 (2025-12-04)

### Features
- Added skills-based specialization architecture
- Added 2 meta-skills (building-claude-skills, maintaining-framework-governance)
- Added 3 infrastructure skills (Phase 1B ready)

### Framework Improvements
- Introduced skills directory structure
- Set up 2-layer symlink strategy
- Updated governance rules (6 rules for v11.0)

### Documentation
- Added v11.0 strategic plan
- Added completion tracking
- Added continuation guides
```

## Commit Checklist for Framework Changes

- [ ] **Version tag included?** [vX.Y]
- [ ] **Changelog updated?** (if script exists)
- [ ] **Registry updated?** (if adding features)
- [ ] **Old version → new version clear?**

## Commit Message Format for Framework

```
[v<VERSION>] <change-type>: <description>

- Change detail 1
- Change detail 2
- Change detail 3

Framework change: v<OLD> → v<NEW>
Governance rule: Rule X (if applicable)
```

## Common Mistakes & Fixes

### ❌ Unclear Version Tag
```
❌ [version 11] feat: add skills
✅ [v11.0] feat: add skills
```

### ❌ No Framework Version Note
```
❌ feat: add new skill
✅ [v11.0] feat: add new skill
   Framework: v10.0 → v11.0
```

---

**Standards Category:** Framework Versioning & Tagging
**Last Updated:** Dec 6, 2025
**See Also:** [Commit Standards](STANDARDS-COMMITS.md), [Branch Standards](STANDARDS-BRANCHES.md), [Ticket Standards](STANDARDS-TICKETS.md)
