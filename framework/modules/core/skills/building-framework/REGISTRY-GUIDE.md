# Registry Management Guide: ai/registry.yml

How to manage the framework's single source of truth for all metadata.

---

## What is registry.yml?

**registry.yml** is the SINGLE SOURCE OF TRUTH for all framework metadata:
- All 21 skills and their properties
- Agent definitions and capabilities
- Context file organization
- Framework configuration and versioning
- Project statistics and metrics

**Location:** `ai/registry.yml` (at framework root)

**Purpose:**
- Central hub for all framework information
- Enables automated discovery and validation
- Tracks progress (phases, completion status)
- Documents inter-dependencies

---

## Structure Overview

```yaml
# Main sections in registry.yml:

framework:
  version: 11.0
  name: "APM-R AI Framework"
  description: "..."

agents:
  ai-architect:
    capability: "..."
    # ... agent metadata

skills:
  validating-links:
    type: generic
    status: complete
    # ... skill metadata

context-files:
  business-advanced:
    responsibility: "..."
    # ... context metadata

# ... more sections

statistics:
  total-skills: 8
  completed-skills: 4
  # ... progress metrics
```

---

## Adding a New Skill to Registry

### Step 1: Create Skill Directory & Files
```bash
mkdir -p .claude/skills/skill-name/
# Create SKILL.md, supporting files, etc.
```

### Step 2: Add to registry.yml

**Find the `skills:` section and add entry:**

```yaml
skills:
  # ... existing skills ...

  validating-links:
    type: generic                           # generic | project-specific
    status: complete                        # planning | in-progress | complete
    version: 1.0
    phase: 1B                               # Which phase created it
    token-budget: 1500
    created-date: 2025-12-06

    # File breakdown
    files:
      - name: SKILL.md
        lines: 350
        purpose: "Core skill reference and instructions"
      - name: EXAMPLES.md
        lines: 350
        purpose: "Real-world validation examples"
      - name: STANDARDS.md
        lines: 400
        purpose: "Link validation standards and rules"

    # Metadata
    description: "Validate markdown links for broken files, URLs, and anchors"
    scope: generic
    applicable-projects: any

    # Dependencies
    depends-on:
      - building-claude-skills  # Reference template used
      - managing-git-workflows  # MCP integration pattern reference

    used-by:
      - ai-framework-manager    # Framework validation
      - ai-confluence-manager   # Pre-publish link check

    # Quality
    quality-score: 85
    qa-date: 2025-12-06
    tested-models:
      - claude-3-5-sonnet
      - claude-opus
      - claude-haiku

    # Location
    directory: .claude/skills/validating-links/
    git-commit: "abc1234"  # Commit hash when created
```

### Step 3: Verify YAML Syntax

```bash
# Check YAML is valid
python3 -c "import yaml; yaml.safe_load(open('ai/registry.yml'))" && echo "✅ Valid YAML"
```

### Step 4: Update Statistics

Find the `statistics:` section and update totals:

```yaml
statistics:
  # Skills
  total-skills: 8
  complete-skills: 4
  in-progress-skills: 1
  planned-skills: 3

  # By type
  generic-skills: 5
  project-specific-skills: 3

  # By phase
  phase-1a-skills: 3
  phase-1b-skills: 1
  phases-2-5-skills: 4

  # Progress
  phase-1-completion: 50%
  framework-completion: 19%

  # Tokens
  total-token-budget: 21000
  used-tokens: 4500
  available-budget: 16500
```

### Step 5: Update Framework Version Info

If creating a new Phase, update framework version:

```yaml
framework:
  version: 11.0          # Increment if major change
  last-updated: 2025-12-07
  phase-in-progress: 1B

  phases:
    1A:
      status: complete
      completion-date: 2025-12-04
      skills-count: 3
    1B:
      status: in-progress
      started: 2025-12-06
      estimated-completion: 2025-12-20
      skills-count: 3
```

---

## Maintaining Skill Metadata

### When Updating a Skill:

