# cc-backlog-manager — Plan 1: Bootstrap & Prune Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the `cc-backlog-manager` repo as a source-only copy of `agentic-development-framework` v1.9.0, then remove the `writer` and `reporting` modules and the iOS coding artifacts — leaving the build, lint, and full test suite green.

**Architecture:** "Prune, don't rewrite" (spec §2/§3). This plan does **deletion only** — no context-system or knowledge-skill changes (those are Plans 2 and 3). `writer` is woven through the CLI core (commands, MCP tools, `index.ts`, types, `affected-modules`, wizard), so removing it touches more than its module folder. `reporting` is module-only. iOS removal also requires editing `coding/module.json` `provides` arrays so the manifest stays consistent.

**Tech Stack:** TypeScript (ESM, `strict`), Commander CLI, Jest (unit / integration / e2e configs), `fs-extra`. Build = `tsc` with a `prebuild` that bundles modules via `scripts/prepare-publish.js`.

**Scope note:** `planning` is a CLI-only feature (`src/commands/planning/`), not a module, and is intentionally **retained**. Do not touch it.

**Reference spec:** `docs/superpowers/specs/2026-05-31-simplified-framework-design.md` (§4 module structure, §10 bootstrap).

---

## File Map

**Created:** none (this plan only copies and deletes).

**Deleted:**
- `framework/modules/writer/` (entire module)
- `framework/modules/reporting/` (entire module)
- `framework/cli/src/commands/writer/` (entire dir incl. `__tests__/`)
- `framework/cli/src/mcp/tools/writer.ts`
- `framework/modules/coding/agents/ai-ios-developer.md` (+ `.tmp`)
- `framework/modules/coding/agents/ai-hig-reviewer.md`
- `framework/modules/coding/skills/coding/implementing-ios/`
- `framework/modules/coding/skills/coding/designing-ios-ui/`

**Modified:**
- `framework/cli/src/index.ts` — remove writer imports + command registration
- `framework/cli/src/mcp/tools/index.ts` — remove writer tool wiring
- `framework/cli/src/types/command-options.ts` — remove writer option interfaces
- `framework/cli/src/lib/affected-modules.ts` — remove writer + reporting patterns
- `framework/cli/src/lib/wizard/module-groups.ts` — remove writer + reporting labels
- `framework/cli/src/commands/dev.ts` — remove reporting from version map
- `framework/cli/src/lib/__tests__/affected-modules.test.ts` — remove writer + reporting cases
- `framework/cli/src/commands/__tests__/add.test.ts` — update any reporting reference
- `framework/modules/coding/module.json` — remove iOS agents/skills/capabilities

---

## Task 1: Bootstrap the repo from a source-only copy

**Files:**
- Source: `/Users/antonborodulin/Projects/agentic-development-framework`
- Target: `/Users/antonborodulin/Projects/cc-backlog-manager` (already on branch `feature/framework-simplification`, containing only `docs/superpowers/specs/` + this plan)

- [ ] **Step 1: Copy source only, excluding VCS/build/bundle artifacts**

Run from the target repo so the existing `docs/superpowers/` is preserved (rsync without `--delete` never removes the spec/plan):

```bash
rsync -a \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='framework/cli/framework' \
  --exclude='.DS_Store' \
  --exclude='*.tmp' \
  --exclude='*.md.tmp' \
  /Users/antonborodulin/Projects/agentic-development-framework/ \
  /Users/antonborodulin/Projects/cc-backlog-manager/
```

- [ ] **Step 2: Verify the spec/plan survived and bundle/artifacts were excluded**

Run:
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager
ls docs/superpowers/specs/2026-05-31-simplified-framework-design.md
test ! -d framework/cli/framework && echo "bundle excluded OK"
test ! -d node_modules && echo "node_modules excluded OK"
```
Expected: spec path prints, both "OK" lines print.

- [ ] **Step 3: Install dependencies**

Run:
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli
npm install
```
Expected: install completes with no errors.

- [ ] **Step 4: Establish a GREEN baseline (build + tests) before any deletion**

Run:
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli
npm run build
npm test 2>&1 | tail -20
```
Expected: `tsc` exits 0; Jest reports all suites passing. **If the baseline is not green, stop and report** — every later task is judged against this baseline, so a red start invalidates the plan's verification.

- [ ] **Step 5: Commit the bootstrap**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager
git add -A
git commit -m "chore: bootstrap from agentic-development-framework v1.9.0

Source-only copy (excludes .git, node_modules, dist, cli bundle).
Establishes a green baseline before pruning."
```

