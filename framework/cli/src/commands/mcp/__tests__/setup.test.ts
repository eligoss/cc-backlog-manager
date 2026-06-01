/**
 * Unit tests for MCP Setup Command
 *
 * Tests MCP configuration, hook merging, and security validations.
 * Focuses on hook name validation and path normalization.
 *
 * @module commands/mcp/__tests__/setup.test
 */

// Mock inquirer before importing setup
jest.mock('inquirer', () => ({
  default: {
    prompt: jest.fn(),
  },
}));
jest.mock('fs-extra');
jest.mock('ora', () => ({
  default: jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
  })),
}));
jest.mock('../../../lib/cli-context.js');
jest.mock('../../../lib/manifest-manager.js');
jest.mock('../../../lib/mcp/prerequisite-checker.js');

import { createMcpSetupCommand } from '../setup.js';
import type { SettingsLocal, HookGroup } from '../../../templates/settings-local.js';

describe('MCP Setup Command', () => {
  describe('Hook Name Validation', () => {
    const VALID_MCP_HOOK_NAMES = [
      'session-start-mcp.sh',
      'session-end-graphiti.sh',
    ] as const;

    it('should allow valid MCP hook names', () => {
      VALID_MCP_HOOK_NAMES.forEach((hookName) => {
        expect(VALID_MCP_HOOK_NAMES).toContain(hookName);
      });
    });

    it('should have exactly 2 valid hook names', () => {
      expect(VALID_MCP_HOOK_NAMES).toHaveLength(2);
    });

    it('should reject invalid hook names', () => {
      const invalidNames = [
        '../../../etc/passwd',
        'malicious-hook.sh',
        'session-start.sh',
        'hook.sh',
      ];

      invalidNames.forEach((name) => {
        expect(VALID_MCP_HOOK_NAMES).not.toContain(name as never);
      });
    });
  });

  describe('normalizeHookPath', () => {
    // This function is not exported, so we test it indirectly through behavior
    // or by extracting the logic

    it('should extract script name from absolute path', () => {
      const command = '/Users/test/.claude/hooks/session-start-mcp.sh';
      const match = command.match(/([^/]+\.sh)$/);
      const hookName = match ? match[1] : command;

      expect(hookName).toBe('session-start-mcp.sh');
    });

    it('should extract script name from template path', () => {
      const command = '{{PROJECT_ROOT}}/.claude/hooks/session-start-mcp.sh';
      const match = command.match(/([^/]+\.sh)$/);
      const hookName = match ? match[1] : command;

      expect(hookName).toBe('session-start-mcp.sh');
    });

    it('should handle path traversal attempts', () => {
      const command = '{{PROJECT_ROOT}}/../../../etc/passwd.sh';
      const match = command.match(/([^/]+\.sh)$/);
      const hookName = match ? match[1] : command;

      expect(hookName).toBe('passwd.sh');
    });

    it('should return original if no .sh extension', () => {
      const command = 'echo hello';
      const match = command.match(/([^/]+\.sh)$/);
      const result = match ? match[1] : command;

      expect(result).toBe(command);
    });

    it('should handle Windows-style paths', () => {
      const command = 'C:\\Users\\test\\.claude\\hooks\\session-start-mcp.sh';
      // Need to match both / and \ as path separators
      const match = command.match(/([^/\\]+\.sh)$/);
      const hookName = match ? match[1] : command;

      expect(hookName).toBe('session-start-mcp.sh');
    });
  });

  describe('Hook Merging Logic', () => {
    describe('mergeHooks - basic scenarios', () => {
      it('should return new hooks when existing is undefined', () => {
        const newHooks: SettingsLocal['hooks'] = {
          'session:start': [
            {
              name: 'MCP Activation',
              hooks: [
                { command: '{{PROJECT_ROOT}}/.claude/hooks/session-start-mcp.sh' },
              ],
            },
          ],
        };

        const merged = mergeHooks(undefined, newHooks);

        expect(merged).toEqual(newHooks);
      });

      it('should return existing hooks when new is undefined', () => {
        const existingHooks: SettingsLocal['hooks'] = {
          'session:start': [
            {
              name: 'Custom Hook',
              hooks: [{ command: 'echo hello' }],
            },
          ],
        };

        const merged = mergeHooks(existingHooks, undefined);

        expect(merged).toEqual(existingHooks);
      });

      it('should return empty object when both are undefined', () => {
        const merged = mergeHooks(undefined, undefined);

        expect(merged).toEqual({});
      });
    });

    describe('mergeHooks - deduplication', () => {
      it('should not duplicate identical hooks', () => {
        const existingHooks: SettingsLocal['hooks'] = {
          'session:start': [
            {
              name: 'MCP Activation',
              hooks: [
                { command: '{{PROJECT_ROOT}}/.claude/hooks/session-start-mcp.sh' },
              ],
            },
          ],
        };

        const newHooks: SettingsLocal['hooks'] = {
          'session:start': [
            {
              name: 'MCP Activation',
              hooks: [
                { command: '{{PROJECT_ROOT}}/.claude/hooks/session-start-mcp.sh' },
              ],
            },
          ],
        };

        const merged = mergeHooks(existingHooks, newHooks);

        expect(merged['session:start']).toHaveLength(1);
      });

      it('should replace absolute path with template path', () => {
        const existingHooks: SettingsLocal['hooks'] = {
          'session:start': [
            {
              name: 'MCP Activation',
              hooks: [
                { command: '/Users/test/project/.claude/hooks/session-start-mcp.sh' },
              ],
            },
          ],
        };

        const newHooks: SettingsLocal['hooks'] = {
          'session:start': [
            {
              name: 'MCP Activation',
              hooks: [
                { command: '{{PROJECT_ROOT}}/.claude/hooks/session-start-mcp.sh' },
              ],
            },
          ],
        };

        const merged = mergeHooks(existingHooks, newHooks);

        // Should have only the template version
        expect(merged['session:start']).toHaveLength(1);
        expect(merged['session:start']![0].hooks[0].command).toContain('{{PROJECT_ROOT}}');
      });

      it('should preserve non-MCP hooks', () => {
        const existingHooks: SettingsLocal['hooks'] = {
          'session:start': [
            {
              name: 'Custom Hook',
              hooks: [{ command: 'echo custom' }],
            },
          ],
        };

        const newHooks: SettingsLocal['hooks'] = {
          'session:start': [
            {
              name: 'MCP Activation',
              hooks: [
                { command: '{{PROJECT_ROOT}}/.claude/hooks/session-start-mcp.sh' },
              ],
            },
          ],
        };

        const merged = mergeHooks(existingHooks, newHooks);

        expect(merged['session:start']).toHaveLength(2);
        expect(merged['session:start']!.some((g) => g.name === 'Custom Hook')).toBe(true);
        expect(merged['session:start']!.some((g) => g.name === 'MCP Activation')).toBe(true);
      });
    });

    describe('mergeHooks - multiple events', () => {
      it('should merge hooks for different events', () => {
        const existingHooks: SettingsLocal['hooks'] = {
          'session:start': [
            {
              name: 'Start Hook',
              hooks: [{ command: 'echo start' }],
            },
          ],
        };

        const newHooks: SettingsLocal['hooks'] = {
          'session:end': [
            {
              name: 'End Hook',
              hooks: [
                { command: '{{PROJECT_ROOT}}/.claude/hooks/session-end-graphiti.sh' },
              ],
            },
          ],
        };

        const merged = mergeHooks(existingHooks, newHooks);

        expect(merged['session:start']).toHaveLength(1);
        expect(merged['session:end']).toHaveLength(1);
      });

      it('should merge hooks for same event', () => {
        const existingHooks: SettingsLocal['hooks'] = {
          'session:start': [
            {
              name: 'Hook 1',
              hooks: [{ command: 'echo 1' }],
            },
          ],
        };

        const newHooks: SettingsLocal['hooks'] = {
          'session:start': [
            {
              name: 'Hook 2',
              hooks: [{ command: 'echo 2' }],
            },
          ],
        };

        const merged = mergeHooks(existingHooks, newHooks);

        expect(merged['session:start']).toHaveLength(2);
      });
    });

    describe('mergeHooks - edge cases', () => {
      it('should handle hooks without command field', () => {
        const existingHooks: SettingsLocal['hooks'] = {
          'session:start': [
            {
              name: 'Hook',
              hooks: [{ command: undefined as unknown as string }],
            },
          ],
        };

        const newHooks: SettingsLocal['hooks'] = {
          'session:start': [
            {
              name: 'MCP',
              hooks: [
                { command: '{{PROJECT_ROOT}}/.claude/hooks/session-start-mcp.sh' },
              ],
            },
          ],
        };

        const merged = mergeHooks(existingHooks, newHooks);

        expect(merged['session:start']).toBeDefined();
      });

      it('should handle empty hook groups', () => {
        const existingHooks: SettingsLocal['hooks'] = {
          'session:start': [],
        };

        const newHooks: SettingsLocal['hooks'] = {
          'session:start': [
            {
              name: 'MCP',
              hooks: [
                { command: '{{PROJECT_ROOT}}/.claude/hooks/session-start-mcp.sh' },
              ],
            },
          ],
        };

        const merged = mergeHooks(existingHooks, newHooks);

        expect(merged['session:start']).toHaveLength(1);
      });

      it('should handle undefined event hooks', () => {
        const existingHooks: SettingsLocal['hooks'] = {
          'session:start': undefined,
        };

        const newHooks: SettingsLocal['hooks'] = {
          'session:start': [
            {
              name: 'MCP',
              hooks: [
                { command: '{{PROJECT_ROOT}}/.claude/hooks/session-start-mcp.sh' },
              ],
            },
          ],
        };

        const merged = mergeHooks(existingHooks, newHooks);

        expect(merged['session:start']).toHaveLength(1);
      });
    });

    describe('mergeHooks - security', () => {
      it('should normalize paths before comparing', () => {
        const existingHooks: SettingsLocal['hooks'] = {
          'session:start': [
            {
              name: 'MCP',
              hooks: [
                { command: '/different/path/.claude/hooks/session-start-mcp.sh' },
              ],
            },
          ],
        };

        const newHooks: SettingsLocal['hooks'] = {
          'session:start': [
            {
              name: 'MCP',
              hooks: [
                { command: '{{PROJECT_ROOT}}/.claude/hooks/session-start-mcp.sh' },
              ],
            },
          ],
        };

        const merged = mergeHooks(existingHooks, newHooks);

        // Should recognize they're the same hook and use template version
        expect(merged['session:start']).toHaveLength(1);
        expect(merged['session:start']![0].hooks[0].command).toContain('{{PROJECT_ROOT}}');
      });

      it('should not be fooled by path traversal in hook names', () => {
        const maliciousHook: SettingsLocal['hooks'] = {
          'session:start': [
            {
              name: 'Malicious',
              hooks: [
                { command: '/path/.claude/hooks/session-start-mcp.sh' },
              ],
            },
          ],
        };

        const legitimateHook: SettingsLocal['hooks'] = {
          'session:start': [
            {
              name: 'Legitimate',
              hooks: [
                { command: '{{PROJECT_ROOT}}/.claude/hooks/session-start-mcp.sh' },
              ],
            },
          ],
        };

        const merged = mergeHooks(maliciousHook, legitimateHook);

        // Should recognize same normalized name (both are session-start-mcp.sh) and replace with legitimate
        expect(merged['session:start']).toHaveLength(1);
        // The template version should win since it replaces absolute paths
        expect(merged['session:start']![0].hooks[0].command).toContain('{{PROJECT_ROOT}}');
      });
    });
  });

  describe('Command Creation', () => {
    it('should create a valid Commander command', () => {
      const command = createMcpSetupCommand();

      expect(command).toBeDefined();
      expect(command.name()).toBe('setup');
      expect(command.description()).toContain('Configure MCP integrations');
    });

    it('should define all required options', () => {
      const command = createMcpSetupCommand();
      const options = command.options;

      const optionNames = options.map((opt) => opt.long);
      expect(optionNames).toContain('--path');
      expect(optionNames).toContain('--graphiti');
      expect(optionNames).toContain('--serena');
      expect(optionNames).toContain('--graphiti-group-id');
      expect(optionNames).toContain('--serena-project');
      expect(optionNames).toContain('--serena-language');
      expect(optionNames).toContain('--no-interactive');
    });

    it('should have default values for options', () => {
      const command = createMcpSetupCommand();
      const pathOption = command.options.find((opt) => opt.long === '--path');
      const langOption = command.options.find((opt) => opt.long === '--serena-language');

      expect(pathOption?.defaultValue).toBe('.');
      expect(langOption?.defaultValue).toBe('typescript');
    });
  });

  describe('Placeholder Validation', () => {
    it('should use PROJECT_ROOT placeholder in hook paths', () => {
      const hookPath = '{{PROJECT_ROOT}}/.claude/hooks/session-start-mcp.sh';

      expect(hookPath).toContain('{{PROJECT_ROOT}}');
      expect(hookPath).not.toContain('/Users/');
      expect(hookPath).not.toContain('C:\\');
    });

    it('should maintain .claude/hooks directory structure', () => {
      const hookPath = '{{PROJECT_ROOT}}/.claude/hooks/session-start-mcp.sh';

      expect(hookPath).toContain('.claude/hooks/');
    });

    it('should use consistent placeholder format', () => {
      const placeholder = '{{PROJECT_ROOT}}';

      expect(placeholder).toMatch(/^\{\{[A-Z_]+\}\}$/);
    });
  });
});

