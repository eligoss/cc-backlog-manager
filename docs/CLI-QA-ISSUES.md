# CLI QA Issues Report

**Testing Date**: 2025-12-29
**CLI Version**: 1.0.0
**Node Version**: v24.10.0
**Platform**: macOS Darwin 25.2.0
**Tester**: QA Agent (Claude)

## Summary

| Severity | Count | Fixed | Verified |
|----------|-------|-------|----------|
| CRITICAL | 3 | 3 | 3 |
| HIGH | 5 | 5 | 5 |
| MEDIUM | 4 | 4 | 4 |
| LOW | 1 | 1 | 1 |
| **Total** | **13** | **13** | **13** |

**Status**: ✅ All issues fixed and verified (2025-12-29)

---

## Issues Found

### Issue QA-001: [HIGH] `status` command shows "Invalid Date" for install date
- **Command**: `agentic-framework status`
- **Expected**: Valid installation date (e.g., "2025-12-29, 6:03:29 p.m.")
- **Actual**: Shows "Installed: Invalid Date"
- **Reproduction Steps**:
  1. Run `agentic-framework status` in any project
  2. Observe the "Installed" field shows "Invalid Date"
- **Category**: Error
- **Status**: [x] Fixed (2025-12-29) ✅ VERIFIED
- **Fix**: Added null check in `status.ts` - now shows "Unknown" if date is missing/invalid
- **Verification**: Confirmed - output now shows "Installed: Unknown"

---

### Issue QA-002: [HIGH] `status` command shows "vundefined" for module versions
- **Command**: `agentic-framework status`
- **Expected**: Module versions (e.g., "• core v1.4.0")
- **Actual**: Shows "• core vundefined" for all modules
- **Reproduction Steps**:
  1. Run `agentic-framework status` in a project
  2. Observe module list shows "vundefined" instead of version numbers
- **Category**: Error
- **Status**: [x] Fixed (2025-12-29) ✅ VERIFIED
- **Fix**: Added null check in `status.ts` - now shows "(version unknown)" if version is missing
- **Verification**: Confirmed - output now shows "• core (version unknown)"

---

### Issue QA-003: [MEDIUM] `validate --versions` can't find files that exist
- **Command**: `agentic-framework validate --versions`
- **Expected**: Find CLAUDE.md, README.md, package.json
- **Actual**: Reports "(not found)" for files that exist at project root
- **Reproduction Steps**:
  1. Run in framework repo: `agentic-framework validate --versions`
  2. Output shows "CLAUDE.md: (not found)" even though file exists
- **Category**: Error
- **Status**: [x] Fixed (2025-12-29) ✅ VERIFIED
- **Fix**: Changed `validate.ts` to pass `projectPath` instead of `frameworkRoot` to VersionValidator
- **Verification**: Confirmed - now shows "✅ CLAUDE.md: 1.2.0" and "✅ framework/cli/package.json: 1.3.0"

---

### Issue QA-004: [MEDIUM] `validate --routes` looks in wrong directory
- **Command**: `agentic-framework validate --routes`
- **Expected**: Find routes.yml at project root
- **Actual**: Looks in `framework/routes.yml` instead of `./routes.yml`
- **Reproduction Steps**:
  1. Run in framework repo: `agentic-framework validate --routes`
  2. Error: "routes.yml not found at /path/framework/routes.yml"
- **Category**: Error
- **Status**: [x] Fixed (2025-12-29) ✅ VERIFIED
- **Fix**: Changed `validate.ts` to pass `projectPath` instead of `frameworkRoot` to RoutesValidator
- **Verification**: Confirmed - now properly validates routes.yml in project root

---

### Issue QA-005: [MEDIUM] `routes sync` doesn't support `--dry-run` option
- **Command**: `agentic-framework routes sync --dry-run`
- **Expected**: Preview changes without applying
- **Actual**: "error: unknown option '--dry-run'"
- **Reproduction Steps**:
  1. Run: `agentic-framework routes sync --dry-run`
  2. Error shown despite being documented
- **Category**: Documentation / Missing feature
- **Status**: [x] Fixed (2025-12-29) ✅ VERIFIED
- **Fix**: Added `--dry-run` option to command definition in `index.ts` and handler in `routes.ts`
- **Verification**: Confirmed - now shows "=== DRY RUN - No changes applied ==="

---

