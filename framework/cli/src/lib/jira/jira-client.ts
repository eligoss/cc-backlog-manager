import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

/**
 * Jira client configuration
 */
export interface JiraClientConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  delayMs?: number;
}

/**
 * Jira issue representation
 */
export interface JiraIssue {
  key: string;
  id?: string;
  self?: string;
  fields: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Jira search results
 */
export interface JiraSearchResults {
  issues: JiraIssue[];
  startAt: number;
  maxResults: number;
  total: number;
  nextPageToken?: string;
}

/**
 * Jira project version (fixVersion)
 */
export interface JiraVersion {
  id: string;
  name: string;
  description?: string;
  released: boolean;
  archived?: boolean;
  projectId?: number;
}

/**
 * Jira board (Agile API)
 */
export interface JiraBoard {
  id: number;
  name: string;
  type: string;
}

/**
 * Jira sprint (Agile API)
 */
export interface JiraSprint {
  id: number;
  name: string;
  state: string; // 'active' | 'future' | 'closed'
  startDate?: string;
  endDate?: string;
  boardId?: number;
}

/**
 * Custom Jira API error class
 */
export class JiraApiError extends Error {
  public status?: number;
  public statusText?: string;
  public data?: unknown;

  constructor(message: string, status?: number, statusText?: string, data?: unknown) {
    super(message);
    this.name = 'JiraApiError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

/**
 * Jira API client for interacting with Jira REST API v2
 *
 * Features:
 * - Basic Authentication with email and API token
 * - CRUD operations on issues
 * - JQL search support
 * - Rate limiting with configurable delay
 * - Automatic retry on 429 (rate limit) responses
 * - Error handling for 401, 404, 400, and 500 errors
 */
export class JiraClient {
  private axiosInstance: AxiosInstance;
  private config: JiraClientConfig;
  private lastRequestTime: number = 0;
  private readonly MAX_RETRIES = 3;
  private readonly DEFAULT_RETRY_DELAY = 1000; // 1 second

  constructor(config: JiraClientConfig) {
    // Validate required config
    if (!config.baseUrl) {
      throw new Error('JiraClientConfig: baseUrl is required');
    }
    if (!config.email) {
      throw new Error('JiraClientConfig: email is required');
    }
    if (!config.apiToken) {
      throw new Error('JiraClientConfig: apiToken is required');
    }

    this.config = {
      ...config,
      baseUrl: config.baseUrl.replace(/\/$/, ''), // Strip trailing slash
    };

    // Create axios instance with Jira-specific configuration
    const axiosConfig: AxiosRequestConfig = {
      baseURL: this.config.baseUrl,
      timeout: 30000, // 30 seconds
      auth: {
        username: this.config.email,
        password: this.config.apiToken,
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    this.axiosInstance = axios.create(axiosConfig);
  }

  /**
   * Enforce rate limiting delay between requests
   */
  private async enforceRateLimit(): Promise<void> {
    if (!this.config.delayMs || this.config.delayMs <= 0) {
      return;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.config.delayMs) {
      const waitTime = this.config.delayMs - timeSinceLastRequest;
      await this.sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Handle API errors and convert to JiraApiError
   */
  private handleError(error: unknown): never {
    const isAxiosLike = axios.isAxiosError(error) || (error as { isAxiosError?: boolean }).isAxiosError === true;

    if (isAxiosLike) {
      const axiosError = error as AxiosError;

      // Handle timeout errors
      if (axiosError.code === 'ECONNABORTED') {
        throw new JiraApiError('Request timeout');
      }

      // Handle network errors
      if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
        throw new JiraApiError('Network error');
      }

      // Handle response errors
      if (axiosError.response) {
        const { status, statusText, data } = axiosError.response;
        let message = statusText || 'Request failed';

        // Extract error message from Jira response
        if (data) {
          const errorData = data as { errorMessages?: unknown[]; message?: string };
          if (errorData.errorMessages && Array.isArray(errorData.errorMessages)) {
            message = errorData.errorMessages.join(', ');
          } else if (errorData.message) {
            message = errorData.message;
          }
        }

        throw new JiraApiError(message, status, statusText, data);
      }

      // Handle request errors
      throw new JiraApiError(axiosError.message);
    }

    // Handle non-axios errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new JiraApiError(errorMessage);
  }

  /**
   * Determine if an error is retryable (429 rate limit)
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

    // Only retry on rate limit (429)
    return status === 429;
  }

  /**
   * Get retry delay from response headers or use default
   */
  private getRetryDelay(error: unknown): number {
    const isAxiosLike = axios.isAxiosError(error) || (error as { isAxiosError?: boolean }).isAxiosError === true;

    if (isAxiosLike) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.headers) {
        const retryAfter = axiosError.response.headers['retry-after'];
        if (retryAfter) {
          const seconds = parseInt(retryAfter, 10);
          if (!isNaN(seconds)) {
            return seconds * 1000; // Convert to milliseconds
          }
        }
      }
    }

    return this.DEFAULT_RETRY_DELAY;
  }

  /**
   * Execute request with retry logic for rate limiting
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    attempt: number = 0
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      const shouldRetry = this.isRetryableError(error);

      if (shouldRetry && attempt < this.MAX_RETRIES) {
        const delay = this.getRetryDelay(error);
        await this.sleep(delay);

        // Retry the request
        return this.executeWithRetry(requestFn, attempt + 1);
      }

      // No more retries or non-retryable error
      this.handleError(error);
    }
  }

  /**
   * Create a new Jira issue
   *
   * @param fields - Issue fields (project, summary, description, issuetype, etc.)
   * @returns Issue key (e.g., "PROJ-123")
   * @throws JiraApiError on failure
   */
  async createIssue(fields: Record<string, unknown>): Promise<string> {
    await this.enforceRateLimit();

    return this.executeWithRetry(async () => {
      const response = await this.axiosInstance.post(
        '/rest/api/2/issue',
        { fields },
        {}
      );

      if (response.status !== 201) {
        throw new JiraApiError(
          `Failed to create issue: HTTP ${response.status}`,
          response.status
        );
      }

      return response.data.key;
    });
  }

  /**
   * Update an existing Jira issue
   *
   * @param issueKey - Issue key (e.g., "PROJ-123")
   * @param fields - Fields to update (summary, description, etc.)
   * @throws JiraApiError on failure
   */
  async updateIssue(issueKey: string, fields: Record<string, unknown>): Promise<void> {
    await this.enforceRateLimit();

    return this.executeWithRetry(async () => {
      const response = await this.axiosInstance.put(
        `/rest/api/2/issue/${issueKey}`,
        { fields },
        {}
      );

      if (response.status !== 200 && response.status !== 204) {
        throw new JiraApiError(
          `Failed to update issue ${issueKey}: HTTP ${response.status}`,
          response.status
        );
      }
    });
  }

  /**
   * Get a Jira issue by key
   *
   * @param issueKey - Issue key (e.g., "PROJ-123")
   * @param expand - Optional fields to expand (e.g., ["changelog", "renderedFields"])
   * @returns Jira issue object
   * @throws JiraApiError on failure
   */
  async getIssue(issueKey: string, expand?: string[]): Promise<JiraIssue> {
    await this.enforceRateLimit();

    return this.executeWithRetry(async () => {
      const params: Record<string, unknown> = {};

      if (expand && expand.length > 0) {
        params.expand = expand.join(',');
      }

      const response = await this.axiosInstance.get<JiraIssue>(
        `/rest/api/2/issue/${issueKey}`,
        { params }
      );

      return response.data;
    });
  }

  /**
   * Search for Jira issues using JQL (Jira Query Language)
   *
   * Uses the /rest/api/3/search/jql endpoint with cursor-based pagination.
   *
   * @param jql - JQL query string (e.g., 'project = PROJ AND status = "To Do"')
   * @param maxResults - Maximum results per page (default: 50)
   * @param fields - Optional list of fields to return
   * @param nextPageToken - Cursor token for pagination (from previous response)
   * @returns Search results with issues array and optional nextPageToken for next page
   * @throws JiraApiError on failure
   */
  async searchIssues(
    jql: string,
    maxResults: number = 50,
    fields?: string[],
    nextPageToken?: string
  ): Promise<JiraSearchResults> {
    await this.enforceRateLimit();

    return this.executeWithRetry(async () => {
      const payload: Record<string, unknown> = {
        jql,
        maxResults,
      };

      if (fields && fields.length > 0) {
        payload.fields = fields;
      }

      if (nextPageToken) {
        payload.nextPageToken = nextPageToken;
      }

      const response = await this.axiosInstance.post<JiraSearchResults>(
        '/rest/api/3/search/jql',
        payload,
        {}
      );

      return response.data;
    });
  }

  /**
   * Get all versions (fixVersions) for a project
   */
  async getProjectVersions(projectKey: string): Promise<JiraVersion[]> {
    await this.enforceRateLimit();
    return this.executeWithRetry(async () => {
      const response = await this.axiosInstance.get<JiraVersion[]>(
        `/rest/api/2/project/${projectKey}/versions`,
        {}
      );
      return response.data;
    });
  }

  /**
   * Get boards for a project (Agile API)
   */
  async getBoardsForProject(projectKey: string): Promise<JiraBoard[]> {
    await this.enforceRateLimit();
    return this.executeWithRetry(async () => {
      const response = await this.axiosInstance.get<{ values: JiraBoard[] }>(
        '/rest/agile/1.0/board',
        { params: { projectKeyOrId: projectKey } }
      );
      return response.data.values;
    });
  }

  /**
   * Get sprints for a board (Agile API)
   * @param state - Filter: 'active', 'future', 'closed', or comma-separated combo
   */
  async getSprintsForBoard(boardId: number, state?: string): Promise<JiraSprint[]> {
    await this.enforceRateLimit();
    return this.executeWithRetry(async () => {
      const params: Record<string, unknown> = { maxResults: 100 };
      if (state) params.state = state;
      const response = await this.axiosInstance.get<{ values: JiraSprint[] }>(
        `/rest/agile/1.0/board/${boardId}/sprint`,
        { params }
      );
      return response.data.values;
    });
  }

  /**
   * Move issues to a sprint (Agile API)
   */
  async moveIssuesToSprint(sprintId: number, issueKeys: string[]): Promise<void> {
    await this.enforceRateLimit();
    return this.executeWithRetry(async () => {
      await this.axiosInstance.post(
        `/rest/agile/1.0/sprint/${sprintId}/issue`,
        { issues: issueKeys },
        {}
      );
    });
  }

  /**
   * Get all issue keys currently in a sprint (Agile API)
   *
   * Handles pagination automatically (maxResults=50 per page).
   *
   * @param sprintId - Jira sprint ID
   * @returns Array of issue keys (e.g., ["DAPM-123", "DAPM-456"])
   * @throws JiraApiError on failure
   */
  async getSprintIssues(sprintId: number): Promise<string[]> {
    const allKeys: string[] = [];
    let startAt = 0;
    const maxResults = 50;

    while (true) {
      await this.enforceRateLimit();
      const page = await this.executeWithRetry(async () => {
        const response = await this.axiosInstance.get<{
          issues: Array<{ key: string }>;
          startAt: number;
          maxResults: number;
          total: number;
        }>(`/rest/agile/1.0/sprint/${sprintId}/issue`, {
          params: { startAt, maxResults, fields: 'key' },
        });
        return response.data;
      });

      for (const issue of page.issues) {
        allKeys.push(issue.key);
      }

      startAt += page.maxResults;
      if (startAt >= page.total) {
        break;
      }
    }

    return allKeys;
  }

  /**
   * Move issues to the backlog (remove from any sprint) via Agile API
   *
   * @param issueKeys - Array of issue keys to move to backlog
   * @throws JiraApiError on failure
   */
  async moveIssuesToBacklog(issueKeys: string[]): Promise<void> {
    if (issueKeys.length === 0) return;

    await this.enforceRateLimit();
    return this.executeWithRetry(async () => {
      await this.axiosInstance.post(
        '/rest/agile/1.0/backlog/issue',
        { issues: issueKeys },
        {}
      );
    });
  }
}
