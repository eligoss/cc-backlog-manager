/**
 * SDK Message Handler
 *
 * Handles streaming messages from Claude Agent SDK query execution.
 * Provides colorized console output and structured message processing.
 */

import chalk from 'chalk';
import type { SDKStreamMessage } from './types.js';

/**
 * Message handler function type
 * Returns false to stop execution, true/undefined to continue
 */
export type MessageHandler = (message: SDKStreamMessage) => boolean | void;

/**
 * Default message handler with colorized console output
 *
 * @param message - Streaming message from SDK
 * @returns true to continue, false to stop
 */
export function handleStreamMessage(message: SDKStreamMessage): boolean {
  switch (message.type) {
    case 'system':
      handleSystemMessage(message);
      break;

    case 'assistant':
      handleAssistantMessage(message);
      break;

    case 'user':
      // User messages are typically replays, skip them in output
      break;

    case 'result':
      handleResult(message);
      break;

    case 'stream_event':
      // Stream events are raw API events, handled by assistant message
      break;

    default:
      // Unknown message type - log for debugging
      console.log(chalk.dim(`[${message.type}]`));
  }

  return true; // Continue execution
}

/**
 * Handle system messages (initialization, status, etc.)
 */
function handleSystemMessage(message: SDKStreamMessage): void {
  if (message.type !== 'system') return;

  if (message.subtype === 'init') {
    console.log(chalk.dim('\n[System] Initialized'));
    console.log(chalk.dim(`  Model: ${message.model}`));
    console.log(chalk.dim(`  Tools: ${message.tools.length}`));
    if (message.agents && message.agents.length > 0) {
      console.log(chalk.dim(`  Sub-agents: ${message.agents.join(', ')}`));
    }
  } else if (message.subtype === 'status') {
    if (message.status) {
      console.log(chalk.yellow(`\n[Status] ${message.status}`));
    }
  } else if (message.subtype === 'compact_boundary') {
    console.log(chalk.dim('\n[System] Compacting conversation history'));
  }
}

/**
 * Handle assistant messages (AI responses with tool uses)
 */
function handleAssistantMessage(message: SDKStreamMessage): void {
  if (message.type !== 'assistant') return;

  const content = message.message.content;

  if (Array.isArray(content)) {
    for (const block of content) {
      if (block.type === 'text') {
        // Assistant text response
        console.log(chalk.white('\n' + block.text));
      } else if (block.type === 'tool_use') {
        // Tool invocation
        handleToolUse(block.name, block.input as Record<string, unknown>);
      }
    }
  }

  // Show error if present
  if (message.error) {
    console.error(chalk.red(`\n[Error] ${message.error}`));
  }
}

/**
 * Handle tool use (function calls)
 */
function handleToolUse(toolName: string, toolInput: Record<string, unknown>): void {
  // Show tool invocation
  console.log(chalk.cyan('\n[Tool]'), chalk.bold(toolName));

  // Special formatting for common tools
  if (toolName === 'Read' && toolInput.file_path) {
    console.log(chalk.dim(`  Reading: ${toolInput.file_path}`));
  } else if (toolName === 'Write' && toolInput.file_path) {
    console.log(chalk.dim(`  Writing: ${toolInput.file_path}`));
  } else if (toolName === 'Edit' && toolInput.file_path) {
    console.log(chalk.dim(`  Editing: ${toolInput.file_path}`));
  } else if (toolName === 'Bash' && toolInput.command) {
    console.log(chalk.dim(`  Running: ${toolInput.command}`));
  } else if (toolName === 'Task') {
    const subagentType = toolInput.subagent_type as string;
    console.log(chalk.magenta(`  Delegating to sub-agent: ${subagentType}`));
    if (toolInput.prompt) {
      const promptStr = String(toolInput.prompt);
      const truncated = promptStr.length > 100 ? promptStr.substring(0, 97) + '...' : promptStr;
      console.log(chalk.dim(`  Prompt: ${truncated}`));
    }
  } else {
    // Generic tool input display
    const inputKeys = Object.keys(toolInput);
    if (inputKeys.length > 0 && inputKeys.length <= 3) {
      console.log(chalk.dim(`  Input: ${inputKeys.join(', ')}`));
    }
  }
}

/**
 * Handle final result
 */
function handleResult(message: SDKStreamMessage): void {
  if (message.type !== 'result') return;

  console.log(chalk.dim('\n' + '─'.repeat(60)));
  console.log(chalk.bold.green('\n[Result]'));

  if (message.subtype === 'success') {
    console.log(chalk.white(message.result));

    // Show usage statistics
    console.log(chalk.dim('\n[Statistics]'));
    console.log(chalk.dim(`  Turns: ${message.num_turns}`));
    console.log(chalk.dim(`  Duration: ${(message.duration_ms / 1000).toFixed(2)}s`));
    console.log(chalk.dim(`  Cost: $${message.total_cost_usd.toFixed(4)}`));

    if (message.permission_denials.length > 0) {
      console.log(chalk.yellow(`  Permission denials: ${message.permission_denials.length}`));
    }
  } else {
    // Error result
    console.log(chalk.red(`Error: ${message.subtype}`));
    if ('errors' in message && message.errors) {
      for (const error of message.errors) {
        console.log(chalk.red(`  - ${error}`));
      }
    }
  }

  console.log(chalk.dim(`\nSession ID: ${message.session_id}`));
  console.log(chalk.dim('Use --session <id> to resume this session'));
  console.log(chalk.dim('\n' + '─'.repeat(60)));
}

/**
 * Create a custom message handler with options
 *
 * @param options - Handler configuration
 * @returns Message handler function
 */
export function createMessageHandler(options: {
  showSystemMessages?: boolean;
  showToolDetails?: boolean;
  quiet?: boolean;
  onToolUse?: (toolName: string, input: Record<string, unknown>) => void;
  onResult?: (result: string) => void;
}): MessageHandler {
  return (message: SDKStreamMessage) => {
    // Quiet mode - only show results
    if (options.quiet && message.type !== 'result') {
      return true;
    }

    // Custom callbacks
    if (message.type === 'assistant') {
      const content = message.message.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'tool_use' && options.onToolUse) {
            options.onToolUse(block.name, block.input as Record<string, unknown>);
          }
        }
      }
    }

    if (message.type === 'result' && message.subtype === 'success' && options.onResult) {
      options.onResult(message.result);
    }

    // Apply filtering based on options
    if (!options.showSystemMessages && message.type === 'system') {
      return true;
    }

    if (!options.showToolDetails && message.type === 'assistant') {
      // Show simplified assistant message without tool details
      const content = message.message.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'text') {
            console.log(chalk.white('\n' + block.text));
          } else if (block.type === 'tool_use') {
            console.log(chalk.cyan(`[Tool] ${block.name}`));
          }
        }
      }
      return true;
    }

    // Use default handler
    return handleStreamMessage(message);
  };
}

/**
 * Silent message handler that collects results without console output
 *
 * @param onMessage - Optional callback for each message
 * @returns Message handler
 */
export function createSilentHandler(
  onMessage?: (message: SDKStreamMessage) => void
): MessageHandler {
  return (message: SDKStreamMessage) => {
    if (onMessage) {
      onMessage(message);
    }
    return true;
  };
}
