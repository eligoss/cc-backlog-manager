/**
 * Phase-Specialized Sub-Agent Configurations
 *
 * These sub-agents are designed for specific phases of the development workflow:
 * - explore: Read-only codebase discovery
 * - architect: Design and planning
 * - reviewer: Quality validation
 * - implementer: Execute changes
 */

import type {
  SubAgentConfig,
  SubAgentType,
  SDKTool,
  SDKAgentDefinition,
} from "./types.js";

/**
 * Sub-agent configurations keyed by type
 */
export const SUB_AGENT_CONFIGS: Record<SubAgentType, SubAgentConfig> = {
  explore: {
    type: "explore",
    model: "haiku",
    description:
      "Read-only codebase exploration and discovery. Use for finding files, understanding code structure, and gathering context without making changes.",
    tools: ["Read", "Glob", "Grep"] as SDKTool[],
    promptTemplate: `You are an Explore sub-agent specialized in codebase discovery.

## Your Role
You perform read-only exploration to discover relevant files, patterns, and structures.

## Capabilities
- Search for files by pattern (Glob)
- Search for content within files (Grep)
- Read file contents (Read)

## Critical Constraints
- You have READ-ONLY access
- Do NOT attempt to modify any files
- Do NOT use Edit, Write, or Bash tools
- Report findings to the orchestrating agent

## Task
Explore the codebase to understand the requested aspect. Return:
1. List of relevant files discovered
2. Key patterns or structures found
3. Summary of findings

{{parentContext}}`,
  },

  architect: {
    type: "architect",
    model: "sonnet",
    description:
      "Design and planning phase agent. Use for creating implementation plans, designing APIs, and proposing architectural changes.",
    tools: ["Read", "Glob", "Grep", "Bash"] as SDKTool[],
    bashRestrictions: [
      "ls",
      "git status",
      "git log",
      "git diff",
      "npm list",
      "tree",
    ],
    promptTemplate: `You are an Architect sub-agent specialized in design and planning.

## Your Role
You design implementation approaches, create technical specifications, and plan file changes.

## Capabilities
- Read and analyze existing code
- Search for patterns and dependencies
- Run read-only commands (git status, npm list, etc.)
- Create detailed implementation plans

## Critical Constraints
- You plan changes but do NOT execute them
- Bash is restricted to read-only commands
- Do NOT use Edit or Write tools
- Produce structured design documents

## Output Format
Provide your design as:
1. Overview of proposed changes
2. Files to create or modify (with rationale)
3. Implementation sequence
4. Potential risks or considerations

{{parentContext}}`,
  },

  reviewer: {
    type: "reviewer",
    model: "sonnet",
    description:
      "Quality validation and code review agent. Use for reviewing changes, running tests, and validating implementations.",
    tools: ["Read", "Glob", "Grep", "Bash"] as SDKTool[],
    bashRestrictions: [
      "npm test",
      "npm run lint",
      "npm run build",
      "git diff",
      "tsc --noEmit",
      "npx jest",
    ],
    promptTemplate: `You are a Reviewer sub-agent specialized in quality validation.

## Your Role
You validate implementations against requirements, run tests, and identify issues.

## Capabilities
- Read and analyze code changes
- Run tests and linting (npm test, npm run lint)
- Check TypeScript compilation (tsc --noEmit)
- Review git diffs

## Critical Constraints
- You validate but do NOT fix issues directly
- Report issues for the implementer to fix
- Do NOT use Edit or Write tools
- Focus on correctness, not style preferences

## Output Format
Provide your review as:
1. Summary of validation results
2. Issues found (if any) with severity
3. Tests that passed/failed
4. Recommendations for fixes

{{parentContext}}`,
  },

  implementer: {
    type: "implementer",
    model: "sonnet",
    description:
      "Implementation execution agent. Use for executing planned changes, creating files, and running build commands.",
    tools: [
      "Read",
      "Write",
      "Edit",
      "Glob",
      "Grep",
      "Bash",
      "TodoWrite",
    ] as SDKTool[],
    promptTemplate: `You are an Implementer sub-agent specialized in executing changes.

## Your Role
You execute planned changes according to provided specifications.

## Capabilities
- Read existing code
- Write new files
- Edit existing files
- Run build and test commands
- Track progress with TodoWrite

## Critical Constraints
- Follow the provided design specification exactly
- Do NOT deviate from the plan without explicit approval
- Test changes after implementation
- Report completion status clearly

## Output Format
After implementation:
1. List of files created or modified
2. Commands executed
3. Test results
4. Any issues encountered

{{parentContext}}`,
  },
};

/**
 * Get sub-agent configuration by type
 */
export function getSubAgentConfig(type: SubAgentType): SubAgentConfig {
  return SUB_AGENT_CONFIGS[type];
}

/**
 * Generate SDK AgentDefinition from sub-agent config
 *
 * @param config - Sub-agent configuration
 * @param parentContext - Context from the parent agent to inject
 * @returns SDK-compatible agent definition
 */
export function generateSubAgentDefinition(
  config: SubAgentConfig,
  parentContext: string,
): SDKAgentDefinition {
  return {
    description: config.description,
    prompt: config.promptTemplate.replace("{{parentContext}}", parentContext),
    tools: config.tools,
    model: config.model,
  };
}

/**
 * Generate all sub-agent definitions for a parent agent
 *
 * @param types - Array of sub-agent types to generate
 * @param parentContext - Context from the parent agent
 * @returns Map of sub-agent type to SDK definition
 */
export function generateAllSubAgents(
  types: SubAgentType[],
  parentContext: string,
): Map<SubAgentType, SDKAgentDefinition> {
  const subAgents = new Map<SubAgentType, SDKAgentDefinition>();

  for (const type of types) {
    const config = getSubAgentConfig(type);
    subAgents.set(type, generateSubAgentDefinition(config, parentContext));
  }

  return subAgents;
}

/**
 * Get default tools for agents
 */
export function getDefaultTools(): SDKTool[] {
  return [
    "Read",
    "Write",
    "Edit",
    "Glob",
    "Grep",
    "Bash",
    "Task",
    "TodoWrite",
    "AskUserQuestion",
  ];
}

/**
 * Get default tools for autonomous mode (no user interaction)
 */
export function getDefaultToolsAutonomous(): SDKTool[] {
  return ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "Task", "TodoWrite"];
}

/**
 * Get default model for agents
 */
export function getDefaultModel(): "opus" | "sonnet" {
  return "sonnet";
}

/** @deprecated Use getDefaultTools() instead */
export function getDefaultToolsForVariant(_variant?: string): SDKTool[] {
  return getDefaultTools();
}

/** @deprecated Use getDefaultModel() instead */
export function getDefaultModelForVariant(
  _variant?: string,
): "opus" | "sonnet" {
  return getDefaultModel();
}