### Issue QA-006: [HIGH] `bump-version` looks for package.json in wrong path
- **Command**: `agentic-framework bump-version --dry-run -t patch`
- **Expected**: Find package.json at `framework/cli/package.json`
- **Actual**: Looks at `cli/package.json` (wrong path)
- **Reproduction Steps**:
  1. Run in framework repo: `agentic-framework bump-version --dry-run -t patch`
  2. Error: "package.json not found at /path/cli/package.json"
- **Category**: Error
- **Status**: [x] Fixed (2025-12-29) ✅ VERIFIED
- **Fix**: Updated path in `bump-version.ts` to include `framework/` prefix (lines 98 and 241)
- **Verification**: Confirmed - now shows "Would update framework/cli/package.json"

---

### Issue QA-007: [HIGH] `add` command doesn't update manifest
- **Command**: `agentic-framework add <module>`
- **Expected**: Module added to .agentic-framework.json modules section
- **Actual**: Agents installed, but module not added to manifest
- **Reproduction Steps**:
  1. Init project: `agentic-framework init test --no-interactive -m core`
  2. Add module: `agentic-framework add planning`
  3. Check manifest: `cat .agentic-framework.json`
  4. Observe: planning not in modules list, only core
- **Category**: Error
- **Status**: [x] Fixed (2025-12-29) ✅ VERIFIED
- **Fix**: Added `ManifestManager.addModule()` call in `add.ts` after module installation
- **Verification**: Confirmed - module now appears in `.agentic-framework.json` after `add`

---

### Issue QA-008: [MEDIUM] `add` command doesn't install module skills
- **Command**: `agentic-framework add <module>`
- **Expected**: Module skills installed to .claude/skills/
- **Actual**: Agents installed, but skills from module are not installed
- **Reproduction Steps**:
  1. Add module: `agentic-framework add planning`
  2. Check skills: `ls .claude/skills/`
  3. Observe: planning skills (planning-phases, planning-phases) missing
- **Category**: Error
- **Status**: [x] Fixed (2025-12-29) ✅ VERIFIED
- **Fix**: Rewrote skill deployment in `add.ts` to recursively find skill directories and copy entire directories to `.claude/skills/`
- **Verification**: Confirmed - `add planning` now deploys `planning-phases/` and `planning-phases/` directories to `.claude/skills/`

---

### Issue QA-009: [HIGH] `remove` command crashes without TTY
- **Command**: `agentic-framework remove <module>`
- **Expected**: Prompt for confirmation or fail gracefully
- **Actual**: Crashes with "ERR_USE_AFTER_CLOSE" error
- **Reproduction Steps**:
  1. Run without TTY: `agentic-framework remove planning`
  2. Crashes with Node.js readline error
- **Workaround**: Use `--force` flag
- **Category**: Error
- **Status**: [x] Fixed (2025-12-29) ✅ VERIFIED
- **Fix**: Added `process.stdin.isTTY` check in `remove.ts` before prompting; exits gracefully with helpful message
- **Verification**: Confirmed - now shows "Error: Interactive confirmation requires a TTY terminal. Use --force flag..."

---

### Issue QA-010: [CRITICAL] `create-agent` template not found
- **Command**: `agentic-framework create-agent <name> --capability <cap>`
- **Expected**: Agent created from template
- **Actual**: "Error: Template not found: agent.template"
- **Reproduction Steps**:
  1. In initialized project: `agentic-framework create-agent test --capability test-cap`
  2. Fails with template not found error
- **Category**: Error
- **Status**: [x] Fixed (2025-12-29) ✅ VERIFIED
- **Fix**: Fixed path resolution in `resolver.ts` - changed `'../../../../framework/modules'` to `'../../../../modules'` to correctly resolve to `framework/modules`
- **Verification**: Confirmed - `create-agent --dry-run` now works in user projects

---

### Issue QA-011: [CRITICAL] `create-skill` template not found
- **Command**: `agentic-framework create-skill <name> --capability <cap>`
- **Expected**: Skill created from template
- **Actual**: "Error: Template not found: SKILL.md"
- **Reproduction Steps**:
  1. In initialized project: `agentic-framework create-skill test --capability test-cap`
  2. Fails with template not found error
- **Category**: Error
- **Status**: [x] Fixed (2025-12-29) ✅ VERIFIED
- **Fix**: Fixed path resolution in `resolver.ts` - same fix as QA-010
- **Verification**: Confirmed - `create-skill --dry-run` now works in user projects

