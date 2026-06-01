/**
 * SDK Executor
 *
 * Wraps the Claude Agent SDK query API and handles agent execution.
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import type {
  SDKQueryOptions,
  SDKExecutionResult,
  GeneratedSDKAgent,
  SubAgentType,
  SDKAgentDefinition,
} from "./types.js";
import { handleStreamMessage, type MessageHandler } from "./message-handler.js";

/**
 * Execute an agent using the Claude Agent SDK
 *
 * @param generated - Generated SDK agent with sub-agents
 * @param options - Query options (prompt, model override, etc.)
 * @param messageHandler - Optional custom message handler
 * @returns Execution result with session info
 */
export async function executeAgent(
  generated: GeneratedSDKAgent,
  options: SDKQueryOptions,
  messageHandler?: MessageHandler,
): Promise<SDKExecutionResult> {
  try {
    // Determine which agent to execute
    const agentDef = options.phase
      ? generated.subAgents.get(options.phase)
      : generated.definition;

    if (!agentDef) {
      throw new Error(
        `Sub-agent '${options.phase}' not found. Available: ${Array.from(generated.subAgents.keys()).join(", ")}`,
      );
    }

    // Apply model override if specified
    const model = options.model ?? agentDef.model;

    // Build sub-agents map for SDK (only if not running a phase)
    const subAgentsForSDK: Record<string, SDKAgentDefinition> = {};
    if (!options.phase && generated.subAgents.size > 0) {
      for (const [type, def] of generated.subAgents) {
        subAgentsForSDK[type] = def;
      }
    }

    // Filter tools for autonomous mode (remove user interaction)
    const tools = options.autonomous
      ? agentDef.tools.filter((t) => t !== "AskUserQuestion")
      : agentDef.tools;

    // Prepare SDK query options
    const sdkOptions = {
      allowedTools: tools,
      model,
      ...(Object.keys(subAgentsForSDK).length > 0 && {
        agents: subAgentsForSDK,
      }),
      ...(options.workingDirectory && {
        workingDirectory: options.workingDirectory,
      }),
      ...(options.sessionId && { sessionId: options.sessionId }),
      ...(options.permissionMode && { permissionMode: options.permissionMode }),
    };

    // Track execution state
    let finalResult = "";
    let sessionId: string | undefined;
    const subAgentsInvoked: string[] = [];

    // Execute query with streaming
    for await (const message of query({
      prompt: options.prompt,
      options: sdkOptions,
    })) {
      // Handle message using the message handler
      const handlerFn = messageHandler ?? handleStreamMessage;
      const handled = handlerFn(message);

      // Track session ID if present
      if (message.session_id) {
        sessionId = message.session_id;
      }

      // Track sub-agent invocations from assistant messages
      if (message.type === "assistant") {
        const content = message.message.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "tool_use" && block.name === "Task") {
              const toolInput = block.input as Record<string, unknown>;
              if (toolInput?.subagent_type) {
                const subAgentType = toolInput.subagent_type as string;
                if (!subAgentsInvoked.includes(subAgentType)) {
                  subAgentsInvoked.push(subAgentType);
                }
              }
            }
          }
        }
      }

      // Capture final result
      if (message.type === "result" && message.subtype === "success") {
        finalResult = message.result;
      }

      // If handler returned false, stop execution
      if (handled === false) {
        break;
      }
    }

    return {
      success: true,
      sessionId,
      result: finalResult,
      subAgentsInvoked,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Resume a previous agent session
 *
 * @param sessionId - Session ID to resume
 * @param generated - Generated SDK agent
 * @param prompt - New prompt to continue with
 * @param messageHandler - Optional custom message handler
 * @returns Execution result
 */
export async function resumeAgentSession(
  sessionId: string,
  generated: GeneratedSDKAgent,
  prompt: string,
  messageHandler?: MessageHandler,
): Promise<SDKExecutionResult> {
  return executeAgent(
    generated,
    {
      prompt,
      sessionId,
    },
    messageHandler,
  );
}

/**
 * Execute a specific phase sub-agent
 *
 * @param generated - Generated SDK agent with sub-agents
 * @param phase - Phase to execute (explore, architect, reviewer, implementer)
 * @param prompt - Prompt for the sub-agent
 * @param messageHandler - Optional custom message handler
 * @returns Execution result
 */
export async function executePhase(
  generated: GeneratedSDKAgent,
  phase: SubAgentType,
  prompt: string,
  messageHandler?: MessageHandler,
): Promise<SDKExecutionResult> {
  return executeAgent(
    generated,
    {
      prompt,
      phase,
    },
    messageHandler,
  );
}
