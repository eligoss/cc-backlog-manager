# Building Claude Skills: Design Patterns

## What Are Design Patterns?

Design patterns are proven solutions to common skill design problems:
- How to structure instructions
- How to organize examples
- How to handle edge cases
- How to make skills discoverable

This document shows 4 fundamental patterns used to build effective skills.

---

## Pattern 1: Validation Skills

Validation skills verify content against standards and return detailed feedback.

### Use Cases
- Link validation (file exists, syntax correct)
- Markdown formatting (consistent style)
- Ticket structure (YAML fields, required content)
- Code quality (syntax, standards)

### Structure

```markdown
---
name: validating-{something}
description: Validates {what} against {standard}. Use when
  {trigger condition}. Returns validation report with {output type}.
scope: generic | project-specific
---

# Validating {Something}

## When to Use This Skill

Use this skill when you need to verify {what} meets {standard}:
- Checking existing {content} for compliance
- Before publishing or exporting {content}
- Enforcing team standards
- Automated quality gates

## Quick Start

Validation checklist:
- [ ] {Check 1}
- [ ] {Check 2}
- [ ] {Check 3}
- [ ] {Check 4}
- [ ] {Check 5}

## Instructions

1. Prepare {content} for validation
2. Run validator on {content}
3. Review validation report
4. Fix any issues found
5. Re-validate (if needed)

## Common Patterns

### Pattern 1: {Scenario 1}
Description: When {condition}, {solution}

### Pattern 2: {Scenario 2}
Description: When {condition}, {solution}

### Pattern 3: {Scenario 3}
Description: When {condition}, {solution}

## See Also
- [Examples](EXAMPLES.md) - Real validation scenarios
- [Standards](STANDARDS.md) - Complete validation rules
- [Anti-patterns](ANTI-PATTERNS.md) - Common mistakes
```

### Real Example: validating-links

```
Validates: Markdown links
Against: File existence, syntax, patterns
Returns: Error report with fix suggestions
Trigger: Before committing documentation
```

### Testing Validation Skills

```
Input: File with broken links
Output: Detailed error report with line numbers
Expected: User can fix all issues based on report
```

---

## Pattern 2: Conversion Skills

Conversion skills transform content from one format to another.

### Use Cases
- Markdown → Jira wiki markup
- Markdown → ADF (Atlassian Document Format)
- CSV → Markdown tables
- JSON → YAML

### Structure

```markdown
---
name: converting-{from}-to-{to}
description: Converts {format A} to {format B}. Use when
  {need/trigger}. Supports {key features}.
scope: generic | project-specific
---

# Converting {From} to {To}

## When to Use This Skill

Use this skill when you need to:
- Transform {format A} content to {format B}
- Export {content type} to different platform
- Prepare content for {system}
- Support multiple output formats

## Quick Start

Supported conversions:
- {Format A} → {Format B}
- {Format A subtype} → {Format B variant}
- Nested structures → {Format B structure}

## Instructions

1. Prepare {format A} content
2. Select target format ({format B})
3. Run conversion (handles special cases)
4. Verify converted output
5. Make platform-specific adjustments if needed

## Common Patterns

### Pattern 1: Basic Conversion
Description: Simple {format A} → {format B}

### Pattern 2: Nested Structures
Description: Complex nested {structures}

### Pattern 3: Platform-Specific
Description: {Format B} variants for different platforms

## Supported Platforms
- Platform 1: Special handling for {feature}
- Platform 2: Special handling for {feature}
- Platform 3: Special handling for {feature}

## See Also
- [Examples](EXAMPLES.md) - Real conversion examples
- [Conversion Rules](STANDARDS.md) - Format mapping details
- [Common Issues](ANTI-PATTERNS.md) - Broken conversions and fixes
```

### Real Example: format-converter

```
Converts: Markdown → Jira wiki markup, ADF
Trigger: Before exporting tickets to Jira
Key features:
  - Preserves structure (headers, lists, tables)
  - Handles special characters
  - Converts links correctly
  - Error reporting with corrections
```

### Testing Conversion Skills

```
Input 1: Simple markdown file
Output: Correctly formatted Jira wiki
Input 2: Complex nested structures
Output: Nested Jira wiki format preserved
Input 3: Special characters and symbols
Output: Escaped correctly for target format
```

---

