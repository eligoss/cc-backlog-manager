---
title: CLI Command Reference
description: Complete reference for all CLI commands organized by module and category
audience: user
last-updated: 2025-12-27
---

# CLI Command Reference

## Overview

The Agentic Framework CLI provides commands for creating, validating, and syncing artifacts. Each command is implemented by a specific skill, making the framework executable and not just instructional.

## Installation

```bash
npm install -g agentic-framework
```

Or use via npx:

```bash
agentic-framework <command>
```

## Context-Aware Commands

All CLI commands work from any subdirectory within a project. The CLI automatically detects the project root by walking up the directory tree.

**Detection Priority:**
1. `.agentic-framework.json` - Primary marker
2. `routes.yml` + `CLAUDE.md` - Secondary marker
3. `.git` + `CLAUDE.md` - Fallback for git repos

```bash
# Works from any subdirectory:
cd /my-project/.claude/backlog/tickets/stories
agentic-framework status  # Finds project root automatically

# Path resolution uses routes.yml with sensible defaults
agentic-framework backlog validate  # Uses routes.yml backlog.tickets path
```

## Command Categories

### Create Commands

Create artifacts from templates with automatic numbering and structure.

| Command | Skill | Module | Description |
|---------|-------|--------|-------------|
| `backlog create-ticket` | building-tickets | backlog | Create a new ticket from template |
| `confluence create-page` | publishing-confluence | confluence | Create and publish a Confluence page |

### Validate Commands

Validate artifact structure and content against schemas and best practices.

| Command | Skill | Module | Description |
|---------|-------|--------|-------------|
| `build` | core | core | **Unified validation** with compile-time-like checking |
| `backlog validate` | building-tickets | backlog | Validate ticket files against v10.1.1 standards |
| `backlog diff` | organizing-backlog | backlog | Compare local tickets against Jira remote state |
| `confluence validate` | converting-adf | confluence | Validate markdown for ADF conversion |
| `validate --links` | validating-links | core | Validate markdown links in documentation |
| `validate --versions` | managing-versions | core | Validate version consistency across modules |

### Sync Commands

Bidirectional synchronization with external systems.

| Command | Skill | Module | Description |
|---------|-------|--------|-------------|
| `backlog pull` | organizing-backlog | backlog | Pull tickets from Jira REST API and create/update local markdown files |
| `backlog push` | organizing-backlog | backlog | Push local ticket changes to Jira |

### Export/Import Commands

Export data to or import data from external systems.

| Command | Skill | Module | Description |
|---------|-------|--------|-------------|
| `backlog import` | organizing-backlog | backlog | Import tickets from Jira |
| `confluence import-reports` | publishing-confluence | confluence | Import reports to Confluence |

### Update/Migrate Commands

Update configurations and migrate data structures.

| Command | Skill | Module | Description |
|---------|-------|--------|-------------|
| `bump-version` | managing-versions | core | Bump framework version |
| `backlog migrate-milestones` | organizing-backlog | backlog | Migrate milestone structure |
| `backlog update-fields` | organizing-backlog | backlog | Update ticket field mappings |

### Fetch Commands

Retrieve data from external systems.

| Command | Skill | Module | Description |
|---------|-------|--------|-------------|
| `confluence fetch-page` | publishing-confluence | confluence | Fetch Confluence page content |

## Detailed Command Usage

### Build Command (Unified Validation)

The `build` command provides compile-time-like validation for framework artifacts. It consolidates schema validation, link checking, and cross-reference verification into a single command.

#### `build`

Validate framework artifacts with unified reporting.

**Usage:**
```bash
agentic-framework build [options]
```

**Options:**
- `-p, --path <path>`: Project path (default: current directory)
- `-q, --quick`: Quick mode - schema validation only (skip links)
- `--external-links`: Also check external URLs (slower)
- `--emit-schemas`: Generate JSON schemas for WebStorm/IDE
- `--schema-dir <dir>`: Output directory for JSON schemas (default: `.idea/jsonSchemas`)
- `--json`: Output results as JSON
- `-v, --verbose`: Show detailed output with suggestions
- `--ci`: CI mode - minimal output, strict exit codes

**What It Validates:**

1. **Schema Validation**
   - Agent frontmatter (name, capability-needs, context-category-needs, variant)
   - Skill frontmatter (id, name, capabilities-provided)
   - Type checking with Zod schemas

