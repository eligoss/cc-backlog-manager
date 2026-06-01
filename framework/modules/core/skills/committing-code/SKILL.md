---
id: committing-code
name: committing-code
description: Manage Git workflows including commits, branches, PRs, and history. Automatically detects Jira tickets from branch names and includes them in commits. Works with any git repository.
scope: generic
applicable-projects: any
module: core
capabilities-provided:
  - git-workflow-management
  - jira-integration
  - jira-git-integration
  - jira-branch-workflow
# Claude Code v2.1 features
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
hooks:
  PreToolUse: .claude/hooks/pre-write-quality.sh
---

# Managing Git Workflows

## When to Use This Skill

Use this skill when you need to:
- Create well-structured git commits
- Manage branches effectively
- Review changes and diffs
- Coordinate merges and pull requests
- Work on Jira-tracked tickets (auto-detected from branch name)

This skill is **universal** - works with any git repository. When a Jira ticket is detected in the branch name, it automatically includes the ticket reference in commits.

---

## Jira Ticket Detection

**Automatic detection from branch name:**
```bash
# Branch contains ticket → commits will include ticket prefix
DAPM-123-user-auth        # → "DAPM-123: ..."
feature/DAPM-456-fix      # → "DAPM-456: ..."
PROJ-789-something        # → "PROJ-789: ..."

# No ticket in branch → commits use plain description
user-auth-feature         # → "Add user authentication ..."
fix-login-bug             # → "Fix login redirect ..."
```

**Detection pattern:** Any `PROJ-NNN` pattern (uppercase letters, hyphen, digits) anywhere in branch name.

---

## Commit Message Format

### With Jira Ticket (detected or provided)
```
PROJ-123: Short descriptive title

- Added login form with email/password fields
- Created auth service with JWT token handling
- Wrote unit tests covering main flows
- Fixed validation edge case for empty passwords
```

### Without Jira Ticket
```
Short descriptive title

- Added login form with email/password fields
- Created auth service with JWT token handling
- Wrote unit tests covering main flows
- Fixed validation edge case for empty passwords
```

### Rules
- **3-7 bullet points** for most commits (max 15 for large changes)
- **Natural language** - write like a human developer
- **No period** at end of bullet points
- **No type prefixes** (feat:, fix:) when no Jira ticket
- Avoid buzzwords: "improvement", "enhancement", "optimize" (unless accurate)

---

## Branch Naming

### With Jira Ticket
```bash
DAPM-123-user-auth
DAPM-456-fix-login-redirect
PROJ-789-add-export-feature
```

### Without Jira Ticket
```bash
user-auth-feature
fix-login-redirect
add-export-feature
```

### Rules
- Lowercase with hyphens (kebab-case)
- Short and descriptive (2-5 words after ticket)
- No type prefix required (feature/, bugfix/)

---

## Quick Reference: Git Commands

### Branch Management
```bash
git branch -a                    # List all branches
git checkout -b DAPM-123-desc    # Create and switch to branch
git checkout main                # Switch branches
git branch -d branch-name        # Delete local branch
git push origin branch-name      # Push branch to remote
```

### Committing Changes
```bash
git status                       # See what changed
git add file.txt                 # Stage specific files
git add .                        # Stage all changes
git commit -m "message"          # Create commit
git push                         # Push to remote
```

### Reviewing Changes
```bash
git diff                         # See unstaged changes
git diff --staged                # See staged changes
git log --oneline                # See recent commits
git show <commit-hash>           # View specific commit
```

---

## Creating a Commit (Step by Step)

### Step 1: Check Current Branch for Ticket
```bash
git branch --show-current
# Example output: DAPM-123-user-auth
# → Ticket detected: DAPM-123
```

### Step 2: Review What Changed
```bash
git status                       # See modified files
git diff                         # See all changes
```

### Step 3: Stage Changes
```bash
git add file1.txt file2.txt      # Stage specific files
# Or
git add .                        # Stage all changes
```

### Step 4: Create Commit
```bash
# If ticket detected (DAPM-123-user-auth branch):
git commit -m "DAPM-123: Add user authentication

- Created login form component
- Added password validation
- Wrote auth service with JWT
- Added unit tests"

# If no ticket (user-auth branch):
git commit -m "Add user authentication

- Created login form component
- Added password validation
- Wrote auth service with JWT
- Added unit tests"
```

### Step 5: Push
```bash
git push origin branch-name
# Or if branch is tracked:
git push
```

---

## Common Workflows

### Standard Development Workflow
```bash
# 1. Start from main
git checkout main
git pull

# 2. Create branch
git checkout -b DAPM-123-add-login

# 3. Make changes and commit
git add .
git commit -m "DAPM-123: Add login functionality

- Created login page with form
- Added validation for email and password
- Integrated with auth API"

# 4. Push and create PR
git push -u origin DAPM-123-add-login
gh pr create --title "DAPM-123: Add login functionality"

# 5. After merge, cleanup
git checkout main
git pull
git branch -d DAPM-123-add-login
```

### Framework Version Commits
```bash
# For framework version updates, include version tag:
git commit -m "[v1.2.0] Update skill architecture

- Merged git workflow skills
- Added Jira auto-detection
- Simplified commit format"

git tag -a v1.2.0 -m "v1.2.0: Skill architecture update"
git push origin main --tags
```

---

## Pull Request Creation

### PR Title
Same as commit message first line:
```
DAPM-123: Add user authentication
```
Or without ticket:
```
Add user authentication
```

### PR Body
```markdown
## Summary
- Added login page with form validation
- Created auth service with JWT handling
- Wrote unit tests (85% coverage)

## Testing
- [ ] Unit tests pass
- [ ] Manual testing completed
```

---

## Pre-Commit Checklist

- [ ] Changes reviewed (git diff)
- [ ] Commit message clear and descriptive
- [ ] Bullet points are natural language (3-7 items)
- [ ] Jira ticket included if branch has one
- [ ] Tests pass locally

---

## See Also

### Supporting Files
- [Commit message standards](STANDARDS-COMMITS.md)
- [Branch naming standards](STANDARDS-BRANCHES.md)
- [Framework versioning standards](STANDARDS-FRAMEWORK.md)
- [Ticket-based work standards](STANDARDS-TICKETS.md)
- [Real examples](EXAMPLES.md)

---

**Skill Version:** 2.0
**Status:** Complete - Unified git workflow with Jira detection
**Use Cases:** All projects, all git workflows
