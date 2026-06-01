# Agent Validation Checklist

Complete validation process for ensuring agents meet design standards.

---

## Pre-Validation: Gather Metrics

Before validation, collect these metrics:

```bash
# Line count
wc -l ai/agents/ai-{name}.md

# Token estimate (rough: lines × 5.5)
echo "Estimated tokens: $(( $(wc -l < ai/agents/ai-{name}.md) * 55 / 10 ))"

# File size
ls -la ai/agents/ai-{name}.md
```

**Record:**
- [ ] Total lines: ____
- [ ] Estimated tokens: ____
- [ ] File size: ____ bytes

---

## Stage 1: Size Validation

### 1.1 Line Count Check

| Status | Criteria |
|--------|----------|
| PASS | < 500 lines |
| WARNING | 500-700 lines |
| FAIL | > 700 lines |

**Current:** ____ lines → Status: ____

### 1.2 Token Budget Check

| Status | Criteria |
|--------|----------|
| PASS | < 3,000 tokens |
| WARNING | 3,000-4,000 tokens |
| FAIL | > 4,000 tokens |

**Current:** ____ tokens → Status: ____

### 1.3 Budget Alignment

Compare against declared `token-budget` in YAML frontmatter:

- [ ] Actual tokens ≤ declared budget
- [ ] Declared budget ≤ 3,000 (standard)

---

## Stage 2: Duplication Detection

### 2.1 Cross-Agent Duplication

Search for content that exists in other agents:

```bash
# Find similar content patterns
for agent in ai/agents/ai-*.md; do
  echo "=== $agent ==="
  grep -c "## MCP\|## Discovery\|## Registry\|## Version" "$agent"
done
```

**Check each section > 50 lines:**
- [ ] Section 1: ____ - Exists in other agent? Y/N
- [ ] Section 2: ____ - Exists in other agent? Y/N
- [ ] Section 3: ____ - Exists in other agent? Y/N

### 2.2 Skill Duplication

Search for content that exists in skills:

```bash
# Check if content exists in skills
grep -r "## MCP Tools" ai/skills/
grep -r "## Discovery" ai/skills/
```

**Check each major section:**
- [ ] MCP content: Duplicated from skill? Y/N
- [ ] Architecture content: Duplicated from skill? Y/N
- [ ] Workflow content: Duplicated from skill? Y/N

### 2.3 Duplication Percentage

Calculate: `(duplicated lines / total lines) × 100`

| Status | Criteria |
|--------|----------|
| PASS | 0% duplicated |
| WARNING | 1-10% duplicated |
| FAIL | > 10% duplicated |

**Current:** ____% → Status: ____

---

## Stage 3: Content Classification

### 3.1 Section Audit

For each major section (> 20 lines), classify:

| Section | Lines | Type | Correct Location? |
|---------|-------|------|-------------------|
| Purpose | | Agent orchestration | YES |
| Skill Routing | | Agent orchestration | YES |
| {Section 3} | | ? | ? |
| {Section 4} | | ? | ? |
| {Section 5} | | ? | ? |

**Content types:**
- **Agent orchestration** → Should be in agent
- **Reusable workflow** → Should be in skill
- **Examples/templates** → Should be in skill supporting file

### 3.2 Agent-Specific Percentage

Calculate: `(agent-specific lines / total lines) × 100`

| Status | Criteria |
|--------|----------|
| PASS | > 90% agent-specific |
| WARNING | 70-90% agent-specific |
| FAIL | < 70% agent-specific |

**Current:** ____% → Status: ____

---

## Stage 4: Structure Validation

### 4.1 Required Sections

- [ ] YAML frontmatter with all required fields
- [ ] Purpose section with core responsibilities
- [ ] Skill routing table (or equivalent)
- [ ] Success criteria section
- [ ] Self-evaluation section
- [ ] Footer with version/metadata

### 4.2 YAML Frontmatter Fields

- [ ] `agent:` - Valid agent ID
- [ ] `role:` - Human-readable role
- [ ] `capability-needs:` - Array of capabilities
- [ ] `token-budget:` - Within limits (< 3000)

### 4.3 Section Ordering

Recommended order:
1. [ ] Title and purpose
2. [ ] Auto-discovery note
3. [ ] Skill routing table
4. [ ] Agent-specific tasks
5. [ ] Success criteria
6. [ ] Self-evaluation
7. [ ] Footer/metadata

---

## Stage 5: Discovery Integration

### 5.1 Capability-Needs Resolution

Run discovery test:

```bash
agentic-framework validate --verbose
```

**Check:**
- [ ] All capability-needs resolve to skills
- [ ] No "missing capability" errors
- [ ] Discovered skills match expected

### 5.2 Registry Alignment

**Check agents.json:**
- [ ] Agent entry exists
- [ ] `capability-needs` matches YAML frontmatter
- [ ] `token-budget` matches YAML frontmatter

---

## Stage 6: Link Validation

Run link validator:

```bash
agentic-framework validate --links
```

**Check:**
- [ ] All internal links resolve
- [ ] All skill references valid
- [ ] No broken anchors

---

## Stage 7: Functional Testing

### 7.1 Task Coverage

For each task type the agent handles:
- [ ] Task 1: Can route to correct skill? Y/N
- [ ] Task 2: Can route to correct skill? Y/N
- [ ] Task 3: Can route to correct skill? Y/N

### 7.2 Real Scenario Test

Test with actual use case:

1. Invoke agent with realistic task
2. Verify skill auto-discovery works
3. Verify task completion

**Result:** ____

---

## Validation Summary

### Pass/Fail Criteria

| Stage | Status | Notes |
|-------|--------|-------|
| Size | ____ | Lines: ____, Tokens: ____ |
| Duplication | ____ | ____% duplicated |
| Classification | ____ | ____% agent-specific |
| Structure | ____ | Missing: ____ |
| Discovery | ____ | Issues: ____ |
| Links | ____ | Broken: ____ |
| Functional | ____ | Issues: ____ |

### Overall Result

- [ ] **PASS** - All stages pass
- [ ] **PASS WITH WARNINGS** - Minor issues, can proceed
- [ ] **FAIL** - Must address issues before commit

### Action Items

If not passing, list required fixes:

1. ____
2. ____
3. ____

---

## Quick Validation (Abbreviated)

For quick checks, use this abbreviated version:

```bash
# 1. Size check
wc -l ai/agents/ai-{name}.md  # Must be < 500

# 2. Discovery check
agentic-framework validate --verbose

# 3. Link check
agentic-framework validate --links

# 4. Visual inspection
# - Has skill routing table?
# - Has success criteria?
# - Has self-evaluation?
```

**Quick pass criteria:**
- [ ] < 500 lines
- [ ] Discovery passes
- [ ] Links valid
- [ ] Required sections present

---

**Version:** 1.0.0
**Last Updated:** 2025-12-15
