---
id: implementing-code
module: coding
name: Coding Implementation Standards
description: Code implementation standards, testing patterns, and code review best practices. Use when implementing features, writing tests, conducting code reviews, or ensuring code quality meets project standards.
scope: generic
applicable-projects: any
capabilities-provided:
  - code-implementation
  - code-review
  - test-writing
cli-commands:
  note: "Coding module does not have dedicated CLI commands. Validation is done via standard development tools (eslint, tsc, prettier, jest, etc.) configured in the project."
---

# Coding Implementation Standards

## When to Use This Skill

Use this skill when you need to:
- Implement new features or functionality
- Write or review code for quality and standards
- Create tests (unit, integration, end-to-end)
- Conduct code reviews
- Refactor existing code
- Ensure code quality meets project standards
- Apply coding best practices and patterns

**Agents that need this skill:**
- ai-app-developer (code implementation and testing)
- ai-architect (code review and quality validation)
- ai-framework-developer (framework code standards)

---

## Quick Start: Implementation Checklist

**Before Writing Code:**
- ✅ Understand requirements clearly
- ✅ Review existing code patterns in codebase
- ✅ Plan component structure and interfaces
- ✅ Consider testing strategy

**While Writing Code:**
- ✅ Follow existing code style and conventions
- ✅ Write clear, self-documenting code
- ✅ Add comments for complex logic only
- ✅ Keep functions/methods small and focused
- ✅ Write tests alongside implementation

**Before Submitting:**
- ✅ Run tests and verify all pass
- ✅ Check code style and linting
- ✅ Review your own code first
- ✅ Ensure commit messages are clear
- ✅ Update documentation if needed

---

## Related Coding Standards - Quick Reference

When implementing code, also verify compliance with these essentials:

### Architecture Essentials
> From: `designing-architecture`
- [ ] Document architectural decisions with rationale and alternatives
- [ ] Validate design against non-functional requirements (scalability, performance)
- [ ] Ensure no circular dependencies between components
- [ ] Verify architecture supports testing strategy

### Structure Essentials
> From: `structuring-code`
- [ ] One responsibility per file; file name matches content
- [ ] File size under 500 lines (hard limit - must split if exceeding)
- [ ] Functions: 20-50 lines typical, max 3 nesting levels
- [ ] DRY: Rule of three before extracting; wrong abstraction worse than duplication

<!-- SYNC-NOTE: Keep in sync with source skills. Last synced: 2026-01-04 -->

---

## Instructions

### 1. Understand Requirements Before Implementation

**Clarify Requirements:**
- What problem are we solving?
- What are the acceptance criteria?
- What are edge cases to consider?
- What are performance requirements?
- How will this be tested?

**Explore Existing Code:**
- Read existing codebase to understand patterns
- Identify similar features already implemented
- Find reusable components or utilities
- Understand existing architecture and conventions

**Plan Implementation:**
- Break down into smaller tasks
- Identify components to create or modify
- Plan testing approach
- Estimate complexity and time

**Anti-Pattern:** Don't start coding before understanding context.

### 2. Follow Code Quality Standards

**Code Organization:**

**File Structure:**
- One component/class per file (generally)
- Group related files in directories
- Use clear, descriptive file names
- Follow project naming conventions

**Function/Method Design:**
- Single Responsibility Principle: One function, one purpose
- Keep functions small (generally < 50 lines)
- Use descriptive names (verb + noun: `getUserById`, `calculateTotal`)
- Limit parameters (generally < 4, use objects for more)
- Return early to reduce nesting

**See EXAMPLES.md for detailed code examples of good vs bad function design.**

**Variable Naming:**
- Use descriptive names: `userCount` not `uc`
- Boolean variables: `isActive`, `hasPermission`, `shouldUpdate`
- Arrays/lists: Plural names `users`, `items`, `products`
- Constants: `UPPER_SNAKE_CASE` or `camelCase` depending on convention
- Avoid abbreviations unless universally understood

**Code Comments:**
- ✅ Explain "why", not "what" (code shows what)
- ✅ Document complex algorithms or business logic
- ✅ Add TODOs with context and ticket numbers
- ✅ Use JSDoc/docstrings for public APIs
- ❌ Don't comment obvious code
- ❌ Don't leave commented-out code
- ❌ Don't write comments that duplicate code

**See EXAMPLES.md for examples of good vs bad comments.**

### 3. Write Comprehensive Tests

**Testing Strategy:**

**Test Pyramid:**
1. **Unit Tests** (Most)
   - Test individual functions/methods in isolation
   - Fast, numerous, focused
   - Mock dependencies

2. **Integration Tests** (Medium)
   - Test component interactions
   - Database, API integrations
   - More realistic scenarios

3. **End-to-End Tests** (Least)
   - Test complete user workflows
   - Slow, expensive, critical paths only
   - Real browser/environment

