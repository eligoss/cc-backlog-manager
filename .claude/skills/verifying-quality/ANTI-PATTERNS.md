# Anti-Patterns Reference

Comprehensive anti-patterns across code, tickets, framework, and application domains.

---

## Code Anti-Patterns

### ❌ DON'T: Violate SOLID Principles
- Mixing multiple responsibilities in one class/function
- Hardcoding dependencies instead of injection
- Creating overly general interfaces
- Breaking substitutability contracts

### ✅ DO: Follow SOLID
- **Single Responsibility** - one reason to change
- **Open/Closed** - extend, don't modify
- **Liskov Substitution** - subtypes are substitutable
- **Interface Segregation** - many specific interfaces
- **Dependency Inversion** - depend on abstractions

---

### ❌ DON'T: Repeat Yourself (DRY Violation)
- Copy-pasting code across multiple files
- Duplicating logic instead of extracting
- Recreating utilities that exist

### ✅ DO: Extract and Reuse
- Create shared utilities/functions
- Extract repeated logic to helpers
- Use composition over duplication

---

### ❌ DON'T: Ignore Error Handling
- Swallowing exceptions silently
- Using generic catch-all error messages
- Not validating inputs
- Missing edge case handling

### ✅ DO: Handle Errors Gracefully
- Catch specific exceptions
- Provide user-friendly error messages
- Validate all inputs (especially at boundaries)
- Cover edge cases (null, empty, invalid)

---

### ❌ DON'T: Hardcode Configuration
- API keys, secrets, URLs in code
- Magic numbers without explanation
- Environment-specific values in code

### ✅ DO: Externalize Configuration
- Use environment variables for secrets
- Define constants with meaningful names
- Use configuration files for env-specific settings

---

### ❌ DON'T: Write Untestable Code
- Tight coupling to external dependencies
- Functions with side effects
- Code that depends on global state
- Missing dependency injection

### ✅ DO: Write Testable Code
- Dependency injection for external services
- Pure functions where possible
- Avoid global state
- Clear, mockable interfaces

---

## Ticket & Story Anti-Patterns

### ❌ DON'T: Create Horizontal Slices
- Separate API layer story, UI story, DB story
- Stories that can't be deployed independently
- Stories requiring multiple teams to complete

### ✅ DO: Create Vertical Slices
- End-to-end features (API + UI + DB in one story)
- Independently shippable increments
- Value delivered at completion

---

### ❌ DON'T: Write Vague Acceptance Criteria
- "Make it work"
- "Improve performance"
- "Fix bugs"
- Non-specific, non-measurable criteria

### ✅ DO: Write Specific, Testable Criteria
- "API returns 200 status for valid requests"
- "Page loads in <2 seconds for 95th percentile"
- "Zero errors in console after interaction"
- Measurable, verifiable criteria

---

### ❌ DON'T: Include Code in Tickets
- TypeScript/JavaScript code snippets
- SQL queries
- GraphQL schemas
- Detailed implementation code

### ✅ DO: Reference Patterns
- "Follow Container/View/Controller pattern"
- "Use Centralized Data Layer V2.1"
- "Apply caching pattern from technical-advanced.md"
- High-level guidance, not code

---

### ❌ DON'T: Create Oversized Stories
- Stories >8 story points
- Stories spanning multiple sprints
- Stories with >15 acceptance criteria

### ✅ DO: Decompose Large Stories
- Break into ≤8 point stories
- Vertical slices that fit in one sprint
- 8-12 acceptance criteria per story

---

## Framework Anti-Patterns

### ❌ DON'T: Put Project-Specific Content in Agents
- Hardcoded paths in agent files
- Project-specific patterns in agents
- Milestone codes in agent files

### ✅ DO: Keep Agents Pure
- All project content in context files
- Generic patterns in agents
- Reference context files dynamically

---

### ❌ DON'T: Duplicate Content Across Files
- Copy same text to multiple agents
- Repeat patterns without extraction
- Redundant reminders throughout files

