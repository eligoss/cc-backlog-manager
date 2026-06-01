# Framework Architecture Examples

**Real-World Workflow Examples, Validation Patterns, and Adding Components**

---

## Real-World Scenarios

### Scenario 1: Framework Manager Loads an Agent

**Goal:** Load ai-architect agent with all required context

**Step 1: Discover where agents live** (using routes.yml)
```bash
$ yq '.paths.ai.agents' routes.yml
ai/agents/
```

**Step 2: Load agent metadata** (using registry.yml)
```bash
$ yq '.agents.ai-architect' ai/registry.yml
file: ai-architect.md
token-budget: 4500
context-dependencies:
  - business-advanced
  - technical-advanced
  - process-basic
total-context-tokens: 9800
```

**Step 3: Build loading instructions**
```
Source: ai/agents/ (from routes.yml)
Load: ai-architect.md (from registry.yml)
With context:
  - business-advanced (3500 tokens)
  - technical-advanced (4500 tokens)
  - process-basic (1500 tokens)

Total: 4500 + 9800 = 14,300 tokens
Status: Within limits ✓
```

**Step 4: Execute loading**
```python
# Pseudocode
agent_content = read("ai/agents/ai-architect.md")
business_ctx = read("ai/context/business-advanced.md")
technical_ctx = read("ai/context/technical-advanced.md")
process_ctx = read("ai/context/process-basic.md")

full_prompt = agent_content + business_ctx + technical_ctx + process_ctx
# Load full_prompt with 14,300 tokens
```

**Result:** Agent loaded with complete context and metadata

---

### Scenario 2: New Team Member Learning Framework Structure

**Goal:** Understand where everything is and how it works

**Step 1: Read routes.yml for overview**
```bash
$ cat routes.yml | grep -A 10 'paths:'
```
Output shows all top-level folders and their locations.

**Step 2: Check registry for framework components**
```bash
$ yq '.meta' ai/registry.yml
total-agents: 8
total-context-files: 13
total-skills: 21
```

**Step 3: Look up specific component**
```bash
# Where does ai-backlog-manager live?
$ yq '.agents.ai-backlog-manager.file' ai/registry.yml
ai-backlog-manager.md

# Full path is?
# routes.yml says: ai/agents = "ai/agents/"
# So full path: ai/agents/ai-backlog-manager.md
```

**Step 4: Understand what it needs**
```bash
$ yq '.agents.ai-backlog-manager.context-dependencies' ai/registry.yml
- business-advanced
- technical-advanced
- process-advanced
```

**Result:** New member understands component location and dependencies

---

### Scenario 3: Framework Architect Reviews Impact of New Feature

**Goal:** Understand impact before and after implementing new capability

**Current State:**
```bash
$ yq '.meta.total-agents' ai/registry.yml
8

$ yq '.meta.token-budgets.grand-total' ai/registry.yml
87,500
```

**Proposed Change:** Add new ai-feature-planner agent

**Planning Questions:**
1. Will this break any dependencies?
   - Check: Does business-advanced context exist?
   - Check: Is there available token budget?

2. What will the impact be?
   - Current agents: 8
   - New agents: 9
   - Additional tokens: ~5000 (estimate)

**Decision:** Proceed with new agent

---

## Validation Patterns

### Validation 1: Verify All Dependencies Exist

**Script:**
```bash
#!/bin/bash
REGISTRY="ai/registry.yml"

# Get all agents
for agent in $(yq '.agents | keys[]' $REGISTRY); do
  echo "Checking $agent..."

  # Get dependencies
  deps=$(yq ".agents.$agent.context-dependencies[]" $REGISTRY)

  # Verify each dependency
  for dep in $deps; do
    if ! yq ".context-files.$dep" $REGISTRY > /dev/null; then
      echo "  ERROR: Missing context file: $dep"
    else
      echo "  OK: $dep exists"
    fi
  done
done
```

**Expected Output:**
```
Checking ai-architect...
  OK: business-advanced exists
  OK: technical-advanced exists
  OK: process-basic exists
Checking ai-backlog-manager...
  OK: business-advanced exists
  ...
```

---

### Validation 2: Check Token Budget Compliance

