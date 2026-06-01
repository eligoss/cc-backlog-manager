# cc-backlog-manager — Plan 2: Excise the Context System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the entire knowledge/context layer (context templates, level system, `context-category-needs` / `contextCategoryNeeds`, `context.json` generation, the `subagent-context-loader` hook, and the `using-context` / `building-context` skills) leaving build, lint, and all three test suites (unit + integration + e2e) green.

**Architecture:** "Prune, don't rewrite" (spec §2/§6). Context delivery is being deleted outright — knowledge moves to on-demand skills in Plan 3. The discovery engine's **skill** discovery is retained; only its **context** machinery is removed. Three ordered tasks, each ending green:

1. **Hook removal** (self-contained config/file deletion).
2. **Atomic code removal** — delete the `contextCategoryNeeds` field and every consumer/producer in one task; `tsc` enumerates the sites, jest re-checks the tests. The TypeScript field cannot be removed incrementally (its deletion breaks ~10 files at the type level simultaneously), so this task is necessarily atomic and includes its own test updates.
3. **Inert-data deletion** — once no code reads the data, delete the templates, frontmatter, module.json `context:` blocks + schema property, and the two context skills, plus the existence/count tests.

**Ordering rationale (verified):** Code is deleted *before* data. `discovery-engine.ts` parses frontmatter with `|| {}`, so removing frontmatter while the field still exists would silently regenerate `agents.json` with empty `{}` — breaking value-asserting tests for no benefit. Delete consumers/producers first; the data becomes inert and safe to delete last.

**Tech Stack:** TypeScript (ESM, `strict`), Commander CLI, Jest (unit / integration / e2e configs), `fs-extra`. Build = `tsc` with a `prebuild` bundling via `scripts/prepare-publish.js`.

**Test gate (all three suites — default `npm test` only runs unit):**
```bash
cd framework/cli
npm run build && npm run lint && npm test
npm run test:integration
npm run test:e2e
```

**Reference spec:** `docs/superpowers/specs/2026-05-31-simplified-framework-design.md` (§6 deleted machinery, §5 why knowledge moves to skills).

**Out of scope (later plans):** knowledge skills + `references.yml` (Plan 3); CLI trim / `routes.yml` removal / v1.0.0 re-baseline / doc rewrite (Plan 4). Do **not** add the `knowing-*` skills here — Plan 2 only deletes.

---

## Pre-flight: Confirm the blast radius