**What to Test:**

**Unit Tests:**
- ✅ Happy path (expected input → expected output)
- ✅ Edge cases (empty, null, undefined, zero, negative)
- ✅ Error conditions (invalid input, exceptions)
- ✅ Boundary values (min, max, limits)
- ✅ Business logic rules

**Test Structure (AAA Pattern):**
- Arrange: Set up test data
- Act: Execute the function
- Assert: Verify the result

**See EXAMPLES.md for complete test examples.**

**Test Naming:**
- Descriptive: "should return user when ID exists"
- Include scenario: "should throw error when user not found"
- Use natural language

**Test Coverage Goals:**
- ✅ Aim for 80%+ code coverage for business logic
- ✅ 100% coverage for critical paths
- ✅ Don't obsess over 100% coverage everywhere
- ❌ Coverage is a metric, not a goal

### 4. Conduct Effective Code Reviews

**Code Review Checklist:**

**Functionality:**
- ✅ Does the code do what it's supposed to do?
- ✅ Are edge cases handled?
- ✅ Are error conditions handled appropriately?
- ✅ Does it meet acceptance criteria?

**Code Quality:**
- ✅ Is the code clear and readable?
- ✅ Are functions/methods appropriately sized?
- ✅ Is there unnecessary complexity?
- ✅ Are there code smells (duplicated code, long parameter lists, etc.)?
- ✅ Does it follow project conventions?

**Testing:**
- ✅ Are there tests for new functionality?
- ✅ Do tests cover edge cases?
- ✅ Are tests clear and maintainable?
- ✅ Do all tests pass?

**Security:**
- ✅ Are inputs validated?
- ✅ Are there SQL injection vulnerabilities?
- ✅ Are secrets hardcoded?
- ✅ Are authentication/authorization checked?

**Performance:**
- ✅ Are there obvious performance issues?
- ✅ Are database queries optimized?
- ✅ Are there unnecessary loops or operations?
- ✅ Is memory usage reasonable?

**Documentation:**
- ✅ Are complex parts documented?
- ✅ Are public APIs documented?
- ✅ Is documentation accurate?

**Review Etiquette:**
- ✅ Be constructive and specific
- ✅ Ask questions, don't demand changes
- ✅ Appreciate good code
- ✅ Focus on code, not author
- ✅ Explain why, not just what
- ❌ Don't be condescending
- ❌ Don't bikeshed (argue over trivial preferences)

**See EXAMPLES.md for good vs bad review comment examples.**

### 5. Apply Code Quality Gates

**Before Committing:**

**Automated Checks:**
- ✅ All tests pass
- ✅ Linting passes (no errors or warnings)
- ✅ Type checking passes (if using TypeScript/type system)
- ✅ Build succeeds
- ✅ No console.log or debugging statements left

**Manual Checks:**
- ✅ Self-review: Read your own diff
- ✅ Check for unintended changes
- ✅ Verify commit includes all necessary files
- ✅ Ensure no sensitive data (keys, passwords) committed
- ✅ Confirm commit message is clear

**Refactoring Checklist:**
- ✅ Tests still pass after refactoring
- ✅ Behavior unchanged (unless intended)
- ✅ Code is more readable/maintainable
- ✅ No premature optimization

---

## Common Patterns

### Pattern 1: Implementing New Feature

**Workflow:**
1. **Understand Requirements**
   - Review ticket/story
   - Clarify acceptance criteria
   - Identify edge cases

2. **Explore Codebase**
   - Find similar features
   - Understand existing patterns
   - Identify reusable components

3. **Plan Implementation**
   - Break into smaller tasks
   - Design component structure
   - Plan testing approach

4. **Implement with Tests (TDD Optional)**
   - Write failing test first (TDD), or
   - Implement code, then write tests
   - Implement in small increments
   - Run tests frequently

5. **Self-Review**
   - Review your own code
   - Check against quality standards
   - Run all quality gates

6. **Submit for Review**
   - Create clear PR description
   - Link to ticket/story
   - Highlight key changes

### Pattern 2: Test-Driven Development (TDD)

**When:** Writing new features with clear requirements

**Workflow:**
1. **Write Failing Test**
   - Write test for smallest piece of functionality
   - Run test, verify it fails (red)

2. **Write Minimal Code**
   - Write just enough code to pass test
   - Run test, verify it passes (green)

3. **Refactor**
   - Improve code quality
   - Keep tests passing
   - Run tests after each change

4. **Repeat**
   - Add next test
   - Cycle: Red → Green → Refactor

**Benefits:**
- Ensures code is testable
- Prevents over-engineering
- Provides immediate feedback
- Creates comprehensive test suite

### Pattern 3: Refactoring Legacy Code

**When:** Improving existing code without changing behavior

**Workflow:**
1. **Add Tests First**
   - If no tests exist, write characterization tests
   - Document current behavior
   - Ensure tests pass before refactoring

