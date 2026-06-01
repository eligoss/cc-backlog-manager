# Plan 3 — Knowledge Skills + References Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the deleted context-file system with three on-demand project-knowledge skills (`knowing-the-codebase`, `knowing-the-domain`, `knowing-backlog`) plus a single external-references library (`references.yml`), and rewire the four project-facing agents + the deployed `CLAUDE.md` to invoke them.

**Architecture:** The three knowledge skills are **real `core` skills** (not loose templates) — that is the only way they appear in the generated `skills.json` (built by scanning source skill dirs), pass `available-skills` validation, and surface via the `skill-reminder` hook. Because they ship pre-filled with placeholders that the end-user completes, `syncSkills` gains a **copy-once guard** keyed on a `project-knowledge: true` frontmatter marker so re-sync never clobbers filled-in content. The **load-bearing defense** against an agent skipping project knowledge is NOT the hook (it only fires on `SubagentStart` with 2+ trigger matches, and never for main-session slash commands) — it is the **agent prompt rewrite** ("invoke the relevant `knowing-*` skill before project work") and the **deployed `CLAUDE.md` instruction**. The hook/`skill-triggers` wiring is secondary reinforcement.

**Tech Stack:** TypeScript (ESM, strict), Jest (unit + integration + e2e), Commander CLI, `fs-extra`, `yaml`. Source of truth is `framework/modules/` + `framework/cli/src/`; `agents.json`/`skills.json`/`discovery-map.json` are **generated** (gitignored bundle), only `skill-triggers.json` + schemas are committed.

---

## Critical Conventions (read before starting)

- **Build pitfall (MEMORY.md):** Use `npx tsc` to type-check. **NEVER** run `npm run build` for verification — its `prebuild` (`scripts/prepare-publish.js`) bundles modules into the gitignored `framework/cli/framework/` and **reverts source edits** in `framework/cli/src/`. Running the *full* unfiltered `npx jest` can also trigger restoration via teardown — always pass a path/pattern filter. After any build, `grep` for your identifiers to confirm source survived.
- **Test gate is three suites.** Default `npm test` (= `jest`) runs **unit only** (excludes `*.integration.test.ts`, `*.e2e.test.ts`, `/__tests__/e2e/`). Integration = `npx jest --config jest.integration.config.cjs`; e2e = `npx jest --config jest.e2e.config.cjs`. **Per-task gate must run the suite where breakage would live** (Plan 1 lesson): sync/init tasks include integration + e2e, not just unit.
- **All `cd` are absolute.** The shell cwd resets between commands in this environment. Always `cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli` (for jest/tsc) or repo root (for git) at the start of each command.
- **Surfacing vs. copy-once are independent.** A `knowing-*` skill is registered + surfaced purely by **existing in `core/skills/`** (`skills.json` is generated from *source* dirs, not deployed `.claude/skills/`). The copy-once guard (Task 4) is **only** about preserving user-filled content on re-sync — never about registration.
- **Copy-once is a conscious net-new behavior** the spec (§2 "minimize churn") does not itself call for. It is justified: without it, a re-sync silently destroys the user's filled-in project knowledge. It is scoped (only `project-knowledge: true` skills) so it does not change behavior for any other skill.
- **Branch:** `feature/framework-simplification` (already checked out; Plans 1+2 are committed on it). Stay on it. Never commit to `main`.

---

## File Structure

**Create:**
- `framework/modules/core/skills/knowing-the-codebase/SKILL.md` — codebase knowledge skill (template body, `project-knowledge: true`)
- `framework/modules/core/skills/knowing-the-domain/SKILL.md` — domain knowledge skill
- `framework/modules/core/skills/knowing-backlog/SKILL.md` — backlog/process knowledge skill
- `framework/modules/core/templates/references/references.yml.template` — external references library template

**Modify:**
- `framework/modules/core/module.json` — add 3 skills to `provides.skills`, add 3 capabilities, remove 3 orphaned `context-*` capabilities (Plan 2 residue)
- `framework/modules/core/registries/skill-triggers.json` — add 3 trigger entries (committed source)
- `framework/cli/src/lib/schemas/skill.schema.ts` — add optional `project-knowledge` field to `SkillSchema`
- `framework/cli/src/lib/sync-engine.ts` — copy-once guard in `syncSkills` + `isProjectKnowledgeSkill` helper
- `framework/cli/src/commands/init.ts` — deploy `references.yml` (copy-once) + `## Project Knowledge` section in generated CLAUDE.md + next-steps line
- `framework/modules/coding/agents/ai-app-developer.md` — `available-skills` + routing row + Required Reading rewrite
- `framework/modules/coding/agents/ai-architect.md` — same (also remove stale `context-category-needs` prose)
- `framework/modules/backlog/agents/ai-backlog-manager.md` — same
- `framework/modules/confluence/agents/ai-confluence-manager.md` — same

**Test:**
- `framework/cli/src/lib/__tests__/sync-engine.test.ts` (or new `.integration.test.ts`) — copy-once behavior
- `framework/cli/src/commands/__tests__/` + e2e — references.yml deployment

**Agent → knowing-* mapping (decided):**

| Agent | knowing-* skills | Rationale |
|-------|------------------|-----------|
| `ai-app-developer` | `knowing-the-codebase`, `knowing-the-domain` | Code work needs stack/conventions + product context; dev workflow folds into codebase per spec §5 |
| `ai-architect` | `knowing-the-codebase`, `knowing-the-domain` | Reads business + technical; process-basic = dev workflow → codebase |
| `ai-backlog-manager` | `knowing-backlog`, `knowing-the-domain` | Ticket/process standards (headline) + business domain |
| `ai-confluence-manager` | `knowing-the-domain`, `knowing-backlog` | Documents domain + process/workflow conventions |

---

## Task 1: Create the three knowledge skills + register them

**Files:**
- Create: `framework/modules/core/skills/knowing-the-codebase/SKILL.md`
- Create: `framework/modules/core/skills/knowing-the-domain/SKILL.md`
- Create: `framework/modules/core/skills/knowing-backlog/SKILL.md`
- Modify: `framework/modules/core/module.json`
- Modify: `framework/modules/core/registries/skill-triggers.json`

- [ ] **Step 0: Verify `scope: project` is permitted before authoring**

