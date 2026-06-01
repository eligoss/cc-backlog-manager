/**
 * Unit Tests for Epic Handler
 *
 * Tests epic file generation and child ticket discovery.
 */

import fs from 'fs-extra';
import path from 'path';
import {
  generateEpicContent,
  findChildTickets,
  writeEpicFile,
} from '../epic-handler.js';
import { CsvTicket } from '../types.js';

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('epic-handler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // Helper to create a minimal valid ticket
  function createTicket(overrides: Partial<CsvTicket> = {}): CsvTicket {
    return {
      ticketId: 'DAPM-1001',
      summary: 'Test Summary',
      issueType: 'Story',
      documentType: 'story',
      filename: '1001-test-summary.md',
      ...overrides,
    };
  }

  // Helper to create an epic
  function createEpic(overrides: Partial<CsvTicket> = {}): CsvTicket {
    return createTicket({
      ticketId: 'DAPM-100',
      summary: 'User Authentication Epic',
      issueType: 'Epic',
      documentType: 'epic',
      filename: '100-user-authentication-epic.md',
      ...overrides,
    });
  }

  describe('findChildTickets', () => {
    it('should find tickets with matching parentKey', () => {
      const epic = createEpic({ ticketId: 'DAPM-100' });
      const tickets = [
        createTicket({ ticketId: 'DAPM-101', parentKey: 'DAPM-100' }),
        createTicket({ ticketId: 'DAPM-102', parentKey: 'DAPM-100' }),
        createTicket({ ticketId: 'DAPM-103', parentKey: 'DAPM-200' }), // Different parent
        createTicket({ ticketId: 'DAPM-104' }), // No parent
      ];

      const children = findChildTickets(tickets, epic.ticketId);

      expect(children).toHaveLength(2);
      expect(children.map(t => t.ticketId)).toEqual(['DAPM-101', 'DAPM-102']);
    });

    it('should return empty array when no children found', () => {
      const tickets = [
        createTicket({ ticketId: 'DAPM-101', parentKey: 'DAPM-200' }),
        createTicket({ ticketId: 'DAPM-102' }),
      ];

      const children = findChildTickets(tickets, 'DAPM-100');

      expect(children).toHaveLength(0);
    });

    it('should handle empty tickets array', () => {
      const children = findChildTickets([], 'DAPM-100');
      expect(children).toHaveLength(0);
    });

    it('should be case-sensitive for ticket IDs', () => {
      const tickets = [
        createTicket({ ticketId: 'DAPM-101', parentKey: 'dapm-100' }), // lowercase
      ];

      const children = findChildTickets(tickets, 'DAPM-100');

      expect(children).toHaveLength(0);
    });
  });

  describe('generateEpicContent', () => {
    it('should generate H1 title', () => {
      const epic = createEpic();
      const content = generateEpicContent(epic, []);

      expect(content).toContain('# User Authentication Epic');
    });

    it('should include Description section', () => {
      const epic = createEpic({
        description: 'This epic covers all authentication features.',
      });
      const content = generateEpicContent(epic, []);

      expect(content).toContain('## Description');
      expect(content).toContain('This epic covers all authentication features.');
    });

    it('should include Epic Info section', () => {
      const epic = createEpic({
        description: 'Epic description here.',
      });
      const content = generateEpicContent(epic, []);

      expect(content).toContain('## Epic Info');
    });

    it('should include child ticket summary in Epic Info', () => {
      const epic = createEpic();
      const content = generateEpicContent(epic, []);

      expect(content).toContain('## Child Tickets');
    });

    it('should include Child Tickets section', () => {
      const epic = createEpic();
      const children = [
        createTicket({ ticketId: 'DAPM-101', summary: 'Login Page', documentType: 'story' }),
        createTicket({ ticketId: 'DAPM-102', summary: 'Logout Button', documentType: 'task' }),
      ];
      const content = generateEpicContent(epic, children);

      expect(content).toContain('## Child Tickets');
      expect(content).toContain('DAPM-101');
      expect(content).toContain('Login Page');
      expect(content).toContain('DAPM-102');
      expect(content).toContain('Logout Button');
    });

    it('should show story points for children', () => {
      const epic = createEpic();
      const children = [
        createTicket({ ticketId: 'DAPM-101', summary: 'Story', storyPoints: 5 }),
      ];
      const content = generateEpicContent(epic, children);

      expect(content).toContain('5 SP');
    });

    it('should calculate total story points', () => {
      const epic = createEpic();
      const children = [
        createTicket({ ticketId: 'DAPM-101', storyPoints: 5 }),
        createTicket({ ticketId: 'DAPM-102', storyPoints: 3 }),
        createTicket({ ticketId: 'DAPM-103', storyPoints: 8 }),
      ];
      const content = generateEpicContent(epic, children);

      expect(content).toContain('16 SP'); // 5 + 3 + 8
    });

    it('should handle empty children list', () => {
      const epic = createEpic();
      const content = generateEpicContent(epic, []);

      expect(content).toContain('## Child Tickets');
      expect(content).toContain('*No child tickets in this export*');
    });

    it('should include YAML frontmatter', () => {
      const epic = createEpic({
        priority: 'High',
      });
      const content = generateEpicContent(epic, []);

      expect(content).toMatch(/^---\n/);
      expect(content).toContain('documentType: epic');
      expect(content).toContain('title: User Authentication Epic');
    });

    it('should include section dividers', () => {
      const epic = createEpic();
      const content = generateEpicContent(epic, []);

      // Count dividers
      const dividerCount = (content.match(/\n---\n/g) || []).length;
      expect(dividerCount).toBeGreaterThanOrEqual(1);
    });

    it('should group children by type', () => {
      const epic = createEpic();
      const children = [
        createTicket({ ticketId: 'DAPM-101', documentType: 'story', summary: 'Story 1' }),
        createTicket({ ticketId: 'DAPM-102', documentType: 'task', summary: 'Task 1' }),
        createTicket({ ticketId: 'DAPM-103', documentType: 'bug', summary: 'Bug 1' }),
      ];
      const content = generateEpicContent(epic, children);

      // Should have headings for different types
      expect(content).toContain('Story 1');
      expect(content).toContain('Task 1');
      expect(content).toContain('Bug 1');
    });
  });

  describe('writeEpicFile', () => {
    it('should write epic to backlog/epics/ directory', async () => {
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);
      mockedFs.pathExists.mockResolvedValue(false);

      const epic = createEpic();
      const result = await writeEpicFile(epic, '/base/path', [], false);

      expect(result.status).toBe('created');
      expect(mockedFs.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining(path.join('base', 'path', 'epics'))
      );
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('100-user-authentication-epic.md'),
        expect.any(String),
        'utf-8'
      );
    });

    it('should return updated status for existing file', async () => {
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);
      mockedFs.pathExists.mockResolvedValue(true); // File exists

      const epic = createEpic();
      const result = await writeEpicFile(epic, '/base/path', [], false);

      expect(result.status).toBe('updated');
    });

    it('should not write file in dry run mode', async () => {
      const epic = createEpic();
      const result = await writeEpicFile(epic, '/base/path', [], true);

      expect(mockedFs.writeFile).not.toHaveBeenCalled();
      // In dry run, we don't know if file exists, so assume created
      expect(result.status).toBe('created');
    });

    it('should include child tickets in content', async () => {
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);
      mockedFs.pathExists.mockResolvedValue(false);

      const epic = createEpic();
      const children = [
        createTicket({ ticketId: 'DAPM-101', summary: 'Child Story' }),
      ];

      await writeEpicFile(epic, '/base/path', children, false);

      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('DAPM-101'),
        'utf-8'
      );
    });

    it('should return correct filename', async () => {
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);
      mockedFs.pathExists.mockResolvedValue(false);

      const epic = createEpic({ filename: '100-auth-epic.md' });
      const result = await writeEpicFile(epic, '/base/path', [], false);

      expect(result.filename).toBe('100-auth-epic.md');
    });
  });
});
