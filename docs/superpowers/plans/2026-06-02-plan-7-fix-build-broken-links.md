# Plan 7 — Make `build` Pass (Fix Broken Skill Links) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get `agentic-framework build` to **0 errors** on a fresh `init`'d project and on a fresh checkout of the branch (what CI / a fresh clone sees), by fixing the small set of broken markdown links that survived the Plans 1–6 simplification — so the deployed pre-push hook (which runs `build`) no longer blocks.

**Architecture:** The fresh-init build fails with **8 errors, all in 2 tracked source files.** `framework/modules/coding/skills/coding/designing-architecture/SKILL.md` (3 links) and `.../implementing-code/SKILL.md` (5 links) have "Related Skills / See Also" links that cross **modules** (to `../../../../core/skills/<x>/SKILL.md`), link to `../../../module.json`, and link to `../../../agents/<agent>.md`. These resolve in the nested **source** layout but break once skills deploy to the **flat** `.claude/skills/<skill>/` layout, because the link-transformer (`framework/cli/src/lib/link-transformer.ts`) does not remap cross-module/up-tree links. (Sibling-skill links like `../implementing-code/SKILL.md` resolve in **both** layouts and are NOT in error — leave them.) Fixing these 8 links is the entire deliverable.

**Tech Stack:** Markdown links only. Verification: `agentic-framework build` (fresh init + fresh checkout) plus the standard 3-suite jest gate (to prove nothing regressed).

**Fix approach:** **Re-author the broken links as plain text**, not fix the transformer. Rationale: the links must be valid in BOTH the source build and the deployed build, but a *relative* link cannot resolve in both the nested source tree and the flat deployed tree simultaneously — only the transformer could bridge that, and a transformer change is a systemic, higher-risk fix for exactly 2 files / 8 links. Plain-text references (drop the `[..](..)` syntax, keep the skill/agent names) are valid in both layouts and carry the same information. (Teaching the link-transformer to remap cross-module links is the deeper alternative — **out of scope**.)

**Explicitly out of scope:**
- **The repo's stale local `.claude/`.** A separate observation: the repo's gitignored, generated `.claude/` (lines 153–160 of `.gitignore`; `git ls-files .claude` = 0) still physically holds pre-simplification content on this machine — `.claude/skills/building-reports/` (removed `reporting`), `.claude/skills/organizing-books/` (removed `writer`), `.claude/context/process-*.md` (removed context system). This makes `build -p <this repo>` report 2 extra errors, but it is **local-only**: it is absent from the branch, from a fresh clone, and from CI, and (no git hooks are installed here) it gates nothing. It is **not** part of this branch's deliverable. To clean it locally when convenient, regenerate from current source (e.g. `node framework/cli/dist/index.js dev --sync`, after confirming that is the deploy entry point) — but do NOT make it a plan task: it produces zero tracked diff and `rm -rf .claude/...` would delete the running session's own tooling.
- **The 288 `backticked_path` warnings** — warnings, not errors; `build` passes with warnings.
- **The `validating-links` / `validating-markdown` skill example paths** using deprecated `ai/context/*.md` — illustrative examples, left per Plan 6's documented decision.
- Any **link-transformer code change**.

---

## Critical Conventions (read before starting)

- **Validate against the real thing.** "0 errors" is proven by running `agentic-framework build`, not by grep. Run it against (a) a fresh `init`'d temp project and (b) a fresh checkout (`git archive` export) — NOT against the working repo, whose stale local `.claude/` adds out-of-scope errors.
- **Build pitfall (MEMORY.md):** never `npm run build`. This plan changes no `.ts`; run the existing dist binary: `node framework/cli/dist/index.js build -p <path>`.
- **`build` exit semantics:** errors fail the build (exit 1); warnings do not. The target is **0 errors** (warnings may remain).
- **Two layouts, one source.** A relative link in a source `SKILL.md` is validated in the source tree AND, after deployment, in the flat `.claude/skills/` tree. Keep links that resolve in both (sibling-skill links); convert links that can't (cross-module, module.json, agent) to plain text.
- **All `cd` absolute.** Repo root: `/Users/antonborodulin/Projects/cc-backlog-manager`.
- **Branch:** `feature/framework-simplification` (Plans 1–6 committed). Stay on it. Never commit to `main` (none exists). Branch stays local unless the user says otherwise.

