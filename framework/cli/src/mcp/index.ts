#!/usr/bin/env node
/**
 * Agentic Framework MCP Server
 *
 * Exposes framework CLI commands as MCP tools for Claude Code integration.
 *
 * Usage:
 *   node dist/mcp/index.js
 *   # Or via npm:
 *   agentic-framework-mcp
 *
 * @module mcp
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createRequire } from 'module';

import { toolRegistry } from './tool-registry.js';
import { allTools, getToolCount } from './tools/index.js';

// Get package version
const require = createRequire(import.meta.url);
const packageJson = require('../../package.json');

/**
 * Initialize the MCP server
 */
async function main(): Promise<void> {
  // Register all tools
  toolRegistry.registerAll(allTools);

  // Create server instance
  const server = new Server(
    {
      name: 'agentic-framework',
      version: packageJson.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const metadata = toolRegistry.getMetadata();
    return {
      tools: metadata.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const result = await toolRegistry.execute(name, args ?? {});

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
      isError: !result.success,
    };
  });

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log startup info to stderr (not stdout, which is used for MCP protocol)
  console.error(`Agentic Framework MCP Server v${packageJson.version}`);
  console.error(`Registered ${getToolCount()} tools`);
}

// Run the server
main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