2. **Refactor in Small Steps**
   - Make one small change at a time
   - Run tests after each change
   - Commit frequently

3. **Common Refactoring Techniques:**
   - Extract Method: Pull complex logic into named function
   - Extract Variable: Name magic numbers or complex expressions
   - Rename: Make names more descriptive
   - Remove Duplication: DRY (Don't Repeat Yourself)
   - Simplify Conditionals: Reduce nesting, early returns

4. **Verify Behavior Unchanged**
   - All existing tests still pass
   - Manual testing if needed
   - No new bugs introduced

### Pattern 4: Writing Integration Tests

**When:** Testing component interactions, API calls, database operations

**Setup:**
- Use test database or mock external services
- Set up test fixtures (seed data)
- Clean up after each test

**See EXAMPLES.md for complete integration test examples.**

---

## Best Practices

### Implementation
- ✅ Start simple, add complexity only when needed
- ✅ Follow existing codebase patterns and conventions
- ✅ Write self-documenting code (clear names, simple logic)
- ✅ Keep functions small and focused
- ✅ Use early returns to reduce nesting
- ✅ Handle errors explicitly
- ❌ Don't prematurely optimize
- ❌ Don't write overly clever code
- ❌ Don't ignore edge cases

### Testing
- ✅ Write tests for new code
- ✅ Test happy path and edge cases
- ✅ Use descriptive test names
- ✅ Keep tests simple and focused
- ✅ Mock external dependencies in unit tests
- ✅ Run tests frequently during development
- ❌ Don't write brittle tests (test implementation details)
- ❌ Don't write tests that depend on each other
- ❌ Don't skip tests because "it's simple"

### Code Review
- ✅ Review your own code first
- ✅ Respond to feedback constructively
- ✅ Ask questions if feedback is unclear
- ✅ Fix issues found in review
- ✅ Thank reviewers for their time
- ❌ Don't take feedback personally
- ❌ Don't argue over style preferences (follow project conventions)
- ❌ Don't ignore review feedback

### Git Workflow
- ✅ Make small, focused commits
- ✅ Write clear commit messages
- ✅ Keep commits atomic (one logical change)
- ✅ Pull latest changes before starting work
- ✅ Rebase/merge to keep history clean (follow project convention)
- ❌ Don't commit broken code
- ❌ Don't mix unrelated changes in one commit
- ❌ Don't force push to shared branches

**See Also:** `committing-code` skill for detailed git practices.

---

## Anti-Patterns to Avoid

❌ **Copy-Paste Programming**
- Duplicating code instead of creating reusable functions
- Use: Extract common logic into shared utilities

❌ **Magic Numbers/Strings**
- Hardcoding values without explanation
- Use: Named constants with clear purpose

❌ **God Object/Function**
- Single class/function doing too many things
- Use: Single Responsibility Principle, break into smaller pieces

❌ **Premature Optimization**
- Optimizing before measuring performance
- Use: Write clear code first, optimize if profiling shows need

❌ **Shotgun Surgery**
- Single change requires modifying many files
- Use: Better abstraction, reduce coupling

❌ **Leaky Abstractions**
- Abstraction exposing underlying implementation details
- Use: Design clean interfaces that hide complexity

❌ **Not Invented Here**
- Reimplementing existing libraries/patterns
- Use: Leverage existing solutions, focus on unique business logic

❌ **Spaghetti Code**
- Tangled, hard-to-follow logic with many dependencies
- Use: Clear structure, separation of concerns

❌ **Lava Flow**
- Leaving old, unused code "just in case"
- Use: Remove dead code, rely on version control

❌ **Testing Only Happy Paths**
- Ignoring edge cases and error conditions
- Use: Test edge cases, errors, boundary conditions

---

## See Also

### Supporting Files
- [EXAMPLES.md](./EXAMPLES.md) - Detailed code examples for all patterns

### Related Skills
- [designing-architecture](../designing-architecture/SKILL.md) - Architecture design and decision-making
- [committing-code](../../../../core/skills/committing-code/SKILL.md) - Git workflow and commit standards
- [verifying-quality](../../../../core/skills/verifying-quality/SKILL.md) - Quality validation checklist
- [validating-markdown](../../../../core/skills/validating-markdown/SKILL.md) - Documentation standards

### Module Documentation
- **Coding Module Manifest:** [module.json](../../../module.json)
- **Developer Agent:** [ai-app-developer.md](../../../agents/ai-app-developer.md)

### External Resources
- Clean Code by Robert C. Martin
- Refactoring by Martin Fowler
- Test-Driven Development by Kent Beck
- Code Complete by Steve McConnell

---

**Version:** 1.0
**Created:** 2025-12-24
**Status:** Production-Ready (Phase 3 - Skills Creation)
**Module:** coding
