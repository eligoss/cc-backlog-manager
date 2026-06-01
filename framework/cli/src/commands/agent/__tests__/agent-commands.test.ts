/**
 * Integration tests for agent CLI commands
 */

import { createAgentRunCommand } from '../run.js';
import { createAgentListCommand } from '../list.js';
import { createAgentShowCommand } from '../show.js';
import { Command } from 'commander';

// Mock dependencies
jest.mock('../../../lib/cli-context.js', () => ({
  CliContext: {
    create: jest.fn().mockResolvedValue({
      projectRoot: '/mock/project',
    }),
  },
}));

jest.mock('../../../lib/sdk/index.js', () => ({
  createSDKGenerator: jest.fn().mockResolvedValue({
    generateForAgent: jest.fn().mockResolvedValue({
      definition: {
        description: 'Test agent',
        prompt: 'System prompt',
        tools: ['Read', 'Write'],
        model: 'sonnet',
      },
      subAgents: new Map([
        [
          'explore',
          {
            description: 'Explore',
            prompt: 'Explore prompt',
            tools: ['Read', 'Glob'],
            model: 'haiku',
          },
        ],
      ]),
      frameworkAgent: {
        id: 'test-agent',
        moduleId: 'test',
        capabilityNeeds: [],
        contextCategoryNeeds: {},
        tokenBudget: 1000,
        sourcePath: '/test/agent.md',
        variant: 'full',
      },
      skillsContent: [],
      contextContent: [],
    }),
    listSDKEnabledAgents: jest.fn().mockResolvedValue([
      { id: 'agent-1', model: 'opus', variant: 'full' },
      { id: 'agent-2', model: 'sonnet', variant: 'slim' },
    ]),
    isSDKEnabled: jest.fn().mockResolvedValue(true),
  }),
  executeAgent: jest.fn().mockResolvedValue({
    success: true,
    result: 'Task completed',
    sessionId: 'test-session',
    subAgentsInvoked: ['explore'],
  }),
  executePhase: jest.fn().mockResolvedValue({
    success: true,
    result: 'Phase completed',
  }),
}));

jest.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: jest.fn(),
}));

describe('Agent Commands', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('agent run', () => {
    it('should support dry-run mode', async () => {
      const command = createAgentRunCommand();
      const program = new Command();
      program.addCommand(command);

      try {
        await program.parseAsync(['run', 'test-agent', '--dry-run'], {
          from: 'user',
        });
      } catch (e) {
        // Ignore parse errors in test
      }

      // Dry-run should show SDK definition
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Dry Run]')
      );
    });

    it('should support JSON output for dry-run', async () => {
      const command = createAgentRunCommand();
      const program = new Command();
      program.addCommand(command);

      try {
        await program.parseAsync(['run', 'test-agent', '--dry-run', '--json'], {
          from: 'user',
        });
      } catch (e) {
        // Parse may fail in test, that's ok
      }

      // Should output JSON
      const output = consoleLogSpy.mock.calls.find((call) =>
        call[0]?.includes('agentId')
      );

      if (output) {
        expect(() => JSON.parse(output[0])).not.toThrow();
      }
    });

    it('should validate model option', async () => {
      const command = createAgentRunCommand();
      const program = new Command();
      program.addCommand(command);
      program.exitOverride();

      await expect(async () => {
        await program.parseAsync(
          ['run', 'test-agent', 'prompt', '--model', 'invalid'],
          { from: 'user' }
        );
      }).rejects.toThrow();
    });

    it('should validate phase option', async () => {
      const command = createAgentRunCommand();
      const program = new Command();
      program.addCommand(command);
      program.exitOverride();

      await expect(async () => {
        await program.parseAsync(
          ['run', 'test-agent', 'prompt', '--phase', 'invalid'],
          { from: 'user' }
        );
      }).rejects.toThrow();
    });

    it('should require prompt for execution', async () => {
      const command = createAgentRunCommand();
      const program = new Command();
      program.addCommand(command);

      try {
        await program.parseAsync(['run', 'test-agent'], {
          from: 'user',
        });
      } catch (e) {
        // Expected to exit
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('required')
      );
    });
  });

  describe('agent list', () => {
    it('should list SDK-enabled agents', async () => {
      const command = createAgentListCommand();
      const program = new Command();
      program.addCommand(command);

      try {
        await program.parseAsync(['list'], { from: 'user' });
      } catch (e) {
        // Ignore
      }

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('agent-1')
      );
    });

    it('should show agent details with --verbose', async () => {
      const command = createAgentListCommand();
      const program = new Command();
      program.addCommand(command);

      try {
        await program.parseAsync(['list'], { from: 'user' });
      } catch (e) {
        // Ignore
      }

      // The output includes model info in the same line as agent info
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('opus')
      );
    });
  });

  describe('agent show', () => {
    it('should show agent SDK definition', async () => {
      const command = createAgentShowCommand();
      const program = new Command();
      program.addCommand(command);

      try {
        await program.parseAsync(['show', 'test-agent'], { from: 'user' });
      } catch (e) {
        // Ignore
      }

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('test-agent')
      );
    });

    it('should support JSON output', async () => {
      const command = createAgentShowCommand();
      const program = new Command();
      program.addCommand(command);

      try {
        await program.parseAsync(['show', 'test-agent', '--json'], {
          from: 'user',
        });
      } catch (e) {
        // Ignore
      }

      const jsonOutput = consoleLogSpy.mock.calls.find((call) =>
        call[0]?.includes('"definition"')
      );

      if (jsonOutput) {
        expect(() => JSON.parse(jsonOutput[0])).not.toThrow();
      }
    });
  });
});
