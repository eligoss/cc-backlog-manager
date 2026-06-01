# Maintaining Framework Governance - Real-World Examples

## Example 1: Decision - Create a New Generic Skill

**Scenario:** You notice that markdown formatting standards are documented in 3 different places:
- ai/context/documentation-standards.md
- ai/shared/markdown-formatting-guide.md
- framework/ROUTES-vs-REGISTRY.md

Each document has slightly different rules, leading to inconsistency.

**Governance Decision Process:**

**Step 1: Identify the Problem**
```
Problem: Markdown formatting rules scattered across 4 locations
Impact: Inconsistent formatting, confusing developers
Affected files: 4 locations
```

**Step 2: Apply Governance Rules**
```
Rule 1 (Pure Agent Pattern):
  ✅ No project-specific knowledge involved
  ✅ Can be documented generically

Rule 2 (Consolidation):
  ✅ Knowledge scattered in 4+ places
  ✅ Should be consolidated into 1 skill

Rule 3 (Scope):
  ✅ Generic - not APM-R specific
  ✅ Would work in any markdown project

Rule 4 (Symlinks):
  ✅ Store in .claude/skills/generic/
  ✅ Reference from ~/.claude/skills/

Rule 5 (Token Budget):
  ✅ SKILL.md: 300 lines
  ✅ EXAMPLES.md: 200 lines
  ✅ STANDARDS.md: 150 lines
  ✅ Total: ~650 tokens (under 2.5K limit)

Rule 6 (Quality Gate):
  ✅ Can validate markdown formatting
  ✅ Can provide automated feedback
```

**Step 3: Make Decision**
```
Decision: CREATE GENERIC SKILL
Name: formatting-markdown
Location: .claude/skills/generic/formatting-markdown/
Scope: generic
Applicable-projects: any
```

**Step 4: Implementation**
```
1. Create directory: .claude/skills/generic/formatting-markdown/
2. Write SKILL.md (300 lines) with markdown standards
3. Write EXAMPLES.md (200 lines) with before/after examples
4. Write STANDARDS.md (150 lines) with validation rules
5. Add to registry.yml with metadata
6. Create symlinks
7. Update routes.yml
8. Commit with message: "feat: add formatting-markdown skill (Phase 1B)"
9. Update v11.0 plan progress
```

**Result:**
✅ Single source of truth for markdown standards
✅ Can be used in any project
✅ Automated validation possible
✅ Framework governance improved

---

## Example 2: Decision - Create a Project-Specific Skill

**Scenario:** Ticket structure validation keeps failing. Issues observed:
- 30% of tickets have missing YAML frontmatter
- 25% have wrong issue type
- 20% have incomplete acceptance criteria

Validation rules are scattered:
- ai/context/process-basic.md (2 rules)
- backlog/.STORY-TEMPLATE.md (5 rules)
- framework-governance.md (3 rules)
- ai/shared/quality-standards.md (4 rules)

**Governance Decision Process:**

**Step 1: Identify the Problem**
```
Problem: Ticket validation failing due to inconsistent standards
Impact: Low quality tickets, more review cycles needed
Affected files: 4 locations + 1 template
Frequency: 30-40% failure rate
```

**Step 2: Apply Governance Rules**
```
Rule 1 (Pure Agent Pattern):
  ❌ This is APM-R specific (Jira fields, ticket types)
  ✅ Can't be made generic

Rule 2 (Consolidation):
  ✅ Knowledge scattered in 4+ locations
  ✅ Should consolidate into skill

Rule 3 (Scope):
  ❌ NOT generic - APM-R specific Jira fields
  ✅ PROJECT-SPECIFIC (APM-R only)

Rule 4 (Symlinks):
  ✅ Store in .claude/skills/apmr/
  ✅ Reference from ~/.claude/skills/apmr/

Rule 5 (Token Budget):
  ✅ SKILL.md: 350 lines
  ✅ EXAMPLES.md: 250 lines
  ✅ STANDARDS.md: 200 lines
  ✅ ANTI-PATTERNS.md: 150 lines
  ✅ Total: ~1,900 tokens (under 2.5K)

Rule 6 (Quality Gate):
  ✅ Provides validation (30%+ improvement potential)
  ✅ Can automate ticket quality checks
  ✅ Enables consistency
```

**Step 3: Make Decision**
```
Decision: CREATE PROJECT-SPECIFIC SKILL
Name: ticket-structure-validator
Location: .claude/skills/apmr/ticket-structure-validator/
Scope: project-specific
Applicable-projects: apmr
Impact: Improves ticket quality by 30%+
```

**Step 4: Implementation**
```
1. Create directory: .claude/skills/apmr/ticket-structure-validator/
2. Write SKILL.md (350 lines) with validation rules
3. Write EXAMPLES.md (250 lines) with validation scenarios
4. Write STANDARDS.md (200 lines) with APM-R specific rules
5. Write ANTI-PATTERNS.md (150 lines) with common failures
6. Add to registry.yml with metadata
7. Create symlinks to ~/.claude/skills/apmr/
8. Commit: "feat: add ticket-structure-validator skill (Phase 2)"
9. Update v11.0 progress tracker
10. Run validator on existing tickets to establish baseline
```

**Expected Results:**
✅ Ticket quality improves 30%+
✅ Consistent validation for all new tickets
✅ Clear error messages for fix guidance
✅ APM-R framework strengthened

---

## Example 3: Decision - Update Existing File (Not a Skill)

**Scenario:** Process documentation in ai/context/process-basic.md needs clarification on agile ceremonies.

**Governance Decision Process:**

**Step 1: Identify the Problem**
```
Problem: Sprint planning procedures unclear in process docs
Impact: One time per sprint (low frequency)
Affected files: 1 location (process-basic.md)
```

