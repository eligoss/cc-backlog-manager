/**
 * Unit tests for SDK message handler
 */

import {
  handleStreamMessage,
  createMessageHandler,
  createSilentHandler,
} from '../message-handler.js';
import type { SDKStreamMessage } from '../types.js';

// Mock chalk to avoid ANSI codes and support chained methods
jest.mock('chalk', () => {
  const createChainedMock = (fn: (str: string) => string): any => {
    const chainable = new Proxy(fn, {
      get: (target, prop) => {
        if (typeof prop === 'string') {
          return createChainedMock(fn);
        }
        return target[prop as keyof typeof target];
      },
      apply: (target, thisArg, args) => {
        return target.apply(thisArg, args);
      }
    });
    return chainable;
  };

  const identity = (str: string) => str;
  const mock = createChainedMock(identity);

  return {
    __esModule: true,
    default: mock,
    red: identity,
    green: identity,
    cyan: identity,
    yellow: identity,
    white: identity,
    dim: identity,
    bold: mock,
    magenta: identity,
  };
});

describe('Message Handler', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('handleStreamMessage', () => {
    it('should handle system init messages', () => {
      const message: SDKStreamMessage = {
        type: 'system',
        subtype: 'init',
        model: 'opus',
        tools: ['Read', 'Write'],
        agents: [],
      } as any;

      const result = handleStreamMessage(message);

      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle system status messages', () => {
      const message: SDKStreamMessage = {
        type: 'system',
        subtype: 'status',
        status: 'Processing...',
      } as any;

      handleStreamMessage(message);

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle assistant messages with text content', () => {
      const message: SDKStreamMessage = {
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'I will help you with that.' }
          ]
        }
      } as any;

      handleStreamMessage(message);

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle assistant messages with tool use', () => {
      const message: SDKStreamMessage = {
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'Read',
              input: { file_path: '/test/file.ts' }
            }
          ]
        }
      } as any;

      handleStreamMessage(message);

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle assistant messages with Task tool (sub-agent delegation)', () => {
      const message: SDKStreamMessage = {
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'Task',
              input: {
                subagent_type: 'explore',
                prompt: 'Find all TypeScript files',
              }
            }
          ]
        }
      } as any;

      handleStreamMessage(message);

      // Should log tool use with explore subagent
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle result messages with success', () => {
      const message: SDKStreamMessage = {
        type: 'result',
        subtype: 'success',
        result: 'Task completed successfully',
        session_id: 'test-session-123',
        num_turns: 5,
        duration_ms: 10000,
        total_cost_usd: 0.05,
        permission_denials: [],
      } as any;

      handleStreamMessage(message);

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle result messages with error', () => {
      const message: SDKStreamMessage = {
        type: 'result',
        subtype: 'error',
        session_id: 'test-session-123',
        errors: ['Something went wrong'],
      } as any;

      handleStreamMessage(message);

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should always return true to continue execution', () => {
      const messages: SDKStreamMessage[] = [
        { type: 'system', subtype: 'init', model: 'opus', tools: [], agents: [] } as any,
        { type: 'assistant', message: { content: [{ type: 'text', text: 'test' }] } } as any,
        { type: 'result', subtype: 'success', result: 'done', session_id: 's1', num_turns: 1, duration_ms: 100, total_cost_usd: 0.01, permission_denials: [] } as any,
      ];

      messages.forEach((msg) => {
        expect(handleStreamMessage(msg)).toBe(true);
      });
    });

    it('should handle unknown message types', () => {
      const message: SDKStreamMessage = {
        type: 'unknown_type' as any,
      } as any;

      const result = handleStreamMessage(message);

      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('createMessageHandler', () => {
    it('should filter out system messages when showSystemMessages is false', () => {
      const handler = createMessageHandler({ showSystemMessages: false });

      const message: SDKStreamMessage = {
        type: 'system',
        subtype: 'init',
        model: 'opus',
        tools: [],
        agents: [],
      } as any;

      handler(message);

      // System message should not be logged
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should call onToolUse callback for tool_use blocks', () => {
      const onToolUse = jest.fn();
      const handler = createMessageHandler({ onToolUse });

      const message: SDKStreamMessage = {
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'Write',
              input: { file_path: '/test.ts', content: 'code' }
            }
          ]
        }
      } as any;

      handler(message);

      expect(onToolUse).toHaveBeenCalledWith('Write', {
        file_path: '/test.ts',
        content: 'code',
      });
    });

    it('should call onResult callback on success result', () => {
      const onResult = jest.fn();
      const handler = createMessageHandler({ onResult });

      const message: SDKStreamMessage = {
        type: 'result',
        subtype: 'success',
        result: 'All done',
        session_id: 's1',
        num_turns: 1,
        duration_ms: 100,
        total_cost_usd: 0.01,
        permission_denials: [],
      } as any;

      handler(message);

      expect(onResult).toHaveBeenCalledWith('All done');
    });

    it('should support quiet mode - suppress non-result messages', () => {
      const handler = createMessageHandler({ quiet: true });

      // Non-result messages should be suppressed
      handler({ type: 'assistant', message: { content: [{ type: 'text', text: 'Working...' }] } } as any);

      expect(consoleLogSpy).not.toHaveBeenCalled();

      // Result should still be shown
      handler({
        type: 'result',
        subtype: 'success',
        result: 'Done',
        session_id: 's1',
        num_turns: 1,
        duration_ms: 100,
        total_cost_usd: 0.01,
        permission_denials: [],
      } as any);

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should simplify tool details when showToolDetails is false', () => {
      const handler = createMessageHandler({ showToolDetails: false });

      const message: SDKStreamMessage = {
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'Read',
              input: { file_path: '/very/long/path/to/file.ts' }
            }
          ]
        }
      } as any;

      handler(message);

      // Should show tool name but simplified
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('createSilentHandler', () => {
    it('should not produce any console output', () => {
      const handler = createSilentHandler();

      const messages: SDKStreamMessage[] = [
        { type: 'system', subtype: 'init', model: 'opus', tools: [], agents: [] } as any,
        { type: 'assistant', message: { content: [{ type: 'text', text: 'test' }] } } as any,
        { type: 'result', subtype: 'success', result: 'done', session_id: 's1', num_turns: 1, duration_ms: 100, total_cost_usd: 0.01, permission_denials: [] } as any,
      ];

      messages.forEach((msg) => handler(msg));

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should call onMessage callback for each message', () => {
      const onMessage = jest.fn();
      const handler = createSilentHandler(onMessage);

      const messages: SDKStreamMessage[] = [
        { type: 'assistant', message: { content: [{ type: 'text', text: 'msg1' }] } } as any,
        { type: 'result', subtype: 'success', result: 'msg2', session_id: 's1', num_turns: 1, duration_ms: 100, total_cost_usd: 0.01, permission_denials: [] } as any,
      ];

      messages.forEach((msg) => handler(msg));

      expect(onMessage).toHaveBeenCalledTimes(2);
      expect(onMessage).toHaveBeenCalledWith(messages[0]);
      expect(onMessage).toHaveBeenCalledWith(messages[1]);
    });

    it('should always return true', () => {
      const handler = createSilentHandler();

      expect(handler({ type: 'system', subtype: 'init', model: 'opus', tools: [], agents: [] } as any)).toBe(true);
      expect(handler({ type: 'result', subtype: 'success', result: 'done', session_id: 's1', num_turns: 1, duration_ms: 100, total_cost_usd: 0.01, permission_denials: [] } as any)).toBe(true);
    });
  });
});
