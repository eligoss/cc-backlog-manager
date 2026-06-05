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
