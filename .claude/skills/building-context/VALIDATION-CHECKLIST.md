# Context Validation Checklist

## Per-Level Validation

### Basic Level Checklist

#### Token Budget
- [ ] File is approximately 500 tokens (~375-625 words)
- [ ] No single section exceeds 150 tokens
- [ ] Content is concise and factual (no lengthy explanations)

#### Content Requirements
- [ ] Contains only FOUNDATIONAL information
- [ ] Answers "What is it?" not "Why?" or "How?"
- [ ] Uses bullet points and lists (not paragraphs)
- [ ] No strategic rationale or trade-offs
- [ ] No tactical implementation details
- [ ] No process governance

#### Completeness
- [ ] No template markers remain (`<!-- TEMPLATE: -->`)
- [ ] All required sections for category are present
- [ ] Every statement is a concrete fact (no placeholders)
- [ ] A new team member could understand the essentials

#### Category-Specific Basic Checks

**Business:**
- [ ] Product name and purpose stated
- [ ] User segments identified
- [ ] Business model described
- [ ] NO competitive analysis details
- [ ] NO strategic rationale

**Technical:**
- [ ] Tech stack listed
- [ ] Architecture type stated
- [ ] Repository structure shown
- [ ] NO design patterns
- [ ] NO ADRs or rationale

**Process:**
- [ ] Basic workflow outlined
- [ ] Core tools listed
- [ ] Team structure shown
- [ ] NO detailed process steps
- [ ] NO process rationale

---

### Advanced Level Checklist

#### Token Budget
- [ ] File is approximately 1000 tokens (~750-1250 words)
- [ ] Builds on basic without duplication
- [ ] Content is detailed and prescriptive

#### Content Requirements
- [ ] Contains TACTICAL implementation guidance
- [ ] Answers "How do we do it?" not "What is it?" or "Why?"
- [ ] Includes examples and code snippets where relevant
- [ ] No duplication of basic facts
- [ ] No strategic decision rationale
- [ ] Expands on basic, doesn't repeat it

#### Completeness
- [ ] No template markers remain
- [ ] All required sections for category are present
- [ ] Provides actionable guidance
- [ ] An experienced developer could execute complex tasks

#### Category-Specific Advanced Checks

**Business:**
- [ ] Key metrics and KPIs defined
- [ ] User personas detailed
- [ ] Competitive position described
- [ ] NO duplication of product basics
- [ ] NO strategic WHY (just tactical details)

**Technical:**
- [ ] Design patterns documented
- [ ] State management approach defined
- [ ] Error handling patterns shown
- [ ] Build/deploy process outlined
- [ ] NO duplication of tech stack
- [ ] NO ADRs (those are expert level)

**Process:**
- [ ] Code review process detailed
- [ ] Sprint planning described
- [ ] Testing requirements specified
- [ ] Release process outlined
- [ ] NO duplication of basic workflow
- [ ] NO process philosophy

---

### Expert Level Checklist

#### Token Budget
- [ ] File is approximately 1500 tokens (~1125-1875 words)
- [ ] Builds on advanced without duplication
- [ ] Content is analytical and strategic

#### Content Requirements
- [ ] Contains STRATEGIC decision context
- [ ] Answers "Why did we choose this?" not "What?" or "How?"
- [ ] Includes rationale, trade-offs, constraints
- [ ] No duplication of basic or advanced content
- [ ] Provides decision-making frameworks
- [ ] Includes "revisit conditions" for major decisions

#### Completeness
- [ ] No template markers remain
- [ ] All required sections for category are present
- [ ] Provides strategic context
- [ ] A senior leader could make informed strategic decisions

#### Category-Specific Expert Checks

**Business:**
- [ ] Strategic rationale documented
- [ ] Decision frameworks defined
- [ ] Business constraints identified
- [ ] Long-term vision stated
- [ ] Trade-offs explicitly called out
- [ ] NO duplication of metrics or competitive details

**Technical:**
- [ ] ADRs documented with context, decision, rationale
- [ ] Technology selection rationale provided
- [ ] Scalability strategy outlined
- [ ] Technical constraints identified
- [ ] Migration plans documented
- [ ] NO duplication of patterns or processes

**Process:**
- [ ] Process philosophy explained
- [ ] Quality governance defined
- [ ] Decision frameworks documented
- [ ] Process evolution approach outlined
- [ ] Standards rationale provided
- [ ] NO duplication of workflow steps

---

## Cross-Level Validation

### Duplication Check

Run this check across all three levels for each category:

#### Business Context
- [ ] Product name/purpose: Only in BASIC
- [ ] User segments: Basic facts in BASIC, personas in ADVANCED
- [ ] Business model: Only in BASIC
- [ ] Metrics/KPIs: Only in ADVANCED
- [ ] Strategic rationale: Only in EXPERT
- [ ] Decision framework: Only in EXPERT

#### Technical Context
- [ ] Tech stack: Only in BASIC
- [ ] Architecture type: Only in BASIC
- [ ] Repository structure: Only in BASIC
- [ ] Design patterns: Only in ADVANCED
- [ ] Build/deploy: Only in ADVANCED
- [ ] ADRs: Only in EXPERT
- [ ] Technology strategy: Only in EXPERT

#### Process Context
- [ ] Basic workflow: Only in BASIC
- [ ] Tools list: Only in BASIC
- [ ] Team structure: Only in BASIC
- [ ] Code review details: Only in ADVANCED
- [ ] Sprint planning: Only in ADVANCED
- [ ] Process philosophy: Only in EXPERT
- [ ] Process governance: Only in EXPERT

### Progression Check

