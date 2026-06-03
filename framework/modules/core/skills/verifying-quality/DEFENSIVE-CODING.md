# Defensive Coding Patterns

Patterns for preventing runtime bugs in CLI tools and user-facing code.

**Source:** Analysis of 21 CLI bugs that escaped testing (QA-001 to QA-021)

---

## Pattern 1: Null-Safe Display

**Problem:** User-facing output shows "undefined", "null", "Invalid Date", or "vundefined".

**Root cause:** Missing null checks before displaying values.

### Anti-Pattern

```typescript
// Displays "Invalid Date" if installedAt is undefined
console.log(`Installed: ${new Date(config.installedAt).toLocaleString()}`);

// Displays "vundefined" if version is undefined
console.log(`• ${module.name} v${module.version}`);

// Displays "backlog/tickets/storys" (wrong plural)
const dir = `${type}s`;
```

### Correct Pattern

```typescript
// Safe date display
const dateStr = config.installedAt
  ? new Date(config.installedAt).toLocaleString()
  : 'Unknown';
console.log(`Installed: ${dateStr}`);

// Safe version display
const version = module.version ? `v${module.version}` : '(version unknown)';
console.log(`• ${module.name} ${version}`);

// Safe pluralization with irregular handling
const PLURAL_MAP: Record<string, string> = {
  story: 'stories',
  bug: 'bugs',
  task: 'tasks',
};
const dir = PLURAL_MAP[type] ?? `${type}s`;
```

### Validation Checklist

- [ ] All displayed dates handle undefined/null → "Unknown"
- [ ] All displayed versions handle undefined → "(version unknown)"
- [ ] All string interpolation handles missing values
- [ ] Irregular plurals have explicit mappings

---

## Pattern 2: Path Context Awareness

**Problem:** Commands use wrong path (projectPath vs frameworkRoot confusion).

**Root cause:** Ambiguous "root" variable could mean either path.

### Anti-Pattern

```typescript
// Which root? User's project or CLI installation?
const manifestPath = path.join(root, '.agentic-framework.json');

// Validator uses frameworkRoot, but user files are in projectPath
const validator = new RoutesValidator(ctx.frameworkRoot);

// Template path hardcoded relative to wrong base
const templatePath = '../../../../framework/modules';  // Wrong!
```

### Correct Pattern

```typescript
// Define explicit path context interface
interface PathContext {
  projectPath: string;     // Where user runs command (cwd or detected project root)
  frameworkRoot: string;   // Where CLI source/modules are installed (npm package)
  workingDir: string;      // Current working directory (may differ from projectPath)
}

// Explicit path usage with context
const manifestPath = path.join(ctx.projectPath, '.agentic-framework.json');  // User's file
const templatePath = path.join(ctx.frameworkRoot, 'templates');  // CLI's templates

// Validator receives explicit path
const validator = new RoutesValidator(ctx.projectPath);  // User's project
```

### Path Decision Tree

```
Is this file...
├── Created/owned by user? → Use projectPath
│   Examples: references.yml, .agentic-framework.json, PLAN.md
│
├── Part of CLI package? → Use frameworkRoot
│   Examples: templates, schemas, module definitions
│
└── User's current location? → Use workingDir
    Examples: relative path resolution, current directory check
```

### Validation Checklist

- [ ] PathContext interface defines all path types
- [ ] Each path usage is explicit about which context
- [ ] No ambiguous "root" or "basePath" variables
- [ ] Tests verify path resolution from user context

---

## Pattern 3: Consistent Paths Across Commands

**Problem:** `create-*` and `validate` commands use different paths for same artifacts.

**Root cause:** No shared path constants, each command defines paths independently.

### Anti-Pattern

```typescript
// In create-ticket.ts
const ticketDir = path.join(projectPath, 'backlog/tickets', type);

// In validate.ts (different path!)
const backlogDir = path.join(projectPath, 'ai/backlog');
```

### Correct Pattern

