---
id: building-skills
module: core
name: building-skills
description: Create high-quality Claude skills with consistent structure, progressive disclosure, and scope declaration. Use when designing new skills or validating existing ones.
scope: generic
applicable-projects: any
capabilities-provided:
  - skill-creation
---

# Building Claude Skills

## When to Use This Skill

You're building a **new Claude skill** and need to:
- Follow official Claude SKILL.md structure and standards
- Ensure progressive disclosure (main file < 500 lines, supporting files on-demand)
- Declare scope correctly (generic vs project-specific)
- Name the skill using gerund form (verb + -ing)
- Organize supporting files properly
- Test the skill across multiple models
- Document when and how to invoke the skill
- Handle optional MCP dependencies gracefully

**This is the FOUNDATION skill** - all 20 other APM-R skills are built using this as reference.

**Example invocation:** "Use building-skills to help me create a skill for validating YAML files"

---

## MCP Integration (Optional)

This skill uses **NO MCPs** - works with built-in tools only.
- No dependencies required
- No additional setup needed
- Full functionality with reference tools

---

## Quick Reference: Official Claude SKILL.md Structure

### 1. YAML Frontmatter (Required)
```yaml
---
name: lowercase-hyphenated-name          # Max 64 chars, gerund form
description: Clear, concise description  # Max 1024 chars, explain WHEN to use
scope: generic | project-specific         # Required scope declaration
applicable-projects: any | project-name  # Generic = any, Project-specific = apmr
---
```

### 2. Main Content (< 500 lines total)
- **When to Use This Skill:** Clear conditions for invocation
- **Quick Start:** Optional quick reference for common cases
- **Instructions:** Numbered steps (typically 3-5 steps)
- **Common Patterns:** 2-4 patterns with brief descriptions
- **See Also:** Links to supporting files or related documentation

### 3. Supporting Files (On-Demand)
- `EXAMPLES.md` - Concrete examples and use cases
- `STANDARDS.md` - Detailed standards and rules
- `ANTI-PATTERNS.md` - Common mistakes to avoid
- `PATTERNS.md` - Deep dive into design patterns
- `TEMPLATES.md` - Templates for quick start

---

## Official Naming Conventions

### Naming Pattern: {scope}-[shared]-{name}-{capability}

✅ **CORRECT (v11.0+ Taxonomy):**
- `building-skills`
- `generic-validating-links-guard`
- `generic-formatting-markdown-action`
- `generic-updating-changelogs-workflow`
- `building-framework`
- `generic-parsing-yaml-action`
- `generic-converting-formats-action`

❌ **WRONG (Old naming convention):**
- `building-claude-skills` (missing scope, shared, capability)
- `validating-links` (missing scope, capability)
- `claude-skills-builder` (noun form)
- `link-validation` (noun form)
- `validate-links` (imperative form)
- `LinkValidator` (class name)

### Naming Components

**Format:** `{scope}-[shared]-{name}-{capability}`

| Component | Values | Required | Example |
|-----------|--------|----------|---------|
| **scope** | `generic`, `apmr` | ✅ Yes | `generic` |
| **shared** | `shared` (optional) | ❌ No | `shared` (only for widely-reused generic skills) |
| **name** | Gerund form | ✅ Yes | `validating-links` |
| **capability** | `meta`, `workflow`, `guard`, `action`, `knowledge`, `template`, `integration` | ✅ Yes | `guard` |

### Capability Types

- **meta:** Skill management, framework governance
- **workflow:** Process orchestration, multi-step procedures
- **guard:** Quality enforcement, validation
- **action:** Discrete, single-purpose operations
- **knowledge:** Static domain knowledge, reference
- **template:** Code generation, boilerplate builders
- **integration:** External tool integration, API guidance

### Length & Characters
- **Max 64 characters** (including hyphens and all components)
- **Lowercase only**
- **Hyphens for word separation** (no underscores, no camelCase)
- **Scope + capability mandatory** (declared in frontmatter AND filename)

---

## Description Field Guidelines

### What Goes in Description (Max 1024 chars)
The description must answer: **WHEN should someone use this skill?**

✅ **GOOD examples:**
```
"Validates markdown links by checking file existence, syntax,
and patterns. Use when reviewing documentation or markdown files
for broken links, typos, or incorrect URL formats. Returns detailed
error report with fix suggestions."

"Converts markdown formatting to alternative formats (Jira wiki, ADF,
HTML). Use when exporting documentation to different systems or preparing
markdown for platform-specific publishing."
```

