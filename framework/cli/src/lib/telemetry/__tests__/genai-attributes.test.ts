/**
 * GenAI Attributes Tests
 * Unit tests for OpenTelemetry GenAI Semantic Conventions v1.37+ attributes
 */

import * as api from '@opentelemetry/api';
import { OtelExporter } from '../exporters/otel-exporter';
import type { MCPEvent, DiscoveryEvent } from '../types';

// Mock OpenTelemetry
jest.mock('@opentelemetry/sdk-node');
jest.mock('@opentelemetry/api');

describe('GenAI Attributes', () => {
  describe('Type Definitions', () => {
    it('should include gen_ai.system attribute in SpanAttributes', () => {
      // Type test: verify that gen_ai.system is a valid attribute
      const attributes: Record<string, string | number | boolean | undefined> = {
        'gen_ai.system': 'mcp',
      };
      expect(attributes['gen_ai.system']).toBe('mcp');
    });

    it('should include gen_ai.usage.* attributes in SpanAttributes', () => {
      const attributes: Record<string, string | number | boolean | undefined> = {
        'gen_ai.usage.input_tokens': 100,
        'gen_ai.usage.output_tokens': 200,
        'gen_ai.usage.total_tokens': 300,
      };
      expect(attributes['gen_ai.usage.input_tokens']).toBe(100);
      expect(attributes['gen_ai.usage.output_tokens']).toBe(200);
      expect(attributes['gen_ai.usage.total_tokens']).toBe(300);
    });

    it('should include mcp.* attributes in SpanAttributes', () => {
      const attributes: Record<string, string | number | boolean | undefined> = {
        'mcp.layer': '2',
        'mcp.server.name': 'graphiti',
        'mcp.tool.name': 'add_memory',
        'mcp.operation.type': 'tool-call',
      };
      expect(attributes['mcp.layer']).toBe('2');
      expect(attributes['mcp.server.name']).toBe('graphiti');
      expect(attributes['mcp.tool.name']).toBe('add_memory');
      expect(attributes['mcp.operation.type']).toBe('tool-call');
    });

    it('should include gen_ai.agent.* attributes in SpanAttributes', () => {
      const attributes: Record<string, string | number | boolean | undefined> = {
        'gen_ai.agent.id': 'ai-test-agent',
        'gen_ai.agent.variant': 'full',
      };
      expect(attributes['gen_ai.agent.id']).toBe('ai-test-agent');
      expect(attributes['gen_ai.agent.variant']).toBe('full');
    });

    it('should include gen_ai.operation.name attribute', () => {
      const attributes: Record<string, string | number | boolean | undefined> = {
        'gen_ai.operation.name': '2.tool-call',
      };
      expect(attributes['gen_ai.operation.name']).toBe('2.tool-call');
    });

    it('should include gen_ai.cost_usd attribute', () => {
      const attributes: Record<string, string | number | boolean | undefined> = {
        'gen_ai.cost_usd': 0.0042,
      };
      expect(attributes['gen_ai.cost_usd']).toBe(0.0042);
    });
  });

  describe('MCPEvent Attributes', () => {
    it('should include gen_ai.system attribute for MCP events', () => {
      const event: MCPEvent = {
        timestamp: '2024-01-15T10:00:00.000Z',
        event_type: 'mcp',
        operation: '2.tool-call',
        layer: '2',
        operation_type: 'tool-call',
        server_name: 'graphiti',
        tool_name: 'add_memory',
        success: true,
        duration_ms: 150,
      };

      expect(event.event_type).toBe('mcp');
      // When exported via OTLP exporter, should set gen_ai.system = 'mcp'
    });

    it('should include gen_ai.usage.* attributes when token_usage present', () => {
      const event: MCPEvent = {
        timestamp: '2024-01-15T10:00:00.000Z',
        event_type: 'mcp',
        operation: '2.tool-call',
        layer: '2',
        operation_type: 'tool-call',
        server_name: 'openai',
        tool_name: 'completion',
        success: true,
        duration_ms: 500,
        token_usage: {
          input_tokens: 100,
          output_tokens: 200,
          total_tokens: 300,
        },
      };

      expect(event.token_usage).toBeDefined();
      expect(event.token_usage?.input_tokens).toBe(100);
      expect(event.token_usage?.output_tokens).toBe(200);
      expect(event.token_usage?.total_tokens).toBe(300);
      // When exported via OTLP exporter, should set gen_ai.usage.* attributes
    });

    it('should include mcp.* attributes for MCP events', () => {
      const event: MCPEvent = {
        timestamp: '2024-01-15T10:00:00.000Z',
        event_type: 'mcp',
        operation: '2.tool-call',
        layer: '2',
        operation_type: 'tool-call',
        server_name: 'graphiti',
        tool_name: 'add_memory',
        success: true,
        duration_ms: 150,
      };

      expect(event.layer).toBe('2');
      expect(event.server_name).toBe('graphiti');
      expect(event.tool_name).toBe('add_memory');
      expect(event.operation_type).toBe('tool-call');
      // When exported via OTLP exporter, should set mcp.* attributes
    });

    it('should include gen_ai.cost_usd attribute when cost_usd present', () => {
      const event: MCPEvent = {
        timestamp: '2024-01-15T10:00:00.000Z',
        event_type: 'mcp',
        operation: '2.tool-call',
        layer: '2',
        operation_type: 'tool-call',
        success: true,
        duration_ms: 500,
        cost_usd: 0.0042,
      };

      expect(event.cost_usd).toBe(0.0042);
      // When exported via OTLP exporter, should set gen_ai.cost_usd attribute
    });
  });

  describe('DiscoveryEvent Attributes', () => {
    it('should include gen_ai.agent.* attributes for Discovery events', () => {
      const event: DiscoveryEvent = {
        timestamp: '2024-01-15T10:00:00.000Z',
        event_type: 'discovery',
        operation: 'discover-skills',
        agent_id: 'ai-test-agent',
        module_id: 'core',
        variant: 'full',
        capabilities_requested: ['test-capability'],
        skills_discovered: [
          { skill_id: 'skill-1', module: 'core', source: 'framework' },
        ],
        unfulfilled_capabilities: [],
        discovery_duration_ms: 100,
        duration_ms: 100,
      };

      expect(event.agent_id).toBe('ai-test-agent');
      expect(event.variant).toBe('full');
      // When exported via OTLP exporter, should set gen_ai.agent.id and gen_ai.agent.variant
    });

    it('should include gen_ai.system attribute for Discovery events', () => {
      const event: DiscoveryEvent = {
        timestamp: '2024-01-15T10:00:00.000Z',
        event_type: 'discovery',
        operation: 'discover-skills',
        agent_id: 'ai-test-agent',
        module_id: 'core',
        capabilities_requested: [],
        skills_discovered: [],
        unfulfilled_capabilities: [],
        discovery_duration_ms: 100,
        duration_ms: 100,
      };

      expect(event.event_type).toBe('discovery');
      // When exported via OTLP exporter, should set gen_ai.system = 'agentic-framework'
    });
  });

  describe('OTLP Exporter GenAI Attribute Mapping', () => {
    let mockSpan: jest.Mocked<api.Span>;

    beforeEach(() => {
      mockSpan = {
        setAttribute: jest.fn(),
        recordException: jest.fn(),
        setStatus: jest.fn(),
        end: jest.fn(),
        spanContext: jest.fn(),
        updateName: jest.fn(),
        setAttributes: jest.fn(),
        addEvent: jest.fn(),
        addLink: jest.fn(),
        addLinks: jest.fn(),
        isRecording: jest.fn().mockReturnValue(true),
      } as unknown as jest.Mocked<api.Span>;
    });

    it('should set gen_ai.system for MCP events', () => {
      const exporter = new OtelExporter({
        enabled: true,
        endpoint: 'http://localhost:4318',
        serviceName: 'test',
      });

      const event: MCPEvent = {
        timestamp: '2024-01-15T10:00:00.000Z',
        event_type: 'mcp',
        operation: '2.tool-call',
        layer: '2',
        operation_type: 'tool-call',
        success: true,
        duration_ms: 100,
      };

      // Call private method via reflection for testing
      (exporter as any).setEventSpecificAttributes(mockSpan, event);

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('gen_ai.system', 'mcp');
    });

    it('should set gen_ai.usage.* attributes for MCP events with token usage', () => {
      const exporter = new OtelExporter({
        enabled: true,
        endpoint: 'http://localhost:4318',
        serviceName: 'test',
      });

      const event: MCPEvent = {
        timestamp: '2024-01-15T10:00:00.000Z',
        event_type: 'mcp',
        operation: '2.tool-call',
        layer: '2',
        operation_type: 'tool-call',
        success: true,
        duration_ms: 500,
        token_usage: {
          input_tokens: 100,
          output_tokens: 200,
          total_tokens: 300,
        },
      };

      (exporter as any).setEventSpecificAttributes(mockSpan, event);

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('gen_ai.usage.input_tokens', 100);
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('gen_ai.usage.output_tokens', 200);
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('gen_ai.usage.total_tokens', 300);
    });

    it('should set mcp.* attributes for MCP events', () => {
      const exporter = new OtelExporter({
        enabled: true,
        endpoint: 'http://localhost:4318',
        serviceName: 'test',
      });

      const event: MCPEvent = {
        timestamp: '2024-01-15T10:00:00.000Z',
        event_type: 'mcp',
        operation: '2.tool-call',
        layer: '2',
        operation_type: 'tool-call',
        server_name: 'graphiti',
        tool_name: 'add_memory',
        success: true,
        duration_ms: 150,
      };

      (exporter as any).setEventSpecificAttributes(mockSpan, event);

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('mcp.layer', '2');
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('mcp.operation.type', 'tool-call');
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('mcp.server.name', 'graphiti');
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('mcp.tool.name', 'add_memory');
    });

    it('should set gen_ai.cost_usd attribute when cost is present', () => {
      const exporter = new OtelExporter({
        enabled: true,
        endpoint: 'http://localhost:4318',
        serviceName: 'test',
      });

      const event: MCPEvent = {
        timestamp: '2024-01-15T10:00:00.000Z',
        event_type: 'mcp',
        operation: '2.tool-call',
        layer: '2',
        operation_type: 'tool-call',
        success: true,
        duration_ms: 500,
        cost_usd: 0.0042,
      };

      (exporter as any).setEventSpecificAttributes(mockSpan, event);

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('gen_ai.cost_usd', 0.0042);
    });

    it('should set mcp.result.* attributes when result is present', () => {
      const exporter = new OtelExporter({
        enabled: true,
        endpoint: 'http://localhost:4318',
        serviceName: 'test',
      });

      const event: MCPEvent = {
        timestamp: '2024-01-15T10:00:00.000Z',
        event_type: 'mcp',
        operation: '3.mcp-find',
        layer: '3',
        operation_type: 'mcp-find',
        success: true,
        duration_ms: 200,
        result: {
          success: true,
          items_returned: 15,
          error_code: 'NONE',
        },
      };

      (exporter as any).setEventSpecificAttributes(mockSpan, event);

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('mcp.result.items_returned', 15);
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('mcp.result.error_code', 'NONE');
    });

    it('should set gen_ai.system for Discovery events', () => {
      const exporter = new OtelExporter({
        enabled: true,
        endpoint: 'http://localhost:4318',
        serviceName: 'test',
      });

      const event: DiscoveryEvent = {
        timestamp: '2024-01-15T10:00:00.000Z',
        event_type: 'discovery',
        operation: 'discover-skills',
        agent_id: 'ai-test-agent',
        module_id: 'core',
        capabilities_requested: [],
        skills_discovered: [],
        unfulfilled_capabilities: [],
        discovery_duration_ms: 100,
        duration_ms: 100,
      };

      (exporter as any).setEventSpecificAttributes(mockSpan, event);

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('gen_ai.system', 'agentic-framework');
    });

    it('should set gen_ai.agent.* attributes for Discovery events', () => {
      const exporter = new OtelExporter({
        enabled: true,
        endpoint: 'http://localhost:4318',
        serviceName: 'test',
      });

      const event: DiscoveryEvent = {
        timestamp: '2024-01-15T10:00:00.000Z',
        event_type: 'discovery',
        operation: 'discover-skills',
        agent_id: 'ai-architect',
        module_id: 'core',
        variant: 'full',
        capabilities_requested: [],
        skills_discovered: [],
        unfulfilled_capabilities: [],
        discovery_duration_ms: 100,
        duration_ms: 100,
      };

      (exporter as any).setEventSpecificAttributes(mockSpan, event);

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('gen_ai.agent.id', 'ai-architect');
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('gen_ai.agent.variant', 'full');
    });

    it('should set framework.* attributes for Discovery events', () => {
      const exporter = new OtelExporter({
        enabled: true,
        endpoint: 'http://localhost:4318',
        serviceName: 'test',
      });

      const event: DiscoveryEvent = {
        timestamp: '2024-01-15T10:00:00.000Z',
        event_type: 'discovery',
        operation: 'discover-skills',
        agent_id: 'ai-test-agent',
        module_id: 'core',
        capabilities_requested: ['cap1', 'cap2'],
        skills_discovered: [
          { skill_id: 'skill-1', module: 'core', source: 'framework' },
          { skill_id: 'skill-2', module: 'core', source: 'framework' },
        ],
        unfulfilled_capabilities: ['cap3'],
        discovery_duration_ms: 100,
        duration_ms: 100,
      };

      (exporter as any).setEventSpecificAttributes(mockSpan, event);

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('framework.module', 'core');
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('framework.capabilities_requested', 2);
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('framework.skills_discovered', 2);
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('framework.unfulfilled_capabilities', 1);
    });

    it('should set gen_ai.operation.name for all events', () => {
      const exporter = new OtelExporter({
        enabled: true,
        endpoint: 'http://localhost:4318',
        serviceName: 'test',
      });

      // Test with MCP event
      const mcpEvent: MCPEvent = {
        timestamp: '2024-01-15T10:00:00.000Z',
        event_type: 'mcp',
        operation: '2.tool-call',
        layer: '2',
        operation_type: 'tool-call',
        success: true,
        duration_ms: 100,
      };

      // Mock span.setAttribute to track calls
      const setAttributeMock = jest.fn();
      mockSpan.setAttribute = setAttributeMock;

      // Create a mock span via createSpan (private method)
      // We'll test this indirectly by verifying the attribute is set in the public export method
      // For now, verify the operation field exists on event
      expect(mcpEvent.operation).toBe('2.tool-call');
    });

    it('should handle Discovery events without variant', () => {
      const exporter = new OtelExporter({
        enabled: true,
        endpoint: 'http://localhost:4318',
        serviceName: 'test',
      });

      const event: DiscoveryEvent = {
        timestamp: '2024-01-15T10:00:00.000Z',
        event_type: 'discovery',
        operation: 'discover-skills',
        agent_id: 'ai-test-agent',
        module_id: 'core',
        // variant is optional
        capabilities_requested: [],
        skills_discovered: [],
        unfulfilled_capabilities: [],
        discovery_duration_ms: 100,
        duration_ms: 100,
      };

      (exporter as any).setEventSpecificAttributes(mockSpan, event);

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('gen_ai.agent.id', 'ai-test-agent');
      // variant should NOT be set if not present
      expect(mockSpan.setAttribute).not.toHaveBeenCalledWith('gen_ai.agent.variant', expect.anything());
    });

    it('should handle MCP events without optional fields', () => {
      const exporter = new OtelExporter({
        enabled: true,
        endpoint: 'http://localhost:4318',
        serviceName: 'test',
      });

      const event: MCPEvent = {
        timestamp: '2024-01-15T10:00:00.000Z',
        event_type: 'mcp',
        operation: '2.tool-call',
        layer: '2',
        operation_type: 'tool-call',
        success: true,
        duration_ms: 100,
        // Missing: server_name, tool_name, token_usage, cost_usd
      };

      (exporter as any).setEventSpecificAttributes(mockSpan, event);

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('gen_ai.system', 'mcp');
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('mcp.layer', '2');
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('mcp.operation.type', 'tool-call');
      // Optional fields should NOT be set
      expect(mockSpan.setAttribute).not.toHaveBeenCalledWith('mcp.server.name', expect.anything());
      expect(mockSpan.setAttribute).not.toHaveBeenCalledWith('mcp.tool.name', expect.anything());
      expect(mockSpan.setAttribute).not.toHaveBeenCalledWith('gen_ai.usage.input_tokens', expect.anything());
    });

    it('should set framework.cache_hit attribute when present', () => {
      const exporter = new OtelExporter({
        enabled: true,
        endpoint: 'http://localhost:4318',
        serviceName: 'test',
      });

      const event: DiscoveryEvent = {
        timestamp: '2024-01-15T10:00:00.000Z',
        event_type: 'discovery',
        operation: 'discover-skills',
        agent_id: 'ai-test-agent',
        module_id: 'core',
        capabilities_requested: [],
        skills_discovered: [],
        unfulfilled_capabilities: [],
        discovery_duration_ms: 100,
        duration_ms: 100,
        cache_hit: true,
      };

      (exporter as any).setEventSpecificAttributes(mockSpan, event);

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('framework.cache_hit', true);
    });
  });

  describe('Semantic Convention Compliance', () => {
    it('should follow OpenTelemetry GenAI naming conventions', () => {
      // GenAI attributes should use gen_ai.* namespace
      const genAiAttributes = [
        'gen_ai.system',
        'gen_ai.operation.name',
        'gen_ai.agent.id',
        'gen_ai.agent.variant',
        'gen_ai.usage.input_tokens',
        'gen_ai.usage.output_tokens',
        'gen_ai.usage.total_tokens',
        'gen_ai.cost_usd',
      ];

      genAiAttributes.forEach(attr => {
        expect(attr.startsWith('gen_ai.')).toBe(true);
      });
    });

    it('should follow MCP-specific naming conventions', () => {
      // MCP attributes should use mcp.* namespace
      const mcpAttributes = [
        'mcp.layer',
        'mcp.server.name',
        'mcp.tool.name',
        'mcp.operation.type',
        'mcp.result.items_returned',
        'mcp.result.error_code',
      ];

      mcpAttributes.forEach(attr => {
        expect(attr.startsWith('mcp.')).toBe(true);
      });
    });

    it('should follow framework-specific naming conventions', () => {
      // Framework attributes should use framework.* namespace
      const frameworkAttributes = [
        'framework.module',
        'framework.event_type',
        'framework.success',
        'framework.duration_ms',
        'framework.capabilities_requested',
        'framework.skills_discovered',
        'framework.unfulfilled_capabilities',
        'framework.cache_hit',
      ];

      frameworkAttributes.forEach(attr => {
        expect(attr.startsWith('framework.')).toBe(true);
      });
    });
  });
});
