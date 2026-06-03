# APM-R Framework Governance Rules (v11.2)

## Overview

Six foundational rules that govern the APM-R AI Agentic Framework architecture. These rules ensure consistency, scalability, and maintainability across all framework components.

---

## Rule 1: Pure Agent Pattern

**Principle:** All generic project knowledge lives in context files, not agents.

### Requirements

**Agents Must Be:**
- ✅ Generic (work with any project by changing context)
- ✅ Capability-focused (describe WHAT they can do)
- ✅ Context-agnostic (no hardcoded project details)

**Agents Must NOT Contain:**
- ❌ Project-specific details (milestones, paths, names)
- ❌ Hardcoded configurations
- ❌ Business domain knowledge
- ❌ Technical implementation patterns

### Implementation

**Agent Structure:**
```markdown
# Agent Name

## Capabilities
- What this agent CAN DO (generic)

## Project Knowledge
- Knowledge skills to invoke (knowing-the-codebase, knowing-the-domain)

## Instructions
- Generic workflow steps
- Invoke knowledge skills for project-specific details
```

**Knowledge Structure:**
```
.claude/skills/
├── knowing-the-codebase/   (tech stack, architecture, conventions)
├── knowing-the-domain/     (business domain, users, product context)
└── knowing-backlog/        (backlog conventions, ticket patterns)
```

### Validation

**Test:** Can you swap out the knowledge skills and use the agent for a different project?
- YES → Compliant with Rule 1
- NO → Agent contains project-specific knowledge (violation)

**Example Violation:**
```markdown
# Agent File
## Instructions
1. Export to Jira using customfield_10001 for milestone
2. Use WA Confluence space
```
**Fix:** Move to context file, reference generically

---

## Rule 2: Skills as Single Source of Truth

**Principle:** When knowledge scattered in 3+ places, create a skill to consolidate it.

### Consolidation Threshold

**Create Skill When:**
- Knowledge appears in 3+ locations
- Updates affect 3+ files
- Referenced by 2+ agents
- Needs to be a quality gate

**Update Existing File When:**
- Knowledge in 1-2 locations only
- No reusability requirement
- Simple documentation update

### Implementation

**Before (Scattered):**
```
ai/agents/ai-architect.md (contains anti-patterns)
ai/agents/ai-backlog-manager.md (contains anti-patterns)
ai/agents/ai-confluence-manager.md (contains anti-patterns)
... (8 agents total)
```

**After (Consolidated):**
```
ai/skills/guards/verifying-quality/
├── SKILL.md
├── ANTI-PATTERNS.md
└── EXAMPLES.md

Agents reference: Use verifying-quality
```

### Benefits

- **Single update point:** Change once, affects all references
- **Token efficiency:** Load on-demand vs duplicated in all agents
- **Consistency:** Same knowledge everywhere
- **Discoverability:** Skill catalog makes knowledge findable

### Validation

**Test:** Count locations of knowledge pattern
- 1-2 locations → Keep as-is or in single context file
- 3+ locations → Consolidate to skill

---

## Rule 3: Scope Declaration (MANDATORY)

**Principle:** Every skill declares scope: generic | project-specific

### Scope Types

**Generic (`generic-shared-*`):**
- Reusable in ANY project
- No project-specific references
- Universal patterns/best practices
- Examples: validating-links, formatting-markdown, enforcing-quality-standards

**Project-Specific (`apmr-*`):**
- Specific to APM-R project
- Contains APM-R configurations/workflows
- Framework governance rules
- Examples: building-framework, syncing-with-jira

### YAML Frontmatter (Required)

Every SKILL.md must include:

```yaml
---
name: {skill-name}
description: {what skill does}
scope: generic | project-specific
applicable-projects: all | apmr
---
```

### Implementation

**Generic Skill Example:**
```yaml
---
name: validating-links
description: Validate markdown links for broken references
scope: generic
applicable-projects: all
---
```

