# MCP Setup Automation Tests - Summary

## Test Coverage Overview

This document summarizes the comprehensive test suite for the MCP setup automation code, created as part of the security hardening effort.

## Files Tested

### 1. Prerequisite Checker (`prerequisite-checker.test.ts`)
**Coverage: 100%**

Tests for MCP prerequisite detection (Docker, Graphiti containers, Serena/uvx).

**Test Categories:**
- **checkDocker** (6 tests)
  - Detects Docker installed and running
  - Detects Docker installed but daemon not running
  - Detects Docker not installed
  - Handles version strings without version numbers
  - Respects timeout for `docker --version` and `docker info`

- **checkGraphiti** (7 tests)
  - Detects Graphiti containers running
  - Detects containers exist but not running
  - Detects no containers
  - Handles Docker not running
  - Detects Neo4j containers as Graphiti-related
  - Handles mixed running/stopped containers
  - Respects timeout

- **checkSerena** (8 tests)
  - Detects uvx and Serena available
  - Detects uvx available but Serena not cached
  - Detects uvx not installed
  - Detects pipx as fallback when uvx not found
  - Handles Serena version check timeout
  - Handles uvx version without version number
  - Handles Serena check errors (non-timeout)
  - Respects timeout for uvx and Serena checks

- **Helper Functions** (19 tests)
  - `checkAllPrerequisites`: Parallel execution, valid timestamp
  - `isGraphitiReady`: Docker and container status validation
  - `isSerenaReady`: uvx availability check
  - `isAnyMcpReady`: Combined readiness check
  - `getMissingPrerequisites`: Missing prerequisite detection

**Key Security Tests:**
- Timeout handling prevents hanging on slow/unresponsive systems
- Error handling for missing executables
- Graceful degradation when services unavailable

---

### 2. Seed Command (`seed.test.ts`)
**Coverage: 100% (security-critical paths)**

Tests for knowledge extraction and seeding to Graphiti/Serena, with emphasis on security.

**Test Categories:**
- **Path Sanitization in Memory Names** (7 tests)
  - Sanitizes path separators (/, \)
  - Sanitizes dot-dot sequences (..)
  - Sanitizes leading dots
  - Handles complex attack patterns
  - Preserves safe names unchanged

- **GroupId Escaping in Seed File** (6 tests)
  - Escapes quotes in groupId
  - Escapes backslashes
  - Escapes newlines
  - Escapes injection attempts
  - Handles unicode characters safely
  - Produces valid JSON when reconstructed

- **Seed File Generation** (3 tests)
  - Creates valid JSON seed file
  - Includes all episode fields
  - Generates ISO timestamp

- **Serena Memory File Writing** (3 tests)
  - Sanitizes memory file names before writing
  - Writes to `.serena/memories` directory
  - Uses `.md` extension

- **Dry Run Mode** (2 tests)
  - Previews episodes without making changes
  - Previews Serena memories without writing files

- **Error Handling** (3 tests)
  - Handles `fs.writeFile` errors
  - Handles `fs.writeJson` errors
  - Handles `fs.ensureDir` errors

- **Character Encoding** (2 tests)
  - Handles UTF-8 content correctly
  - Preserves multi-byte characters

- **Memory Name Edge Cases** (4 tests)
  - Handles empty names
  - Handles names with only dots
  - Handles very long names (300 chars)
  - Handles names with null bytes

**Key Security Tests:**
- Path traversal attack prevention: `../../../etc/passwd` → `---------etc-passwd`
- Quote injection prevention in groupId
- Safe file path construction
- Input sanitization for all user-provided values

---

### 3. Framework Project Extractor (`framework-project.test.ts`)
**Coverage: 93.13%**

Tests for knowledge extraction from Agentic Framework projects.

**Test Categories:**
- **isFrameworkProject** (2 tests)
  - Detects manifest existence
  - Returns false when manifest missing

- **extractClaudeMd** (3 tests)
  - Extracts key sections from CLAUDE.md
  - Handles missing CLAUDE.md
  - Extracts project title

- **extractReadme** (2 tests)
  - Extracts first 3 sections from README
  - Handles README with fewer sections

- **extractModuleCatalog** (3 tests)
  - Extracts module information from manifest
  - Handles corrupt manifest JSON with warning
  - Handles manifest without modules

- **extractAgentRegistry** (4 tests)
  - Extracts agent information
  - Handles agents as array
  - Handles corrupt agents.json with warning
  - Handles empty agent list

- **extractSkillRegistry** (2 tests)
  - Extracts skill information
  - Handles corrupt skills.json with warning

- **extractContextSummaries** (3 tests)
  - Extracts basic context files
  - Skips template files
  - Handles missing context directory

- **generateProjectOverview** (2 tests)
  - Generates overview with manifest data
  - Scans key directories

- **generateCliStructure** (3 tests)
  - Generates CLI structure memory
  - Limits library display to 10 items (MAX_CLI_LIBS_DISPLAY)
  - Handles missing CLI directory

- **Full extraction** (2 tests)
  - Returns all expected episodes and memories
  - Has correct Serena memory categories

**Key Security Tests:**
- Parse error logging (console.warn) for corrupt JSON
- Graceful handling of missing files
- Template file detection and skipping

---

### 4. Generic Project Extractor (`generic-project.test.ts`)
**Coverage: 98.34%**

