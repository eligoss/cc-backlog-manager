/**
 * Tool Registry Tests
 *
 * Comprehensive tests for tool registration, schema conversion, and execution.
 */

import { z } from 'zod';
import { toolRegistry, defineTool } from '../tool-registry.js';
import type { MCPTool, MCPResult } from '../types.js';
import { successResult, errorResult } from '../types.js';

describe('ToolRegistry', () => {
  // Reset registry state before each test
  beforeEach(() => {
    toolRegistry.clear();
  });

  describe('register()', () => {
    it('should add a tool to the registry', () => {
      const tool: MCPTool = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: z.object({ input: z.string() }),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);

      expect(toolRegistry.has('test-tool')).toBe(true);
      expect(toolRegistry.get('test-tool')).toBe(tool);
    });

    it('should throw error for duplicate tool names', () => {
      const tool1: MCPTool = {
        name: 'duplicate',
        description: 'First tool',
        inputSchema: z.object({}),
        handler: async () => successResult(),
      };

      const tool2: MCPTool = {
        name: 'duplicate',
        description: 'Second tool',
        inputSchema: z.object({}),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool1);

      expect(() => toolRegistry.register(tool2)).toThrow(
        'Tool "duplicate" is already registered'
      );
    });

    it('should allow registering tools with different names', () => {
      const tool1: MCPTool = {
        name: 'tool-one',
        description: 'First tool',
        inputSchema: z.object({}),
        handler: async () => successResult(),
      };

      const tool2: MCPTool = {
        name: 'tool-two',
        description: 'Second tool',
        inputSchema: z.object({}),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool1);
      toolRegistry.register(tool2);

      expect(toolRegistry.has('tool-one')).toBe(true);
      expect(toolRegistry.has('tool-two')).toBe(true);
    });
  });

  describe('registerAll()', () => {
    it('should register multiple tools', () => {
      const tools: MCPTool[] = [
        {
          name: 'tool-1',
          description: 'Tool 1',
          inputSchema: z.object({}),
          handler: async () => successResult(),
        },
        {
          name: 'tool-2',
          description: 'Tool 2',
          inputSchema: z.object({}),
          handler: async () => successResult(),
        },
        {
          name: 'tool-3',
          description: 'Tool 3',
          inputSchema: z.object({}),
          handler: async () => successResult(),
        },
      ];

      toolRegistry.registerAll(tools);

      expect(toolRegistry.has('tool-1')).toBe(true);
      expect(toolRegistry.has('tool-2')).toBe(true);
      expect(toolRegistry.has('tool-3')).toBe(true);
    });

    it('should register empty array without error', () => {
      expect(() => toolRegistry.registerAll([])).not.toThrow();
    });

    it('should throw on first duplicate tool', () => {
      const tools: MCPTool[] = [
        {
          name: 'tool-1',
          description: 'Tool 1',
          inputSchema: z.object({}),
          handler: async () => successResult(),
        },
        {
          name: 'tool-1', // Duplicate
          description: 'Tool 1 again',
          inputSchema: z.object({}),
          handler: async () => successResult(),
        },
      ];

      expect(() => toolRegistry.registerAll(tools)).toThrow(
        'Tool "tool-1" is already registered'
      );
    });
  });

  describe('get()', () => {
    it('should return the correct tool by name', () => {
      const tool: MCPTool = {
        name: 'my-tool',
        description: 'My tool',
        inputSchema: z.object({}),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);

      const retrieved = toolRegistry.get('my-tool');
      expect(retrieved).toBe(tool);
    });

    it('should return undefined for unknown tools', () => {
      const retrieved = toolRegistry.get('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should return undefined after clear', () => {
      const tool: MCPTool = {
        name: 'temp-tool',
        description: 'Temporary tool',
        inputSchema: z.object({}),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);
      expect(toolRegistry.get('temp-tool')).toBe(tool);

      toolRegistry.clear();
      expect(toolRegistry.get('temp-tool')).toBeUndefined();
    });
  });

  describe('has()', () => {
    it('should return true for registered tools', () => {
      const tool: MCPTool = {
        name: 'existing-tool',
        description: 'Existing tool',
        inputSchema: z.object({}),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);

      expect(toolRegistry.has('existing-tool')).toBe(true);
    });

    it('should return false for unknown tools', () => {
      expect(toolRegistry.has('unknown-tool')).toBe(false);
    });

    it('should return false after clear', () => {
      const tool: MCPTool = {
        name: 'temp-tool',
        description: 'Temporary tool',
        inputSchema: z.object({}),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);
      expect(toolRegistry.has('temp-tool')).toBe(true);

      toolRegistry.clear();
      expect(toolRegistry.has('temp-tool')).toBe(false);
    });
  });

  describe('getAll()', () => {
    it('should return all registered tools', () => {
      const tool1: MCPTool = {
        name: 'tool-1',
        description: 'Tool 1',
        inputSchema: z.object({}),
        handler: async () => successResult(),
      };

      const tool2: MCPTool = {
        name: 'tool-2',
        description: 'Tool 2',
        inputSchema: z.object({}),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool1);
      toolRegistry.register(tool2);

      const allTools = toolRegistry.getAll();
      expect(allTools).toHaveLength(2);
      expect(allTools).toContain(tool1);
      expect(allTools).toContain(tool2);
    });

    it('should return empty array when no tools registered', () => {
      const allTools = toolRegistry.getAll();
      expect(allTools).toEqual([]);
    });

    it('should return empty array after clear', () => {
      const tool: MCPTool = {
        name: 'tool',
        description: 'Tool',
        inputSchema: z.object({}),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);
      expect(toolRegistry.getAll()).toHaveLength(1);

      toolRegistry.clear();
      expect(toolRegistry.getAll()).toEqual([]);
    });
  });

  describe('getNames()', () => {
    it('should return all tool names', () => {
      const tools: MCPTool[] = [
        {
          name: 'alpha',
          description: 'Alpha tool',
          inputSchema: z.object({}),
          handler: async () => successResult(),
        },
        {
          name: 'beta',
          description: 'Beta tool',
          inputSchema: z.object({}),
          handler: async () => successResult(),
        },
        {
          name: 'gamma',
          description: 'Gamma tool',
          inputSchema: z.object({}),
          handler: async () => successResult(),
        },
      ];

      toolRegistry.registerAll(tools);

      const names = toolRegistry.getNames();
      expect(names).toHaveLength(3);
      expect(names).toContain('alpha');
      expect(names).toContain('beta');
      expect(names).toContain('gamma');
    });

    it('should return empty array when no tools registered', () => {
      const names = toolRegistry.getNames();
      expect(names).toEqual([]);
    });

    it('should return empty array after clear', () => {
      const tool: MCPTool = {
        name: 'tool',
        description: 'Tool',
        inputSchema: z.object({}),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);
      expect(toolRegistry.getNames()).toHaveLength(1);

      toolRegistry.clear();
      expect(toolRegistry.getNames()).toEqual([]);
    });
  });

  describe('getMetadata()', () => {
    it('should return correct MCP format metadata', () => {
      const tool: MCPTool = {
        name: 'test-tool',
        description: 'A test tool for validation',
        inputSchema: z.object({
          name: z.string(),
          count: z.number(),
        }),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);

      const metadata = toolRegistry.getMetadata();
      expect(metadata).toHaveLength(1);
      expect(metadata[0]).toMatchObject({
        name: 'test-tool',
        description: 'A test tool for validation',
        inputSchema: {
          type: 'object',
          properties: expect.any(Object),
        },
      });
    });

    it('should convert Zod schemas to JSON Schema correctly', () => {
      const tool: MCPTool = {
        name: 'schema-test',
        description: 'Schema test tool',
        inputSchema: z.object({
          required: z.string(),
          optional: z.string().optional(),
          numberField: z.number(),
        }),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);

      const metadata = toolRegistry.getMetadata();
      expect(metadata[0].inputSchema.type).toBe('object');
      expect(metadata[0].inputSchema.properties).toHaveProperty('required');
      expect(metadata[0].inputSchema.properties).toHaveProperty('optional');
      expect(metadata[0].inputSchema.properties).toHaveProperty('numberField');
    });

    it('should identify required fields correctly', () => {
      const tool: MCPTool = {
        name: 'required-test',
        description: 'Required fields test',
        inputSchema: z.object({
          required1: z.string(),
          required2: z.number(),
          optional: z.boolean().optional(),
        }),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);

      const metadata = toolRegistry.getMetadata();
      expect(metadata[0].inputSchema.required).toEqual(
        expect.arrayContaining(['required1', 'required2'])
      );
      expect(metadata[0].inputSchema.required).toHaveLength(2);
    });

    it('should handle tools with no required fields', () => {
      const tool: MCPTool = {
        name: 'all-optional',
        description: 'All optional fields',
        inputSchema: z.object({
          field1: z.string().optional(),
          field2: z.number().optional(),
        }),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);

      const metadata = toolRegistry.getMetadata();
      // When all fields are optional, required should either be undefined or empty array
      expect(
        metadata[0].inputSchema.required === undefined ||
          metadata[0].inputSchema.required.length === 0
      ).toBe(true);
    });

    it('should return empty array when no tools registered', () => {
      const metadata = toolRegistry.getMetadata();
      expect(metadata).toEqual([]);
    });

    it('should return metadata for multiple tools', () => {
      const tools: MCPTool[] = [
        {
          name: 'tool-1',
          description: 'First tool',
          inputSchema: z.object({ a: z.string() }),
          handler: async () => successResult(),
        },
        {
          name: 'tool-2',
          description: 'Second tool',
          inputSchema: z.object({ b: z.number() }),
          handler: async () => successResult(),
        },
      ];

      toolRegistry.registerAll(tools);

      const metadata = toolRegistry.getMetadata();
      expect(metadata).toHaveLength(2);
      expect(metadata.map((m) => m.name)).toEqual(['tool-1', 'tool-2']);
    });
  });

  describe('execute()', () => {
    it('should call the tool handler with validated args', async () => {
      const handler = jest.fn(async () => successResult({ result: 'success' }));

      const tool: MCPTool = {
        name: 'execute-test',
        description: 'Execute test',
        inputSchema: z.object({
          name: z.string(),
          count: z.number(),
        }),
        handler,
      };

      toolRegistry.register(tool);

      const args = { name: 'test', count: 42 };
      const result = await toolRegistry.execute('execute-test', args);

      expect(handler).toHaveBeenCalledWith(args);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ result: 'success' });
      }
    });

    it('should return error for unknown tool', async () => {
      toolRegistry.register({
        name: 'known-tool',
        description: 'Known tool',
        inputSchema: z.object({}),
        handler: async () => successResult(),
      });

      const result = await toolRegistry.execute('unknown-tool', {});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNKNOWN_TOOL');
        expect(result.error.message).toBe('Unknown tool: unknown-tool');
        expect(result.error.suggestion).toContain('known-tool');
      }
    });

    it('should return error for invalid arguments (Zod validation)', async () => {
      const tool: MCPTool = {
        name: 'validation-test',
        description: 'Validation test',
        inputSchema: z.object({
          name: z.string(),
          age: z.number().min(0),
        }),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);

      // Invalid: age is a string instead of number
      const result = await toolRegistry.execute('validation-test', {
        name: 'John',
        age: 'invalid',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_ARGUMENTS');
        expect(result.error.message).toBe('Invalid arguments provided');
        expect(result.error.details).toBeDefined();
      }
    });

    it('should return error for missing required fields', async () => {
      const tool: MCPTool = {
        name: 'required-test',
        description: 'Required fields test',
        inputSchema: z.object({
          required: z.string(),
          optional: z.string().optional(),
        }),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);

      // Missing required field
      const result = await toolRegistry.execute('required-test', {
        optional: 'present',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_ARGUMENTS');
      }
    });

    it('should validate with Zod schema before calling handler', async () => {
      const handler = jest.fn(async () => successResult());

      const tool: MCPTool = {
        name: 'schema-validation',
        description: 'Schema validation test',
        inputSchema: z.object({
          email: z.string().email(),
        }),
        handler,
      };

      toolRegistry.register(tool);

      // Invalid email
      await toolRegistry.execute('schema-validation', { email: 'not-an-email' });

      // Handler should not be called with invalid input
      expect(handler).not.toHaveBeenCalled();
    });

    it('should pass validated args to handler', async () => {
      const handler = jest.fn(async (args: { name: string; count: number }) => {
        expect(typeof args.name).toBe('string');
        expect(typeof args.count).toBe('number');
        return successResult();
      });

      const tool: MCPTool = {
        name: 'type-test',
        description: 'Type test',
        inputSchema: z.object({
          name: z.string(),
          count: z.number(),
        }),
        handler,
      };

      toolRegistry.register(tool);

      await toolRegistry.execute('type-test', { name: 'test', count: 5 });

      expect(handler).toHaveBeenCalled();
    });

    it('should return handler result on success', async () => {
      const expectedResult: MCPResult = successResult(
        { key: 'value' },
        'Operation completed',
        'Output text'
      );

      const tool: MCPTool = {
        name: 'result-test',
        description: 'Result test',
        inputSchema: z.object({}),
        handler: async () => expectedResult,
      };

      toolRegistry.register(tool);

      const result = await toolRegistry.execute('result-test', {});

      expect(result).toBe(expectedResult);
    });

    it('should handle handler errors gracefully', async () => {
      const tool: MCPTool = {
        name: 'error-test',
        description: 'Error test',
        inputSchema: z.object({}),
        handler: async () => {
          throw new Error('Handler error');
        },
      };

      toolRegistry.register(tool);

      const result = await toolRegistry.execute('error-test', {});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('COMMAND_FAILED');
        expect(result.error.message).toBe('Handler error');
      }
    });

    it('should handle non-Error exceptions', async () => {
      const tool: MCPTool = {
        name: 'exception-test',
        description: 'Exception test',
        inputSchema: z.object({}),
        handler: async () => {
          throw 'String exception';
        },
      };

      toolRegistry.register(tool);

      const result = await toolRegistry.execute('exception-test', {});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('COMMAND_FAILED');
        expect(result.error.message).toBe('String exception');
      }
    });
  });

  describe('clear()', () => {
    it('should remove all tools', () => {
      const tools: MCPTool[] = [
        {
          name: 'tool-1',
          description: 'Tool 1',
          inputSchema: z.object({}),
          handler: async () => successResult(),
        },
        {
          name: 'tool-2',
          description: 'Tool 2',
          inputSchema: z.object({}),
          handler: async () => successResult(),
        },
      ];

      toolRegistry.registerAll(tools);
      expect(toolRegistry.getAll()).toHaveLength(2);

      toolRegistry.clear();

      expect(toolRegistry.getAll()).toHaveLength(0);
      expect(toolRegistry.has('tool-1')).toBe(false);
      expect(toolRegistry.has('tool-2')).toBe(false);
    });

    it('should allow re-registering after clear', () => {
      const tool: MCPTool = {
        name: 'reusable',
        description: 'Reusable tool',
        inputSchema: z.object({}),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);
      toolRegistry.clear();

      // Should not throw duplicate error
      expect(() => toolRegistry.register(tool)).not.toThrow();
      expect(toolRegistry.has('reusable')).toBe(true);
    });

    it('should be safe to call multiple times', () => {
      expect(() => {
        toolRegistry.clear();
        toolRegistry.clear();
        toolRegistry.clear();
      }).not.toThrow();
    });
  });
});