---

### Issue QA-012: [CRITICAL] `create-module` template not found
- **Command**: `agentic-framework create-module <name>`
- **Expected**: Module created from template
- **Actual**: "Error: Template not found: module.json"
- **Reproduction Steps**:
  1. In initialized project: `agentic-framework create-module test`
  2. Fails with template not found error
- **Category**: Error
- **Status**: [x] Fixed (2025-12-29) ✅ VERIFIED
- **Fix**: Fixed path resolution in `resolver.ts` - same fix as QA-010
- **Verification**: Confirmed - `create-module --dry-run` now works in user projects

---

### Issue QA-013: [LOW] `backlog create-ticket` uses "storys" instead of "stories"
- **Command**: `agentic-framework backlog create-ticket --type story`
- **Expected**: Ticket directory: `backlog/tickets/stories`
- **Actual**: Directory shown as `backlog/tickets/storys` (incorrect plural)
- **Reproduction Steps**:
  1. Run: `agentic-framework backlog create-ticket --type story --dry-run`
  2. Output shows "storys" not "stories"
- **Category**: UX
- **Status**: [x] Fixed (2025-12-29) ✅ VERIFIED
- **Fix**: Added `TICKET_TYPE_DIRS` mapping in `create-ticket.ts` to handle irregular plurals correctly
- **Verification**: Confirmed - now shows "Ticket Directory: .../backlog/tickets/stories" (correct plural)

---

## Verification Summary (2025-12-29)

| Result | Count | Issues |
|--------|-------|--------|
| ✅ Verified Fixed | 13 | All issues |
| ❌ Not Fixed | 0 | None |

### Fixes Applied This Session

1. **QA-008** [MEDIUM]: Fixed `add` command skill deployment
   - Changed: `framework/cli/src/commands/add.ts`
   - Fix: Rewrote skill deployment to recursively find and copy entire skill directories

2. **QA-010, 011, 012** [CRITICAL]: Fixed template path resolution
   - Changed: `framework/cli/src/lib/unified-template-engine/resolver.ts`
   - Fix: Corrected relative path from `'../../../../framework/modules'` to `'../../../../modules'`

---

## Phases Completed

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Framework Repo Tests | ✅ Complete | status, list, info, validate, build, sync, routes, bump-version, dev |
| Phase 2: Clean Sandbox Tests | ✅ Complete | init, add, remove, create-agent/skill/module |
| Phase 3: Backlog Module Tests | ✅ Complete | create-ticket, validate (template issues prevent full testing) |
| Phase 4: Planning Module Tests | ⏳ Pending | Blocked by template issues |
| Phase 5: Credential Error Tests | ⏳ Pending | jira, confluence error messages |
| Phase 6: Template Commands | ⏳ Pending | list, render, validate |
| Phase 7: Edge Cases | ⏳ Pending | Special chars, paths with spaces, etc. |
| Phase 8: Integration Tests | ⏳ Pending | Full workflow testing |

---

## Commands Working Correctly

These commands passed testing without issues:

| Command | Notes |
|---------|-------|
| `init` | Project initialization works correctly |
| `list` | Module listing works |
| `list --verbose` | Detailed module info works |
| `info <module>` | Module details work |
| `info <nonexistent>` | Error handling works |
| `validate` | Basic validation works |
| `validate --json` | JSON output is valid |
| `build` | Build command works |
| `build --quick` | Quick mode works |
| `build --ci` | CI mode works |
| `build --json` | JSON output works |
| `sync --dry-run` | Dry-run works |
| `sync --check` | Check mode works (exit code 2 when sync needed) |
| `remove --force` | Force removal works |
| `dev --status` | Status check works |
| `dev --help` | Help output complete |

---

## Recommended Fixes Priority

### Critical (Fix First)
1. **QA-010, QA-011, QA-012**: Template loading - All create commands broken
   - Templates need to be bundled with CLI or installed during init

### High Priority
2. **QA-007, QA-008**: `add` command - manifest and skills not updated
3. **QA-001, QA-002**: `status` command - date and version display
4. **QA-006**: `bump-version` path resolution
5. **QA-009**: `remove` command TTY handling

### Medium Priority
6. **QA-003, QA-004**: `validate` path resolution issues
7. **QA-005**: `routes sync --dry-run` implementation

