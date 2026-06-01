import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

/**
 * Confluence client configuration
 */
export interface ConfluenceClientConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

/**
 * Atlassian Document Format (ADF) document structure
 */
export interface AdfDocument {
  version: number;
  type: string;
  content: unknown[];
}

/**
 * Confluence page representation
 */
export interface ConfluencePage {
  id: string;
  title: string;
  spaceId: string;
  status: string;
  parentId?: string;
  version: {
    number: number;
  };
  body?: {
    atlas_doc_format?: {
      representation: string;
      value: string;
    };
  };
  _links?: {
    webui: string;
  };
  [key: string]: unknown;
}

/**
 * Custom Confluence API error class
 */
export class ConfluenceApiError extends Error {
  public status?: number;
  public statusText?: string;
  public data?: unknown;

  constructor(message: string, status?: number, statusText?: string, data?: unknown) {
    super(message);
    this.name = 'ConfluenceApiError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

/**
 * Confluence API client for interacting with Confluence REST API v2
 *
 * Features:
 * - Basic Authentication with email and API token
 * - CRUD operations on pages
 * - CQL search support
 * - Error handling for 401, 404, 400, 409, and 500 errors
 */
export class ConfluenceClient {
  private axiosInstance: AxiosInstance;
  private config: ConfluenceClientConfig;

  constructor(config: ConfluenceClientConfig) {
    // Validate required config
    if (!config.baseUrl) {
      throw new Error('ConfluenceClientConfig: baseUrl is required');
    }
    if (!config.email) {
      throw new Error('ConfluenceClientConfig: email is required');
    }
    if (!config.apiToken) {
      throw new Error('ConfluenceClientConfig: apiToken is required');
    }

    this.config = {
      ...config,
      baseUrl: config.baseUrl.replace(/\/$/, ''), // Strip trailing slash
    };

    // Create axios instance with Confluence-specific configuration
    const axiosConfig: AxiosRequestConfig = {
      baseURL: `${this.config.baseUrl}/api/v2`,
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
   * Handle API errors and convert to ConfluenceApiError
   */
  private handleError(error: unknown): never {
    const isAxiosLike =
      axios.isAxiosError(error) ||
      (typeof error === 'object' && error !== null && 'isAxiosError' in error && error.isAxiosError === true);

    if (isAxiosLike) {
      const axiosError = error as AxiosError;

      // Handle timeout errors
      if (axiosError.code === 'ECONNABORTED') {
        throw new ConfluenceApiError('Request timeout');
      }

      // Handle network errors
      if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
        throw new ConfluenceApiError('Network error');
      }

      // Handle response errors
      if (axiosError.response) {
        const { status, statusText, data } = axiosError.response;
        let message = statusText || 'Request failed';

        // Extract error message from Confluence response
        if (data && typeof data === 'object' && data !== null && 'message' in data) {
          const dataMessage = (data as { message?: unknown }).message;
          if (typeof dataMessage === 'string') {
            message = dataMessage;
          }
        }

        throw new ConfluenceApiError(message, status, statusText, data);
      }

      // Handle request errors
      throw new ConfluenceApiError(axiosError.message);
    }

    // Handle non-axios errors
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    throw new ConfluenceApiError(errorMessage);
  }

  /**
   * Get space ID from space key
   *
   * @param spaceKey - Space key (e.g., "TEST")
   * @returns Space ID
   * @throws ConfluenceApiError if space not found
   */
  private async getSpaceId(spaceKey: string): Promise<string> {
    try {
      const response = await this.axiosInstance.get('/spaces', {
        params: { keys: spaceKey },
      });

      if (!response.data.results || response.data.results.length === 0) {
        throw new Error(`Space not found: ${spaceKey}`);
      }

      return response.data.results[0].id;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Create a new Confluence page
   *
   * @param spaceKey - Space key (e.g., "TEST")
   * @param title - Page title
   * @param content - Page content in ADF format
   * @param parentId - Optional parent page ID
   * @returns Page ID of created page
   * @throws ConfluenceApiError on failure
   */
  async createPage(
    spaceKey: string,
    title: string,
    content: AdfDocument,
    parentId?: string
  ): Promise<string> {
    try {
      // Get space ID from space key
      const spaceId = await this.getSpaceId(spaceKey);

      // Build request payload
      const payload: {
        spaceId: string;
        status: string;
        title: string;
        body: {
          representation: string;
          value: string;
        };
        parentId?: string;
      } = {
        spaceId,
        status: 'current',
        title,
        body: {
          representation: 'atlas_doc_format',
          value: JSON.stringify(content),
        },
      };

      // Add parent ID if specified
      if (parentId) {
        payload.parentId = parentId;
      }

      // Create page
      const response = await this.axiosInstance.post('/pages', payload, {});

      return response.data.id;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Update an existing Confluence page
   *
   * @param pageId - Page ID
   * @param title - Updated page title
   * @param content - Updated page content in ADF format
   * @param version - Current version number (for optimistic locking)
   * @throws ConfluenceApiError on failure
   */
  async updatePage(
    pageId: string,
    title: string,
    content: AdfDocument,
    version: number
  ): Promise<void> {
    try {
      const payload = {
        id: pageId,
        status: 'current',
        title,
        body: {
          representation: 'atlas_doc_format',
          value: JSON.stringify(content),
        },
        version: {
          number: version,
        },
      };

      await this.axiosInstance.put(`/pages/${pageId}`, payload, {});
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Get a Confluence page by ID
   *
   * @param pageId - Page ID
   * @returns Confluence page object
   * @throws ConfluenceApiError on failure
   */
  async getPage(pageId: string): Promise<ConfluencePage> {
    try {
      const response = await this.axiosInstance.get<ConfluencePage>(`/pages/${pageId}`, {
        params: {
          'body-format': 'atlas_doc_format',
        },
      });

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Get a Confluence page by title and space
   *
   * @param spaceKey - Space key (e.g., "TEST")
   * @param title - Page title
   * @returns Confluence page object or null if not found
   * @throws ConfluenceApiError on failure
   */
  async getPageByTitle(spaceKey: string, title: string): Promise<ConfluencePage | null> {
    try {
      const response = await this.axiosInstance.get('/pages', {
        params: {
          spaceKey,
          title,
          'body-format': 'atlas_doc_format',
        },
      });

      if (!response.data.results || response.data.results.length === 0) {
        return null;
      }

      return response.data.results[0];
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Search for Confluence pages using CQL (Confluence Query Language)
   *
   * @param cql - CQL query string (e.g., 'space = TEST AND type = page')
   * @returns Array of matching Confluence pages
   * @throws ConfluenceApiError on failure
   */
  async searchPages(cql: string): Promise<ConfluencePage[]> {
    try {
      const response = await this.axiosInstance.get('/pages', {
        params: {
          cql,
          'body-format': 'atlas_doc_format',
        },
      });

      return response.data.results || [];
    } catch (error) {
      this.handleError(error);
    }
  }
}