Run these to capture the current reference set. Re-run the relevant grep after each task to confirm convergence; do not rely on the line numbers below (they may shift between authoring and execution — `tsc`/grep are the source of truth).

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager
# Code + test references to the field / frontmatter key
grep -rln "contextCategoryNeeds\|context-category-needs" framework/cli/src
# The hook
grep -rln "subagent-context-loader" framework
# context.json + ContextLevel + cumulative loaders
grep -rln "context\.json\|ContextLevel\|getCumulativeContextFiles\|getContextFilesForAgent\|validateContextExistence" framework/cli/src
# module.json context blocks + schema property
grep -rln '"context"' framework/modules/*/module.json framework/modules/core/registries/schemas/module.schema.json
```

**Known reference set at authoring time** (from the greps above — treat as a checklist, verify with `tsc`):

- **Code (source):** `framework/cli/src/lib/discovery-engine.ts`, `lib/registry-generator.ts`, `lib/agent-generator.ts`, `lib/framework-validator.ts`, `lib/schemas/agent.schema.ts`, `lib/sdk/types.ts`, `lib/sdk/generator.ts`, `mcp/tools/agent.ts`, `commands/agent/show.ts`
- **Tests:** `lib/__tests__/discovery-engine.test.ts`, `lib/__tests__/discovery-engine.context.integration.test.ts`, `lib/__tests__/discovery-engine.integration.test.ts`, `lib/__tests__/registry-generator.test.ts`, `lib/__tests__/registry-generator.integration.test.ts`, `lib/__tests__/framework-validator.test.ts`, `lib/__tests__/framework-validator.integration.test.ts`, `lib/__tests__/framework-validator.variants.integration.test.ts`, `lib/__tests__/framework-integrity.integration.test.ts`, `lib/schemas/__tests__/agent.schema.test.ts`, `lib/common/__tests__/yaml-frontmatter.integration.test.ts`, `lib/sdk/__tests__/generator.test.ts`, `lib/sdk/__tests__/executor.test.ts`, `commands/agent/__tests__/agent-commands.test.ts`, `__tests__/e2e/context-level-variants.test.ts`
- **Hook:** `framework/cli/src/hooks/subagent-context-loader.ts`, `framework/modules/core/hooks/subagent-context-loader.sh`, registration in `framework/modules/core/module.json` (SubagentStart), comment in `framework/cli/src/hooks/index.ts`, `lib/__tests__/sync-engine.integration.test.ts`
- **Data:** 9 templates in `framework/modules/core/templates/context/`, `framework/modules/core/skills/{using-context,building-context}/`, `context-category-needs` frontmatter in agent `.md` files + `framework/modules/core/templates/agent/agent.template.md` + several `building-agents`/`using-*` skill docs, `context:` block in 4 `module.json` (core, coding, confluence, backlog), `context` property in `module.schema.json`

---

## Task 1: Remove the `subagent-context-loader` hook

The hook is the only mechanism that **injected** context-file content into subagents. It is context-only — clean removal. `skill-reminder.sh` shares its `SubagentStart` slot and MUST be preserved.

**Files:**
- Delete: `framework/cli/src/hooks/subagent-context-loader.ts`
- Delete: `framework/modules/core/hooks/subagent-context-loader.sh`
- Modify: `framework/modules/core/module.json` (SubagentStart scripts array)
- Modify: `framework/cli/src/hooks/index.ts` (remove the doc-comment line)
- Modify (if referenced): `framework/cli/src/lib/__tests__/sync-engine.integration.test.ts`

- [ ] **Step 1: Delete the hook files**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager
git rm framework/cli/src/hooks/subagent-context-loader.ts
git rm framework/modules/core/hooks/subagent-context-loader.sh
```

- [ ] **Step 2: De-register the hook in `core/module.json`**

In `framework/modules/core/module.json`, the `claude-hooks.SubagentStart` entry lists two scripts. Remove only `subagent-context-loader.sh`, keep `skill-reminder.sh`:

```json
      "SubagentStart": [
        {
          "matcher": ".*",
          "scripts": [
            "skill-reminder.sh"
          ]
        }
      ],
```

Validate JSON:
```bash
node -e "JSON.parse(require('fs').readFileSync('framework/modules/core/module.json','utf8')); console.log('valid json')"
```
Expected: `valid json`.

- [ ] **Step 3: Remove the doc-comment reference in `hooks/index.ts`**

In `framework/cli/src/hooks/index.ts`, delete the line:
```ts
 * - subagent-context-loader: Auto-loads context for subagents
```

- [ ] **Step 4: Check the session-lifecycle context hooks (scope guard)**

`core/module.json` also registers `session-start-context.sh` and `session-compact-context.sh` (SessionStart). These are **separate** from `subagent-context-loader`. Inspect them:
```bash
grep -rln "\.claude/context\|context/.*\.md\|context-category" framework/modules/core/hooks/session-start-context.sh framework/modules/core/hooks/session-compact-context.sh 2>/dev/null || echo "no context-file dependency"
```
- If they do **not** read the `.claude/context/*.md` files being deleted → leave them (out of scope; they handle session/MCP context).
- If they **do** read those files → note it and remove only the context-file-reading lines (do not delete the session hooks wholesale). Record what you changed in the commit body.

- [ ] **Step 5: Fix any hook-registration test**

```bash
grep -n "subagent-context-loader" framework/cli/src/lib/__tests__/sync-engine.integration.test.ts
```
If a test asserts the hook is synced/registered, update it to reflect that `SubagentStart` now contains only `skill-reminder.sh` (adjust the expected scripts array / count). If no match, skip.

- [ ] **Step 6: Build + targeted tests, expect green**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli
npm run build
npx jest sync-engine hooks 2>&1 | tail -15
```
Expected: `tsc` exits 0; sync-engine/hook suites pass.

- [ ] **Step 7: Confirm no dangling hook reference**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager
grep -rln "subagent-context-loader" framework/cli/src framework/modules || echo "hook refs clean"
```
Expected: `hook refs clean` (dist/coverage build artifacts are gitignored — ignore them).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: remove subagent-context-loader hook"
```

---

## Task 2: Remove the context code (atomic) and its tests

Removing `AgentDefinition.contextCategoryNeeds` is compiler-forced: `tsc` will not compile until every reference is gone, and jest will not pass until every test referencing it is updated. Do the whole cluster in one task so there is exactly one green checkpoint. **Let `tsc` drive you** — delete the field, compile, fix each error by deleting the context-dependent code (not by re-adding the field).

**Files (source — verify against `tsc` output, do not trust as exhaustive):**
- `framework/cli/src/lib/discovery-engine.ts` — `ContextLevel` type, `contextCategoryNeeds` field on `AgentDefinition`, `getCumulativeContextFiles`, `getContextFilesForAgent`, and the frontmatter parse `contextCategoryNeeds: (frontmatter['context-category-needs'] ...) || {}`
- `framework/cli/src/lib/registry-generator.ts` — `context.json` generation, the `'context-category-needs': agent.contextCategoryNeeds` emission into `agents.json`, and the "regenerate only context.json" function
- `framework/cli/src/lib/agent-generator.ts` — any merge of `context-category-needs`
- `framework/cli/src/lib/framework-validator.ts` — the `contextExistence: ValidationResult` field, the `validateContextExistence()` method, its call site in the aggregate validate, and the variant-validation context-level check (`for (const [category, level] of Object.entries(agent.contextCategoryNeeds || {}))`)
- `framework/cli/src/lib/schemas/agent.schema.ts` — the `context-category-needs` schema property
- `framework/cli/src/lib/sdk/types.ts`, `framework/cli/src/lib/sdk/generator.ts` — context fields/usage
- `framework/cli/src/mcp/tools/agent.ts`, `framework/cli/src/commands/agent/show.ts` — display/return of context-category-needs

**Test files (fold into this task):** all those in the Pre-flight "Tests" list that reference `contextCategoryNeeds` / context behavior.

- [ ] **Step 1: Remove the type + field + cumulative loaders in `discovery-engine.ts`**

Delete, in `framework/cli/src/lib/discovery-engine.ts`:
- `export type ContextLevel = 'basic' | 'advanced' | 'expert';`
- the `contextCategoryNeeds: Record<string, string>;` field on the `AgentDefinition` interface
- the `getCumulativeContextFiles(...)` method (entire method)
- the `getContextFilesForAgent(...)` method (entire method)
- in the agent-parsing code, the line that sets `contextCategoryNeeds: (frontmatter['context-category-needs'] as ...) || {}` (remove the whole property from the constructed object)

- [ ] **Step 2: Remove `context.json` + `context-category-needs` emission in `registry-generator.ts`**

In `framework/cli/src/lib/registry-generator.ts`:
- Delete the block that builds and writes `context.json` (the `// Generate context.json ...` section and the `fs.writeJson(path.join(registriesPath, 'context.json'), ...)` call).
- Delete the `'context-category-needs': agent.contextCategoryNeeds,` property from the object written into `agents.json`.
- Delete the standalone "Regenerate only context.json registry" function and any call to it.

- [ ] **Step 3: Remove the validator's context logic in `framework-validator.ts`**

In `framework/cli/src/lib/framework-validator.ts`:
- Delete the `contextExistence: ValidationResult;` field from the results interface.
- Delete the entire `validateContextExistence()` method.
- Remove its invocation and its entry from the aggregate validation result object (and any summary that sums `contextExistence`).
- In the variant validator, delete the `for (const [category, level] of Object.entries(agent.contextCategoryNeeds || {})) { ... }` block that checks context levels.
- Remove `'context'` from the `ValidationIssue.category` union type **only if** no remaining code emits it (check after the above deletions).

- [ ] **Step 4: Remove remaining references in schema, sdk, mcp, command**

- `framework/cli/src/lib/schemas/agent.schema.ts` — delete the `context-category-needs` property definition.
- `framework/cli/src/lib/sdk/types.ts` + `sdk/generator.ts` — delete context fields and any code that reads them.
- `framework/cli/src/mcp/tools/agent.ts` + `commands/agent/show.ts` — delete code that surfaces `contextCategoryNeeds`.

- [ ] **Step 5: Compile and let `tsc` enumerate any remaining sites**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli
npm run build 2>&1 | tail -30
```
Expected eventually: `tsc` exits 0. For each error, delete the context-dependent code at that site (never re-introduce the field). Repeat until clean. **Note:** test files do not break the build — they are handled in Step 6.

- [ ] **Step 6: Update every test that references the removed code**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli
grep -rln "contextCategoryNeeds\|getCumulativeContextFiles\|getContextFilesForAgent\|validateContextExistence\|context\.json\|ContextLevel" src --include='*.test.ts'
```
For each test file:
- `discovery-engine.context.integration.test.ts` — this suite is **entirely** about cumulative context loading; delete the whole file (`git rm`).
- `discovery-engine.test.ts` / `discovery-engine.integration.test.ts` — delete only the `it(...)`/`describe(...)` blocks that call the removed methods or assert on `contextCategoryNeeds`; keep skill/module-discovery tests.
- `registry-generator.test.ts` / `registry-generator.integration.test.ts` — delete assertions that `context.json` is generated and that `agents.json` carries `context-category-needs`; keep the rest.
- `framework-validator.test.ts` / `.integration.test.ts` / `.variants.integration.test.ts` / `framework-integrity.integration.test.ts` — delete `validateContextExistence` / `contextExistence` assertions and context-level variant checks; if a stats count (e.g. number of validation result keys) changes, update the literal.
- `agent.schema.test.ts` / `yaml-frontmatter.integration.test.ts` — delete cases asserting `context-category-needs` parses/validates.
- `sdk/__tests__/generator.test.ts` / `executor.test.ts`, `commands/agent/__tests__/agent-commands.test.ts` — delete context-field assertions.
- `__tests__/e2e/context-level-variants.test.ts` — delete the "Cumulative Context Loading" describe block (uses `getCumulativeContextFiles`) and any `getContextFilesForAgent` / `contextCategoryNeeds` usage. (Its template-count and agent-discovery blocks are handled in Task 3 / already aligned in Plan 1 — leave those for now; this file may shrink substantially.)

For each: confirm the only reason it fails is the removed context code, then delete/adjust. Do not weaken an unrelated assertion.

- [ ] **Step 7: Build + all three suites, expect green**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli
npm run build && npm test 2>&1 | tail -6
npm run test:integration 2>&1 | tail -6
npm run test:e2e 2>&1 | tail -6
```
Expected: `tsc` exits 0; all three suites pass.

- [ ] **Step 8: Confirm code is free of `contextCategoryNeeds`**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager
grep -rln "contextCategoryNeeds\|getCumulativeContextFiles\|getContextFilesForAgent\|validateContextExistence" framework/cli/src || echo "code clean"
```
Expected: `code clean`. (`context.json` may still appear in deploy/sync code that lists registry filenames — handle only if it points at the deleted generation; otherwise note and defer to Task 3 verification.)

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor: remove contextCategoryNeeds field, context.json generation, and context validation"
```

---

## Task 3: Delete the inert context data and its tests

With no code reading it, the data is safe to delete. The schema `context` property and the module.json `context:` blocks MUST be removed in the same step — `module.schema.json` is `additionalProperties: false`, so a module.json carrying a `context:` block against a schema lacking the property fails validation.

**Files:**
- Delete: 9 files `framework/modules/core/templates/context/*.template.md`
- Delete: `framework/modules/core/skills/using-context/`, `framework/modules/core/skills/building-context/`
- Modify: `framework/modules/{core,coding,confluence,backlog}/module.json` (remove `context:` block)
- Modify: `framework/modules/core/registries/schemas/module.schema.json` (remove `context` property)
- Modify: agent `.md` frontmatter + `framework/modules/core/templates/agent/agent.template.md` + `building-agents`/`using-*` skill docs (remove `context-category-needs`)
- Modify: `framework/cli/src/__tests__/e2e/context-level-variants.test.ts` (template-count assertion) + any skill-existence test referencing `using-context`/`building-context`

- [ ] **Step 1: Delete the context templates and the two context skills**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager
git rm -r framework/modules/core/templates/context
git rm -r framework/modules/core/skills/using-context framework/modules/core/skills/building-context
```

- [ ] **Step 2: Remove `context:` blocks from all 4 module.json AND the schema property (same step)**

In each of `framework/modules/core/module.json`, `coding/module.json`, `confluence/module.json`, `backlog/module.json`, delete the top-level `"context": { ... }` block (and its trailing comma).

In `framework/modules/core/registries/schemas/module.schema.json`, delete the `"context": { ... }` property definition (lines ~152, the `additionalProperties:false` context object).

Validate all:
```bash
for f in core coding confluence backlog; do node -e "JSON.parse(require('fs').readFileSync('framework/modules/$f/module.json','utf8'))" && echo "$f ok"; done
node -e "JSON.parse(require('fs').readFileSync('framework/modules/core/registries/schemas/module.schema.json','utf8'))" && echo "schema ok"
grep -rn '"context"' framework/modules/*/module.json framework/modules/core/registries/schemas/module.schema.json || echo "no context blocks"
```
Expected: all `ok`, `no context blocks`.

- [ ] **Step 3: Remove `context-category-needs` from agent frontmatter, the agent template, and skill docs**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager
grep -rln "context-category-needs" framework/modules
```
For each agent `.md` (e.g. `core/agents/ai-framework-developer.md`, `ai-framework-manager.md`, `backlog/agents/ai-backlog-manager.md`, `confluence/agents/ai-confluence-manager.md`, `coding/agents/ai-app-developer.md`, `ai-architect.md`) and `core/templates/agent/agent.template.md`: delete the `context-category-needs:` YAML key and its indented value lines from the frontmatter.

