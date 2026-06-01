---
id: structuring-code
module: coding
name: Organizing Code Structure
description: Code organization principles for file structure, readability, and DRY compliance. Use when evaluating code organization, planning file structure, or assessing code for maintainability. Provides language-agnostic structural goals.
scope: generic
applicable-projects: any
capabilities-provided:
  - code-organization
  - file-structure-guidance
  - readability-assessment
---

# Organizing Code Structure

## When to Use This Skill

Use this skill when you need to:
- Evaluate existing code organization and identify structural issues
- Plan file and directory structure for new features or projects
- Assess code readability and maintainability
- Identify duplication and determine extraction opportunities
- Review code structure in pull requests
- Establish structural guidelines for a project

**Agents that benefit from this skill:**
- ai-app-developer (code organization decisions)
- ai-architect (structural design guidance)
- ai-framework-developer (framework structure patterns)

**Relationship to other skills:**
- `implementing-code` covers HOW to write code (process, testing, review)
- This skill covers WHAT good structure looks like (goals, targets, indicators)
- `designing-architecture` covers SYSTEM design (components, data flows)

---

## Quick Start: Structure Assessment Checklist

### File Organization (quick check)
- [ ] Each file has a single, clear responsibility
- [ ] File sizes are under 500 lines (split larger files)
- [ ] Related files are colocated in directories
- [ ] File names clearly describe their contents

### Code Readability (quick check)
- [ ] Names are self-descriptive without needing comments
- [ ] Functions are small and focused (under 50 lines typically)
- [ ] Nesting depth is shallow (max 3 levels)
- [ ] Comments explain WHY, not WHAT

### DRY Compliance (quick check)
- [ ] No obvious copy-paste duplication
- [ ] Shared logic is extracted to reusable units
- [ ] Abstractions are meaningful and reduce complexity
- [ ] No over-engineering for hypothetical future needs

> **Deep dive:** See [CHECKLISTS.md](CHECKLISTS.md) for comprehensive review checklists.

---

## Related Coding Standards - Quick Reference

When evaluating code structure, also verify compliance with these essentials:

### Architecture Essentials
> From: `designing-architecture`
- [ ] Document architectural decisions with rationale and alternatives
- [ ] Ensure no circular dependencies between components
- [ ] Check technology choices are justified (not premature optimization)

### Implementation Essentials
> From: `implementing-code`
- [ ] Tests: cover happy path, edge cases, error conditions (AAA pattern)
- [ ] Error handling: specific exceptions, user-friendly messages
- [ ] Self-review before commit: tests pass, linting clean, no debug code
- [ ] Code review: functionality, security, performance, test coverage

<!-- SYNC-NOTE: Keep in sync with source skills. Last synced: 2026-01-04 -->

---

## Instructions

### 1. Assess File Organization

**Goal:** Each file should have one clear responsibility and be easy to locate.

**One Responsibility Per File:**
- Single class, component, or module per file
- File name matches its primary export
- Exceptions: tightly coupled helper types, test utilities

**File Size Limits:**
- Target: 100-400 lines (ideal range)
- Maximum: 500 lines (hard limit - split if exceeding)
- Very small files (<30 lines) may indicate over-splitting
- If file needs >500 lines, it has multiple responsibilities - split it

**Directory Structure:**
- Colocate related files (feature-based organization preferred)
- Keep directory depth shallow (2-4 levels typically)
- Group by feature or domain, not by file type alone
- Use index/barrel files sparingly

**File Naming:**
- Name describes content clearly
- Follow project conventions (kebab-case, PascalCase, etc.)
- Use consistent suffixes (.test, .types, .utils, .config)

> **Details:** See [FILE-ORGANIZATION.md](FILE-ORGANIZATION.md) for comprehensive guidance.

---

### 2. Evaluate Code Readability

**Goal:** Code should be self-documenting and easy to understand without extensive comments.

**Self-Descriptive Naming:**
- Variables: reveal purpose (`elapsedTimeInDays` not `d`)
- Functions: verb + noun, action-oriented (`getUserById`, `calculateTotal`)
- Classes/Types: noun-based, domain language (`OrderProcessor`, `UserAccount`)
- Booleans: `is/has/should/can` prefixes (`isActive`, `hasPermission`)
- Avoid abbreviations except universal ones (id, url, api)

**Function Design Goals:**
- Size: 20-50 lines typical, rarely exceed 100
- Parameters: 3-4 maximum, use options object for more
- Nesting: Maximum 3 levels (extract deeper logic)
- Single responsibility: one function, one job
- Return early to reduce nesting

**Comment Strategy:**
- Prefer self-documenting code over comments
- Comment the WHY (intent, reasoning), not the WHAT
- Documentation comments for public APIs
- TODO format: `TODO(context): description`
- Delete outdated comments immediately

**Consistent Style:**
- Follow project conventions without exception
- Use automated formatting (Prettier, Black, etc.)
- Consistency beats personal preference

> **Details:** See [READABILITY.md](READABILITY.md) for comprehensive guidance.