### ✅ DO: Extract to Shared Resources
- Create shared-resources for reused content
- Reference shared resources from agents
- Single source of truth

---

### ❌ DON'T: Break Documentation Links
- Rename files without updating references
- Move files without updating paths
- Delete files still being referenced

### ✅ DO: Maintain Cross-References
- Use `git mv` to preserve history
- Update all cross-references when moving files
- Validate links before committing

---

## Multi-Tenancy Anti-Patterns (Application-Specific)

### ❌ DON'T: Mix Tenant Data
- Queries without tenant filters
- Shared caches across tenants
- Missing tenant context in operations

### ✅ DO: Enforce Tenant Isolation
- Always filter by tenantId
- Tenant-scoped caching
- Tenant context in all operations

---

## Performance Anti-Patterns

### ❌ DON'T: Create N+1 Queries
- Loop through items, query for each
- Fetch in loops instead of batch
- Missing eager loading

### ✅ DO: Batch Operations
- Use DataLoader for batching
- Eager load related data
- Single query with joins where appropriate

---

### ❌ DON'T: Cache Inefficiently
- Cache entire datasets unnecessarily
- Never invalidate stale cache
- Cache non-cacheable data

### ✅ DO: Cache Strategically
- Cache only frequently accessed, stable data
- Implement cache invalidation strategy
- Use appropriate TTL

---

## CLI Testing Anti-Patterns

### ❌ DON'T: Test Only Library Functions
- Skip CLI surface tests (argument parsing, output formatting)
- Test from CLI source directory, not user context
- Only check "result exists", not "result is correct"

### ✅ DO: Test Complete CLI Experience
- Test actual CLI execution via `exec()` or similar
- Simulate user project directory
- Validate output content (no "undefined", correct paths)
- Test all documented flags actually work

---

### ❌ DON'T: Skip State Verification
- Check return value only, ignore side effects
- No round-trip tests (create → use)
- Different paths between related commands

### ✅ DO: Verify State Changes
- Test manifest updates after add/remove
- Verify files created in correct locations
- Test create → validate round-trip works
- Use shared path constants across commands

---

### ❌ DON'T: Ignore Environment Variations
- Assume TTY always available
- Assume always inside project context
- Assume paths without spaces

### ✅ DO: Test Hostile Environments
- Test without TTY (pipe mode)
- Test outside project (clean error)
- Test paths with spaces

---

## Defensive Coding Anti-Patterns

### ❌ DON'T: Display Unvalidated Values
- Show `undefined`, `null`, `Invalid Date`
- Display `vundefined` for missing versions
- Use naive pluralization (`storys`)

### ✅ DO: Null-Safe Display
- Default missing dates to "Unknown"
- Default missing versions to "(version unknown)"
- Use explicit plural mappings for irregulars

---

### ❌ DON'T: Use Ambiguous Paths
- Unclear `root` or `basePath` variables
- Mix projectPath and frameworkRoot
- Hardcode relative paths

### ✅ DO: Explicit Path Context
- Define PathContext interface
- Use `ctx.projectPath` for user files
- Use `ctx.frameworkRoot` for CLI templates
- Share path constants across commands

---

### ❌ DON'T: Skip Data Normalization
- Pass raw YAML Date objects to validation
- Accept unquoted dates without conversion
- Normalize deep in logic, not at boundary

### ✅ DO: Normalize at Boundaries
- Convert Date objects to strings at parse time
- Normalize all input at entry point
- Test with realistic user input

---

### ❌ DON'T: Show Internal Details in Errors
- Display schema paths instead of user file paths
- Show stack traces for expected user errors
- Generic "Error occurred" messages

### ✅ DO: User-Friendly Errors
- Show user's file path in errors
- Clean message for expected errors
- Stack trace only for unexpected errors
- Include fix suggestions

---

**Source:** Consolidated from ai/shared/common-anti-patterns.md + CLI QA findings
**Version:** 2.0
**Updated:** 2025-12-30