The `knowing-*` skills use `scope: project` (existing skills use `scope: generic`). Confirm this is valid before creating three files with it:
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && grep -n "SkillScopeSchema" src/lib/schemas/skill.schema.ts
```
Read its definition. If it is `z.string()` → no constraint, proceed. If it is `z.enum([...])` **without** `'project'`, add `'project'` to the enum now (legitimate scope for these skills) and note it for Task 2's commit. The DiscoveryEngine's custom frontmatter parser (used for `skills.json` generation) does not run Zod, so generation is unaffected either way — this check is for any validation path that does.

- [ ] **Step 1: Create `knowing-the-codebase/SKILL.md`**

Create `framework/modules/core/skills/knowing-the-codebase/SKILL.md`:

```markdown
---
id: knowing-the-codebase
module: core
name: knowing-the-codebase
description: Project-specific knowledge of the target application's tech stack, architecture, code conventions, testing & CI setup, and git workflow. Invoke before writing code, designing architecture, or reasoning about how this project is built.
scope: project
applicable-projects: any
project-knowledge: true
capabilities-provided:
  - codebase-knowledge
tools:
  - Read
  - Glob
  - Grep
---

# Knowing the Codebase

> **TEMPLATE — fill this in for your project.** This skill holds your application's
> technical knowledge so agents reason about *your* code, not generic patterns. Replace
> every `<...>` placeholder. Keep it current. Point at deeper material via `references.yml`.

## When to Use This Skill

Invoke before: writing or reviewing code, designing architecture, planning a refactor,
or any task that depends on how this project is built. If you are about to touch code and
have not read this skill, read it first.

## Tech Stack

- **Languages / runtimes:** <e.g. TypeScript 5.x on Node 20>
- **Frameworks / libraries:** <e.g. React, Express, Prisma>
- **Data stores:** <e.g. Postgres, Redis>
- **Build / package tooling:** <e.g. pnpm, Vite, tsc>

## Architecture & Structure

- **High-level shape:** <monolith / services / modular — 2-3 sentences>
- **Key directories:** <path → responsibility>
- **Module boundaries & interfaces:** <how units communicate>

## Code Conventions

- **Style / lint / format:** <eslint config, prettier, naming rules>
- **Patterns to follow:** <error handling, validation, logging conventions>
- **Anti-patterns to avoid:** <project-specific gotchas>

## Testing & CI

- **Test framework & layout:** <jest/vitest/pytest; where tests live>
- **How to run tests:** <exact commands>
- **CI pipeline:** <what runs on PR, required checks>

## Git Workflow

- **Branching:** <trunk-based / git-flow; branch naming>
- **Commit conventions:** <format>
- **PR / review process:** <gates, who reviews>

## Deeper References

See `references.yml` for links to external docs, API references, and related codebases.
```

- [ ] **Step 2: Create `knowing-the-domain/SKILL.md`**

Create `framework/modules/core/skills/knowing-the-domain/SKILL.md`:

```markdown
---
id: knowing-the-domain
module: core
name: knowing-the-domain
description: Project-specific knowledge of the platform, business domain, users, and product context the application serves. Invoke before product, architecture, backlog, or documentation work that depends on understanding what the product does and for whom.
scope: project
applicable-projects: any
project-knowledge: true
capabilities-provided:
  - domain-knowledge
tools:
  - Read
  - Glob
  - Grep
---

# Knowing the Domain

> **TEMPLATE — fill this in for your project.** This skill holds your product and
> business-domain knowledge so agents reason about *your* users and value, not generic
> assumptions. Replace every `<...>` placeholder.

## When to Use This Skill

Invoke before: writing tickets, designing features, making product trade-offs, or
documenting anything that depends on what the product does and who it serves.

## Product & Platform

- **What the product is:** <one-paragraph description>
- **Platform / surfaces:** <web, mobile, API, etc.>
- **Core capabilities / features:** <bullet list>

## Business Domain

- **Domain concepts & entities:** <key nouns and their relationships>
- **Domain rules / invariants:** <non-obvious constraints>
- **Glossary:** <project-specific terms a newcomer would not know>

## Users & Stakeholders

- **Primary users / personas:** <who, and what they need>
- **Business goals / success metrics:** <what "good" looks like>

## Deeper References

See `references.yml` for links to product docs, design specs, and domain references.
```

- [ ] **Step 3: Create `knowing-backlog/SKILL.md`**

Create `framework/modules/core/skills/knowing-backlog/SKILL.md`:

```markdown
---
id: knowing-backlog
module: core
name: knowing-backlog
description: Project-specific knowledge of this team's Jira project, board/sprint structure, workflow states, ticket conventions, definition of ready/done, and Jira/Confluence integration config. Invoke before creating, sizing, or syncing tickets, or before publishing documentation.
scope: project
applicable-projects: any
project-knowledge: true
capabilities-provided:
  - backlog-knowledge
tools:
  - Read
  - Glob
  - Grep
---

# Knowing the Backlog

> **TEMPLATE — fill this in for your project.** This skill holds your team's backlog,
> workflow, and Jira/Confluence conventions so agents create tickets and docs that fit
> *your* process. Replace every `<...>` placeholder.

## When to Use This Skill

Invoke before: creating or decomposing tickets, sizing/sequencing work, syncing with
Jira, or publishing to Confluence.

## Jira Project

- **Project key:** <e.g. ABC>
- **Board / sprint structure:** <scrum/kanban, sprint length>
- **Workflow states & transitions:** <To Do → In Progress → ... >
- **Issue types & when to use each:** <Epic, Story, Task, Bug>

## Ticket Conventions

- **Labels / components:** <taxonomy and meaning>
- **Estimation:** <story points / t-shirt; scale>
- **Definition of Ready:** <criteria>
- **Definition of Done:** <criteria>

## Integration Config

- **Jira instance / site:** <url>
- **Confluence space(s):** <space keys, page hierarchy conventions>
- **Sync expectations:** <what is source of truth, push/pull cadence>

## Deeper References

See `references.yml` for links to the Jira board, Confluence space, and process docs.
```

- [ ] **Step 4: Register the new skills + capabilities in `core/module.json`** (additions only — orphan cleanup is a separate commit in Step 10)

In `framework/modules/core/module.json`, in `provides.skills`, append the three new skill ids (after `"gathering-intelligence"`):

```json
      "gathering-intelligence",
      "knowing-the-codebase",
      "knowing-the-domain",
      "knowing-backlog"
