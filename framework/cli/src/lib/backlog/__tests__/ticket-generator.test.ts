/**
 * Unit Tests for Ticket Generator
 *
 * Tests ticket content generation including frontmatter, body content,
 * and full ticket file generation in v10.1.1 format.
 */

import {
  generateFrontmatter,
  generateBodyContent,
  generateTicketContent,
  mapPriority,
} from '../ticket-generator.js';
import { CsvTicket } from '../types.js';

describe('ticket-generator', () => {
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

  describe('mapPriority', () => {
    it('should map High to P1', () => {
      expect(mapPriority('High')).toBe('P1');
      expect(mapPriority('Highest')).toBe('P1');
    });

    it('should map Medium to P2', () => {
      expect(mapPriority('Medium')).toBe('P2');
    });

    it('should map Low to P3', () => {
      expect(mapPriority('Low')).toBe('P3');
      expect(mapPriority('Lowest')).toBe('P3');
    });

    it('should default to P2 for unknown priorities', () => {
      expect(mapPriority('Unknown')).toBe('P2');
      expect(mapPriority('')).toBe('P2');
      expect(mapPriority(undefined as any)).toBe('P2');
    });

    it('should be case insensitive', () => {
      expect(mapPriority('HIGH')).toBe('P1');
      expect(mapPriority('medium')).toBe('P2');
      expect(mapPriority('low')).toBe('P3');
    });
  });

  describe('generateFrontmatter', () => {
    it('should generate required fields', () => {
      const ticket = createTicket();
      const frontmatter = generateFrontmatter(ticket);

      expect(frontmatter.documentType).toBe('story');
      expect(frontmatter.title).toBe('Test Summary');
      expect(frontmatter['jira-ticketId']).toBe('DAPM-1001');
      expect(frontmatter['jira-url']).toContain('DAPM-1001');
    });

    it('should include optional fields when present', () => {
      const ticket = createTicket({
        priority: 'High',
        storyPoints: 5,
        labels: ['frontend', 'urgent'],
        milestone: 'Feb2026',
        assignee: 'john.doe',
      });
      const frontmatter = generateFrontmatter(ticket);

      expect(frontmatter.priority).toBe('P1');
      expect(frontmatter.storyPoints).toBe(5);
      expect(frontmatter.labels).toEqual(['frontend', 'urgent']);
      expect(frontmatter.assignee).toBe('john.doe');
    });

    it('should include jira integration fields', () => {
      const ticket = createTicket({
        parentKey: 'DAPM-100',
        parentSummary: 'Parent Epic',
      });
      const frontmatter = generateFrontmatter(ticket);

      expect(frontmatter['jira-parent']).toBe('DAPM-100');
    });

    it('should use mapped priority', () => {
      expect(generateFrontmatter(createTicket({ priority: 'High' })).priority).toBe('P1');
      expect(generateFrontmatter(createTicket({ priority: 'Medium' })).priority).toBe('P2');
      expect(generateFrontmatter(createTicket({ priority: 'Low' })).priority).toBe('P3');
    });

    it('should omit priority when not provided (lean format)', () => {
      const ticket = createTicket({ priority: undefined });
      const frontmatter = generateFrontmatter(ticket);

      expect(frontmatter.priority).toBeUndefined();
    });

    it('should include dates when present', () => {
      const ticket = createTicket({
        createdDate: '2025-12-08',
        updatedDate: '2025-12-10',
      });
      const frontmatter = generateFrontmatter(ticket);

      expect(frontmatter.createdDate).toBe('2025-12-08');
      expect(frontmatter.updatedDate).toBe('2025-12-10');
    });

    it('should persist sprint, status and jira-fixVersion on per-ticket frontmatter', () => {
      // Membership is persisted per-ticket so sprint/milestone index files can be
      // re-derived from the full on-disk backlog instead of overwritten per-CSV.
      const ticket = createTicket({
        sprint: '2026-W1',
        status: 'To Do',
        milestone: 'APM-Track:Pilot',
      });
      const frontmatter = generateFrontmatter(ticket);

      expect(frontmatter.sprint).toBe('2026-W1');
      expect(frontmatter.status).toBe('To Do');
      expect(frontmatter['jira-fixVersion']).toBe('APM-Track:Pilot');
    });

    it('should fall back to fixVersions when milestone is absent', () => {
      const ticket = createTicket({ fixVersions: 'APM-Track:MVP Core' });
      const frontmatter = generateFrontmatter(ticket);

      expect(frontmatter['jira-fixVersion']).toBe('APM-Track:MVP Core');
    });
  });

  describe('generateBodyContent', () => {
    it('should generate H1 title', () => {
      const ticket = createTicket({ summary: 'Add Login Feature' });
      const body = generateBodyContent(ticket);

      expect(body).toContain('# Add Login Feature');
    });

    it('should include Description section', () => {
      const ticket = createTicket({
        description: 'This is the ticket description.',
      });
      const body = generateBodyContent(ticket);

      expect(body).toContain('## Description');
      expect(body).toContain('This is the ticket description.');
    });

    it('should include Acceptance Criteria section', () => {
      const ticket = createTicket();
      const body = generateBodyContent(ticket);

      expect(body).toContain('## Acceptance Criteria');
    });

    it('should extract AS/WANT/SO THAT from Jira wiki description', () => {
      const ticket = createTicket({
        // Jira CSV descriptions use Jira wiki markup (*bold*), not markdown (**bold**)
        description: `*AS* a user,
*I WANT* to log in,
*SO THAT* I can access my account.

Additional context here.`,
      });
      const body = generateBodyContent(ticket);

      expect(body).toContain('**AS** a user');
      expect(body).toContain('**I WANT** to log in');
      expect(body).toContain('**SO THAT** I can access my account');
    });

    it('should include acceptance criteria from ticket', () => {
      const ticket = createTicket({
        acceptanceCriteria: '- User can enter credentials\n- Error shown for invalid login',
      });
      const body = generateBodyContent(ticket);

      expect(body).toContain('## Acceptance Criteria');
      expect(body).toContain('User can enter credentials');
    });

    it('should add default acceptance criteria when none provided', () => {
      const ticket = createTicket();
      const body = generateBodyContent(ticket);

      expect(body).toContain('**Verify**');
    });

    it('should include section dividers', () => {
      const ticket = createTicket();
      const body = generateBodyContent(ticket);

      // Should have dividers
      expect(body).toContain('---');
    });

    it('should handle empty description', () => {
      const ticket = createTicket({ description: undefined });
      const body = generateBodyContent(ticket);

      expect(body).toContain('## Description');
      expect(body).toContain('*No description provided*');
    });
  });

  describe('generateTicketContent', () => {
    it('should generate complete ticket with frontmatter and body', () => {
      const ticket = createTicket({
        summary: 'Implement User Login',
        description: 'Add login functionality.',
        priority: 'High',
        storyPoints: 5,
      });

      const content = generateTicketContent(ticket);

      // Should start with frontmatter
      expect(content).toMatch(/^---\n/);
      expect(content).toContain('documentType: story');
      expect(content).toContain('title: Implement User Login');
      expect(content).toContain('priority: P1');
      expect(content).toContain('storyPoints: 5');
      expect(content).toContain('jira-ticketId: DAPM-1001');

      // Should have body
      expect(content).toContain('# Implement User Login');
      expect(content).toContain('## Description');
      expect(content).toContain('## Acceptance Criteria');
    });

    it('should properly escape special characters in YAML', () => {
      const ticket = createTicket({
        summary: 'Fix: Handle special [chars] in {config}',
      });

      const content = generateTicketContent(ticket);

      // Title with special chars should be quoted
      expect(content).toContain('title:');
      expect(content).not.toMatch(/title: Fix: Handle/); // Should be quoted
    });

    it('should generate valid YAML frontmatter', () => {
      const ticket = createTicket({
        summary: 'Test Ticket',
        labels: ['frontend', 'backend'],
      });

      const content = generateTicketContent(ticket);

      // Should have YAML delimiters
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      expect(frontmatterMatch).not.toBeNull();
    });

    it('should handle all document types', () => {
      const types: Array<'story' | 'task' | 'bug' | 'spike'> = ['story', 'task', 'bug', 'spike'];

      for (const docType of types) {
        const ticket = createTicket({ documentType: docType });
        const content = generateTicketContent(ticket);

        expect(content).toContain(`documentType: ${docType}`);
      }
    });
  });
});