2. **Cross-Reference Validation**
   - `capability-needs` resolve to `capabilities-provided`
   - `delegates-to` references exist
   - `parent-agent` references exist
   - Slim agents are referenced by their parent

3. **Link Validation** (unless `--quick`)
   - Internal file links exist
   - Anti-pattern detection (backticked paths, unlinked references)

**Examples:**

```bash
# Full build with all validations
agentic-framework build

# Quick build (schema only)
agentic-framework build --quick

# Build with verbose output
agentic-framework build -v

# CI mode (minimal output, strict exit codes)
agentic-framework build --ci

# Generate IDE schemas
agentic-framework build --emit-schemas

# Generate schemas to custom directory
agentic-framework build --emit-schemas --schema-dir ./schemas

# JSON output for tooling integration
agentic-framework build --json
```

**Example Output:**

```
Building framework...

Framework Build Report
────────────────────────────────────────────────────────────

framework/modules/coding/agents/ai-broken.md
  ✗ AGENT_INVALID_TYPE:3 [capability-needs]
    Expected array, got string
    → Expected array, got string

framework/modules/core/skills/shared-test/SKILL.md
  ⚠ CAPABILITY_NOT_FOUND [capability-needs]
    Unknown capability 'nonexistent-capability'
    → Did you mean: git-workflow-management, quality-assurance?

────────────────────────────────────────────────────────────
Checked: 12 agents, 8 skills
Capabilities validated: 15
Duration: 234ms

✗ Build failed
  1 error(s), 1 warning(s)
```

**IDE Integration (WebStorm):**

Run with `--emit-schemas` to generate JSON schemas that enable:
- YAML frontmatter validation in WebStorm
- Autocomplete for agent/skill fields
- Type checking in the editor

The generated schemas are placed in `.idea/jsonSchemas/` by default, where WebStorm automatically discovers them.

**Exit Codes:**
- `0`: Build passed (no errors)
- `1`: Build failed (errors found)

**When to Use:**

| Scenario | Command |
|----------|---------|
| Pre-commit hook | `agentic-framework build --quick` |
| CI pipeline | `agentic-framework build --ci` |
| Local development | `agentic-framework build -v` |
| IDE setup | `agentic-framework build --emit-schemas` |
| Full validation | `agentic-framework build` |

---

### Backlog Module Commands

#### `backlog create-ticket`

Create a new ticket from template.

**Skill:** building-tickets
**Template:** ticket.md.template

**Usage:**
```bash
agentic-framework backlog create-ticket [options]
```

**Options:**
- `-t, --type <type>`: Ticket type (story, task, bug, epic, spike)
- `-p, --path <path>`: Output directory (default: ./backlog)
- `-n, --name <name>`: Ticket name in kebab-case (auto-generated if not provided)
- `-s, --summary <summary>`: Ticket summary/title
- `--dry-run`: Preview template without creating file

**Examples:**
```bash
# Create a story ticket
agentic-framework backlog create-ticket --type story --summary "Add user authentication"

# Create a bug ticket with preview
agentic-framework backlog create-ticket --type bug --name BUG-001 --dry-run

# Create ticket in custom location
agentic-framework backlog create-ticket --type task --path ./my-backlog --summary "Update docs"
```

#### `backlog validate`

Validate ticket files against v10.1.1 standards.

**Skill:** building-tickets
**Schema:** ticket.schema.json

**Usage:**
```bash
agentic-framework backlog validate [path] [options]
```

**Options:**
- `-v, --verbose`: Show detailed validation progress
- `--schema-only`: Only run JSON Schema validation
- `--rules-only`: Only run business rules validation

**Examples:**
```bash
# Validate all tickets in backlog
agentic-framework backlog validate ./backlog

# Verbose validation
agentic-framework backlog validate --verbose

# Schema validation only
agentic-framework backlog validate --schema-only
```

#### `backlog import`

Import tickets from Jira.

**Skill:** organizing-backlog

**Usage:**
```bash
agentic-framework backlog import [options]
```

**Examples:**
```bash
# Import tickets from Jira
agentic-framework backlog import --source jira --project MYPROJ
```

#### `backlog migrate-milestones`

Migrate milestone structure.

**Skill:** organizing-backlog

