# Content Routing Decision Matrix

This document provides a systematic approach to deciding where content belongs in the framework architecture.

---

## Decision Tree

```
START: What type of content is this?
│
├── REUSABLE WORKFLOW (How to do something)
│   ├── Git operations → committing-code
│   ├── Quality validation → verifying-quality
│   ├── Markdown formatting → validating-markdown
│   ├── Framework governance → building-framework
│   └── New workflow → Create new skill
│
├── AGENT ORCHESTRATION (Coordination logic)
│   ├── Task routing → Agent file (Skill Routing Table)
│   ├── Evaluation criteria → Agent file (Success Criteria)
│   └── Coordination workflow → Agent file (Agent-Specific Tasks)
│
├── EXAMPLES & TEMPLATES
│   ├── Code examples → Skill supporting file (EXAMPLES.md)
│   ├── Document templates → Skill supporting file (TEMPLATES.md)
│   └── Before/after samples → Skill supporting file (EXAMPLES.md)
│
└── REFERENCE DOCUMENTATION
    ├── API documentation → docs/ folder
    ├── Architecture diagrams → docs/ folder
    └── External references → Link to source (never copy)
```

---

## Content Type Classification

### 1. Reusable Workflows → Skills

**Definition:** HOW to do something that multiple agents might need.

**Extraction criteria:**
- Used by 2+ agents
- More than 50 lines
- Stable (rarely changes)
- Self-contained workflow

**Examples:**
- Git commit workflow
- Code quality validation
- Markdown formatting
- Jira/Confluence operations
- Framework governance checks

**Location:** `ai/skills/{taxonomy}/{scope}-{name}-{category}/SKILL.md`

**Taxonomies:**
- `meta` - Skills about skills/agents
- `workflows` - Process orchestration
- `guards` - Quality validation
- `knowledge` - Reference information
- `integrations` - External tool integration

**How agents access:** `capability-needs` in YAML frontmatter

---

### 2. Agent Orchestration → Agent File

**Definition:** Coordination logic SPECIFIC to this agent's purpose.

**Keep in agent if:**
- Unique to this agent's role
- Coordinates multiple skills/contexts
- Cannot be reused by other agents
- Is the agent's primary value-add

**Examples:**
- Task routing table
- Agent-specific workflow coordination
- Success criteria for this role
- Self-evaluation checklist

**Location:** `ai/agents/ai-{name}.md`

**Target:** < 500 lines, < 3,000 tokens

---

### 3. Examples & Templates → Skill Supporting Files

**Definition:** Concrete examples, templates, and samples.

**Examples:**
- Code snippets showing patterns
- Before/after transformations
- Template documents
- Step-by-step walkthroughs

**Location:** `ai/skills/{taxonomy}/{skill-id}/EXAMPLES.md` or similar

**Pattern:** Progressive disclosure - only loaded when needed

---

### 4. Reference Documentation → docs/ Folder

**Definition:** Static documentation for human consumption.

**Examples:**
- API references
- Architecture diagrams
- System documentation
- External tool guides

**Location:** `docs/` folder

**Access:** Link to docs, never auto-load

---

## Extraction Workflow

### Step 1: Identify Extraction Candidate

**Criteria:**
- Content > 50 lines
- Content exists in another agent (duplication)
- Content is not agent-specific orchestration
- Content would benefit from progressive disclosure

### Step 2: Classify Content Type

Use the decision tree above to determine:
- Skill (reusable workflow)
- Skill supporting file (examples/templates)
- Docs (reference documentation)

### Step 3: Find or Create Target Location

**If skill exists:**
1. Check if skill already covers this content
2. If yes, remove from agent and reference skill
3. If partial, create supporting file in skill

**If skill doesn't exist:**
1. Determine if content warrants new skill (used by 2+ agents)
2. If yes, create new skill with proper structure
3. If no, keep in agent

### Step 4: Move Content

1. Create target file (supporting file in skill)
2. Move content to target
3. Add skill reference in agent
4. Remove original content from agent

### Step 5: Update References

1. Update agent's `capability-needs` if new skill
2. Update registries (skills.json, agents.json)
3. Validate with Discovery Engine

---

## Classification Examples

### Example 1: MCP Tools Documentation

**Content:** 397 lines explaining MCP tools and patterns

**Classification:**
- Type: Reusable workflow knowledge
- Reason: Multiple agents might use MCP tools
- Decision: Belongs in `using-mcp` skill

**Action:** Create `FRAMEWORK-MCP-PATTERNS.md` supporting file in MCP skill

---

### Example 2: Discovery Architecture Explanation

**Content:** 307 lines explaining how Discovery Engine works

**Classification:**
- Type: Domain knowledge (technical architecture)
- Reason: Explains WHAT the system is, not HOW to do tasks
- Decision: Belongs in a skill knowledge file

**Action:** Create `DISCOVERY-ENGINE-ARCHITECTURE.md` in architecture knowledge skill

---

### Example 3: Task Routing Table

**Content:** 30 lines mapping tasks to skills

**Classification:**
- Type: Agent orchestration
- Reason: Specific to this agent's routing responsibilities
- Decision: Keep in agent file

**Action:** No extraction needed

---

### Example 4: Git Commit Workflow

**Content:** 80 lines explaining how to create commits

**Classification:**
- Type: Reusable workflow
- Reason: All agents might need to create commits
- Decision: Belongs in `committing-code` skill

**Action:** Exists in skill already - remove from agent, add capability-need

---

## Quick Reference Card

| Content Type | Location | Access Method |
|--------------|----------|---------------|
| Reusable workflows | skills/{taxonomy}/{id}/ | capability-needs |
| Examples/templates | skills/.../EXAMPLES.md | On-demand |
| Agent orchestration | agents/ai-{name}.md | Direct |
| Reference docs | docs/ | Link only |

---

## Anti-Patterns

### Anti-Pattern 1: Duplicated Workflows

**Wrong:** Same git workflow in 3 different agents

**Right:** Single git workflow skill, all agents declare capability-need

---

### Anti-Pattern 2: Examples in Agent

**Wrong:** Agent contains 150 lines of code examples

**Right:** Examples in skill supporting file (EXAMPLES.md)

---

### Anti-Pattern 3: Inline Reference Docs

**Wrong:** Agent contains API documentation

**Right:** API docs in docs/ folder, agent links to docs

---

**Version:** 1.0.0
**Last Updated:** 2025-12-15
