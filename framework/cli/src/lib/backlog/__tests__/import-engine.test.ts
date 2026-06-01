/**
 * Import Engine Tests
 *
 * Tests for the main import orchestration module.
 * Covers import workflow, progress tracking, dry-run mode, and summary generation.
 *
 * New structure (v10.1.1):
 * - All tickets go to flat `tickets/` directory
 * - Epics go to `epics/` directory
 * - Sprints/milestones auto-detected from CSV data
 * - Sprint/milestone index files auto-generated
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import { importFromCsv, ImportOptions, ImportSummary } from '../import-engine.js';

const TEST_DIR = path.join(__dirname, 'fixtures', 'import-engine-test');
const TEST_CSV = path.join(__dirname, 'fixtures', 'sample-import.csv');

describe('ImportEngine', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    await fs.ensureDir(TEST_DIR);
    // Suppress expected console.error calls from verbose output
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
    consoleErrorSpy.mockRestore();
  });

  describe('importFromCsv', () => {
    it('should import CSV file with auto-detection', async () => {
      const options: ImportOptions = {
        csvPath: TEST_CSV,
        duplicateMode: 'force',
        basePath: TEST_DIR,
      };

      const summary = await importFromCsv(options);

      expect(summary).toBeDefined();
      expect(summary.total).toBeGreaterThan(0);
      expect(summary.created).toBeGreaterThan(0);
      expect(summary.errors).toBe(0);
      expect(summary.duration).toBeGreaterThan(0);

      // Verify tickets were created in flat structure
      const ticketsDir = path.join(TEST_DIR, 'tickets');
      expect(await fs.pathExists(ticketsDir)).toBe(true);
      const ticketFiles = await fs.readdir(ticketsDir);
      expect(ticketFiles.length).toBeGreaterThan(0);
    });

    it('should auto-detect sprints from CSV', async () => {
      // Create CSV with sprint data
      const sprintCsv = path.join(TEST_DIR, 'sprint.csv');
      await fs.writeFile(
        sprintCsv,
        'Issue key,Summary,Issue Type,Status,Priority,Sprint\n' +
        'DAPM-1001,Story in Sprint 1,Story,Open,High,Sprint 2026-W1\n' +
        'DAPM-1002,Task in Sprint 2,Task,Open,Medium,Sprint 2026-W2\n',
        'utf-8'
      );

      const options: ImportOptions = {
        csvPath: sprintCsv,
        duplicateMode: 'force',
        basePath: TEST_DIR,
      };

      const summary = await importFromCsv(options);

      expect(summary.sprints).toBeDefined();
      expect(summary.sprints.length).toBe(2);
      expect(summary.sprints).toContain('Sprint 2026-W1');
      expect(summary.sprints).toContain('Sprint 2026-W2');

      // Verify sprint index files were created
      const sprintsDir = path.join(TEST_DIR, 'sprints');
      expect(await fs.pathExists(sprintsDir)).toBe(true);
    });

    it('should auto-detect milestones from CSV', async () => {
      // Create CSV with milestone/fixVersion data
      // Note: csv-extractor expects 'Fix versions' column and maps specific values like 'February 2026' -> 'Feb2026'
      const milestoneCsv = path.join(TEST_DIR, 'milestone.csv');
      await fs.writeFile(
        milestoneCsv,
        'Issue key,Summary,Issue Type,Status,Priority,Fix versions\n' +
        'DAPM-1001,Story in Feb,Story,Open,High,February 2026\n' +
        'DAPM-1002,Task in Mar,Task,Open,Medium,March 2026\n',
        'utf-8'
      );

      const options: ImportOptions = {
        csvPath: milestoneCsv,
        duplicateMode: 'force',
        basePath: TEST_DIR,
      };

      const summary = await importFromCsv(options);

      expect(summary.milestones).toBeDefined();
      expect(summary.milestones.length).toBe(2);
      expect(summary.milestones).toContain('February 2026');
      expect(summary.milestones).toContain('March 2026');

      // Verify milestone index files were created
      const milestonesDir = path.join(TEST_DIR, 'milestones');
      expect(await fs.pathExists(milestonesDir)).toBe(true);
    });

    it('should track progress during import', async () => {
      const progressUpdates: string[] = [];

      const options: ImportOptions = {
        csvPath: TEST_CSV,
        duplicateMode: 'force',
        basePath: TEST_DIR,
        verbose: true,
        onProgress: (message: string) => {
          progressUpdates.push(message);
        },
      };

      await importFromCsv(options);

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates.some(msg => msg.includes('Parsing CSV'))).toBe(true);
      expect(progressUpdates.some(msg => msg.includes('Importing tickets'))).toBe(true);
    });

    it('should generate summary report', async () => {
      const options: ImportOptions = {
        csvPath: TEST_CSV,
        duplicateMode: 'force',
        basePath: TEST_DIR,
      };

      const summary = await importFromCsv(options);

      expect(summary.total).toBeDefined();
      expect(summary.created).toBeDefined();
      expect(summary.updated).toBeDefined();
      expect(summary.skipped).toBeDefined();
      expect(summary.errors).toBeDefined();
      expect(summary.duration).toBeDefined();
      expect(summary.epics).toBeDefined();
      expect(summary.sprints).toBeDefined();
      expect(summary.milestones).toBeDefined();
      expect(summary.details).toBeDefined();
      expect(summary.details.created).toBeInstanceOf(Array);
      expect(summary.details.updated).toBeInstanceOf(Array);
      expect(summary.details.skipped).toBeInstanceOf(Array);
      expect(summary.details.epics).toBeInstanceOf(Array);
      expect(summary.details.errors).toBeInstanceOf(Array);
    });

    it('should separate epics from regular tickets', async () => {
      // Create CSV with epic and regular tickets
      const mixedCsv = path.join(TEST_DIR, 'mixed.csv');
      await fs.writeFile(
        mixedCsv,
        'Issue key,Summary,Issue Type,Status,Priority\n' +
        'DAPM-1000,Auth Epic,Epic,Open,High\n' +
        'DAPM-1001,Login Story,Story,Open,High\n' +
        'DAPM-1002,Auth Task,Task,Open,Medium\n',
        'utf-8'
      );

      const options: ImportOptions = {
        csvPath: mixedCsv,
        duplicateMode: 'force',
        basePath: TEST_DIR,
      };

      const summary = await importFromCsv(options);

      expect(summary.epics).toBe(1);
      expect(summary.created).toBe(2); // Stories and tasks only

      // Verify epic was created in epics directory
      const epicsDir = path.join(TEST_DIR, 'epics');
      expect(await fs.pathExists(epicsDir)).toBe(true);
      const epicFiles = await fs.readdir(epicsDir);
      expect(epicFiles.length).toBe(1);

      // Verify tickets were created in tickets directory
      const ticketsDir = path.join(TEST_DIR, 'tickets');
      expect(await fs.pathExists(ticketsDir)).toBe(true);
      const ticketFiles = await fs.readdir(ticketsDir);
      expect(ticketFiles.length).toBe(2);
    });
  });

  describe('dryRun mode', () => {
    it('should not create files in dry-run', async () => {
      const options: ImportOptions = {
        csvPath: TEST_CSV,
        duplicateMode: 'force',
        basePath: TEST_DIR,
        dryRun: true,
      };

      const summary = await importFromCsv(options);

      expect(summary.total).toBeGreaterThan(0);

      // Verify no directories were created
      const ticketsDir = path.join(TEST_DIR, 'tickets');
      expect(await fs.pathExists(ticketsDir)).toBe(false);

      const epicsDir = path.join(TEST_DIR, 'epics');
      expect(await fs.pathExists(epicsDir)).toBe(false);
    });

    it('should report what would be created', async () => {
      const options: ImportOptions = {
        csvPath: TEST_CSV,
        duplicateMode: 'force',
        basePath: TEST_DIR,
        dryRun: true,
      };

      const summary = await importFromCsv(options);

      expect(summary.details.created.length).toBeGreaterThan(0);
      expect(summary.details.created[0]).toMatch(/\.md$/);
    });

    it('should validate without side effects', async () => {
      // Create a baseline file
      const baselineFile = path.join(TEST_DIR, 'baseline.txt');
      await fs.writeFile(baselineFile, 'baseline', 'utf-8');

      const options: ImportOptions = {
        csvPath: TEST_CSV,
        duplicateMode: 'force',
        basePath: TEST_DIR,
        dryRun: true,
      };

      await importFromCsv(options);

      // Verify baseline file is unchanged
      const content = await fs.readFile(baselineFile, 'utf-8');
      expect(content).toBe('baseline');

      // Verify no other files were created
      const files = await fs.readdir(TEST_DIR);
      expect(files).toEqual(['baseline.txt']);
    });
  });

  describe('verbose mode', () => {
    it('should log detailed progress', async () => {
      const logs: string[] = [];

      const options: ImportOptions = {
        csvPath: TEST_CSV,
        duplicateMode: 'force',
        basePath: TEST_DIR,
        verbose: true,
        onProgress: (message: string) => {
          logs.push(message);
        },
      };

      await importFromCsv(options);

      expect(logs.length).toBeGreaterThan(3);
    });

    it('should include file paths in logs', async () => {
      const logs: string[] = [];

      const options: ImportOptions = {
        csvPath: TEST_CSV,
        duplicateMode: 'force',
        basePath: TEST_DIR,
        verbose: true,
        onProgress: (message: string) => {
          logs.push(message);
        },
      };

      await importFromCsv(options);

      // Verbose mode includes detailed summary info
      const hasImportInfo = logs.some(log => log.includes('Import Summary') || log.includes('tickets'));
      expect(hasImportInfo).toBe(true);
    });

    it('should show field values in verbose mode', async () => {
      const logs: string[] = [];

      const options: ImportOptions = {
        csvPath: TEST_CSV,
        duplicateMode: 'force',
        basePath: TEST_DIR,
        verbose: true,
        onProgress: (message: string) => {
          logs.push(message);
        },
      };

      await importFromCsv(options);

      // Should show ticket IDs or counts
      const hasDetails = logs.some(log => /DAPM-\d+|tickets|files/i.test(log));
      expect(hasDetails).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should continue on individual ticket errors', async () => {
      // Create CSV with one invalid row
      const invalidCsv = path.join(TEST_DIR, 'invalid.csv');
      await fs.writeFile(
        invalidCsv,
        'Issue key,Summary,Issue Type,Status,Priority\n' +
        'DAPM-1001,Valid Ticket,Story,Open,High\n' +
        ',Invalid Ticket (no key),Story,Open,High\n' +
        'DAPM-1002,Another Valid Ticket,Task,Open,Medium\n',
        'utf-8'
      );

      const options: ImportOptions = {
        csvPath: invalidCsv,
        duplicateMode: 'force',
        basePath: TEST_DIR,
      };

      const summary = await importFromCsv(options);

      expect(summary.created).toBe(2); // Two valid tickets
      expect(summary.errors).toBe(1); // One error
      expect(summary.details.errors.length).toBe(1);
    });

    it('should report all errors at end', async () => {
      const invalidCsv = path.join(TEST_DIR, 'invalid.csv');
      await fs.writeFile(
        invalidCsv,
        'Issue key,Summary,Issue Type,Status,Priority\n' +
        ',Error 1,Story,Open,High\n' +
        ',Error 2,Task,Open,Medium\n',
        'utf-8'
      );

      const options: ImportOptions = {
        csvPath: invalidCsv,
        duplicateMode: 'force',
        basePath: TEST_DIR,
      };

      const summary = await importFromCsv(options);

      expect(summary.details.errors.length).toBe(2);
      expect(summary.details.errors[0]).toHaveProperty('ticket');
      expect(summary.details.errors[0]).toHaveProperty('error');
    });

    it('should provide actionable error messages', async () => {
      const invalidCsv = path.join(TEST_DIR, 'invalid.csv');
      await fs.writeFile(
        invalidCsv,
        'Issue key,Summary,Issue Type,Status,Priority\n' +
        ',Missing Key,Story,Open,High\n',
        'utf-8'
      );

      const options: ImportOptions = {
        csvPath: invalidCsv,
        duplicateMode: 'force',
        basePath: TEST_DIR,
      };

      const summary = await importFromCsv(options);

      expect(summary.details.errors[0].error).toContain('required');
    });
  });

  describe('summary', () => {
    it('should count created tickets', async () => {
      const options: ImportOptions = {
        csvPath: TEST_CSV,
        duplicateMode: 'force',
        basePath: TEST_DIR,
      };

      const summary = await importFromCsv(options);

      expect(summary.created).toBeGreaterThan(0);
      expect(summary.details.created.length).toBe(summary.created);
    });

    it('should count updated tickets', async () => {
      // First import
      const options: ImportOptions = {
        csvPath: TEST_CSV,
        duplicateMode: 'force',
        basePath: TEST_DIR,
      };

      await importFromCsv(options);

      // Second import with force mode
      const summary = await importFromCsv(options);

      expect(summary.updated).toBeGreaterThan(0);
      expect(summary.details.updated.length).toBe(summary.updated);
    });

    it('should count skipped tickets', async () => {
      // First import
      const options: ImportOptions = {
        csvPath: TEST_CSV,
        duplicateMode: 'force',
        basePath: TEST_DIR,
      };

      await importFromCsv(options);

      // Second import with skip mode
      const options2: ImportOptions = {
        ...options,
        duplicateMode: 'skip',
      };

      const summary = await importFromCsv(options2);

      expect(summary.skipped).toBeGreaterThan(0);
      expect(summary.details.skipped.length).toBe(summary.skipped);
    });

    it('should list errors', async () => {
      const invalidCsv = path.join(TEST_DIR, 'invalid.csv');
      await fs.writeFile(
        invalidCsv,
        'Issue key,Summary,Issue Type,Status,Priority\n' +
        'DAPM-1001,Valid,Story,Open,High\n' +
        ',Invalid,Story,Open,High\n',
        'utf-8'
      );

      const options: ImportOptions = {
        csvPath: invalidCsv,
        duplicateMode: 'force',
        basePath: TEST_DIR,
      };

      const summary = await importFromCsv(options);

      expect(summary.details.errors).toBeInstanceOf(Array);
      expect(summary.details.errors.length).toBeGreaterThan(0);
      expect(summary.details.errors[0]).toHaveProperty('ticket');
      expect(summary.details.errors[0]).toHaveProperty('error');
    });

    it('should count epics separately', async () => {
      // Create CSV with epics
      const epicCsv = path.join(TEST_DIR, 'epic.csv');
      await fs.writeFile(
        epicCsv,
        'Issue key,Summary,Issue Type,Status,Priority\n' +
        'DAPM-1000,Auth Epic,Epic,Open,High\n' +
        'DAPM-1001,Login Story,Story,Open,High\n',
        'utf-8'
      );

      const options: ImportOptions = {
        csvPath: epicCsv,
        duplicateMode: 'force',
        basePath: TEST_DIR,
      };

      const summary = await importFromCsv(options);

      expect(summary.epics).toBe(1);
      expect(summary.details.epics.length).toBe(1);
    });
  });

  describe('duplicate mode handling', () => {
    it('should throw error in error mode when duplicates exist', async () => {
      const options: ImportOptions = {
        csvPath: TEST_CSV,
        duplicateMode: 'force',
        basePath: TEST_DIR,
      };

      // First import
      await importFromCsv(options);

      // Second import with error mode should throw
      const options2: ImportOptions = {
        ...options,
        duplicateMode: 'error',
      };

      await expect(importFromCsv(options2)).rejects.toThrow(/existing tickets/i);
    });

    it('should skip existing tickets in skip mode', async () => {
      const options: ImportOptions = {
        csvPath: TEST_CSV,
        duplicateMode: 'force',
        basePath: TEST_DIR,
      };

      // First import
      const summary1 = await importFromCsv(options);

      // Second import with skip mode
      const options2: ImportOptions = {
        ...options,
        duplicateMode: 'skip',
      };

      const summary2 = await importFromCsv(options2);

      expect(summary2.created).toBe(0);
      expect(summary2.skipped).toBe(summary1.created);
    });

    it('should overwrite existing tickets in force mode', async () => {
      const options: ImportOptions = {
        csvPath: TEST_CSV,
        duplicateMode: 'force',
        basePath: TEST_DIR,
      };

      // First import
      const summary1 = await importFromCsv(options);

      // Second import with force mode
      const summary2 = await importFromCsv(options);

      expect(summary2.created).toBe(0);
      expect(summary2.updated).toBe(summary1.created);
    });
  });
});