Validate that each level EXPANDS the previous level:

- [ ] ADVANCED references BASIC (doesn't duplicate it)
- [ ] EXPERT references ADVANCED (doesn't duplicate it)
- [ ] Each level uses appropriate detail:
  - BASIC: What is it? (facts)
  - ADVANCED: How do we use it? (guidance)
  - EXPERT: Why this way? (rationale)

### Token Budget Table

| Category | Basic | Advanced | Expert | Total |
|----------|-------|----------|--------|-------|
| Business | _____ | _____ | _____ | _____ |
| Technical | _____ | _____ | _____ | _____ |
| Process | _____ | _____ | _____ | _____ |

**Validation:**
- [ ] Each BASIC is ~500 tokens (±125)
- [ ] Each ADVANCED is ~1000 tokens (±250)
- [ ] Each EXPERT is ~1500 tokens (±375)
- [ ] Total per category is ~3000 tokens (±750)
- [ ] Grand total is ~9000 tokens (all categories, all levels)

---

## Quality Check

### Completeness

#### No Placeholders
- [ ] No `[TODO]` markers
- [ ] No `[FILL IN]` placeholders
- [ ] No `<!-- TEMPLATE: -->` markers
- [ ] No `[Your X here]` placeholders
- [ ] Every section has real content

#### All Required Sections Present

**Business Context:**
- [ ] BASIC: Product, Users, Business Model
- [ ] ADVANCED: Metrics, Personas, Competition
- [ ] EXPERT: Strategy, Constraints, Decision Framework

**Technical Context:**
- [ ] BASIC: Tech Stack, Architecture, Repository, Setup
- [ ] ADVANCED: Patterns, State, Errors, Build/Deploy
- [ ] EXPERT: ADRs, Technology Strategy, Scalability

**Process Context:**
- [ ] BASIC: Workflow, Tools, Team, Communication
- [ ] ADVANCED: Code Review, Planning, Testing, Release
- [ ] EXPERT: Philosophy, Governance, Evolution

### Clarity

#### Agent-Actionable
- [ ] Every statement is concrete (not vague)
- [ ] Examples provided where appropriate
- [ ] No ambiguous language ("maybe", "sometimes", "usually")
- [ ] Clear ownership/responsibility where relevant

#### Consistent Voice
- [ ] BASIC: Factual, concise
- [ ] ADVANCED: Prescriptive, detailed
- [ ] EXPERT: Analytical, strategic

#### Proper Formatting
- [ ] Headers use proper markdown (#, ##, ###)
- [ ] Lists use consistent bullets or numbers
- [ ] Code blocks use proper fencing with language tags
- [ ] Links are properly formatted `[text](url)`

### Format Compliance

#### File Naming
- [ ] Files named: `[category]-basic.md`, `[category]-advanced.md`, `[category]-expert.md`
- [ ] Categories: business, technical, process
- [ ] Files in correct directory: `ai/context/`

#### YAML Frontmatter (if present)
- [ ] Valid YAML syntax
- [ ] Required fields present (depends on your framework)
- [ ] No duplicate keys

#### Markdown Standards
- [ ] No HTML (use native markdown)
- [ ] Consistent heading hierarchy (no skipped levels)
- [ ] Proper list formatting (blank line before/after)
- [ ] Code blocks properly fenced

---

## Validation Workflow

### Step 1: Individual File Validation
For each file (9 total: 3 categories × 3 levels):

1. Run per-level checklist (Basic/Advanced/Expert)
2. Check category-specific requirements
3. Verify token budget
4. Confirm no template markers
5. Validate completeness

### Step 2: Cross-Level Validation
For each category (3 total: business, technical, process):

1. Check for duplication across levels
2. Validate progression (expansion, not repetition)
3. Verify token budget distribution

### Step 3: Quality Validation
Across all files:

1. Completeness check (no placeholders)
2. Clarity check (agent-actionable)
3. Format compliance check

### Step 4: Integration Test
Load all context files and verify:

- [ ] BASIC context alone is sufficient for simple tasks
- [ ] BASIC + ADVANCED provides sufficient context for complex tasks
- [ ] BASIC + ADVANCED + EXPERT provides sufficient context for strategic decisions
- [ ] No critical information is duplicated across levels
- [ ] Each level adds meaningful value

---

## Common Issues and Fixes

### Issue: Token Budget Exceeded

**Symptom:** File is significantly over token limit.

**Fix:**
1. Identify content that belongs in higher level
2. Remove explanatory text from BASIC (just facts)
3. Move strategic rationale from ADVANCED to EXPERT
4. Consolidate redundant statements

### Issue: Content Duplication

**Symptom:** Same information appears in multiple levels.

**Fix:**
1. Keep foundational facts in BASIC only
2. In ADVANCED/EXPERT, reference BASIC instead of repeating
3. Use progressive disclosure: BASIC = what, ADVANCED = how, EXPERT = why

### Issue: Wrong Level

**Symptom:** Strategic content in BASIC, or basic facts in EXPERT.

**Fix:**
1. Review LEVEL-DECISION-TREE.md
2. Move content to appropriate level
3. Validate using decision tables

### Issue: Template Markers Remain

**Symptom:** `<!-- TEMPLATE: -->` markers still present.

**Fix:**
1. Replace each marker with actual content
2. Use examples from EXAMPLES.md as reference
3. Remove marker after filling in content

### Issue: Not Agent-Actionable

**Symptom:** Vague statements, ambiguous language, no clear guidance.

**Fix:**
1. Make statements concrete and specific
2. Add examples where helpful
3. Remove hedging language ("maybe", "sometimes")
4. Provide clear decision criteria
