# Branch Naming Standards

## Format

### With Jira Ticket
```
PROJ-123-short-description
```

### Without Jira Ticket
```
short-description
```

**No type prefix required** (feature/, bugfix/, etc.)

---

## Rules

- **Kebab-case** (lowercase-with-hyphens)
- **Short and descriptive** (2-5 words after ticket)
- **Jira ticket first** if working on tracked work
- **No slashes** in branch names (use hyphens only)

---

## Examples

### Good Examples
```bash
DAPM-123-user-auth
DAPM-456-fix-login-redirect
PROJ-789-add-export
user-auth-feature
fix-login-bug
refactor-auth-module
```

### Bad Examples
```bash
feature/DAPM-123/auth      # Slashes not needed
DAPM123-auth               # Missing hyphen in ticket
dapm-123-auth              # Lowercase ticket
Add_User_Auth              # Underscores, uppercase
```

---

## Branch Lifecycle

### 1. Create from main
```bash
git checkout main
git pull
git checkout -b DAPM-123-add-login
```

### 2. Make changes and commit
```bash
git add .
git commit -m "DAPM-123: Add login form

- Created form component
- Added validation"
```

### 3. Push to remote
```bash
git push -u origin DAPM-123-add-login
```

### 4. Create PR and merge

### 5. Cleanup
```bash
git checkout main
git pull
git branch -d DAPM-123-add-login
```

---

## Main Branch Rules

- Merge via pull request only
- Tests must pass before merge
- Keep commit history clean

---

**See Also:**
- [SKILL.md](SKILL.md) - Complete git workflow
- [STANDARDS-COMMITS.md](STANDARDS-COMMITS.md) - Commit messages
- [STANDARDS-TICKETS.md](STANDARDS-TICKETS.md) - Jira integration
