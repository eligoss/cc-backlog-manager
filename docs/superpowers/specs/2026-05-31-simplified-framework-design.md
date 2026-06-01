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

Authored as normal skills, **Tier-2 auto-discovered** via `capability-needs`. They
ship in `core` as **templates** that `init` deploys to the project's
`.claude/skills/`, where the user fills them in for their target project.

| Skill | Replaces | Capability | Holds |
|-------|----------|------------|-------|
| `knowing-the-codebase` | technical-* context | `project-technical-knowledge` | Target app's stack, architecture, conventions, **testing & CI**, git workflow |
| `knowing-the-domain` | business-* context | `project-domain-knowledge` | Platform, business domain, users, product context |
| `knowing-backlog` | process-* context | `project-backlog-knowledge` | This project's Jira project key, board/sprint structure, workflow states, ticket-type conventions, labels/components, definition-of-ready/done, Jira/Confluence integration config |

Generic non-backlog process knowledge (CI, testing, git) folds into
`knowing-the-codebase` as technical convention — keeping a clean trio.

**Agent migration:** Each agent's frontmatter swaps `context-category-needs`
(e.g. `technical: advanced`) for the matching `capability-needs` entries
(e.g. `project-technical-knowledge`). No new loading logic required — these are
ordinary skills the existing engine already discovers.

---

## 6. Deleted: The Context Machinery

Every context-coupled artifact, listed for complete removal:

- **Templates:** 9 files `framework/modules/core/templates/context/*-{basic,advanced,expert}.template.md`
- **Level system:** basic/advanced/expert loading + token budgets
- **Frontmatter:** `context-category-needs` on all agents → migrated to `capability-needs` (§5)
- **Registry:** `context.json` generation in `registry-generator.ts`
- **Hook:** the context-loading half of `subagent-context-loader` hook
- **Skills:** `using-context`, `building-context`
- **`module.json`:** the `context:` block in every module manifest
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
3. **Add** the 3 knowledge-skill templates (§5) and `references.yml` template (§7).
4. **Migrate** all agent frontmatter `context-category-needs` → `capability-needs`.
5. **Re-baseline** version to **v1.0.0**; update CLAUDE.md / README for new identity.
6. **Verify**: build, run discovery, confirm no dangling context references, agents
   resolve their `capability-needs`.

This preserves working machinery and renders the simplification as a clean,
reviewable deletion diff.

---

## 11. Success Criteria

- Framework builds and the discovery engine runs with zero references to the deleted
  context system.
- All retained agents resolve their `capability-needs` (including the 3 new knowledge
  capabilities).
- `init` scaffolds a project with 3 fillable knowledge skills + `references.yml`,
  and no context templates or level system.
- Jira/Confluence sync and scaffolding generators work unchanged.
- `writer`, `reporting`, iOS coding artifacts, `routes.yml`, `routes sync`,
  `using-context`, `building-context` are fully removed with no dangling references.
- Repo identity reset to v1.0.0 with updated entry-point docs.

---

## 12. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Orphaned context-emitting code after partial deletion | §6 enumerates every artifact; verify no dangling reference per item |
| Agents lose knowledge that context files used to inject | 3 knowledge skills are Tier-2 auto-discovered; migration maps each old category to a capability |
| `module.json` schema breaks when `context:` block removed | Update `module.schema.json` to drop the `context` property |
| Removing `routes.yml` breaks discovery | Verified independent — discovery reads `skills.json`/`agents.json`, not `routes.yml` |
