---
id: designing-architecture
module: coding
name: Coding Architecture Patterns
description: Architecture design patterns and decision-making guidance for system design, tech stack choices, and architectural reviews. Use when designing systems, evaluating architecture options, or making technical decisions that impact overall system structure.
scope: generic
applicable-projects: any
capabilities-provided:
  - architecture-design
cli-commands:
  note: "Coding module does not have dedicated CLI commands. Architecture documentation and validation are handled through planning module workflows and documentation review processes."
---

# Coding Architecture Patterns

## When to Use This Skill

Use this skill when you need to:
- Design system architecture for new features or applications
- Evaluate architectural patterns (layered, microservices, event-driven, etc.)
- Make technical decisions about system structure
- Review existing architecture for improvements or refactoring
- Choose between alternative architectural approaches
- Integrate new features into existing architecture
- Plan architecture that aligns with planning workflows

**Agents that need this skill:**
- ai-architect (architecture design and review)
- ai-framework-manager (framework architecture decisions)
- ai-planning-manager (architectural considerations in multi-phase plans)

---

## Quick Start: Architecture Decision Framework

**3-Step Decision Process:**
1. **Context:** Understand requirements, constraints, and existing system
2. **Evaluate:** Compare 2-3 architectural patterns against criteria
3. **Decide:** Choose pattern with clear rationale and document trade-offs

**Key Questions:**
- What are the scalability requirements?
- What are the performance constraints?
- What is the team's expertise?
- What are the operational constraints?
- How will this integrate with existing systems?

---

## Related Coding Standards - Quick Reference

When designing architecture, also verify compliance with these essentials:

### Implementation Essentials
> From: `implementing-code`
- [ ] Functions: single responsibility, <50 lines, <=4 parameters
- [ ] Tests: cover happy path, edge cases, error conditions (AAA pattern)
- [ ] Error handling: specific exceptions, user-friendly messages
- [ ] Self-review before commit: tests pass, linting clean, no debug code

### Structure Essentials
> From: `structuring-code`
- [ ] One responsibility per file; file name matches content
- [ ] File size under 500 lines (hard limit - must split if exceeding)
- [ ] Functions: 20-50 lines typical, max 3 nesting levels
- [ ] Feature-based directory organization preferred over type-based

<!-- SYNC-NOTE: Keep in sync with source skills. Last synced: 2026-01-04 -->

---

## Instructions

### 1. Understand Architecture Context

Before proposing an architecture, gather:

**Functional Requirements:**
- What does the system need to do?
- What are the key use cases and user flows?
- What are the critical features and priorities?

**Non-Functional Requirements:**
- Scalability: Expected load, growth projections
- Performance: Response time, throughput requirements
- Reliability: Uptime targets, fault tolerance needs
- Security: Authentication, authorization, data protection
- Maintainability: Team size, expertise, operational constraints

**Existing Context:**
- Current tech stack and patterns
- Integration points with existing systems
- Team expertise and preferences
- Deployment infrastructure

**Document these explicitly before proposing architecture.**

### 2. Evaluate Architectural Patterns

Consider multiple patterns and evaluate against requirements:

**Common Patterns to Consider:**

**Layered Architecture:**
- When: Traditional enterprise apps, clear separation of concerns
- Pros: Simple, familiar, easy to understand
- Cons: Can become monolithic, tight coupling between layers
- Best for: CRUD apps, traditional web applications

**Modular Architecture:**
- When: Medium-sized apps needing flexibility and clear boundaries
- Pros: Clear module boundaries, testable, maintainable
- Cons: Requires discipline to maintain boundaries
- Best for: Growing applications, teams with clear ownership

**Microservices Architecture:**
- When: Large scale, independent deployment, polyglot needs
- Pros: Independent scaling, technology flexibility, team autonomy
- Cons: Operational complexity, distributed system challenges
- Best for: Large teams, independent services, different scaling needs

**Event-Driven Architecture:**
- When: Asynchronous workflows, real-time processing, loose coupling
- Pros: Highly decoupled, scalable, resilient
- Cons: Debugging complexity, eventual consistency
- Best for: Real-time systems, workflow orchestration

**Serverless Architecture:**
- When: Variable load, rapid development, minimal ops
- Pros: Auto-scaling, pay-per-use, no infrastructure management
- Cons: Vendor lock-in, cold start latency, stateless constraints
- Best for: APIs, event processing, variable workloads

**Evaluation Criteria:**
- Does it meet functional requirements?
- Does it satisfy non-functional requirements?
- Is it appropriate for team expertise?
- What are the trade-offs (complexity vs flexibility)?
- What are the operational costs?

