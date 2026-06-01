# Code Readability Principles

This document provides detailed guidance on writing self-documenting, readable code.

---

## Self-Descriptive Naming

### Core Principle

Names should reveal intent. A reader should understand purpose without consulting documentation or implementation.

### Variable Naming

**Express purpose, not type:**
- `elapsedTimeInDays` not `d` or `days`
- `customerOrders` not `list` or `data`
- `isValidEmail` not `valid` or `check`
- `maxRetryAttempts` not `max` or `n`

**Avoid single letters except:**
- Loop indices (`i`, `j`, `k`) in small loops
- Coordinates (`x`, `y`, `z`) in graphics/math
- Lambda parameters when meaning is obvious

**Avoid abbreviations except universal ones:**
- Acceptable: `id`, `url`, `api`, `http`, `json`, `html`, `css`
- Avoid: `usr`, `mgr`, `cnt`, `num`, `btn`, `lbl`

**Collection naming:**
- Plural for collections: `orders`, `users`, `items`
- Singular for individual: `order`, `user`, `item`
- Avoid redundant suffixes: `orderList`, `userArray` (just use `orders`, `users`)

### Function Naming

**Verb + noun pattern:**
- `getUserById()` - retrieves user
- `calculateOrderTotal()` - computes value
- `validateEmailFormat()` - checks validity
- `sendNotification()` - performs action

**Action verbs that communicate:**
| Verb | Implies |
|------|---------|
| `get/fetch` | Retrieves data, may involve I/O |
| `find` | Searches, may return null/undefined |
| `create/make` | Constructs new instance |
| `update/set` | Modifies existing data |
| `delete/remove` | Eliminates data |
| `calculate/compute` | Derives value from inputs |
| `validate/check` | Returns boolean or throws |
| `parse` | Transforms string to structured data |
| `format` | Transforms data to string |
| `is/has/can/should` | Returns boolean |

**Avoid vague verbs:**
- `handleData()` - What does it do?
- `processOrder()` - How is it processed?
- `doSomething()` - Completely opaque

### Class and Type Naming

**Noun-based, domain language:**
- `OrderProcessor` - processes orders
- `UserRepository` - stores/retrieves users
- `PaymentGateway` - interfaces with payments
- `EmailValidator` - validates emails

**Avoid generic names:**
- `Manager`, `Handler`, `Processor` alone (what do they manage/handle/process?)
- `Helper`, `Utility` (too vague, use specific purpose)
- `Data`, `Info` (what kind of data/info?)

**Suffixes that communicate:**
| Suffix | Implies |
|--------|---------|
| `Service` | Business logic, coordinates operations |
| `Repository` | Data access, persistence |
| `Controller` | Handles external requests |
| `Factory` | Creates instances |
| `Builder` | Constructs complex objects step-by-step |
| `Validator` | Validates data |
| `Mapper` | Transforms between types |

### Boolean Naming

**Use question-form prefixes:**
- `isActive` - state check
- `hasPermission` - possession check
- `canEdit` - capability check
- `shouldRefresh` - recommendation check
- `wasProcessed` - past state check

**Avoid negation in names:**
- `isEnabled` not `isNotDisabled`
- `hasAccess` not `isNotRestricted`
- Double negatives (`!isNotValid`) are hard to reason about

---

## Function Design

### Size Guidelines

| Metric | Target | Warning |
|--------|--------|---------|
| Lines | 20-50 | > 100 |
| Statements | 15-30 | > 50 |
| Parameters | 3-4 | > 5 |
| Nesting depth | 2-3 | > 4 |
| Cyclomatic complexity | < 10 | > 15 |

### Single Responsibility

**One function, one job:**
- Does one thing, does it well
- Can be described without "and"
- Changes for one reason only

**Signs of multiple responsibilities:**
- Function name includes "And" (`validateAndSave`, `fetchAndProcess`)
- Long functions with distinct sections
- Multiple unrelated parameters
- Comments dividing the function into parts

### Return Early Pattern

**Prefer early returns to reduce nesting:**

```
// Instead of deep nesting
function processOrder(order) {
    if (order != null) {
        if (order.isValid()) {
            if (order.hasItems()) {
                // actual logic here
            }
        }
    }
}

// Use early returns
function processOrder(order) {
    if (order == null) return;
    if (!order.isValid()) return;
    if (!order.hasItems()) return;

    // actual logic here, at base indentation
}
```

### Parameter Design

**Limit positional parameters:**
- 0-2 parameters: Usually fine
- 3-4 parameters: Consider if all are needed
- 5+ parameters: Use options object

**Options object pattern:**
```
// Instead of many parameters
function createUser(name, email, age, role, department, startDate) { }

// Use options object
function createUser(options: CreateUserOptions) {
    const { name, email, age, role, department, startDate } = options;
}
```

**Benefits of options object:**
- Named parameters at call site
- Optional parameters are natural
- Easier to add new parameters
- Self-documenting

---

## Comment Strategy

### When to Comment

**Comment the WHY, not the WHAT:**

```
// BAD: Explains what (obvious from code)
// Loop through users and check if active
for (const user of users) {
    if (user.isActive) { }
}

// GOOD: Explains why (not obvious)
// Skip inactive users to avoid sending emails to closed accounts
// per compliance requirement GDPR-2021-42
for (const user of users) {
    if (user.isActive) { }
}
```

### Documentation Comments

**When to use:**
- Public API methods
- Library functions used by others
- Complex algorithms
- Non-obvious return values or side effects

**What to include:**
- What the function does (brief)
- Parameter descriptions if not obvious
- Return value description
- Exceptions/errors that may be thrown
- Example usage for complex functions

### TODO Comments

**Format with context:**
```
// TODO(2024-01-15): Refactor when new API is available
// TODO(@username): Review edge case handling
// TODO(JIRA-123): Complete implementation after spec finalized
```

**Avoid indefinite TODOs:**
```
// BAD: No context, will be forgotten
// TODO: fix this later
```

### Comments to Avoid

**Commented-out code:**
- Use version control instead
- Dead code creates confusion
- Delete it; git remembers

**Obvious comments:**
```
// BAD
// Increment counter
counter++;

// Set user name
user.name = newName;
```

**Misleading comments:**
- Worse than no comment
- Update or delete immediately when code changes

---

## Consistent Style

### Follow Project Conventions

**Adopt existing patterns:**
- Match naming conventions already in codebase
- Follow established file organization
- Use same patterns for similar problems
- When in doubt, match surrounding code

**Consistency beats preference:**
- Your preferred style matters less than codebase consistency
- Propose style changes through proper channels (linting rules)
- Don't mix styles within a file or feature

### Automated Formatting

**Use tools, not discipline:**
- Prettier, Black, gofmt, swift-format
- Configure once, forget about formatting
- Removes style debates from code review
- Ensures consistent output

**Configure and commit:**
- Check in configuration files
- Run formatter in pre-commit hooks
- Fail CI on formatting issues

### Whitespace and Structure

**Group related code:**
- Blank lines between logical sections
- Keep related statements together
- Separate concerns visually

**Consistent indentation:**
- Use project standard (spaces vs tabs, count)
- Let formatter handle it
- Never mix within a file
