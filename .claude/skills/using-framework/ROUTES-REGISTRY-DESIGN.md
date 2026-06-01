# Routes vs Registry: Architecture Design Pattern

**Complete Design Rationale, Workflow Examples, and Best Practices**

---

## Overview

The routes/registry separation is a fundamental **framework architecture pattern** that improves maintainability by splitting concerns:

1. **`routes.yml`** - Filesystem navigation map ("where things live")
2. **`registry.yml`** - Consolidated metadata catalog ("what things are + how they relate")

This follows the **Single Responsibility Principle** and scales better as frameworks grow.

---

## Routes (Navigation Map)

### Purpose
Pure filesystem navigation - tells tools where to find directories and files.

### Scope
- Directory paths
- File locations
- Registry location pointer
- Entry points

### Example
```yaml
# Where things live
paths:
  ai:
    root: ai/
    agents: ai/agents/
    context: ai/context/

# Where metadata lives
registry: ai/registry.yml
```

### Use Cases
- Tool discovers framework structure
- Developer navigates to specific areas
- Scripts find configuration files
- Build systems locate resources
- Path validation and verification

### What It Does NOT Contain
- ❌ Metadata (descriptions, token budgets)
- ❌ Relationships (dependencies, loading rules)
- ❌ Validation rules
- ❌ Use cases or purposes

### Key Characteristics
- **Format:** Simple YAML with key-value pairs
- **Size:** Grows with folders added, not metadata
- **Update Frequency:** Changes when folder structure changes
- **Audience:** Tools, scripts, developers finding files

---

## Registry (Metadata Catalog)

### Purpose
Catalog of components with full metadata, dependencies, and validation rules.

### Scope
- Component IDs and descriptions
- Token budgets and costs
- Dependencies (context, resources, scripts)
- Relationships (agent → context loading matrix)
- Validation rules and enforcement
- Workflow definitions
- Use cases and capabilities

### Example
```yaml
# What things are + how they relate
agents:
  ai-architect:
    file: ai-architect.md
    token-budget: 4500
    context-dependencies:
      - business-advanced
      - technical-advanced
      - process-basic
    total-context-tokens: 9800
    capability-domain: architecture-design
```

### Use Cases
- System loads agent with correct context
- CI validates dependencies exist
- Framework manager tracks token budgets
- Documentation auto-generates from metadata
- Dependency analysis and impact assessment

### What It Does NOT Contain
- ❌ File paths (use routes.yml)
- ❌ Directory structure
- ❌ Pure navigation information

### Key Characteristics
- **Format:** Structured YAML with full metadata
- **Size:** Grows with metadata detail, not just component count
- **Update Frequency:** Changes when components added or metadata changes
- **Audience:** Agents, systems, automation

---

## How They Work Together: Complete Workflow

### Workflow Example: Loading an Agent with Context

**Step 1: Discover Structure** (routes.yml)
```yaml
# Tool reads routes.yml
paths:
  ai:
    agents: ai/agents/
    context: ai/context/

registry: ai/registry.yml
```
**What we learned:** Where folders are located

---

**Step 2: Load Agent Metadata** (ai/registry.yml)
```yaml
# Tool reads ai/registry.yml
agents:
  ai-architect:
    file: ai-architect.md
    token-budget: 4500
    context-dependencies:
      - business-advanced
      - technical-advanced
      - process-basic
    total-context-tokens: 9800
```
**What we learned:** What agent to load and what context it needs

---

**Step 3: Resolve Context Requirements** (ai/registry.yml)
```yaml
# Same registry tells us what context to load
context-files:
  business-advanced:
    file: business-advanced.md
    token-budget: 3500
  technical-advanced:
    file: technical-advanced.md
    token-budget: 4500
  process-basic:
    file: process-basic.md
    token-budget: 1500
```
**What we learned:** Which context files to load and their sizes

---

