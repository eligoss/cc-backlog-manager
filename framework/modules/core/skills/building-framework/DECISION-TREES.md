# Framework Governance Decision Trees

## Decision Tree: New Skill vs Update File

### Primary Decision Flow

```
Framework improvement needed?
│
├─ Is knowledge scattered in 3+ places?
│ │
│ ├─ YES: Create skill to consolidate
│ │ ├─ Generic (reusable anywhere)?
│ │ │ ├─ YES: .claude/skills/generic/
│ │ │ └─ NO: .claude/skills/apmr/
│ │ └─ Name using gerund: {verb}-ing
│ │
│ └─ NO: Update existing context file
│ └─ No new skill needed
│
└─ Is it a quality gate (validation)?
 ├─ YES: Create skill with validation patterns
 └─ NO: Update documentation/context
```

### Question-Based Decision Framework

**Question 1: Is this knowledge scattered across 3+ locations?**
```
YES → Create a skill to consolidate
NO → Update existing file or context
```

**Question 2: Does this knowledge get referenced by 2+ agents or 3+ files?**
```
YES → Create a skill (reusability)
NO → Update existing context file
```

**Question 3: Will this become a quality gate (automation/validation)?**
```
YES → Create a skill (enables automation)
NO → Update documentation/context
```

**Question 4: Is this reusable outside APM-R?**
```
YES → Create generic skill in .claude/skills/generic/
NO → Create project-specific skill in .claude/skills/apmr/
```

---

## Decision Tree: Generic vs Project-Specific Scope

### Generic Skill Decision

**Ask: Would this be useful in a different project?**

```
Could you use this in apm-r-app (different codebase)?
│
├─ YES → GENERIC
│ Examples:
│ - validating-links (any markdown project)
│ - formatting-markdown (any markdown project)
│ - parsing-yaml (any project using YAML)
│ - git-best-practices (any git project)
│ - enforcing-quality-standards (any project)
│ - loading-context-pattern (any agent system)
│
└─ NO → Continue next question
```

**Ask: Does it require APM-R specific knowledge?**

```
Does it reference APM-R concepts:
- Jira field structures
- APM-R ticket types
- Framework governance rules
- APM-R specific workflows
- Confluence space configuration
│
├─ YES → PROJECT-SPECIFIC
│ Examples:
│ - ticket-structure-validator (APM-R specific fields)
│ - adf-expert (Confluence APM-R integration)
│ - building-framework (framework governance)
│ - syncing-with-jira (APM-R Jira sync config)
│ - managing-framework-phases (APM-R workflow)
│
└─ NO → GENERIC (no project references)
```

---

## Decision Tree: When to Consolidate

### Consolidation Pattern Detection

```
Analyzing framework improvement?
│
├─ Count knowledge locations
│ │
│ ├─ 1-2 locations
│ │ └─ NO CONSOLIDATION
│ │ └─ Update existing file
│ │
│ └─ 3+ locations
│ └─ CONSOLIDATE
│ │
│ ├─ All locations generic?
│ │ └─ Create generic skill
│ │
│ ├─ All locations APM-R specific?
│ │ └─ Create project-specific skill
│ │
│ └─ Mixed (generic + APM-R)?
│ └─ Create hybrid skill
│ ├─ Generic base in skill
│ └─ APM-R config in separate file
```

**Examples:**
- Anti-patterns in 8 agents → Consolidate to quality-standards skill
- Markdown formatting in 7 agents → Consolidate to markdown-formatting skill
- Jira patterns (generic) + APM-R config → Hybrid skill with APMR-CONFIG.md

---

## Decision Tree: Scope Impact Planning

### Deployment Location Mapping

```
Scope decision made?
│
├─ GENERIC
│ ├─ Source: ai/skills/{category}/generic-shared-{name}-{capability}/
│ ├─ Deploy: .claude/skills/generic-shared-{name}-{capability}/
│ └─ Reuse: Any project
│
└─ PROJECT-SPECIFIC
 ├─ Source: ai/skills/{category}/apmr-{name}-{capability}/
 ├─ Deploy: .claude/skills/apmr-{name}-{capability}/
 └─ Reuse: APM-R only
```

**Auto-sync:** Skills in `ai/skills/` sync to `.claude/skills/` via pre-commit hook

**Important:** Always edit source in `ai/skills/`, never deployment in `.claude/skills/`

---

## Quick Decision Checklist

Use this checklist to quickly decide on skill creation:

**Create Skill If:**
- [ ] Knowledge scattered in 3+ places
- [ ] Referenced by 2+ agents
- [ ] Needs to be a quality gate
- [ ] Enables automation/validation
- [ ] Decision authority needed

**Update Existing File If:**
- [ ] Only 1-2 locations affected
- [ ] Simple documentation update
- [ ] No quality gate needed
- [ ] No reusability requirement

**Scope Decision:**
- [ ] Generic: Works in any project, no APM-R references
- [ ] Project-specific: Requires APM-R knowledge/configuration
- [ ] Hybrid: Generic base + APM-R config file

---

**Version:** 1.0
**Created:** 2025-12-07 (governance refactor)
**Related:** SKILL.md, SCOPE-DECISION-TREE.md
