# Code Structure Checklists

Quick reference checklists for evaluating code structure quality.

---

## File Organization Checklist

### Single Responsibility
- [ ] Each file has one clear purpose
- [ ] File name describes its content accurately
- [ ] You can explain what the file does in one sentence
- [ ] Related types/helpers are colocated (not scattered)

### File Size
- [ ] All files are under 500 lines (hard limit)
- [ ] Files 400-500 lines are flagged for proactive splitting
- [ ] Very small files (<30 lines) serve a real purpose (not over-split)
- [ ] Target range is 100-400 lines for most files

### Directory Structure
- [ ] Related files are colocated (feature-based organization)
- [ ] Directory depth is shallow (2-4 levels typically)
- [ ] Directory names clearly indicate contents
- [ ] No empty or near-empty directories
- [ ] Index/barrel files used purposefully (public API, not everywhere)

### Naming
- [ ] File names match primary exports
- [ ] Naming conventions are consistent across project
- [ ] No vague names (utils, helpers, misc, common)
- [ ] Test files are clearly identified (.test, .spec, _test)

---

## Readability Checklist

### Naming Quality
- [ ] Variable names reveal purpose without comments
- [ ] Function names are verb + noun (action-oriented)
- [ ] Class/type names are nouns (domain language)
- [ ] Boolean names use is/has/can/should prefixes
- [ ] No single-letter variables (except loop indices)
- [ ] No cryptic abbreviations

### Function Design
- [ ] Functions are small and focused (under 50 lines typically)
- [ ] Each function does one thing
- [ ] Parameter count is reasonable (3-4 max, or use options object)
- [ ] Nesting depth is shallow (max 3 levels)
- [ ] Early returns used to reduce nesting
- [ ] No "and" in function names (sign of multiple responsibilities)

### Comments
- [ ] Comments explain WHY, not WHAT
- [ ] No commented-out code (use version control)
- [ ] No obvious comments restating the code
- [ ] Documentation comments on public APIs
- [ ] TODOs have context (date, ticket, author)
- [ ] No misleading or outdated comments

### Style Consistency
- [ ] Code follows project conventions
- [ ] Formatting is consistent (use automated tools)
- [ ] Whitespace groups related code logically
- [ ] Import order follows project standard

---

## DRY Compliance Checklist

### Duplication Detection
- [ ] No obvious copy-paste code blocks
- [ ] Similar patterns have been evaluated for extraction
- [ ] Same bug doesn't need fixing in multiple places
- [ ] Same logic isn't implemented differently in different places

### Extraction Quality
- [ ] Extracted code has clear, descriptive name
- [ ] Abstraction hides complexity (doesn't add it)
- [ ] Parameters are minimal and meaningful
- [ ] Changes to one use case don't break others

### Avoiding Over-Engineering
- [ ] Abstractions exist because of real duplication (not speculation)
- [ ] No "framework" built for one use case
- [ ] Similar code that will evolve differently is kept separate
- [ ] Rule of three considered before extracting

---

## PR Review Structure Checklist

Use this when reviewing pull requests for structural quality.

### New Files
- [ ] File placement follows project conventions
- [ ] File names are descriptive and consistent
- [ ] File size is reasonable for the content
- [ ] Related files are colocated appropriately

### Modified Files
- [ ] Changes don't push file over reasonable size limits
- [ ] New code follows existing patterns in the file
- [ ] No new duplication introduced
- [ ] File organization still makes sense after changes

### New Functions/Methods
- [ ] Names are clear and action-oriented
- [ ] Size is appropriate (not too long)
- [ ] Parameter count is reasonable
- [ ] Single responsibility is maintained

### Duplication Check
- [ ] New code doesn't duplicate existing code
- [ ] If similar code exists, extraction was considered
- [ ] If not extracted, there's a good reason (documented if non-obvious)

### Overall Structure
- [ ] Changes improve or maintain codebase quality
- [ ] No new technical debt introduced without acknowledgment
- [ ] Structure supports future changes (not blocking)

---

## Quick Assessment (5-Minute Review)

For rapid structural assessment when full review isn't possible.

### Pass/Fail Indicators

**Immediate concerns (flag for review):**
- [ ] Any file over 500 lines (hard limit exceeded)
- [ ] Any function over 150 lines
- [ ] Nesting deeper than 5 levels
- [ ] Obvious copy-paste blocks (10+ lines repeated)
- [ ] Cryptic names requiring comments to understand

**Yellow flags (note for discussion):**
- [ ] Files 400-500 lines (approaching limit)
- [ ] Functions 100-150 lines
- [ ] Nesting 4-5 levels
- [ ] Subtle duplication patterns
- [ ] Vague naming (utils, helpers)

**Green indicators (good signs):**
- [ ] Clear file and function names
- [ ] Small, focused functions
- [ ] Shallow nesting with early returns
- [ ] Consistent style throughout
- [ ] Appropriate use of abstractions
