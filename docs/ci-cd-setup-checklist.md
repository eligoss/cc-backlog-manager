# CI/CD Setup Checklist

## ✅ Completed (Already Configured)

- [x] `pr-validation.yml` - All quality checks
- [x] `auto-release.yml` - Automatic releases
- [x] `release.yml` - Manual major releases

## 🔧 Required Manual Setup

### 1. Branch Protection (CRITICAL)

**Path:** Settings → Branches → Add rule

**Configuration:**

```
Branch: main

☑ Require pull request before merging
  └─ Approvals: 1

☑ Require status checks to pass
  ├─ Require branches up to date: Yes
  └─ Required checks:
      • PR Quality Checks  ← Add after first PR

☑ Require conversation resolution

☑ Restrict who can push
  └─ No one (all via PRs)

☐ Allow force pushes: Disabled
☐ Allow deletions: Disabled
```

### 2. Workflow Permissions

**Path:** Settings → Actions → General

**Set:**
- ☑ Read and write permissions
- ☑ Allow GitHub Actions to create and approve PRs

---

## 🧪 Testing

### Step 1: Test PR Validation

```bash
git checkout -b test/ci-setup
git commit --allow-empty -m "test: verify CI workflows"
git push -u origin test/ci-setup
```

**Create PR → Verify:**
- ✅ `PR Quality Checks` runs
- ✅ Status appears on PR
- ✅ Comment posted with results

### Step 2: Test Auto-Release

**Merge the test PR → Verify:**
- ✅ `Auto Release` triggers
- ✅ Version bumps (e.g., 1.7.0 → 1.7.1)
- ✅ Package published
- ✅ GitHub Release created

### Step 3: Configure Branch Protection

**Now that checks exist:**
1. Go to branch protection settings
2. Search for `PR Quality Checks`
3. Add to required checks
4. Save

---

## 📊 Workflow Summary

| Event | Workflow | Duration |
|-------|----------|----------|
| PR created | `pr-validation.yml` | ~5 min |
| PR merged | `auto-release.yml` | ~30 sec |
| Manual trigger | `release.yml` | ~6 min |

---

## 🚨 Troubleshooting

| Issue | Fix |
|-------|-----|
| Checks not showing | Create PR first, then add to branch protection |
| Auto-release not running | Check if only docs changed (excluded) |
| Permission denied | Enable write permissions in Actions settings |
| Wrong version bump | Check commit message format (`feat:` vs `fix:`) |

---

## 📚 Quick Links

- [Full CI/CD Guide](./ci-cd-setup.md)
- [Architecture Details](./ci-cd-architecture-optimized.md)
- [Actions Dashboard](https://github.com/eligoss/agentic-development-framework/actions)
- [Releases](https://github.com/eligoss/agentic-development-framework/releases)

---

## 🎯 Success Criteria

Setup is complete when:
- ✅ Test PR created and checks ran
- ✅ Branch protection configured
- ✅ Test PR merged and auto-released
- ✅ Required checks prevent merge when failing

**Time to complete:** 10 minutes
