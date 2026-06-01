# Context Level Decision Tree

## Quick Decision Flow

```
START: I need to document [INFORMATION]
  |
  ├─> Is this FOUNDATIONAL knowledge needed for ANY task?
  |   (Product name, tech stack, basic workflow)
  |   |
  |   YES ──> BASIC LEVEL (~500 tokens)
  |   |
  |   NO
  |   |
  ├─> Is this TACTICAL knowledge for complex execution?
  |   (Implementation patterns, detailed processes, team structure)
  |   |
  |   YES ──> ADVANCED LEVEL (~1000 tokens)
  |   |
  |   NO
  |   |
  └─> Is this STRATEGIC knowledge for decision-making?
      (Architecture rationale, business strategy, governance)
      |
      YES ──> EXPERT LEVEL (~1500 tokens)
```

## Category-Specific Decision Tables

### Business Context Decisions

| Question | Answer | Level |
|----------|--------|-------|
| What product do we build? | Product name, core purpose | BASIC |
| Who are our users? | User segments, primary needs | BASIC |
| What's our business model? | Revenue model, pricing tier | BASIC |
| What metrics matter? | KPIs, success measures | ADVANCED |
| How do we compete? | Market position, differentiators | ADVANCED |
| What's our growth strategy? | Expansion plans, roadmap themes | ADVANCED |
| Why this strategy? | Strategic rationale, trade-offs | EXPERT |
| What are our constraints? | Business constraints, compliance | EXPERT |
| How do we make decisions? | Decision frameworks, governance | EXPERT |

### Technical Context Decisions

| Question | Answer | Level |
|----------|--------|-------|
| What languages/frameworks? | Tech stack list | BASIC |
| What's our architecture? | High-level architecture diagram | BASIC |
| Where's the code? | Repository structure, key directories | BASIC |
| How do we build/deploy? | Build commands, deployment process | ADVANCED |
| What are our patterns? | Design patterns, conventions | ADVANCED |
| How do we handle [X]? | Error handling, logging, state management | ADVANCED |
| Why this architecture? | ADRs, architectural rationale | EXPERT |
| What are our tech constraints? | Legacy systems, migration plans | EXPERT |
| How do we evolve the system? | Technical strategy, modernization | EXPERT |

### Process Context Decisions

| Question | Answer | Level |
|----------|--------|-------|
| What's our workflow? | Basic development workflow | BASIC |
| What tools do we use? | Core tools (Jira, Git, Slack) | BASIC |
| Who's on the team? | Roles, key contacts | BASIC |
| How do we do code review? | Code review process, standards | ADVANCED |
| How do we plan work? | Sprint planning, estimation | ADVANCED |
| What's our release process? | Release workflow, approvals | ADVANCED |
| Why these processes? | Process rationale, trade-offs | EXPERT |
| How do we improve? | Retrospectives, process evolution | EXPERT |
| What are our standards? | Coding standards, quality gates | EXPERT |

## Real Examples by Category

### Business Context Examples

#### BASIC Example
```markdown
**Product:** TaskMaster - Project management for remote teams
**Users:** Distributed software teams (5-50 people)
**Business Model:** SaaS subscription ($10/user/month)
```
**Why BASIC:** Foundational facts needed for any task.

#### ADVANCED Example
```markdown
**Key Metrics:**
- Monthly Active Users (MAU): Target 10k by Q4
- Net Promoter Score (NPS): Above 40
- Customer Acquisition Cost (CAC): Under $50

**Competitive Position:**
- Differentiation: AI-powered task prioritization
- Market segment: Remote-first teams under 50 people
- Key competitors: Asana (enterprise), Trello (simple)
```
**Why ADVANCED:** Tactical information for feature prioritization and execution.

#### EXPERT Example
```markdown
**Strategic Rationale:**
We target small teams (not enterprise) because:
1. Faster sales cycles (no enterprise procurement)
2. Product-led growth (self-serve signup)
3. Lower support overhead (standardized workflows)

Trade-off: We sacrifice 80% of market revenue potential for 10x faster growth.

**Decision Framework:**
- Features: Must reduce time-to-task-completion by 20%+
- Integrations: Only if requested by 30%+ of users
- Pricing: Never exceed $15/user (positioning constraint)
```
**Why EXPERT:** Strategic context for architectural and product decisions.

