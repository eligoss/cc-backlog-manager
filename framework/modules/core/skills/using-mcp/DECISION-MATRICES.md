# MCP Usage: Decision Matrices

Comprehensive matrices showing which MCP layer to use for any task.

---

## File Operations

| Operation | Layer 1 | Layer 2 | Layer 3 | Recommended |
|-----------|---------|---------|---------|-------------|
| **Read file** | ✅ **BEST** | ❌ No | ❌ No | **Layer 1** |
| **Write file** | ✅ **BEST** | ❌ No | ❌ No | **Layer 1** |
| **Edit specific content** | ✅ **BEST** | ❌ No | ❌ No | **Layer 1** |
| **Find files by pattern** | ✅ **BEST** | ❌ No | ❌ No | **Layer 1** |
| **Search file contents** | ✅ **BEST** | ❌ No | ❌ No | **Layer 1** |
| **Bulk copy files** | ⚠️ Maybe | ✅ **BEST** | ❌ No | **Layer 2** |
| **Bulk move/rename** | ⚠️ Maybe | ✅ **BEST** | ❌ No | **Layer 2** |
| **Complex file transformations** | ❌ No | ✅ **BEST** | ❌ No | **Layer 2** |

---

## Git Operations

| Operation | Layer 1 | Layer 2 | Layer 3 | Recommended |
|-----------|---------|---------|---------|-------------|
| **Check git status** | ✅ **BEST** | ❌ No | ❌ No | **Layer 1** |
| **View git log** | ✅ **BEST** | ❌ No | ❌ No | **Layer 1** |
| **Check git diff** | ✅ **BEST** | ❌ No | ❌ No | **Layer 1** |
| **Create git commit** | ✅ **BEST** | ❌ No | ❌ No | **Layer 1** |
| **Switch branch** | ✅ **BEST** | ❌ No | ❌ No | **Layer 1** |
| **Merge branches** | ✅ **BEST** | ⚠️ Maybe | ❌ No | **Layer 1** |
| **Bulk commits (10+)** | ⚠️ Slow | ✅ **BEST** | ❌ No | **Layer 2** |

---

## Analysis & Planning

| Operation | Layer 1 | Layer 2 | Layer 3 | Recommended |
|-----------|---------|---------|---------|-------------|
| **Complex problem-solving** | ✅ **BEST** | ❌ No | ⚠️ Maybe | **Layer 1** |
| **Decision analysis** | ✅ **BEST** | ❌ No | ❌ No | **Layer 1** |
| **Code pattern analysis** | ✅ **BEST** | ❌ No | ❌ No | **Layer 1** |
| **Planning/design** | ✅ **BEST** | ❌ No | ❌ No | **Layer 1** |
| **Strategy evaluation** | ✅ **BEST** | ❌ No | ❌ No | **Layer 1** |
| **Large-scale analysis** | ⚠️ Maybe | ⚠️ Maybe | ✅ **BEST** | **Layer 3** |

---

## Jira Operations

| Operation | Layer 1 | Layer 2 | Layer 3 | Recommended |
|-----------|---------|---------|---------|-------------|
| **Search Jira issues** | ❌ No | ⚠️ Maybe | ✅ **BEST** | **Layer 3** |
| **Create 1 issue** | ❌ No | ⚠️ Maybe | ✅ **BEST** | **Layer 3** |
| **Update issue field** | ❌ No | ❌ No | ✅ **BEST** | **Layer 3** |
| **Export 10-50 tickets** | ❌ No | ✅ **BEST** | ⚠️ Maybe | **Layer 2** |
| **Export 100+ tickets** | ❌ No | ✅ **BEST** | ⚠️ Maybe | **Layer 2** |
| **Import Jira CSV** | ❌ No | ✅ **BEST** | ❌ No | **Layer 2** |
| **Complex JQL search** | ❌ No | ❌ No | ✅ **BEST** | **Layer 3** |
| **Bulk update (20+)** | ❌ No | ✅ **BEST** | ⚠️ Maybe | **Layer 2** |

---

## Confluence Operations

| Operation | Layer 1 | Layer 2 | Layer 3 | Recommended |
|-----------|---------|---------|---------|-------------|
| **Search Confluence** | ❌ No | ⚠️ Maybe | ✅ **BEST** | **Layer 3** |
| **Create page** | ❌ No | ✅ **BEST** | ⚠️ Maybe | **Layer 2** |
| **Update page** | ❌ No | ✅ **BEST** | ⚠️ Maybe | **Layer 2** |
| **Fetch page content** | ❌ No | ✅ **BEST** | ⚠️ Maybe | **Layer 2** |
| **Import pages (5+)** | ❌ No | ✅ **BEST** | ❌ No | **Layer 2** |
| **Publish batch (10+)** | ❌ No | ✅ **BEST** | ❌ No | **Layer 2** |
| **Link to Jira** | ❌ No | ⚠️ Maybe | ✅ **BEST** | **Layer 3** |

