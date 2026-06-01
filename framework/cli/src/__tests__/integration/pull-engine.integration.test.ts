/**
 * Integration Tests: Pull Engine
 *
 * Exercises pullFromJira() with a mocked JiraClient and real file system
 * (using the test sandbox). Validates file creation, update, dry-run,
 * wiki-to-markdown conversion, and error handling.
 */

import { describe, it, expect, jest, beforeAll, afterAll, beforeEach } from '@jest/globals';
import path from 'path';
import fs from 'fs-extra';
import { createSandbox, TestSandbox } from '../../lib/__tests__/test-utils/sandbox.js';
import { pullFromJira, PullSummary } from '../../lib/backlog/pull-engine.js';
import { BacklogConfig } from '../../lib/backlog/config-loader.js';
import { JiraClient, JiraIssue, JiraSearchResults } from '../../lib/jira/jira-client.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockJiraClient(issues: JiraIssue[]): JiraClient {
  return {
    searchIssues: jest.fn<(jql: string, maxResults?: number, fields?: string[], nextPageToken?: string) => Promise<JiraSearchResults>>()
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

function makeJiraIssue(key: string, summary: string, description?: string): JiraIssue {
  return {
    key,
    fields: {
      summary,
      description: description ?? 'h2. Overview\n\nSome description',
      issuetype: { name: 'Story' },
      priority: { name: 'Medium' },
      status: { name: 'To Do' },
      updated: '2026-03-28T14:00:00.000+0000',
    },
  };
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

describe('Integration: pullFromJira', () => {
  let sandbox: TestSandbox;

  beforeAll(async () => {
    sandbox = await createSandbox('pull-engine-integration');
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

  // ---------- Test 1: Sprint filter creates new files ----------

  it('should create new ticket files from Jira issues (sprint filter)', async () => {
    const issues = [
      makeJiraIssue('PROJ-201', 'Implement login page'),
      makeJiraIssue('PROJ-202', 'Add password reset flow'),
    ];
    const client = createMockJiraClient(issues);

    const summary: PullSummary = await pullFromJira(config, client, testDir, {
      sprint: 'Sprint 2026-W12',
    });

    // Verify counts
    expect(summary.created).toBe(2);
    expect(summary.updated).toBe(0);
    expect(summary.errors).toBe(0);
    expect(summary.details.created).toHaveLength(2);

    // Verify files exist in backlog/tickets/
    const ticketDir = path.join(testDir, 'backlog', 'tickets');
    const files = await fs.readdir(ticketDir);
    expect(files).toHaveLength(2);

    // Each file should have YAML frontmatter with jira-ticketId and exportedDate
    for (const file of files) {
      const content = await fs.readFile(path.join(ticketDir, file), 'utf-8');
      expect(content).toMatch(/^---\n/);
      expect(content).toMatch(/jira-ticketId:/);
      expect(content).toMatch(/exportedDate:/);
    }

    // Verify JQL contained sprint filter
    expect(client.searchIssues).toHaveBeenCalledWith(
      expect.stringContaining('sprint = "Sprint 2026-W12"'),
      expect.any(Number),
      undefined,
      undefined,
    );
  });

  // ---------- Test 2: Bare pull updates existing local tickets ----------

  it('should update existing local tickets (bare pull)', async () => {
    // Pre-create a ticket file with jira-ticketId
    const existingFile = path.join(testDir, 'backlog', 'tickets', '100-old-title.md');
    await fs.writeFile(existingFile, [
      '---',
      'title: Old title',
      'jira-ticketId: PROJ-100',
      '---',
      '',
      'Old description',
    ].join('\n'), 'utf-8');

    const updatedIssue = makeJiraIssue('PROJ-100', 'New title from Jira', 'h2. Updated\n\nFresh content');
    const client = createMockJiraClient([updatedIssue]);

    const summary = await pullFromJira(config, client, testDir, {});

    expect(summary.updated).toBe(1);
    expect(summary.created).toBe(0);
    expect(summary.errors).toBe(0);

    // Verify file was overwritten with new content
    const content = await fs.readFile(existingFile, 'utf-8');
    expect(content).toContain('New title from Jira');
    expect(content).not.toContain('Old description');

    // Verify JQL used issueKey IN (...)
    expect(client.searchIssues).toHaveBeenCalledWith(
      expect.stringContaining('issueKey IN (PROJ-100)'),
      expect.any(Number),
      undefined,
      undefined,
    );
  });

  // ---------- Test 3: Dry-run does not write files ----------

  it('should not write files in dry-run mode', async () => {
    const issues = [
      makeJiraIssue('PROJ-301', 'Feature A'),
      makeJiraIssue('PROJ-302', 'Feature B'),
    ];
    const client = createMockJiraClient(issues);

    const summary = await pullFromJira(config, client, testDir, {
      sprint: 'Sprint 2026-W12',
      dryRun: true,
    });

    // Summary still reports what would happen
    expect(summary.created).toBe(2);
    expect(summary.updated).toBe(0);

    // No files should have been created
    const ticketDir = path.join(testDir, 'backlog', 'tickets');
    const files = await fs.readdir(ticketDir);
    expect(files).toHaveLength(0);
  });

  // ---------- Test 4: Wiki description converted to markdown ----------

  it('should convert Jira wiki description to markdown', async () => {
    const wikiDescription = 'h2. Overview\n\n*Bold text* with _italic_';
    const issues = [makeJiraIssue('PROJ-400', 'Wiki test', wikiDescription)];
    const client = createMockJiraClient(issues);

    const summary = await pullFromJira(config, client, testDir, {
      sprint: 'Sprint 2026-W12',
    });

    expect(summary.created).toBe(1);

    const ticketDir = path.join(testDir, 'backlog', 'tickets');
    const files = await fs.readdir(ticketDir);
    const content = await fs.readFile(path.join(ticketDir, files[0]), 'utf-8');

    // h2. Overview -> ## Overview
    expect(content).toContain('## Overview');
    // *Bold text* -> **Bold text**
    expect(content).toContain('**Bold text**');
  });

  // ---------- Test 5: Empty backlog bare pull ----------

  it('should handle empty backlog (bare pull with no local tickets)', async () => {
    const client = createMockJiraClient([]);

    const summary = await pullFromJira(config, client, testDir, {});

    expect(summary.created).toBe(0);
    expect(summary.updated).toBe(0);
    expect(summary.errors).toBe(0);
    expect(summary.inSync).toBe(0);

    // searchIssues should NOT have been called
    expect(client.searchIssues).not.toHaveBeenCalled();
  });

  // ---------- Test 6: jira-url uses config.jiraBaseUrl ----------

  it('should set jira-url using config.jiraBaseUrl', async () => {
    const issues = [makeJiraIssue('PROJ-500', 'URL test ticket')];
    const client = createMockJiraClient(issues);

    await pullFromJira(config, client, testDir, {
      sprint: 'Sprint 2026-W12',
    });

    const ticketDir = path.join(testDir, 'backlog', 'tickets');
    const files = await fs.readdir(ticketDir);
    const content = await fs.readFile(path.join(ticketDir, files[0]), 'utf-8');

    expect(content).toContain('jira-url');
    expect(content).toContain('https://test.atlassian.net/browse/PROJ-500');
  });

  // ---------- Test 7: Per-issue errors don't fail the whole pull ----------

  it('should handle errors per-issue without failing entire pull', async () => {
    // Create an issue whose fields will cause mapJiraToLocal to throw:
    // a null fields object triggers an error inside the mapper
    const goodIssue = makeJiraIssue('PROJ-601', 'Good ticket');
    const badIssue: JiraIssue = {
      key: 'PROJ-602',
      fields: null as unknown as Record<string, unknown>,
    };

    const client = createMockJiraClient([goodIssue, badIssue]);

    const summary = await pullFromJira(config, client, testDir, {
      sprint: 'Sprint 2026-W12',
    });

    // Good issue should succeed
    expect(summary.created).toBeGreaterThanOrEqual(1);
    // Bad issue should be counted as error
    expect(summary.errors).toBeGreaterThanOrEqual(1);
    expect(summary.details.errors.length).toBeGreaterThanOrEqual(1);
    expect(summary.details.errors.some(e => e.ticket === 'PROJ-602')).toBe(true);
  });
});
