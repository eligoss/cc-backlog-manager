---
id: using-mcp
name: using-mcp
description: Understand comprehensive Model Context Protocol (MCP) usage across four approaches (reference MCPs, CLI commands, dynamic discovery, web search) AND MCP tool arguments/patterns. Use when deciding how to execute tasks, invoking MCP tools, building automation, discovering new MCPs, or searching the web for current information.
scope: generic
applicable-projects: any
module: core
capabilities-provided:
  - mcp-tool-usage
  - mcp-discovery
  - web-search
# Claude Code v2.1 features
context: fork
tools:
  - Read
  - Glob
  - Grep
  - WebSearch
  - WebFetch
  - Bash
---

# Using MCP: Comprehensive Framework + Tools Guide

## When to Use This Skill

Use this skill when you need to:
- **Choose which MCP layer** (Reference, Scripts, Discovery) for your task
- **Invoke MCP tools** and need argument reference or usage patterns
- **Avoid common mistakes** with MCPs and tool invocations
- **Design task workflows** mixing file operations, git, and domain-specific tools
- **Build automation** scripts or tool chains with MCPs
- **Understand MCP decision frameworks** for any operation type

**Example scenarios:**
- "Should I export 50 tickets with a script or use MCP?"
- "How do I invoke git_add with multiple files?"
- "What are the arguments for this MCP tool?"
- "How do I link Jira and Confluence cross-system?"

This skill consolidates **both strategic framework (3-layer architecture) AND tactical tool reference** into one comprehensive resource.

---

## MCP Integration (Optional)

This skill uses **NO MCPs** - it teaches you how to use MCPs effectively:
- Works with built-in reference tools only
- Guides you to discover and load MCPs when needed
- Provides arguments reference for all major tools
- Shows fallback patterns for when MCPs unavailable

---

## Quick Start: Four MCP Layers

### Layer 1: Reference MCPs (Always Available)
Built-in tools loaded automatically:
- **Filesystem:** read_file, write_file, edit_file, search_files, etc.
- **Git:** status, log, diff, commit, checkout, etc.
- **Analysis:** Sequential Thinking for complex problems

**Use for:** Quick tasks, immediate execution, file/git operations

### Layer 2: CLI Commands (Pre-Built Automation)
Tested CLI commands for batch operations:
- `agentic-framework jira export` - Batch Jira export
- `agentic-framework backlog import` - Data import
- `agentic-framework confluence create-page` - Confluence automation

**Use for:** Batch operations (10+ items), repeated tasks, format conversion

### Layer 3: Dynamic MCP Discovery (Specialize When Needed)
Discover and load domain-specific MCPs:
- `mcp-find "atlassian"` - Find Jira/Confluence MCP
- `mcp-add "atlassian-mcp"` - Register and activate
- `mcp-exec tool_name` - Call MCP tool

**Use for:** Complex specialized operations, interactive domain work, when script unavailable

### Layer 3b: Web Search & Fetching (External Information)
Built-in web capabilities via MCP_DOCKER:
- `mcp__MCP_DOCKER__search` - Search DuckDuckGo
- `mcp__MCP_DOCKER__fetch_content` - Fetch and parse web pages

**Use for:** Current information, external docs, API references, troubleshooting

---

## Decision Framework: Which Layer to Use

### Step 1: Identify Task Category

```
Is this a quick, immediate task?
  YES → Use Layer 1 (Reference MCPs)
  NO  → Continue to Step 2

Is this a batch/repeated operation (10+ items)?
  YES → Use Layer 2 (Scripts) or Layer 3 (MCP)
  NO  → Continue to Step 2

Is this specialized domain operation (Jira, Confluence, etc.)?
  YES → Use Layer 2 (if script exists) or Layer 3 (discover MCP)
  NO  → Use Layer 1
```

### Step 2: Quick Decision Matrix

