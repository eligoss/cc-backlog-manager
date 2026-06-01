/**
 * Integration tests for the diff engine
 *
 * Exercises `diffAllTickets()` with a mocked JiraClient and real file system
 * (using the test sandbox) to verify sync status detection across various
 * scenarios: in-sync, remote-newer, local-only, mixed, filtered, and
 * multi-directory scanning.
 *
 * @module __tests__/integration/diff-engine.integration.test
 */

import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import path from 'path';
import fs from 'fs-extra';
import { createSandbox, TestSandbox } from '../../lib/__tests__/test-utils/sandbox.js';
import { diffAllTickets, SyncStatus, DiffSummary } from '../../lib/backlog/diff-engine.js';
import { BacklogConfig } from '../../lib/backlog/config-loader.js';
import { JiraClient, JiraIssue, JiraSearchResults } from '../../lib/jira/jira-client.js';

/**
 * Create a mock JiraClient that returns the given issues from searchIssues.
 */
function createMockJiraClient(issues: JiraIssue[]): JiraClient {
  return {
    searchIssues: jest.fn<(jql: string, startAt?: number, maxResults?: number) => Promise<JiraSearchResults>>()
      .mockResolvedValue({
        issues,
        startAt: 0,
        maxResults: 50,
        total: issues.length,
      }),
    getIssue: jest.fn(),
    createIssue: jest.fn(),
    updateIssue: jest.fn(),
  } as unknown as JiraClient;
}

/**
 * Build markdown ticket content with YAML frontmatter.
 *
 * The diff-engine's simple line-by-line parser uses the first colon as the
 * key/value delimiter and does NOT strip quotes from values. Timestamps
 * (which contain colons) must be written unquoted so parseDate receives
 * a clean ISO string.
 */