---

## File Structure

**Modify (the only files causing the 8 fresh-init errors):**
- `framework/modules/coding/skills/coding/designing-architecture/SKILL.md`
- `framework/modules/coding/skills/coding/implementing-code/SKILL.md`

**Verification only:** none.

---

## Task 1: Re-author the cross-module "See Also" links in the two coding skills

> These 8 links are the entire fresh-init error set. After this task, a fresh `init` build is 0 errors.

**Files:** `framework/modules/coding/skills/coding/designing-architecture/SKILL.md`, `framework/modules/coding/skills/coding/implementing-code/SKILL.md`.

- [ ] **Step 1: Survey the exact links in both files**

```
cd /Users/antonborodulin/Projects/cc-backlog-manager
rg -n "\]\(" framework/modules/coding/skills/coding/designing-architecture/SKILL.md framework/modules/coding/skills/coding/implementing-code/SKILL.md | rg "core/skills|module\.json|agents/|\.\./"
```
Expect (designing-architecture, ~lines 458–463): sibling link `[implementing-code](../implementing-code/SKILL.md)` (KEEP), `[verifying-quality](../../../../core/skills/verifying-quality/SKILL.md)` (FIX), `[module.json](../../../module.json)` (FIX), `[ai-architect.md](../../../agents/ai-architect.md)` (FIX). And (implementing-code, ~lines 470–477): `[designing-architecture](../designing-architecture/SKILL.md)` (KEEP, sibling), `[committing-code](../../../../core/skills/committing-code/SKILL.md)` (FIX), `[verifying-quality](../../../../core/skills/verifying-quality/SKILL.md)` (FIX), `[validating-markdown](../../../../core/skills/validating-markdown/SKILL.md)` (FIX), `[module.json](../../../module.json)` (FIX), `[ai-app-developer.md](../../../agents/ai-app-developer.md)` (FIX).

- [ ] **Step 2: Convert the FIX links to plain text (keep the sibling-skill links)**

For each link whose target is a **different module's skill** (`../../../../core/skills/<x>/SKILL.md`), the **module manifest** (`../../../module.json`), or an **agent** (`../../../agents/<a>.md`), drop the `[text](path)` markdown-link syntax and keep just the descriptive text (plain skill/agent name — NOT backticked-with-`.md`, to avoid a `backticked_path` warning).

Example — `designing-architecture/SKILL.md` "Related Skills / Module Documentation":
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

> Do NOT introduce `../verifying-quality/SKILL.md`-style flat links: they'd fix deployed but break the source build.

- [ ] **Step 3: Guard — confirm the sibling-skill links were NOT converted**

```
rg -n "\[implementing-code\]\(\.\./implementing-code/SKILL\.md\)" framework/modules/coding/skills/coding/designing-architecture/SKILL.md
rg -n "\[designing-architecture\]\(\.\./designing-architecture/SKILL\.md\)" framework/modules/coding/skills/coding/implementing-code/SKILL.md
```
Both must still match (the sibling links survive as links). And confirm NO cross-module link survives: `rg -n "core/skills|\.\./\.\./\.\./module\.json|\.\./\.\./\.\./agents/" <both files>` → no matches.

- [ ] **Step 4: Confirm the source files are clean in the source tree**

```
node framework/cli/dist/index.js build -p /Users/antonborodulin/Projects/cc-backlog-manager --verbose 2>&1 | rg -A2 "designing-architecture/SKILL.md|implementing-code/SKILL.md" | rg -i "broken link" && echo "STILL BROKEN" || echo "✓ no broken links in the two coding skills"
```
(The repo build still reports the out-of-scope stale-`.claude/` errors — ignore those; this step only checks the two coding skills.)

- [ ] **Step 5: Commit**

`git add framework/modules/coding && git commit -m "fix(coding): make cross-module skill See-Also links deploy-safe (plain text)"`.

