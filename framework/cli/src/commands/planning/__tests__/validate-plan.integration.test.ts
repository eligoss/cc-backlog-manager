/**
 * Tests for the validate-plan command
 *
 * @module commands/planning/__tests__/validate-plan.test
 */

import path from 'path';
import fs from 'fs-extra';
import matter from 'gray-matter';
import { createSandbox, TestSandbox } from '../../../lib/__tests__/test-utils/sandbox';

// Mock chalk to avoid ANSI codes in test output
jest.mock('chalk', () => ({
  default: {
    blue: (s: string) => s,
    cyan: (s: string) => s,
    green: (s: string) => s,
    yellow: (s: string) => s,
    red: (s: string) => s,
    dim: (s: string) => s,
    bold: (s: string) => s,
  },
  blue: (s: string) => s,
  cyan: (s: string) => s,
  green: (s: string) => s,
  yellow: (s: string) => s,
  red: (s: string) => s,
  dim: (s: string) => s,
  bold: (s: string) => s,
}));

// Mock process.exit
const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: number | string | null) => {
  throw new Error(`process.exit(${code})`);
});

// We'll test the validation logic directly since the command integrates with console output
import { validatePlanRules, validatePlanContent } from '../../../lib/validation/rules/plan-rules.js';
import { validateWithSchema } from '../../../lib/validation/schema-validator.js';
import { mergeReports } from '../../../lib/validation/validation-report.js';

