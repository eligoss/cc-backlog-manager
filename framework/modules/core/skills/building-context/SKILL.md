---
id: building-context
name: building-context
description: Author context files with proper level selection, content splitting, and validation. Use when creating or reviewing business, technical, or process context.
scope: generic
applicable-projects: any
module: core
capabilities-provided:
  - context-authoring
  - context-validation
---

# Authoring Context Files

## When to Use This Skill

Use this skill to author or review context files in three scenarios:

1. **Creating new context** - Setting up business, technical, or process context files for a project
2. **Reviewing existing context** - Validating level assignment, content splitting, and token budgets
3. **Splitting content between levels** - Moving content from overfilled levels to appropriate higher levels

This skill enforces the cumulative loading system where each level adds new information without duplicating content from lower levels.

---

## Quick Start

### Creating New Context (~5 min)
1. Load [CONTENT-GUIDELINES.md](CONTENT-GUIDELINES.md) - Understand what goes in each level
2. Start with basic level - Core concepts only (~500 tokens)
3. Add advanced level - Tactical details (~1000 additional tokens)
4. Add expert level if needed - Strategic depth (~1500 additional tokens)
5. Run validation checklist from [VALIDATION-CHECKLIST.md](VALIDATION-CHECKLIST.md)

### Reviewing Existing Context (~3 min)
1. Load [VALIDATION-CHECKLIST.md](VALIDATION-CHECKLIST.md) - Run per-level and cross-level checks
2. Check token counts against targets (basic ~500, advanced ~1000, expert ~1500)
3. Verify no content duplication across levels
4. Return feedback with required fixes

### Splitting Content Between Levels (~5 min)
1. Load [LEVEL-DECISION-TREE.md](LEVEL-DECISION-TREE.md) - Apply decision tree to each piece of content
2. Move over-budget content from basic to advanced or expert
3. Remove duplicate content (keep only in lowest appropriate level)
4. Verify final token counts meet targets

---

## Core Principle: Cumulative Loading, No Duplication

The context level system uses cumulative loading for token efficiency:

| Level | Token Target | When Loaded | Purpose |
|-------|-------------|-------------|---------|
| **basic** | ~500 tokens | Always, for all agents | Minimum viable context - core concepts every agent needs |
| **advanced** | ~1000 tokens | Advanced+ context levels | Tactical expansion - detailed workflows, edge cases, rules |
| **expert** | ~1500 tokens | Expert context level only | Strategic depth - architecture, ADRs, integrations |

**The no-duplication rule:**
- Each piece of content appears in EXACTLY ONE level file
- Higher levels ADD new information, they DO NOT repeat lower level content
- When loading advanced, you get basic + advanced content
- When loading expert, you get basic + advanced + expert content

**What each level ADDS:**
- **Basic adds:** Essential vocabulary, core use cases, fundamental architecture
- **Advanced adds:** Detailed workflows, business rules, edge cases, component details
- **Expert adds:** ADRs, architectural patterns, integration details, strategic context

---

## Level Selection Decision Tree (Quick)

Use these quick questions to assign content to levels:

### Basic Level Test
**"Does every agent task need this to function?"**
- YES → Basic level
- NO → Continue to Advanced test

### Advanced Level Test
**"Is this needed for tactical decisions and detailed implementation?"**
- YES → Advanced level
- NO → Continue to Expert test

### Expert Level Test
**"Is this strategic, architectural, or for complex integrations?"**
- YES → Expert level
- NO → Reconsider if content is needed at all

**For complete decision tree with examples, see [LEVEL-DECISION-TREE.md](LEVEL-DECISION-TREE.md)**

---

## Category Guidelines (Summary)

Different context categories have different content distribution patterns:

| Category | Basic Focus | Advanced Focus | Expert Focus |
|----------|-------------|----------------|--------------|
| **Business** | Product purpose, domain vocabulary, core use cases | Feature details, workflows, business rules, edge cases | Market strategy, business goals, competitive landscape |
| **Technical** | Tech stack, core patterns, key components | Component details, data models, API endpoints, common tasks | ADRs, architectural patterns, integration details, performance |
| **Process** | Team structure, core workflows, communication | Detailed processes, edge cases, exceptions, tooling | Strategic planning, escalation, cross-team coordination |

**For detailed guidelines with examples, see [CONTENT-GUIDELINES.md](CONTENT-GUIDELINES.md)**

