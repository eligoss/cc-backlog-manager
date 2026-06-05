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