## Pattern 3: Domain Expert Skills

Domain expert skills provide specialized knowledge and decision-making guidance.

### Use Cases
- Test strategy guidance
- Git workflow expertise
- Code review patterns
- Framework governance decisions

### Structure

```markdown
---
name: {expertise}-expert
description: Expert guidance on {domain}. Use when
  {decision/trigger needed}. Helps with {key decisions}.
scope: generic | project-specific
---

# {Domain} Expert

## When to Use This Skill

Use this skill when you need:
- Guidance on {domain} decisions
- Best practices for {domain area}
- Architecture recommendations
- Troubleshooting {domain issues}

## Quick Start

Common scenarios:
1. {Scenario 1}: {Quick recommendation}
2. {Scenario 2}: {Quick recommendation}
3. {Scenario 3}: {Quick recommendation}

## Instructions

1. Describe your {decision/problem}
2. Provide context (constraints, requirements)
3. Consult expertise for options
4. Evaluate options against criteria
5. Choose best fit for your situation

## Common Patterns

### Pattern 1: {Decision Type 1}
When {condition}, best practice is {recommendation}

### Pattern 2: {Decision Type 2}
When {condition}, consider {options}

### Pattern 3: {Decision Type 3}
Trade-off: {Option A} vs {Option B}

## Decision Framework
- Criterion 1: {How to evaluate}
- Criterion 2: {How to evaluate}
- Criterion 3: {How to evaluate}

## See Also
- [Examples](EXAMPLES.md) - Real domain decisions
- [Standards](STANDARDS.md) - Best practices and standards
- [Anti-patterns](ANTI-PATTERNS.md) - Common mistakes and why
```

### Real Example: maintaining-framework-governance

```
Expertise: APM-R framework governance
Decision types:
  - New skill vs update file
  - Generic vs project-specific scope
  - Governance rule changes
  - Registry updates
Guidance includes: Rules, decision trees, examples
```

### Testing Domain Expert Skills

```
Input: "Should I create a new skill or update context?"
Output: Decision tree and recommendation
Input: "How do I add a new framework rule?"
Output: Procedures, governance review, integration steps
```

---

## Pattern 4: Maintenance Skills

Maintenance skills keep systems consistent and up-to-date.

### Use Cases
- Updating changelogs
- Maintaining registry files
- Keeping documentation current
- Governance enforcement

### Structure

```markdown
---
name: maintaining-{system}
description: Maintains {system} consistency and currency. Use when
  {maintenance trigger}. Ensures {quality goals}.
scope: generic | project-specific
---

# Maintaining {System}

## When to Use This Skill

Use this skill when you need to:
- Keep {system} up-to-date
- Maintain consistency across {system}
- Apply {system} standards
- Enforce {system} governance

## Quick Start

Maintenance checklist:
- [ ] {Check 1}
- [ ] {Check 2}
- [ ] {Check 3}
- [ ] {Check 4}
- [ ] {Check 5}

## Instructions

1. Identify {maintenance trigger}
2. Run {system} maintenance procedure
3. Apply {standards}
4. Validate consistency
5. Document changes

## Common Patterns

### Pattern 1: {Maintenance Type 1}
When {condition}, apply {procedure}

### Pattern 2: {Maintenance Type 2}
When {condition}, apply {procedure}

### Pattern 3: {Maintenance Type 3}
When {condition}, apply {procedure}

## Consistency Rules
- Rule 1: {Standard}
- Rule 2: {Standard}
- Rule 3: {Standard}

## See Also
- [Examples](EXAMPLES.md) - Real maintenance scenarios
- [Procedures](STANDARDS.md) - Step-by-step maintenance
- [Common Issues](ANTI-PATTERNS.md) - Mistakes and fixes
```

### Real Example: updating-changelogs

```
System: Changelog files (CHANGELOG.md, etc.)
Maintenance trigger: New feature, bug fix, version release
Standards:
  - Consistent format (date, version, type)
  - Chronological order
  - Clear descriptions
Guidance: When to update, how to format, examples
```

### Testing Maintenance Skills

```
Input: New feature needs changelog entry
Output: Correctly formatted entry at top of changelog
Input: Multiple changes need consolidation
Output: Organized by type (features, fixes, chores)
```

---

## Pattern Comparison Matrix

### Choosing the Right Pattern

