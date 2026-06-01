/**
 * MCP Command Group
 *
 * Provides CLI commands for managing MCP (Model Context Protocol) integrations:
 * - check: Check prerequisites status
 * - setup: Configure MCP after init
 * - status: Show MCP integration status
 * - seed: Seed knowledge bases
 */

import { Command } from 'commander';
import { createMcpCheckCommand } from './check.js';
import { createMcpSetupCommand } from './setup.js';
import { createMcpStatusCommand } from './status.js';
import { createMcpSeedCommand } from './seed.js';

/**
 * Create the MCP command group
 */
export function createMcpCommand(): Command {
  const mcp = new Command('mcp')
    .description('Manage MCP (Model Context Protocol) integrations');

  // Add subcommands
  mcp.addCommand(createMcpCheckCommand());
  mcp.addCommand(createMcpSetupCommand());
  mcp.addCommand(createMcpStatusCommand());
  mcp.addCommand(createMcpSeedCommand());

  return mcp;
}
