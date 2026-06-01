# MCP Tools - Common Mistakes & Solutions

## File I/O Anti-Patterns

### Anti-Pattern 1: Relative Paths Instead of Absolute

**❌ WRONG - Causes "path not found" errors**
```python
read_file("./src/config.ts")
read_file("~/project/file.txt")
read_file("src/index.ts")
```

**✅ CORRECT - Always use absolute paths**
```python
read_file("/full/path/to/your/project/src/config.ts")
read_file("/full/path/to/your/project/file.txt")
create_directory("/full/path/to/your/project/src/features/auth/components")
```

**Why:**
- MCP tools execute from unpredictable working directories
- Relative paths depend on current working directory (which varies)
- Absolute paths work from any location, any shell context

**Recovery:**
- Always use absolute paths from the root filesystem
- Use `list_directory` to verify paths exist first
- Never use `~` or `.` or `./`

---

### Anti-Pattern 2: Editing Without Reading First

**❌ WRONG - Edit fails because whitespace doesn't match**
```python
edit_file(
  file_path: "/full/path/to/your/project/src/index.ts",
  old_string: "const DEBUG = false",  # Missing exact indentation/newlines
  new_string: "const DEBUG = true"
)
# Error: "oldText did not match file content"
```

**✅ CORRECT - Read first, copy exact text**
```python
# Step 1: Read file
content = read_file("/full/path/to/your/project/src/index.ts")
# Output shows: "  const DEBUG = false;  // comment"
# (Note: 2 spaces indent, semicolon, and comment)

# Step 2: Copy exact text including ALL whitespace
edit_file(
  file_path: "/full/path/to/your/project/src/index.ts",
  old_string: "  const DEBUG = false;  // comment",  # EXACT MATCH
  new_string: "  const DEBUG = true;  // comment"
)
# Success: Diff shown
```

**Why:**
- Indentation matters (2 spaces vs 4 spaces vs tabs)
- Line endings matter (has `\n`? must include it)
- Trailing whitespace matters
- Comments and punctuation must match

**Recovery:**
- Always read_file first
- Copy-paste the exact text you want to replace
- Check indentation level, trailing spaces, newlines
- Use replace_all: true if you need partial matching

---

### Anti-Pattern 3: Writing Over Important Files Without Backup

**❌ WRONG - Overwrites entire file, potentially losing data**
```python
write_file(
  file_path: "/full/path/to/your/project/config.json",
  content: '{"new": "config"}'  # Replaces entire file!
)
```

**✅ CORRECT - Use edit_file for partial changes**
```python
# For small changes, use edit_file
edit_file(
  file_path: "/full/path/to/your/project/config.json",
  old_string: '"debug": false',
  new_string: '"debug": true'
)

# For complete replacement, read first
old_content = read_file("/full/path/to/your/project/config.json")
# Review old_content...
new_content = process(old_content)  # Transform safely
write_file(
  file_path: "/full/path/to/your/project/config.json",
  content: new_content
)
```

**Why:**
- write_file COMPLETELY replaces the file
- No recovery if content is wrong
- Very easy to lose code

**Recovery:**
- Always use edit_file for partial changes
- Read first before write_file
- Keep changes in version control (git)

---

### Anti-Pattern 4: Not Checking Path Before Operations

**❌ WRONG - Fails when path doesn't exist**
```python
edit_file(
  file_path: "/full/path/to/your/project/missing/config.ts",
  old_string: "...",
  new_string: "..."
)
# Error: "File not found"
```

**✅ CORRECT - Verify path exists first**
```python
# Check if file exists
info = get_file_info("/full/path/to/your/project/missing/config.ts")
# If error: directory doesn't exist yet
# Create it first
create_directory("/full/path/to/your/project/missing")

# Then create file
write_file(
  file_path: "/full/path/to/your/project/missing/config.ts",
  content: "new content"
)
```

**Why:**
- Parent directories must exist for file operations
- get_file_info tells you if path is valid
- Prevents cryptic "path not found" errors

**Recovery:**
- Check path with get_file_info or list_directory first
- Create missing directories with create_directory
- Always verify before read/write/edit

---

## Git Operation Anti-Patterns

### Anti-Pattern 5: Files Parameter as String Instead of Array

**❌ WRONG - Files as comma-separated string**
```python
git_add(
  repo_path: "/full/path/to/your/project",
  files: "src/index.ts, src/types.ts"  # String!
)
# Error: "Expected array of strings"

git_add(
  repo_path: "/full/path/to/your/project",
  files: "src/index.ts"  # Single string, not array
)
# Error: "Expected array"
```