```typescript
// Shared path constants in single location
// paths.ts
export const PATHS = {
  backlog: {
    root: 'backlog',
    tickets: 'backlog/tickets',
    sprints: 'backlog/sprints',
  },
  planning: {
    root: 'ai/plans',
    templates: '.claude/skills/planning-phases/templates',
  },
} as const;

// Both commands use same constants
// create-ticket.ts
const ticketDir = path.join(projectPath, PATHS.backlog.tickets, type);

// validate.ts
const backlogDir = path.join(projectPath, PATHS.backlog.root);
```

### Validation Checklist

- [ ] Path constants defined in single shared module
- [ ] Related commands import from same constants
- [ ] Integration test verifies create → validate works

---

## Pattern 4: Data Normalization at Boundaries

**Problem:** YAML dates parsed as Date objects, validation expects strings.

**Root cause:** Data normalization happens deep in logic, not at input boundary.

### Anti-Pattern

```typescript
// YAML parser returns Date object for unquoted dates
const data = yaml.parse(content);
// data.created is Date object, not string

// Validation expects string, fails with "Expected type string, got object"
schema.validate(data);
```

### Correct Pattern

```typescript
// Normalize at parse boundary
function parseFrontmatter(content: string): Record<string, unknown> {
  const raw = yaml.parse(content);
  return normalizeFrontmatter(raw);
}

function normalizeFrontmatter(data: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...data };

  // Convert Date objects to ISO strings
  if (normalized.created instanceof Date) {
    normalized.created = normalized.created.toISOString().split('T')[0];
  }
  if (normalized.updated instanceof Date) {
    normalized.updated = normalized.updated.toISOString().split('T')[0];
  }

  return normalized;
}
```

### Common Boundary Normalizations

| Input Type | Raw Value | Normalized Value |
|-----------|-----------|-----------------|
| YAML date | `Date` object | ISO string `"2025-12-30"` |
| JSON number | `0` (falsy) | `0` (preserve zero) |
| Empty string | `""` | `undefined` or default |
| Whitespace | `"  value  "` | `"value"` (trimmed) |

### Validation Checklist

- [ ] All parsers (YAML, JSON, CSV) have normalization layer
- [ ] Date objects converted to strings before validation
- [ ] Normalization happens at boundary, not deep in logic
- [ ] Tests use realistic input (unquoted dates, extra whitespace)

---

## Pattern 5: Error Message Quality

**Problem:** Error messages show internal paths, stack traces, or unhelpful information.

**Root cause:** Raw errors propagated to user without transformation.

### Anti-Pattern

```typescript
// Shows internal schema path, not user's file
throw new Error(`Validation failed: ${schemaPath}`);

// Shows stack trace for expected user error
throw new ProjectNotFoundError();  // Without catch at CLI level

// Generic error, user can't fix it
throw new Error('Template not found');
```

### Correct Pattern

```typescript
// Show user-relevant path
throw new Error(`Validation failed for: ${userFilePath}`);

// Catch expected errors at CLI level
try {
  await runCommand();
} catch (e) {
  if (e instanceof ProjectNotFoundError) {
    console.error(e.message);  // Clean message
    process.exit(1);
  }
  throw e;  // Re-throw unexpected errors with stack for debugging
}

// Actionable error with fix suggestion
throw new Error(
  `Template not found: ${templateName}\n` +
  `Run 'agentic-framework add planning' to install planning templates.`
);
```

### Error Message Checklist

| Element | Bad | Good |
|---------|-----|------|
| Path | `/node_modules/cli/dist/schema.json` | `/my-project/PLAN.md` |
| Stack trace | Always shown | Only for unexpected errors |
| Action | "Error occurred" | "Run 'command --fix' to resolve" |
| Context | Generic | Specific to situation |

### Validation Checklist

- [ ] User errors caught at CLI level, show clean message
- [ ] Unexpected errors show stack trace for debugging
- [ ] Error messages contain user-relevant paths
- [ ] Error messages suggest fix when possible

---

