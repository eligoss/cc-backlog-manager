import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import fs from 'fs-extra';
import { createSandbox, TestSandbox } from '../../lib/__tests__/test-utils/sandbox.js';
import { pushSprintToJira, PushSprintSummary } from '../../lib/backlog/push-sprint-engine.js';
import { BacklogConfig } from '../../lib/backlog/config-loader.js';
import { JiraClient, JiraBoard, JiraSprint } from '../../lib/jira/jira-client.js';

function createMockJiraClient(existingSprintIssues: string[] = []) {
  const mocks = {
    getBoardsForProject: jest.fn<() => Promise<JiraBoard[]>>()
      .mockResolvedValue([{ id: 42, name: 'DAPM Board', type: 'scrum' }]),
    getSprintsForBoard: jest.fn<() => Promise<JiraSprint[]>>()
      .mockResolvedValue([
        { id: 101, name: 'APMR-APP-2026W17', state: 'future' },
        { id: 102, name: 'APMR-APP-2026W19', state: 'future' },
      ]),
    moveIssuesToSprint: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    getSprintIssues: jest.fn<() => Promise<string[]>>()
      .mockResolvedValue(existingSprintIssues),
    moveIssuesToBacklog: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };
  return { client: mocks as unknown as JiraClient, mocks };
}

describe('pushSprintToJira', () => {
  let sandbox: TestSandbox;

  beforeEach(async () => {
    sandbox = await createSandbox('push-sprint');
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  it('should add new tickets and leave existing ones unchanged', async () => {
    const sprintContent = `---
documentType: sprint
sprintId: "APMR-APP-2026W17"
sprintName: "Sprint APMR-APP-2026W17"
---
# Sprint: APMR-APP-2026W17

## Committed Tickets

### Stories

- [DAPM-2499](../tickets/2499-test.md) - Test story 1
- [DAPM-2516](../tickets/2516-test.md) - Test story 2

### Tasks

- [DAPM-1769](../tickets/1769-test.md) - Test task
`;
    await fs.ensureDir(path.join(sandbox.path, 'backlog/sprints'));
    await fs.writeFile(
      path.join(sandbox.path, 'backlog/sprints/APMR-APP-2026W17.md'),
      sprintContent,
    );

    const config: BacklogConfig = {
      jiraProject: 'DAPM',
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

    // Jira sprint already has DAPM-2499, so only 2516 and 1769 should be added
    const { client, mocks } = createMockJiraClient(['DAPM-2499']);

    const summary = await pushSprintToJira(
      config,
      client,
      sandbox.path,
      { sprintName: 'APMR-APP-2026W17', dryRun: false },
    );

    expect(summary.added).toBe(2);
    expect(summary.unchanged).toBe(1);
    expect(summary.removed).toBe(0);
    expect(mocks.moveIssuesToSprint).toHaveBeenCalledWith(
      101,
      ['DAPM-2516', 'DAPM-1769'],
    );
    expect(mocks.moveIssuesToBacklog).not.toHaveBeenCalled();
  });

  it('should sync: add missing and remove stale tickets', async () => {
    const sprintContent = `---
documentType: sprint
sprintId: "APMR-APP-2026W17"
---
# Sprint

- [DAPM-2499](../tickets/2499-test.md) - Stays in sprint
- [DAPM-2516](../tickets/2516-test.md) - New to sprint
`;
    await fs.ensureDir(path.join(sandbox.path, 'backlog/sprints'));
    await fs.writeFile(
      path.join(sandbox.path, 'backlog/sprints/APMR-APP-2026W17.md'),
      sprintContent,
    );

    const config: BacklogConfig = {
      jiraProject: 'DAPM',
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

    // Jira has DAPM-2499 (stays) and DAPM-9999 (stale, should be removed)
    const { client, mocks } = createMockJiraClient(['DAPM-2499', 'DAPM-9999']);

    const summary = await pushSprintToJira(
      config,
      client,
      sandbox.path,
      { sprintName: 'APMR-APP-2026W17', dryRun: false },
    );

    expect(summary.added).toBe(1);
    expect(summary.removed).toBe(1);
    expect(summary.unchanged).toBe(1);
    expect(summary.errors).toBe(0);
    expect(mocks.moveIssuesToSprint).toHaveBeenCalledWith(101, ['DAPM-2516']);
    expect(mocks.moveIssuesToBacklog).toHaveBeenCalledWith(['DAPM-9999']);
  });

  it('should be a no-op when sprint is already in sync', async () => {
    const sprintContent = `---
documentType: sprint
sprintId: "APMR-APP-2026W17"
---
# Sprint

- [DAPM-2499](../tickets/2499-test.md) - Already in Jira sprint
- [DAPM-2516](../tickets/2516-test.md) - Already in Jira sprint
`;
    await fs.ensureDir(path.join(sandbox.path, 'backlog/sprints'));
    await fs.writeFile(
      path.join(sandbox.path, 'backlog/sprints/APMR-APP-2026W17.md'),
      sprintContent,
    );

    const config: BacklogConfig = {
      jiraProject: 'DAPM',
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

    const { client, mocks } = createMockJiraClient(['DAPM-2499', 'DAPM-2516']);

    const summary = await pushSprintToJira(
      config,
      client,
      sandbox.path,
      { sprintName: 'APMR-APP-2026W17', dryRun: false },
    );

    expect(summary.added).toBe(0);
    expect(summary.removed).toBe(0);
    expect(summary.unchanged).toBe(2);
    expect(summary.errors).toBe(0);
    expect(mocks.moveIssuesToSprint).not.toHaveBeenCalled();
    expect(mocks.moveIssuesToBacklog).not.toHaveBeenCalled();
  });

  it('should show planned additions and removals in dry-run mode', async () => {
    const sprintContent = `---
documentType: sprint
sprintId: "APMR-APP-2026W17"
---
# Sprint

- [DAPM-2499](../tickets/2499-test.md) - Test story
- [DAPM-3001](../tickets/3001-test.md) - New ticket
`;
    await fs.ensureDir(path.join(sandbox.path, 'backlog/sprints'));
    await fs.writeFile(
      path.join(sandbox.path, 'backlog/sprints/APMR-APP-2026W17.md'),
      sprintContent,
    );

    const config: BacklogConfig = {
      jiraProject: 'DAPM',
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

    // Jira has DAPM-2499 (stays) and DAPM-8888 (stale, should be removed in dry-run)
    const { client, mocks } = createMockJiraClient(['DAPM-2499', 'DAPM-8888']);
    const progressMessages: string[] = [];

    const summary = await pushSprintToJira(
      config,
      client,
      sandbox.path,
      {
        sprintName: 'APMR-APP-2026W17',
        dryRun: true,
        onProgress: (msg) => progressMessages.push(msg),
      },
    );

    expect(summary.added).toBe(1);
    expect(summary.removed).toBe(1);
    expect(summary.unchanged).toBe(1);
    expect(mocks.moveIssuesToSprint).not.toHaveBeenCalled();
    expect(mocks.moveIssuesToBacklog).not.toHaveBeenCalled();
    // Verify progress messages include planned changes
    expect(progressMessages.some((m) => m.includes('[DRY RUN] Would add'))).toBe(true);
    expect(progressMessages.some((m) => m.includes('[DRY RUN] Would remove'))).toBe(true);
  });
});
