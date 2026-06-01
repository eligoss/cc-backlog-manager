import { describe, it, expect, jest } from '@jest/globals';
import { resolveSprintId } from '../sprint-resolver.js';
import { JiraClient, JiraBoard, JiraSprint } from '../jira-client.js';

function mockClient(boards: JiraBoard[], sprints: JiraSprint[]): JiraClient {
  return {
    getBoardsForProject: jest.fn<() => Promise<JiraBoard[]>>().mockResolvedValue(boards),
    getSprintsForBoard: jest.fn<() => Promise<JiraSprint[]>>().mockResolvedValue(sprints),
  } as unknown as JiraClient;
}

describe('resolveSprintId', () => {
  const boards: JiraBoard[] = [{ id: 42, name: 'DAPM Board', type: 'scrum' }];
  const sprints: JiraSprint[] = [
    { id: 100, name: 'APMR-APP-2026W15', state: 'active' },
    { id: 101, name: 'APMR-APP-2026W17', state: 'future' },
    { id: 102, name: 'APMR-APP-2026W19', state: 'future' },
  ];

  it('should resolve sprint name to ID', async () => {
    const client = mockClient(boards, sprints);
    const id = await resolveSprintId(client, 'DAPM', 'APMR-APP-2026W17');
    expect(id).toBe(101);
    expect(client.getBoardsForProject).toHaveBeenCalledWith('DAPM');
    expect(client.getSprintsForBoard).toHaveBeenCalledWith(42, 'active,future');
  });

  it('should resolve partial sprint name', async () => {
    const client = mockClient(boards, sprints);
    const id = await resolveSprintId(client, 'DAPM', '2026W19');
    expect(id).toBe(102);
    expect(client.getBoardsForProject).toHaveBeenCalledWith('DAPM');
    expect(client.getSprintsForBoard).toHaveBeenCalledWith(42, 'active,future');
  });

  it('should throw if no boards found', async () => {
    const client = mockClient([], sprints);
    await expect(resolveSprintId(client, 'DAPM', 'APMR-APP-2026W17'))
      .rejects.toThrow(/No boards found/);
  });

  it('should throw if sprint not found', async () => {
    const client = mockClient(boards, sprints);
    await expect(resolveSprintId(client, 'DAPM', 'NONEXISTENT'))
      .rejects.toThrow(/No matching sprint/);
  });

  it('should throw if multiple partial matches found', async () => {
    const client = mockClient(boards, sprints);
    await expect(resolveSprintId(client, 'DAPM', 'APMR-APP-2026'))
      .rejects.toThrow(/Multiple sprints match/);
  });
});