describe('defineTool()', () => {
  beforeEach(() => {
    toolRegistry.clear();
  });

  it('should create a valid MCPTool object', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const handler = async (args: z.infer<typeof schema>) => {
      return successResult({ name: args.name, age: args.age });
    };

    const tool = defineTool('user-tool', 'Create a user', schema, handler);

    expect(tool.name).toBe('user-tool');
    expect(tool.description).toBe('Create a user');
    expect(tool.inputSchema).toBe(schema);
    expect(tool.handler).toBe(handler);
  });

  it('should create tools with correctly typed handlers', async () => {
    const schema = z.object({
      message: z.string(),
      count: z.number(),
    });

    // Handler receives correctly typed arguments
    const handler = async (args: z.infer<typeof schema>) => {
      // TypeScript should infer: args.message is string, args.count is number
      const upperMessage: string = args.message.toUpperCase();
      const doubled: number = args.count * 2;

      return successResult({
        original: args.message,
        processed: upperMessage,
        doubled,
      });
    };

    const tool = defineTool('process-message', 'Process a message', schema, handler);

    toolRegistry.register(tool);

    const result = await toolRegistry.execute('process-message', {
      message: 'hello',
      count: 5,
    });

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.original).toBe('hello');
      expect(result.data.processed).toBe('HELLO');
      expect(result.data.doubled).toBe(10);
    }
  });

  it('should work with empty schema', () => {
    const schema = z.object({});
    const handler = async () => successResult({ message: 'No args needed' });

    const tool = defineTool('no-args-tool', 'Tool with no args', schema, handler);

    expect(tool.name).toBe('no-args-tool');
    expect(tool.description).toBe('Tool with no args');
  });

  it('should work with complex nested schemas', () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        email: z.string().email(),
      }),
      options: z.object({
        verbose: z.boolean().optional(),
        maxRetries: z.number().default(3),
      }),
    });

    const handler = async (args: z.infer<typeof schema>) => {
      return successResult({
        userName: args.user.name,
        retries: args.options.maxRetries,
      });
    };

    const tool = defineTool('complex-tool', 'Complex nested tool', schema, handler);

    expect(tool.inputSchema).toBe(schema);
  });

  it('should support error results from handler', async () => {
    const schema = z.object({ shouldFail: z.boolean() });

    const handler = async (args: z.infer<typeof schema>) => {
      if (args.shouldFail) {
        return errorResult('COMMAND_FAILED', 'Operation failed as requested');
      }
      return successResult({ status: 'ok' });
    };

    const tool = defineTool('conditional-tool', 'Conditional tool', schema, handler);

    toolRegistry.register(tool);

    const failResult = await toolRegistry.execute('conditional-tool', { shouldFail: true });
    expect(failResult.success).toBe(false);

    const successResult_ = await toolRegistry.execute('conditional-tool', { shouldFail: false });
    expect(successResult_.success).toBe(true);
  });
});

