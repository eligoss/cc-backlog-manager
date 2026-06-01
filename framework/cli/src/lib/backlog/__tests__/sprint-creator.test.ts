/**
 * Sprint Creator Tests
 *
 * Ported from Python: modules/backlog/src/backlog/sprint_creator.py
 * Tests the sprint creation functionality that generates sprint planning files
 * from ticket lists.
 *
 * Features:
 * - Sprint directory creation
 * - Sprint index file generation with frontmatter
 * - Sprint metadata management (dates, capacity, committed points)
 * - Ticket grouping by type (stories, tasks, bugs, spikes)
 */

import fs from 'fs-extra';
import path from 'path';
import { parseFrontmatter } from '../../common/yaml-frontmatter';
import { createSandbox, TestSandbox } from '../../__tests__/test-utils';
import {
  createSprintDirectory,
  generateSprintIndex,
  updateSprintIndex,
  SprintConfig,
  SprintTicket,
  calculateSprintDates,
} from '../sprint-creator';

describe('Sprint Creator', () => {
  let sandbox: TestSandbox;
  let testDir: string;

  beforeEach(async () => {
    sandbox = await createSandbox('sprint-creator');
    testDir = sandbox.path;
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('calculateSprintDates', () => {
    it('should calculate dates from sprint ID in YYYY-WNN format', () => {
      const result = calculateSprintDates('2026-W03');
      expect(result).toBeDefined();
      expect(result.startDate).toBeDefined();
      expect(result.endDate).toBeDefined();
      // Week 3 of 2026 should start on Monday Jan 12, 2026
      expect(result.startDate).toBe('2026-01-12');
      // 2-week sprint ends 13 days later
      expect(result.endDate).toBe('2026-01-25');
    });

    it('should calculate dates for week 1', () => {
      const result = calculateSprintDates('2026-W01');
      expect(result).toBeDefined();
      // Week 1 starts on Monday of the week containing Jan 1
      // Jan 1, 2026 is Thursday, so week 1 Monday is Dec 29, 2025
      expect(result.startDate).toBe('2025-12-29');
      expect(result.endDate).toBe('2026-01-11');
    });

    it('should calculate dates for week 52', () => {
      const result = calculateSprintDates('2025-W52');
      expect(result).toBeDefined();
      expect(result.startDate).toBe('2025-12-22');
      expect(result.endDate).toBe('2026-01-04');
    });

    it('should return null for invalid sprint ID', () => {
      const result = calculateSprintDates('invalid');
      expect(result).toBeNull();
    });

    it('should return null for missing sprint ID', () => {
      const result = calculateSprintDates('');
      expect(result).toBeNull();
    });
  });

  describe('createSprintDirectory', () => {
    it('should create sprint directory and index file', async () => {
      const config: SprintConfig = {
        sprintId: '2026-W03',
        milestone: 'Mar2026',
        capacity: 40,
      };

      const sprintPath = await createSprintDirectory(config, testDir);

      expect(sprintPath).toBeDefined();
      expect(await fs.pathExists(sprintPath)).toBe(true);

      const indexPath = path.join(sprintPath, '2026-W03.md');
      expect(await fs.pathExists(indexPath)).toBe(true);

      const content = await fs.readFile(indexPath, 'utf-8');
      const { data } = parseFrontmatter(content);

      expect(data.sprintId).toBe('2026-W03');
      expect(data.milestone).toBe('Mar2026');
      expect(data.capacity).toBe(40);
      expect(data.committed).toBe(0); // No tickets yet
    });

    it('should auto-calculate dates if not provided', async () => {
      const config: SprintConfig = {
        sprintId: '2026-W03',
        milestone: 'Mar2026',
      };

      const sprintPath = await createSprintDirectory(config, testDir);
      const indexPath = path.join(sprintPath, '2026-W03.md');
      const content = await fs.readFile(indexPath, 'utf-8');
      const { data } = parseFrontmatter(content);

      expect(data.startDate).toBe('2026-01-12');
      expect(data.endDate).toBe('2026-01-25');
    });

    it('should use provided dates if specified', async () => {
      const config: SprintConfig = {
        sprintId: '2026-W03',
        milestone: 'Mar2026',
        startDate: '2026-02-01',
        endDate: '2026-02-14',
      };

      const sprintPath = await createSprintDirectory(config, testDir);
      const indexPath = path.join(sprintPath, '2026-W03.md');
      const content = await fs.readFile(indexPath, 'utf-8');
      const { data } = parseFrontmatter(content);

      expect(data.startDate).toBe('2026-02-01');
      expect(data.endDate).toBe('2026-02-14');
    });

    it('should not overwrite existing sprint directory', async () => {
      const config: SprintConfig = {
        sprintId: '2026-W03',
        milestone: 'Mar2026',
      };

      // Create first time
      const firstPath = await createSprintDirectory(config, testDir);
      const indexPath = path.join(firstPath, '2026-W03.md');

      // Modify the file
      await fs.writeFile(indexPath, '# Modified', 'utf-8');

      // Try to create again
      await expect(createSprintDirectory(config, testDir)).rejects.toThrow();

      // Original content should be preserved
      const content = await fs.readFile(indexPath, 'utf-8');
      expect(content).toBe('# Modified');
    });

    it('should default capacity to 40 if not specified', async () => {
      const config: SprintConfig = {
        sprintId: '2026-W03',
        milestone: 'Mar2026',
      };

      const sprintPath = await createSprintDirectory(config, testDir);
      const indexPath = path.join(sprintPath, '2026-W03.md');
      const content = await fs.readFile(indexPath, 'utf-8');
      const { data } = parseFrontmatter(content);

      expect(data.capacity).toBe(40);
    });
  });

  describe('generateSprintIndex', () => {
    it('should generate index with all ticket types', async () => {
      const sprintPath = path.join(testDir, 'sprints', '2026-W03');
      await fs.ensureDir(sprintPath);

      const tickets: SprintTicket[] = [
        {
          type: 'stories',
          title: 'User Authentication',
          path: '../tickets/stories/STORY-123.md',
          storyPoints: 5,
        },
        {
          type: 'tasks',
          title: 'Setup CI/CD',
          path: '../tickets/tasks/TASK-456.md',
          storyPoints: 0,
        },
        {
          type: 'bugs',
          title: 'Fix login bug',
          path: '../tickets/bugs/BUG-789.md',
          storyPoints: 0,
        },
        {
          type: 'spikes',
          title: 'Research GraphQL',
          path: '../tickets/spikes/SPIKE-101.md',
          storyPoints: 3,
        },
      ];

      const config: SprintConfig = {
        sprintId: '2026-W03',
        milestone: 'Mar2026',
        capacity: 40,
      };

      await generateSprintIndex(sprintPath, '2026-W03', config, tickets);

      const indexPath = path.join(sprintPath, '2026-W03.md');
      const content = await fs.readFile(indexPath, 'utf-8');
      const { data, content: markdown } = parseFrontmatter(content);

      // Check frontmatter
      expect(data.sprintId).toBe('2026-W03');
      expect(data.committed).toBe(8); // 5 + 3
      expect(data.capacity).toBe(40);

      // Check content includes all ticket types
      expect(markdown).toContain('User Authentication');
      expect(markdown).toContain('Setup CI/CD');
      expect(markdown).toContain('Fix login bug');
      expect(markdown).toContain('Research GraphQL');
    });

    it('should calculate total story points correctly', async () => {
      const sprintPath = path.join(testDir, 'sprints', '2026-W03');
      await fs.ensureDir(sprintPath);

      const tickets: SprintTicket[] = [
        {
          type: 'stories',
          title: 'Story 1',
          path: '../tickets/stories/STORY-1.md',
          storyPoints: 5,
        },
        {
          type: 'stories',
          title: 'Story 2',
          path: '../tickets/stories/STORY-2.md',
          storyPoints: 8,
        },
        {
          type: 'stories',
          title: 'Story 3',
          path: '../tickets/stories/STORY-3.md',
          storyPoints: 3,
        },
      ];

      const config: SprintConfig = {
        sprintId: '2026-W03',
        milestone: 'Mar2026',
        capacity: 20,
      };

      await generateSprintIndex(sprintPath, '2026-W03', config, tickets);

      const indexPath = path.join(sprintPath, '2026-W03.md');
      const content = await fs.readFile(indexPath, 'utf-8');
      const { data } = parseFrontmatter(content);

      expect(data.committed).toBe(16); // 5 + 8 + 3
    });

    it('should include sprint metadata in frontmatter', async () => {
      const sprintPath = path.join(testDir, 'sprints', '2026-W03');
      await fs.ensureDir(sprintPath);

      const config: SprintConfig = {
        sprintId: '2026-W03',
        milestone: 'Mar2026',
        capacity: 40,
        startDate: '2026-02-01',
        endDate: '2026-02-14',
      };

      await generateSprintIndex(sprintPath, '2026-W03', config, []);

      const indexPath = path.join(sprintPath, '2026-W03.md');
      const content = await fs.readFile(indexPath, 'utf-8');
      const { data } = parseFrontmatter(content);

      expect(data.sprintId).toBe('2026-W03');
      expect(data.sprintName).toBe('Sprint 2026-W03');
      expect(data.startDate).toBe('2026-02-01');
      expect(data.endDate).toBe('2026-02-14');
      expect(data.milestone).toBe('Mar2026');
      expect(data.capacity).toBe(40);
      expect(data.committed).toBe(0);
    });

    it('should group tickets by type in correct order', async () => {
      const sprintPath = path.join(testDir, 'sprints', '2026-W03');
      await fs.ensureDir(sprintPath);

      const tickets: SprintTicket[] = [
        {
          type: 'bugs',
          title: 'Bug ticket',
          path: '../tickets/bugs/BUG-1.md',
          storyPoints: 0,
        },
        {
          type: 'stories',
          title: 'Story ticket',
          path: '../tickets/stories/STORY-1.md',
          storyPoints: 5,
        },
        {
          type: 'spikes',
          title: 'Spike ticket',
          path: '../tickets/spikes/SPIKE-1.md',
          storyPoints: 2,
        },
        {
          type: 'tasks',
          title: 'Task ticket',
          path: '../tickets/tasks/TASK-1.md',
          storyPoints: 0,
        },
      ];

      const config: SprintConfig = {
        sprintId: '2026-W03',
        milestone: 'Mar2026',
      };

      await generateSprintIndex(sprintPath, '2026-W03', config, tickets);

      const indexPath = path.join(sprintPath, '2026-W03.md');
      const content = await fs.readFile(indexPath, 'utf-8');

      // Stories should come first, then tasks, then bugs, then spikes
      const storyIndex = content.indexOf('Story ticket');
      const taskIndex = content.indexOf('Task ticket');
      const bugIndex = content.indexOf('Bug ticket');
      const spikeIndex = content.indexOf('Spike ticket');

      expect(storyIndex).toBeLessThan(taskIndex);
      expect(taskIndex).toBeLessThan(bugIndex);
      expect(bugIndex).toBeLessThan(spikeIndex);
    });

    it('should include capacity utilization percentage', async () => {
      const sprintPath = path.join(testDir, 'sprints', '2026-W03');
      await fs.ensureDir(sprintPath);

      const tickets: SprintTicket[] = [
        {
          type: 'stories',
          title: 'Story',
          path: '../tickets/stories/STORY-1.md',
          storyPoints: 30,
        },
      ];

      const config: SprintConfig = {
        sprintId: '2026-W03',
        milestone: 'Mar2026',
        capacity: 40,
      };

      await generateSprintIndex(sprintPath, '2026-W03', config, tickets);

      const indexPath = path.join(sprintPath, '2026-W03.md');
      const content = await fs.readFile(indexPath, 'utf-8');

      // Should show 75% capacity (30/40)
      expect(content).toContain('75% capacity');
    });
  });

  describe('updateSprintIndex', () => {
    it('should add new tickets to existing sprint', async () => {
      const sprintPath = path.join(testDir, 'sprints', '2026-W03');
      await fs.ensureDir(sprintPath);

      // Create initial sprint with one ticket
      const initialTickets: SprintTicket[] = [
        {
          type: 'stories',
          title: 'Initial Story',
          path: '../tickets/stories/STORY-1.md',
          storyPoints: 5,
        },
      ];

      const config: SprintConfig = {
        sprintId: '2026-W03',
        milestone: 'Mar2026',
        capacity: 40,
      };

      await generateSprintIndex(sprintPath, '2026-W03', config, initialTickets);

      // Add new ticket
      const newTickets: SprintTicket[] = [
        ...initialTickets,
        {
          type: 'stories',
          title: 'New Story',
          path: '../tickets/stories/STORY-2.md',
          storyPoints: 8,
        },
      ];

      await updateSprintIndex(sprintPath, '2026-W03', newTickets);

      const indexPath = path.join(sprintPath, '2026-W03.md');
      const content = await fs.readFile(indexPath, 'utf-8');
      const { data } = parseFrontmatter(content);

      expect(data.committed).toBe(13); // 5 + 8
      expect(content).toContain('Initial Story');
      expect(content).toContain('New Story');
    });

    it('should update ticket counts when tickets are removed', async () => {
      const sprintPath = path.join(testDir, 'sprints', '2026-W03');
      await fs.ensureDir(sprintPath);

      // Create sprint with two tickets
      const initialTickets: SprintTicket[] = [
        {
          type: 'stories',
          title: 'Story 1',
          path: '../tickets/stories/STORY-1.md',
          storyPoints: 5,
        },
        {
          type: 'stories',
          title: 'Story 2',
          path: '../tickets/stories/STORY-2.md',
          storyPoints: 8,
        },
      ];

      const config: SprintConfig = {
        sprintId: '2026-W03',
        milestone: 'Mar2026',
      };

      await generateSprintIndex(sprintPath, '2026-W03', config, initialTickets);

      // Remove one ticket
      const updatedTickets: SprintTicket[] = [
        {
          type: 'stories',
          title: 'Story 1',
          path: '../tickets/stories/STORY-1.md',
          storyPoints: 5,
        },
      ];

      await updateSprintIndex(sprintPath, '2026-W03', updatedTickets);

      const indexPath = path.join(sprintPath, '2026-W03.md');
      const content = await fs.readFile(indexPath, 'utf-8');
      const { data } = parseFrontmatter(content);

      expect(data.committed).toBe(5);
      expect(content).toContain('Story 1');
      expect(content).not.toContain('Story 2');
    });

    it('should preserve sprint configuration when updating', async () => {
      const sprintPath = path.join(testDir, 'sprints', '2026-W03');
      await fs.ensureDir(sprintPath);

      const config: SprintConfig = {
        sprintId: '2026-W03',
        milestone: 'Mar2026',
        capacity: 50,
        startDate: '2026-02-01',
        endDate: '2026-02-14',
      };

      await generateSprintIndex(sprintPath, '2026-W03', config, []);

      // Update with new ticket
      const newTickets: SprintTicket[] = [
        {
          type: 'stories',
          title: 'New Story',
          path: '../tickets/stories/STORY-1.md',
          storyPoints: 5,
        },
      ];

      await updateSprintIndex(sprintPath, '2026-W03', newTickets);

      const indexPath = path.join(sprintPath, '2026-W03.md');
      const content = await fs.readFile(indexPath, 'utf-8');
      const { data } = parseFrontmatter(content);

      // Configuration should be preserved
      expect(data.capacity).toBe(50);
      expect(data.startDate).toBe('2026-02-01');
      expect(data.endDate).toBe('2026-02-14');
      expect(data.milestone).toBe('Mar2026');
      // But committed should be updated
      expect(data.committed).toBe(5);
    });
  });
});