**Usage:**
```bash
agentic-framework backlog migrate-milestones [options]
```

**Examples:**
```bash
# Migrate milestone structure to new format
agentic-framework backlog migrate-milestones --from-version 1.0 --to-version 2.0
```

#### `backlog update-fields`

Update ticket field mappings.

**Skill:** organizing-backlog

**Usage:**
```bash
agentic-framework backlog update-fields [options]
```

**Examples:**
```bash
# Update field mappings
agentic-framework backlog update-fields --mapping ./field-mapping.json
```

#### `backlog pull`

Pull tickets from Jira REST API and create or update local markdown files.

**Skill:** organizing-backlog
**Prerequisites:** `backlog.config.json` in project root

**Usage:**
```bash
agentic-framework backlog pull [options]
```

**Options:**
- `--ticket <id>`: Pull a specific ticket by Jira ID
- `--sprint <name>`: Filter by sprint name
- `--version <name>`: Filter by fix version name
- `--dry-run`: Preview changes without writing files
- `-v, --verbose`: Show detailed output
- `-p, --path <path>`: Project path (default: current directory)
- `--env <file>`: Path to environment file for Jira credentials

**Examples:**
```bash
# Pull all tickets
agentic-framework backlog pull

# Pull a specific ticket
agentic-framework backlog pull --ticket PROJ-100

# Pull tickets for a specific sprint
agentic-framework backlog pull --sprint "Sprint 12"

# Pull tickets for a fix version
agentic-framework backlog pull --version "v2.1.0"
```

#### `backlog diff`

Compare local tickets against Jira remote state and report differences.

**Skill:** organizing-backlog
**Prerequisites:** `backlog.config.json` in project root

**Usage:**
```bash
agentic-framework backlog diff [options]
```

**Options:**
- `--ticket <id>`: Diff a specific ticket by ID
- `--sprint <name>`: Filter comparison to a sprint
- `--version <name>`: Diff tickets in a specific version
- `-p, --path <path>`: Project path (default: current directory)
- `--env <file>`: Path to environment file for Jira credentials

**Output format:**

| Status | Meaning |
|--------|---------|
| `in sync` | Local and remote are identical |
| `remote newer` | Jira has changes not reflected locally |
| `local newer` | Local has changes not pushed to Jira |
| `conflict` | Both local and remote have diverged |
| `local only` | Ticket exists locally but not in Jira |

**Examples:**
```bash
# Diff all tickets
agentic-framework backlog diff

# Diff a specific ticket
agentic-framework backlog diff --ticket PROJ-123

# Diff tickets in a sprint
agentic-framework backlog diff --sprint "Sprint 12"

# Diff tickets in a version
agentic-framework backlog diff --version "v2.1.0"
```

#### `backlog push`

Push local ticket changes to Jira.

**Skill:** organizing-backlog
**Prerequisites:** `backlog.config.json` in project root

**Usage:**
```bash
agentic-framework backlog push [options]
```

**Options:**
- `--ticket <id...>`: Push one or more specific tickets by ID
- `--all`: Push all tickets with local changes
- `--sprint <name>`: Push all locally-changed tickets in a specific sprint
- `--force`: Override conflict detection and push regardless
- `--dry-run`: Preview changes without pushing to Jira
- `-v, --verbose`: Show detailed output
- `-p, --path <path>`: Project path (default: current directory)
- `--env <file>`: Path to environment file for Jira credentials

**Modes:**

| Mode | When Used |
|------|-----------|
| CREATE | Ticket exists locally but not yet in Jira (`local only`) |
| UPDATE | Ticket exists in Jira and local changes are to be applied |

**Conflict detection:** By default, `push` refuses to overwrite tickets where Jira has newer changes than the local copy. Use `--force` to override this safeguard.

**Examples:**
```bash
# Push all tickets with local changes
agentic-framework backlog push --all

# Push a specific ticket
agentic-framework backlog push --ticket PROJ-123

# Push all changed tickets in a sprint
agentic-framework backlog push --sprint "Sprint 12"

# Dry run to preview what would be pushed
agentic-framework backlog push --all --dry-run

# Force push, ignoring conflicts
agentic-framework backlog push --ticket PROJ-123 --force
```

### Confluence Module Commands

#### `confluence create-page`

Create and publish a Confluence page.

**Skill:** publishing-confluence

