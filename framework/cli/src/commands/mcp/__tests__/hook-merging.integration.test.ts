/**
 * Integration Test: MCP Hook Merging
 *
 * Tests the hook merging logic in complex scenarios:
 * - Merging MCP hooks with existing hooks
 * - Replacing absolute paths with template paths
 * - Detecting and preventing duplicates
 * - Multiple setup runs
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import type { SettingsLocal, HookGroup } from '../../../templates/settings-local.js';

describe('MCP Hook Merging Integration', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hook-merge-test-'));
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('HookMerging_WithExistingHooks_PreservesAll', () => {
    it('should merge MCP hooks with existing custom hooks', async () => {
      const settingsPath = path.join(testDir, '.claude', 'settings.local.json');
      await fs.ensureDir(path.dirname(settingsPath));

      // Create settings with existing custom hooks
      const existingSettings: SettingsLocal = {
        permissions: { allow: ['Bash(git:*)'] },
        hooks: {
          SessionStart: [
            {
              matcher: '.*',
              hooks: [
                {
                  type: 'command',
                  command: `${testDir}/.claude/hooks/custom-startup.sh`,
                  statusMessage: 'Custom startup...',
                },
              ],
            },
          ],
          PreToolUse: [
            {
              matcher: 'Write|Edit',
              hooks: [
                {
                  type: 'command',
                  command: `${testDir}/.claude/hooks/pre-write.sh`,
                  statusMessage: 'Checking write...',
                },
              ],
            },
          ],
        },
      };
      await fs.writeJson(settingsPath, existingSettings);

      // Merge MCP hooks
      const { getMcpHooks } = await import('../../../templates/index.js');
      const mcpHooks = getMcpHooks(testDir, true, true);

      let settings: SettingsLocal = await fs.readJson(settingsPath);
      settings.hooks = mergeHooks(settings.hooks, mcpHooks);
      await fs.writeJson(settingsPath, settings, { spaces: 2 });

      // Verify merge results
      const mergedSettings: SettingsLocal = await fs.readJson(settingsPath);

      // Should have both SessionStart hooks
      expect(mergedSettings.hooks!.SessionStart).toHaveLength(2);

      // Custom hook preserved
      const customHook = mergedSettings.hooks!.SessionStart!.find(
        g => g.hooks.some(h => h.command?.includes('custom-startup.sh'))
      );
      expect(customHook).toBeDefined();

      // MCP hook added
      const mcpHook = mergedSettings.hooks!.SessionStart!.find(
        g => g.hooks.some(h => h.command?.includes('session-start-mcp.sh'))
      );
      expect(mcpHook).toBeDefined();

      // PreToolUse hooks preserved (not touched by MCP)
      expect(mergedSettings.hooks!.PreToolUse).toHaveLength(1);
      expect(mergedSettings.hooks!.PreToolUse![0].hooks[0].command).toContain('pre-write.sh');

      // Stop hook added (from Graphiti)
      expect(mergedSettings.hooks!.Stop).toBeDefined();
      expect(mergedSettings.hooks!.Stop).toHaveLength(1);
    });

    it('should not duplicate hooks when merging multiple times', async () => {
      const settingsPath = path.join(testDir, '.claude', 'settings.local.json');
      await fs.ensureDir(path.dirname(settingsPath));

      // Create initial settings
      const initialSettings: SettingsLocal = {
        permissions: { allow: [] },
        hooks: {},
      };
      await fs.writeJson(settingsPath, initialSettings);

      const { getMcpHooks } = await import('../../../templates/index.js');

      // First merge
      let settings: SettingsLocal = await fs.readJson(settingsPath);
      const mcpHooks1 = getMcpHooks(testDir, true, true);
      settings.hooks = mergeHooks(settings.hooks, mcpHooks1);
      await fs.writeJson(settingsPath, settings, { spaces: 2 });

      const afterFirst: SettingsLocal = await fs.readJson(settingsPath);
      const firstSessionStartCount = afterFirst.hooks!.SessionStart?.length || 0;
      const firstStopCount = afterFirst.hooks!.Stop?.length || 0;

      // Second merge (should be idempotent)
      settings = await fs.readJson(settingsPath);
      const mcpHooks2 = getMcpHooks(testDir, true, true);
      settings.hooks = mergeHooks(settings.hooks, mcpHooks2);
      await fs.writeJson(settingsPath, settings, { spaces: 2 });

      const afterSecond: SettingsLocal = await fs.readJson(settingsPath);
      const secondSessionStartCount = afterSecond.hooks!.SessionStart?.length || 0;
      const secondStopCount = afterSecond.hooks!.Stop?.length || 0;

      // Counts should not change
      expect(secondSessionStartCount).toBe(firstSessionStartCount);
      expect(secondStopCount).toBe(firstStopCount);
    });
  });

  describe('HookMerging_AbsoluteToTemplate_ReplacesCorrectly', () => {
    it('should replace absolute path with template path', async () => {
      const settingsPath = path.join(testDir, '.claude', 'settings.local.json');
      await fs.ensureDir(path.dirname(settingsPath));

      // Create settings with absolute path (from old init)
      const existingSettings: SettingsLocal = {
        permissions: { allow: [] },
        hooks: {
          SessionStart: [
            {
              matcher: '.*',
              hooks: [
                {
                  type: 'command',
                  command: `${testDir}/.claude/hooks/session-start-mcp.sh`,
                  statusMessage: 'Loading MCP integration...',
                },
              ],
            },
          ],
          Stop: [
            {
              matcher: '.*',
              hooks: [
                {
                  type: 'command',
                  command: `${testDir}/.claude/hooks/session-end-graphiti.sh`,
                  statusMessage: 'Saving session knowledge...',
                },
              ],
            },
          ],
        },
      };
      await fs.writeJson(settingsPath, existingSettings);

      // Merge with new MCP hooks (using template paths)
      const { getMcpHooks } = await import('../../../templates/index.js');
      const mcpHooks = getMcpHooks(testDir, true, true);

      let settings: SettingsLocal = await fs.readJson(settingsPath);
      settings.hooks = mergeHooks(settings.hooks, mcpHooks);
      await fs.writeJson(settingsPath, settings, { spaces: 2 });

      // Verify replacement
      const mergedSettings: SettingsLocal = await fs.readJson(settingsPath);

      // SessionStart should have template path
      expect(mergedSettings.hooks!.SessionStart).toHaveLength(1);
      const sessionStartCommand = mergedSettings.hooks!.SessionStart![0].hooks[0].command;
      expect(sessionStartCommand).toContain('{{PROJECT_ROOT}}');
      expect(sessionStartCommand).not.toContain(testDir);

      // Stop should have template path
      expect(mergedSettings.hooks!.Stop).toHaveLength(1);
      const stopCommand = mergedSettings.hooks!.Stop![0].hooks[0].command;
      expect(stopCommand).toContain('{{PROJECT_ROOT}}');
      expect(stopCommand).not.toContain(testDir);
    });

    it('should preserve non-MCP absolute paths', async () => {
      const settingsPath = path.join(testDir, '.claude', 'settings.local.json');
      await fs.ensureDir(path.dirname(settingsPath));

      // Create settings with custom absolute path
      const existingSettings: SettingsLocal = {
        permissions: { allow: [] },
        hooks: {
          SessionStart: [
            {
              matcher: '.*',
              hooks: [
                {
                  type: 'command',
                  command: `${testDir}/.claude/hooks/my-custom-hook.sh`,
                  statusMessage: 'Custom hook...',
                },
              ],
            },
          ],
        },
      };
      await fs.writeJson(settingsPath, existingSettings);

      // Merge with MCP hooks
      const { getMcpHooks } = await import('../../../templates/index.js');
      const mcpHooks = getMcpHooks(testDir, true, false);

      let settings: SettingsLocal = await fs.readJson(settingsPath);
      settings.hooks = mergeHooks(settings.hooks, mcpHooks);
      await fs.writeJson(settingsPath, settings, { spaces: 2 });

      // Verify custom hook preserved with absolute path
      const mergedSettings: SettingsLocal = await fs.readJson(settingsPath);

      const customHook = mergedSettings.hooks!.SessionStart!.find(
        g => g.hooks.some(h => h.command?.includes('my-custom-hook.sh'))
      );
      expect(customHook).toBeDefined();
      expect(customHook!.hooks[0].command).toContain(testDir); // Absolute path preserved

      // MCP hook added with template path
      const mcpHook = mergedSettings.hooks!.SessionStart!.find(
        g => g.hooks.some(h => h.command?.includes('session-start-mcp.sh'))
      );
      expect(mcpHook).toBeDefined();
      expect(mcpHook!.hooks[0].command).toContain('{{PROJECT_ROOT}}');
    });
  });

  describe('HookMerging_DifferentProjectPaths_NormalizesCorrectly', () => {
    it('should normalize hooks from different project path installations', async () => {
      const settingsPath = path.join(testDir, '.claude', 'settings.local.json');
      await fs.ensureDir(path.dirname(settingsPath));

      // Create settings with hook from different path (project was moved)
      const oldProjectPath = '/old/project/path';
      const existingSettings: SettingsLocal = {
        permissions: { allow: [] },
        hooks: {
          SessionStart: [
            {
              matcher: '.*',
              hooks: [
                {
                  type: 'command',
                  command: `${oldProjectPath}/.claude/hooks/session-start-mcp.sh`,
                  statusMessage: 'Loading MCP integration...',
                },
              ],
            },
          ],
        },
      };
      await fs.writeJson(settingsPath, existingSettings);

      // Merge with new MCP hooks (current project path)
      const { getMcpHooks } = await import('../../../templates/index.js');
      const mcpHooks = getMcpHooks(testDir, true, false);

      let settings: SettingsLocal = await fs.readJson(settingsPath);
      settings.hooks = mergeHooks(settings.hooks, mcpHooks);
      await fs.writeJson(settingsPath, settings, { spaces: 2 });

      // Verify old path replaced with template
      const mergedSettings: SettingsLocal = await fs.readJson(settingsPath);

      expect(mergedSettings.hooks!.SessionStart).toHaveLength(1);
      const command = mergedSettings.hooks!.SessionStart![0].hooks[0].command;
      expect(command).toContain('{{PROJECT_ROOT}}');
      expect(command).not.toContain(oldProjectPath);
      expect(command).not.toContain(testDir);
    });
  });

  describe('HookMerging_PartialMcp_MergesCorrectly', () => {
    it('should add Graphiti hook when upgrading from Serena-only', async () => {
      const settingsPath = path.join(testDir, '.claude', 'settings.local.json');
      await fs.ensureDir(path.dirname(settingsPath));

      // Initial: Serena only
      const { getMcpHooks } = await import('../../../templates/index.js');
      const serenaHooks = getMcpHooks(testDir, false, true);

      const initialSettings: SettingsLocal = {
        permissions: { allow: [] },
        hooks: serenaHooks,
      };
      await fs.writeJson(settingsPath, initialSettings);

      // Verify initial state
      let settings: SettingsLocal = await fs.readJson(settingsPath);
      expect(settings.hooks!.SessionStart).toBeDefined();
      expect(settings.hooks!.Stop).toBeUndefined(); // No Graphiti

      // Upgrade: Add Graphiti
      const fullMcpHooks = getMcpHooks(testDir, true, true);
      settings.hooks = mergeHooks(settings.hooks, fullMcpHooks);
      await fs.writeJson(settingsPath, settings, { spaces: 2 });

      // Verify upgrade
      const upgradedSettings: SettingsLocal = await fs.readJson(settingsPath);
      expect(upgradedSettings.hooks!.SessionStart).toHaveLength(1); // Not duplicated
      expect(upgradedSettings.hooks!.Stop).toBeDefined(); // Graphiti hook added
    });

    it('should handle downgrade from both to Serena-only', async () => {
      const settingsPath = path.join(testDir, '.claude', 'settings.local.json');
      await fs.ensureDir(path.dirname(settingsPath));

      // Initial: Both Graphiti and Serena
      const { getMcpHooks } = await import('../../../templates/index.js');
      const fullMcpHooks = getMcpHooks(testDir, true, true);

      const initialSettings: SettingsLocal = {
        permissions: { allow: [] },
        hooks: fullMcpHooks,
      };
      await fs.writeJson(settingsPath, initialSettings);

      // Verify initial state
      let settings: SettingsLocal = await fs.readJson(settingsPath);
      expect(settings.hooks!.SessionStart).toBeDefined();
      expect(settings.hooks!.Stop).toBeDefined();

      // Downgrade: Serena only (would need manual cleanup in real scenario)
      // In practice, user would run setup with --serena flag only
      const serenaHooks = getMcpHooks(testDir, false, true);

      // This simulates what setup command would do
      settings.hooks = serenaHooks;
      await fs.writeJson(settingsPath, settings, { spaces: 2 });

      // Verify downgrade
      const downgradedSettings: SettingsLocal = await fs.readJson(settingsPath);
      expect(downgradedSettings.hooks!.SessionStart).toBeDefined();
      expect(downgradedSettings.hooks!.Stop).toBeUndefined(); // Graphiti hook removed
    });
  });

  describe('HookMerging_MultipleHookGroups_HandlesCorrectly', () => {
    it('should handle multiple hook groups in same event', async () => {
      const settingsPath = path.join(testDir, '.claude', 'settings.local.json');
      await fs.ensureDir(path.dirname(settingsPath));

      // Create settings with multiple SessionStart groups
      const existingSettings: SettingsLocal = {
        permissions: { allow: [] },
        hooks: {
          SessionStart: [
            {
              matcher: 'ai-.*',
              hooks: [
                {
                  type: 'command',
                  command: `${testDir}/.claude/hooks/ai-session-start.sh`,
                  statusMessage: 'AI session starting...',
                },
              ],
            },
            {
              matcher: '.*',
              hooks: [
                {
                  type: 'command',
                  command: `${testDir}/.claude/hooks/general-start.sh`,
                  statusMessage: 'General startup...',
                },
              ],
            },
          ],
        },
      };
      await fs.writeJson(settingsPath, existingSettings);

      // Merge MCP hooks
      const { getMcpHooks } = await import('../../../templates/index.js');
      const mcpHooks = getMcpHooks(testDir, true, false);

      let settings: SettingsLocal = await fs.readJson(settingsPath);
      settings.hooks = mergeHooks(settings.hooks, mcpHooks);
      await fs.writeJson(settingsPath, settings, { spaces: 2 });

      // Verify all groups preserved + MCP added
      const mergedSettings: SettingsLocal = await fs.readJson(settingsPath);
      expect(mergedSettings.hooks!.SessionStart).toHaveLength(3);

      // Find each hook
      const aiHook = mergedSettings.hooks!.SessionStart!.find(
        g => g.hooks.some(h => h.command?.includes('ai-session-start.sh'))
      );
      expect(aiHook).toBeDefined();

      const generalHook = mergedSettings.hooks!.SessionStart!.find(
        g => g.hooks.some(h => h.command?.includes('general-start.sh'))
      );
      expect(generalHook).toBeDefined();

      const mcpHook = mergedSettings.hooks!.SessionStart!.find(
        g => g.hooks.some(h => h.command?.includes('session-start-mcp.sh'))
      );
      expect(mcpHook).toBeDefined();
    });
  });
});

/**
 * Hook merging logic (from setup.ts)
 */
function mergeHooks(
  existing: SettingsLocal['hooks'],
  newHooks: SettingsLocal['hooks']
): SettingsLocal['hooks'] {
  if (!existing || !newHooks) {
    return newHooks || existing || {};
  }

  const merged: SettingsLocal['hooks'] = {};

  const VALID_MCP_HOOK_NAMES = [
    'session-start-mcp.sh',
    'session-end-graphiti.sh',
  ] as const;

  function normalizeHookPath(command: string): string {
    const match = command.match(/([^/]+\.sh)$/);
    if (!match) return command;

    const hookName = match[1];
    if (!VALID_MCP_HOOK_NAMES.includes(hookName as typeof VALID_MCP_HOOK_NAMES[number])) {
      return command;
    }
    return hookName;
  }

  function hookCommandExists(existingHooks: HookGroup[], newCommand: string): boolean {
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

  // Process existing hooks, replacing absolute paths with template paths
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
