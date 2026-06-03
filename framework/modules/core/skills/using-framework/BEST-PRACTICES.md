# Best Practices for Framework Architecture

**How to Maintain, Evolve, and Validate the Module/Registry System**

---

## Registry Best Practices

### skills.json

**DO:**
- Include `capabilities-provided` for every skill entry
- Use kebab-case IDs that match the skill directory name
- Set an accurate `token-budget`
- Provide a concise `description`

**DON'T:**
- Leave `capabilities-provided` empty — an unmapped skill is undiscoverable
- Duplicate capability names already covered by another skill
- Skip the `location` field — discovery relies on it

**Good Entry:**
```json
{
  "id": "verifying-quality",
  "taxonomy": "meta",
  "capabilities-provided": ["quality-assurance"],
  "description": "Quality verification patterns for code and framework artifacts",
  "location": "framework/modules/core/skills/verifying-quality/",
  "token-budget": 2500
}
```

---

### agents.json

**DO:**
- Mirror `capability-needs` from the agent YAML frontmatter exactly
- Keep the registry entry in sync with the agent file
- Use the same kebab-case ID as the agent filename

**DON'T:**
- Reference skill IDs directly — use abstract capability names
- Let the YAML frontmatter and agents.json drift out of sync

**Good Entry:**
```json
{
  "id": "ai-architect",
  "capability-needs": [
    "architecture-design",
    "quality-assurance",
    "markdown-formatting"
  ],
  "description": "System Architect & Technical Design Lead",
  "token-budget": 4500
}
```

---

### discovery-map.json

**DO:**
- Add a mapping for every new capability before using it
- Keep `used-by-agents` accurate so coverage checks pass
- Use `skills-providing` to list all skills that satisfy a capability

**DON'T:**
- Leave orphaned capabilities (defined but not used by any agent)
- Leave missing capabilities (referenced in capability-needs but not mapped)

**Good Entry:**
```json
{
  "capability": "architecture-design",
  "description": "Design system architecture, review technical decisions",
  "skills-providing": ["building-framework"],
  "used-by-agents": ["ai-architect", "ai-framework-manager"]
}
```

---

## Validation

Run `agentic-framework build` after any registry or skill change. It checks:
- JSON schema compliance for all registry files
- Markdown link validity across skill and agent files
- No broken internal references

```bash
agentic-framework build
```

Fix all errors before committing. The build command is the single gate for structural correctness.

---

## Knowledge Skills Best Practices

### Keeping Them Current

Each project fills in three knowledge skills at scaffold time:

| Skill | What to Keep Current |
|-------|---------------------|
| `knowing-the-codebase` | Tech stack versions, architecture decisions, testing commands |
| `knowing-the-domain` | Product scope, user types, key features, business rules |
| `knowing-backlog` | Active sprint, Jira project key, ticket conventions, Definition of Done |

**Update these as the project evolves** — stale knowledge skills mislead agents as much as missing ones.

### references.yml

External pointers (API docs, design specs, related repos) belong in `references.yml`, not inlined into knowledge skill prose. This keeps the skill focused and the links maintainable.

```yaml
codebase:
  - label: API Reference
    url: https://docs.example.com/api
  - label: Related service
    path: ../sibling-repo
```

---

## Adding New Components

### Adding a New Module

1. Create directory: `framework/modules/<module-name>/`
2. Add `module.json` (use schema at `framework/modules/core/registries/schemas/module.schema.json`)
3. Create `agents/`, `skills/`, `commands/`, `templates/` subdirs as needed
4. Register agents and skills in `.claude/registries/`
5. Map new capabilities in `discovery-map.json`
6. Run `agentic-framework build` to validate

### Adding a New Skill

1. Create: `framework/modules/<module>/skills/<skill-id>/SKILL.md`
2. Set `capabilities-provided` in YAML frontmatter
3. Add entry to `skills.json`
4. Add capability entry to `discovery-map.json`
5. Add capability to agent `capability-needs` where relevant
6. Run `agentic-framework build`

### Adding a New Agent

1. Create: `framework/modules/<module>/agents/<agent-id>.md`
2. Set `capability-needs` in YAML frontmatter
3. Add entry to `agents.json`
4. Verify each capability resolves in `discovery-map.json`
5. Run `agentic-framework build`

---

## Maintenance Workflows

### Health Check

```bash
# Validate all schemas and links
agentic-framework build

# List registered modules
agentic-framework list

# Show module detail
agentic-framework info core
```

**Manual verification checklist:**
- [ ] All `capability-needs` entries have mappings in `discovery-map.json`
- [ ] All `capabilities-provided` entries appear in at least one mapping
- [ ] All skill `location` paths point to existing directories
- [ ] `references.yml` URLs are still live
- [ ] Knowledge skills reflect current project state

### Refactoring Workflow

When making significant changes:

1. **Identify scope** — which agents and skills are affected
2. **Update registries first** — `agents.json`, `skills.json`, `discovery-map.json`
3. **Update agent/skill files second** — match frontmatter to registry entries
4. **Run `agentic-framework build`** — catch schema and link errors early
5. **Verify coverage** — no orphaned or missing capabilities

---

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Module IDs | kebab-case | `core`, `backlog`, `coding` |
| Agent IDs | `ai-` prefix, kebab-case | `ai-architect`, `ai-backlog-manager` |
| Skill IDs | verb-noun, kebab-case | `knowing-the-codebase`, `verifying-quality` |
| Capabilities | domain-noun, kebab-case | `quality-assurance`, `architecture-design` |

---

## References

- **[SKILL.md](SKILL.md)** - Overview and quick reference
- **[EXAMPLES.md](EXAMPLES.md)** - Worked examples for common tasks
- **[DISCOVERY-ENGINE-ARCHITECTURE.md](DISCOVERY-ENGINE-ARCHITECTURE.md)** - Discovery engine internals
- `framework/modules/core/registries/schemas/` - JSON schemas for validation

---

**Best Practices Version:** 3.0
**Last Updated:** 2025-12-15
