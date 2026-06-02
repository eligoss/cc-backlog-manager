# Plan 5 — Remove the `validate` and `bump-version` Commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the `validate` and `bump-version` CLI commands, their MCP tools, the now-orphaned `version-validator.ts` and `managing-versions` skill / `version-management` capability, and every functional reference to them (manifest cli-commands, pre-commit/pre-push hook templates, doc-gen script, console strings) — leaving `build` (via `BuildEngine`) as the framework's validation entry point.

**Architecture:** `validate` is being superseded by `build` (the `BuildEngine` at `src/lib/build/build-engine.ts`, which does schema + link validation and is already the CLI `build` command). Two consumers of `validateCommand` must be handled first: the MCP `buildTool` (repointed to `BuildEngine`) and the CLI `build` command (already independent). `version-validator.ts` is consumed **only** by `validate` → it dies with it. `FrameworkValidator` is **NOT** orphaned — `status.ts:137` also uses it — so `framework-validator.ts` is left untouched. `validating-links` skill / `link-validation` capability **survive** because `build-engine.ts:23` imports `MarkdownLinkValidator`. `managing-versions` skill / `version-management` capability are orphaned (they backed only `validate --versions` + `bump-version`) → removed, along with the `pre-commit-skill-reminder.ts` block that references them.

**Tech Stack:** TypeScript (ESM, strict), Jest (unit + integration + e2e), Commander CLI, `fs-extra`, `yaml`. Source of truth: `framework/cli/src` + `framework/modules`. The `framework/cli/framework/` bundle and `.claude/` are gitignored build/deploy output — never edit them.

**Scope note:** This is the second of three finishing plans (spec §9). **Plan 4** removed routes (done). **This plan (5)** removes the `validate`/`bump-version` **code + functional config** (manifest, hook templates, scripts, console strings). **Plan 6** re-baselines to v1.0.0 and rewrites all user-facing + module **prose** that references these commands — `CHANGELOG.md`, `CLAUDE.md`, `README.md`, `framework/cli/README.md`, `docs/*`, and `framework/modules/**/*.md`. **Plan 5 does NOT touch any markdown prose** (those refs are stale-but-harmless between plans, exactly as in Plan 4).

---

## Critical Conventions (read before starting)

- **Build pitfall (MEMORY.md):** Use `npx tsc --noEmit` to type-check. **NEVER** `npm run build` for verification — its `prebuild` (`scripts/prepare-publish.js`) bundles modules into the gitignored `framework/cli/framework/` and **reverts source edits**. The dist smoke test in Task 6 requires an emit build (`npx tsc`, which is safe — it is NOT `npm run build`). After an emit build, re-confirm source survived with grep before committing.
- **Compiler-guided removal:** removing exports (`validateCommand`, `bumpVersion`, `VersionValidator`) makes `tsc` enumerate every consumer. Run `npx tsc --noEmit` after each structural deletion and fix what it flags. **Test files type-check at jest time, not tsc time** (the main tsconfig excludes tests) — so a deleted *type field* (e.g. `BumpVersionOptions`) used in a test will pass `tsc` AND pass transpile-only ts-jest, but is still stale. Fold test fixes into the same task as the source change and rely on the Task 6 test-file sweep as the backstop (Plan 4 lesson: a `--routes` `execCLI` test and a `ValidateOptions.routes` test both slipped past `tsc`).
- **Test gate is three suites.** Default `npx jest` = unit only (excludes `*.integration.test.ts`, `*.e2e.test.ts`, `/__tests__/e2e/`). Integration = `npx jest --config jest.integration.config.cjs`; e2e = `npx jest --config jest.e2e.config.cjs`. **Per-task gate runs the suite where breakage lives.** Always pass a path/pattern filter to jest to avoid teardown-triggered source restoration.
- **`execCLI` integration tests run the compiled `dist/`** — they only reflect source after an emit build. The Task 1 buildTool repoint and any `validate --help`/`bump-version --help` assertions are exercised against `dist`; rebuild (`npx tsc`) before running those suites if in doubt (Plan 4 lesson: a stale `dist` masked a `--routes` `execCLI` failure until Task 6).
- **Test-fix discipline:** remove only the `validate`/`bump-version`-specific assertions/fixtures; never weaken an unrelated assertion; update count assertions to the true new number. Delete command-only test files entirely.
- **MCP tool counts:** start at **38 total / 12 framework** (Plan 4 baseline). Removing `bumpVersionTool` (Task 2) → **37 / 11**. Removing `validateTool` (Task 3) → **36 / 10**. `buildTool` stays (repointed). Update assertions in `mcp/__tests__/tools.integration.test.ts` to the running number in the task that changes it.
- **All `cd` are absolute** — the shell cwd resets between commands. `cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli` for jest/tsc; repo root for git.
- **Branch:** `feature/framework-simplification` (Plans 1–4 committed on it). Stay on it. Never commit to `main`.
- **Authoritative file list:** the lists below come from greps run during planning. The real list is whatever `npx tsc --noEmit` + the Task 6 grep sweep flag. Trust the compiler and greps over the enumeration; if a file is flagged that the plan didn't mention, fix it and note it.

