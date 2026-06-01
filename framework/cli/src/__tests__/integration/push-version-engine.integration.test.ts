import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import fs from 'fs-extra';
import { createSandbox, TestSandbox } from '../../lib/__tests__/test-utils/sandbox.js';
import { pushVersionToJira, PushVersionSummary } from '../../lib/backlog/push-version-engine.js';
import { BacklogConfig } from '../../lib/backlog/config-loader.js';
import { JiraClient, JiraVersion } from '../../lib/jira/jira-client.js';

function createMockJiraClient() {
  const mocks = {
    getProjectVersions: jest.fn<() => Promise<JiraVersion[]>>().mockResolvedValue([
      { id: '10001', name: 'APM-R: App #3 Milestone 2026 (W15, W17, W19)', released: false },
    ]),
    updateIssue: jest.fn<(key: string, fields: Record<string, unknown>) => Promise<void>>()
      .mockResolvedValue(undefined),
  };
  return { client: mocks as unknown as JiraClient, mocks };
}

describe('pushVersionToJira', () => {
  let sandbox: TestSandbox;

  beforeEach(async () => {
    sandbox = await createSandbox('push-version');
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  it('should update fixVersion on all tickets in milestone file', async () => {
    // Create milestone file
    const milestoneContent = `---
documentType: milestone
milestone: "APM-R: App #3 Milestone 2026 (W15, W17, W19)"
ticketCount: 2
---
# Milestone

## All Tickets

### Stories

- [DAPM-2499](../tickets/2499-test.md) - Test story 1
- [DAPM-2516](../tickets/2516-test.md) - Test story 2
`;
    await fs.ensureDir(path.join(sandbox.path, 'backlog/milestones'));
    await fs.writeFile(
      path.join(sandbox.path, 'backlog/milestones/test-milestone.md'),
      milestoneContent,
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

    const { client, mocks } = createMockJiraClient();

    const summary = await pushVersionToJira(
      config,
      client,
      sandbox.path,
      { milestoneName: 'APM-R: App #3 Milestone 2026 (W15, W17, W19)', dryRun: false },
    );

    expect(summary.pushed).toBe(2);
    expect(mocks.updateIssue).toHaveBeenCalledTimes(2);
    expect(mocks.updateIssue).toHaveBeenCalledWith(
      'DAPM-2499',
      { fixVersions: [{ id: '10001' }] },
    );
    expect(mocks.updateIssue).toHaveBeenCalledWith(
      'DAPM-2516',
      { fixVersions: [{ id: '10001' }] },
    );
  });

  it('should support dry-run mode', async () => {
    const milestoneContent = `---
documentType: milestone
milestone: "APM-R: App #3 Milestone 2026 (W15, W17, W19)"
---
# Milestone

### Stories

- [DAPM-2499](../tickets/2499-test.md) - Test story
`;
    await fs.ensureDir(path.join(sandbox.path, 'backlog/milestones'));
    await fs.writeFile(
      path.join(sandbox.path, 'backlog/milestones/test.md'),
      milestoneContent,
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

    const { client, mocks } = createMockJiraClient();

    const summary = await pushVersionToJira(
      config,
      client,
      sandbox.path,
      { milestoneName: 'APM-R: App #3 Milestone 2026 (W15, W17, W19)', dryRun: true },
    );

    expect(summary.pushed).toBe(1);
    expect(mocks.updateIssue).not.toHaveBeenCalled();
  });
});
