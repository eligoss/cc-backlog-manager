import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

/**
 * Authentication configuration for API client
 */
export interface AuthConfig {
  type: 'basic' | 'bearer' | 'custom';
  credentials: string | { username: string; password: string };
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  perMilliseconds: number;
}

/**
 * API client configuration
 */
export interface ApiClientConfig {
  baseUrl: string;
  auth?: AuthConfig;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  rateLimit?: RateLimitConfig;
}

/**
 * Request options for individual API calls
 */
export interface RequestOptions {
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Custom API error class with structured error information
 */
export class ApiError extends Error {
  public status?: number;
  public statusText?: string;
  public data?: unknown;

  constructor(message: string, status?: number, statusText?: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

/**
 * HTTP API client with retry logic, rate limiting, and error handling
 */
export class ApiClient {
  private axiosInstance: AxiosInstance;
  private config: ApiClientConfig;
  private requestQueue: Array<() => Promise<void>> = [];
  private requestTimestamps: number[] = [];

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 30000,
      retries: 0,
      retryDelay: 1000,
      ...config,
      baseUrl: config.baseUrl.replace(/\/$/, ''), // Strip trailing slash
    };

    // Create axios instance with base configuration
    const axiosConfig: AxiosRequestConfig = {
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
    };

    // Configure basic auth if provided
    if (this.config.auth?.type === 'basic') {
      const creds = this.config.auth.credentials as { username: string; password: string };
      axiosConfig.auth = creds;
    }

    this.axiosInstance = axios.create(axiosConfig);

    // Configure bearer or custom auth headers
    if (this.config.auth?.type === 'bearer') {
      const token = this.config.auth.credentials as string;
      this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else if (this.config.auth?.type === 'custom') {
      const token = this.config.auth.credentials as string;
      this.axiosInstance.defaults.headers.common['Authorization'] = token;
    }
  }

  /**
   * Enforce rate limiting if configured
   */
  private async enforceRateLimit(): Promise<void> {
    if (!this.config.rateLimit) {
      return;
    }

    const now = Date.now();
    const { maxRequests, perMilliseconds } = this.config.rateLimit;

    // Remove timestamps outside the time window
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < perMilliseconds
    );

    // If we've hit the rate limit, wait
    if (this.requestTimestamps.length >= maxRequests) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = perMilliseconds - (now - oldestTimestamp);
      await this.sleep(waitTime);

      // Recursively check again
      return this.enforceRateLimit();
    }

    // Record this request
    this.requestTimestamps.push(now);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Handle API errors and convert to ApiError
   */
  private handleError(error: unknown): never {
    // Check if it's an axios error (or mock error with axios-like structure)
    const isAxiosLike = axios.isAxiosError(error) || (error as { isAxiosError?: boolean }).isAxiosError === true;

    if (isAxiosLike) {
      const axiosError = error as AxiosError;

      // Handle timeout errors
      if (axiosError.code === 'ECONNABORTED') {
        throw new ApiError('Request timeout');
      }

      // Handle network errors
      if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
        throw new ApiError('Network error');
      }

      // Handle response errors
      if (axiosError.response) {
        const { status, statusText, data } = axiosError.response;
        const message = (data as { message?: string })?.message || statusText || 'Request failed';
        throw new ApiError(message, status, statusText, data);
      }

      // Handle request errors
      throw new ApiError(axiosError.message);
    }

    // Handle non-axios errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new ApiError(errorMessage);
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    const isAxiosLike = axios.isAxiosError(error) || (error as { isAxiosError?: boolean }).isAxiosError === true;

    if (!isAxiosLike) {
      return false;
    }

    const axiosError = error as AxiosError;
    if (!axiosError.response) {
      return false;
    }

    const status = axiosError.response.status;

    // Retry on rate limit and server errors
    return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    attempt: number = 0
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      const shouldRetry = this.isRetryableError(error);
      const maxRetries = this.config.retries || 0;

      if (shouldRetry && attempt < maxRetries) {
        // Calculate exponential backoff delay
        const baseDelay = this.config.retryDelay || 1000;
        const delay = baseDelay * Math.pow(2, attempt);

        await this.sleep(delay);

        // Retry the request
        return this.executeWithRetry(requestFn, attempt + 1);
      }

      // No more retries or non-retryable error - convert to ApiError
      this.handleError(error);
    }
  }

  /**
   * Make GET request
   */
  async get<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    await this.enforceRateLimit();

    return this.executeWithRetry(async () => {
      const response = await this.axiosInstance.get<T>(path, {
        params: options.params,
        headers: options.headers,
        timeout: options.timeout,
      });
      return response.data;
    });
  }

  /**
   * Make POST request
   */
  async post<T = unknown>(path: string, data: unknown, options: RequestOptions = {}): Promise<T> {
    await this.enforceRateLimit();

    return this.executeWithRetry(async () => {
      const response = await this.axiosInstance.post<T>(path, data, {
        params: options.params,
        headers: options.headers,
        timeout: options.timeout,
      });
      return response.data;
    });
  }

  /**
   * Make PUT request
   */
  async put<T = unknown>(path: string, data: unknown, options: RequestOptions = {}): Promise<T> {
    await this.enforceRateLimit();

    return this.executeWithRetry(async () => {
      const response = await this.axiosInstance.put<T>(path, data, {
        params: options.params,
        headers: options.headers,
        timeout: options.timeout,
      });
      return response.data;
    });
  }

  /**
   * Make DELETE request
   */
  async delete<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    await this.enforceRateLimit();

    return this.executeWithRetry(async () => {
      const response = await this.axiosInstance.delete<T>(path, {
        params: options.params,
        headers: options.headers,
        timeout: options.timeout,
      });
      return response.data;
    });
  }
}
