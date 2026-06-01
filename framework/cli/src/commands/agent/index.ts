/**
 * Agent Command Group
 *
 * Provides CLI commands for managing and running SDK agents.
 */

import { Command } from 'commander';
import { createAgentListCommand } from './list.js';
import { createAgentShowCommand } from './show.js';
import { createAgentRunCommand } from './run.js';

/**
 * Create the agent command group
 */
export function createAgentCommand(): Command {
  const agent = new Command('agent')
    .description('Manage and run SDK agents');

  // Add subcommands
  agent.addCommand(createAgentListCommand());
  agent.addCommand(createAgentShowCommand());
  agent.addCommand(createAgentRunCommand());

  return agent;
}