### Technical Context Examples

#### BASIC Example
```markdown
**Tech Stack:**
- Frontend: React 18, TypeScript, Vite
- Backend: Node.js, Express, PostgreSQL
- Infrastructure: AWS (ECS, RDS)

**Repository Structure:**
```
/apps/web     # React frontend
/apps/api     # Express backend
/packages     # Shared libraries
```
```
**Why BASIC:** Foundational information needed for any code task.

#### ADVANCED Example
```markdown
**State Management:**
- Use React Query for server state
- Use Zustand for client state
- No Redux (removed in v2.0 migration)

**Error Handling:**
- API errors: Return { error: { code, message, details } }
- Frontend: Use ErrorBoundary + toast notifications
- Logging: Winston with structured JSON to CloudWatch

**Database Patterns:**
- Use Prisma ORM for type safety
- Migrations: Always include rollback scripts
- Soft deletes: Use deletedAt timestamp
```
**Why ADVANCED:** Implementation guidance for complex tasks.

#### EXPERT Example
```markdown
**Architecture Decision Record: Microservices vs Monolith**

**Decision:** Maintain monolith architecture (2023-06)

**Rationale:**
- Team size: 8 developers (insufficient for microservices overhead)
- Deployment complexity: Would require Kubernetes expertise
- Performance: Current monolith handles 10k requests/min with 50ms p95

**Trade-offs Accepted:**
- Longer deployment times (5min vs 30sec for microservices)
- Tighter coupling between features
- Single technology stack constraint

**Revisit Conditions:**
- Team exceeds 20 developers
- Performance requires horizontal scaling beyond 50k req/min
- Regulatory requirements mandate service isolation
```
**Why EXPERT:** Strategic context for architectural decisions.

### Process Context Examples

#### BASIC Example
```markdown
**Development Workflow:**
1. Pick ticket from "Ready" column in Jira
2. Create feature branch from main
3. Implement → Test → Create PR
4. Code review → Merge → Deploy

**Tools:**
- Jira: Task management
- GitHub: Code repository
- Slack: #engineering channel for questions
```
**Why BASIC:** Foundational workflow needed for any task.

#### ADVANCED Example
```markdown
**Code Review Process:**
1. PR must have:
   - Descriptive title (feat/fix/refactor prefix)
   - Test coverage for new code
   - Updated documentation if API changed

2. Review requirements:
   - At least 1 approval from team
   - All CI checks passing (tests, linting, build)
   - No unresolved comments

3. Review SLA:
   - First review within 4 hours
   - Follow-up reviews within 2 hours

**Sprint Planning:**
- Every Monday 10am PST
- Capacity: 40 story points per sprint (2 weeks)
- Estimation: Fibonacci (1, 2, 3, 5, 8, 13)
- Required artifacts: User story, acceptance criteria, design mockup (if UI)
```
**Why ADVANCED:** Detailed process for complex tasks requiring coordination.

#### EXPERT Example
```markdown
**Process Governance:**

**Code Standards Philosophy:**
We optimize for readability over cleverness because:
- Average PR review time: 15 minutes
- 60% of developers are mid-level
- Code is read 10x more than written

**Quality Gates:**
- Automated: 80% test coverage, 0 linting errors, 0 type errors
- Manual: Security review for auth/payment code
- Override: Tech lead approval required

**Process Evolution:**
Changes to development process require:
1. RFC document with rationale
2. 2-week trial period
3. Team retrospective vote (66% approval)

**Release Philosophy:**
- Deploy to production daily (continuous delivery)
- Feature flags for incomplete features
- Rollback if error rate exceeds 0.1%
```
**Why EXPERT:** Strategic process context for governance and evolution decisions.

## Decision Shortcuts

### "When in doubt" Rules

1. **If developers need it on day 1** → BASIC
2. **If it guides HOW to execute** → ADVANCED
3. **If it explains WHY we do it this way** → EXPERT

### Common Mistakes

| Mistake | Wrong Level | Correct Level |
|---------|-------------|---------------|
| ADR document | BASIC | EXPERT |
| Tech stack list | ADVANCED | BASIC |
| Strategic rationale | ADVANCED | EXPERT |
| Basic workflow | ADVANCED | BASIC |
| Deployment process | BASIC | ADVANCED |
| Product name | ADVANCED | BASIC |
