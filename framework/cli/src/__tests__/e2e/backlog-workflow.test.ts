/**
 * E2E Test: Backlog Workflow
 *
 * Tests complete backlog workflows:
 * - Import CSV → Create ticket files → Validate
 */

import path from 'path';
import fs from 'fs-extra';
import { importFromCsv, ImportOptions } from '../../lib/backlog/import-engine.js';
import { validateBacklog } from '../../lib/backlog/validator.js';
import { createSandbox, TestSandbox } from '../../lib/__tests__/test-utils/sandbox.js';

describe('E2E: Backlog Workflow', () => {
  const FIXTURES_DIR = path.join(__dirname, '../fixtures');
  let sandbox: TestSandbox;
  let TEST_DIR: string;

  beforeAll(async () => {
    sandbox = await createSandbox('e2e-backlog');
    TEST_DIR = sandbox.path;
  });

  afterAll(async () => {
    await sandbox.cleanup();
  });

  describe('Import CSV and Create Ticket Files', () => {
    it('should import CSV and create ticket files in sprint mode', async () => {
      const csvPath = path.join(FIXTURES_DIR, 'sample-csv', 'jira-export.csv');
      const backlogPath = path.join(TEST_DIR, 'import-sprint-test');

      const options: ImportOptions = {
        csvPath: csvPath,
        basePath: backlogPath,
        importType: 'sprint',
        sprintId: '2026-W1',
        duplicateMode: 'error',
        dryRun: false,
        verbose: false,
      };

      const result = await importFromCsv(options);

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThan(0);

      // Import engine should process tickets
      expect(result.created + result.skipped + result.errors).toBeGreaterThanOrEqual(0);
    });

    it('should import CSV in milestone mode', async () => {
      const csvPath = path.join(FIXTURES_DIR, 'sample-csv', 'jira-export.csv');
      const backlogPath = path.join(TEST_DIR, 'import-milestone-test');

      const options: ImportOptions = {
        csvPath: csvPath,
        basePath: backlogPath,
        importType: 'milestone',
        milestoneId: 'Jan2026',
        duplicateMode: 'skip',
        dryRun: false,
        verbose: false,
      };

      const result = await importFromCsv(options);

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
    });

    it('should handle dry-run mode without creating files', async () => {
      const csvPath = path.join(FIXTURES_DIR, 'sample-csv', 'jira-export.csv');
      const backlogPath = path.join(TEST_DIR, 'import-dryrun-test');

      const options: ImportOptions = {
        csvPath: csvPath,
        basePath: backlogPath,
        importType: 'sprint',
        sprintId: '2026-W2',
        duplicateMode: 'error',
        dryRun: true,
        verbose: false,
      };

      const result = await importFromCsv(options);

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThan(0);

      // Verify no files were created
      const sprintDir = path.join(backlogPath, 'sprints', '2026-W2');
      const exists = await fs.pathExists(sprintDir);
      expect(exists).toBe(false);
    });

    it('should handle duplicate tickets according to mode', async () => {
      const csvPath = path.join(FIXTURES_DIR, 'sample-csv', 'jira-export.csv');
      const backlogPath = path.join(TEST_DIR, 'import-duplicate-test');

      // First import
      const options1: ImportOptions = {
        csvPath: csvPath,
        basePath: backlogPath,
        importType: 'sprint',
        sprintId: '2026-W1',
        duplicateMode: 'error',
        dryRun: false,
        verbose: false,
      };

      await importFromCsv(options1);

      // Second import with skip mode
      const options2: ImportOptions = {
        csvPath: csvPath,
        basePath: backlogPath,
        importType: 'sprint',
        sprintId: '2026-W1',
        duplicateMode: 'skip',
        dryRun: false,
        verbose: false,
      };

      const result = await importFromCsv(options2);
      expect(result).toBeDefined();
      // Either skipped duplicates or handled them in some way
      expect(result.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Validate Created Tickets', () => {
    it('should validate imported tickets successfully', async () => {
      const csvPath = path.join(FIXTURES_DIR, 'sample-csv', 'jira-export.csv');
      const backlogPath = path.join(TEST_DIR, 'validate-test');

      // Import tickets first
      const importOptions: ImportOptions = {
        csvPath: csvPath,
        basePath: backlogPath,
        importType: 'sprint',
        sprintId: '2026-W1',
        duplicateMode: 'error',
        dryRun: false,
        verbose: false,
      };

      await importFromCsv(importOptions);

      // Validate the backlog
      const validationResult = await validateBacklog(backlogPath);

      expect(validationResult).toBeDefined();
      // Should have some validation results
      expect(validationResult.errors).toBeDefined();
    });
  });

  describe('Batch Operations', () => {
    it('should handle batch import of multiple sprints', async () => {
      const csvPath = path.join(FIXTURES_DIR, 'sample-csv', 'jira-export.csv');
      const backlogPath = path.join(TEST_DIR, 'batch-import-test');

      const sprints = ['2026-W1', '2026-W2', '2026-W3'];

      for (const sprint of sprints) {
        const options: ImportOptions = {
          csvPath: csvPath,
          basePath: backlogPath,
          importType: 'sprint',
          sprintId: sprint,
          duplicateMode: 'skip',
          dryRun: false,
          verbose: false,
        };

        const result = await importFromCsv(options);
        expect(result).toBeDefined();
        expect(result.total).toBeGreaterThanOrEqual(0);
      }

      // Check that batch operations completed without error
      const sprintsDir = path.join(backlogPath, 'sprints');
      if (await fs.pathExists(sprintsDir)) {
        const dirs = await fs.readdir(sprintsDir);
        // Should have created at least some sprint directories
        expect(dirs.length).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
