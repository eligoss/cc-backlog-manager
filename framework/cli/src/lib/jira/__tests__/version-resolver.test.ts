import { describe, it, expect, jest } from '@jest/globals';
import { resolveVersionId } from '../version-resolver.js';
import { JiraClient, JiraVersion } from '../jira-client.js';

function mockClient(versions: JiraVersion[]): JiraClient {
  return {
    getProjectVersions: jest.fn<() => Promise<JiraVersion[]>>().mockResolvedValue(versions),
  } as unknown as JiraClient;
}

describe('resolveVersionId', () => {
  const versions: JiraVersion[] = [
    { id: '10001', name: 'APM-R: App #3 Milestone 2026 (W15, W17, W19)', released: false },
    { id: '10002', name: 'APM-R: App #4 Milestone 2026', released: false },
  ];

  it('should resolve exact version name to ID', async () => {
    const client = mockClient(versions);
    const id = await resolveVersionId(client, 'DAPM', 'APM-R: App #3 Milestone 2026 (W15, W17, W19)');
    expect(id).toBe('10001');
  });

  it('should resolve partial match (contains)', async () => {
    const client = mockClient(versions);
    const id = await resolveVersionId(client, 'DAPM', 'App #4');
    expect(id).toBe('10002');
  });

  it('should throw if no match found', async () => {
    const client = mockClient(versions);
    await expect(resolveVersionId(client, 'DAPM', 'Nonexistent'))
      .rejects.toThrow(/No matching version/);
  });

  it('should throw if multiple partial matches found', async () => {
    const client = mockClient(versions);
    await expect(resolveVersionId(client, 'DAPM', 'Milestone 2026'))
      .rejects.toThrow(/Multiple versions match/);
  });
});
