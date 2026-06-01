/**
 * Unit Tests for Import Strategies
 *
 * Tests ticket grouping, duplicate detection, and import execution.
 * Updated for flat folder structure where all tickets go to backlog/tickets/
 * and epics go to backlog/epics/.
 */

import fs from 'fs-extra';
import { glob } from 'glob';
import {
  groupTicketsBySprint,
  groupTicketsByMilestone,
  detectExistingTicket,
  executeImportStrategy,
  CsvTicket,
} from '../import-strategies.js';
import { parseFrontmatter } from '../../common/yaml-frontmatter.js';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('glob');
jest.mock('../../common/yaml-frontmatter.js');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedGlob = glob as jest.MockedFunction<typeof glob>;
const mockedParseFrontmatter = parseFrontmatter as jest.MockedFunction<
  typeof parseFrontmatter
>;

describe('import-strategies', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    // Suppress expected console.error calls from verbose output
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  const createTicket = (overrides: Partial<CsvTicket> = {}): CsvTicket => ({
    ticketId: 'DAPM-1001',
    summary: 'Test ticket',
    issueType: 'Story',
    documentType: 'story',
    filename: '1001-test-ticket.md',
    ...overrides,
  });

  describe('groupTicketsBySprint', () => {
    it('should group tickets by sprint', () => {
      const tickets = [
        createTicket({ ticketId: 'DAPM-1001', sprint: '2026-W1' }),
        createTicket({ ticketId: 'DAPM-1002', sprint: '2026-W1' }),
        createTicket({ ticketId: 'DAPM-1003', sprint: '2026-W2' }),
      ];

      const grouped = groupTicketsBySprint(tickets);

      expect(grouped.size).toBe(2);
      expect(grouped.get('2026-W1')).toHaveLength(2);
      expect(grouped.get('2026-W2')).toHaveLength(1);
    });

    it('should group tickets without sprint as "unassigned"', () => {
      const tickets = [
        createTicket({ ticketId: 'DAPM-1001', sprint: '2026-W1' }),
        createTicket({ ticketId: 'DAPM-1002', sprint: undefined }),
        createTicket({ ticketId: 'DAPM-1003', sprint: '' }),
      ];

      const grouped = groupTicketsBySprint(tickets);

      expect(grouped.get('unassigned')).toHaveLength(2);
      expect(grouped.get('2026-W1')).toHaveLength(1);
    });

    it('should trim sprint values', () => {
      const tickets = [
        createTicket({ ticketId: 'DAPM-1001', sprint: '  2026-W1  ' }),
        createTicket({ ticketId: 'DAPM-1002', sprint: '2026-W1' }),
      ];

      const grouped = groupTicketsBySprint(tickets);

      expect(grouped.size).toBe(1);
      expect(grouped.get('2026-W1')).toHaveLength(2);
    });

    it('should return empty map for empty tickets array', () => {
      const grouped = groupTicketsBySprint([]);

      expect(grouped.size).toBe(0);
    });
  });

  describe('groupTicketsByMilestone', () => {
    it('should group tickets by milestone', () => {
      const tickets = [
        createTicket({ ticketId: 'DAPM-1001', milestone: 'Jan2026' }),
        createTicket({ ticketId: 'DAPM-1002', milestone: 'Jan2026' }),
        createTicket({ ticketId: 'DAPM-1003', milestone: 'Feb2026' }),
      ];

      const grouped = groupTicketsByMilestone(tickets);

      expect(grouped.size).toBe(2);
      expect(grouped.get('Jan2026')).toHaveLength(2);
      expect(grouped.get('Feb2026')).toHaveLength(1);
    });

    it('should group tickets without milestone as "unassigned"', () => {
      const tickets = [
        createTicket({ ticketId: 'DAPM-1001', milestone: 'Jan2026' }),
        createTicket({ ticketId: 'DAPM-1002', milestone: undefined }),
        createTicket({ ticketId: 'DAPM-1003', milestone: '' }),
      ];

      const grouped = groupTicketsByMilestone(tickets);

      expect(grouped.get('unassigned')).toHaveLength(2);
      expect(grouped.get('Jan2026')).toHaveLength(1);
    });

    it('should trim milestone values', () => {
      const tickets = [
        createTicket({ ticketId: 'DAPM-1001', milestone: '  Jan2026  ' }),
        createTicket({ ticketId: 'DAPM-1002', milestone: 'Jan2026' }),
      ];

      const grouped = groupTicketsByMilestone(tickets);

      expect(grouped.size).toBe(1);
      expect(grouped.get('Jan2026')).toHaveLength(2);
    });
  });

  describe('detectExistingTicket', () => {
    it('should check epics directory for epic tickets', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedGlob.mockResolvedValue(['100-epic.md'] as any);
      mockedFs.readFile.mockResolvedValue('---\njira-ticketId: DAPM-100\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: { 'jira-ticketId': 'DAPM-100' },
        content: '',
        matter: '',
      });

      const ticket = createTicket({ ticketId: 'DAPM-100', documentType: 'epic' });
      const result = await detectExistingTicket(ticket, '/backlog');

      expect(mockedFs.pathExists).toHaveBeenCalledWith('/backlog/epics');
      expect(result).toBe('100-epic.md');
    });

    it('should return null when tickets directory does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      const ticket = createTicket({ documentType: 'story' });
      const result = await detectExistingTicket(ticket, '/backlog');

      expect(result).toBeNull();
    });

    it('should detect existing ticket by jira-ticketId', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedGlob.mockResolvedValue(['1001-existing.md'] as any);
      mockedFs.readFile.mockResolvedValue('---\njira-ticketId: DAPM-1001\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: { 'jira-ticketId': 'DAPM-1001' },
        content: '',
        matter: '',
      });

      const ticket = createTicket({ ticketId: 'DAPM-1001', documentType: 'story' });
      const result = await detectExistingTicket(ticket, '/backlog');

      expect(result).toBe('1001-existing.md');
    });

    it('should detect existing ticket by title match', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedGlob.mockResolvedValue(['existing-ticket.md'] as any);
      mockedFs.readFile.mockResolvedValue('---\ntitle: Test ticket\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: { title: 'Test ticket' },
        content: '',
        matter: '',
      });

      const ticket = createTicket({ summary: 'Test ticket', documentType: 'story' });
      const result = await detectExistingTicket(ticket, '/backlog');

      expect(result).toBe('existing-ticket.md');
    });

    it('should detect existing ticket by summary match', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedGlob.mockResolvedValue(['existing-ticket.md'] as any);
      mockedFs.readFile.mockResolvedValue('---\nsummary: Test ticket\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: { summary: 'Test ticket' },
        content: '',
        matter: '',
      });

      const ticket = createTicket({ summary: 'Test ticket', documentType: 'story' });
      const result = await detectExistingTicket(ticket, '/backlog');

      expect(result).toBe('existing-ticket.md');
    });

    it('should detect existing ticket by filename pattern', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedGlob.mockResolvedValue(['1001-some-task.md'] as any);
      mockedFs.readFile.mockResolvedValue('---\ntitle: Other\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: { title: 'Other' },
        content: '',
        matter: '',
      });

      const ticket = createTicket({ ticketId: 'DAPM-1001', documentType: 'story' });
      const result = await detectExistingTicket(ticket, '/backlog');

      expect(result).toBe('1001-some-task.md');
    });

    it('should skip README files', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedGlob.mockResolvedValue(['README.md', '1001-test.md'] as any);
      mockedFs.readFile.mockResolvedValue('---\njira-ticketId: DAPM-1001\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: { 'jira-ticketId': 'DAPM-1001' },
        content: '',
        matter: '',
      });

      const ticket = createTicket({ ticketId: 'DAPM-1001', documentType: 'story' });
      const result = await detectExistingTicket(ticket, '/backlog');

      expect(result).toBe('1001-test.md');
    });

    it('should return null when no match found', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedGlob.mockResolvedValue(['other-ticket.md'] as any);
      mockedFs.readFile.mockResolvedValue('---\ntitle: Different\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: { title: 'Different', 'jira-ticketId': 'DAPM-9999' },
        content: '',
        matter: '',
      });

      const ticket = createTicket({ ticketId: 'DAPM-1001', summary: 'Test', documentType: 'story' });
      const result = await detectExistingTicket(ticket, '/backlog');

      expect(result).toBeNull();
    });

    it('should handle file read errors gracefully', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedGlob.mockResolvedValue(['error.md'] as any);
      mockedFs.readFile.mockRejectedValue(new Error('Read error'));

      const ticket = createTicket({ documentType: 'story' });
      const result = await detectExistingTicket(ticket, '/backlog');

      expect(result).toBeNull();
    });

    it('should use flat tickets directory for all non-epic types', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedGlob.mockResolvedValue([]);

      // All types should check the flat tickets directory
      const types: Array<'story' | 'task' | 'bug' | 'spike'> = ['story', 'task', 'bug', 'spike'];

      for (const docType of types) {
        jest.clearAllMocks();
        mockedFs.pathExists.mockResolvedValue(true);
        mockedGlob.mockResolvedValue([]);

        const ticket = createTicket({ documentType: docType });
        await detectExistingTicket(ticket, '/backlog');

        // Should check flat tickets directory
        expect(mockedFs.pathExists).toHaveBeenCalledWith('/backlog/tickets');
      }
    });
  });

  describe('executeImportStrategy', () => {
    beforeEach(() => {
      mockedFs.pathExists.mockResolvedValue(false);
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);
      mockedGlob.mockResolvedValue([]);
    });

    it('should create new tickets in flat structure', async () => {
      const tickets = [
        createTicket({ ticketId: 'DAPM-1001', documentType: 'story' }),
        createTicket({ ticketId: 'DAPM-1002', documentType: 'task' }),
      ];

      const result = await executeImportStrategy(tickets, {
        mode: 'auto',
        duplicateMode: 'force',
        basePath: '/backlog',
      });

      expect(result.created).toHaveLength(2);
      expect(result.skipped).toHaveLength(0);
      expect(result.errors).toHaveLength(0);

      // Should use flat tickets directory
      expect(mockedFs.ensureDir).toHaveBeenCalledWith('/backlog/tickets');
    });

    it('should skip tickets in skip mode when duplicates exist', async () => {
      mockedFs.pathExists.mockImplementation(async (path: any) => {
        return path.includes('tickets');
      });
      mockedGlob.mockResolvedValue(['1001-existing.md'] as any);
      mockedFs.readFile.mockResolvedValue('---\njira-ticketId: DAPM-1001\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: { 'jira-ticketId': 'DAPM-1001' },
        content: '',
        matter: '',
      });

      const tickets = [createTicket({ ticketId: 'DAPM-1001', documentType: 'story' })];

      const result = await executeImportStrategy(tickets, {
        mode: 'auto',
        duplicateMode: 'skip',
        basePath: '/backlog',
      });

      expect(result.skipped).toHaveLength(1);
      expect(result.created).toHaveLength(0);
    });

    it('should throw error in error mode when duplicates exist', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedGlob.mockResolvedValue(['1001-existing.md'] as any);
      mockedFs.readFile.mockResolvedValue('---\njira-ticketId: DAPM-1001\n---' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: { 'jira-ticketId': 'DAPM-1001' },
        content: '',
        matter: '',
      });

      const tickets = [createTicket({ ticketId: 'DAPM-1001', documentType: 'story' })];

      await expect(
        executeImportStrategy(tickets, {
          mode: 'auto',
          duplicateMode: 'error',
          basePath: '/backlog',
        })
      ).rejects.toThrow('Found 1 existing tickets');
    });

    it('should update existing tickets in force mode', async () => {
      mockedFs.pathExists.mockImplementation(async (path: any) => {
        // Return true for tickets directory and for file exists
        if (path === '/backlog/tickets') return true;
        if (path.endsWith('.md')) return true;
        return false;
      });

      const tickets = [createTicket({ ticketId: 'DAPM-1001', documentType: 'story' })];

      const result = await executeImportStrategy(tickets, {
        mode: 'auto',
        duplicateMode: 'force',
        basePath: '/backlog',
      });

      expect(result.updated).toHaveLength(1);
    });

    it('should handle epic tickets separately in epics directory', async () => {
      const tickets = [createTicket({ ticketId: 'DAPM-100', documentType: 'epic', filename: '100-epic.md' })];

      const result = await executeImportStrategy(tickets, {
        mode: 'auto',
        duplicateMode: 'force',
        basePath: '/backlog',
      });

      // Epics should be in the epics array, not created
      expect(result.epics).toHaveLength(1);
      expect(mockedFs.ensureDir).toHaveBeenCalledWith('/backlog/epics');
    });

    it('should not write files in dry-run mode', async () => {
      const tickets = [createTicket({ ticketId: 'DAPM-1001', documentType: 'story' })];

      await executeImportStrategy(tickets, {
        mode: 'auto',
        duplicateMode: 'force',
        basePath: '/backlog',
        dryRun: true,
      });

      expect(mockedFs.writeFile).not.toHaveBeenCalled();
    });

    it('should auto-generate sprint index files', async () => {
      const tickets = [
        createTicket({ ticketId: 'DAPM-1001', documentType: 'story', storyPoints: 5, sprint: '2026-W1' }),
      ];

      const result = await executeImportStrategy(tickets, {
        mode: 'auto',
        duplicateMode: 'force',
        basePath: '/backlog',
      });

      // Should auto-detect and create sprint index
      expect(result.sprints).toContain('2026-W1');
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        '/backlog/sprints/2026-W1.md',
        expect.stringContaining('# Sprint: 2026-W1'),
        'utf-8'
      );
    });

    it('should auto-generate milestone index files', async () => {
      const tickets = [
        createTicket({ ticketId: 'DAPM-1001', documentType: 'story', storyPoints: 3, milestone: 'Jan2026' }),
      ];

      const result = await executeImportStrategy(tickets, {
        mode: 'auto',
        duplicateMode: 'force',
        basePath: '/backlog',
      });

      // Should auto-detect and create milestone index
      expect(result.milestones).toContain('Jan2026');
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        '/backlog/milestones/Jan2026.md',
        expect.stringContaining('# Milestone: Jan2026'),
        'utf-8'
      );
    });

    it('should handle ticket write errors', async () => {
      mockedFs.ensureDir.mockRejectedValue(new Error('Write error'));

      const tickets = [createTicket({ ticketId: 'DAPM-1001', documentType: 'story' })];

      const result = await executeImportStrategy(tickets, {
        mode: 'auto',
        duplicateMode: 'force',
        basePath: '/backlog',
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].ticket).toBe('DAPM-1001');
      expect(result.errors[0].error).toContain('Write error');
    });

    it('should put all ticket types in flat tickets directory', async () => {
      const tickets = [
        createTicket({ ticketId: 'DAPM-1001', documentType: 'story', filename: '1001-story.md' }),
        createTicket({ ticketId: 'DAPM-1002', documentType: 'task', filename: '1002-task.md' }),
        createTicket({ ticketId: 'DAPM-1003', documentType: 'bug', filename: '1003-bug.md' }),
      ];

      await executeImportStrategy(tickets, {
        mode: 'auto',
        duplicateMode: 'force',
        basePath: '/backlog',
      });

      // All tickets should go to flat /backlog/tickets/ directory
      expect(mockedFs.ensureDir).toHaveBeenCalledWith('/backlog/tickets');

      // Each ticket should be written to the flat directory
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        '/backlog/tickets/1001-story.md',
        expect.any(String),
        'utf-8'
      );
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        '/backlog/tickets/1002-task.md',
        expect.any(String),
        'utf-8'
      );
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        '/backlog/tickets/1003-bug.md',
        expect.any(String),
        'utf-8'
      );
    });

    it('should include story points and other metadata in generated content', async () => {
      const tickets = [
        createTicket({
          ticketId: 'DAPM-1001',
          documentType: 'story',
          summary: 'Test story',
          description: 'Test description',
          storyPoints: 8,
          priority: 'High',
        }),
      ];

      await executeImportStrategy(tickets, {
        mode: 'auto',
        duplicateMode: 'force',
        basePath: '/backlog',
      });

      // Check written content includes metadata
      const writeCall = mockedFs.writeFile.mock.calls.find((call) =>
        (call[0] as string).includes('tickets')
      );
      expect(writeCall).toBeDefined();
      const content = writeCall![1] as string;
      expect(content).toContain('documentType: story');
      expect(content).toContain('storyPoints: 8');
      expect(content).toContain('jira-ticketId: DAPM-1001');
      expect(content).toContain('priority: P1'); // High maps to P1
    });
  });
});
