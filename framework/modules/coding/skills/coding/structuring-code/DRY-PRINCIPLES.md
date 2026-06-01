# DRY Principles

This document provides detailed guidance on identifying and handling code duplication.

---

## Types of Duplication

### Exact Duplication

**Definition:** Identical or nearly identical code blocks in multiple locations.

**How to spot:**
- Copy-paste detector tools flag it
- Same logic, same variable names
- Bug fixes needed in multiple places
- Obvious when reading code

**Example scenario:**
```
// Found in OrderService
if (order.total > 100) {
    discount = order.total * 0.1;
    order.total = order.total - discount;
}

// Same code in CartService
if (cart.total > 100) {
    discount = cart.total * 0.1;
    cart.total = cart.total - discount;
}
```

**Resolution:** Extract to shared function with parameterized entity.

---

### Structural Duplication

**Definition:** Same pattern or structure with different data or types.

**How to spot:**
- Similar shape, different details
- Repeated patterns across different domains
- Same sequence of operations on different entities

**Example scenario:**
```
// User validation
function validateUser(user) {
    if (!user.name) throw new Error('Name required');
    if (!user.email) throw new Error('Email required');
    if (!isValidEmail(user.email)) throw new Error('Invalid email');
}

// Product validation
function validateProduct(product) {
    if (!product.name) throw new Error('Name required');
    if (!product.sku) throw new Error('SKU required');
    if (!isValidSku(product.sku)) throw new Error('Invalid SKU');
}
```

**Resolution:** Consider generic validation framework, schema validation, or accept as reasonable duplication if domains evolve differently.

---

### Conceptual Duplication

**Definition:** Same concept implemented differently in multiple places.

**How to spot:**
- Same business rule, different code
- Multiple ways to do the same thing
- Inconsistent behavior for same operation

**Example scenario:**
```
// In OrderService: checks user role inline
if (user.role === 'admin' || user.role === 'manager') {
    // allow action
}

// In ReportService: different role check
if (user.permissions.includes('view-reports')) {
    // allow action
}

// Same concept: "can user do this?" but implemented differently
```

**Resolution:** Establish single source of truth for the concept (authorization service, permission checker).

---

## When to Extract

### Rule of Three

**Principle:** Consider extraction on the third occurrence.

**Rationale:**
- First time: Just write it
- Second time: Notice the similarity, but might be coincidence
- Third time: Pattern confirmed, extract

**Caveat:** Don't wait for three if:
- Business concept clearly exists
- Duplication is complex (many lines)
- You're about to add more occurrences

### Business Concept Exists

**Extract when you can name it:**
- "Calculate discount" → `calculateDiscount()`
- "Format currency" → `formatCurrency()`
- "Check permission" → `hasPermission()`

**If you can't name it clearly, maybe don't extract:**
- Vague names like `doThing()` or `processData()` suggest the abstraction isn't real
- Forced abstraction creates confusion

### Changes Propagate Together

**Strong signal for extraction:**
- When you change one copy, you change all copies
- Bug in one means bug in all
- Feature request affects all instances

**This indicates true duplication, not coincidence.**

---

## When NOT to Extract

### Incidental Similarity

**Definition:** Code looks the same now but serves different purposes.

**Indicators:**
- Different business domains
- Different expected evolution paths
- Similar by coincidence, not by design

**Example:**
```
// User registration validation
function validateRegistration(data) {
    if (!data.email) throw new Error('Email required');
    if (!data.password) throw new Error('Password required');
}

// Newsletter signup validation
function validateNewsletterSignup(data) {
    if (!data.email) throw new Error('Email required');
    if (!data.preferences) throw new Error('Preferences required');
}
```

**Why not extract:** These will evolve differently. Registration may add phone number, newsletter may add frequency. Forcing them together creates awkward code.

---

### Different Evolution Paths

**Ask:** Will these change together or separately?

**Same evolution (extract):**
- Tax calculation for orders and invoices (tax rules change together)
- Date formatting across the app (format requirements are global)

**Different evolution (keep separate):**
- Admin form validation vs customer form validation
- Internal API serialization vs external API serialization

---

### Abstraction Adds Complexity

**"The wrong abstraction is worse than duplication."**

**Signs of wrong abstraction:**
- Parameters for every variation
- Conditionals inside to handle cases
- Difficult to understand what it does
- Changes require understanding all use cases

**Example of problematic extraction:**
```
// Trying to handle all cases
function formatEntity(entity, options) {
    if (options.type === 'user') {
        // user-specific logic
    } else if (options.type === 'order') {
        // order-specific logic
    } else if (options.type === 'product') {
        // product-specific logic
    }
    // ... continues with many branches
}
```

**Better:** Keep separate, focused functions until true common pattern emerges.

---

## Extraction Patterns

### Extract Function

**When:** Same logic in multiple functions.

**How:**
1. Identify the duplicated code
2. Create new function with descriptive name
3. Parameterize the differences
4. Replace duplicates with calls to new function
5. Run tests

### Extract Class/Module

**When:** Group of related functions that work together.

**How:**
1. Identify related functions and data
2. Create class/module with clear responsibility
3. Move functions as methods
4. Update callers
5. Run tests

### Extract Constant/Configuration

**When:** Same literal value in multiple places.

**How:**
1. Identify the repeated value
2. Create named constant with meaningful name
3. Replace literals with constant reference
4. Document the constant if purpose isn't obvious

### Parameterize

**When:** Same logic, different data.

**How:**
1. Identify the varying parts
2. Make them parameters
3. Ensure parameter names communicate purpose
4. Keep parameter count reasonable (use options object if many)

---

## Abstraction Quality

### Good Abstractions

**Characteristics:**
- Hide complexity behind simple interface
- Stable over time (implementation changes, interface doesn't)
- Clear, descriptive name
- Single responsibility
- Easy to use correctly, hard to use incorrectly

### Bad Abstractions

**Characteristics:**
- Leaky (implementation details escape)
- Unstable (interface changes frequently)
- Vague name
- Does too many things
- Requires understanding internals to use

### Signs Abstraction Is Needed

- Duplication is spreading
- Same bugs fixed in multiple places
- New team members implement same thing differently
- Code reviews catch "we already have this"

### Signs of Premature Abstraction

- Only one use case exists
- You're guessing future needs
- Abstraction name is vague or forced
- You're building "infrastructure" before features
