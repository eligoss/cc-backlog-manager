/**
 * Tests for the Jira Sync Engine
 *
 * @module lib/jira/__tests__/sync-engine.test
 */

import path from 'path';
import fs from 'fs-extra';

import { SyncEngine, SyncOptions, SyncResult, Conflict } from '../sync-engine.js';
import { JiraClient, JiraIssue } from '../jira-client.js';
import { createSandbox, TestSandbox } from '../../__tests__/test-utils/sandbox';

// Mock JiraClient
const mockJiraClient = {
  createIssue: jest.fn(),
  updateIssue: jest.fn(),
  getIssue: jest.fn(),
} as unknown as JiraClient;

describe('SyncEngine', () => {
  let sandbox: TestSandbox;
  let testDir: string;
  let syncEngine: SyncEngine;

  beforeEach(async () => {
    sandbox = await createSandbox('sync-engine');
    testDir = sandbox.path;
    jest.clearAllMocks();
    syncEngine = new SyncEngine(mockJiraClient, 'https://example.atlassian.net');
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('constructor', () => {
    it('should create SyncEngine with JiraClient and baseUrl', () => {
      const engine = new SyncEngine(mockJiraClient, 'https://test.atlassian.net');
      expect(engine).toBeDefined();
    });

    it('should create SyncEngine without baseUrl', () => {
      const engine = new SyncEngine(mockJiraClient);
      expect(engine).toBeDefined();
    });
  });

  describe('syncToJira', () => {
    describe('CREATE mode', () => {
      it('should create new Jira issue when no jira-ticketId exists', async () => {
        const ticketPath = path.join(testDir, 'STORY-001.md');
        const ticketContent = `---
documentType: story
title: "Test Story"
description: "A test story"
priority: high
---

## Description

Test content.

## Acceptance Criteria

* **Verify** something works
`;
        await fs.writeFile(ticketPath, ticketContent, 'utf-8');

        (mockJiraClient.createIssue as jest.Mock).mockResolvedValue('PROJ-123');

        const result = await syncEngine.syncToJira(ticketPath);

        expect(result.success).toBe(true);
        expect(result.mode).toBe('create');
        expect(result.destination).toBe('PROJ-123');
        expect(mockJiraClient.createIssue).toHaveBeenCalled();
      });

      it('should create issue and update local file with Jira metadata', async () => {
        const ticketPath = path.join(testDir, 'STORY-002.md');
        const ticketContent = `---
documentType: story
title: "Another Story"
---

## Description

Test.
`;
        await fs.writeFile(ticketPath, ticketContent, 'utf-8');

        (mockJiraClient.createIssue as jest.Mock).mockResolvedValue('PROJ-456');

        const result = await syncEngine.syncToJira(ticketPath);

        expect(result.success).toBe(true);
        expect(result.changes.some((c) => c.field === 'jira-ticketId')).toBe(true);
        expect(result.changes.some((c) => c.field === 'jira-url')).toBe(true);

        // Verify local file was updated
        const updatedContent = await fs.readFile(ticketPath, 'utf-8');
        expect(updatedContent).toContain('jira-ticketId: PROJ-456');
        expect(updatedContent).toContain('jira-url:');
      });
    });

    describe('UPDATE mode', () => {
      it('should update existing Jira issue when jira-ticketId exists', async () => {
        const ticketPath = path.join(testDir, 'STORY-003.md');
        const ticketContent = `---
documentType: story
title: "Existing Story"
jira-ticketId: "PROJ-789"
jira-url: "https://example.atlassian.net/browse/PROJ-789"
---

## Description

Updated content.
`;
        await fs.writeFile(ticketPath, ticketContent, 'utf-8');

        // Mock getIssue to return current Jira data (no conflicts)
        (mockJiraClient.getIssue as jest.Mock).mockResolvedValue({
          key: 'PROJ-789',
          fields: {
            summary: 'Existing Story',
            priority: null,
          },
        });

        const result = await syncEngine.syncToJira(ticketPath);

        expect(result.success).toBe(true);
        expect(result.mode).toBe('update');
        expect(result.destination).toBe('PROJ-789');
        expect(mockJiraClient.updateIssue).toHaveBeenCalledWith(
          'PROJ-789',
          expect.any(Object)
        );
      });
    });

    describe('dry-run mode', () => {
      it('should not make API calls in dry-run mode', async () => {
        const ticketPath = path.join(testDir, 'STORY-004.md');
        const ticketContent = `---
documentType: story
title: "Dry Run Story"
---

## Description

Dry run test.
`;
        await fs.writeFile(ticketPath, ticketContent, 'utf-8');

        const result = await syncEngine.syncToJira(ticketPath, { dryRun: true });

        expect(result.success).toBe(true);
        expect(result.dryRun).toBe(true);
        expect(result.changes.length).toBeGreaterThan(0);
        expect(mockJiraClient.createIssue).not.toHaveBeenCalled();
        expect(mockJiraClient.updateIssue).not.toHaveBeenCalled();
      });
    });

    describe('conflict detection', () => {
      it('should detect conflicts and return error', async () => {
        const ticketPath = path.join(testDir, 'STORY-005.md');
        const ticketContent = `---
documentType: story
title: "Conflicting Story"
jira-ticketId: "PROJ-111"
jira-url: "https://example.atlassian.net/browse/PROJ-111"
priority: "high"
---

## Description

Conflicting content.
`;
        await fs.writeFile(ticketPath, ticketContent, 'utf-8');

        // Mock getIssue to return different data (causing conflict)
        (mockJiraClient.getIssue as jest.Mock).mockResolvedValue({
          key: 'PROJ-111',
          fields: {
            summary: 'Conflicting Story',
            priority: { name: 'Low' },
          },
        });

        const result = await syncEngine.syncToJira(ticketPath);

        expect(result.success).toBe(false);
        expect(result.conflicts).toBeDefined();
        expect(result.conflicts!.length).toBeGreaterThan(0);
        expect(result.error).toContain('conflict');
      });

      it('should proceed with force option despite conflicts', async () => {
        const ticketPath = path.join(testDir, 'STORY-006.md');
        const ticketContent = `---
documentType: story
title: "Force Story"
jira-ticketId: "PROJ-222"
jira-url: "https://example.atlassian.net/browse/PROJ-222"
priority: "high"
---

## Description

Force update.
`;
        await fs.writeFile(ticketPath, ticketContent, 'utf-8');

        (mockJiraClient.getIssue as jest.Mock).mockResolvedValue({
          key: 'PROJ-222',
          fields: {
            summary: 'Force Story',
            priority: { name: 'Low' },
          },
        });

        const result = await syncEngine.syncToJira(ticketPath, { force: true });

        expect(result.success).toBe(true);
        expect(mockJiraClient.updateIssue).toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should return error result when API fails', async () => {
        const ticketPath = path.join(testDir, 'STORY-007.md');
        const ticketContent = `---
documentType: story
title: "Failing Story"
---

## Description

This will fail.
`;
        await fs.writeFile(ticketPath, ticketContent, 'utf-8');

        (mockJiraClient.createIssue as jest.Mock).mockRejectedValue(
          new Error('API Error: Connection refused')
        );

        const result = await syncEngine.syncToJira(ticketPath);

        expect(result.success).toBe(false);
        expect(result.error).toContain('API Error');
      });
    });
  });

  describe('syncFromJira', () => {
    it('should download Jira issue to local file', async () => {
      const outputPath = path.join(testDir, 'downloaded', 'PROJ-333.md');

      (mockJiraClient.getIssue as jest.Mock).mockResolvedValue({
        key: 'PROJ-333',
        fields: {
          summary: 'Downloaded Issue',
          issuetype: { name: 'Story' },
          priority: { name: 'High' },
          description: 'Issue description from Jira.',
        },
      });

      const result = await syncEngine.syncFromJira('PROJ-333', outputPath);

      expect(result.success).toBe(true);
      expect(result.mode).toBe('download');
      expect(result.destination).toBe(outputPath);

      // Verify file was created
      const exists = await fs.pathExists(outputPath);
      expect(exists).toBe(true);
    });

    it('should not write file in dry-run mode', async () => {
      const outputPath = path.join(testDir, 'dryrun', 'PROJ-444.md');

      (mockJiraClient.getIssue as jest.Mock).mockResolvedValue({
        key: 'PROJ-444',
        fields: {
          summary: 'Dry Run Download',
          issuetype: { name: 'Task' },
        },
      });

      const result = await syncEngine.syncFromJira('PROJ-444', outputPath, {
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);

      // File should NOT be created
      const exists = await fs.pathExists(outputPath);
      expect(exists).toBe(false);
    });

    it('should detect conflicts with existing file', async () => {
      const outputPath = path.join(testDir, 'PROJ-555.md');
      const existingContent = `---
title: "Local Title"
jira-ticketId: "PROJ-555"
---

Local content.
`;
      await fs.writeFile(outputPath, existingContent, 'utf-8');

      (mockJiraClient.getIssue as jest.Mock).mockResolvedValue({
        key: 'PROJ-555',
        fields: {
          summary: 'Different Jira Title',
          issuetype: { name: 'Story' },
        },
      });

      const result = await syncEngine.syncFromJira('PROJ-555', outputPath);

      expect(result.success).toBe(false);
      expect(result.conflicts).toBeDefined();
      expect(result.error).toContain('conflict');
    });
  });

  describe('detectConflicts', () => {
    it('should detect conflicts between local and remote', async () => {
      const ticketPath = path.join(testDir, 'conflict.md');
      const content = `---
title: "Local Title"
priority: "high"
jira-ticketId: "PROJ-666"
---

Content.
`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      (mockJiraClient.getIssue as jest.Mock).mockResolvedValue({
        key: 'PROJ-666',
        fields: {
          summary: 'Remote Title',
          priority: { name: 'Low' },
        },
      });

      const conflicts = await syncEngine.detectConflicts(ticketPath, 'PROJ-666');

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts.some((c) => c.field === 'title')).toBe(true);
    });

    it('should return empty array when no conflicts', async () => {
      const ticketPath = path.join(testDir, 'noconflict.md');
      const content = `---
title: "Same Title"
jira-ticketId: "PROJ-777"
---

Content.
`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      (mockJiraClient.getIssue as jest.Mock).mockResolvedValue({
        key: 'PROJ-777',
        fields: {
          summary: 'Same Title',
        },
      });

      const conflicts = await syncEngine.detectConflicts(ticketPath, 'PROJ-777');

      expect(conflicts).toHaveLength(0);
    });
  });
});
