# Plan 4 — Remove the Internal routes.yml Subsystem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the internal `routes.yml` file, the `routes` CLI command (`routes check` / `routes sync`), its MCP tools, generation, validation, and root-marker/path-resolution wiring — leaving `.agentic-framework.json` as the sole root marker and `DEFAULT_PATHS` as the path-resolution source.

**Architecture:** `routes.yml` is **already inert for path resolution** — `PathResolver` accessors query keys (`agents.root`, `skills.root`, `context.root`, `plans.root`) that the actual `routes.yml` structure (`claude.commands`, `claude.skills`, …) never provided, so every lookup already falls through to `DEFAULT_PATHS`; `getTicketPath` never consults routes at all. `.agentic-framework.json` is the **primary** project-root marker; `routes.yml` is only a secondary fallback. Therefore this is a **clean deletion**: removing routes.yml changes no runtime path-resolution behavior. The committed `routes.yml` is also already stale (lists removed `reporting`/`writer`/`context`). This plan deletes the mechanism and threads out the now-dead `RoutesConfig` plumbing.

**Tech Stack:** TypeScript (ESM, strict), Jest (unit + integration + e2e), Commander CLI, `fs-extra`, `yaml`. Source of truth: `framework/cli/src` + `framework/modules`. The `framework/cli/framework/` bundle and `.claude/` are gitignored build/deploy output — never edit them.

