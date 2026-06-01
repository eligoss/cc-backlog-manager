# Real Examples: Before & After

Concrete scenarios demonstrating quality enforcement patterns.

---

## Example 1: Code Review - SOLID Violation

### Scenario
Reviewing user service implementation that mixes responsibilities.

### Before (Anti-Pattern)
```javascript
class UserService {
  constructor(db, email, cache) {
    this.db = db;
    this.email = email;
    this.cache = cache;
  }

  createUser(userData) {
    // Validation
    if (!userData.email) throw new Error("Email required");

    // Save to database
    const user = this.db.insert('users', userData);

    // Send welcome email
    this.email.send(user.email, 'Welcome!');

    // Cache it
    this.cache.set(`user:${user.id}`, user);

    return user;
  }
}
```

### Issues Found
- ✗ Single Responsibility Violation (validation, persistence, communication, caching)
- ✗ Untestable (tight coupling to db, email, cache)
- ✗ Hard to extend (adding logging? retry? metrics?)

### After (Fixed)
```javascript
// Validator
class UserValidator {
  validate(userData) {
    if (!userData.email) throw new Error("Email required");
    return true;
  }
}

// User Repository (persistence)
class UserRepository {
  constructor(db) { this.db = db; }
  save(userData) { return this.db.insert('users', userData); }
}

// User Notification Service
class UserNotificationService {
  constructor(email) { this.email = email; }
  sendWelcome(user) { this.email.send(user.email, 'Welcome!'); }
}

// User Cache
class UserCache {
  constructor(cache) { this.cache = cache; }
  store(user) { this.cache.set(`user:${user.id}`, user); }
}

// Orchestrator (composed from services)
class CreateUserUseCase {
  constructor(validator, repo, notification, cache) {
    this.validator = validator;
    this.repo = repo;
    this.notification = notification;
    this.cache = cache;
  }

  execute(userData) {
    this.validator.validate(userData);
    const user = this.repo.save(userData);
    this.notification.sendWelcome(user);
    this.cache.store(user);
    return user;
  }
}
```

### Quality Improvement
- ✓ Single Responsibility (each class has one reason to change)
- ✓ Testable (each service can be mocked independently)
- ✓ Extensible (add logging, retry, metrics without modifying existing code)

---

## Example 2: Ticket Quality - Vague Acceptance Criteria

### Scenario
Reviewing story before export to Jira.

### Before (Anti-Pattern)
```
Title: Improve API Performance

Context: The API is slow.

Requirements:
- Make it faster
- Improve response times
- Optimize database queries

Acceptance Criteria:
- Performance is improved
- API is faster
- No errors occur

Story Points: 5
```

### Issues Found
- ✗ Vague acceptance criteria (measurable? testable? how do we know when done?)
- ✗ Unclear requirements (which endpoints? what database?)
- ✗ No success metrics (faster by how much? compared to what baseline?)

### After (Fixed)
```
Title: Reduce API Response Time for Product List Endpoint

Context: The /products endpoint currently responds in 2-3 seconds for 95th
percentile users. Stakeholders report slow page loads. This creates poor UX
and likely impacts conversion. Target: <500ms for 95th percentile.

Requirements:
- Optimize database query (implement eager loading for related products)
- Add caching layer (Redis cache, 5-minute TTL)
- Monitor response times (add timing metrics)
- Load test with realistic traffic patterns

Technical Notes:
- Use DataLoader for batch query optimization
- Cache on product catalog updates
- Verify no stale data scenarios
- Test with 1000+ concurrent users

Acceptance Criteria:
- API responds in <500ms for 95th percentile (measured over 1 hour)
- 0 cache inconsistency issues during load test
- Response time improvement ≥75% vs baseline (2-3s → <500ms)
- All existing tests pass
- Metrics dashboard shows response times <500ms for last 24 hours
- No increase in error rate (≤0.1%)

Story Points: 8
```

### Quality Improvement
- ✓ Specific, measurable acceptance criteria
- ✓ Clear context (why this matters)
- ✓ Success metrics (what "done" looks like)
- ✓ Technical guidance without implementation details

---

## Example 3: Post-Task Self-Evaluation

### Scenario
Completing a task to update framework documentation.

### Before (No Evaluation)
Agent: "Task completed. Documentation updated."

### After (With Self-Evaluation)
```
Agent: "Task completed successfully.

Self-check identified one issue:
Issue: I had to search the git history to find which context file
contained the authentication pattern, because the routing guide didn't
specify where authentication patterns are documented.

Root cause: Routing documentation (ai/framework/routing.md) doesn't
list all context file purposes and contents.

Recommendation: Update ai/framework/routing.md, add section 'Context
File Map' listing:
- business-context-basic.md: Business domain, terminology, milestones
- business-context-advanced.md: Extended business logic patterns
- authentication patterns live in: technical-context-advanced.md,
  section 'Authentication & Authorization'

This will save ~5 min on future tasks. Should I apply this fix?"

User: "Yes, applies fix"

Agent: "Updated routing.md with context file map. Future tasks will be faster."
```

---

