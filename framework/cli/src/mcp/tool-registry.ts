/**
 * Tool Registry
 *
 * Central registration and management of MCP tools.
 * Handles schema conversion from Zod to JSON Schema for MCP protocol.
 *
 * @module mcp/tool-registry
 */

import { z } from 'zod';
import type { MCPTool, MCPToolMetadata, MCPResult } from './types.js';
import { withMCPTelemetry } from '../lib/telemetry/instrumentation/mcp-instrumentation.js';

/**
 * Tool registry singleton
 */
class ToolRegistry {
  private tools: Map<string, MCPTool> = new Map();

  /**
   * Register a tool
   */
  register(tool: MCPTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Register multiple tools
   */
  registerAll(tools: MCPTool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Get a tool by name
   */
  get(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all registered tools
   */
  getAll(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get all tool names
   */
  getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tool metadata for MCP ListTools response
   */
  getMetadata(): MCPToolMetadata[] {
    return this.getAll().map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: convertZodToJsonSchema(tool.inputSchema),
    }));
  }

  /**
   * Get MCP layer from tool name
   */
  private getToolLayer(name: string): '1' | '2' | '3' | '3b' {
    // Layer 1: Reference MCPs (graphiti, jetbrains)
    if (name.startsWith('graphiti_') || name.startsWith('jetbrains_')) {
      return '1';
    }
    // Layer 2: CLI tools (framework tools like agentic_*, jira_*, confluence_*)
    if (name.startsWith('agentic_') || name.startsWith('jira_') || name.startsWith('confluence_')) {
      return '2';
    }
    // Layer 3b: Web search
    if (name.startsWith('web_')) {
      return '3b';
    }
    // Layer 3: Dynamic discovery (everything else)
    return '3';
  }

  /**
   * Get server name from tool prefix
   */
  private getServerName(name: string): string {
    const prefix = name.split('_')[0];
    return prefix === 'agentic' ? 'framework' : prefix;
  }

  /**
   * Execute a tool by name
   */
  async execute(name: string, args: unknown): Promise<MCPResult> {
    const tool = this.get(name);
    if (!tool) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_TOOL',
          message: `Unknown tool: ${name}`,
          suggestion: `Available tools: ${this.getNames().join(', ')}`,
        },
      };
    }

    const layer = this.getToolLayer(name);
    const serverName = this.getServerName(name);

    return withMCPTelemetry(
      layer,
      'tool-call',
      serverName,
      name,
      args,
      async () => {
        try {
          // Validate arguments with Zod schema
          const validatedArgs = tool.inputSchema.parse(args);
          return await tool.handler(validatedArgs);
        } catch (error) {
          if (error instanceof Error && error.name === 'ZodError') {
            return {
              success: false,
              error: {
                code: 'INVALID_ARGUMENTS',
                message: 'Invalid arguments provided',
                details: error,
              },
            };
          }
          return {
            success: false,
            error: {
              code: 'COMMAND_FAILED',
              message: error instanceof Error ? error.message : String(error),
            },
          };
        }
      }
    );
  }

  /**
   * Clear all registered tools (mainly for testing)
   */
  clear(): void {
    this.tools.clear();
  }
}

/**
 * Convert Zod schema to JSON Schema for MCP
 *
 * Uses Zod v4's native toJSONSchema() for reliable schema conversion.
 */
function convertZodToJsonSchema(schema: z.ZodType): {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
} {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;

  // Ensure we have an object schema
  if (typeof jsonSchema !== 'object' || jsonSchema.type !== 'object') {
    return {
      type: 'object',
      properties: {},
    };
  }

  const result: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  } = {
    type: 'object',
    properties: (jsonSchema.properties as Record<string, unknown>) || {},
  };

  // Add required fields if present
  if (Array.isArray(jsonSchema.required) && jsonSchema.required.length > 0) {
    result.required = jsonSchema.required as string[];
  }

  return result;
}

/**
 * Global tool registry instance
 */
export const toolRegistry = new ToolRegistry();

/**
 * Helper to create a tool definition with type inference
 */
export function defineTool<TSchema extends z.ZodType>(
  name: string,
  description: string,
  inputSchema: TSchema,
  handler: (args: z.infer<TSchema>) => Promise<MCPResult>
): MCPTool {
  return {
    name,
    description,
    inputSchema,
    handler: handler as (args: unknown) => Promise<MCPResult>,
  };
}
