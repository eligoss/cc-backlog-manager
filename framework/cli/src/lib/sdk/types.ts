/**
 * Claude Agent SDK Integration Types
 *
 * These types bridge the framework's agent definitions with the Claude Agent SDK format.
 */

/**
 * SDK model options matching Claude Agent SDK
 */
export type SDKModel = "opus" | "sonnet" | "haiku";

/**
 * Built-in tools available in Claude Agent SDK
 */
export type SDKTool =
  | "Read"
  | "Write"
  | "Edit"
  | "Glob"
  | "Grep"
  | "Bash"
  | "WebSearch"
  | "WebFetch"
  | "Task"
  | "TodoWrite"
  | "AskUserQuestion"
  | "NotebookEdit";

/**
 * Phase-specialized sub-agent types
 */
export type SubAgentType = "explore" | "architect" | "reviewer" | "implementer";

/**
 * Execution mode for agents
 */
export type ExecutionMode = "interactive" | "autonomous";

/**
 * Permission mode for SDK execution
 */
export type PermissionMode = "default" | "bypassPermissions" | "acceptEdits";

/**
 * SDK permissions configuration
 */
export interface SDKPermissions {
  mode: PermissionMode;
  allowedBashCommands?: string[];
}

/**
 * SDK configuration block from agents.json
 */
export interface SDKConfiguration {
  enabled: boolean;
  model: SDKModel;
  allowedTools: SDKTool[];
  subAgents: SubAgentType[];
  executionMode: ExecutionMode;
  maxTokens?: number;
  permissions?: SDKPermissions;
}

/**
 * Agent definition from the framework's registry
 * Extended with SDK configuration
 */
export interface FrameworkAgentDefinition {
  id: string;
  moduleId: string;
  capabilityNeeds: string[];
  contextCategoryNeeds: Record<string, string>;
  tokenBudget: number;
  sourcePath: string;
  variant: "full" | "slim";
  delegatesTo?: string[];
  parentAgent?: string;
  sdk?: SDKConfiguration;
}

/**
 * Claude Agent SDK AgentDefinition format
 * This is what the SDK expects when defining sub-agents
 */
export interface SDKAgentDefinition {
  /** Natural language description of when to use this agent */
  description: string;

  /** System prompt defining the agent's behavior and expertise */
  prompt: string;

  /** Array of allowed tool names (empty = all tools) */
  tools: SDKTool[];

  /** Model override for this agent */
  model: SDKModel;
}

/**
 * Sub-agent configuration for phase-specialized agents
 */
export interface SubAgentConfig {
  type: SubAgentType;
  model: SDKModel;
  description: string;
  tools: SDKTool[];
  bashRestrictions?: string[];
  promptTemplate: string;
}

/**
 * Generated SDK agent ready for execution
 */
export interface GeneratedSDKAgent {
  /** The main agent definition */
  definition: SDKAgentDefinition;

  /** Phase-specialized sub-agents */
  subAgents: Map<SubAgentType, SDKAgentDefinition>;

  /** Original framework agent metadata */
  frameworkAgent: FrameworkAgentDefinition;

  /** Resolved skills content (all tiers combined - for backward compat) */
  skillsContent: string[];

  /** Essential skills content (Tier 1: pre-loaded) */
  essentialSkillsContent: string[];

  /** Discovered skills content (Tier 2: auto-discovered) */
  discoveredSkillsContent: string[];

  /** Available skill IDs (Tier 3: on-demand reference) */
  availableSkillIds: string[];

  /** Resolved context content */
  contextContent: string[];
}

/**
 * Options for SDK query execution
 */
export interface SDKQueryOptions {
  /** User prompt to send to the agent */
  prompt: string;

  /** Override the default model */
  model?: SDKModel;

  /** Run a specific phase sub-agent instead of the main agent */
  phase?: SubAgentType;

  /** Additional context file paths to include */
  additionalContext?: string[];

  /** Working directory for file operations */
  workingDirectory?: string;

  /** Session ID for resuming previous sessions */
  sessionId?: string;

  /** Dry run mode - generate definition without executing */
  dryRun?: boolean;

  /** Run in autonomous mode without permission prompts */
  autonomous?: boolean;

  /** Permission mode for SDK execution */
  permissionMode?: "default" | "acceptEdits" | "bypassPermissions";
}

/**
 * SDK execution result
 */
export interface SDKExecutionResult {
  /** Whether execution completed successfully */
  success: boolean;

  /** Session ID for resuming */
  sessionId?: string;

  /** Final result text */
  result?: string;

  /** Error message if failed */
  error?: string;

  /** Sub-agents that were invoked */
  subAgentsInvoked?: string[];
}

/**
 * Message types from SDK streaming
 * Re-export from the actual SDK package
 */
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";

/**
 * Alias for SDK message type for our internal use
 */
export type SDKStreamMessage = SDKMessage;

/**
 * Parsed agent markdown content
 */
export interface ParsedAgentContent {
  /** YAML frontmatter */
  frontmatter: Record<string, unknown>;

  /** Agent title from H1 */
  title: string;

  /** Purpose section content */
  purpose: string;

  /** Full markdown body (excluding frontmatter) */
  body: string;

  /** Skill routing table if present */
  skillRoutingTable?: string;
}