## Example 4: Framework Anti-Pattern - Project Content in Agent

### Scenario
Reviewing agent file that violates pure agent pattern.

### Before (Anti-Pattern)
```markdown
# APM-R Backlog Manager Agent

When creating tickets, remember:
- Use Jira project key: APMR-
- Epic codes: FEAT-001, MAINT-002, INFRA-003
- Story points: Use Fibonacci 1-8
- Standard milestones: v2.5, v3.0, v3.1

[Implementation details for APM-R specific workflow]
```

### Issues Found
- ✗ Project-specific content in agent (violates pure agent pattern)
- ✗ Hardcoded project codes and milestone names
- ✗ Not reusable for other projects

### After (Fixed)
Agent file (generic, reusable):
```markdown
# Backlog Manager Agent

When creating tickets:
1. Load context file for project-specific configuration
2. Use ticket structure from context
3. Apply acceptance criteria validation
4. Reference patterns from context files

See: Load project context before creating tickets
```

Context file (project-specific, reusable):
```markdown
# APM-R Backlog Configuration

**Project Code:** APMR-
**Epic Codes:** FEAT-001, MAINT-002, INFRA-003
**Story Points:** Fibonacci 1-8
**Milestones:** v2.5, v3.0, v3.1

[APM-R specific patterns and standards]
```

### Quality Improvement
- ✓ Agent remains generic (reusable across projects)
- ✓ Context file contains project-specific configuration
- ✓ Clear separation of concerns

---

## Example 5: Ticket Quality - Horizontal vs Vertical Slice

### Scenario
Reviewing three stories for a new feature.

### Before (Horizontal Slices - Anti-Pattern)
```
Story 1: "Create user_profile database table"
- Acceptance criteria: Table created with columns
- Story Points: 3

Story 2: "Build profile API endpoint GET /profiles/:id"
- Acceptance criteria: Endpoint returns user profile JSON
- Story Points: 5

Story 3: "Create user profile form UI component"
- Acceptance criteria: Form displays and submits
- Story Points: 5
```

### Issues Found
- ✗ Horizontal slices (each layer separate)
- ✗ Can't deploy independently (need all 3 for feature)
- ✗ No value delivered until all complete
- ✗ Requires coordination between 3 teams/people

### After (Vertical Slices - Fixed)
```
Story 1: "Display User Profile - MVP"
- User can view their complete profile (name, email, bio)
- Database: Create profile table with essential fields
- API: GET /profiles/:id returns profile JSON
- UI: Profile page displays data from API
- Acceptance criteria:
  - User visits /profiles/123 → sees complete profile
  - API returns 200 with correct data structure
  - Form renders without errors
- Story Points: 8

Story 2: "Edit User Profile - MVP"
- User can edit their profile fields
- Database: Profile table already exists (Story 1)
- API: PATCH /profiles/:id updates fields
- UI: Profile form allows editing with save button
- Acceptance criteria:
  - User edits name → saves → page updates
  - API returns 200 with updated data
  - Database reflects changes
- Story Points: 5

Story 3: "Profile Privacy Settings"
- User can control who sees their profile
- Database: Add privacy_level field
- API: GET respects privacy level, returns partial data
- UI: Profile settings form with privacy options
- Acceptance criteria:
  - User sets privacy = private → other users see restricted view
  - User sets privacy = public → other users see full profile
- Story Points: 5
```

### Quality Improvement
- ✓ Vertical slices (each story delivers end-to-end value)
- ✓ Independently deployable
- ✓ Value delivered with each story completion
- ✓ Easier to parallelize or reassign

---

## Example 6: CLI Testing - Missing User Context Testing

### Scenario
CLI tests pass but real users encounter path resolution errors.

### Before (Anti-Pattern)
```typescript
// Tests call library directly from CLI source directory
describe('create-plan', () => {
  it('should create a plan', async () => {
    const result = await createPlan('test', 'framework', __dirname, false);
    expect(result).toBeDefined();  // Just checks existence
  });
});
```

### Issues Found
- ✗ Tests run from CLI source, not user project
- ✗ Path resolution works differently when CLI is npm package
- ✗ Template paths resolve correctly in source but fail for users
- ✗ Only checks "result exists", not output content

### After (Fixed)
```typescript
// Simulate real user environment
describe('create-plan (user context)', () => {
  let userProject: string;

  beforeEach(async () => {
    // Create fresh project like user would
    userProject = await createTempDir();
    await exec('agentic-framework init . --no-interactive', {
      cwd: userProject
    });
  });

  it('should create a plan from user project', async () => {
    // Execute actual CLI command
    const { stdout, code } = await exec(
      'agentic-framework planning create-plan --name test --dry-run',
      { cwd: userProject }
    );

    // Verify content, not just existence
    expect(code).toBe(0);
    expect(stdout).not.toContain('Template not found');
    expect(stdout).toContain('Would create');
  });
});
```

### Quality Improvement
- ✓ Tests simulate real user environment
- ✓ CLI executed as npm package, not library call
- ✓ Output content validated
- ✓ Path resolution tested from user's perspective

