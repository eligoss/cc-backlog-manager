# Design: cc-backlog-manager — Simplified Framework

**Date:** 2026-05-31
**Status:** Approved (design)
**Author:** Anton Borodulin
**Source framework:** agentic-development-framework v1.9.0
**Target repo:** /Users/antonborodulin/Projects/cc-backlog-manager (v1.0.0)

---

## 1. Context & Goal

The existing `agentic-development-framework` (v1.9.0) is a modular, discovery-driven
framework for AI-assisted development. Its **knowledge/context layer** has grown
heavy: 9 context templates (3 categories × 3 levels), a `context-category-needs`
loading mechanism, level-based budgets, and `context.json` registry generation.

**Goal:** Create a simplified successor, `cc-backlog-manager`, focused on backlog
management, coding, and documentation for Claude Code. Simplification is **surgical**,
targeting the knowledge/context layer specifically — not a ground-up rewrite.

### Non-Goals

- Rewriting the skill-discovery engine (it works and provides value).
- Re-architecting the CLI, generators, or module system.
- Building new context-loading logic.

---

## 2. Guiding Principle: Prune, Don't Rewrite

The skill-discovery engine, scaffolding generators, CLI, and module structure are
proven and stay intact. The cut is surgical:

- **Delete** the context layer and two modules (`writer`, `reporting`).
- **Add** 3 project-knowledge skills + a single external-references file.
- **Migrate** agent frontmatter from `context-category-needs` to `capability-needs`.

This avoids the Big-Bang-Rewrite anti-pattern: maximum continuity, minimum churn.

---

## 3. Architecture Decision

### Context

Once the knowledge/context layer is removed, the open question is *how much
module/registry/CLI machinery survives* — because the modules, generators, and
registries historically exist partly to feed the context/discovery system.

### Considered Alternatives

1. **Option A — Prune & Rewire (maximal continuity).** Keep everything; strip only
   context fields out of `module.json`/generators. *Risk:* half-wired machinery.
2. **Option B — Lean on the Platform.** Rewrite skill loading to use native Claude
   Code skill discovery; shrink modules to plain bundles; delete discovery engine.
   *Risk:* churn rewriting a working system.
3. **Option C — Flat bundle + scripts (maximal simplification).** Drop `module.json`,
   no generators, `init` is a guided copy. *Risk:* discards tools the user wants kept.

### Decision

**Chosen: Option A′ — "Prune, don't rewrite"** (a disciplined A).

**Rationale:** The pain is concentrated in the context layer, not skill discovery.
Skill discovery already does useful work (3-tier loading, capability matching).
A′ deletes precisely the painful layer while keeping proven machinery. It honors the
user's explicit choices: keep modules (pruned), keep `init`/`add`/`remove` and the
scaffolding generators, keep Jira/Confluence sync.

**Trade-offs accepted:**
- Some discovery machinery remains (acceptable — it provides value).
- `module.json` retains structure minus its `context:` block.

**Risk & mitigation:** Risk of orphaned context-emitting code. *Mitigation:* §6 lists
every context-coupled artifact explicitly so deletion is complete, not partial.

---

## 4. Module Structure

| Module | Fate | Notes |
|--------|------|-------|
| `core` | **Keep** | Discovery engine, generators, hooks, shared skills, knowledge-skill templates, `references.yml` template |
| `backlog` | **Keep** | Jira sync, tickets — the headline capability |
| `coding` | **Keep, prune** | Keep `designing-architecture`, `implementing-code`, `structuring-code`, agents `ai-architect`, `ai-app-developer`. **Drop** iOS: `ai-ios-developer`, `ai-hig-reviewer`, `implementing-ios`, `designing-ios-ui` |
| `confluence` | **Keep** | Publishing / ADF conversion |
| `reporting` | **Delete** | — |
| `writer` | **Delete** | — |

`module.json` keeps its shape **except** the `context:` block is removed. The
`provides.capabilities` field and discovery wiring stay intact.

