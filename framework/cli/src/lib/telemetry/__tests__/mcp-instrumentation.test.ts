/**
 * MCP Instrumentation Tests
 * Unit tests for MCP operation instrumentation helpers
 */

import { getTelemetry } from '../telemetry-manager';
import {
  recordMCPOperation,
  withMCPTelemetry,
  recordMCPToolCall,
  recordMCPGatewayOperation,
  type TokenExtractor,
  type CostExtractor,
} from '../instrumentation/mcp-instrumentation';
import type { MCPEvent } from '../types';

// Mock telemetry manager
jest.mock('../telemetry-manager');

describe('mcp-instrumentation', () => {
  let mockTelemetry: {
    isInstrumentationEnabled: jest.Mock;
    recordEvent: jest.Mock;
  };
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTelemetry = {
      isInstrumentationEnabled: jest.fn(),
      recordEvent: jest.fn().mockResolvedValue(undefined),
    };

    (getTelemetry as jest.Mock).mockReturnValue(mockTelemetry);

    // Suppress expected console.error calls from error handling tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('recordMCPOperation', () => {
    it('should record successful MCP tool call', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordMCPOperation({
        layer: '2',
        operation_type: 'tool-call',
        server_name: 'framework',
        tool_name: 'test_tool',
        duration_ms: 100,
        success: true,
      });

      expect(mockTelemetry.isInstrumentationEnabled).toHaveBeenCalledWith('mcp');
      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(1);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent).toMatchObject({
        event_type: 'mcp',
        operation: '2.tool-call',
        layer: '2',
        operation_type: 'tool-call',
        server_name: 'framework',
        tool_name: 'test_tool',
        success: true,
        duration_ms: 100,
      });
      expect(recordedEvent.timestamp).toBeDefined();
    });

    it('should sanitize sensitive arguments (password)', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordMCPOperation({
        layer: '2',
        operation_type: 'tool-call',
        server_name: 'auth',
        tool_name: 'login',
        arguments: {
          username: 'user@example.com',
          password: 'super_secret_123',
          remember: true,
        },
        duration_ms: 50,
        success: true,
      });

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.arguments).toEqual({
        username: 'user@example.com',
        password: '[REDACTED]',
        remember: true,
      });
    });

    it('should sanitize sensitive arguments (token)', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordMCPOperation({
        layer: '3',
        operation_type: 'mcp-exec',
        server_name: 'github',
        tool_name: 'create_pr',
        arguments: {
          repo: 'test/repo',
          access_token: 'ghp_abc123',
          title: 'Test PR',
        },
        duration_ms: 200,
        success: true,
      });

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.arguments).toEqual({
        repo: 'test/repo',
        access_token: '[REDACTED]',
        title: 'Test PR',
      });
    });

    it('should sanitize sensitive arguments (apiKey)', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordMCPOperation({
        layer: '2',
        operation_type: 'tool-call',
        server_name: 'openai',
        tool_name: 'completion',
        arguments: {
          prompt: 'Test prompt',
          apiKey: 'sk-abc123',
          model: 'gpt-4',
        },
        duration_ms: 150,
        success: true,
      });

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.arguments).toEqual({
        prompt: 'Test prompt',
        apiKey: '[REDACTED]',
        model: 'gpt-4',
      });
    });

    it('should sanitize nested object arguments recursively', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordMCPOperation({
        layer: '2',
        operation_type: 'tool-call',
        server_name: 'test',
        tool_name: 'nested_call',
        arguments: {
          user: 'test',
          credentials: {
            username: 'user@example.com',
            password: 'secret123',
          },
          config: {
            apiKey: 'key_xyz789',
            endpoint: 'https://api.example.com',
          },
        },
        duration_ms: 100,
        success: true,
      });

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      // 'credentials' is a sensitive key, so entire object is redacted
      // 'config' is not sensitive, but apiKey inside it is
      expect(recordedEvent.arguments).toEqual({
        user: 'test',
        credentials: '[REDACTED]',
        config: {
          apiKey: '[REDACTED]',
          endpoint: 'https://api.example.com',
        },
      });
    });

    it('should handle case-insensitive sensitive key matching', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordMCPOperation({
        layer: '2',
        operation_type: 'tool-call',
        server_name: 'test',
        tool_name: 'test',
        arguments: {
          API_KEY: 'key1',
          ApiKey: 'key2',
          AUTHORIZATION: 'bearer xyz',
          JWT_Token: 'jwt123',
        },
        duration_ms: 50,
        success: true,
      });

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.arguments).toEqual({
        API_KEY: '[REDACTED]',
        ApiKey: '[REDACTED]',
        AUTHORIZATION: '[REDACTED]',
        JWT_Token: '[REDACTED]',
      });
    });

    it('should record token usage when provided', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordMCPOperation({
        layer: '2',
        operation_type: 'tool-call',
        server_name: 'openai',
        tool_name: 'completion',
        duration_ms: 500,
        success: true,
        token_usage: {
          input_tokens: 100,
          output_tokens: 200,
          total_tokens: 300,
        },
      });

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.token_usage).toEqual({
        input_tokens: 100,
        output_tokens: 200,
        total_tokens: 300,
      });
    });

    it('should record cost when provided', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordMCPOperation({
        layer: '2',
        operation_type: 'tool-call',
        server_name: 'openai',
        tool_name: 'completion',
        duration_ms: 500,
        success: true,
        cost_usd: 0.0042,
      });

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.cost_usd).toBe(0.0042);
    });

    it('should record error with stack trace', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const testError = new Error('Test error');
      testError.stack = 'Error stack trace here';

      await recordMCPOperation({
        layer: '2',
        operation_type: 'tool-call',
        server_name: 'test',
        tool_name: 'failing_tool',
        duration_ms: 50,
        success: false,
        error: testError,
      });

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.success).toBe(false);
      expect(recordedEvent.error).toEqual({
        message: 'Test error',
        stack: 'Error stack trace here',
      });
    });

    it('should record error without stack trace', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const testError = new Error('Simple error');

      await recordMCPOperation({
        layer: '2',
        operation_type: 'tool-call',
        server_name: 'test',
        tool_name: 'failing_tool',
        duration_ms: 50,
        success: false,
        error: testError,
      });

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.error?.message).toBe('Simple error');
      expect(recordedEvent.error?.stack).toBeDefined();
    });

    it('should not record event when instrumentation is disabled', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(false);

      await recordMCPOperation({
        layer: '2',
        operation_type: 'tool-call',
        server_name: 'test',
        tool_name: 'test',
        duration_ms: 100,
        success: true,
      });

      expect(mockTelemetry.isInstrumentationEnabled).toHaveBeenCalledWith('mcp');
      expect(mockTelemetry.recordEvent).not.toHaveBeenCalled();
    });

    it('should handle missing optional fields gracefully', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordMCPOperation({
        layer: '1',
        operation_type: 'tool-call',
        duration_ms: 100,
        success: true,
      });

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.server_name).toBeUndefined();
      expect(recordedEvent.tool_name).toBeUndefined();
      expect(recordedEvent.arguments).toBeUndefined();
      expect(recordedEvent.token_usage).toBeUndefined();
      expect(recordedEvent.cost_usd).toBeUndefined();
      expect(recordedEvent.result).toBeUndefined();
      expect(recordedEvent.error).toBeUndefined();
    });

    it('should record result metadata', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordMCPOperation({
        layer: '3',
        operation_type: 'mcp-find',
        server_name: 'MCP_DOCKER',
        duration_ms: 200,
        success: true,
        result: {
          success: true,
          items_returned: 5,
        },
      });

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.result).toEqual({
        success: true,
        items_returned: 5,
      });
    });

    it('should record result with error code', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordMCPOperation({
        layer: '2',
        operation_type: 'tool-call',
        server_name: 'test',
        tool_name: 'test',
        duration_ms: 100,
        success: false,
        result: {
          success: false,
          error_code: 'RATE_LIMIT_EXCEEDED',
        },
      });

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.result).toEqual({
        success: false,
        error_code: 'RATE_LIMIT_EXCEEDED',
      });
    });

    it('should handle all MCP layers (1, 2, 3, 3b)', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const layers: Array<'1' | '2' | '3' | '3b'> = ['1', '2', '3', '3b'];

      for (const layer of layers) {
        await recordMCPOperation({
          layer,
          operation_type: 'tool-call',
          duration_ms: 100,
          success: true,
        });
      }

      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(4);

      const events = mockTelemetry.recordEvent.mock.calls.map(call => call[0]) as Partial<MCPEvent>[];
      expect(events[0].layer).toBe('1');
      expect(events[1].layer).toBe('2');
      expect(events[2].layer).toBe('3');
      expect(events[3].layer).toBe('3b');
    });

    it('should never throw even if telemetry fails', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);
      mockTelemetry.recordEvent.mockRejectedValue(new Error('Telemetry failed'));

      // Should not throw
      await expect(
        recordMCPOperation({
          layer: '2',
          operation_type: 'tool-call',
          duration_ms: 100,
          success: true,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('withMCPTelemetry', () => {
    it('should execute function and record success with automatic timing', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const mockFn = jest.fn().mockResolvedValue({ data: 'success' });

      const result = await withMCPTelemetry(
        '2',
        'tool-call',
        'test-server',
        'test-tool',
        { arg1: 'value1' },
        mockFn
      );

      expect(result).toEqual({ data: 'success' });
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Wait for async telemetry recording
      await new Promise(resolve => setImmediate(resolve));

      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(1);
      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.success).toBe(true);
      expect(recordedEvent.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('should extract token usage via custom extractor', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const mockResult = {
        data: 'success',
        usage: {
          prompt_tokens: 100,
          completion_tokens: 200,
          total_tokens: 300,
        },
      };

      const mockFn = jest.fn().mockResolvedValue(mockResult);

      const tokenExtractor: TokenExtractor<typeof mockResult> = (result) => ({
        input_tokens: result.usage.prompt_tokens,
        output_tokens: result.usage.completion_tokens,
        total_tokens: result.usage.total_tokens,
      });

      await withMCPTelemetry(
        '2',
        'tool-call',
        'openai',
        'completion',
        {},
        mockFn,
        { tokenExtractor }
      );

      // Wait for async telemetry recording
      await new Promise(resolve => setImmediate(resolve));

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.token_usage).toEqual({
        input_tokens: 100,
        output_tokens: 200,
        total_tokens: 300,
      });
    });

    it('should extract cost via custom extractor', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const mockResult = {
        data: 'success',
        cost: 0.0042,
      };

      const mockFn = jest.fn().mockResolvedValue(mockResult);

      const costExtractor: CostExtractor<typeof mockResult> = (result) => result.cost;

      await withMCPTelemetry(
        '2',
        'tool-call',
        'openai',
        'completion',
        {},
        mockFn,
        { costExtractor }
      );

      // Wait for async telemetry recording
      await new Promise(resolve => setImmediate(resolve));

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.cost_usd).toBe(0.0042);
    });

    it('should record error on failure but still throw', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const testError = new Error('Function failed');
      const mockFn = jest.fn().mockRejectedValue(testError);

      await expect(
        withMCPTelemetry(
          '2',
          'tool-call',
          'test',
          'test',
          {},
          mockFn
        )
      ).rejects.toThrow('Function failed');

      // Wait for async telemetry recording
      await new Promise(resolve => setImmediate(resolve));

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.success).toBe(false);
      expect(recordedEvent.error).toEqual({
        message: 'Function failed',
        stack: testError.stack,
      });
    });

    it('should not extract token usage on error', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const mockFn = jest.fn().mockRejectedValue(new Error('Failed'));

      const tokenExtractor: TokenExtractor<unknown> = () => ({
        input_tokens: 100,
        output_tokens: 200,
        total_tokens: 300,
      });

      await expect(
        withMCPTelemetry(
          '2',
          'tool-call',
          'test',
          'test',
          {},
          mockFn,
          { tokenExtractor }
        )
      ).rejects.toThrow('Failed');

      // Wait for async telemetry recording
      await new Promise(resolve => setImmediate(resolve));

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.token_usage).toBeUndefined();
    });

    it('should handle non-Error exceptions', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const mockFn = jest.fn().mockRejectedValue('String error');

      await expect(
        withMCPTelemetry(
          '2',
          'tool-call',
          'test',
          'test',
          {},
          mockFn
        )
      ).rejects.toBe('String error');

      // Wait for async telemetry recording
      await new Promise(resolve => setImmediate(resolve));

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.error?.message).toBe('String error');
    });

    it('should sanitize arguments when object is provided', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const mockFn = jest.fn().mockResolvedValue({ data: 'success' });

      await withMCPTelemetry(
        '2',
        'tool-call',
        'test',
        'test',
        { username: 'user', password: 'secret' },
        mockFn
      );

      // Wait for async telemetry recording
      await new Promise(resolve => setImmediate(resolve));

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.arguments).toEqual({
        username: 'user',
        password: '[REDACTED]',
      });
    });

    it('should handle non-object arguments', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const mockFn = jest.fn().mockResolvedValue({ data: 'success' });

      await withMCPTelemetry(
        '2',
        'tool-call',
        'test',
        'test',
        'string-arg',
        mockFn
      );

      // Wait for async telemetry recording
      await new Promise(resolve => setImmediate(resolve));

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.arguments).toBeUndefined();
    });

    it('should handle array arguments', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const mockFn = jest.fn().mockResolvedValue({ data: 'success' });

      await withMCPTelemetry(
        '2',
        'tool-call',
        'test',
        'test',
        ['arg1', 'arg2'],
        mockFn
      );

      // Wait for async telemetry recording
      await new Promise(resolve => setImmediate(resolve));

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.arguments).toBeUndefined();
    });

    it('should silently ignore telemetry recording errors', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);
      mockTelemetry.recordEvent.mockRejectedValue(new Error('Telemetry failed'));

      const mockFn = jest.fn().mockResolvedValue({ data: 'success' });

      // Should not throw even if telemetry fails
      const result = await withMCPTelemetry(
        '2',
        'tool-call',
        'test',
        'test',
        {},
        mockFn
      );

      expect(result).toEqual({ data: 'success' });
    });
  });

  describe('recordMCPToolCall', () => {
    it('should record tool call correctly', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordMCPToolCall({
        layer: '2',
        server_name: 'test-server',
        tool_name: 'test-tool',
        arguments: { arg1: 'value1' },
        duration_ms: 150,
        success: true,
        items_returned: 5,
      });

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent).toMatchObject({
        event_type: 'mcp',
        operation: '2.tool-call',
        layer: '2',
        operation_type: 'tool-call',
        server_name: 'test-server',
        tool_name: 'test-tool',
        success: true,
        duration_ms: 150,
      });
      expect(recordedEvent.result).toEqual({
        success: true,
        items_returned: 5,
      });
    });

    it('should record tool call with error code', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const testError = new Error('Tool failed');

      await recordMCPToolCall({
        layer: '2',
        server_name: 'test-server',
        tool_name: 'test-tool',
        duration_ms: 50,
        success: false,
        error: testError,
        error_code: 'INTERNAL_ERROR',
      });

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.success).toBe(false);
      expect(recordedEvent.result).toEqual({
        success: false,
        error_code: 'INTERNAL_ERROR',
      });
    });
  });

  describe('recordMCPGatewayOperation', () => {
    it('should set layer to "3" for gateway operations', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordMCPGatewayOperation({
        operation_type: 'mcp-find',
        server_name: 'MCP_DOCKER',
        duration_ms: 200,
        success: true,
        items_returned: 10,
      });

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.layer).toBe('3');
      expect(recordedEvent.operation_type).toBe('mcp-find');
    });

    it('should record mcp-add operation', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordMCPGatewayOperation({
        operation_type: 'mcp-add',
        server_name: 'MCP_DOCKER',
        arguments: { server: 'github' },
        duration_ms: 1000,
        success: true,
      });

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.operation_type).toBe('mcp-add');
      expect(recordedEvent.layer).toBe('3');
    });

    it('should record mcp-exec operation', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordMCPGatewayOperation({
        operation_type: 'mcp-exec',
        server_name: 'MCP_DOCKER',
        tool_name: 'github.create_pr',
        arguments: { repo: 'test/repo' },
        duration_ms: 500,
        success: true,
      });

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.operation_type).toBe('mcp-exec');
      expect(recordedEvent.tool_name).toBe('github.create_pr');
    });

    it('should record mcp-remove operation', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordMCPGatewayOperation({
        operation_type: 'mcp-remove',
        server_name: 'MCP_DOCKER',
        arguments: { server: 'old-server' },
        duration_ms: 300,
        success: true,
      });

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.operation_type).toBe('mcp-remove');
    });

    it('should record mcp-config-set operation', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordMCPGatewayOperation({
        operation_type: 'mcp-config-set',
        server_name: 'MCP_DOCKER',
        arguments: { key: 'api_key', value: '[REDACTED]' },
        duration_ms: 100,
        success: true,
      });

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.operation_type).toBe('mcp-config-set');
    });

    it('should record gateway operation with error', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const testError = new Error('Gateway error');

      await recordMCPGatewayOperation({
        operation_type: 'mcp-find',
        server_name: 'MCP_DOCKER',
        duration_ms: 100,
        success: false,
        error: testError,
      });

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<MCPEvent>;
      expect(recordedEvent.success).toBe(false);
      expect(recordedEvent.error?.message).toBe('Gateway error');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete MCP workflow', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      // Gateway: mcp-find
      await recordMCPGatewayOperation({
        operation_type: 'mcp-find',
        server_name: 'MCP_DOCKER',
        duration_ms: 200,
        success: true,
        items_returned: 5,
      });

      // Gateway: mcp-add
      await recordMCPGatewayOperation({
        operation_type: 'mcp-add',
        server_name: 'MCP_DOCKER',
        duration_ms: 1000,
        success: true,
      });

      // Tool call
      await recordMCPToolCall({
        layer: '2',
        server_name: 'graphiti',
        tool_name: 'add_memory',
        duration_ms: 300,
        success: true,
      });

      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success and failure operations', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordMCPToolCall({
        layer: '2',
        server_name: 'test',
        tool_name: 'success_tool',
        duration_ms: 100,
        success: true,
      });

      await recordMCPToolCall({
        layer: '2',
        server_name: 'test',
        tool_name: 'failing_tool',
        duration_ms: 50,
        success: false,
        error: new Error('Failed'),
      });

      const events = mockTelemetry.recordEvent.mock.calls.map(call => call[0]) as Partial<MCPEvent>[];
      expect(events[0].success).toBe(true);
      expect(events[1].success).toBe(false);
    });
  });
});
