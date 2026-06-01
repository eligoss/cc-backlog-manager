# Agentic Framework CLI

TypeScript CLI for scaffolding and managing Agentic Development Framework projects.

## Installation

### GitHub Packages (Recommended)

The package is published to GitHub Packages as `@eligoss/agentic-framework`.

**1. Configure authentication (one-time setup):**

Create or update `~/.npmrc`:

```
@eligoss:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT
```

Replace `YOUR_GITHUB_PAT` with a GitHub Personal Access Token that has `read:packages` scope.

**2. Install globally:**

```bash
npm install -g @eligoss/agentic-framework
```

**3. Or add to your project:**

```bash
npm install @eligoss/agentic-framework
```

### CI/CD Integration

For GitHub Actions, use the built-in `GITHUB_TOKEN`:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '22'
    registry-url: 'https://npm.pkg.github.com'
    scope: '@eligoss'

- name: Install dependencies
  run: npm install
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### From Source (Development)

```bash
git clone https://github.com/agentic-framework/agentic-development-framework
cd agentic-development-framework/framework/cli
npm install
npm run build
npm link
```

## Requirements

- Node.js >= 22.0.0
- npm or yarn

## Quick Start

```bash
# Initialize a new project with core + coding + planning modules
agentic-framework init my-project --modules core,coding,planning

# Navigate to project
cd my-project

# Add additional modules
agentic-framework add jira
agentic-framework add confluence
```

## Commands

### Project Initialization

#### `init <project-name>`

Initialize a new project with selected modules.

```bash
agentic-framework init my-project [options]

Options:
  -m, --modules <modules>  Comma-separated list of modules (default: "core")
  -d, --dir <directory>    Parent directory (default: current directory)
  --no-git                 Skip git initialization
```

**Examples:**

```bash
# Create project with core module only
agentic-framework init my-project

# Create project with specific modules
agentic-framework init my-project --modules core,coding,planning,jira

# Create in specific directory
agentic-framework init my-project --dir ~/projects
```

### Module Management

#### `add <module>`

Add a module to an existing project.

```bash
agentic-framework add <module> [options]

Options:
  -p, --project <path>  Project path (default: current directory)
```

**Examples:**

```bash
# Add jira module
agentic-framework add jira

# Add confluence module to specific project
agentic-framework add confluence --project ~/my-project
```

#### `remove <module>`

Remove a module from a project.

```bash
agentic-framework remove <module> [options]

Options:
  -p, --project <path>  Project path (default: current directory)
```

#### `list`

List all available modules with descriptions.

```bash
agentic-framework list [options]

Options:
  -p, --project <path>  Project path to show installed modules
```

#### `info <module>`

Show detailed information about a specific module.

```bash
agentic-framework info <module>
```

### Framework Validation

#### `validate`

Validate framework integrity and configuration.

```bash
agentic-framework validate [options]

Options:
  -p, --project <path>   Project path (default: current directory)
  --strict               Enable strict validation mode
  --versions             Validate version consistency across modules
  --capabilities         Validate capability resolution
  --context              Validate context files
  --routes               Validate routes.yml configuration
```

**Examples:**

```bash
# Basic validation
agentic-framework validate

# Strict mode with all checks
agentic-framework validate --strict

# Check version consistency
agentic-framework validate --versions
```

### Framework Maintenance

#### `update`

Update framework to latest version.

```bash
agentic-framework update [options]

Options:
  -p, --project <path>  Project path (default: current directory)
```

#### `status`

Show framework and module status.

```bash
agentic-framework status [options]

Options:
  -p, --project <path>  Project path (default: current directory)
```

#### `sync`

Force re-sync skills, agents, and registries.

```bash
agentic-framework sync [options]

Options:
  -p, --project <path>  Project path (default: current directory)
```

#### `routes`

Manage routes.yml synchronization.

```bash
agentic-framework routes [options]

Options:
  -p, --project <path>  Project path (default: current directory)
```

#### `bump-version`

Bump framework version across all modules.

```bash
agentic-framework bump-version [options]

Options:
  -p, --project <path>      Project path (default: current directory)
  -v, --version <version>   New version (e.g., 1.2.0)
  -t, --type <type>         Bump type: major, minor, patch
```

**Examples:**

```bash
# Patch version bump (1.0.0 -> 1.0.1)
agentic-framework bump-version --type patch

# Set specific version
agentic-framework bump-version --version 2.0.0
```

### Backlog Management

#### `backlog import <csv-file>`

Import Jira tickets from CSV export.

```bash
agentic-framework backlog import <csv-file> [options]

Options:
  -o, --output <dir>          Output directory (default: ./backlog/tickets)
  -s, --strategy <strategy>   Import strategy: strict, merge, overwrite, smart (default: smart)
  -d, --duplicates <mode>     Duplicate handling: skip, overwrite, rename (default: skip)
  --dry-run                   Preview changes without writing files
  --interactive               Enable interactive prompts
  --sprint-folder <path>      Sprint folder path
  --milestone-folder <path>   Milestone folder path
```

