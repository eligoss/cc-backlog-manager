---
id: building-framework
name: building-framework
description: Maintain APM-R framework governance, rules, and consistency. Use when making architectural decisions, creating skills, or validating framework improvements.
scope: project-specific
applicable-projects: apmr
module: core
capabilities-provided:
  - framework-governance
  - framework-development
  - planning-phases
# Claude Code v2.1 features
context: fork
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Building Framework

## When to Use This Skill

You're working on **APM-R framework improvements** and need to:
- Make architectural decisions (new skill vs update file)
- Ensure skill scope is correct (generic vs project-specific)
- Maintain framework governance rules
- Keep registry.yml synchronized
- Validate framework improvements before implementation
- Consolidate scattered framework knowledge

**This is the FOUNDATION meta-skill** - enables governance decisions for all skills and framework evolution.

---

## MCP Integration

This skill uses **NO MCPs** - works with built-in tools only.
- No dependencies required
- No additional setup needed
- Full functionality with built-in tools

---

## Quick Reference: APM-R v11.2 Governance Rules

### Rule 1: Pure Agent Pattern
**All generic project knowledge lives in context files, not agents.**
- Agents generic, work with any project by changing context
- No project-specific details in agent files

### Rule 2: Skills as Single Source of Truth
**When knowledge scattered in 3+ places, create a skill to consolidate it.**
- Create skill when scattered in 3+ locations
- Update existing file if only 1-2 locations

### Rule 3: Scope Declaration (MANDATORY)
**Every skill declares scope: generic | project-specific**
- Generic: Reusable in any project (`generic-shared-*`)
- Project-specific: APM-R only (`apmr-*`)

### Rule 4: Symlink Strategy
**Framework repo is single source of truth, symlinked at two layers**
- Source: `ai/skills/`, auto-synced to `.claude/skills/`
- Always edit source, never deployment

### Rule 5: Token Budget
**Skills optimized for lazy-loading and token efficiency**
- Individual skill < 2,500 tokens
- SKILL.md < 500 lines, supporting files on-demand

### Rule 6: Quality Gates
**Skills validate outputs and provide structured feedback**
- Clear pass/fail criteria, actionable fix suggestions
- Use `verifying-quality` for validation

**See:** GOVERNANCE-RULES.md for complete rule definitions and implementation guidance

---

## Decision Framework: Should I Create a Skill?

### Quick Decision Questions

**Q1: Is knowledge scattered in 3+ locations?**
- YES → Create skill | NO → Update file

**Q2: Referenced by 2+ agents or quality gate needed?**
- YES → Create skill | NO → Update file

**Q3: Is it reusable outside APM-R?**
- YES → Generic skill (`generic-shared-*`) | NO → Project-specific (`apmr-*`)

**See:** DECISION-TREES.md for complete decision framework and visualization

---

## Instructions: Making Governance Decisions

### Step 1: Analyze the Improvement
1. What needs to improve?
2. How many files/locations affected?
3. Generic or project-specific scope?

### Step 2: Apply Governance Rules
- Rule 1: No project knowledge in agents
- Rule 2: Scattered in 3+ places → skill
- Rule 3: Scope declared explicitly
- Rule 4: Source in `ai/skills/`, auto-synced
- Rule 5: Token budget compliant
- Rule 6: Quality gate if applicable

### Step 3: Make Decision
- **3+ locations** → Create skill
- **Quality gate** → Create skill
- **1-2 locations** → Update file
- **Reusable outside APM-R** → Generic skill
- **APM-R specific** → Project-specific skill

### Step 4: Build the Skill
Use `building-skills` for:
- SKILL.md structure and formatting
- Supporting file organization
- Progressive disclosure pattern
- Token budget compliance

**Note:** This skill handles "Should I?" - building-skills handles "How to?"

---

## Scope Decision: Generic vs Project-Specific

**Generic (`generic-shared-*`):**
- Works in ANY project without modification
- No APM-R specific references
- Examples: validating-links, formatting-markdown, enforcing-quality-standards

**Project-Specific (`apmr-*`):**
- Requires APM-R knowledge (Jira fields, Confluence spaces, framework rules)
- Examples: building-framework, syncing-with-jira

**See:** SCOPE-DECISION-TREE.md for complete decision framework, test scenarios, and examples

---

## Common Skill Creation Patterns

**Pattern 1: Consolidation** - Same knowledge in 3+ places
**Pattern 2: Quality Gate** - Automated validation needed
**Pattern 3: Decision Authority** - Inconsistent decisions across framework
**Pattern 4: Repetitive Work** - Same manual process repeated

**See:** DECISION-TREES.md for detailed patterns and real-world scenarios

---

## Checklist: Before Creating New Skill

**Governance:**
- [ ] Knowledge scattered in 3+ places?
- [ ] All 6 governance rules satisfied?
- [ ] Scope correctly declared (generic or project-specific)?
- [ ] Will be used by 2+ agents/files?

**Implementation:**
- [ ] Used decision tree (DECISION-TREES.md)?
- [ ] Checked scope decision (SCOPE-DECISION-TREE.md)?
- [ ] Using building-skills for structure?
- [ ] Token budget < 2,500 tokens?

---

## Related Skills & Supporting Files

**How to Build Skills:**
- `building-skills` - Skill structure, templates, patterns
- This skill answers "Should I?" - building-skills answers "How to?"

**Quality Validation:**
- `verifying-quality` - Quality gates and validation

**Supporting Files (This Skill):**
- GOVERNANCE-RULES.md - Complete 6 rules with implementation
- DECISION-TREES.md - Decision frameworks and patterns
- SCOPE-DECISION-TREE.md - Generic vs project-specific decision framework

**Framework Documentation:**
- ai/registry.yml - Single source of truth for metadata
- ai/framework/framework-governance.md - Extended governance rules

---

## Key Takeaways

1. **Six Rules:** Pure agents, skills consolidate (3+ locations), scope declared, symlinks, token budgets, quality gates
2. **Decision Framework:** 3+ locations OR quality gate → skill
3. **Scope:** Generic (reusable) vs Project-specific (APM-R only)
4. **Separation:** This skill ("Should I?") + building-skills ("How to?") + quality-standards (validation)
5. **Token Efficiency:** Progressive disclosure enables 25-35% session savings

---

**Skill Version:** 1.1
**Last Updated:** 2025-12-07 (v11.2 refactor - reduced from 397 to ~180 lines)
**Pair with:** building-skills (how to build), quality-standards (validation)
**Used by:** ai-framework-manager, ai-framework-developer
