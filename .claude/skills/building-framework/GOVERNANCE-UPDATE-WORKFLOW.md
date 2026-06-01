# Governance Update Workflow

Workflow for updating framework governance rules in v12.0.

---

## When to Update Governance

Update governance when:
- New architectural patterns adopted
- Enforcement rules need adjustment
- Validation requirements change
- Token budget targets shift
- Discovery-driven patterns evolve

---

## Step 1: Identify Governance Changes

**Questions to answer:**
- What rule needs updating?
- Why is it changing?
- What's the impact on discovery system?
- Does it affect capability-needs patterns?

---

## Step 2: Update Governance Documentation

**Primary location:** This skill (`building-framework`)

**Update supporting files:**
- GOVERNANCE-RULES.md - Main rules
- DECISION-TREES.md - Decision frameworks
- EXAMPLES.md - Correct/incorrect patterns

**Document for each rule:**
- Principle statement
- Validation approach
- Severity level (Critical/High/Medium)
- Examples showing correct/incorrect patterns

---

## Step 3: Update JSON Schemas (if structural changes)

**If rule affects agent structure:**
```bash
# Update agent schema
vi ai/registries/schemas/agent.schema.json

# Validate schema is valid JSON Schema
python3 -m jsonschema --help
```

**If rule affects skill structure:**
```bash
vi ai/registries/schemas/skill.schema.json
```

**If rule affects discovery:**
```bash
vi ai/registries/schemas/discovery-map.schema.json
```

---

## Step 4: Update Registries (if metadata changes)

**If capability naming changes:**
```bash
vi ai/registries/discovery-map.json
```

**If enforcement affects agents:**
```bash
vi ai/registries/agents.json
```

**If enforcement affects skills:**
```bash
vi ai/registries/skills.json
```

**Run schema validation after changes:**
```bash
agentic-framework validate
```

---

## Step 5: Communicate Changes

**Update affected agents:**
- Add new patterns to agent workflows
- Update references to governance rules

**Update README.md:**
- If user-facing governance change

**Update CLAUDE.md:**
- If affects framework usage

---

## Step 6: Validate

**Run schema validation on all registries:**
```bash
agentic-framework validate
```

**Test enforcement workflow:**
- Create test case that should pass
- Create test case that should fail
- Verify enforcement catches violations

**Ensure rules are clear and enforceable.**

---

## Governance Rule Template

When adding a new rule, use this template:

```markdown
### Rule N: {Rule Name}

**Principle:** {Clear statement of the rule}

**Rationale:** {Why this rule exists}

**Validation:**
- What to check
- How to check it
- Automated validation (if available)

**Severity:** Critical | High | Medium

**Examples:**

**Correct:**
```
{Example of correct pattern}
```

**Incorrect:**
```
{Example of incorrect pattern}
```

**Enforcement:** {How this is enforced - schema, pre-commit hook, manual review}
```

---

## Validation Checklist

- [ ] Rule clearly documented in GOVERNANCE-RULES.md
- [ ] Examples added showing correct/incorrect patterns
- [ ] JSON schemas updated (if structural change)
- [ ] Registries updated (if metadata change)
- [ ] Discovery Engine validation passes
- [ ] Affected agents updated with new patterns
- [ ] README.md updated (if user-facing)
- [ ] CLAUDE.md updated (if affects framework usage)
- [ ] Test cases pass (enforcement works)

---

**Version:** 1.0.0
**Last Updated:** 2025-12-15