**Step 4: Build Agent Prompt**
```
Load agent from:     ai/agents/ai-architect.md (from routes.yml + registry)
Load context from:
  - ai/context/business-advanced.md (4500 tokens)
  - ai/context/technical-advanced.md (3500 tokens)
  - ai/context/process-basic.md (1500 tokens)

Total tokens: 4500 (agent) + 9800 (context) = 14300
```

---

## Design Rationale: Why Separate?

### Before (Mixed Concerns)

**Problem:** Old `routes.yml` mixed navigation with metadata
```yaml
# Old routes.yml (mixed concerns)
agents:
  - id: ai-architect
    path: ai/agents/ai-architect.md      # navigation
    description: Design architecture      # metadata
    token-budget: 4500                    # metadata
    context:                              # relationships
      - business-advanced
```

**Issues:**
- ❌ Mixed navigation with configuration
- ❌ Hard to extract just paths
- ❌ Difficult to validate metadata separately
- ❌ Duplication across multiple files
- ❌ Hard to change one without affecting the other

---

### After (Separated Concerns)

**Solution:** Two files with clear responsibilities
```yaml
# routes.yml (navigation only)
paths:
  ai:
    agents: ai/agents/

registry: ai/registry.yml

# ai/registry.yml (metadata only)
agents:
  ai-architect:
    file: ai-architect.md
    token-budget: 4500
    context-dependencies:
      - business-advanced
```

**Benefits:**
- ✅ Clear separation of concerns
- ✅ Easy to find file locations (no metadata parsing)
- ✅ Easy to validate metadata (no path tangling)
- ✅ Single source per area
- ✅ Scalable structure (grows independently)
- ✅ Different update frequencies
- ✅ Different audiences (tools vs systems)

---

## Migration History

### v4.0: Vendor Neutral (Original)
```
routes.yml (root + each directory)
├── Mixed navigation and metadata
├── Duplicated across multiple files
└── Hard to maintain consistency
```

### v4.1: Routes/Registry Split (First Improvement)
```
routes.yml (root only)      - navigation
5 × registry.yml files      - metadata
├── Clear separation
├── Some duplication between registries
└── No single source of truth
```

### v4.2: Single Registry Consolidation (Current)
```
routes.yml (root only)      - navigation
1 × registry.yml (ai/)      - all metadata
├── Single source of truth
├── Zero duplication
├── Easy to validate
└── 54% token reduction from v4.1
```

---

## Best Practices for Maintaining Routes/Registry

### Routes.yml Best Practices

**DO:**
- ✅ Keep flat structure (just paths)
- ✅ Use simple key-value pairs
- ✅ Point to registries
- ✅ Update only when adding new top-level areas
- ✅ Use tools to auto-update when possible (scripts, file system watchers)

**DON'T:**
- ❌ Add metadata (descriptions, use-cases)
- ❌ Add relationships (dependencies)
- ❌ Add validation rules
- ❌ Duplicate path information
- ❌ Manually edit if automation available

---

### Registry.yml Best Practices

**DO:**
- ✅ Include complete metadata for all components
- ✅ Define all dependencies explicitly
- ✅ Document validation rules clearly
- ✅ Maintain single source per area
- ✅ Use kebab-case for all IDs

**DON'T:**
- ❌ Include file paths (use routes.yml)
- ❌ Duplicate metadata across files
- ❌ Skip validation rules
- ❌ Mix multiple domains in one registry
- ❌ Store paths that might change

---

## Common Patterns

### Pattern 1: Tool Discovers Structure
```
Tool reads routes.yml → Found ai/agents/ path
Tool uses path → Loads from ai/agents/
Result: Fast discovery, no metadata parsing
```

### Pattern 2: System Understands Relationships
```
System reads registry → Found ai-architect context-dependencies
System loads each dependency → Builds full prompt
Result: Complete understanding of relationships
```