**Project-Specific Skill Example:**
```yaml
---
name: building-framework
description: Maintain APM-R framework governance and rules
scope: project-specific
applicable-projects: apmr
---
```

### Validation

**Test:** Scope declared in YAML frontmatter?
- YES → Compliant with Rule 3
- NO → Add frontmatter with scope (violation)

**See:** SCOPE-DECISION-TREE.md for detailed scope decision framework

---

## Rule 4: Symlink Strategy (Single Source of Truth)

**Principle:** Framework repo is single source of truth, symlinked at two layers

### Symlink Architecture

**Layer 1: Workspace Level**
```
~/{project}/.claude/skills/ → {framework}/ai/skills/
~/{project}/.claude/commands/ → {framework}/ai/agents/
```

**Layer 2: User Level (Optional)**
```
~/.claude/skills/ → ~/{project}/.claude/skills/  (or directly to framework)
```

### Single Source of Truth

**Source (Edit Here):**
```
apm-r-ai-agentic-framework/
├── ai/skills/{category}/{skill-name}/
└── ai/agents/{agent-name}.md
```

**Category Organization:**
- Skills grouped by domain category (e.g., `coding/`, `jira/`, `planning/`)
- Platform-specific skills go in their domain category, NOT separate platform folders
- Example: `coding/android-development-standards/` (NOT `android/android-development-standards/`)
- This keeps related skills together while enabling future platform additions

**Deployment (Auto-Synced):**
```
.claude/
├── skills/{skill-name}/  (flattened, no category)
└── commands/{agent-name}.md
```

**Auto-Sync:** Pre-commit hook runs sync via CLI:
- `agentic-framework sync --check`

### Implementation Rules

**Always:**
- ✅ Edit source files in `ai/skills/` or `ai/agents/`
- ✅ Let pre-commit hook sync to `.claude/`
- ✅ Commit synced files (staged by hook)

**Never:**
- ❌ Edit files in `.claude/` directly
- ❌ Manually copy files
- ❌ Create duplicates in multiple locations

### Validation

**Test:** Single source exists, deployments are symlinks or auto-synced?
- YES → Compliant with Rule 4
- NO → Manual file copies detected (violation)

---

## Rule 5: Token Budget Compliance

**Principle:** Skills optimized for lazy-loading and token efficiency

### Token Budgets

**Framework-Wide:**
- Total budget: 25,000 tokens (target)
- Skills budget: 25,000 tokens (100%)
- Individual skill: < 2,500 tokens (recommended)

**Skill Structure:**
- SKILL.md: < 500 lines (main file, always loaded)
- Supporting files: On-demand loading (progressive disclosure)

### Progressive Disclosure Pattern

**Load Strategy:**
```
Session start:
└─ Load SKILL.md only (~400-500 tokens)

When needed:
├─ Load EXAMPLES.md (~300-500 tokens)
├─ Load STANDARDS.md (~400-600 tokens)
└─ Load PATTERNS.md (~500-800 tokens)
```

**Benefits:**
- 25-35% session token savings
- Faster skill loading
- Pay-as-you-go knowledge access

### Implementation

**SKILL.md Structure:**
```markdown
# Skill Name

## When to Use (Quick decision)
## Quick Reference (Common patterns)
## Instructions (Core workflow)

## Supporting Files (References)
- See EXAMPLES.md for detailed examples
- See STANDARDS.md for complete rules
- See PATTERNS.md for advanced patterns
```

**Supporting Files:**
- Complete knowledge on specific topic
- Loaded only when referenced
- Cross-referenced from SKILL.md

### Validation

**Test Token Budget:**
```bash
# Count tokens in SKILL.md
wc -w SKILL.md  # Approximate: 1 token ≈ 0.75 words

# Total skill budget
wc -w *.md | tail -1
```