```

In `provides.capabilities`, **add** the three new capabilities (e.g. after `"intelligence-gathering"`):

```json
      "intelligence-gathering",
      "codebase-knowledge",
      "domain-knowledge",
      "backlog-knowledge"
```

(Leave the orphaned `context-*` capabilities in place for now — they are removed in their own commit at Step 10 to keep bisect clean.)

- [ ] **Step 5: Add skill-reminder triggers for the three skills**

In `framework/modules/core/registries/skill-triggers.json`, add three entries inside `"skill-triggers"` (mirror the existing entry shape):

```json
    "knowing-the-codebase": {
      "description": "Project-specific tech stack, architecture, code conventions, testing/CI, and git workflow",
      "triggers": [
        "codebase",
        "architecture",
        "tech stack",
        "code convention",
        "implement",
        "refactor",
        "testing",
        "ci pipeline",
        "git workflow"
      ],
      "prompt-patterns": [
        "implement.*feature",
        "write.*code",
        "design.*architecture",
        "how.*built"
      ]
    },
    "knowing-the-domain": {
      "description": "Project-specific platform, business domain, users, and product context",
      "triggers": [
        "domain",
        "business",
        "product",
        "users",
        "platform",
        "feature",
        "stakeholder",
        "use case"
      ],
      "prompt-patterns": [
        "what.*product",
        "business.*requirement",
        "user.*need"
      ]
    },
    "knowing-backlog": {
      "description": "Project-specific Jira project, workflow states, ticket conventions, and Jira/Confluence config",
      "triggers": [
        "ticket",
        "backlog",
        "jira",
        "epic",
        "story",
        "sprint",
        "definition of ready",
        "definition of done",
        "confluence"
      ],
      "prompt-patterns": [
        "create.*ticket",
        "write.*story",
        "decompose.*epic",
        "sync.*jira"
      ]
    }
```

- [ ] **Step 6: Type-check and confirm skills register in generated `skills.json`**

Run:
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx tsc --noEmit
```
Expected: 0 errors (no source changed yet, but confirms baseline).

Confirm the JSON edits are well-formed and the skills are discovered. Write a temporary verification (do NOT commit it) OR rely on the registry-generator integration test in Step 7. Quick well-formedness check:
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager && node -e "JSON.parse(require('fs').readFileSync('framework/modules/core/module.json','utf8')); JSON.parse(require('fs').readFileSync('framework/modules/core/registries/skill-triggers.json','utf8')); console.log('JSON OK')"
```
Expected: `JSON OK`

- [ ] **Step 7: Run the registry-generator + validator integration tests**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx jest --config jest.integration.config.cjs registry-generator framework-validator 2>&1 | tail -25
```
Expected: PASS. These scan the real `core` module; they confirm the 3 skills appear in `skills.json` with their capabilities, and the validator reports no new **errors** (warnings tolerated — verify no *new error* lines mention `knowing-*` or `codebase-knowledge`/`domain-knowledge`/`backlog-knowledge`).

If a test asserts an exact skill count or capability list for the core module, update that assertion to the new reality (do NOT weaken it — set it to the correct new count). Search:
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && grep -rn -e "skills).toHaveLength\|capabilities).toHaveLength\|context-authoring\|context-validation\|context-loading-knowledge" src --include="*.test.ts"
```
Update any count/orphan-capability assertions to match (removing references to the deleted orphan capabilities; adding the 3 new skills/capabilities to expected sets).

- [ ] **Step 8: Run unit suite + lint**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx jest 2>&1 | tail -15 && npx eslint . --quiet 2>&1 | tail -10
```
Expected: unit PASS, lint 0 errors.

- [ ] **Step 9: Commit**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager && git add framework/modules/core/skills/knowing-the-codebase framework/modules/core/skills/knowing-the-domain framework/modules/core/skills/knowing-backlog framework/modules/core/module.json framework/modules/core/registries/skill-triggers.json framework/cli/src && git commit -m "feat(core): add three project-knowledge skills and register them

- Add knowing-the-codebase, knowing-the-domain, knowing-backlog skills
- Register skills + capabilities in core module manifest
- Add skill-reminder triggers for the three skills"
```

- [ ] **Step 10: Remove orphaned `context-*` capabilities (Plan 2 residue) — separate commit**

The `context-authoring`, `context-validation`, `context-loading-knowledge` capabilities in `core/module.json` were provided by `using-context`/`building-context`, both deleted in Plan 2 — now unprovided (validator *warnings*). First confirm nothing else references them:
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager && grep -rn -e "context-authoring" -e "context-validation" -e "context-loading-knowledge" framework/modules framework/cli/src
```
Expected: only matches in `framework/modules/core/module.json` (and possibly test fixtures asserting the orphan warnings — update those to drop the orphans). Remove these three lines from `provides.capabilities`:
```json
      "context-authoring",
      "context-validation",
      "context-loading-knowledge",
```
Re-run the validator integration test (`npx jest --config jest.integration.config.cjs framework-validator`), then commit:
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager && git add framework/modules/core/module.json framework/cli/src && git commit -m "chore(core): remove orphaned context-* capabilities (Plan 2 residue)"
```

---

## Task 2: Permit the `project-knowledge` marker in the skill schema

**Files:**
- Modify: `framework/cli/src/lib/schemas/skill.schema.ts`
- Test: `framework/cli/src/lib/schemas/__tests__/skill.schema.test.ts`

> **Why:** the marker is already *tolerated* (Zod `z.object` strips unknown keys, and the DiscoveryEngine's frontmatter parser ignores them), so this task is for **explicitness**, not to fix a break. Making the field a known optional schema member documents the contract and lets a future create-skill flow emit it. Keep it optional so every existing skill still validates.

- [ ] **Step 1: Write the failing test**

In `framework/cli/src/lib/schemas/__tests__/skill.schema.test.ts`, add:

```typescript
it('accepts an optional project-knowledge marker', () => {
  const result = SkillSchema.safeParse({
    id: 'knowing-the-codebase',
    name: 'knowing-the-codebase',
    description: 'Project-specific knowledge of the target application stack.',
    scope: 'project',
    'capabilities-provided': ['codebase-knowledge'],
    'project-knowledge': true,
  });
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data['project-knowledge']).toBe(true);
  }
});
```

- [ ] **Step 2: Run the test — expect it to fail on the data assertion**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx jest skill.schema -t "project-knowledge" 2>&1 | tail -15
```
Expected: `result.success` is `true` (z.object strips unknowns) but `result.data['project-knowledge']` is `undefined` → the second assertion FAILS. (If `scope: 'project'` is rejected, also note — see Step 3 note.)