---

## Task 2: Remove the `reporting` module

`reporting` provides an agent + skill only (no CLI commands), so removal is the module folder plus four reference sites.

**Files:**
- Delete: `framework/modules/reporting/`
- Modify: `framework/cli/src/lib/affected-modules.ts`
- Modify: `framework/cli/src/lib/wizard/module-groups.ts`
- Modify: `framework/cli/src/commands/dev.ts`
- Modify: `framework/cli/src/lib/__tests__/affected-modules.test.ts`

- [ ] **Step 1: Delete the module folder**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager
git rm -r framework/modules/reporting
```

- [ ] **Step 2: Remove the reporting pattern + test-pattern map entry from `affected-modules.ts`**

In `framework/cli/src/lib/affected-modules.ts`, delete the line matching:
```ts
{ pattern: /^framework\/modules\/reporting\//, moduleId: 'reporting' },
```
and delete the `reporting: [ ... ]` entry in the `MODULE_TEST_PATTERNS` object (around line 115). Verify nothing else references `reporting`:
```bash
grep -n "reporting" framework/cli/src/lib/affected-modules.ts
```
Expected: no output.

- [ ] **Step 3: Remove reporting labels from the wizard**

In `framework/cli/src/lib/wizard/module-groups.ts`, delete the two `reporting:` label lines (the group label and the description). Verify:
```bash
grep -n "reporting" framework/cli/src/lib/wizard/module-groups.ts
```
Expected: no output.

- [ ] **Step 4: Remove reporting from the dev version map**

In `framework/cli/src/commands/dev.ts`, delete the `reporting: '1.0.0'` entry from the version map object. Verify:
```bash
grep -n "reporting" framework/cli/src/commands/dev.ts
```
Expected: no output.

- [ ] **Step 5: Remove the reporting case from `affected-modules.test.ts`**

In `framework/cli/src/lib/__tests__/affected-modules.test.ts`, delete the `it('should map framework/modules/reporting/ files to reporting module', ...)` block (around lines 28–30). Verify:
```bash
grep -n "reporting" framework/cli/src/lib/__tests__/affected-modules.test.ts
```
Expected: no output.

- [ ] **Step 6: Build + run the affected test, expect green**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli
npm run build
npx jest affected-modules 2>&1 | tail -15
```
Expected: `tsc` exits 0; affected-modules suite passes.

- [ ] **Step 7: Commit**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager
git add -A
git commit -m "refactor: remove reporting module"
```

---

## Task 3: Remove the `writer` module and all CLI/MCP wiring

Deletion and de-wiring happen in one task so the build stays green at the commit boundary (deleting files without removing their imports would leave `index.ts` referencing missing modules).

**Files:**
- Delete: `framework/modules/writer/`, `framework/cli/src/commands/writer/`, `framework/cli/src/mcp/tools/writer.ts`
- Modify: `framework/cli/src/index.ts`, `framework/cli/src/mcp/tools/index.ts`, `framework/cli/src/types/command-options.ts`, `framework/cli/src/lib/affected-modules.ts`, `framework/cli/src/lib/wizard/module-groups.ts`, `framework/cli/src/lib/__tests__/affected-modules.test.ts`

- [ ] **Step 1: Delete the writer module, command tree, and MCP tool file**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager
git rm -r framework/modules/writer
git rm -r framework/cli/src/commands/writer
git rm framework/cli/src/mcp/tools/writer.ts
```

- [ ] **Step 2: Remove writer wiring from `index.ts`**

In `framework/cli/src/index.ts`:
- Delete the 12 writer command import lines (the block importing from `./commands/writer/*.js`).
- Delete the writer command-group registration block (`const writer = program.command("writer")...` through the final `writer.addCommand(createUnlockFactCommand());`).

Verify:
```bash
grep -n "writer" framework/cli/src/index.ts
```
Expected: no output.

- [ ] **Step 3: Remove writer wiring from the MCP tool registry**

In `framework/cli/src/mcp/tools/index.ts`, delete: the `import { writerTools } from './writer.js';` line, the `...writerTools,` spread in the aggregate array, the `writer: writerTools,` map entry, and `writerTools,` from the re-export block. Verify:
```bash
grep -n "writer" framework/cli/src/mcp/tools/index.ts
```
Expected: no output.

- [ ] **Step 4: Remove writer option interfaces from `command-options.ts`**

In `framework/cli/src/types/command-options.ts`, delete every interface whose doc-comment is "Options for writer ... command" (the contiguous writer block, roughly lines 123–235). Verify:
```bash
grep -ni "writer" framework/cli/src/types/command-options.ts
```
Expected: no output.

- [ ] **Step 5: Remove writer patterns from `affected-modules.ts` and its test**

In `framework/cli/src/lib/affected-modules.ts`, delete the writer `pattern` entries (module path, CLI commands path, `ai/skills/*writer`, `ai/agents/*writer`) and the `writer: [ ... ]` `MODULE_TEST_PATTERNS` entry.

In `framework/cli/src/lib/__tests__/affected-modules.test.ts`, delete the writer-mapping `it(...)` blocks (module mapping ~32–33, CLI command mapping ~52–53, and the `MODULE_TEST_PATTERNS.writer` defined/length assertions ~142–144).

Verify both:
```bash
grep -n "writer" framework/cli/src/lib/affected-modules.ts framework/cli/src/lib/__tests__/affected-modules.test.ts
```
Expected: no output.

- [ ] **Step 6: Remove the writer label from the wizard**

In `framework/cli/src/lib/wizard/module-groups.ts`, delete any `writer:` label/description entries. Verify:
```bash
grep -ni "writer" framework/cli/src/lib/wizard/module-groups.ts
```
Expected: no output.

- [ ] **Step 7: Build + targeted tests, expect green**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli
npm run build
npx jest affected-modules tool-registry 2>&1 | tail -20
```
Expected: `tsc` exits 0 (no missing-import errors); both suites pass.

- [ ] **Step 8: Confirm no dangling writer references remain in source**

```bash
grep -rni "writer" framework/cli/src --include='*.ts' | grep -v "typewriter" || echo "clean"
```
Expected: `clean` (or only unrelated substring hits — inspect any output; there should be none).

- [ ] **Step 9: Commit**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager
git add -A
git commit -m "refactor: remove writer module and CLI/MCP wiring"
```

---

## Task 4: Remove iOS coding artifacts and reconcile the manifest

The `framework-integrity` integration test asserts **zero** manifest errors, so `coding/module.json` `provides` must be edited in the same task that deletes the iOS files — otherwise the manifest references agents/skills that no longer exist.

**Files:**
- Delete: `framework/modules/coding/agents/ai-ios-developer.md` (+ `.tmp`), `framework/modules/coding/agents/ai-hig-reviewer.md`
- Delete: `framework/modules/coding/skills/coding/implementing-ios/`, `framework/modules/coding/skills/coding/designing-ios-ui/`
- Modify: `framework/modules/coding/module.json`

- [ ] **Step 1: Delete the iOS agents and skills**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager
git rm framework/modules/coding/agents/ai-ios-developer.md framework/modules/coding/agents/ai-hig-reviewer.md
git rm -f framework/modules/coding/agents/ai-ios-developer.md.tmp 2>/dev/null || true
git rm -r framework/modules/coding/skills/coding/implementing-ios framework/modules/coding/skills/coding/designing-ios-ui
```

- [ ] **Step 2: Edit `coding/module.json` `provides`**

In `framework/modules/coding/module.json`:
- In `provides.agents`, remove `"ai-ios-developer"` and `"ai-hig-reviewer"` (keep `"ai-architect"`, `"ai-app-developer"`).
- In `provides.skills`, remove `"implementing-ios"` and `"designing-ios-ui"`.
- In `provides.capabilities`, remove any capability strings that only the iOS skills declared (e.g. iOS/SwiftUI/UIKit/HIG-related). Cross-check against the remaining skills' `capabilities-provided`:
```bash
grep -rh "capabilities-provided" -A6 framework/modules/coding/skills/coding/*/SKILL.md
```
Remove from the manifest any capability not present in that output.

- [ ] **Step 3: Validate JSON + confirm no iOS references in the coding module**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager
node -e "JSON.parse(require('fs').readFileSync('framework/modules/coding/module.json','utf8')); console.log('valid json')"
grep -rni "ios\|hig-reviewer\|swiftui\|uikit" framework/modules/coding/module.json || echo "manifest clean"
```
Expected: `valid json`, then `manifest clean`.

- [ ] **Step 4: Run the framework-integrity test, expect green**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli
npm run build
npx jest framework-integrity framework-validator 2>&1 | tail -20
```
Expected: `tsc` exits 0; integrity/validator suites pass (manifest references resolve to existing files).

- [ ] **Step 5: Commit**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager
git add -A
git commit -m "refactor: remove iOS coding agents and skills"
```

---

## Task 5: Regenerate bundle, run the full suite, fix residual breakage

**Files:** whichever tests assert on the removed module set (fix attributed to *deletion*, per spec verification discipline).

- [ ] **Step 1: Rebuild (regenerates the bundle via prebuild) and run the full suite**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli
npm run build
npm test 2>&1 | tail -40
```
Expected: `tsc` exits 0. Some suites may fail **only** where they enumerate the old module set.

- [ ] **Step 2: For each failure, confirm it is deletion-caused and fix the assertion**

Likely suspects and the exact fix:
- `commands/__tests__/add.test.ts` — if a fixture array lists `"reporting"` (≈ line 254) as an installable module, remove that element and decrement any related `toHaveLength` count.
- `lib/__tests__/discovery-engine*.test.ts` — if a test asserts a full-repo `modules.size`, update the expected count to reflect the removed modules (filtered-set tests using explicit `installedModules` like `['core','coding']` are unaffected — do not touch them).
- Any `e2e`/integration test referencing a `writer`/`reporting` command or path — remove that case.

For each: read the failing assertion, confirm the only reason it fails is the removed module/command (not a logic regression), then update the literal. Do **not** weaken an assertion to hide an unrelated failure — if a failure is not explained by deletion, stop and report.

Re-run after each fix:
```bash
npx jest <failing-suite-path> 2>&1 | tail -15
```

- [ ] **Step 3: Full green gate (build + lint + all tests)**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli
npm run build && npm run lint && npm test 2>&1 | tail -15
```
Expected: `tsc` exits 0; `eslint src/` reports no errors; Jest reports all suites passing.

- [ ] **Step 4: Confirm the prune is complete repo-wide**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager
test ! -d framework/modules/writer && test ! -d framework/modules/reporting && echo "modules removed"
test ! -d framework/cli/src/commands/writer && echo "writer cli removed"
grep -rln "ai-ios-developer\|ai-hig-reviewer\|implementing-ios\|designing-ios-ui" framework/modules framework/cli/src || echo "ios refs clean"
```
Expected: `modules removed`, `writer cli removed`, `ios refs clean`.

- [ ] **Step 5: Commit**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager
git add -A
git commit -m "test: align test suite with pruned module set"
```

---

## Done-When (Plan 1 exit criteria)

- Repo is a clean source-only copy; `framework/cli/framework` bundle and `node_modules` were not committed from the source.
- `writer`, `reporting` modules and all writer CLI/MCP/index/type/wizard wiring are gone, with no dangling references in source.
- iOS coding agents/skills are gone and `coding/module.json` `provides` lists only the retained agents/skills/capabilities.
- `planning` CLI commands are untouched and still registered.
- `npm run build`, `npm run lint`, and `npm test` are all green.

**Not in this plan:** context-system removal (Plan 2), knowledge skills + `references.yml` (Plan 3), CLI trim / `routes.yml` removal / v1.0.0 re-baseline / doc rewrite (Plan 4).

---

## Self-Review

- **Spec coverage:** Implements spec §4 (delete `writer`, `reporting`, iOS coding artifacts) and the prune half of §10 steps 1–3. Context, knowledge-skill, routes, version, and doc work are explicitly deferred to Plans 2–4 — by design, each plan ends green.
- **Placeholder scan:** Test-fix steps name exact files and the exact transformation (remove element / update count), with a guard against masking unrelated failures — concrete, not "fix the tests."
- **Type consistency:** No new types introduced. Module/agent/skill names used (`ai-architect`, `ai-app-developer`, `implementing-ios`, `designing-ios-ui`, `ai-ios-developer`, `ai-hig-reviewer`) match the verified source.
- **Build-stays-green ordering:** Writer file deletion and import removal are one task (Task 3); iOS file deletion and manifest edit are one task (Task 4) — no commit boundary leaves a broken build.