| Pattern | Best For | Example | Output |
|---------|----------|---------|--------|
| **Validation** | Checking standards | Link validation | Error report |
| **Conversion** | Format transformation | Markdown → Jira | Converted content |
| **Domain Expert** | Guidance & decisions | Framework governance | Recommendations |
| **Maintenance** | Keeping systems current | Changelog updates | Updated system |

### Hybrid Patterns

Some skills combine patterns:

```
Name: ticket-structure-validator
Primary: Validation (checks structure)
Secondary: Maintenance (fixes/updates)
Output: Validation report + corrected files
```

---

## Pattern Implementation Checklist

### When Building Any Pattern

#### Before Writing
- [ ] Identify which pattern(s) fit
- [ ] Define input/output clearly
- [ ] Plan supporting files
- [ ] Decide generic vs project-specific

#### SKILL.md
- [ ] Follow pattern structure
- [ ] Instructions match pattern (3-5 steps)
- [ ] Common patterns section populated
- [ ] "See Also" links to supporting files

#### Testing
- [ ] Example input works correctly
- [ ] Output matches expected format
- [ ] Edge cases handled
- [ ] Multiple models tested

#### Documentation
- [ ] EXAMPLES.md provides real scenarios
- [ ] STANDARDS.md or PROCEDURES.md as needed
- [ ] ANTI-PATTERNS.md shows common mistakes
- [ ] All cross-references work

---

## Real-World Pattern Application

### Example 1: Building validating-links (Validation Pattern)

```
Decision: Validation pattern (checking links)
Input: Markdown file
Processing: Check file existence, syntax, patterns
Output: Error report with line numbers
Structure:
  - SKILL.md: When to validate, basic instructions
  - EXAMPLES.md: 3 real validation scenarios
  - STANDARDS.md: Link validation rules
  - ANTI-PATTERNS.md: Common mistakes
```

### Example 2: Building format-converter (Conversion Pattern)

```
Decision: Conversion pattern (format transformation)
Input: Markdown content
Processing: Parse markdown, convert to target format
Output: Converted content in target format
Structure:
  - SKILL.md: Supported conversions, basic process
  - EXAMPLES.md: 4 conversion examples
  - STANDARDS.md: Format mapping rules
  - PATTERNS.md: Nested structure handling
```

### Example 3: Building maintaining-framework-governance (Maintenance + Domain Expert Pattern)

```
Decision: Hybrid pattern (maintenance + expert guidance)
Input: Framework improvement task
Processing: Check governance rules, provide guidance
Output: Updated governance + decision record
Structure:
  - SKILL.md: Governance checklist
  - GOVERNANCE-RULES.md: All 6 rules
  - SCOPE-DECISION-TREE.md: Generic vs project-specific
  - EXAMPLES.md: Real governance decisions
  - ANTI-PATTERNS.md: Common governance mistakes
```

---

## Cross-Pattern Relationships

Skills often work together:

```
maintaining-framework-governance (Domain Expert + Maintenance)
    ├─ Guides creation of all other skills
    ├─ References building-claude-skills
    └─ Ensures consistency across all patterns

building-claude-skills (Domain Expert)
    ├─ Template for all skill structures
    ├─ Used when creating: validation, conversion, maintenance skills
    └─ Authority on naming, scope, progressive disclosure
```

---

## Pattern Evolution

As your skill library grows:

1. **Start:** Generic validation, conversion patterns
2. **Extend:** Domain expert patterns for project-specific knowledge
3. **Mature:** Maintenance patterns for keeping systems consistent
4. **Advanced:** Hybrid patterns for complex scenarios

---

## Key Takeaways

1. **Validation Pattern:** For quality checking and standards enforcement
2. **Conversion Pattern:** For format transformation and platform compatibility
3. **Domain Expert Pattern:** For specialized knowledge and decision guidance
4. **Maintenance Pattern:** For consistency and system upkeep

Each pattern has:
- Clear structure and organization
- Defined input/output
- Supporting files strategy
- Testing approach

Use these patterns as templates when building all 21 APM-R skills.

---

**Patterns Document:** Complete reference for skill design
**Status:** Phase 1A - Supporting file for building-claude-skills
**Last Updated:** Dec 4, 2025
**Next:** Review STRUCTURE-TEMPLATE.md for SKILL.md template