---

## File Structure

**Delete entirely:**
- `framework/cli/src/commands/validate.ts`
- `framework/cli/src/commands/__tests__/validate.test.ts`
- `framework/cli/src/commands/bump-version.ts`
- `framework/cli/src/commands/__tests__/bump-version.test.ts`
- `framework/cli/src/lib/version-validator.ts`
- `framework/cli/src/lib/__tests__/version-validator.test.ts`
- `framework/cli/src/lib/__tests__/version-validator.integration.test.ts`
- `framework/modules/core/skills/managing-versions/` (whole directory)

**Modify (source):** `src/index.ts`, `src/mcp/tools/framework.ts`, `src/types/command-options.ts`, `src/hooks/pre-commit-skill-reminder.ts`, `src/commands/sync.ts`, `src/commands/init.ts`, `src/commands/status.ts`, `scripts/update-documentation.ts`.

**Modify (config/manifest/templates):** `framework/modules/core/module.json`, `framework/modules/core/registries/skill-triggers.json`, `framework/modules/core/templates/config/hooks/pre-push.sh.template`.

**Modify (tests — remove command-specific assertions only):** `src/mcp/__tests__/tools.integration.test.ts`, `src/mcp/__tests__/framework.integration.test.ts`, `src/commands/__tests__/type-safety.integration.test.ts`, `src/types/__tests__/command-options.unit.test.ts`, and any MCP `agentic_build` integration test (rewritten in Task 1).

**Explicitly NOT touched (survive):** `src/lib/framework-validator.ts` (used by `status.ts`), `src/lib/build/build-engine.ts`, `src/lib/link-validator.ts`, `framework/modules/core/skills/validating-links/` + `link-validation` capability.

---

## Task 1: Repoint the MCP `buildTool` from `validateCommand` to `BuildEngine`

> **Why first + isolated (advisor):** `agentic_build` currently wraps `validateCommand({strict:true})` (capability-resolution + module/skill checks via `FrameworkValidator`), while the CLI `build` runs `BuildEngine` (schema + links). Repointing fixes that inconsistency **and** decouples `build` from `validate` so Task 3 can delete `validate` cleanly. This is the one behavior-change task — its existing MCP integration tests assert the OLD behavior and must be **rewritten**, not count-adjusted.

**Files:** modify `src/mcp/tools/framework.ts`; rewrite the `agentic_build` integration test (likely in `src/mcp/__tests__/framework.integration.test.ts`).

- [ ] **Step 1: Survey the current buildTool + the CLI build reference**

Run: `cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli` then `grep -n "buildTool\|BuildSchema\|agentic_build\|BuildEngine\|CliContext\|^import" src/mcp/tools/framework.ts | head -40`. Read `src/commands/build.ts` (the `buildCommand` body, ~lines 54–115) as the reference implementation of `BuildEngine` usage. Confirm the `BuildSchema` fields: `path, quick, externalLinks, emitSchemas, schemaDir, json, verbose, ci`.

- [ ] **Step 2: Add imports needed for BuildEngine**

In `src/mcp/tools/framework.ts`, add (if not already present): `import * as path from "path";`, `import { CliContext } from "../../lib/cli-context.js";`, `import { BuildEngine, type BuildOptions } from "../../lib/build/build-engine.js";`. (Verify with the Step 1 grep which are already imported — do not duplicate.)

- [ ] **Step 3: Replace the buildTool handler body**