---

## Content Splitting Rules

Follow these four rules when distributing content across levels:

### Rule 1: Basic = Minimum Viable Context
**Basic level contains ONLY what every agent absolutely needs:**
- Core vocabulary (term definitions only)
- Product purpose (1-2 sentences)
- Key user personas (names and roles only)
- Essential architecture (diagram + component list)
- Common workflows (names only, not steps)

**Test:** "If I removed this from basic, would simple tasks fail?" If NO, move to advanced.

### Rule 2: Advanced = Tactical Expansion
**Advanced level adds details needed for implementation:**
- Workflow step-by-step details
- Business rules and validation logic
- Edge cases and exceptions
- Component implementation details
- API endpoint specifications

**Test:** "Do agents need this to implement features correctly?" If YES, advanced. If only for architecture/strategy, move to expert.

### Rule 3: Expert = Strategic Depth
**Expert level adds strategic and architectural context:**
- Architectural Decision Records (ADRs)
- Integration patterns and protocols
- Performance optimization strategies
- Market positioning and business goals
- Cross-system coordination

**Test:** "Is this about architecture, strategy, or complex integrations?" If YES, expert.

### Rule 4: When In Doubt, Go Higher
**If you're unsure which level:**
- Start one level higher than you think
- It's better to under-fill basic than over-fill it
- Basic level over-budget is worse than basic level sparse
- You can always move content down in review

---

## Instructions

### Instruction 1: Assess Current State
Determine what you're working with:
- **New context:** Start from templates in `framework/modules/core/templates/context/`
- **Existing context:** Read all three level files (basic, advanced, expert)
- **Review task:** Load [VALIDATION-CHECKLIST.md](VALIDATION-CHECKLIST.md) first

For each category (business, technical, process), you'll work with three files:
- `{category}-basic.md` (~500 tokens)
- `{category}-advanced.md` (~1000 tokens)
- `{category}-expert.md` (~1500 tokens)

### Instruction 2: Start with Basic Level
Author or review the basic level file:

1. **Load guidelines:** See [CONTENT-GUIDELINES.md](CONTENT-GUIDELINES.md) for category-specific basic content
2. **Apply basic-level test:** "Does every agent need this?"
3. **Write minimal content:**
   - Product/system purpose (1-2 sentences)
   - Domain vocabulary (terms only, no deep explanations)
   - Core use cases (names only)
   - Essential architecture (component names + high-level diagram)
4. **Check token count:** Must be ≤500 tokens
5. **Apply decision tree:** Use [LEVEL-DECISION-TREE.md](LEVEL-DECISION-TREE.md) to verify each item belongs in basic

### Instruction 3: Add Advanced Level
Author or review the advanced level file:

1. **Load guidelines:** See [CONTENT-GUIDELINES.md](CONTENT-GUIDELINES.md) for category-specific advanced content
2. **DO NOT repeat basic content:** Advanced adds to basic, does not duplicate
3. **Add tactical details:**
   - Workflow step-by-step procedures
   - Business rules and validation logic
   - Edge cases and exceptions
   - Component implementation details
   - Common task procedures
4. **Check token count:** Should be ~1000 tokens (not cumulative, just this file)
5. **Cross-reference:** Ensure no duplication with basic level

### Instruction 4: Add Expert Level (If Needed)
Author or review the expert level file:

1. **Load guidelines:** See [CONTENT-GUIDELINES.md](CONTENT-GUIDELINES.md) for category-specific expert content
2. **DO NOT repeat basic or advanced content:** Expert adds strategic depth only
3. **Add strategic context:**
   - Architectural Decision Records (ADRs)
   - Integration patterns and protocols
   - Performance optimization strategies
   - Market/business strategy (for business context)
   - Cross-system coordination patterns
4. **Check token count:** Should be ~1500 tokens (not cumulative, just this file)
5. **Cross-reference:** Ensure no duplication with basic or advanced levels

**Note:** Not all projects need expert-level context. Only create if you have strategic/architectural content.

### Instruction 5: Validate
Run validation checks from [VALIDATION-CHECKLIST.md](VALIDATION-CHECKLIST.md):

**Per-level checks:**
- Token count within target range (basic ~500, advanced ~1000, expert ~1500)
- Content type matches level purpose (see CONTENT-GUIDELINES.md)
- All template markers removed or filled in
- Proper markdown structure with headers