**Step 2: Apply Governance Rules**
```
Rule 2 (Consolidation):
  ❌ Knowledge only in 1 location
  ✅ No consolidation needed

Rule 3 (Scope):
  ✅ Generic information (agile practices)
  ✅ But only needed in 1 file

Rule 6 (Quality Gate):
  ❌ Documentation update, not validation
  ✅ No quality gate needed
```

**Step 3: Make Decision**
```
Decision: UPDATE EXISTING FILE (Don't create skill)
Location: ai/context/process-basic.md
Action: Add 100 lines clarifying agile ceremonies
No skill needed - too narrow, too localized
```

**Step 4: Implementation**
```
1. Edit ai/context/process-basic.md
2. Add section: "Agile Ceremonies & Cadences"
3. Document sprint planning, daily standup, retrospectives
4. Commit: "docs: clarify agile ceremonies in process documentation"
5. Done - no additional steps needed
```

**Result:**
✅ Documentation improved
✅ No unnecessary skill created
✅ Simpler, less token overhead
✅ Maintains framework efficiency

---

## Example 4: Governance Check - Should We Create a Skill?

**Scenario:** Building automation scripts consolidation

**Question 1:** Is knowledge scattered across 3+ places?
```
Answer: YES
- cli/src/lib/backlog/
- cli/src/commands/jira/
- cli/src/commands/confluence/
- cli/src/lib/common/ (shared utilities)
= 4+ locations
```

**Question 2:** Is it referenced by 2+ agents?
```
Answer: YES
- ai-backlog-manager uses backlog push/pull scripts
- ai-confluence-manager uses import scripts
- ai-framework-developer uses all of them
```

**Question 3:** Will this become a quality gate?
```
Answer: YES (somewhat)
- Scripts should follow consistent patterns
- Error handling should be uniform
- Documentation should be consistent
```

**Question 4:** Is this reusable outside APM-R?
```
Answer: NO
- Tightly coupled to APM-R Jira structure
- Specific to APM-R workflow
```

**Decision Analysis:**
```
Scattered in 3+ places: ✅ YES → Create skill
Reused by multiple agents: ✅ YES → Create skill
Quality gate potential: ✅ YES → Create skill
Reusable elsewhere: ❌ NO → Project-specific

DECISION: Create project-specific skill
Name: typescript-cli-standards
Location: .claude/skills/apmr/typescript-cli-standards/
Purpose: Document and validate TypeScript CLI patterns
Impact: Improves command quality and maintainability
```

---

## Example 5: Registry Update - Adding a New Skill

**Scenario:** You've just completed the formatting-markdown skill and need to update registry.yml

**Before (Registry Entry - Missing):**
```yaml
skills: {}  # No skills tracked yet
```

**After (Registry Entry - Added):**
```yaml
skills:
  formatting-markdown:
    type: generic
    status: complete
    version: 1.0
    token-budget: 1500
    files:
      - SKILL.md (300 lines)
      - EXAMPLES.md (200 lines)
      - STANDARDS.md (150 lines)
    depends-on:
      - building-claude-skills (reference template)
    used-by:
      - ai-framework-manager (validates markdown)
      - ai-confluence-manager (format before publish)
    quality-score: 85/100
    phase: 1B
    created: 2025-12-07
    tested-models:
      - claude-3-5-sonnet
      - claude-opus
      - claude-haiku
```

**Steps to Update Registry:**

1. **Locate skill entry** in ai/registry.yml `skills` section
2. **Add metadata:**
   - type: generic | project-specific
   - status: planning | in-progress | complete
   - version: 1.0
   - token-budget: estimated
   - files: list SKILL.md + supporting files
   - depends-on: reference other skills
   - used-by: which agents/files use this
   - quality-score: from QA evaluation
   - phase: Phase 1A/1B/2/etc
   - created: YYYY-MM-DD
   - tested-models: list models tested

3. **Update totals** at bottom of skills section:
   ```yaml
   skill-statistics:
     total: 8
     generic: 5
     project-specific: 3
     complete: 6
     planned: 2
   ```

4. **Commit:** `docs: update registry with formatting-markdown skill metadata`

---

## Decision Matrix - Quick Reference

| Scenario | Question 1 | Question 2 | Question 3 | Decision |
|----------|-----------|-----------|-----------|----------|
| Formatting standards scattered | 3+ places | Multiple files | Generic | **Create Generic Skill** |
| APM-R ticket validation | 3+ places | Multiple files | Project-specific | **Create Project Skill** |
| One file clarification | 1 place | One location | N/A | **Update File** |
| Generic parsing skill | 3+ places | Multiple files | Generic | **Create Generic Skill** |
| Framework-specific rules | 2 places | Narrow usage | Project-specific | **Create Project Skill** |

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Creating Skill for Single File
```
Problem: Only documented in 1 place
Solution: Update that file, don't create skill
Why: Unnecessary token overhead, violates Rule 2
```

### ❌ Mistake 2: Not Checking Scope
```
Problem: Create generic skill with APM-R references
Solution: Always ask "Is this reusable outside APM-R?"
Why: Generic skills should work anywhere
```

### ❌ Mistake 3: Forgetting to Update Registry
```
Problem: Create skill but don't update registry.yml
Solution: Always update registry with metadata
Why: Registry is source of truth for all skills
```

### ❌ Mistake 4: Not Using Decision Tree
```
Problem: Create skills randomly without framework
Solution: Always follow the decision framework
Why: Ensures consistency and governance
```

### ❌ Mistake 5: Skipping Supporting Files
```
Problem: Only create SKILL.md, no EXAMPLES or STANDARDS
Solution: Follow building-claude-skills pattern
Why: Progressive disclosure enables better learning
```

---