**Examples:**

```bash
# Smart import with interactive prompts
agentic-framework backlog import export.csv --strategy smart --interactive

# Dry run to preview changes
agentic-framework backlog import export.csv --dry-run

# Overwrite existing tickets
agentic-framework backlog import export.csv --strategy overwrite
```

#### `backlog update-fields`

Bulk update frontmatter fields in markdown files.

```bash
agentic-framework backlog update-fields [options]

Options:
  -p, --path <path>           Target path (default: current directory)
  -f, --field <field>         Field to update
  -v, --value <value>         New value
  -m, --match <pattern>       Only update files matching pattern
```

#### `backlog validate [path]`

Validate backlog ticket files.

```bash
agentic-framework backlog validate [path] [options]

Options:
  --strict                    Enable strict validation
  --fix                       Auto-fix validation errors
```

#### `backlog migrate-milestones [path]`

Migrate milestone files to Jira-based sanitized naming.

```bash
agentic-framework backlog migrate-milestones [path] [options]

Options:
  --dry-run                   Preview changes without renaming files
```

### Jira Integration

#### `jira export [file]`

Export tickets to Jira (CREATE or UPDATE mode).

```bash
agentic-framework jira export [file] [options]

Options:
  -i, --input <path>          Input file or directory
  -m, --mode <mode>           Export mode: create, update (default: create)
  --dry-run                   Preview changes without creating/updating tickets
  --project-key <key>         Jira project key
```

**Examples:**

```bash
# Export single ticket
agentic-framework jira export backlog/tickets/PROJ-123.md

# Export all tickets in directory
agentic-framework jira export backlog/tickets --mode create

# Dry run
agentic-framework jira export backlog/tickets --dry-run
```

**Environment Variables:**

