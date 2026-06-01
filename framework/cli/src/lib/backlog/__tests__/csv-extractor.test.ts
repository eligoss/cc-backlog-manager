/**
 * Unit Tests for CSV Extractor
 *
 * Tests CSV parsing, field normalization, and data extraction functions.
 */

import fs from 'fs-extra';
import {
  parseCsvFile,
  mapCsvRowToTicket,
  normalizeFieldValue,
  sanitizeFilename,
  convertJiraToMarkdown,
  extractAcceptanceCriteria,
  parseJiraDate,
} from '../csv-extractor.js';

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('csv-extractor', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('normalizeFieldValue', () => {
    describe('storyPoints field', () => {
      it('should parse integer story points', () => {
        expect(normalizeFieldValue('storyPoints', '5')).toBe(5);
        expect(normalizeFieldValue('storyPoints', '13')).toBe(13);
      });

      it('should floor float story points', () => {
        expect(normalizeFieldValue('storyPoints', '5.5')).toBe(5);
        expect(normalizeFieldValue('storyPoints', '3.9')).toBe(3);
      });

      it('should return undefined for empty story points', () => {
        expect(normalizeFieldValue('storyPoints', '')).toBeUndefined();
        expect(normalizeFieldValue('storyPoints', '  ')).toBeUndefined();
      });

      it('should return undefined for non-numeric story points', () => {
        expect(normalizeFieldValue('storyPoints', 'abc')).toBeUndefined();
        expect(normalizeFieldValue('storyPoints', 'five')).toBeUndefined();
      });

      it('should return undefined for null/undefined', () => {
        expect(normalizeFieldValue('storyPoints', null as any)).toBeUndefined();
        expect(normalizeFieldValue('storyPoints', undefined as any)).toBeUndefined();
      });
    });

    describe('labels field', () => {
      it('should split comma-separated labels', () => {
        expect(normalizeFieldValue('labels', 'frontend,backend')).toEqual([
          'frontend',
          'backend',
        ]);
      });

      it('should split newline-separated labels', () => {
        expect(normalizeFieldValue('labels', 'frontend\nbackend')).toEqual([
          'frontend',
          'backend',
        ]);
      });

      it('should trim labels', () => {
        expect(normalizeFieldValue('labels', ' frontend , backend ')).toEqual([
          'frontend',
          'backend',
        ]);
      });

      it('should filter empty labels', () => {
        expect(normalizeFieldValue('labels', 'frontend,,backend')).toEqual([
          'frontend',
          'backend',
        ]);
      });

      it('should return undefined for empty labels', () => {
        expect(normalizeFieldValue('labels', '')).toBeUndefined();
        expect(normalizeFieldValue('labels', '  ')).toBeUndefined();
      });

      it('should return undefined for null/undefined labels', () => {
        expect(normalizeFieldValue('labels', null as any)).toBeUndefined();
        expect(normalizeFieldValue('labels', undefined as any)).toBeUndefined();
      });
    });

    describe('date fields', () => {
      it('should parse Jira date format for createdDate', () => {
        expect(normalizeFieldValue('createdDate', '18/Nov/25 12:59 PM')).toBe('2025-11-18');
      });

      it('should parse Jira date format for updatedDate', () => {
        expect(normalizeFieldValue('updatedDate', '25/Dec/24 3:30 PM')).toBe('2024-12-25');
      });

      it('should parse ISO date format', () => {
        expect(normalizeFieldValue('createdDate', '2025-11-18')).toBe('2025-11-18');
      });

      it('should return null for invalid dates', () => {
        expect(normalizeFieldValue('createdDate', 'invalid')).toBeNull();
      });
    });

    describe('generic string fields', () => {
      it('should trim string values', () => {
        expect(normalizeFieldValue('summary', '  Test Summary  ')).toBe('Test Summary');
      });

      it('should return undefined for empty strings', () => {
        expect(normalizeFieldValue('description', '')).toBeUndefined();
        expect(normalizeFieldValue('description', '   ')).toBeUndefined();
      });

      it('should return empty string for null/undefined on required fields', () => {
        expect(normalizeFieldValue('summary', null as any)).toBe('');
        expect(normalizeFieldValue('issueKey', undefined as any)).toBe('');
      });
    });
  });

  describe('sanitizeFilename', () => {
    it('should convert to kebab-case', () => {
      expect(sanitizeFilename('Hello World Test')).toBe('hello-world-test');
    });

    it('should remove Jira ticket prefix', () => {
      expect(sanitizeFilename('DAPM-1315: Fix the bug')).toBe('fix-the-bug');
      expect(sanitizeFilename('TEST-123 Add feature')).toBe('add-feature');
    });

    it('should remove APM-R prefixes', () => {
      expect(sanitizeFilename('APM-R: FE: Add button')).toBe('add-button');
      expect(sanitizeFilename('APM-R: BE: Create API')).toBe('create-api');
      expect(sanitizeFilename('APM-R: Add feature')).toBe('add-feature');
    });

    it('should remove special characters', () => {
      expect(sanitizeFilename('Hello! @World# $Test%')).toBe('hello-world-test');
    });

    it('should collapse multiple hyphens', () => {
      expect(sanitizeFilename('Hello---World   Test')).toBe('hello-world-test');
    });

    it('should remove leading/trailing hyphens', () => {
      expect(sanitizeFilename('---Hello World---')).toBe('hello-world');
    });

    it('should truncate to 60 chars at word boundary', () => {
      const longText =
        'This is a very long summary that should be truncated to sixty characters at a word boundary';
      const result = sanitizeFilename(longText);
      expect(result.length).toBeLessThanOrEqual(60);
      expect(result).not.toContain('boundary'); // Truncated before this word
    });

    it('should return empty string for empty input', () => {
      expect(sanitizeFilename('')).toBe('');
      expect(sanitizeFilename(null as any)).toBe('');
    });
  });

  describe('convertJiraToMarkdown', () => {
    describe('headers', () => {
      it('should convert h1 headers', () => {
        expect(convertJiraToMarkdown('h1. Title')).toBe('# Title');
      });

      it('should convert h2 headers', () => {
        expect(convertJiraToMarkdown('h2. Subtitle')).toBe('## Subtitle');
      });

      it('should convert h3 headers', () => {
        expect(convertJiraToMarkdown('h3. Section')).toBe('### Section');
      });

      it('should convert h4 headers', () => {
        expect(convertJiraToMarkdown('h4. Subsection')).toBe('#### Subsection');
      });
    });

    describe('inline code', () => {
      it('should convert inline code', () => {
        expect(convertJiraToMarkdown('Use {{code}} here')).toBe('Use `code` here');
      });

      it('should handle multiple inline code blocks', () => {
        expect(convertJiraToMarkdown('{{foo}} and {{bar}}')).toBe('`foo` and `bar`');
      });
    });

    describe('code blocks', () => {
      it('should convert noformat blocks with fenced code block on own lines', () => {
        expect(convertJiraToMarkdown('{noformat}code{noformat}')).toBe('\n```\ncode\n```\n');
      });

      it('should convert code blocks with language using fenced code block on own lines', () => {
        expect(convertJiraToMarkdown('{code:java}public class{code}')).toBe(
          '\n```\npublic class\n```\n'
        );
      });
    });

    describe('lists', () => {
      it('should convert bullet lists', () => {
        expect(convertJiraToMarkdown('* item 1\n* item 2')).toBe('- item 1\n- item 2');
      });

      it('should convert numbered lists', () => {
        expect(convertJiraToMarkdown('# item 1\n# item 2')).toBe('1. item 1\n1. item 2');
      });
    });

    describe('bold', () => {
      it('should convert bold text', () => {
        expect(convertJiraToMarkdown('*bold text*')).toBe('**bold text**');
      });
    });

    describe('links', () => {
      it('should convert Jira links', () => {
        expect(convertJiraToMarkdown('[link text|http://example.com]')).toBe(
          '[link text](http://example.com)'
        );
      });

      it('should remove smart-link annotations', () => {
        expect(convertJiraToMarkdown('[link|http://example.com|smart-link]')).toBe(
          '[link](http://example.com)'
        );
      });
    });

    describe('edge cases', () => {
      it('should return empty string for empty input', () => {
        expect(convertJiraToMarkdown('')).toBe('');
        expect(convertJiraToMarkdown('   ')).toBe('   ');
      });

      it('should handle null/undefined', () => {
        expect(convertJiraToMarkdown(null as any)).toBe('');
        expect(convertJiraToMarkdown(undefined as any)).toBe('');
      });

      it('should not confuse numbered lists with headers', () => {
        const input = 'h1. Title\n# list item';
        const result = convertJiraToMarkdown(input);
        expect(result).toContain('# Title');
        expect(result).toContain('1. list item');
      });
    });
  });

  describe('extractAcceptanceCriteria', () => {
    it('should extract bullet points as criteria', () => {
      const input = '- Criterion 1\n- Criterion 2\n- Criterion 3';
      expect(extractAcceptanceCriteria(input)).toEqual([
        'Criterion 1',
        'Criterion 2',
        'Criterion 3',
      ]);
    });

    it('should extract asterisk bullet points', () => {
      const input = '* Criterion 1\n* Criterion 2';
      expect(extractAcceptanceCriteria(input)).toEqual(['Criterion 1', 'Criterion 2']);
    });

    it('should remove "Verify" prefix', () => {
      const input = '- Verify user can login\n- Verify button works';
      expect(extractAcceptanceCriteria(input)).toEqual([
        'user can login',
        'button works',
      ]);
    });

    it('should remove bold "Verify" prefix (Jira format)', () => {
      // In Jira markup, *text* is bold (converts to **text** in markdown)
      const input = '* *Verify* user can login\n* Verify button works';
      expect(extractAcceptanceCriteria(input)).toEqual([
        'user can login',
        'button works',
      ]);
    });

    it('should convert Jira markup before extracting', () => {
      const input = '* Verify feature works\n* Verify API responds';
      expect(extractAcceptanceCriteria(input)).toEqual([
        'feature works',
        'API responds',
      ]);
    });

    it('should return empty array for empty input', () => {
      expect(extractAcceptanceCriteria('')).toEqual([]);
      expect(extractAcceptanceCriteria('   ')).toEqual([]);
      expect(extractAcceptanceCriteria(null as any)).toEqual([]);
    });

    it('should ignore non-bullet lines', () => {
      const input = 'Some intro text\n- Criterion 1\nMore text\n- Criterion 2';
      expect(extractAcceptanceCriteria(input)).toEqual(['Criterion 1', 'Criterion 2']);
    });

    it('should skip empty criteria', () => {
      const input = '- Criterion 1\n- \n- Criterion 2';
      expect(extractAcceptanceCriteria(input)).toEqual(['Criterion 1', 'Criterion 2']);
    });
  });

  describe('parseJiraDate', () => {
    describe('Jira format', () => {
      it('should parse DD/Mon/YY format', () => {
        expect(parseJiraDate('18/Nov/25 12:59 PM')).toBe('2025-11-18');
        expect(parseJiraDate('01/Jan/26 9:00 AM')).toBe('2026-01-01');
        expect(parseJiraDate('31/Dec/24 11:59 PM')).toBe('2024-12-31');
      });

      it('should handle single digit day', () => {
        expect(parseJiraDate('1/Feb/25 10:00 AM')).toBe('2025-02-01');
        expect(parseJiraDate('5/Mar/26 3:30 PM')).toBe('2026-03-05');
      });

      it('should handle all months', () => {
        expect(parseJiraDate('1/Jan/25')).toBe('2025-01-01');
        expect(parseJiraDate('1/Feb/25')).toBe('2025-02-01');
        expect(parseJiraDate('1/Mar/25')).toBe('2025-03-01');
        expect(parseJiraDate('1/Apr/25')).toBe('2025-04-01');
        expect(parseJiraDate('1/May/25')).toBe('2025-05-01');
        expect(parseJiraDate('1/Jun/25')).toBe('2025-06-01');
        expect(parseJiraDate('1/Jul/25')).toBe('2025-07-01');
        expect(parseJiraDate('1/Aug/25')).toBe('2025-08-01');
        expect(parseJiraDate('1/Sep/25')).toBe('2025-09-01');
        expect(parseJiraDate('1/Oct/25')).toBe('2025-10-01');
        expect(parseJiraDate('1/Nov/25')).toBe('2025-11-01');
        expect(parseJiraDate('1/Dec/25')).toBe('2025-12-01');
      });

      it('should return null for invalid month', () => {
        expect(parseJiraDate('1/Xyz/25')).toBeNull();
      });
    });

    describe('ISO format', () => {
      it('should parse YYYY-MM-DD format', () => {
        expect(parseJiraDate('2025-11-18')).toBe('2025-11-18');
        expect(parseJiraDate('2024-01-01')).toBe('2024-01-01');
      });

      it('should reject invalid ISO dates', () => {
        expect(parseJiraDate('2025-13-01')).toBeNull(); // Invalid month
        expect(parseJiraDate('2025-00-01')).toBeNull(); // Invalid month
        expect(parseJiraDate('2025-01-32')).toBeNull(); // Invalid day
        expect(parseJiraDate('2025-01-00')).toBeNull(); // Invalid day
      });
    });

    describe('edge cases', () => {
      it('should return null for empty input', () => {
        expect(parseJiraDate('')).toBeNull();
        expect(parseJiraDate('   ')).toBeNull();
      });

      it('should return null for null/undefined', () => {
        expect(parseJiraDate(null as any)).toBeNull();
        expect(parseJiraDate(undefined as any)).toBeNull();
      });

      it('should return null for unrecognized format', () => {
        expect(parseJiraDate('November 18, 2025')).toBeNull();
        expect(parseJiraDate('18-11-2025')).toBeNull();
        expect(parseJiraDate('random text')).toBeNull();
      });

      it('should trim whitespace', () => {
        expect(parseJiraDate('  2025-11-18  ')).toBe('2025-11-18');
        expect(parseJiraDate('  18/Nov/25  ')).toBe('2025-11-18');
      });
    });
  });

  describe('mapCsvRowToTicket', () => {
    it('should map basic fields', () => {
      const row = {
        'Issue key': 'TEST-123',
        'Summary': 'Test Summary',
        'Issue Type': 'Story',
        'Status': 'In Progress',
        'Priority': 'High',
        'Description': 'Test description',
      };

      const ticket = mapCsvRowToTicket(row);

      expect(ticket.ticketId).toBe('TEST-123');
      expect(ticket.summary).toBe('Test Summary');
      expect(ticket.issueType).toBe('Story');
      expect(ticket.documentType).toBe('story');
      expect(ticket.status).toBe('In Progress');
      expect(ticket.priority).toBe('High');
      expect(ticket.description).toBe('Test description');
    });

    it('should map document type from issue type', () => {
      expect(mapCsvRowToTicket({ 'Issue key': 'T-1', 'Summary': 'S', 'Issue Type': 'Story' }).documentType).toBe('story');
      expect(mapCsvRowToTicket({ 'Issue key': 'T-1', 'Summary': 'S', 'Issue Type': 'Task' }).documentType).toBe('task');
      expect(mapCsvRowToTicket({ 'Issue key': 'T-1', 'Summary': 'S', 'Issue Type': 'Bug' }).documentType).toBe('bug');
      expect(mapCsvRowToTicket({ 'Issue key': 'T-1', 'Summary': 'S', 'Issue Type': 'Spike' }).documentType).toBe('spike');
      expect(mapCsvRowToTicket({ 'Issue key': 'T-1', 'Summary': 'S', 'Issue Type': 'Epic' }).documentType).toBe('epic');
      expect(mapCsvRowToTicket({ 'Issue key': 'T-1', 'Summary': 'S', 'Issue Type': 'Sub-task' }).documentType).toBe('task');
    });

    it('should default to task for unknown issue type', () => {
      const ticket = mapCsvRowToTicket({
        'Issue key': 'T-1',
        'Summary': 'S',
        'Issue Type': 'Unknown',
      });
      expect(ticket.documentType).toBe('task');
    });

    it('should generate filename from issue key and summary', () => {
      const ticket = mapCsvRowToTicket({
        'Issue key': 'TEST-123',
        'Summary': 'Add login feature',
        'Issue Type': 'Story',
      });

      expect(ticket.filename).toBe('123-add-login-feature.md');
    });

    it('should parse story points', () => {
      const ticket = mapCsvRowToTicket({
        'Issue key': 'T-1',
        'Summary': 'S',
        'Issue Type': 'Story',
        'Custom field (Story Points)': '5',
      });

      expect(ticket.storyPoints).toBe(5);
    });

    it('should parse labels', () => {
      const ticket = mapCsvRowToTicket({
        'Issue key': 'T-1',
        'Summary': 'S',
        'Issue Type': 'Story',
        'Labels': 'frontend,backend',
      });

      expect(ticket.labels).toEqual(['frontend', 'backend']);
    });

    it('should extract milestone from fix versions preserving full Jira name', () => {
      const ticket1 = mapCsvRowToTicket({
        'Issue key': 'T-1',
        'Summary': 'S',
        'Issue Type': 'Story',
        'Fix versions': 'November 2025',
      });
      expect(ticket1.milestone).toBe('November 2025');

      const ticket2 = mapCsvRowToTicket({
        'Issue key': 'T-1',
        'Summary': 'S',
        'Issue Type': 'Story',
        'Fix versions': 'February 2026',
      });
      expect(ticket2.milestone).toBe('February 2026');

      const ticket3 = mapCsvRowToTicket({
        'Issue key': 'T-1',
        'Summary': 'S',
        'Issue Type': 'Story',
        'Fix versions': 'March 2026',
      });
      expect(ticket3.milestone).toBe('March 2026');
    });

    it('should extract epic from parent', () => {
      const ticket = mapCsvRowToTicket({
        'Issue key': 'T-1',
        'Summary': 'S',
        'Issue Type': 'Story',
        'Parent key': 'EPIC-10',
        'Parent summary': 'User Authentication Epic',
      });

      expect(ticket.epic).toBe('EPIC-user-authentication-epic');
      expect(ticket.parentKey).toBe('EPIC-10');
      expect(ticket.parentSummary).toBe('User Authentication Epic');
    });

    it('should not set epic without both parent key and summary', () => {
      const ticket1 = mapCsvRowToTicket({
        'Issue key': 'T-1',
        'Summary': 'S',
        'Issue Type': 'Story',
        'Parent key': 'EPIC-10',
      });
      expect(ticket1.epic).toBeUndefined();

      const ticket2 = mapCsvRowToTicket({
        'Issue key': 'T-1',
        'Summary': 'S',
        'Issue Type': 'Story',
        'Parent summary': 'Epic Name',
      });
      expect(ticket2.epic).toBeUndefined();
    });

    it('should parse dates', () => {
      const ticket = mapCsvRowToTicket({
        'Issue key': 'T-1',
        'Summary': 'S',
        'Issue Type': 'Story',
        'Created': '18/Nov/25 12:00 PM',
        'Updated': '2025-12-01',
      });

      expect(ticket.createdDate).toBe('2025-11-18');
      expect(ticket.updatedDate).toBe('2025-12-01');
    });
  });

  describe('parseCsvFile', () => {
    it('should parse valid CSV file', async () => {
      mockedFs.readFile.mockResolvedValue(
        'Issue key,Summary,Issue Type,Description\nTEST-1,Test Summary,Story,Description' as any
      );

      const result = await parseCsvFile('/path/to/test.csv');

      expect(result.tickets).toHaveLength(1);
      expect(result.tickets[0].ticketId).toBe('TEST-1');
      expect(result.tickets[0].summary).toBe('Test Summary');
      expect(result.errors).toHaveLength(0);
    });

    it('should report error for missing Issue key', async () => {
      mockedFs.readFile.mockResolvedValue(
        'Issue key,Summary,Issue Type\n,Test Summary,Story' as any
      );

      const result = await parseCsvFile('/path/to/test.csv');

      expect(result.tickets).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Issue key is required');
    });

    it('should report error for missing Summary', async () => {
      mockedFs.readFile.mockResolvedValue(
        'Issue key,Summary,Issue Type\nTEST-1,,Story' as any
      );

      const result = await parseCsvFile('/path/to/test.csv');

      expect(result.tickets).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Summary is required');
    });

    it('should parse multiple rows', async () => {
      mockedFs.readFile.mockResolvedValue(
        'Issue key,Summary,Issue Type\nTEST-1,Summary 1,Story\nTEST-2,Summary 2,Task\nTEST-3,Summary 3,Bug' as any
      );

      const result = await parseCsvFile('/path/to/test.csv');

      expect(result.tickets).toHaveLength(3);
      expect(result.tickets[0].ticketId).toBe('TEST-1');
      expect(result.tickets[1].ticketId).toBe('TEST-2');
      expect(result.tickets[2].ticketId).toBe('TEST-3');
    });

    it('should skip invalid rows but continue processing', async () => {
      mockedFs.readFile.mockResolvedValue(
        'Issue key,Summary,Issue Type\nTEST-1,Summary 1,Story\n,Missing Key,Task\nTEST-3,Summary 3,Bug' as any
      );

      const result = await parseCsvFile('/path/to/test.csv');

      expect(result.tickets).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].row).toBe(2);
    });

    it('should report row number in errors', async () => {
      mockedFs.readFile.mockResolvedValue(
        'Issue key,Summary,Issue Type\nTEST-1,Summary 1,Story\n,Missing 1,Task\n,Missing 2,Bug' as any
      );

      const result = await parseCsvFile('/path/to/test.csv');

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].row).toBe(2);
      expect(result.errors[1].row).toBe(3);
    });

    it('should handle empty CSV', async () => {
      mockedFs.readFile.mockResolvedValue('Issue key,Summary,Issue Type' as any);

      const result = await parseCsvFile('/path/to/empty.csv');

      expect(result.tickets).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle CSV with all optional fields', async () => {
      mockedFs.readFile.mockResolvedValue(
        'Issue key,Summary,Issue Type,Status,Priority,Description,Assignee,Custom field (Story Points),Sprint,Fix versions,Labels,Custom field (Acceptance Criteria),Created,Updated,Parent key,Parent summary\n' +
          'TEST-1,Test Summary,Story,In Progress,High,Description,John,5,Sprint 1,November 2025,frontend,- AC 1,18/Nov/25,2025-12-01,EPIC-10,Epic Name' as any
      );

      const result = await parseCsvFile('/path/to/full.csv');

      expect(result.tickets).toHaveLength(1);
      const ticket = result.tickets[0];
      expect(ticket.ticketId).toBe('TEST-1');
      expect(ticket.status).toBe('In Progress');
      expect(ticket.priority).toBe('High');
      expect(ticket.assignee).toBe('John');
      expect(ticket.storyPoints).toBe(5);
      expect(ticket.sprint).toBe('Sprint 1');
      expect(ticket.milestone).toBe('November 2025');
      expect(ticket.labels).toEqual(['frontend']);
      expect(ticket.acceptanceCriteria).toBe('- AC 1');
      expect(ticket.createdDate).toBe('2025-11-18');
      expect(ticket.updatedDate).toBe('2025-12-01');
      expect(ticket.epic).toBe('EPIC-epic-name');
    });
  });
});