---

## Data Operations

| Operation | Layer 1 | Layer 2 | Layer 3 | Recommended |
|-----------|---------|---------|---------|-------------|
| **Parse CSV** | ❌ No | ✅ **BEST** | ❌ No | **Layer 2** |
| **Export to CSV** | ❌ No | ✅ **BEST** | ❌ No | **Layer 2** |
| **Format conversion** | ❌ No | ✅ **BEST** | ❌ No | **Layer 2** |
| **JSON transformation** | ⚠️ Maybe | ✅ **BEST** | ❌ No | **Layer 2** |
| **Database query** | ❌ No | ⚠️ Maybe | ✅ **BEST** | **Layer 3** |
| **Transform data (batch)** | ❌ No | ✅ **BEST** | ❌ No | **Layer 2** |

---

## Integration Operations

| Operation | Layer 1 | Layer 2 | Layer 3 | Recommended |
|-----------|---------|---------|---------|-------------|
| **Simple file sync** | ✅ **BEST** | ⚠️ Maybe | ❌ No | **Layer 1** |
| **Complex sync (multi-sys)** | ❌ No | ✅ **BEST** | ✅ **BEST** | **Layer 2 or 3** |
| **Link Jira ↔ Confluence** | ❌ No | ⚠️ Maybe | ✅ **BEST** | **Layer 3** |
| **Cross-system queries** | ❌ No | ⚠️ Maybe | ✅ **BEST** | **Layer 3** |
| **Batch import** | ❌ No | ✅ **BEST** | ❌ No | **Layer 2** |
| **Batch export** | ❌ No | ✅ **BEST** | ❌ No | **Layer 2** |

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ **BEST** | Optimal choice, use first |
| ⚠️ Maybe | Works but not ideal, use if BEST unavailable |
| ❌ No | Not suitable, choose different layer |

---

## Layer Selection by Task Volume

### Single Item / One-Time Operation
```
File operation?           → Layer 1
Git operation?            → Layer 1
Analysis/planning?        → Layer 1
Domain CRUD (Jira/etc)?   → Layer 3
```

### Small Batch (2-9 items)
```
Simple file copy?         → Layer 1 (manual loop)
Simple Jira search?       → Layer 1 or 3
Simple Confluence?        → Layer 1 or 2
Analysis task?            → Layer 1
```

### Medium Batch (10-50 items)
```
File operations?          → Layer 2 (create script)
Format conversion?        → Layer 2 (script)
Jira export?              → Layer 2 (script exists)
Confluence publish?       → Layer 2 (script)
Complex operation?        → Layer 2 or 3
```

### Large Batch (100+ items)
```
Jira export?              → Layer 2 (optimized script)
CSV import/export?        → Layer 2 (bulk handling)
Format conversion?        → Layer 2 (batch capable)
Repeated operation?       → Layer 2 (proven, tested)
```

---

## Quick Selection by Task Type

### Type: Quick Task (< 5 minutes, no setup)
```
→ Layer 1 (Reference MCPs)
Examples: File read, git check, search code
```

### Type: Batch Task (10+ items, repeatable)
```
→ Layer 2 (Custom Scripts)
→ Fallback: Layer 3 if script unavailable
Examples: Export, import, bulk operations
```

### Type: Specialized Task (Domain-specific, complex)
```
→ Layer 2 if script exists
→ Layer 3 if script unavailable
→ Fallback: Layer 1 if MCP unavailable
Examples: Cross-system linking, advanced searches
```

### Type: Interactive Task (User feedback needed)
```
→ Layer 3 for domain operations (Jira CRUD)
→ Layer 1 for file/git operations
Examples: Create issue, update record, interactive questions
```

---

## Decision Rules (Priority Order)

### Rule 1: Batch Processing?
```
10+ items?
  YES → Try Layer 2 (script) first
        If script unavailable → Try Layer 3 (MCP)
  NO → Go to Rule 2
```

### Rule 2: Time Sensitive / Quick?
```
Need immediate result?
  YES → Use Layer 1 (reference MCPs)
        Or Layer 3 if Layer 1 insufficient
  NO → Go to Rule 3
```

### Rule 3: Specialized Domain?
```
Jira? Confluence? AWS? Database?
  YES → Layer 2 (if script exists) or Layer 3 (discover MCP)
  NO → Use Layer 1
```