---

## 5. The 3 Knowledge Skills (replace context files)

**Delivery mechanism — on-demand native skills (decided after verifying the engine).**
A code trace established that the framework has two distinct mechanisms:

- The `subagent-context-loader` hook **injects file content** (always present).
- The discovery engine + tiers only **resolve skill names**; a skill's body loads
  only when the agent **invokes** it via the Skill tool. *No tier — including Tier-1
  "essential" — auto-injects skill content.*

The chosen model is **on-demand native skills**: the 3 knowledge skills are ordinary
Claude Code skills in `.claude/skills/`, surfaced by their `description`, invoked when
relevant, and nudged by the `skill-reminder` hook. This is the maximal-simplification
path; the loader hook is deleted entirely (§6).

They ship in `core` as **templates** that `init` deploys to the project's
`.claude/skills/`, where the user fills them in for their target project.

| Skill | Replaces | Holds |
|-------|----------|-------|
| `knowing-the-codebase` | technical-* context | Target app's stack, architecture, conventions, **testing & CI**, git workflow |
| `knowing-the-domain` | business-* context | Platform, business domain, users, product context |
| `knowing-backlog` | process-* context (incl. `backlog/module.json` → `context.process: backlog-workflow.md`) | This project's Jira project key, board/sprint structure, workflow states, ticket-type conventions, labels/components, definition-of-ready/done, Jira/Confluence integration config |

Generic non-backlog process knowledge (CI, testing, git) folds into
`knowing-the-codebase` as technical convention — keeping a clean trio.

**Accepted trade-off & mitigation:** On-demand delivery means knowledge is *not*
guaranteed present — the agent must choose to invoke it. To reduce skip risk:
project-facing agents list the relevant `knowing-*` skill in their `available-skills`
(Tier-3 reference), their prompts carry an explicit instruction to *invoke the relevant
`knowing-*` skill before project work*, and the deployed `CLAUDE.md` states the same.
These skills are **not** wired through `capability-needs` (that path resolves names for
routing tables, not content injection — it would not change the on-demand behavior).

---

## 6. Deleted: The Context Machinery

Every context-coupled artifact, listed for complete removal:

- **Templates:** 9 files `framework/modules/core/templates/context/*-{basic,advanced,expert}.template.md`
- **Level system:** basic/advanced/expert loading + token budgets (incl. `ContextLevel`,
  `getCumulativeContextFiles`, `getContextFilesForAgent` in `discovery-engine.ts`)
- **Frontmatter:** `context-category-needs` **removed** from all agents — in **both** the
  hand-authored source `framework/modules/*/agents/*.md` *and* the generated
  `agents.json` registry (agent-generator merges registry-over-frontmatter, so both must
  be cleared). Not migrated to `capability-needs` — knowledge is on-demand (§5).
- **Hook:** `subagent-context-loader` deleted **entirely** (it is context-only — clean removal)
  and de-registered from `settings.json` hook config.
- **Registry:** `context.json` generation in `registry-generator.ts`; `contextCategoryNeeds`
  field in `AgentDefinition`
- **Skills:** `using-context`, `building-context`
- **`module.json`:** the `context:` block in every module manifest + the `context` property
  in `module.schema.json`
- **CLI:** context-emitting paths in `discovery-engine.ts` / generators (skill & agent
  discovery paths are retained)

Each deletion must be verified to leave no dangling reference (caller, test, schema field).

---

## 7. External References Library (new)

A single curated file — `references.yml` — indexing external docs, API references,
and related codebases that the knowledge skills point at. Lives in `core`, deployed
by `init`, filled per-project.

This is **distinct from** the old internal `routes.yml`. It is the "library of routes
to external docs and codebases" requirement.

---

## 8. Removed: Internal routes.yml