---

## Task 2: Verify (fresh init + fresh checkout), gate, and finish

**Files:** none.

- [ ] **Step 1: Fresh-init build → 0 errors (the user's goal)**

```
DIST=/Users/antonborodulin/Projects/cc-backlog-manager/framework/cli/dist/index.js
SMOKE=$(mktemp -d /tmp/p7-smoke-XXXX) && cd "$SMOKE"
node "$DIST" init smoke --no-interactive --modules core,coding,backlog,confluence --no-git >/dev/null 2>&1
PROJ="$SMOKE"; [ -d "$SMOKE/smoke/.claude" ] && PROJ="$SMOKE/smoke"
node "$DIST" build -p "$PROJ" 2>&1 | tail -3
rm -rf /tmp/p7-smoke-*
```
Expected: `✓ Build passed` / `0 error(s), N warning(s)`. If errors remain, `--verbose` names the file/link — fix it the same plain-text way and re-commit into Task 1.

- [ ] **Step 2: Fresh-checkout build → 0 errors (what CI / a fresh clone sees)**

Export only tracked files (no local `.claude/`), then build there — the representative CI case:
```
cd /Users/antonborodulin/Projects/cc-backlog-manager
CLONE=$(mktemp -d /tmp/p7-clone-XXXX)
git archive HEAD | tar -x -C "$CLONE"
node framework/cli/dist/index.js build -p "$CLONE" 2>&1 | tail -3
rm -rf /tmp/p7-clone-*
```
Expected: `0 error(s), N warning(s)`. (This is the build that must be green for CI / other contributors; the working-repo build is NOT representative because of the local stale `.claude/`.) If a tracked file other than the two coding skills shows a broken-link error here, fix it the same way and fold into Task 1.

- [ ] **Step 3: Standard 3-suite gate (prove nothing regressed)**

```
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli
npx jest 2>&1 | grep -e "Tests:" -e "FAIL"
npx jest --config jest.integration.config.cjs 2>&1 | grep -e "Tests:" -e "FAIL"
npx jest --config jest.e2e.config.cjs 2>&1 | grep -e "Tests:" -e "FAIL"
```
All green. (No `.ts` changed — link-validator tests should be unaffected.)

- [ ] **Step 4: Complete development**

Use **superpowers:finishing-a-development-branch**. Hand-off notes: with `build` green on a fresh init and a fresh checkout, the deployed pre-push hook (`build`, full) no longer blocks. Remaining optional follow-ups (not blocking): the `backticked_path` warnings, the deprecated-`ai/context` skill-example links, and the local-only stale `.claude/` (regenerate when convenient). Plans 1–7 are committed locally on `feature/framework-simplification`; the user decides push/PR.

---

## Self-Review (writing-plans checklist)

- **Coverage:** the 8 fresh-init errors map to Task 1 (2 coding skills); Task 2 proves fresh-init AND fresh-checkout builds are 0 errors + the 3-suite gate. The local stale `.claude/` is correctly scoped OUT (local-only, zero tracked diff, gates nothing, destructive to fix) with a note for the user.
- **Approach correctness:** plain-text re-authoring is the only fix valid in BOTH source and deployed layouts without a systemic transformer change; sibling-skill links explicitly preserved (Step 3 guard catches the over-broad-edit failure mode that produced the `build --links` bug in Plan 5/6 Task 5). The transformer fix is named as the out-of-scope alternative.
- **Verification generalizes:** Task 2 Step 2 uses `git archive` to test tracked-source-only — the CI/fresh-clone case — instead of the unrepresentative working-repo build. Success is live `build` reporting 0 errors, not a grep; warnings explicitly accepted.
- **Scope discipline:** no `.ts` edits; warnings, `ai/context` example links, and the local `.claude/` regeneration are explicitly out of scope.
- **Open question for the user (raise at hand-off):** is "CI / fresh-checkout build green" in scope (Task 2 Step 2), or only "fresh init green" (Task 1 + Step 1)? The plan covers both; if only the latter matters, Step 2 is informational.