1. **Change Status:**
   ```yaml
   validating-links:
     status: planning → in-progress  # Update
   ```

2. **Change Token Budget:**
   ```yaml
   validating-links:
     token-budget: 1500 → 1800       # If files grew
   ```

3. **Update Quality Score:**
   ```yaml
   validating-links:
     quality-score: 80 → 85          # After QA evaluation
     qa-date: 2025-12-07             # When evaluated
   ```

4. **Add Test Results:**
   ```yaml
   validating-links:
     tested-models:
       - claude-3-5-sonnet ✅ PASSED
       - claude-opus ✅ PASSED
       - claude-haiku ✅ PASSED
   ```

### Before Committing Changes:

```bash
# 1. Validate YAML
python3 -c "import yaml; yaml.safe_load(open('ai/registry.yml'))" && echo "✅ Valid"

# 2. Verify all skills listed
grep "^  [a-z-]*:" ai/registry.yml | wc -l

# 3. Check statistics match actual count
# (Manual verification)

# 4. Commit with message
git add ai/registry.yml
git commit -m "docs: update registry with skill metadata (skill-name)"
```

---

## Registry Examples

### Complete Skill Entry (Generic)

```yaml
validating-links:
  type: generic
  status: complete
  version: 1.0
  phase: 1B
  token-budget: 1500
  created-date: 2025-12-06

  files:
    - name: SKILL.md
      lines: 350
      purpose: "Core skill reference"
    - name: EXAMPLES.md
      lines: 350
      purpose: "Real validation examples"
    - name: STANDARDS.md
      lines: 400
      purpose: "Validation standards and rules"

  description: "Validate markdown links for broken files, URLs, and anchors. Use when reviewing documentation for link integrity."
  scope: generic
  applicable-projects: any

  depends-on:
    - building-claude-skills
    - managing-git-workflows

  used-by:
    - ai-framework-manager
    - ai-confluence-manager

  quality-score: 85
  qa-date: 2025-12-06
  tested-models:
    - claude-3-5-sonnet
    - claude-opus
    - claude-haiku

  directory: .claude/skills/validating-links/
  git-commit: "abc1234defg5678"
```

### Complete Skill Entry (Project-Specific)

```yaml
building-framework:
  type: project-specific
  status: complete
  version: 1.0
  phase: 1A
  token-budget: 2000
  created-date: 2025-12-04

  files:
    - name: SKILL.md
      lines: 395
      purpose: "Core governance reference"
    - name: SCOPE-DECISION-TREE.md
      lines: 250
      purpose: "Generic vs project-specific decision"
    - name: EXAMPLES.md
      lines: 350
      purpose: "Real governance scenarios"
    - name: GOVERNANCE-RULES.md
      lines: 400
      purpose: "Detailed rule documentation"
    - name: REGISTRY-GUIDE.md
      lines: 300
      purpose: "registry.yml management"

  description: "Maintain APM-R framework governance, rules, and consistency. Use when making architectural decisions, creating skills, or validating framework improvements."
  scope: project-specific
  applicable-projects: apmr

  depends-on:
    - building-skills

  used-by:
    - ai-framework-manager
    - ai-framework-developer

  quality-score: 90
  qa-date: 2025-12-06
  tested-models:
    - claude-3-5-sonnet
    - claude-opus

  directory: .claude/skills/building-framework/
  git-commit: "def5678abc1234g"
```

---

## Sections Explained

### `type` - Skill Classification
```yaml
type: generic | project-specific

generic:        Works in any project, stored in .claude/skills/
project-specific: APM-R only, stored in .claude/skills/
```

### `status` - Lifecycle Stage
```yaml
status: planning | in-progress | complete

planning:    Design phase, not started
in-progress: Being built or refined
complete:    Finished, tested, and operational
```

### `phase` - Framework Development Phase
```yaml
phase: 1A | 1B | 2 | 3 | 4 | 5

1A: Meta-skills foundation
1B: Infrastructure skills
2-5: Extended skills (validation, conversion, reporting, etc.)
```

