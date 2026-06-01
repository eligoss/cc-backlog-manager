# MCP Tools - Complete Argument Reference

## File I/O Operations

### read_file
**Purpose:** Read file contents with syntax highlighting for code  
**Category:** File I/O | Foundation

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `file_path` | string | ✅ Yes | - | Absolute path to file. Can read images, PDFs, Jupyter notebooks |
| `limit` | number | ❌ No | 2000 | Max lines to read from start |
| `offset` | number | ❌ No | 0 | Line number to start from |

**Return:** File contents with line numbers (format: `line_num\tcontent`)

**Errors & Recovery:**
- "Cannot find file" → Verify absolute path with `list_directory` first
- "Permission denied" → Check file permissions in `get_file_info`
- "Path is directory" → Use `list_directory` for directories

---

### write_file
**Purpose:** Create or completely overwrite file with new content  
**Category:** File I/O | Destructive

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `file_path` | string | ✅ Yes | - | Absolute path. Creates parent dirs if needed |
| `content` | string | ✅ Yes | - | Full file content. No partial writes |

**Return:** Success confirmation with file path

**Errors & Recovery:**
- "Parent directory doesn't exist" → Use `create_directory` first
- "File already exists" → Overwrites completely (no backup)

**Workflow:**
1. Usually precede with `read_file` to preserve content
2. Or use `edit_file` for partial changes
3. Always verify path with `list_directory` first

---

### edit_file
**Purpose:** Replace specific text sequences in a file  
**Category:** File I/O | Surgical

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `file_path` | string | ✅ Yes | - | Absolute path to existing file |
| `old_string` | string | ✅ Yes | - | **MUST match exactly** (whitespace matters) |
| `new_string` | string | ✅ Yes | - | Replacement text (can be different length) |
| `replace_all` | boolean | ❌ No | false | Replace all occurrences (if not unique) |

**Return:** Diff showing changes made

**Critical Rules:**
- `old_string` MUST be unique or set `replace_all: true`
- Whitespace and indentation must match EXACTLY
- Line endings must match (include `\n` if needed)
- Cannot edit without reading file first

**Workflow:**
1. `read_file` → examine exact whitespace
2. Copy exact text including indentation
3. Use `edit_file` with that exact text

---

### list_directory
**Purpose:** Get detailed listing of all files and directories  
**Category:** File I/O | Discovery

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `path` | string | ✅ Yes | - | Absolute directory path |

**Return:** Array of [FILE] and [DIR] entries with full paths

**Usage:**
- Verify path exists before other operations
- Explore directory structure
- Check for specific files before reading

---

### directory_tree
**Purpose:** Get recursive tree view of files as JSON structure  
**Category:** File I/O | Structure

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `path` | string | ✅ Yes | - | Absolute path (file or directory) |

**Return:** JSON with `name`, `type` (file/directory), `children` array

**Usage:**
- Understand deep directory structures
- Generate documentation of structure
- Validate project organization

---

### create_directory
**Purpose:** Create directory or ensure it exists  
**Category:** File I/O | Setup

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `path` | string | ✅ Yes | - | Absolute path (can create nested dirs) |

**Return:** Success confirmation

**Behavior:**
- Creates all parent directories automatically
- Idempotent: safe to call multiple times
- No error if already exists

**Example:**
```
path: "/full/path/to/your/project/src/components/ui"
→ Creates all intermediate directories if needed
```

---

### get_file_info
**Purpose:** Get detailed metadata about file/directory  
**Category:** File I/O | Metadata

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `path` | string | ✅ Yes | - | Absolute file or directory path |

**Return:** Size, creation time, modified time, permissions, type

**Use for:**
- Check file exists before operations
- Verify file size before reading
- Get modification time for cache busting
- Check permissions

---

### move_file
**Purpose:** Rename or move file to new location  
**Category:** File I/O | Organization

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `source` | string | ✅ Yes | - | Current absolute path |
| `destination` | string | ✅ Yes | - | New absolute path |

**Return:** Success confirmation

