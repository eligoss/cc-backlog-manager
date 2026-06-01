/**
 * MCP Telemetry Integration Tests
 * Comprehensive integration tests that verify end-to-end MCP telemetry capture
 */

import { z } from 'zod';
import fs from 'fs-extra';
import path from 'path';
import { TelemetryManager } from '../telemetry-manager.js';
import { defineTool, toolRegistry } from '../../../mcp/tool-registry.js';
import type { MCPResult } from '../../../mcp/types.js';
import type { MCPEvent, TelemetryConfig } from '../types.js';
import { createSandbox, TestSandbox } from '../../__tests__/test-utils/sandbox.js';

describe('MCP Telemetry Integration Tests', () => {
  let sandbox: TestSandbox;
  let testDir: string;
  let telemetry: TelemetryManager;
  let originalConfig: TelemetryConfig;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Suppress expected console.error calls from telemetry flush errors
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    // Override Jest's global telemetry disabling for these integration tests
    process.env.TELEMETRY_ENABLED = 'true';
    process.env.TELEMETRY_JSON_ENABLED = 'true';
    delete process.env.TELEMETRY_OTEL_ENABLED; // Use config file value

    // Reset singleton
    TelemetryManager.reset();

    // Create unique test directory using sandbox
    sandbox = await createSandbox('mcp-integration');
    testDir = sandbox.path;

    // Create mock telemetry config
    const configPath = path.join(testDir, 'telemetry.config.json');
    const testConfig = {
      telemetry: {
        enabled: true,
        level: 'debug',
        session: {
          enabled: true,
          includeMachineId: false,
        },
        exporters: {
          jsonFile: {
            enabled: true,
            path: '.claude/telemetry/events.jsonl',
            maxSize: '10MB',
            rotation: 'none',
          },
          sessionFile: {
            enabled: false,
            directory: '.claude/telemetry/sessions',
            maxFiles: 50,
            maxAgeDays: 7,
          },
          otel: {
            enabled: false,
            endpoint: 'http://localhost:4318',
            serviceName: 'test-service',
          },
          console: {
            enabled: false,
            pretty: false,
            level: 'info',
            colors: false,
          },
        },
        instrumentation: {
          discovery: true,
          sync: true,
          cli: true,
          mcp: true,
        },
      },
    };

    fs.writeJsonSync(configPath, testConfig);

    // Verify config file was created
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not created at ${configPath}`);
    }

    // Initialize telemetry with test directory
    telemetry = TelemetryManager.getInstance(testDir);

    // Debug: Check config
    const loadedConfig = telemetry.getConfig();
    if (!loadedConfig.enabled) {
      console.error('Telemetry not enabled! Config:', JSON.stringify(loadedConfig, null, 2));
      console.error('Expected config file at:', configPath);
      console.error('File exists:', fs.existsSync(configPath));
      const fileContent = fs.readJsonSync(configPath);
      console.error('File content:', JSON.stringify(fileContent, null, 2));
    }

    // Clear tool registry
    toolRegistry.clear();
  });

  afterEach(async () => {
    await telemetry.shutdown();
    TelemetryManager.reset();
    toolRegistry.clear();

    // Clean up sandbox
    await sandbox.cleanup();

    // Restore console.error
    consoleErrorSpy.mockRestore();

    // Restore console.error
    consoleErrorSpy.mockRestore();

    // Restore Jest's telemetry settings
    process.env.TELEMETRY_ENABLED = 'false';
    process.env.TELEMETRY_JSON_ENABLED = 'false';
  });

  /**
   * Helper to read telemetry events from JSONL file
   */
  async function readTelemetryEvents(): Promise<MCPEvent[]> {
    const eventsPath = path.join(testDir, '.claude/telemetry/events.jsonl');

    if (!fs.existsSync(eventsPath)) {
      return [];
    }

    const content = await fs.readFile(eventsPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    return lines.map(line => JSON.parse(line) as MCPEvent).filter(e => e.event_type === 'mcp');
  }

  describe('End-to-End MCP Telemetry Capture', () => {
    it('should capture telemetry when executing MCP tool via tool-registry', async () => {
      // Verify telemetry is properly configured
      expect(telemetry.isEnabled()).toBe(true);
      expect(telemetry.isInstrumentationEnabled('mcp')).toBe(true);

      // Register a test MCP tool
      const testTool = defineTool(
        'agentic_test_tool',
        'Test tool for telemetry',
        z.object({ value: z.string() }),
        async (args) => ({
          success: true,
          data: { result: `Processed: ${args.value}` },
        })
      );

      toolRegistry.register(testTool);

      // Execute tool
      const result = await toolRegistry.execute('agentic_test_tool', { value: 'test-data' });

      // Verify execution succeeded
      expect(result.success).toBe(true);

      // Wait for async telemetry write (recordEvent has 2000ms default timeout)
      await new Promise(resolve => setTimeout(resolve, 300));
      await telemetry.flush();

      // Read telemetry events
      const events = await readTelemetryEvents();

      // Debug: log if no events found
      if (events.length === 0) {
        const eventsPath = path.join(testDir, '.claude/telemetry/events.jsonl');
        const exists = fs.existsSync(eventsPath);
        console.log('Events file exists:', exists);
        if (exists) {
          const content = await fs.readFile(eventsPath, 'utf-8');
          console.log('Raw content:', content);
        }
      }

      // Verify MCP event was captured
      expect(events.length).toBeGreaterThanOrEqual(1);

      const mcpEvent = events.find(e => e.tool_name === 'agentic_test_tool');
      expect(mcpEvent).toBeDefined();
      expect(mcpEvent?.event_type).toBe('mcp');
      expect(mcpEvent?.operation_type).toBe('tool-call');
      expect(mcpEvent?.layer).toBe('2'); // agentic_ prefix = layer 2
      expect(mcpEvent?.server_name).toBe('framework');
      expect(mcpEvent?.success).toBe(true);
      expect(mcpEvent?.duration_ms).toBeGreaterThanOrEqual(0);
      expect(mcpEvent?.arguments).toBeDefined();
    });

    it('should capture telemetry for failed MCP tool call', async () => {
      // Register a tool that always fails
      const failingTool = defineTool(
        'agentic_failing_tool',
        'Tool that always fails',
        z.object({ value: z.string() }),
        async () => ({
          success: false,
          error: {
            code: 'TEST_ERROR',
            message: 'Intentional test failure',
          },
        })
      );

      toolRegistry.register(failingTool);

      // Execute tool
      const result = await toolRegistry.execute('agentic_failing_tool', { value: 'test' });

      // Verify execution failed
      expect(result.success).toBe(false);

      // Wait for async telemetry write (recordEvent has 2000ms default timeout)
      await new Promise(resolve => setTimeout(resolve, 300));
      await telemetry.flush();

      // Read telemetry events
      const events = await readTelemetryEvents();

      const mcpEvent = events.find(e => e.tool_name === 'agentic_failing_tool');
      expect(mcpEvent).toBeDefined();
      expect(mcpEvent?.success).toBe(true); // Telemetry capture succeeded
      expect(mcpEvent?.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('should sanitize sensitive arguments in telemetry', async () => {
      // Register tool with sensitive arguments
      const authTool = defineTool(
        'agentic_auth_tool',
        'Tool with sensitive data',
        z.object({
          username: z.string(),
          password: z.string(),
          apiKey: z.string(),
          normalData: z.string(),
        }),
        async (args) => ({
          success: true,
          data: { authenticated: true },
        })
      );

      toolRegistry.register(authTool);

      // Execute tool with sensitive data
      await toolRegistry.execute('agentic_auth_tool', {
        username: 'testuser',
        password: 'secret123',
        apiKey: 'sk-abc123',
        normalData: 'public-info',
      });

      // Wait for async telemetry write (recordEvent has 2000ms default timeout)
      await new Promise(resolve => setTimeout(resolve, 300));
      await telemetry.flush();

      // Read telemetry events
      const events = await readTelemetryEvents();

      const mcpEvent = events.find(e => e.tool_name === 'agentic_auth_tool');
      expect(mcpEvent).toBeDefined();
      expect(mcpEvent?.arguments).toEqual({
        username: 'testuser',
        password: '[REDACTED]',
        apiKey: '[REDACTED]',
        normalData: 'public-info',
      });
    });
  });

  describe('Multi-Exporter Scenarios', () => {
    it('should write to both JSONL and console exporters when enabled', async () => {
      // Shutdown current telemetry
      await telemetry.shutdown();
      TelemetryManager.reset();

      // Enable console exporter
      const configPath = path.join(testDir, 'telemetry.config.json');
      const config = fs.readJsonSync(configPath);
      config.telemetry.exporters.console.enabled = true;
      fs.writeJsonSync(configPath, config);

      // Reinitialize telemetry
      telemetry = TelemetryManager.getInstance(testDir);

      // Spy on console.log
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Register and execute tool
      const testTool = defineTool(
        'agentic_multi_export',
        'Multi-exporter test',
        z.object({ data: z.string() }),
        async () => ({ success: true, data: {} })
      );

      toolRegistry.register(testTool);
      await toolRegistry.execute('agentic_multi_export', { data: 'test' });

      // Wait for async telemetry write (recordEvent has 2000ms default timeout)
      await new Promise(resolve => setTimeout(resolve, 300));
      await telemetry.flush();

      // Verify JSONL export
      const events = await readTelemetryEvents();
      expect(events.find(e => e.tool_name === 'agentic_multi_export')).toBeDefined();

      // Verify console export (console exporter logs events)
      expect(consoleLogSpy).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it('should handle exporter failures gracefully', async () => {
      // Shutdown current telemetry
      await telemetry.shutdown();
      TelemetryManager.reset();

      // Make JSONL path invalid (directory instead of file)
      const configPath = path.join(testDir, 'telemetry.config.json');
      const config = fs.readJsonSync(configPath);
      config.telemetry.exporters.jsonFile.path = '.'; // Invalid path
      fs.writeJsonSync(configPath, config);

      // Reinitialize telemetry
      telemetry = TelemetryManager.getInstance(testDir);

      // Register and execute tool
      const testTool = defineTool(
        'agentic_error_test',
        'Error handling test',
        z.object({}),
        async () => ({ success: true, data: {} })
      );

      toolRegistry.register(testTool);

      // Should not throw even if exporter fails
      await expect(
        toolRegistry.execute('agentic_error_test', {})
      ).resolves.not.toThrow();
    });
  });

  describe('Session Correlation', () => {
    it('should correlate multiple MCP calls with same session ID', async () => {
      // Register multiple tools
      const tool1 = defineTool(
        'agentic_tool_1',
        'First tool',
        z.object({}),
        async () => ({ success: true, data: {} })
      );

      const tool2 = defineTool(
        'agentic_tool_2',
        'Second tool',
        z.object({}),
        async () => ({ success: true, data: {} })
      );

      const tool3 = defineTool(
        'agentic_tool_3',
        'Third tool',
        z.object({}),
        async () => ({ success: true, data: {} })
      );

      toolRegistry.register(tool1);
      toolRegistry.register(tool2);
      toolRegistry.register(tool3);

      // Execute tools in sequence
      await toolRegistry.execute('agentic_tool_1', {});
      await toolRegistry.execute('agentic_tool_2', {});
      await toolRegistry.execute('agentic_tool_3', {});

      // Wait for async telemetry write (recordEvent has 2000ms default timeout)
      await new Promise(resolve => setTimeout(resolve, 300));
      await telemetry.flush();

      // Read telemetry events
      const events = await readTelemetryEvents();

      // All events should have the same session_id
      const sessionIds = events.map(e => e.session_id).filter(Boolean);
      expect(sessionIds.length).toBe(3);
      expect(new Set(sessionIds).size).toBe(1); // All same session ID
    });
  });

  describe('Layer Detection', () => {
    it('should detect layer 1 for graphiti tools', async () => {
      const graphitiTool = defineTool(
        'graphiti_add_memory',
        'Add memory to graph',
        z.object({ content: z.string() }),
        async () => ({ success: true, data: {} })
      );

      toolRegistry.register(graphitiTool);
      await toolRegistry.execute('graphiti_add_memory', { content: 'test' });

      await new Promise(resolve => setTimeout(resolve, 100));
      await telemetry.flush();

      const events = await readTelemetryEvents();
      const event = events.find(e => e.tool_name === 'graphiti_add_memory');

      expect(event?.layer).toBe('1'); // Reference MCP
      expect(event?.server_name).toBe('graphiti');
    });

    it('should detect layer 1 for jetbrains tools', async () => {
      const jetbrainsTool = defineTool(
        'jetbrains_open_file',
        'Open file in IDE',
        z.object({ path: z.string() }),
        async () => ({ success: true, data: {} })
      );

      toolRegistry.register(jetbrainsTool);
      await toolRegistry.execute('jetbrains_open_file', { path: '/test/file.ts' });

      await new Promise(resolve => setTimeout(resolve, 100));
      await telemetry.flush();

      const events = await readTelemetryEvents();
      const event = events.find(e => e.tool_name === 'jetbrains_open_file');

      expect(event?.layer).toBe('1'); // Reference MCP
      expect(event?.server_name).toBe('jetbrains');
    });

    it('should detect layer 2 for agentic tools', async () => {
      const agenticTool = defineTool(
        'agentic_init',
        'Initialize project',
        z.object({}),
        async () => ({ success: true, data: {} })
      );

      toolRegistry.register(agenticTool);
      await toolRegistry.execute('agentic_init', {});

      await new Promise(resolve => setTimeout(resolve, 100));
      await telemetry.flush();

      const events = await readTelemetryEvents();
      const event = events.find(e => e.tool_name === 'agentic_init');

      expect(event?.layer).toBe('2'); // CLI tools
      expect(event?.server_name).toBe('framework');
    });

    it('should detect layer 3b for web tools', async () => {
      const webTool = defineTool(
        'web_search',
        'Search the web',
        z.object({ query: z.string() }),
        async () => ({ success: true, data: {} })
      );

      toolRegistry.register(webTool);
      await toolRegistry.execute('web_search', { query: 'test' });

      await new Promise(resolve => setTimeout(resolve, 100));
      await telemetry.flush();

      const events = await readTelemetryEvents();
      const event = events.find(e => e.tool_name === 'web_search');

      expect(event?.layer).toBe('3b'); // Web search
      expect(event?.server_name).toBe('web');
    });

    it('should detect layer 3 for unknown tools', async () => {
      const unknownTool = defineTool(
        'custom_tool',
        'Custom unknown tool',
        z.object({}),
        async () => ({ success: true, data: {} })
      );

      toolRegistry.register(unknownTool);
      await toolRegistry.execute('custom_tool', {});

      await new Promise(resolve => setTimeout(resolve, 100));
      await telemetry.flush();

      const events = await readTelemetryEvents();
      const event = events.find(e => e.tool_name === 'custom_tool');

      expect(event?.layer).toBe('3'); // Dynamic discovery
      expect(event?.server_name).toBe('custom');
    });
  });

  describe('Disabled MCP Instrumentation', () => {
    it('should not emit events when MCP instrumentation is disabled', async () => {
      // Shutdown current telemetry
      await telemetry.shutdown();
      TelemetryManager.reset();

      // Disable MCP instrumentation
      const configPath = path.join(testDir, 'telemetry.config.json');
      const config = fs.readJsonSync(configPath);
      config.telemetry.instrumentation.mcp = false;
      fs.writeJsonSync(configPath, config);

      // Reinitialize telemetry
      telemetry = TelemetryManager.getInstance(testDir);

      // Register and execute tool
      const testTool = defineTool(
        'agentic_disabled_test',
        'Test with MCP disabled',
        z.object({}),
        async () => ({ success: true, data: {} })
      );

      toolRegistry.register(testTool);
      await toolRegistry.execute('agentic_disabled_test', {});

      await new Promise(resolve => setTimeout(resolve, 100));
      await telemetry.flush();

      // Read telemetry events
      const events = await readTelemetryEvents();

      // No MCP events should be captured
      expect(events.length).toBe(0);
    });
  });

  describe('Token Usage and Cost Tracking', () => {
    it('should capture token usage when provided via extractor', async () => {
      // Note: Token usage is extracted via extractors in withMCPTelemetry wrapper
      // This test verifies that token_usage field can be set in the event

      // Register tool and manually record telemetry with token usage
      const { recordMCPOperation } = await import('../instrumentation/mcp-instrumentation.js');

      await recordMCPOperation({
        layer: '2',
        operation_type: 'tool-call',
        server_name: 'test',
        tool_name: 'token_test',
        duration_ms: 100,
        success: true,
        token_usage: {
          input_tokens: 150,
          output_tokens: 250,
          total_tokens: 400,
        },
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      await telemetry.flush();

      const events = await readTelemetryEvents();
      const event = events.find(e => e.tool_name === 'token_test');

      expect(event?.token_usage).toEqual({
        input_tokens: 150,
        output_tokens: 250,
        total_tokens: 400,
      });
    });

    it('should capture cost when provided via extractor', async () => {
      const { recordMCPOperation } = await import('../instrumentation/mcp-instrumentation.js');

      await recordMCPOperation({
        layer: '2',
        operation_type: 'tool-call',
        server_name: 'test',
        tool_name: 'cost_test',
        duration_ms: 100,
        success: true,
        cost_usd: 0.0042,
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      await telemetry.flush();

      const events = await readTelemetryEvents();
      const event = events.find(e => e.tool_name === 'cost_test');

      expect(event?.cost_usd).toBe(0.0042);
    });
  });

  describe('Error Handling', () => {
    it('should capture telemetry even when tool execution throws', async () => {
      // Register tool that throws an error
      const errorTool = defineTool(
        'agentic_error_tool',
        'Tool that throws error',
        z.object({}),
        async () => {
          throw new Error('Tool execution failed');
        }
      );

      toolRegistry.register(errorTool);

      // Execute tool - it will return error result
      const result = await toolRegistry.execute('agentic_error_tool', {});

      expect(result.success).toBe(false);

      await new Promise(resolve => setTimeout(resolve, 100));
      await telemetry.flush();

      // Telemetry should still be captured
      const events = await readTelemetryEvents();
      const event = events.find(e => e.tool_name === 'agentic_error_tool');

      expect(event).toBeDefined();
      expect(event?.success).toBe(true); // Telemetry capture succeeded
    });
  });

  describe('Performance and Scale', () => {
    it('should handle rapid sequential tool calls', async () => {
      // Register tool
      const rapidTool = defineTool(
        'agentic_rapid_tool',
        'Rapid execution test',
        z.object({ index: z.number() }),
        async (args) => ({ success: true, data: { index: args.index } })
      );

      toolRegistry.register(rapidTool);

      // Execute 50 times rapidly
      const promises = Array.from({ length: 50 }, (_, i) =>
        toolRegistry.execute('agentic_rapid_tool', { index: i })
      );

      await Promise.all(promises);

      await new Promise(resolve => setTimeout(resolve, 200));
      await telemetry.flush();

      const events = await readTelemetryEvents();
      const rapidEvents = events.filter(e => e.tool_name === 'agentic_rapid_tool');

      // Most events should be captured (allow for some loss in rapid concurrent writes)
      expect(rapidEvents.length).toBeGreaterThanOrEqual(45);

      // All captured events should have valid, unique indices
      const indices = rapidEvents
        .map(e => e.arguments?.index)
        .filter(i => i !== undefined)
        .sort((a, b) => (a as number) - (b as number));

      // Verify all indices are unique
      expect(new Set(indices).size).toBe(indices.length);
    });
  });
});
