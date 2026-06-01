---
id: verifying-quality
name: enforcing-quality-standards
description: Enforce quality standards via evaluation, anti-patterns, checklists. Use after task completion or during code review to validate work against universal quality criteria.
scope: generic
applicable-projects: all
module: core
capabilities-provided:
  - quality-assurance
# Claude Code v2.1 features
tools:
  - Read
  - Glob
  - Grep
  - Bash
hooks:
  PostToolUse: .claude/hooks/post-write-validate.sh
---

# Enforcing Quality Standards

## When to Use This Skill

Use this skill to enforce quality standards in three scenarios:

1. **After task completion** - Before finalizing deliverables (tickets, code, documentation)
2. **During code review** - Validate implementation against patterns and best practices
3. **Framework maintenance** - Ensure framework artifacts follow governance standards

This skill consolidates five quality frameworks:
- **Anti-patterns detection** - Identify common mistakes across code, tickets, and framework
- **Quality checklists** - Pre-submission validation for all deliverable types
- **Self-evaluation protocol** - Post-task improvements and system refinements
- **CLI testing standards** - Test layers, user context simulation, state verification
- **Defensive coding patterns** - Null-safe output, path context, error quality

---

## Quick Start

### For Code Review (3 min)
1. Load [ANTI-PATTERNS.md](ANTI-PATTERNS.md) - Check code against SOLID, DRY, error handling
2. Verify no hardcoded values, untestable code, or tight coupling
3. Approve if anti-patterns absent

### For Ticket/Story Validation (2 min)
1. Load [QUALITY-CHECKLIST.md](QUALITY-CHECKLIST.md) - Run pre-submission checklist
2. Verify acceptance criteria specific/testable, story points ≤8, proper structure
3. Return feedback with required fixes

### For Post-Task Self-Check (5 min)
1. Load [EVALUATION-PROTOCOL.md](EVALUATION-PROTOCOL.md) - Run self-evaluation
2. Identify root causes of issues or confusion
3. Recommend specific improvements to prevent recurrence

### For CLI Tool Testing (10 min)
1. Load [CLI-TESTING.md](CLI-TESTING.md) - Test layer requirements
2. Verify tests cover: unit logic, integration, CLI surface, state changes, environments
3. Check for user-context testing (not just developer-context)

### For Defensive Code Review (5 min)
1. Load [DEFENSIVE-CODING.md](DEFENSIVE-CODING.md) - Defensive patterns checklist
2. Verify null-safe output, path context awareness, error message quality
3. Check data normalization at boundaries

---

## Core Quality Dimensions

This skill enforces quality across four dimensions:

### 1. Completeness
- All required sections present
- No placeholders or TODOs
- Dependencies identified and linked
- Acceptance criteria defined (where applicable)

### 2. Clarity
- Purpose clearly stated
- Context provided (background, rationale)
- Technical scope defined
- Success metrics identified

### 3. Conciseness
- No unnecessary verbosity
- Focused on essentials
- Appropriate detail level for audience
- No redundant information

### 4. Format Compliance
- Template structure followed
- Markdown formatting correct
- YAML frontmatter complete (if required)
- Cross-references valid

---

## Instructions

### Instruction 1: Identify Quality Category
Determine what you're evaluating:
- **Code:** Use code anti-patterns from ANTI-PATTERNS.md
- **Tickets/Stories:** Use quality checklist from QUALITY-CHECKLIST.md
- **Framework artifacts:** Use both anti-patterns and checklist
- **Post-task reflection:** Use evaluation protocol from EVALUATION-PROTOCOL.md
- **CLI tools/commands:** Use CLI testing standards from CLI-TESTING.md
- **Defensive coding review:** Use defensive patterns from DEFENSIVE-CODING.md

### Instruction 2: Load Supporting Material
Based on category, load relevant file:
- **Code review:** See [ANTI-PATTERNS.md](ANTI-PATTERNS.md) for SOLID, DRY, error handling, configuration, testability patterns
- **Ticket validation:** See [QUALITY-CHECKLIST.md](QUALITY-CHECKLIST.md) for stories, epics, reports, code checklists
- **Self-evaluation:** See [EVALUATION-PROTOCOL.md](EVALUATION-PROTOCOL.md) for post-task improvement process
- **CLI testing:** See [CLI-TESTING.md](CLI-TESTING.md) for test layers, user context, state verification, environment variation
- **Defensive coding:** See [DEFENSIVE-CODING.md](DEFENSIVE-CODING.md) for null-safe output, path context, error quality
- **Real examples:** See [EXAMPLES.md](EXAMPLES.md) for concrete before/after scenarios

### Instruction 3: Run Validation
Apply standards against the deliverable:
- Check all items from relevant checklist
- Identify violations (anti-patterns present, checklist items missing)
- Note severity (blocker vs. nice-to-have)

### Instruction 4: Report Issues
For each issue found:
- **What:** Specific violation or missing element
- **Why:** Impact on quality or effectiveness
- **Fix:** Concrete action to resolve (file path, section, exact changes)

### Instruction 5: Apply Improvements
If user approves or issues are self-evident:
- Update the artifact
- Verify fix resolves the issue
- Confirm changes with user

---

## Common Patterns

### Pattern 1: Code Quality Review
**Scenario:** Reviewing implementation PR for quality issues

**Process:**
1. Check ANTI-PATTERNS.md Code section
2. Verify SOLID principles (Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion)
3. Check DRY (no copy-paste, extract helpers)
4. Verify error handling (specific exceptions, user-friendly messages, input validation)
5. Confirm configuration externalized (no hardcoded secrets, magic numbers)
6. Validate testability (dependency injection, pure functions, mockable interfaces)

