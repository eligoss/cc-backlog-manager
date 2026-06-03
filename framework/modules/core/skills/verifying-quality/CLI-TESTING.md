# CLI Testing Standards

Standards for testing CLI tools that bridge the gap between developer testing and real-world usage.

**Source:** Analysis of 21 CLI bugs that escaped existing tests (QA-001 to QA-021)

---

## Test Layer Requirements

CLI tools require **four distinct test layers**. Missing any layer creates blind spots.

### Layer 1: Unit Tests (Foundation)

Test isolated functions in isolation:

| What to Test | Example |
|-------------|---------|
| Path resolution logic | `resolveProjectPath()`, `getFrameworkRoot()` |
| Data transformation | `normalizeFrontmatter()`, `formatDate()` |
| Validation logic | `validateTicketSchema()`, `checkRequiredFields()` |
| Null/undefined handling | `formatVersion(undefined)` → `"(version unknown)"` |

**Anti-pattern:** No unit tests exist, only E2E tests.

```typescript
// Unit test for path resolution
describe('resolveProjectPath', () => {
  it('should return projectPath for user files', () => {
    const ctx = { projectPath: '/user/project', frameworkRoot: '/cli/dist' };
    expect(resolveProjectPath(ctx, 'references.yml')).toBe('/user/project/references.yml');
  });

  it('should return frameworkRoot for CLI templates', () => {
    const ctx = { projectPath: '/user/project', frameworkRoot: '/cli/dist' };
    expect(resolveTemplatePath(ctx, 'PLAN.md.template')).toContain('/cli/dist');
  });
});
```

### Layer 2: Integration Tests (Library Level)

Test library functions with real data:

| What to Test | Example |
|-------------|---------|
| File system operations | Create/read/update files |
| Configuration updates | Manifest changes after operations |
| Multi-step workflows | Import → validate → export |

**Anti-pattern:** Tests call library functions but don't verify side effects.

```typescript
// Integration test with state verification
it('should update manifest after adding module', async () => {
  const projectDir = await createTestProject();

  // Act
  await addModule('planning', projectDir);

  // Verify state changed
  const manifest = JSON.parse(await fs.readFile(
    path.join(projectDir, '.agentic-framework.json'), 'utf-8'
  ));
  expect(manifest.modules).toContain('planning');
});
```

### Layer 3: CLI Surface Tests (Critical - Often Missing)

Test actual CLI command execution:

| What to Test | Example |
|-------------|---------|
| Argument parsing | `--dry-run` flag actually works |
| Output formatting | No "undefined", "Invalid Date" in stdout |
| Exit codes | Error returns non-zero exit code |
| Error messages | Clean message, no stack trace for user errors |

**Anti-pattern:** Tests call library directly, skip CLI parsing entirely.

```typescript
// CLI surface test
describe('CLI: status command', () => {
  it('should not show undefined in output', async () => {
    const { stdout } = await exec('agentic-framework status', {
      cwd: testProjectDir
    });

    expect(stdout).not.toMatch(/undefined/i);
    expect(stdout).not.toMatch(/Invalid Date/i);
    expect(stdout).not.toMatch(/vundefined/);
  });

  it('should show clean error outside project', async () => {
    const { stderr, code } = await exec('agentic-framework status', {
      cwd: '/tmp/empty-dir'
    });

    expect(code).toBe(1);
    expect(stderr).toContain('Not inside an Agentic Framework project');
    expect(stderr).not.toContain('at ');  // No stack trace
  });
});
```

### Layer 4: Environment Variation Tests (Robustness)

Test non-standard environments:

| Scenario | What Could Break |
|----------|-----------------|
| No TTY available | Interactive prompts crash |
| Outside project context | Uncaught ProjectNotFoundError |
| Paths with spaces | Unquoted path arguments fail |
| Missing optional deps | Hard dependency on optional feature |

```typescript
// Environment variation tests
describe('Non-TTY environment', () => {
  it('should fail gracefully without TTY', async () => {
    const result = await exec('agentic-framework remove core', {
      stdio: 'pipe'  // No TTY
    });

    expect(result.stderr).toContain('Use --force flag');
    expect(result.code).toBe(1);
  });
});

describe('Paths with spaces', () => {
  it('should handle project path with spaces', async () => {
    const projectDir = '/tmp/My Test Project';
    await fs.ensureDir(projectDir);

    const result = await exec(`agentic-framework init "${projectDir}"`);
    expect(result.code).toBe(0);
  });
});
```

---

## User Context vs Developer Context

### The Core Problem

**Developer context:** Tests run from CLI source directory with direct file access.
**User context:** CLI runs from user's project as installed npm package.

| Aspect | Developer Context | User Context |
|--------|------------------|--------------|
| Working directory | CLI source `/cli/src/` | User project `/my-app/` |
| Template access | Direct file path | Resolved via package |
| Path resolution | Relative to source | Relative to project |
| File system | Full access | Only project files |

### User Context Simulation Pattern

```typescript
// Test infrastructure for user context
async function createUserProject(): Promise<string> {
  const projectDir = path.join(os.tmpdir(), `test-${Date.now()}`);
  await fs.ensureDir(projectDir);

  // Initialize like a real user would
  await exec('agentic-framework init . --no-interactive', {
    cwd: projectDir
  });

  return projectDir;
}

describe('User context tests', () => {
  let userProject: string;

  beforeEach(async () => {
    userProject = await createUserProject();
  });

  afterEach(async () => {
    await fs.remove(userProject);
  });

  it('should find templates from user project', async () => {
    // Run command as user would
    const result = await exec(
      'agentic-framework planning create-plan --name test --dry-run',
      { cwd: userProject }
    );

    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain('Template not found');
  });
});
```

