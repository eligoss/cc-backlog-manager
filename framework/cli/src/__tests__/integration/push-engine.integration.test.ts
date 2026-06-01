/**
 * Integration Tests: Push Engine
 *
 * Exercises pushToJira() with a mocked JiraClient and real file system
 * (using the test sandbox). Validates UPDATE mode, conflict detection,
 * force push, dry-run, error handling, and multi-ticket scenarios.
 *
 * @module __tests__/integration/push-engine.integration.test
 */

import { describe, it, expect, jest, beforeAll, afterAll, beforeEach } from '@jest/globals';
import path from 'path';
import fs from 'fs-extra';
import { createSandbox, TestSandbox } from '../../lib/__tests__/test-utils/sandbox.js';
import { pushToJira, PushMode, PushSummary } from '../../lib/backlog/push-engine.js';
import { BacklogConfig } from '../../lib/backlog/config-loader.js';
import { JiraClient, JiraIssue, JiraSearchResults } from '../../lib/jira/jira-client.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MockMethods {
  searchIssues: jest.Mock<(jql: string, startAt?: number, maxResults?: number) => Promise<JiraSearchResults>>;
  getIssue: jest.Mock<(key: string) => Promise<JiraIssue>>;
  createIssue: jest.Mock<(fields: Record<string, unknown>) => Promise<string>>;
  updateIssue: jest.Mock<(key: string, fields: Record<string, unknown>) => Promise<void>>;
}

function createMockJiraClient(): { client: JiraClient; mocks: MockMethods } {
  const mocks: MockMethods = {
    searchIssues: jest.fn<(jql: string, startAt?: number, maxResults?: number) => Promise<JiraSearchResults>>()
      .mockResolvedValue({ issues: [], startAt: 0, maxResults: 50, total: 0 }),
    getIssue: jest.fn<(key: string) => Promise<JiraIssue>>(),
    createIssue: jest.fn<(fields: Record<string, unknown>) => Promise<string>>()
      .mockResolvedValue('PROJ-999'),
    updateIssue: jest.fn<(key: string, fields: Record<string, unknown>) => Promise<void>>()
      .mockResolvedValue(undefined),
  };
  return { client: mocks as unknown as JiraClient, mocks };
}

/**
 * Build markdown ticket content with YAML frontmatter.
 *
 * Timestamps (containing colons) are written unquoted so the push engine's
 * simple line-by-line parser receives clean ISO strings. Values containing
 * colons that are NOT timestamps should be quoted.
 */
