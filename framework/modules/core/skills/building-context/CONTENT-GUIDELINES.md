# Content Guidelines by Category and Level

## Business Context

### Basic Level (~500 tokens)

**Purpose:** Provide foundational business understanding needed for any task.

**Must include:**
- Product name and core purpose (1-2 sentences)
- Primary user segments (who uses this?)
- Business model (how do we make money?)
- Core value proposition (what problem do we solve?)
- Product type/category (e.g., SaaS, marketplace, tool)

**Must NOT include:**
- Detailed market analysis
- Strategic rationale or trade-offs
- Competitive positioning details
- Growth strategy or roadmap themes
- Detailed metrics or KPIs

**Completeness test:** Can a developer understand WHAT we build and WHO it's for?

**Example structure:**
```markdown
**Product:** [Name] - [One-line description]
**Users:** [Primary segments with brief context]
**Business Model:** [Revenue model]
**Core Value:** [Problem we solve]
```

### Advanced Level (~1000 tokens)

**Purpose:** Provide tactical business context for feature decisions and execution.

**Must include:**
- Key metrics and KPIs (what we measure)
- User personas with specific needs
- Competitive landscape (key competitors, our position)
- Product differentiation (what makes us unique)
- Current priorities or focus areas
- Pricing structure details

**Must NOT include:**
- Duplication of basic facts (just reference them)
- Strategic rationale (the WHY behind decisions)
- Long-term vision or strategy
- Decision-making frameworks
- Business constraints or compliance details

**Completeness test:** Can a developer prioritize features and understand success metrics?

**Example structure:**
```markdown
**Key Metrics:** [Measurable success indicators]
**User Personas:** [Detailed user segments with needs]
**Competitive Position:** [Market placement, differentiators]
**Current Priorities:** [Active focus areas]
**Pricing:** [Tier structure, pricing logic]
```

### Expert Level (~1500 tokens)

**Purpose:** Provide strategic business context for architectural and product decisions.

**Must include:**
- Strategic rationale (WHY we chose this direction)
- Business constraints and compliance requirements
- Decision-making frameworks
- Long-term vision and strategy
- Trade-offs we've accepted
- Growth strategy and market expansion plans
- Risk factors and mitigation

**Must NOT include:**
- Duplication of basic or advanced content
- Operational details (those belong in advanced)
- Day-to-day tactical information

**Completeness test:** Can a senior architect make strategic technical decisions aligned with business direction?

**Example structure:**
```markdown
**Strategic Direction:**
[WHY this strategy, trade-offs accepted]

**Decision Framework:**
[How we evaluate major decisions]

**Business Constraints:**
[Legal, compliance, market constraints]

**Long-term Vision:**
[3-5 year direction]

**Risk Management:**
[Known risks, mitigation strategies]
```

---

## Technical Context

### Basic Level (~500 tokens)

**Purpose:** Provide foundational technical setup needed for any development task.

**Must include:**
- Tech stack (languages, frameworks, databases)
- High-level architecture (monolith/microservices/etc)
- Repository structure (key directories)
- Development setup (how to run locally)
- Core dependencies

**Must NOT include:**
- Design patterns or conventions
- Detailed architecture diagrams
- Build/deployment processes
- ADRs or architectural rationale
- Performance characteristics

**Completeness test:** Can a new developer clone the repo and start coding?

**Example structure:**
```markdown
**Tech Stack:**
- Frontend: [Framework/language]
- Backend: [Framework/language]
- Database: [Database system]
- Infrastructure: [Cloud/hosting]

**Architecture:** [High-level type]

**Repository:**
```
/key-directory  # Purpose
```

**Setup:**
```bash
npm install
npm run dev
```
```

### Advanced Level (~1000 tokens)

**Purpose:** Provide tactical technical guidance for complex implementation tasks.

**Must include:**
- Design patterns and conventions
- State management approach
- Error handling patterns
- Testing strategy
- Build and deployment process
- Code organization principles
- API design patterns
- Database patterns (migrations, queries)

**Must NOT include:**
- Duplication of tech stack (already in basic)
- Architectural rationale (belongs in expert)
- Strategic technology decisions
- Long-term migration plans

**Completeness test:** Can a developer implement a complex feature following established patterns?

**Example structure:**
```markdown
**Design Patterns:**
[Architectural patterns we use]

**State Management:**
[How we handle state]

**Error Handling:**
[Error handling approach]

**Testing:**
[Testing strategy, coverage requirements]

**Build/Deploy:**
[Build process, deployment workflow]

**Code Organization:**
[File structure conventions]
```

### Expert Level (~1500 tokens)

**Purpose:** Provide strategic technical context for architectural decisions.

**Must include:**
- Architecture Decision Records (ADRs)
- Technology selection rationale
- Performance characteristics and constraints
- Scalability strategy
- Security architecture
- Migration plans and technical debt
- Technology evolution strategy

**Must NOT include:**
- Duplication of patterns (already in advanced)
- Day-to-day implementation details
- Basic setup information

**Completeness test:** Can a senior architect make informed decisions about system evolution?

**Example structure:**
```markdown
**ADR: [Decision Title]**
**Context:** [Why this decision was needed]
**Decision:** [What we chose]
**Rationale:** [Why we chose it]
**Trade-offs:** [What we sacrificed]
**Revisit Conditions:** [When to reconsider]

**Technology Strategy:**
[Long-term technical direction]

**Scalability:**
[How we plan to scale]

**Technical Constraints:**
[Limitations we must work within]

**Migration Plans:**
[Path from current to future state]
```

