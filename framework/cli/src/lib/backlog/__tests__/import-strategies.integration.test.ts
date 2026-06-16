/**
 * Import Strategies Integration Tests
 *
 * Test suite for import strategy functions including auto-detection mode,
 * flat folder structure, and deduplication logic.
 *
 * New structure (v10.1.1):
 * - All tickets go to flat `tickets/` directory
 * - Epics go to `epics/` directory
 * - Sprints/milestones auto-detected from ticket data
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import { createSandbox, TestSandbox } from '../../__tests__/test-utils';
import {
  executeImportStrategy,
  detectExistingTicket,
  groupTicketsBySprint,
  groupTicketsByMilestone,
  ImportStrategyOptions,
} from '../import-strategies.js';
import type { CsvTicket } from '../types.js';

describe('ImportStrategies Integration', () => {
  let sandbox: TestSandbox;
  let backlogDir: string;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Create temporary test directory
    sandbox = await createSandbox('import-strategies-integration');
    backlogDir = path.join(sandbox.path, 'backlog');

    // Create flat backlog structure (new v10.1.1 format)
    await fs.ensureDir(path.join(backlogDir, 'tickets'));
    await fs.ensureDir(path.join(backlogDir, 'epics'));
    await fs.ensureDir(path.join(backlogDir, 'sprints'));
    await fs.ensureDir(path.join(backlogDir, 'milestones'));

    // Suppress expected console.error calls from verbose output
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(async () => {
    // Cleanup test directory
    await sandbox.cleanup();
    consoleErrorSpy.mockRestore();
  });

  describe('groupTicketsBySprint', () => {
    it('should organize tickets by sprint', () => {
      const tickets: CsvTicket[] = [
        {
          ticketId: 'DAPM-1001',
          summary: 'Story 1',
          issueType: 'Story',
          documentType: 'story',
          sprint: '2026-W1',
          filename: '1001-story-1.md',
        },
        {
          ticketId: 'DAPM-1002',
          summary: 'Story 2',
          issueType: 'Story',
          documentType: 'story',
          sprint: '2026-W1',
          filename: '1002-story-2.md',
        },
        {
          ticketId: 'DAPM-1003',
          summary: 'Story 3',
          issueType: 'Story',
          documentType: 'story',
          sprint: '2026-W2',
          filename: '1003-story-3.md',
        },
      ];

      const grouped = groupTicketsBySprint(tickets);

      expect(grouped.size).toBe(2);
      expect(grouped.get('2026-W1')).toHaveLength(2);
      expect(grouped.get('2026-W2')).toHaveLength(1);
    });

    it('should handle tickets without sprint', () => {
      const tickets: CsvTicket[] = [
        {
          ticketId: 'DAPM-1001',
          summary: 'Story 1',
          issueType: 'Story',
          documentType: 'story',
          sprint: '2026-W1',
          filename: '1001-story-1.md',
        },
        {
          ticketId: 'DAPM-1002',
          summary: 'Story 2',
          issueType: 'Story',
          documentType: 'story',
          filename: '1002-story-2.md',
        },
      ];

      const grouped = groupTicketsBySprint(tickets);

      expect(grouped.size).toBe(2);
      expect(grouped.get('2026-W1')).toHaveLength(1);
      expect(grouped.get('unassigned')).toHaveLength(1);
    });

    it('should handle empty sprint field', () => {
      const tickets: CsvTicket[] = [
        {
          ticketId: 'DAPM-1001',
          summary: 'Story 1',
          issueType: 'Story',
          documentType: 'story',
          sprint: '',
          filename: '1001-story-1.md',
        },
      ];

      const grouped = groupTicketsBySprint(tickets);

      expect(grouped.size).toBe(1);
      expect(grouped.get('unassigned')).toHaveLength(1);
    });
  });

  describe('groupTicketsByMilestone', () => {
    it('should organize tickets by milestone', () => {
      const tickets: CsvTicket[] = [
        {
          ticketId: 'DAPM-1001',
          summary: 'Story 1',
          issueType: 'Story',
          documentType: 'story',
          milestone: 'Jan2026',
          filename: '1001-story-1.md',
        },
        {
          ticketId: 'DAPM-1002',
          summary: 'Story 2',
          issueType: 'Story',
          documentType: 'story',
          milestone: 'Jan2026',
          filename: '1002-story-2.md',
        },
        {
          ticketId: 'DAPM-1003',
          summary: 'Story 3',
          issueType: 'Story',
          documentType: 'story',
          milestone: 'Feb2026',
          filename: '1003-story-3.md',
        },
      ];

      const grouped = groupTicketsByMilestone(tickets);

      expect(grouped.size).toBe(2);
      expect(grouped.get('Jan2026')).toHaveLength(2);
      expect(grouped.get('Feb2026')).toHaveLength(1);
    });

    it('should handle tickets without milestone', () => {
      const tickets: CsvTicket[] = [
        {
          ticketId: 'DAPM-1001',
          summary: 'Story 1',
          issueType: 'Story',
          documentType: 'story',
          milestone: 'Jan2026',
          filename: '1001-story-1.md',
        },
        {
          ticketId: 'DAPM-1002',
          summary: 'Story 2',
          issueType: 'Story',
          documentType: 'story',
          filename: '1002-story-2.md',
        },
      ];

      const grouped = groupTicketsByMilestone(tickets);

      expect(grouped.size).toBe(2);
      expect(grouped.get('Jan2026')).toHaveLength(1);
      expect(grouped.get('unassigned')).toHaveLength(1);
    });
  });

  describe('detectExistingTicket', () => {
    it('should find by jira-ticketId in frontmatter (flat structure)', async () => {
      // Create existing ticket in flat tickets/ directory
      const existingTicket = `---
jira-ticketId: DAPM-1001
title: Existing Story
documentType: story
---

# Existing Story
`;
      await fs.writeFile(
        path.join(backlogDir, 'tickets', '1001-existing-story.md'),
        existingTicket
      );

      const ticket: CsvTicket = {
        ticketId: 'DAPM-1001',
        summary: 'New Story',
        issueType: 'Story',
        documentType: 'story',
        filename: '1001-new-story.md',
      };

      const existing = await detectExistingTicket(ticket, backlogDir);

      expect(existing).toBe('1001-existing-story.md');
    });

    it('should find by filename pattern', async () => {
      // Create existing ticket with matching filename pattern
      const existingTicket = `---
title: Fix login bug
documentType: bug
---

# Fix login bug
`;
      await fs.writeFile(
        path.join(backlogDir, 'tickets', '2001-fix-login-bug.md'),
        existingTicket
      );

      const ticket: CsvTicket = {
        ticketId: 'DAPM-2001',
        summary: 'Fix login bug',
        issueType: 'Bug',
        documentType: 'bug',
        filename: '2001-fix-login-bug.md',
      };

      const existing = await detectExistingTicket(ticket, backlogDir);

      expect(existing).toBe('2001-fix-login-bug.md');
    });

    it('should return null for new tickets', async () => {
      const ticket: CsvTicket = {
        ticketId: 'DAPM-9999',
        summary: 'Brand New Story',
        issueType: 'Story',
        documentType: 'story',
        filename: '9999-brand-new-story.md',
      };

      const existing = await detectExistingTicket(ticket, backlogDir);

      expect(existing).toBeNull();
    });
  });

  describe('deduplication modes with flat structure', () => {
    it('should error mode - throw on duplicate', async () => {
      // Create existing ticket in flat structure
      const existingTicket = `---
jira-ticketId: DAPM-1001
title: Existing Story
documentType: story
---

# Existing Story
`;
      await fs.writeFile(
        path.join(backlogDir, 'tickets', '1001-existing-story.md'),
        existingTicket
      );

      const tickets: CsvTicket[] = [
        {
          ticketId: 'DAPM-1001',
          summary: 'Existing Story',
          issueType: 'Story',
          documentType: 'story',
          sprint: '2026-W1',
          filename: '1001-existing-story.md',
        },
      ];

      const options: ImportStrategyOptions = {
        mode: 'auto',
        duplicateMode: 'error',
        basePath: backlogDir,
      };

      await expect(executeImportStrategy(tickets, options)).rejects.toThrow();
    });

    it('should skip mode - skip duplicate tickets', async () => {
      // Create existing ticket in flat structure
      const existingTicket = `---
jira-ticketId: DAPM-1001
title: Existing Story
documentType: story
---

# Existing Story
`;
      await fs.writeFile(
        path.join(backlogDir, 'tickets', '1001-existing-story.md'),
        existingTicket
      );

      const tickets: CsvTicket[] = [
        {
          ticketId: 'DAPM-1001',
          summary: 'Existing Story',
          issueType: 'Story',
          documentType: 'story',
          sprint: '2026-W1',
          filename: '1001-existing-story.md',
        },
        {
          ticketId: 'DAPM-1002',
          summary: 'New Story',
          issueType: 'Story',
          documentType: 'story',
          sprint: '2026-W1',
          filename: '1002-new-story.md',
        },
      ];

      const options: ImportStrategyOptions = {
        mode: 'auto',
        duplicateMode: 'skip',
        basePath: backlogDir,
      };

      const result = await executeImportStrategy(tickets, options);

      expect(result.skipped).toHaveLength(1);
      expect(result.created).toHaveLength(1);
      expect(result.updated).toHaveLength(0);
    });

    it('should force mode - overwrite duplicates', async () => {
      // Create existing ticket in flat structure with same filename pattern
      const existingTicket = `---
jira-ticketId: DAPM-1001
title: Existing Story
documentType: story
---

# Existing Story
`;
      // Use same filename pattern that would be generated for this ticket
      await fs.writeFile(
        path.join(backlogDir, 'tickets', '1001-updated-story.md'),
        existingTicket
      );

      const tickets: CsvTicket[] = [
        {
          ticketId: 'DAPM-1001',
          summary: 'Updated Story',
          issueType: 'Story',
          documentType: 'story',
          sprint: '2026-W1',
          filename: '1001-updated-story.md',
        },
      ];

      const options: ImportStrategyOptions = {
        mode: 'auto',
        duplicateMode: 'force',
        basePath: backlogDir,
      };

      const result = await executeImportStrategy(tickets, options);

      expect(result.updated).toHaveLength(1);
      expect(result.created).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    });
  });

  describe('auto mode with flat structure', () => {
    it('should create tickets in flat tickets/ directory', async () => {
      const tickets: CsvTicket[] = [
        {
          ticketId: 'DAPM-1001',
          summary: 'Story 1',
          issueType: 'Story',
          documentType: 'story',
          sprint: '2026-W1',
          storyPoints: 5,
          filename: '1001-story-1.md',
        },
        {
          ticketId: 'DAPM-1002',
          summary: 'Task 1',
          issueType: 'Task',
          documentType: 'task',
          sprint: '2026-W1',
          filename: '1002-task-1.md',
        },
      ];

      const options: ImportStrategyOptions = {
        mode: 'auto',
        duplicateMode: 'force',
        basePath: backlogDir,
      };

      const result = await executeImportStrategy(tickets, options);

      expect(result.created).toHaveLength(2);
      expect(result.errors).toHaveLength(0);

      // Verify tickets created in flat structure
      expect(await fs.pathExists(path.join(backlogDir, 'tickets', '1001-story-1.md'))).toBe(true);
      expect(await fs.pathExists(path.join(backlogDir, 'tickets', '1002-task-1.md'))).toBe(true);
    });

    it('should auto-detect and generate sprint index', async () => {
      const tickets: CsvTicket[] = [
        {
          ticketId: 'DAPM-1001',
          summary: 'Story 1',
          issueType: 'Story',
          documentType: 'story',
          sprint: '2026-W1',
          storyPoints: 5,
          filename: '1001-story-1.md',
        },
      ];

      const options: ImportStrategyOptions = {
        mode: 'auto',
        duplicateMode: 'force',
        basePath: backlogDir,
      };

      const result = await executeImportStrategy(tickets, options);

      // Verify sprint was auto-detected
      expect(result.sprints).toContain('2026-W1');

      // Verify sprint index file was created
      const sprintFile = path.join(backlogDir, 'sprints', '2026-W1.md');
      expect(await fs.pathExists(sprintFile)).toBe(true);

      const content = await fs.readFile(sprintFile, 'utf-8');
      expect(content).toContain('Sprint');
      expect(content).toContain('2026-W1');
    });

    it('should auto-detect and generate milestone index', async () => {
      const tickets: CsvTicket[] = [
        {
          ticketId: 'DAPM-1001',
          summary: 'Story 1',
          issueType: 'Story',
          documentType: 'story',
          milestone: 'Feb2026',
          storyPoints: 5,
          filename: '1001-story-1.md',
        },
      ];

      const options: ImportStrategyOptions = {
        mode: 'auto',
        duplicateMode: 'force',
        basePath: backlogDir,
      };

      const result = await executeImportStrategy(tickets, options);

      // Verify milestone was auto-detected
      expect(result.milestones).toContain('Feb2026');

      // Verify milestone index file was created
      const milestoneFile = path.join(backlogDir, 'milestones', 'Feb2026.md');
      expect(await fs.pathExists(milestoneFile)).toBe(true);

      const content = await fs.readFile(milestoneFile, 'utf-8');
      expect(content).toContain('Feb2026');
    });

    it('should handle tickets without sprint or milestone', async () => {
      const tickets: CsvTicket[] = [
        {
          ticketId: 'DAPM-1001',
          summary: 'Story 1',
          issueType: 'Story',
          documentType: 'story',
          filename: '1001-story-1.md',
        },
      ];

      const options: ImportStrategyOptions = {
        mode: 'auto',
        duplicateMode: 'force',
        basePath: backlogDir,
      };

      const result = await executeImportStrategy(tickets, options);

      expect(result.created).toHaveLength(1);
      expect(result.sprints).toHaveLength(0);
      expect(result.milestones).toHaveLength(0);
    });
  });

  describe('epic handling', () => {
    it('should create epics in epics/ directory', async () => {
      const tickets: CsvTicket[] = [
        {
          ticketId: 'DAPM-1000',
          summary: 'Auth Epic',
          issueType: 'Epic',
          documentType: 'epic',
          filename: '1000-auth-epic.md',
        },
        {
          ticketId: 'DAPM-1001',
          summary: 'Login Story',
          issueType: 'Story',
          documentType: 'story',
          parentKey: 'DAPM-1000',
          filename: '1001-login-story.md',
        },
      ];

      const options: ImportStrategyOptions = {
        mode: 'auto',
        duplicateMode: 'force',
        basePath: backlogDir,
      };

      const result = await executeImportStrategy(tickets, options);

      // Non-epic tickets created
      expect(result.created).toHaveLength(1);
      // Epic should be in epics array
      expect(result.epics).toHaveLength(1);

      // Verify directory structure
      expect(await fs.pathExists(path.join(backlogDir, 'epics', '1000-auth-epic.md'))).toBe(true);
      expect(await fs.pathExists(path.join(backlogDir, 'tickets', '1001-login-story.md'))).toBe(true);
    });

    it('should link epic to child tickets', async () => {
      const tickets: CsvTicket[] = [
        {
          ticketId: 'DAPM-1000',
          summary: 'Feature Epic',
          issueType: 'Epic',
          documentType: 'epic',
          filename: '1000-feature-epic.md',
        },
        {
          ticketId: 'DAPM-1001',
          summary: 'Story 1',
          issueType: 'Story',
          documentType: 'story',
          parentKey: 'DAPM-1000',
          storyPoints: 5,
          filename: '1001-story-1.md',
        },
        {
          ticketId: 'DAPM-1002',
          summary: 'Story 2',
          issueType: 'Story',
          documentType: 'story',
          parentKey: 'DAPM-1000',
          storyPoints: 3,
          filename: '1002-story-2.md',
        },
      ];

      const options: ImportStrategyOptions = {
        mode: 'auto',
        duplicateMode: 'force',
        basePath: backlogDir,
      };

      const result = await executeImportStrategy(tickets, options);

      expect(result.epics).toHaveLength(1);

      // Verify epic content links to children
      const epicContent = await fs.readFile(
        path.join(backlogDir, 'epics', '1000-feature-epic.md'),
        'utf-8'
      );

      expect(epicContent).toContain('DAPM-1001');
      expect(epicContent).toContain('DAPM-1002');
      expect(epicContent).toContain('childCount: 2');
      expect(epicContent).toContain('committed: 8');
    });
  });

  describe('regression: sprint/milestone index union across imports', () => {
    const opts = (basePath: string): ImportStrategyOptions => ({
      mode: 'auto',
      duplicateMode: 'skip',
      basePath,
    });

    function ticket(overrides: Partial<CsvTicket>): CsvTicket {
      return {
        ticketId: 'DAPM-0000',
        summary: 'Ticket',
        issueType: 'Story',
        documentType: 'story',
        filename: '0000-ticket.md',
        ...overrides,
      };
    }

    it('does not clobber an earlier import\'s sprint members when a later import touches the same sprint', async () => {
      // First import: two tickets in W25
      await executeImportStrategy(
        [
          ticket({ ticketId: 'DAPM-3019', summary: 'Spike: Data Seed', documentType: 'spike', sprint: 'APMR-APP-2026W25', status: 'To Do', filename: '3019-spike-data-seed.md' }),
          ticket({ ticketId: 'DAPM-3017', summary: 'Asset Detail Side Panel', sprint: 'APMR-APP-2026W25', status: 'To Do', filename: '3017-asset-detail.md' }),
        ],
        opts(backlogDir)
      );

      // Second import (different CSV): one more ticket in the SAME sprint W25
      await executeImportStrategy(
        [
          ticket({ ticketId: 'DAPM-3037', summary: 'New Down Event Dialog Extended', sprint: 'APMR-APP-2026W25', status: 'To Do', filename: '3037-new-down-event.md' }),
        ],
        opts(backlogDir)
      );

      const sprintFile = await fs.readFile(
        path.join(backlogDir, 'sprints', 'APMR-APP-2026W25.md'),
        'utf-8'
      );

      // Union expected — all three tickets, not just the last import's
      expect(sprintFile).toContain('DAPM-3019');
      expect(sprintFile).toContain('DAPM-3017');
      expect(sprintFile).toContain('DAPM-3037');
      expect(sprintFile).toContain('ticketCount: 3');
    });

    it('persists sprint/status/jira-fixVersion on the ticket so membership survives re-derivation', async () => {
      await executeImportStrategy(
        [
          ticket({ ticketId: 'DAPM-3019', summary: 'Spike: Data Seed', documentType: 'spike', sprint: 'APMR-APP-2026W25', status: 'To Do', milestone: 'APM-Track:Pilot', fixVersions: 'APM-Track:Pilot', filename: '3019-spike-data-seed.md' }),
        ],
        opts(backlogDir)
      );

      const ticketFile = await fs.readFile(
        path.join(backlogDir, 'tickets', '3019-spike-data-seed.md'),
        'utf-8'
      );

      expect(ticketFile).toContain('sprint: APMR-APP-2026W25');
      expect(ticketFile).toContain('status: To Do');
      expect(ticketFile).toContain('jira-fixVersion: "APM-Track:Pilot"');
    });

    it('builds the union from on-disk tickets even when a later import does not re-list them', async () => {
      // Pilot-style import populates W29
      await executeImportStrategy(
        [ticket({ ticketId: 'DAPM-2992', summary: 'BE Spike GraphQL', documentType: 'spike', sprint: 'APMR-APP-2026W29', status: 'To Do', filename: '2992-be-spike-graphql.md' })],
        opts(backlogDir)
      );
      // Core-style import adds a different ticket to the same W29
      await executeImportStrategy(
        [ticket({ ticketId: 'DAPM-3022', summary: 'BE Asset Query', documentType: 'task', sprint: 'APMR-APP-2026W29', status: 'To Do', filename: '3022-be-asset-query.md' })],
        opts(backlogDir)
      );

      const sprintFile = await fs.readFile(
        path.join(backlogDir, 'sprints', 'APMR-APP-2026W29.md'),
        'utf-8'
      );
      expect(sprintFile).toContain('DAPM-2992');
      expect(sprintFile).toContain('DAPM-3022');
      expect(sprintFile).toContain('ticketCount: 2');
    });
  });
});