**Errors:**
- "Destination exists" → Operation fails if target already exists
- "Source not found" → Verify with `get_file_info` first

---

### search_files
**Purpose:** Recursively search files by pattern  
**Category:** File I/O | Search

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `path` | string | ✅ Yes | - | Start directory (absolute) |
| `pattern` | string | ✅ Yes | - | Case-insensitive partial match |
| `excludePatterns` | string[] | ❌ No | [] | Patterns to skip |

**Return:** Array of full paths matching pattern

**Use for:**
- Find files by name: `pattern: "test"`
- Find by extension: `pattern: ".md"`
- Recursively search all subdirectories

---

## Git Operations

### git_add
**Purpose:** Stage files for commit  
**Category:** Git | Staging

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `repo_path` | string | ✅ Yes | - | Absolute path to repo root |
| `files` | string[] | ✅ Yes | - | **ARRAY of file paths** (relative to repo) |

**Return:** Confirmation of staged files

**Critical:** Files must be array, not string
```
✅ files: ["file1.txt", "file2.ts"]
❌ files: "file1.txt, file2.ts"
```

---

### git_commit
**Purpose:** Record staged changes to repository  
**Category:** Git | History

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `repo_path` | string | ✅ Yes | - | Absolute path to repo root |
| `message` | string | ✅ Yes | - | Commit message (escape special chars) |

**Return:** Commit hash and summary

**Message Format:**
- Keep clear and concise
- Escape newlines: `"msg\n\ndetails"`
- Escape quotes: `"msg with \"quoted\" text"`

---

### git_status
**Purpose:** Show working tree status  
**Category:** Git | Inspection

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `repo_path` | string | ✅ Yes | - | Absolute path to repo root |

**Return:** Current branch, staged changes, unstaged changes

**Use for:**
- Verify state before committing
- Check for untracked files
- List modified files

---

### git_log
**Purpose:** Show commit history  
**Category:** Git | History

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `repo_path` | string | ✅ Yes | - | Absolute path to repo root |
| `max_count` | number | ❌ No | 10 | Number of commits to show |

**Return:** Array of recent commits (hash, author, message, date)

**Example:**
```
max_count: 50  → Last 50 commits
max_count: 1   → Last commit only
(omit)         → Last 10 commits (default)
```

---

### git_diff
**Purpose:** Show differences between branches or commits  
**Category:** Git | Comparison

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `repo_path` | string | ✅ Yes | - | Absolute path to repo root |
| `target` | string | ✅ Yes | - | Branch, commit, or `HEAD` |

**Return:** Unified diff format output

**Examples:**
```
target: "main"           → Diff against main branch
target: "HEAD~1"         → Diff against previous commit
target: "abc123def"      → Diff against specific commit
```

---

### git_diff_staged
**Purpose:** Show staged changes only  
**Category:** Git | Inspection

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `repo_path` | string | ✅ Yes | - | Absolute path to repo root |

**Return:** Diff of staged changes

---

### git_diff_unstaged
**Purpose:** Show unstaged working directory changes  
**Category:** Git | Inspection

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `repo_path` | string | ✅ Yes | - | Absolute path to repo root |

**Return:** Diff of unstaged changes

---

### git_checkout
**Purpose:** Switch to different branch  
**Category:** Git | Navigation

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `repo_path` | string | ✅ Yes | - | Absolute path to repo root |
| `branch_name` | string | ✅ Yes | - | Name of existing branch |

**Return:** Branch switched confirmation

**Error:** Branch must exist; check with `git_log` or `git_status` first

---

### git_reset
**Purpose:** Unstage all staged changes  
**Category:** Git | Staging

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `repo_path` | string | ✅ Yes | - | Absolute path to repo root |

**Return:** Confirmation of staged files reset

---

### git_show
**Purpose:** Show contents of specific commit  
**Category:** Git | History

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `repo_path` | string | ✅ Yes | - | Absolute path to repo root |
| `revision` | string | ✅ Yes | - | Commit hash, branch, or `HEAD` |

