/**
 * Unit Tests for Backlog Validator
 *
 * Tests ticket validation, report generation, and backlog validation.
 */

import fs from 'fs-extra';
import { glob } from 'glob';
import {
  ValidationReport,
  TicketValidationError,
  validateTicket,
  validateBacklog,
} from '../validator.js';
import { parseFrontmatter } from '../../common/yaml-frontmatter.js';

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock glob
jest.mock('glob');
const mockedGlob = glob as jest.MockedFunction<typeof glob>;

// Mock yaml-frontmatter
jest.mock('../../common/yaml-frontmatter.js');
const mockedParseFrontmatter = parseFrontmatter as jest.MockedFunction<
  typeof parseFrontmatter
>;

describe('backlog/validator', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('TicketValidationError', () => {
    it('should create error with correct name', () => {
      const error = new TicketValidationError('Test error');
      expect(error.name).toBe('TicketValidationError');
      expect(error.message).toBe('Test error');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('ValidationReport', () => {
    let report: ValidationReport;

    beforeEach(() => {
      report = new ValidationReport();
    });

    it('should initialize with zero counts', () => {
      expect(report.valid).toBe(0);
      expect(report.warnings).toEqual([]);
      expect(report.errors).toEqual([]);
    });

    it('should track valid tickets', () => {
      report.addValid();
      report.addValid();
      expect(report.valid).toBe(2);
    });

    it('should track warnings with file path', () => {
      report.addWarning('test.md', 'Missing field');
      report.addWarning('other.md', 'Another issue');

      expect(report.warnings).toHaveLength(2);
      expect(report.warnings[0]).toBe('test.md: Missing field');
      expect(report.warnings[1]).toBe('other.md: Another issue');
    });

    it('should track errors with file path', () => {
      report.addError('test.md', 'Invalid format');
      report.addError('other.md', 'Parse failed');

      expect(report.errors).toHaveLength(2);
      expect(report.errors[0]).toBe('test.md: Invalid format');
      expect(report.errors[1]).toBe('other.md: Parse failed');
    });

    describe('getSummary', () => {
      it('should generate summary with counts', () => {
        report.addValid();
        report.addValid();
        report.addWarning('file.md', 'Warning message');
        report.addError('file.md', 'Error message');

        const summary = report.getSummary();

        expect(summary).toContain('Valid:    2/4');
        expect(summary).toContain('Warnings: 1/4');
        expect(summary).toContain('Errors:   1/4');
      });

      it('should include warnings section when there are warnings', () => {
        report.addWarning('file.md', 'Test warning');

        const summary = report.getSummary();

        expect(summary).toContain('Warnings:');
        expect(summary).toContain('file.md: Test warning');
      });

      it('should include errors section when there are errors', () => {
        report.addError('file.md', 'Test error');

        const summary = report.getSummary();

        expect(summary).toContain('Errors:');
        expect(summary).toContain('file.md: Test error');
      });

      it('should not include warnings list when no warnings', () => {
        report.addValid();

        const summary = report.getSummary();

        // Should show count but not a warnings list
        expect(summary).toContain('Warnings: 0/1');
        expect(summary.match(/Warnings:/g)).toHaveLength(1); // Only in count line
      });

      it('should not include errors list when no errors', () => {
        report.addValid();

        const summary = report.getSummary();

        // Should show count but not an errors list
        expect(summary).toContain('Errors:   0/1');
        expect(summary.match(/Errors:/g)).toHaveLength(1); // Only in count line
      });
    });
  });

  describe('validateTicket', () => {
    it('should validate ticket with all required fields', async () => {
      const report = new ValidationReport();
      mockedFs.readFile.mockResolvedValue(`---
documentType: story
title: Test Story
description: Test description
createdDate: 2025-01-01
jira-ticketId: TEST-123
jira-url: https://jira.example.com/TEST-123
jira-parent: DAPM-100
jira-related: []
jira-blocking: []
jira-blockedBy: []
jira-fixVersion: Nov2025
jira-internalNotes: ""
framework-documentation: ""
framework-milestone: Nov2025
framework-technicalGuides: ""
framework-relatedLocal: ""
---
# Content` as any);

      mockedParseFrontmatter.mockReturnValue({
        data: {
          documentType: 'story',
          title: 'Test Story',
          description: 'Test description',
          createdDate: '2025-01-01',
          'jira-ticketId': 'TEST-123',
          'jira-url': 'https://jira.example.com/TEST-123',
          'jira-parent': 'DAPM-100',
          'jira-related': [],
          'jira-blocking': [],
          'jira-blockedBy': [],
          'jira-fixVersion': 'Nov2025',
          'jira-internalNotes': '',
          'framework-documentation': '',
          'framework-milestone': 'Nov2025',
          'framework-technicalGuides': '',
          'framework-relatedLocal': '',
        },
        content: '# Content',
        matter: '',
      });

      await validateTicket('/path/to/STORY-test.md', report);

      expect(report.valid).toBe(1);
      expect(report.errors).toHaveLength(0);
    });

    it('should report error when file does not start with ---', async () => {
      const report = new ValidationReport();
      mockedFs.readFile.mockResolvedValue('No frontmatter content' as any);

      await validateTicket('/path/to/test.md', report);

      expect(report.errors).toHaveLength(1);
      expect(report.errors[0]).toContain('Failed to parse YAML frontmatter');
    });

    it('should report error when frontmatter parsing fails', async () => {
      const report = new ValidationReport();
      mockedFs.readFile.mockResolvedValue('---\ninvalid yaml: [' as any);
      mockedParseFrontmatter.mockImplementation(() => {
        throw new Error('Parse error');
      });

      await validateTicket('/path/to/test.md', report);

      expect(report.errors).toHaveLength(1);
      expect(report.errors[0]).toContain('Failed to parse YAML frontmatter');
    });

    it('should report error when required field is missing', async () => {
      const report = new ValidationReport();
      mockedFs.readFile.mockResolvedValue('---\ndocumentType: story\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: { documentType: 'story' }, // Missing title, description, createdDate
        content: '',
        matter: '',
      });

      await validateTicket('/path/to/STORY-test.md', report);

      expect(report.errors.length).toBeGreaterThan(0);
      expect(report.errors[0]).toContain('Missing required field');
    });

    it('should determine document type from filename', async () => {
      const report = new ValidationReport();
      mockedFs.readFile.mockResolvedValue('---\ntest: value\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: {
          documentType: 'story',
          title: 'Test',
          description: 'Desc',
          createdDate: '2025-01-01',
        },
        content: '',
        matter: '',
      });

      await validateTicket('/path/to/STORY-feature.md', report);

      // Should not add a warning about document type since filename contains STORY
      expect(
        report.warnings.filter((w) => w.includes('Could not determine document type'))
      ).toHaveLength(0);
    });

    it('should warn when document type cannot be determined from filename', async () => {
      const report = new ValidationReport();
      mockedFs.readFile.mockResolvedValue('---\ntest: value\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: {
          documentType: 'story',
          title: 'Test',
          description: 'Desc',
          createdDate: '2025-01-01',
        },
        content: '',
        matter: '',
      });

      await validateTicket('/path/to/random-file.md', report);

      expect(
        report.warnings.some((w) => w.includes('Could not determine document type'))
      ).toBe(true);
    });

    it('should warn when Jira fields are missing', async () => {
      const report = new ValidationReport();
      mockedFs.readFile.mockResolvedValue('---\ntest: value\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: {
          documentType: 'story',
          title: 'Test',
          description: 'Desc',
          createdDate: '2025-01-01',
        },
        content: '',
        matter: '',
      });

      await validateTicket('/path/to/STORY-test.md', report);

      expect(report.warnings.some((w) => w.includes('Missing Jira field'))).toBe(true);
    });

    it('should warn when framework fields are missing', async () => {
      const report = new ValidationReport();
      mockedFs.readFile.mockResolvedValue('---\ntest: value\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: {
          documentType: 'story',
          title: 'Test',
          description: 'Desc',
          createdDate: '2025-01-01',
        },
        content: '',
        matter: '',
      });

      await validateTicket('/path/to/STORY-test.md', report);

      expect(report.warnings.some((w) => w.includes('Missing Framework field'))).toBe(
        true
      );
    });

    it('should warn when exported ticket is missing jira-url', async () => {
      const report = new ValidationReport();
      mockedFs.readFile.mockResolvedValue('---\ntest: value\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: {
          documentType: 'story',
          title: 'Test',
          description: 'Desc',
          createdDate: '2025-01-01',
          'jira-ticketId': 'TEST-123',
          // Missing jira-url
        },
        content: '',
        matter: '',
      });

      await validateTicket('/path/to/STORY-test.md', report);

      expect(report.warnings.some((w) => w.includes('missing jira-url'))).toBe(true);
    });

    it('should warn when exported ticket is missing exportedDate', async () => {
      const report = new ValidationReport();
      mockedFs.readFile.mockResolvedValue('---\ntest: value\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: {
          documentType: 'story',
          title: 'Test',
          description: 'Desc',
          createdDate: '2025-01-01',
          'jira-ticketId': 'TEST-123',
          'jira-url': 'https://jira.example.com/TEST-123',
          // Missing exportedDate
        },
        content: '',
        matter: '',
      });

      await validateTicket('/path/to/STORY-test.md', report);

      expect(report.warnings.some((w) => w.includes('missing exportedDate'))).toBe(true);
    });

    it('should warn for unknown milestone', async () => {
      const report = new ValidationReport();
      mockedFs.readFile.mockResolvedValue('---\ntest: value\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: {
          documentType: 'story',
          title: 'Test',
          description: 'Desc',
          createdDate: '2025-01-01',
          milestone: 'Dec2099',
        },
        content: '',
        matter: '',
      });

      await validateTicket('/path/to/STORY-test.md', report);

      expect(report.warnings.some((w) => w.includes('Unknown milestone'))).toBe(true);
    });

    it('should not warn for valid milestones', async () => {
      for (const milestone of ['Nov2025', 'Jan2026', 'Feb2026', 'Mar2026']) {
        const report = new ValidationReport();
        mockedFs.readFile.mockResolvedValue('---\ntest: value\n---' as any);
        mockedParseFrontmatter.mockReturnValue({
          data: {
            documentType: 'story',
            title: 'Test',
            description: 'Desc',
            version: '1.0.0',
            createdDate: '2025-01-01',
            milestone,
          },
          content: '',
          matter: '',
        });

        await validateTicket('/path/to/STORY-test.md', report);

        expect(report.warnings.some((w) => w.includes('Unknown milestone'))).toBe(false);
      }
    });

    it('should warn for invalid jira-parent format', async () => {
      const report = new ValidationReport();
      mockedFs.readFile.mockResolvedValue('---\ntest: value\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: {
          documentType: 'story',
          title: 'Test',
          description: 'Desc',
          createdDate: '2025-01-01',
          'jira-parent': 'INVALID-123',
        },
        content: '',
        matter: '',
      });

      await validateTicket('/path/to/STORY-test.md', report);

      expect(report.warnings.some((w) => w.includes('Invalid jira-parent format'))).toBe(
        true
      );
    });

    it('should accept valid jira-parent format', async () => {
      const report = new ValidationReport();
      mockedFs.readFile.mockResolvedValue('---\ntest: value\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: {
          documentType: 'story',
          title: 'Test',
          description: 'Desc',
          createdDate: '2025-01-01',
          'jira-parent': 'DAPM-123',
        },
        content: '',
        matter: '',
      });

      await validateTicket('/path/to/STORY-test.md', report);

      expect(report.warnings.some((w) => w.includes('Invalid jira-parent format'))).toBe(
        false
      );
    });

    it('should warn when jira-related is not an array', async () => {
      const report = new ValidationReport();
      mockedFs.readFile.mockResolvedValue('---\ntest: value\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: {
          documentType: 'story',
          title: 'Test',
          description: 'Desc',
          createdDate: '2025-01-01',
          'jira-related': 'TEST-123', // Should be array
        },
        content: '',
        matter: '',
      });

      await validateTicket('/path/to/STORY-test.md', report);

      expect(
        report.warnings.some((w) => w.includes('jira-related should be an array'))
      ).toBe(true);
    });

    it('should warn about file naming convention', async () => {
      const report = new ValidationReport();
      mockedFs.readFile.mockResolvedValue('---\ntest: value\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: {
          documentType: 'story',
          title: 'Test',
          description: 'Desc',
          createdDate: '2025-01-01',
        },
        content: '',
        matter: '',
      });

      await validateTicket('/path/to/badfilename.md', report);

      expect(report.warnings.some((w) => w.includes('File should be named'))).toBe(true);
    });

    it('should use relative path in report when basePath provided', async () => {
      const report = new ValidationReport();
      mockedFs.readFile.mockResolvedValue('no frontmatter' as any);

      await validateTicket('/project/backlog/STORY-test.md', report, '/project/backlog');

      expect(report.errors[0]).toContain('STORY-test.md');
      expect(report.errors[0]).not.toContain('/project/backlog');
    });

    it('should handle file read errors', async () => {
      const report = new ValidationReport();
      mockedFs.readFile.mockRejectedValue(new Error('File not found'));

      await validateTicket('/path/to/missing.md', report);

      expect(report.errors).toHaveLength(1);
      expect(report.errors[0]).toContain('Failed to validate');
    });
  });

  describe('validateBacklog', () => {
    it('should throw error when backlog directory does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      await expect(validateBacklog('/nonexistent')).rejects.toThrow(
        TicketValidationError
      );
      await expect(validateBacklog('/nonexistent')).rejects.toThrow(
        'Backlog directory not found'
      );
    });

    it('should validate all ticket types', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedGlob.mockImplementation(async (pattern: any) => {
        if (pattern.includes('stories')) {
          return ['/backlog/tickets/stories/STORY-test.md'];
        }
        if (pattern.includes('tasks')) {
          return ['/backlog/tickets/tasks/TASK-test.md'];
        }
        if (pattern.includes('bugs')) {
          return ['/backlog/tickets/bugs/BUG-test.md'];
        }
        if (pattern.includes('spikes')) {
          return ['/backlog/tickets/spikes/SPIKE-test.md'];
        }
        if (pattern.includes('epics')) {
          return ['/backlog/epics/EPIC-test.md'];
        }
        return [];
      });

      mockedFs.readFile.mockResolvedValue('---\ntest: value\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: {
          documentType: 'story',
          title: 'Test',
          description: 'Desc',
          createdDate: '2025-01-01',
        },
        content: '',
        matter: '',
      });

      const report = await validateBacklog('/backlog');

      // Should have validated 5 files (stories, tasks, bugs, spikes, epics)
      expect(report.valid).toBe(5);
    });

    it('should skip README.md files', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedGlob.mockImplementation(async (pattern: any) => {
        if (pattern.includes('stories')) {
          return [
            '/backlog/tickets/stories/STORY-test.md',
            '/backlog/tickets/stories/README.md',
          ];
        }
        return [];
      });

      mockedFs.readFile.mockResolvedValue('---\ntest: value\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: {
          documentType: 'story',
          title: 'Test',
          description: 'Desc',
          createdDate: '2025-01-01',
        },
        content: '',
        matter: '',
      });

      const report = await validateBacklog('/backlog');

      // Should have validated only 1 file (not README.md)
      expect(report.valid).toBe(1);
    });

    it('should validate workflow folders', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedGlob.mockImplementation(async (pattern: any) => {
        if (pattern.includes('Draft')) {
          return ['/backlog/_workflow/Draft/STORY-draft.md'];
        }
        if (pattern.includes('ReadyToExport')) {
          return ['/backlog/_workflow/ReadyToExport/STORY-ready.md'];
        }
        if (pattern.includes('Exported')) {
          return ['/backlog/_workflow/Exported/STORY-exported.md'];
        }
        return [];
      });

      mockedFs.readFile.mockResolvedValue('---\ntest: value\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: {
          documentType: 'story',
          title: 'Test',
          description: 'Desc',
          createdDate: '2025-01-01',
        },
        content: '',
        matter: '',
      });

      const report = await validateBacklog('/backlog');

      // Should have validated 3 workflow files
      expect(report.valid).toBe(3);
    });

    it('should return empty report when no files found', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedGlob.mockResolvedValue([]);

      const report = await validateBacklog('/backlog');

      expect(report.valid).toBe(0);
      expect(report.warnings).toHaveLength(0);
      expect(report.errors).toHaveLength(0);
    });
  });
});