**Script:**
```bash
#!/bin/bash
REGISTRY="ai/registry.yml"
BUDGET_LIMIT=100000

# Get totals
total=$(yq '.meta.token-budgets.grand-total' $REGISTRY)
agent_total=$(yq '.meta.token-budgets.total-agent-tokens' $REGISTRY)
context_total=$(yq '.meta.token-budgets.total-context-tokens' $REGISTRY)

echo "Token Usage Report"
echo "=================="
echo "Total Framework: $total / $BUDGET_LIMIT"
echo "  Agents: $agent_total"
echo "  Context: $context_total"
echo ""

if [ $total -gt $BUDGET_LIMIT ]; then
  echo "⚠️  WARNING: Over budget!"
  exit 1
else
  echo "✓ Within budget"
  exit 0
fi
```

**Expected Output:**
```
Token Usage Report
==================
Total Framework: 87500 / 100000
  Agents: 42500
  Context: 45000

✓ Within budget
```

---

### Validation 3: Verify File Locations

**Script:**
```bash
#!/bin/bash
ROUTES="routes.yml"
REGISTRY="ai/registry.yml"

# Get agent path from routes
agent_path=$(yq '.paths.ai.agents' $ROUTES)

# Get all agents from registry
for agent in $(yq '.agents | keys[]' $REGISTRY); do
  file=$(yq ".agents.$agent.file" $REGISTRY)
  full_path="$agent_path$file"

  if [ ! -f "$full_path" ]; then
    echo "ERROR: $agent file missing: $full_path"
  else
    echo "OK: $agent file exists"
  fi
done
```

**Expected Output:**
```
OK: ai-architect file exists
OK: ai-backlog-manager file exists
...
```

---

## Adding New Components

### Adding a New Agent

**Scenario:** Need to add ai-feature-planner agent

**Step 1: Create agent file**
```bash
$ touch ai/agents/ai-feature-planner.md
$ cat > ai/agents/ai-feature-planner.md << 'EOF'
# Feature Planner Agent

**Agent:** ai-feature-planner
...
EOF
```

**Step 2: Add to registry**
```bash
# Edit ai/registry.yml
agents:
  ...
  ai-feature-planner:
    file: ai-feature-planner.md
    capability-domain: feature-planning
    description: Plan features and break into stories
    token-budget: 5000
    context-dependencies:
      - business-advanced
      - technical-advanced
      - process-advanced
    shared-dependencies:
      - markdown-formatting-guide
      - agent-self-evaluation
    total-context-tokens: 12000
```

**Step 3: Update loading matrix** (if needed)
```yaml
loading-matrix:
  ai-feature-planner:
    business: advanced
    technical: advanced
    process: advanced
    context-files: [business-advanced, technical-advanced, process-advanced]
    total-tokens: 17000
```

**Step 4: Validate**
```bash
# Verify dependencies exist
$ yq '.agents.ai-feature-planner.context-dependencies[]' ai/registry.yml | while read dep; do
    yq ".context-files.$dep" ai/registry.yml > /dev/null && echo "✓ $dep exists" || echo "✗ $dep missing"
  done

# Check token budget
$ yq '.meta.token-budgets.grand-total' ai/registry.yml
# Should be under limit

# Verify file exists
$ ls -la ai/agents/ai-feature-planner.md
```

**Result:** New agent registered and ready to use

---

### Adding a New Context File

**Scenario:** Need to add deployment-specific context

**Step 1: Create context file**
```bash
$ touch ai/context/deployment-advanced.md
$ cat > ai/context/deployment-advanced.md << 'EOF'
# Deployment Advanced Context

**Level:** advanced
**Category:** deployment

## Content

### Deployment Strategies
...
EOF
```

**Step 2: Add to registry**
```yaml
context-files:
  ...
  deployment-advanced:
    file: deployment-advanced.md
    level: advanced
    category: deployment
    token-budget: 2500
    responsibility:
      must-contain:
        - deployment-strategies
        - infrastructure-considerations
        - rollout-patterns
      must-not-contain:
        - application-logic
        - business-domain-specifics
```

**Step 3: Add to agents that need it**
```yaml
agents:
  ai-deployment-manager:
    ...
    context-dependencies:
      - business-basic
      - technical-advanced
      - deployment-advanced  # NEW
    total-context-tokens: 10500  # UPDATED
```