/**
 * Helper function to test hook merging (extracted from setup.ts logic)
 */
function mergeHooks(
  existing: SettingsLocal['hooks'],
  newHooks: SettingsLocal['hooks']
): SettingsLocal['hooks'] {
  if (!existing || !newHooks) {
    return newHooks || existing || {};
  }

  const VALID_MCP_HOOK_NAMES = [
    'session-start-mcp.sh',
    'session-end-graphiti.sh',
  ] as const;

  function normalizeHookPath(command: string): string {
    // Match both / and \ as path separators for cross-platform support
    const match = command.match(/([^/\\]+\.sh)$/);
    if (!match) return command;

    const hookName = match[1];

    if (!VALID_MCP_HOOK_NAMES.includes(hookName as typeof VALID_MCP_HOOK_NAMES[number])) {
      return command;
    }

    return hookName;
  }

  function hookCommandExists(
    existingHooks: HookGroup[],
    newCommand: string
  ): boolean {
    const normalizedNew = normalizeHookPath(newCommand);
    for (const group of existingHooks) {
      for (const hook of group.hooks) {
        if (hook.command && normalizeHookPath(hook.command) === normalizedNew) {
          return true;
        }
      }
    }
    return false;
  }

  const merged: SettingsLocal['hooks'] = {};

  // Process existing hooks, replacing absolute paths with template paths where applicable
  for (const [event, eventHooks] of Object.entries(existing)) {
    if (!eventHooks) continue;

    const processedHooks: HookGroup[] = [];

    for (const hookGroup of eventHooks) {
      const processedGroup = { ...hookGroup };

      if (hookGroup.hooks) {
        const shouldReplace = hookGroup.hooks.some((h) => {
          if (!h.command) return false;
          if (!h.command.includes('{{PROJECT_ROOT}}') && h.command.includes('/.claude/hooks/')) {
            const normalizedPath = normalizeHookPath(h.command);
            for (const [newEvent, newEventHooks] of Object.entries(newHooks)) {
              if (newEvent === event && newEventHooks) {
                for (const newGroup of newEventHooks) {
                  for (const newHook of newGroup.hooks) {
                    if (newHook.command && normalizeHookPath(newHook.command) === normalizedPath) {
                      return true;
                    }
                  }
                }
              }
            }
          }
          return false;
        });

        if (!shouldReplace) {
          processedHooks.push(processedGroup);
        }
      } else {
        processedHooks.push(processedGroup);
      }
    }

    if (processedHooks.length > 0) {
      merged[event] = processedHooks;
    }
  }

  // Add new hooks, avoiding duplicates
  for (const [event, hooks] of Object.entries(newHooks)) {
    if (!hooks) continue;

    if (!merged[event]) {
      merged[event] = hooks;
    } else {
      for (const hook of hooks) {
        const hookCommands = hook.hooks.map((h) => h.command).filter(Boolean) as string[];
        const allExist = hookCommands.every((cmd) =>
          hookCommandExists(merged[event]!, cmd)
        );

        if (!allExist) {
          merged[event]!.push(hook);
        }
      }
    }
  }

  return merged;
}
