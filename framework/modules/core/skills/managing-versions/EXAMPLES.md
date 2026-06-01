# Version Management Examples

Real-world scenarios demonstrating framework version management workflows.

**For git commit practices and message formats** → see `committing-code` skill.

---

## Example 1: Auto Version Bump (Default Workflow)

### Scenario
Developer commits changes. Pre-commit hook auto-bumps affected modules.

### What Happens
```
git commit -m "Add new ticket template"
        │
        ▼
Pre-commit hook runs:
├─ Phase 1: Build CLI ✓
├─ Phase 2: Run backlog tests ✓
├─ Phase 3: Bump backlog 1.0.1 → 1.0.2 ✓
└─ Phase 4: Sync .claude/ ✓
```

### Result
- `framework/modules/backlog/module.json`: `"version": "1.0.2"`
- `.agentic-framework.json`: `"backlog": "1.0.2"`

---

## Example 2: Multiple Modules Bumped

### Scenario
Changes span backlog and jira modules.

### What Happens
```
Pre-commit detects:
  Affected modules: backlog, jira

Bumps:
  backlog: 1.0.1 → 1.0.2
  jira: 1.0.1 → 1.0.2
```

Each module is bumped independently based on which files changed.

---

## Example 3: Manual Minor Bump

### Scenario
You've added a significant feature and want minor instead of patch.

### Steps
```bash
# 1. Skip auto-bump
AUTO_BUMP_VERSIONS=false git commit -m "Add validation skill"

# 2. Manual minor bump
agentic-framework bump-version --module backlog --minor

# 3. Amend commit to include version
git add .
git commit --amend --no-edit
```

### Output
```
Bumping backlog: 1.0.2 → 1.1.0
Updated framework/modules/backlog/module.json
Updated .agentic-framework.json
```

---

## Example 4: Major Version Bump

### Scenario
Breaking changes require major version bump.

### Steps
```bash
# 1. Skip auto-bump
AUTO_BUMP_VERSIONS=false git commit -m "Restructure registry schema"

# 2. Manual major bump
agentic-framework bump-version --module core --major

# 3. Amend commit
git add .
git commit --amend --no-edit
```

### Output
```
Bumping core: 1.4.2 → 2.0.0
Updated framework/modules/core/module.json
Updated .agentic-framework.json
```

---

## Example 5: Preview with Dry Run

### Scenario
Check what would be bumped before committing.

### Check Affected Modules
```bash
agentic-framework bump-version --auto --dry-run
```

### Output
```
DRY RUN - Would bump:
  backlog: 1.0.1 → 1.0.2
  confluence: 1.0.0 → 1.0.1

Files that would be updated:
  - framework/modules/backlog/module.json
  - framework/modules/confluence/module.json
  - .agentic-framework.json
```

---

## Example 6: Run Affected Tests Only

### Scenario
Run tests for just the modules you changed.

### Command
```bash
agentic-framework test --affected
```

### Output
```
Detecting affected modules (comparing to main)...
Affected modules: backlog, jira

Running: npx jest --testPathPatterns="backlog|jira" --passWithNoTests

 PASS  src/lib/__tests__/backlog/import-engine.test.ts
 PASS  src/lib/__tests__/jira/export-engine.test.ts

Test Suites: 2 passed, 2 total
```

---

## Example 7: Test Specific Module

### Scenario
Run tests for just one module during development.

### Command
```bash
agentic-framework test --module backlog
```

### Output
```
Running tests for module: backlog

Running: npx jest --testPathPatterns="backlog" --passWithNoTests

 PASS  src/lib/__tests__/backlog/import-engine.test.ts

Test Suites: 1 passed, 1 total
```

---

## Example 8: Skip Tests for WIP

### Scenario
Commit work-in-progress without running tests.

### Command
```bash
RUN_AFFECTED_TESTS=false git commit -m "wip: partial work"
```

### Output
```
Phase 1: Building CLI... ✓
Phase 2: Skipping tests (RUN_AFFECTED_TESTS=false)
Phase 3: Bumping versions... ✓
Phase 4: Syncing... ✓
```

---

## Example 9: View Current Versions

### Scenario
Check what versions all modules are at.

### Command
```bash
cat .agentic-framework.json | jq '.modules'
```

### Output
```json
{
  "core": "1.4.2",
  "backlog": "1.0.2",
  "jira": "1.0.2",
  "confluence": "1.0.1",
  "planning": "1.0.0",
  "coding": "1.1.1",
  "reporting": "1.0.1",
  "writer": "1.0.1"
}
```

---

## Example 10: Different Base Branch

### Scenario
Working on feature branch that will merge to `develop`.

### Commands
```bash
# Check against develop
agentic-framework test --affected --base-branch develop
agentic-framework bump-version --auto --base-branch develop --dry-run

# Commit with different base
BASE_BRANCH=develop git commit -m "feature work"
```

---

## Anti-Patterns

### DON'T: Manually edit version files

```bash
# BAD: Direct editing causes inconsistencies
vim framework/modules/backlog/module.json
# Forgot .agentic-framework.json!
```

### DO: Use CLI commands

```bash
# GOOD: CLI updates both files atomically
agentic-framework bump-version --module backlog --patch
```

---

### DON'T: Skip all hooks

```bash
# BAD: Bypasses all quality checks
git commit --no-verify
```

### DO: Skip specific phases

```bash
# GOOD: Skip just what you need
RUN_AFFECTED_TESTS=false git commit -m "wip"
```

---

**Examples Version:** 2.1
**Updated:** 2026-01-12
**Framework Version:** 1.4.1+
