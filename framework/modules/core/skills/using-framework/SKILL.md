---
id: using-framework
module: core
name: using-framework
description: Understand the current framework architecture — four modules, registry-based skill/agent discovery, knowledge skills for project context, references.yml for external pointers, and build validation. Use when learning how the framework is structured, designing new modules or skills, or making decisions about framework organization.
scope: generic
applicable-projects: any
capabilities-provided:
  - framework-architecture-knowledge
# Claude Code v2.1 features - read-only knowledge skill
tools:
  - Read
  - Glob
  - Grep
---

# Understanding Framework Architecture

## When to Use This Skill

You need to understand **framework design patterns** and should:
- Learn how modules, skills, and agents are organized
- Understand how registry-based discovery works
- Navigate the framework without a routes map
- Add new capabilities (skills, agents, modules)
- Understand how project-specific knowledge is provided
- Make decisions about framework structure or governance

**Example Invocations:**
- "Use using-framework to explain how skill discovery works"
- "Help me understand how capability-needs connects agents to skills"
- "I'm adding a new module — what do I need to know?"
- "Where does project-specific knowledge live in the framework?"

---

## Quick Reference

### The Current Model

| Concern | How It Works |
|---------|-------------|
| **Modules** | 4 modules: `core`, `backlog`, `coding`, `confluence` |
| **Skill discovery** | Registries (`skills.json`, `agents.json`, `discovery-map.json`) |
| **Agent ↔ skill wiring** | `capability-needs` / `capabilities-provided` in YAML frontmatter |
| **Project knowledge** | Three on-demand knowledge skills (see below) |
| **External references** | `references.yml` at project root |
| **Validation** | `agentic-framework build` (schema + markdown-link validation) |
| **Navigation** | Native filesystem — Glob/Grep/Read, no routes map needed |

### Knowledge Skills (Project Context)

Project-specific context lives in three **knowledge skills**, not context files:

| Skill | Contains |
|-------|---------|
| `knowing-the-codebase` | Tech stack, architecture, conventions, testing/CI, git workflow |
| `knowing-the-domain` | Business domain, users, product context, features |
| `knowing-backlog` | Jira project, workflow states, ticket conventions, Confluence config |

Fill these in after scaffolding. External doc and codebase pointers go in `references.yml`.

---

## How Discovery Works

### Agent Declares Capability-Needs

```yaml
---
agent: ai-architect
capability-needs:
  - architecture-design
  - quality-assurance
  - markdown-formatting
---
```

### Skills Declare Capabilities-Provided

```json
{
  "id": "verifying-quality",
  "capabilities-provided": ["quality-assurance"],
  "location": "framework/modules/core/skills/verifying-quality/"
}
```

### discovery-map.json Routes Needs to Skills

```json
{
  "capability": "quality-assurance",
  "skills-providing": ["verifying-quality"],
  "used-by-agents": ["ai-architect", "ai-app-developer"]
}
```

The Discovery Engine queries `discovery-map.json` at agent invocation time — no hardcoded skill references in agent files.

---

## Three-Tier Skill Loading

| Tier | Name | Loading | Configuration |
|------|------|---------|---------------|
| **Tier 1** | Essential | Pre-loaded | `essential-skills` in agent frontmatter |
| **Tier 2** | Role-Based | Auto-discovered | `capability-needs` in agent frontmatter |
| **Tier 3** | Available | On-demand | `available-skills` in agent frontmatter |

---

## Quick Decision Trees

### Where Does This Information Live?

```
What is this component?         → agents.json / skills.json (registry)
What capabilities does it need? → capability-needs in agent YAML
What skill provides capability? → discovery-map.json
External docs / API references  → references.yml
Project tech/architecture/code  → knowing-the-codebase skill
Business domain / product       → knowing-the-domain skill
Jira / Confluence config        → knowing-backlog skill
```

### Adding a New Agent

1. Create agent file in `framework/modules/<module>/agents/`
2. Add `capability-needs` to YAML frontmatter
3. Register in `agents.json` with same capability-needs
4. Verify each capability resolves in `discovery-map.json`
5. Run `agentic-framework build` to validate

### Adding a New Skill

1. Create skill directory in `framework/modules/<module>/skills/<skill-id>/`
2. Create `SKILL.md` with `capabilities-provided` in YAML frontmatter
3. Register in `skills.json` with same capabilities-provided
4. Map each capability in `discovery-map.json`
5. Run `agentic-framework build` to validate

---

## See Also

### Supporting Files

- **[BEST-PRACTICES.md](BEST-PRACTICES.md)** - Maintaining registries, adding components, validation
- **[EXAMPLES.md](EXAMPLES.md)** - Real-world examples for adding agents, skills, and capabilities
- **[DISCOVERY-ENGINE-ARCHITECTURE.md](DISCOVERY-ENGINE-ARCHITECTURE.md)** - Deep dive into the discovery engine

### Related Skills

- **[building-skills](../building-skills/SKILL.md)** - How to build skills with good structure
- **[building-framework](../building-framework/SKILL.md)** - Governance rules for framework organization

### Key Files

- `.claude/registries/agents.json` — Agent metadata and capability-needs
- `.claude/registries/skills.json` — Skill metadata and capabilities-provided
- `.claude/registries/discovery-map.json` — Capability routing (single source of truth)
- `references.yml` — External doc/codebase pointers

---

**Type:** knowledge (static reference)
**Scope:** generic (reusable across projects)
**Applicable Projects:** any project with framework structure
**Last Updated:** 2025-12-15