Replace the `buildTool` handler (the `async (args) => { ... }` that calls `validateCommand`) with a `BuildEngine`-based implementation modeled on `build.ts`:

```typescript
export const buildTool = defineTool(
  "agentic_build",
  "Validate framework artifacts with compile-time-like checking (unified validation)",
  BuildSchema,
  async (args) => {
    const ctx =
      args.path && args.path !== "."
        ? await CliContext.create({ path: args.path })
        : await CliContext.require();
    const projectPath = ctx.projectRoot;

    let frameworkPath: string = projectPath;
    if (ctx.manifest?.paths?.source) {
      frameworkPath = path.join(projectPath, ctx.manifest.paths.source);
    }

    const buildOptions: BuildOptions = {
      projectPath,
      frameworkPath,
      quick: args.quick,
      externalLinks: args.externalLinks,
      emitSchemas: args.emitSchemas,
      schemaOutputDir: args.schemaDir,
      verbose: args.verbose,
    };

    const result = await new BuildEngine(buildOptions).build();

    if (!result.success) {
      return errorResult(
        ErrorCodes.VALIDATION_FAILED,
        "Build failed",
        undefined,
        `${result.errorCount} error(s), ${result.warningCount} warning(s)`,
      );
    }
    return successResult(
      { success: true, stats: result.stats },
      "Build completed successfully",
    );
  },
);
```

> Verify field names against the actual `BuildOptions` interface in `build-engine.ts` (the survey in Step 1) and against `build.ts` — match them exactly. Do NOT remove the `validateCommand` import yet (Task 3 owns that); `validateTool` still uses it.

- [ ] **Step 4: Type-check**

Run: `cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx tsc --noEmit`. Fix any field-name mismatches until clean.

- [ ] **Step 5: Rewrite the `agentic_build` MCP integration test**

Find it: `grep -rn "agentic_build\|buildTool" src/mcp/__tests__/`. The existing test asserts validate-style behavior. Rewrite the assertions to reflect `BuildEngine` output (it returns a result the tool maps to `{ success, stats }` on success / a "Build failed" error on failure). Keep it behavioral: assert the tool returns a defined result with a boolean `success`, and (if the fixture is a valid framework) that it succeeds. Remove any assertion tied to `validateCommand`'s `{ validated: true }` shape.

- [ ] **Step 6: Emit build (execCLI/dist parity) + run the MCP build suite**

Run: `npx tsc` (emit — safe, NOT `npm run build`), then `npx jest --config jest.integration.config.cjs framework tools 2>&1 | tail -12`. PASS.

- [ ] **Step 7: Lint + commit**

`npx eslint . --quiet 2>&1 | tail -5`; then from repo root: `git add framework/cli/src && git commit -m "refactor(cli): repoint MCP build tool to BuildEngine (decouple from validate)"`.

---

## Task 2: Remove the `bump-version` command + MCP tool

**Files:** delete `src/commands/bump-version.ts`, `src/commands/__tests__/bump-version.test.ts`; modify `src/index.ts`, `src/mcp/tools/framework.ts`, `src/types/command-options.ts`; update `src/mcp/__tests__/tools.integration.test.ts`.

- [ ] **Step 1: Survey**

Run: `cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && grep -rn "bumpVersion\|bump-version\|BumpVersion\|createBumpVersionCommand" src --include="*.ts" | grep -v "/__tests__/"`.

- [ ] **Step 2: Delete the command + its test**

From repo root: `git rm framework/cli/src/commands/bump-version.ts framework/cli/src/commands/__tests__/bump-version.test.ts`.

- [ ] **Step 3: Remove from `index.ts`**

Remove `import { createBumpVersionCommand } from "./commands/bump-version.js";` and the `program.addCommand(createBumpVersionCommand());` line (with its `// Bump version command` comment).

- [ ] **Step 4: Remove `bumpVersionTool` from the MCP tools**

In `src/mcp/tools/framework.ts`: remove `import { bumpVersion } from "../../commands/bump-version.js";`, the `BumpVersionSchema` block, the `bumpVersionTool` definition, and its entry in the `frameworkTools` array.

- [ ] **Step 5: Remove `BumpVersionOptions` from `command-options.ts`**

