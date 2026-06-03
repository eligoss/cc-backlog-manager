# Plan 7 — Make `build` Pass (Fix Broken Skill Links) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get `agentic-framework build` to **0 errors** both on a fresh `init`'d project and on the framework repo itself, by fixing the small set of broken markdown links that survived the Plans 1–6 simplification — so the deployed pre-push hook (which runs `build`) no longer blocks.

**Architecture:** Two independent error sources, diagnosed empirically (Plan 6 finish investigation):
1. **Fresh-init build → 8 errors, all in 2 tracked source files.** `framework/modules/coding/skills/coding/designing-architecture/SKILL.md` (3 links) and `.../implementing-code/SKILL.md` (5 links) have "Related Skills / See Also" links that cross **modules** (to `../../../../core/skills/<x>/SKILL.md`), link to `../../../module.json`, and link to `../../../agents/<agent>.md`. These resolve in the nested **source** layout but break once skills deploy to the **flat** `.claude/skills/<skill>/` layout, because the link-transformer (`framework/cli/src/lib/link-transformer.ts`) does not remap cross-module/up-tree links. (Sibling-skill links like `../implementing-code/SKILL.md` resolve in **both** layouts and are NOT in error — leave them.)
2. **Repo's own build → 2 errors + 288 `backticked_path` warnings, from a stale local `.claude/`.** The repo's gitignored, generated `.claude/` deployment physically still contains **old-framework** content from before the simplification — `.claude/skills/building-reports/` (removed `reporting` module), `.claude/skills/organizing-books/` (removed `writer` module), `.claude/context/process-*.md` (removed context system). `build -p <repo>` scans these stale files. The fix is to **regenerate** the local deployment from current source, not to edit tracked files.

**Tech Stack:** Markdown links + one CLI regeneration command. Verification: `agentic-framework build` (fresh init + repo), the standard 3-suite jest gate (to prove nothing regressed).

**Fix approach (Task 1):** **Re-author the broken links as plain text**, not fix the transformer. Rationale: the links must be valid in BOTH the source build and the deployed build, but a *relative* link cannot resolve in both the nested source tree and the flat deployed tree simultaneously — only the transformer could bridge that, and a transformer change is a systemic, higher-risk fix for exactly 2 files / 8 links. Plain-text references (drop the `[..](..)` syntax, keep the skill/agent names) are valid in both layouts and carry the same information. (The deeper "teach the link-transformer to remap cross-module links" fix is noted as a future alternative but is **out of scope** here.)

**Explicitly out of scope:**
- The **288 `backticked_path` warnings** — they are warnings, not errors; `build` passes with warnings. Converting backticked paths to links is a separate cosmetic sweep.
- The `validating-links` / `validating-markdown` skill **example** paths using deprecated `ai/context/*.md` — illustrative examples, not assertions; left per Plan 6's documented decision.
- Any **link-transformer code change** (the systemic alternative).

---

## Critical Conventions (read before starting)

- **Validate against the real thing.** "0 errors" is proven by running `agentic-framework build`, not by grep. Always run it against (a) a fresh `init`'d temp project and (b) the repo root.
- **Build pitfall (MEMORY.md):** never `npm run build`. The CLI is already built; if you change `.ts` you'd `npx tsc` (this plan changes no `.ts`). Run the dist binary: `node framework/cli/dist/index.js build -p <path>`.
- **`build` exit semantics:** errors fail the build (exit 1); warnings do not. The target is **0 errors** (warnings may remain).
- **Two layouts, one source.** A relative link in a source `SKILL.md` is validated in the source tree (by repo build) AND, after deployment, in the flat `.claude/skills/` tree (by init build). Keep links that resolve in both (sibling-skill links); convert links that can't (cross-module, module.json, agent) to plain text.
- **The local `.claude/` is generated + gitignored.** Its subdirs (`.claude/skills/`, `.claude/context/`, …) are already in `.gitignore` (lines 153–160). Do not `git add` it. Regenerating it changes no tracked files.
- **All `cd` absolute.** Repo root: `/Users/antonborodulin/Projects/cc-backlog-manager`.
- **Branch:** `feature/framework-simplification` (Plans 1–6 committed). Stay on it. Never commit to `main` (none exists). Branch stays local unless the user says otherwise.

---

## File Structure

**Modify (Task 1 — tracked source, the only files causing the 8 fresh-init errors):**
- `framework/modules/coding/skills/coding/designing-architecture/SKILL.md`
- `framework/modules/coding/skills/coding/implementing-code/SKILL.md`

