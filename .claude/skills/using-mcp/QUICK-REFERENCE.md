# MCP Tools - Quick Reference (One Page)

## File I/O Operations

| Tool | Purpose | Key Arguments |
|------|---------|---------------|
| `read_file` | Read file contents | `path` (absolute path) |
| `write_file` | Create/overwrite file | `path`, `content` (both required) |
| `edit_file` | Replace text in file | `path`, `old_string`, `new_string` (exact match) |
| `list_directory` | List files in directory | `path` |
| `directory_tree` | Recursive JSON structure | `path` |
| `create_directory` | Create nested dirs | `path` (idempotent) |
| `get_file_info` | File metadata (size, dates) | `path` |
| `move_file` | Rename/move file | `source`, `destination` |
| `search_files` | Find files by pattern | `path`, `pattern` (recursive) |

## Git Operations

| Tool | Purpose | Key Arguments |
|------|---------|---------------|
| `git_status` | Show working tree status | `repo_path` |
| `git_log` | Show commit history | `repo_path`, `max_count` (optional) |
| `git_diff` | Compare branches/commits | `repo_path`, `target` |
| `git_diff_staged` | Show staged changes | `repo_path` |
| `git_diff_unstaged` | Show unstaged changes | `repo_path` |
| `git_add` | Stage files | `repo_path`, `files: ["file1", "file2"]` |
| `git_commit` | Commit staged changes | `repo_path`, `message` |
| `git_checkout` | Switch branch | `repo_path`, `branch_name` |
| `git_reset` | Unstage all files | `repo_path` |
| `git_show` | Show commit details | `repo_path`, `revision` |

## MCP Management

| Tool | Purpose | Key Arguments |
|------|---------|---------------|
| `mcp-find` | Search MCP catalog | `query` (search term); `limit` (optional) |
| `mcp-add` | Register MCP | `name` (exact from catalog); `activate` (optional) |
| `mcp-remove` | Unregister MCP | `name` |
| `mcp-config-set` | Configure MCP | `server`, `key`, `value` |
| `mcp-exec` | Call MCP tool | `name`, `arguments` |
| `code-mode` | Combine multiple MCPs | `servers: ["mcp1", "mcp2"]`, `name` |

## Essential Patterns (CRITICAL!)

### ❌ WRONG vs ✅ RIGHT

**Paths:**
- ❌ `./file.txt` → ✅ `/full/path/to/your/project/file.txt`

**Arrays (git_add, code-mode):**
- ❌ `files: "file1, file2"` → ✅ `files: ["file1", "file2"]`

**Edit matching:**
- ❌ `oldText: "const x = 1"` → ✅ Copy exact text: `"  const x = 1;\n"`

**Commit messages:**
- ❌ Unescaped newlines → ✅ `message: "Title\n\nBody"`

**MCP discovery:**
- ❌ `mcp-add("custom-mcp")` → ✅ `mcp-find("custom")` first, then add exact name

## Quick Decision: Which Layer?

| Task | Layer | Example |
|------|-------|---------|
| Quick/immediate | 1 | Read file, search code, git check |
| Batch (10+ items) | 2 | Export 50 tickets, import CSV |
| Complex specialized | 3 | Complex Jira search, cross-system link |

## Top 5 Most Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Path not found" | Relative path used | Always use absolute paths |
| "oldText did not match" | Exact whitespace not copied | Read file first, copy exact text |
| "Expected array" | Files as string: `"f1, f2"` | Use array: `["f1", "f2"]` |
| "MCP not found" | Exact name wrong | Use `mcp-find`, copy exact name |
| "Edit failed" | File doesn't exist | Check with `list_directory` first |

## Workflow Checklist

- [ ] **Identify task type** (quick? batch? complex?)
- [ ] **Choose layer** (1, 2, or 3)
- [ ] **Check prerequisites** (file exists? branch exists? MCP registered?)
- [ ] **Use correct arguments** (absolute paths, arrays, exact names)
- [ ] **Read before edit** (for file editing tasks)
- [ ] **Verify result** (git diff, git status, directory listing)

## Layer Costs

- **Layer 1:** 100-500 tokens per operation (already loaded)
- **Layer 2:** 0 MCP tokens (script runs independently)
- **Layer 3:** ~900 first time, ~100-300 subsequent (MCP stays loaded)

---

**For detailed documentation:** See SKILL.md, TOOLS-REFERENCE.md, EXAMPLES.md, DECISION-MATRICES.md