---

## State Verification Patterns

### The Core Problem

Tests check "did it return something" but not "did it change state correctly."

### Pattern: Round-Trip Verification

```typescript
// Verify complete workflow
it('should complete add → use → remove workflow', async () => {
  const project = await createUserProject();

  // Step 1: Add module
  await exec('agentic-framework add planning', { cwd: project });

  // Step 2: Verify module added to manifest
  const manifest = JSON.parse(await fs.readFile(
    path.join(project, '.agentic-framework.json'), 'utf-8'
  ));
  expect(manifest.modules).toContain('planning');

  // Step 3: Verify module's features work
  const result = await exec(
    'agentic-framework planning create-plan --name test --dry-run',
    { cwd: project }
  );
  expect(result.code).toBe(0);

  // Step 4: Remove module
  await exec('agentic-framework remove planning --force', { cwd: project });

  // Step 5: Verify module removed
  const updatedManifest = JSON.parse(await fs.readFile(
    path.join(project, '.agentic-framework.json'), 'utf-8'
  ));
  expect(updatedManifest.modules).not.toContain('planning');
});
```

### Pattern: Side Effect Verification

```typescript
// Verify all side effects, not just return value
it('should create all expected artifacts', async () => {
  const project = await createUserProject();

  await exec('agentic-framework add planning', { cwd: project });

  // Verify manifest updated
  expect(await fs.pathExists(path.join(project, '.agentic-framework.json'))).toBe(true);

  // Verify skills installed
  expect(await fs.pathExists(path.join(project, '.claude/skills/planning-phases'))).toBe(true);
  expect(await fs.pathExists(path.join(project, '.claude/skills/planning-phases'))).toBe(true);

  // Verify agents installed
  expect(await fs.pathExists(path.join(project, '.claude/agents/ai-planning-manager.md'))).toBe(true);
});
```

---

## Output Validation Patterns

### The Core Problem

Tests assert `expect(result).toBeDefined()` without validating content.

### Pattern: Output Content Validation

```typescript
// Validate output content, not just existence
describe('Output validation', () => {
  it('should format dates correctly', async () => {
    const { stdout } = await exec('agentic-framework status');

    // Should show valid date format or "Unknown"
    expect(stdout).toMatch(/Installed: (\d{4}-\d{2}-\d{2}|Unknown)/);
  });

  it('should format versions correctly', async () => {
    const { stdout } = await exec('agentic-framework status');

    // Should show version or "(version unknown)"
    expect(stdout).not.toMatch(/vundefined/);
    expect(stdout).toMatch(/v\d+\.\d+\.\d+|\(version unknown\)/);
  });

  it('should show user-relevant paths in errors', async () => {
    const { stderr } = await exec('agentic-framework planning validate-plan');

    // Error paths should be user's file, not schema file
    if (stderr.includes('Missing required property')) {
      expect(stderr).toContain('PLAN.md');
      expect(stderr).not.toContain('plan.schema.json');
    }
  });
});
```

---

## Path Consistency Testing

### The Core Problem

Commands that work together use different paths (e.g., `create-ticket` creates in `backlog/`, but `validate` looks in `ai/backlog/`).

### Pattern: Cross-Command Path Verification

```typescript
// Verify commands use consistent paths
describe('Path consistency', () => {
  it('should validate tickets created by create-ticket', async () => {
    const project = await createUserProject();

    // Create ticket
    await exec(
      'agentic-framework backlog create-ticket --name test --type bug',
      { cwd: project }
    );

    // Validate should find it
    const result = await exec(
      'agentic-framework backlog validate',
      { cwd: project }
    );

    expect(result.stderr).not.toContain('directory not found');
  });

  it('should validate plans created by create-plan', async () => {
    const project = await createUserProject();

    // Create plan
    await exec(
      'agentic-framework planning create-plan --name test',
      { cwd: project }
    );

    // Validate should find it
    const result = await exec(
      'agentic-framework planning validate-plan',
      { cwd: project }
    );

    expect(result.code).toBe(0);
  });
});
```

---

## CLI Testing Checklist

Before submitting CLI code, verify:

### Test Layers Present
- [ ] Unit tests for isolated logic (path resolution, data transformation, validation)
- [ ] Integration tests for library functions with real data
- [ ] CLI surface tests that execute actual commands
- [ ] Environment variation tests (no TTY, outside project, paths with spaces)

### User Context
- [ ] Tests run from simulated user project, not CLI source directory
- [ ] Tests use `exec()` or similar to run CLI as npm package
- [ ] Path resolution tested from user's perspective

### State Verification
- [ ] Tests verify side effects (manifest updates, file creation)
- [ ] Round-trip tests (create → verify → use → verify)
- [ ] Cross-command consistency verified

### Output Validation
- [ ] No "undefined", "null", "Invalid Date" in output
- [ ] No stack traces for expected user errors
- [ ] Paths shown are user-relevant, not internal
- [ ] Exit codes correct (0 for success, non-zero for error)

### Feature Completeness
- [ ] All documented flags actually work (`--dry-run`, `--verbose`, etc.)
- [ ] All documented commands are implemented
- [ ] Error messages are actionable

---

**Source:** Analysis of CLI QA Issues (21 bugs: QA-001 to QA-021)
**Version:** 1.0
**Created:** 2025-12-30
