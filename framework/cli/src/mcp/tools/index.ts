/**
 * MCP Tools Aggregator
 *
 * Exports all MCP tools for registration with the server.
 *
 * @module mcp/tools
 */

import { frameworkTools } from './framework.js';
import { backlogTools } from './backlog.js';
import { confluenceTools } from './confluence.js';
import { planningTools } from './planning.js';
import { templateTools } from './template.js';
import { skillTools } from './skill.js';
import { agentTools } from './agent.js';
import { createTools } from './create.js';
import type { MCPTool } from '../types.js';

/**
 * All available MCP tools
 */
export const allTools: MCPTool[] = [
  ...frameworkTools,
  ...backlogTools,
  ...confluenceTools,
  ...planningTools,
  ...templateTools,
  ...skillTools,
  ...agentTools,
  ...createTools,
];

/**
 * Get all tools organized by category
 */
export function getToolsByCategory(): Record<string, MCPTool[]> {
  return {
    framework: frameworkTools,
    backlog: backlogTools,
    confluence: confluenceTools,
    planning: planningTools,
    template: templateTools,
    skill: skillTools,
    agent: agentTools,
    create: createTools,
  };
}

/**
 * Get total tool count
 */
export function getToolCount(): number {
  return allTools.length;
}

// Re-export individual tool arrays for selective imports
export {
  frameworkTools,
  backlogTools,
  confluenceTools,
  planningTools,
  templateTools,
  skillTools,
  agentTools,
  createTools,
};