### 3. Make Architecture Decisions with Clear Rationale

**Decision Format:**

```markdown
## Architecture Decision: [Title]

### Context
[What problem are we solving? What are the requirements?]

### Considered Alternatives
1. **Option A: [Pattern Name]**
   - Pros: [...]
   - Cons: [...]
   - Rationale: [Why considered]

2. **Option B: [Pattern Name]**
   - Pros: [...]
   - Cons: [...]
   - Rationale: [Why considered]

3. **Option C: [Pattern Name]**
   - Pros: [...]
   - Cons: [...]
   - Rationale: [Why considered]

### Decision
**Chosen: Option [X]**

**Rationale:**
[Clear explanation of why this option best meets requirements]

**Trade-offs Accepted:**
- [Trade-off 1]
- [Trade-off 2]

**Risks and Mitigations:**
- Risk: [...]
  Mitigation: [...]
```

**Present to user for approval before implementation.**

### 4. Design Component Structure

Once pattern is chosen, design the components:

**Component Design Questions:**
- What are the key components/modules?
- What are the responsibilities of each component?
- How do components communicate?
- What are the data flows?
- What are the interfaces/contracts?

**Documentation Format:**

```markdown
## Component Architecture

### Components

**Component A: [Name]**
- **Responsibility:** [What it does]
- **Dependencies:** [What it depends on]
- **Interface:** [API/contract]
- **Technology:** [Tech choice if relevant]

**Component B: [Name]**
- **Responsibility:** [...]
- **Dependencies:** [...]
- **Interface:** [...]
- **Technology:** [...]

### Data Flow
1. [Step 1 in data flow]
2. [Step 2 in data flow]
3. [...]

### Integration Points
- [External system 1]: [How integrated]
- [External system 2]: [How integrated]
```

### 5. Apply Quality Gates for Architecture Review

**Before finalizing architecture:**

**Completeness Checks:**
- ✅ All functional requirements addressed
- ✅ All non-functional requirements addressed
- ✅ Integration points identified
- ✅ Data flows documented
- ✅ Component responsibilities clear

**Quality Checks:**
- ✅ No circular dependencies
- ✅ Clear separation of concerns
- ✅ Appropriate abstraction levels
- ✅ Technology choices justified
- ✅ Scalability considered
- ✅ Security considerations addressed
- ✅ Testing strategy outlined

**Communication Checks:**
- ✅ Architecture documented clearly
- ✅ Alternatives considered and documented
- ✅ Trade-offs explicitly stated
- ✅ Risks identified with mitigations
- ✅ Implementation guidance provided

---

## Common Patterns

### Pattern 1: Starting New Project Architecture

**When:** Beginning a new project or major feature

**Workflow:**
1. **Gather Requirements**
   - Work with user to understand functional needs
   - Identify non-functional requirements (scale, performance, etc.)
   - Understand team and operational constraints

2. **Research Similar Systems**
   - Look for similar problems already solved
   - Review existing architecture patterns in codebase
   - Consider industry best practices

3. **Propose 2-3 Alternatives**
   - Present different architectural approaches
   - Document pros/cons for each
   - Recommend best option with rationale

4. **Get Approval**
   - Present to user for decision
   - Refine based on feedback
   - Document final decision

5. **Design Components**
   - Break down into modules/components
   - Define interfaces and contracts
   - Create architecture diagram (textual or visual)

### Pattern 2: Integrating with Planning Workflows

**When:** Architecture decisions are part of multi-phase plans

**Integration Points:**
1. **Planning Phase:** Architecture design often becomes Phase 1
2. **Success Metrics:** Architecture decisions have measurable outcomes
3. **Quality Gates:** Architecture review is a gate between planning and implementation

**Workflow:**
```markdown
## Phase 1: Architecture Design

**Success Metrics:**
- ✅ Architecture decision documented with 2-3 alternatives
- ✅ Component structure defined with clear responsibilities
- ✅ Integration points identified and validated
- ✅ Technology choices justified
- ✅ User approved architecture approach

**Deliverables:**
- Architecture decision document
- Component structure diagram
- Integration plan
- Risk assessment
```

**See Also:** Planning skills for multi-phase planning integration.

### Pattern 3: Architecture Refactoring

**When:** Improving existing architecture

**Workflow:**
1. **Analyze Current State**
   - Document current architecture
   - Identify pain points and limitations
   - Measure current performance/scalability

2. **Define Target State**
   - Propose improved architecture
   - Document specific improvements
   - Estimate migration effort