**Return:** Full diff and commit metadata

---

## MCP Management

### mcp-find
**Purpose:** Search for MCPs in catalog  
**Category:** MCP Mgmt | Discovery

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `query` | string | ✅ Yes | - | Search by name, title, or description (case-insensitive) |
| `limit` | number | ❌ No | 10 | Max results to return |

**Return:** Matching MCPs with details

**Usage:**
- Before `mcp-add`: Verify MCP exists in catalog
- Search by partial name: `query: "confluence"`
- Case-insensitive search

---

### mcp-add
**Purpose:** Register MCP server in session  
**Category:** MCP Mgmt | Installation

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `name` | string | ✅ Yes | - | Must exist in catalog (use mcp-find first) |
| `activate` | boolean | ❌ No | false | Load tools in current session immediately |

**Return:** Registration confirmation

**Workflow:**
1. `mcp-find` → verify name
2. `mcp-add` → register server
3. (optional) Set `activate: true` to load tools immediately

---

### mcp-remove
**Purpose:** Unregister MCP from session  
**Category:** MCP Mgmt | Cleanup

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `name` | string | ✅ Yes | - | Must be registered (check mcp-find) |

**Return:** Removal confirmation

---

### mcp-config-set
**Purpose:** Configure MCP server settings  
**Category:** MCP Mgmt | Configuration

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `server` | string | ✅ Yes | - | MCP server name |
| `key` | string | ✅ Yes | - | Configuration key (without server name prefix) |
| `value` | string/number/boolean/object/array | ✅ Yes | - | Config value (type varies by key) |

**Return:** Configuration update confirmation

**Usage:**
```
server: "atlassian"
key: "token"
value: "abc123xyz"
→ Configures Atlassian token
```

---

### mcp-exec
**Purpose:** Execute tool from registered MCP  
**Category:** MCP Mgmt | Execution

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `name` | string | ✅ Yes | - | Tool name (must exist in registered MCP) |
| `arguments` | string/number/boolean/object/array | ✅ Yes | - | Tool arguments (must match tool schema) |

**Return:** Tool execution result

**Workflow:**
1. `mcp-find` → discover MCP
2. `mcp-add` → register server
3. `mcp-exec` → call tool with correct arguments

---

## IDE Tools

### getDiagnostics
**Purpose:** Get language diagnostics from IDE  
**Category:** IDE | Analysis

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `uri` | string | ❌ No | - | File URI (optional; omit for all files) |

**Return:** Array of diagnostics (errors, warnings)

**Use for:**
- Check for syntax errors
- Find TypeScript type errors
- Verify code quality

---

### executeCode
**Purpose:** Execute Python code in Jupyter kernel  
**Category:** IDE | Execution

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `code` | string | ✅ Yes | - | Python code to execute |

**Return:** Output, errors, or results

**Usage:**
- Execute Python directly
- Test code fragments
- Interact with kernel state (persists across calls)

---

## Utility Tools

### code-mode
**Purpose:** Create JavaScript tool combining multiple MCPs  
**Category:** Utility | Scripting

**Arguments:**
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `servers` | string[] | ✅ Yes | - | Array of MCP server names |
| `name` | string | ✅ Yes | - | Name for new tool |

**Return:** New tool combining specified servers

**Usage:**
```
servers: ["github", "atlassian"]
name: "jira-github-sync"
→ Creates tool that can call both servers
```

---

## Category Summary

**File I/O:** read_file, write_file, edit_file, list_directory, directory_tree, create_directory, get_file_info, move_file, search_files

**Git Operations:** git_add, git_commit, git_status, git_log, git_diff, git_diff_staged, git_diff_unstaged, git_checkout, git_reset, git_show

**MCP Management:** mcp-find, mcp-add, mcp-remove, mcp-config-set, mcp-exec

**IDE & Utility:** getDiagnostics, executeCode, code-mode

---

**Last Updated:** 2025-12-09  
**Tools Documented:** 35 core tools  
**Scope:** Generic (applies to any project)
