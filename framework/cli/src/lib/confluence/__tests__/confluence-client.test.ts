import axios, { AxiosError } from 'axios';
import { ConfluenceClient, ConfluenceClientConfig, ConfluencePage, AdfDocument } from '../confluence-client';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ConfluenceClient', () => {
  let mockAxiosInstance: any;
  let client: ConfluenceClient;

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
      const config: ConfluenceClientConfig = {
        baseUrl: 'https://example.atlassian.net/wiki',
        email: 'user@example.com',
        apiToken: 'test-token',
      };

      const client = new ConfluenceClient(config);
      expect(client).toBeDefined();
    });

    it('should strip trailing slash from base URL', () => {
      const config: ConfluenceClientConfig = {
        baseUrl: 'https://example.atlassian.net/wiki/',
        email: 'user@example.com',
        apiToken: 'test-token',
      };

      new ConfluenceClient(config);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://example.atlassian.net/wiki/api/v2',
        })
      );
    });

    it('should configure Basic Auth header', () => {
      const config: ConfluenceClientConfig = {
        baseUrl: 'https://example.atlassian.net/wiki',
        email: 'user@example.com',
        apiToken: 'test-token',
      };

      new ConfluenceClient(config);

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
      const config: ConfluenceClientConfig = {
        baseUrl: 'https://example.atlassian.net/wiki',
        email: 'user@example.com',
        apiToken: 'test-token',
      };

      new ConfluenceClient(config);

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        })
      );
    });

    it('should throw error if base URL is missing', () => {
      const config = {
        email: 'user@example.com',
        apiToken: 'test-token',
      } as ConfluenceClientConfig;

      expect(() => new ConfluenceClient(config)).toThrow('ConfluenceClientConfig: baseUrl is required');
    });

    it('should throw error if email is missing', () => {
      const config = {
        baseUrl: 'https://example.atlassian.net/wiki',
        apiToken: 'test-token',
      } as ConfluenceClientConfig;

      expect(() => new ConfluenceClient(config)).toThrow('ConfluenceClientConfig: email is required');
    });

    it('should throw error if API token is missing', () => {
      const config = {
        baseUrl: 'https://example.atlassian.net/wiki',
        email: 'user@example.com',
      } as ConfluenceClientConfig;

      expect(() => new ConfluenceClient(config)).toThrow('ConfluenceClientConfig: apiToken is required');
    });
  });

  describe('createPage', () => {
    beforeEach(() => {
      const config: ConfluenceClientConfig = {
        baseUrl: 'https://example.atlassian.net/wiki',
        email: 'user@example.com',
        apiToken: 'test-token',
      };
      client = new ConfluenceClient(config);
    });

    it('should create page in space and return page ID', async () => {
      const spaceKey = 'TEST';
      const title = 'Test Page';
      const content: AdfDocument = {
        version: 1,
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello World' }],
          },
        ],
      };

      const mockSpaceResponse = {
        results: [{ id: '123456', key: 'TEST', name: 'Test Space' }],
      };

      const mockCreateResponse = {
        id: '987654',
        title: 'Test Page',
        spaceId: '123456',
        version: { number: 1 },
        _links: { webui: '/spaces/TEST/pages/987654/Test+Page' },
      };

      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockSpaceResponse });
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockCreateResponse, status: 200 });

      const pageId = await client.createPage(spaceKey, title, content);

      expect(pageId).toBe('987654');

      // Verify space lookup call
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/spaces',
        { params: { keys: 'TEST' } }
      );

      // Verify page creation call
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/pages',
        {
          spaceId: '123456',
          status: 'current',
          title: 'Test Page',
          body: {
            representation: 'atlas_doc_format',
            value: JSON.stringify(content),
          },
        },
        {}
      );
    });

    it('should create page with parent ID', async () => {
      const spaceKey = 'TEST';
      const title = 'Child Page';
      const content: AdfDocument = {
        version: 1,
        type: 'doc',
        content: [],
      };
      const parentId = '111222';

      const mockSpaceResponse = {
        results: [{ id: '123456', key: 'TEST' }],
      };

      const mockCreateResponse = {
        id: '987655',
        title: 'Child Page',
        parentId: '111222',
        version: { number: 1 },
        _links: { webui: '/spaces/TEST/pages/987655' },
      };

      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockSpaceResponse });
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockCreateResponse, status: 200 });

      const pageId = await client.createPage(spaceKey, title, content, parentId);

      expect(pageId).toBe('987655');

      // Verify parent ID was included in payload
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/pages',
        expect.objectContaining({
          parentId: '111222',
        }),
        {}
      );
    });

    it('should handle space not found error', async () => {
      const spaceKey = 'NOTFOUND';
      const title = 'Test Page';
      const content: AdfDocument = { version: 1, type: 'doc', content: [] };

      const mockSpaceResponse = {
        results: [],
      };

      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockSpaceResponse });

      await expect(client.createPage(spaceKey, title, content)).rejects.toThrow('Space not found: NOTFOUND');
    });

    it('should handle unauthorized errors (401)', async () => {
      const spaceKey = 'TEST';
      const title = 'Test Page';
      const content: AdfDocument = { version: 1, type: 'doc', content: [] };

      const error = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { message: 'Authentication failed' },
        },
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.createPage(spaceKey, title, content)).rejects.toThrow();
    });

    it('should handle validation errors (400)', async () => {
      const spaceKey = 'TEST';
      const title = '';
      const content: AdfDocument = { version: 1, type: 'doc', content: [] };

      const mockSpaceResponse = {
        results: [{ id: '123456', key: 'TEST' }],
      };

      const error = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: {
            message: 'Title is required',
          },
        },
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockSpaceResponse });
      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(client.createPage(spaceKey, title, content)).rejects.toThrow();
    });
  });

  describe('updatePage', () => {
    beforeEach(() => {
      const config: ConfluenceClientConfig = {
        baseUrl: 'https://example.atlassian.net/wiki',
        email: 'user@example.com',
        apiToken: 'test-token',
      };
      client = new ConfluenceClient(config);
    });

    it('should update existing page', async () => {
      const pageId = '987654';
      const title = 'Updated Title';
      const content: AdfDocument = {
        version: 1,
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Updated content' }] }],
      };
      const version = 2;

      const mockUpdateResponse = {
        id: '987654',
        title: 'Updated Title',
        version: { number: 3 },
      };

      mockAxiosInstance.put.mockResolvedValueOnce({ data: mockUpdateResponse, status: 200 });

      await client.updatePage(pageId, title, content, version);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/pages/987654',
        {
          id: '987654',
          status: 'current',
          title: 'Updated Title',
          body: {
            representation: 'atlas_doc_format',
            value: JSON.stringify(content),
          },
          version: {
            number: 2,
          },
        },
        {}
      );
    });

    it('should handle not found errors (404)', async () => {
      const pageId = '999999';
      const title = 'Updated Title';
      const content: AdfDocument = { version: 1, type: 'doc', content: [] };
      const version = 1;

      const error = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { message: 'Page not found' },
        },
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.put.mockRejectedValue(error);

      await expect(client.updatePage(pageId, title, content, version)).rejects.toThrow();
    });

    it('should handle version conflict errors (409)', async () => {
      const pageId = '987654';
      const title = 'Updated Title';
      const content: AdfDocument = { version: 1, type: 'doc', content: [] };
      const version = 1;

      const error = {
        response: {
          status: 409,
          statusText: 'Conflict',
          data: { message: 'Version conflict - page has been updated by another user' },
        },
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.put.mockRejectedValue(error);

      await expect(client.updatePage(pageId, title, content, version)).rejects.toThrow();
    });
  });

  describe('getPage', () => {
    beforeEach(() => {
      const config: ConfluenceClientConfig = {
        baseUrl: 'https://example.atlassian.net/wiki',
        email: 'user@example.com',
        apiToken: 'test-token',
      };
      client = new ConfluenceClient(config);
    });

    it('should fetch page by ID', async () => {
      const pageId = '987654';
      const mockPage = {
        id: '987654',
        title: 'Test Page',
        spaceId: '123456',
        status: 'current',
        version: { number: 5 },
        body: {
          atlas_doc_format: {
            representation: 'atlas_doc_format',
            value: '{"version":1,"type":"doc","content":[]}',
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockPage });

      const result = await client.getPage(pageId);

      expect(result).toEqual(mockPage);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/pages/987654',
        { params: { 'body-format': 'atlas_doc_format' } }
      );
    });

    it('should handle not found errors (404)', async () => {
      const pageId = '999999';

      const error = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { message: 'Page not found' },
        },
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.getPage(pageId)).rejects.toThrow();
    });
  });

  describe('getPageByTitle', () => {
    beforeEach(() => {
      const config: ConfluenceClientConfig = {
        baseUrl: 'https://example.atlassian.net/wiki',
        email: 'user@example.com',
        apiToken: 'test-token',
      };
      client = new ConfluenceClient(config);
    });

    it('should fetch page by title and space', async () => {
      const spaceKey = 'TEST';
      const title = 'Test Page';

      const mockSearchResponse = {
        results: [
          {
            id: '987654',
            title: 'Test Page',
            spaceId: '123456',
            status: 'current',
            version: { number: 3 },
          },
        ],
      };

      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockSearchResponse });

      const result = await client.getPageByTitle(spaceKey, title);

      expect(result).toEqual(mockSearchResponse.results[0]);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/pages',
        {
          params: {
            spaceKey: 'TEST',
            title: 'Test Page',
            'body-format': 'atlas_doc_format',
          },
        }
      );
    });

    it('should return null when page not found', async () => {
      const spaceKey = 'TEST';
      const title = 'Nonexistent Page';

      const mockSearchResponse = {
        results: [],
      };

      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockSearchResponse });

      const result = await client.getPageByTitle(spaceKey, title);

      expect(result).toBeNull();
    });

    it('should handle unauthorized errors (401)', async () => {
      const spaceKey = 'TEST';
      const title = 'Test Page';

      const error = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { message: 'Authentication failed' },
        },
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.getPageByTitle(spaceKey, title)).rejects.toThrow();
    });
  });

  describe('searchPages', () => {
    beforeEach(() => {
      const config: ConfluenceClientConfig = {
        baseUrl: 'https://example.atlassian.net/wiki',
        email: 'user@example.com',
        apiToken: 'test-token',
      };
      client = new ConfluenceClient(config);
    });

    it('should search pages with CQL', async () => {
      const cql = 'space = TEST AND type = page';
      const mockResults = {
        results: [
          {
            id: '987654',
            title: 'Page 1',
            spaceId: '123456',
            status: 'current',
          },
          {
            id: '987655',
            title: 'Page 2',
            spaceId: '123456',
            status: 'current',
          },
        ],
      };

      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResults });

      const result = await client.searchPages(cql);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Page 1');
      expect(result[1].title).toBe('Page 2');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/pages',
        {
          params: {
            cql,
            'body-format': 'atlas_doc_format',
          },
        }
      );
    });

    it('should return empty array when no results found', async () => {
      const cql = 'space = EMPTY';
      const mockResults = {
        results: [],
      };

      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResults });

      const result = await client.searchPages(cql);

      expect(result).toEqual([]);
    });

    it('should handle invalid CQL errors', async () => {
      const cql = 'invalid cql syntax';

      const error = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { message: 'Invalid CQL query' },
        },
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.searchPages(cql)).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      const config: ConfluenceClientConfig = {
        baseUrl: 'https://example.atlassian.net/wiki',
        email: 'user@example.com',
        apiToken: 'test-token',
      };
      client = new ConfluenceClient(config);
    });

    it('should handle network errors', async () => {
      const error = {
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND example.atlassian.net',
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.getPage('123')).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.getPage('123')).rejects.toThrow();
    });

    it('should handle server errors (500)', async () => {
      const error = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { message: 'Internal server error' },
        },
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.getPage('123')).rejects.toThrow();
    });
  });
});
