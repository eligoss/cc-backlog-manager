# Ticket-Based Work Standards

## When to Use Ticket References

Jira ticket references are **automatically detected** from branch names:
- Branch `DAPM-123-user-auth` → commits use `DAPM-123:` prefix
- Branch `user-auth` → commits have no prefix

You can also explicitly provide a ticket number when committing.

---

## Ticket Format

**Pattern:** `PROJECT-NUMBER`

**Examples:**
- `DAPM-123`
- `PROJ-456`
- `APMR-789`

**Rules:**
- Uppercase project code
- Hyphen separator
- Numeric ticket number

---

## Commit Format with Ticket

```
DAPM-123: Short descriptive title

- What was done
- Another change
- Additional work
```

---

## Auto-Detection from Branch

The skill detects Jira tickets by looking for `PROJ-NNN` pattern in branch name:

```bash
# These branches will auto-prefix commits:
DAPM-123-user-auth         # → "DAPM-123: ..."
feature/DAPM-456-login     # → "DAPM-456: ..."
PROJ-789-export            # → "PROJ-789: ..."

# These will NOT have ticket prefix:
user-auth-feature          # → "Add user auth..."
fix-login-bug              # → "Fix login..."
```

---

## Linking Commits to Tickets

### Primary Method
Start commit with ticket number:
```
DAPM-123: Add user authentication
```

### Secondary Method (body reference)
```
DAPM-123: Add user authentication

- Created login form
- Added validation

Related: DAPM-124, DAPM-125
```

---

## Multiple Tickets

When one commit addresses multiple tickets:
```
DAPM-123, DAPM-456: Refactor auth module

- Extracted shared utilities
- Updated both services
```

---

## Checklist

- [ ] Ticket detected from branch or explicitly provided
- [ ] Ticket format correct (PROJ-NNN)
- [ ] Commit title includes ticket prefix
- [ ] Body describes what was done (3-7 bullets)

---

**See Also:**
- [SKILL.md](SKILL.md) - Complete git workflow
- [STANDARDS-COMMITS.md](STANDARDS-COMMITS.md) - Commit format
- [STANDARDS-BRANCHES.md](STANDARDS-BRANCHES.md) - Branch naming