- [ ] **Step 3: Add the field to `SkillSchema`**

In `framework/cli/src/lib/schemas/skill.schema.ts`, inside `SkillSchema` (after `'capabilities-provided'`, before `'cli-commands'`):

```typescript
  /** Marks a project-knowledge template skill (copy-once on deploy, user-filled) */
  'project-knowledge': z.boolean().optional(),
```

> **Note on `scope`:** existing skills use `scope: generic`. The `knowing-*` skills use `scope: project`. Confirm `SkillScopeSchema` permits `'project'`:
> ```bash
> cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && grep -n "SkillScopeSchema" src/lib/schemas/skill.schema.ts
> ```
> Read its definition. If it is an enum that excludes `'project'`, add `'project'` to the enum (it is a legitimate scope value for these skills). If it is `z.string()`, no change needed.

- [ ] **Step 4: Run the test — expect pass**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx jest skill.schema 2>&1 | tail -15
```
Expected: PASS (all skill.schema tests).

- [ ] **Step 5: Type-check + lint**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx tsc --noEmit && npx eslint src/lib/schemas/skill.schema.ts --quiet
```
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager && git add framework/cli/src/lib/schemas && git commit -m "feat(cli): permit optional project-knowledge marker in skill schema"
```

---

## Task 3: Copy-once guard in `syncSkills`

**Files:**
- Modify: `framework/cli/src/lib/sync-engine.ts`
- Test: `framework/cli/src/lib/__tests__/sync-engine.test.ts`

> **Behavior:** when a source skill's `SKILL.md` frontmatter has `project-knowledge: true` **and** the target skill directory already exists in `.claude/skills/`, skip the copy (record `action: "skipped"`) so user-filled content is preserved. First deploy (target absent) copies normally. All non-project-knowledge skills are unaffected (still overwrite).

- [ ] **Step 1: Write the failing test**

In `framework/cli/src/lib/__tests__/sync-engine.test.ts`, locate the existing `syncSkills` describe block and add (adapt fixture setup to match the file's existing helpers for building a temp module + project — read the file first to match the established pattern):

```typescript
it('does not overwrite an existing project-knowledge skill on re-sync', async () => {
  // Arrange: a source module with a project-knowledge skill
  const skillSrc = path.join(moduleSourceDir, 'skills', 'knowing-the-codebase');
  await fs.ensureDir(skillSrc);
  await fs.writeFile(
    path.join(skillSrc, 'SKILL.md'),
    '---\nid: knowing-the-codebase\nname: knowing-the-codebase\nproject-knowledge: true\ncapabilities-provided:\n  - codebase-knowledge\n---\n# Template body\n',
  );

  // First sync deploys the template
  await engine.syncSkills([module]);
  const target = path.join(projectPath, '.claude/skills/knowing-the-codebase/SKILL.md');
  expect(await fs.pathExists(target)).toBe(true);

  // User fills it in
  await fs.writeFile(target, '# Filled in by the user\nReal project knowledge.\n');

  // Re-sync must NOT clobber it
  const items = await engine.syncSkills([module]);
  const content = await fs.readFile(target, 'utf-8');
  expect(content).toContain('Filled in by the user');
  expect(items.find((i) => i.name === 'knowing-the-codebase')?.action).toBe('skipped');
});

it('still overwrites a normal (non-project-knowledge) skill on re-sync', async () => {
  const skillSrc = path.join(moduleSourceDir, 'skills', 'committing-code');
  await fs.ensureDir(skillSrc);
  await fs.writeFile(
    path.join(skillSrc, 'SKILL.md'),
    '---\nid: committing-code\nname: committing-code\ncapabilities-provided:\n  - git-workflow-management\n---\n# v1\n',
  );
  await engine.syncSkills([module]);
  const target = path.join(projectPath, '.claude/skills/committing-code/SKILL.md');
  await fs.writeFile(target, '# user edit\n');
  await engine.syncSkills([module]);
  const content = await fs.readFile(target, 'utf-8');
  expect(content).toContain('# v1');
});
```

> **Adapt to the file's fixtures:** before writing, read `sync-engine.test.ts` to use its actual variable names (`engine`, `module`, `moduleSourceDir`, `projectPath`, temp-dir setup/teardown). The two tests above describe the *required behavior*; match the established harness.

- [ ] **Step 2: Run the tests — expect the project-knowledge test to fail**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx jest sync-engine -t "project-knowledge" 2>&1 | tail -20
```
Expected: FAIL — `content` is the template body (not "Filled in by the user") and action is `"updated"`, because `syncSkills` currently always overwrites.

- [ ] **Step 3: Add the `isProjectKnowledgeSkill` helper**

In `framework/cli/src/lib/sync-engine.ts`, add a private method (near `getAgentDeployTarget`, which is the model for reading frontmatter):

```typescript
  /**
   * Read the project-knowledge marker from a source skill's SKILL.md frontmatter.
   * Project-knowledge skills ship as user-filled templates and must be copied
   * once (never overwritten on re-sync), to preserve filled-in content.
   */
  private async isProjectKnowledgeSkill(skillDir: string): Promise<boolean> {
    try {
      const content = await fs.readFile(
        path.join(skillDir, "SKILL.md"),
        "utf-8",
      );
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      if (match) {
        const frontmatter = yaml.parse(match[1]) as Record<string, unknown>;
        return frontmatter["project-knowledge"] === true;
      }
    } catch {
      // If parsing fails, treat as a normal skill (safe default: overwrite)
    }
    return false;
  }
```

- [ ] **Step 4: Add the skip-if-exists guard in `syncSkills`**