---

## Process Context

### Basic Level (~500 tokens)

**Purpose:** Provide foundational workflow understanding for daily development tasks.

**Must include:**
- Basic development workflow (ticket → code → review → deploy)
- Core tools (Jira, Git, Slack, etc.)
- Team structure (roles, who to ask)
- Communication channels
- Where to find information

**Must NOT include:**
- Detailed process steps
- Code review standards
- Sprint planning details
- Process rationale
- Quality gates

**Completeness test:** Can a new developer complete their first task?

**Example structure:**
```markdown
**Workflow:**
1. [Simple step-by-step workflow]

**Tools:**
- [Tool]: [Purpose]

**Team:**
- [Role]: [Name/contact]

**Communication:**
- [Channel]: [Purpose]
```

### Advanced Level (~1000 tokens)

**Purpose:** Provide tactical process guidance for complex collaborative work.

**Must include:**
- Detailed code review process
- Sprint planning and estimation
- Testing requirements
- Documentation standards
- Release process
- Incident response workflow
- Approval requirements
- Process SLAs (response times, etc.)

**Must NOT include:**
- Duplication of basic workflow
- Process rationale (WHY we do it this way)
- Governance and decision-making
- Process evolution approach

**Completeness test:** Can a developer navigate complex multi-person workflows?

**Example structure:**
```markdown
**Code Review:**
[Detailed requirements, SLAs, standards]

**Sprint Planning:**
[Planning process, estimation, capacity]

**Testing Requirements:**
[Coverage, types of tests, when to test]

**Release Process:**
[Detailed release workflow, approvals]

**Documentation Standards:**
[What to document, where, format]

**Incident Response:**
[How to handle production issues]
```

### Expert Level (~1500 tokens)

**Purpose:** Provide strategic process context for governance and evolution.

**Must include:**
- Process philosophy and rationale
- Quality gates and governance
- Decision-making frameworks
- Process evolution approach
- Standards enforcement
- Process improvement methodology
- Risk management in processes

**Must NOT include:**
- Duplication of workflow steps
- Day-to-day operational details
- Basic tool usage

**Completeness test:** Can a team lead make informed decisions about process changes?

**Example structure:**
```markdown
**Process Philosophy:**
[WHY we structure processes this way]

**Quality Governance:**
[How we enforce standards, who decides exceptions]

**Decision Framework:**
[How we make process decisions]

**Process Evolution:**
[How we change processes, approval required]

**Standards Rationale:**
[WHY we have specific standards]

**Risk Management:**
[Process-related risks, mitigation]
```

---

## Cross-Category Patterns

### Consistency Across Categories

All three categories should maintain alignment:

**Example: Feature Development**
- **Business (Basic):** Users need task prioritization
- **Technical (Advanced):** AI prioritization using ML model
- **Process (Advanced):** Feature requires data science review

### When Categories Overlap

**Rule:** Put information in the category where it's PRIMARY.

**Example: API Rate Limits**
- Business context? If it's a pricing differentiator → Business (Advanced)
- Technical context? If it's an implementation detail → Technical (Advanced)
- Process context? If it's a deployment requirement → Process (Advanced)

**Decision:** Choose based on WHO needs this information MOST:
- Product/business decisions → Business
- Implementation decisions → Technical
- Workflow decisions → Process

### Progressive Disclosure Pattern

Each level should EXPAND, not DUPLICATE:

```
BASIC: What is it?
ADVANCED: How do we use it?
EXPERT: Why did we choose it?
```

**Example: Database Choice**
```markdown
# BASIC
**Database:** PostgreSQL

# ADVANCED
**Database Patterns:**
- Use Prisma ORM
- Soft deletes with deletedAt
- Migrations in /prisma/migrations

# EXPERT
**ADR: PostgreSQL vs MongoDB**
**Decision:** PostgreSQL
**Rationale:**
- Complex relational data (users, projects, tasks)
- ACID compliance required for billing
- Team expertise in SQL
**Trade-off:** More complex schema changes vs MongoDB flexibility
```

### Token Budget Distribution

Each category should target approximately equal tokens per level:

| Category | Basic | Advanced | Expert | Total |
|----------|-------|----------|--------|-------|
| Business | ~500 | ~1000 | ~1500 | ~3000 |
| Technical | ~500 | ~1000 | ~1500 | ~3000 |
| Process | ~500 | ~1000 | ~1500 | ~3000 |

**Note:** Actual token usage will vary by project complexity. These are guidelines, not hard limits.

### Completeness Across Levels

A complete context set should answer:

**BASIC Level (All categories):**
Can a new team member understand the essentials?

**ADVANCED Level (All categories):**
Can an experienced developer execute complex tasks?

**EXPERT Level (All categories):**
Can a senior leader make strategic decisions?

### Writing Style Consistency

**BASIC:**
- Concise, factual
- Bullet points and lists
- No explanations (just facts)

**ADVANCED:**
- Detailed, prescriptive
- Examples and code snippets
- "How to" guidance

**EXPERT:**
- Analytical, strategic
- Rationale and trade-offs
- "Why" and "when to revisit"

### Template Markers

Use consistent template markers for incomplete sections:

```markdown
<!-- TEMPLATE: Describe your product name and core purpose -->
**Product:** [Product name] - [One-line description]

<!-- TEMPLATE: List your primary user segments -->
**Users:** [User segment 1], [User segment 2]
```

**Guidelines for template markers:**
- Start with `<!-- TEMPLATE: `
- Provide clear instruction
- Include example format inline
- Remove marker when filled
