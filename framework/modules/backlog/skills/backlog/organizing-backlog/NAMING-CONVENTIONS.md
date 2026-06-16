# Naming Conventions

Detailed rules and examples for naming ticket files in the backlog module.

---

## Core Principles

1. **Consistency:** Same naming pattern throughout lifecycle
2. **Clarity:** Names clearly indicate content
3. **Kebab-Case:** Lowercase with hyphens (no spaces, underscores, or camelCase)
4. **Jira Integration:** Preserve Jira ticket numbers after export
5. **No Redundancy:** Remove duplicate prefixes and redundant words

---

## Ticket Files (Permanent Storage)

### Format

```text
[JIRA-NUMBER]-[title-kebab-case].md
```

### Rules

- Start with Jira ticket number (numeric only, no project prefix)
- Use kebab-case for title (lowercase, hyphens)
- Remove project prefix (e.g., `PROJ-`) from number
- Strip redundant prefixes from title (project-specific prefixes, App:, etc.)
- 2-10 words in title (keep concise)
- NO milestone prefix in filename (use YAML `framework-milestone:` field)
- NO type prefix in filename (use YAML `framework-type:` field)

### Examples

**Stories:**
```text
CORRECT:
1164-forecast-180d-lr-marker-and-timestamps.md
1166-final-drive-divisions-support.md
942-observability-improvements-unified-logging-tracing.md

WRONG:
Feb2026-1164-forecast-180d-lr-marker-and-timestamps.md # No milestone prefix
STORY-1164-forecast-180d.md # No type prefix
PROJ-1164-forecast-180d.md # No project prefix
1164_forecast_180d_lr_marker.md # Use hyphens, not underscores
1164-My-Project-App-Forecast-180d.md # Remove redundant prefixes
```

**Tasks:**
```text
CORRECT:
1032-migrate-to-api-v2-via-centralized-data-layer.md
1172-be-data-platform-snowflake-introduce-sub-components.md
932-observability-improvements-unified-logging-strategy.md

WRONG:
TASK-1032-migrate-to-api-v2.md # No type prefix
1032-My-Project-BE-Migrate-to-API-v2.md # Remove redundant prefixes
```

**Bugs:**
```text
CORRECT:
1315-fix-shimmer-loading-when-changing-analysis-hours.md

WRONG:
BUG-1315-fix-shimmer-loading.md # No type prefix
1315-Bug-Fix-Shimmer-Loading.md # Use lowercase
```

---

## YAML Frontmatter (Type and Milestone Assignment)

**Type Assignment:** Use `framework-type` field (not filename prefix)

```yaml
---
framework-type: story # story, task, bug, epic, spike
---
```

**Milestone Assignment:** Use `framework-milestone` field (not filename prefix)

```yaml
---
framework-milestone: Feb2026 # example milestone code
jira-milestone: "My Project - February 2026 - W3 W5 W7" # example Jira milestone name
---
```

---

## Title Transformation Rules

### Remove Redundant Prefixes

**From Jira Title to Filename:**
```text
Jira Title: "MyProject: App: Asset Component Hours grid: Forecast (+180d)"
Filename: 1164-forecast-180d-lr-marker-and-timestamps.md
 Remove project-specific prefixes and component qualifiers
```

**Common Prefixes to Remove:**
- `[ProjectName]:`
- `App:`
- `BE:`
- `FE:`
- `FS:`
- `[Project]:`
- `[Component]:`

### Preserve Important Context

**Keep meaningful qualifiers:**
```text
GOOD:
1172-be-data-platform-snowflake-introduce-sub-components.md # "be" clarifies backend
1537-fe-make-cache-stale-times-configurable.md # "fe" clarifies frontend

BAD:
1172-data-platform-snowflake-introduce-sub-components.md # Lost backend context
1537-make-cache-stale-times-configurable.md # Lost frontend context
```

---

## Special Cases

### Multi-Word Numbers

```text
CORRECT:
1164-forecast-180d-lr-marker-and-timestamps.md # "180d" treated as one word
1032-migrate-to-api-v2-via-centralized-data-layer.md # "api-v2" treated as one concept

WRONG:
1164-forecast-one-hundred-eighty-d.md # Keep numeric format
1032-migrate-to-api-version-two.md # Keep v2 abbreviation
```

### Acronyms and Abbreviations

```text
CORRECT:
932-observability-improvements-unified-logging-strategy.md
1406-convert-data-layer-methods-to-promise-based-sentry.md

WRONG:
932-observability-improvements-u-l-s.md # Don't abbreviate unnecessarily
1406-convert-d-l-methods-to-p-b-sentry.md # Keep full words
```

---

## Validation Checklist

Before finalizing any filename, check:

- [ ] Uses kebab-case (lowercase, hyphens only)
- [ ] Jira ticket number present (numeric only, no project prefix)
- [ ] No redundant prefixes (project-specific, App:, etc.) in title
- [ ] No milestone prefix in filename (use YAML `framework-milestone:` field)
- [ ] No type prefix in filename (use YAML `framework-type:` field)
- [ ] 2-10 words in title (concise but descriptive)
- [ ] Meaningful context preserved (fe-, be-, etc. where needed)
- [ ] Matches examples in this guide

**Validate with CLI:**
```bash
agentic-framework backlog validate
```

---

## Quick Reference Table

| Ticket Type | YAML Type Field | Format | Example |
|-------------|-----------------|--------|---------|
| Story | `framework-type: story` | `[NUMBER]-[title].md` | `1164-forecast-180d-lr-marker.md` |
| Task | `framework-type: task` | `[NUMBER]-[title].md` | `1032-migrate-to-api-v2.md` |
| Bug | `framework-type: bug` | `[NUMBER]-[title].md` | `1315-fix-shimmer-loading.md` |
| Epic | `framework-type: epic` | `[NUMBER]-[title].md` | `1171-split-final-drive.md` |
| Spike | `framework-type: spike` | `[NUMBER]-[title].md` | `942-investigate-performance.md` |

---

## Migration from Old Naming

If migrating from old naming conventions:

**Old Format (milestone prefix):**
```text
Feb2026-1164-asset-component-hours-grid-forecast.md
```

**New Format (no milestone prefix, YAML assignment):**
```text
1164-forecast-180d-lr-marker-and-timestamps.md

With YAML:
---
framework-milestone: Feb2026 # example milestone code
jira-milestone: "My Project - February 2026 - W3 W5 W7" # example Jira milestone name
---
```

**TypeScript CLI for Batch Rename:**
```bash
# Validate all tickets
agentic-framework backlog validate

# CLI will report any naming violations
```

---

## See Also

- **Ticket Format:** [building-tickets](../building-tickets/SKILL.md) - YAML frontmatter structure
- **Jira Integration:** [JIRA-SOURCE-OF-TRUTH.md](JIRA-SOURCE-OF-TRUTH.md) - "Jira is source of truth" principle
- **CLI Commands:** Backlog module TypeScript CLI for validation and import

---

**Note:** This skill focuses on backlog module architecture. For generic file naming conventions, see framework documentation.
