import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import axios from 'axios';
import { JiraClient } from '../jira-client.js';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('JiraClient Agile API', () => {
  let client: JiraClient;
  let mockAxiosInstance: Record<string, jest.Mock>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      defaults: { headers: { common: {} } } as unknown as jest.Mock,
    };
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    client = new JiraClient({
      baseUrl: 'https://test.atlassian.net',
      email: 'test@test.com',
      apiToken: 'token',
    });
  });

  describe('getProjectVersions', () => {
    it('should fetch project versions', async () => {
      const versions = [
        { id: '10001', name: 'APM-R: App #3 Milestone 2026 (W15, W17, W19)', released: false },
        { id: '10002', name: 'APM-R: App #4 Milestone 2026', released: false },
      ];
      mockAxiosInstance.get.mockResolvedValue({ data: versions, status: 200 });

      const result = await client.getProjectVersions('DAPM');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/rest/api/2/project/DAPM/versions',
        expect.any(Object)
      );
      expect(result).toEqual(versions);
    });
  });

  describe('getBoardsForProject', () => {
    it('should fetch boards for project', async () => {
      const response = {
        values: [{ id: 42, name: 'DAPM Board', type: 'scrum' }],
      };
      mockAxiosInstance.get.mockResolvedValue({ data: response, status: 200 });

      const result = await client.getBoardsForProject('DAPM');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/rest/agile/1.0/board',
        expect.objectContaining({ params: { projectKeyOrId: 'DAPM' } })
      );
      expect(result).toEqual(response.values);
    });
  });

  describe('getSprintsForBoard', () => {
    it('should fetch sprints with state filter', async () => {
      const response = {
        values: [
          { id: 100, name: 'APMR-APP-2026W17', state: 'future' },
          { id: 101, name: 'APMR-APP-2026W19', state: 'future' },
        ],
      };
      mockAxiosInstance.get.mockResolvedValue({ data: response, status: 200 });

      const result = await client.getSprintsForBoard(42, 'active,future');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/rest/agile/1.0/board/42/sprint',
        expect.objectContaining({ params: { state: 'active,future', maxResults: 100 } })
      );
      expect(result).toEqual(response.values);
    });
  });

  describe('moveIssuesToSprint', () => {
    it('should move issues to sprint via Agile API', async () => {
      mockAxiosInstance.post.mockResolvedValue({ status: 204 });

      await client.moveIssuesToSprint(100, ['DAPM-2499', 'DAPM-2516']);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/rest/agile/1.0/sprint/100/issue',
        { issues: ['DAPM-2499', 'DAPM-2516'] },
        {}
      );
    });
  });

  describe('getSprintIssues', () => {
    it('should fetch all issue keys from a sprint', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          issues: [
            { key: 'DAPM-100' },
            { key: 'DAPM-200' },
            { key: 'DAPM-300' },
          ],
          startAt: 0,
          maxResults: 50,
          total: 3,
        },
        status: 200,
      });

      const result = await client.getSprintIssues(101);
      expect(result).toEqual(['DAPM-100', 'DAPM-200', 'DAPM-300']);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/rest/agile/1.0/sprint/101/issue',
        expect.objectContaining({
          params: { startAt: 0, maxResults: 50, fields: 'key' },
        }),
      );
    });

    it('should handle pagination across multiple pages', async () => {
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: {
            issues: [{ key: 'DAPM-1' }, { key: 'DAPM-2' }],
            startAt: 0,
            maxResults: 2,
            total: 5,
          },
          status: 200,
        })
        .mockResolvedValueOnce({
          data: {
            issues: [{ key: 'DAPM-3' }, { key: 'DAPM-4' }],
            startAt: 2,
            maxResults: 2,
            total: 5,
          },
          status: 200,
        })
        .mockResolvedValueOnce({
          data: {
            issues: [{ key: 'DAPM-5' }],
            startAt: 4,
            maxResults: 2,
            total: 5,
          },
          status: 200,
        });

      const result = await client.getSprintIssues(101);
      expect(result).toEqual(['DAPM-1', 'DAPM-2', 'DAPM-3', 'DAPM-4', 'DAPM-5']);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    });

    it('should return empty array for sprint with no issues', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          issues: [],
          startAt: 0,
          maxResults: 50,
          total: 0,
        },
        status: 200,
      });

      const result = await client.getSprintIssues(101);
      expect(result).toEqual([]);
    });
  });

  describe('moveIssuesToBacklog', () => {
    it('should move issues to backlog via Agile API', async () => {
      mockAxiosInstance.post.mockResolvedValue({ status: 204 });

      await client.moveIssuesToBacklog(['DAPM-100', 'DAPM-200']);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/rest/agile/1.0/backlog/issue',
        { issues: ['DAPM-100', 'DAPM-200'] },
        {}
      );
    });

    it('should not call API when given empty array', async () => {
      await client.moveIssuesToBacklog([]);
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });
  });
});
