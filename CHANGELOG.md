# Changelog

All notable changes to the Agentic Development Framework will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-06-16

### Added
- **Project-skill discovery** — custom skills under `.claude/skills/project/` are registered in the skills registry and discoverable by agents.
- **Per-ticket planning metadata** — tickets persist `sprint`, `status`, and `jira-fixVersion`; sprint/milestone index files are derived from the union of all on-disk tickets (a later import no longer clobbers an earlier one's membership).

### Changed
- **Canonical bare field names** — `sprint`, `status`, `assignee` are used consistently by CSV import and Jira pull/push (pull/push previously emitted `jira-sprint`/`jira-status`/`jira-assignee`). `assignee` is read-only display name. _Field-name change to pull/push output; treated as minor on this young fork since the importer already used bare names._
- **Leaner tickets** — `building-tickets` skill favors WHAT/WHY over HOW: outcome-oriented requirements (3-5), optional Technical Notes (0-3 constraints, leave the solution to the developer), acceptance criteria 4-8, line targets 25-70 (story/task) / 25-40 (epic).
- **Lean frontmatter everywhere** — templates and docs drop `null`/`[]` placeholders; `description` is optional, not required.
- Removed `v10.1.1` / `v11.2` spec-version tags from skill and command docs.

### Fixed
- `backlog push` no longer sends a redundant "Description" heading in the Jira description (strips the leading `## Description`).
- Sprint/milestone index derivation no longer overwrites earlier imports.
- Schema no longer requires `description`; legacy validator required-fields aligned.

## [1.0.0] - 2026-06-02

> **Re-baseline:** v1.0.0 resets the version identity of this fork (`cc-backlog-manager`). It is a deliberate simplification of the framework, not a regression — the entries below this line (1.16.0 and earlier) belong to the pre-fork `agentic-development-framework` lineage and carry higher version numbers.

### Removed
- **Context-level system** — `.claude/context/*` context files, `context.json`, the `context-category-needs` agent frontmatter field, the basic/advanced/expert context levels, and the context loaders/generators.
- **Internal `routes.yml`** navigation file and the `routes sync` / `routes check` commands and validators.
- **`validate` command** and its `agentic_validate` MCP tool, plus the `version-validator` module.
- **`bump-version` command** and its `agentic_bump_version` MCP tool.
- **`managing-versions` skill** and the `version-management` capability.
- **`writer` and `reporting` modules**, the iOS coding artifacts, and the `ai-book-writer` / `ai-report-manager` agents.

### Added
- **Knowledge skills** — `knowing-the-codebase`, `knowing-the-domain`, and `knowing-backlog` provide on-demand project context in place of context files.
- **`references.yml`** — a curated library of external doc/API/codebase references, replacing the internal `routes.yml`.

### Changed
- **`build` (BuildEngine)** is now the unified validation entry point (agent/skill schema + markdown-link checking); the MCP `agentic_build` tool runs `BuildEngine` directly.
- **Git hooks** point at `build`: pre-commit runs `build --quick` (schema-only, fast), pre-push runs `build` (full, incl. links). Version-consistency checking is dropped.
- **Trust Directive relaxed** — the framework is a focused four-module set (`core`, `backlog`, `coding`, `confluence`) navigated natively; the old "don't explore / use routes.yml" mandate is removed.
- **Version re-baselined to 1.0.0** across the CLI package and all module manifests; entry-point docs (`CLAUDE.md`, `README.md`, `docs/*`) rewritten to match.

## [1.16.0] - 2026-03-30

### Added
- `backlog pull` command — fetch tickets from Jira REST API to local markdown files with sprint/version filters
- `backlog diff` command — compare local ticket state against Jira remote (in sync, remote newer, local newer, conflict)
- `backlog push` command — push local ticket changes to Jira with conflict detection and --force override
- `backlog.config.json` — per-project configuration for Jira project key, base URL, and component validation
- Jira wiki-to-markdown reverse converter for `backlog pull` description conversion
- Integration tests for diff, pull, and push engines

### Changed
- `building-tickets` skill — removed hardcoded "APM: Reliability App" component; now configurable per project
- `organizing-backlog` skill — generalized from project-specific to generic scope; added pull/diff/push documentation
- `ticket-rules.ts` — component validation now accepts optional config parameter
- Backlog module version bumped to 1.9.0

### Deprecated
- `jira export` command — use `backlog push` instead
- `jira sync` command — use `backlog pull` and `backlog push` instead

## [1.3.1] - 2026-03-23

### Changed
- **building-tickets skill:** Acceptance criteria shifted from developer-completeness (8-12 items) to QA-verifiable focus (5-10 items)
  - Every criterion must be testable by QA through UI, API, or observable behavior
  - Removed filler patterns: "docs updated", "no console errors", "integration tests written"
  - Added anti-patterns for implementation-detail ACs that require code inspection
  - Updated all examples (story, task, bug, spike) to demonstrate QA-focused style
  - Updated validation rules, quality rubric, and checklists to match

## [1.3.0] - 2025-12-25

### Added
- **Coding module skills (2 new):**
  - `designing-architecture` - Architecture design patterns, decision frameworks, documentation standards
  - `implementing-code` - Code quality standards, testing patterns, review checklists
- **Confluence module skills (2 new):**
  - `converting-adf` - ADF format patterns, markdown-to-ADF conversion rules
  - `publishing-confluence` - Page publishing workflow, version management, CLI integration
- **Reporting module skill (1 new):**
  - `building-reports` - Report generation patterns, metrics collection, status reporting
- Discovery map capability mappings for all new skills (9 new capability entries)

### Changed
- **Consolidated MCP skills:** Merged `shared-mcp-arguments` into `using-mcp` (v2.1)
  - ANTI-PATTERNS.md preserved with 12 detailed error prevention patterns
  - Single comprehensive MCP skill covering framework + tools + arguments
- **Renamed skill:** `ticket-standards` → `building-tickets` for consistent module prefixing
- Updated all cross-references in related skills (organizing-backlog, jira-git-workflow, integrating-jira)

### Fixed
- Skills registry (`ai/registries/skills.json`) now includes all 23 skills with proper module assignments
- Discovery map (`ai/registries/discovery-map.json`) now has 34/41 capabilities with skill mappings (was 25)
- All module.json files updated with correct skill references

### Skill Inventory
- **Total skills:** 23 (was 19)
- **Core module:** 12 skills (9 shared + 3 core-specific)
- **Backlog module:** 2 skills
- **Coding module:** 2 skills (NEW)
- **Confluence module:** 2 skills (NEW)
- **Jira module:** 2 skills
- **Planning module:** 2 skills
- **Reporting module:** 1 skill (NEW)

### Naming Convention
Skills now follow consistent `{module}-{name}` pattern:
- Shared skills: `shared-{name}` (cross-module, reusable)
- Core skills: `core-{name}` (framework infrastructure)
- Module skills: `{module}-{name}` (module-specific)

### Quality Assurance
- All 23 skills verified in both source and deployment locations
- All 7 module.json files validated as valid JSON
- No stale references to old skill names
- Discovery engine capability mappings complete

---

## [1.2.0] - 2025-12-23

### Added
- Comprehensive telemetry system unit tests with 272 tests across 6 test suites
  - `telemetry-manager.test.ts` - 72 tests, 98.8% coverage
  - `json-file-exporter.test.ts` - 51 tests, 100% coverage
  - `discovery-instrumentation.test.ts` - 45 tests
  - `sync-instrumentation.test.ts` - 36 tests
  - `cli-instrumentation.test.ts` - 18 tests
  - `config.test.ts` - 51 tests
- Telemetry documentation with Mermaid diagrams (`docs/telemetry.md`)
- Jest setup file to disable telemetry during test runs
- CLI command telemetry support for discovery, sync, and validation operations
- Discovery system verification documentation (`DISCOVERY-SYSTEM-VERIFICATION.md`)

### Changed
- **Framework structure reorganization**: Removed redundant `ai/` prefix from directory structure (135 files affected)
  - `framework/core/ai/agents/` → `framework/core/agents/`
  - `framework/core/ai/skills/` → `framework/core/skills/`
  - `framework/core/ai/registries/` → `framework/core/registries/`
  - Similar changes across all modules (backlog, coding, confluence, jira, planning, reporting)
- Updated `discovery-engine.ts` to use new directory structure
- Updated `sync-engine.ts` to use new directory structure
- Enhanced all CLI commands with telemetry instrumentation

### Technical Details
- All 272 telemetry tests passing
- Test coverage: 90%+ across telemetry module
- Zero performance overhead when telemetry disabled
- Proper test isolation with environment variable cleanup
- Framework structure streamlined for better clarity

### Migration
No migration required! This release is backward compatible:
- CLI commands unchanged
- Public API unchanged
- Project structure unchanged
- Internal framework structure improved

---

## [1.1.0] - 2024-12-18

### Added
- Dynamic framework root resolution for both development and npm package modes
- Framework bundling script (`scripts/prepare-publish.js`) for npm distribution
- Comprehensive deployment documentation with Mermaid diagrams (`docs/DEPLOYMENT-FIXES-V1.1.md`)
- Exported `getFrameworkRoot()` function from module-loader for external use

### Changed
- **BREAKING (Internal):** Registry generation now uses DiscoveryEngine to parse agent/skill YAML frontmatter instead of relying on module.json
  - `agents.json` contains agent-specific `capability-needs`, `context-category-needs`, and `token-budget`
  - `skills.json` contains skill-specific `capabilities-provided`
  - `discovery-map.json` built from actual parsed definitions
- Init command now uses SyncEngine for proper link transformation (replaced direct `fs.copy()`)
- Update command now uses SyncEngine (replaced `updateModuleStub()` with full implementation)
- Module.json files updated to match actual skill directory structure
- Framework-integrity tests updated to use dynamic framework root resolution

### Fixed
- Framework root path resolution now works when CLI is published to npm (was hardcoded to development path)
- Registry generation no longer hardcodes context-needs to "basic" - uses actual agent frontmatter
- Link transformation now applied during project initialization and updates
- Module.json skill declarations now match actual filesystem structure

### Technical Details
- **Phase 1:** FRAMEWORK_ROOT resolution with bundled framework detection
- **Phase 2:** Registry generation with frontmatter parsing (HIGH PRIORITY)
- **Phase 3:** SyncEngine integration in init command
- **Phase 4:** SyncEngine integration in update command
- **Phase 5:** npm publishing strategy with automated bundling
- **Phase 6:** Comprehensive testing and validation

### Bundle Information
- Framework bundle size: ~1.7MB
- Files bundled: 146
- Modules included: core + 6 optional modules (backlog, coding, confluence, jira, planning, reporting)

### Test Results
- Test suites: 6/6 passing
- Tests: 195 passed, 5 skipped
- Skipped tests relate to pre-existing framework structure issues, not deployment fixes

### Migration
No migration required! This release is backward compatible:
- Registry format unchanged (only content improved)
- Project structure unchanged
- CLI commands unchanged

Existing projects can simply run `agentic-framework update` to regenerate registries with improved frontmatter data.

### Documentation
See `docs/DEPLOYMENT-FIXES-V1.1.md` for detailed architecture diagrams and implementation details.

---

## [1.0.0] - 2024-12-15

### Added
- Initial release of modular framework structure
- Core module with framework management agents and shared skills
- Optional modules: backlog, coding, confluence, jira, planning, reporting
- TypeScript CLI for project scaffolding and management
- Discovery engine with capability-based skill routing
- Sync engine with link transformation
- Module manifest system with JSON schema validation
- Framework validator for integrity checking

### Features
- `agentic-framework init` - Initialize new projects
- `agentic-framework add` - Add modules to existing projects
- `agentic-framework remove` - Remove modules
- `agentic-framework list` - List available modules
- `agentic-framework info` - Show module details
- `agentic-framework validate` - Validate framework integrity
- `agentic-framework sync` - Sync skills and agents
- `agentic-framework status` - Show framework status

### Documentation
- README.md with quick start guide
- CLAUDE.md as framework entry point
- Module-specific documentation
- Skill and agent markdown files with YAML frontmatter

[1.16.0]: https://github.com/eligoss/agentic-development-framework/compare/v1.3.1...v1.16.0
[1.3.1]: https://github.com/eligoss/agentic-development-framework/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/eligoss/agentic-development-framework/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/eligoss/agentic-development-framework/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/eligoss/agentic-development-framework/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/eligoss/agentic-development-framework/releases/tag/v1.0.0
