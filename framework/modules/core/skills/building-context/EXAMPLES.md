# Context Authoring Examples

## Example 1: E-commerce Business Context

### Scenario
An e-commerce platform for handmade goods, similar to Etsy but focused on sustainable products.

---

### BEFORE (WRONG): Everything in Basic

```markdown
# business-basic.md (~2000 tokens - WAY TOO MUCH!)

**Product:** EcoMarket - Online marketplace for sustainable handmade goods

**Users:**
- Artisans who create sustainable products (jewelry, clothing, home goods)
- Conscious consumers aged 25-45, primarily female, household income $60k+
- Gift shoppers looking for unique, eco-friendly items

**Business Model:**
- Commission-based: 8% on each sale
- Premium seller subscriptions: $29/month for enhanced visibility
- Advertising revenue from sustainable brands

**Key Metrics:**
- GMV (Gross Merchandise Value): $2M monthly
- Active Sellers: 5,000
- Monthly Active Buyers: 50,000
- Average Order Value: $45
- Seller Retention: 85% year-over-year

**Competitive Landscape:**
- Etsy: Broader focus, 10x larger, less curated
- Faire: B2B focused, wholesale only
- Our differentiation: Sustainability certification, carbon-neutral shipping

**Strategic Direction:**
We focus on sustainability-verified products because mainstream marketplaces
have greenwashing problems. We accept lower GMV growth (30% vs Etsy's 50%)
in exchange for brand trust and premium positioning.

**Decision Framework:**
New features must:
- Support sustainability mission (reject if not)
- Improve seller success metrics
- Not compromise trust (verified sellers only)
```

**Issues:**
1. Token budget massively exceeded (2000 vs 500 target)
2. Metrics belong in ADVANCED, not BASIC
3. Competitive analysis belongs in ADVANCED
4. Strategic rationale belongs in EXPERT
5. Decision framework belongs in EXPERT
6. No room for ADVANCED or EXPERT (everything dumped in BASIC)

---

### AFTER (CORRECT): Properly Split Across Levels

#### business-basic.md (~500 tokens)

```markdown
# Business Context - Basic

**Product:** EcoMarket - Online marketplace for sustainable handmade goods

**Users:**
- Artisan sellers creating eco-friendly handmade products
- Conscious consumers seeking sustainable gift and home items

**Business Model:**
- 8% commission on sales
- $29/month premium seller subscriptions
- Advertising from sustainable brands

**Core Value:**
Connect verified sustainable artisans with conscious consumers who want
to shop their values.

**Product Category:** B2C/C2C marketplace (two-sided platform)
```

**Why this is correct:**
- ~500 tokens
- Foundational facts only
- Answers "What is EcoMarket?" and "Who uses it?"
- No metrics, competition, or strategy

---

#### business-advanced.md (~1000 tokens)

```markdown
# Business Context - Advanced

## Key Metrics

**Marketplace Health:**
- GMV (Gross Merchandise Value): $2M monthly
- Active Sellers: 5,000
- Monthly Active Buyers: 50,000
- Average Order Value: $45

**Success Indicators:**
- Seller Retention: Target 85% year-over-year
- Buyer Repeat Rate: Target 40% within 90 days
- Search-to-Purchase: Target 8% conversion

## User Personas

**Persona 1: Eco-Conscious Consumer (70% of buyers)**
- Demographics: Female, 28-42, household income $60k+
- Motivation: Values-driven shopping, gift giving
- Pain points: Difficulty verifying sustainability claims elsewhere
- Success metric: Repeat purchase within 90 days

**Persona 2: Sustainable Artisan (primary sellers)**
- Demographics: Small business owners, 1-3 employees
- Motivation: Reach values-aligned customers, fair pricing
- Pain points: Marketing costs, inventory management
- Success metric: 10+ sales per month

## Competitive Position

**Direct Competitors:**
- Etsy: 10x larger, broader focus, less curated
- Faire: B2B/wholesale only, not consumer-facing

**Our Differentiation:**
- Sustainability certification (verified sellers only)
- Carbon-neutral shipping included
- Premium brand positioning vs mass market

**Market Segment:**
Conscious consumers willing to pay 20-30% premium for verified sustainability.

## Current Priorities

**Q4 2025 Focus:**
1. Seller acquisition: Grow to 7,500 active sellers
2. Trust features: Enhanced sustainability verification
3. Repeat buyers: Improve retention to 45%

**Pricing Structure:**
- Free tier: 8% commission, basic shop
- Premium ($29/mo): 6% commission, featured listings, analytics
- Enterprise ($199/mo): 5% commission, dedicated support, API access
```

