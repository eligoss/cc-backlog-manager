# Validating Links - Real-World Examples

## Example 1: Framework Documentation (APM-R)

**Scenario:** Check ai/context/*.md files for broken links after refactoring file structure.

**Before:** Multiple broken links after moving files from old-structure/ to new locations

**Initial State:**
```markdown
# ai/context/business-advanced.md

[Technical Patterns](../shared/technical-patterns.md)  ❌ File moved
[Agents Overview](../agents/README.md)                 ❌ File doesn't exist
[Registry Guide](#registry-reference)                  ❌ Heading not found
[External](https://example.com/docs)                   ✅ Valid
```

**Validation Process:**

Step 1: Collect files
```bash
Directory: ai/context/
Pattern: *.md
Total files: 12
Total links found: 47
```

Step 2: Validate each link
```
business-advanced.md (47 lines, 8 links)
  Line 12: [Technical Patterns](../shared/technical-patterns.md)
    Type: File link
    Status: ❌ BROKEN - File not found
    Actual location: ../context/technical-advanced.md

  Line 18: [Agents Overview](../agents/README.md)
    Type: File link
    Status: ❌ BROKEN - File not found
    Note: agents/ directory exists but no README.md
    Fix: Update to relative link to correct agent file

  Line 45: [Registry Guide](#registry-reference)
    Type: Anchor link
    Status: ❌ BROKEN - Anchor not found
    Available anchors: #overview #schema #validation
    Fix: Use #schema or #validation instead
```

Step 3: Error Report
```
FILE: ai/context/business-advanced.md
  Total lines: 47
  Total links: 8
  Valid: 5 ✅
  Broken: 3 ❌

  BROKEN LINKS (3):

  1. Line 12: [Technical Patterns](../shared/technical-patterns.md)
     Error: File not found
     Expected at: ai/shared/technical-patterns.md
     Actual location: ai/context/technical-advanced.md
     Fix suggestion: Change to [Technical Patterns](technical-advanced.md)

  2. Line 18: [Agents Overview](../agents/README.md)
     Error: File not found
     Expected at: ai/agents/README.md
     Note: Directory exists but file missing
     Fix suggestion: Link to specific agent (ai/agents/ai-architect.md)

  3. Line 45: [Registry Guide](#registry-reference)
     Error: Anchor not found in current file
     Available anchors: #overview #schema #validation
     Fix suggestion: Change to [Registry Guide](#schema)
```

**Applied Fixes:**
```markdown
# BEFORE
[Technical Patterns](../shared/technical-patterns.md)  ❌
[Agents Overview](../agents/README.md)                 ❌
[Registry Guide](#registry-reference)                  ❌

# AFTER
[Technical Patterns](technical-advanced.md)            ✅
[Agents Overview](ai-architect.md)                     ✅
[Registry Guide](#schema)                              ✅
```

**Re-validation Results:**
```
FILE: ai/context/business-advanced.md
  Valid links: 8/8 ✅
  Status: PASSED
```

---

## Example 2: Relative Path Navigation

**Scenario:** Complex relative paths need validation from multiple levels.

**Test Case:**
```
Directory structure:
├── docs/
│   └── api/
│       └── getting-started.md (File A)
├── ai/
│   ├── agents/
│   │   └── ai-architect.md (File B)
│   └── context/
│       └── technical-basic.md (File C)
└── README.md (File D)
```

**Link Validation Examples:**

**From docs/api/getting-started.md:**
```markdown
[Root README](../../README.md)
  Navigation: docs/api/ → .. → docs/ → .. → root
  Result: ✅ Resolves to ./README.md

[Architect Agent](../../ai/agents/ai-architect.md)
  Navigation: docs/api/ → .. → docs/ → .. → root → ai/agents/ai-architect.md
  Result: ✅ Valid

[Technical Context](../../ai/context/technical-basic.md)
  Navigation: docs/api/ → .. → docs/ → .. → root → ai/context/technical-basic.md
  Result: ✅ Valid

[Same directory file](./api-reference.md)
  Navigation: docs/api/ → api-reference.md
  Result: ❌ Not found (file doesn't exist)
  Fix: File is actually ../reference.md or ../api-reference.md
```

**From ai/agents/ai-architect.md:**
```markdown
[Root README](../../README.md)
  Navigation: ai/agents/ → .. → ai/ → .. → root → README.md
  Result: ✅ Valid

[Technical Context](../context/technical-basic.md)
  Navigation: ai/agents/ → .. → ai/context/technical-basic.md
  Result: ✅ Valid

[API Getting Started](../../docs/api/getting-started.md)
  Navigation: ai/agents/ → .. → ai/ → .. → root → docs/api/getting-started.md
  Result: ✅ Valid
```

---

## Example 3: Anchor/Heading Link Validation

**Scenario:** Validate anchor links match actual section headings.

**File: framework-governance.md**
```markdown
# Overview
## Phase Descriptions
### Phase 1A: Meta-Skills
### Phase 1B: Infrastructure
## Implementation Timeline
### Week 1
### Week 2
```

**Links to Validate:**
```markdown
[Back to overview](#overview)
  Pattern: Heading match "# Overview"
  Expected anchor: #overview
  Result: ✅ Valid

[Phase 1A Details](#phase-1a-meta-skills)
  Pattern: Heading match "### Phase 1A: Meta-Skills"
  GitHub markdown: Spaces→hyphens, lowercase
  Expected anchor: #phase-1a-meta-skills
  Result: ✅ Valid

[Timeline](#timeline)
  Pattern: NO heading matches "Timeline"
  Available: #overview #phase-descriptions #implementation-timeline
  Result: ❌ Broken
  Fix suggestion: Change to [Timeline](#implementation-timeline)

[Week Planning](#week-1)
  Pattern: Heading "### Week 1" exists
  Anchor format: ### → #week-1
  Result: ✅ Valid
```

---

## Example 4: External URL Validation

**Scenario:** Check external links for proper format (protocol, domain, path).

**Links to Validate:**
```markdown
[Documentation](https://claude.ai/docs)
  Protocol: https ✅
  Domain: claude.ai ✅
  Path: /docs ✅
  Format check: ✅ Valid

[Old HTTP Link](http://example.com)
  Protocol: http ⚠️  (legacy, but valid)
  Domain: example.com ✅
  Format check: ✅ Valid

[Broken URL](htps://example.com)
  Protocol: htps ❌ (typo, should be https)
  Format check: ❌ Invalid
  Fix: Change to https://example.com

[Missing Protocol](example.com/docs)
  Protocol: MISSING ❌
  Format check: ❌ Invalid
  Fix: Add https:// → https://example.com/docs

[With Anchor](https://example.com/docs#section)
  Protocol: https ✅
  Domain: example.com ✅
  Path: /docs ✅
  Anchor: #section ✅
  Format check: ✅ Valid
```

---

## Example 5: Batch Validation (Large Directory)

**Scenario:** Validate all markdown files in ai/context/ directory after refactoring.

**Setup:**
```bash
Directory: ai/context/
File count: 12 markdown files
Estimated links: 150-200 total
Goal: Zero broken links before merging
```

**Validation Report:**
```
BATCH VALIDATION REPORT: ai/context/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Files processed: 12/12 ✅
Total links found: 187
- Internal files: 92
- Anchors: 45
- External URLs: 50

RESULTS SUMMARY:
Valid links: 181 ✅ (96.8%)
Broken links: 6 ❌ (3.2%)

BROKEN LINKS BY TYPE:
- Missing files: 3
  - business-advanced.md:12
  - technical-advanced.md:45
  - process-advanced.md:78

- Broken anchors: 2
  - automation-scripts.md:23
  - navigation-guide.md:56

- Invalid URLs: 1
  - integration-systems.md:89

RECOMMENDATIONS:
1. Fix missing file references (3 links)
2. Verify anchor names in target files (2 links)
3. Check external URL typos (1 link)
4. Re-validate after fixes
```

**Fix Application:**
```bash
# Apply all fixes
1. Update 3 missing file references
2. Correct 2 anchor names
3. Fix 1 URL typo

# Re-validate
Re-run validation on ai/context/
Expected result: 187/187 valid ✅
```

**Final Validation Result:**
```
FINAL VALIDATION REPORT: ai/context/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Files processed: 12/12 ✅
Total links: 187
Valid links: 187 ✅ (100%)
Broken links: 0 ❌

Status: PASSED ✅
Ready for merge: YES
```

---

## Quick Reference: Link Validation Checklist

Use this checklist when validating links:

- [ ] Internal file links exist at specified path
- [ ] Relative paths correctly navigate directory structure
- [ ] Anchor names match actual headings in target file
- [ ] External URLs have proper format (protocol://domain)
- [ ] No backslashes (Windows paths) in links
- [ ] No absolute paths starting with /
- [ ] Markdown syntax correct: `[text](url)`
- [ ] No spaces in URLs
- [ ] File extensions included (.md, .py, etc.)

---