**Report format:** "Found 3 issues: [list each] → Recommendations: [fix for each]"

### Pattern 2: Ticket Quality Validation
**Scenario:** Reviewing ticket before export to Jira

**Process:**
1. Determine ticket type (story, epic, task, bug)
2. Load relevant checklist from QUALITY-CHECKLIST.md
3. Verify all required sections present and complete
4. Confirm acceptance criteria specific/testable
5. Check story points appropriate (≤8)
6. Validate no code snippets (reference patterns instead)

**Report format:** "Issues found: [missing sections] → Required fixes: [checklist items]"

### Pattern 3: Post-Task Self-Improvement
**Scenario:** After completing task, identify lessons learned

**Process:**
1. Load EVALUATION-PROTOCOL.md
2. Answer: Did anything go wrong? (errors, warnings, unclear instructions)
3. Identify root cause (missing info, outdated context, unclear workflow)
4. Recommend specific fix (file path, section, exact changes)
5. Apply fix if approved

**Report format:** "Issue: [what went wrong] → Root cause: [why] → Fix: [specific file + section + changes]"

### Pattern 4: Framework Governance Validation
**Scenario:** Reviewing framework artifacts (agents, skills, context files)

**Process:**
1. Check against code anti-patterns (no project-specific content in agents)
2. Verify agent purity (all project content in context files)
3. Check for duplication (no copy-pasted content across files)
4. Validate cross-references (links up-to-date, no broken references)
5. Confirm structure follows standards (naming, frontmatter, organization)

**Report format:** "Framework issues: [specific violations] → Corrections needed: [file path + changes]"

### Pattern 5: CLI Tool Testing Validation
**Scenario:** Reviewing tests for CLI tool or command implementation

**Process:**
1. Load CLI-TESTING.md for test layer requirements
2. Verify test layers present: unit tests, integration tests, CLI surface tests
3. Check for user-context testing (tests run from simulated user project, not CLI source)
4. Verify state verification (tests check side effects: manifest updates, file creation)
5. Check environment variation tests (no TTY, outside project, paths with spaces)
6. Verify output validation (no "undefined", "Invalid Date", correct paths)

**Report format:** "CLI testing gaps: [missing layers] → Required tests: [specific test scenarios]"

### Pattern 6: Defensive Coding Review
**Scenario:** Reviewing code for defensive patterns that prevent runtime bugs

**Process:**
1. Load DEFENSIVE-CODING.md for defensive patterns checklist
2. Check null-safe display (all user-facing output handles missing values)
3. Verify path context awareness (projectPath vs frameworkRoot explicit)
4. Check data normalization at boundaries (YAML dates, JSON parsing)
5. Verify error message quality (user-relevant paths, actionable messages)
6. Check feature flag completeness (defined → passed → implemented → tested)

**Report format:** "Defensive coding issues: [pattern violations] → Fixes: [specific code changes]"

---

## See Also

### Supporting Files
- [ANTI-PATTERNS.md](ANTI-PATTERNS.md) - Code, ticket, framework, CLI testing, defensive coding anti-patterns
- [QUALITY-CHECKLIST.md](QUALITY-CHECKLIST.md) - Domain-specific checklists for stories, epics, reports, code, CLI testing
- [EVALUATION-PROTOCOL.md](EVALUATION-PROTOCOL.md) - Post-task self-evaluation and improvement process
- [CLI-TESTING.md](CLI-TESTING.md) - CLI test layers, user context simulation, state verification, environment variation
- [DEFENSIVE-CODING.md](DEFENSIVE-CODING.md) - Null-safe output, path context, data normalization, error quality
- [EXAMPLES.md](EXAMPLES.md) - Real scenarios with before/after comparisons (including CLI testing examples)

### Related Framework Resources
- `common-anti-patterns.md` - Original anti-patterns reference (source)
- `quality-standards.md` - Original quality standards reference (source)
- `agent-self-evaluation.md` - Original evaluation protocol reference (source)

### Related Skills
- `building-framework` - Framework-wide governance rules and standards

---

## Token Budget

**Total skill size:** ~4,200 tokens
- SKILL.md: ~600 tokens (this file)
- ANTI-PATTERNS.md: ~400 tokens
- QUALITY-CHECKLIST.md: ~250 tokens
- EVALUATION-PROTOCOL.md: ~100 tokens
- CLI-TESTING.md: ~500 tokens
- DEFENSIVE-CODING.md: ~350 tokens
- EXAMPLES.md: ~400 tokens

**Loading profile:**
- Initial load (SKILL.md): ~600 tokens
- On-demand supporting files: ~300-900 tokens depending on scenario

---

## Key Takeaways

1. **Five quality frameworks** - Anti-patterns, checklists, self-evaluation, CLI testing, defensive coding
2. **Progressive disclosure** - Load supporting files based on scenario (code, ticket, CLI, post-task)
3. **Domain-specific validation** - Different standards for code vs. tickets vs. CLI tools vs. documentation
4. **User-context testing** - CLI tests must simulate real user environment, not developer context
5. **Defensive patterns** - Prevent bugs through null-safe output, path awareness, data normalization
6. **Continuous improvement** - Self-evaluation protocol identifies and fixes root causes
7. **Universal applicability** - Works across all projects and artifact types

---

**Skill Version:** 2.0
**Status:** Enhanced with CLI Testing & Defensive Coding
**Created:** 2025-12-07
**Updated:** 2025-12-30
**Consolidated from:**
- ai/shared/common-anti-patterns.md
- ai/shared/quality-standards.md
- ai/shared/agent-self-evaluation.md
- CLI QA findings (21 bugs analysis)
