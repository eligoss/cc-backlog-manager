# Scope Decision Reference

## Generic vs Project-Specific Decision Framework

### Step 1: Test for Generic Reusability

**Question: Can this work in ANY project without modification?**

```
Test scenarios:
├─ Different tech stack? (React vs Angular vs Vue)
├─ Different domain? (E-commerce vs Healthcare vs Finance)
├─ Different tools? (GitHub vs GitLab vs Bitbucket)
└─ Different team? (No APM-R context needed)

ALL YES → GENERIC
ANY NO → Continue to Step 2
```

**Generic Indicators:**
- No hardcoded project names
- No project-specific field names
- No project-specific workflow steps
- No project-specific tool configurations
- Pure patterns and best practices

**Examples:**
- ✅ `validating-links` - Works for any markdown
- ✅ `formatting-markdown` - Universal markdown syntax
- ✅ `enforcing-quality-standards` - Universal code quality
- ✅ `managing-git-workflows` - Standard git operations

---

### Step 2: Test for APM-R Specificity

**Question: Does this require APM-R knowledge to function?**

```
APM-R Dependencies Check:
├─ Jira field mappings (customfield_*, APM-R labels)
├─ Confluence space structure (WA space, page hierarchy)
├─ APM-R workflow phases (milestones, sprint naming)
├─ Framework governance rules (v11.x specific)
├─ APM-R ticket structure (epic/story/task hierarchy)
└─ MCP server configuration (APM-R Jira/Confluence instances)

ANY YES → PROJECT-SPECIFIC
ALL NO → GENERIC (back to Step 1)
```

**Project-Specific Indicators:**
- References `customfield_*` Jira fields
- Uses APM-R milestone codes (Jun2025, Dec2025)
- Requires WA Confluence space knowledge
- Implements framework v11.x governance
- Uses APM-R specific MCP configurations

**Examples:**
- ✅ `maintaining-framework-governance` - v11.x rules
- ✅ `syncing-with-jira` - APM-R Jira sync config and workflows
- ✅ `managing-framework-phases` - APM-R workflow

---

### Step 3: Hybrid Approach Decision

**Question: Is there a generic core with APM-R extensions?**

```
Skill structure analysis:
├─ Core patterns/rules → Generic (90% of skill)
├─ Configuration/mappings → APM-R specific (10% of skill)
└─ Can they be separated cleanly?

YES → HYBRID STRUCTURE
NO → Back to Step 1 or 2 for pure decision
```

**Hybrid Structure Pattern:**

```
apmr-{name}-{capability}/
├── SKILL.md (when to use, integration)
├── PATTERNS.md (generic patterns - reusable)
├── RULES.md (generic rules - reusable)
├── APMR-CONFIG.md (APM-R specific configuration)
└── EXAMPLES.md (mixed examples)
```

**Hybrid Example: Jira-Confluence Integration**
- Generic: Markdown ↔ Jira ↔ ADF conversion rules (CONVERSION-RULES.md)
- APM-R: Field mappings, MCP endpoints, space config (APMR-CONFIG.md)

**Decision:** Use `apmr-` prefix (project-specific) but separate generic parts

---

## Scope Impact on Deployment

### Generic Skills (`generic-shared-*`)

**Source Location:**
```
ai/skills/{category}/generic-shared-{name}-{capability}/
```

**Deployment Locations (auto-synced):**
```
.claude/skills/generic-shared-{name}-{capability}/  (local)
~/{project}/.claude/skills/generic-shared-{name}-{capability}/  (workspace)
~/.claude/skills/generic-shared-{name}-{capability}/  (global, optional)
```

**Reusability:**
- ✅ apm-r-ai-agentic-framework
- ✅ apm-r-app
- ✅ apm-r-be
- ✅ Infrastructure
- ✅ Any external project

---

### Project-Specific Skills (`apmr-*`)