**✅ CORRECT - Files as JSON array**
```python
git_add(
  repo_path: "/full/path/to/your/project",
  files: ["src/index.ts", "src/types.ts"]  # Array!
)
# Success: 2 files staged

git_add(
  repo_path: "/full/path/to/your/project",
  files: ["src/index.ts"]  # Array with one item
)
# Success: 1 file staged
```

**Why:**
- MCP expects strict JSON array format
- String parsing is ambiguous (tabs vs commas vs spaces)
- Array is unambiguous

**Recovery:**
- Always wrap files in square brackets: `[...]`
- Use JSON format: `["file1", "file2"]`
- Never use string: `"file1, file2"` ❌

---

### Anti-Pattern 6: Committing Without Staging First

**❌ WRONG - Commits fail if nothing staged**
```python
# Modified some files in working directory
# But didn't stage them

git_commit(
  repo_path: "/full/path/to/your/project",
  message: "fix: update config"
)
# Error: "Nothing staged for commit"
```

**✅ CORRECT - Stage before commit**
```python
# Stage files first
git_add(
  repo_path: "/full/path/to/your/project",
  files: ["src/config.ts"]
)
# Success: 1 file staged

# Then commit
git_commit(
  repo_path: "/full/path/to/your/project",
  message: "fix: update config"
)
# Success: Committed
```

**Why:**
- Git requires explicit staging
- Prevents accidentally committing unwanted files
- Forces review before commit

**Recovery:**
- Always git_add before git_commit
- Check git_status to see what's staged
- Use git_diff_staged to review

---

### Anti-Pattern 7: Switching to Nonexistent Branch

**❌ WRONG - Branch must exist first**
```python
git_checkout(
  repo_path: "/full/path/to/your/project",
  branch_name: "feature/nonexistent"
)
# Error: "Branch not found"
```

**✅ CORRECT - Verify branch exists first**
```python
# Check available branches
log = git_log(repo_path: "/full/path/to/your/project", max_count: 50)
# Or check status
status = git_status(repo_path: "/full/path/to/your/project")

# Switch to existing branch
git_checkout(
  repo_path: "/full/path/to/your/project",
  branch_name: "main"
)
# Success: Switched to main
```

**Why:**
- git_checkout only works with existing branches
- Can't create branches with git_checkout (different command)
- Must verify branch exists first

**Recovery:**
- Check git_status or git_log first
- Use git_log with large max_count to see all commits/branches
- Verify branch name exactly

---

### Anti-Pattern 8: Message with Unescaped Special Characters

**❌ WRONG - Line breaks and quotes break message**
```python
git_commit(
  repo_path: "/full/path/to/your/project",
  message: "feat: add new feature
Detailed description here
More details"  # Unescaped newlines
)
# Error or malformed commit message

git_commit(
  repo_path: "/full/path/to/your/project",
  message: "feat: "quoted" message"  # Unescaped quotes
)
# Error: Syntax error
```

**✅ CORRECT - Escape special characters**
```python
git_commit(
  repo_path: "/full/path/to/your/project",
  message: "feat: add new feature\n\nDetailed description\nMore details"
)
# Success: Multiline message with proper formatting

git_commit(
  repo_path: "/full/path/to/your/project",
  message: "feat: add \"new feature\""
)
# Success: Quoted text in message
```

**Why:**
- Line breaks need `\n` escape sequence
- Quotes need `\"` escape sequence
- Raw newlines in string break parsing

**Recovery:**
- Use `\n` for line breaks (especially `\n\n` for paragraph breaks)
- Use `\"` for quotes inside message
- Test message format before committing

---

## MCP Management Anti-Patterns

### Anti-Pattern 9: Adding MCP That Doesn't Exist

**❌ WRONG - MCP not in catalog**
```python
mcp-add(name: "custom-mcp-i-invented")
# Error: "MCP not found in catalog"

mcp-add(name: "atlassian", activate: true)
# Error: "Catalog name is 'atlassian-mcp' not 'atlassian'"
```

**✅ CORRECT - Search first, then add with exact name**
```python
# Step 1: Find MCP
results = mcp-find(query: "atlassian")
# Returns: { name: "atlassian-mcp", ... }

# Step 2: Use exact name from results
mcp-add(name: "atlassian-mcp", activate: true)
# Success: MCP registered
```

**Why:**
- MCP names must match exactly from catalog
- Catalog names may differ from what you expect
- Case-sensitive (atlassian vs Atlassian)

**Recovery:**
- Always mcp-find first
- Copy exact name from results
- Case-sensitive matching required

---

### Anti-Pattern 10: Using MCP Tools Before Registration

**❌ WRONG - MCP not registered yet**
```python
mcp-exec(
  name: "get_jira_issue",
  arguments: { key: "PROJ-123" }
)
# Error: "MCP not registered"
```

