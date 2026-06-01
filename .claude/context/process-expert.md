---
context-level: expert
context-category: process
token-target: 1500
---

# Process Context - Expert

> Loads cumulatively after `process-basic.md` and `process-advanced.md`. NO duplication of basic/advanced content.

## Framework Governance Rules

### Naming Conventions

**Agent IDs:**
- Prefix: `ai-` (e.g., `ai-framework-manager`)
- Format: kebab-case
- Examples: `ai-architect`, `ai-backlog-manager`

**Skill IDs:**
- Prefix: `shared-` for core cross-cutting skills, module name for module-specific
- Format: kebab-case
- Examples: `committing-code`, `planning-planning-phases`

**Module IDs:**
- No prefix
- Format: kebab-case
- Examples: `core`, `backlog`, `jira`, `confluence`

**File Paths:**
- Routes: Use forward slashes, no trailing slash
- Absolute: Start with `framework/`
- Example: `framework/modules/planning/ai/agents/ai-planning-manager.md`

### Version Constraints

**Module Dependencies:**
- `framework-version`: Semantic version range (e.g., `^1.0.0`)
- `module-dependencies`: Optional array of module IDs with version ranges
- Example:
  ```json
  {
    "framework-version": "^1.0.0",
    "module-dependencies": {
      "core": "^1.0.0"
    }
  }
  ```

**Breaking Change Policy:**
- Major version bump required
- Minimum 2-week deprecation period for public APIs
- Provide migration guide in `CHANGELOG.md`
- Update all dependent modules

**Compatibility Matrix:**
- Core module version drives framework version
- Module versions can increment independently
- Breaking changes in core require major bump across all modules

## Module Creation Workflow

### Step 1: Directory Structure

```
framework/modules/<module-name>/
├── module.json          # Manifest
├── ai/
│   ├── agents/          # Agent markdown files
│   ├── skills/          # Skill markdown files
│   └── context/         # Module-specific context
└── cli/                 # TypeScript commands
```

### Step 2: Write module.json

```json
{
  "id": "module-name",
  "name": "Human Readable Name",
  "version": "1.0.0",
  "framework-version": "^1.0.0",
  "description": "Module purpose",
  "provides": {
    "agents": [],
    "skills": [],
    "cli-commands": []
  }
}
```

Validate against schema:
```bash
agentic-framework validate
```

### Step 3: Create Agents

Create the agent file:
- `ai-<module>-manager.md`

**Agent Frontmatter:**
```yaml
---
agent-id: ai-module-manager
context-level: advanced
capability-needs:
  - git-workflow
  - quality-assurance
token-budget: 3000
---
```

### Step 4: Register in Discovery System

Update `module.json` provides section:

```json
{
  "provides": {
    "agents": [
      "ai-module-manager"
    ]
  }
}
```

Sync registries:
```bash
agentic-framework sync --agents --skills
```

### Step 5: Add to Pre-commit Validation

Pre-commit hooks automatically validate new modules:
- Schema compliance (`validate`)
- Registry sync (`sync --check`)
- Route consistency (`routes check`)
- Version compatibility (`validate --versions`)

## Framework Evolution Patterns

### Adding New Capabilities

1. **Declare in Skill:**
   ```yaml
   capabilities-provided:
     - new-capability-name
   ```

2. **Update Consuming Agents:**
   ```yaml
   capability-needs:
     - new-capability-name
   ```

3. **Discovery Engine Auto-matches** - No manual routing needed

### Deprecating Capabilities

1. **Mark Deprecated in module.json:**
   ```json
   {
     "deprecated": true,
     "deprecation-reason": "Use <replacement> instead",
     "removal-version": "2.0.0"
   }
   ```

2. **Provide Migration Path** in `CHANGELOG.md`

3. **Maintain for One Major Version** minimum

### Structural Changes

When moving/renaming files:

1. **Update File System** - Move/rename files
2. **Run Routes Sync:**
   ```bash
   agentic-framework routes sync
   ```
3. **Update module.json** paths if needed
4. **Regenerate Registries:**
   ```bash
   agentic-framework sync --agents --skills
   ```

## Multi-Phase Planning Discipline

For framework development tasks (from `ai-framework-manager`):

### Phase Design Principles

1. **Clear Deliverables** - Each phase has tangible output
2. **Success Metrics** - Measurable criteria for phase completion
3. **Dependencies** - Explicit prerequisite relationships
4. **Rollback Points** - Can revert to start of any phase

### Execution Discipline

1. **Phase-Specific Commits:**
   ```
   Phase 1: Design module structure

   - Created module.json manifest
   - Defined agent/skill architecture
   - Documented capability graph

   Phase 1/4 complete
   ```

2. **Version Tagging:**
   - If framework version changes, create git tag
   - Tag format: `v<major>.<minor>.<patch>`
   - Annotated tags with changelog summary

3. **Self-Evaluation:**
   - Compare implementation to design principles
   - Document deviations and rationale
   - Update governance if patterns emerge

### Quality Gates Between Phases

Before advancing to next phase:
- [ ] Phase success metrics met
- [ ] All validation checks pass
- [ ] Phase commit created
- [ ] Documentation updated
- [ ] No regressions in existing functionality

## Registry Synchronization Deep Dive

### Auto-Generated Files

**Never manually edit:**
- `framework/modules/core/registries/agents.json`
- `framework/modules/core/registries/skills.json`
- `.claude/agent_configs/*` (if using Claude Desktop)

**Source of Truth:**
- `framework/*/module.json` files
- Agent/skill markdown files (for frontmatter)

### Synchronization Commands

```bash
# Check if sync needed (exit code 1 if out of sync)
agentic-framework sync --agents --check
agentic-framework sync --skills --check

# Perform synchronization
agentic-framework sync --agents
agentic-framework sync --skills

# Sync both
agentic-framework sync --agents --skills
```

### When to Manually Trigger

- After adding/removing agents or skills
- After modifying `module.json` provides sections
- After changing agent/skill frontmatter
- Before committing structural changes

**Pre-commit hooks auto-check**, but manual sync may be needed first.

## Breaking Change Checklist

When introducing breaking changes:

1. [ ] Bump major version (`bump-version --type major`)
2. [ ] Update `CHANGELOG.md` with migration guide
3. [ ] Mark deprecated items in `module.json`
4. [ ] Update all example code and documentation
5. [ ] Test migration path on clean install
6. [ ] Announce in GitHub release notes
7. [ ] Update module compatibility matrix

## Context File Token Budgeting Strategy

**Measurement:**
- Use token counter tool to verify
- Target is guideline, not hard limit (±10% acceptable)
- Measure incremental tokens, not cumulative

**Optimization Techniques:**
- Use tables for dense information
- Avoid redundant examples
- Link to external docs for details
- Use lists over prose where appropriate

**Review Checklist:**
- [ ] No duplication across levels
- [ ] Frontmatter correct
- [ ] Token target within ±10%
- [ ] Information at appropriate level
- [ ] Examples are minimal but clear
