import axios, { AxiosError } from 'axios';
import { ApiClient, ApiClientConfig, RequestOptions, ApiError } from '../api-client';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiClient', () => {
  let mockAxiosInstance: any;
  let client: ApiClient;

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
    it('should create client with base URL', () => {
      const config: ApiClientConfig = {
        baseUrl: 'https://api.example.com',
      };

      const client = new ApiClient(config);
      expect(client).toBeDefined();
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.example.com',
        })
      );
    });

    it('should strip trailing slash from base URL', () => {
      const config: ApiClientConfig = {
        baseUrl: 'https://api.example.com/',
      };

      const client = new ApiClient(config);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.example.com',
        })
      );
    });

    it('should set timeout if provided', () => {
      const config: ApiClientConfig = {
        baseUrl: 'https://api.example.com',
        timeout: 5000,
      };

      const client = new ApiClient(config);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 5000,
        })
      );
    });

    it('should use default timeout if not provided', () => {
      const config: ApiClientConfig = {
        baseUrl: 'https://api.example.com',
      };

      const client = new ApiClient(config);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 30000,
        })
      );
    });

    it('should configure basic auth', () => {
      const config: ApiClientConfig = {
        baseUrl: 'https://api.example.com',
        auth: {
          type: 'basic',
          credentials: { username: 'user', password: 'pass' },
        },
      };

      const client = new ApiClient(config);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: { username: 'user', password: 'pass' },
        })
      );
    });

    it('should configure bearer token auth', () => {
      const config: ApiClientConfig = {
        baseUrl: 'https://api.example.com',
        auth: {
          type: 'bearer',
          credentials: 'my-token',
        },
      };

      new ApiClient(config);
      expect(mockAxiosInstance.defaults.headers.common['Authorization']).toBe(
        'Bearer my-token'
      );
    });

    it('should configure custom auth header', () => {
      const config: ApiClientConfig = {
        baseUrl: 'https://api.example.com',
        auth: {
          type: 'custom',
          credentials: 'custom-token',
        },
      };

      new ApiClient(config);
      expect(mockAxiosInstance.defaults.headers.common['Authorization']).toBe(
        'custom-token'
      );
    });
  });

  describe('GET requests', () => {
    beforeEach(() => {
      const config: ApiClientConfig = {
        baseUrl: 'https://api.example.com',
      };
      client = new ApiClient(config);
    });

    it('should make successful GET request', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockAxiosInstance.get.mockResolvedValue({ data: mockData });

      const result = await client.get('/users/1');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users/1', {});
      expect(result).toEqual(mockData);
    });

    it('should pass query parameters', async () => {
      const mockData = { items: [] };
      mockAxiosInstance.get.mockResolvedValue({ data: mockData });

      const options: RequestOptions = {
        params: { page: 1, limit: 10 },
      };

      await client.get('/items', options);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/items', {
        params: { page: 1, limit: 10 },
      });
    });

    it('should handle 404 errors', async () => {
      const error = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { message: 'Resource not found' },
        },
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.get('/users/999')).rejects.toThrow(ApiError);
      await expect(client.get('/users/999')).rejects.toMatchObject({
        status: 404,
        message: 'Resource not found',
      });
    });

    it('should handle 500 errors', async () => {
      const error = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { message: 'Server error' },
        },
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.get('/items')).rejects.toThrow(ApiError);
      await expect(client.get('/items')).rejects.toMatchObject({
        status: 500,
        message: 'Server error',
      });
    });
  });

  describe('POST requests', () => {
    beforeEach(() => {
      const config: ApiClientConfig = {
        baseUrl: 'https://api.example.com',
      };
      client = new ApiClient(config);
    });

    it('should make successful POST request', async () => {
      const postData = { name: 'New User' };
      const mockResponse = { id: 1, ...postData };
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.post('/users', postData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/users', postData, {});
      expect(result).toEqual(mockResponse);
    });

    it('should handle validation errors (422)', async () => {
      const error = {
        response: {
          status: 422,
          statusText: 'Unprocessable Entity',
          data: { message: 'Validation failed', errors: ['Name is required'] },
        },
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(client.post('/users', {})).rejects.toThrow(ApiError);
      await expect(client.post('/users', {})).rejects.toMatchObject({
        status: 422,
        message: 'Validation failed',
      });
    });
  });

  describe('PUT requests', () => {
    beforeEach(() => {
      const config: ApiClientConfig = {
        baseUrl: 'https://api.example.com',
      };
      client = new ApiClient(config);
    });

    it('should make successful PUT request', async () => {
      const updateData = { name: 'Updated User' };
      const mockResponse = { id: 1, ...updateData };
      mockAxiosInstance.put.mockResolvedValue({ data: mockResponse });

      const result = await client.put('/users/1', updateData);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/users/1', updateData, {});
      expect(result).toEqual(mockResponse);
    });
  });

  describe('DELETE requests', () => {
    beforeEach(() => {
      const config: ApiClientConfig = {
        baseUrl: 'https://api.example.com',
      };
      client = new ApiClient(config);
    });

    it('should make successful DELETE request', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: { success: true } });

      const result = await client.delete('/users/1');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/users/1', {});
      expect(result).toEqual({ success: true });
    });
  });

  describe('Retry logic', () => {
    beforeEach(() => {
      const config: ApiClientConfig = {
        baseUrl: 'https://api.example.com',
        retries: 3,
        retryDelay: 100,
      };
      client = new ApiClient(config);
    });

    it('should retry on 429 (rate limit)', async () => {
      const error429 = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: { message: 'Rate limit exceeded' },
        },
        isAxiosError: true,
      } as AxiosError;

      const mockData = { id: 1 };

      // Fail twice, then succeed
      mockAxiosInstance.get
        .mockRejectedValueOnce(error429)
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ data: mockData });

      const result = await client.get('/users/1');

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockData);
    });

    it('should retry on 503 (service unavailable)', async () => {
      const error503 = {
        response: {
          status: 503,
          statusText: 'Service Unavailable',
          data: { message: 'Service temporarily unavailable' },
        },
        isAxiosError: true,
      } as AxiosError;

      const mockData = { id: 1 };

      mockAxiosInstance.get
        .mockRejectedValueOnce(error503)
        .mockResolvedValueOnce({ data: mockData });

      const result = await client.get('/users/1');

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockData);
    });

    it('should fail after max retries exceeded', async () => {
      const error503 = {
        response: {
          status: 503,
          statusText: 'Service Unavailable',
          data: { message: 'Service temporarily unavailable' },
        },
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.get.mockRejectedValue(error503);

      await expect(client.get('/users/1')).rejects.toThrow(ApiError);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should not retry on 4xx errors (except 429)', async () => {
      const error400 = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { message: 'Bad request' },
        },
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.get.mockRejectedValue(error400);

      await expect(client.get('/users')).rejects.toThrow(ApiError);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1); // No retry
    });

    it('should apply exponential backoff', async () => {
      const error503 = {
        response: {
          status: 503,
          statusText: 'Service Unavailable',
          data: { message: 'Service unavailable' },
        },
        isAxiosError: true,
      } as AxiosError;

      jest.spyOn(global, 'setTimeout');

      mockAxiosInstance.get.mockRejectedValue(error503);

      await expect(client.get('/users/1')).rejects.toThrow();

      // Check that setTimeout was called with exponential backoff
      // First retry: 100ms, Second: 200ms, Third: 400ms
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 100);
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 200);
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 400);
    });
  });

  describe('Timeout handling', () => {
    beforeEach(() => {
      const config: ApiClientConfig = {
        baseUrl: 'https://api.example.com',
        timeout: 1000,
      };
      client = new ApiClient(config);
    });

    it('should handle timeout errors', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 1000ms exceeded',
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.get.mockRejectedValue(timeoutError);

      await expect(client.get('/users')).rejects.toThrow(ApiError);
      await expect(client.get('/users')).rejects.toMatchObject({
        message: 'Request timeout',
      });
    });
  });

  describe('Network error handling', () => {
    beforeEach(() => {
      const config: ApiClientConfig = {
        baseUrl: 'https://api.example.com',
      };
      client = new ApiClient(config);
    });

    it('should handle network errors', async () => {
      const networkError = {
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND api.example.com',
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.get.mockRejectedValue(networkError);

      await expect(client.get('/users')).rejects.toThrow(ApiError);
      await expect(client.get('/users')).rejects.toMatchObject({
        message: 'Network error',
      });
    });

    it('should handle connection refused errors', async () => {
      const connectionError = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED',
        isAxiosError: true,
      } as AxiosError;

      mockAxiosInstance.get.mockRejectedValue(connectionError);

      await expect(client.get('/users')).rejects.toThrow(ApiError);
      await expect(client.get('/users')).rejects.toMatchObject({
        message: 'Network error',
      });
    });
  });

  describe('Custom headers', () => {
    beforeEach(() => {
      const config: ApiClientConfig = {
        baseUrl: 'https://api.example.com',
      };
      client = new ApiClient(config);
    });

    it('should pass custom headers in request options', async () => {
      const mockData = { id: 1 };
      mockAxiosInstance.get.mockResolvedValue({ data: mockData });

      const options: RequestOptions = {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      };

      await client.get('/users/1', options);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users/1', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });
    });
  });

  describe('Rate limiting', () => {
    beforeEach(() => {
      const config: ApiClientConfig = {
        baseUrl: 'https://api.example.com',
        rateLimit: {
          maxRequests: 2,
          perMilliseconds: 1000,
        },
      };
      client = new ApiClient(config);
    });

    it('should enforce rate limiting', async () => {
      const mockData = { id: 1 };
      mockAxiosInstance.get.mockResolvedValue({ data: mockData });

      jest.useFakeTimers();

      // Make first two requests (should succeed immediately)
      const promise1 = client.get('/users/1');
      const promise2 = client.get('/users/2');

      await Promise.all([promise1, promise2]);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);

      // Third request should be delayed
      const promise3 = client.get('/users/3');

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      await promise3;
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);

      jest.useRealTimers();
    });
  });
});