❌ **WRONG examples:**
```
"This skill does link validation."  ← Too vague

"For links and validation stuff."  ← Unclear

"Advanced link validation with 12 features including..."  ← Too detailed
```

### Structure
1. **One-line capability statement** (what it does)
2. **When to use trigger** (under what conditions)
3. **Key benefit or outcome** (what you get)

---

## Progressive Disclosure Pattern

### Main SKILL.md (< 500 lines)
- Overview of skill capability
- When to use conditions
- Quick start (optional)
- Basic instructions (5-10 steps max)
- Common patterns (2-4 key patterns)
- Links to supporting files

### Supporting Files (On-Demand)
Claude loads these **only when relevant**:
- `EXAMPLES.md` - Real-world use cases, step-by-step walkthrough
- `STANDARDS.md` - Detailed rules, specifications, validation criteria
- `ANTI-PATTERNS.md` - Common mistakes, why they fail, correct alternatives
- `PATTERNS.md` - Advanced patterns, design decisions, trade-offs
- `TEMPLATES.md` - Templates, boilerplate, starting points

### Example: Low-Overhead Skill
```
SKILL.md: 200 lines (quick reference)
EXAMPLES.md: 150 lines (1-2 detailed examples)
STANDARDS.md: 100 lines (rules and specs)
Total on-demand loading: ~250 lines
```

### Example: Heavy-Duty Skill
```
SKILL.md: 400 lines (comprehensive overview)
EXAMPLES.md: 300 lines (5+ detailed examples)
STANDARDS.md: 400 lines (detailed rules)
ANTI-PATTERNS.md: 250 lines (common mistakes)
PATTERNS.md: 300 lines (advanced patterns)
Total on-demand loading: ~1,250 lines
```

---

## Scope Declaration (MANDATORY)

Every skill MUST declare scope in YAML frontmatter:

### Generic Skills
```yaml
scope: generic
applicable-projects: any
```
✅ Reusable across **any project**
✅ Can be symlinked globally: `~/.claude/skills/`
✅ Source: `ai/skills/{category}/generic-shared-{name}-{capability}/`
✅ Deployed: `.claude/skills/generic-shared-{name}-{capability}/` (auto-synced)
✅ Examples: building-skills, committing-code

### Project-Specific Skills
```yaml
scope: project-specific
applicable-projects: apmr
```
✅ APM-R framework only
✅ Domain knowledge embedded
✅ Directory: `.claude/skills/apmr/`
✅ Examples: ticket-structure-validator, adf-expert, risk-analyzer-format

### Platform-Specific Skills (Within Domain Categories)
```yaml
scope: generic
applicable-projects: any
# But platform-specific (iOS, Android, Web, etc.)
```
✅ Reusable across **any project using that platform**
✅ Source: `ai/skills/{domain-category}/{platform}-{skill-name}/`
✅ Example: `ai/skills/coding/android-development-standards/`
✅ NOT in separate platform folder: ~~`ai/skills/android/android-development-standards/`~~
✅ Keeps related domain skills together (coding: generic + Android + Web)

**Platform skill naming:** `{platform}-{descriptive-name}`
- `android-development-standards` (Android coding patterns)
- `web-development-standards` (Web coding patterns)

### Scope Decision Tree
**Ask yourself:**
1. Would this skill be useful in a **different project** with different domain?
   - YES → Generic skill
   - NO → Project-specific skill

2. Does the skill require **APM-R specific knowledge** (Jira structure, framework governance, etc.)?
   - YES → Project-specific skill
   - NO → Generic skill

3. Can the skill work with **any project's context files**?
   - YES → Generic skill
   - NO → Project-specific skill

---

## Step-by-Step: Create a New Skill

### Step 1: Plan the Skill (Before Writing)
1. **Define capability:** What problem does this solve?
2. **Target use cases:** Who will invoke this and when?
3. **Decide scope:** Generic or project-specific?
4. **Choose name:** Gerund form, lowercase-hyphens, <= 64 chars
5. **Estimate size:** < 500 lines main, how many supporting files?

### Step 2: Create Directory Structure
```bash
# Create in taxonomy (source of truth)
mkdir -p ai/skills/{category}/{scope}-[shared]-{name}-{capability}/

# Example for meta skill:
# mkdir -p ai/skills/meta/building-skills/

# Deployment (.claude/skills/) is auto-synced via pre-commit hook
```

### Step 3: Write SKILL.md (< 500 lines)
1. **YAML frontmatter:** name, description, scope, applicable-projects
2. **When to Use:** Clear conditions for invocation
3. **Quick Start:** Optional quick reference
4. **Instructions:** 3-5 numbered steps
5. **Common Patterns:** 2-4 key patterns with descriptions
6. **See Also:** Links to supporting files or related docs

