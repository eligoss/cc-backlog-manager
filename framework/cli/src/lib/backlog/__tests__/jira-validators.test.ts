/**
 * Unit Tests for jira-validators
 *
 * Tests pure validation functions and CSV operations for Jira imports
 */

import {
  validateSprintIdFormat,
  validateJiraSprintIdFormat,
  validateMilestoneIdFormat,
  parseMilestoneNameFromFixVersions,
  validateArguments,
  validateCsvSchema,
  extractSprintDataFromCsv,
  extractMilestoneDataFromCsv,
  CsvValidationError,
} from '../jira-validators.js';
import fs from 'fs-extra';

// Mock fs-extra
jest.mock('fs-extra');

describe('jira-validators', () => {
  describe('validateSprintIdFormat', () => {
    it('should accept valid YYYY-WXX format', () => {
      expect(validateSprintIdFormat('2025-W45')).toBe(true);
      expect(validateSprintIdFormat('2024-W1')).toBe(true);
      expect(validateSprintIdFormat('2026-W52')).toBe(true);
      expect(validateSprintIdFormat('2023-W10')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(validateSprintIdFormat('')).toBe(false);
      expect(validateSprintIdFormat('2025W45')).toBe(false); // Missing dash
      expect(validateSprintIdFormat('2025-45')).toBe(false); // Missing W
      expect(validateSprintIdFormat('2025-W')).toBe(false); // Missing week number
      expect(validateSprintIdFormat('25-W45')).toBe(false); // 2-digit year
      expect(validateSprintIdFormat('2025-W123')).toBe(false); // 3-digit week
      expect(validateSprintIdFormat('Sprint 1')).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(validateSprintIdFormat(null as any)).toBe(false);
      expect(validateSprintIdFormat(undefined as any)).toBe(false);
    });
  });

  describe('validateJiraSprintIdFormat', () => {
    it('should accept valid numeric formats', () => {
      expect(validateJiraSprintIdFormat('16786')).toBe(true);
      expect(validateJiraSprintIdFormat('1')).toBe(true);
      expect(validateJiraSprintIdFormat('123456789')).toBe(true);
    });

    it('should reject non-numeric formats', () => {
      expect(validateJiraSprintIdFormat('')).toBe(false);
      expect(validateJiraSprintIdFormat('abc')).toBe(false);
      expect(validateJiraSprintIdFormat('123abc')).toBe(false);
      expect(validateJiraSprintIdFormat('12.34')).toBe(false);
      expect(validateJiraSprintIdFormat('-123')).toBe(false);
      expect(validateJiraSprintIdFormat('2025-W45')).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(validateJiraSprintIdFormat(null as any)).toBe(false);
      expect(validateJiraSprintIdFormat(undefined as any)).toBe(false);
    });
  });

  describe('validateMilestoneIdFormat', () => {
    it('should accept valid MonthYYYY format', () => {
      expect(validateMilestoneIdFormat('Jan2026')).toBe(true);
      expect(validateMilestoneIdFormat('Feb2025')).toBe(true);
      expect(validateMilestoneIdFormat('Mar2024')).toBe(true);
      expect(validateMilestoneIdFormat('Dec2023')).toBe(true);
      expect(validateMilestoneIdFormat('Nov2030')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(validateMilestoneIdFormat('')).toBe(false);
      expect(validateMilestoneIdFormat('January2026')).toBe(false); // Full month name
      expect(validateMilestoneIdFormat('jan2026')).toBe(false); // Lowercase first letter
      expect(validateMilestoneIdFormat('JAN2026')).toBe(false); // All uppercase
      expect(validateMilestoneIdFormat('Jan26')).toBe(false); // 2-digit year
      expect(validateMilestoneIdFormat('Ja2026')).toBe(false); // 2-letter month
      expect(validateMilestoneIdFormat('2026-01')).toBe(false); // Different format
    });

    it('should reject null/undefined', () => {
      expect(validateMilestoneIdFormat(null as any)).toBe(false);
      expect(validateMilestoneIdFormat(undefined as any)).toBe(false);
    });
  });

  describe('parseMilestoneNameFromFixVersions', () => {
    it('should parse simple milestone names', () => {
      expect(parseMilestoneNameFromFixVersions('January 2026')).toBe('January 2026');
      expect(parseMilestoneNameFromFixVersions('v1.0')).toBe('v1.0');
      expect(parseMilestoneNameFromFixVersions('Release 2.0')).toBe('Release 2.0');
    });

    it('should preserve parentheses content', () => {
      expect(parseMilestoneNameFromFixVersions('January 2026 (W51, W1, W3)')).toBe(
        'January 2026 (W51, W1, W3)'
      );
      expect(parseMilestoneNameFromFixVersions('Sprint (Q1)')).toBe('Sprint (Q1)');
    });

    it('should extract first milestone when multiple are present', () => {
      expect(parseMilestoneNameFromFixVersions('January 2026, February 2026')).toBe(
        'January 2026'
      );
      expect(parseMilestoneNameFromFixVersions('v1.0, v2.0, v3.0')).toBe('v1.0');
    });

    it('should handle milestones with parentheses and multiple entries', () => {
      expect(
        parseMilestoneNameFromFixVersions('January 2026 (W51, W1), February 2026')
      ).toBe('January 2026 (W51, W1)');
    });

    it('should trim whitespace', () => {
      expect(parseMilestoneNameFromFixVersions('  January 2026  ')).toBe('January 2026');
      expect(parseMilestoneNameFromFixVersions('v1.0 , v2.0')).toBe('v1.0');
    });

    it('should return null for empty or null input', () => {
      expect(parseMilestoneNameFromFixVersions('')).toBe(null);
      expect(parseMilestoneNameFromFixVersions(null as any)).toBe(null);
      expect(parseMilestoneNameFromFixVersions(undefined as any)).toBe(null);
    });

    it('should handle nested parentheses', () => {
      expect(parseMilestoneNameFromFixVersions('Release (Alpha (1))')).toBe(
        'Release (Alpha (1))'
      );
    });
  });

  describe('validateArguments', () => {
    describe('sprint import type', () => {
      it('should pass with valid sprint arguments', () => {
        const result = validateArguments(
          { sprintId: '2025-W45', jiraSprintId: '16786' },
          'sprint'
        );
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should pass with empty sprint arguments (optional)', () => {
        const result = validateArguments({}, 'sprint');
        expect(result.valid).toBe(true);
      });

      it('should fail with invalid sprint ID format', () => {
        const result = validateArguments(
          { sprintId: 'invalid-format' },
          'sprint'
        );
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Invalid sprint ID format');
      });

      it('should fail with invalid Jira sprint ID format', () => {
        const result = validateArguments(
          { jiraSprintId: 'not-numeric' },
          'sprint'
        );
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Invalid Jira sprint ID format');
      });
    });

    describe('milestone import type', () => {
      it('should pass with valid milestone arguments', () => {
        const result = validateArguments(
          { milestoneId: 'Jan2026' },
          'milestone'
        );
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should pass with empty milestone arguments (optional)', () => {
        const result = validateArguments({}, 'milestone');
        expect(result.valid).toBe(true);
      });

      it('should fail with invalid milestone ID format', () => {
        const result = validateArguments(
          { milestoneId: 'invalid' },
          'milestone'
        );
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Invalid milestone ID format');
      });
    });

    describe('invalid import type', () => {
      it('should fail with invalid import type', () => {
        const result = validateArguments({}, 'invalid' as any);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Invalid --type');
      });
    });
  });

  describe('CsvValidationError', () => {
    it('should create error with correct name', () => {
      const error = new CsvValidationError('Test error');
      expect(error.name).toBe('CsvValidationError');
      expect(error.message).toBe('Test error');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('validateCsvSchema', () => {
    const mockedFs = fs as jest.Mocked<typeof fs>;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should fail when file does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      const result = await validateCsvSchema('/path/to/missing.csv', 'sprint');

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('CSV file not found');
    });

    it('should fail when CSV is empty', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue('' as any);

      const result = await validateCsvSchema('/path/to/empty.csv', 'sprint');

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('empty');
    });

    it('should fail when required columns are missing for sprint import', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(
        'Issue key,Summary,Issue Type,Description\nTEST-1,Test Summary,Story,Test Description' as any
      );

      const result = await validateCsvSchema('/path/to/test.csv', 'sprint');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required column for sprint import: Sprint');
    });

    it('should fail when required columns are missing for milestone import', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(
        'Issue key,Summary,Issue Type,Description\nTEST-1,Test Summary,Story,Test Description' as any
      );

      const result = await validateCsvSchema('/path/to/test.csv', 'milestone');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required column for milestone import: Fix Versions');
    });

    it('should pass with valid sprint CSV', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(
        'Issue key,Summary,Issue Type,Description,Sprint\nTEST-1,Test Summary,Story,Test Description,Sprint 1' as any
      );

      const result = await validateCsvSchema('/path/to/valid.csv', 'sprint');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass with valid milestone CSV', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(
        'Issue key,Summary,Issue Type,Description,Fix Versions\nTEST-1,Test Summary,Story,Test Description,January 2026' as any
      );

      const result = await validateCsvSchema('/path/to/valid.csv', 'milestone');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect empty Issue key in data rows', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(
        'Issue key,Summary,Issue Type,Description,Sprint\n,Test Summary,Story,Test Description,Sprint 1' as any
      );

      const result = await validateCsvSchema('/path/to/test.csv', 'sprint');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Issue key is empty'))).toBe(true);
    });

    it('should detect empty Summary in data rows', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(
        'Issue key,Summary,Issue Type,Description,Sprint\nTEST-1,,Story,Test Description,Sprint 1' as any
      );

      const result = await validateCsvSchema('/path/to/test.csv', 'sprint');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Summary is empty'))).toBe(true);
    });

    it('should handle CSV parsing errors gracefully', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockRejectedValue(new Error('File read error'));

      const result = await validateCsvSchema('/path/to/error.csv', 'sprint');

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('File read error');
    });

    it('should handle case-insensitive column matching', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(
        'ISSUE KEY,SUMMARY,ISSUE TYPE,DESCRIPTION,SPRINT\nTEST-1,Test Summary,Story,Test Description,Sprint 1' as any
      );

      const result = await validateCsvSchema('/path/to/valid.csv', 'sprint');

      expect(result.valid).toBe(true);
    });
  });

  describe('extractSprintDataFromCsv', () => {
    const mockedFs = fs as jest.Mocked<typeof fs>;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should extract unique sprints from CSV', async () => {
      mockedFs.readFile.mockResolvedValue(
        'Issue key,Sprint\nTEST-1,Sprint 1\nTEST-2,Sprint 1\nTEST-3,Sprint 2' as any
      );

      const result = await extractSprintDataFromCsv('/path/to/test.csv');

      expect(result.hasSprintColumn).toBe(true);
      expect(result.uniqueSprints).toContain('Sprint 1');
      expect(result.uniqueSprints).toContain('Sprint 2');
      expect(result.uniqueSprints).toHaveLength(2);
      expect(result.sprintName).toBe('Sprint 1');
    });

    it('should return empty when no Sprint column exists', async () => {
      mockedFs.readFile.mockResolvedValue(
        'Issue key,Summary\nTEST-1,Test Summary' as any
      );

      const result = await extractSprintDataFromCsv('/path/to/test.csv');

      expect(result.hasSprintColumn).toBe(false);
      expect(result.uniqueSprints).toHaveLength(0);
    });

    it('should return empty when CSV is empty', async () => {
      mockedFs.readFile.mockResolvedValue('' as any);

      const result = await extractSprintDataFromCsv('/path/to/empty.csv');

      expect(result.hasSprintColumn).toBe(false);
      expect(result.uniqueSprints).toHaveLength(0);
    });

    it('should handle file read errors gracefully', async () => {
      mockedFs.readFile.mockRejectedValue(new Error('File not found'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await extractSprintDataFromCsv('/path/to/error.csv');

      expect(result.hasSprintColumn).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should skip empty sprint values', async () => {
      mockedFs.readFile.mockResolvedValue(
        'Issue key,Sprint\nTEST-1,Sprint 1\nTEST-2,\nTEST-3,Sprint 1' as any
      );

      const result = await extractSprintDataFromCsv('/path/to/test.csv');

      expect(result.uniqueSprints).toEqual(['Sprint 1']);
    });
  });

  describe('extractMilestoneDataFromCsv', () => {
    const mockedFs = fs as jest.Mocked<typeof fs>;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should extract unique milestones from CSV', async () => {
      mockedFs.readFile.mockResolvedValue(
        'Issue key,Fix Versions\nTEST-1,January 2026\nTEST-2,January 2026\nTEST-3,February 2026' as any
      );

      const result = await extractMilestoneDataFromCsv('/path/to/test.csv');

      expect(result.hasFixVersionsColumn).toBe(true);
      expect(result.uniqueMilestones).toContain('January 2026');
      expect(result.uniqueMilestones).toContain('February 2026');
      expect(result.uniqueMilestones).toHaveLength(2);
      expect(result.milestoneName).toBe('February 2026'); // Sorted alphabetically
    });

    it('should return empty when no Fix Versions column exists', async () => {
      mockedFs.readFile.mockResolvedValue(
        'Issue key,Summary\nTEST-1,Test Summary' as any
      );

      const result = await extractMilestoneDataFromCsv('/path/to/test.csv');

      expect(result.hasFixVersionsColumn).toBe(false);
      expect(result.uniqueMilestones).toHaveLength(0);
    });

    it('should return empty when CSV is empty', async () => {
      mockedFs.readFile.mockResolvedValue('' as any);

      const result = await extractMilestoneDataFromCsv('/path/to/empty.csv');

      expect(result.hasFixVersionsColumn).toBe(false);
      expect(result.uniqueMilestones).toHaveLength(0);
    });

    it('should handle file read errors gracefully', async () => {
      mockedFs.readFile.mockRejectedValue(new Error('File not found'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await extractMilestoneDataFromCsv('/path/to/error.csv');

      expect(result.hasFixVersionsColumn).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle milestones with parentheses', async () => {
      // CSV values with internal commas must be quoted
      mockedFs.readFile.mockResolvedValue(
        'Issue key,Fix Versions\nTEST-1,"January 2026 (W1, W2)"\nTEST-2,"January 2026 (W1, W2)"' as any
      );

      const result = await extractMilestoneDataFromCsv('/path/to/test.csv');

      expect(result.uniqueMilestones).toContain('January 2026 (W1, W2)');
    });

    it('should extract first milestone when multiple are in one cell', async () => {
      mockedFs.readFile.mockResolvedValue(
        'Issue key,Fix Versions\nTEST-1,January 2026, February 2026' as any
      );

      const result = await extractMilestoneDataFromCsv('/path/to/test.csv');

      expect(result.uniqueMilestones).toContain('January 2026');
      expect(result.uniqueMilestones).not.toContain('February 2026');
    });
  });
});