function createTicketContent(fields: Record<string, unknown>): string {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fields)) {
    if (value === null) {
      lines.push(`${key}: null`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---', '', '# Ticket', '', 'Description here');
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

describe('diffAllTickets integration', () => {
  let sandbox: TestSandbox;

  beforeAll(async () => {
    sandbox = await createSandbox('diff-engine-integration');
    // Pre-create the ticket and epic directories
    await sandbox.createDir('backlog/tickets');
    await sandbox.createDir('backlog/epics');
  });

  afterAll(async () => {
    await sandbox.cleanup();
  });

  it('should return IN_SYNC for tickets where exportedDate >= jira updated', async () => {
    await sandbox.createFile(
      'backlog/tickets/PROJ-100.md',
      createTicketContent({
        title: 'In-sync ticket',
        'jira-ticketId': 'PROJ-100',
        exportedDate: '2026-03-28T14:00:00Z',
      })
    );

    const jiraClient = createMockJiraClient([
      {
        key: 'PROJ-100',
        fields: { updated: '2026-03-28T13:00:00Z' },
      },
    ]);

    // Set file mtime to BEFORE exportedDate so local is not considered changed
    const filePath = sandbox.resolve('backlog/tickets/PROJ-100.md');
    const pastDate = new Date('2026-03-27T10:00:00Z');
    await fs.utimes(filePath, pastDate, pastDate);

    const result = await diffAllTickets(config, jiraClient, sandbox.path);

    const ticket = result.results.find((r) => r.ticketId === 'PROJ-100');
    expect(ticket).toBeDefined();
    expect(ticket!.status).toBe(SyncStatus.IN_SYNC);
    expect(result.counts[SyncStatus.IN_SYNC]).toBeGreaterThanOrEqual(1);
  });

  it('should return REMOTE_NEWER when Jira updated after exportedDate', async () => {
    await sandbox.createFile(
      'backlog/tickets/PROJ-200.md',
      createTicketContent({
        title: 'Remote-newer ticket',
        'jira-ticketId': 'PROJ-200',
        exportedDate: '2026-03-20T10:00:00Z',
      })
    );

    const jiraClient = createMockJiraClient([
      {
        key: 'PROJ-200',
        fields: { updated: '2026-03-28T14:00:00Z' },
      },
    ]);

    // Set file mtime to BEFORE exportedDate so only remote is newer
    const filePath = sandbox.resolve('backlog/tickets/PROJ-200.md');
    const pastDate = new Date('2026-03-19T10:00:00Z');
    await fs.utimes(filePath, pastDate, pastDate);

    const result = await diffAllTickets(config, jiraClient, sandbox.path);

    const ticket = result.results.find((r) => r.ticketId === 'PROJ-200');
    expect(ticket).toBeDefined();
    expect(ticket!.status).toBe(SyncStatus.REMOTE_NEWER);
    expect(result.counts[SyncStatus.REMOTE_NEWER]).toBeGreaterThanOrEqual(1);
  });

  it('should return LOCAL_ONLY for tickets without jira-ticketId', async () => {
    await sandbox.createFile(
      'backlog/tickets/LOCAL-ONLY.md',
      createTicketContent({
        title: 'Local-only ticket',
        'jira-ticketId': null,
      })
    );

    const jiraClient = createMockJiraClient([]);

    const result = await diffAllTickets(config, jiraClient, sandbox.path);

    const ticket = result.results.find((r) => r.ticketId === '(local)');
    expect(ticket).toBeDefined();
    expect(ticket!.status).toBe(SyncStatus.LOCAL_ONLY);
    expect(result.counts[SyncStatus.LOCAL_ONLY]).toBeGreaterThanOrEqual(1);
  });

  it('should handle multiple tickets with mixed statuses', async () => {
    // Use a fresh sandbox to isolate counts
    const mixedSandbox = await createSandbox('diff-engine-mixed');
    await mixedSandbox.createDir('backlog/tickets');
    await mixedSandbox.createDir('backlog/epics');

    // 1. In-sync ticket
    await mixedSandbox.createFile(
      'backlog/tickets/MIX-001.md',
      createTicketContent({
        title: 'In-sync',
        'jira-ticketId': 'MIX-001',
        exportedDate: '2026-03-28T14:00:00Z',
      })
    );
    const inSyncPath = mixedSandbox.resolve('backlog/tickets/MIX-001.md');
    const pastDate = new Date('2026-03-27T10:00:00Z');
    await fs.utimes(inSyncPath, pastDate, pastDate);

    // 2. Remote-newer ticket
    await mixedSandbox.createFile(
      'backlog/tickets/MIX-002.md',
      createTicketContent({
        title: 'Remote-newer',
        'jira-ticketId': 'MIX-002',
        exportedDate: '2026-03-20T10:00:00Z',
      })
    );
    const remoteNewerPath = mixedSandbox.resolve('backlog/tickets/MIX-002.md');
    const earlyDate = new Date('2026-03-19T10:00:00Z');
    await fs.utimes(remoteNewerPath, earlyDate, earlyDate);

    // 3. Local-only ticket
    await mixedSandbox.createFile(
      'backlog/tickets/MIX-LOCAL.md',
      createTicketContent({
        title: 'Local-only',
        'jira-ticketId': null,
      })
    );

    const jiraClient = createMockJiraClient([
      {
        key: 'MIX-001',
        fields: { updated: '2026-03-28T13:00:00Z' },
      },
      {
        key: 'MIX-002',
        fields: { updated: '2026-03-28T14:00:00Z' },
      },
    ]);

    const result = await diffAllTickets(config, jiraClient, mixedSandbox.path);

    expect(result.results).toHaveLength(3);
    expect(result.counts[SyncStatus.IN_SYNC]).toBe(1);
    expect(result.counts[SyncStatus.REMOTE_NEWER]).toBe(1);
    expect(result.counts[SyncStatus.LOCAL_ONLY]).toBe(1);

    await mixedSandbox.cleanup();
  });

  it('should filter by ticketId when filter provided', async () => {
    // Use a fresh sandbox to isolate results
    const filterSandbox = await createSandbox('diff-engine-filter');
    await filterSandbox.createDir('backlog/tickets');
    await filterSandbox.createDir('backlog/epics');

    await filterSandbox.createFile(
      'backlog/tickets/FILT-100.md',
      createTicketContent({
        title: 'Filtered in',
        'jira-ticketId': 'FILT-100',
        exportedDate: '2026-03-28T14:00:00Z',
      })
    );
    const filtPath = filterSandbox.resolve('backlog/tickets/FILT-100.md');
    const pastDate = new Date('2026-03-27T10:00:00Z');
    await fs.utimes(filtPath, pastDate, pastDate);

    await filterSandbox.createFile(
      'backlog/tickets/FILT-200.md',
      createTicketContent({
        title: 'Filtered out',
        'jira-ticketId': 'FILT-200',
        exportedDate: '2026-03-28T14:00:00Z',
      })
    );

    const jiraClient = createMockJiraClient([
      {
        key: 'FILT-100',
        fields: { updated: '2026-03-28T13:00:00Z' },
      },
    ]);

    const result = await diffAllTickets(config, jiraClient, filterSandbox.path, {
      ticketId: 'FILT-100',
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].ticketId).toBe('FILT-100');

    await filterSandbox.cleanup();
  });

  it('should scan both tickets and epics directories', async () => {
    // Use a fresh sandbox to isolate results
    const bothSandbox = await createSandbox('diff-engine-both-dirs');
    await bothSandbox.createDir('backlog/tickets');
    await bothSandbox.createDir('backlog/epics');

    await bothSandbox.createFile(
      'backlog/tickets/BOTH-001.md',
      createTicketContent({
        title: 'Ticket in tickets dir',
        'jira-ticketId': 'BOTH-001',
        exportedDate: '2026-03-28T14:00:00Z',
      })
    );
    const ticketPath = bothSandbox.resolve('backlog/tickets/BOTH-001.md');
    const pastDate = new Date('2026-03-27T10:00:00Z');
    await fs.utimes(ticketPath, pastDate, pastDate);

    await bothSandbox.createFile(
      'backlog/epics/BOTH-EPIC-001.md',
      createTicketContent({
        title: 'Epic in epics dir',
        'jira-ticketId': 'BOTH-EPIC-001',
        exportedDate: '2026-03-28T14:00:00Z',
      })
    );
    const epicPath = bothSandbox.resolve('backlog/epics/BOTH-EPIC-001.md');
    await fs.utimes(epicPath, pastDate, pastDate);

    const jiraClient = createMockJiraClient([
      {
        key: 'BOTH-001',
        fields: { updated: '2026-03-28T13:00:00Z' },
      },
      {
        key: 'BOTH-EPIC-001',
        fields: { updated: '2026-03-28T13:00:00Z' },
      },
    ]);

    const result = await diffAllTickets(config, jiraClient, bothSandbox.path);

    expect(result.results).toHaveLength(2);

    const ticketIds = result.results.map((r) => r.ticketId);
    expect(ticketIds).toContain('BOTH-001');
    expect(ticketIds).toContain('BOTH-EPIC-001');

    await bothSandbox.cleanup();
  });

  it('should skip README.md files', async () => {
    // Use a fresh sandbox to isolate results
    const readmeSandbox = await createSandbox('diff-engine-readme');
    await readmeSandbox.createDir('backlog/tickets');
    await readmeSandbox.createDir('backlog/epics');

    // Create a README.md with frontmatter that would match if not filtered
    await readmeSandbox.createFile(
      'backlog/tickets/README.md',
      createTicketContent({
        title: 'README that should be skipped',
        'jira-ticketId': 'README-001',
        exportedDate: '2026-03-28T14:00:00Z',
      })
    );

    // Create a real ticket to confirm scanning still works
    await readmeSandbox.createFile(
      'backlog/tickets/REAL-001.md',
      createTicketContent({
        title: 'Real ticket',
        'jira-ticketId': 'REAL-001',
        exportedDate: '2026-03-28T14:00:00Z',
      })
    );
    const realPath = readmeSandbox.resolve('backlog/tickets/REAL-001.md');
    const pastDate = new Date('2026-03-27T10:00:00Z');
    await fs.utimes(realPath, pastDate, pastDate);

    const jiraClient = createMockJiraClient([
      {
        key: 'REAL-001',
        fields: { updated: '2026-03-28T13:00:00Z' },
      },
    ]);

    const result = await diffAllTickets(config, jiraClient, readmeSandbox.path);

    expect(result.results).toHaveLength(1);
    expect(result.results[0].ticketId).toBe('REAL-001');

    // README should not appear in results
    const readmeResult = result.results.find((r) => r.ticketId === 'README-001');
    expect(readmeResult).toBeUndefined();

    await readmeSandbox.cleanup();
  });
});
