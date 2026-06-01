# Building Claude Skills: Real-World Examples

## Example 1: Creating validating-links Skill (Generic)

### Planning Phase
```
Question: Is this skill reusable across any project?
Answer: YES - Link validation is universal

Question: Does it require project-specific knowledge?
Answer: NO - It's pure validation logic

Decision: GENERIC skill
Directory: .claude/skills/generic/validating-links/
```

### File Structure
```
validating-links/
├── SKILL.md (300 lines)
│   ├── YAML frontmatter
│   ├── When to Use section
│   ├── Quick Start
│   ├── Instructions (4 steps)
│   └── Common Patterns (3 patterns)
├── EXAMPLES.md (150 lines)
│   ├── Example 1: Fixing broken relative paths
│   ├── Example 2: Validating external URLs
│   └── Example 3: Handling typos in links
└── STANDARDS.md (100 lines)
    ├── Link validation rules
    ├── Supported link types
    └── Error categories
```

### SKILL.md Frontmatter
```yaml
---
name: validating-links
description: Validates markdown links by checking file existence,
  syntax, and patterns. Use when reviewing documentation or markdown
  files for broken links, typos, or incorrect URL formats. Returns
  detailed error report with fix suggestions.
scope: generic
applicable-projects: any
---
```

### Implementation Timeline
1. **Design:** 30 minutes (planning, naming, scope decision)
2. **SKILL.md:** 2 hours (main content, instructions, patterns)
3. **EXAMPLES.md:** 1 hour (3 detailed examples)
4. **STANDARDS.md:** 1 hour (rules, specifications)
5. **Testing:** 1 hour (syntax, scope, invocation, models)
6. **Total:** ~6 hours for a complete skill

---

## Example 2: Creating ticket-structure-validator (Project-Specific)

### Planning Phase
```
Question: Is this skill reusable across any project?
Answer: NO - Specific to APM-R ticket structure

Question: Does it require project-specific knowledge?
Answer: YES - Jira field structure, APM-R YAML frontmatter

Decision: PROJECT-SPECIFIC skill
Directory: .claude/skills/apmr/ticket-structure-validator/
```

### File Structure
```
ticket-structure-validator/
├── SKILL.md (350 lines)
│   ├── YAML frontmatter (scope: project-specific)
│   ├── When to Use section
│   ├── Quick Start (ticket validation checklist)
│   ├── Instructions (5 steps)
│   ├── Common Patterns (4 patterns)
│   └── See Also (governance rules, registry guide)
├── EXAMPLES.md (200 lines)
│   ├── Example 1: Fixing missing YAML frontmatter
│   ├── Example 2: Validating required fields
│   └── Example 3: Checking acceptance criteria
├── STANDARDS.md (150 lines)
│   ├── APM-R ticket structure requirements
│   ├── YAML field specifications
│   └── Validation rules
└── ANTI-PATTERNS.md (100 lines)
    ├── Common mistakes
    ├── Why they fail
    └── Correct alternatives
```

### SKILL.md Frontmatter
```yaml
---
name: ticket-structure-validator
description: Validates APM-R Jira ticket structure, YAML frontmatter,
  and content format. Use when creating or reviewing tickets before
  export to Jira. Checks required fields, validates story points,
  ensures acceptance criteria clarity. Returns validation report with
  specific fixes.
scope: project-specific
applicable-projects: apmr
---
```

### Key Differences from Generic Skills
- References APM-R specific field names (story points, acceptance criteria)
- Uses APM-R ticket template from framework governance
- Links to APM-R validation rules
- NOT reusable in other projects without modification

---

## Example 3: Creating maintaining-framework-governance (Meta-Skill)

### Purpose
Meta-skill that teaches Claude how to maintain APM-R framework governance while developing all other skills.

### Planning Phase
```
Question: Is this skill reusable across any project?
Answer: PARTIALLY - Governance concept is universal, APM-R rules are specific

Question: Does it require project-specific knowledge?
Answer: YES - It teaches APM-R governance rules

Decision: PROJECT-SPECIFIC meta-skill (Phase 1A priority)
Directory: .claude/skills/apmr/maintaining-framework-governance/
```

### File Structure
```
maintaining-framework-governance/
├── SKILL.md (350 lines)
│   ├── YAML frontmatter (scope: project-specific)
│   ├── When to Use section
│   ├── Quick Start (governance checklist)
│   ├── Instructions (4 steps for framework decisions)
│   └── Common Patterns (3 governance patterns)
├── GOVERNANCE-RULES.md (150 lines)
│   ├── 6 rules for v11.0
│   ├── Severity levels
│   └── Validation procedures
├── SCOPE-DECISION-TREE.md (100 lines)
│   ├── Generic vs Project-Specific decision
│   └── When to create new skills vs update files
├── REGISTRY-GUIDE.md (100 lines)
│   ├── Registry.yml structure
│   ├── Skill metadata
│   └── Validation
├── SYMLINK-GUIDE.md (80 lines)
│   ├── Two-layer symlink strategy
│   ├── Setup commands
│   └── Verification
├── VALIDATION-CHECKLIST.md (100 lines)
│   ├── Pre-implementation checklist
│   ├── Mid-implementation validation
│   └── Post-implementation verification
└── EXAMPLES.md (150 lines)
    ├── Governance decision examples
    ├── Common scenarios
    └── Framework improvement procedures
```