**Why this is correct:**
- ~1000 tokens
- Tactical information for execution
- Detailed personas and metrics
- Competitive context for decisions
- No duplication of basic facts
- No strategic WHY (that's expert level)

---

#### business-expert.md (~1500 tokens)

```markdown
# Business Context - Expert

## Strategic Direction

**Core Strategy:** Premium positioning in sustainable marketplace segment

**Rationale:**
Mass-market marketplaces (Etsy, Amazon Handmade) struggle with greenwashing.
Consumers increasingly distrust sustainability claims. We sacrifice growth
velocity for brand trust.

**Evidence:**
- Consumer survey: 73% don't trust "eco-friendly" labels on Etsy
- Our NPS: 65 vs Etsy's 31 (among sustainability-focused shoppers)
- Willing to accept 30% slower GMV growth vs competitors

**Trade-offs Accepted:**
- Smaller addressable market (only verified sustainable sellers)
- Higher CAC ($85 vs $42 for mass market)
- Slower seller onboarding (verification takes 2-3 weeks)

**Revisit Conditions:**
- If verification becomes industry standard (no differentiation)
- If CAC exceeds $120 (unit economics break)
- If mass-market competitors achieve >50 NPS

## Decision Framework

**Feature Evaluation:**
All features must pass 3 tests:

1. **Sustainability Alignment**
   - Does it support our sustainability mission?
   - Reject if: Compromises verification standards
   - Example: We rejected dropshipping (can't verify supply chain)

2. **Seller Success**
   - Does it improve seller sales or reduce friction?
   - Minimum: 10% improvement in conversion or 20% time savings
   - Example: Automated carbon-offset calculation (15% conversion lift)

3. **Trust Maintenance**
   - Does it maintain or enhance trust?
   - Reject if: Creates perception of greenwashing
   - Example: We rejected seller self-certification (trust risk)

**Pricing Decisions:**
- Never exceed 10% commission (market expectation ceiling)
- Premium tier must provide 3x value of cost
- No advertising to sellers (conflicts with trust mission)

## Business Constraints

**Regulatory:**
- FTC Green Guides compliance required (all sustainability claims)
- Consumer protection laws in 50 states (U.S. only currently)
- Payment processing: PCI DSS Level 1 compliance

**Operational:**
- Verification team capacity: 200 sellers/month maximum
- Carbon offset program: Locked to single vendor (3-year contract)
- Payment processing: Stripe exclusive (migration cost prohibitive)

**Financial:**
- Burn rate: $300k/month, runway 18 months
- Unit economics: Positive at $500 GMV per seller per month
- Series A constraint: Must reach $5M ARR for favorable terms

## Long-term Vision (3-5 years)

**Phase 1 (Current):** U.S. marketplace, sustainability focused
**Phase 2 (2026):** EU expansion, localized sustainability standards
**Phase 3 (2027):** B2B wholesale, supply chain transparency tools
**Phase 4 (2028+):** Platform licensing to other verticals (food, fashion)

**North Star Metric:** Verified sustainable GMV
- Current: $2M/month
- 2026 Target: $10M/month
- 2028 Target: $50M/month

## Risk Management

**Key Risks:**

1. **Verification Scalability**
   - Risk: Can't verify sellers fast enough
   - Mitigation: Automated verification tools (in development)
   - Trigger: Waitlist exceeds 500 sellers

2. **Greenwashing PR Crisis**
   - Risk: Verified seller found non-compliant
   - Mitigation: Quarterly audits, whistleblower program
   - Response plan: Immediate delisting, public transparency

3. **Market Consolidation**
   - Risk: Etsy acquires/builds competing verified program
   - Mitigation: Brand differentiation, community building
   - Hedge: Strategic partnerships with NGOs

4. **Economic Downturn**
   - Risk: Premium products are discretionary spend
   - Mitigation: Expand gift market (less price-sensitive)
   - Trigger: 20% drop in AOV over 2 months
```

**Why this is correct:**
- ~1500 tokens
- Strategic rationale and WHY
- Decision-making frameworks
- Business constraints and risks
- Long-term vision
- No duplication of metrics or competitive details
- Provides context for architectural decisions

---

## Example 2: Technical Context - Wrong Level

### Scenario
Backend API built with Node.js and PostgreSQL.

---

### WRONG: ADR in Basic Level

```markdown
# technical-basic.md

**Tech Stack:**
- Backend: Node.js 18, Express, TypeScript
- Database: PostgreSQL 14
- Infrastructure: AWS ECS

**Architecture Decision: Why PostgreSQL over MongoDB**

We chose PostgreSQL because we have complex relational data with many
foreign keys between users, products, orders, and reviews. MongoDB's
document model would require complex application-level joins and denormalization.

Additionally, our team has 5 years of PostgreSQL experience vs 1 year with
MongoDB, reducing training time and operational risk.

Trade-offs: We sacrifice MongoDB's flexible schema for PostgreSQL's rigid
structure, but our domain model is stable (e-commerce) so this is acceptable.
```

**Issues:**
1. ADR belongs in EXPERT level, not BASIC
2. Rationale and trade-offs are strategic, not foundational
3. Basic should be concise facts, not explanations
4. This prevents proper use of progressive disclosure

---

### CORRECT: ADR in Expert Level

#### technical-basic.md (~500 tokens)

```markdown
# Technical Context - Basic

**Tech Stack:**
- Backend: Node.js 18, Express, TypeScript
- Database: PostgreSQL 14, Prisma ORM
- Infrastructure: AWS (ECS, RDS, S3)
- Cache: Redis 7

**Architecture:** Monolithic API with separate frontend

**Repository Structure:**
```
/src
  /api         # Express routes
  /services    # Business logic
  /models      # Database models (Prisma)
  /utils       # Shared utilities
/prisma        # Database schema & migrations
/tests         # Unit and integration tests
```

**Local Development:**
```bash
npm install
docker-compose up  # Starts PostgreSQL + Redis
npm run dev        # Starts on localhost:3000
```

**Environment Variables:**
```
DATABASE_URL=postgresql://localhost:5432/ecomarket
REDIS_URL=redis://localhost:6379
JWT_SECRET=<from 1Password>
```
```

**Why this is correct:**
- ~500 tokens
- Only foundational information
- No rationale or explanations
- A developer can start coding immediately

---

#### technical-expert.md (~1500 tokens)

```markdown
# Technical Context - Expert

## Architecture Decision Records

### ADR-001: PostgreSQL vs MongoDB

**Date:** 2024-03-15
**Status:** Accepted
**Deciders:** CTO, Backend Lead, Infrastructure Lead

**Context:**
We need to choose a database for our marketplace platform. Key requirements:
- Complex relational data (users, sellers, products, orders, reviews)
- ACID compliance for financial transactions
- Team expertise and operational experience
- Query flexibility for marketplace analytics

**Decision:** PostgreSQL 14 with Prisma ORM

**Rationale:**

1. **Data Model Complexity**
   - 15+ entity types with many foreign key relationships
   - MongoDB would require complex application-level joins
   - Example: Order → Buyer, Seller, Product, Payment, Shipment (5 relations)

2. **Transaction Requirements**
   - Payment processing requires ACID guarantees
   - Money movement between buyer, seller, platform must be atomic
   - MongoDB transactions are limited to single replica set

3. **Team Expertise**
   - 5 years team experience with PostgreSQL
   - 1 year experience with MongoDB
   - 80% of team familiar with SQL, 30% with MongoDB

4. **Query Patterns**
   - Analytics queries require complex joins and aggregations
   - PostgreSQL's query planner handles this efficiently
   - MongoDB would require expensive aggregation pipelines

**Trade-offs Accepted:**

| Aspect | PostgreSQL | MongoDB | Decision Impact |
|--------|-----------|---------|-----------------|
| Schema flexibility | Rigid (migrations required) | Flexible | We accept migration overhead |
| Horizontal scaling | Vertical scaling primary | Native sharding | We accept scaling limits |
| Development speed | Slower (schema changes) | Faster (no migrations) | We accept slower iteration |

**Benefits Gained:**
- ACID guarantees for financial integrity
- Team productivity (familiar tooling)
- Rich query capabilities (analytics)

**Risks and Mitigation:**
- Risk: Scaling limitations at high volume
- Threshold: 100k orders/day (current: 2k/day)
- Mitigation: Read replicas, partitioning, if needed
- Revisit trigger: If we reach 50k orders/day

**Alternatives Considered:**
- MongoDB: Rejected due to transaction limitations
- MySQL: Rejected due to JSON query limitations
- DynamoDB: Rejected due to team expertise gap

**Revisit Conditions:**
1. If order volume exceeds 50k/day (scaling limits)
2. If product catalog exceeds 10M SKUs (query performance)
3. If we add real-time features requiring document model
4. If team expertise shifts (majority MongoDB experience)

---

### ADR-002: Monolith vs Microservices

**Date:** 2024-04-10
**Status:** Accepted
**Deciders:** CTO, Engineering Team

**Context:**
Marketplace platform growing from 5k to 50k+ sellers. Need to decide on
service architecture.

**Decision:** Maintain monolithic architecture

**Rationale:**

1. **Team Size**
   - Current: 6 backend developers
   - Microservices require 2-3 devs per service minimum
   - Insufficient team for meaningful service boundaries

2. **Operational Complexity**
   - Microservices require: Service mesh, distributed tracing, orchestration
   - Current team has no Kubernetes expertise
   - Training + tooling cost: $100k+, 6 months

3. **Performance**
   - Current monolith: 5k req/min, 50ms p95 latency
   - Headroom: Can scale to 50k req/min with vertical scaling
   - No performance pressure to distribute

**Trade-offs Accepted:**
- Longer deployment times (5min vs 30sec for microservices)
- Tighter coupling between features
- Single technology stack constraint (Node.js only)
- Database schema changes impact entire codebase

**Benefits:**
- Simpler development workflow
- Easier debugging (no distributed tracing needed)
- Atomic transactions across all features
- Lower operational overhead

**Revisit Conditions:**
1. Team exceeds 20 backend developers
2. Request volume exceeds 50k/min
3. Regulatory requirements mandate service isolation
4. Need to scale teams independently on features

---

## Technology Strategy

**Current State (2025):**
- Node.js monolith on AWS ECS
- PostgreSQL on RDS (single primary, 2 read replicas)
- Redis for session management and caching
- S3 for image storage

**Near-term Evolution (2026):**
- Extract payment processing to separate service (PCI compliance isolation)
- Add Elasticsearch for product search (PostgreSQL full-text insufficient)
- Implement CDN for image delivery (CloudFront)

**Long-term Vision (2027-2028):**
- Service extraction if team exceeds 20 developers
- Event-driven architecture for order processing
- Multi-region deployment for EU expansion

**Technology Principles:**
1. Boring technology unless strong justification
2. Choose managed services over self-hosted
3. Optimize for team velocity over theoretical performance
4. No technology decisions without 3-month trial

## Scalability Strategy

**Current Bottlenecks:**
1. Database writes: 2k writes/sec capacity (current: 200/sec)
2. Image processing: 100 images/min (current: 20/min)
3. Search queries: 5k/sec capacity (current: 500/sec)

**Scaling Roadmap:**

**Phase 1 (Current → 10x):**
- Add read replicas (query distribution)
- Implement aggressive caching (Redis)
- Optimize N+1 queries (Dataloader pattern)

**Phase 2 (10x → 50x):**
- Database partitioning by seller_id
- Extract image processing to async queue
- Add Elasticsearch for search

**Phase 3 (50x+):**
- Service extraction (payments, search, images)
- Multi-region database (AWS Aurora Global)
- Event-driven architecture

## Technical Constraints

**Infrastructure:**
- AWS only (no multi-cloud) - existing contract, team expertise
- ECS for compute (not Kubernetes) - team skill gap
- RDS for database (not self-managed) - operational overhead

**Security:**
- PCI DSS Level 1 compliance required (payment processing)
- SOC 2 Type II audit required (customer requirement)
- GDPR compliance for EU users (future)

**Performance:**
- API response time: p95 < 200ms (customer SLA)
- Image upload: < 5sec for 10MB file
- Search results: < 100ms (UX requirement)

**Legacy:**
- Stripe exclusive for payments (migration cost $50k+)
- Prisma ORM locked to v4 (v5 breaking changes significant)
- Node.js 18 minimum (some dependencies incompatible with 20)
```

**Why this is correct:**
- ADR in EXPERT level where it belongs
- Strategic rationale and trade-offs
- Technology evolution roadmap
- Constraints and decisions context
- No duplication of basic tech stack facts
- Provides context for future architectural decisions

---

## Example 3: Content Duplication Anti-Pattern

### Scenario
Code review process documented across multiple levels.

---

### WRONG: Workflow Duplicated Across Levels

#### process-basic.md
```markdown
**Code Review Process:**
1. Create PR from feature branch
2. Request review from team member
3. Address feedback
4. Get approval
5. Merge to main
6. Deploy to staging
```

#### process-advanced.md
```markdown
**Detailed Code Review Process:**
1. Create PR from feature branch
2. Request review from team member
3. Reviewer checks:
   - Code quality
   - Test coverage
   - Documentation
4. Author addresses feedback
5. Get approval from reviewer
6. Merge to main
7. Automated deployment to staging
8. Verify in staging environment
```

**Issues:**
1. Steps 1-6 from BASIC are duplicated in ADVANCED
2. ADVANCED should EXPAND basic workflow, not repeat it
3. Wastes tokens on redundant information
4. User loading ADVANCED gets duplicate context

---

### CORRECT: Workflow Properly Split

#### process-basic.md (~500 tokens)

```markdown
# Process Context - Basic

**Development Workflow:**
1. Pick ticket from Jira "Ready" column
2. Create feature branch from `main`
3. Implement → Test → Create PR
4. Code review → Merge → Auto-deploy to staging

**Tools:**
- Jira: Task tracking
- GitHub: Code repository, PR reviews
- Slack: #engineering for questions
- Vercel: Staging/production hosting

**Team:**
- Frontend: Sarah (lead), Mike, Lisa
- Backend: James (lead), Chen, Alex
- DevOps: Taylor
- QA: Morgan

**Communication:**
- Daily standup: 10am PST in Zoom
- PR reviews: Tag reviewer in GitHub
- Urgent: #engineering-urgent in Slack
- Questions: #engineering in Slack
```

**Why this is correct:**
- Simple workflow overview (high-level steps)
- Just the basics: tools, team, communication
- No detailed requirements or standards
- ~500 tokens

---

#### process-advanced.md (~1000 tokens)

```markdown
# Process Context - Advanced

## Code Review Process

Assumes you've created a PR per basic workflow.

**PR Requirements:**

Must include:
- [ ] Title format: `feat|fix|refactor|docs: Description`
- [ ] Description of changes and why
- [ ] Test coverage for new code (see Testing Requirements)
- [ ] Updated documentation if API changed
- [ ] Screenshots if UI changed

**Reviewer Checklist:**

Reviewers must verify:
1. **Code Quality**
   - Follows style guide (ESLint passing)
   - No obvious bugs or edge cases
   - Appropriate error handling

2. **Test Coverage**
   - New code has unit tests
   - Integration tests if API changed
   - Coverage doesn't decrease

3. **Documentation**
   - JSDoc for public functions
   - README updated if setup changed
   - API docs updated if endpoints changed

4. **Performance**
   - No obvious N+1 queries
   - Image optimization if media added
   - Bundle size check for frontend

**Review SLA:**
- First review: Within 4 business hours
- Follow-up review: Within 2 business hours
- If blocked: Tag @eng-leads in Slack

**Approval Requirements:**
- Standard PR: 1 approval
- Infrastructure change: 2 approvals
- Payment/security code: Security team approval

**Merge Process:**
1. All CI checks pass (tests, lint, build)
2. All review comments resolved
3. Branch up-to-date with main
4. Use "Squash and merge"
5. Delete branch after merge

## Sprint Planning

**Schedule:** Every other Monday, 10am-12pm PST

**Preparation (Friday before):**
1. PMs add stories to "Backlog" with acceptance criteria
2. Eng leads add technical tasks
3. Team reviews backlog async (add questions as comments)

**Planning Meeting:**
1. Review sprint goal (15min)
2. Estimate stories (45min)
   - Use Fibonacci: 1, 2, 3, 5, 8, 13
   - Discussion if estimates differ by 2+ points
   - Break down 13+ point stories
3. Commit to sprint scope (30min)
   - Team capacity: 40 points per sprint (2 weeks)
   - Leave 20% buffer for bugs/urgent
4. Assign stories (15min)
5. Confirm sprint goal (15min)

**Story Requirements:**
- User story format: "As a [user], I want [goal], so that [benefit]"
- Acceptance criteria (at least 3)
- Design mockup if UI work
- API contract if backend work

## Testing Requirements

**Unit Tests:**
- Required for: All new business logic
- Coverage: 80% minimum
- Tool: Jest
- Location: `__tests__` adjacent to source

**Integration Tests:**
- Required for: New API endpoints
- Coverage: All endpoints
- Tool: Supertest
- Location: `/tests/integration`

**E2E Tests:**
- Required for: Critical user paths
- Coverage: Checkout, signup, search
- Tool: Playwright
- Location: `/tests/e2e`

**Manual QA:**
- Required for: UI changes
- Who: Assign to @Morgan in PR
- Process: Test in staging, approve PR comment

## Release Process

**Schedule:** Daily at 2pm PST (Monday-Thursday)

**Pre-release:**
1. All PRs merged to `main` by 1pm
2. Staging validation (30min window)
3. Release manager checks:
   - [ ] All tests passing
   - [ ] No critical bugs in staging
   - [ ] Rollback plan if risky change

**Release:**
1. Tag release: `git tag v1.x.x`
2. Push tag: Triggers production deploy (GitHub Actions)
3. Monitor for 30min:
   - Error rate < 0.1%
   - Response time < 200ms p95
   - No customer reports

**Rollback:**
If errors exceed 0.1%:
1. Revert last commit or deploy previous tag
2. Post in #engineering-urgent
3. Create incident retro ticket

**Hotfix Process:**
For production bugs requiring immediate fix:
1. Create branch from `main`
2. Fix → Test → PR (requires 1 approval)
3. Deploy immediately (skip daily schedule)
4. Post-mortem within 24 hours
```

**Why this is correct:**
- ~1000 tokens
- Expands basic workflow with detailed requirements
- No duplication of basic steps (references them)
- Provides actionable guidance for complex scenarios
- Still no rationale (that's expert level)

---

#### process-expert.md (~1500 tokens)

```markdown
# Process Context - Expert

## Process Philosophy

**Core Principle:** Optimize for merge velocity, not perfect code.

**Rationale:**
We're a startup with 18-month runway. Time-to-market beats code perfection.
We accept technical debt in exchange for learning fast from customers.

**Evidence:**
- Experiment: Strict review (5 days to merge) vs loose review (1 day to merge)
- Result: 4x faster feature delivery, no increase in bugs
- Conclusion: Code review should focus on correctness, not style

**Trade-offs Accepted:**
- Some code duplication (acceptable if it ships faster)
- Inconsistent patterns across codebase (refactor later)
- Minimal documentation (prefer self-documenting code)

**Non-negotiables:**
- Test coverage (quality gate)
- Security review for auth/payment
- No direct commits to main

## Quality Governance

**Automated Quality Gates:**

Cannot merge without:
- [ ] 80% test coverage (enforced by CI)
- [ ] 0 TypeScript errors (enforced by CI)
- [ ] 0 ESLint errors (enforced by CI)
- [ ] All tests passing (enforced by CI)
- [ ] Build succeeds (enforced by CI)

**Manual Quality Gates:**

Required approvals by code area:

| Code Area | Approval Required |
|-----------|-------------------|
| Standard feature | Any team member (1) |
| Infrastructure | DevOps + 1 other (2) |
| Payment processing | Security team + Backend lead (2) |
| Database schema | Backend lead + CTO (2) |
| Auth/security | Security team + CTO (2) |

**Override Process:**
- Who: CTO only
- When: Customer-critical hotfix
- Requires: Post-mortem within 24h, tech debt ticket

## Decision Framework

**Process Change Decisions:**

All process changes require:

1. **RFC Document**
   - Problem statement
   - Proposed solution
   - Alternatives considered
   - Impact analysis (time, cost, risk)

2. **Trial Period**
   - Duration: 2 weeks minimum
   - Metrics: Define success criteria upfront
   - Review: Team retro to evaluate

3. **Approval**
   - Voting: 66% team approval required
   - Vetoes: CTO can veto if business risk
   - Documentation: Update process docs before rollout

**Example: PR Template Change**
- Problem: PRs missing context, slowing reviews
- Solution: Mandatory PR template
- Metrics: Review time, PR iterations
- Result: 30% faster reviews, approved

## Process Evolution

**Continuous Improvement:**

We revisit processes quarterly (every 3 months).

**Retrospective Format:**
1. **What's working?** (keep doing)
2. **What's not?** (stop doing)
3. **What should we try?** (experiment)

**Historical Changes:**

| Quarter | Change | Rationale | Result |
|---------|--------|-----------|--------|
| Q1 2024 | Daily deploys | Reduce merge conflicts | 50% fewer conflicts |
| Q2 2024 | Async standup | Distributed team | 30min/day saved |
| Q3 2024 | Squash merge | Cleaner history | Easier rollbacks |
| Q4 2024 | PR templates | Faster reviews | 30% time savings |

**Failed Experiments:**

| Experiment | Why Failed | Lesson Learned |
|------------|-----------|----------------|
| Pair programming (all tasks) | 50% slower | Use only for complex features |
| Weekly deploys | Merge conflicts | Daily is better |
| No code review | 3x bug rate | Quality gate necessary |

## Standards Rationale

**Why These Standards?**

**80% Test Coverage:**
- Below 80%: Bug rate increases 3x
- Above 90%: Diminishing returns (time cost > benefit)
- Sweet spot: 80-85%

**Squash and Merge:**
- Cleaner git history (1 commit per feature)
- Easier rollbacks (revert single commit)
- Simpler cherry-picking
- Trade-off: Lose granular commit history

**4-Hour Review SLA:**
- Longer: Context switching kills productivity
- Shorter: Interrupts deep work
- Balance: 4 hours allows batch review

**Fibonacci Estimation:**
- Linear (1,2,3,4) is too precise (false confidence)
- Fibonacci (1,2,3,5,8) reflects uncertainty
- Forces conversation when estimates differ

## Risk Management

**Process-Related Risks:**

**1. Review Bottleneck**
- Risk: Only 1 senior dev can review security code
- Impact: Delays in payment features
- Mitigation: Train 2 more devs on security review
- Trigger: Review SLA miss 3x in 2 weeks

**2. Deploy Failure**
- Risk: Production deploy breaks site
- Impact: Revenue loss, customer trust
- Mitigation: Automated rollback, feature flags
- Response: Rollback within 5 minutes

**3. Process Overhead**
- Risk: Process slows team as we grow
- Impact: Reduced velocity
- Mitigation: Quarterly retro, kill low-value process
- Trigger: Sprint velocity drops 20%

**4. Quality Degradation**
- Risk: Fast shipping compromises quality
- Impact: Technical debt, customer bugs
- Mitigation: Enforce quality gates, dedicate 20% time to refactoring
- Trigger: Bug rate exceeds 0.1% of requests

## Compliance Requirements

**SOC 2 Compliance:**
- Code review required (audit trail)
- Deployment approvals required
- No direct production access (must deploy via CI)

**Evidence Collection:**
- PR approvals logged in GitHub
- Deploy logs in CloudWatch (7-year retention)
- Access logs for production systems

**Audit Preparation:**
- Quarterly review of process compliance
- Annual audit by external firm
- Document all process exceptions
```

**Why this is correct:**
- ~1500 tokens
- Strategic process philosophy and WHY
- Governance and decision frameworks
- Process evolution and learnings
- Risk management
- No duplication of workflow steps or requirements
- Provides context for process decisions

---

## Example 4: Complete Process Context - All Three Levels

### Scenario
SaaS company with agile development process, showing complete context set.

---

### process-basic.md (~500 tokens)

```markdown
# Process Context - Basic

**Development Workflow:**
1. Pick ticket from Jira "Sprint Backlog"
2. Create feature branch: `feature/PROJ-123-description`
3. Code → Test → Push
4. Create PR → Request review
5. Merge → Auto-deploy to staging
6. QA verification → Deploy to production

**Tools:**
- Jira: Sprint planning, task tracking
- GitHub: Code repository, pull requests
- Slack: Team communication
- Vercel: Hosting (staging + production)
- Sentry: Error tracking
- DataDog: Monitoring

**Team Structure:**

**Engineering (12 people):**
- Frontend Team (4): Emma (lead), Ryan, Priya, Jordan
- Backend Team (5): Marcus (lead), Sofia, Lin, Ahmed, Kai
- DevOps (2): Taylor (lead), Chris
- QA (1): Morgan

**Product (3):**
- PM: Alexis
- Designer: Sam
- Product Analyst: Jamie

**Communication Channels:**
- #engineering: General engineering discussion
- #engineering-urgent: P0 bugs, production issues
- #frontend / #backend: Team-specific channels
- #deployments: Deployment notifications
- #product: Product discussions

**Key Contacts:**
- Blocked on code review: Tag @eng-leads
- Production bug: Post in #engineering-urgent, tag @taylor
- Product question: Ask in #product or DM @alexis
- Design question: Ask @sam in #frontend

**Working Hours:**
- Core hours: 10am-4pm PST (team overlap)
- Async-friendly: Distributed team (PST, EST, CET)
- On-call rotation: DevOps team, 24/7 coverage

**Documentation:**
- Engineering docs: `/docs` in repository
- Product specs: Jira tickets
- Architecture decisions: `/docs/adr`
- Runbooks: Notion wiki
```

---

### process-advanced.md (~1000 tokens)

```markdown
# Process Context - Advanced

## Code Review Process

**PR Requirements:**

Every PR must have:
- [ ] Title: `[PROJ-123] feat: Description` (Jira ticket required)
- [ ] Description: What changed and why
- [ ] Test plan: How you tested this
- [ ] Screenshots (if UI change)
- [ ] Documentation updates (if API/setup changed)

**CI Checks (must pass):**
- [ ] Unit tests (Jest)
- [ ] Integration tests (Supertest)
- [ ] E2E tests (Playwright) - for UI changes
- [ ] Linting (ESLint, Prettier)
- [ ] Type checking (TypeScript)
- [ ] Build succeeds
- [ ] Test coverage ≥80%

**Review Assignments:**
- Frontend PR: 1 frontend team member
- Backend PR: 1 backend team member
- Full-stack PR: 1 from each team
- Infrastructure PR: DevOps + 1 eng lead

**Review SLA:**
- First review: 4 hours
- Follow-up: 2 hours
- After hours: Next business day

**Approval & Merge:**
1. Get required approvals
2. Resolve all comments
3. Ensure CI green
4. Squash and merge
5. Delete feature branch
6. Move Jira ticket to "In QA"

---

## Sprint Planning

**Sprint Duration:** 2 weeks (10 business days)

**Sprint Ceremonies:**

**Monday Week 1 (Sprint Start):**
- 10:00am: Sprint planning (2 hours)
  - Review sprint goal
  - Estimate and commit to stories
  - Capacity: 50 points (team of 12)

**Daily (async):**
- By 11am PST: Post standup in Slack
  - Yesterday: What shipped
  - Today: What working on
  - Blockers: Tag relevant people

**Wednesday Week 1:**
- 2pm: Design review (1 hour)
  - Review upcoming designs
  - Flag technical constraints

**Monday Week 2:**
- 10am: Sprint sync (30min)
  - Progress check
  - Re-prioritize if needed

**Friday Week 2 (Sprint End):**
- 2pm: Sprint retro (1 hour)
  - What went well
  - What didn't
  - Action items for next sprint
- 3pm: Demo to stakeholders (30min)

**Story Estimation:**
- Scale: 1, 2, 3, 5, 8, 13 points
- 1 point ≈ 0.5 days
- 13 points = too big, break down
- Estimation poker: Discuss if spread >2 points

**Story Requirements:**
- User story: "As [user], I want [goal], so that [benefit]"
- Acceptance criteria (min 3)
- Design mockup (if UI)
- API spec (if backend)
- Effort estimate
- Dependencies noted

---

## Testing Requirements

**Test Pyramid:**

```
    /\
   /E2E\      10% - Critical paths
  /------\
 /  API   \   30% - Endpoint testing
/----------\
/   Unit    \ 60% - Business logic
```

**Unit Tests (Jest):**
- Location: `__tests__/` next to source file
- Coverage: 80% minimum
- Focus: Business logic, utilities, helpers
- Example: `user.service.test.ts`

**Integration Tests (Supertest):**
- Location: `/tests/integration`
- Coverage: All API endpoints
- Focus: Request/response, auth, validation
- Example: `POST /api/users returns 201 with valid data`

**E2E Tests (Playwright):**
- Location: `/tests/e2e`
- Coverage: Critical user flows
  - User signup/login
  - Purchase flow
  - Profile editing
- Run: Pre-production deploy only (slow)

**Manual QA:**
- When: All UI changes
- Who: @morgan (QA)
- Where: Staging environment
- Evidence: Screenshots in Jira ticket

---

## Release Process

**Staging Deploys:**
- Trigger: Every merge to `main`
- Automated: GitHub Actions
- Time: ~3 minutes
- URL: staging.company.com

**Production Deploys:**
- Schedule: Tuesday/Thursday 2pm PST
- Process:
  1. QA approves all tickets in staging
  2. Release manager creates release PR
  3. Engineering lead reviews changelog
  4. Merge release PR → auto-deploy
  5. Monitor for 30min

**Monitoring During Deploy:**
- Error rate: Must stay <0.1%
- Response time: p95 <200ms
- Sentry: No new error types
- DataDog: Watch dashboards

**Rollback Process:**
1. Click "Rollback" in Vercel (1-click)
2. Post in #engineering-urgent
3. Create postmortem ticket
4. Fix forward in next deploy

**Hotfix Process:**
For P0 production bugs:
1. Create hotfix branch from `main`
2. Fix → Test → PR (fast-track review)
3. Deploy immediately (skip schedule)
4. Postmortem within 24 hours

---

## Incident Response

**Severity Levels:**

**P0 - Critical:**
- Site down or major feature broken
- Data loss or security breach
- Response: Immediate, all-hands

**P1 - High:**
- Feature degraded but site functional
- Response: Within 2 hours

**P2 - Medium:**
- Minor bug, workaround exists
- Response: Next sprint

**P3 - Low:**
- Cosmetic issue, no user impact
- Response: Backlog

**P0 Response Process:**
1. Post in #engineering-urgent
2. Tag @devops-oncall
3. Create Jira incident ticket
4. Start incident doc (Google Doc)
5. Assign incident commander
6. Fix or rollback
7. Postmortem within 24h

**Postmortem Format:**
- Timeline of events
- Root cause
- Impact (users, revenue)
- Fix applied
- Prevention plan
```

---

### process-expert.md (~1500 tokens)

```markdown
# Process Context - Expert

## Process Philosophy

**Core Belief:** Ship fast, learn fast, iterate.

**Rationale:**
As a Series A startup (2 years runway), our competitive advantage is speed.
Perfect code matters less than validated learning.

**Supporting Evidence:**
- Deployed 127 features in Q3 2024 vs competitors' ~40
- 23% were removed after learning users didn't use them
- This validated our "ship and learn" approach
- Quality metrics stable: 0.08% error rate (within SLA)

**Trade-offs We Accept:**
1. **Technical debt for speed**:
   - We ship MVPs with known limitations
   - Document debt in Jira, prioritize in future sprints
   - Metric: Tech debt <20% of sprint capacity

2. **Inconsistent patterns for autonomy**:
   - Teams can choose patterns (React Query vs Redux)
   - Prefer team velocity over consistency
   - Revisit: If onboarding time exceeds 2 weeks

3. **Minimal documentation for agility**:
   - Code should be self-documenting
   - Document only: API contracts, architecture decisions
   - Trade-off: Steeper learning curve for new hires

**Non-Negotiables:**
- Test coverage 80%+ (quality floor)
- Security review for auth/payment
- Accessibility WCAG AA (legal requirement)
- No direct production access (compliance)

## Quality Governance

**Quality Gate Philosophy:**

We enforce automated gates (fast feedback) over manual gates (bottlenecks).

**Automated Gates (CI):**

Cannot merge without:
- 80% test coverage (Codecov)
- 0 TypeScript errors
- 0 ESLint errors (auto-fixable run on commit)
- All tests passing
- Build succeeds
- Bundle size <500kb (performance budget)
- Lighthouse score >90 (performance/a11y)

**Manual Gates:**

Required approvals by risk level:

| Risk Level | Examples | Approvals Required |
|------------|----------|-------------------|
| Low | Feature work, bug fixes | 1 peer |
| Medium | Database migrations, API changes | 1 peer + eng lead |
| High | Auth changes, payment processing | 2 peers + security team |
| Critical | Infrastructure, deployment config | DevOps + CTO |

**Why These Gates?**
- Low: Peer review catches 60% of bugs (research shows)
- Medium: Schema changes need DBA expertise
- High: Security vulnerabilities cost $4M average (IBM study)
- Critical: Outages cost $5k/min revenue

**Gate Override Process:**
- **Who can override:** CTO only
- **When:** Customer-critical hotfix, immediate revenue impact
- **Requirements:**
  - Document reason in PR
  - Create tech debt ticket
  - Postmortem within 24h
- **Frequency:** 2-3 times/quarter (acceptable)

**Gate Evolution:**
- **Review:** Quarterly in engineering all-hands
- **Metrics:** Merge time, bug escape rate, developer satisfaction
- **Last change:** Removed manual design review (bottleneck, no bug reduction)

---

## Decision Framework

**Process Changes Require:**

1. **RFC (Request for Comments)**
   - **Template:** `/docs/rfcs/template.md`
   - **Sections:**
     - Problem statement (current pain)
     - Proposed solution
     - Alternatives considered
     - Impact analysis (time, cost, risk)
     - Success metrics
   - **Distribution:** Post in #engineering, 5-day comment period

2. **Trial Period**
   - **Duration:** 2-4 weeks (1-2 sprints)
   - **Metrics:** Define upfront in RFC
   - **Examples:**
     - PR template: Measure review time
     - Async standup: Measure meeting time saved

3. **Approval Vote**
   - **Who votes:** All engineers
   - **Threshold:** 66% approval (2/3 majority)
   - **Veto power:** CTO (business risk), eng leads (technical risk)

4. **Rollout**
   - Update documentation before enforcement
   - Announce in #engineering
   - Provide training if needed

**Example: Adopting Async Standup**

| Phase | Action | Result |
|-------|--------|--------|
| RFC | Problem: 30min daily standup, 10 people = 5hrs/day | Posted in #engineering |
| Proposal | Async in Slack by 11am PST | 3-day comment period |
| Trial | 2 weeks (Sept 1-14, 2024) | Measured: time saved, blockers missed |
| Metrics | Saved: 4.5hrs/day, Missed blockers: 0 | Success |
| Vote | 10 approve, 1 abstain, 0 veto | Approved |
| Rollout | Updated docs, announced Sept 15 | Permanent |

---

## Process Evolution

**Continuous Improvement Approach:**

**Quarterly Process Review:**
- When: Last Friday of each quarter
- Format: Engineering all-hands (2 hours)
- Agenda:
  1. **Metrics review** (30min): Velocity, quality, satisfaction
  2. **What to keep** (30min): Processes that work
  3. **What to kill** (30min): Low-value processes
  4. **What to try** (30min): New experiments

**Historical Changes:**

| Quarter | Change | Rationale | Impact |
|---------|--------|-----------|--------|
| Q1 2024 | Daily → Async standup | Distributed team, time zones | -4.5hrs/day |
| Q1 2024 | Weekly → Daily deploys | Reduce merge conflicts | -40% conflicts |
| Q2 2024 | Added PR templates | Missing context in PRs | -25% review time |
| Q2 2024 | Squash merge | Cleaner git history | Easier rollbacks |
| Q3 2024 | Removed design sign-off gate | Bottleneck, no bug reduction | +15% velocity |
| Q4 2024 | Added bundle size budget | Performance degradation | p95 latency -30% |

**Failed Experiments:**

| Experiment | Trial Period | Why Failed | Lesson |
|------------|--------------|------------|--------|
| No code review | Q1 2024, 2 weeks | Bug rate tripled | Quality gate necessary |
| Pair programming (all tasks) | Q2 2024, 4 weeks | Velocity halved | Use for complex features only |
| Weekly deploys | Q3 2024, 4 weeks | Merge conflicts increased | Daily better for our cadence |
| Mandatory design review | Q4 2024, 4 weeks | No bug reduction, 3-day delays | Async review sufficient |

**Process Metrics (Current):**
- Sprint velocity: 50 points (stable)
- Merge time: 6 hours median (target: <8hrs)
- Bug escape rate: 0.08% (target: <0.1%)
- Developer satisfaction: 7.8/10 (survey)

---

## Standards Rationale

**Why 80% Test Coverage?**

Research-backed threshold:
- <80%: Bug escape rate increases exponentially
- 80-85%: Optimal (diminishing returns above)
- >90%: Time cost exceeds benefit (2x test time for 5% coverage gain)

Our data:
- At 70% coverage: 0.15% error rate
- At 80% coverage: 0.08% error rate
- At 85% coverage: 0.08% error rate (no improvement)

**Why Squash and Merge?**

Benefits:
- Clean git history (1 commit per feature)
- Easy rollbacks (revert single commit)
- Simple cherry-picking to hotfix branches

Trade-offs:
- Lose granular commit history
- Can't revert part of a feature

Decision: We value simple rollbacks over granular history.

**Why 4-Hour Review SLA?**

Optimization research:
- <2 hours: Interrupts deep work (context switching cost)
- >8 hours: Author loses context (must re-review own code)
- 4 hours: Balance batch review and author context retention

Our data:
- Median review time: 3.2 hours
- 90th percentile: 7.5 hours (acceptable)
- Violations: 8% (mostly timezone issues)

**Why Fibonacci Estimation?**

Psychological research:
- Linear (1,2,3,4): False precision, overconfidence
- Fibonacci (1,2,3,5,8): Reflects uncertainty
- Forces conversation when estimates differ

Our approach:
- <5 points: High confidence
- 8 points: Moderate uncertainty
- 13 points: Too uncertain, break down

---

## Risk Management

**Process-Related Risks:**

**1. Quality Degradation**
- **Risk:** Fast shipping leads to technical debt spiral
- **Likelihood:** Medium
- **Impact:** High (customer churn, rewrite cost)
- **Indicators:**
  - Bug rate >0.1%
  - Tech debt >25% of sprint
  - Test coverage <75%
- **Mitigation:**
  - Enforce 80% coverage (automated gate)
  - Reserve 20% sprint capacity for refactoring
  - Quarterly tech debt review
- **Response:** If triggered, freeze features for 1 sprint, focus on quality

**2. Review Bottleneck**
- **Risk:** Senior devs are review bottleneck (security, infrastructure)
- **Likelihood:** High
- **Impact:** Medium (deploy delays, feature delays)
- **Indicators:**
  - Review SLA violations >20%
  - PRs waiting >24h
- **Mitigation:**
  - Train 2 more devs on security review (Q1 2025)
  - Document infrastructure patterns
  - Rotate security reviewer role
- **Response:** Fast-track training, hire senior if persists

**3. Deploy Failures**
- **Risk:** Production deploy breaks critical features
- **Likelihood:** Low (1-2 times/quarter)
- **Impact:** High ($5k/min revenue loss)
- **Indicators:**
  - Error rate >0.1%
  - Revenue tracking stops
  - Customer support volume spikes
- **Mitigation:**
  - Feature flags for risky changes
  - Automated rollback (1-click)
  - Canary deploys (10% traffic first)
- **Response:** Rollback within 5min, postmortem, prevent recurrence

**4. Process Overhead**
- **Risk:** Process slows velocity as team grows
- **Likelihood:** High (natural growth friction)
- **Impact:** Medium (competitive disadvantage)
- **Indicators:**
  - Velocity drops >15% quarter-over-quarter
  - Developer satisfaction <7/10
  - Onboarding time >2 weeks
- **Mitigation:**
  - Quarterly process review (kill low-value process)
  - Automation (PR templates, CI checks)
  - Delegate decisions to teams
- **Response:** Emergency process audit, cut ceremony time

---

## Compliance Requirements

**SOC 2 Type II:**
- **Requirement:** Code review audit trail
- **Evidence:** GitHub PR approvals, timestamps
- **Retention:** 7 years
- **Process:** No direct commits to main, all changes via PR

**PCI DSS:**
- **Requirement:** Separate payment code review
- **Evidence:** Security team approval on payment PRs
- **Process:** Mandatory security review for `/payment` directory

**GDPR:**
- **Requirement:** Data processing documentation
- **Evidence:** Privacy review on data schema changes
- **Process:** Legal review on new data fields

**Audit Schedule:**
- SOC 2: Annual (external auditor)
- PCI: Quarterly (self-assessment)
- GDPR: Biannual (legal review)

**Audit Preparation:**
- Maintain compliance checklist in Notion
- Export GitHub PR logs quarterly
- Document all process exceptions