**Usage:**
```bash
agentic-framework confluence create-page [options]
```

**Options:**
- `--title <title>`: Page title
- `--space <key>`: Confluence space key
- `--parent <id>`: Parent page ID (optional)
- `--content <path>`: Path to markdown content file
- `--dry-run`: Preview ADF conversion without publishing

**Examples:**
```bash
# Create page from markdown
agentic-framework confluence create-page --title "My Page" --space DEV --content ./page.md

# Create page with parent
agentic-framework confluence create-page --title "Child Page" --space DEV --parent 123456 --content ./child.md

# Dry run
agentic-framework confluence create-page --title "Test" --space DEV --content ./test.md --dry-run
```

#### `confluence fetch-page`

Fetch Confluence page content.

**Skill:** publishing-confluence

**Usage:**
```bash
agentic-framework confluence fetch-page [options]
```

**Options:**
- `--page-id <id>`: Confluence page ID
- `--output <path>`: Output file path (optional, defaults to stdout)
- `--format <format>`: Output format (markdown, adf, html)

**Examples:**
```bash
# Fetch page as markdown
agentic-framework confluence fetch-page --page-id 123456 --format markdown

# Save to file
agentic-framework confluence fetch-page --page-id 123456 --output ./page.md --format markdown

# Fetch as ADF
agentic-framework confluence fetch-page --page-id 123456 --format adf
```

#### `confluence import-reports`

Import reports to Confluence.

**Skill:** publishing-confluence

**Usage:**
```bash
agentic-framework confluence import-reports [options]
```

**Options:**
- `--reports <path>`: Path to reports directory
- `--space <key>`: Confluence space key
- `--parent <id>`: Parent page ID for reports

**Examples:**
```bash
# Import all reports
agentic-framework confluence import-reports --reports ./reports --space DEV --parent 123456
```

#### `confluence validate`

Validate markdown for ADF conversion.

**Skill:** converting-adf

**Usage:**
```bash
agentic-framework confluence validate [path] [options]
```

**Options:**
- `--strict`: Fail on warnings
- `--fix`: Automatically fix common issues

**Examples:**
```bash
# Validate markdown file
agentic-framework confluence validate ./page.md

# Validate with auto-fix
agentic-framework confluence validate ./page.md --fix

# Strict validation
agentic-framework confluence validate ./page.md --strict
```

### Core Module Commands

#### `validate --links`

Validate markdown links in documentation.

**Skill:** validating-links

**Usage:**
```bash
agentic-framework validate --links [path]
```

**Examples:**
```bash
# Validate all links in current directory
agentic-framework validate --links

# Validate links in specific directory
agentic-framework validate --links ./docs
```

#### `validate --versions`

Validate version consistency across modules.

**Skill:** managing-versions

**Usage:**
```bash
agentic-framework validate --versions
```

**Examples:**
```bash
# Validate all module versions
agentic-framework validate --versions
```

#### `bump-version`

Bump framework version.

**Skill:** managing-versions

**Usage:**
```bash
agentic-framework bump-version [type] [options]
```

**Arguments:**
- `type`: Version bump type (major, minor, patch)

**Options:**
- `--dry-run`: Preview version changes without applying
- `--module <name>`: Bump specific module version

**Examples:**
```bash
# Bump patch version
agentic-framework bump-version patch

# Bump minor version
agentic-framework bump-version minor

# Bump major version
agentic-framework bump-version major

# Dry run
agentic-framework bump-version minor --dry-run

# Bump specific module
agentic-framework bump-version patch --module backlog
```

## Other Core Commands

These commands are provided by the core module:

| Command | Description |
|---------|-------------|
| `init` | Initialize new project with framework |
| `add` | Add module to project |
| `remove` | Remove module from project |
| `list` | List available modules |
| `info` | Show module information |
| `build` | **Unified validation** with compile-time-like checking (recommended) |
| `validate` | Legacy validation (use `build` instead) |
| `update` | Update framework dependencies |
| `status` | Show framework status |
| `sync` | Sync framework configuration |
| `routes` | Manage routes.yml |

### Add Command Details

The `add` command deploys module files to the `.claude/` directory:

#### Deployment Behavior

