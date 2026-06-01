# Best Practices for Routes/Registry Architecture

**How to Maintain, Evolve, and Optimize Framework Navigation & Metadata**

---

## Routes.yml Best Practices

### Structure & Organization

**DO:**
- ✅ Keep flat, simple structure with key-value pairs
- ✅ Group related paths under logical categories
- ✅ Use descriptive key names (e.g., `agents`, `context`, `skills-meta`)
- ✅ Include only essential paths (no deep nesting >4 levels)
- ✅ Separate metadata from paths (no descriptions here)

**DON'T:**
- ❌ Add metadata (descriptions, purposes, tokens)
- ❌ Add relationships (dependencies, loading info)
- ❌ Add validation rules
- ❌ Create deeply nested structures
- ❌ Duplicate path information
- ❌ Store computed values

### Example: Good routes.yml Structure
```yaml
entry-points:
  ai-guide: README.md
  human-guide: README.md

paths:
  ai:
    root: ai/
    agents: ai/agents/
    context: ai/context/
    skills: ai/skills/

  backlog:
    root: backlog/
    _workflow: backlog/_workflow/
    tickets: backlog/tickets/

registry: ai/registry.yml
```

**Why This Works:**
- Grouped by category (entry-points, paths)
- Consistent naming (all lowercase, hyphens)
- Simple structure (easy to parse)
- No metadata mixed in
- Points to registry for detailed info

### Updating routes.yml

**When to Update:**
- New top-level folder added to project
- Major reorganization of folder structure
- New entry points created
- Registry location changes

**How to Update (if automation available):**
```bash
# Use automated script/tool to sync
python src/framework/update_routes.py --apply

# Or manually edit following patterns above
```

**Manual Update Guidelines:**
1. Keep consistent formatting
2. Maintain alphabetical order within groups
3. Use simple key names (no spaces, hyphens only)
4. Validate YAML syntax after changes
5. Test with tools that read routes.yml

---

## Registry.yml Best Practices

### Structure & Organization

**DO:**
- ✅ Include complete metadata for each component
- ✅ Define all dependencies explicitly
- ✅ Use clear responsibility boundaries
- ✅ Maintain single source of truth
- ✅ Version metadata schema
- ✅ Keep metadata close to related data

**DON'T:**
- ❌ Include file paths (those go in routes.yml)
- ❌ Duplicate metadata across sections
- ❌ Skip validation rules or enforcement
- ❌ Mix metadata for different concerns
- ❌ Leave optional fields undefined

### Component Entry: Good Example
```yaml
ai-architect:
  file: ai-architect.md                    # Just filename
  capability-domain: architecture-design
  description: Design system architecture
  token-budget: 4500
  context-dependencies:
    - business-advanced
    - technical-advanced
    - process-basic
  shared-dependencies:
    - markdown-formatting-guide
    - agent-self-evaluation
  total-context-tokens: 9800
```

**Why This Works:**
- Complete metadata in one place
- Dependencies explicit and verifiable
- File reference minimal (no path)
- Token budgets tracked
- Clear responsibility boundaries

### Adding New Components

**Process:**
1. Identify component type (agent, context, skill, etc.)
2. Add entry to appropriate section in registry
3. Define all required metadata fields
4. Add to any applicable loading matrices
5. Validate dependencies exist
6. Verify token budgets
7. Update metadata totals/counts

**Template: New Agent**
```yaml
agents:
  ai-new-capability:
    file: ai-new-capability.md
    capability-domain: [domain]
    description: [one-line description]
    token-budget: [token count]
    context-dependencies:
      - [context-file-id]
    shared-dependencies:
      - [shared-resource-id]
    total-context-tokens: [sum of context tokens]
```

**Template: New Context File**
```yaml
context-files:
  category-level-id:
    file: category-level-id.md
    level: [basic|advanced]
    category: [category-name]
    token-budget: [token count]
    responsibility:
      must-contain:
        - [required content]
      must-not-contain:
        - [prohibited content]
```

### Updating Registry

**When to Update:**
- New component added (agent, context, skill, etc.)
- Component metadata changed (description, tokens, etc.)
- Dependencies changed
- Validation rules updated
- Responsibility boundaries clarified

**Update Workflow:**
1. Identify what changed
2. Find relevant section in registry
3. Update metadata for affected component
4. Recalculate totals (token budgets, counts)
5. Update loading matrices if dependencies changed
6. Validate against enforcement rules
7. Verify all references still valid

### Validation Best Practices

**Always Verify:**
- [ ] All dependencies exist in same registry
- [ ] Token budgets don't exceed limits
- [ ] File references in `file:` field are correct
- [ ] No circular dependencies
- [ ] Metadata schema matches defined structure
- [ ] IDs use consistent naming (kebab-case)

---

## Token Budget Management

### Tracking Token Usage

**Best Practice:**
- Record actual token count for each component
- Sum tokens for loading scenarios
- Maintain total budget limits
- Review periodically (monthly or per release)

