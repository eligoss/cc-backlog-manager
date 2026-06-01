---
id: managing-versions
name: managing-versions
description: Manage framework versioning including bumping versions, querying versions, and running affected tests. Use when working with framework version management.
scope: apmr
applicable-projects: apm-r-ai-agentic-framework
module: core
capabilities-provided:
  - version-management
---

# Managing Framework Versions

## When to Use This Skill

Use this skill when you need to:
- **Bump module versions** (major/minor/patch) manually or automatically
- **Run affected tests** for modules with changes
- **Query current module versions** from `.agentic-framework.json`
- **Understand when to use major/minor/patch** bumps

This skill is **framework-specific** - only works with apm-r-ai-agentic-framework repository.

**For git commit practices, branch naming, and PR workflows** → use the `committing-code` skill.

---

## Key Concepts

### Independent Module Versioning

Each module has its own independent version, stored in two places:
1. **`framework/modules/<module>/module.json`** - Module's own version file
2. **`.agentic-framework.json`** - Project-wide module version tracking

This allows:
- Independent version lifecycles per module
- Precise change tracking
- Targeted version bumps based on actual changes

### Version Storage

**Module manifest** (`framework/modules/core/module.json`):
```json
{
  "name": "core",
  "version": "1.4.1"
}
```

**Project config** (`.agentic-framework.json`):
```json
{
  "modules": {
    "core": "1.4.1",
    "backlog": "1.0.1",
    "jira": "1.0.1"
  }
}
```

---

## CLI Commands

### `bump-version` Command

Bump versions for modules, either manually or automatically based on affected detection.

**Flags:**

| Flag | Description |
|------|-------------|
| `--major` | Increment major version (X.0.0) |
| `--minor` | Increment minor version (X.Y.0) |
| `--patch` | Increment patch version (X.Y.Z) - default |
| `--module <name>` | Target specific module |
| `--auto` | Auto-detect affected modules from git diff |
| `--base-branch <branch>` | Base branch for comparison (default: main) |
| `--stage` | Stage version files after update |
| `--dry-run` | Preview changes without executing |

**Examples:**

```bash
# Bump specific module
agentic-framework bump-version --module core --patch
agentic-framework bump-version --module backlog --minor

# Auto-bump all affected modules
agentic-framework bump-version --auto

# Preview what would be bumped
agentic-framework bump-version --auto --dry-run
```

### `test` Command

Run tests selectively based on affected modules.

**Flags:**

| Flag | Description |
|------|-------------|
| `--affected` | Run tests only for affected modules |
| `-m, --module <name>` | Run tests for specific module |
| `--base-branch <branch>` | Base branch for detection (default: main) |
| `--bail` | Bail on first failure |
| `--dry-run` | Show what would run |

**Examples:**

```bash
# Run tests for affected modules only
agentic-framework test --affected

# Run tests for specific module
agentic-framework test --module backlog

# Preview what tests would run
agentic-framework test --affected --dry-run
```

---

## When to Bump Versions

### Major Version (X.0.0)

**Use when:** Breaking changes, architecture refactoring

**Examples:**
- Change module API contract
- Restructure module file organization
- Remove deprecated functionality

**Command:**
```bash
agentic-framework bump-version --module core --major
```

### Minor Version (X.Y.0)

**Use when:** New features, enhancements (backward compatible)

**Examples:**
- Add new skill to module
- Add new CLI command
- Enhance existing capabilities

**Command:**
```bash
agentic-framework bump-version --module backlog --minor
```

### Patch Version (X.Y.Z)

**Use when:** Bug fixes, documentation, small improvements

**Examples:**
- Fix bug in existing code
- Update documentation
- Correct metadata

**Command (default):**
```bash
agentic-framework bump-version --module jira --patch
```

---

## Pre-Commit Hook Integration

The framework's pre-commit hook automatically handles versioning:

1. **Build** - Compile TypeScript CLI
2. **Test** - Run tests for affected modules (`--bail`)
3. **Version** - Auto-bump patch versions for affected modules
4. **Sync** - Sync deployment files to `.claude/`

**Configuration (environment variables):**

| Variable | Default | Purpose |
|----------|---------|---------|
| `RUN_AFFECTED_TESTS` | `true` | Run affected tests |
| `AUTO_BUMP_VERSIONS` | `true` | Auto-bump patch versions |
| `BASE_BRANCH` | `main` | Base for comparison |

**Skip version bumping:**
```bash
AUTO_BUMP_VERSIONS=false git commit -m "message"
```

---

## Affected Module Detection

### How It Works

1. **Git diff analysis** - Compares current branch to base branch (main)
2. **File-to-module mapping** - Maps changed files to their owning modules
3. **Module aggregation** - Groups changes by module

### File-to-Module Mapping

| File Pattern | Module |
|--------------|--------|
| `framework/modules/backlog/` | backlog |
| `framework/modules/jira/` | jira |
| `framework/modules/core/` | core |
| `framework/cli/src/commands/backlog/` | backlog |
| `framework/cli/src/lib/jira/` | jira |
| `framework/cli/` (generic) | core |

---

## Troubleshooting

### Wrong Version Bump Type

If auto-bump was patch but you need minor:
```bash
# 1. Undo commit
git reset HEAD~1

# 2. Manual bump
agentic-framework bump-version --module <name> --minor

# 3. Commit again
git add . && git commit -m "message"
```

### Module Not Detected as Affected

Check file-to-module mapping in `framework/cli/src/lib/affected-modules.ts`.

---

## See Also

### Related Skills
- **[committing-code](../committing-code/SKILL.md)** - Git commit practices, branch naming, PR workflows

### Supporting Files
- [Examples](EXAMPLES.md) - Version bump scenarios
- [Standards](STANDARDS.md) - Semantic versioning rules
- [CLI Reference](SCRIPTS-REFERENCE.md) - Detailed CLI documentation

### Framework Resources
- **Affected Modules Library:** `framework/cli/src/lib/affected-modules.ts`
- **Bump Version Command:** `framework/cli/src/commands/bump-version.ts`
- **Test Command:** `framework/cli/src/commands/test.ts`

---

**Skill Version:** 2.1
**Status:** Complete - Ready for use
**Token Budget:** ~2000 tokens
**Updated:** 2026-01-12
**Framework Version:** 1.4.1+
