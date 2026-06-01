# Quality Checklist

Domain-specific quality checklists for pre-submission validation.

---

## Universal Quality Criteria

### Completeness
- ✅ All required sections present
- ✅ No placeholders or TODOs
- ✅ Dependencies identified and linked
- ✅ Acceptance criteria defined (where applicable)

### Clarity
- ✅ Purpose clearly stated
- ✅ Context provided (background, rationale)
- ✅ Technical scope defined
- ✅ Success metrics identified

### Conciseness
- ✅ No unnecessary verbosity
- ✅ Focused on essentials
- ✅ Appropriate level of detail for audience
- ✅ No redundant information

### Format Compliance
- ✅ Follows template structure
- ✅ Proper markdown formatting
- ✅ YAML frontmatter complete (if required)
- ✅ Cross-references valid

---

## Stories & Tasks Checklist

Before submitting a story or task:

- ✅ User story format (AS/WANT/SO THAT) or clear task description
- ✅ Context section (2-3 paragraphs)
- ✅ Requirements list (4-6 bullets)
- ✅ Technical notes (3-5 bullets, high-level)
- ✅ 8-12 acceptance criteria (specific, testable)
- ✅ Story points assigned (1-8)
- ✅ Parent epic linked

---

## Epics Checklist

Before submitting an epic:

- ✅ Business value clearly stated (2-3 sentences)
- ✅ Technical scope with implementation steps
- ✅ Concise (30-50 lines total)
- ✅ Child stories listed
- ✅ Minimal acceptance criteria (epic-level only)

---

## Reports & Documentation Checklist

Before submitting reports or documentation:

- ✅ Executive summary present
- ✅ Key metrics highlighted
- ✅ Sections logically organized
- ✅ Actionable insights provided
- ✅ Sources/references included

---

## Code & Implementation Checklist

Before submitting code:

- ✅ Follows SOLID and DRY principles
- ✅ Comprehensive tests written
- ✅ Error handling included
- ✅ Security considerations addressed
- ✅ Documentation/comments where needed

---

## CLI Tools Checklist

Before submitting CLI commands:

### Test Layers
- ✅ Unit tests for isolated logic (path resolution, data transformation)
- ✅ Integration tests for library functions
- ✅ CLI surface tests (actual command execution)
- ✅ Environment variation tests (no TTY, outside project, paths with spaces)

### User Context
- ✅ Tests run from simulated user project, not CLI source
- ✅ Path resolution tested from user's perspective
- ✅ Templates found when running as npm package

### State Verification
- ✅ Side effects verified (manifest updates, file creation)
- ✅ Round-trip tests (create → verify → use)
- ✅ Cross-command path consistency

### Output Quality
- ✅ No "undefined", "null", "Invalid Date" in output
- ✅ No stack traces for expected user errors
- ✅ Paths shown are user-relevant

### Feature Completeness
- ✅ All documented flags actually work
- ✅ All documented commands implemented
- ✅ Error messages are actionable

---

## Defensive Coding Checklist

Before submitting user-facing code:

### Null-Safe Display
- ✅ All displayed values handle undefined/null
- ✅ Dates default to "Unknown" if missing
- ✅ Versions default to "(version unknown)" if missing
- ✅ Irregular plurals have explicit mappings

### Path Context
- ✅ PathContext interface defines all path types
- ✅ No ambiguous "root" or "basePath" variables
- ✅ Related commands use shared path constants

### Data Normalization
- ✅ Parsers have normalization at boundary
- ✅ Date objects converted to strings before validation
- ✅ Tests use realistic input

### Error Quality
- ✅ User errors show clean message (no stack trace)
- ✅ Error messages contain user-relevant paths
- ✅ Error messages suggest fix when possible

### Environment
- ✅ TTY checked before interactive prompts
- ✅ Project context errors handled gracefully
- ✅ Paths quoted in shell commands

---

## Pre-Submission Validation

**Before finalizing any deliverable, run this 8-point checklist:**

1. ✅ **Read through completely** - Does it make sense end-to-end?
2. ✅ **Check against template** - All required sections present?
3. ✅ **Verify cross-references** - All links valid and not broken?
4. ✅ **Validate format** - Markdown/YAML syntax correct?
5. ✅ **Test acceptance criteria** - Specific, measurable, and testable?
6. ✅ **Review for clarity** - Would someone unfamiliar understand it?
7. ✅ **Check conciseness** - Can anything be removed without losing value?
8. ✅ **Confirm completeness** - All requirements covered end-to-end?

---

## Common Quality Issues & Fixes

| Issue | Why It Matters | How to Fix |
|-------|----------------|-----------|
| Vague acceptance criteria ("Make it work", "Improve performance") | Undefined done, impossible to verify | Make criteria specific and measurable (e.g., "API returns 200 status for valid requests") |
| Missing context/rationale (no "why") | Reader doesn't understand importance | Add 2-3 sentences explaining background and business value |
| Excessive verbosity (>100 lines for stories) | Too much detail, loses focus | Trim unnecessary details, focus on essentials only |
| Code snippets in tickets | Tickets become implementation details | Replace code with pattern references instead |
| Broken cross-references | Documentation becomes unreliable | Validate all cross-references before submitting |
| Metadata in body instead of YAML | Inconsistent structure | Move metadata to YAML frontmatter |
| Horizontal slices (API/UI/DB layers) | Can't deploy or deliver value independently | Create vertical slices with complete features |
| Stories >8 points | Too large for sprint, high risk | Break large stories into smaller ones (≤8 points) |

---

**Source:** Consolidated from ai/shared/quality-standards.md + CLI QA findings
**Version:** 2.0
**Updated:** 2025-12-30
