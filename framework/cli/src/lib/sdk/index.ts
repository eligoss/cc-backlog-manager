/**
 * Claude Agent SDK Integration
 *
 * This module provides integration between the Agentic Development Framework
 * and the Claude Agent SDK.
 */

// Types
export type {
  SDKModel,
  SDKTool,
  SubAgentType,
  ExecutionMode,
  PermissionMode,
  SDKPermissions,
  SDKConfiguration,
  FrameworkAgentDefinition,
  SDKAgentDefinition,
  SubAgentConfig,
  GeneratedSDKAgent,
  SDKQueryOptions,
  SDKExecutionResult,
  SDKStreamMessage,
  ParsedAgentContent,
} from './types.js';

// Sub-agent configurations
export {
  SUB_AGENT_CONFIGS,
  getSubAgentConfig,
  generateSubAgentDefinition,
  generateAllSubAgents,
  getDefaultToolsForVariant,
  getDefaultModelForVariant,
} from './sub-agents.js';

// Generator
export { SDKGenerator, createSDKGenerator } from './generator.js';

// Executor
export { executeAgent, resumeAgentSession, executePhase } from './executor.js';

// Message Handler
export {
  handleStreamMessage,
  createMessageHandler,
  createSilentHandler,
  type MessageHandler,
} from './message-handler.js';
