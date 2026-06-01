# Intelligence Gathering Pattern Template

**Purpose:** Replayable template for adding intelligence gathering to any framework agent.
**Created from:** Pilot implementation on ai-backlog-manager, ai-app-developer, ai-framework-manager

---

## Prerequisites

Before applying this pattern, ensure:
- `gathering-intelligence` skill exists at `.claude/skills/gathering-intelligence/SKILL.md`
- Scout agents exist at `framework/modules/core/agents/ai-scout-*.md`
- `intelligence-gathering` capability is registered in `.claude/registries/discovery-map.json`
- `gathering-intelligence` skill is registered in `.claude/registries/skills.json`

---

## Steps to Add Intelligence Gathering to an Agent

### Step 1: Update Agent Frontmatter

Add `intelligence-gathering` to the agent's `capability-needs` in the agent `.md` file:

```yaml
capability-needs:
  - <existing-capabilities>
  - intelligence-gathering
```

### Step 2: Add Intelligence Gathering Section

Insert after the Skill Routing Table, before "Required Reading":

```markdown
## Intelligence Gathering

> **Skill:** Use `gathering-intelligence` for parallel context research

Before starting complex tasks, evaluate whether intelligence gathering
would improve output quality. Invoke the `gathering-intelligence` skill
which will guide you through dispatching scout sub-agents in parallel.

**When to gather:** [agent-specific complex task types]
**When to skip:** [agent-specific simple task types]
```

### Step 3: Update Skill Routing Table

Add this row to the agent's Skill Routing Table:

```markdown
| Intelligence Gathering | Role-Based | `gathering-intelligence` | Auto-discovered |
```

### Step 4: Define Decision Matrix Rows

For each task type this agent handles, decide which scouts to dispatch.
Add the rows to the decision matrix in `.claude/skills/gathering-intelligence/SKILL.md`.

Reference the existing matrix format:

| Task Type | Scout: Backlog | Scout: Codebase | Scout: Knowledge |
|-----------|:-:|:-:|:-:|
| [Task name] | Yes/No/Optional | Yes/No/Optional | Yes/No/Optional |

### Step 5: Identify Verification Gate

Which existing essential skill serves as the final quality gate after synthesis?
Document this in the "After Gathering: Verification Gate" table in the skill.

### Step 6: Update agents.json Registry

In `.claude/registries/agents.json`, add `"intelligence-gathering"` to the agent's `capability-needs` array.

### Step 7: Validate

Run: `agentic-framework validate`
Test with a sample task that should trigger intelligence gathering.

---

## Remaining Agents Rollout Map

| Agent | Priority | Scouts Needed | Verification Gate |
|-------|----------|---------------|-------------------|
| `ai-backlog-manager` (Jira sync tasks) | Medium | backlog + knowledge | `syncing-with-jira` |
| `ai-confluence-manager` | Medium | codebase + knowledge | `publishing-confluence` |
| `ai-report-manager` | Medium | backlog + knowledge | `building-reports` |