In `framework/cli/src/lib/sync-engine.ts`, inside the `for (const skillDir of skillDirs)` loop in `syncSkills` (around line 174), **before** the `try { await this.copySkillDirectory(...) }`:

```typescript
        const skillName = path.basename(skillDir);
        const targetPath = path.join(targetDir, skillName);

        // Copy-once: never overwrite a user-filled project-knowledge skill.
        if (
          (await this.isProjectKnowledgeSkill(skillDir)) &&
          (await fs.pathExists(targetPath))
        ) {
          items.push({
            name: skillName,
            source: skillDir,
            target: targetPath,
            action: "skipped",
          });
          continue;
        }
```

Remove the now-duplicated `const skillName`/`const targetPath` lines that previously opened the loop body (they are replaced by the block above). Verify `yaml` is already imported at the top of the file (it is used by `getAgentDeployTarget`).

- [ ] **Step 5: Run the tests — expect pass**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx jest sync-engine 2>&1 | tail -20
```
Expected: PASS (both new tests + all existing sync-engine tests).

- [ ] **Step 6: Run the sync integration suite (breakage would live here)**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx jest --config jest.integration.config.cjs sync 2>&1 | tail -20
```
Expected: PASS. If a sync integration test asserts a deploy count that now changes because `knowing-*` are skipped on a second sync, update it to reality.

- [ ] **Step 7: Type-check + lint**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx tsc --noEmit && npx eslint src/lib/sync-engine.ts --quiet
```
Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager && git add framework/cli/src/lib/sync-engine.ts framework/cli/src/lib/__tests__/sync-engine.test.ts && git commit -m "feat(cli): copy-once deploy for project-knowledge skills

Skip overwriting an existing project-knowledge skill on re-sync so
user-filled knowledge is preserved. Normal skills still overwrite."
```

---

## Task 4: References library template + init deployment (copy-once)

**Files:**
- Create: `framework/modules/core/templates/references/references.yml.template`
- Modify: `framework/cli/src/commands/init.ts`
- Test: e2e init suite (`framework/cli/src/__tests__/e2e/` or wherever init e2e lives — locate first)

> **Path decision (pin once, used in 3 places):** the references library deploys to **project root** as `references.yml` (matches the old `routes.yml` root location and the "library of routes to externals" framing). The `knowing-*` skill bodies (Task 1) and the deployed CLAUDE.md (Task 5) reference this exact path: `references.yml` at project root.

- [ ] **Step 1: Create the template**

Create `framework/modules/core/templates/references/references.yml.template`:

```yaml
# External References Library
#
# A curated index of external docs, API references, and related codebases that the
# project-knowledge skills (knowing-the-codebase / knowing-the-domain / knowing-backlog)
# point at. Fill this in for your project and keep it current. This file is yours —
# `agentic-framework sync` will NOT overwrite it once created.

version: "1.0"

# Documentation sites, guides, and specs.
docs:
  # - name: Internal Architecture Guide
  #   url: https://...
  #   note: Source of truth for service boundaries

# External / third-party API references.
apis:
  # - name: Payments API
  #   url: https://...
  #   note: Auth via bearer token; see knowing-the-codebase

# Related codebases and repositories.
codebases:
  # - name: Frontend repo
  #   url: https://github.com/org/frontend
  #   note: React app consuming this backend

# Backlog / project-management links (Jira board, Confluence space).
backlog:
  # - name: Jira board
  #   url: https://your-org.atlassian.net/jira/...
  # - name: Confluence space
  #   url: https://your-org.atlassian.net/wiki/...
```

- [ ] **Step 2: Export `deployReferencesLibrary` and write a unit test that exercises the copy-once guard directly**

> **Why a unit test on the helper (not `syncAll`):** the copy-once guard lives in `deployReferencesLibrary`, which **only `init` calls** — `syncAll`/`syncSkills` never touch `references.yml`. A test that edits the file then calls `syncAll` would pass trivially (nothing touches it) and prove nothing. The guard is exercised only by invoking the deploy path **twice**. So export the helper and test it directly.

In `init.ts`, mark the helper exported (`export async function deployReferencesLibrary(...)`). Create/extend a unit test (e.g. `framework/cli/src/commands/__tests__/init.references.test.ts`) — match the repo's temp-dir setup pattern:

```typescript
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { deployReferencesLibrary } from '../init.js';

describe('deployReferencesLibrary', () => {
  let projectPath: string;
  let coreSourcePath: string;
  let modules: any[];

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'refs-proj-'));
    coreSourcePath = await fs.mkdtemp(path.join(os.tmpdir(), 'refs-core-'));
    const tplDir = path.join(coreSourcePath, 'templates', 'references');
    await fs.ensureDir(tplDir);
    await fs.writeFile(path.join(tplDir, 'references.yml.template'), 'version: "1.0"\n# template\n');
    modules = [{ id: 'core', _sourcePath: coreSourcePath }];
  });

  afterEach(async () => {
    await fs.remove(projectPath);
    await fs.remove(coreSourcePath);
  });

  it('creates references.yml at project root on first deploy', async () => {
    await deployReferencesLibrary(projectPath, modules);
    const refs = path.join(projectPath, 'references.yml');
    expect(await fs.pathExists(refs)).toBe(true);
    expect(await fs.readFile(refs, 'utf-8')).toContain('# template');
  });

  it('does not overwrite an existing references.yml on a second deploy', async () => {
    await deployReferencesLibrary(projectPath, modules);
    const refs = path.join(projectPath, 'references.yml');
    await fs.writeFile(refs, 'version: "1.0"\n# user-edited\n');
    await deployReferencesLibrary(projectPath, modules); // second invocation hits the guard
    expect(await fs.readFile(refs, 'utf-8')).toContain('# user-edited');
  });
});
```

Also keep a lightweight e2e assertion (in the existing init e2e suite) that `references.yml` exists at the project root after a real `init` — locate it with:
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && grep -rln "init" src --include="*.e2e.test.ts"
```

- [ ] **Step 3: Run the unit test — expect fail (import error)**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx jest init.references 2>&1 | tail -15
```
Expected: FAIL — `deployReferencesLibrary` is not exported / does not exist yet.

- [ ] **Step 4: Add the (exported) deploy helper to `init.ts`**

