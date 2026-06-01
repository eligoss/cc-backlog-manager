# Version Management Standards

Standards and rules for framework versioning with independent module versioning.

**For git commit message standards** → see `committing-code` skill.

---

## Independent Module Versioning

### Core Principle

Each module maintains its own version independently. This allows:
- **Precise tracking** - Only bumped modules reflect changes
- **Independent lifecycles** - Modules can be at different version stages
- **Targeted updates** - Users know exactly what changed

### Version Storage

Versions are stored in two locations (kept in sync automatically):

**1. Module Manifest** (`framework/modules/<module>/module.json`)
```json
{
  "name": "backlog",
  "version": "1.0.1"
}
```

**2. Project Config** (`.agentic-framework.json`)
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

## Semantic Versioning Rules

### Version Format

**Format:** `MAJOR.MINOR.PATCH`

**Example:** `1.4.1`

- **MAJOR**: Breaking changes, architecture refactoring (1.x.x → 2.0.0)
- **MINOR**: New features, enhancements (1.4.x → 1.5.0)
- **PATCH**: Bug fixes, documentation (1.4.1 → 1.4.2)

### When to Increment

#### MAJOR Version (X.0.0)

**Increment when:**
- Breaking changes to module API
- Incompatible changes to file formats
- Removal of deprecated functionality
- Major restructuring of module content

**Typical cadence:** As needed for breaking changes

#### MINOR Version (X.Y.0)

**Increment when:**
- New features added (backward compatible)
- New skills introduced
- New agents added
- Enhanced existing capabilities
- New CLI commands

**Typical cadence:** When completing feature milestones

#### PATCH Version (X.Y.Z)

**Increment when:**
- Bug fixes (no new features)
- Documentation corrections
- Minor improvements
- Metadata corrections

**Typical cadence:** Automatic on every commit (default)

---

## Version Bump Decision Tree

```
Is it a breaking change?
├── Yes → MAJOR (manual: --major)
└── No
    ├── Is it a new feature?
    │   ├── Yes → MINOR (manual: --minor)
    │   └── No → PATCH (auto or --patch)
```

### Breaking Change Examples
- Removing a skill
- Changing skill YAML frontmatter schema
- Renaming required fields
- Changing CLI command interface

### Non-Breaking Examples
- Adding new skill
- Adding new agent
- Enhancing existing functionality
- Fixing bugs

---

## Atomic Updates

### Requirement

Both version storage locations must be updated together:
- `framework/modules/<module>/module.json`
- `.agentic-framework.json`

### How CLI Ensures This

1. Read current versions from both files
2. Calculate new version
3. Update both files in memory
4. Write both files atomically
5. If either write fails, rollback both

**Manual edits are NOT recommended** because they can cause inconsistencies.

---

## Pre-Commit Hook Phases

The pre-commit hook automates versioning:

```
Phase 1: Build CLI
Phase 2: Run Affected Tests (--bail)
Phase 3: Auto-Bump Patch Versions
Phase 4: Sync Deployment Files
```

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `RUN_AFFECTED_TESTS` | `true` | Run affected tests |
| `AUTO_BUMP_VERSIONS` | `true` | Auto-bump patch versions |
| `BASE_BRANCH` | `main` | Base for comparison |

---

## Affected Module Detection

### File-to-Module Mapping

Files are mapped to modules using patterns:

| Pattern | Module |
|---------|--------|
| `framework/modules/backlog/` | backlog |
| `framework/modules/jira/` | jira |
| `framework/modules/core/` | core |
| `framework/cli/src/commands/backlog/` | backlog |
| `framework/cli/src/lib/jira/` | jira |
| `framework/cli/` (generic) | core |

### Detection Algorithm

1. Get git diff from merge-base to HEAD
2. Include any uncommitted changes
3. Map each file to its module
4. Aggregate unique modules
5. Return affected module list

---

## Best Practices

### DO

- **Use automation**: Let pre-commit hook handle patch bumps
- **Use CLI for manual bumps**: `agentic-framework bump-version`
- **Run dry-run first**: `--dry-run` to preview changes
- **Follow semver**: Use correct increment type

### DON'T

- **Manual edits**: Don't edit version numbers manually
- **Skip hooks entirely**: Avoid `git commit --no-verify`

---

## Module Version Lifecycle

### Initial Release

New modules start at `1.0.0`:
```json
{
  "name": "new-module",
  "version": "1.0.0"
}
```

### Development Cycle

```
1.0.0 → 1.0.1 → 1.0.2  (patches)
      ↓
    1.1.0              (minor: new feature)
      ↓
    2.0.0              (major: breaking change)
```

### Cross-Module Changes

When changes span modules:
- Each affected module gets its own bump
- Modules are bumped independently
- No coupling between module versions

---

**Standards Version:** 2.1
**Updated:** 2026-01-12
**Framework Version:** 1.4.1+
**Reference:** Semantic Versioning 2.0.0