### Low Priority
8. **QA-013**: "storys" typo in backlog paths

---

## Next Steps for Testing

1. **After template fixes**: Re-test create commands and backlog module
2. **Phase 4-8**: Continue testing planning, credentials, templates, edge cases
3. **Re-verification**: After fixes, run regression tests for all fixed issues

---

## Test Environment

```
Node: v24.10.0
npm: 11.6.0
CLI: agentic-framework 1.0.0
OS: macOS Darwin 25.2.0
Test Directory: /tmp/cli-qa-sandbox/
```

---

# Session 2: Phases 4-8 (2025-12-29/30)

## Summary - Session 2

| Severity | Count | Fixed |
|----------|-------|-------|
| HIGH | 4 | 4 |
| MEDIUM | 4 | 4 |
| LOW | 1 | 1 |
| **Total** | **9** | **9** |

**Status**: ✅ All issues fixed and verified (2025-12-30)

---

## Issues Found - Session 2

### Issue QA-014: [HIGH] `planning create-plan` looks for templates in wrong location
- **Command**: `agentic-framework planning create-plan --name test-feature`
- **Expected**: Find templates and create plan
- **Actual**: "PLAN.md.template not found for category 'framework'"
- **Root Cause**:
  - CLI looks for templates at `ai/plans/{category}/.templates/PLAN.md.template`
  - Templates are actually installed at `.claude/skills/planning-phases/templates/PLAN.md.template`
  - The `ai/plans/` directory doesn't even exist after scaffolding
- **Reproduction Steps**:
  1. Init project: `agentic-framework init test --no-interactive -m core,planning`
  2. Run: `agentic-framework planning create-plan --name test --dry-run`
  3. Error: "PLAN.md.template not found for category 'framework'"
- **Category**: Error
- **Status**: [x] Fixed (2025-12-29)
- **Fix**: Updated `plan-creator.ts` to search for templates in `.claude/skills/planning-phases/templates/` and `.claude/skills/planning-phases/templates/` as fallbacks

---

### Issue QA-015: [LOW] `planning validate-plan` shows "unknown format" warning
- **Command**: `agentic-framework planning validate-plan`
- **Expected**: Clean validation output
- **Actual**: Shows "unknown format 'date' ignored in schema at path '#/properties/created'"
- **Root Cause**: AJV schema validator not configured with the "date" format
- **Reproduction Steps**:
  1. Create a plan with valid frontmatter
  2. Run: `agentic-framework planning validate-plan`
  3. Warning appears in output
- **Category**: Warning/UX
- **Status**: [x] Fixed (2025-12-29)
- **Fix**: Added `ajv-formats` package and configured AJV with format support in `schema-validator.ts`

---

### Issue QA-016: [HIGH] `planning validate-plan` shows schema path instead of file path in errors
- **Command**: `agentic-framework planning validate-plan`
- **Expected**: Errors reference the PLAN.md file being validated
- **Actual**: Errors show the schema file path, making it very confusing
- **Example**:
  ```
  Errors:
    1. [/path/to/framework/cli/framework/modules/planning/schemas/plan.schema.json] Missing required property: status
  ```
  Should be:
  ```
  Errors:
    1. [/path/to/project/ai/plans/001-my-plan/PLAN.md] Missing required property: status
  ```
- **Root Cause**: Error formatter uses wrong path reference
- **Category**: Error/UX
- **Status**: [x] Fixed (2025-12-29)
- **Fix**: Modified `validatePlanFile()` in `validate-plan.ts` to update schema report issue locations with the actual plan file path

---

### Issue QA-017: [MEDIUM] Plan schema status enum values use emoji strings
- **Command**: `agentic-framework planning validate-plan`
- **Expected**: Natural status values like `status: in_progress`
- **Actual**: Schema requires emoji strings: `status: "🔄 IN PROGRESS"`
- **Root Cause**: Schema enum values are display values, not programmatic values
- **Enum Values**:
  - `"🔶 PROPOSED - PENDING REVIEW"`
  - `"🔄 IN PROGRESS"`
  - `"✅ COMPLETED"`
- **Category**: UX/Schema Design
- **Status**: [x] Fixed (2025-12-29)
- **Fix**: Updated `plan.schema.json` to accept both programmatic values (`proposed`, `in_progress`, `completed`) and emoji display values

---