### Step 4: Create Supporting Files (If Needed)
- `EXAMPLES.md` - Concrete examples (50-300 lines)
- `STANDARDS.md` - Detailed standards (50-400 lines)
- `ANTI-PATTERNS.md` - Common mistakes (50-300 lines)
- `PATTERNS.md` - Advanced patterns (optional, 100-300 lines)
- `TEMPLATES.md` - Templates and boilerplate (optional, 50-200 lines)

### Step 5: Test the Skill
1. **Syntax check:** Valid YAML frontmatter
2. **Scope validation:** Correct scope declaration
3. **Link validation:** All references work
4. **Invocation test:** Works with Claude Code
5. **Model testing:** Test across Claude 3.5 Sonnet, Opus, Haiku

### Step 6: Document Optional MCPs
If skill uses optional MCPs:
1. List MCPs at top of instructions
2. Show graceful fallback if MCP unavailable
3. Example: "Requires atlassian MCP (optional) for batch operations; falls back to single-item processing if unavailable"

### Step 7: Validate Against This Skill
Before finalizing:
- [ ] SKILL.md < 500 lines
- [ ] Description clearly states WHEN to use (max 1024 chars)
- [ ] Scope declared correctly in YAML
- [ ] Gerund naming (verb + -ing)
- [ ] Progressive disclosure pattern used
- [ ] Supporting files on-demand (not embedded)
- [ ] Examples clear and concrete
- [ ] No project-specific details in generic skills
- [ ] Tested with multiple models
- [ ] Optional MCPs documented with fallbacks

### Step 8: Sync to Deployment
Skills are automatically synced from source to deployment:
```bash
# Source of truth (where you work):
ai/skills/{category}/{skill-name}/

# Deployment (auto-synced by pre-commit hook):
.claude/skills/{skill-name}/

# Manual sync (if needed):
python3 src/framework/sync_skills.py --apply
```

**When changes sync:**
- Automatically on `git commit` (pre-commit hook)
- Hook detects changes in `ai/skills/` or `.claude/skills/`
- Runs `sync_skills.py --apply` and stages updated `.claude/skills/`
- Commit proceeds with both source and deployment updated

**Skip sync (performance):**
```bash
SKIP_SKILLS_SYNC=1 git commit -m "message"
```

---

## Common Patterns for Skills

### Pattern 1: Validation Skills
**Purpose:** Verify content against standards

**Structure:**
1. When to use: "When you need to verify X meets Y standard"
2. Quick start: Checklist of validation points
3. Instructions: How to run validation
4. Patterns: Common validation rules
5. See Also: Standards documentation

**Example:** `validating-links`, `yaml-frontmatter-validator`, `formatting-markdown`

### Pattern 2: Conversion Skills
**Purpose:** Transform from one format to another

**Structure:**
1. When to use: "When you need to convert X to Y"
2. Quick start: Supported source/target formats
3. Instructions: Step-by-step conversion process
4. Patterns: Format mapping rules
5. See Also: Format-specific standards

**Example:** `format-converter`, `markdown-to-adf`, `csv-to-json`

### Pattern 3: Domain Expert Skills
**Purpose:** Provide specialized knowledge

**Structure:**
1. When to use: "When you need expertise in X domain"
2. Quick start: Common scenarios
3. Instructions: How to get expert guidance
4. Patterns: Common decision patterns
5. See Also: Standards, examples, decisions

**Example:** `adf-expert`, `test-strategy-designer`, `git-best-practices`

### Pattern 4: Maintenance Skills
**Purpose:** Keep systems consistent

**Structure:**
1. When to use: "When you need to maintain/update X"
2. Quick start: Common maintenance tasks
3. Instructions: Maintenance procedures
4. Patterns: Consistency rules
5. See Also: Validation, standards, procedures

**Example:** `building-framework`, `registry-validator`, `documentation-standards`

---

## MCP Integration in Skills

### Optional MCP Pattern
If your skill uses an optional MCP:

```markdown
## MCP Integration (Optional)

This skill can use the **atlassian MCP** for batch operations:
- Requires: `atlassian` MCP available
- Fallback: If MCP unavailable, processes single items
- Discovery: Checks `mcp_available("atlassian")` before invoking

**If using MCP:**
```bash
mcp__MCP_DOCKER__code-mode "task" --servers ["atlassian"]
```

**If MCP unavailable:**
- Falls back to Python script: `src/jira/create_jira_story.py`
- Performance: Slower but fully functional
```