**Regenerate, do not edit (Task 2 — untracked generated deployment):**
- `.claude/` (the repo's local deployment) — regenerated from current source.

**Verification only (Task 3):** none.

---

## Task 1: Re-author the cross-module "See Also" links in the two coding skills

> These 8 links are the entire fresh-init error set. After this task, a fresh `init` build is 0 errors.

**Files:** `framework/modules/coding/skills/coding/designing-architecture/SKILL.md`, `framework/modules/coding/skills/coding/implementing-code/SKILL.md`.

- [ ] **Step 1: Survey the exact links in both files**

```
cd /Users/antonborodulin/Projects/cc-backlog-manager
rg -n "\]\(" framework/modules/coding/skills/coding/designing-architecture/SKILL.md framework/modules/coding/skills/coding/implementing-code/SKILL.md | rg "core/skills|module\.json|agents/|\.\./"
```
Expect (designing-architecture, ~lines 458–463): a sibling link `[implementing-code](../implementing-code/SKILL.md)` (KEEP), `[verifying-quality](../../../../core/skills/verifying-quality/SKILL.md)` (FIX), `[module.json](../../../module.json)` (FIX), `[ai-architect.md](../../../agents/ai-architect.md)` (FIX). And (implementing-code, ~lines 470–477): `[designing-architecture](../designing-architecture/SKILL.md)` (KEEP, sibling), `[committing-code](../../../../core/skills/committing-code/SKILL.md)` (FIX), `[verifying-quality](../../../../core/skills/verifying-quality/SKILL.md)` (FIX), `[validating-markdown](../../../../core/skills/validating-markdown/SKILL.md)` (FIX), `[module.json](../../../module.json)` (FIX), `[ai-app-developer.md](../../../agents/ai-app-developer.md)` (FIX).

- [ ] **Step 2: Convert the FIX links to plain text (keep the sibling-skill links)**

For each link whose target is a **different module's skill** (`../../../../core/skills/<x>/SKILL.md`), the **module manifest** (`../../../module.json`), or an **agent** (`../../../agents/<a>.md`), drop the `[text](path)` markdown-link syntax and keep just the descriptive text. Keep the skill name as plain text (NOT backticked-with-`.md`, to avoid a `backticked_path` warning).

Example — `designing-architecture/SKILL.md` "Related Skills / See Also":

```markdown
### Related Skills
- [implementing-code](../implementing-code/SKILL.md) - Code implementation and review standards
- verifying-quality - Quality validation standards

### Module Documentation
- **Coding Module Manifest:** module.json
- **Architecture Agent:** ai-architect
```

Example — `implementing-code/SKILL.md`:

```markdown
### Related Skills
- [designing-architecture](../designing-architecture/SKILL.md) - Architecture design and decision-making
- committing-code - Git workflow and commit standards
- verifying-quality - Quality validation checklist
- validating-markdown - Documentation standards

### Module Documentation
- **Coding Module Manifest:** module.json
- **Developer Agent:** ai-app-developer
```

> Do NOT touch the sibling-skill links (`../implementing-code/SKILL.md`, `../designing-architecture/SKILL.md`) — they resolve in source AND deployed. Do NOT introduce `../verifying-quality/SKILL.md`-style flat links: they'd fix deployed but break the source build.

- [ ] **Step 3: Confirm source build no longer flags these two files**

```
node framework/cli/dist/index.js build -p /Users/antonborodulin/Projects/cc-backlog-manager --verbose 2>&1 | rg -A2 "designing-architecture/SKILL.md|implementing-code/SKILL.md" | rg -i "broken link" && echo "STILL BROKEN" || echo "✓ no broken links in the two coding skills"
```
(The repo build will still report the Task-2 stale-`.claude/` errors — that's expected; this step only checks the two coding skills are clean.)

- [ ] **Step 4: Prove a fresh init build is 0 errors**

```
DIST=/Users/antonborodulin/Projects/cc-backlog-manager/framework/cli/dist/index.js
SMOKE=$(mktemp -d /tmp/p7-smoke-XXXX) && cd "$SMOKE"
node "$DIST" init smoke --no-interactive --modules core,coding,backlog,confluence --no-git >/dev/null 2>&1
PROJ="$SMOKE"; [ -d "$SMOKE/smoke/.claude" ] && PROJ="$SMOKE/smoke"
node "$DIST" build -p "$PROJ" 2>&1 | tail -3
rm -rf /tmp/p7-smoke-*
```
Expected: `✓ Build passed` (or `0 error(s), N warning(s)`). If errors remain, run with `--verbose` and fix the named file/link the same way.

- [ ] **Step 5: Commit**

`git add framework/modules/coding && git commit -m "fix(coding): make cross-module skill See-Also links deploy-safe (plain text)"`.

---

## Task 2: Regenerate the stale local `.claude/` deployment

> The repo's gitignored `.claude/` still contains pre-simplification content (`building-reports`, `organizing-books`, `context/process-*`) that makes `build -p <repo>` report 2 errors. Regenerate it from current source. This changes **no tracked files**.

**Files:** `.claude/` (generated, untracked).

- [ ] **Step 1: Confirm the stale content is the error source**

```
cd /Users/antonborodulin/Projects/cc-backlog-manager
ls .claude/skills | rg "building-reports|organizing-books" && echo "STALE PRESENT"
ls .claude/context 2>/dev/null && echo "STALE context dir present"
```

- [ ] **Step 2: Remove the stale generated trees, then regenerate from current source**

Remove the stale generated deployment subdirs (they are gitignored — safe to delete; `settings.local.json` is user-owned, leave it):
```
rm -rf .claude/skills .claude/commands .claude/agents .claude/context
```
Regenerate the deployment from current source. Use the framework's own dev/sync path:
```
node framework/cli/dist/index.js dev --sync 2>&1 | tail -8
```
> If `dev --sync` is not the right entry point in this repo, use `node framework/cli/dist/index.js sync -p .` (the command that deploys `framework/modules` → `.claude/`). Confirm whichever is used regenerates `.claude/skills`, `.claude/commands`, `.claude/agents` from the **4 current modules** with **no** `building-reports`/`organizing-books`/`context/`.

- [ ] **Step 3: Verify the regenerated deployment has no removed-module content**

```
ls .claude/skills | rg "building-reports|organizing-books|knowing-" ; echo "---"
test -d .claude/context && echo "✗ context dir regenerated (unexpected)" || echo "✓ no context dir"
```
Expect: no `building-reports`/`organizing-books`; the `knowing-*` skills present; no `.claude/context`.

- [ ] **Step 4: Confirm the repo build is now 0 errors**

```
node framework/cli/dist/index.js build -p /Users/antonborodulin/Projects/cc-backlog-manager 2>&1 | tail -3
```
Expected: `0 error(s), N warning(s)` (the ~288 `backticked_path` warnings remain — out of scope). If a NEW error appears from a different stale file, regenerate that subtree too.

- [ ] **Step 5: Confirm nothing tracked changed**

`git status --short` → should be empty (`.claude/` is gitignored; Task 1 already committed). No commit in this task.

---

## Task 3: Full gate, double-check, and finish

**Files:** none.

- [ ] **Step 1: Both builds are 0 errors**

```
DIST=/Users/antonborodulin/Projects/cc-backlog-manager/framework/cli/dist/index.js
node "$DIST" build -p /Users/antonborodulin/Projects/cc-backlog-manager 2>&1 | tail -2   # repo: 0 errors
SMOKE=$(mktemp -d /tmp/p7-smoke-XXXX) && cd "$SMOKE" && node "$DIST" init smoke --no-interactive --modules core,coding,backlog,confluence --no-git >/dev/null 2>&1
PROJ="$SMOKE"; [ -d "$SMOKE/smoke/.claude" ] && PROJ="$SMOKE/smoke"
node "$DIST" build -p "$PROJ" 2>&1 | tail -2   # fresh init: 0 errors
rm -rf /tmp/p7-smoke-*
```

- [ ] **Step 2: Standard 3-suite gate (no `.ts` changed, but prove nothing regressed)**

```
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli
npx jest 2>&1 | grep -e "Tests:" -e "FAIL"
npx jest --config jest.integration.config.cjs 2>&1 | grep -e "Tests:" -e "FAIL"
npx jest --config jest.e2e.config.cjs 2>&1 | grep -e "Tests:" -e "FAIL"
```
All green. (No source changed, so no emit needed; the link-validator unit/integration tests should be unaffected.)

- [ ] **Step 3: Complete development**

Use **superpowers:finishing-a-development-branch**. Note for the handoff: with `build` now green on a fresh init, the deployed pre-push hook (`build`, full) no longer blocks; the `backticked_path` warnings and the deprecated-`ai/context` skill-example links remain as an optional cosmetic follow-up. Plans 1–7 are committed locally on `feature/framework-simplification`; the user decides push/PR.

---

## Self-Review (writing-plans checklist)

- **Coverage:** the two empirically-observed error sets — 8 fresh-init errors (Task 1: 2 coding skills) and 2 repo errors (Task 2: stale `.claude/`) — each map to a task; Task 3 proves both build green + no test regression.
- **Approach correctness:** plain-text re-authoring (not flat-relative links, not a transformer change) is the only fix valid in BOTH source and deployed layouts without systemic risk; rationale stated. Sibling-skill links explicitly preserved (they already resolve in both). The transformer fix is named as the out-of-scope alternative.
- **No false "done":** success is `agentic-framework build` reporting 0 errors on both targets, run live — not a grep. Warnings are explicitly accepted (build passes with warnings).
- **Scope discipline:** 288 `backticked_path` warnings and the `ai/context` skill-example links are explicitly out of scope (warnings don't fail build; examples are Plan-6-documented leaves). No `.ts` edits.
- **Type/name consistency:** exact file paths (`coding/skills/coding/…`), exact link targets, and the regeneration command are specified; "survey first" steps + live `build` runs are the backstop if a path differs.
