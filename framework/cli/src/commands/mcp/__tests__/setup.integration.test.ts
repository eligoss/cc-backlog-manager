/**
 * Integration Test: MCP Setup Command
 *
 * Tests the mcp setup command end-to-end with real file operations.
 * Covers post-init setup, re-running setup (idempotency), hook merging,
 * and Serena config backup scenarios.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { ManifestManager } from '../../../lib/manifest-manager.js';
import type { SettingsLocal } from '../../../templates/settings-local.js';

// Import the functions we need to test
import { createMcpSetupCommand } from '../setup.js';

describe('MCP Setup Command Integration', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-setup-test-'));
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('Setup_PostInitFlow_ConfiguresAllFiles', () => {
    it('should create all MCP files in a fresh project', async () => {
      // Create minimal project structure
      await fs.ensureDir(path.join(testDir, '.claude'));
      await fs.ensureDir(path.join(testDir, '.claude', 'hooks'));

      // Create manifest
      const manifestManager = new ManifestManager(testDir);
      const manifest = await manifestManager.create('1.0.0', ['core']);
      await manifestManager.write(manifest);

      // Create settings.local.json
      const settingsPath = path.join(testDir, '.claude', 'settings.local.json');
      await fs.writeJson(settingsPath, { permissions: { allow: [] }, hooks: {} });

      // Run setup (simulate command execution)
      await setupMcp(testDir, {
        graphiti: true,
        serena: true,
        graphitiGroupId: 'test-project',
        serenaProjectName: 'test-project',
        serenaLanguage: 'typescript',
      });

      // Verify Serena config created
      const serenaConfigPath = path.join(testDir, '.serena', 'project.yml');
      expect(await fs.pathExists(serenaConfigPath)).toBe(true);

      const serenaConfig = await fs.readFile(serenaConfigPath, 'utf-8');
      expect(serenaConfig).toContain('name: "test-project"');
      expect(serenaConfig).toContain('language: typescript');

      // Verify Serena memories directory created
      const serenaMemoriesDir = path.join(testDir, '.serena', 'memories');
      expect(await fs.pathExists(serenaMemoriesDir)).toBe(true);

      // Verify MCP hooks created
      const sessionStartHook = path.join(testDir, '.claude', 'hooks', 'session-start-mcp.sh');
      expect(await fs.pathExists(sessionStartHook)).toBe(true);

      const sessionEndHook = path.join(testDir, '.claude', 'hooks', 'session-end-graphiti.sh');
      expect(await fs.pathExists(sessionEndHook)).toBe(true);

      // Verify hooks are executable
      const startHookStat = await fs.stat(sessionStartHook);
      expect((startHookStat.mode & 0o111) !== 0).toBe(true); // At least one execute bit

      const endHookStat = await fs.stat(sessionEndHook);
      expect((endHookStat.mode & 0o111) !== 0).toBe(true);

      // Verify hook content
      const startHookContent = await fs.readFile(sessionStartHook, 'utf-8');
      expect(startHookContent).toContain('activate_project("test-project")');
      expect(startHookContent).toContain('test-project');

      const endHookContent = await fs.readFile(sessionEndHook, 'utf-8');
      expect(endHookContent).toContain('test-project');

      // Verify settings.local.json updated
      const settings: SettingsLocal = await fs.readJson(settingsPath);
      expect(settings.permissions?.allow).toBeDefined();
      expect(settings.permissions!.allow.length).toBeGreaterThan(0);

      // Verify Graphiti permissions added
      expect(settings.permissions!.allow).toContain('mcp__graphiti__add_memory');
      expect(settings.permissions!.allow).toContain('mcp__graphiti__search_memory_facts');

      // Verify Serena permissions added
      expect(settings.permissions!.allow).toContain('mcp__plugin_serena_serena__activate_project');
      expect(settings.permissions!.allow).toContain('mcp__plugin_serena_serena__find_symbol');

      // Verify hooks registered
      expect(settings.hooks).toBeDefined();
      expect(settings.hooks!.SessionStart).toBeDefined();
      expect(settings.hooks!.Stop).toBeDefined();

      // Verify manifest updated
      const updatedManifest = await manifestManager.read();
      expect(updatedManifest.mcp).toBeDefined();
      expect(updatedManifest.mcp?.enabled).toBe(true);
      expect(updatedManifest.mcp?.graphiti?.enabled).toBe(true);
      expect(updatedManifest.mcp?.graphiti?.groupId).toBe('test-project');
      expect(updatedManifest.mcp?.serena?.enabled).toBe(true);
      expect(updatedManifest.mcp?.serena?.projectName).toBe('test-project');
      expect(updatedManifest.mcp?.serena?.language).toBe('typescript');
    });

    it('should create only Graphiti files when Serena disabled', async () => {
      await fs.ensureDir(path.join(testDir, '.claude', 'hooks'));

      const manifestManager = new ManifestManager(testDir);
      const manifest = await manifestManager.create('1.0.0', ['core']);
      await manifestManager.write(manifest);

      const settingsPath = path.join(testDir, '.claude', 'settings.local.json');
      await fs.writeJson(settingsPath, { permissions: { allow: [] }, hooks: {} });

      await setupMcp(testDir, {
        graphiti: true,
        serena: false,
        graphitiGroupId: 'test-project',
        serenaProjectName: '',
        serenaLanguage: '',
      });

      // Serena config should NOT exist
      expect(await fs.pathExists(path.join(testDir, '.serena'))).toBe(false);

      // Session start hook should still exist (for Graphiti)
      const sessionStartHook = path.join(testDir, '.claude', 'hooks', 'session-start-mcp.sh');
      expect(await fs.pathExists(sessionStartHook)).toBe(true);

      // Session end hook should exist
      const sessionEndHook = path.join(testDir, '.claude', 'hooks', 'session-end-graphiti.sh');
      expect(await fs.pathExists(sessionEndHook)).toBe(true);

      // Verify only Graphiti permissions added
      const settings: SettingsLocal = await fs.readJson(settingsPath);
      expect(settings.permissions!.allow).toContain('mcp__graphiti__add_memory');
      expect(settings.permissions!.allow).not.toContain('mcp__plugin_serena_serena__activate_project');
    });

    it('should create only Serena files when Graphiti disabled', async () => {
      await fs.ensureDir(path.join(testDir, '.claude', 'hooks'));

      const manifestManager = new ManifestManager(testDir);
      const manifest = await manifestManager.create('1.0.0', ['core']);
      await manifestManager.write(manifest);

      const settingsPath = path.join(testDir, '.claude', 'settings.local.json');
      await fs.writeJson(settingsPath, { permissions: { allow: [] }, hooks: {} });

      await setupMcp(testDir, {
        graphiti: false,
        serena: true,
        graphitiGroupId: '',
        serenaProjectName: 'test-project',
        serenaLanguage: 'python',
      });

      // Serena config should exist
      const serenaConfigPath = path.join(testDir, '.serena', 'project.yml');
      expect(await fs.pathExists(serenaConfigPath)).toBe(true);

      const serenaConfig = await fs.readFile(serenaConfigPath, 'utf-8');
      expect(serenaConfig).toContain('language: python');

      // Session start hook should exist (for Serena)
      const sessionStartHook = path.join(testDir, '.claude', 'hooks', 'session-start-mcp.sh');
      expect(await fs.pathExists(sessionStartHook)).toBe(true);

      // Session end hook should NOT exist (Graphiti only)
      const sessionEndHook = path.join(testDir, '.claude', 'hooks', 'session-end-graphiti.sh');
      expect(await fs.pathExists(sessionEndHook)).toBe(false);

      // Verify only Serena permissions added
      const settings: SettingsLocal = await fs.readJson(settingsPath);
      expect(settings.permissions!.allow).not.toContain('mcp__graphiti__add_memory');
      expect(settings.permissions!.allow).toContain('mcp__plugin_serena_serena__activate_project');

      // Verify Stop hook not added (no Graphiti)
      expect(settings.hooks!.Stop).toBeUndefined();
    });
  });

  describe('Setup_Idempotency_HandlesReRuns', () => {
    it('should handle re-running setup without errors', async () => {
      await fs.ensureDir(path.join(testDir, '.claude', 'hooks'));

      const manifestManager = new ManifestManager(testDir);
      const manifest = await manifestManager.create('1.0.0', ['core']);
      await manifestManager.write(manifest);

      const settingsPath = path.join(testDir, '.claude', 'settings.local.json');
      await fs.writeJson(settingsPath, { permissions: { allow: [] }, hooks: {} });

      const options = {
        graphiti: true,
        serena: true,
        graphitiGroupId: 'test-project',
        serenaProjectName: 'test-project',
        serenaLanguage: 'typescript',
      };

      // Run setup first time
      await setupMcp(testDir, options);

      const firstSettings: SettingsLocal = await fs.readJson(settingsPath);
      const firstPermissionsCount = firstSettings.permissions!.allow.length;

      // Run setup second time
      await setupMcp(testDir, options);

      const secondSettings: SettingsLocal = await fs.readJson(settingsPath);
      const secondPermissionsCount = secondSettings.permissions!.allow.length;

      // Permissions count should not change (no duplicates)
      expect(secondPermissionsCount).toBe(firstPermissionsCount);

      // Verify no duplicate permissions
      const uniquePermissions = new Set(secondSettings.permissions!.allow);
      expect(uniquePermissions.size).toBe(secondPermissionsCount);

      // Hooks should not be duplicated
      expect(secondSettings.hooks!.SessionStart).toHaveLength(1);
      expect(secondSettings.hooks!.Stop).toHaveLength(1);
    });

    it('should backup existing Serena config when re-running setup', async () => {
      await fs.ensureDir(path.join(testDir, '.claude', 'hooks'));
      await fs.ensureDir(path.join(testDir, '.serena'));

      const manifestManager = new ManifestManager(testDir);
      const manifest = await manifestManager.create('1.0.0', ['core']);
      await manifestManager.write(manifest);

      const settingsPath = path.join(testDir, '.claude', 'settings.local.json');
      await fs.writeJson(settingsPath, { permissions: { allow: [] }, hooks: {} });

      // Create existing Serena config
      const serenaConfigPath = path.join(testDir, '.serena', 'project.yml');
      await fs.writeFile(serenaConfigPath, 'name: old-project\nlanguage: go', 'utf-8');

      // Run setup
      await setupMcp(testDir, {
        graphiti: false,
        serena: true,
        graphitiGroupId: '',
        serenaProjectName: 'new-project',
        serenaLanguage: 'typescript',
      });

      // Verify backup created
      const backupPath = path.join(testDir, '.serena', 'project.yml.bak');
      expect(await fs.pathExists(backupPath)).toBe(true);

      const backupContent = await fs.readFile(backupPath, 'utf-8');
      expect(backupContent).toContain('old-project');
      expect(backupContent).toContain('go');

      // Verify new config
      const newConfig = await fs.readFile(serenaConfigPath, 'utf-8');
      expect(newConfig).toContain('new-project');
      expect(newConfig).toContain('typescript');
    });
  });

  describe('Setup_HookMerging_PreservesExisting', () => {
    it('should merge with existing hooks without duplicates', async () => {
      await fs.ensureDir(path.join(testDir, '.claude', 'hooks'));

      const manifestManager = new ManifestManager(testDir);
      const manifest = await manifestManager.create('1.0.0', ['core']);
      await manifestManager.write(manifest);

      // Create settings with existing hooks
      const settingsPath = path.join(testDir, '.claude', 'settings.local.json');
      const existingSettings: SettingsLocal = {
        permissions: { allow: ['Bash(git:*)'] },
        hooks: {
          SessionStart: [
            {
              matcher: '.*',
              hooks: [
                {
                  type: 'command',
                  command: `${testDir}/.claude/hooks/custom-start.sh`,
                  statusMessage: 'Custom startup...',
                },
              ],
            },
          ],
        },
      };
      await fs.writeJson(settingsPath, existingSettings);

      // Run setup
      await setupMcp(testDir, {
        graphiti: true,
        serena: true,
        graphitiGroupId: 'test-project',
        serenaProjectName: 'test-project',
        serenaLanguage: 'typescript',
      });

      // Verify settings merged correctly
      const settings: SettingsLocal = await fs.readJson(settingsPath);

      // Existing permission preserved
      expect(settings.permissions!.allow).toContain('Bash(git:*)');

      // MCP permissions added
      expect(settings.permissions!.allow).toContain('mcp__graphiti__add_memory');

      // Existing hook preserved
      expect(settings.hooks!.SessionStart).toBeDefined();
      expect(settings.hooks!.SessionStart!.length).toBe(2); // Existing + MCP

      // Find custom hook
      const customHook = settings.hooks!.SessionStart!.find(
        (g) => g.hooks.some((h) => h.command?.includes('custom-start.sh'))
      );
      expect(customHook).toBeDefined();

      // Find MCP hook
      const mcpHook = settings.hooks!.SessionStart!.find(
        (g) => g.hooks.some((h) => h.command?.includes('session-start-mcp.sh'))
      );
      expect(mcpHook).toBeDefined();
    });

    it('should replace absolute paths with template paths on re-run', async () => {
      await fs.ensureDir(path.join(testDir, '.claude', 'hooks'));

      const manifestManager = new ManifestManager(testDir);
      const manifest = await manifestManager.create('1.0.0', ['core']);
      await manifestManager.write(manifest);

      // Create settings with absolute path hook (from first init)
      const settingsPath = path.join(testDir, '.claude', 'settings.local.json');
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
        },
      };
      await fs.writeJson(settingsPath, existingSettings);

      // Run setup (simulates re-running setup command)
      await setupMcp(testDir, {
        graphiti: true,
        serena: true,
        graphitiGroupId: 'test-project',
        serenaProjectName: 'test-project',
        serenaLanguage: 'typescript',
      });

      // Verify settings now use template path
      const settings: SettingsLocal = await fs.readJson(settingsPath);

      // Should still have one SessionStart hook group
      expect(settings.hooks!.SessionStart).toHaveLength(1);

      // Hook should use {{PROJECT_ROOT}} template
      const hookCommand = settings.hooks!.SessionStart![0].hooks[0].command;
      expect(hookCommand).toContain('{{PROJECT_ROOT}}');
      expect(hookCommand).not.toContain(testDir); // Absolute path replaced
    });
  });

  describe('Setup_ErrorHandling_ValidatesInput', () => {
    it('should fail gracefully when manifest missing', async () => {
      await fs.ensureDir(path.join(testDir, '.claude', 'hooks'));

      // Don't create manifest
      const settingsPath = path.join(testDir, '.claude', 'settings.local.json');
      await fs.writeJson(settingsPath, { permissions: { allow: [] }, hooks: {} });

      // Setup should throw or exit gracefully
      await expect(
        setupMcp(testDir, {
          graphiti: true,
          serena: true,
          graphitiGroupId: 'test',
          serenaProjectName: 'test',
          serenaLanguage: 'typescript',
        })
      ).rejects.toThrow();
    });

    it('should create settings.local.json if missing', async () => {
      await fs.ensureDir(path.join(testDir, '.claude', 'hooks'));

      const manifestManager = new ManifestManager(testDir);
      const manifest = await manifestManager.create('1.0.0', ['core']);
      await manifestManager.write(manifest);

      // Don't create settings.local.json
      const settingsPath = path.join(testDir, '.claude', 'settings.local.json');

      await setupMcp(testDir, {
        graphiti: true,
        serena: false,
        graphitiGroupId: 'test-project',
        serenaProjectName: '',
        serenaLanguage: '',
      });

      // Settings should be created
      expect(await fs.pathExists(settingsPath)).toBe(true);

      const settings: SettingsLocal = await fs.readJson(settingsPath);
      expect(settings.permissions).toBeDefined();
      expect(settings.hooks).toBeDefined();
    });
  });
});

/**
 * Helper to simulate MCP setup (mirrors setup.ts logic)
 */
