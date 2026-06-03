# Managing Git Workflows: Real Examples

## Example 1: Plan-Based Framework Work

### Scenario
Creating a new plan for framework consolidation (PLAN-001), executing phases, and completing the plan with version tagging.

### Process

**Step 1: Create plan and initial commit**
```bash
# Create plan directory structure
mkdir -p ai/plans/framework/001-consolidation-v11.1
touch ai/plans/framework/001-consolidation-v11.1/PLAN.md

# Add plan content with detailed phases
# (See ai/plans/README.md for PLAN.md structure)

# Initial commit for plan creation
git add ai/plans/framework/001-consolidation-v11.1/PLAN.md

git commit -m "PLAN-001: Framework consolidation v11.1

✨ Consolidate routes and registry architecture
🎯 Create shared knowledge skills
📋 Update all framework references
🔧 Clean up legacy documentation
📚 Validate and document changes

Plan file: ai/plans/framework/001-consolidation-v11.1/PLAN.md
Status: 🔶 PROPOSED - PENDING REVIEW"
```

**Step 2: User approves plan**
- User reviews PLAN.md
- Approves the 5 phases and approach
- You proceed with Phase 1

**Step 3: Create PROGRESS.md and start Phase 1**
```bash
# Create progress tracking file
touch ai/plans/framework/001-consolidation-v11.1/PROGRESS.md

# Add PROGRESS.md with phase checklist
# (See ai/plans/README.md for PROGRESS.md structure)

git add ai/plans/framework/001-consolidation-v11.1/PROGRESS.md

git commit -m "PLAN-001-PHASE-01: Create generic skills and infrastructure

✅ Created generic-shared-understanding-framework-architecture-knowledge skill
✅ Created building-skills skill
✅ Created ROUTES-REGISTRY-DESIGN.md with complete design rationale
✅ Updated ai/registry.yml with new skill metadata
✅ Updated README.md with skill references

Validation: All 4 new skills tested and functional
Next phase: PLAN-001-PHASE-02 ready (Update framework agents)"
```

**Step 4: Complete remaining phases**
```bash
# Phase 2 complete
git add ai/agents/
git commit -m "PLAN-001-PHASE-02: Update framework agents

✅ Updated ai-framework-manager.md with skill references
✅ Updated ai-architecture.md with design patterns
✅ Updated all agent context loading in registry
✅ Validated all agents load correctly

Validation: All 8 agents tested and updated
Next phase: PLAN-001-PHASE-03 ready (Clean up documentation)"

# Phase 3 complete
git add framework/ ai/framework/
git commit -m "PLAN-001-PHASE-03: Clean up legacy documentation

✅ Deleted ROUTES-vs-REGISTRY.md (moved to skill)
✅ Deleted framework-navigation-guide.md (moved to skill)
✅ Removed redundant documentation
✅ Updated all cross-references

Validation: No broken links remaining
Next phase: PLAN-001-PHASE-04 ready (Update all references)"

# Phase 4 complete
git add README.md ai/registry.yml CLAUDE.md
git commit -m "PLAN-001-PHASE-04: Update all references

✅ Updated README.md with new skill locations
✅ Updated CLAUDE.md with current architecture
✅ Updated ai/registry.yml with cleaned-up metadata
✅ Updated 15+ agent files with new references

Validation: All references valid and working
Next phase: PLAN-001-PHASE-05 ready (Validation and documentation)"

# Phase 5 complete
git add ai/plans/framework/001-consolidation-v11.1/PROGRESS.md
git commit -m "PLAN-001-PHASE-05: Final validation and documentation

✅ Validated all links in documentation
✅ Verified skill functionality across models
✅ Updated PROGRESS.md with completion status
✅ Documented plan completion and outcomes

Validation: All phases complete, plan fully executed
Status: Ready for completion commit"
```

**Step 5: Mark plan complete**
```bash
# Update PROGRESS.md status to COMPLETE
git add ai/plans/framework/001-consolidation-v11.1/PROGRESS.md

git commit -m "PLAN-001-COMPLETE: Framework Consolidation v11.1 - All Phases Done

✅ Phase 1: Create generic skills and infrastructure - COMPLETE
✅ Phase 2: Update framework agents - COMPLETE
✅ Phase 3: Clean up legacy documentation - COMPLETE
✅ Phase 4: Update all references - COMPLETE
✅ Phase 5: Final validation and documentation - COMPLETE

Total phases: 5 (all completed)
Status file: ai/plans/framework/001-consolidation-v11.1/PROGRESS.md
Version tag: v11.1

Plan remains in repository as historical record.
See: ai/plans/README.md for retention policy."

# Create version tag
git tag -a v11.1 -m "v11.1: Framework Consolidation with Skills Architecture

- Consolidated routes and registry
- Created 2 new generic skills
- Updated all framework components
- Cleaned up legacy documentation
- All 5 phases completed and validated
- Backward compatible with v11.0 usage"

# Push all changes and tags
git push origin main --tags
```