- `JIRA_BASE_URL` - Jira instance URL (e.g., https://your-domain.atlassian.net)
- `JIRA_EMAIL` - Your Jira account email
- `JIRA_API_TOKEN` - Jira API token ([create one](https://id.atlassian.com/manage-profile/security/api-tokens))

### Confluence Integration

#### `confluence create-page`

Create a Confluence page from a markdown file.

```bash
agentic-framework confluence create-page [options]

Options:
  -i, --input <file>          Input markdown file (required)
  -s, --space <key>           Confluence space key (required)
  -t, --title <title>         Page title (default: filename)
  -p, --parent <id>           Parent page ID
  --dry-run                   Preview ADF output without creating page
```

**Examples:**

```bash
# Create page in space
agentic-framework confluence create-page -i report.md -s PROJ -t "Sprint Report"

# Create as child page
agentic-framework confluence create-page -i doc.md -s PROJ -p 123456
```

#### `confluence fetch-page <page-id>`

Fetch a Confluence page and save as markdown.

```bash
agentic-framework confluence fetch-page <page-id> [options]

Options:
  -o, --output <file>         Output markdown file
```

#### `confluence import-reports`

Batch import markdown reports to Confluence.

```bash
agentic-framework confluence import-reports [options]

Options:
  -i, --input <dir>           Input directory containing markdown files
  -s, --space <key>           Confluence space key (required)
  -p, --parent <id>           Parent page ID
  --dry-run                   Preview without creating pages
```

**Environment Variables:**

- `CONFLUENCE_BASE_URL` - Confluence instance URL
- `CONFLUENCE_EMAIL` - Your Confluence account email
- `CONFLUENCE_API_TOKEN` - Confluence API token

### Planning Workflows

#### `planning create-plan`

Create a new plan folder with auto-numbering and templates.

```bash
agentic-framework planning create-plan [options]

Options:
  -n, --name <name>           Plan name (required)
  -t, --type <type>           Plan type: feature, epic, project, phase, sprint
  -p, --parent <path>         Parent directory for plans
  --template <path>           Custom template file
```

**Examples:**

```bash
# Create feature plan
agentic-framework planning create-plan -n "user-authentication" -t feature

# Create epic plan
agentic-framework planning create-plan -n "mobile-app" -t epic

# Create in specific directory
agentic-framework planning create-plan -n "sprint-1" -t sprint -p ./planning
```

## Configuration

### Environment Variables

Create a `.env` file in your project root:

```bash
# Jira Configuration
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token

# Confluence Configuration
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
CONFLUENCE_EMAIL=your-email@example.com
CONFLUENCE_API_TOKEN=your-api-token

# Optional: API Rate Limiting
API_MAX_RETRIES=3
API_RETRY_DELAY=1000
```

### Module Configuration

Each module can be configured via `module.json`:

```json
{
  "id": "core",
  "version": "1.0.0",
  "type": "core",
  "capabilities": ["discovery", "validation"],
  "dependencies": []
}
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test suite
npm test -- src/lib/backlog/__tests__/import-engine.test.ts
```

### Linting

```bash
npm run lint
```

### Watch Mode

```bash
npm run watch
```

## Context-Aware Commands

The CLI provides intelligent project detection and path resolution, allowing commands to work from any subdirectory within a project.

### Project Root Auto-Detection

Commands automatically detect the project root by walking up the directory tree. This means you can run any command from any subdirectory:

```bash
# These all work the same, regardless of your current directory:
cd /my-project/ai/backlog/tickets/stories
agentic-framework status  # Still finds project root

cd /my-project
agentic-framework status  # Works from root too
```

**Detection Strategy (priority order):**

| Priority | Marker | Description |
|----------|--------|-------------|
| 1 | `.agentic-framework.json` | Primary marker (most specific) |
| 2 | `routes.yml` + `CLAUDE.md` | Secondary marker |
| 3 | `.git` + `CLAUDE.md` | Fallback for git repos with framework |

The search stops at the home directory to prevent scanning system files.

### Routes-Based Path Resolution

The CLI uses `routes.yml` for semantic path resolution, ensuring consistent path handling across all commands:

```typescript
// Commands can resolve paths semantically:
const ctx = await CliContext.require();
const ticketsDir = ctx.paths.getTicketPath('story');  // Uses routes.yml
const plansDir = ctx.paths.getPlanPath('framework');  // Fallback to defaults
```

### Using CliContext in Commands

The `CliContext` class provides a unified API for command implementations:

```typescript
import { CliContext, getCliContext } from '../lib/cli-context.js';

// Option 1: Require context (throws if not in project)
async function myCommand() {
  const ctx = await CliContext.require();
  console.log(`Project: ${ctx.projectRoot}`);
  console.log(`Method: ${ctx.detectionMethod}`);

  // Access paths
  const storiesDir = ctx.paths.getTicketPath('story');

  // Check installed modules
  if (ctx.hasModule('backlog')) {
    console.log('Backlog module installed');
  }
}

// Option 2: Optional context (returns null if not in project)
async function flexibleCommand() {
  const ctx = await CliContext.create();
  if (ctx.isInsideProject) {
    // Work with project
  } else {
    // Handle no-project case
  }
}

// Option 3: Helper with automatic error handling
async function commandHandler() {
  const ctx = await getCliContext({ required: true });
  // If we get here, ctx is guaranteed to exist
}
```

**CliContext Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `projectRoot` | `string` | Absolute path to project root |
| `manifest` | `FrameworkManifest \| null` | Parsed `.agentic-framework.json` |
| `isInsideProject` | `boolean` | Whether a valid project was found |
| `detectionMethod` | `DetectionMethod` | How the project was detected |
| `paths` | `PathResolver` | Semantic path resolution |

**CliContext Methods:**

| Method | Description |
|--------|-------------|
| `hasModule(id)` | Check if a module is installed |
| `getModuleVersion(id)` | Get installed module version |
| `getInstalledModules()` | Get all installed module IDs |
| `getFrameworkVersion()` | Get framework version |

## Architecture

The CLI is built with:

- **TypeScript** - Type-safe development
- **Commander.js** - Command-line interface
- **Jest** - Testing framework
- **Axios** - HTTP client for API calls
- **Inquirer** - Interactive prompts
- **Chalk** - Terminal styling
- **Gray-matter** - YAML frontmatter parsing

### Project Structure

```
cli/
├── src/
│   ├── commands/          # CLI command implementations
│   │   ├── backlog/       # Backlog management
│   │   ├── confluence/    # Confluence integration
│   │   ├── jira/          # Jira integration
│   │   └── planning/      # Planning workflows
│   ├── lib/               # Core libraries
│   │   ├── backlog/       # Backlog processing logic
│   │   ├── common/        # Shared utilities
│   │   ├── confluence/    # Confluence client & converters
│   │   ├── jira/          # Jira client & converters
│   │   └── planning/      # Planning utilities
│   └── index.ts           # CLI entry point
├── framework/             # Bundled framework content
├── dist/                  # Compiled JavaScript
└── test/                  # Integration tests
```

## Migration from Python

This CLI is a complete TypeScript rewrite of the original Python implementation. Key improvements:

- **Performance** - Significantly faster execution
- **Type Safety** - Full TypeScript type checking
- **Testing** - 64% code coverage with 1213 passing tests
- **Modularity** - Clean separation of concerns
- **NPM Distribution** - Easy installation via npm
- **No Python Required** - Standalone Node.js application


## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run tests: `npm test`
5. Submit a pull request

## License

MIT

## Support

- Issues: https://github.com/agentic-framework/agentic-development-framework/issues
- Documentation: https://github.com/agentic-framework/agentic-development-framework/wiki
- Publishing Guide: See [docs/publishing.md](../../docs/publishing.md)

## Version

Current version: 1.5.0