**Cross-level checks:**
- No duplicate content across levels
- Logical progression (basic → advanced → expert adds new information)
- No orphaned references (if advanced mentions something, it should be defined in basic or advanced)

**Report issues:** Document specific violations with file path, section, and required fix.

---

## Common Patterns

### Pattern 1: Vocabulary in Basic, Details in Advanced
**Scenario:** Defining domain terms

**Basic level:**
```markdown
| Term | Definition |
|------|------------|
| Sprint | Two-week development cycle |
| Story Points | Relative effort estimation |
```

**Advanced level:**
```markdown
## Story Point Guidelines
- 1 point: ~2-4 hours of work
- 3 points: ~1 day of work
- 5 points: ~2-3 days of work
- 8 points: ~1 week (maximum, should be split if larger)
```

**Why it works:** Basic defines terms so agents understand vocabulary. Advanced provides implementation details for agents doing estimation work.

### Pattern 2: Overview in Basic, ADRs in Expert
**Scenario:** Documenting architectural decisions

**Basic level:**
```markdown
## Core Architecture
- Frontend: React with TypeScript
- Backend: Node.js with Express
- Database: PostgreSQL
```

**Expert level:**
```markdown
## ADR-001: Choosing PostgreSQL over MongoDB
**Decision:** Use PostgreSQL as primary database
**Rationale:** Need for ACID transactions and complex relational queries...
**Alternatives considered:** MongoDB (rejected due to transaction limitations)...
```

**Why it works:** Basic gives agents enough to understand the stack. Expert provides strategic context for architectural decisions.

### Pattern 3: Process in Basic, Exceptions in Advanced
**Scenario:** Documenting team workflows

**Basic level:**
```markdown
## Development Workflow
1. Pick ticket from backlog
2. Create feature branch
3. Implement and test
4. Submit PR for review
5. Merge after approval
```

**Advanced level:**
```markdown
## Workflow Exceptions
- **Hotfixes:** Skip review for critical production issues, notify team in Slack
- **Dependency updates:** Auto-merge if CI passes and security scans clear
- **Documentation-only:** Single reviewer approval sufficient (normally requires 2)
```

**Why it works:** Basic covers 90% of cases. Advanced handles exceptions that agents encounter less frequently.

### Pattern 4: Component List in Basic, Details in Advanced
**Scenario:** Documenting system architecture

**Basic level:**
```markdown
## Key Components
- AuthService: User authentication and authorization
- PaymentProcessor: Handles payment transactions
- NotificationEngine: Sends emails and push notifications
```

**Advanced level:**
```markdown
## PaymentProcessor Details
**Responsibilities:**
- Integrate with Stripe API for credit card processing
- Handle payment webhooks and async status updates
- Retry failed payments with exponential backoff
- Generate invoices and receipts

**Key Methods:**
- `processPayment(amount, customerId)`: Charge customer
- `refundPayment(transactionId)`: Issue refund
- `handleWebhook(event)`: Process Stripe webhooks
```

**Why it works:** Basic gives high-level understanding. Advanced provides implementation details.

---

## Common Mistakes

### Mistake 1: Duplicating Content Across Levels
**Problem:** Same information appears in multiple level files

**Example:**
```markdown
# basic level
## Product Overview
ShopCo is an e-commerce platform for small businesses...

# advanced level
## Product Overview
ShopCo is an e-commerce platform for small businesses... [same text]
```

**Fix:** Remove from higher level. Basic already has it, advanced is loaded with basic.

### Mistake 2: Everything in Basic (Over Budget)
**Problem:** Putting all content in basic level, exceeding 500 token target

**Example:**
```markdown
# business-basic.md (1500 tokens)
## Detailed feature specifications
## Complete workflow procedures
## All business rules
```

**Fix:** Keep only essential vocabulary and concepts in basic. Move details to advanced, strategy to expert.

### Mistake 3: Empty Higher Levels
**Problem:** Basic has 800 tokens, advanced and expert are empty

**Example:**
```markdown
# business-basic.md (800 tokens) - everything here
# business-advanced.md (0 tokens) - empty
# business-expert.md (0 tokens) - empty
```

**Fix:** Split overfilled basic content. Move tactical details to advanced, strategic content to expert.