Remove the `BumpVersionOptions` interface (the `/** Options for bump-version command */` block). Confirm no other source imports it: `grep -rn "BumpVersionOptions" src --include="*.ts" | grep -v "/__tests__/"` → no matches.

- [ ] **Step 6: Type-check**

`npx tsc --noEmit` → clean. Fix dangling imports.

- [ ] **Step 7: Update MCP tool-count assertions (38 → 37, framework 12 → 11)**

In `src/mcp/__tests__/tools.integration.test.ts`: change every total-count assertion `.toBe(38)` → `.toBe(37)`, the framework-category `.toBe(12)` → `.toBe(11)` (and its `it('should have 12 framework tools'…)` title → 11), and remove `expect(names).toContain('agentic_bump_version');`. Remove any `bumpVersion` jest.mock and `agentic_bump_version` references in `framework.integration.test.ts`.

Run: `npx jest --config jest.integration.config.cjs tools framework 2>&1 | tail -10`. PASS.

- [ ] **Step 8: Lint + commit**

`npx eslint . --quiet`; from repo root: `git add framework/cli/src && git commit -m "feat(cli): remove bump-version command and MCP tool"`.

---

## Task 3: Remove the `validate` command + MCP tool + `version-validator`

> **`FrameworkValidator` survives:** `status.ts:137` constructs `new FrameworkValidator(engine, projectPath)`. Do NOT touch `src/lib/framework-validator.ts`. Only `version-validator.ts` (consumed solely by `validate`) is deleted.

**Files:** delete `src/commands/validate.ts`, `src/commands/__tests__/validate.test.ts`, `src/lib/version-validator.ts`, `src/lib/__tests__/version-validator.test.ts`, `src/lib/__tests__/version-validator.integration.test.ts`; modify `src/index.ts`, `src/mcp/tools/framework.ts`; update `src/mcp/__tests__/tools.integration.test.ts`, `src/commands/__tests__/type-safety.integration.test.ts`, `src/types/__tests__/command-options.unit.test.ts`.

- [ ] **Step 1: Survey**

Run: `cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && grep -rn "validateCommand\|VersionValidator\|version-validator\|\"validate\"\|command(\"validate\")" src --include="*.ts" | grep -v "/__tests__/" | grep -v "backlog/validate\|confluence/validate\|planning/validate\|validate-plan\|validate-enhanced\|validate-fields\|validateTool"`. Confirm the only `validateCommand` consumers left are `index.ts` (registration) and `mcp/tools/framework.ts` (`validateTool`) — Task 1 already removed the buildTool dependency.

- [ ] **Step 2: Delete the command, version-validator, and their tests**

From repo root: `git rm framework/cli/src/commands/validate.ts framework/cli/src/commands/__tests__/validate.test.ts framework/cli/src/lib/version-validator.ts framework/cli/src/lib/__tests__/version-validator.test.ts framework/cli/src/lib/__tests__/version-validator.integration.test.ts`.

- [ ] **Step 3: Remove the `validate` command registration from `index.ts`**

Remove `import { validateCommand } from "./commands/validate.js";` and the entire `program.command("validate")...action(validateCommand)` block (with its options `--strict/--json/--verbose/--versions/--links`). Leave the `build` command (`createBuildCommand`) registration intact.

- [ ] **Step 4: Remove `validateTool` from the MCP tools**

In `src/mcp/tools/framework.ts`: remove `import { validateCommand } from "../../commands/validate.js";`, the `ValidateSchema` block, the `validateTool` definition, and its entry in the `frameworkTools` array. (`buildTool` no longer references `validateCommand` after Task 1.)

- [ ] **Step 5: Type-check**

`npx tsc --noEmit` → clean. The compiler enumerates any remaining `validateCommand`/`VersionValidator` consumer — fix each. (Expect none beyond what Steps 3–4 removed.)

> **Optional, do-not-expand-scope (advisor):** `recordValidateCommand` (in `lib/telemetry/instrumentation/cli-instrumentation.ts`) loses its only caller when `validate.ts` is deleted. It is a harmless dead export — `tsc` will NOT flag it (it is `export`ed). Leaving it is fine; remove it only if trivial and it has zero remaining references (`grep -rn "recordValidateCommand" src --include="*.ts" | grep -v "/__tests__/"`).