### Pattern 3: Validation Workflow
```
1. Read routes.yml to find registry location
2. Read registry to get agent metadata
3. Validate each context-dependency exists in same registry
4. Check token budgets under limits
5. Verify files exist at expected paths from routes.yml
Result: Comprehensive validation
```

---

## Adding New Components

### Adding a New Agent

**1. Update Registry** (`ai/registry.yml`)
```yaml
agents:
  ai-new-agent:
    file: ai-new-agent.md
    token-budget: 5000
    context-dependencies:
      - business-basic
      - technical-advanced
    total-context-tokens: 7300
```

**2. Create Agent File**
```bash
# routes.yml tells us: paths.ai.agents = ai/agents/
touch ai/agents/ai-new-agent.md
```

**3. Validation Automatically Works**
- CI reads consolidated registry
- Validates context-dependencies exist
- Checks token budget under limits
- Verifies file exists at expected path

**Note:** NO need to update routes.yml! (paths don't change)

---

### Adding a New Context File

**1. Update Registry** (`ai/registry.yml`)
```yaml
context-files:
  deployment-basic:
    file: deployment-basic.md
    level: basic
    category: deployment
    token-budget: 1200
    responsibility:
      must-contain:
        - ci-cd-pipeline
        - deployment-strategy
```

**2. Create Context File**
```bash
touch ai/context/deployment-basic.md
```

**3. Update Loading Matrix** (in same registry)
```yaml
loading-matrix:
  ai-deployment-manager:
    deployment: basic
    context-files: [business-basic, technical-advanced, deployment-basic]
    total-tokens: 9000
```

---

## Validation Examples

### Example: Validate Agent Dependencies

```bash
# 1. Read routes.yml to find registry
REGISTRY=$(yq '.registry' routes.yml)
# => ai/registry.yml

# 2. Read agent metadata to get dependencies
AGENT_ID="ai-architect"
CONTEXT_DEPS=$(yq ".agents.$AGENT_ID.context-dependencies[]" $REGISTRY)

# 3. Validate each dependency exists in same registry
for dep in $CONTEXT_DEPS; do
  yq ".context-files.$dep" $REGISTRY || echo "ERROR: Missing $dep"
done
```

### Example: Calculate Total Token Budget

```bash
# 1. Find the registry
REGISTRY=$(yq '.registry' routes.yml)
# => ai/registry.yml

# 2. Get totals from registry metadata
AGENT_TOKENS=$(yq '.meta.token-budgets.total-agent-tokens' $REGISTRY)
CONTEXT_TOKENS=$(yq '.meta.token-budgets.total-context-tokens' $REGISTRY)
SHARED_TOKENS=$(yq '.meta.token-budgets.total-shared-tokens' $REGISTRY)
GRAND_TOTAL=$(yq '.meta.token-budgets.grand-total' $REGISTRY)

echo "Total framework tokens: $GRAND_TOTAL"
echo "  Agents: $AGENT_TOKENS"
echo "  Context: $CONTEXT_TOKENS"
echo "  Shared: $SHARED_TOKENS"
```

---

## Summary Table

| Aspect | routes.yml | registry.yml |
|--------|------------|--------------|
| **Purpose** | Navigation | Configuration |
| **Scope** | Filesystem paths | Component metadata |
| **Count** | 1 (root only) | 1 (consolidated) |
| **Contains** | Directories, files, entry points | IDs, descriptions, dependencies, rules |
| **Use** | Finding locations | Understanding relationships |
| **Updated When** | New top-level area added | New component added or metadata changes |
| **Validation** | Path existence | Dependency resolution, schema compliance |
| **Tool Usage** | Discovery, navigation | Loading, validation, analysis |
| **Update Frequency** | Rarely | Often (metadata changes frequently) |
| **Audience** | Tools, developers, scripts | Agents, systems, automation |

---

**Version:** 2.0 (Current - v11.1)
**Pattern:** Framework Architecture - Routes/Registry Separation
**Applicable to:** Any project organizing framework structure
**Last Updated:** 2025-12-07