### Rule 4: Fallback if Primary Unavailable
```
Primary approach blocked?
  → Use next available layer
  → Never block user waiting
  → Graceful degradation always
```

---

## Token Efficiency by Layer

### Layer 1 (Reference MCPs)
```
Setup cost:     0 tokens (always loaded)
Operation cost: 100-500 tokens per operation
Total:          100-500 tokens (minimal)

Best for:       Quick, immediate tasks
```

### Layer 2 (Custom Scripts)
```
Setup cost:     0 tokens (no MCPs)
Operation cost: 0 MCP tokens (script runs independently)
Result return:  100-1000 tokens (result size)
Total:          100-1000 tokens (no MCP overhead)

Best for:       Batch, repeated, complex
```

### Layer 3 (Dynamic MCPs)
```
Setup cost:     200 tokens (discovery) + 600 tokens (loading)
Operation cost: 100-300 tokens per operation
Total first use: ~900 tokens

Subsequent use: ~100-300 tokens (MCP stays loaded)

Best for:       Complex specialized operations
```

**Efficiency Ranking:**
1. **Layer 1** (Reference MCPs) - Most efficient
2. **Layer 2** (Scripts) - Very efficient (no MCP cost)
3. **Layer 3** (Dynamic) - Efficient for complex ops, higher initial cost

---

## When to Optimize

### Don't Optimize If:
- ✅ Task completes successfully
- ✅ Performance acceptable
- ✅ Token usage reasonable
- ✅ User satisfied

### Optimize If:
- ❌ Same operation repeated 5+ times per month
- ❌ Takes >30 seconds per operation
- ❌ Token usage >1000 per operation
- ❌ Multiple users doing same task

**Optimization:** Create Layer 2 script for repeated operations

---

## Common Mistakes

### Mistake 1: Using Layer 3 for Everything
```
❌ WRONG: Always discover MCPs, even for quick tasks
✅ RIGHT: Use Layer 1 for quick tasks (80% of operations)
```

### Mistake 2: Not Using Scripts for Batch
```
❌ WRONG: Loop Layer 1 operations for 50 items
✅ RIGHT: Create Layer 2 script (much faster)
```

### Mistake 3: Hardcoding MCP Dependencies
```
❌ WRONG: Task fails if MCP unavailable
✅ RIGHT: MCP optional, always have fallback
```

### Mistake 4: Not Gracefully Degrading
```
❌ WRONG: Wait for MCP discovery, block user
✅ RIGHT: Try Layer 1, then Layer 3, always respond
```

### Mistake 5: Mixing Layers Inefficiently
```
❌ WRONG: Discover MCP for single file operation
✅ RIGHT: Use Layer 1 for single file, Layer 3 only for complex bulk
```

---

## Example Decisions

### Decision 1: Export 100 Jira Tickets
```
Volume:         100 items (batch)
Operation:      Export to format
CLI command?    YES (agentic-framework jira export)

Decision Path:
→ Layer 2 (CLI) - Optimal

Why?
- ✅ Batch operation (100 items)
- ✅ Format conversion (complex)
- ✅ Script exists and tested
- ✅ No MCP tokens needed
- ✅ Fast, reliable, repeatable
```

### Decision 2: Find Code Pattern
```
Task:           Search codebase
Volume:         Variable (not batch processing)
Specialization: General code analysis

Decision Path:
→ Layer 1 (Reference MCPs) - Optimal

Why?
- ✅ Immediate execution
- ✅ Built-in tools sufficient
- ✅ Not batch operation
- ✅ Quick response
- ✅ Minimal token cost
```

### Decision 3: Complex Jira Search
```
Task:           Search with custom JQL filters
Volume:         50-100 results (interactive)
Specialization: Jira domain

Decision Path:
→ Layer 3 (Discover MCP) - Optimal

Why?
- ✅ Specialized Jira MCP needed
- ✅ Complex JQL capabilities
- ✅ Interactive result review
- ✅ Single operation (not batch)
- ✅ Custom filtering needed
```

### Decision 4: Link Jira + Confluence Pages
```
Task:           Cross-system linking
Volume:         20 items
Specialization: Multi-system domain

Decision Path:
→ Layer 2 (Script) if script can be created
→ Layer 3 (Discover MCP) if script unavailable
→ Layer 1 (Manual) if both unavailable

Why?
- ✅ Complex cross-system operation
- ✅ Batch volume (20 items)
- ✅ Try script first (best long-term)
- ✅ Use MCP if script unavailable
- ✅ Have fallback approach
```

---

**Matrix Status:** Comprehensive, covers all operation types and volumes
**Last Updated:** 2025-12-07
**Applies to:** Any project using MCP discovery framework
