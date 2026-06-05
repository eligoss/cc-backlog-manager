/**
 * Agent MCP Tools
 *
 * MCP tools for managing and running SDK agents.
 */

import { z } from "zod";
import { defineTool } from "../tool-registry.js";
import { successResult, errorResult, ErrorCodes } from "../types.js";
import {
  createSDKGenerator,
  executeAgent,
  executePhase,
  type SDKModel,
} from "../../lib/sdk/index.js";
import { CliContext } from "../../lib/cli-context.js";

/**
 * Schema for agentic_agent_list
 */
const AgentListSchema = z.object({
  path: z.string().default(".").describe("Project path"),
  all: z
    .boolean()
    .default(false)
    .describe("Show all agents, not just SDK-enabled"),
  json: z.boolean().default(false).describe("Output as JSON"),
});

/**
 * List all SDK-enabled agents
 */
export const agentListTool = defineTool(
  "agentic_agent_list",
  "List all SDK-enabled agents available for programmatic execution",
  AgentListSchema,
  async (args) => {
    try {
      const context = await CliContext.create({ path: args.path });
      const generator = await createSDKGenerator(context.projectRoot);

      const agents = await generator.listSDKEnabledAgents();

      if (args.json) {
        return successResult(
          { agents },
          `Found ${agents.length} SDK-enabled agent(s)`,
          JSON.stringify(agents, null, 2),
        );
      }

      // Format as text output
      let output = "";
      if (agents.length === 0) {
        output =
          'No SDK-enabled agents found.\nAdd "sdk.enabled: true" to agents in agents.json to enable SDK execution.';
      } else {
        output = "SDK-Enabled Agents\n";
        output += "─".repeat(60) + "\n";
        for (const agent of agents) {
          output += `  ${agent.id} | ${agent.model}\n`;
        }
        output += "─".repeat(60) + "\n";
        output += `\n${agents.length} agent(s) available\n`;
      }

      return successResult(
        { agents, count: agents.length },
        `Found ${agents.length} SDK-enabled agent(s)`,
        output,
      );
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : String(error),
      );
    }
  },
);

/**
 * Schema for agentic_agent_show
 */
const AgentShowSchema = z.object({
  agentId: z.string().describe("Agent ID to show (e.g., ai-framework-manager)"),
  path: z.string().default(".").describe("Project path"),
  json: z.boolean().default(false).describe("Output as JSON"),
  prompt: z
    .boolean()
    .default(false)
    .describe("Show only the generated system prompt"),
  subAgents: z.boolean().default(false).describe("Show sub-agent definitions"),
});

/**
 * Show SDK definition for an agent
 */
export const agentShowTool = defineTool(
  "agentic_agent_show",
  "Show SDK definition for a specific agent",
  AgentShowSchema,
  async (args) => {
    try {
      const context = await CliContext.create({ path: args.path });
      const generator = await createSDKGenerator(context.projectRoot);

      // Check if agent is SDK-enabled
      const isEnabled = await generator.isSDKEnabled(args.agentId);
      if (!isEnabled && !args.json) {
        // Warning but continue
        console.warn(
          `Warning: Agent '${args.agentId}' is not SDK-enabled. Generating anyway...`,
        );
      }

      const generated = await generator.generateForAgent(args.agentId);

      if (args.json) {
        const output = {
          agentId: args.agentId,
          isSDKEnabled: isEnabled,
          definition: generated.definition,
          subAgents: Object.fromEntries(generated.subAgents),
          frameworkAgent: generated.frameworkAgent,
        };
        return successResult(
          output,
          `Agent SDK definition for ${args.agentId}`,
          JSON.stringify(output, null, 2),
        );
      }

      if (args.prompt) {
        return successResult(
          { prompt: generated.definition.prompt },
          `System prompt for ${args.agentId}`,
          generated.definition.prompt,
        );
      }

      // Format as text output
      let output = `\nAgent: ${args.agentId}\n`;
      output += "─".repeat(60) + "\n";
      output += "\n[SDK Configuration]\n";
      output += `  Enabled:    ${isEnabled ? "Yes" : "No"}\n`;
      output += `  Model:      ${generated.definition.model}\n`;
      output += `  Tools:      ${generated.definition.tools.join(", ")}\n`;
      output += "\n[Framework Metadata]\n";
      output += `  Module:     ${generated.frameworkAgent.moduleId}\n`;
      output += `  Token Budget: ${generated.frameworkAgent.tokenBudget}\n`;
      output += "\n[Capability Needs]\n";
      for (const cap of generated.frameworkAgent.capabilityNeeds) {
        output += `  - ${cap}\n`;
      }
      output += "\n[Skills Loaded]\n";
      output +=
        generated.skillsContent.length > 0
          ? `  ${generated.skillsContent.length} skill(s) loaded\n`
          : "  No skills loaded\n";
      output += "\n[System Prompt Preview]\n";
      output += generated.definition.prompt.substring(0, 500) + "...\n";
      output += "─".repeat(60) + "\n";

      return successResult(
        {
          agentId: args.agentId,
          isSDKEnabled: isEnabled,
          model: generated.definition.model,
          tools: generated.definition.tools,
          skillsCount: generated.skillsContent.length,
        },
        `Agent SDK definition for ${args.agentId}`,
        output,
      );
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : String(error),
      );
    }
  },
);