**Example: Agent Loading Scenario**
```
Scenario: Load ai-architect with full context

Components:
  agent (ai-architect.md):           4,500 tokens
  context (business-advanced.md):    3,500 tokens
  context (technical-advanced.md):   4,500 tokens
  context (process-basic.md):        1,500 tokens
  shared (markdown-formatting):        250 tokens
                                    ─────────────
  Total:                            14,250 tokens
```

### Optimization Strategies

**When tokens exceed budget:**

1. **Identify Large Components**
   - Which context files use most tokens?
   - Which agents have largest budgets?
   - What's essential vs. optional?

2. **Apply Progressive Disclosure**
   - Move detailed content to supporting files
   - Keep main files focused and concise
   - Load details only when needed

3. **Extract Shared Resources**
   - Find duplicated content (3+ locations)
   - Move to shared resource file
   - Reference from multiple places
   - Reduces overall tokens

4. **Consolidate Overlapping Content**
   - Merge similar context files
   - Combine low-usage components
   - Remove redundant information

---

## Maintenance Workflows

### Monthly Health Check

**Verify:**
- [ ] All paths in routes.yml exist
- [ ] All files referenced in registry exist
- [ ] No broken internal links
- [ ] Token budgets accurate
- [ ] Dependencies still valid
- [ ] Metadata complete and current

**Run Validations:**
```bash
# Check routes.yml against filesystem
python src/framework/update_routes.py --validate-only

# Verify registry integrity
# (custom script or manual review)

# Check for missing files
# (filesystem audit)
```

### Quarterly Review

**Evaluate:**
- [ ] Token budget trends (growing too fast?)
- [ ] Component organization (still logical?)
- [ ] Dependency patterns (any tangles?)
- [ ] Documentation accuracy
- [ ] Naming consistency

**Consider:**
- Should any components be split?
- Should any components be merged?
- Are there new patterns emerging?
- Should governance rules be updated?

### Refactoring Workflow

**When making significant changes:**

1. **Document Current State**
   - Create proposal/RFC file
   - Show before/after structure
   - Identify affected components

2. **Validate Plan**
   - Check no circular dependencies
   - Verify token budgets will improve or stay same
   - Identify all files to update

3. **Implement Systematically**
   - Update routes.yml first (if structure changed)
   - Update registry.yml second (if dependencies changed)
   - Update agent files third (if references changed)
   - Verify all updates together

4. **Comprehensive Testing**
   - Run all validation checks
   - Test loading scenarios
   - Verify agent behavior unchanged
   - Check all links work

5. **Document Changes**
   - Record why refactoring was done
   - Note performance improvements
   - Update governance docs if rules changed

---

## Common Patterns to Maintain

### Pattern 1: Parallel Organization
```
routes.yml structure matches registry sections:

routes.yml:              registry.yml:
  paths:
    ai:                    agents: [...]
      agents: ...          context-files: [...]
      context: ...         shared-resources: [...]
      skills: ...          skills: [...]
```

**Benefit:** Easy to correlate between files

---

### Pattern 2: Complete Metadata
```
Every component has:
  - ID (kebab-case)
  - File location (relative path)
  - Description (what it does)
  - Token budget (token count)
  - Dependencies (if any)
  - Relationships (if any)

No missing fields!
```

**Benefit:** Complete information for validation and loading

---

### Pattern 3: Single Source Per Concern
```
Where Does Information Live?

File location?          → routes.yml
What is this component? → registry.yml
How to load it?         → registry.yml (via loading-matrix)
When to use it?         → agent/context file itself
```

**Benefit:** No duplication, clear ownership

---

## Troubleshooting Common Issues

### Issue: Routes/Registry Out of Sync

**Symptoms:**
- Tool can't find file (wrong path in routes)
- Registry references non-existent dependency
- Metadata doesn't match actual file

**Fix:**
1. Identify what's out of sync
2. Determine ground truth (file or metadata?)
3. Update the other to match
4. Run validation to confirm
5. Commit as "fix: sync routes/registry"

### Issue: Token Budget Exceeded

**Symptoms:**
- Total tokens > limit
- Loading scenario fails
- Agent can't load full context

**Fix:**
1. Calculate current total tokens
2. Identify what can be optimized
3. Apply progressive disclosure
4. Extract shared resources if needed
5. Re-test and update registry

### Issue: Broken Dependency Reference

**Symptoms:**
- Agent can't find context file
- Validation fails
- Loading breaks

**Fix:**
1. Verify context file exists in registry
2. Check file exists on disk
3. Verify path correct in routes.yml
4. Ensure context-dependencies IDs match
5. Update registry or create missing file

---

## References

- **routes.yml** - Your project's navigation map
- **registry.yml** - Your project's metadata catalog
- **Skill: Understanding Framework Architecture** - Design rationale and patterns
- **Governance Rules** - Framework enforcement standards

---

**Best Practices Version:** 2.0
**Last Updated:** 2025-12-07
