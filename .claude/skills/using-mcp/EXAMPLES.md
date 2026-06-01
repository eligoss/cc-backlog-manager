# Using MCP: Real-World Examples

## Example 1: Quick Code Search (Layer 1)

**Task:** "Find where errors from the client are handled"

**Decision Process:**
```
Is this quick/immediate? YES
Will Layer 1 suffice? YES
Need batch automation? NO
Need specialized MCP? NO

→ Use Layer 1 (Reference MCPs)
```

**Execution:**
```
Claude:
1. Use Grep (Filesystem MCP) to search:
   - Pattern: "handleError", "client.*error", "ErrorHandler"
   - Locations: All relevant files

2. Use Sequential Thinking (built-in) to analyze:
   - Which files handle which error types?
   - What's the pattern across codebase?
   - Where's the central handler?

3. Return structured findings:
   - File locations with line numbers
   - Error handling patterns
   - Decision points and flow
```

**Why Layer 1?**
- ✅ Immediate execution (no discovery wait)
- ✅ Simple search/analysis task
- ✅ Built-in tools sufficient
- ✅ No batch processing needed
- ✅ Low token cost (~200 tokens)

**Fallback:** None needed - always works

---

## Example 2: Push 50 Tickets to Jira (Layer 2)

**Task:** "Push 50 approved tickets from local backlog to Jira"

**Decision Process:**
```
Is this quick? NO
Is this batch operation? YES (50 items)
Does script exist? YES

→ Use Layer 2 (Custom Script)
```

**Execution:**
```bash
# Run the script
agentic-framework backlog push --all

# Script automatically handles:
- Reading all .md files with local changes
- Parsing YAML frontmatter
- Creating/updating Jira tickets via API
- Updating files with ticket numbers
- Conflict detection
```

**Result:**
- ✅ 50 tickets pushed to Jira
- ✅ Files updated with Jira IDs
- ✅ Metadata updated
- ✅ One command, reliable, tested

**Why Layer 2?**
- ✅ Batch operation (10+ items)
- ✅ Script already exists and tested
- ✅ Repeatable workflow
- ✅ No MCP tokens needed
- ✅ Offline capable

**Fallback:** If script fails, could try Layer 3 (discover MCP for single creation in loop)

---

## Example 3: Import Jira Sprint Data (Layer 2)

**Task:** "Import Q4 sprint from Jira CSV export to markdown"

**Decision Process:**
```
Is this batch? YES (100+ tickets)
Does script exist? YES
Complexity? HIGH (CSV parsing, format conversion)

→ Use Layer 2 (Custom Script)
```

**Execution:**
```bash
# Check script
agentic-framework backlog import --help
→ YES, script found

# Run import
agentic-framework backlog import \
  --csv operations/jira-exports/APMR-2025Q4.csv \
  --sprint "2025-Q4" \
  --milestone "Oct2025"

# Script automatically handles:
- CSV parsing
- Jira wiki markup → Markdown conversion
- Atomic file creation (by type)
- YAML frontmatter generation
- Sprint summary creation
- Data validation
```

**Result:**
- ✅ 100+ ticket files created
- ✅ Organized by type (stories, tasks, bugs)
- ✅ Sprint summary created
- ✅ All metadata intact
- ✅ Markdown ready for editing

**Why Layer 2?**
- ✅ Complex format conversion
- ✅ Batch operation
- ✅ Pre-tested, reliable
- ✅ Repeatable for future sprints
- ✅ Handles data validation

---

## Example 4: Simple File Editing (Layer 1)

**Task:** "Update this markdown file's title and fix three broken links"

**Decision Process:**
```
Is this quick? YES
Batch operation? NO
Specialized need? NO

→ Use Layer 1 (Reference MCPs)
```

**Execution:**
```
Claude:
1. Read file: mcp__filesystem__read_file(path)
2. Check current content
3. Edit file: mcp__filesystem__edit_file(path, old_title, new_title)
4. Fix each broken link: mcp__filesystem__edit_file(path, wrong_link, correct_link)
5. Verify changes
```

**Why Layer 1?**
- ✅ Immediate execution
- ✅ Simple operations
- ✅ Built-in tools sufficient
- ✅ Interactive feedback
- ✅ Fast response

---

## Example 5: Complex Jira + Confluence Linking (Layer 3)

**Task:** "Link 20 Jira tickets to corresponding Confluence documentation pages, cross-checking details"

**Decision Process:**
```
Is this batch? YES (20 items)
Does script exist? NO
Is this complex? YES (cross-system, validation)
Needs specialized MCP? YES

→ Try Layer 2 first (create script)
→ If unavailable, use Layer 3 (discover MCP)
```

**Execution Path 1: Layer 2 (If Time to Create Script)**
```bash
# Create new script
agentic-framework confluence link-pages

# Handles:
- Jira API interaction
- Confluence API interaction
- Matching logic
- Cross-checks
- Error handling
- Batch processing

# Run once created
agentic-framework confluence link-pages \
  --jira-tickets [list] \
  --confluence-pages [list]
```

**Execution Path 2: Layer 3 (Immediate, Without Script)**
```bash
# Step 1: Discover
mcp-find "atlassian"
→ Found: atlassian MCP with 8 tools

# Step 2: Load
mcp__MCP_DOCKER__code-mode "link-pages" --servers ["atlassian"]

# Step 3: Use tools
for each jira_ticket:
  - mcp__atlassian__search_issues(jira_id)
  - mcp__atlassian__search_content(confluence_search)
  - mcp__atlassian__link_content(source, target, relationship)

# Step 4: Fallback if MCP unavailable
If mcp-find returns nothing:
  → Fallback to manual approach
  → Or wait for Layer 2 script
```