---

### 3. Identify DRY Violations

**Goal:** Eliminate harmful duplication while avoiding premature abstraction.

**Types of Duplication:**
- **Exact duplication:** Copy-pasted code blocks
- **Structural duplication:** Same pattern with different data
- **Conceptual duplication:** Same concept, different implementations

**When to Extract:**
- Rule of three: Consider extraction on third occurrence
- Business concept exists: Name the abstraction meaningfully
- Changes propagate: Same logic changed in multiple places
- Tests duplicated: Same setup/assertions repeated

**When NOT to Extract:**
- Incidental similarity: Looks same now, evolves differently
- Different contexts: Same code, different business meaning
- Abstraction adds complexity: Cure worse than disease
- "Wrong abstraction is worse than duplication"

**Extraction Quality:**
- Good abstractions hide complexity
- Bad abstractions create coupling
- Abstractions should be stable (change rarely)
- Prefer composition over deep inheritance

> **Details:** See [DRY-PRINCIPLES.md](DRY-PRINCIPLES.md) for comprehensive guidance.

---

## Common Patterns

### Pattern 1: Evaluating Existing Structure

**When:** Reviewing unfamiliar codebase or assessing technical debt.

**Approach:**
1. Start with directory structure - does organization reveal intent?
2. Check file sizes - identify large files (potential multiple responsibilities)
3. Sample functions - assess naming, size, nesting
4. Look for duplication patterns - grep for similar code blocks
5. Check test organization - mirrors source structure?

**Output:** List of structural issues with severity and recommended actions.

---

### Pattern 2: Planning New Feature Structure

**When:** Starting new feature or component.

**Approach:**
1. Identify domain concepts - what entities and operations exist?
2. Map to file structure - one concept per file
3. Plan directory placement - colocate with related features
4. Define public interfaces - what's exposed vs internal?
5. Consider test structure - where will tests live?

**Output:** Proposed file/directory structure before writing code.

---

### Pattern 3: Identifying Extraction Opportunities

**When:** Code review reveals duplication or large functions.

**Approach:**
1. Identify repeated code - exact, structural, or conceptual
2. Assess evolution paths - will these change together?
3. Name the abstraction - can you describe what it does?
4. Evaluate complexity - does extraction simplify or complicate?
5. Consider alternatives - inline vs extract vs refactor differently

**Output:** Specific extraction recommendations with rationale.

---

### Pattern 4: Reviewing Structure in PRs

**When:** Code review for structural quality.

**Approach:**
1. File changes - new files placed correctly? Named well?
2. File sizes - changes push files over reasonable limits?
3. Function additions - small, focused, well-named?
4. Duplication - new code duplicate existing patterns?
5. Overall cohesion - changes increase or decrease clarity?

**Output:** Structural feedback separate from logic/correctness feedback.

---

## Structural Goals Reference

| Aspect | Target | Signal of Problem |
|--------|--------|-------------------|
| File size | 100-400 lines | 500+ lines (must split) |
| Function size | 20-50 lines | 100+ lines |
| Function parameters | 3-4 max | 5+ parameters |
| Nesting depth | 2-3 levels | 4+ levels |
| Directory depth | 2-4 levels | 6+ levels |
| Cyclomatic complexity | <10 | 15+ |

**Note:** File size is a hard limit (500 max). A 200-line file with mixed concerns still needs splitting. Files approaching 500 lines should be proactively reviewed for split opportunities.

---

## Anti-Patterns Overview

### File Organization Anti-Patterns
- **God files:** Single file with multiple unrelated responsibilities
- **Over-splitting:** One-liner files that fragment logic unnecessarily
- **Type-based grouping:** All controllers in one folder, all services in another (prefer feature-based)
- **Deep nesting:** 6+ directory levels making navigation difficult

### Readability Anti-Patterns
- **Cryptic names:** Single-letter variables, unclear abbreviations
- **Comment-dependent code:** Code that requires comments to understand
- **Deep nesting:** Nested conditionals/loops beyond 3 levels
- **Long parameter lists:** Functions with 5+ positional parameters

### DRY Anti-Patterns
- **Premature abstraction:** Extracting before pattern is clear
- **Wrong abstraction:** Abstraction that doesn't match the concept
- **Copy-paste programming:** Duplicating instead of extracting
- **Inheritance abuse:** Deep hierarchies for code reuse

---

## See Also

- [FILE-ORGANIZATION.md](FILE-ORGANIZATION.md) - Detailed file and directory organization principles
- [READABILITY.md](READABILITY.md) - Naming conventions, function design, comment strategy
- [DRY-PRINCIPLES.md](DRY-PRINCIPLES.md) - Duplication detection and extraction guidelines
- [CHECKLISTS.md](CHECKLISTS.md) - Quick reference checklists for review

**Related Skills:**
- `implementing-code` - Implementation process, testing, code review
- `designing-architecture` - System-level architecture decisions
- `verifying-quality` - Quality evaluation and anti-patterns