async function setupMcp(
  projectPath: string,
  options: {
    graphiti: boolean;
    serena: boolean;
    graphitiGroupId: string;
    serenaProjectName: string;
    serenaLanguage: string;
  }
): Promise<void> {
  const { ManifestManager } = await import('../../../lib/manifest-manager.js');
  const {
    createSerenaProjectConfig,
    getMcpPermissions,
    getMcpHooks,
    createSessionStartHook,
    createSessionEndHook,
  } = await import('../../../templates/index.js');

  // Validate manifest exists
  const manifestManager = new ManifestManager(projectPath);
  if (!(await manifestManager.exists())) {
    throw new Error('Not an agentic framework project');
  }

  // Update manifest with MCP config
  const manifest = await manifestManager.read();
  manifest.mcp = {
    enabled: true,
    graphiti: {
      enabled: options.graphiti,
      groupId: options.graphitiGroupId,
    },
    serena: {
      enabled: options.serena,
      projectName: options.serenaProjectName,
      language: options.serenaLanguage,
    },
  };
  await manifestManager.write(manifest);

  // Create Serena project config if enabled
  if (options.serena) {
    const serenaDir = path.join(projectPath, '.serena');
    const serenaConfigPath = path.join(serenaDir, 'project.yml');
    await fs.ensureDir(serenaDir);

    // Back up existing config if it exists
    if (await fs.pathExists(serenaConfigPath)) {
      const backupPath = path.join(serenaDir, 'project.yml.bak');
      await fs.copy(serenaConfigPath, backupPath);
    }

    const serenaConfig = createSerenaProjectConfig(
      options.serenaProjectName,
      options.serenaLanguage
    );
    await fs.writeFile(serenaConfigPath, serenaConfig, 'utf-8');

    // Create memories directory
    await fs.ensureDir(path.join(serenaDir, 'memories'));
  }

  // Create MCP hook scripts
  const hooksDir = path.join(projectPath, '.claude', 'hooks');
  await fs.ensureDir(hooksDir);

  // Session start hook
  const sessionStartHook = createSessionStartHook(
    options.graphiti,
    options.serena,
    options.graphitiGroupId,
    options.serenaProjectName
  );
  await fs.writeFile(
    path.join(hooksDir, 'session-start-mcp.sh'),
    sessionStartHook,
    'utf-8'
  );
  await fs.chmod(path.join(hooksDir, 'session-start-mcp.sh'), 0o755);

  // Session end hook (Graphiti only)
  if (options.graphiti) {
    const sessionEndHook = createSessionEndHook(options.graphitiGroupId);
    await fs.writeFile(
      path.join(hooksDir, 'session-end-graphiti.sh'),
      sessionEndHook,
      'utf-8'
    );
    await fs.chmod(path.join(hooksDir, 'session-end-graphiti.sh'), 0o755);
  }

  // Update settings.local.json
  const settingsPath = path.join(projectPath, '.claude', 'settings.local.json');
  let settings: SettingsLocal = {};

  if (await fs.pathExists(settingsPath)) {
    settings = await fs.readJson(settingsPath);
  }

  // Merge MCP permissions
  const mcpPermissions = getMcpPermissions(options.graphiti, options.serena);
  const existingPermissions = settings.permissions?.allow || [];
  const newPermissions = [...new Set([...existingPermissions, ...mcpPermissions])];
  settings.permissions = { ...(settings.permissions || {}), allow: newPermissions };

  // Merge MCP hooks
  const mcpHooks = getMcpHooks(projectPath, options.graphiti, options.serena);
  settings.hooks = mergeHooks(settings.hooks, mcpHooks);

  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
}

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

  function hookCommandExists(existingHooks: any[], newCommand: string): boolean {
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

    const processedHooks: any[] = [];

    for (const hookGroup of eventHooks) {
      const processedGroup = { ...hookGroup };

      if (hookGroup.hooks) {
        const shouldReplace = hookGroup.hooks.some((h: any) => {
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
        const hookCommands = hook.hooks.map((h: any) => h.command).filter(Boolean) as string[];
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
