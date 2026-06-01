# Version Management CLI Reference

Detailed documentation for version management CLI commands.

---

## Command: bump-version

### Purpose

Bump versions for modules, either manually for a specific module or automatically for all affected modules detected via git diff.

### Command

```bash
agentic-framework bump-version [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--major` | Increment major version (X.0.0) |
| `--minor` | Increment minor version (X.Y.0) |
| `--patch` | Increment patch version (X.Y.Z) - default |
| `-m, --module <name>` | Target specific module |
| `--auto` | Auto-detect affected modules from git diff |
| `--base-branch <branch>` | Base branch for comparison (default: `main`) |
| `--stage` | Stage version files after update |
| `--dry-run` | Preview changes without executing |
| `-p, --path <path>` | Project root path |

### Usage

#### Manual Module Bump

```bash
# Patch (default)
agentic-framework bump-version --module core

# Minor
agentic-framework bump-version --module backlog --minor

# Major
agentic-framework bump-version --module jira --major
```

#### Auto-Detect Affected Modules

```bash
# Auto-bump all affected
agentic-framework bump-version --auto

# With staging for pre-commit
agentic-framework bump-version --auto --stage

# Different base branch
agentic-framework bump-version --auto --base-branch develop
```

### Output

**Manual bump:**
```
Bumping backlog: 1.0.1 → 1.1.0
Updated framework/modules/backlog/module.json
Updated .agentic-framework.json
```

**Auto-bump:**
```
Detecting affected modules (comparing to main)...
Affected modules: backlog, jira, core

Bumping backlog: 1.0.1 → 1.0.2
Bumping jira: 1.0.1 → 1.0.2
Bumping core: 1.4.1 → 1.4.2

Updated 3 modules
```

**Dry run:**
```
DRY RUN - Would bump:
  backlog: 1.0.1 → 1.0.2
  jira: 1.0.1 → 1.0.2

Files that would be updated:
  - framework/modules/backlog/module.json
  - framework/modules/jira/module.json
  - .agentic-framework.json
```

### What It Updates

For each bumped module:
1. `framework/modules/<module>/module.json` - `"version": "X.Y.Z"`
2. `.agentic-framework.json` - `"<module>": "X.Y.Z"`

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error |

---

## Command: test

### Purpose

Run tests selectively based on affected modules or for a specific module.

### Command

```bash
agentic-framework test [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--affected` | Run tests only for affected modules |
| `-m, --module <name>` | Run tests for specific module |
| `--base-branch <branch>` | Base branch for detection (default: `main`) |
| `--all` | Run all tests (default if no flags) |
| `-w, --watch` | Run Jest in watch mode |
| `--coverage` | Run Jest with coverage |
| `--bail` | Bail on first test failure |
| `-v, --verbose` | Run Jest in verbose mode |
| `--dry-run` | Show what would run |
| `-p, --path <path>` | Project root path |

### Usage

#### Affected Tests

```bash
agentic-framework test --affected
agentic-framework test --affected --bail
agentic-framework test --affected --base-branch develop
```

#### Specific Module

```bash
agentic-framework test --module backlog
agentic-framework test --module core --coverage
agentic-framework test --module jira --watch
```

#### All Tests

```bash
agentic-framework test
agentic-framework test --all
```

### Module Test Patterns

| Module | Test Pattern |
|--------|--------------|
| `backlog` | `backlog` |
| `jira` | `jira` |
| `confluence` | `confluence` |
| `writer` | `writer` |
| `planning` | `planning` |
| `core` | `lib/__tests__`, `commands/__tests__`, etc. |

### Output

**Affected tests:**
```
Detecting affected modules (comparing to main)...
Affected modules: backlog, jira

Running: npx jest --testPathPatterns="backlog|jira" --passWithNoTests

 PASS  src/lib/__tests__/backlog/import-engine.test.ts
 PASS  src/lib/__tests__/jira/export-engine.test.ts

Test Suites: 2 passed, 2 total
```

**No affected modules:**
```
Detecting affected modules (comparing to main)...
No affected modules detected. No tests to run.
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Tests passed (or no tests) |
| 1 | Tests failed |

---

## Pre-Commit Hook

### Location

`.git/hooks/pre-commit`

### Phases

| Phase | Command | Purpose |
|-------|---------|---------|
| 1 | `npm run build` | Compile TypeScript |
| 2 | `test --affected --bail` | Run affected tests |
| 3 | `bump-version --auto --stage` | Bump versions |
| 4 | `sync --skills/--agents` | Sync deployment |

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `RUN_AFFECTED_TESTS` | `true` | Enable tests |
| `AUTO_BUMP_VERSIONS` | `true` | Enable version bump |
| `BASE_BRANCH` | `main` | Base branch |

### Skip Phases

```bash
# Skip tests
RUN_AFFECTED_TESTS=false git commit -m "message"

# Skip version bump
AUTO_BUMP_VERSIONS=false git commit -m "message"

# Different base branch
BASE_BRANCH=develop git commit -m "message"
```

---

## Post-Commit Hook

### Location

`.git/hooks/post-commit`

### Purpose

Links CLI globally via `npm link` after successful commit.

### Output

```
✓ CLI v1.4.2 linked globally
```

---

## Affected Module Detection Library

### Location

`framework/cli/src/lib/affected-modules.ts`

### Functions

| Function | Purpose |
|----------|---------|
| `detectAffectedModules(options)` | Detect modules from git diff |
| `mapFileToModule(filePath)` | Map file to module |
| `getTestPatternsForModules(ids)` | Get Jest patterns |
| `buildJestCommand(ids)` | Build Jest command |
| `isGitRepository(path)` | Check if git repo |
| `branchExists(name, path)` | Check branch exists |

### Types

```typescript
interface AffectedModule {
  id: string;
  changedFiles: string[];
}

interface AffectedModulesResult {
  modules: AffectedModule[];
  changedFiles: string[];
  baseBranch: string;
  hasChanges: boolean;
}
```

---

**CLI Reference Version:** 2.1
**Updated:** 2026-01-12
**Framework Version:** 1.4.1+