### Never Hardcode MCP Dependencies
❌ **WRONG:** Skill requires MCP to function
✅ **RIGHT:** Skill uses MCP if available, graceful fallback if not

---

## Testing Your Skill

### Test Checklist (Required Before Submission)

- [ ] **Syntax Validation**
  - YAML frontmatter valid
  - No markdown syntax errors
  - Links check out

- [ ] **Scope Validation**
  - Scope declared (generic | project-specific)
  - Applicable-projects declared (any | specific)
  - No cross-scope contamination

- [ ] **Content Validation**
  - SKILL.md < 500 lines
  - Description clear and ≤ 1024 chars
  - When to Use section unambiguous
  - Instructions have 3-5 numbered steps
  - Common Patterns included

- [ ] **Invocation Testing**
  - Works with Claude Code
  - Works with different models (Claude 3.5 Sonnet, Opus, Haiku)
  - Clear error messages if something fails

- [ ] **Supporting Files**
  - All referenced files exist
  - No circular references
  - Progressive disclosure pattern observed

- [ ] **MCP Testing (if applicable)**
  - MCP integration documented
  - Fallback works if MCP unavailable
  - No hard dependency on MCP

---

## See Also

### Supporting Files
- [Real-world examples](EXAMPLES.md) - Step-by-step skill creation examples
- [Design patterns](PATTERNS.md) - Validation, conversion, expert, and maintenance patterns
- [Common mistakes](ANTI-PATTERNS-STRUCTURE.md) - Structure and organization anti-patterns
- [Naming anti-patterns](ANTI-PATTERNS-NAMING.md) - Gerund naming and scope declaration mistakes
- [Content anti-patterns](ANTI-PATTERNS-CONTENT.md) - Description, content, and testing issues
- [MCP anti-patterns](ANTI-PATTERNS-MCP.md) - MCP integration mistakes and fallback patterns

### Related Skills
- [building-framework](../building-framework/SKILL.md) - Governance rules for skill creation

---

## Real-World Example: validating-links Skill

**Directory structure:**
```
.claude/skills/generic/validating-links/
├── SKILL.md (300 lines)
├── EXAMPLES.md (150 lines)
└── STANDARDS.md (100 lines)
```

**SKILL.md content:**
- When to Use: "When reviewing markdown files for broken links"
- Quick Start: "Run validator on specific files"
- Instructions: 4 steps (check-files → run-validator → review-errors → fix-links)
- Patterns: 3 common patterns (relative paths, external URLs, markdown syntax)

**EXAMPLES.md content:**
- 3 detailed examples with before/after
- Step-by-step walkthrough
- Common error scenarios

**STANDARDS.md content:**
- Link validation rules
- Supported link types
- Error categories

**Usage:**
```
Claude loads SKILL.md (300 lines)
→ User asks for "detailed examples"
→ Claude loads EXAMPLES.md (+150 lines)
→ User asks about "link validation standards"
→ Claude loads STANDARDS.md (+100 lines)
```

Progressive disclosure: Only loads supporting files when needed.

---

## Checklist for Building All 21 APM-R Skills

This skill is the TEMPLATE for all others:

**Phase 1A (Meta-Skills):**
- ✅ This skill: `building-skills` (you are reading it)
- ⏳ Next: `building-framework`

**Phase 1B (Infrastructure Skills):**
- ⏳ `validating-links` (use this skill as template)
- ⏳ `formatting-markdown` (use this skill as template)
- ⏳ `updating-changelogs` (use this skill as template)

**Phases 2-5 (Extended Skills):**
- 14 skills, all built using this skill as reference

---

## Key Takeaways

1. **SKILL.md < 500 lines** - Keep main file focused, supporting files on-demand
2. **Gerund names** - Use verb + -ing form (formatting, validating, building)
3. **Clear descriptions** - Answer WHEN to use, max 1024 chars
4. **Scope declared** - Every skill declares generic | project-specific
5. **Progressive disclosure** - Supporting files loaded as needed
6. **Optional MCPs** - Never hardcode, always graceful fallback
7. **Test before submitting** - Syntax, scope, invocation, multiple models
8. **Follow this template** - This skill is the authoritative reference for all APM-R skills

---

**Skill Version:** 1.0
**Status:** Foundation Meta-Skill - Phase 1A Priority
**Next Skill to Build:** building-framework (Phase 1A)
**Phase 1A Complete When:** Both meta-skills operational and tested
**Phase 1B Begins:** After Phase 1A validation