- [ ] **Step 6: Update MCP tool-count assertions (37 → 36, framework 11 → 10) + remove validate tests**

In `src/mcp/__tests__/tools.integration.test.ts`: `.toBe(37)` → `.toBe(36)`, framework `.toBe(11)` → `.toBe(10)` (+ title), remove `expect(names).toContain('agentic_validate');`. In `src/mcp/__tests__/framework.integration.test.ts`: remove the entire `describe('agentic_validate', …)` block and any `validateTool` import/usage. In `src/commands/__tests__/type-safety.integration.test.ts`: remove the `validate command options` describe block (the `--versions`/`--links` `execCLI('validate --help')` tests). In `src/types/__tests__/command-options.unit.test.ts`: remove the `ValidateOptions` describe block (the type no longer exists).

> Also delete `ValidateOptions` from `src/types/command-options.ts` if it is still defined there and now unused (`grep -rn "ValidateOptions" src --include="*.ts" | grep -v "/__tests__/"` → if only the definition remains, remove it).

- [ ] **Step 7: Emit build + run gates**

Run: `npx tsc` (emit), then `npx jest validate command-options type-safety command-factory 2>&1 | tail -10` (unit) and `npx jest --config jest.integration.config.cjs tools framework type-safety 2>&1 | tail -12` (integration). Both PASS.

- [ ] **Step 8: Lint + commit**

`npx eslint . --quiet`; from repo root: `git add framework/cli/src && git commit -m "feat(cli): remove validate command, MCP tool, and version-validator"`.

---

## Task 4: Clean up the core manifest, `managing-versions` skill, and skill-triggers

**Files:** modify `framework/modules/core/module.json`; delete `framework/modules/core/skills/managing-versions/`; modify `framework/modules/core/registries/skill-triggers.json`.

- [ ] **Step 1: Survey the manifest + surviving-skill frontmatter**

Run: `grep -n "validate\|bump-version\|managing-versions\|version-management\|routes\|validating-links\|link-validation\|pre-commit" framework/modules/core/module.json`.

> **SKILL.md frontmatter is functional config, not prose (advisor):** a *surviving* skill whose `cli-commands:` frontmatter declares a removed command must be repointed/dropped here, not deferred to Plan 6. Verify: `rg -n -e "validate --versions" -e "validate --links" -e "bump-version" framework/modules/*/skills/*/SKILL.md`. **Verified in planning:** the only hits are in `managing-versions/SKILL.md` (deleted wholesale in Step 5); `validating-links/SKILL.md` declares no removed command. If that grep ever returns a hit in a *surviving* skill's frontmatter `cli-commands:` block, repoint it to `build` or drop the declaration (mirroring the Step 2 module.json decision).

- [ ] **Step 2: Edit `provides.cli-commands`**

Remove the three structured objects whose `name` is `"validate --links"`, `"validate --versions"`, and `"bump-version"` (these generate `cmd-*` wrappers for removed commands). Also remove the bare strings `"validate"` and `"routes"` (inert metadata for removed commands — `generate-commands.ts` skips bare strings, so this is cleanup only). Keep `init/add/remove/list/info/update/status/sync` and the `agent *` objects.

> **Decision (link validation moves to `build`):** do NOT re-add a `validate --links` object pointing at `build`. `build` is registered via `addCommand` and was never declared in `cli-commands`; leaving it undeclared preserves current behavior (no `cmd-build` wrapper today). The `validating-links` skill keeps providing `link-validation` (consumed by `build-engine`); it simply no longer has a `cli-command` declaration.

- [ ] **Step 3: Edit the pre-commit hook entry-points**

In `entry-points.hooks.pre-commit`, replace `"agentic-framework validate --links"` with `"agentic-framework build --quick"` (preserves link checking via `BuildEngine`; `--quick` keeps it fast — confirm `build` supports `--quick`, it does per `build.ts`), and **remove** `"agentic-framework validate --versions"` (version-consistency checking goes away with `version-management`). Keep the two `sync --*--check` entries.

> ⚠️ **User-facing behavior change — flagged for sign-off in the execution handoff:** the deployed pre-commit hook will run `build --quick` instead of `validate --links`, and will no longer check version consistency. If the user wants version-consistency retained, that must move into `build` (out of scope here) before this entry is dropped.

