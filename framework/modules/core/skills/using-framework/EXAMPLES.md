# Framework Architecture Examples

**Worked Examples: Discovery, Adding Components, Validation**

---

## Real-World Scenarios

### Scenario 1: Understanding What a Given Agent Will Load

**Goal:** Determine which skills will be auto-loaded for `ai-architect`

**Step 1: Read the agent's capability-needs** (from agent file or agents.json)
```json
// .claude/registries/agents.json
{
  "id": "ai-architect",
  "capability-needs": [
    "architecture-design",
    "quality-assurance",
    "markdown-formatting"
  ]
}
```

**Step 2: Resolve each capability in discovery-map.json**
```json
// .claude/registries/discovery-map.json (excerpt)
{ "capability": "architecture-design", "skills-providing": ["building-framework"] }
{ "capability": "quality-assurance",   "skills-providing": ["verifying-quality"] }
{ "capability": "markdown-formatting", "skills-providing": ["validating-markdown"] }
```

**Step 3: The Discovery Engine loads those three skills**
```
Agent: ai-architect
Auto-loaded skills:
  - building-framework     (architecture-design)
  - verifying-quality      (quality-assurance)
  - validating-markdown    (markdown-formatting)
```

---

### Scenario 2: Finding Project-Specific Context

**Goal:** Understand what tech stack the project uses before writing code

Invoke the `knowing-the-codebase` skill — it contains tech stack, architecture decisions,
conventions, and testing/CI details. The three knowledge skills are the project's context
layer; there is no separate context-file directory.

```
knowing-the-codebase  →  tech stack, architecture, code conventions, CI/git workflow
knowing-the-domain    →  business domain, users, product scope
knowing-backlog       →  Jira project, ticket conventions, Confluence config
```

For external pointers (API docs, design specs, related codebases), consult `references.yml`.

---

### Scenario 3: New Team Member Exploring the Framework

**Goal:** Understand what modules and agents exist

```bash
# List installed modules
agentic-framework list

# Show detail for a module (capabilities, agents, skills)
agentic-framework info core

# Read the agent file directly
cat framework/modules/coding/agents/ai-architect.md
```

No routes map is needed — navigate the filesystem directly. The four modules are:
`core`, `backlog`, `coding`, `confluence`.

---

## Adding New Components

### Adding a New Agent

**Scenario:** Need to add `ai-feature-planner` agent

**Step 1: Create agent file**
```bash
touch framework/modules/coding/agents/ai-feature-planner.md
```

```yaml
---
agent: ai-feature-planner
role: Feature Planner
capability-needs:
  - architecture-design
  - quality-assurance
token-budget: 4000
essential-skills:
  - knowing-the-codebase
  - knowing-the-domain
---

# Feature Planner Agent
...
```

**Step 2: Register in agents.json**
```json
{
  "id": "ai-feature-planner",
  "capability-needs": ["architecture-design", "quality-assurance"],
  "description": "Plan features and break into stories",
  "token-budget": 4000
}
```

**Step 3: Update discovery-map.json used-by-agents**
```json
{ "capability": "architecture-design", "used-by-agents": ["ai-architect", "ai-feature-planner"] }
```

**Step 4: Validate**
```bash
agentic-framework build
```

---

### Adding a New Skill

**Scenario:** Need a skill for validating Jira exports

**Step 1: Create skill directory and SKILL.md**
```bash
mkdir -p framework/modules/backlog/skills/validating-jira-exports
```

```yaml
---
id: validating-jira-exports
module: backlog
name: validating-jira-exports
description: Validate Jira CSV exports for required fields and data integrity.
scope: generic
applicable-projects: any
capabilities-provided:
  - jira-export-validation
tools:
  - Read
---

# Validating Jira Exports
...
```

**Step 2: Register in skills.json**
```json
{
  "id": "validating-jira-exports",
  "capabilities-provided": ["jira-export-validation"],
  "description": "Validates Jira CSV export files",
  "location": "framework/modules/backlog/skills/validating-jira-exports/",
  "token-budget": 2000
}
```

**Step 3: Map capability in discovery-map.json**
```json
{
  "capability": "jira-export-validation",
  "description": "Validate Jira CSV export files for required fields and integrity",
  "skills-providing": ["validating-jira-exports"],
  "used-by-agents": ["ai-backlog-manager"]
}
```

**Step 4: Add to agent capability-needs**
```json
// agents.json — ai-backlog-manager entry
{ "capability-needs": ["...", "jira-export-validation"] }
```

**Step 5: Validate**
```bash
agentic-framework build
```

---

### Adding a New Capability to an Existing Skill

**Scenario:** `verifying-quality` should also cover `link-checking`

**Step 1: Add capability to SKILL.md frontmatter**
```yaml
capabilities-provided:
  - quality-assurance
  - link-checking     # NEW
```

**Step 2: Update skills.json**
```json
{ "capabilities-provided": ["quality-assurance", "link-checking"] }
```

**Step 3: Add mapping in discovery-map.json**
```json
{
  "capability": "link-checking",
  "skills-providing": ["verifying-quality"],
  "used-by-agents": []
}
```

**Step 4: Validate**
```bash
agentic-framework build
```

---

## Validation Examples

### Checking Coverage Manually

```bash
# Verify all capability-needs appear in discovery-map
jq '[.capabilities[].capability]' .claude/registries/discovery-map.json

# Verify a specific skill is mapped
jq '.capabilities[] | select(.["skills-providing"] | contains(["verifying-quality"]))' \
  .claude/registries/discovery-map.json

# Verify an agent's capabilities all resolve
jq '.agents[] | select(.id == "ai-architect") | .["capability-needs"]' \
  .claude/registries/agents.json
```

### Running Build Validation

```bash
agentic-framework build
# Checks: JSON schema compliance, markdown link validity, no broken internal references
# Exit 0 = clean; any error must be fixed before committing
```

---

## Impact Analysis Examples

### Example 1: Removing an Unused Skill

```bash
# Check if any agent references the capability this skill provides
grep -r "jira-export-validation" .claude/registries/agents.json
# → 0 matches — safe to remove

# Steps:
# 1. Delete skill directory
# 2. Remove from skills.json
# 3. Remove mapping from discovery-map.json
# 4. Run: agentic-framework build
```

### Example 2: Renaming a Capability

```bash
# Rename "quality-assurance" → "qa-and-review"
# Files to update:
#   .claude/registries/discovery-map.json  (key + used-by-agents entries)
#   .claude/registries/skills.json          (capabilities-provided)
#   .claude/registries/agents.json          (capability-needs in every agent that uses it)
#   Each affected agent's YAML frontmatter  (capability-needs)
# Then: agentic-framework build
```

---

## References

- **[BEST-PRACTICES.md](BEST-PRACTICES.md)** - Maintenance and naming conventions
- **[SKILL.md](SKILL.md)** - Quick reference and overview
- **[DISCOVERY-ENGINE-ARCHITECTURE.md](DISCOVERY-ENGINE-ARCHITECTURE.md)** - Deep dive into discovery engine

---

**Examples Version:** 2.0
**Last Updated:** 2025-12-15