### `quality-score` - QA Evaluation Result
```yaml
quality-score: 80/100

Scoring:
  90-100: Excellent (gold standard)
  80-89:  Very Good (operational)
  70-79:  Good (usable with minor improvements)
  <70:    Needs work (fix before using)

80+ = Ready for production use
```

### `tested-models` - Verified Compatibility
```yaml
tested-models:
  - claude-3-5-sonnet    # Primary model
  - claude-opus          # Advanced tasks
  - claude-haiku         # Basic usage

All three should be tested for Phase 1 skills
```

### `depends-on` - Required References
```yaml
depends-on:
  - building-claude-skills  # Template used
  - managing-git-workflows  # Pattern reference

Lists skills used as templates or inspiration
```

### `used-by` - Consumers
```yaml
used-by:
  - ai-framework-manager    # Agent using this skill
  - ai-confluence-manager   # Another agent
  - framework-validation    # Or framework process

Lists what depends on this skill
```

---

## Common Tasks

### Task: Mark Skill Complete

**Before:**
```yaml
formatting-markdown:
  status: in-progress
  quality-score: 75
```

**After:**
```yaml
formatting-markdown:
  status: complete
  quality-score: 85
  qa-date: 2025-12-07
  tested-models:
    - claude-3-5-sonnet ✅
    - claude-opus ✅
    - claude-haiku ✅
```

### Task: Update Statistics for Phase Completion

```yaml
statistics:
  # Update these when phase completes
  phase-1b-completion: 100%      # was 33%
  phase-1-completion: 83%        # was 50%
  total-completion: 24%          # was 19%

  # When all skills in phase done
  phase-1a-skills: 3 complete
  phase-1b-skills: 3 complete
  phases-2-5-skills: 4 complete
  total-skills: 10 complete (of 21)
```

### Task: Add New Phase Planning

```yaml
framework:
  phases:
    # ... existing ...
    2:
      status: planning
      planned-start: 2025-12-20
      estimated-completion: 2026-01-10
      skills-count: 4
      focus: "Validation skills"
```

---

## Validation Checklist

Before committing registry.yml changes:

- [ ] YAML syntax valid (no indentation errors)
- [ ] All skill entries have required fields
- [ ] Status values are valid (planning/in-progress/complete)
- [ ] Phase values match framework phases
- [ ] Quality scores are realistic (0-100)
- [ ] Statistics totals match actual skill count
- [ ] Tested-models include appropriate models
- [ ] Git commit hashes are valid
- [ ] Directory paths match actual locations
- [ ] No duplicate skill entries
- [ ] All referenced dependencies exist
- [ ] All referenced consumers exist

---

## Git Best Practices

### Commit Messages

```bash
# When adding new skill
git commit -m "docs: add validating-links to registry (Phase 1B)"

# When updating quality scores
git commit -m "docs: update registry with phase 1A QA results (82/100)"

# When completing phase
git commit -m "docs: update registry - Phase 1B complete (3/3 skills)"

# When updating statistics
git commit -m "docs: update framework statistics - 19% completion"
```

### Merging Changes

```bash
# Always pull latest before editing
git pull origin main

# Edit locally
vim ai/registry.yml

# Validate before committing
python3 -c "import yaml; yaml.safe_load(open('ai/registry.yml'))"

# Commit and push
git add ai/registry.yml
git commit -m "..."
git push origin main
```

---

## Troubleshooting

### ❌ YAML Syntax Error
```
Error: yaml.YAMLError: mapping values are not allowed here

Fix: Check indentation (use 2 spaces, never tabs)
```

### ❌ Skill Not Found in Registry
```
Error: Skill created but not in registry

Fix: Add entry to ai/registry.yml under skills: section
```

### ❌ Statistics Don't Match
```
Error: Registry says 8 skills but only 7 directories

Fix: Count actual .claude/skills/ directories and update statistics
```

### ❌ Circular Dependency
```
Error: Skill A depends on Skill B, B depends on A

Fix: Break circular by removing unnecessary dependency
```

---