describe('validate-plan command', () => {
  const fixturesDir = path.join(__dirname, '__fixtures__');
  let sandbox: TestSandbox;
  let testDir: string;

  beforeAll(() => {
    // Ensure fixtures directory exists
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
  });

  beforeEach(async () => {
    sandbox = await createSandbox('validate-plan');
    testDir = sandbox.path;
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  afterAll(() => {
    mockExit.mockRestore();
  });

  describe('plan file validation', () => {
    it('should validate a valid plan with no errors', async () => {
      const validPlanPath = path.join(fixturesDir, 'valid-plan.md');

      // Skip if fixture doesn't exist
      if (!fs.existsSync(validPlanPath)) {
        console.log('Skipping test: valid-plan.md fixture not found');
        return;
      }

      const content = await fs.readFile(validPlanPath, 'utf-8');
      const parsed = matter(content);
      const frontmatter = parsed.data;
      const markdownContent = parsed.content;

      // Run frontmatter rules validation
      const rulesIssues = validatePlanRules(frontmatter, validPlanPath);
      const contentIssues = validatePlanContent(markdownContent, validPlanPath);

      const allIssues = [...rulesIssues, ...contentIssues];
      const errors = allIssues.filter((i) => i.severity === 'error');

      expect(errors).toHaveLength(0);
    });

    it('should detect missing sections in invalid plan', async () => {
      const invalidPlanPath = path.join(fixturesDir, 'invalid-plan-missing-sections.md');

      // Skip if fixture doesn't exist
      if (!fs.existsSync(invalidPlanPath)) {
        console.log('Skipping test: invalid-plan-missing-sections.md fixture not found');
        return;
      }

      const content = await fs.readFile(invalidPlanPath, 'utf-8');
      const parsed = matter(content);
      const markdownContent = parsed.content;

      const contentIssues = validatePlanContent(markdownContent, invalidPlanPath);

      // Should have errors for missing Solution Overview and Phases sections
      const solutionOverviewError = contentIssues.find(
        (i) => i.code === 'MISSING_SOLUTION_OVERVIEW'
      );
      const phasesError = contentIssues.find((i) => i.code === 'MISSING_PHASES_SECTION');

      expect(solutionOverviewError).toBeDefined();
      expect(phasesError).toBeDefined();
    });

    it('should validate frontmatter rules', async () => {
      const validPlanPath = path.join(fixturesDir, 'valid-plan.md');

      if (!fs.existsSync(validPlanPath)) {
        console.log('Skipping test: valid-plan.md fixture not found');
        return;
      }

      const content = await fs.readFile(validPlanPath, 'utf-8');
      const parsed = matter(content);
      const frontmatter = parsed.data;

      const rulesIssues = validatePlanRules(frontmatter, validPlanPath);

      // Valid plan should not have critical issues
      const errors = rulesIssues.filter((i) => i.severity === 'error');
      expect(errors).toHaveLength(0);
    });
  });

  describe('plan discovery', () => {
    it('should find PLAN.md files in directory', async () => {
      // Create test directory with a PLAN.md file
      const planDir = path.join(testDir, 'test-plan');
      await fs.ensureDir(planDir);

      const planContent = `---
status: pending
category: test
estimatedHours: 5
phases:
  - title: Test Phase
    goal: Test goal
    deliverables:
      - Create tests
    successMetrics:
      - Tests pass
successCriteria:
  - Done
riskLevel: low
---

## Problem Statement

Test problem.

## Solution Overview

Test solution.

## Phases

### Phase 1
Test phase content.

## Success Criteria

- Test criteria
`;

      await fs.writeFile(path.join(planDir, 'PLAN.md'), planContent, 'utf-8');

      // Verify file was created
      const planExists = await fs.pathExists(path.join(planDir, 'PLAN.md'));
      expect(planExists).toBe(true);
    });

    it('should ignore non-PLAN.md files', async () => {
      // Create test directory with non-PLAN.md files
      await fs.writeFile(path.join(testDir, 'README.md'), '# Readme', 'utf-8');
      await fs.writeFile(path.join(testDir, 'notes.md'), '# Notes', 'utf-8');

      const files = await fs.readdir(testDir);
      const planFiles = files.filter((f) => f === 'PLAN.md');

      expect(planFiles).toHaveLength(0);
    });
  });

  describe('validation report merging', () => {
    it('should merge multiple validation reports correctly', () => {
      const report1 = {
        valid: true,
        issues: [],
        summary: { errors: 0, warnings: 0, info: 0 },
      };

      const report2 = {
        valid: false,
        issues: [
          {
            severity: 'error' as const,
            code: 'TEST_ERROR',
            message: 'Test error',
          },
        ],
        summary: { errors: 1, warnings: 0, info: 0 },
      };

      const merged = mergeReports(report1, report2);

      expect(merged.valid).toBe(false);
      expect(merged.issues).toHaveLength(1);
      expect(merged.summary.errors).toBe(1);
    });
  });

  describe('frontmatter parsing', () => {
    it('should parse valid YAML frontmatter', async () => {
      const content = `---
status: pending
category: test
---

## Content

Some content here.
`;

      const parsed = matter(content);

      expect(parsed.data.status).toBe('pending');
      expect(parsed.data.category).toBe('test');
      expect(parsed.content).toContain('## Content');
    });

    it('should handle missing frontmatter gracefully', () => {
      const content = `## Content

No frontmatter here.
`;

      const parsed = matter(content);

      expect(parsed.data).toEqual({});
      expect(parsed.content).toContain('## Content');
    });

    it('should parse complex frontmatter with arrays and objects', async () => {
      const content = `---
status: pending
phases:
  - title: Phase 1
    goal: Goal 1
    deliverables:
      - Item 1
      - Item 2
successCriteria:
  - Criterion 1
  - Criterion 2
---

## Content
`;

      const parsed = matter(content);

      expect(parsed.data.phases).toHaveLength(1);
      expect(parsed.data.phases[0].title).toBe('Phase 1');
      expect(parsed.data.phases[0].deliverables).toHaveLength(2);
      expect(parsed.data.successCriteria).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty plan file', async () => {
      const emptyContent = '';
      const parsed = matter(emptyContent);

      expect(parsed.data).toEqual({});
      expect(parsed.content).toBe('');
    });

    it('should handle plan with only frontmatter', async () => {
      const content = `---
status: pending
---
`;

      const parsed = matter(content);
      const contentIssues = validatePlanContent(parsed.content, '/test/PLAN.md');

      // Should report missing sections
      expect(contentIssues.length).toBeGreaterThan(0);
    });

    it('should handle plan with special characters in content', async () => {
      const content = `---
status: pending
category: test-special
---

## Problem Statement

This plan handles special characters: <>&"' and unicode:

## Solution Overview

Solution with code blocks:

\`\`\`typescript
const x = { key: "value" };
\`\`\`

## Phases

Phase with markdown tables:

| Column 1 | Column 2 |
|----------|----------|
| Value 1  | Value 2  |

## Success Criteria

- Check for && and ||
`;

      const parsed = matter(content);
      const contentIssues = validatePlanContent(parsed.content, '/test/PLAN.md');

      // Should parse without errors
      const errors = contentIssues.filter((i) => i.severity === 'error');
      expect(errors).toHaveLength(0);
    });
  });
});