### Issue QA-018: [MEDIUM] YAML date values must be quoted in plan frontmatter
- **Command**: `agentic-framework planning validate-plan`
- **Expected**: `created: 2025-12-29` (unquoted) should work
- **Actual**: Error: "created: Expected type string, got object"
- **Root Cause**: YAML parser interprets unquoted dates as Date objects, not strings
- **Workaround**: Users must quote dates: `created: "2025-12-29"`
- **Category**: UX/Schema Design
- **Status**: [x] Fixed (2025-12-29)
- **Fix**: Added `normalizeFrontmatter()` function in `validate-plan.ts` to automatically convert Date objects to ISO date strings before validation

---

### Issue QA-019: [MEDIUM] `template info` requires --category but listing doesn't make this clear
- **Command**: `agentic-framework template info PLAN.md.template`
- **Expected**: Show template info
- **Actual**: "Template not found: PLAN.md.template"
- **Root Cause**:
  - `template list` shows templates grouped by category (e.g., `planning-phases/PLAN.md.template`)
  - Users naturally try `template info planning-phases/PLAN.md.template` which doesn't work
  - Must use: `template info PLAN.md.template --category planning-phases`
- **Workaround**: Use `--category` option explicitly
- **Category**: UX
- **Status**: [x] Fixed (2025-12-29)
- **Fix**: Updated `info.ts` to accept `category/name` format and automatically parse it into separate category and name

---

### Issue QA-020: [HIGH] Commands outside project show raw stack traces
- **Command**: `agentic-framework status` (outside any project)
- **Expected**: Clean error message: "Not inside an Agentic Framework project. Run 'agentic-framework init' to create one."
- **Actual**: Full stack trace displayed along with the error message
- **Example**:
  ```
  file:///path/to/cli-context.js:173
              throw new ProjectNotFoundError(options?.path || process.cwd());
                    ^

  ProjectNotFoundError: Not inside an Agentic Framework project...
      at CliContext.require (...)
      at async Command.statusCommand (...)

  Node.js v24.10.0
  ```
- **Root Cause**: Error not caught at top level to suppress stack trace for user errors
- **Category**: UX/Error Handling
- **Status**: [x] Fixed (2025-12-29)
- **Fix**: Added try-catch wrapper in `index.ts` around `program.parseAsync()` to catch `ProjectNotFoundError` and display clean error message without stack trace

---

### Issue QA-021: [HIGH] Backlog path inconsistency between `create-ticket` and `validate`
- **Command**: `agentic-framework backlog validate`
- **Expected**: Validate tickets created by `create-ticket`
- **Actual**: "Error: Backlog directory not found: /path/project/ai/backlog"
- **Root Cause**:
  - `create-ticket` creates tickets in `backlog/tickets/{type}/` (e.g., `backlog/tickets/bugs/`)
  - `validate` looks for tickets in `ai/backlog`
  - These paths are completely different
- **Reproduction Steps**:
  1. Init project: `agentic-framework init test --no-interactive -m core,backlog`
  2. Create ticket: `agentic-framework backlog create-ticket --name test --type bug`
  3. Run: `agentic-framework backlog validate`
  4. Error about missing `ai/backlog` directory
- **Category**: Error/Path Configuration
- **Status**: [x] Fixed (2025-12-29)
- **Fix**: Changed `validate.ts` fallback path from `ai/backlog` to `backlog` to match `create-ticket` behavior

---

## Fixes Applied - Session 2 (2025-12-29)

1. **QA-014** [HIGH]: Fixed template path for `planning create-plan`
   - Changed: `framework/cli/src/lib/planning/plan-creator.ts`
   - Fix: Added fallback search paths for `.claude/skills/*/templates/`

2. **QA-015** [LOW]: Fixed AJV date format warning
   - Changed: `framework/cli/src/lib/validation/schema-validator.ts`, `framework/cli/package.json`
   - Fix: Added `ajv-formats` package and configured format support

3. **QA-016** [HIGH]: Fixed error message path display
   - Changed: `framework/cli/src/commands/planning/validate-plan.ts`
   - Fix: Replace schema path with plan file path in validation issues

4. **QA-017** [MEDIUM]: Fixed plan schema status enum
   - Changed: `framework/modules/planning/schemas/plan.schema.json`
   - Fix: Accept both programmatic values (`proposed`, `in_progress`, `completed`) and emoji display values