### SKILL.md Frontmatter
```yaml
---
name: maintaining-framework-governance
description: Teach Claude APM-R framework governance rules, scope
  decisions, registry management, and symlink strategy. Use when
  improving framework architecture, creating new skills, updating
  governance, or making architectural decisions. Ensures consistency
  and quality across all 21 framework skills.
scope: project-specific
applicable-projects: apmr
---
```

### Why This is Phase 1A Priority
1. **Foundation for all 20 other skills** - Ensures consistency
2. **Governance authority** - Teaches how to make framework decisions
3. **Scope clarity** - Ensures generic vs project-specific distinction
4. **Quality gate** - Validates framework improvements before implementation
5. **Future evolution** - Blueprint for maintaining framework as it grows

---

## Example 4: Building Multiple Skills in Sequence (Phase 1B)

### Sequence: Building 3 Skills in Parallel (Weeks 1-2)

#### Skill 1: validating-links (Generic)
```
Skill Type: Validation skill
Dependencies: building-claude-skills (meta-skill)
Timeline: 6 hours
Status: Phase 1B, Week 1
```

#### Skill 2: formatting-markdown (Generic)
```
Skill Type: Formatting skill
Dependencies: building-claude-skills (meta-skill)
Timeline: 8 hours
Status: Phase 1B, Week 1-2
```

#### Skill 3: updating-changelogs (Generic)
```
Skill Type: Maintenance skill
Dependencies: building-claude-skills (meta-skill)
Timeline: 7 hours
Status: Phase 1B, Week 2
```

### Workflow for Each Skill

1. **Plan (30 min):** Use building-claude-skills to design structure
2. **Write SKILL.md (2 hours):** Follow template from building-claude-skills
3. **Write Supporting Files (2 hours):** EXAMPLES.md, STANDARDS.md
4. **Test (1 hour):** Syntax, scope, invocation, multiple models
5. **Validate (30 min):** Against building-claude-skills checklist
6. **Commit (15 min):** Git commit with phase info

### Progress Tracking

**Week 1:**
- Monday: Finish planning all 3 skills
- Tuesday-Wednesday: Build validating-links
- Thursday: Build formatting-markdown (50%)

**Week 2:**
- Monday: Finish formatting-markdown
- Tuesday-Wednesday: Build updating-changelogs
- Thursday-Friday: Integration testing, documentation

---

## Example 5: Testing a Skill Across Models

### Test Matrix for validating-links

```
Invocation: "Use validating-links skill to validate README.md"

Model 1: Claude 3.5 Sonnet
├─ Request: Basic link validation
├─ Response: ✅ Works, detailed error report
├─ Speed: Fast
└─ Quality: Excellent

Model 2: Claude 3 Opus
├─ Request: Complex link patterns with regex
├─ Response: ✅ Works, handles edge cases
├─ Speed: Medium
└─ Quality: Excellent

Model 3: Claude 3 Haiku
├─ Request: Simple link check
├─ Response: ✅ Works, summary format
├─ Speed: Very fast
└─ Quality: Good (appropriate for lightweight checks)
```

### Expected Outcomes
- All models can invoke the skill
- All models follow SKILL.md structure
- All models provide value at different levels
- No model-specific failures

---

## Common Scenarios: When to Build New Skills

### Scenario 1: Framework Governance Rule is Scattered

**Problem:** Rule appears in 3 different files
**Solution:** Create a skill that consolidates the rule

**Example:** "Markdown formatting" rule is in:
- ai/shared/markdown-formatting-guide.md
- ai/agents/ai-backlog-manager.md
- README.md

**Create:** `formatting-markdown` skill that becomes single source of truth

### Scenario 2: Quality Gate Needed

**Problem:** No automated validation for common mistakes
**Solution:** Create a validation skill

**Example:** Tickets often have missing acceptance criteria
**Create:** `ticket-structure-validator` skill

### Scenario 3: Repetitive Knowledge Work

**Problem:** Same manual process done repeatedly
**Solution:** Create a skill that automates it

**Example:** Updating changelog requires manual format changes
**Create:** `updating-changelogs` skill

---

## Directory Organization: Final Checklist

### Generic Skill Checklist
- [ ] Directory: `.claude/skills/generic/skill-name/`
- [ ] SKILL.md contains: `scope: generic` and `applicable-projects: any`
- [ ] No APM-R specific references
- [ ] Reusable in any project
- [ ] Can be symlinked globally: `~/.claude/skills/`

### Project-Specific Skill Checklist
- [ ] Directory: `.claude/skills/apmr/skill-name/`
- [ ] SKILL.md contains: `scope: project-specific` and `applicable-projects: apmr`
- [ ] APM-R governance and knowledge embedded
- [ ] Not reusable without project context
- [ ] Symlinked only within APM-R: `~/.claude/skills/apmr/`

---

**Example Status:** Last updated Dec 4, 2025
**Reference:** building-claude-skills SKILL.md
**Next Step:** Use these examples when building Phase 1B skills