**Result:**
- Plan documented in repository history
- Clear phase-by-phase execution record
- Each phase independently committable and reviewable
- Version tagged for easy reference
- PROGRESS.md serves as permanent execution record

---

## Example 2: Framework Improvement with Versioning

### Scenario
Working on v11.0 Skills Integration (direct framework improvement without plan)

### Process

**Step 1: Create feature branch**
```bash
git checkout -b feature/v11-skills-integration
```

**Step 2: Make changes**
- Create skill files
- Update registry
- Add documentation

**Step 3: Stage and commit**
```bash
git add .claude/skills/
git add framework/operations/
git add ai/registry.yml

git commit -m "[v11.0] feat: add skills integration with meta-skills

- Added building-claude-skills meta-skill (generic)
- Added maintaining-framework-governance meta-skill (project-specific)
- Created 13 skill directories for phases 1-5
- Updated registry.yml with skill metadata
- Added symlink strategy (2 layers)

Framework progression: v10.0 → v11.0
Governance rules: 6 rules documented
Skills phase 1A: 2/2 complete"
```

**Step 4: Verify commit**
```bash
git log -1 --stat
# Shows: files changed, insertions/deletions
```

**Step 5: Push and tag**
```bash
git push origin feature/v11-skills-integration
git tag -a v11.0 -m "v11.0: Skills-Based Specialization Architecture"
git push origin --tags
```

---

## Example 3: Ticket-Based Development

### Scenario
Working on Jira ticket DAPM-1234: User authentication

### Process

**Step 1: Create feature branch from ticket**
```bash
git checkout -b DAPM-1234/add-jwt-authentication
```

**Step 2: Make changes**
- Create auth service
- Add JWT generation
- Add auth guard
- Write tests

**Step 3: Commit with ticket reference**
```bash
git add src/auth/
git add src/guards/
git add tests/auth/

git commit -m "DAPM-1234: Implement JWT authentication

- Added JWT token generation (HS256 algorithm)
- Implemented AuthGuard for protected routes
- Created LoginController with refresh token logic
- Added test coverage (15 tests, 85% coverage)
- Integrated with Auth0 for validation

Affected modules:
- src/auth/: New auth service
- src/guards/: AuthGuard implementation
- src/controllers/: Login endpoints
- tests/: Test suite

Test results: ✅ All 15 tests passing"
```

**Step 4: Push and create PR**
```bash
git push origin DAPM-1234/add-jwt-authentication
# Then create PR on GitHub linking to DAPM-1234
```

**Step 5: After approval, merge**
```bash
# GitHub merges and auto-deletes branch
git checkout main
git pull origin main
```

---

## Example 4: Bug Fix with Short Commit

### Scenario
Quick fix for broken link validation

### Process

**Step 1: Create bugfix branch**
```bash
git checkout -b fix/link-validation-regex
```

**Step 2: Fix the issue**
- Update regex pattern
- Add test for edge case

**Step 3: Commit fix**
```bash
git add src/validators/link-validator.ts
git add tests/validators/

git commit -m "fix: improve regex pattern for markdown links

- Fixed edge case: links with parentheses in URLs
- Added 3 test cases for edge cases
- Validated against RFC 3986"
```

**Step 4: Push and PR**
```bash
git push origin fix/link-validation-regex
```

---

## Example 5: Documentation-Only Update

### Scenario
Update framework governance documentation

### Process

**Step 1: Create docs branch**
```bash
git checkout -b docs/update-governance-rules
```

**Step 2: Update documentation**
- Edit governance rules
- Add examples
- Update decision trees

**Step 3: Commit changes**
```bash
git add ai/framework/framework-governance.md

git commit -m "docs: update framework governance rules to v11.0

- Updated 6 governance rules (v10.0 → v11.0)
- Added scope decision tree
- Added common scenarios
- Clarified skill development guidelines"
```