| Task Type | Layer 1 | Layer 2 | Layer 3 | Layer 3b | Recommended |
|-----------|---------|---------|---------|----------|-------------|
| **Read/write files** | ✅ **BEST** | ❌ No | ❌ No | ❌ No | **Layer 1** |
| **Git operations** | ✅ **BEST** | ❌ No | ❌ No | ❌ No | **Layer 1** |
| **Search codebase** | ✅ **BEST** | ❌ No | ❌ No | ❌ No | **Layer 1** |
| **Export 50+ items** | ❌ No | ✅ **BEST** | ⚠️ Maybe | ❌ No | **Layer 2** |
| **Format conversion** | ❌ No | ✅ **BEST** | ❌ No | ❌ No | **Layer 2** |
| **Complex Jira search** | ❌ No | ❌ No | ✅ **BEST** | ❌ No | **Layer 3** |
| **Create single item** | ❌ No | ⚠️ Maybe | ✅ **BEST** | ❌ No | **Layer 3** |
| **Web search/research** | ❌ No | ❌ No | ❌ No | ✅ **BEST** | **Layer 3b** |
| **Fetch external docs** | ❌ No | ❌ No | ❌ No | ✅ **BEST** | **Layer 3b** |
| **Discover new MCP** | ❌ No | ❌ No | ✅ **BEST** | ❌ No | **Layer 3** |
| **Database queries** | ❌ No | ⚠️ Maybe | ✅ **BEST** | ❌ No | **Layer 3** |

### Step 3: Fallback Chain (Always Works)

```
Try primary approach
  ↓
If unavailable/insufficient:
  Try alternative approach
  ↓
If that fails:
  Use simplest available approach
  ↓
Result: Task completes one way or another
```

---

## Essential MCP Tool Patterns

### Pattern 1: File Path Arguments
**Rule:** Always use absolute paths, never relative
```
✅ /full/path/to/your/project/file.txt
❌ ./file.txt
❌ ~/file.txt
```

### Pattern 2: Array Arguments (git_add, code-mode servers)
**Rule:** Use JSON array notation, not comma-separated strings
```
✅ files: ["file1.txt", "file2.ts"]
❌ files: "file1.txt, file2.ts"
```

