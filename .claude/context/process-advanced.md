---
context-level: advanced
context-category: process
token-target: 1000
---

# Process Context - Advanced

> Loads cumulatively after `process-basic.md`. NO duplication of basic content.

## Phase-Based Planning Discipline

For complex tasks (>3 hours or >3 phases):

1. **Design Phase**
   - Define phase structure with clear deliverables
   - Establish success metrics for each phase
   - Document dependencies and blockers
   - Create phase tickets if using backlog module

2. **Execution**
   - Complete phases sequentially
   - Create phase-specific commits (one per phase)
   - Validate success metrics before proceeding
   - Update phase status in planning documents

3. **Quality Gates**
   - Run full validation suite after each phase
   - Check against success criteria
   - Document deviations and adjustments

## Registry Management Workflow

When modifying module capabilities:

1. **Update module.json**
   - Add/modify agents, skills, or cli-commands sections
   - Ensure capability declarations are accurate
   - Update version if breaking changes

2. **Regenerate Registries**
   ```bash
   agentic-framework sync --agents --skills
   ```

3. **Verify Synchronization**
   - Check `framework/modules/core/registries/` updated
   - Confirm `.claude/agent_configs/` in sync
   - Validate discovery metadata

4. **Pre-commit Validation**
   - Hooks automatically verify registry consistency
   - Fails if manual sync needed

## Pre-commit Hook Details

Each commit triggers validation checks:

```bash
# Routes consistency check
agentic-framework routes check

# Markdown link validation
agentic-framework validate --links

# Skill registry synchronization
agentic-framework sync --skills --check

# Agent registry synchronization
agentic-framework sync --agents --check

# Version consistency validation
agentic-framework validate --versions
```

**If any check fails, commit is rejected.** Fix issues before retrying.

## Release Process

### Semantic Versioning

- **Major (X.0.0)** - Breaking changes, incompatible API changes
- **Minor (x.X.0)** - New features, backward compatible
- **Patch (x.x.X)** - Bug fixes, backward compatible

### Version Bump Workflow

```bash
# Bump framework version
agentic-framework bump-version --type major|minor|patch

# Updates:
# - framework/modules/core/module.json
# - framework/modules/*/module.json
# - CLAUDE.md
# - package.json
```

### Changelog Maintenance

- Document all changes in `CHANGELOG.md`
- Group by type: Added, Changed, Deprecated, Removed, Fixed, Security
- Reference GitHub issues/PRs for traceability

### Release Tagging

After version bump and changelog update:

```bash
git tag -a v1.2.3 -m "Release v1.2.3: <summary>"
git push origin v1.2.3
```

## Context File Update Process

When modifying context files (`ai/context/*.md`):

1. **Identify Correct Level**
   - Basic: Daily usage knowledge
   - Advanced: Detailed procedures (this level)
   - Expert: Governance and strategy

2. **Check Token Budget**
   - Basic: ~500 tokens
   - Advanced: ~1000 tokens (incremental, not total)
   - Expert: ~1500 tokens (incremental, not total)

3. **Avoid Duplication**
   - Content in basic should NOT appear in advanced
   - Content in basic/advanced should NOT appear in expert
   - Cumulative loading handles composition

4. **Validate Frontmatter**
   ```yaml
   ---
   context-level: basic|advanced|expert
   context-category: business|technical|process
   token-target: 500|1000|1500
   ---
   ```

## Agent Execution Mode Selection

Choose execution mode based on context:

- **Interactive** (default) - Complex tasks requiring user decisions and clarification
- **Autonomous** (`--autonomous`) - CI/CD pipelines, OpenClaw orchestration, batch processing

Autonomous agents run without user prompts:
```
agentic-framework agent run ai-backlog-manager "Create ticket" --autonomous
```

Autonomous mode uses `permissionMode: acceptEdits` and excludes `AskUserQuestion` tool.