**Step 4: Push and merge**
```bash
git push origin docs/update-governance-rules
# Create PR, review, merge
```

---

## Example 6: Multiple Commits in Feature Branch

### Scenario
Building multiple related skills in Phase 1B

### Workflow

**Feature branch:** `feature/phase-1b-infrastructure-skills`

**Commit 1: validating-links skill**
```bash
git add .claude/skills/generic/validating-links/

git commit -m "[Phase 1B] feat: add validating-links skill

- Created SKILL.md (300 lines)
- Added EXAMPLES.md with 3 real scenarios
- Added STANDARDS.md with validation rules
- Integrated with git pre-commit hooks"
```

**Commit 2: formatting-markdown skill**
```bash
git add .claude/skills/generic/formatting-markdown/

git commit -m "[Phase 1B] feat: add formatting-markdown skill

- Created SKILL.md (350 lines)
- Added EXAMPLES.md with before/after samples
- Added STANDARDS.md with formatting rules"
```

**Commit 3: updating-changelogs skill**
```bash
git add .claude/skills/generic/updating-changelogs/

git commit -m "[Phase 1B] feat: add updating-changelogs skill

- Created SKILL.md (300 lines)
- Added EXAMPLES.md with changelog patterns
- Integrated changelog automation"
```

**Commit 4: Update registry**
```bash
git add ai/registry.yml
git add framework/operations/v11.0-skills-integration-strategy.md

git commit -m "[Phase 1B] docs: register 3 infrastructure skills

- Added metadata for 3 new skills
- Updated skill totals in registry
- Updated Phase 1B completion status"
```

**Push all commits together**
```bash
git push origin feature/phase-1b-infrastructure-skills
# Create single PR with all 4 commits
```

---

## Example 7: Reviewing Changes Before Commit

### Scenario
Large refactoring - want to verify changes before committing

### Process

**Step 1: See what changed**
```bash
git status
# Shows modified files
```

**Step 2: Review all changes**
```bash
git diff
# Shows line-by-line differences
```

**Step 3: Review by file**
```bash
git diff src/auth/auth.service.ts
# See changes in specific file
```

**Step 4: See change statistics**
```bash
git diff --stat
# Shows: files changed, insertions/deletions
```

**Step 5: Stage and commit logically**
```bash
# Stage related changes together
git add src/auth/
git commit -m "refactor: restructure auth module

- Extracted token generation to separate service
- Simplified AuthGuard implementation
- Improved type safety with generics"

# Then stage next logical group
git add src/middleware/
git commit -m "refactor: update middleware to use new auth service

- Updated middleware to use new TokenService
- Simplified error handling
- Added logging"
```

---

## Example 8: Viewing Commit History

### Scenario
Finding when a change was made and by whom

### Process

**View recent commits**
```bash
git log --oneline -10
# Shows last 10 commits
```

**Search for specific change**
```bash
git log --grep="DAPM-1234" --oneline
# Find all commits related to ticket
```

**See who changed what**
```bash
git log --author="name" --oneline
# Commits by specific author
```

**See changes in last week**
```bash
git log --since="7 days ago" --oneline
```

**View specific commit details**
```bash
git show <commit-hash>
# Shows full commit with diff
```

**Compare branches**
```bash
git log --oneline main..feature/branch
# Shows commits in feature not in main
```

---

## Example 9: Undoing Mistakes

### Scenario: Accidentally committed wrong file

**Find the commit**
```bash
git log --oneline -5
# Find commit to undo
```

**Create undo commit**
```bash
git revert <commit-hash>
# Creates NEW commit that undoes previous
```

**Or remove from staging**
```bash
git reset HEAD wrong-file.txt
# Unstage file (before commit)
```

**Or discard changes**
```bash
git restore wrong-file.txt
# Discard unsaved changes
```

---

## Example 10: Framework Script Integration

### Scenario
Working on framework improvement with versioning

### Process

**Make framework changes**
- Update skill files
- Add documentation
- Create new features

**Run framework build** (if available)
```bash
# Regenerate registries and validate
agentic-framework build
```

**Stage everything**
```bash
git add .
```

**Commit with version**
```bash
git commit -m "[v11.1] feat: add new feature

- Change 1
- Change 2

Framework: v11.0 → v11.1"
```

**Tag release**
```bash
git tag -a v11.1 -m "v11.1: Feature additions"
git push origin --tags
```

---

**Examples Status:** Complete
**Last Updated:** Dec 4, 2025
**Used by:** All development workflows
