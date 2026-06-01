import axios, { AxiosError } from 'axios';
import { JiraClient, JiraClientConfig, JiraIssue, JiraSearchResults } from '../jira-client';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('JiraClient', () => {
  let mockAxiosInstance: any;
  let client: JiraClient;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create a mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      defaults: {
        headers: {
          common: {},
        },
      },
    };

    // Mock axios.create to return our mock instance
    mockedAxios.create = jest.fn(() => mockAxiosInstance);
  });

  describe('constructor', () => {
    it('should create client with valid config', () => {
      const config: JiraClientConfig = {
        baseUrl: 'https://example.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
      };

      const client = new JiraClient(config);
      expect(client).toBeDefined();
    });

    it('should strip trailing slash from base URL', () => {
      const config: JiraClientConfig = {
        baseUrl: 'https://example.atlassian.net/',
        email: 'user@example.com',
        apiToken: 'test-token',
      };

      new JiraClient(config);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://example.atlassian.net',
        })
      );
    });

    it('should configure Basic Auth header', () => {
      const config: JiraClientConfig = {
        baseUrl: 'https://example.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
      };

      new JiraClient(config);

      // Basic Auth should be configured with email:apiToken
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: {
            username: 'user@example.com',
            password: 'test-token',
          },
        })
      );
    });

    it('should set default headers for JSON', () => {
      const config: JiraClientConfig = {
        baseUrl: 'https://example.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
      };

      new JiraClient(config);

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        })
      );
    });

    it('should use custom delay if provided', () => {
      const config: JiraClientConfig = {
        baseUrl: 'https://example.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
        delayMs: 500,
      };

      const client = new JiraClient(config);
      expect(client).toBeDefined();
    });

    it('should throw error if base URL is missing', () => {
      const config = {
        email: 'user@example.com',
        apiToken: 'test-token',
      } as JiraClientConfig;

      expect(() => new JiraClient(config)).toThrow();
    });

    it('should throw error if email is missing', () => {
      const config = {
        baseUrl: 'https://example.atlassian.net',
        apiToken: 'test-token',
      } as JiraClientConfig;

      expect(() => new JiraClient(config)).toThrow();
    });

    it('should throw error if API token is missing', () => {
      const config = {
        baseUrl: 'https://example.atlassian.net',
        email: 'user@example.com',
      } as JiraClientConfig;

      expect(() => new JiraClient(config)).toThrow();
    });
  });

  describe('createIssue', () => {
    beforeEach(() => {
      const config: JiraClientConfig = {
        baseUrl: 'https://example.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
      };
      client = new JiraClient(config);
    });

    it('should create issue and return key', async () => {
      const fields = {
        project: { key: 'PROJ' },
        summary: 'Test issue',
        description: 'Test description',
        issuetype: { name: 'Task' },
      };

      const mockResponse = {
        key: 'PROJ-123',
        id: '10001',
        self: 'https://example.atlassian.net/rest/api/2/issue/10001',
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse, status: 201 });

      const issueKey = await client.createIssue(fields);

      expect(issueKey).toBe('PROJ-123');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/rest/api/2/issue',
        { fields },
        {}
      );
    });

    it('should handle validation errors (400)', async () => {
      const fields = {
        project: { key: 'PROJ' },
        summary: '',
        issuetype: { name: 'Task' },
      };

      const error = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: {
            errorMessages: ['Summary is required'],
            errors: {},
          },
        },
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(client.createIssue(fields)).rejects.toThrow();
    });

    it('should handle unauthorized errors (401)', async () => {
      const fields = {
        project: { key: 'PROJ' },
        summary: 'Test',
        issuetype: { name: 'Task' },
      };

      const error = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { message: 'Authentication failed' },
        },
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(client.createIssue(fields)).rejects.toThrow();
    });

    it('should apply rate limiting delay between requests', async () => {
      const config: JiraClientConfig = {
        baseUrl: 'https://example.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
        delayMs: 100,
      };
      client = new JiraClient(config);

      const fields = {
        project: { key: 'PROJ' },
        summary: 'Test',
        issuetype: { name: 'Task' },
      };

      const mockResponse = {
        key: 'PROJ-123',
        id: '10001',
        self: 'https://example.atlassian.net/rest/api/2/issue/10001',
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse, status: 201 });

      jest.spyOn(global, 'setTimeout');

      // First request - no delay (no previous request)
      await client.createIssue(fields);
      expect(setTimeout).toHaveBeenCalledTimes(0);

      // Second request - should delay
      await client.createIssue(fields);
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), expect.any(Number));
    });
  });

  describe('updateIssue', () => {
    beforeEach(() => {
      const config: JiraClientConfig = {
        baseUrl: 'https://example.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
      };
      client = new JiraClient(config);
    });

    it('should update existing issue', async () => {
      const issueKey = 'PROJ-123';
      const fields = {
        summary: 'Updated summary',
        description: 'Updated description',
      };

      mockAxiosInstance.put.mockResolvedValue({ status: 204 });

      await client.updateIssue(issueKey, fields);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/rest/api/2/issue/PROJ-123',
        { fields },
        {}
      );
    });

    it('should handle not found errors (404)', async () => {
      const issueKey = 'PROJ-999';
      const fields = { summary: 'Updated' };

      const error = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { errorMessages: ['Issue does not exist'] },
        },
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.put.mockRejectedValue(error);

      await expect(client.updateIssue(issueKey, fields)).rejects.toThrow();
    });

    it('should handle immutable field errors', async () => {
      const issueKey = 'PROJ-123';
      const fields = {
        project: { key: 'OTHER' }, // Immutable field
      };

      const error = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: {
            errorMessages: [],
            errors: { project: 'Field cannot be changed' },
          },
        },
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.put.mockRejectedValue(error);

      await expect(client.updateIssue(issueKey, fields)).rejects.toThrow();
    });
  });

  describe('getIssue', () => {
    beforeEach(() => {
      const config: JiraClientConfig = {
        baseUrl: 'https://example.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
      };
      client = new JiraClient(config);
    });

    it('should fetch issue by key', async () => {
      const issueKey = 'PROJ-123';
      const mockIssue = {
        key: 'PROJ-123',
        id: '10001',
        fields: {
          summary: 'Test issue',
          description: 'Test description',
          status: { name: 'To Do' },
        },
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockIssue });

      const result = await client.getIssue(issueKey);

      expect(result).toEqual(mockIssue);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/rest/api/2/issue/PROJ-123',
        { params: {} }
      );
    });

    it('should expand requested fields', async () => {
      const issueKey = 'PROJ-123';
      const expand = ['changelog', 'renderedFields'];
      const mockIssue = {
        key: 'PROJ-123',
        fields: { summary: 'Test' },
        changelog: { histories: [] },
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockIssue });

      await client.getIssue(issueKey, expand);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/rest/api/2/issue/PROJ-123',
        { params: { expand: 'changelog,renderedFields' } }
      );
    });

    it('should handle not found errors (404)', async () => {
      const issueKey = 'PROJ-999';

      const error = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { errorMessages: ['Issue does not exist'] },
        },
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.getIssue(issueKey)).rejects.toThrow();
    });
  });

  describe('searchIssues', () => {
    beforeEach(() => {
      const config: JiraClientConfig = {
        baseUrl: 'https://example.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
      };
      client = new JiraClient(config);
    });

    it('should search issues with JQL', async () => {
      const jql = 'project = PROJ AND status = "To Do"';
      const mockResults = {
        issues: [
          {
            key: 'PROJ-123',
            fields: { summary: 'Issue 1' },
          },
          {
            key: 'PROJ-124',
            fields: { summary: 'Issue 2' },
          },
        ],
        startAt: 0,
        maxResults: 50,
        total: 2,
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResults });

      const result = await client.searchIssues(jql);

      expect(result.issues).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/rest/api/3/search/jql',
        { jql, maxResults: 50 },
        {}
      );
    });

    it('should support cursor-based pagination with nextPageToken', async () => {
      const jql = 'project = PROJ';
      const token = 'cursor-token-abc';
      const mockResults = {
        issues: [],
        startAt: 0,
        maxResults: 50,
        total: 100,
        nextPageToken: 'cursor-token-next',
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResults });

      await client.searchIssues(jql, 50, undefined, token);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/rest/api/3/search/jql',
        { jql, maxResults: 50, nextPageToken: token },
        {}
      );
    });

    it('should support custom maxResults', async () => {
      const jql = 'project = PROJ';
      const mockResults = {
        issues: [],
        startAt: 0,
        maxResults: 100,
        total: 200,
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResults });

      await client.searchIssues(jql, 100);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/rest/api/3/search/jql',
        { jql, maxResults: 100 },
        {}
      );
    });

    it('should support field filtering', async () => {
      const jql = 'project = PROJ';
      const fields = ['summary', 'status', 'assignee'];
      const mockResults = {
        issues: [{ key: 'PROJ-123', fields: { summary: 'Test' } }],
        startAt: 0,
        maxResults: 50,
        total: 1,
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResults });

      await client.searchIssues(jql, 50, fields);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/rest/api/3/search/jql',
        { jql, maxResults: 50, fields },
        {}
      );
    });

    it('should handle invalid JQL errors', async () => {
      const jql = 'invalid jql syntax';

      const error = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { errorMessages: ['Invalid JQL query'] },
        },
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(client.searchIssues(jql)).rejects.toThrow();
    });
  });

  describe('rateLimiting', () => {
    beforeEach(() => {
      const config: JiraClientConfig = {
        baseUrl: 'https://example.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
        delayMs: 200,
      };
      client = new JiraClient(config);
    });

    it('should delay between sequential requests', async () => {
      const fields = {
        project: { key: 'PROJ' },
        summary: 'Test',
        issuetype: { name: 'Task' },
      };

      const mockResponse = {
        key: 'PROJ-123',
        id: '10001',
        self: 'https://example.atlassian.net/rest/api/2/issue/10001',
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse, status: 201 });

      jest.spyOn(global, 'setTimeout');

      // First request - no delay
      await client.createIssue(fields);
      expect(setTimeout).toHaveBeenCalledTimes(0);

      // Second request - should delay
      await client.createIssue(fields);
      expect(setTimeout).toHaveBeenCalledTimes(1);

      // Third request - should delay again
      await client.createIssue(fields);
      expect(setTimeout).toHaveBeenCalledTimes(2);
    });

    it('should handle 429 rate limit responses with retry', async () => {
      const config: JiraClientConfig = {
        baseUrl: 'https://example.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
      };
      client = new JiraClient(config);

      const issueKey = 'PROJ-123';
      const mockIssue = {
        key: 'PROJ-123',
        fields: { summary: 'Test' },
      };

      const error429 = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: { errorMessages: ['Rate limit exceeded'] },
          headers: { 'retry-after': '2' },
        },
        isAxiosError: true,
      } as AxiosError;

      // Fail first time with 429, then succeed
      mockAxiosInstance.get
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ data: mockIssue });

      jest.spyOn(global, 'setTimeout');

      const result = await client.getIssue(issueKey);

      expect(result).toEqual(mockIssue);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      // Should wait based on retry-after header (2 seconds = 2000ms)
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 2000);
    });

    it('should use default retry delay when retry-after header is missing', async () => {
      const config: JiraClientConfig = {
        baseUrl: 'https://example.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
      };
      client = new JiraClient(config);

      const issueKey = 'PROJ-123';
      const mockIssue = {
        key: 'PROJ-123',
        fields: { summary: 'Test' },
      };

      const error429 = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: { errorMessages: ['Rate limit exceeded'] },
          headers: {},
        },
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.get
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ data: mockIssue });

      jest.spyOn(global, 'setTimeout');

      await client.getIssue(issueKey);

      // Should use default 1000ms delay
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it('should fail after max retry attempts on 429', async () => {
      const config: JiraClientConfig = {
        baseUrl: 'https://example.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
      };
      client = new JiraClient(config);

      const issueKey = 'PROJ-123';

      const error429 = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: { errorMessages: ['Rate limit exceeded'] },
          headers: {},
        },
        isAxiosError: true,
      } as AxiosError;

      // Always fail with 429
      mockAxiosInstance.get.mockRejectedValue(error429);

      await expect(client.getIssue(issueKey)).rejects.toThrow();
      // Initial attempt + 3 retries = 4 total attempts
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(4);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      const config: JiraClientConfig = {
        baseUrl: 'https://example.atlassian.net',
        email: 'user@example.com',
        apiToken: 'test-token',
      };
      client = new JiraClient(config);
    });

    it('should handle network errors', async () => {
      const error = {
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND example.atlassian.net',
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.getIssue('PROJ-123')).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.getIssue('PROJ-123')).rejects.toThrow();
    });

    it('should handle server errors (500)', async () => {
      const error = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { errorMessages: ['Internal server error'] },
        },
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.getIssue('PROJ-123')).rejects.toThrow();
    });
  });
});