**Compliance:**
- SKILL.md < 500 lines? ✅
- Total skill < 2,500 tokens? ✅
- Supporting files documented? ✅

---

## Rule 6: Quality Gate Integration

**Principle:** Skills validate outputs and provide structured feedback

### Quality Gate Pattern

**Validation Skills Must:**
- ✅ Define clear pass/fail criteria
- ✅ Provide structured error reports
- ✅ Give actionable fix suggestions
- ✅ Support automation (can be scripted)

**Validation Skills Must NOT:**
- ❌ Give vague feedback ("looks good")
- ❌ Manual-only validation (no automation)
- ❌ Unclear next steps

### Implementation

**Quality Gate Skill Structure:**
```markdown
# Skill Name (Guard)

## Validation Criteria
1. Criterion 1 (with examples)
2. Criterion 2 (with examples)

## Validation Process
1. Check criterion 1
2. Check criterion 2
3. Generate report

## Error Report Format
- Issue: {description}
- Location: {file}:{line}
- Fix: {actionable suggestion}

## Examples
- Pass example
- Fail example with fix
```

### Validation Report Format

**Standard Report:**
```
✅ PASSED: 12 checks
❌ FAILED: 3 checks
⚠️  WARNINGS: 2 checks

Errors:
1. [BROKEN_LINK] ai/agents/ai-architect.md:45
   - Link: ../context/missing-file.md
   - Fix: Update to ../context/business-basic.md

2. [YAML_MISSING] backlog/tickets/stories/DAPM-123.md
   - Missing: milestone field
   - Fix: Add milestone: Jun2025

Warnings:
1. [LONG_LINE] ai/framework/governance.md:102
   - Length: 150 chars (limit: 120)
   - Fix: Break into multiple lines
```

### Integration with Agents

**Agent Quality Workflow:**
```markdown
## Instructions

### Step 4: Quality Validation
1. Complete task implementation
2. Use verifying-quality
3. Review quality report
4. Fix any errors or warnings
5. Re-validate until ✅ PASSED
```

### Validation

**Test:** Can skill generate structured pass/fail report?
- YES → Compliant with Rule 6
- NO → Add validation criteria and report format (violation)

---

## Governance Rule Summary

| Rule | Principle | Validation |
|------|-----------|------------|
| 1. Pure Agent Pattern | No project knowledge in agents | Can agent work with different context? |
| 2. Skills Consolidate | 3+ locations → skill | Count knowledge locations |
| 3. Scope Declaration | Every skill has scope in YAML | Frontmatter contains scope field? |
| 4. Symlink Strategy | Framework repo is source of truth | Single source, auto-synced deployment? |
| 5. Token Budget | SKILL.md < 500 lines, progressive disclosure | Token count compliance? |
| 6. Quality Gates | Structured validation with reports | Pass/fail criteria defined? |

---

## Rule Compliance Checklist

Before implementing framework changes:

**Agent Changes:**
- [ ] No project-specific knowledge in agent (Rule 1)
- [ ] References context files from registry (Rule 1)
- [ ] No duplicated content from other agents (Rule 2)

**Skill Creation:**
- [ ] Knowledge scattered in 3+ places (Rule 2)
- [ ] Scope declared in YAML frontmatter (Rule 3)
- [ ] Source in ai/skills/, deployment in .claude/ (Rule 4)
- [ ] SKILL.md < 500 lines (Rule 5)
- [ ] Supporting files for progressive disclosure (Rule 5)
- [ ] Validation criteria if quality gate (Rule 6)

**Registry Updates:**
- [ ] Skill metadata added to ai/registry.yml
- [ ] Token budget updated
- [ ] Context dependencies documented

---

**Version:** 1.1
**Last Updated:** 2025-12-07 (v11.2 governance refactor)
**Related Files:**
- SKILL.md (main governance skill)
- DECISION-TREES.md (when to create skills)
- SCOPE-DECISION-TREE.md (generic vs project-specific)
