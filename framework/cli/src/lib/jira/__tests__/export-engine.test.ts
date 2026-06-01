import { ExportEngine, ExportMode, ExportResult, ExportOptions } from '../export-engine';
import { JiraClient } from '../jira-client';
import { WikiConverter } from '../wiki-converter';
import { extractAcceptanceCriteria, formatAsJiraWiki } from '../acceptance-criteria';
import { parseFrontmatter, updateFrontmatter } from '../../common/yaml-frontmatter';
import fs from 'fs-extra';
import path from 'path';

// Mock dependencies
jest.mock('../jira-client');
jest.mock('../../common/yaml-frontmatter');
jest.mock('fs-extra');

describe('ExportEngine', () => {
  let mockJiraClient: jest.Mocked<JiraClient>;
  let exportEngine: ExportEngine;

  const mockFrontmatter = {
    documentType: 'story',
    title: 'Test Story',
    priority: 'P1',
    labels: ['backend', 'api'],
    tags: ['backend'],
  };

  const mockBody = `# Test Story

## Description

**Context:**
This is a test context.

**Technical Notes:**
Some technical notes here.

## Acceptance Criteria

- *Verify* the feature works correctly
- *Verify* error handling is in place
`;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock JiraClient
    mockJiraClient = {
      createIssue: jest.fn(),
      updateIssue: jest.fn(),
    } as any;

    exportEngine = new ExportEngine(mockJiraClient, 'https://jira.example.com');

    // Setup default mock implementations
    (parseFrontmatter as jest.Mock).mockReturnValue({
      data: mockFrontmatter,
      content: mockBody,
      matter: '',
    });

    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    (fs.readFile as jest.Mock).mockResolvedValue(`---
documentType: story
title: Test Story
---
${mockBody}`);
  });

  describe('detectMode', () => {
    it('should detect CREATE mode for tickets without jira-ticketId', () => {
      const frontmatter = { documentType: 'story', title: 'New Story' };
      const mode = exportEngine.detectMode(frontmatter);
      expect(mode).toBe(ExportMode.CREATE);
    });

    it('should detect CREATE mode when jira-ticketId is null', () => {
      const frontmatter = { 'jira-ticketId': null, documentType: 'story' };
      const mode = exportEngine.detectMode(frontmatter);
      expect(mode).toBe(ExportMode.CREATE);
    });

    it('should detect CREATE mode when jira-ticketId is empty string', () => {
      const frontmatter = { 'jira-ticketId': '', documentType: 'story' };
      const mode = exportEngine.detectMode(frontmatter);
      expect(mode).toBe(ExportMode.CREATE);
    });

    it('should detect CREATE mode when jira-ticketId is "null" string', () => {
      const frontmatter = { 'jira-ticketId': 'null', documentType: 'story' };
      const mode = exportEngine.detectMode(frontmatter);
      expect(mode).toBe(ExportMode.CREATE);
    });

    it('should detect UPDATE mode when jira-ticketId exists', () => {
      const frontmatter = { 'jira-ticketId': 'DAPM-1234', documentType: 'story' };
      const mode = exportEngine.detectMode(frontmatter);
      expect(mode).toBe(ExportMode.UPDATE);
    });
  });

  describe('buildJiraFields', () => {
    it('should map frontmatter to Jira fields for CREATE mode', () => {
      const converter = new WikiConverter();
      const description = converter.convert(mockBody, {
        removeTitle: true,
        removeHorizontalRules: true,
        removeMetadataLine: true,
        removeDescriptionHeading: true,
        removeAcceptanceCriteria: true,
        convertBoldLabelsToHeadings: true,
      });

      const fields = exportEngine.buildJiraFields(
        mockFrontmatter,
        description,
        ExportMode.CREATE
      );

      expect(fields.project).toEqual({ key: 'DAPM' });
      expect(fields.issuetype).toEqual({ name: 'Story' });
      expect(fields.summary).toBe('Test Story');
      expect(fields.description).toBe(description);
      expect(fields.priority).toEqual({ name: 'High' });
      expect(fields.labels).toEqual(['backend', 'api']);
    });

    it('should exclude project and issuetype for UPDATE mode', () => {
      const converter = new WikiConverter();
      const description = converter.convert(mockBody, {
        removeTitle: true,
        removeHorizontalRules: true,
        removeMetadataLine: true,
        removeDescriptionHeading: true,
        removeAcceptanceCriteria: true,
        convertBoldLabelsToHeadings: true,
      });

      const fields = exportEngine.buildJiraFields(
        mockFrontmatter,
        description,
        ExportMode.UPDATE
      );

      expect(fields.project).toBeUndefined();
      expect(fields.issuetype).toBeUndefined();
      expect(fields.summary).toBe('Test Story');
      expect(fields.description).toBe(description);
    });

    it('should map priority codes to Jira priority names', () => {
      const frontmatterWithP0 = { ...mockFrontmatter, priority: 'P0' };
      const fields = exportEngine.buildJiraFields(frontmatterWithP0, '', ExportMode.CREATE);
      expect(fields.priority).toEqual({ name: 'Highest' });

      const frontmatterWithP2 = { ...mockFrontmatter, priority: 'P2' };
      const fieldsP2 = exportEngine.buildJiraFields(frontmatterWithP2, '', ExportMode.CREATE);
      expect(fieldsP2.priority).toEqual({ name: 'Medium' });
    });

    it('should handle documentType to issuetype mapping', () => {
      const taskFrontmatter = { ...mockFrontmatter, documentType: 'task' };
      const taskFields = exportEngine.buildJiraFields(taskFrontmatter, '', ExportMode.CREATE);
      expect(taskFields.issuetype).toEqual({ name: 'Task' });

      const bugFrontmatter = { ...mockFrontmatter, documentType: 'bug' };
      const bugFields = exportEngine.buildJiraFields(bugFrontmatter, '', ExportMode.CREATE);
      expect(bugFields.issuetype).toEqual({ name: 'Bug' });

      const spikeFrontmatter = { ...mockFrontmatter, documentType: 'spike' };
      const spikeFields = exportEngine.buildJiraFields(spikeFrontmatter, '', ExportMode.CREATE);
      expect(spikeFields.issuetype).toEqual({ name: 'Task' });
    });

    it('should include labels from both labels and tags fields', () => {
      const frontmatterWithTags = {
        ...mockFrontmatter,
        labels: ['label1'],
        tags: ['tag1', 'tag2'],
      };

      const fields = exportEngine.buildJiraFields(frontmatterWithTags, '', ExportMode.CREATE);
      expect(fields.labels).toEqual(['label1', 'tag1', 'tag2']);
    });

    it('should deduplicate labels from labels and tags', () => {
      const frontmatterWithDuplicates = {
        ...mockFrontmatter,
        labels: ['backend', 'api'],
        tags: ['backend', 'frontend'],
      };

      const fields = exportEngine.buildJiraFields(frontmatterWithDuplicates, '', ExportMode.CREATE);
      expect(fields.labels).toEqual(['backend', 'api', 'frontend']);
    });
  });

  describe('exportTicket', () => {
    it('should create new Jira ticket in CREATE mode', async () => {
      mockJiraClient.createIssue.mockResolvedValue('DAPM-1234');
      (updateFrontmatter as jest.Mock).mockResolvedValue(undefined);

      const result = await exportEngine.exportTicket('/test/path/STORY-test.md');

      expect(mockJiraClient.createIssue).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.issueKey).toBe('DAPM-1234');
      expect(result.mode).toBe(ExportMode.CREATE);
      expect(updateFrontmatter).toHaveBeenCalledWith(
        '/test/path/STORY-test.md',
        expect.objectContaining({
          'jira-ticketId': 'DAPM-1234',
        })
      );
    });

    it('should update existing Jira ticket in UPDATE mode', async () => {
      const frontmatterWithTicketId = {
        ...mockFrontmatter,
        'jira-ticketId': 'DAPM-1234',
      };

      (parseFrontmatter as jest.Mock).mockReturnValue({
        data: frontmatterWithTicketId,
        content: mockBody,
        matter: '',
      });

      mockJiraClient.updateIssue.mockResolvedValue();
      (updateFrontmatter as jest.Mock).mockResolvedValue(undefined);

      const result = await exportEngine.exportTicket('/test/path/1234-test.md');

      expect(mockJiraClient.updateIssue).toHaveBeenCalledWith('DAPM-1234', expect.any(Object));
      expect(result.success).toBe(true);
      expect(result.issueKey).toBe('DAPM-1234');
      expect(result.mode).toBe(ExportMode.UPDATE);
    });

    it('should update local file with jira-ticketId after creation', async () => {
      mockJiraClient.createIssue.mockResolvedValue('DAPM-5678');
      (updateFrontmatter as jest.Mock).mockResolvedValue(undefined);

      await exportEngine.exportTicket('/test/path/STORY-new.md');

      expect(updateFrontmatter).toHaveBeenCalledWith(
        '/test/path/STORY-new.md',
        expect.objectContaining({
          'jira-ticketId': 'DAPM-5678',
          'jira-url': expect.stringContaining('DAPM-5678'),
        })
      );
    });

    it('should handle dry-run mode for CREATE', async () => {
      const result = await exportEngine.exportTicket('/test/path/STORY-test.md', {
        dryRun: true,
      });

      expect(mockJiraClient.createIssue).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.mode).toBe(ExportMode.CREATE);
      expect(updateFrontmatter).not.toHaveBeenCalled();
    });

    it('should handle dry-run mode for UPDATE', async () => {
      const frontmatterWithTicketId = {
        ...mockFrontmatter,
        'jira-ticketId': 'DAPM-1234',
      };

      (parseFrontmatter as jest.Mock).mockReturnValue({
        data: frontmatterWithTicketId,
        content: mockBody,
        matter: '',
      });

      const result = await exportEngine.exportTicket('/test/path/1234-test.md', {
        dryRun: true,
      });

      expect(mockJiraClient.updateIssue).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.mode).toBe(ExportMode.UPDATE);
    });

    it('should throw error if file does not exist', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      await expect(
        exportEngine.exportTicket('/test/path/nonexistent.md')
      ).rejects.toThrow();
    });

    it('should extract and update acceptance criteria', async () => {
      mockJiraClient.createIssue.mockResolvedValue('DAPM-1234');
      mockJiraClient.updateIssue = jest.fn().mockResolvedValue(undefined);
      (updateFrontmatter as jest.Mock).mockResolvedValue(undefined);

      const result = await exportEngine.exportTicket('/test/path/STORY-test.md');

      // Should call updateIssue to set acceptance criteria
      expect(mockJiraClient.updateIssue).toHaveBeenCalledWith(
        'DAPM-1234',
        expect.objectContaining({
          customfield_13608: expect.stringContaining('*Verify*'),
        })
      );
      expect(result.criteriaCount).toBe(2);
    });
  });

  describe('batchExport', () => {
    it('should export multiple tickets', async () => {
      mockJiraClient.createIssue
        .mockResolvedValueOnce('DAPM-1234')
        .mockResolvedValueOnce('DAPM-1235');
      (updateFrontmatter as jest.Mock).mockResolvedValue(undefined);

      const files = ['/test/STORY-1.md', '/test/STORY-2.md'];
      const results = await exportEngine.batchExport(files);

      expect(results).toHaveLength(2);
      expect(results[0].issueKey).toBe('DAPM-1234');
      expect(results[1].issueKey).toBe('DAPM-1235');
      expect(mockJiraClient.createIssue).toHaveBeenCalledTimes(2);
    });

    it('should respect delay between requests', async () => {
      jest.useFakeTimers();
      mockJiraClient.createIssue.mockResolvedValue('DAPM-1234');
      (updateFrontmatter as jest.Mock).mockResolvedValue(undefined);

      const files = ['/test/STORY-1.md', '/test/STORY-2.md', '/test/STORY-3.md'];
      const promise = exportEngine.batchExport(files, { delayMs: 2000 });

      // First export should happen immediately
      await jest.advanceTimersByTimeAsync(0);
      expect(mockJiraClient.createIssue).toHaveBeenCalledTimes(1);

      // Second export after delay
      await jest.advanceTimersByTimeAsync(2000);
      expect(mockJiraClient.createIssue).toHaveBeenCalledTimes(2);

      // Third export after delay
      await jest.advanceTimersByTimeAsync(2000);
      expect(mockJiraClient.createIssue).toHaveBeenCalledTimes(3);

      await promise;
      jest.useRealTimers();
    });

    it('should handle errors gracefully and continue processing', async () => {
      mockJiraClient.createIssue
        .mockResolvedValueOnce('DAPM-1234')
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce('DAPM-1236');
      (updateFrontmatter as jest.Mock).mockResolvedValue(undefined);

      const files = ['/test/STORY-1.md', '/test/STORY-2.md', '/test/STORY-3.md'];
      const results = await exportEngine.batchExport(files);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('API Error');
      expect(results[2].success).toBe(true);
    });

    it('should support dry-run mode for batch export', async () => {
      const files = ['/test/STORY-1.md', '/test/STORY-2.md'];
      const results = await exportEngine.batchExport(files, { dryRun: true });

      expect(results).toHaveLength(2);
      expect(results[0].dryRun).toBe(true);
      expect(results[1].dryRun).toBe(true);
      expect(mockJiraClient.createIssue).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should validate CREATE mode requires documentType', async () => {
      const invalidFrontmatter = { title: 'Test' };
      (parseFrontmatter as jest.Mock).mockReturnValue({
        data: invalidFrontmatter,
        content: mockBody,
        matter: '',
      });

      await expect(
        exportEngine.exportTicket('/test/STORY-test.md')
      ).rejects.toThrow(/documentType/);
    });

    it('should validate UPDATE mode requires jira-ticketId', async () => {
      const invalidFrontmatter = { documentType: 'story', title: 'Test' };
      (parseFrontmatter as jest.Mock).mockReturnValue({
        data: invalidFrontmatter,
        content: mockBody,
        matter: '',
      });

      await expect(
        exportEngine.exportTicket('/test/1234-test.md', { forceUpdate: true })
      ).rejects.toThrow(/jira-ticketId/);
    });

    it('should validate jira-ticketId format in UPDATE mode', async () => {
      const invalidFrontmatter = {
        documentType: 'story',
        'jira-ticketId': 'invalid-format',
      };
      (parseFrontmatter as jest.Mock).mockReturnValue({
        data: invalidFrontmatter,
        content: mockBody,
        matter: '',
      });

      await expect(
        exportEngine.exportTicket('/test/invalid-test.md', { forceUpdate: true })
      ).rejects.toThrow(/Invalid ticket ID format/);
    });
  });

  describe('forceCreate option', () => {
    it('should force CREATE mode even when jira-ticketId exists', async () => {
      const frontmatterWithTicketId = {
        ...mockFrontmatter,
        'jira-ticketId': 'DAPM-1234',
      };

      (parseFrontmatter as jest.Mock).mockReturnValue({
        data: frontmatterWithTicketId,
        content: mockBody,
        matter: '',
      });

      mockJiraClient.createIssue.mockResolvedValue('DAPM-5678');
      mockJiraClient.updateIssue.mockResolvedValue(undefined);
      (updateFrontmatter as jest.Mock).mockResolvedValue(undefined);

      const result = await exportEngine.exportTicket('/test/path/1234-test.md', {
        forceCreate: true,
      });

      expect(mockJiraClient.createIssue).toHaveBeenCalled();
      // updateIssue will be called for acceptance criteria
      expect(result.mode).toBe(ExportMode.CREATE);
      expect(result.issueKey).toBe('DAPM-5678');
    });
  });

  describe('forceUpdate option', () => {
    it('should force UPDATE mode for tickets with jira-ticketId', async () => {
      const frontmatterWithTicketId = {
        ...mockFrontmatter,
        'jira-ticketId': 'DAPM-1234',
      };

      (parseFrontmatter as jest.Mock).mockReturnValue({
        data: frontmatterWithTicketId,
        content: mockBody,
        matter: '',
      });

      mockJiraClient.updateIssue.mockResolvedValue();
      (updateFrontmatter as jest.Mock).mockResolvedValue(undefined);

      const result = await exportEngine.exportTicket('/test/path/1234-test.md', {
        forceUpdate: true,
      });

      expect(mockJiraClient.updateIssue).toHaveBeenCalled();
      expect(mockJiraClient.createIssue).not.toHaveBeenCalled();
      expect(result.mode).toBe(ExportMode.UPDATE);
    });
  });
});