## Pattern 6: Feature Flag Completeness

**Problem:** CLI flag documented but not implemented (`--dry-run` doesn't work).

**Root cause:** Flag added to parser but not passed through call chain.

### Anti-Pattern

```typescript
// Flag defined in command
.option('--dry-run', 'Preview changes without applying')

// Handler doesn't use dryRun parameter!
async function handler(options: Options) {
  const result = await doThing();  // dryRun never passed
}
```

### Correct Pattern

```typescript
// Complete chain: define → pass → implement → test
// 1. Define flag
.option('--dry-run', 'Preview changes without applying')

// 2. Pass to handler
async function handler(options: { dryRun?: boolean }) {
  // 3. Implement behavior
  if (options.dryRun) {
    console.log('=== DRY RUN - No changes applied ===');
    return preview(options);
  }
  return execute(options);
}

// 4. Test the flag works
it('should not apply changes in dry-run mode', async () => {
  const before = await fs.readFile(targetFile);
  await exec('npx cli command --dry-run');
  const after = await fs.readFile(targetFile);
  expect(after).toEqual(before);  // No changes
});
```

### Flag Completeness Checklist

For each CLI flag:
- [ ] Flag defined in command options
- [ ] Flag passed to handler function as parameter
- [ ] Handler passes flag to library function
- [ ] Library implements conditional behavior
- [ ] Test verifies flag changes behavior

---

## Pattern 7: Environment Defensive Checks

**Problem:** Code assumes environment (TTY, project context) without checking.

**Root cause:** No defensive checks for environment variations.

### Anti-Pattern

```typescript
// Assumes TTY available, crashes without it
const answer = await readline.question('Confirm? ');

// Assumes inside project, throws raw error
const ctx = CliContext.require();  // Throws if not in project
```

### Correct Pattern

```typescript
// Check TTY before interactive prompt
if (!process.stdin.isTTY) {
  console.error('Error: Interactive confirmation requires a TTY terminal.');
  console.error('Use --force flag to skip confirmation.');
  process.exit(1);
}
const answer = await readline.question('Confirm? ');

// Handle expected "not in project" case
try {
  const ctx = CliContext.require();
} catch (e) {
  if (e instanceof ProjectNotFoundError) {
    console.error(e.message);
    console.error(`Run 'agentic-framework init' to create a project.`);
    process.exit(1);
  }
  throw e;
}
```

### Environment Checks

| Environment | Check | Fallback |
|------------|-------|----------|
| No TTY | `process.stdin.isTTY` | Require `--force` flag |
| Outside project | `CliContext.require()` catch | Clean error + init suggestion |
| Missing dependency | `try/import` | Feature disabled message |
| Paths with spaces | Quote all paths | Use `"${path}"` in commands |

---

## Defensive Coding Checklist

Before submitting code, verify:

### Null-Safe Display
- [ ] All displayed values handle undefined/null
- [ ] Dates show "Unknown" if missing
- [ ] Versions show "(version unknown)" if missing
- [ ] Irregular plurals have explicit mappings

### Path Context
- [ ] PathContext interface defines all path types
- [ ] Each path usage explicit about which context
- [ ] No ambiguous "root" or "basePath" variables
- [ ] Related commands use shared path constants

### Data Normalization
- [ ] Parsers have normalization layer at boundary
- [ ] Date objects converted to strings before validation
- [ ] Tests use realistic input (unquoted dates, whitespace)

### Error Quality
- [ ] User errors show clean message, no stack trace
- [ ] Error messages contain user-relevant paths
- [ ] Error messages suggest fix when possible

### Feature Completeness
- [ ] All flags passed through complete call chain
- [ ] Tests verify each flag changes behavior

### Environment
- [ ] TTY checked before interactive prompts
- [ ] Project context errors caught and handled
- [ ] Paths quoted in shell commands

---

**Source:** Analysis of CLI QA Issues (21 bugs: QA-001 to QA-021)
**Version:** 1.0
**Created:** 2025-12-30