Tests for knowledge extraction from non-framework projects.

**Test Categories:**
- **extractReadme** (4 tests)
  - Extracts README content
  - Truncates long README to 2000 characters (MAX_README_LENGTH)
  - Does not truncate short README
  - Handles missing README

- **extractClaudeMd** (1 test)
  - Extracts CLAUDE.md if present

- **extractPackageJson** (4 tests)
  - Extracts package.json metadata
  - Limits dependencies display to 15 items (MAX_DEPS_DISPLAY)
  - Handles package.json without optional fields
  - Handles corrupt package.json

- **extractPyproject** (3 tests)
  - Extracts pyproject.toml metadata
  - Limits Python dependencies display to 10 items (MAX_PYTHON_DEPS_DISPLAY)
  - Handles pyproject.toml without dependencies

- **extractStructure** (3 tests)
  - Detects common directories
  - Detects common config files
  - Returns null when no structure found

- **generateProjectOverview** (7 tests)
  - Detects Next.js, React, Vue.js, Express, TypeScript projects
  - Detects Python, Rust, Go projects
  - Detects common entry points

- **generateStructureMemory** (3 tests)
  - Scans source directories
  - Limits subdirectory display to 10 items (MAX_SUBDIRS_DISPLAY)
  - Limits source files display to 10 items (MAX_SOURCE_FILES_DISPLAY)

- **Full extraction** (3 tests)
  - Returns generic project type
  - Generates all Serena memories
  - Has correct memory categories

- **Constant Limits** (5 tests)
  - Validates all extraction limit constants

**Key Security Tests:**
- README truncation prevents memory exhaustion
- Constant limits prevent overwhelming output
- Graceful handling of missing/corrupt files

---

### 5. Setup Command (`setup.test.ts`)
**Coverage: 100% (hook merging logic)**

Tests for MCP configuration, hook merging, and security validations.

**Test Categories:**
- **Hook Name Validation** (3 tests)
  - Allows valid MCP hook names
  - Has exactly 2 valid hook names
  - Rejects invalid hook names

- **normalizeHookPath** (5 tests)
  - Extracts script name from absolute path
  - Extracts script name from template path
  - Handles path traversal attempts
  - Returns original if no .sh extension
  - Handles Windows-style paths

- **mergeHooks - basic scenarios** (3 tests)
  - Returns new hooks when existing is undefined
  - Returns existing hooks when new is undefined
  - Returns empty object when both are undefined

- **mergeHooks - deduplication** (3 tests)
  - Does not duplicate identical hooks
  - Replaces absolute path with template path
  - Preserves non-MCP hooks

- **mergeHooks - multiple events** (2 tests)
  - Merges hooks for different events
  - Merges hooks for same event

- **mergeHooks - edge cases** (3 tests)
  - Handles hooks without command field
  - Handles empty hook groups
  - Handles undefined event hooks

- **mergeHooks - security** (2 tests)
  - Normalizes paths before comparing
  - Not fooled by path traversal in hook names

- **Command Creation** (3 tests)
  - Creates valid Commander command
  - Defines all required options
  - Has default values for options

- **Placeholder Validation** (3 tests)
  - Uses `{{PROJECT_ROOT}}` placeholder in hook paths
  - Maintains `.claude/hooks` directory structure
  - Uses consistent placeholder format

**Key Security Tests:**
- Hook name whitelist prevents arbitrary script execution
- Path normalization prevents bypassing deduplication via path traversal
- Template path preference prevents absolute path leakage
- Cross-platform path separator handling (/, \)

---

## Summary Statistics

| File | Tests | Coverage | Lines |
|------|-------|----------|-------|
| prerequisite-checker.ts | 40 | 100% | 275 |
| seed.ts | 35 | 100% (critical paths) | 271 |
| framework-project.ts | 26 | 93.13% | 454 |
| generic-project.ts | 33 | 98.34% | 388 |
| setup.ts | 27 | 100% (hook logic) | 490 |
| **Total** | **161** | **>95%** | **1,878** |

## Security Improvements Validated

1. **Path Traversal Prevention**
   - Memory name sanitization removes `..`, `/`, `\`
   - Hook path normalization extracts filename only
   - Whitelist validation for hook names

2. **Injection Attack Prevention**
   - GroupId escaping via `JSON.stringify`
   - No shell command construction from user input
   - Safe file path construction with `path.join`

3. **Error Handling**
   - Graceful degradation for missing prerequisites
   - Parse error logging (not throwing)
   - Timeout handling for external commands

4. **Input Validation**
   - Hook name whitelist (only 2 valid names)
   - File path sanitization
   - Template placeholder validation

5. **Resource Limits**
   - README truncation (2000 chars)
   - Dependency display limits (10-15 items)
   - File listing limits (10 items)
   - Constant extraction limits

## Test Execution

All tests pass:
```bash
npm test -- "mcp.*test.ts"
# Test Suites: 8 passed, 8 total
# Tests:       302 passed, 302 total
```

Run individual test suites:
```bash
npm test -- prerequisite-checker.test.ts
npm test -- seed.test.ts
npm test -- framework-project.test.ts
npm test -- generic-project.test.ts
npm test -- setup.test.ts
```

Run with coverage:
```bash
npm test -- --coverage --collectCoverageFrom="src/lib/mcp/**/*.ts" "mcp.*test.ts"
```