| File Type | Deployment Location | Purpose |
|-----------|-------------------|---------|
| Agents | `.claude/commands/` | Slash command invocation |
| Skills | `.claude/skills/` | Runtime skill loading |
| Custom Agents | `.claude/agents/` | Task tool invocation |

**Important:** All commands (`init`, `sync`, `add`) use the same SyncEngine for consistent deployment. Files are deployed **only** to `.claude/`, not to any legacy `ai/` directory.

#### Usage

```bash
# Add a module to current project
agentic-framework add backlog

# Add module to specific project
agentic-framework add jira --path /path/to/project

# Add multiple modules
agentic-framework add backlog
agentic-framework add jira
agentic-framework add confluence
```

### Sync Command Details

The `sync` command synchronizes framework files from source modules to deployment locations. Different file types use different update policies to balance framework consistency with user customization.

#### Sync Behavior by File Type

| Category | Policy | Files | User Customization |
|----------|--------|-------|-------------------|
| Skills/Agents | Always overwrite | `.claude/skills/`, `.claude/commands/` | Not supported |
| **Infrastructure** | **Always overwrite** | `.claude/statusline.sh`, `.claude/hooks/` | Not supported |
| Config | Create-only | `.claude/settings.local.json` | Supported |
| Registries | Regenerated | `.claude/registries/*.json` | Not applicable |

**Note**: Infrastructure scripts (statusline, hooks) are framework-managed and always updated during sync to ensure consistency and bug fixes propagate automatically. User configuration files are only created if missing and never overwritten, preserving user customizations.

#### Usage

```bash
# Sync everything (default)
agentic-framework sync

# Sync specific categories
agentic-framework sync --config    # Infrastructure + config files
agentic-framework sync --skills    # Skills only
agentic-framework sync --agents    # Agents only

# Preview changes
agentic-framework sync --dry-run

# Check if sync is needed
agentic-framework sync --check
```

## Command Patterns

### Dry Run Pattern

Many commands support `--dry-run` to preview changes:

```bash
# Preview plan creation
agentic-framework backlog create-ticket --name test --dry-run

# Preview ticket creation
agentic-framework backlog create-ticket --type story --dry-run

# Preview Jira export
agentic-framework jira export --tickets ./backlog --dry-run
```

### Validation Pattern

Validation commands typically support `--strict` mode:

```bash
# Strict plan validation
agentic-framework backlog validate --strict

# Strict link validation
agentic-framework validate --links --strict
```

### Path Pattern

Most commands accept path arguments or options:

```bash
# Specific path
agentic-framework backlog create-ticket --path /path/to/project

# Current directory (default)
agentic-framework backlog validate
```

## Skill-CLI Integration

Each CLI command is implemented by a specific skill. To learn more about the implementation details:

1. Check the skill documentation in `framework/modules/<module>/skills/<skill>/SKILL.md`
2. Review the skill's `cli-commands` section in YAML frontmatter
3. Examine the command implementation in `framework/cli/src/commands/<module>/<command>.ts`

## Error Handling

All commands return appropriate exit codes:

- `0`: Success
- `1`: Validation errors or command failure
- `2`: Invalid arguments or usage

Use these codes in CI/CD pipelines:

```bash
#!/bin/bash
set -e

# Will exit on validation failure
agentic-framework backlog validate --strict

# Will exit on broken links
agentic-framework validate --links

echo "All validations passed!"
```

## Configuration

Commands can be configured via:

1. `.agentic-framework.json` in project root
2. Environment variables with `AGENTIC_` prefix
3. Command-line options (highest priority)

### `backlog.config.json`

Required by `backlog pull`, `backlog diff`, and `backlog push` for Jira REST API access. Place this file in the project root.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `jiraProject` | string | Yes | Jira project key (e.g. `MYPROJ`) |
| `jiraBaseUrl` | string | Yes | Jira instance URL (e.g. `https://mycompany.atlassian.net`) |
| `envFile` | string | No | Path to `.env` file with credentials. Default: `.env` |
| `components` | string[] | No | Valid component names for validation. If empty, any string accepted. |
| `defaults.ticketPath` | string | No | Where ticket files are stored. Default: `./backlog/tickets` |
| `defaults.epicPath` | string | No | Where epic files are stored. Default: `./backlog/epics` |
| `defaults.sprintPath` | string | No | Where sprint index files are stored. Default: `./backlog/sprints` |
| `defaults.milestonePath` | string | No | Where milestone index files are stored. Default: `./backlog/milestones` |