**Result:** Links created, validation passed

**Why This Pattern?**
- ✅ Tries Layer 2 first (best long-term)
- ✅ Uses Layer 3 for immediate execution
- ✅ Has fallback to manual approach
- ✅ Demonstrates all three layers working together

---

## Example 6: Single Jira Ticket Creation (Layer 3)

**Task:** "Create one new Jira story interactively with user feedback"

**Decision Process:**
```
Is this batch? NO (1 item)
Does script exist? YES (but overkill for 1)
Is this interactive? YES
Layer 1 sufficient? NO (need Jira API)

→ Use Layer 3 (Discover MCP for interactive creation)
```

**Execution:**
```bash
# Discover
mcp-find "atlassian"
→ Found: atlassian MCP

# Load
mcp__MCP_DOCKER__code-mode "create-story" --servers ["atlassian"]

# Interactive creation
mcp__atlassian__create_issue({
  project: "DAPM",
  type: "Story",
  summary: user_input_summary,
  description: user_input_description,
  priority: user_selected_priority
})
→ Returns: DAPM-1234

# User gets immediate feedback
# Can refine and re-create if needed
```

**Why Layer 3?**
- ✅ Single item (not batch)
- ✅ Interactive user feedback needed
- ✅ Specialized MCP tools perfect for CRUD
- ✅ Real-time response
- ✅ No script needed for one-off

---

## Example 7: Batch File Format Conversion (Layer 2 or Layer 1)

**Task:** "Convert 30 markdown files to proper format according to standards"

**Decision Process:**
```
Is this batch? YES (30 files)
Does script exist? NO
Is this complex? MEDIUM (standard conversion)

→ Try Layer 2 (create script)
→ If small set: Use Layer 1 (agentic approach)
```

**Execution Path 1: Large Set (Layer 2 Script)**
```bash
# Create script
agentic-framework format markdown

# Handles:
- File discovery
- Standard validation
- Batch formatting
- Error reporting
- Dry-run capability

# Run
agentic-framework format markdown \
  --input backlog/ \
  --standards ai/shared/markdown-formatting-guide.md
```

**Execution Path 2: Small Set (Layer 1 Agentic)**
```
Claude:
1. For each file:
   - Read with Filesystem MCP
   - Check against standards
   - Apply formatting rules
   - Write back
2. Provide summary report
```

**Why?**
- ✅ Small set (< 10): Layer 1 faster, no script overhead
- ✅ Large set (10+): Layer 2 better, reusable, tested

---

## Example 8: Git Version Control (Layer 1)

**Task:** "Create a git commit with my changes, push to remote"

**Decision Process:**
```
Is this quick? YES
Specialized domain? NO (Git standard)
Batch operation? NO

→ Use Layer 1 (Git MCP)
```

**Execution:**
```
Claude:
1. Check status: mcp__git__status()
   → Shows changed files

2. Stage changes: mcp__git__add([files])
   → Ready for commit

3. Create commit: mcp__git__commit(message)
   → Commit created locally

4. Push: mcp__git__push()
   → Uploaded to remote

User gets feedback at each step
```

**Why Layer 1?**
- ✅ Built-in Git MCP
- ✅ Standard operations
- ✅ Immediate execution
- ✅ No discovery needed

---

## Example 9: Search Across Multiple Systems (Layer 1 + Layer 3)

**Task:** "Find all equipment failures in system, match to maintenance records, suggest fixes"

**Decision Process:**
```
Is this complex analysis? YES
Is this across systems? YES
Batch operation? NO (analysis-driven)
Quick/simple? NO

→ Use Layer 1 (search/analysis)
→ Enhance with Layer 3 (if specialized DB needed)
```

**Execution:**
```
Layer 1 (Analysis):
1. Use Grep to search:
   - Equipment failure patterns
   - Maintenance logs
   - System records

2. Use Sequential Thinking:
   - Analyze patterns
   - Match failures to maintenance
   - Suggest fixes

Result: Comprehensive analysis without MCPs

If needs database query:
Layer 3 (Enhancement):
1. Discover: mcp-find "database"
2. Load: mcp__database__query()
3. Get specific records
4. Continue analysis
```

**Why Mix Layers?**
- ✅ Primary analysis: Layer 1 (reference MCPs)
- ✅ Specialized queries: Layer 3 (discovered MCP)
- ✅ Flexible, efficient, reliable

---

## Decision Summary Table

| Example | Task | Layer | Why |
|---------|------|-------|-----|
| 1 | Code search | 1 | Quick, built-in tools sufficient |
| 2 | Push 50 tickets | 2 | Batch, script exists |
| 3 | Import CSV | 2 | Batch, format conversion |
| 4 | Edit file | 1 | Quick, simple operations |
| 5 | Link Jira+Confluence | 2→3 | Complex, try script then MCP |
| 6 | Create 1 ticket | 3 | Interactive, single item, MCP perfect |
| 7 | Format 30 files | 2 or 1 | Large: script, small: agentic |
| 8 | Git commit | 1 | Standard, quick, built-in |
| 9 | Cross-system analysis | 1+3 | Primary: Layer 1, specialized: Layer 3 |

---

## Pattern: Graceful Degradation

All examples follow this pattern:

```
Try primary approach
  ↓
Success? → Done
  ↓
Not found/unavailable? → Try alternative
  ↓
Alternative unavailable? → Use simplest approach
  ↓
Task completes with what's available
```

This ensures:
- ✅ User doesn't wait for discovery
- ✅ No blocking on MCP availability
- ✅ Always have working solution
- ✅ Optimal performance when possible

---

**Examples Status:** All demonstrate Layer 1, Layer 2, Layer 3, and combinations
**Last Updated:** 2025-12-07
