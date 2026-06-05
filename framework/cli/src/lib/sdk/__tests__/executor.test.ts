/**
 * Unit tests for SDK executor
 */

import { executeAgent, executePhase, resumeAgentSession } from '../executor.js';
import type { GeneratedSDKAgent, SDKStreamMessage } from '../types.js';
import { query } from '@anthropic-ai/claude-agent-sdk';

// Mock the SDK
jest.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: jest.fn(),
}));

describe('SDK Executor', () => {
  let mockGenerated: GeneratedSDKAgent;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock generated agent
    mockGenerated = {
      definition: {
        description: 'Test agent',
        prompt: 'You are a test agent',
        tools: ['Read', 'Write', 'Edit'],
        model: 'sonnet',
      },
      subAgents: new Map([
        [
          'explore',
          {
            description: 'Explore sub-agent',
            prompt: 'You explore code',
            tools: ['Read', 'Glob', 'Grep'],
            model: 'haiku',
          },
        ],
        [
          'implementer',
          {
            description: 'Implementer sub-agent',
            prompt: 'You implement changes',
            tools: ['Read', 'Write', 'Edit'],
            model: 'sonnet',
          },
        ],
      ]),
      frameworkAgent: {
        id: 'test-agent',
        moduleId: 'test',
        capabilityNeeds: [],
        tokenBudget: 1000,
        sourcePath: '/test/agent.md',
        variant: 'full',
      },
      skillsContent: [],
      essentialSkillsContent: [],
      discoveredSkillsContent: [],
      availableSkillIds: [],
      contextContent: [],
    };
  });

  describe('executeAgent', () => {
    it('should execute agent with basic prompt', async () => {
      // Mock SDK response with correct message structure
      const mockMessages: SDKStreamMessage[] = [
        {
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'Working on it...' }] }
        } as any,
        {
          type: 'result',
          subtype: 'success',
          result: 'Task completed',
          session_id: 'test-session-123',
          num_turns: 1,
          duration_ms: 1000,
          total_cost_usd: 0.01,
          permission_denials: [],
        } as any,
      ];

      (query as jest.Mock).mockImplementation(async function* () {
        for (const msg of mockMessages) {
          yield msg;
        }
      });

      const result = await executeAgent(mockGenerated, {
        prompt: 'Test task',
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe('Task completed');
      expect(result.sessionId).toBe('test-session-123');
      expect(query).toHaveBeenCalledWith({
        prompt: 'Test task',
        options: expect.objectContaining({
          allowedTools: ['Read', 'Write', 'Edit'],
          model: 'sonnet',
        }),
      });
    });

    it('should include sub-agents when not running a phase', async () => {
      const mockMessages: SDKStreamMessage[] = [
        {
          type: 'result',
          subtype: 'success',
          result: 'Done',
          session_id: 's1',
          num_turns: 1,
          duration_ms: 100,
          total_cost_usd: 0.01,
          permission_denials: [],
        } as any,
      ];

      (query as jest.Mock).mockImplementation(async function* () {
        for (const msg of mockMessages) {
          yield msg;
        }
      });

      await executeAgent(mockGenerated, {
        prompt: 'Test with sub-agents',
      });

      const callArgs = (query as jest.Mock).mock.calls[0][0];
      expect(callArgs.options.agents).toBeDefined();
      expect(Object.keys(callArgs.options.agents)).toContain('explore');
      expect(Object.keys(callArgs.options.agents)).toContain('implementer');
    });

    it('should override model when specified', async () => {
      const mockMessages: SDKStreamMessage[] = [
        {
          type: 'result',
          subtype: 'success',
          result: 'Done',
          session_id: 's1',
          num_turns: 1,
          duration_ms: 100,
          total_cost_usd: 0.01,
          permission_denials: [],
        } as any,
      ];

      (query as jest.Mock).mockImplementation(async function* () {
        for (const msg of mockMessages) {
          yield msg;
        }
      });

      await executeAgent(mockGenerated, {
        prompt: 'Test',
        model: 'opus',
      });

      expect(query).toHaveBeenCalledWith({
        prompt: 'Test',
        options: expect.objectContaining({
          model: 'opus',
        }),
      });
    });

    it('should track sub-agent invocations from assistant messages', async () => {
      // Messages with assistant type containing Task tool_use blocks
      const mockMessages: SDKStreamMessage[] = [
        {
          type: 'assistant',
          message: {
            content: [
              {
                type: 'tool_use',
                name: 'Task',
                input: { subagent_type: 'explore', prompt: 'Find files' }
              }
            ]
          }
        } as any,
        {
          type: 'assistant',
          message: {
            content: [
              {
                type: 'tool_use',
                name: 'Task',
                input: { subagent_type: 'implementer', prompt: 'Make changes' }
              }
            ]
          }
        } as any,
        {
          type: 'result',
          subtype: 'success',
          result: 'Done',
          session_id: 's1',
          num_turns: 3,
          duration_ms: 5000,
          total_cost_usd: 0.03,
          permission_denials: [],
        } as any,
      ];

      (query as jest.Mock).mockImplementation(async function* () {
        for (const msg of mockMessages) {
          yield msg;
        }
      });

      const result = await executeAgent(mockGenerated, {
        prompt: 'Complex task',
      });

      expect(result.subAgentsInvoked).toEqual(['explore', 'implementer']);
    });

    it('should handle execution errors', async () => {
      (query as jest.Mock).mockImplementation(async function* () {
        throw new Error('SDK error');
      });

      const result = await executeAgent(mockGenerated, {
        prompt: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('SDK error');
    });

    it('should stop execution when handler returns false', async () => {
      const mockMessages: SDKStreamMessage[] = [
        { type: 'assistant', message: { content: [{ type: 'text', text: 'Step 1' }] } } as any,
        { type: 'assistant', message: { content: [{ type: 'text', text: 'Step 2' }] } } as any,
        {
          type: 'result',
          subtype: 'success',
          result: 'Done',
          session_id: 's1',
          num_turns: 2,
          duration_ms: 200,
          total_cost_usd: 0.02,
          permission_denials: [],
        } as any,
      ];

      (query as jest.Mock).mockImplementation(async function* () {
        for (const msg of mockMessages) {
          yield msg;
        }
      });

      let messageCount = 0;
      const customHandler = () => {
        messageCount++;
        return messageCount < 2; // Return false on second message to stop
      };

      await executeAgent(mockGenerated, { prompt: 'Test' }, customHandler);

      // Should have processed exactly 2 messages before stopping
      expect(messageCount).toBe(2);
    });
  });

  describe('executePhase', () => {
    it('should execute specific phase sub-agent', async () => {
      const mockMessages: SDKStreamMessage[] = [
        {
          type: 'result',
          subtype: 'success',
          result: 'Exploration complete',
          session_id: 's1',
          num_turns: 1,
          duration_ms: 100,
          total_cost_usd: 0.01,
          permission_denials: [],
        } as any,
      ];

      (query as jest.Mock).mockImplementation(async function* () {
        for (const msg of mockMessages) {
          yield msg;
        }
      });

      const result = await executePhase(mockGenerated, 'explore', 'Find config files');

      expect(result.success).toBe(true);
      expect(query).toHaveBeenCalledWith({
        prompt: 'Find config files',
        options: expect.objectContaining({
          allowedTools: ['Read', 'Glob', 'Grep'],
          model: 'haiku',
        }),
      });
    });

    it('should error if phase not found', async () => {
      (query as jest.Mock).mockImplementation(async function* () {
        yield {
          type: 'result',
          subtype: 'success',
          result: 'Should not reach here',
          session_id: 's1',
          num_turns: 1,
          duration_ms: 100,
          total_cost_usd: 0.01,
          permission_denials: [],
        };
      });

      const result = await executePhase(
        mockGenerated,
        'nonexistent' as any,
        'Test'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('resumeAgentSession', () => {
    it('should resume session with session ID', async () => {
      const mockMessages: SDKStreamMessage[] = [
        {
          type: 'result',
          subtype: 'success',
          result: 'Resumed successfully',
          session_id: 'existing-session',
          num_turns: 2,
          duration_ms: 200,
          total_cost_usd: 0.02,
          permission_denials: [],
        } as any,
      ];

      (query as jest.Mock).mockImplementation(async function* () {
        for (const msg of mockMessages) {
          yield msg;
        }
      });

      const result = await resumeAgentSession(
        'existing-session',
        mockGenerated,
        'Continue task'
      );

      expect(result.success).toBe(true);
      expect(query).toHaveBeenCalledWith({
        prompt: 'Continue task',
        options: expect.objectContaining({
          sessionId: 'existing-session',
        }),
      });
    });
  });
});
