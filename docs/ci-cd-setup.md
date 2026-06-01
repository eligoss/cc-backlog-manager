# CI/CD Pipeline

## Overview

Three-workflow architecture optimized for speed and efficiency:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **PR Validation** | PR to main | All quality checks (REQUIRED) |
| **Auto Release** | Merge to main | Version bump + publish (no redundant checks) |
| **Manual Release** | Manual | Major versions or manual override |

**Key principle:** Validate once in PR, trust on merge.

## Workflows

### 1. PR Validation (`.github/workflows/pr-validation.yml`)

**Triggers:**
- Pull request opened/updated/reopened against `main`

**Runs:**
- Linter (ESLint)
- Build (TypeScript)
- Tests (unit + integration)
- Framework validation (quick + full)
- Package verification
- Coverage upload (Codecov)

**Result:**
- Posts comment on PR
- Status checks required for merge

**This is the ONLY validation point.** All code quality checks happen here.

---

### 2. Auto Release (`.github/workflows/auto-release.yml`)

**Triggers:**
- Push to `main` (after PR merge)
- **Skips** for: `**.md`, `docs/**`, `.github/workflows/**`

**Version detection from commits:**
- `[minor]` tag or "Add/Implement/Introduce" keywords → minor (1.7.0 → 1.8.0)
- Default → patch (1.7.0 → 1.7.1)
- `BREAKING CHANGE` in body → skips (use manual workflow)

**Runs:**
1. Analyze commits
2. Bump version
3. Commit + push version change
4. Publish to GitHub Packages
5. Create GitHub Release

**Does NOT re-validate** - trusts PR checks passed (enforced by branch protection).

---

### 3. Manual Release (`.github/workflows/release.yml`)

**Triggers:**
- Manual workflow dispatch

**Inputs:**
- Version type: `major`, `minor`, or `patch`
- Auto-detect modules: optional

**Runs:**
- Full validation (can't trust PR state)
- Version bump
- Publish + release

**Use for:**
- Major version releases
- Manual version control
- Releases without PR flow

---

## Branch Protection (REQUIRED)

**Location:** Settings → Branches → Add rule

**Branch:** `main`

**Configuration:**

```yaml
✓ Require pull request before merging
  └─ Required approvals: 1

✓ Require status checks to pass
  └─ Required checks:
      • PR Quality Checks

✓ Require branches to be up to date

✓ Require conversation resolution

✓ Restrict pushes (no direct commits to main)

✗ Allow force pushes: Disabled
✗ Allow deletions: Disabled
```

**Critical:** Add `PR Quality Checks` status check after creating your first PR.

---

## Commit Conventions

This project uses traditional commits (50/72 rule, imperative mood, no prefixes).

**For automatic version detection:**

```bash
# Patch (1.7.0 → 1.7.1) - Default
git commit -m "Fix validation logic in schema parser"
git commit -m "Update dependencies to latest versions"

# Minor (1.7.0 → 1.8.0) - Use keywords or [minor] tag
git commit -m "Add telemetry support via MCP"
git commit -m "Implement new validation engine [minor]"
git commit -m "Introduce context-aware discovery"

# Major (use manual workflow)
git commit -m "Redesign module system

BREAKING CHANGE: Module manifests require new format.
See migration guide for details."
```

**Version detection rules:**
- Starts with "Add", "Implement", or "Introduce" → **minor**
- Contains `[minor]` tag → **minor**
- Contains `BREAKING CHANGE` → **skip auto-release** (use manual)
- Everything else → **patch**

---

## Workflow Behavior

### Pull Request Flow

```
Create PR
    ↓
PR Validation runs (5 min)
    ├─ Lint ✓
    ├─ Build ✓
    ├─ Tests ✓
    └─ Validate ✓
    ↓
[Branch protection blocks if failed]
    ↓
Approval + Merge
    ↓
Auto-release runs (30 sec)
    ├─ Bump version ✓
    ├─ Publish package ✓
    └─ Create release ✓
    ✨ DONE
```

### Performance

**Traditional approach:**
- PR: 5 min (validation)
- Main: 5 min (re-validation) ❌
- Release: 5 min (re-validation) ❌
- **Total: 15 minutes**

**Our approach:**
- PR: 5 min (validation)
- Release: 30 sec (no re-validation) ✓
- **Total: ~6 minutes (60% faster)**

**Why safe:**
- Branch protection requires PR checks
- Merge blocked until validated
- Code on main is guaranteed valid
- Re-validation adds no safety

---

## Path Exclusions

Auto-release skips when only these files changed:

```yaml
paths-ignore:
  - '**.md'           # Documentation
  - 'docs/**'         # Docs folder
  - '.github/workflows/**'  # Workflows
```

**Example:**
- ✅ Code change → triggers release
- ✅ Code + docs → triggers release
- ❌ Docs only → skips release

---

## Release Process

### Automatic (Recommended)

1. Create PR
2. Wait for validation (required)
3. Get approval
4. Merge → auto-release publishes
5. Done! 🎉

### Manual (Major Versions)

1. Go to Actions → Manual Release
2. Select `major` version type
3. Run workflow
4. Done! 🎉

---

## Troubleshooting

### PR checks not appearing

**Fix:** Create one PR first, then add `PR Quality Checks` to branch protection.

### Auto-release not triggering

**Check:**
- Only docs changed? (excluded)
- `BREAKING CHANGE` in commits? (skipped)
- Workflow files changed? (excluded)

### Permission errors

**Fix:** Settings → Actions → Workflow permissions → Read and write

### Wrong version bump

**Check commit messages:**
- `feat:` → minor
- Others → patch
- No conventional commits → defaults to patch

---

## Local Development

### Git Hooks (Automatic Quality Gates)

**Pre-commit hook** (fast - <8s):
1. Branch protection - blocks direct commits to main/master
2. Branch naming validation - enforces semantic naming (feat/, fix/, etc.)
3. ESLint auto-fix - automatically fixes and stages linting issues
4. CLI build verification - ensures TypeScript compiles
5. Link validation - catches broken markdown links
6. Framework sync - auto-syncs .claude/ files (consumer projects only)

**Pre-push hook** (comprehensive - 30-90s):
1. Build verification - TypeScript compile
2. Link validation - markdown link check
3. All tests - unit (blocking) + integration/E2E (non-blocking)
4. Framework validation - full framework build validation
5. IDE schema generation - generates schemas (non-blocking)
6. Package verification - verifies npm package can be built

**Note:** Pre-push hook mirrors CI/CD validation to catch issues before pushing.

Manually run checks:

```bash
npm run lint          # ESLint
npm run lint:fix      # ESLint with auto-fix
npm run build         # TypeScript build
npm test              # Unit tests
npm run test:all      # All tests (unit + integration + E2E)
```

---

## Security

- `GITHUB_TOKEN` auto-provided (no setup needed)
- Publishing to GitHub Packages (scoped to org)
- For public npm: add `NPM_TOKEN` secret

---

## Monitoring

- **Workflows:** https://github.com/eligoss/agentic-development-framework/actions
- **Packages:** https://github.com/eligoss/agentic-development-framework/packages
- **Releases:** https://github.com/eligoss/agentic-development-framework/releases

---

## Files

```
.github/workflows/
├── pr-validation.yml   # Quality gate
├── auto-release.yml    # Publisher
└── release.yml         # Manual override
```

**That's it!** Three focused workflows, no redundancy.
