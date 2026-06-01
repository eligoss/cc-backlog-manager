---
context-level: expert
context-category: technical
token-target: 1500
---

# Technical Context - Expert

## Architectural Decision Records

### ADR 1: Modular Composition Over Monolithic

**Decision:** Framework split into core + optional modules instead of single package.

**Rationale:**
- Supports selective adoption (teams use only needed modules)
- Reduces token overhead (agents load only relevant context)
- Enables independent module versioning
- Facilitates third-party module development

**Trade-offs:**
- More complex dependency management
- Requires discovery engine to wire modules together
- Initial setup more involved than monolithic approach

### ADR 2: Capability-Based Discovery

**Decision:** Agents declare capability needs, skills declare capabilities provided. Runtime matching eliminates hardcoded dependencies.

**Rationale:**
- Decouples agents from skills (swap implementations without changing agents)
- Supports module optionality (agents work with whatever skills are available)
- Enables dynamic skill loading
- Facilitates testing (mock skills by capability)

**Implementation:**
- `capability-needs` in agent frontmatter
- `capabilities-provided` in skill frontmatter
- Discovery engine builds capability graph at runtime
- Skill tool invokes matched skills

**Trade-offs:**
- Runtime overhead for capability matching (mitigated by memoization)
- Less explicit than hardcoded imports (requires registry inspection)

### ADR 3: Context Level System

**Decision:** Cumulative loading (basic → advanced → expert) with strict token targets.

**Rationale:**
- Token efficiency for simple tasks (load only basic)
- Progressive disclosure (complexity available when needed)
- Forces clarity (each level must be self-contained value-add)

**Token Targets:**
- basic: ~500 tokens (day-to-day tasks)
- advanced: ~1000 tokens additional (tactical decisions)
- expert: ~1500 tokens additional (strategic planning)

**Trade-offs:**
- Content authoring discipline required (no duplication)
- Level boundaries sometimes arbitrary
- Agents must know which level to request

### ADR 4: Unified Agents with Execution Modes

**Decision:** Single agent definition per role. Execution mode (interactive/autonomous) determined by invocation, not definition.

**Rationale:**
- Eliminates full/slim duplication (was 20 files, now 10)
- Execution context determines behavior (CI/CD uses `--autonomous`)
- Same agent quality regardless of invocation method

**Pattern:**
```yaml
# Agent definition (ai-backlog-manager.md)
agent: ai-backlog-manager
token-budget: 3000
context-level: advanced
```

```bash
# Interactive (default)
agentic-framework agent run ai-backlog-manager "Create ticket"

# Autonomous (for CI/CD, OpenClaw)
agentic-framework agent run ai-backlog-manager "Create ticket" --autonomous
```

**Trade-offs:**
- All invocations use full context (no token savings from slim variants)
- Autonomous mode must handle decisions without user input

### ADR 5: YAML Frontmatter + JSON Schema Validation

**Decision:** Agent/skill metadata in YAML frontmatter, validated against JSON schemas.

**Rationale:**
- Human-readable metadata
- Auto-discovery via frontmatter parsing
- Schema validation ensures consistency
- Enables IDE autocomplete (via schema)

**Schemas:**
- `module.schema.json` - Module manifests
- `agent-frontmatter.schema.json` - Agent metadata
- `skill-frontmatter.schema.json` - Skill metadata

**Trade-offs:**
- YAML parsing overhead
- Schema evolution requires version migration

## Performance Considerations

**Schema Validation Caching:**
- Schemas loaded once, cached in memory
- Validation results memoized per file hash
- Reduces repeated validation overhead

**Discovery Memoization:**
- Capability graph built once at startup
- Registry files watched for changes (future: hot reload)
- Skill matching results cached

**Token Budget Management:**
- Context level system prevents token bloat
- Autonomous mode uses same context levels as interactive
- Routes.yml enables targeted file access (no full tree traversal)

## Extensibility Points

**Custom Modules:**
Projects can create local modules in `modules/` directory following module.json schema.

**New Context Types:**
Framework supports arbitrary context categories via `context-category` frontmatter field. Core provides: business, technical, process.

**Plugin System (Future):**
Current limitation: Modules must be in `framework/modules/`. Future: npm-installable plugins with namespace scoping (`@myplugin/backlog`).

**Custom CLI Commands:**
Modules can extend CLI via `cli-commands` in module.json. Commands auto-discovered and registered.

## Known Limitations

**Autonomous Mode Limitations:**
Autonomous agents cannot ask users for clarification. They must make reasonable defaults and log assumptions. The `AskUserQuestion` tool is excluded in autonomous mode.

**No Runtime Plugin Loading:**
Modules must be present at framework initialization. Cannot dynamically load modules mid-conversation. Requires restart to activate new modules.

**Synchronous Discovery:**
Discovery engine runs synchronously at startup. Large frameworks (50+ modules) may have noticeable startup delay.

**Context Duplication Risk:**
Cumulative loading relies on author discipline. No automated enforcement of "no duplication between levels" - must be caught in review.

## Critical Implementation Details

**Registry Update Process:**
1. Add/modify agent or skill file
2. Update frontmatter metadata
3. Run `npm run build:registries` (if automated)
4. Manual: Update `agents.json` or `skills.json` in `core/ai/registries/`
5. Validate with `agentic-framework validate`

**Module Installation Flow:**
```
agentic-framework add <module>
├─> Validate module.json against schema
├─> Check dependency tree
├─> Copy module files to framework/modules/
├─> Update routes.yml
├─> Rebuild registries
└─> Verify via `status` command
```

**Capability Matching Algorithm:**
```typescript
// Simplified
function matchSkills(agent: Agent): Skill[] {
  return skills.filter(skill =>
    agent.capabilityNeeds.some(need =>
      skill.capabilitiesProvided.includes(need)
    )
  );
}
```

**Version Bump Strategy:**
- MAJOR: Breaking changes (schema changes, incompatible APIs)
- MINOR: New modules, new capabilities, backward-compatible features
- PATCH: Bug fixes, documentation, non-breaking improvements

Uses semantic versioning. `bump-version` CLI command updates all module.json files atomically.
