# Plan 6 — Re-baseline to v1.0.0 and Rewrite All Stale Prose Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reset the framework's version identity to **v1.0.0** and rewrite every piece of user-facing / module **prose** that still describes the removed subsystems (the `.claude/context` context-level system, internal `routes.yml`, `validate`/`bump-version`/`managing-versions`, and the pruned `writer`/`reporting`/iOS artifacts), and relax the CLAUDE.md "Trust Directive" — so the docs match the simplified, discovery-driven-but-natively-navigable framework that Plans 1–5 actually built.

**Architecture:** This is the third and final finishing plan (spec §6.1 "re-baseline + doc rewrite", §8 Trust Directive, §10 step 6, §11). It is **prose + version only** — no `.ts` logic, no schema, no manifest *functional* fields change (those were Plans 1–5). The functional surface is already clean (Plans 4/5 swept it); what remains is descriptive text that lies about the current system, plus the version strings. The one genuine design decision is the fate of the routes-centric `using-framework` skill (Task 5).

**Tech Stack:** Markdown prose, JSON version fields, one `package.json`. Verification: `npx tsc`/`jest` (only to prove prose/version edits didn't break a version-asserting test or a build that reads `package.json`), `agentic-framework build` smoke, and grep sweeps for dangling *descriptive* references.

**Scope note — what this plan does NOT touch:**
- **Surviving commands.** `backlog validate`, `confluence validate`, `template validate`, `backlog pull/push/diff/import`, `confluence publish`, scaffolding generators — these are real and stay. Prose about them is correct; do not "clean" it. Only the **framework-level** `validate`/`bump-version`/`routes` (removed) are stale.
- **Agent `Required Reading` / context-needs.** Already migrated to `knowing-the-codebase`/`knowing-the-domain` skills in Plans 1–3 (verified: the four project-facing agents reference the `knowing-*` skills, not `.claude/context`). Do not redo.
- **Functional config.** Manifest `cli-commands`/hooks, hook templates, doc-gen rules, console strings — all repointed in Plans 4/5. Task 7's sweep confirms none regressed; it does not re-edit them.
- **`docs/superpowers/**`** — these specs/plans are the project's own working history; leave them.
- **`.serena/memories/*`** — local dev notes, not framework deliverables (spec §6.1).

---

## Critical Conventions (read before starting)

- **Prose, not code.** Every edit in Tasks 2–6 is descriptive text or a version literal. If an edit touches a `.ts`/`.json` *functional* value, stop — that belongs to Plans 1–5 and is out of scope here.
- **Build pitfall (MEMORY.md):** never `npm run build` (its `prepare-publish` reverts source + bundles modules). Use `npx tsc` (emit, safe) and filtered `npx jest`. The only reason to run tsc/jest in this plan is to prove a version literal change didn't break a version-asserting test or a `package.json`-reading build path.
- **Re-baseline is a literal swap, but find every site.** Current versions: `framework/cli/package.json` = **1.18.0**; `framework/modules/{core,backlog,coding,confluence}/module.json` = **1.17.0**; `CLAUDE.md` header/footer = **v1.9.0**. Target: **1.0.0** everywhere. **A test may assert the current version** (e.g. a `--version` e2e or a snapshot) — Task 1 surveys for these first and updates them in lockstep. (The MCP integration test's `1.2.0`/`1.3.0` strings are *mocked literals* inside `jest.mock(...)`, unrelated to the real version — do not touch them.)
- **Disambiguate before editing (the recurring trap).** When a grep hit contains `validate` or `routes`, check whether it is the **framework** command (removed → fix) or a **module** command / unrelated word (`backlog validate`, `confluence validate`, `route` in prose, a code path) → leave. Every task lists its disambiguation filter.
- **All `cd` absolute** — shell cwd resets between commands. Repo root: `/Users/antonborodulin/Projects/cc-backlog-manager`.
- **Branch:** `feature/framework-simplification` (Plans 1–5 committed). Stay on it. Never commit to `main` (none exists). Branch stays local — do not push.
- **Authoritative file list:** the per-task greps below come from planning-time sweeps. Re-run each task's survey grep at execution time; trust the live grep over the enumeration and note any new file.

---

## File Structure

**Version re-baseline (Task 1):**
- `framework/cli/package.json` (1.18.0 → 1.0.0)
- `framework/modules/core/module.json`, `framework/modules/backlog/module.json`, `framework/modules/coding/module.json`, `framework/modules/confluence/module.json` (1.17.0 → 1.0.0)
- any CLI `VERSION` constant + any version-asserting test (Task 1 survey finds these)

**Entry-point prose (Tasks 2–3):** `CLAUDE.md`, `README.md`, `framework/cli/README.md`

**Docs (Task 4):** `docs/architecture.md`, `docs/cli-reference.md`, `docs/getting-started.md`, `docs/troubleshooting.md`, `docs/module-development.md`, `docs/patterns/intelligence-gathering-pattern.md`; triage-only: `docs/CLI-QA-ISSUES.md`, `docs/research-markdown-build-systems.md`, `docs/publishing.md`

**Module prose + the `using-framework` rethink (Task 5):**
- Decision target: `framework/modules/core/skills/using-framework/` (`SKILL.md`, `BEST-PRACTICES.md`, `EXAMPLES.md`, `ROUTES-REGISTRY-DESIGN.md`, `DISCOVERY-ENGINE-ARCHITECTURE.md`)
- Core agents: `framework/modules/core/agents/ai-framework-manager.md`, `ai-framework-developer.md`
- Core skills with routes/context prose: `building-framework/{SKILL,EXAMPLES,AGENT-CREATION-WORKFLOW,GOVERNANCE-UPDATE-WORKFLOW,GOVERNANCE-RULES}.md`, `building-agents/{AGENT-TEMPLATE,VALIDATION-CHECKLIST}.md`, `using-mcp/FRAMEWORK-MCP-PATTERNS.md`, `committing-code/EXAMPLES.md`, `verifying-quality/{CLI-TESTING,DEFENSIVE-CODING}.md`
- Templates: `framework/modules/core/templates/agent/agent.template.md`
- Test fixture: `framework/cli/src/lib/__tests__/__fixtures__/skills/sample-skill.md` (only if it asserts removed prose; likely leave)

**Changelog (Task 6):** `CHANGELOG.md`

**Verification only (Task 7):** none new.

---

## Task 1: Re-baseline the framework version to v1.0.0

**Files:** `framework/cli/package.json`; the four `module.json`; any version-asserting test/constant the survey finds.

- [ ] **Step 1: Survey every version site + any test that asserts the current version**

Run from repo root:
```
rg -n "\"version\"\s*:\s*\"1\.(18|17)\.0\"" framework/cli/package.json framework/modules/*/module.json
rg -n "1\.18\.0|1\.17\.0|1\.9\.0" --glob '!node_modules' --glob '!**/dist/**' --glob '!framework/cli/framework/**' --glob '!docs/superpowers/**' --glob '!CHANGELOG.md'
rg -n "\.version|getVersion|VERSION|--version|package.json" framework/cli/src --glob '*.ts' | grep -iv "node_modules"
```
Classify each hit: a **version declaration** (package.json/module.json), a **doc literal** (CLAUDE.md/README — handled in Tasks 2–3, but you may do them here for atomicity), or a **test assertion**. Note any test that reads `package.json.version` or asserts `1.18.0`.

- [ ] **Step 2: Set package.json to 1.0.0**

Edit `framework/cli/package.json`: `"version": "1.18.0"` → `"version": "1.0.0"`.

- [ ] **Step 3: Set all four module manifests to 1.0.0**

Edit `framework/modules/{core,backlog,coding,confluence}/module.json`: `"version": "1.17.0"` → `"version": "1.0.0"` (one edit each).

- [ ] **Step 4: Update any version-asserting test found in Step 1**

If Step 1 surfaced a test asserting `1.18.0`/`1.17.0` (e.g. a `--version` e2e or a module-version snapshot), update the expectation to `1.0.0`. If it surfaced none, record "no version-asserting tests" and move on. (Do NOT touch the MCP-test mocked `1.2.0`/`1.3.0` literals.)

- [ ] **Step 5: Validate JSON + prove the version surfaces correctly**

```
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli
node -e "console.log(require('./package.json').version)"   # expect 1.0.0
node -e "['core','backlog','coding','confluence'].forEach(m=>console.log(m, require('../modules/'+m+'/module.json').version))"  # all 1.0.0
npx tsc                                                     # emit, refresh dist
node dist/index.js --version                               # expect 1.0.0
```

- [ ] **Step 6: Run version-touching suites**

`npx jest --config jest.e2e.config.cjs cli-commands version 2>&1 | tail -8` and any suite the Step 1 survey flagged. PASS (or update the flagged assertion and re-run).

- [ ] **Step 7: Commit**

From repo root: `git add framework/cli/package.json framework/modules/*/module.json` (+ any updated test) and `git commit -m "chore: re-baseline framework version to v1.0.0"`.

---

## Task 2: Rewrite `CLAUDE.md` — relax the Trust Directive and purge stale-system prose

> `CLAUDE.md` is the framework's primary entry point and is loaded into every session. It currently advertises the removed context-level system, `routes.yml`, the `validate`/`bump-version` commands, and an aggressive "Trust Directive" built for 6 sprawling modules. Bring it in line with the 4-module, knowledge-skill, natively-navigable reality.

**Files:** `CLAUDE.md`.

- [ ] **Step 1: Survey**

`rg -n "routes\.yml|routes sync|Trust Directive|DO NOT run exploratory|context-category-needs|Context Level|\.claude/context|bump-version|agentic-framework validate|writer|reporting|v1\.9\.0|Discovery Engine" CLAUDE.md`.

- [ ] **Step 2: Relax the Trust Directive (spec §8)**

Rewrite the "Trust Directive" section: remove the "DO NOT run exploratory searches / don't use Glob-Grep / use routes.yml for navigation" mandate. Replace with a short paragraph: the framework is small (4 modules) and natively navigable; use normal code navigation, invoke `knowing-*` skills for project knowledge, and consult `references.yml` for external pointers. Remove the `routes.yml`/registry-navigation "Correct workflow" bullets that reference removed machinery.

- [ ] **Step 3: Fix the CLI command table + remove removed commands**

In the CLI commands table, remove the `validate`, `bump-version`, and `routes sync` rows. Keep `init/add/remove/list/info/update/status/sync`, `build`, the `backlog *` and `agent *` rows. Replace any "run `agentic-framework validate`" guidance with `agentic-framework build`.

- [ ] **Step 4: Replace the Context-Level / Discovery prose with the knowledge-skill model**

Remove the "Context Level System" table and the "Context Loading / context-category-needs" instructions (the system is gone). Replace with a short "Project Knowledge" section pointing at the three `knowing-*` skills (`knowing-the-codebase`, `knowing-the-domain`, `knowing-backlog`) and `references.yml`. Keep the three-tier *skill* loading model only if still accurate (essential/role-based/available) — verify against current agent frontmatter; trim claims about context categories.

- [ ] **Step 5: Update version + module identity**

Header `Framework Version: **v1.9.0**` → `**v1.0.0**`; footer version line → `1.0.0`. Confirm the module list reads `core, backlog, coding, confluence` (no `writer`/`reporting`); fix the "Quick Navigation" tree and any `--modules core,coding,backlog` examples to reflect the 4 real modules. Remove `routes.yml` from the "Key Files" table.

- [ ] **Step 6: Verify**

`rg -n "routes\.yml|routes sync|context-category-needs|Context Level|\.claude/context|bump-version|agentic-framework validate|v1\.9\.0|writer|reporting" CLAUDE.md` → only acceptable residue is the word "reporting" in unrelated prose (triage) and `validate` inside `backlog/confluence validate` references. Read the file top-to-bottom once for coherence.

- [ ] **Step 7: Commit**

`git add CLAUDE.md && git commit -m "docs: relax Trust Directive and align CLAUDE.md with simplified framework"`.

---

## Task 3: Rewrite `README.md` and `framework/cli/README.md`

**Files:** `README.md`, `framework/cli/README.md`.

- [ ] **Step 1: Survey**

`rg -n "routes|bump-version|validate|context|writer|reporting|v1\.[0-9]|Version" README.md framework/cli/README.md`.

- [ ] **Step 2: `framework/cli/README.md` — remove removed-command docs**

Delete the `validate` command section (the `agentic-framework validate [options]`, `--strict`, `--versions`, `--links` block) and the `bump-version` section (`agentic-framework bump-version ...`). If a `routes` section exists, delete it. Add/keep a `build` section (the unified validation entry point) if commands are documented. Repoint any "validate your project" guidance to `build`. Update any version string to 1.0.0.

- [ ] **Step 3: `README.md` — module list, commands, identity**

Ensure the module list / feature overview reflects `core, backlog, coding, confluence` only (no writer/reporting/iOS). Remove `routes.yml`, context-level-system, and `validate`/`bump-version` mentions; describe knowledge skills + `references.yml` if the README enumerates capabilities. Update version/badges to 1.0.0.

- [ ] **Step 4: Verify + commit**

`rg -n "bump-version|agentic-framework validate|routes\.yml|context-category" README.md framework/cli/README.md` → none (modulo surviving `backlog/confluence validate`). `git add README.md framework/cli/README.md && git commit -m "docs: rewrite READMEs for v1.0.0 simplified framework"`.

---

## Task 4: Rewrite `docs/*`

> Triage each doc: **align** (rewrite to current reality) for the canonical guides; **leave or annotate** for historical/research artifacts.

**Files (align):** `docs/architecture.md`, `docs/cli-reference.md`, `docs/getting-started.md`, `docs/troubleshooting.md`, `docs/module-development.md`, `docs/patterns/intelligence-gathering-pattern.md`.
**Files (triage — may leave as historical):** `docs/CLI-QA-ISSUES.md`, `docs/research-markdown-build-systems.md`, `docs/publishing.md`.

- [ ] **Step 1: Survey each**

`rg -n "routes\.yml|routes sync|agentic-framework validate|bump-version|context-category-needs|Context Level|\.claude/context|writer|reporting" docs/`.

- [ ] **Step 2: `docs/cli-reference.md`**

Remove `validate`, `bump-version`, `routes` / `routes sync` command entries. Keep/repoint to `build`. Ensure the command list matches `index.ts`'s registered commands (init/add/remove/list/info/update/status/sync/build/dev + backlog/confluence/agent/skill/template/planning). Update any version.

- [ ] **Step 3: `docs/architecture.md`**

Remove the routes.yml navigation subsystem description and the context-level-system / `context.json` architecture sections. Describe the current model: discovery via `skills.json`/`agents.json`, knowledge skills for project context, `references.yml` for external pointers, `build` (BuildEngine) for validation. Remove `validate`/`bump-version` from any pipeline/workflow diagrams.

- [ ] **Step 4: `docs/getting-started.md`, `docs/troubleshooting.md`, `docs/module-development.md`, `docs/patterns/intelligence-gathering-pattern.md`**

Replace `routes sync`/`routes.yml` setup/troubleshooting steps and `validate`/`bump-version` guidance with `build`. Remove context-file customization instructions (`.claude/context/*.md`) in getting-started; replace with "fill in the `knowing-*` skills + `references.yml`". In module-development, drop `context.json`/`context-category-needs` authoring guidance.

- [ ] **Step 5: Triage the historical docs**

For `docs/CLI-QA-ISSUES.md`, `docs/research-markdown-build-systems.md`, `docs/publishing.md`: if a doc is a dated research/QA artifact, leave it (optionally add a one-line "historical — predates v1.0.0 simplification" note at top). If `docs/publishing.md` documents the *current* publish flow and mentions removed commands, align it. Decide per file; record the decision.

- [ ] **Step 6: Verify + commit**

`rg -n "routes\.yml|routes sync|agentic-framework validate|bump-version|context-category-needs" docs/ | grep -v "CLI-QA-ISSUES\|research-markdown"` → none in the aligned guides. `git add docs && git commit -m "docs: align docs/ with simplified framework (remove routes/context/validate/bump prose)"`.

---

## Task 5: Module prose + the `using-framework` skill rethink

> **The one design decision in this plan.** The `using-framework` skill exists to teach "framework organization with separated concerns (routes for navigation, registry for metadata)" — its `description`, `ROUTES-REGISTRY-DESIGN.md`, and much of `SKILL.md` are about the now-removed `routes.yml`. It still provides the `framework-architecture-knowledge` capability consumed by `ai-framework-manager`/`ai-framework-developer`, so the capability must survive in some form.

**Decision (default — implement unless the review/user says otherwise): REWORK, don't delete.** Keep the skill + its `framework-architecture-knowledge` capability; **rewrite** it to describe the *current* architecture (modules, discovery via registries, knowledge skills, `references.yml`, `build`); **`git rm` `ROUTES-REGISTRY-DESIGN.md`** (it documents a removed subsystem); reconcile `DISCOVERY-ENGINE-ARCHITECTURE.md` (keep the parts about skill/agent discovery that still run; cut context-emitting/routes parts). *Alternative considered:* delete the skill entirely + drop the capability + its `agents.json`/manifest references — heavier, removes a still-referenced capability; rejected unless review prefers it. **Flag this for user sign-off in the handoff.**

**Files:** the `using-framework/` skill dir; core agents; core skills with routes/context prose; `agent.template.md`.

- [ ] **Step 1: Survey**

```
rg -n "routes\.yml|routes sync|routes/registry|ROUTES-REGISTRY|context-category-needs|Context Level|\.claude/context" framework/modules/core/skills framework/modules/core/agents framework/modules/core/templates
rg -n "routes\.yml|routes sync|agentic-framework validate|bump-version" framework/modules/{backlog,coding,confluence}/agents framework/modules/*/skills
```

- [ ] **Step 2: Rework `using-framework`**

`git rm framework/modules/core/skills/using-framework/ROUTES-REGISTRY-DESIGN.md`. Rewrite `SKILL.md` (incl. its frontmatter `description`, which currently names "routes for navigation"), `BEST-PRACTICES.md`, `EXAMPLES.md`, and the routes/context portions of `DISCOVERY-ENGINE-ARCHITECTURE.md` to the current model. Keep `capabilities-provided: framework-architecture-knowledge`. Verify the skill is still listed in `core/module.json` `provides.skills` (it is — untouched by Plan 5) and that `skill-triggers.json` (if it references the deleted `ROUTES-REGISTRY-DESIGN.md` file) is updated.

- [ ] **Step 3: Core agents — `ai-framework-manager.md`, `ai-framework-developer.md`**

Remove `routes sync`/`routes.yml` task steps (e.g. "run `agentic-framework routes sync`", "update routes.yml after structural changes") and any `validate`/`bump-version` orchestration references; repoint to `build`. Remove residual context-system orchestration (e.g. "Update Context Files" tasks tied to `context.json`) if present.

- [ ] **Step 4: Core skills + template prose**

In `building-framework/*`, `building-agents/{AGENT-TEMPLATE,VALIDATION-CHECKLIST}.md`, `using-mcp/FRAMEWORK-MCP-PATTERNS.md`, `committing-code/EXAMPLES.md`, `verifying-quality/{CLI-TESTING,DEFENSIVE-CODING}.md`, and `templates/agent/agent.template.md`: replace `routes.yml`/`routes sync` references with native navigation guidance, `validate`/`bump-version` examples with `build`, and remove `context-category-needs`/`Context Level` authoring instructions. **Disambiguate:** keep references to `backlog/confluence validate`, the `validating-links` skill, and `build`'s link validation.

- [ ] **Step 5: Other module agents/skills**

`framework/modules/{backlog,coding,confluence}/agents/*.md` and their skills: from the Step 1 survey, fix any `routes sync`/`routes.yml`/framework-`validate`/`bump-version` prose. (Most of their `validate` hits are the surviving `backlog/confluence validate` — leave those.)

- [ ] **Step 6: Verify + commit**

```
rg -n "routes\.yml|routes sync|ROUTES-REGISTRY|context-category-needs|Context Level System" framework/modules --glob '*.md'
```
→ no hits (modulo intentional historical mentions). Then run the registry/skill tests that load skill metadata: `cd framework/cli && npx jest skill module-loader registry build-engine 2>&1 | tail -8` (the deleted `ROUTES-REGISTRY-DESIGN.md` must not break skill loading — skills load by dir + SKILL.md, not by enumerating every `.md`). PASS. `git add -A && git commit -m "docs: rework using-framework skill and purge routes/context prose from module docs"`.

---

## Task 6: Rewrite `CHANGELOG.md` with a v1.0.0 re-baseline entry

**Files:** `CHANGELOG.md`.

- [ ] **Step 1: Survey the top of the changelog + removed-feature mentions**

`rg -n "Unreleased|## \[|routes|context|validate|bump-version|writer|reporting" CHANGELOG.md | head -40`.

- [ ] **Step 2: Add the v1.0.0 entry**

Prepend a `## [1.0.0] - 2026-06-01` section summarizing the simplification as a single re-baseline: **Removed** — context-level system (`.claude/context`, `context.json`, `context-category-needs`, context loaders), internal `routes.yml` + `routes sync`, `validate` + `bump-version` commands and MCP tools, `version-validator`, `managing-versions` skill + `version-management` capability, `writer`/`reporting` modules, iOS coding artifacts. **Added** — `knowing-the-codebase`/`knowing-the-domain`/`knowing-backlog` knowledge skills, `references.yml` external-reference library. **Changed** — `build` (BuildEngine) is the unified validation entry point; hooks point at `build`; Trust Directive relaxed. Keep prior historical entries below it (do not delete history); the v1.0.0 entry marks the identity reset.

- [ ] **Step 3: Verify + commit**

Read the new entry for accuracy against Plans 1–5. `git add CHANGELOG.md && git commit -m "docs: add v1.0.0 changelog entry for framework re-baseline"`.

---

## Task 7: Final sweep, build smoke, and full gate

**Files:** none new; verification only.

- [ ] **Step 1: Descriptive-reference sweep (whole repo, excluding own history)**

```
rg -n "routes\.yml|routes sync|agentic-framework routes|context-category-needs|ContextLevel|Context Level System|agentic-framework validate|agentic-framework bump|bump-version" \
  . --glob '!node_modules' --glob '!**/dist/**' --glob '!framework/cli/framework/**' --glob '!docs/superpowers/**' \
  | grep -v "backlog validate\|confluence validate\|template validate\|backlog/validate\|confluence/validate"
```
Triage every remaining hit: an aligned doc/skill → fix now; an intentionally-historical artifact (`CHANGELOG.md` describing the removal, `docs/CLI-QA-ISSUES.md`, research docs) → acceptable, leave. The goal is **zero stale prose that misdescribes the current system as present.**

- [ ] **Step 2: Version sweep**

`rg -n "1\.18\.0|1\.17\.0|v?1\.9\.0" . --glob '!node_modules' --glob '!**/dist/**' --glob '!framework/cli/framework/**' --glob '!docs/superpowers/**' --glob '!CHANGELOG.md'` → no hits (all re-baselined; CHANGELOG history may legitimately mention old versions).

- [ ] **Step 3: Build + full 3-suite gate (emit first)**

```
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli
npx tsc
npx eslint . --quiet 2>&1 | tail -5
npx jest 2>&1 | grep -e "Tests:" -e "Test Suites:" -e "FAIL"
npx jest --config jest.integration.config.cjs 2>&1 | grep -e "Tests:" -e "Test Suites:" -e "FAIL"
npx jest --config jest.e2e.config.cjs 2>&1 | grep -e "Tests:" -e "Test Suites:" -e "FAIL"
```
All green (prose/version edits must not break any suite). Confirm source survived the emit: `cd /Users/antonborodulin/Projects/cc-backlog-manager && git status --short` shows only intended changes.

- [ ] **Step 4: Assembled smoke — init reflects v1.0.0 and clean prose**

```
DIST=/Users/antonborodulin/Projects/cc-backlog-manager/framework/cli/dist/index.js
SMOKE=$(mktemp -d /tmp/p6-smoke-XXXX) && cd "$SMOKE"
node "$DIST" --version    # 1.0.0
node "$DIST" init smoke --no-interactive --modules core,coding,backlog,confluence --no-git >/dev/null 2>&1; echo "init exit=$?"
PROJ="$SMOKE"; [ -d "$SMOKE/smoke/.claude" ] && PROJ="$SMOKE/smoke"
rg -n "routes\.yml|agentic-framework validate|bump-version|context-category-needs" "$PROJ/CLAUDE.md" "$PROJ/.claude" 2>/dev/null | grep -v "backlog validate\|confluence validate" || echo "✓ deployed project prose clean"
rm -rf /tmp/p6-smoke-*
```
Expected: `--version` = 1.0.0, init exit 0, no stale prose in the deployed entry-point docs. (The pre-existing broken-skill-link `build` failure from Plan 5 is unrelated to prose and out of scope; note it persists.)

- [ ] **Step 5: Commit any sweep fixes**

If Steps 1–2 surfaced a missed stale reference, fix and `git commit -m "docs: purge residual stale references for v1.0.0"`.

- [ ] **Step 6: Complete development**

Use **superpowers:finishing-a-development-branch**. Surface for sign-off: (a) the **`using-framework` rework-vs-delete** decision (Task 5); (b) all of Plans 1–6 are committed locally on `feature/framework-simplification`, nothing pushed, no `main` branch — the user decides push/PR; (c) the **pre-existing broken-skill-link `build` failure** (Plan 5 finding) remains and will block the new pre-push hook until those template links are fixed — a candidate for a follow-up plan.

---

## Self-Review (writing-plans checklist)

- **Spec coverage:** §6.1 "Plan 4 (re-baseline + doc rewrite)" → Tasks 1–6; §8 Trust Directive relaxation → Task 2 Step 2; §10 step 6 (re-baseline v1.0.0, update CLAUDE.md/README) → Tasks 1–3; §11 "repo identity reset to v1.0.0 with updated entry-point docs" → Tasks 1–4, 7. Agent `Required Reading` rewrite (§6.1 Plan-3 item) confirmed **already done** in Plans 1–3 → explicitly out of scope.
- **Disambiguation correctness:** every task that greps `validate`/`routes` states the surviving-vs-removed filter (`backlog/confluence/template validate` survive; framework `validate`/`bump-version`/`routes` removed). The recurring Plan 4/5 trap (surviving look-alikes) is guarded.
- **Version consistency:** current versions enumerated (cli 1.18.0, modules 1.17.0, CLAUDE.md v1.9.0) → all 1.0.0; Task 1 surveys for version-asserting tests before swapping; mocked MCP `1.2.0`/`1.3.0` explicitly excluded.
- **Design decision flagged:** `using-framework` rework (default) vs delete (alternative) is called out in Task 5 and routed to user sign-off in Task 7 Step 6.
- **No functional edits:** the plan is prose + version literals only; a guard note tells the executor to stop if an edit would change a functional value (that was Plans 1–5).
- **Placeholder scan:** no TBD/TODO; each task has concrete files, survey greps, transformation instructions, and verification. Prose edits are inherently descriptive, so steps specify *what references to remove/repoint and what the new reality is*, with grep sweeps + build + full gate as the backstop.