- [ ] **Step 4: Edit `provides.skills` and `provides.capabilities`**

Remove `"managing-versions"` from `provides.skills`. Remove `"version-management"` from `provides.capabilities`. **Keep** `"validating-links"` and `"link-validation"`.

- [ ] **Step 5: Delete the `managing-versions` skill + its trigger**

From repo root: `git rm -r framework/modules/core/skills/managing-versions`. In `framework/modules/core/registries/skill-triggers.json`: remove the `managing-versions` entry (survey first: `grep -n "managing-versions" framework/modules/core/registries/skill-triggers.json`). Confirm no agent references it: `grep -rln "managing-versions" framework/modules/*/agents/` → expect none (verified in planning).

- [ ] **Step 6: Validate manifest JSON + regenerate-free check**

Run: `cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && node -e "JSON.parse(require('fs').readFileSync('../modules/core/module.json','utf8')); JSON.parse(require('fs').readFileSync('../modules/core/registries/skill-triggers.json','utf8')); console.log('JSON OK')"`. Then run the build/registry tests that load module.json: `npx jest module-loader registry-generator build-engine skill-cli 2>&1 | tail -10`. PASS.

- [ ] **Step 7: Commit**

From repo root: `git add framework/modules/core && git commit -m "chore(core): drop validate/bump-version cli-commands, managing-versions skill, version-management capability"`.

---

## Task 5: Update functional strings, hook templates, and the doc-gen script

> These are **functional** references (deployed shell hook, generated next-steps text, doc-gen replacement rules, console guidance) — not markdown prose. Markdown docs (`CHANGELOG.md`, `CLAUDE.md`, `README.md`, `framework/cli/README.md`, `framework/modules/**/*.md`) are **Plan 6**.

**Files:** modify `framework/modules/core/templates/config/hooks/pre-push.sh.template`, `framework/cli/scripts/update-documentation.ts`, `src/hooks/pre-commit-skill-reminder.ts`, `src/commands/sync.ts`, `src/commands/init.ts`, `src/commands/status.ts`.

- [ ] **Step 1: Survey each**

Run from repo root:
```
grep -n "validate" framework/modules/core/templates/config/hooks/pre-push.sh.template
grep -n "validate\|bump-version\|Version" framework/cli/scripts/update-documentation.ts
grep -n "managing-versions\|bump-version\|version" framework/cli/src/hooks/pre-commit-skill-reminder.ts
grep -n "agentic-framework validate" framework/cli/src/commands/sync.ts framework/cli/src/commands/init.ts framework/cli/src/commands/status.ts
```

- [ ] **Step 2: `pre-push.sh.template` — `validate --links` → `build --quick`**

At the line running `node framework/cli/dist/index.js validate --links` (~line 297), change `validate --links` to `build --quick`. (This deployed pre-push hook would otherwise invoke a removed command.)

- [ ] **Step 3: `update-documentation.ts` — drop the `// Version` block + the `validate` rule**

Remove the `// Version management` replacement object (the one with `replacement: 'agentic-framework validate --versions'`, category `'version'`) and the rule with `replacement: 'agentic-framework validate'` (~line 54). If the `category` union type then has unused members (`'version'`), leave the type as-is (harmless) unless `tsc`/lint flags it.

- [ ] **Step 4: `pre-commit-skill-reminder.ts` — remove the managing-versions/bump-version reminder**

Remove the `if (inFrameworkProject) { … }` block that pushes the "managing-versions" / "Bump affected module versions (agentic-framework bump-version)" messages (~lines 124–151) **OR** reduce it to drop only the version-specific lines — but since the whole block is version-management guidance, remove the block. Update the `summary` ternary (`'Reminder: committing-code + managing-versions skills available'`) to `'Reminder: committing-code skill available'` and simplify if `inFrameworkProject` is now unused (let `tsc`/lint guide; remove the now-dead `inFrameworkProject` computation if it has no other use).

- [ ] **Step 5: Console-guidance strings → `build`**

- `sync.ts` (~215): `'\nRun "agentic-framework validate" to check module installation.'` → `'\nRun "agentic-framework build" to check module installation.'`
- `init.ts` (~769, in the generated next-steps/README text): `agentic-framework validate # Validate configuration` → `agentic-framework build # Validate configuration`.
- `status.ts` (~229, ~237): `'agentic-framework validate --verbose'` → `'agentic-framework build --verbose'`; `'agentic-framework validate   Check framework integrity'` → `'agentic-framework build   Check framework integrity'`.