/**
 * Schema for agentic_agent_run
 */
const AgentRunSchema = z.object({
  agentId: z.string().describe("Agent ID to run (e.g., ai-framework-manager)"),
  prompt: z.string().describe("Initial prompt for the agent"),
  path: z.string().default(".").describe("Project path"),
  model: z
    .enum(["opus", "sonnet", "haiku"])
    .optional()
    .describe("Override model"),
  phase: z
    .enum(["explore", "architect", "reviewer", "implementer"])
    .optional()
    .describe("Run specific phase sub-agent"),
  dryRun: z
    .boolean()
    .default(false)
    .describe("Preview SDK definition without executing"),
  json: z.boolean().default(false).describe("Output as JSON (for dry-run)"),
  context: z
    .array(z.string())
    .optional()
    .describe("Additional context files to include"),
  session: z.string().optional().describe("Resume a previous session"),
});

/**
 * Run an agent with Claude Agent SDK
 */
export const agentRunTool = defineTool(
  "agentic_agent_run",
  "Run an agent with Claude Agent SDK",
  AgentRunSchema,
  async (args) => {
    try {
      const context = await CliContext.create({ path: args.path });
      const generator = await createSDKGenerator(context.projectRoot);

      // Generate SDK definition
      const generated = await generator.generateForAgent(args.agentId);

      // Apply model override if specified
      const model: SDKModel = args.model || generated.definition.model;

      // Handle dry-run mode
      if (args.dryRun) {
        if (args.json) {
          const output = {
            agentId: args.agentId,
            model,
            phase: args.phase || null,
            prompt: args.prompt,
            definition: generated.definition,
            subAgents: Object.fromEntries(generated.subAgents),
            queryOptions: {
              allowedTools: generated.definition.tools,
              agents: args.phase
                ? undefined
                : Object.fromEntries(generated.subAgents),
            },
          };
          return successResult(
            output,
            `Dry run for ${args.agentId}`,
            JSON.stringify(output, null, 2),
          );
        } else {
          let output = "\n[Dry Run] Agent SDK Definition\n";
          output += "─".repeat(60) + "\n";
          output += `\nAgent: ${args.agentId}\n`;
          output += `Model: ${model}\n`;
          output += `Tools: ${generated.definition.tools.join(", ")}\n`;
          if (args.phase) {
            output += `Phase: ${args.phase}\n`;
            const subAgent = generated.subAgents.get(args.phase);
            if (subAgent) {
              output += `Sub-Agent Model: ${subAgent.model}\n`;
              output += `Sub-Agent Tools: ${subAgent.tools.join(", ")}\n`;
            }
          }
          output += `\nPrompt: "${args.prompt}"\n`;
          output += "\nSub-Agents Available:\n";
          if (generated.subAgents.size === 0) {
            output += "  None\n";
          } else {
            for (const [type, def] of generated.subAgents) {
              output += `  - ${type} (${def.model})\n`;
            }
          }
          output += "\nSystem Prompt Size:\n";
          output += `  ${generated.definition.prompt.length} characters\n`;
          output += "─".repeat(60) + "\n";

          return successResult(
            {
              agentId: args.agentId,
              model,
              phase: args.phase,
              promptLength: generated.definition.prompt.length,
              subAgentsCount: generated.subAgents.size,
            },
            `Dry run for ${args.agentId}`,
            output,
          );
        }
      }

      // Check if SDK-enabled
      const isEnabled = await generator.isSDKEnabled(args.agentId);
      if (!isEnabled) {
        return errorResult(
          ErrorCodes.PERMISSION_DENIED,
          `Agent '${args.agentId}' is not SDK-enabled`,
          'Add "sdk.enabled: true" to this agent in agents.json to enable execution.',
        );
      }

      // Execute the agent
      const executionOptions = {
        prompt: args.prompt,
        model,
        phase: args.phase,
        workingDirectory: context.projectRoot,
        sessionId: args.session,
        additionalContext: args.context,
      };

      let result;
      if (args.phase) {
        // Execute specific phase sub-agent
        result = await executePhase(generated, args.phase, args.prompt);
      } else {
        // Execute main agent with all sub-agents available
        result = await executeAgent(generated, executionOptions);
      }

      // Handle execution result
      if (!result.success) {
        return errorResult(
          ErrorCodes.COMMAND_FAILED,
          `Execution failed: ${result.error}`,
        );
      }

      return successResult(
        {
          agentId: args.agentId,
          model,
          phase: args.phase,
          sessionId: result.sessionId,
          subAgentsInvoked: result.subAgentsInvoked || [],
        },
        `Agent ${args.agentId} executed successfully`,
        `Execution completed${result.sessionId ? ` (session: ${result.sessionId})` : ""}`,
      );
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : String(error),
      );
    }
  },
);

/**
 * Export all agent tools
 */
export const agentTools = [agentListTool, agentShowTool, agentRunTool];