---

## Example 7: Defensive Coding - Null-Safe Display

### Scenario
CLI status command shows "Invalid Date" and "vundefined" to users.

### Before (Anti-Pattern)
```typescript
// status.ts
function displayStatus(config: Config, modules: Module[]) {
  // Crashes or shows garbage if values missing
  console.log(`Installed: ${new Date(config.installedAt).toLocaleString()}`);

  for (const mod of modules) {
    console.log(`• ${mod.name} v${mod.version}`);
  }
}
```

**Output with missing data:**
```
Installed: Invalid Date
• core vundefined
• planning vundefined
```

### After (Fixed)
```typescript
// status.ts
function displayStatus(config: Config, modules: Module[]) {
  // Safe date display
  const installedStr = config.installedAt
    ? new Date(config.installedAt).toLocaleString()
    : 'Unknown';
  console.log(`Installed: ${installedStr}`);

  // Safe version display
  for (const mod of modules) {
    const version = mod.version ? `v${mod.version}` : '(version unknown)';
    console.log(`• ${mod.name} ${version}`);
  }
}
```

**Output with missing data:**
```
Installed: Unknown
• core (version unknown)
• planning (version unknown)
```

### Quality Improvement
- ✓ Missing dates show "Unknown" instead of "Invalid Date"
- ✓ Missing versions show "(version unknown)" instead of "vundefined"
- ✓ User sees meaningful information, not garbage

---

## Example 8: Path Context - Cross-Command Consistency

### Scenario
`create-ticket` creates files in one location, `validate` looks in different location.

### Before (Anti-Pattern)
```typescript
// create-ticket.ts
const ticketDir = path.join(projectPath, 'backlog/tickets', type);
// Creates: /project/backlog/tickets/bugs/BUG-001.md

// validate.ts (different path!)
const backlogDir = path.join(projectPath, 'ai/backlog');
// Looks in: /project/ai/backlog (doesn't exist!)
// Error: "Backlog directory not found"
```

### After (Fixed)
```typescript
// paths.ts (shared constants)
export const PATHS = {
  backlog: {
    root: 'backlog',
    tickets: 'backlog/tickets',
  },
} as const;

// create-ticket.ts
import { PATHS } from '../paths.js';
const ticketDir = path.join(projectPath, PATHS.backlog.tickets, type);

// validate.ts
import { PATHS } from '../paths.js';
const backlogDir = path.join(projectPath, PATHS.backlog.root);
// Now uses same path as create-ticket
```

### Quality Improvement
- ✓ Single source of truth for paths
- ✓ Related commands use same constants
- ✓ Create → validate round-trip works

---

## Example 9: Error Message Quality

### Scenario
Validation error shows schema file path instead of user's file.

### Before (Anti-Pattern)
```typescript
// validate-plan.ts
function validatePlanFile(planPath: string) {
  const issues = schemaValidator.validate(content);

  // Error shows schema path, confusing user
  for (const issue of issues) {
    console.log(`[${schemaPath}] ${issue.message}`);
  }
}
```

**Output:**
```
Errors:
  1. [/cli/framework/modules/planning/schemas/plan.schema.json] Missing required property: status
```

### After (Fixed)
```typescript
// validate-plan.ts
function validatePlanFile(planPath: string) {
  const issues = schemaValidator.validate(content);

  // Error shows user's file path
  for (const issue of issues) {
    console.log(`[${planPath}] ${issue.message}`);
  }
}
```

**Output:**
```
Errors:
  1. [/my-project/ai/plans/001-feature/PLAN.md] Missing required property: status
```

### Quality Improvement
- ✓ Error references user's file, not internal schema
- ✓ User can immediately find and fix the problem
- ✓ No exposure of internal paths

---

## Example 10: Environment Handling - TTY Check

### Scenario
Remove command crashes without TTY when trying to prompt for confirmation.

### Before (Anti-Pattern)
```typescript
// remove.ts
async function removeModule(name: string, options: Options) {
  // Crashes with ERR_USE_AFTER_CLOSE if no TTY
  const answer = await readline.question(`Remove ${name}? (y/n) `);

  if (answer.toLowerCase() === 'y') {
    await doRemove(name);
  }
}
```

### After (Fixed)
```typescript
// remove.ts
async function removeModule(name: string, options: Options) {
  // Skip prompt if --force flag
  if (options.force) {
    await doRemove(name);
    return;
  }

  // Check TTY before prompting
  if (!process.stdin.isTTY) {
    console.error('Error: Interactive confirmation requires a TTY terminal.');
    console.error('Use --force flag to skip confirmation:');
    console.error(`  agentic-framework remove ${name} --force`);
    process.exit(1);
  }

  const answer = await readline.question(`Remove ${name}? (y/n) `);
  if (answer.toLowerCase() === 'y') {
    await doRemove(name);
  }
}
```

### Quality Improvement
- ✓ Graceful failure when TTY unavailable
- ✓ Clear error message with fix suggestion
- ✓ --force flag provides non-interactive path

---

**Version:** 2.0
**Updated:** 2025-12-30