**Example `backlog.config.json`:**

```json
{
  "jiraProject": "MYPROJ",
  "jiraBaseUrl": "https://mycompany.atlassian.net",
  "envFile": ".env",
  "components": ["Team: Frontend", "Team: Backend"],
  "defaults": {
    "ticketPath": "./backlog/tickets",
    "epicPath": "./backlog/epics"
  }
}
```

**Credentials** are stored in a `.env` file (not in `backlog.config.json`):

```text
JIRA_EMAIL=you@company.com
JIRA_API_TOKEN=your-api-token
```

Pass a custom env file path via `--env` flag or `envFile` config field.

Example `.agentic-framework.json`:

```json
{
  "jira": {
    "url": "https://mycompany.atlassian.net",
    "project": "MYPROJ"
  },
  "confluence": {
    "url": "https://mycompany.atlassian.net/wiki",
    "space": "DEV"
  },
  "planning": {
    "defaultCategory": "framework"
  }
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Framework Build

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm install -g agentic-framework

      # Unified build command (recommended)
      - run: agentic-framework build --ci

      # Additional validations
      - run: agentic-framework backlog validate --strict
      - run: agentic-framework backlog validate --verbose
```

### Pre-commit Hook Example

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running framework build..."

# Quick build (schema + cross-references)
agentic-framework build --quick || exit 1

echo "Build passed!"
```

### Full CI Pipeline

For comprehensive validation, use the built-in GitHub Action workflow:

```yaml
# .github/workflows/build.yml is already configured
# It runs:
# - Quick build (schema validation)
# - Full build (with links)
# - IDE schema generation
# - External link checking (with lychee)
```

## Agent Commands (SDK Execution)

Run AI agents programmatically via the Claude Agent SDK. Use these commands for automation, CI/CD pipelines, or batch processing.

### List Available Agents

```bash
# List all SDK-enabled agents
agentic-framework agent list

# Output shows agent ID, module, and description
```

### Show Agent Details

```bash
# Show SDK definition for a specific agent
agentic-framework agent show ai-framework-manager

# Output shows:
# - System prompt summary
# - Available tools
# - Sub-agent configuration
```

### Run an Agent

```bash
# Execute agent with a task (requires ANTHROPIC_API_KEY)
agentic-framework agent run ai-framework-manager "Improve context loading"

# Preview without executing (dry-run)
agentic-framework agent run ai-framework-manager "task" --dry-run

# Use a specific model
agentic-framework agent run ai-app-developer "task" --model sonnet

# Resume a previous session
agentic-framework agent run ai-framework-manager "Continue" --session <session-id>
```

### When to Use SDK vs Slash Commands

| Use Case | Approach |
|----------|----------|
| Interactive development | Slash commands (`/ai-framework-manager`) |
| CI/CD pipelines | SDK CLI (`agentic-framework agent run`) |
| Batch processing | SDK CLI with loop/script |
| Exploratory work | Slash commands (conversation context) |
| Scheduled tasks | SDK CLI (cron job) |

### Environment Setup

```bash
# Required for agent execution
export ANTHROPIC_API_KEY=your-api-key

# Optional: Enable debug logging
export DEBUG=agentic:*
```

### Example: CI/CD Integration

```yaml
# GitHub Actions example
- name: Run Framework Audit
  run: |
    agentic-framework agent run ai-framework-manager "Weekly audit" --quiet
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Troubleshooting

### Command Not Found

```bash
# Install globally
npm install -g agentic-framework

# Or use npx
agentic-framework <command>
```

### Validation Failures

Enable verbose mode to see detailed errors:

```bash
agentic-framework backlog validate --verbose
agentic-framework planning validate-plan --path ./plans --strict
```

### Dry Run First

Test commands with `--dry-run` before executing:

```bash
agentic-framework backlog create-ticket --name test --dry-run
agentic-framework jira export --tickets ./backlog --dry-run
```

## See Also

- [CLAUDE.md](/CLAUDE.md) - Framework overview
- [Module Documentation](/framework/modules/) - Detailed module information
- [Skill Documentation](/framework/modules/core/skills/) - Individual skill guides (see each module's skills/ directory)
- [CLI Source Code](/framework/cli/src/commands/) - Command implementations