**Scope note:** This is the first of three plans that finish the simplification (spec §6.1, §8, §9). **Plan 5** removes the `validate` + `bump-version` commands and cleans up their backing skills/capabilities (`managing-versions`; note `validating-links` is also used by `build-engine`, so it likely survives). **Plan 6** re-baselines to v1.0.0 and rewrites user-facing docs (CLAUDE.md, README, docs/*, integrations/openclaw). Docs are deliberately **last** — they must describe a final CLI surface. Stale docs between plans are acceptable (they are stale now).

---

## Critical Conventions (read before starting)

- **Build pitfall (MEMORY.md):** Use `npx tsc --noEmit` to type-check. **NEVER** `npm run build` for verification — its `prebuild` (`scripts/prepare-publish.js`) bundles modules into the gitignored `framework/cli/framework/` and **reverts source edits**. The dist smoke test in Task 6 requires an emit build (`npx tsc`, which is safe — it is NOT `npm run build`). After an emit build, re-confirm source survived with grep before committing.
- **Compiler-guided removal:** removing exports/types (e.g. `RoutesConfig`, `loadRoutesConfigSync`) makes `tsc` enumerate every consumer. Run `npx tsc --noEmit` after each structural deletion and fix what it flags. Test files type-check at jest time, not tsc time — so fold test fixes into the same task as the source change.
- **Test gate is three suites.** Default `npx jest` = unit only (excludes `*.integration.test.ts`, `*.e2e.test.ts`, `/__tests__/e2e/`). Integration = `npx jest --config jest.integration.config.cjs`; e2e = `npx jest --config jest.e2e.config.cjs`. **Per-task gate runs the suite where breakage lives** (Plan 1/2 lesson). Always pass a path/pattern filter to jest to avoid teardown-triggered source restoration.
- **Test-fix discipline (Plan 1/2 lesson):** when updating tests, **remove routes-specific assertions/fixtures only**; never weaken an unrelated assertion to make it pass, and update any count assertion to the true new number. Delete routes-only test files entirely.
- **All `cd` are absolute** — the shell cwd resets between commands. `cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli` for jest/tsc; repo root for git.
- **Branch:** `feature/framework-simplification` (Plans 1–3 committed on it). Stay on it. Never commit to `main`.
- **Authoritative file list:** the file lists below came partly from an Explore agent. The real list is whatever `npx tsc --noEmit` + the grep sweeps flag. Trust the compiler and greps over the plan's enumeration; if a file is flagged that the plan didn't mention, fix it and note it.

---

## File Structure

**Delete entirely:**
- `routes.yml` (repo root)
- `framework/cli/src/commands/routes.ts`
- `framework/cli/src/lib/routes-validator.ts`
- `framework/cli/src/lib/__tests__/routes-validator.test.ts`
- `framework/cli/src/lib/__tests__/routes-validator.integration.test.ts`
- `framework/cli/src/commands/__tests__/routes-sync.test.ts`

**Modify (source):** `index.ts`, `mcp/tools/framework.ts`, `commands/validate.ts`, `commands/init.ts`, `lib/wizard/{file-handlers,index,detection,summary}.ts`, `lib/project-resolver.ts`, `lib/path-resolver.ts`, `lib/cli-context.ts`, `hooks/skill-reminder.ts`, `hooks/stop-quality-check.ts`, `lib/boundary-validator.ts`, `lib/link-validator.ts`, `lib/link-transformer.ts`, `types/command-options.ts` (if it has routes option types).

**Modify (tests — remove routes assertions only):** `project-resolver.test.ts`, `path-resolver.test.ts`, `cli-context.test.ts`, `boundary-validator.test.ts` + `.integration.test.ts`, `link-transformer.test.ts` + `.integration.test.ts`, `validate.test.ts`, `error-handling.unit.test.ts`, `backlog/__tests__/path-consistency.test.ts`, `__tests__/e2e/init-wizard.e2e.test.ts`, `mcp/__tests__/framework.integration.test.ts`, `mcp/__tests__/tools.integration.test.ts`.

---

## Task 1: Remove the `routes` CLI command, MCP tools, and the `validate --routes` flag

**Files:** delete `src/commands/routes.ts`, `src/commands/__tests__/routes-sync.test.ts`; modify `src/index.ts`, `src/mcp/tools/framework.ts`, `src/commands/validate.ts`, `src/types/command-options.ts`; update `src/mcp/__tests__/*.integration.test.ts`, `src/commands/__tests__/validate.test.ts`.

- [ ] **Step 1: Survey the wiring**

Run: `cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli` then grep each surface: `grep -n "routes" src/index.ts`, `grep -n "routes\|agentic_routes" src/mcp/tools/framework.ts`, `grep -n "routes\|RoutesValidator" src/commands/validate.ts`, `grep -ni "routes" src/types/command-options.ts`. Read the exact blocks to delete.

- [ ] **Step 2: Delete the command + its test**

Run: `git rm framework/cli/src/commands/routes.ts framework/cli/src/commands/__tests__/routes-sync.test.ts` (from repo root).

- [ ] **Step 3: Remove `routes` registration + imports from `index.ts`**

Remove the `import { createBumpVersionCommand ...}`-adjacent routes imports (e.g. `routesCheckCommand`, `routesSyncCommand`) and the entire `// Routes commands` block that registers `program.command("routes")` with its `check`/`sync` subcommands (the block beginning at `const routes = program.command("routes")`).

- [ ] **Step 4: Remove the two routes MCP tools from `mcp/tools/framework.ts`**

Remove the routes imports (the `import { routesCheckCommand, routesSyncCommand }`-style line), the two tool definitions (`agentic_routes_check`, `agentic_routes_sync`), and their entries in the exported tools array. (The MCP tool count drops by 2 — relevant to Step 7.)

- [ ] **Step 5: Remove the `--routes` flag from `validate.ts`**

Remove: the `import { RoutesValidator }` line, the `.option("--routes", ...)` registration, the branch that runs routes validation when `--routes` is set, and the routes-report printing block. Leave the rest of the `validate` command intact (it is removed wholesale in Plan 5, not here). Remove any routes field from `src/types/command-options.ts` if present.

- [ ] **Step 6: Type-check and fix the immediate fallout**

Run: `cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx tsc --noEmit`. Fix every error (likely dangling imports). Re-run until clean.

- [ ] **Step 7: Update tests, then run unit + the MCP integration suite**

In `src/commands/__tests__/validate.test.ts` remove any `--routes` test case. In `src/mcp/__tests__/tools.integration.test.ts` update the MCP tool-count assertion (it drops by 2 — set it to the true new number, do not weaken it) and remove `agentic_routes_*` references; do the same in `framework.integration.test.ts`. In `error-handling.unit.test.ts` remove any routes-command case.

Run: `npx jest validate command-factory 2>&1 | tail -8` and `npx jest --config jest.integration.config.cjs tools framework 2>&1 | tail -10`. Both PASS.

- [ ] **Step 8: Lint + commit**

Run: `cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx eslint . --quiet 2>&1 | tail -5`. Then from repo root: `git add framework/cli/src && git commit -m "feat(cli): remove routes command and routes MCP tools"`.

---

## Task 2: Remove routes.yml generation (init + wizard)

**Files:** modify `src/commands/init.ts`, `src/lib/wizard/file-handlers.ts`, `src/lib/wizard/index.ts`, `src/lib/wizard/detection.ts`, `src/lib/wizard/summary.ts`; update `src/__tests__/e2e/init-wizard.e2e.test.ts`.

- [ ] **Step 1: Survey**

Run: `cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && grep -rn "backupAndCreateRoutesYml\|hasRoutesYml\|routes.yml\|routesYml" src/commands/init.ts src/lib/wizard/`.

- [ ] **Step 2: Remove generation from `init.ts`**

Remove the `import { backupAndCreateRoutesYml }` line and the call site (in `createEntryPoints`, the `const routesYml = ...` template string and the `await backupAndCreateRoutesYml(projectPath, routesYml)` call). Keep `createEntryPoints` otherwise intact (CLAUDE.md/README generation stays).

- [ ] **Step 3: Delete `backupAndCreateRoutesYml` from `file-handlers.ts` and its export from `wizard/index.ts`**

Delete the whole `backupAndCreateRoutesYml` function in `file-handlers.ts`; remove its re-export line in `wizard/index.ts`.

- [ ] **Step 4: Remove `hasRoutesYml` from `detection.ts` and routes notice from `summary.ts`**

In `detection.ts`: remove the `hasRoutesYml` field from the detection-info interface and every place it is set/read. In `summary.ts`: remove the lines that print the routes.yml backup notice.

- [ ] **Step 5: Type-check**

Run: `cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx tsc --noEmit`. Fix fallout until clean.

- [ ] **Step 6: Update + run the init e2e suite**

In `src/__tests__/e2e/init-wizard.e2e.test.ts` remove any assertion about `routes.yml` creation / `hasRoutesYml` detection / routes backup. Run: `npx jest --config jest.e2e.config.cjs init 2>&1 | tail -10`. PASS.

- [ ] **Step 7: Lint + commit**

`npx eslint . --quiet`; then `git add framework/cli/src && git commit -m "feat(cli): stop generating routes.yml on init"` from repo root.

---

## Task 3: Delete `routes-validator.ts` and remove routes.yml from static framework-file lists

**Files:** delete `src/lib/routes-validator.ts` + its two test files; modify `src/lib/boundary-validator.ts`, `src/lib/link-validator.ts`, `src/lib/link-transformer.ts`; update `boundary-validator` + `link-transformer` tests.

- [ ] **Step 1: Delete the validator + tests**

From repo root: `git rm framework/cli/src/lib/routes-validator.ts framework/cli/src/lib/__tests__/routes-validator.test.ts framework/cli/src/lib/__tests__/routes-validator.integration.test.ts`.

- [ ] **Step 2: Remove routes.yml from static lists**

- `boundary-validator.ts`: remove `'routes.yml'` from the `instancePaths` array.
- `link-validator.ts`: remove `'routes.yml'` from `FRAMEWORK_ROOT_FILES`.
- `link-transformer.ts`: remove `'routes.yml'` from `FRAMEWORK_FILE_PATTERNS`.

Confirm no other consumer imports `RoutesValidator`: `cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && grep -rn "RoutesValidator\|routes-validator" src` → expect no matches.

- [ ] **Step 3: Type-check**

`npx tsc --noEmit` → clean.

- [ ] **Step 4: Update + run affected tests**

In `boundary-validator.test.ts` + `.integration.test.ts` and `link-transformer.test.ts` + `.integration.test.ts`, remove `routes.yml`-specific assertions/fixtures (do not weaken unrelated checks). Run: `npx jest boundary-validator link-transformer link-validator 2>&1 | tail -8` and `npx jest --config jest.integration.config.cjs boundary-validator link-transformer 2>&1 | tail -8`. PASS.

- [ ] **Step 5: Lint + commit**

`npx eslint . --quiet`; `git add framework/cli/src && git commit -m "refactor(cli): delete routes-validator and drop routes.yml from framework file lists"` from repo root.

---

## Task 4: Remove routes.yml as a project-root marker (resolver + hooks)

**Files:** modify `src/lib/project-resolver.ts`, `src/hooks/skill-reminder.ts`, `src/hooks/stop-quality-check.ts`; update `project-resolver.test.ts`.

- [ ] **Step 1: Survey**

Run: `cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && grep -n "routes" src/lib/project-resolver.ts src/hooks/skill-reminder.ts src/hooks/stop-quality-check.ts`.

- [ ] **Step 2: `project-resolver.ts` — drop the `'routes'` detection method**

Remove `'routes'` from the `DetectionMethod` union, remove the routes-marker detection branch (the `routes.yml + CLAUDE.md` secondary-marker check), and remove `routes` from any doc comment enumerating markers. Keep `manifest` (primary), `git+claude`, and `cwd`.

- [ ] **Step 3: Hooks — `findFrameworkRoot` checks only `.agentic-framework.json`**

In both `skill-reminder.ts` and `stop-quality-check.ts`: change `findFrameworkRoot` to test only `fs.existsSync(path.join(currentDir, '.agentic-framework.json'))` (drop the `|| ... routes.yml` clause). In `stop-quality-check.ts` also remove the block that warns when `routes.yml` is missing / suggests `routes sync`.

- [ ] **Step 4: Type-check**

`npx tsc --noEmit` → clean.

- [ ] **Step 5: Update + run tests**

In `project-resolver.test.ts` remove the routes-marker detection test(s) (a project detected via routes.yml). Keep manifest/git+claude/cwd tests. If a test asserts the `DetectionMethod` set, update it. Run: `npx jest project-resolver 2>&1 | tail -8`. PASS. If hook tests exist (`skill-reminder`, `stop-quality-check`), run them too.

- [ ] **Step 6: Lint + commit**

`npx eslint . --quiet`; `git add framework/cli/src && git commit -m "refactor(cli): drop routes.yml as a root marker; .agentic-framework.json is sole marker"` from repo root.

---

## Task 5: Thread out the dead `RoutesConfig` path-resolution plumbing

**Files:** modify `src/lib/path-resolver.ts`, `src/lib/cli-context.ts`; update `path-resolver.test.ts`, `cli-context.test.ts`, `backlog/__tests__/path-consistency.test.ts`.

> **Why safe:** routes-based path resolution is already inert (the resolver's keys never matched routes.yml's structure, so `DEFAULT_PATHS` already wins). Removing the `RoutesConfig` parameter/loader is **dead-code removal with no behavior change**. Verified end-to-end in Step 6.

- [ ] **Step 1: Survey**

Run: `cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && grep -n "RoutesConfig\|routesConfig\|loadRoutesConfig\|resolve(" src/lib/path-resolver.ts src/lib/cli-context.ts`.

- [ ] **Step 2: `path-resolver.ts` — make it DEFAULT_PATHS-only**

Remove the `RoutesConfig` interface, the `routesConfig` constructor parameter/field, the `resolve(dotPath)` method (which read routes), and `parseRoutesYml`. Each semantic accessor (`getTicketPath`, `getPlanPath`, `getContextPath`, `getAgentPath`, `getSkillPath`, …) currently does `const x = this.resolve('…') || path.join(projectRoot, DEFAULT_PATHS.…)`; simplify each to `path.join(this.projectRoot, DEFAULT_PATHS.…)` (with the existing category/ticket-type joins preserved). Update `createPathResolverSync` (and any async factory) to no longer accept/pass `routesConfig`.

> `getContextPath()`/`DEFAULT_PATHS.context` are vestigial (context system removed) but harmless — leave the default in place; deleting `getContextPath` is out of scope (no caller cleanup here). If `tsc` shows `getContextPath` has zero callers, you may delete it; otherwise leave it.

- [ ] **Step 3: `cli-context.ts` — stop loading routes.yml**

Remove `loadRoutesConfigSync` (and its `routesFilePath`/`routes.yml` reads), remove the `routesConfig` field from the context object and the `'routes'` detection-method doc comment, and update the `createPathResolverSync(...)` call to drop the routesConfig argument.

- [ ] **Step 4: Type-check**

`npx tsc --noEmit` → clean. (The compiler enumerates every remaining `RoutesConfig`/`routesConfig` consumer — fix each.)

- [ ] **Step 5: Update + run tests**

In `path-resolver.test.ts`: remove tests that pass a `routesConfig` / assert routes-derived resolution; keep/adjust the DEFAULT_PATHS resolution tests (these now describe the only behavior). In `cli-context.test.ts`: remove routes-config loading assertions. In `backlog/__tests__/path-consistency.test.ts`: ensure ticket/plan path assertions still pass against DEFAULT_PATHS. Run: `npx jest path-resolver cli-context path-consistency 2>&1 | tail -10`. PASS.

- [ ] **Step 6: Type-check, lint, commit**

`npx tsc --noEmit && npx eslint . --quiet`; then from repo root `git add framework/cli/src && git commit -m "refactor(cli): remove dead RoutesConfig path-resolution plumbing (DEFAULT_PATHS only)"`.

---

## Task 6: Delete `routes.yml`, final verification, and assembled smoke test

**Files:** delete `routes.yml`; run full gate + a real `init` + backlog path-resolution smoke test.

- [ ] **Step 1: Delete the file**

From repo root: `git rm routes.yml`.

- [ ] **Step 2: Full grep sweep — no dangling routes references in source**

Run from repo root:
```
grep -rn -e "routes.yml" -e "routes sync" -e "routesConfig" -e "RoutesConfig" -e "RoutesValidator" -e "backupAndCreateRoutesYml" -e "hasRoutesYml" framework/cli/src framework/modules | grep -v "/__tests__/"
```
Expect: no matches. (Doc/comment mentions in user-facing markdown under `docs/`, `CLAUDE.md`, `README.md` are **Plan 6's** job — do not touch here. The grep above is scoped to `framework/cli/src` + `framework/modules` source only.)

- [ ] **Step 3: Full gate — tsc, lint, all three suites**

```
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli
npx tsc --noEmit
npx eslint . --quiet 2>&1 | tail -5
npx jest 2>&1 | grep -e "Tests:" -e "Test Suites:"
npx jest --config jest.integration.config.cjs 2>&1 | grep -e "Tests:" -e "Test Suites:"
npx jest --config jest.e2e.config.cjs 2>&1 | grep -e "Tests:" -e "Test Suites:"
```
All green (0 tsc errors, 0 lint errors, all suites pass; skip counts unchanged from Plan 3 baseline aside from deleted routes tests).

- [ ] **Step 4: Assembled smoke test — real `init` with no routes.yml, then backlog path resolution**

Emit a build (safe — `npx tsc`, NOT `npm run build`), then run the real CLI into a temp dir and confirm (a) `init` succeeds and creates **no** `routes.yml`, (b) the standard files still land, (c) a backlog command resolves a ticket path correctly with no routes.yml present:
```
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx tsc 2>&1 | tail -3
SMOKE=$(mktemp -d /tmp/p4-smoke-XXXX) && cd "$SMOKE"
node /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli/dist/index.js init smoke --no-interactive --modules core,coding,backlog,confluence --no-git >/dev/null 2>&1; echo "init exit=$?"
test ! -e "$SMOKE/routes.yml" && echo "no routes.yml — good" || echo "routes.yml STILL CREATED — BAD"
ls "$SMOKE/.claude/skills" | grep knowing && ls "$SMOKE/references.yml" && ls "$SMOKE/.agentic-framework.json"
node /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli/dist/index.js status -p "$SMOKE" 2>&1 | tail -5
echo "SMOKE=$SMOKE"
```
Then run any backlog path-resolution CLI you have (e.g. `backlog` subcommand or rely on `path-consistency.test.ts` already proving DEFAULT_PATHS resolution). Clean up: `rm -rf /tmp/p4-smoke-*`.

Expected: `init exit=0`, no routes.yml, knowing-* + references.yml + .agentic-framework.json present, `status` works (proving root detection via `.agentic-framework.json` alone).

- [ ] **Step 5: Confirm source survived the emit build, then commit**

```
cd /Users/antonborodulin/Projects/cc-backlog-manager && grep -rn "routes.yml\|RoutesConfig" framework/cli/src --include="*.ts" | grep -v "/__tests__/" || echo "source clean"
git status --short
git add -A && git commit -m "feat(cli): delete routes.yml; .agentic-framework.json + DEFAULT_PATHS only"
```

- [ ] **Step 6: Complete development**

Use **superpowers:finishing-a-development-branch** to verify tests, present options, execute the chosen workflow.

---

## Self-Review (writing-plans checklist)

- **Spec coverage:** §8 (remove internal `routes.yml` + `routes sync`; native navigation suffices; `references.yml` covers external pointers) → Tasks 1–6. The CLAUDE.md "Trust Directive relaxed accordingly" clause from §8 is **doc prose → deferred to Plan 6** (the doc-rewrite plan); this plan removes only the mechanism.
- **Out of scope (correctly deferred):** `validate`/`bump-version` command removal + skill/capability cleanup → Plan 5. Re-baseline to v1.0.0 + user-facing doc rewrite (CLAUDE.md/README/docs/*/integrations) → Plan 6.
- **Type/name consistency:** `RoutesConfig`, `routesConfig`, `loadRoutesConfigSync`, `backupAndCreateRoutesYml`, `hasRoutesYml`, `RoutesValidator` — each named identically wherever referenced; all targeted for removal and swept in Task 6 Step 2.
- **Risk control:** clean-deletion verified up front (routes path-resolution already inert → DEFAULT_PATHS); compiler-guided removal + per-task gates on the suite where breakage lives; assembled smoke test (real `init` + root detection via `.agentic-framework.json` alone) proves behavior, not just compilation (Plan 3 lesson).
- **Placeholder scan:** no TBD/TODO; every step has concrete files, edits, and commands. Where the exact line block depends on current source, the step says "read/survey first" and the Task 6 grep is the backstop.