**✅ CORRECT - Register before using**
```python
# Step 1: Find and register
mcp-find(query: "jira")
mcp-add(name: "jira-mcp", activate: true)

# Step 2: Use after registration
mcp-exec(
  name: "get_jira_issue",
  arguments: { key: "PROJ-123" }
)
# Success: Issue data returned
```

**Why:**
- MCPs must be explicitly registered
- Tools aren't available until MCP is added
- Activation loads tools immediately

**Recovery:**
- Always mcp-add before mcp-exec
- Use activate: true to load tools immediately
- Verify registration with mcp-find

---

### Anti-Pattern 11: Configuring MCP with Wrong Key Names

**❌ WRONG - Configuration key doesn't match**
```python
mcp-config-set(
  server: "jira",
  key: "jira_api_token",  # Wrong key name
  value: "abc123"
)
# Error or silently fails

mcp-config-set(
  server: "confluence",
  key: "Password",  # Case-sensitive - wrong case
  value: "secret"
)
# Might not work depending on MCP
```

**✅ CORRECT - Check MCP documentation for exact keys**
```python
mcp-find(query: "jira")
# Review documentation in results

mcp-config-set(
  server: "jira",
  key: "api_token",  # Check exact key from docs
  value: "abc123"
)
# Success: Configured correctly
```

**Why:**
- Each MCP defines its own configuration keys
- Key names are case-sensitive
- Configuration fails silently if key is wrong

**Recovery:**
- mcp-find to get documentation
- Check MCP documentation for exact keys
- Case-sensitive configuration keys

---

### Anti-Pattern 12: Servers Array as String in code-mode

**❌ WRONG - Servers as comma-separated string**
```python
code-mode(
  servers: "github, jira",  # String!
  name: "github-jira-sync"
)
# Error: "Expected array"

code-mode(
  servers: ["github, jira"],  # Array with one string!
  name: "sync"
)
# Tries to find MCP named "github, jira" → fails
```

**✅ CORRECT - Servers as JSON array**
```python
code-mode(
  servers: ["github", "jira"],  # Proper array!
  name: "github-jira-sync"
)
# Success: Combined tool created
```

**Why:**
- MCP names are individual items
- Must be separate array elements
- String parsing is ambiguous

**Recovery:**
- Use array format: `["server1", "server2"]`
- One server name per array element
- Never quote multiple names as one string

---

## Decision Trees for Common Tasks

### When to Use Which File Tool?

```
Need to read file?
  → read_file (with optional limit parameter)

Need to modify existing file?
  → read_file first (to get exact text)
  → edit_file (for targeted changes)

Need to create new file?
  → write_file (replaces entire file)

Need to replace entire file safely?
  → read_file (backup)
  → write_file (new content)

Need to rename/move file?
  → move_file (source → destination)

Need to understand structure?
  → list_directory (files in directory)
  → directory_tree (recursive structure)

Need to find files?
  → search_files (recursive pattern match)

Need metadata?
  → get_file_info (size, dates, permissions)
```

### When to Use Which Git Tool?

```
Check current state?
  → git_status (what changed?)
  → git_log (commit history)

Review changes?
  → git_diff_staged (what will commit?)
  → git_diff_unstaged (what's not staged?)
  → git_diff [target] (compare branches)

Stage files?
  → git_add [files] (stage specific files)

Commit changes?
  → git_commit (after staging)
  → git_log (verify in history)

Switch branches?
  → git_checkout [branch] (switch to existing)

Inspect commits?
  → git_show [commit] (view commit details)

Undo staging?
  → git_reset (unstage all)
```

---

## Quick Reference: Top 10 Mistakes

| # | Mistake | Fix | Prevention |
|---|---------|-----|-----------|
| 1 | Relative paths | Use absolute paths | Always use full filesystem paths |
| 2 | Edit without reading | Read first, copy exact text | `read_file` before `edit_file` |
| 3 | Overwrite without backup | Use `edit_file` for changes | Never use `write_file` for updates |
| 4 | Files as string | Use array: `["f1", "f2"]` | Check git_add examples |
| 5 | Commit without staging | Use `git_add` first | Check git_status first |
| 6 | Switch to nonexistent branch | Check git_log first | Verify branch exists |
| 7 | Unescaped newlines in message | Use `\n` for breaks | Test message format |
| 8 | Add MCP that doesn't exist | Use mcp-find first | Search before adding |
| 9 | Use tool before MCP registered | mcp-add first | Register before executing |
| 10 | Wrong config key | Check MCP docs | Review mcp-find results |

---

**Last Updated:** 2025-12-08  
**Common Mistakes Documented:** 12  
**Quick Reference Guide:** Included above