3. **Plan Migration Strategy**
   - Incremental vs big-bang approach
   - Backward compatibility requirements
   - Testing strategy

4. **Create Refactoring Plan**
   - Break into phases
   - Define success metrics per phase
   - Identify rollback points

### Pattern 4: Technology Choice Evaluation

**When:** Choosing technologies for architecture implementation

**Evaluation Framework:**

**Criteria:**
- **Functional Fit:** Does it solve the problem?
- **Team Expertise:** Can the team use it effectively?
- **Community Support:** Active community, good documentation?
- **Maturity:** Production-ready, stable releases?
- **Performance:** Meets performance requirements?
- **Licensing:** Compatible with project licensing?
- **Integration:** Works with existing stack?
- **Operational:** Easy to deploy, monitor, maintain?

**Document as:**
```markdown
## Technology Choice: [Component X]

### Requirements
[What we need this technology to do]

### Evaluated Options
1. **Option A:** [Name]
   - Functional Fit: [Rating + explanation]
   - Team Expertise: [Rating + explanation]
   - [Other criteria...]
   - **Score:** [X/10]

2. **Option B:** [Name]
   - [Same criteria...]
   - **Score:** [X/10]

### Decision: [Chosen Option]
**Rationale:** [Why this option is best]
```

---

## Best Practices

### Decision Making
- ✅ Always consider 2-3 alternatives before deciding
- ✅ Document trade-offs explicitly
- ✅ Involve user in architectural decisions
- ✅ Justify technology choices with clear criteria
- ✅ Consider team expertise and operational constraints
- ❌ Don't choose patterns because they're "trendy"
- ❌ Don't over-engineer for hypothetical future needs
- ❌ Don't make decisions in isolation without context

### Documentation
- ✅ Document architecture decisions with rationale
- ✅ Create clear component diagrams (textual or visual)
- ✅ Define component responsibilities explicitly
- ✅ Document integration points and data flows
- ✅ Include risks and mitigation strategies
- ❌ Don't document just "what" without "why"
- ❌ Don't create documentation that becomes stale
- ❌ Don't use jargon without explanation

### Quality
- ✅ Apply architecture review quality gates
- ✅ Validate against functional and non-functional requirements
- ✅ Check for circular dependencies and tight coupling
- ✅ Consider scalability and performance
- ✅ Plan for testing and observability
- ❌ Don't skip architecture review for "simple" features
- ❌ Don't ignore security considerations
- ❌ Don't forget about operational concerns

### Collaboration
- ✅ Present alternatives to user for decision
- ✅ Explain trade-offs in accessible language
- ✅ Incorporate feedback and refine proposals
- ✅ Align architecture with business goals
- ✅ Consider team input on technology choices
- ❌ Don't make unilateral architecture decisions
- ❌ Don't ignore team expertise and constraints
- ❌ Don't present architecture as unchangeable

---

## Anti-Patterns to Avoid

❌ **Resume-Driven Development**
- Choosing technologies to learn them, not because they fit
- Use: Choose based on requirements, not personal interest

❌ **Premature Optimization**
- Designing for scale before validating product-market fit
- Use: Start simple, scale when needed based on data

❌ **Architecture Astronomy**
- Creating overly complex, abstract architectures
- Use: Keep architecture as simple as possible for requirements

❌ **Golden Hammer**
- Using same pattern/technology for every problem
- Use: Evaluate alternatives for each unique context

❌ **Big Bang Rewrites**
- Rewriting entire systems from scratch
- Use: Incremental refactoring with measurable improvements

❌ **Not Invented Here Syndrome**
- Rebuilding existing solutions instead of using proven libraries
- Use: Evaluate existing solutions first, build only when necessary

❌ **Vendor Lock-In Without Consideration**
- Tightly coupling to vendor-specific features without evaluating risk
- Use: Understand lock-in trade-offs, plan mitigation strategies

---

## See Also

### Related Skills
- [implementing-code](../implementing-code/SKILL.md) - Code implementation and review standards
- [verifying-quality](../../../../core/skills/verifying-quality/SKILL.md) - Quality validation standards

### Module Documentation
- **Coding Module Manifest:** [module.json](../../../module.json)
- **Architecture Agent:** [ai-architect.md](../../../agents/ai-architect.md)

### External Resources
- Architecture Decision Records (ADR) format
- C4 Model for architecture diagrams
- Twelve-Factor App methodology

---

**Version:** 1.0
**Created:** 2025-12-24
**Status:** Production-Ready (Phase 3 - Skills Creation)
**Module:** coding