### Mistake 4: Wrong Level Assignment
**Problem:** Strategic content in basic, essential vocabulary in expert

**Example:**
```markdown
# basic level
## ADR-001: Why we chose microservices architecture
[detailed architectural decision]

# expert level
## Domain Vocabulary
| Term | Definition |
|------|------------|
| User | Person using the system |
```

**Fix:** Swap them. Vocabulary belongs in basic (every agent needs it). ADRs belong in expert (strategic decisions).

---

## Validation Quick Check

Use this quick checklist before finalizing context files:

### Per-Level Validation

**Basic Level:**
- [ ] Token count ≤500 tokens
- [ ] Contains only essential concepts (vocabulary, core use cases, high-level architecture)
- [ ] No detailed procedures or strategic decisions
- [ ] All template markers removed
- [ ] Proper markdown structure

**Advanced Level:**
- [ ] Token count ~1000 tokens
- [ ] Contains tactical details (workflows, business rules, edge cases)
- [ ] NO duplication of basic content
- [ ] Adds meaningful expansion to basic concepts
- [ ] All template markers removed

**Expert Level (if present):**
- [ ] Token count ~1500 tokens
- [ ] Contains strategic content (ADRs, integrations, architecture)
- [ ] NO duplication of basic or advanced content
- [ ] Only present if strategic context exists
- [ ] All template markers removed

### Cross-Level Validation

- [ ] No content duplication across any levels
- [ ] Logical progression: basic → advanced → expert adds new information
- [ ] All cross-references valid (terms used in advanced are defined in basic or advanced)
- [ ] Content type matches level purpose (see CONTENT-GUIDELINES.md)
- [ ] Total loaded tokens reasonable (basic only = ~500, advanced = ~1500, expert = ~3000)

**For complete checklist with examples, see [VALIDATION-CHECKLIST.md](VALIDATION-CHECKLIST.md)**

---

## See Also

### Supporting Files
- [LEVEL-DECISION-TREE.md](LEVEL-DECISION-TREE.md) - Full decision tree with examples for assigning content to levels
- [CONTENT-GUIDELINES.md](CONTENT-GUIDELINES.md) - Detailed category-specific guidelines (business, technical, process)
- [VALIDATION-CHECKLIST.md](VALIDATION-CHECKLIST.md) - Complete validation checklist with examples
- [EXAMPLES.md](EXAMPLES.md) - Real-world examples of well-structured context files

### Related Templates
- `framework/modules/core/templates/context/business-*.template.md` - Business context templates
- `framework/modules/core/templates/context/technical-*.template.md` - Technical context templates
- `framework/modules/core/templates/context/process-*.template.md` - Process context templates

### Related Skills
- `verifying-quality` - Quality validation and anti-patterns
- `validating-markdown` - Markdown and frontmatter standards
- `governance` - Framework governance and consistency rules

---

## Token Budget

**Total skill size:** ~2,500 tokens
- SKILL.md: ~450 tokens (this file)
- LEVEL-DECISION-TREE.md: ~400 tokens
- CONTENT-GUIDELINES.md: ~800 tokens
- VALIDATION-CHECKLIST.md: ~600 tokens
- EXAMPLES.md: ~250 tokens

**Loading profile:**
- Initial load (SKILL.md): ~450 tokens
- On-demand supporting files: ~400-1400 tokens depending on scenario
  - Creating new context: Load CONTENT-GUIDELINES.md (~800 tokens)
  - Reviewing existing: Load VALIDATION-CHECKLIST.md (~600 tokens)
  - Splitting content: Load LEVEL-DECISION-TREE.md (~400 tokens)

---

## Key Takeaways

1. **Cumulative loading, no duplication** - Each level adds new content, never repeats lower levels
2. **Token targets matter** - Basic ~500, advanced ~1000, expert ~1500 (per file, not cumulative)
3. **Level assignment is critical** - Use decision tree to place content in correct level
4. **Basic level discipline** - Keep basic minimal; over-filled basic defeats the system
5. **Progressive disclosure** - Load supporting files based on task (creating, reviewing, splitting)
6. **Category-specific patterns** - Business, technical, and process contexts have different content distributions

---

**Skill Version:** 1.0
**Status:** Phase 1 - Context Authoring Foundation
**Created:** 2025-12-22
**Part of:** Core shared skills (generic, applicable to all projects)