- [ ] **Step 6: Type-check + lint**

`cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx tsc --noEmit && npx eslint . --quiet 2>&1 | tail -5`. Clean.

- [ ] **Step 7: Run the affected suites**

Run: `npx jest pre-commit-skill-reminder sync init status update-documentation 2>&1 | tail -10` (whichever exist) and `npx jest --config jest.e2e.config.cjs init 2>&1 | tail -8`. PASS. (If a hook/script test asserts the old strings, update it to the new `build` strings — same discipline.)

- [ ] **Step 8: Commit**

From repo root: `git add -A && git commit -m "refactor: point hooks, scripts, and console guidance at build instead of validate"`.

---

## Task 6: Functional grep sweep, full gate, and assembled smoke test

**Files:** none new; verification only.

- [ ] **Step 1: Functional grep sweep — no live references to removed commands**

Run from repo root (non-prose surface, mirrors the Plan 4 lesson):
```
rg -n -e "validate --versions" -e "validate --links" -e "bump-version" -e "bumpVersion" \
  -e "agentic_validate" -e "agentic_bump_version" -e "agentic-framework validate" -e "agentic-framework bump" \
  . --glob '!node_modules' --glob '!**/dist/**' --glob '!framework/cli/framework/**' \
  --glob '!framework/modules/**/*.md' --glob '!docs/**' --glob '!**/*.test.ts' \
  | grep -v "backlog/validate\|confluence/validate\|planning/validate\|validate-plan\|validate-enhanced\|validate-fields\|generateCommandId\|cmd-validate-links\|agentic_validate'"
```
Triage every hit: functional (hook/template/script/manifest/console/MCP) → fix here; pure markdown prose (`CHANGELOG.md`, `CLAUDE.md`, `README.md`, `framework/cli/README.md`) → confirm Plan 6 scope and leave. Expected remaining: only those four prose files. (`backlog/confluence/planning` validate commands are DIFFERENT, surviving commands — not in scope.)

> **The sweep above excludes `framework/modules/**/*.md`, which would blanket-skip SKILL.md frontmatter (advisor).** Run a dedicated frontmatter sub-sweep so a surviving skill can't point at a removed command undetected: `rg -n -e "validate --versions" -e "validate --links" -e "bump-version" framework/modules/*/skills/*/SKILL.md` → expect **no matches** (managing-versions deleted in Task 4; validating-links never declared them). Any hit in a surviving skill's `cli-commands:` frontmatter is functional → fix here; a hit in a prose body → Plan 6.

- [ ] **Step 2: Test-file sweep for removed identifiers (transpile-only backstop)**

Run: `cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && grep -rn -e "validateCommand" -e "VersionValidator" -e "ValidateOptions" -e "BumpVersionOptions" -e "bumpVersion" -e "agentic_validate" -e "agentic_bump_version" -e "managing-versions" src --include="*.test.ts"` → expect no matches (Plan 4 lesson: ts-jest transpile-only hides these).

- [ ] **Step 3: Full gate — tsc (emit), lint, all three suites**

> **Emit, not `--noEmit` (advisor):** Task 5 changed compiled source (`sync.ts`/`init.ts`/`status.ts`), and the integration/e2e `execCLI` suites run the compiled `dist/`. Use `npx tsc` (emit — type-checks AND refreshes `dist`, still safe; NOT `npm run build`) so those suites don't run against stale `dist` (the Plan 4 `--routes` stale-dist trap).

```
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli
npx tsc
npx eslint . --quiet 2>&1 | tail -5
npx jest 2>&1 | grep -e "Tests:" -e "Test Suites:" -e "FAIL"
npx jest --config jest.integration.config.cjs 2>&1 | grep -e "Tests:" -e "Test Suites:" -e "FAIL"
npx jest --config jest.e2e.config.cjs 2>&1 | grep -e "Tests:" -e "Test Suites:" -e "FAIL"
```
All green (0 tsc errors, 0 lint errors, no FAIL; test-count drops accounted for by deleted validate/bump-version/version-validator tests).

