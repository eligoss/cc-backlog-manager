import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  parseCsvFile,
  mapCsvRowToTicket,
  normalizeFieldValue,
  sanitizeFilename,
  convertJiraToMarkdown,
  extractAcceptanceCriteria,
  parseJiraDate,
  CsvTicket,
  CsvExtractionResult,
} from '../csv-extractor';
import fs from 'fs-extra';
import path from 'path';
import { createSandbox, TestSandbox } from '../../__tests__/test-utils';

describe('csv-extractor', () => {
  let sandbox: TestSandbox;

  beforeEach(async () => {
    sandbox = await createSandbox('csv-extractor-test');
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('parseCsvFile', () => {
    it('should parse valid CSV file', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      const csvContent = `Issue key,Summary,Issue Type,Description,Status,Priority
DAPM-1234,Test Story,Story,Test description,Open,High`;
      await fs.writeFile(csvPath, csvContent, 'utf-8');

      const result = await parseCsvFile(csvPath);

      expect(result.tickets).toHaveLength(1);
      expect(result.tickets[0].summary).toBe('Test Story');
      expect(result.tickets[0].issueType).toBe('Story');
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle UTF-8 encoding', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      const csvContent = `Issue key,Summary,Issue Type
DAPM-1234,Tést Störy with émojis 🚀,Story`;
      await fs.writeFile(csvPath, csvContent, 'utf-8');

      const result = await parseCsvFile(csvPath);

      expect(result.tickets).toHaveLength(1);
      expect(result.tickets[0].summary).toBe('Tést Störy with émojis 🚀');
    });

    it('should handle quoted fields with commas', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      const csvContent = `Issue key,Summary,Issue Type,Description
DAPM-1234,"Story with, comma",Story,"Description with, commas"`;
      await fs.writeFile(csvPath, csvContent, 'utf-8');

      const result = await parseCsvFile(csvPath);

      expect(result.tickets).toHaveLength(1);
      expect(result.tickets[0].summary).toBe('Story with, comma');
      expect(result.tickets[0].description).toBe('Description with, commas');
    });

    it('should handle newlines in quoted fields', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      const csvContent = `Issue key,Summary,Issue Type,Description
DAPM-1234,Test Story,Story,"Multi-line
description
here"`;
      await fs.writeFile(csvPath, csvContent, 'utf-8');

      const result = await parseCsvFile(csvPath);

      expect(result.tickets).toHaveLength(1);
      expect(result.tickets[0].description).toContain('Multi-line');
      expect(result.tickets[0].description).toContain('description');
      expect(result.tickets[0].description).toContain('here');
    });

    it('should skip empty rows', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      const csvContent = `Issue key,Summary,Issue Type

DAPM-1234,Test Story,Story

DAPM-1235,Another Story,Task`;
      await fs.writeFile(csvPath, csvContent, 'utf-8');

      const result = await parseCsvFile(csvPath);

      expect(result.tickets).toHaveLength(2);
      expect(result.tickets[0].summary).toBe('Test Story');
      expect(result.tickets[1].summary).toBe('Another Story');
    });

    it('should report errors for missing required fields', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      const csvContent = `Issue key,Summary,Issue Type
DAPM-1234,,Story
,Test Story,Task`;
      await fs.writeFile(csvPath, csvContent, 'utf-8');

      const result = await parseCsvFile(csvPath);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.error.includes('Summary'))).toBe(true);
      expect(result.errors.some(e => e.error.includes('Issue key'))).toBe(true);
    });

    it('should report row numbers for parsing errors', async () => {
      const csvPath = path.join(sandbox.path, 'test.csv');
      const csvContent = `Issue key,Summary,Issue Type
DAPM-1234,,Story`;
      await fs.writeFile(csvPath, csvContent, 'utf-8');

      const result = await parseCsvFile(csvPath);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].row).toBe(1);
    });

    it('should handle file not found error', async () => {
      const csvPath = path.join(sandbox.path, 'nonexistent.csv');

      await expect(parseCsvFile(csvPath)).rejects.toThrow();
    });
  });

  describe('mapCsvRowToTicket', () => {
    it('should extract required fields', () => {
      const row = {
        'Issue key': 'DAPM-1234',
        'Summary': 'Test Story',
        'Issue Type': 'Story',
        'Status': 'Open',
        'Priority': 'High',
      };

      const ticket = mapCsvRowToTicket(row);

      expect(ticket.summary).toBe('Test Story');
      expect(ticket.issueType).toBe('Story');
      expect(ticket.status).toBe('Open');
      expect(ticket.priority).toBe('High');
    });

    it('should map column names to ticket properties', () => {
      const row = {
        'Issue key': 'DAPM-1234',
        'Summary': 'Test Story',
        'Issue Type': 'Story',
        'Custom field (Story Points)': '5',
        'Parent key': 'DAPM-1000',
        'Parent summary': 'Epic Story',
        'Sprint': 'APM-APP-2025-W45',
        'Fix versions': 'Jan2026',
        'Labels': 'apm-r,urgent',
        'Custom field (Acceptance Criteria)': '- Verify feature works',
      };

      const ticket = mapCsvRowToTicket(row);

      expect(ticket.storyPoints).toBe(5);
      expect(ticket.epic).toBeDefined();
      expect(ticket.sprint).toBe('APM-APP-2025-W45');
      expect(ticket.fixVersions).toBe('Jan2026');
      expect(ticket.labels).toContain('apm-r');
      expect(ticket.labels).toContain('urgent');
      expect(ticket.acceptanceCriteria).toBeDefined();
    });

    it('should handle missing optional fields', () => {
      const row = {
        'Issue key': 'DAPM-1234',
        'Summary': 'Test Story',
        'Issue Type': 'Story',
        'Description': '', // Empty description
      };

      const ticket = mapCsvRowToTicket(row);

      expect(ticket.summary).toBe('Test Story');
      expect(ticket.description).toBeUndefined();
      expect(ticket.storyPoints).toBeUndefined();
      expect(ticket.epic).toBeUndefined();
    });

    it('should normalize field values', () => {
      const row = {
        'Issue key': 'DAPM-1234',
        'Summary': '  Test Story  ',
        'Issue Type': 'Story',
        'Status': '  Open  ',
        'Priority': '  High  ',
        'Custom field (Story Points)': ' 5 ',
      };

      const ticket = mapCsvRowToTicket(row);

      expect(ticket.summary).toBe('Test Story');
      expect(ticket.status).toBe('Open');
      expect(ticket.priority).toBe('High');
      expect(ticket.storyPoints).toBe(5);
    });

    it('should map issue types correctly', () => {
      const storyRow = { 'Issue key': 'DAPM-1', 'Summary': 'Test', 'Issue Type': 'Story' };
      const taskRow = { 'Issue key': 'DAPM-2', 'Summary': 'Test', 'Issue Type': 'Task' };
      const bugRow = { 'Issue key': 'DAPM-3', 'Summary': 'Test', 'Issue Type': 'Bug' };
      const spikeRow = { 'Issue key': 'DAPM-4', 'Summary': 'Test', 'Issue Type': 'Spike' };
      const subtaskRow = { 'Issue key': 'DAPM-5', 'Summary': 'Test', 'Issue Type': 'Sub-task' };

      expect(mapCsvRowToTicket(storyRow).issueType).toBe('Story');
      expect(mapCsvRowToTicket(taskRow).issueType).toBe('Task');
      expect(mapCsvRowToTicket(bugRow).issueType).toBe('Bug');
      expect(mapCsvRowToTicket(spikeRow).issueType).toBe('Spike');
      expect(mapCsvRowToTicket(subtaskRow).issueType).toBe('Sub-task');
    });

    it('should parse story points as numbers', () => {
      const row1 = { 'Issue key': 'DAPM-1', 'Summary': 'Test', 'Issue Type': 'Story', 'Custom field (Story Points)': '5' };
      const row2 = { 'Issue key': 'DAPM-2', 'Summary': 'Test', 'Issue Type': 'Story', 'Custom field (Story Points)': '3.5' };
      const row3 = { 'Issue key': 'DAPM-3', 'Summary': 'Test', 'Issue Type': 'Story', 'Custom field (Story Points)': 'invalid' };

      expect(mapCsvRowToTicket(row1).storyPoints).toBe(5);
      expect(mapCsvRowToTicket(row2).storyPoints).toBe(3);
      expect(mapCsvRowToTicket(row3).storyPoints).toBeUndefined();
    });

    it('should parse labels as array', () => {
      const row1 = { 'Issue key': 'DAPM-1', 'Summary': 'Test', 'Issue Type': 'Story', 'Labels': 'apm-r,urgent' };
      const row2 = { 'Issue key': 'DAPM-2', 'Summary': 'Test', 'Issue Type': 'Story', 'Labels': 'apm-r\nurgent' };
      const row3 = { 'Issue key': 'DAPM-3', 'Summary': 'Test', 'Issue Type': 'Story', 'Labels': '' };

      expect(mapCsvRowToTicket(row1).labels).toEqual(['apm-r', 'urgent']);
      expect(mapCsvRowToTicket(row2).labels).toEqual(['apm-r', 'urgent']);
      expect(mapCsvRowToTicket(row3).labels).toBeUndefined();
    });
  });

  describe('sanitizeFilename', () => {
    it('should convert text to kebab-case', () => {
      expect(sanitizeFilename('Test Story Title')).toBe('test-story-title');
      expect(sanitizeFilename('Multiple   Spaces')).toBe('multiple-spaces');
    });

    it('should remove Jira ticket prefix', () => {
      expect(sanitizeFilename('DAPM-1234: Test Story')).toBe('test-story');
      expect(sanitizeFilename('DAPM-1234 Test Story')).toBe('test-story');
    });

    it('should remove project prefix patterns', () => {
      expect(sanitizeFilename('APM-R: FE: Component: Test Story')).toBe('component-test-story');
      expect(sanitizeFilename('APM-R: BE: Test Story')).toBe('test-story');
      expect(sanitizeFilename('APM-R: Test Story')).toBe('test-story');
    });

    it('should remove special characters', () => {
      expect(sanitizeFilename('Test @ Story! #1')).toBe('test-story-1');
      expect(sanitizeFilename('Fix (urgent) issue')).toBe('fix-urgent-issue');
    });

    it('should remove leading/trailing hyphens', () => {
      expect(sanitizeFilename('- Test Story -')).toBe('test-story');
      expect(sanitizeFilename('---Test---')).toBe('test');
    });

    it('should limit length to 60 chars', () => {
      const longTitle = 'This is a very long title that should be truncated to avoid extremely long filenames';
      const result = sanitizeFilename(longTitle);
      expect(result.length).toBeLessThanOrEqual(60);
    });

    it('should handle edge cases', () => {
      expect(sanitizeFilename('')).toBe('');
      expect(sanitizeFilename('   ')).toBe('');
      expect(sanitizeFilename('123')).toBe('123');
    });
  });

  describe('convertJiraToMarkdown', () => {
    it('should convert headers', () => {
      expect(convertJiraToMarkdown('h1. Header 1')).toBe('# Header 1');
      expect(convertJiraToMarkdown('h2. Header 2')).toBe('## Header 2');
      expect(convertJiraToMarkdown('h3. Header 3')).toBe('### Header 3');
      expect(convertJiraToMarkdown('h4. Header 4')).toBe('#### Header 4');
    });

    it('should convert bold text', () => {
      expect(convertJiraToMarkdown('*bold text*')).toBe('**bold text**');
      expect(convertJiraToMarkdown('This is *bold* text')).toBe('This is **bold** text');
    });

    it('should convert code blocks', () => {
      expect(convertJiraToMarkdown('{noformat}code{noformat}')).toBe('\n```\ncode\n```\n');
      expect(convertJiraToMarkdown('{code}code{code}')).toBe('\n```\ncode\n```\n');
      expect(convertJiraToMarkdown('{code:java}code{code}')).toBe('\n```\ncode\n```\n');
    });

    it('should convert inline code', () => {
      expect(convertJiraToMarkdown('{{inline code}}')).toBe('`inline code`');
      expect(convertJiraToMarkdown('Use {{variable}} here')).toBe('Use `variable` here');
    });

    it('should convert bullet lists', () => {
      const jira = '* Item 1\n* Item 2\n# Numbered 1';
      const expected = '- Item 1\n- Item 2\n1. Numbered 1';
      expect(convertJiraToMarkdown(jira)).toBe(expected);
    });

    it('should convert links', () => {
      expect(convertJiraToMarkdown('[Google|http://google.com]')).toBe('[Google](http://google.com)');
      expect(convertJiraToMarkdown('[Link Text|https://example.com]')).toBe('[Link Text](https://example.com)');
    });

    it('should remove smart-link annotations', () => {
      expect(convertJiraToMarkdown('[Link|http://example.com|smart-link]')).toBe('[Link](http://example.com)');
    });

    it('should handle empty or null text', () => {
      expect(convertJiraToMarkdown('')).toBe('');
      expect(convertJiraToMarkdown('   ')).toBe('   ');
    });

    it('should handle multiple conversions', () => {
      const jira = 'h2. Title\n*bold* and {{code}}\n* List item';
      const expected = '## Title\n**bold** and `code`\n- List item';
      expect(convertJiraToMarkdown(jira)).toBe(expected);
    });
  });

  describe('extractAcceptanceCriteria', () => {
    it('should extract bullet points', () => {
      const text = '- Verify feature works\n- Verify tests pass';
      const result = extractAcceptanceCriteria(text);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe('feature works');
      expect(result[1]).toBe('tests pass');
    });

    it('should handle asterisk bullets', () => {
      const text = '* Item 1\n* Item 2';
      const result = extractAcceptanceCriteria(text);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe('Item 1');
      expect(result[1]).toBe('Item 2');
    });

    it('should remove "Verify" prefix', () => {
      const text = '- Verify feature works\n- *Verify* tests pass';
      const result = extractAcceptanceCriteria(text);

      expect(result[0]).toBe('feature works');
      expect(result[1]).toBe('tests pass');
    });

    it('should convert Jira markup first', () => {
      const text = '* *Verify* {{feature}} works';
      const result = extractAcceptanceCriteria(text);

      expect(result[0]).toContain('`feature`');
    });

    it('should handle empty text', () => {
      expect(extractAcceptanceCriteria('')).toEqual([]);
      expect(extractAcceptanceCriteria('   ')).toEqual([]);
    });

    it('should skip non-bullet lines', () => {
      const text = 'Header\n- Item 1\nNot a bullet\n- Item 2';
      const result = extractAcceptanceCriteria(text);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe('Item 1');
      expect(result[1]).toBe('Item 2');
    });
  });

  describe('parseJiraDate', () => {
    it('should parse Jira format date', () => {
      expect(parseJiraDate('18/Nov/25 12:59 PM')).toBe('2025-11-18');
      expect(parseJiraDate('01/Jan/24 08:00 AM')).toBe('2024-01-01');
      expect(parseJiraDate('31/Dec/26 11:59 PM')).toBe('2026-12-31');
    });

    it('should parse ISO format date', () => {
      expect(parseJiraDate('2025-11-18')).toBe('2025-11-18');
      expect(parseJiraDate('2024-01-01')).toBe('2024-01-01');
    });

    it('should handle empty or invalid dates', () => {
      expect(parseJiraDate('')).toBeNull();
      expect(parseJiraDate('   ')).toBeNull();
      expect(parseJiraDate('invalid')).toBeNull();
      expect(parseJiraDate('2025-13-01')).toBeNull();
    });

    it('should ignore time portion in Jira format', () => {
      expect(parseJiraDate('18/Nov/25 12:59 PM')).toBe('2025-11-18');
      expect(parseJiraDate('18/Nov/25')).toBe('2025-11-18');
    });
  });

  describe('normalizeFieldValue', () => {
    it('should normalize storyPoints field', () => {
      expect(normalizeFieldValue('storyPoints', '5')).toBe(5);
      expect(normalizeFieldValue('storyPoints', '3.5')).toBe(3);
      expect(normalizeFieldValue('storyPoints', 'invalid')).toBeUndefined();
      expect(normalizeFieldValue('storyPoints', '')).toBeUndefined();
    });

    it('should normalize labels field', () => {
      expect(normalizeFieldValue('labels', 'apm-r,urgent')).toEqual(['apm-r', 'urgent']);
      expect(normalizeFieldValue('labels', 'apm-r\nurgent')).toEqual(['apm-r', 'urgent']);
      expect(normalizeFieldValue('labels', '')).toBeUndefined();
      expect(normalizeFieldValue('labels', '  ')).toBeUndefined();
    });

    it('should normalize date fields', () => {
      expect(normalizeFieldValue('createdDate', '18/Nov/25 12:59 PM')).toBe('2025-11-18');
      expect(normalizeFieldValue('updatedDate', '2025-11-18')).toBe('2025-11-18');
      expect(normalizeFieldValue('createdDate', 'invalid')).toBeNull();
    });

    it('should trim string fields', () => {
      expect(normalizeFieldValue('summary', '  Test  ')).toBe('Test');
      expect(normalizeFieldValue('description', '  Desc  ')).toBe('Desc');
    });

    it('should handle undefined/empty values', () => {
      expect(normalizeFieldValue('summary', '')).toBeUndefined();
      expect(normalizeFieldValue('summary', undefined as any)).toBe('');
    });
  });
});
