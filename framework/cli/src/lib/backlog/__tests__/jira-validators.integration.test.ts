import { describe, it, expect } from '@jest/globals';
import {
  validateCsvSchema,
  validateSprintIdFormat,
  validateJiraSprintIdFormat,
  validateMilestoneIdFormat,
  validateArguments,
  extractSprintDataFromCsv,
  extractMilestoneDataFromCsv,
  parseMilestoneNameFromFixVersions,
  CsvValidationResult,
  CsvExtraction,
  ArgumentValidationResult,
} from '../jira-validators';
import fs from 'fs-extra';
import path from 'path';
import { createSandbox, TestSandbox } from '../../__tests__/test-utils';

describe('jira-validators', () => {
  let sandbox: TestSandbox;

  beforeEach(async () => {
    sandbox = await createSandbox('jira-validators-test');
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('validateCsvSchema', () => {
    it('should require CSV file to exist', async () => {
      const nonExistentPath = path.join(sandbox.path, 'nonexistent.csv');
      const result = await validateCsvSchema(nonExistentPath, 'sprint');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('not found');
    });

    it('should validate sprint CSV has required columns', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      await fs.writeFile(csvPath, 'Issue key,Summary\nTEST-1,Test', 'utf-8');

      const result = await validateCsvSchema(csvPath, 'sprint');

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Sprint'));
    });

    it('should validate milestone CSV has required columns', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      await fs.writeFile(csvPath, 'Issue key,Summary\nTEST-1,Test', 'utf-8');

      const result = await validateCsvSchema(csvPath, 'milestone');

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Fix Versions'));
    });

    it('should validate CSV with all required columns for sprint', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      const csvContent = 'Issue key,Summary,Issue Type,Description,Sprint\nTEST-1,Test Story,Story,Test description,Sprint 1';
      await fs.writeFile(csvPath, csvContent, 'utf-8');

      const result = await validateCsvSchema(csvPath, 'sprint');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate CSV with all required columns for milestone', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      const csvContent = 'Issue key,Summary,Issue Type,Description,Fix Versions\nTEST-1,Test Story,Story,Test description,Jan2026';
      await fs.writeFile(csvPath, csvContent, 'utf-8');

      const result = await validateCsvSchema(csvPath, 'milestone');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should be case-insensitive for column names', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      const csvContent = 'issue KEY,SUMMARY,issue type,DESCRIPTION,sprint\nTEST-1,Test Story,Story,Test description,Sprint 1';
      await fs.writeFile(csvPath, csvContent, 'utf-8');

      const result = await validateCsvSchema(csvPath, 'sprint');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect empty Issue key', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      const csvContent = 'Issue key,Summary,Issue Type,Description,Sprint\n,Test Story,Story,Test description,Sprint 1';
      await fs.writeFile(csvPath, csvContent, 'utf-8');

      const result = await validateCsvSchema(csvPath, 'sprint');

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Issue key is empty'));
    });

    it('should detect empty Summary', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      const csvContent = 'Issue key,Summary,Issue Type,Description,Sprint\nTEST-1,,Story,Test description,Sprint 1';
      await fs.writeFile(csvPath, csvContent, 'utf-8');

      const result = await validateCsvSchema(csvPath, 'sprint');

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Summary is empty'));
    });

    it('should handle empty CSV file', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      await fs.writeFile(csvPath, '', 'utf-8');

      const result = await validateCsvSchema(csvPath, 'sprint');

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('empty or has no headers'));
    });

    it('should reject invalid import type', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      await fs.writeFile(csvPath, 'Issue key,Summary\nTEST-1,Test', 'utf-8');

      const result = await validateCsvSchema(csvPath, 'invalid' as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Invalid import_type'));
    });
  });

  describe('extractSprintDataFromCsv', () => {
    it('should extract unique sprint names', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      const csvContent = `Issue key,Summary,Sprint
TEST-1,Story 1,APM-APP-2025-W45
TEST-2,Story 2,APM-APP-2025-W45
TEST-3,Story 3,APM-APP-2025-W46`;
      await fs.writeFile(csvPath, csvContent, 'utf-8');

      const result = await extractSprintDataFromCsv(csvPath);

      expect(result.hasSprintColumn).toBe(true);
      expect(result.uniqueSprints).toHaveLength(2);
      expect(result.uniqueSprints).toContain('APM-APP-2025-W45');
      expect(result.uniqueSprints).toContain('APM-APP-2025-W46');
      expect(result.sprintName).toBe('APM-APP-2025-W45');
    });

    it('should return empty result if no Sprint column', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      const csvContent = 'Issue key,Summary\nTEST-1,Story 1';
      await fs.writeFile(csvPath, csvContent, 'utf-8');

      const result = await extractSprintDataFromCsv(csvPath);

      expect(result.hasSprintColumn).toBe(false);
      expect(result.uniqueSprints).toHaveLength(0);
    });

    it('should ignore empty sprint values', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      const csvContent = `Issue key,Summary,Sprint
TEST-1,Story 1,APM-APP-2025-W45
TEST-2,Story 2,
TEST-3,Story 3,APM-APP-2025-W45`;
      await fs.writeFile(csvPath, csvContent, 'utf-8');

      const result = await extractSprintDataFromCsv(csvPath);

      expect(result.uniqueSprints).toHaveLength(1);
      expect(result.uniqueSprints).toContain('APM-APP-2025-W45');
    });

    it('should be case-insensitive for Sprint column', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      const csvContent = `Issue key,Summary,SPRINT
TEST-1,Story 1,APM-APP-2025-W45`;
      await fs.writeFile(csvPath, csvContent, 'utf-8');

      const result = await extractSprintDataFromCsv(csvPath);

      expect(result.hasSprintColumn).toBe(true);
      expect(result.uniqueSprints).toHaveLength(1);
    });
  });

  describe('extractMilestoneDataFromCsv', () => {
    it('should extract unique milestone names', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      const csvContent = `Issue key,Summary,Fix Versions
TEST-1,Story 1,"January 2026 (W51, W1, W3)"
TEST-2,Story 2,"January 2026 (W51, W1, W3)"
TEST-3,Story 3,February 2026`;
      await fs.writeFile(csvPath, csvContent, 'utf-8');

      const result = await extractMilestoneDataFromCsv(csvPath);

      expect(result.hasFixVersionsColumn).toBe(true);
      expect(result.uniqueMilestones).toHaveLength(2);
      expect(result.uniqueMilestones).toContain('January 2026 (W51, W1, W3)');
      expect(result.uniqueMilestones).toContain('February 2026');
      expect(result.milestoneName).toBe('February 2026');
    });

    it('should return empty result if no Fix Versions column', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      const csvContent = 'Issue key,Summary\nTEST-1,Story 1';
      await fs.writeFile(csvPath, csvContent, 'utf-8');

      const result = await extractMilestoneDataFromCsv(csvPath);

      expect(result.hasFixVersionsColumn).toBe(false);
      expect(result.uniqueMilestones).toHaveLength(0);
    });

    it('should parse milestone names from Fix Versions', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      const csvContent = `Issue key,Summary,Fix Versions
TEST-1,Story 1,"January 2026, February 2026"`;
      await fs.writeFile(csvPath, csvContent, 'utf-8');

      const result = await extractMilestoneDataFromCsv(csvPath);

      expect(result.uniqueMilestones).toHaveLength(1);
      expect(result.uniqueMilestones).toContain('January 2026');
    });

    it('should be case-insensitive for Fix Versions column', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      const csvContent = `Issue key,Summary,fix versions
TEST-1,Story 1,January 2026`;
      await fs.writeFile(csvPath, csvContent, 'utf-8');

      const result = await extractMilestoneDataFromCsv(csvPath);

      expect(result.hasFixVersionsColumn).toBe(true);
      expect(result.uniqueMilestones).toHaveLength(1);
    });
  });

  describe('parseMilestoneNameFromFixVersions', () => {
    it('should return null for empty string', () => {
      expect(parseMilestoneNameFromFixVersions('')).toBeNull();
    });

    it('should preserve parentheses content', () => {
      const result = parseMilestoneNameFromFixVersions('January 2026 (W51, W1, W3)');
      expect(result).toBe('January 2026 (W51, W1, W3)');
    });

    it('should take first milestone when multiple present', () => {
      const result = parseMilestoneNameFromFixVersions('January 2026, February 2026');
      expect(result).toBe('January 2026');
    });

    it('should handle commas inside parentheses', () => {
      const result = parseMilestoneNameFromFixVersions('January 2026 (W51, W1, W3), February 2026');
      expect(result).toBe('January 2026 (W51, W1, W3)');
    });

    it('should trim whitespace', () => {
      const result = parseMilestoneNameFromFixVersions('  January 2026  ');
      expect(result).toBe('January 2026');
    });

    it('should handle nested parentheses', () => {
      const result = parseMilestoneNameFromFixVersions('Version 1.0 (Alpha (RC1))');
      expect(result).toBe('Version 1.0 (Alpha (RC1))');
    });
  });

  describe('validateSprintIdFormat', () => {
    it('should validate correct format YYYY-WXX', () => {
      expect(validateSprintIdFormat('2025-W45')).toBe(true);
      expect(validateSprintIdFormat('2025-W1')).toBe(true);
      expect(validateSprintIdFormat('2026-W52')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(validateSprintIdFormat('')).toBe(false);
    });

    it('should reject invalid formats', () => {
      expect(validateSprintIdFormat('2025-45')).toBe(false);
      expect(validateSprintIdFormat('W45-2025')).toBe(false);
      expect(validateSprintIdFormat('2025W45')).toBe(false);
      expect(validateSprintIdFormat('APM-APP-2025-W45')).toBe(false);
    });

    it('should reject wrong year format', () => {
      expect(validateSprintIdFormat('25-W45')).toBe(false);
      expect(validateSprintIdFormat('20250-W45')).toBe(false);
    });
  });

  describe('validateJiraSprintIdFormat', () => {
    it('should validate numeric Jira sprint IDs', () => {
      expect(validateJiraSprintIdFormat('16786')).toBe(true);
      expect(validateJiraSprintIdFormat('1')).toBe(true);
      expect(validateJiraSprintIdFormat('999999')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(validateJiraSprintIdFormat('')).toBe(false);
    });

    it('should reject non-numeric values', () => {
      expect(validateJiraSprintIdFormat('abc')).toBe(false);
      expect(validateJiraSprintIdFormat('2025-W45')).toBe(false);
      expect(validateJiraSprintIdFormat('16786abc')).toBe(false);
    });
  });

  describe('validateMilestoneIdFormat', () => {
    it('should validate correct format MonthYYYY', () => {
      expect(validateMilestoneIdFormat('Jan2026')).toBe(true);
      expect(validateMilestoneIdFormat('Dec2025')).toBe(true);
      expect(validateMilestoneIdFormat('Mar2024')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(validateMilestoneIdFormat('')).toBe(false);
    });

    it('should reject invalid formats', () => {
      expect(validateMilestoneIdFormat('January2026')).toBe(false);
      expect(validateMilestoneIdFormat('jan2026')).toBe(false);
      expect(validateMilestoneIdFormat('JAN2026')).toBe(false);
      expect(validateMilestoneIdFormat('Jan26')).toBe(false);
      expect(validateMilestoneIdFormat('2026Jan')).toBe(false);
    });

    it('should require 3-letter month abbreviation', () => {
      expect(validateMilestoneIdFormat('Ja2026')).toBe(false);
      expect(validateMilestoneIdFormat('Janu2026')).toBe(false);
    });

    it('should require 4-digit year', () => {
      expect(validateMilestoneIdFormat('Jan26')).toBe(false);
      expect(validateMilestoneIdFormat('Jan20266')).toBe(false);
    });
  });

  describe('validateArguments', () => {
    it('should reject invalid import type', () => {
      const result = validateArguments({}, 'invalid' as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Invalid --type'));
    });

    it('should validate sprint arguments', () => {
      const result = validateArguments(
        { sprintId: '2025-W45', jiraSprintId: '16786' },
        'sprint'
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid sprint ID format', () => {
      const result = validateArguments(
        { sprintId: 'invalid' },
        'sprint'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Invalid sprint ID format'));
    });

    it('should reject invalid Jira sprint ID format', () => {
      const result = validateArguments(
        { jiraSprintId: 'abc' },
        'sprint'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Invalid Jira sprint ID format'));
    });

    it('should validate milestone arguments', () => {
      const result = validateArguments(
        { milestoneId: 'Jan2026' },
        'milestone'
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid milestone ID format', () => {
      const result = validateArguments(
        { milestoneId: 'January2026' },
        'milestone'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Invalid milestone ID format'));
    });

    it('should allow empty optional arguments', () => {
      const result = validateArguments({}, 'sprint');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