### Pattern 3: Optional Parameters with Defaults
**Rule:** Omit optional parameters entirely (don't pass null/undefined)
```
✅ git_log(repo_path: "/path")  # Uses default max_count=10
❌ git_log(repo_path: "/path", max_count: null)
```

### Pattern 4: Exact String Matching in Edits
**Rule:** oldText must match EXACTLY (whitespace, indentation matters)
```
✅ oldText: "const x = 1;\n"  # Exact match with newline
❌ oldText: "const x = 1"     # Missing newline = no match
```

**ALWAYS read file first to get exact text**

### Pattern 5: Special Characters in Git Messages
**Rule:** Escape newlines and quotes in git commit messages
```
✅ message: "Fix bug\n\nDetailed explanation"
❌ message: "Fix bug
Detailed explanation"  # Unescaped newline
```

---

## Top 20 MCP Tools Quick Reference

| Tool | Category | Key Arguments | Common Error |
|------|----------|---------------|--------------|
| `read_file` | File I/O | `path` (required) | Missing path or invalid path |
| `write_file` | File I/O | `path`, `content` (both required) | Forgetting content parameter |
| `edit_file` | File I/O | `path`, `edits[]` (required) | Edits array malformed or oldText not exact |
| `list_directory` | File I/O | `path` (required) | Path doesn't exist |
| `git_add` | Git | `repo_path`, `files[]` (required) | Files array as string instead of array |
| `git_commit` | Git | `repo_path`, `message` (required) | Message with special chars not escaped |
| `git_status` | Git | `repo_path` (required) | Missing repo_path parameter |
| `git_log` | Git | `repo_path` (required); `max_count` (optional) | Not handling defaults |
| `git_diff` | Git | `repo_path`, `target` (required) | Target branch syntax incorrect |
| `git_checkout` | Git | `repo_path`, `branch_name` (required) | Branch doesn't exist |
| `search_files` | Search | `path`, `pattern` (required) | Pattern as literal string instead of regex |
| `directory_tree` | File I/O | `path` (required) | Using relative path |
| `create_directory` | File I/O | `path` (required) | Path with spaces not quoted |
| `move_file` | File I/O | `source`, `destination` (required) | Destination already exists |
| `get_file_info` | File I/O | `path` (required) | Path doesn't exist |
| `mcp-find` | MCP Mgmt | `query` (required); `limit` (optional) | Query too specific |
| `mcp-add` | MCP Mgmt | `name` (required); `activate` (optional) | MCP name not exact from catalog |
| `mcp-exec` | MCP Mgmt | `name`, `arguments` (required) | Arguments don't match tool schema |
| `git_diff_staged` | Git | `repo_path` (required) | Missing repo_path |
| `code-mode` | MCP Util | `servers[]`, `name` (required) | Servers array missing or invalid |

---

## MCP Layer Characteristics

### Layer 1: Reference MCPs - ALWAYS AVAILABLE

**What you get:**
```
Filesystem (11 tools):  read_file, write_file, edit_file, list_directory, etc.
Git (12 tools):         status, log, diff, commit, checkout, reset, etc.
Analysis:               Sequential Thinking for planning/analysis
```

**Cost:** ~100-500 tokens per operation (already in context)

**Use when:**
- ✅ Quick/immediate tasks
- ✅ File operations (read, write, edit, find)
- ✅ Git operations (status, commit, diff)
- ✅ Analysis and problem-solving
- ✅ Interactive user queries

**Example:**
```
Task: "Find where errors are handled"
→ Use Grep + Sequential Thinking (immediate, no discovery)
```

---

### Layer 2: CLI Commands - USE EXISTING

**What you get:**
```
Pre-tested, proven CLI commands:
- agentic-framework jira export (batch export)
- agentic-framework backlog import (data import)
- agentic-framework confluence create-page (page creation)
- agentic-framework confluence fetch-page (page retrieval)
- agentic-framework confluence import-reports (batch import)
```

**Cost:** No MCP tokens (CLI runs independently)

**Use when:**
- ✅ Batch operations (10+ items)
- ✅ Format conversion (complex transformations)
- ✅ Repeated workflows
- ✅ Offline execution needed
- ✅ Pre-tested, reliable operations

**Example:**
```
Task: "Export 50 approved Jira tickets"
→ Use agentic-framework jira export (tested, reliable)
```

**When to create new scripts:**
- Batch operation (10+ items) needs repeating
- Complex logic needed (would take >50 lines of code)
- Format conversion needed
- Performance critical

---

### Layer 3: Dynamic MCP Discovery - SPECIALIZE WHEN NEEDED

**What you get:**
```
Discovered and loaded on-demand:
- atlassian MCP (Jira + Confluence operations)
- aws MCP (AWS resource operations)
- database MCP (PostgreSQL queries)
- And others available in catalog
```

**Cost:** ~900 tokens first use (discovery + loading)
Subsequent uses: ~100-300 tokens (MCP stays loaded)

**Use when:**
- ❌ NOT for quick/simple tasks (use Layer 1)
- ❌ NOT if script exists (use Layer 2)
- ✅ Complex specialized operations
- ✅ Interactive domain workflows
- ✅ Cross-system integration
- ✅ Batch operations without scripts

**Example:**
```
Task: "Complex Jira search with custom filters"
→ Discover atlassian MCP
→ Load with code-mode
→ Use specialized MCP tools
```

---

### Layer 3b: Web Search & Content Fetching

**What you get:**
```
Built-in web capabilities via MCP_DOCKER:
- mcp__MCP_DOCKER__search       - Search DuckDuckGo for current information
- mcp__MCP_DOCKER__fetch_content - Fetch and parse web pages to markdown
```

**Cost:** ~200 tokens per search, ~300-500 tokens per fetch

**Use when:**
- ✅ Need current information beyond training data cutoff
- ✅ Research external library/API documentation
- ✅ Verify service status, API endpoints, or rate limits
- ✅ Find examples or patterns from external sources
- ✅ Look up error messages or troubleshooting guides

**Example:**
```
Task: "Find current Stripe API rate limits"
→ Use mcp__MCP_DOCKER__search query="Stripe API rate limits 2025"
→ Use mcp__MCP_DOCKER__fetch_content to get detailed page content
→ Extract relevant information for user
```

**Web Search Arguments:**
| Tool | Required | Optional | Notes |
|------|----------|----------|-------|
| `search` | `query` | `max_results` (default: 10) | Returns titles, URLs, snippets |
| `fetch_content` | `url` | - | Returns markdown-formatted page content |

---

### Dynamic MCP Discovery with mcp-find

When you need specialized capabilities not covered by Layers 1-3, discover MCPs dynamically:

**Discovery Workflow:**
```
1. Search catalog:    mcp__MCP_DOCKER__mcp-find query="sql" limit=5
2. Review results:    Check name, description, available tools
3. Register MCP:      mcp__MCP_DOCKER__mcp-add name="postgres" activate=true
4. Execute tool:      mcp__MCP_DOCKER__mcp-exec name="query" arguments={...}
```

**Common MCP Searches:**

| Need | Search Query | Likely MCPs | Example Use Case |
|------|-------------|-------------|------------------|
| Database queries | `mcp-find "sql"` | postgres, mysql, sqlite | Query production metrics |
| HTML to markdown | `mcp-find "markdown"` | markdownify, turndown | Convert web pages |
| File system ops | `mcp-find "filesystem"` | filesystem, fs-extra | Advanced file operations |
| IDE integration | `mcp-find "jetbrains"` | jetbrains-gateway | IDE automation |
| Atlassian tools | `mcp-find "atlassian"` | atlassian-jira, confluence | Jira/Confluence API |
| AWS resources | `mcp-find "aws"` | aws-sdk, boto3 | Cloud operations |
| GitHub/Git | `mcp-find "github"` | github, gitlab | Repository management |
| Slack/Teams | `mcp-find "slack"` | slack, teams | Messaging integration |

**MCP Management Tools:**

| Tool | Purpose | Key Arguments |
|------|---------|---------------|
| `mcp-find` | Search MCP catalog | `query` (required), `limit` (optional) |
| `mcp-add` | Register MCP in session | `name` (required), `activate` (optional) |
| `mcp-remove` | Unregister MCP | `name` (required) |
| `mcp-config-set` | Configure MCP settings | `server`, `config` (both required) |
| `mcp-exec` | Execute MCP tool | `name`, `arguments` (both required) |
| `code-mode` | Combine multiple MCPs | `servers[]`, `name` (both required) |

**Example: Dynamic SQL MCP Discovery**
```
Task: "Query production database for user metrics"

Step 1: Discover
→ mcp__MCP_DOCKER__mcp-find query="postgres"
→ Returns: [{name: "postgres", description: "PostgreSQL database..."}]

Step 2: Register
→ mcp__MCP_DOCKER__mcp-add name="postgres" activate=true

Step 3: Execute
→ mcp__MCP_DOCKER__mcp-exec name="query" arguments={
    sql: "SELECT COUNT(*) FROM users WHERE active = true"
  }

Cost: ~400 tokens initial discovery, ~100 tokens per subsequent query
```

---

## Common Workflow Patterns

### Pattern: Quick Code Search (Layer 1)
```
Task: "Find where errors from client are handled"
Decision: Quick/simple → Layer 1
Execution:
1. Use Grep to search error handlers
2. Use Sequential Thinking to analyze patterns
3. Return structured findings
Cost: ~200 tokens, immediate
```

### Pattern: Export 50 Tickets (Layer 2)
```
Task: "Export 50 approved tickets to Jira"
Decision: Batch (50) + Script exists → Layer 2
Execution:
1. Run: agentic-framework jira export [input]
2. Script handles: CSV parsing, format conversion, API calls
3. Files moved to backlog/tickets/
Cost: No MCP tokens, reliable, tested
```

### Pattern: Complex Jira + Confluence Linking (Layer 2→3)
```
Task: "Link 20 Jira tickets to Confluence pages"
Decision: Batch + Complex → Try Layer 2, else Layer 3
Path 1 (Layer 2): Create script if time allows
Path 2 (Layer 3): Discover atlassian MCP, load, use tools
Fallback: Manual agentic approach
Cost: Script preferred (no MCP), or Layer 3 if unavailable
```

### Pattern: Single Item CRUD (Layer 3)
```
Task: "Create one Jira story interactively"
Decision: Single item + Interactive → Layer 3
Execution:
1. Discover: mcp-find "atlassian"
2. Load: code-mode with ["atlassian"]
3. Execute: mcp__atlassian__create_issue(...)
4. User gets feedback, can refine
Cost: ~900 tokens initial, interactive
```

---

## Common Errors & Prevention

### File Operations Errors
- **"Path not found"** → Check absolute path exists with `list_directory` first
- **"Edit did not match"** → Use Read tool first to verify exact whitespace
- **"Directory already exists"** → For create_directory, check first or handle gracefully

### Git Operation Errors
- **"Invalid branch name"** → Branch must exist; check with `git_log` first
- **"Nothing to commit"** → Stage files with `git_add` before commit
- **"Files array invalid"** → Use `["file1", "file2"]` not `"file1, file2"`

### MCP Tool Errors
- **"MCP not found"** → Use `mcp-find` to search catalog before `mcp-add`
- **"Arguments mismatch"** → Check tool schema with proper arguments
- **"Tool not available"** → MCP must be registered with `mcp-add` first

### Common Mistakes (Quick Fixes)

| Mistake | Problem | Fix |
|---------|---------|-----|
| Relative paths | "Path not found" | Always use absolute paths |
| Edit without reading | "oldText did not match" | Read file first, copy exact text |
| Files as string | "Expected array" | Use: `["file1", "file2"]` not `"file1, file2"` |
| Commit without staging | "Nothing to commit" | Use `git_add` first |
| Wrong MCP name | "MCP not found" | Use `mcp-find` first, copy exact name |
| Unescaped newlines | Message format broken | Use `\n` for breaks, `\"` for quotes |
| Using tool before MCP adds | "Tool not found" | Use `mcp-add` with `activate: true` |

---

## Decision Trees

### "Should I build a script?"

```
Is this a repeated task?
├─ YES: Will it run 5+ times/month?
│       ├─ YES → Build Layer 2 script
│       └─ NO → Use Layer 1 or 3
│
└─ NO: Is it batch (10+ items)?
       ├─ YES → Consider Layer 2 script
       │        (or use Layer 3 MCP)
       └─ NO → Use Layer 1 or 3
```

### "Should I discover MCP?"

```
Does Layer 2 script exist?
├─ YES → Use script (primary)
│
└─ NO: Is this complex/specialized?
       ├─ YES → Try discover MCP
       │        (mcp-find "capability")
       │
       └─ NO → Use Layer 1 (reference MCPs)
```

### "Which Layer handles this task?"

```
Is this immediate/interactive?
├─ YES → Layer 1 (reference MCPs)
│
└─ NO: Is this batch/repeated?
       ├─ YES → Layer 2 (scripts) or Layer 3 (MCP)
       │
       └─ NO: Is this simple?
              ├─ YES → Layer 1
              └─ NO → Layer 3 (specialized)
```

---

## Token Efficiency

### Layer 1 (Reference MCPs)
```
Setup cost:     0 tokens (always loaded)
Per operation:  100-500 tokens
Total:          Minimal overhead
Efficiency:     ⭐⭐⭐⭐⭐ Best
```

### Layer 2 (Custom Scripts)
```
Setup cost:     0 tokens (no MCPs)
Script cost:    0 MCP tokens
Result return:  100-1000 tokens
Efficiency:     ⭐⭐⭐⭐⭐ Excellent (no MCP overhead)
```

### Layer 3 (Dynamic MCP Discovery)
```
Discovery:      ~200 tokens
Loading:        ~600 tokens
Per operation:  100-300 tokens
First time:     ~900 tokens
Subsequent:     ~100-300 tokens (MCP stays loaded)
Efficiency:     ⭐⭐⭐ Good for complex ops
```

---

## See Also (Supporting Files)

### For Different Audiences

- **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** - Top 20 tools cheat sheet (1 page)
- **[TOOLS-REFERENCE.md](./TOOLS-REFERENCE.md)** - Complete argument documentation (35+ tools)
- **[EXAMPLES.md](./EXAMPLES.md)** - Real-world examples across all layers and tasks

### For Decision-Making

- **[DECISION-MATRICES.md](./DECISION-MATRICES.md)** - Detailed operation × layer matrices
- **[EXAMPLES.md](./EXAMPLES.md)** - 9 detailed decision walkthroughs

### For Error Prevention

- **[ANTI-PATTERNS.md](./ANTI-PATTERNS.md)** - 12 common mistakes and fixes

### Related Skills

- **building-framework** - MCP registration governance (invoke via Skill tool)
- **building-skills** - Building skills with MCPs (invoke via Skill tool)

### Framework Documentation

- Your project's automation scripts (`src/` directory)
- MCP discovery tools and Docker gateway configuration
- Framework governance rules and standards

---

## Checklist: Choosing an MCP Layer

Before executing a task:

- [ ] **Is this quick/immediate?** → Layer 1 (reference MCPs)
- [ ] **Is this batch/repeated (10+ items)?** → Layer 2 (scripts) or Layer 3 (MCP)
- [ ] **Does script exist?** → Use Layer 2 first
- [ ] **Is this specialized/complex?** → Consider Layer 3 (discover MCP)
- [ ] **Plan fallback** → Know what happens if primary fails
- [ ] **Execute** → Use chosen layer
- [ ] **Verify** → Confirm task completed successfully

---

## Key Principles

1. **Layer 1 First** - Reference MCPs for quick, immediate tasks
2. **Layer 2 for Repeats** - Scripts for batch and repeated operations
3. **Layer 3 for Complexity** - Dynamic discovery for specialized needs
4. **Graceful Fallback** - Always have a backup approach
5. **No Hardcoding** - MCPs are optional, never required
6. **Token Conscious** - Choose layer based on task, not blind preference
7. **Read-Before-Edit** - Always read file first to get exact text
8. **Absolute Paths** - Never use relative paths with MCP tools
9. **Array Arguments** - Files/servers parameters must be arrays, not strings
10. **Exact Matching** - oldText in edit_file must match EXACTLY

---

**Skill Version:** 2.2 (Added Web Search & MCP Discovery)
**Status:** Unified Meta-Skill - Combines Framework + Tools Guide
**Scope:** Generic (any project)
**Framework Version:** v12.0+
**Last Updated:** 2026-01-07

**What's Included:**
- ✅ 4-Layer Architecture (Reference, CLI, Discovery, Web Search)
- ✅ Tool Arguments Reference (35+ tools)
- ✅ Decision Frameworks & Matrices
- ✅ Common Error Prevention (with detailed ANTI-PATTERNS.md)
- ✅ Real-World Examples
- ✅ Web Search via DuckDuckGo MCP (Layer 3b)
- ✅ Dynamic MCP Discovery workflow (mcp-find, mcp-add, mcp-exec)
- ✅ All supporting files preserved and reorganized