`routes.yml` (internal filesystem navigation) and the `routes sync` command are
**removed**. They served the old "trust directive / don't explore" mandate that suited
6 sprawling modules. In a pruned 4-module framework, native navigation suffices, and
`references.yml` covers external pointers. Skill discovery (`skills.json`/`agents.json`)
does not depend on `routes.yml`, so removal is safe.

The CLAUDE.md "Trust Directive" is relaxed accordingly to permit native navigation.

---

## 9. CLI Scope

**Keep:**
- `init`, `add`, `remove`
- Scaffolding generators: `create-agent`, `create-skill`, `create-module`
  (adapted so they no longer emit context files or `context.json`)
- Jira/Confluence sync: `backlog pull/push/diff/import`, `confluence publish`

**Drop:**
- `validate`, `bump-version`
- `routes sync` (§8)
- writer/reporting CLI commands

---

## 10. Bootstrap / Migration Approach

`cc-backlog-manager` is currently empty (`.git` only). Realize A′ by:

1. **Copy** the `agentic-development-framework` source into `cc-backlog-manager`.
2. **Delete** per §4 (modules), §6 (context machinery), §8 (routes), §9 (CLI).
3. **Update build/publish machinery** that enumerates modules (e.g.
   `scripts/prepare-publish.js`, sync/bundle logic) so deleting `writer`/`reporting`
   does not break the build or restore deleted files. *(Verify before relying on
   "copy then delete" — prepare-publish is known to bundle modules and revert source
   edits; it must be updated, not fought.)*
4. **Add** the 3 knowledge-skill templates (§5) + `references.yml` template (§7);
   wire `knowing-*` into project-facing agents' `available-skills` and prompt guidance.
5. **Remove** `context-category-needs` from source agent `.md` frontmatter and from
   `agents.json` (§6) — no capability migration.
6. **Re-baseline** version to **v1.0.0**; update CLAUDE.md / README for new identity.
7. **Verify**: build, run discovery, confirm no dangling context references, agents
   resolve their `capability-needs`, and the 3 knowledge skills are discoverable.

This preserves working machinery and renders the simplification as a clean,
reviewable deletion diff.

---

## 11. Success Criteria

- Framework builds and the discovery engine runs with zero references to the deleted
  context system (no `context-category-needs`, `context.json`, `ContextLevel`, or
  context-loader references anywhere — source, registry, tests, schema).
- All retained agents resolve their `capability-needs`; the 3 knowledge skills are
  present in `.claude/skills/` and surfaced (description-based + `available-skills`).
- `init` scaffolds a project with 3 fillable knowledge skills + `references.yml`,
  and no context templates or level system.
- Jira/Confluence sync and scaffolding generators work unchanged.
- `writer`, `reporting`, iOS coding artifacts, `routes.yml`, `routes sync`,
  `using-context`, `building-context`, `subagent-context-loader` are fully removed
  with no dangling references, and the build/publish step succeeds post-deletion.
- Repo identity reset to v1.0.0 with updated entry-point docs.

---

## 12. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Orphaned context-emitting code after partial deletion | §6 enumerates every artifact; verify no dangling reference per item |
| Agent proceeds without loading project knowledge (on-demand skip risk — accepted) | `knowing-*` in `available-skills`, explicit prompt + CLAUDE.md instruction to invoke before project work, `skill-reminder` nudges |
| Frontmatter edits reverted by generators/publish | `context-category-needs` cleared in both source `.md` and `agents.json`; build/publish machinery updated (§10 step 3); verify after a build |
| Deleting modules breaks build/publish enumeration | Update `prepare-publish.js`/bundle logic before relying on copy-then-delete (§10 step 3) |
| `module.json` schema breaks when `context:` block removed | Update `module.schema.json` to drop the `context` property |
| Removing `routes.yml` breaks discovery | Verified independent — discovery reads `skills.json`/`agents.json`, not `routes.yml`; `subagent-context-loader` also used `routes.yml` for root-detection and is being deleted, so re-confirm no other consumer |