For the `building-agents` / `using-mcp` / `using-framework` / `building-framework` skill docs that mention `context-category-needs` as instructional content: remove the `context-category-needs` guidance (these docs teach how to author agents — drop the context-needs sections so they no longer instruct adding a deleted field).

Verify:
```bash
grep -rln "context-category-needs" framework/modules || echo "frontmatter + docs clean"
```
Expected: `frontmatter + docs clean`.

- [ ] **Step 4: Update the template-count + skill-existence tests**

- `framework/cli/src/__tests__/e2e/context-level-variants.test.ts` — the assertion `expect(templateFiles.length).toBe(9)` (context templates) is now wrong (0 templates). With the cumulative-loading block already removed in Task 2, this file may now test nothing meaningful about context; if every remaining test in it concerns the deleted context system, `git rm` the file. Otherwise delete the template-count test and keep any still-valid agent/discovery assertions.
- Search for tests asserting the two skills exist:
```bash
grep -rln "using-context\|building-context" framework/cli/src
```
Remove those assertions (or list entries) so the deleted skills are not expected.

- [ ] **Step 5: Build + lint + all three suites, expect green**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli
npm run build && npm run lint && npm test 2>&1 | tail -6
npm run test:integration 2>&1 | tail -6
npm run test:e2e 2>&1 | tail -6
```
Expected: `tsc` exits 0; `eslint` no errors; all three suites pass.

- [ ] **Step 6: Final context-system sweep (repo-wide)**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager
test ! -d framework/modules/core/templates/context && echo "templates removed"
test ! -d framework/modules/core/skills/using-context && test ! -d framework/modules/core/skills/building-context && echo "context skills removed"
grep -rln "context-category-needs\|contextCategoryNeeds\|ContextLevel\|getCumulativeContextFiles\|getContextFilesForAgent\|validateContextExistence\|subagent-context-loader" framework/modules framework/cli/src || echo "context system clean"
# context.json should no longer be generated; confirm no source emits it
grep -rln "context\.json" framework/cli/src || echo "no context.json emission"
```
Expected: `templates removed`, `context skills removed`, `context system clean`, `no context.json emission`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: delete context templates, frontmatter, module context blocks, and context skills"
```

---

## Done-When (Plan 2 exit criteria)

- No source, test, schema, or module manifest references `context-category-needs`, `contextCategoryNeeds`, `ContextLevel`, `getCumulativeContextFiles`, `getContextFilesForAgent`, `validateContextExistence`, `context.json` generation, or `subagent-context-loader`.
- The 9 context templates, the `using-context` / `building-context` skills, and the `subagent-context-loader` hook (`.ts` + `.sh`) are gone with no dangling references.
- `skill-reminder` hook still registered in `SubagentStart`; skill/module discovery in `discovery-engine.ts` untouched and working.
- `module.schema.json` has no `context` property and no module.json carries a `context:` block (schema validation passes).
- `npm run build`, `npm run lint`, `npm test`, `npm run test:integration`, and `npm run test:e2e` are all green.
- `planning` CLI, Jira/Confluence sync, and scaffolding generators are untouched.

**Not in this plan:** knowledge skills + `references.yml` (Plan 3); CLI trim / `routes.yml` removal / v1.0.0 re-baseline / doc rewrite (Plan 4).

---

## Self-Review

- **Spec coverage:** Implements spec §6 in full (templates, level system, frontmatter in source `.md` *and* generated `agents.json` via generator change, hook + de-registration, `context.json` + `contextCategoryNeeds` field, `using-context`/`building-context`, module.json `context:` + schema property). §5's "knowledge becomes on-demand skills" is Plan 3 — correctly excluded.
- **Green-between-tasks:** Tests are folded into the task that changes their source (Task 2 removes code + its tests together; Task 3 removes data + its tests together) — mirrors the verified Plan 1 Task 3 lesson that test files type-check at jest time, not `tsc` time. Each task ends with all three suites green.
- **Ordering:** Code before data (Task 2 before Task 3) — verified necessary because `discovery-engine` parses frontmatter with `|| {}`, so data-first would silently regenerate empty values. Schema property + module.json `context:` blocks removed in the same step (Task 3 Step 2) — verified necessary because the schema is `additionalProperties: false`.
- **Compiler-guided over line-pinned:** Task 2 instructs deleting the field and letting `tsc` enumerate sites, with the known reference set as a checklist. This is robust to line drift between authoring and execution; verbatim guidance is reserved for the non-obvious spots (registry-generator emission, framework-validator method/field).
- **Placeholder scan:** Every step names exact files and the exact transformation; test steps name each file and what to delete vs keep, with a guard against masking unrelated failures.
- **Scope guard:** The session-lifecycle context hooks (`session-start-context.sh`, `session-compact-context.sh`) are explicitly checked (Task 1 Step 4) rather than assumed in or out, preventing accidental over- or under-deletion.
