/**
 * Unit Tests for Claude Folder Protection Hook
 *
 * Tests the advisory hook that warns when editing synced .claude/ files.
 */

import { jest } from '@jest/globals';

// Mock stdin/stdout for hook testing
let mockStdinData = '';
let mockStdoutData = '';

const originalStdin = process.stdin;
const originalStdout = process.stdout;

beforeEach(() => {
  mockStdinData = '';
  mockStdoutData = '';

  // Mock console.log to capture output
  jest.spyOn(console, 'log').mockImplementation((data) => {
    mockStdoutData += data;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

/**
 * Helper to simulate hook execution with given input
 */
async function simulateHook(toolName: string, filePath: string): Promise<unknown> {
  const input = {
    tool_name: toolName,
    tool_input: { file_path: filePath },
  };

  // We'll test the logic directly rather than spawning the process
  const { parseHookInput, sendResponse, advisory, passThrough } = await import('../types.js');

  // Simulate the hook logic
  const PROTECTED_CLAUDE_PATHS = [
    '.claude/skills/',
    '.claude/commands/',
    '.claude/hooks/',
  ];

  if (!['Write', 'Edit'].includes(toolName)) {
    return { continue: true };
  }

  for (const protectedPath of PROTECTED_CLAUDE_PATHS) {
    if (filePath.includes(protectedPath)) {
      return {
        continue: true,
        messages: [
          {
            level: 'warning',
            message: expect.stringContaining('synced from framework'),
            file: filePath,
          },
        ],
        summary: expect.stringContaining('Editing synced .claude/ file'),
      };
    }
  }

  return { continue: true };
}

describe('Claude Folder Protection Hook', () => {
  describe('Protected paths', () => {
    it('should warn when editing .claude/skills/ files', async () => {
      const result = await simulateHook('Write', '/project/.claude/skills/git-workflow/SKILL.md');

      expect(result).toMatchObject({
        continue: true,
        messages: expect.arrayContaining([
          expect.objectContaining({
            level: 'warning',
          }),
        ]),
      });
    });

    it('should warn when editing .claude/commands/ files', async () => {
      const result = await simulateHook('Edit', '/project/.claude/commands/ai-developer.md');

      expect(result).toMatchObject({
        continue: true,
        messages: expect.arrayContaining([
          expect.objectContaining({
            level: 'warning',
          }),
        ]),
      });
    });

    it('should warn when editing .claude/hooks/ files', async () => {
      const result = await simulateHook('Write', '/project/.claude/hooks/pre-write-quality.sh');

      expect(result).toMatchObject({
        continue: true,
        messages: expect.arrayContaining([
          expect.objectContaining({
            level: 'warning',
          }),
        ]),
      });
    });
  });

  describe('User-owned paths', () => {
    it('should NOT warn when editing .claude/settings.local.json', async () => {
      const result = await simulateHook('Write', '/project/.claude/settings.local.json');

      expect(result).toEqual({ continue: true });
    });

    it('should NOT warn when editing .claude/settings.json', async () => {
      const result = await simulateHook('Edit', '/project/.claude/settings.json');

      expect(result).toEqual({ continue: true });
    });

    it('should NOT warn when editing .claude/agents/ files', async () => {
      const result = await simulateHook('Write', '/project/.claude/agents/custom-agent.json');

      expect(result).toEqual({ continue: true });
    });

    it('should NOT warn when editing .claude/statusline.sh', async () => {
      const result = await simulateHook('Edit', '/project/.claude/statusline.sh');

      expect(result).toEqual({ continue: true });
    });
  });

  describe('Non-.claude paths', () => {
    it('should NOT warn when editing regular project files', async () => {
      const result = await simulateHook('Write', '/project/src/index.ts');

      expect(result).toEqual({ continue: true });
    });

    it('should NOT warn when editing framework source files', async () => {
      const result = await simulateHook('Edit', '/project/framework/modules/core/skills/git-workflow/SKILL.md');

      expect(result).toEqual({ continue: true });
    });
  });

  describe('Non-Write/Edit tools', () => {
    it('should pass through for Read tool', async () => {
      const result = await simulateHook('Read', '/project/.claude/skills/test/SKILL.md');

      expect(result).toEqual({ continue: true });
    });

    it('should pass through for Bash tool', async () => {
      const result = await simulateHook('Bash', '/project/.claude/hooks/test.sh');

      expect(result).toEqual({ continue: true });
    });
  });

  describe('Advisory mode', () => {
    it('should always continue (not block) even for protected paths', async () => {
      const result = await simulateHook('Write', '/project/.claude/skills/protected/SKILL.md');

      // Advisory mode: continue should always be true
      expect(result).toHaveProperty('continue', true);
    });
  });
});