describe('Schema Conversion', () => {
  beforeEach(() => {
    toolRegistry.clear();
  });

  describe('Zod to JSON Schema conversion', () => {
    it('should convert string fields correctly', () => {
      const tool: MCPTool = {
        name: 'string-test',
        description: 'String test',
        inputSchema: z.object({
          name: z.string(),
        }),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);

      const metadata = toolRegistry.getMetadata()[0];
      expect(metadata.inputSchema.properties.name).toMatchObject({
        type: 'string',
      });
    });

    it('should convert number fields correctly', () => {
      const tool: MCPTool = {
        name: 'number-test',
        description: 'Number test',
        inputSchema: z.object({
          count: z.number(),
          price: z.number().optional(),
        }),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);

      const metadata = toolRegistry.getMetadata()[0];
      expect(metadata.inputSchema.properties.count).toMatchObject({
        type: 'number',
      });
      expect(metadata.inputSchema.properties.price).toMatchObject({
        type: 'number',
      });
    });

    it('should convert boolean fields correctly', () => {
      const tool: MCPTool = {
        name: 'boolean-test',
        description: 'Boolean test',
        inputSchema: z.object({
          enabled: z.boolean(),
        }),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);

      const metadata = toolRegistry.getMetadata()[0];
      expect(metadata.inputSchema.properties.enabled).toMatchObject({
        type: 'boolean',
      });
    });

    it('should handle optional fields with correct defaults', () => {
      const tool: MCPTool = {
        name: 'optional-test',
        description: 'Optional test',
        inputSchema: z.object({
          required: z.string(),
          optional: z.string().optional(),
          withDefault: z.number().default(42),
        }),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);

      const metadata = toolRegistry.getMetadata()[0];

      // Required field should be in required array
      expect(metadata.inputSchema.required).toContain('required');

      // Optional field should not be in required array (or required array is undefined)
      if (metadata.inputSchema.required) {
        expect(metadata.inputSchema.required).not.toContain('optional');
      }

      // All fields should exist in properties
      expect(metadata.inputSchema.properties).toHaveProperty('required');
      expect(metadata.inputSchema.properties).toHaveProperty('optional');
      expect(metadata.inputSchema.properties).toHaveProperty('withDefault');
    });

    it('should convert array fields correctly', () => {
      const tool: MCPTool = {
        name: 'array-test',
        description: 'Array test',
        inputSchema: z.object({
          tags: z.array(z.string()),
          numbers: z.array(z.number()),
        }),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);

      const metadata = toolRegistry.getMetadata()[0];
      expect(metadata.inputSchema.properties.tags).toMatchObject({
        type: 'array',
      });
      expect(metadata.inputSchema.properties.numbers).toMatchObject({
        type: 'array',
      });
    });

    it('should convert nested objects correctly', () => {
      const tool: MCPTool = {
        name: 'nested-test',
        description: 'Nested test',
        inputSchema: z.object({
          user: z.object({
            name: z.string(),
            age: z.number(),
          }),
        }),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);

      const metadata = toolRegistry.getMetadata()[0];
      expect(metadata.inputSchema.properties.user).toMatchObject({
        type: 'object',
      });
    });

    it('should handle enum fields', () => {
      const tool: MCPTool = {
        name: 'enum-test',
        description: 'Enum test',
        inputSchema: z.object({
          status: z.enum(['active', 'inactive', 'pending']),
        }),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);

      const metadata = toolRegistry.getMetadata()[0];
      const statusProp = metadata.inputSchema.properties.status as any;

      // Zod enum should be converted to JSON Schema enum
      expect(statusProp.enum || statusProp.anyOf).toBeDefined();
    });

    it('should preserve field descriptions if present', () => {
      const tool: MCPTool = {
        name: 'description-test',
        description: 'Description test',
        inputSchema: z.object({
          name: z.string().describe('User name'),
          age: z.number().describe('User age in years'),
        }),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);

      const metadata = toolRegistry.getMetadata()[0];
      const nameProp = metadata.inputSchema.properties.name as any;
      const ageProp = metadata.inputSchema.properties.age as any;

      expect(nameProp.description).toBe('User name');
      expect(ageProp.description).toBe('User age in years');
    });

    it('should handle empty object schema', () => {
      const tool: MCPTool = {
        name: 'empty-test',
        description: 'Empty test',
        inputSchema: z.object({}),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);

      const metadata = toolRegistry.getMetadata()[0];
      expect(metadata.inputSchema.type).toBe('object');
      expect(metadata.inputSchema.properties).toEqual({});
    });
  });

  describe('Required fields identification', () => {
    it('should identify required fields correctly', () => {
      const tool: MCPTool = {
        name: 'required-identification',
        description: 'Required identification test',
        inputSchema: z.object({
          mustHave1: z.string(),
          mustHave2: z.number(),
          canHave: z.boolean().optional(),
        }),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);

      const metadata = toolRegistry.getMetadata()[0];
      expect(metadata.inputSchema.required).toEqual(
        expect.arrayContaining(['mustHave1', 'mustHave2'])
      );
      expect(metadata.inputSchema.required).toHaveLength(2);
    });

    it('should handle all-required fields', () => {
      const tool: MCPTool = {
        name: 'all-required',
        description: 'All required test',
        inputSchema: z.object({
          field1: z.string(),
          field2: z.number(),
          field3: z.boolean(),
        }),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);

      const metadata = toolRegistry.getMetadata()[0];
      expect(metadata.inputSchema.required).toEqual(
        expect.arrayContaining(['field1', 'field2', 'field3'])
      );
      expect(metadata.inputSchema.required).toHaveLength(3);
    });

    it('should handle all-optional fields', () => {
      const tool: MCPTool = {
        name: 'all-optional',
        description: 'All optional test',
        inputSchema: z.object({
          field1: z.string().optional(),
          field2: z.number().optional(),
        }),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);

      const metadata = toolRegistry.getMetadata()[0];
      // Should be undefined or empty array
      expect(
        metadata.inputSchema.required === undefined ||
          metadata.inputSchema.required.length === 0
      ).toBe(true);
    });

    it('should handle fields with default values', () => {
      const tool: MCPTool = {
        name: 'default-test',
        description: 'Default test',
        inputSchema: z.object({
          required: z.string(),
          withDefault: z.number().default(10),
        }),
        handler: async () => successResult(),
      };

      toolRegistry.register(tool);

      const metadata = toolRegistry.getMetadata()[0];

      // Zod v4's native toJSONSchema marks fields with defaults as required
      // but includes the default value in the property schema
      expect(metadata.inputSchema.required).toContain('required');
      expect(metadata.inputSchema.required).toContain('withDefault');

      // Verify the default value is present in the schema
      const withDefaultProp = metadata.inputSchema.properties.withDefault as Record<string, unknown>;
      expect(withDefaultProp.default).toBe(10);
    });
  });
});