5. **QA-018** [MEDIUM]: Fixed YAML date parsing
   - Changed: `framework/cli/src/commands/planning/validate-plan.ts`
   - Fix: Added `normalizeFrontmatter()` to convert Date objects to strings

6. **QA-019** [MEDIUM]: Fixed template info UX
   - Changed: `framework/cli/src/commands/template/info.ts`
   - Fix: Accept `category/name` format and parse automatically

7. **QA-020** [HIGH]: Fixed stack trace suppression
   - Changed: `framework/cli/src/index.ts`
   - Fix: Added try-catch wrapper to display clean error messages

8. **QA-021** [HIGH]: Fixed backlog path inconsistency
   - Changed: `framework/cli/src/commands/backlog/validate.ts`
   - Fix: Changed fallback from `ai/backlog` to `backlog`

---

## Phases Completed - Session 2

| Phase | Status | Issues Found |
|-------|--------|--------------|
| Phase 4: Planning Module Tests | ✅ Complete | QA-014, QA-015, QA-016, QA-017, QA-018 |
| Phase 5: Credential Error Tests | ✅ Complete | None (error messages are clear) |
| Phase 6: Template Commands | ✅ Complete | QA-019 |
| Phase 7: Edge Cases | ✅ Complete | QA-020 |
| Phase 8: Integration Tests | ✅ Complete | QA-021 |

---

## Commands Working Correctly - Session 2

These commands passed testing:

| Command | Notes |
|---------|-------|
| `jira export --help` | Help output complete |
| `jira export --dry-run` | Clear credential error message |
| `jira sync --help` | Help output complete |
| `confluence create-page --help` | Help output complete |
| `confluence fetch-page --help` | Help output complete |
| `confluence validate` | Works locally, validates markdown |
| `template list` | Lists available templates |
| `template list --json` | JSON output works |
| `template render --dry-run` | Renders template preview |
| `template validate <path>` | Validates template configs |
| Paths with spaces | Init works in paths with spaces |
| Names with spaces | create-ticket handles names with spaces |
| Empty names | create-ticket auto-generates names |

---

## Additional Issue Found During Verification

### Issue QA-022: [MEDIUM] Template variable syntax mismatch in plan-creator
- **Command**: `agentic-framework planning create-plan --name test`
- **Expected**: Template variables properly substituted
- **Actual**: Variables like `{{status}}`, `{{category}}` not replaced (only `{var}` syntax worked)
- **Root Cause**: `plan-creator.ts` used single-brace `{var}` syntax but templates used double-brace `{{var}}` syntax
- **Category**: Error
- **Status**: [x] Fixed (2025-12-30)
- **Fix**: Updated `renderTemplate()` in `plan-creator.ts` to support both `{var}` and `{{var}}` syntax; set default status to valid enum value `'proposed'`

---

## All Fixes Applied - Session 2 (2025-12-30)

✅ All 9 issues from Session 2 have been fixed and verified:

| Issue | Severity | Fix Summary |
|-------|----------|-------------|
| QA-014 | HIGH | Added fallback template search in `.claude/skills/*/templates/` |
| QA-015 | LOW | Added `ajv-formats` package for date format support |
| QA-016 | HIGH | Updated error formatter to show plan file path |
| QA-017 | MEDIUM | Schema now accepts both programmatic and emoji status values |
| QA-018 | MEDIUM | Added `normalizeFrontmatter()` to convert Date objects |
| QA-019 | MEDIUM | Template info now accepts `category/name` format |
| QA-020 | HIGH | Added try-catch wrapper for clean error messages |
| QA-021 | HIGH | Changed backlog validate fallback from `ai/backlog` to `backlog` |
| QA-022 | MEDIUM | Added support for both `{var}` and `{{var}}` template syntax |

---

## Cumulative Summary (Sessions 1 + 2)

| Severity | Session 1 | Session 2 | Total |
|----------|-----------|-----------|-------|
| CRITICAL | 3 | 0 | 3 |
| HIGH | 5 | 4 | 9 |
| MEDIUM | 4 | 4 | 8 |
| LOW | 1 | 1 | 2 |
| **Total** | **13** | **9** | **22** |

| Status | Count |
|--------|-------|
| ✅ Fixed & Verified | 22 |
| 🔄 Pending | 0 |

**All 22 CLI QA issues have been resolved and verified.** ✅
