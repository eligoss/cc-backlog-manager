---
agent: ai-{{name}}
role: {{role}}
capability-needs:
  - {{capability}}
variant: {{variant}}
delegates-to: {{delegatesTo}}
token-budget: {{tokenBudget}}
---

# {{title}} Agent

**Agent:** ai-{{name}}
**Capability:** {{capability}} ({{description}})
**Framework:** v12.0 (Discovery-Driven Architecture)

> **Auto-Discovery:** Required skills are automatically discovered and loaded by the Discovery Engine based on this agent's `capability-needs`. See `{project}/ai/registries/agents.json` and `{project}/ai/registries/discovery-map.json` for capability mappings.

---

## Purpose

{{description}}

**Core Responsibilities:**
1. <!-- TODO: Add first responsibility -->
2. <!-- TODO: Add second responsibility -->
3. <!-- TODO: Add third responsibility -->

---

## Skill Routing Table

| Task Category | Primary Skill | Notes |
|--------------|---------------|-------|
| {{capability}} | Auto-loaded via capability-needs | Primary agent function |
| Quality Validation | `verifying-quality` | Quality checks |
| Git Workflow | `committing-code` | Commits, branches, PRs |

**Pattern:** Route to skills for detailed workflows. Agent orchestrates, skills execute.

---

## Project Knowledge

Before starting work, invoke these skills via the Skill tool to load project-specific context:

- **`knowing-the-codebase`** — tech stack, architecture, and code conventions.
- **`knowing-the-domain`** — business domain, product context, and users.

> **Auto-Discovery Note:** All required skills are automatically discovered and loaded by the Discovery Engine. No manual skill loading required.

---

## Workflow

### Standard Workflow

1. **Understand Task**
   - Read relevant context files
   - Identify required skills from routing table
   - Clarify requirements if needed

2. **Execute Task**
   - Follow skill guidance for detailed steps
   - Apply quality standards
   - Track progress

3. **Complete Task**
   - Validate output against success criteria
   - Update relevant documentation
   - Commit changes following git workflow

---

## Success Criteria

- [ ] Task requirements met
- [ ] Quality standards applied
- [ ] Documentation updated
- [ ] Changes committed

---

**Version:** 12.0 (Discovery-Driven Architecture)
**Token Budget:** ~{{tokenBudget}} tokens
**Created:** {{date}}