In `framework/cli/src/commands/init.ts`, add a copy-once deploy of `references.yml` to the project root. Add this **exported** helper near the other file-creation helpers (e.g. after `createProjectStructure`), resolving the template from the installed `core` module's source path:

```typescript
export async function deployReferencesLibrary(
  projectPath: string,
  modules: ModuleManifest[],
): Promise<void> {
  const core = modules.find((m) => m.id === "core");
  if (!core?._sourcePath) {
    return;
  }
  const templatePath = path.join(
    core._sourcePath,
    "templates",
    "references",
    "references.yml.template",
  );
  const target = path.join(projectPath, "references.yml");

  // Copy-once: never overwrite a user-filled references library.
  if (!(await fs.pathExists(templatePath)) || (await fs.pathExists(target))) {
    return;
  }
  await fs.copy(templatePath, target);
}
```

Call it during init, right after templates are installed (after the `syncTemplates` block around line 261, before the git-hooks step):

```typescript
  // Deploy the external references library (copy-once)
  await deployReferencesLibrary(projectPath, installedModules);
```

> Confirm `ModuleManifest` is imported in `init.ts` (it is used for `installedModules`) and that `_sourcePath` is populated on installed modules (it is — `syncSkills`/`syncTemplates` rely on it). If `installedModules` is named differently at that point in the function, use the actual variable.

- [ ] **Step 5: Run unit + e2e — expect pass**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx jest init.references 2>&1 | tail -10 && npx jest --config jest.e2e.config.cjs init 2>&1 | tail -15
```
Expected: unit PASS (both helper tests), e2e PASS (`references.yml` present after real init).

- [ ] **Step 6: Type-check, lint**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx tsc --noEmit && npx eslint src/commands/init.ts --quiet
```
Expected: 0 errors.

- [ ] **Step 7: Confirm source survived, then commit**

The e2e run may trigger prepare-publish/teardown reversion (MEMORY.md). Verify the edit is still in source BEFORE committing:
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager && grep -n "export async function deployReferencesLibrary" framework/cli/src/commands/init.ts && grep -n "deployReferencesLibrary(projectPath" framework/cli/src/commands/init.ts
```
Expected: both match (definition + call site). If missing, re-apply the edit before committing. Then:
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager && git add framework/modules/core/templates/references framework/cli/src/commands/init.ts framework/cli/src/commands/__tests__ framework/cli/src/__tests__ && git commit -m "feat(cli): deploy references.yml library on init (copy-once)"
```

---

## Task 5: Rewire the four project-facing agents

**Files:**
- Modify: `framework/modules/coding/agents/ai-app-developer.md`
- Modify: `framework/modules/coding/agents/ai-architect.md`
- Modify: `framework/modules/backlog/agents/ai-backlog-manager.md`
- Modify: `framework/modules/confluence/agents/ai-confluence-manager.md`