**Step 4: Validate**
```bash
# Verify new context file exists
$ ls -la ai/context/deployment-advanced.md

# Check token budget still OK
$ yq '.meta.token-budgets.grand-total' ai/registry.yml

# Verify agent can load it
$ yq '.agents.ai-deployment-manager.context-dependencies[]' ai/registry.yml | grep deployment-advanced
```

**Result:** New context file available and integrated

---

### Adding a New Skill

**Scenario:** Need skill for validating Jira exports

**Step 1: Create skill directory**
```bash
$ mkdir -p ai/skills/guards/generic-validating-jira-exports-guard
```

**Step 2: Create SKILL.md**
```bash
$ cat > ai/skills/guards/generic-validating-jira-exports-guard/SKILL.md << 'EOF'
---
name: validating-jira-exports
description: Validates Jira CSV exports for required fields, correct format, and data integrity.
scope: generic
applicable-projects: any
---

# Validating Jira Exports
...
EOF
```

**Step 3: Create supporting files**
```bash
$ touch ai/skills/guards/generic-validating-jira-exports-guard/VALIDATION-RULES.md
$ touch ai/skills/guards/generic-validating-jira-exports-guard/EXAMPLES.md
```

**Step 4: Add to registry**
```yaml
skills:
  generic-validating-jira-exports-guard:
    file: generic-validating-jira-exports-guard/SKILL.md
    scope: generic
    type: guard
    token-budget: 2000
    description: Validates Jira CSV export files
    referenced-by:
      - ai-backlog-manager
```

**Step 5: Update agent if needed**
```yaml
agents:
  ai-backlog-manager:
    ...
    shared-dependencies:
      - ...
      - generic-validating-jira-exports-guard  # NEW
```

**Step 6: Auto-sync and validate**
```bash
# Skill auto-syncs to .claude/skills/ directory
# Verify sync happened
$ ls -la .claude/skills/generic-validating-jira-exports-guard/

# Run skill tests
$ python -m pytest tests/skills/ -k jira_export
```

**Result:** New skill available and integrated

---

## Impact Analysis Examples

### Example 1: Consolidating Context Files

**Before:**
```yaml
context-files:
  technical-basic: 1500 tokens
  technical-advanced: 4500 tokens
  technical-deep: 3500 tokens
```

**Question:** Should we consolidate?

**Analysis:**
```
Total: 9500 tokens in 3 files
If merged: ~7500 tokens (remove duplication)
Savings: ~2000 tokens (21% reduction)

But: Deep knowledge might not always be needed
Decision: KEEP SEPARATE (progressive disclosure benefits worth more than token savings)
```

---

### Example 2: Adding New Skill

**Before:**
```yaml
total-skills: 20
grand-total-tokens: 85000
```

**Adding:** validating-jira-exports (2000 tokens)

**After:**
```yaml
total-skills: 21
grand-total-tokens: 87000
```

**Impact:**
- Skills increased by 5%
- Tokens increased by 2.4%
- Well within budget limits ✓

---

### Example 3: Removing Unused Context

**Analysis:**
```bash
# Find unused context file
$ grep -r "reporting-advanced" ai/agents/ | wc -l
0  # No agents use it!

# Check registry
$ yq '.context-files.reporting-advanced' ai/registry.yml
{ file: reporting-advanced.md, token-budget: 2000 }
```

**Decision:** Remove unused context file

**Steps:**
1. Delete: ai/context/reporting-advanced.md
2. Update registry: Remove entry
3. Run validation: Ensure no references remain
4. Commit: "Remove unused reporting-advanced context"

**Result:**
```
Tokens saved: 2000 (2.3% reduction)
Framework cleaner and more maintainable
```

---

## References

- **[ROUTES-REGISTRY-DESIGN.md](ROUTES-REGISTRY-DESIGN.md)** - Complete design rationale
- **[BEST-PRACTICES.md](BEST-PRACTICES.md)** - Maintenance and optimization
- **[SKILL.md](SKILL.md)** - Quick reference and overview
- **routes.yml** - Your project's navigation map
- **registry.yml** - Your project's metadata catalog

---

**Examples Version:** 1.0
**Last Updated:** 2025-12-07
