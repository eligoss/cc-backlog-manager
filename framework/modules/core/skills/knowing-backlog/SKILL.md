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