function createTicketFile(frontmatter: Record<string, unknown>, body: string): string {
  const lines = ['---'];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === null) {
      lines.push(`${key}: null`);
    } else if (typeof value === 'string' && value.includes(':') && !key.includes('Date')) {
      lines.push(`${key}: "${value}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---', '', body);
  return lines.join('\n');
}

const config: BacklogConfig = {
  jiraProject: 'PROJ',
  jiraBaseUrl: 'https://test.atlassian.net',
  envFile: '.env',
  components: [],
  defaults: {
    ticketPath: './backlog/tickets',
    epicPath: './backlog/epics',
    sprintPath: './backlog/sprints',
    milestonePath: './backlog/milestones',
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Integration: pushToJira', () => {
  let sandbox: TestSandbox;

  beforeAll(async () => {
    sandbox = await createSandbox('push-engine-integration');
  });

  afterAll(async () => {
    await sandbox.cleanup();
  });

  // Each test gets its own subdirectory to avoid cross-contamination
  let testDir: string;
  let testIndex = 0;

  beforeEach(async () => {
    testIndex++;
    testDir = path.join(sandbox.path, `test-${testIndex}`);
    await fs.ensureDir(path.join(testDir, 'backlog', 'tickets'));
    await fs.ensureDir(path.join(testDir, 'backlog', 'epics'));
  });

  // ---------- Test 1: UPDATE an existing ticket ----------

  it('should UPDATE an existing ticket in Jira', async () => {
    const ticketContent = createTicketFile(
      {
        title: 'Implement login page',
        documentType: 'story',
        priority: 'P1',
        'jira-ticketId': 'PROJ-100',
        'jira-url': 'https://test.atlassian.net/browse/PROJ-100',
        exportedDate: '2026-03-20T10:00:00Z',
      },
      [
        '# Implement login page',
        '',
        '## Description',
        '',
        'Build a login page with email and password fields.',
        '',
        '## Acceptance Criteria',
        '',
        '- **Verify** that users can log in with valid credentials',
        '- **Verify** that invalid credentials show an error message',
      ].join('\n'),
    );

    const ticketPath = path.join(testDir, 'backlog', 'tickets', 'PROJ-100.md');
    await fs.writeFile(ticketPath, ticketContent, 'utf-8');

    // Set file mtime to after exportedDate so local is considered changed
    const recentDate = new Date('2026-03-25T10:00:00Z');
    await fs.utimes(ticketPath, recentDate, recentDate);

    const { client, mocks } = createMockJiraClient();

    // Mock getIssue: Jira was NOT updated after exportedDate (no conflict)
    mocks.getIssue.mockResolvedValue({
      key: 'PROJ-100',
      fields: { updated: '2026-03-19T10:00:00Z' },
    });

    const summary: PushSummary = await pushToJira(config, client, testDir, {
      tickets: ['PROJ-100'],
    });

    // Verify updateIssue was called with the ticket key
    expect(mocks.updateIssue).toHaveBeenCalledWith(
      'PROJ-100',
      expect.objectContaining({ description: expect.any(String) }),
    );

    // Verify summary counts
    expect(summary.pushed).toBe(1);
    expect(summary.created).toBe(0);
    expect(summary.skipped).toBe(0);
    expect(summary.errors).toBe(0);

    // Verify the result details
    const result = summary.results[0];
    expect(result.ticketId).toBe('PROJ-100');
    expect(result.mode).toBe(PushMode.UPDATE);
    expect(result.success).toBe(true);

    // Verify local file is NOT modified by UPDATE (push only writes to Jira)
    const updatedContent = await fs.readFile(ticketPath, 'utf-8');
    expect(updatedContent).toBe(ticketContent);
  });

  // ---------- Test 2: CONFLICT detection skips ticket ----------

  it('should skip ticket with CONFLICT status when not forced', async () => {
    const ticketContent = createTicketFile(
      {
        title: 'Conflicting ticket',
        documentType: 'story',
        'jira-ticketId': 'PROJ-200',
        exportedDate: '2026-03-15T10:00:00Z',
      },
      '# Conflicting ticket\n\nDescription here.',
    );

    const ticketPath = path.join(testDir, 'backlog', 'tickets', 'PROJ-200.md');
    await fs.writeFile(ticketPath, ticketContent, 'utf-8');

    // Set file mtime AFTER exportedDate (local changed)
    const localChangeDate = new Date('2026-03-28T10:00:00Z');
    await fs.utimes(ticketPath, localChangeDate, localChangeDate);

    const { client, mocks } = createMockJiraClient();

    // Mock getIssue: Jira ALSO updated after exportedDate (conflict)
    mocks.getIssue.mockResolvedValue({
      key: 'PROJ-200',
      fields: { updated: '2026-03-28T14:00:00Z' },
    });

    const summary: PushSummary = await pushToJira(config, client, testDir, {
      tickets: ['PROJ-200'],
    });

    // Verify updateIssue was NOT called
    expect(mocks.updateIssue).not.toHaveBeenCalled();
    expect(mocks.createIssue).not.toHaveBeenCalled();

    // Verify summary
    expect(summary.pushed).toBe(0);
    expect(summary.skipped).toBe(1);
    expect(summary.errors).toBe(0);

    // Verify skip reason mentions conflict
    const result = summary.results[0];
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toContain('conflict');
  });

  // ---------- Test 3: Force push overrides conflict ----------

  it('should force push despite conflict when --force is set', async () => {
    const ticketContent = createTicketFile(
      {
        title: 'Force-pushed ticket',
        documentType: 'story',
        'jira-ticketId': 'PROJ-300',
        exportedDate: '2026-03-15T10:00:00Z',
      },
      '# Force-pushed ticket\n\nDescription here.',
    );

    const ticketPath = path.join(testDir, 'backlog', 'tickets', 'PROJ-300.md');
    await fs.writeFile(ticketPath, ticketContent, 'utf-8');

    // Set file mtime AFTER exportedDate (local changed)
    const localChangeDate = new Date('2026-03-28T10:00:00Z');
    await fs.utimes(ticketPath, localChangeDate, localChangeDate);

    const { client, mocks } = createMockJiraClient();

    // Mock getIssue: Jira ALSO updated after exportedDate (would be conflict)
    mocks.getIssue.mockResolvedValue({
      key: 'PROJ-300',
      fields: { updated: '2026-03-28T14:00:00Z' },
    });

    const summary: PushSummary = await pushToJira(config, client, testDir, {
      tickets: ['PROJ-300'],
      force: true,
    });

    // With --force, updateIssue SHOULD be called (skipping conflict check)
    expect(mocks.updateIssue).toHaveBeenCalledWith(
      'PROJ-300',
      expect.objectContaining({ description: expect.any(String) }),
    );

    // Verify summary
    expect(summary.pushed).toBe(1);
    expect(summary.skipped).toBe(0);
    expect(summary.errors).toBe(0);
  });

  // ---------- Test 4: Dry-run mode ----------

  it('should not call Jira API in dry-run mode', async () => {
    const ticketContent = createTicketFile(
      {
        title: 'Dry-run ticket',
        documentType: 'story',
        'jira-ticketId': 'PROJ-400',
        exportedDate: '2026-03-20T10:00:00Z',
      },
      '# Dry-run ticket\n\nDescription here.',
    );

    const ticketPath = path.join(testDir, 'backlog', 'tickets', 'PROJ-400.md');
    await fs.writeFile(ticketPath, ticketContent, 'utf-8');

    // Set file mtime after exportedDate so local is "changed"
    const recentDate = new Date('2026-03-25T10:00:00Z');
    await fs.utimes(ticketPath, recentDate, recentDate);

    const { client, mocks } = createMockJiraClient();

    // Mock getIssue: no conflict
    mocks.getIssue.mockResolvedValue({
      key: 'PROJ-400',
      fields: { updated: '2026-03-19T10:00:00Z' },
    });

    const originalContent = await fs.readFile(ticketPath, 'utf-8');

    const summary: PushSummary = await pushToJira(config, client, testDir, {
      tickets: ['PROJ-400'],
      dryRun: true,
    });

    // Neither updateIssue nor createIssue should be called in dry-run
    expect(mocks.updateIssue).not.toHaveBeenCalled();
    expect(mocks.createIssue).not.toHaveBeenCalled();

    // Dry-run still counts as "would push"
    expect(summary.pushed).toBe(1);
    expect(summary.errors).toBe(0);

    // Local file should NOT be modified
    const afterContent = await fs.readFile(ticketPath, 'utf-8');
    expect(afterContent).toBe(originalContent);
  });

  // ---------- Test 5: Error when file not found ----------

  it('should report error when local file not found for ticket ID', async () => {
    const { client } = createMockJiraClient();

    const summary: PushSummary = await pushToJira(config, client, testDir, {
      tickets: ['PROJ-999'],
    });

    expect(summary.errors).toBe(1);
    expect(summary.pushed).toBe(0);
    expect(summary.results).toHaveLength(1);

    const result = summary.results[0];
    expect(result.success).toBe(false);
    expect(result.ticketId).toBe('PROJ-999');
    expect(result.error).toContain('not found');
  });

  // ---------- Test 6: Multiple tickets ----------

  it('should handle multiple tickets in a single push', async () => {
    // Create two ticket files
    const ticket1Content = createTicketFile(
      {
        title: 'First ticket',
        documentType: 'story',
        'jira-ticketId': 'PROJ-501',
        exportedDate: '2026-03-20T10:00:00Z',
      },
      '# First ticket\n\nDescription for first ticket.',
    );

    const ticket2Content = createTicketFile(
      {
        title: 'Second ticket',
        documentType: 'task',
        'jira-ticketId': 'PROJ-502',
        exportedDate: '2026-03-20T10:00:00Z',
      },
      '# Second ticket\n\nDescription for second ticket.',
    );

    const ticket1Path = path.join(testDir, 'backlog', 'tickets', 'PROJ-501.md');
    const ticket2Path = path.join(testDir, 'backlog', 'tickets', 'PROJ-502.md');
    await fs.writeFile(ticket1Path, ticket1Content, 'utf-8');
    await fs.writeFile(ticket2Path, ticket2Content, 'utf-8');

    // Set file mtime after exportedDate for both
    const recentDate = new Date('2026-03-25T10:00:00Z');
    await fs.utimes(ticket1Path, recentDate, recentDate);
    await fs.utimes(ticket2Path, recentDate, recentDate);

    const { client, mocks } = createMockJiraClient();

    // Mock getIssue for both: no conflict
    mocks.getIssue
      .mockResolvedValueOnce({
        key: 'PROJ-501',
        fields: { updated: '2026-03-19T10:00:00Z' },
      })
      .mockResolvedValueOnce({
        key: 'PROJ-502',
        fields: { updated: '2026-03-19T10:00:00Z' },
      });

    const summary: PushSummary = await pushToJira(config, client, testDir, {
      tickets: ['PROJ-501', 'PROJ-502'],
    });

    // Verify updateIssue was called twice
    expect(mocks.updateIssue).toHaveBeenCalledTimes(2);

    // Verify summary
    expect(summary.pushed).toBe(2);
    expect(summary.created).toBe(0);
    expect(summary.skipped).toBe(0);
    expect(summary.errors).toBe(0);
    expect(summary.results).toHaveLength(2);

    // Both results should be successful
    for (const result of summary.results) {
      expect(result.success).toBe(true);
      expect(result.mode).toBe(PushMode.UPDATE);
    }
  });

  // ---------- Test 7: Mixed results (one found, one not) ----------

  it('should handle mix of found and not-found tickets', async () => {
    const ticketContent = createTicketFile(
      {
        title: 'Found ticket',
        documentType: 'story',
        'jira-ticketId': 'PROJ-601',
        exportedDate: '2026-03-20T10:00:00Z',
      },
      '# Found ticket\n\nDescription.',
    );

    const ticketPath = path.join(testDir, 'backlog', 'tickets', 'PROJ-601.md');
    await fs.writeFile(ticketPath, ticketContent, 'utf-8');

    const recentDate = new Date('2026-03-25T10:00:00Z');
    await fs.utimes(ticketPath, recentDate, recentDate);

    const { client, mocks } = createMockJiraClient();

    mocks.getIssue.mockResolvedValue({
      key: 'PROJ-601',
      fields: { updated: '2026-03-19T10:00:00Z' },
    });

    const summary: PushSummary = await pushToJira(config, client, testDir, {
      tickets: ['PROJ-601', 'PROJ-MISSING'],
    });

    expect(summary.pushed).toBe(1);
    expect(summary.errors).toBe(1);
    expect(summary.results).toHaveLength(2);

    const successResult = summary.results.find(r => r.success);
    const errorResult = summary.results.find(r => !r.success);
    expect(successResult?.ticketId).toBe('PROJ-601');
    expect(errorResult?.ticketId).toBe('PROJ-MISSING');
    expect(errorResult?.error).toContain('not found');
  });
});
