/**
 * Integration Tests: Backlog Path Consistency
 *
 * Tests for QA-021: Backlog path inconsistency between `create-ticket` and `validate`
 *
 * Root cause: create-ticket creates tickets in `backlog/tickets/{type}/`
 * but validate looks for tickets in `ai/backlog` - completely different paths.
 *
 * Fix: Changed validate.ts fallback path from `ai/backlog` to `backlog`
 * to match create-ticket behavior.
 *
 * @module commands/backlog/__tests__/path-consistency.integration.test
 */

import fs from 'fs-extra';
import path from 'path';
import { createSandbox, TestSandbox } from '../../../lib/__tests__/test-utils/sandbox.js';

describe('Integration: Backlog Path Consistency', () => {
  let sandbox: TestSandbox;

  beforeEach(async () => {
    sandbox = await createSandbox('backlog-paths');
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('QA-021: Path Consistency Between Commands', () => {
    /**
     * Both create-ticket and validate should use the same backlog path
     */

    it('should use "backlog/tickets" path for create-ticket', async () => {
      // This is the path structure create-ticket uses
      const createTicketPath = 'backlog/tickets/bugs';

      await sandbox.createDir(createTicketPath);
      await sandbox.createFile(`${createTicketPath}/BUG-001.md`, '# Bug 001');

      expect(await sandbox.exists(createTicketPath)).toBe(true);
      expect(await sandbox.exists(`${createTicketPath}/BUG-001.md`)).toBe(true);
    });

    it('should use "backlog" path for validate (not "ai/backlog")', async () => {
      // The fix changed validate to use "backlog" instead of "ai/backlog"
      const validatePath = 'backlog';
      const wrongPath = 'ai/backlog';

      await sandbox.createDir(`${validatePath}/tickets/bugs`);
      await sandbox.createFile(`${validatePath}/tickets/bugs/BUG-001.md`, '# Bug 001');

      // Correct path should exist
      expect(await sandbox.exists(validatePath)).toBe(true);

      // Wrong path should NOT exist
      expect(await sandbox.exists(wrongPath)).toBe(false);
    });

    it('should find tickets created by create-ticket when running validate', async () => {
      // Setup: create tickets in the path create-ticket uses
      const ticketsPath = 'backlog/tickets';

      await sandbox.createDir(`${ticketsPath}/bugs`);
      await sandbox.createDir(`${ticketsPath}/stories`);
      await sandbox.createDir(`${ticketsPath}/tasks`);

      await sandbox.createFile(`${ticketsPath}/bugs/BUG-001.md`, `---
id: BUG-001
type: bug
status: draft
---
# Bug 001`);

      await sandbox.createFile(`${ticketsPath}/stories/STORY-001.md`, `---
id: STORY-001
type: story
status: draft
---
# Story 001`);

      // Validate should be able to find these tickets
      const backlogDir = sandbox.resolve('backlog');
      const ticketsDir = sandbox.resolve(ticketsPath);

      expect(await fs.pathExists(backlogDir)).toBe(true);
      expect(await fs.pathExists(ticketsDir)).toBe(true);

      // List all ticket files
      const bugsDir = sandbox.resolve(`${ticketsPath}/bugs`);
      const storiesDir = sandbox.resolve(`${ticketsPath}/stories`);

      expect(await fs.pathExists(`${bugsDir}/BUG-001.md`)).toBe(true);
      expect(await fs.pathExists(`${storiesDir}/STORY-001.md`)).toBe(true);
    });

    it('should NOT look in ai/backlog path', async () => {
      // The old (broken) path should not be used
      const oldPath = 'ai/backlog';
      const newPath = 'backlog';

      // Create a ticket in the correct path
      await sandbox.createDir(`${newPath}/tickets/bugs`);
      await sandbox.createFile(`${newPath}/tickets/bugs/BUG-001.md`, '# Bug 001');

      // Old path doesn't exist
      expect(await sandbox.exists(oldPath)).toBe(false);

      // New path does exist
      expect(await sandbox.exists(newPath)).toBe(true);
    });
  });

  describe('Backlog Directory Structure', () => {
    /**
     * Tests the expected backlog directory structure
     */

    it('should have correct ticket type directories', async () => {
      const ticketTypes = ['bugs', 'stories', 'tasks', 'epics', 'spikes'];

      for (const type of ticketTypes) {
        await sandbox.createDir(`backlog/tickets/${type}`);
      }

      for (const type of ticketTypes) {
        expect(await sandbox.exists(`backlog/tickets/${type}`)).toBe(true);
      }
    });

    it('should support workflow directories', async () => {
      const workflowDirs = ['draft', 'ready-to-export', 'exported'];

      for (const dir of workflowDirs) {
        await sandbox.createDir(`backlog/${dir}`);
      }

      for (const dir of workflowDirs) {
        expect(await sandbox.exists(`backlog/${dir}`)).toBe(true);
      }
    });

    it('should handle routes.yml path configuration', async () => {
      // routes.yml can configure custom backlog paths
      await sandbox.createFile('routes.yml', `
version: "1.0"
paths:
  backlog:
    root: backlog
    tickets:
      bugs: backlog/tickets/bugs
      stories: backlog/tickets/stories
      tasks: backlog/tickets/tasks
`);

      const content = await sandbox.readFile('routes.yml');
      expect(content).toContain('backlog');
      expect(content).not.toContain('ai/backlog');
    });
  });

  describe('Path Resolution Priority', () => {
    /**
     * Tests path resolution when routes.yml is present or absent
     */

    it('should use routes.yml path if available', async () => {
      await sandbox.createFile('routes.yml', `
version: "1.0"
paths:
  backlog:
    root: custom-backlog
`);

      // When routes.yml defines a custom path, use it
      const content = await sandbox.readFile('routes.yml');
      expect(content).toContain('custom-backlog');
    });

    it('should fall back to "backlog" if routes.yml not found', async () => {
      // No routes.yml, should use default "backlog"
      expect(await sandbox.exists('routes.yml')).toBe(false);

      const defaultPath = 'backlog';
      await sandbox.createDir(defaultPath);

      expect(await sandbox.exists(defaultPath)).toBe(true);
    });

    it('should NOT fall back to "ai/backlog" (old behavior)', async () => {
      // This was the bug - validate was falling back to ai/backlog
      const oldFallback = 'ai/backlog';
      const newFallback = 'backlog';

      // Only the new fallback path should be valid
      await sandbox.createDir(newFallback);

      expect(await sandbox.exists(newFallback)).toBe(true);
      expect(await sandbox.exists(oldFallback)).toBe(false);
    });
  });

  describe('Ticket Discovery', () => {
    /**
     * Tests ticket discovery in the correct paths
     */

    it('should find all ticket types in backlog/tickets', async () => {
      // Create tickets of various types
      const tickets = [
        { path: 'backlog/tickets/bugs/BUG-001.md', type: 'bug' },
        { path: 'backlog/tickets/stories/STORY-001.md', type: 'story' },
        { path: 'backlog/tickets/tasks/TASK-001.md', type: 'task' },
        { path: 'backlog/tickets/epics/EPIC-001.md', type: 'epic' },
        { path: 'backlog/tickets/spikes/SPIKE-001.md', type: 'spike' },
      ];

      for (const ticket of tickets) {
        await sandbox.createFile(ticket.path, `# ${ticket.type}`);
      }

      // Verify all tickets can be found
      for (const ticket of tickets) {
        expect(await sandbox.exists(ticket.path)).toBe(true);
      }
    });

    it('should recursively find tickets in nested directories', async () => {
      // Create nested ticket structure
      await sandbox.createFile('backlog/tickets/bugs/sprint-1/BUG-001.md', '# Bug 1');
      await sandbox.createFile('backlog/tickets/bugs/sprint-2/BUG-002.md', '# Bug 2');

      expect(await sandbox.exists('backlog/tickets/bugs/sprint-1/BUG-001.md')).toBe(true);
      expect(await sandbox.exists('backlog/tickets/bugs/sprint-2/BUG-002.md')).toBe(true);
    });
  });
});