- [ ] **Step 4: Assembled smoke test — real `init`, no command wrappers for removed commands**

Emit a build (safe — `npx tsc`, NOT `npm run build`), then init into a temp dir and confirm (a) `init` succeeds, (b) no `cmd-validate-*` / `cmd-bump-version` command wrappers were generated, (c) `build` still works, (d) the deployed pre-push hook references `build`, not `validate`:
```
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx tsc 2>&1 | tail -3
SMOKE=$(mktemp -d /tmp/p5-smoke-XXXX) && cd "$SMOKE"
node /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli/dist/index.js init smoke --no-interactive --modules core,coding,backlog,confluence --no-git >/dev/null 2>&1; echo "init exit=$?"
ls "$SMOKE/.claude/commands" | grep -e "cmd-validate" -e "cmd-bump" && echo "✗ stale command wrapper generated" || echo "✓ no validate/bump command wrappers"
grep -rn "agentic-framework validate\|bump-version" "$SMOKE/.claude/hooks" "$SMOKE"/*.sh 2>/dev/null && echo "✗ functional validate/bump ref in deployed hooks" || echo "✓ no functional refs in deployed hooks"
node /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli/dist/index.js build -p "$SMOKE" 2>&1 | tail -5
echo "SMOKE=$SMOKE"
```
Clean up: `rm -rf /tmp/p5-smoke-*`. Expected: `init exit=0`, no `cmd-validate*`/`cmd-bump*` wrappers, no functional validate/bump refs in deployed hooks, `build` runs. (Markdown prose in deployed `.claude/commands/*.md` agent files may still mention `validate`/`bump-version` — that is Plan 6 prose, not a functional break.)

- [ ] **Step 5: Confirm source survived the emit build, then commit any verification-only fixes**

```
cd /Users/antonborodulin/Projects/cc-backlog-manager && grep -rn "validateCommand\|bumpVersion\b" framework/cli/src --include="*.ts" | grep -v "/__tests__/" | grep -v "backlog\|confluence\|planning" || echo "source clean"
git status --short
```
If the sweeps surfaced any missed functional reference, fix it and commit: `git add -A && git commit -m "fix(cli): purge residual validate/bump-version references"`.

- [ ] **Step 6: Complete development**

Use **superpowers:finishing-a-development-branch** to verify tests, present options, execute the chosen workflow. **Surface the Task 4 Step 3 pre-commit-hook behavior change (build --quick instead of validate --links; version-consistency check dropped) for user sign-off** as part of the handoff.

---

## Self-Review (writing-plans checklist)

- **Spec coverage:** §9 ("drop validate, bump-version … clean up backing skills/capabilities") → Tasks 1–6. `validating-links`/`link-validation` correctly **retained** (build-engine consumer verified). `managing-versions`/`version-management` removed. The §9 re-baseline-to-v1.0.0 + all doc/prose rewrites are **Plan 6** (stated in scope note).
- **Dependency correctness (verified in planning):** MCP `buildTool` repointed before `validate` deletion (Task 1 → Task 3); `version-validator.ts` dies with `validate`; `framework-validator.ts` **survives** (used by `status.ts:137`) and is explicitly untouched; `pre-push.sh.template` + pre-commit hook entries migrated to `build`; `pre-commit-skill-reminder.ts` managing-versions block removed; bare `"routes"`/`"validate"` cli-command strings confirmed inert (`generate-commands.ts:207` skips strings) and folded into Task 4.
- **Type/name consistency:** `validateCommand`, `bumpVersion`, `VersionValidator`, `ValidateOptions`, `BumpVersionOptions`, `managing-versions`, `version-management`, `agentic_validate`, `agentic_bump_version` — each named identically wherever referenced; all targeted for removal and swept in Task 6 Steps 1–2. MCP counts threaded: 38→37 (Task 2) → 36 (Task 3), framework 12→11→10.
- **Behavior-change callouts:** the MCP `agentic_build` now runs `BuildEngine` (Task 1, tests rewritten not count-adjusted); the deployed pre-commit hook runs `build --quick` and drops version-consistency checking (Task 4 Step 3, flagged for user sign-off).
- **Placeholder scan:** no TBD/TODO; every step has concrete files, edits, and commands. Where exact line blocks depend on current source, the step says "survey first" and the Task 6 sweeps are the backstop.