> **This is the load-bearing task** (advisor sharpening #3): the prompt rewrite — not the hook — is what makes an agent actually load project knowledge in a main-session slash-command invocation. For each agent: (a) add the mapped `knowing-*` skills to `available-skills` frontmatter, (b) add routing-table rows, (c) **rewrite the `## Required Reading` / `### Context Files` section** to instruct invoking the `knowing-*` skills (replacing the dead `.claude/context/*.md` references), and (d) remove any stale `context-category-needs` prose.

- [ ] **Step 1: Rewire `ai-app-developer.md`** (→ `knowing-the-codebase`, `knowing-the-domain`)

Edit `framework/modules/coding/agents/ai-app-developer.md`:

1. In frontmatter `available-skills`, change:
```yaml
available-skills:
  - using-mcp
```
to:
```yaml
available-skills:
  - using-mcp
  - knowing-the-codebase
  - knowing-the-domain
```

2. In the Skill Routing Table, add rows (after the `MCP Usage` row):
```markdown
| Codebase Knowledge | Available | `knowing-the-codebase` | On-demand |
| Domain Knowledge | Available | `knowing-the-domain` | On-demand |
```

3. Replace the entire `### Context Files` block (the "Load these 3 files before writing code" list and the "Auto-Discovery Note" + "Critical: The technical-advanced.md ..." paragraph) with:
```markdown
### Project Knowledge

**Before writing code, invoke these skills via the Skill tool to load this project's specifics:**

1. **`knowing-the-codebase`** — tech stack, architecture, code conventions, testing & CI, git workflow. **Always invoke before implementing.**
2. **`knowing-the-domain`** — product context, business domain, and users the code serves.

These skills hold YOUR project's specifics (the framework ships them as fillable templates). Consult `references.yml` at the project root for links to deeper external docs and related codebases.
```

4. In `## Critical Reminders` → `**Before Writing Code:**`, replace the line `- ✅ Load technical-advanced.md context` with `- ✅ Invoke knowing-the-codebase (and knowing-the-domain) skills`. In `## Success Criteria`, replace `Code follows project conventions from technical-advanced.md` with `Code follows project conventions from the knowing-the-codebase skill`. In `## Post-Task Self-Evaluation`, replace `Did I follow project conventions from technical-advanced.md?` with `Did I follow project conventions from knowing-the-codebase?`.

- [ ] **Step 2: Rewire `ai-architect.md`** (→ `knowing-the-codebase`, `knowing-the-domain`)

Edit `framework/modules/coding/agents/ai-architect.md`:

1. In frontmatter `available-skills`, add `knowing-the-codebase` and `knowing-the-domain` (preserve existing entries like `validating-markdown`, `using-mcp`).

2. In the Skill Routing Table, add:
```markdown
| Codebase Knowledge | Available | `knowing-the-codebase` | On-demand |
| Domain Knowledge | Available | `knowing-the-domain` | On-demand |
```

3. Replace the entire `## Required Reading` section (the `> **Context:** Auto-loaded via context-category-needs declared in frontmatter` line, the `business-advanced.md`/`technical-advanced.md`/`process-basic.md` list, and the "Critical:" paragraph) with:
```markdown
## Project Knowledge

**Before creating architecture documents, invoke these skills via the Skill tool:**

1. **`knowing-the-domain`** — business domain, use cases, users, product context.
2. **`knowing-the-codebase`** — tech stack, chosen patterns, file structure, conventions, testing & CI.

These skills hold YOUR project's specifics (shipped as fillable templates). Consult `references.yml` at the project root for deeper external references and architecture templates.
```

4. Search the rest of the file for any remaining `technical-advanced.md` / `business-advanced.md` / `process-basic.md` / `context file` references in step "Reference" notes and the Self-Evaluation checklist; replace each with the corresponding `knowing-*` skill (technical-advanced → knowing-the-codebase; business-advanced → knowing-the-domain). Example: `> **Reference:** See technical-advanced.md for project-specific architecture patterns` → `> **Reference:** Invoke knowing-the-codebase for project-specific architecture patterns`. Run after editing:
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager && grep -n -e "technical-advanced\|business-advanced\|process-basic\|context-category-needs\|context file" framework/modules/coding/agents/ai-architect.md
```
Expected after edits: no matches.

- [ ] **Step 3: Rewire `ai-backlog-manager.md`** (→ `knowing-backlog`, `knowing-the-domain`)

Edit `framework/modules/backlog/agents/ai-backlog-manager.md`:

1. In frontmatter `available-skills`, add `knowing-backlog` and `knowing-the-domain` (preserve `validating-markdown`, `publishing-confluence`).

2. Add a Skill Routing Table row pair if the table exists; if not, skip (this agent's table format may differ — match its structure).

3. Replace the `## Required Reading` section (the "Load these context files" intro + `business-advanced.md`/`technical-basic.md`/`process-advanced.md` list) with:
```markdown
## Project Knowledge

**Before creating epics and stories, invoke these skills via the Skill tool:**

1. **`knowing-backlog`** — Jira project, workflow states, ticket conventions, definition of ready/done.
2. **`knowing-the-domain`** — business domain, use cases, and product roadmap.

These skills hold YOUR project's specifics (shipped as fillable templates). Consult `references.yml` at the project root for the Jira board, Confluence space, and process docs.
```

4. Search for remaining stale references and replace:
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager && grep -n -e "process-advanced\|business-advanced\|technical-basic\|context file\|project context" framework/modules/backlog/agents/ai-backlog-manager.md
```
Replace `Load \`process-advanced.md\` context` → `Invoke knowing-backlog`; `verify against project context files` → `verify against knowing-backlog and knowing-the-domain`. Re-run grep; expected: no stale context-file matches.

- [ ] **Step 4: Rewire `ai-confluence-manager.md`** (→ `knowing-the-domain`, `knowing-backlog`)

Edit `framework/modules/confluence/agents/ai-confluence-manager.md`:

1. In frontmatter `available-skills`, add `knowing-the-domain` and `knowing-backlog` (preserve `validating-markdown`).

2. Replace the `## Required Reading` → `### Context Files` block (the "Load these context files" intro + `business-basic`/`technical-basic`/`process-basic` list) with:
```markdown
## Project Knowledge

**Before managing documentation, invoke these skills via the Skill tool:**

1. **`knowing-the-domain`** — documentation standards, page conventions, and product context.
2. **`knowing-backlog`** — workflow and Confluence space conventions (space keys, page hierarchy).

These skills hold YOUR project's specifics (shipped as fillable templates). Consult `references.yml` at the project root for the Confluence space and related docs.
```

- [ ] **Step 5: Verify no agent retains a dead context-file reference**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager && grep -rn -e "Context Files" -e "context/.*\.md" -e "business-basic\|business-advanced\|technical-basic\|technical-advanced\|process-basic\|process-advanced" -e "context-category-needs" -e "Auto-Discovery" framework/modules/coding/agents framework/modules/backlog/agents framework/modules/confluence/agents
```
Expected: no matches (the four agents are clean). The `> **Auto-Discovery:**` note lines may remain only if they reference discovery generically without context — but per spec they describe the old `ai/registries` paths; if a line still says "Required skills are automatically discovered ... `{project}/ai/registries/`", leave it (that is discovery, not context — Plan 4 doc rewrite owns those generic stale path strings). The grep target is **context** references specifically.

- [ ] **Step 6: Run the framework-validator integration suite (available-skills must resolve)**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx jest --config jest.integration.config.cjs framework-validator 2>&1 | tail -20
```
Expected: PASS — each agent's new `available-skills` entries (`knowing-*`) resolve to the real skills created in Task 1. No `available-skills` reference errors.

- [ ] **Step 7: Lint (markdown is config-exempt for tsc); run agent/registry tests**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx jest agent-generator registry-generator 2>&1 | tail -15
```
Expected: PASS. If any test asserts a specific `available-skills` set for these agents, update it to include the new `knowing-*` entries.

- [ ] **Step 8: Commit**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager && git add framework/modules/coding/agents framework/modules/backlog/agents framework/modules/confluence/agents framework/cli/src && git commit -m "feat(agents): wire knowing-* skills into project-facing agents

Replace dead .claude/context/*.md Required Reading with on-demand
knowing-the-codebase/domain/backlog skill invocation. Add to
available-skills and routing tables for all four project-facing agents."
```

---

## Task 6: Deployed CLAUDE.md + next-steps guidance

**Files:**
- Modify: `framework/cli/src/commands/init.ts`
- Test: init e2e suite

> **Scope:** this edits the **init-generated** CLAUDE.md (what a NEW scaffolded project gets) + the init console "next steps". It does NOT touch this repo's own root `CLAUDE.md` (that is Plan 4's doc rewrite). The deployed CLAUDE.md instruction is the second load-bearing defense (advisor #3).

- [ ] **Step 1: Write the failing e2e assertion**

In the init e2e test, add an assertion that the generated `CLAUDE.md` contains a project-knowledge instruction:

```typescript
it('generated CLAUDE.md instructs invoking knowing-* skills', async () => {
  const claudeMd = await fs.readFile(path.join(projectDir, 'CLAUDE.md'), 'utf-8');
  expect(claudeMd).toContain('knowing-the-codebase');
  expect(claudeMd).toContain('references.yml');
});
```

- [ ] **Step 2: Run — expect fail**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx jest --config jest.e2e.config.cjs init -t "knowing" 2>&1 | tail -15
```
Expected: FAIL — CLAUDE.md has no such content.

- [ ] **Step 3: Add the Project Knowledge section to the generated CLAUDE.md**

In `framework/cli/src/commands/init.ts`, in `createEntryPoints`, extend `frameworkContent` (insert a section before `## Navigation`):

```typescript
## Project Knowledge

Before any project work, invoke the relevant project-knowledge skill via the Skill tool:

- **knowing-the-codebase** — tech stack, architecture, conventions, testing & CI, git workflow (before writing code or designing).
- **knowing-the-domain** — platform, business domain, users, product context (before product/ticket/doc work).
- **knowing-backlog** — Jira project, workflow, ticket conventions, integration config (before backlog/Confluence work).

These ship as fillable templates in \`.claude/skills/\` — fill them in for your project. External docs, APIs, and related codebases are indexed in \`references.yml\` at the project root.

`;
```

(Place it so it sits between the Quick Start/agents content and `## Navigation`; keep the existing backtick-escaping style used in the template literal.)

- [ ] **Step 4: Update the init "next steps" console output**

In `framework/cli/src/commands/init.ts` (around line 491), update the steps so the user is told to fill in knowledge skills + references. Replace step 2:
```typescript
  console.log(
    chalk.dim("  2. Add custom skills to .claude/skills/project/ (optional)"),
  );
```
with:
```typescript
  console.log(
    chalk.dim(
      "  2. Fill in project knowledge: .claude/skills/knowing-the-codebase|knowing-the-domain|knowing-backlog and references.yml",
    ),
  );
  console.log(
    chalk.dim("  3. Add custom skills to .claude/skills/project/ (optional)"),
  );
```
and renumber the subsequent steps (the `/ai-*` step becomes 4, the MCP-seed step becomes 5). Update the literal numbers `3.`/`4.` accordingly.

- [ ] **Step 5: Run e2e — expect pass**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx jest --config jest.e2e.config.cjs init 2>&1 | tail -20
```
Expected: PASS (the new test + existing init e2e). If an existing test asserts exact next-step strings/numbering, update it to the new text.

- [ ] **Step 6: Type-check, lint, unit**

```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx tsc --noEmit && npx eslint src/commands/init.ts --quiet && npx jest init 2>&1 | tail -10
```
Expected: 0 errors, unit PASS.

- [ ] **Step 7: Confirm source survived, then commit**

The e2e run may trigger source reversion (MEMORY.md). Verify the generated-CLAUDE.md edit is still in source BEFORE committing:
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager && grep -n "## Project Knowledge" framework/cli/src/commands/init.ts && grep -n "Fill in project knowledge" framework/cli/src/commands/init.ts
```
Expected: both match. If missing, re-apply before committing. Then:
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager && git add framework/cli/src/commands/init.ts framework/cli/src/__tests__ && git commit -m "feat(cli): instruct knowing-* skills + references.yml in generated CLAUDE.md and init next-steps"
```

---

## Final Verification (after all tasks)

> Full gate = build (`npx tsc`) + lint + unit + integration + e2e. Run each suite with a filter or as the full config; **never** `npm run build` (reverts source).

- [ ] **Step 1: Type-check the whole CLI**
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 2: Lint**
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx eslint . --quiet 2>&1 | tail -10
```
Expected: 0 errors (pre-existing warnings acceptable).

- [ ] **Step 3: Unit suite**
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx jest 2>&1 | tail -12
```
Expected: all PASS.

- [ ] **Step 4: Integration suite**
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx jest --config jest.integration.config.cjs 2>&1 | tail -12
```
Expected: all PASS.

- [ ] **Step 5: E2E suite**
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager/framework/cli && npx jest --config jest.e2e.config.cjs 2>&1 | tail -12
```
Expected: all PASS.

- [ ] **Step 6: Confirm no dead context-file references remain in the four agents**
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager && grep -rn -e "business-basic\|business-advanced\|technical-basic\|technical-advanced\|process-basic\|process-advanced" -e "Context Files" -e "context-category-needs" framework/modules/coding/agents framework/modules/backlog/agents framework/modules/confluence/agents
```
Expected: no matches.

- [ ] **Step 7: Confirm the three skills + capabilities are registered and orphans gone**
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager && grep -n -e "knowing-the-codebase\|knowing-the-domain\|knowing-backlog\|codebase-knowledge\|domain-knowledge\|backlog-knowledge\|context-authoring\|context-validation\|context-loading-knowledge" framework/modules/core/module.json
```
Expected: the 3 skills + 3 new capabilities present; the 3 `context-*` capabilities absent.

- [ ] **Step 8: Working tree clean**
```bash
cd /Users/antonborodulin/Projects/cc-backlog-manager && git status --short && git log --oneline -8
```
Expected: clean tree; 6 Plan-3 commits on top of Plan 2.

- [ ] **Step 9: Complete development**

Use **superpowers:finishing-a-development-branch** to verify tests, present options, and execute the chosen workflow.

---

## Self-Review (writing-plans checklist)

- **Spec coverage:** §5 (3 knowledge skills as fillable core skills, `available-skills` + prompt + CLAUDE.md wiring, NOT capability-needs) → Tasks 1,5,6. §6.1 (rewrite Required Reading) → Task 5. §7 (`references.yml` in core, deployed by init, filled per-project) → Task 4. Risk-table "skip risk" mitigations (available-skills + prompt + CLAUDE.md + skill-reminder) → Tasks 1,5,6. ✅
- **Out of scope (correctly deferred to Plan 4):** removing `routes.yml`/`routes sync`, dropping `validate`/`bump-version`, re-baseline to v1.0.0, rewriting this repo's own root CLAUDE.md/README/docs. Not touched here.
- **Type/name consistency:** `project-knowledge` marker (Task 2 schema, Task 3 guard, Task 1 frontmatter) spelled identically. Capabilities `codebase-knowledge`/`domain-knowledge`/`backlog-knowledge` paired in both SKILL.md and module.json. `references.yml` at project root in all of Tasks 1, 4, 6.
- **Placeholder scan:** SKILL.md bodies intentionally contain `<...>` user-fill placeholders (that is the template's purpose) — not plan placeholders. All code/command steps are concrete.
- **Net-new behavior flagged:** copy-once in `syncSkills` (Task 3) is explicitly called out as a conscious addition beyond the spec's minimize-churn principle, justified by data-loss prevention.
