---
id: gathering-intelligence
module: core
name: gathering-intelligence
description: Dispatch parallel scout sub-agents to gather backlog, codebase, and knowledge context before complex tasks. Use when orchestrator agents need enriched context for ticket creation, implementation, or framework decisions.
scope: framework
applicable-projects: any
capabilities-provided:
  - intelligence-gathering
---

# Intelligence Gathering

## When to Use This Skill

You are an **orchestrator agent** about to start a complex task and need enriched context. This skill guides you through dispatching parallel scout sub-agents to gather intelligence before executing your main work.

**Invoke this skill BEFORE starting complex tasks — not after.**

---

## Skip Criteria

Do NOT gather intelligence when:

- Task is purely mechanical (rename, format, validate, migrate)
- User explicitly provides all necessary context
- Task scope is trivial (single file, simple fix, config change)
- You already have sufficient context from loaded context files
- Task is a follow-up to work done earlier in the same session

**When in doubt, gather.** The cost of a 30-second parallel scout is far less than the cost of a misaligned deliverable.

---

## Decision Matrix

Use this matrix to determine which scouts to dispatch based on your task type:

| Task Type                       | Scout: Backlog | Scout: Codebase | Scout: Knowledge |
| ------------------------------- | :------------: | :-------------: | :--------------: |
| **Create ticket/epic**          |      Yes       |       Yes       |     Optional     |
| **Decompose epic into stories** |      Yes       |       Yes       |        No        |
| **Implement feature**           |      Yes       |       Yes       |       Yes        |
| **Fix bug**                     |       No       |       Yes       |     Optional     |
| **Refactor code**               |       No       |       Yes       |       Yes        |
| **Framework improvement**       |      Yes       |       Yes       |       Yes        |
| **Governance decision**         |      Yes       |       No        |       Yes        |
| **Module restructuring**        |      Yes       |       Yes       |       Yes        |
| **Write tests**                 |       No       |       Yes       |        No        |
| **Design architecture**         |      Yes       |       Yes       |       Yes        |
| **Evaluate tech stack**         |    Optional    |       Yes       |       Yes        |
| **Review/validate**             |       No       |    Optional     |        No        |
| **Documentation update**        |       No       |    Optional     |     Optional     |
| **Create magic system**         |       No       |       No        |       Yes        |
| **Create nation/region**        |       No       |       No        |       Yes        |
| **Create world rule**           |       No       |       No        |       Yes        |
| **Create character**            |       No       |       No        |       Yes        |
| **Create history event**        |       No       |       No        |       Yes        |
| **Plan narrative arc**          |       No       |       No        |       Yes        |
| **Write scene/chapter**         |       No       |       No        |       Yes        |
| **Implement iOS feature**       |      Yes       |       Yes       |     Optional     |
| **Fix iOS bug**                 |       No       |       Yes       |        No        |
| **iOS UI redesign**             |       No       |       Yes       |       Yes        |

**"Optional"** means: dispatch if the task touches unfamiliar territory or crosses module boundaries. Skip if you're confident in the domain.

---

## Dispatch Instructions

### Step 1: Identify Task Type

Match the user's request to a row in the decision matrix above. If the task spans multiple types, use the row that requires the most scouts.

### Step 2: Dispatch Scouts in Parallel

Use the **Task tool** to dispatch scouts simultaneously. Each scout receives the same task description.

**Dispatch pattern:**

For each scout marked "Yes" in the matrix, create a Task with:

- **Agent:** The scout's agent file from `framework/modules/core/agents/`
- **Model:** haiku
- **Prompt:** Include the task description and any specific search focus

Example dispatch prompt for scout-backlog:

```
Task: [paste the user's task description]
Project: [project name]
Search focus: [specific domain keywords]
Graphiti group_id: [from project CLAUDE.md]
```

**Critical:** Dispatch all scouts in a SINGLE message with multiple Task tool calls. Do NOT dispatch sequentially.

### Step 3: Receive and Review Summaries

Each scout returns a structured summary. Before proceeding:

1. Read all summaries
2. Note any contradictions between scouts (e.g., codebase shows pattern X but knowledge says it was deprecated)
3. Identify the most actionable findings
4. Discard irrelevant results (scouts sometimes find tangentially related items)

### Step 4: Proceed with Enriched Context

Continue with your main task, informed by the scout summaries. Reference specific findings where relevant:

- When writing tickets: cite related ticket IDs, align sizing with observed patterns
- When implementing: follow identified architectural patterns, respect dependency chains
- When making decisions: reference past decisions and their motivations

---

## Scout Reference

| Scout                  | Agent File                                            | Purpose                                             |
| ---------------------- | ----------------------------------------------------- | --------------------------------------------------- |
| **ai-scout-backlog**   | `framework/modules/core/agents/ai-scout-backlog.md`   | Related tickets, sizing patterns, backlog alignment |
| **ai-scout-codebase**  | `framework/modules/core/agents/ai-scout-codebase.md`  | Code patterns, architecture, dependencies           |
| **ai-scout-knowledge** | `framework/modules/core/agents/ai-scout-knowledge.md` | Past decisions, historical context, constraints     |

---

## After Gathering: Verification Gate

Intelligence gathering is the FIRST step. After synthesizing scout results and executing your main task, you MUST run your domain-specific verification:

| Agent                | Verification Skill                  | Checks                                                                      |
| -------------------- | ----------------------------------- | --------------------------------------------------------------------------- |
| ai-backlog-manager   | `building-tickets`                  | YAML frontmatter, markdown syntax, acceptance criteria, Definition of Ready |
| ai-app-developer     | `verifying-quality`                 | SOLID/DRY, test coverage, no breaking changes, linter                       |
| ai-framework-manager | `building-framework`                | Registry consistency, discovery-map, module.json, backward compat           |
| ai-architect         | `designing-architecture`            | Pattern coherence, constraint satisfaction, trade-off documentation         |
| ai-book-writer       | `building-worlds` / `writing-prose` | World consistency, style adherence, continuity                              |
| ai-ios-developer     | `verifying-quality`                 | SOLID/DRY, HIG compliance (via ai-hig-reviewer), tests                      |

**Never skip verification.** Intelligence gathering improves input quality; verification ensures output quality.
