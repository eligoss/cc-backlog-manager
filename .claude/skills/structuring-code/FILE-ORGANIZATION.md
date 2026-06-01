# File Organization Principles

This document provides detailed guidance on organizing files and directories for maintainable codebases.

---

## One Responsibility Per File

### Core Principle

Each file should have a single, clear purpose that can be described in one sentence.

**Good indicators:**
- File name accurately describes its entire content
- You can explain what the file does without saying "and"
- Changes to one concept don't require editing this file

**Problem indicators:**
- File contains unrelated classes or functions
- File name is vague (utils.ts, helpers.py, common.cs)
- Multiple developers frequently edit the same file for unrelated reasons

### What Belongs Together

**Keep together:**
- A class and its directly related types (enums, interfaces it implements)
- A component and its local styles/types (if framework supports)
- A function and its parameter/return types
- Test utilities specific to one test file

**Split apart:**
- Classes with different responsibilities
- Utilities used across multiple files (extract to shared location)
- Configuration and implementation
- Domain logic and infrastructure concerns

### Naming Files

**Match content to name:**
- File `UserService.ts` exports `UserService` class
- File `calculate-totals.py` exports `calculate_totals` function
- File `OrderTypes.swift` contains Order-related type definitions

**Avoid vague names:**
- `utils.ts` - Instead, name by purpose: `string-utils.ts`, `date-formatting.ts`
- `helpers.py` - Instead, name by domain: `order-helpers.py`, `validation.py`
- `misc.cs` - Split into properly named files

---

## File Size Guidelines

### Target Ranges

| Size | Assessment | Action |
|------|------------|--------|
| < 30 lines | Possibly over-split | Consider if this could merge with related file |
| 30-100 lines | Small, focused | Good for single-purpose utilities |
| 100-300 lines | Typical, healthy | Normal range for most files |
| 300-400 lines | Large but acceptable | Review for hidden complexity |
| 400-500 lines | At limit | Proactively plan splitting |
| 500+ lines | **Not allowed** | Must split before committing |

### 500 Lines is the Hard Limit

Files exceeding 500 lines are not acceptable in this codebase. If a file approaches this limit:

1. **Identify responsibilities** - What distinct concerns does the file handle?
2. **Plan the split** - How can these be separated into focused files?
3. **Execute the refactor** - Split before the file grows further

**No exceptions for:**
- Generated code - Generate to multiple files if needed
- Test suites - Split by test category or feature
- Configuration - Use includes or split by domain

**Only acceptable reasons for temporary >500:**
- Active refactoring in progress (with TODO to complete)
- Legacy code being actively migrated

### When to Split a Large File

**Split when:**
- File contains distinct sections with different purposes
- Two developers frequently need different parts
- You can name the extracted parts clearly
- Tests would be easier if split

**Don't split when:**
- Content is cohesive (single algorithm, single component)
- Split would require excessive cross-file imports
- You can't name the splits clearly
- Split is purely to hit a line count target

---

## Directory Structure Principles

### Feature-Based vs Layer-Based

**Feature-based (preferred for most projects):**
```
src/
  orders/
    OrderList.tsx
    OrderDetail.tsx
    order-service.ts
    order-types.ts
    __tests__/
  users/
    UserProfile.tsx
    user-service.ts
    user-types.ts
```

**Layer-based (common but often problematic):**
```
src/
  components/
    OrderList.tsx
    OrderDetail.tsx
    UserProfile.tsx
  services/
    order-service.ts
    user-service.ts
  types/
    order-types.ts
    user-types.ts
```

**Why feature-based is often better:**
- Related code stays together (colocation)
- Easier to understand a feature in isolation
- Simpler to extract features to separate packages
- Reduces cross-directory navigation

**When layer-based makes sense:**
- Very small projects (few features)
- Framework mandates it (some older MVC frameworks)
- Truly shared layers (database, infrastructure)

### Directory Depth

| Depth | Example | Assessment |
|-------|---------|------------|
| 2 levels | `src/orders/` | Simple, easy to navigate |
| 3 levels | `src/features/orders/` | Still manageable |
| 4 levels | `src/app/features/orders/components/` | Getting deep |
| 5+ levels | `src/app/modules/features/orders/components/list/` | Navigation burden |

**Keep depth shallow by:**
- Avoiding unnecessary grouping folders
- Using flat structure within features
- Extracting to separate packages instead of deeper nesting

### Colocation Principle

**Keep together things that change together:**
- Component and its styles
- Component and its tests
- Feature and its types
- Route and its loader/action

**Benefits:**
- Easier to find related files
- Simpler imports (relative paths)
- Clear ownership boundaries
- Easier to move or delete features

---

## Index/Barrel Files

### When to Use

**Use barrel files (`index.ts`) for:**
- Public API of a module/package
- Explicit export of what's available externally
- Re-exporting from multiple internal files

**Avoid barrel files for:**
- Every directory (creates maintenance burden)
- Internal implementation details
- When they cause circular dependencies

### Barrel File Patterns

**Good: Clear public API**
```typescript
// features/orders/index.ts
export { OrderList } from './OrderList';
export { OrderDetail } from './OrderDetail';
export type { Order, OrderStatus } from './order-types';
```

**Problematic: Re-exporting everything**
```typescript
// Don't: barrel that hides structure
export * from './OrderList';
export * from './OrderDetail';
export * from './order-service';
export * from './order-types';
// Consumer can't tell what's public vs internal
```

---

## Common Organizational Patterns

### Shared/Common Code

**Organize by domain, not by type:**
```
src/
  shared/
    date-utils/        # Date formatting, parsing
    validation/        # Validation helpers
    api-client/        # HTTP client wrapper
    ui-components/     # Truly shared UI
```

**Not by vague grouping:**
```
src/
  shared/
    utils/             # Unclear what's here
    helpers/           # Same problem
    common/            # Too vague
```

### Test File Placement

**Option 1: Colocated (often preferred)**
```
src/
  orders/
    OrderList.tsx
    OrderList.test.tsx    # Right next to source
```

**Option 2: Parallel structure**
```
src/
  orders/
    OrderList.tsx
tests/
  orders/
    OrderList.test.tsx    # Mirrors source structure
```

**Colocated benefits:**
- Obvious which tests exist
- Easy to update tests with code
- Clear when tests are missing

**Parallel benefits:**
- Clean separation of concerns
- Easier to exclude from production builds
- Some frameworks require it

### Configuration Files

**Project root for tool configs:**
```
project/
  package.json
  tsconfig.json
  .eslintrc.js
  .prettierrc
  src/
```

**Feature config with feature:**
```
src/
  orders/
    order-config.ts    # Feature-specific configuration
```
