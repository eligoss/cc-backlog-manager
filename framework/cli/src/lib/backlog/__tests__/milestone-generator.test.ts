/**
 * Milestone Generator Tests
 *
 * Ported from Python: modules/backlog/src/backlog/milestone_generator.py
 * Tests the milestone generation functionality that auto-generates milestone
 * overview files from ticket metadata.
 *
 * Features:
 * - Milestone directory creation with sanitized names
 * - Milestone index file generation
 * - Epic and story organization
 * - Progress tracking and summaries
 */

import fs from 'fs-extra';
import path from 'path';
import { parseFrontmatter } from '../../common/yaml-frontmatter';
import { createSandbox, TestSandbox } from '../../__tests__/test-utils';
import {
  createMilestoneDirectory,
  generateMilestoneIndex,
  linkEpicToMilestone,
  scanTicketsForMilestone,
  MilestoneConfig,
  MilestoneTicket,
  MilestoneEpic,
} from '../milestone-generator';

describe('Milestone Generator', () => {
  let sandbox: TestSandbox;
  let testDir: string;

  beforeEach(async () => {
    sandbox = await createSandbox('milestone-generator');
    testDir = sandbox.path;
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('createMilestoneDirectory', () => {
    it('should create milestone directory with sanitized name', async () => {
      const config: MilestoneConfig = {
        name: 'APM-R: App: January 2026 (W51, W1, W3)',
        description: 'First milestone of 2026',
      };

      const milestonePath = await createMilestoneDirectory(config, testDir);

      expect(milestonePath).toBeDefined();
      expect(await fs.pathExists(milestonePath)).toBe(true);

      // Should use sanitized filename
      const expectedPath = path.join(testDir, 'milestones', 'apm-r-app-january-2026-w51-w1-w3');
      expect(milestonePath).toBe(expectedPath);
    });

    it('should create index file with frontmatter', async () => {
      const config: MilestoneConfig = {
        name: 'Mar2026',
        description: 'March 2026 milestone',
        targetDate: '2026-03-31',
      };

      const milestonePath = await createMilestoneDirectory(config, testDir);
      const indexPath = path.join(milestonePath, 'mar2026.md');

      expect(await fs.pathExists(indexPath)).toBe(true);

      const content = await fs.readFile(indexPath, 'utf-8');
      const { data } = parseFrontmatter(content);

      expect(data.milestoneId).toBe('mar2026');
      expect(data.fullName).toBe('Mar2026');
      expect(data.status).toBe('planning');
    });

    it('should handle special characters in milestone name', async () => {
      const config: MilestoneConfig = {
        name: 'Q1 2026: Planning & Design',
      };

      const milestonePath = await createMilestoneDirectory(config, testDir);

      // Should sanitize to filesystem-safe name
      const expectedPath = path.join(testDir, 'milestones', 'q1-2026-planning-design');
      expect(milestonePath).toBe(expectedPath);
    });

    it('should not overwrite existing milestone directory', async () => {
      const config: MilestoneConfig = {
        name: 'Mar2026',
      };

      // Create first time
      const firstPath = await createMilestoneDirectory(config, testDir);
      const indexPath = path.join(firstPath, 'mar2026.md');

      // Modify the file
      await fs.writeFile(indexPath, '# Modified', 'utf-8');

      // Try to create again - should throw
      await expect(createMilestoneDirectory(config, testDir)).rejects.toThrow();

      // Original content should be preserved
      const content = await fs.readFile(indexPath, 'utf-8');
      expect(content).toBe('# Modified');
    });

    it('should include description if provided', async () => {
      const config: MilestoneConfig = {
        name: 'Mar2026',
        description: 'March 2026 sprint planning',
      };

      const milestonePath = await createMilestoneDirectory(config, testDir);
      const indexPath = path.join(milestonePath, 'mar2026.md');
      const content = await fs.readFile(indexPath, 'utf-8');

      expect(content).toContain('March 2026 sprint planning');
    });
  });

  describe('generateMilestoneIndex', () => {
    it('should list all epics in milestone', async () => {
      const milestonePath = path.join(testDir, 'milestones', 'mar2026');
      await fs.ensureDir(milestonePath);

      const epics: MilestoneEpic[] = [
        {
          type: 'epic',
          title: 'User Authentication System',
          path: '../epics/EPIC-123.md',
        },
        {
          type: 'epic',
          title: 'Payment Integration',
          path: '../epics/EPIC-456.md',
        },
      ];

      const config: MilestoneConfig = {
        name: 'Mar2026',
      };

      await generateMilestoneIndex(milestonePath, 'mar2026', config, [], epics);

      const indexPath = path.join(milestonePath, 'mar2026.md');
      const content = await fs.readFile(indexPath, 'utf-8');

      expect(content).toContain('User Authentication System');
      expect(content).toContain('Payment Integration');
      expect(content).toContain('## Epics');
    });

    it('should list stories grouped by epic', async () => {
      const milestonePath = path.join(testDir, 'milestones', 'mar2026');
      await fs.ensureDir(milestonePath);

      const tickets: MilestoneTicket[] = [
        {
          type: 'stories',
          title: 'Login page',
          path: '../tickets/stories/STORY-1.md',
          storyPoints: 5,
          epic: 'EPIC-123',
        },
        {
          type: 'stories',
          title: 'OAuth integration',
          path: '../tickets/stories/STORY-2.md',
          storyPoints: 8,
          epic: 'EPIC-123',
        },
        {
          type: 'stories',
          title: 'Stripe setup',
          path: '../tickets/stories/STORY-3.md',
          storyPoints: 5,
          epic: 'EPIC-456',
        },
      ];

      const config: MilestoneConfig = {
        name: 'Mar2026',
      };

      await generateMilestoneIndex(milestonePath, 'mar2026', config, tickets, []);

      const indexPath = path.join(milestonePath, 'mar2026.md');
      const content = await fs.readFile(indexPath, 'utf-8');

      // Should group by epic
      expect(content).toContain('Epic: EPIC-123');
      expect(content).toContain('Epic: EPIC-456');
      expect(content).toContain('Login page');
      expect(content).toContain('OAuth integration');
      expect(content).toContain('Stripe setup');
    });

    it('should separate standalone stories (no epic)', async () => {
      const milestonePath = path.join(testDir, 'milestones', 'mar2026');
      await fs.ensureDir(milestonePath);

      const tickets: MilestoneTicket[] = [
        {
          type: 'stories',
          title: 'Story with epic',
          path: '../tickets/stories/STORY-1.md',
          storyPoints: 5,
          epic: 'EPIC-123',
        },
        {
          type: 'stories',
          title: 'Standalone story',
          path: '../tickets/stories/STORY-2.md',
          storyPoints: 3,
        },
      ];

      const config: MilestoneConfig = {
        name: 'Mar2026',
      };

      await generateMilestoneIndex(milestonePath, 'mar2026', config, tickets, []);

      const indexPath = path.join(milestonePath, 'mar2026.md');
      const content = await fs.readFile(indexPath, 'utf-8');

      expect(content).toContain('Epic: EPIC-123');
      expect(content).toContain('Standalone Stories');
      expect(content).toContain('Story with epic');
      expect(content).toContain('Standalone story');
    });

    it('should include task and bug sections', async () => {
      const milestonePath = path.join(testDir, 'milestones', 'mar2026');
      await fs.ensureDir(milestonePath);

      const tickets: MilestoneTicket[] = [
        {
          type: 'tasks',
          title: 'Setup database',
          path: '../tickets/tasks/TASK-1.md',
          storyPoints: 0,
        },
        {
          type: 'bugs',
          title: 'Fix memory leak',
          path: '../tickets/bugs/BUG-1.md',
          storyPoints: 0,
        },
      ];

      const config: MilestoneConfig = {
        name: 'Mar2026',
      };

      await generateMilestoneIndex(milestonePath, 'mar2026', config, tickets, []);

      const indexPath = path.join(milestonePath, 'mar2026.md');
      const content = await fs.readFile(indexPath, 'utf-8');

      expect(content).toContain('## Tasks');
      expect(content).toContain('Setup database');
      expect(content).toContain('## Bugs');
      expect(content).toContain('Fix memory leak');
    });

    it('should calculate story point totals', async () => {
      const milestonePath = path.join(testDir, 'milestones', 'mar2026');
      await fs.ensureDir(milestonePath);

      const tickets: MilestoneTicket[] = [
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

      const config: MilestoneConfig = {
        name: 'Mar2026',
      };

      await generateMilestoneIndex(milestonePath, 'mar2026', config, tickets, []);

      const indexPath = path.join(milestonePath, 'mar2026.md');
      const content = await fs.readFile(indexPath, 'utf-8');

      expect(content).toContain('Total Story Points:** 16'); // 5 + 8 + 3
    });

    it('should include summary counts', async () => {
      const milestonePath = path.join(testDir, 'milestones', 'mar2026');
      await fs.ensureDir(milestonePath);

      const tickets: MilestoneTicket[] = [
        { type: 'stories', title: 'Story 1', path: '../stories/S1.md', storyPoints: 5 },
        { type: 'stories', title: 'Story 2', path: '../stories/S2.md', storyPoints: 3 },
        { type: 'tasks', title: 'Task 1', path: '../tasks/T1.md', storyPoints: 0 },
        { type: 'bugs', title: 'Bug 1', path: '../bugs/B1.md', storyPoints: 0 },
      ];

      const epics: MilestoneEpic[] = [
        { type: 'epic', title: 'Epic 1', path: '../epics/E1.md' },
      ];

      const config: MilestoneConfig = {
        name: 'Mar2026',
      };

      await generateMilestoneIndex(milestonePath, 'mar2026', config, tickets, epics);

      const indexPath = path.join(milestonePath, 'mar2026.md');
      const content = await fs.readFile(indexPath, 'utf-8');
      const { data } = parseFrontmatter(content);

      expect(content).toContain('Epics:** 1');
      expect(content).toContain('Stories:** 2');
      expect(content).toContain('Tasks:** 1');
      expect(content).toContain('Bugs:** 1');
    });
  });

  describe('linkEpicToMilestone', () => {
    it('should add epic to milestone', async () => {
      const milestonePath = path.join(testDir, 'milestones', 'mar2026');
      await fs.ensureDir(milestonePath);

      const epicPath = path.join(testDir, 'epics', 'EPIC-123.md');
      await fs.ensureDir(path.dirname(epicPath));

      // Create epic with frontmatter
      const epicContent = `---
title: User Authentication
type: epic
status: planning
---

# User Authentication Epic`;

      await fs.writeFile(epicPath, epicContent, 'utf-8');

      const epic: MilestoneEpic = {
        type: 'epic',
        title: 'User Authentication',
        path: epicPath,
      };

      const config: MilestoneConfig = {
        name: 'Mar2026',
      };

      // Create initial milestone
      await generateMilestoneIndex(milestonePath, 'mar2026', config, [], []);

      // Link epic to milestone
      await linkEpicToMilestone(epicPath, 'Mar2026');

      // Check epic was updated
      const updatedEpic = await fs.readFile(epicPath, 'utf-8');
      const { data } = parseFrontmatter(updatedEpic);

      expect(data.milestone).toBe('Mar2026');
    });

    it('should update epic frontmatter without losing existing fields', async () => {
      const epicPath = path.join(testDir, 'epics', 'EPIC-123.md');
      await fs.ensureDir(path.dirname(epicPath));

      const epicContent = `---
title: User Authentication
type: epic
status: in-progress
priority: high
---

# User Authentication Epic`;

      await fs.writeFile(epicPath, epicContent, 'utf-8');

      await linkEpicToMilestone(epicPath, 'Mar2026');

      const updatedEpic = await fs.readFile(epicPath, 'utf-8');
      const { data } = parseFrontmatter(updatedEpic);

      // New field added
      expect(data.milestone).toBe('Mar2026');
      // Existing fields preserved
      expect(data.title).toBe('User Authentication');
      expect(data.type).toBe('epic');
      expect(data.status).toBe('in-progress');
      expect(data.priority).toBe('high');
    });
  });

  describe('scanTicketsForMilestone', () => {
    it('should scan tickets directory and group by milestone', async () => {
      const backlogDir = path.join(testDir, 'backlog');

      // Create ticket structure
      const storiesDir = path.join(backlogDir, 'tickets', 'stories');
      const tasksDir = path.join(backlogDir, 'tickets', 'tasks');
      await fs.ensureDir(storiesDir);
      await fs.ensureDir(tasksDir);

      // Create tickets
      await fs.writeFile(
        path.join(storiesDir, 'STORY-1.md'),
        `---
title: Story 1
milestone: Mar2026
storyPoints: 5
epic: EPIC-123
---
# Story 1`,
        'utf-8'
      );

      await fs.writeFile(
        path.join(storiesDir, 'STORY-2.md'),
        `---
title: Story 2
milestone: Apr2026
storyPoints: 3
---
# Story 2`,
        'utf-8'
      );

      await fs.writeFile(
        path.join(tasksDir, 'TASK-1.md'),
        `---
title: Task 1
milestone: Mar2026
---
# Task 1`,
        'utf-8'
      );

      const result = await scanTicketsForMilestone(backlogDir);

      expect(result['Mar2026']).toBeDefined();
      expect(result['Mar2026'].length).toBe(2); // STORY-1 and TASK-1
      expect(result['Apr2026']).toBeDefined();
      expect(result['Apr2026'].length).toBe(1); // STORY-2

      const mar2026Tickets = result['Mar2026'];
      const story1 = mar2026Tickets.find((t) => t.title === 'Story 1');
      expect(story1).toBeDefined();
      expect(story1?.storyPoints).toBe(5);
      expect(story1?.epic).toBe('EPIC-123');
    });

    it('should skip tickets without milestone field', async () => {
      const backlogDir = path.join(testDir, 'backlog');
      const storiesDir = path.join(backlogDir, 'tickets', 'stories');
      await fs.ensureDir(storiesDir);

      await fs.writeFile(
        path.join(storiesDir, 'STORY-1.md'),
        `---
title: Story without milestone
storyPoints: 5
---
# Story`,
        'utf-8'
      );

      const result = await scanTicketsForMilestone(backlogDir);

      expect(Object.keys(result).length).toBe(0);
    });

    it('should handle all ticket types', async () => {
      const backlogDir = path.join(testDir, 'backlog');

      // Create all ticket type directories
      for (const type of ['stories', 'tasks', 'bugs', 'spikes']) {
        const dir = path.join(backlogDir, 'tickets', type);
        await fs.ensureDir(dir);

        await fs.writeFile(
          path.join(dir, `${type.toUpperCase()}-1.md`),
          `---
title: ${type} ticket
milestone: Mar2026
---
# Ticket`,
          'utf-8'
        );
      }

      const result = await scanTicketsForMilestone(backlogDir);

      expect(result['Mar2026'].length).toBe(4);
      const types = result['Mar2026'].map((t) => t.type);
      expect(types).toContain('stories');
      expect(types).toContain('tasks');
      expect(types).toContain('bugs');
      expect(types).toContain('spikes');
    });
  });
});