**Source Location:**
```
ai/skills/{category}/apmr-{name}-{capability}/
```

**Deployment Locations (auto-synced):**
```
.claude/skills/apmr-{name}-{capability}/  (local)
~/{project}/.claude/skills/apmr-{name}-{capability}/  (workspace)
```

**Reusability:**
- ✅ apm-r-ai-agentic-framework (framework repo)
- ✅ apm-r-app (via workspace symlink)
- ✅ apm-r-be (via workspace symlink)
- ❌ External projects (APM-R specific)

---

## Common Scope Decision Scenarios

### Scenario 1: Validation Skill

```
Skill: Link validation for markdown files

Analysis:
- Works for any markdown project? YES
- Requires APM-R knowledge? NO
- Project-specific config? NO

Decision: GENERIC
Name: generic-shared-validating-links-guard
```

---

### Scenario 2: Framework Governance

```
Skill: Maintain framework governance rules

Analysis:
- Works for any project? NO (v11.x specific)
- Requires APM-R knowledge? YES (framework structure)
- Project-specific rules? YES (6 governance rules)

Decision: PROJECT-SPECIFIC
Name: building-framework
```

---

### Scenario 3: Jira Integration (Hybrid)

```
Skill: Jira-Confluence integration patterns

Analysis:
- Core conversion rules? GENERIC (Markdown ↔ Jira ↔ ADF)
- MCP configuration? APM-R SPECIFIC (endpoints, auth)
- Field mappings? APM-R SPECIFIC (customfield_*)
- Overall skill? 70% generic, 30% APM-R

Decision: PROJECT-SPECIFIC (with hybrid structure)
Name: syncing-with-jira
Structure:
  - CONVERSION-RULES.md (generic, reusable)
  - APMR-CONFIG.md (APM-R specific)
```

---

### Scenario 4: Quality Standards

```
Skill: Enforce code quality standards

Analysis:
- SOLID principles? GENERIC
- DRY violations? GENERIC
- Anti-patterns? GENERIC
- APM-R specific rules? NO

Decision: GENERIC
Name: verifying-quality
```

---

## Scope Decision Checklist

Before creating a skill, answer these questions:

**Generic Scope Indicators:**
- [ ] No project names in content
- [ ] No hardcoded paths/URLs
- [ ] No project-specific field names
- [ ] Works in any similar project
- [ ] Pure patterns/best practices
- [ ] Universal tool usage (git, markdown, etc.)

**Project-Specific Scope Indicators:**
- [ ] References APM-R concepts
- [ ] Uses customfield_* or APM-R labels
- [ ] Requires framework v11.x knowledge
- [ ] Implements APM-R workflows
- [ ] Uses APM-R MCP configurations
- [ ] Tied to specific project structure

**Hybrid Structure Indicators:**
- [ ] Has generic core (patterns/rules)
- [ ] Has APM-R extensions (config/mappings)
- [ ] Can separate cleanly (70%+ generic)
- [ ] Benefits from shared generic knowledge

---

## Naming Convention by Scope

### Generic Shared Skills

**Format:** `generic-shared-{name}-{capability}`

**Examples:**
- `generic-shared-validating-links-guard`
- `validating-markdown`
- `verifying-quality`
- `generic-shared-loading-context-pattern-knowledge`
- `building-skills`

**Prefix:** `generic-shared-` signals reusability

---

### Project-Specific Skills

**Format:** `apmr-{name}-{capability}`

**Examples:**
- `building-framework`
- `syncing-with-jira`
- `apmr-managing-framework-planning-phases`
- `apmr-managing-framework-versions-workflow`

**Prefix:** `apmr-` signals APM-R specific

---

## Version History

**Version:** 1.0
**Created:** 2025-12-07 (v11.2 governance refactor)
**Purpose:** Extract scope decision knowledge from main SKILL.md
**Related Files:**
- SKILL.md (main governance skill)
- DECISION-TREES.md (general decision framework)
