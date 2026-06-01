/**
 * Integration Test: Init Command with MCP
 *
 * Tests the init command with --with-mcp flag and various MCP configurations.
 * Verifies full project initialization including MCP setup in one command.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { execFileSync } from 'child_process';
import { ManifestManager } from '../../lib/manifest-manager.js';
import type { SettingsLocal } from '../../templates/settings-local.js';

// Path to the built CLI binary (must be pre-built before running integration tests)
const CLI_DIST = path.resolve(__dirname, '../../../dist/index.js');

describe('Init Command with MCP Integration', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'init-mcp-test-'));
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('Init_WithMcpBoth_CreatesFullSetup', () => {
    it('should initialize project with Graphiti and Serena enabled', async () => {
      // Simulate init with MCP (both Graphiti and Serena)
      await initializeWithMcp(testDir, {
        projectName: 'test-project',
        modules: ['core'],
        mcp: {
          enabled: true,
          graphiti: true,
          serena: true,
          graphitiGroupId: 'test-project',
          serenaProject: 'test-project',
          serenaLanguage: 'typescript',
        },
      });

      // Verify project structure created
      expect(await fs.pathExists(path.join(testDir, '.claude'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, '.claude', 'commands'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, '.claude', 'skills'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, '.claude', 'context'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, '.claude', 'hooks'))).toBe(true);

      // Verify manifest created with MCP config
      const manifestManager = new ManifestManager(testDir);
      expect(await manifestManager.exists()).toBe(true);

      const manifest = await manifestManager.read();
      expect(manifest.mcp).toBeDefined();
      expect(manifest.mcp!.enabled).toBe(true);
      expect(manifest.mcp!.graphiti?.enabled).toBe(true);
      expect(manifest.mcp!.graphiti?.groupId).toBe('test-project');
      expect(manifest.mcp!.serena?.enabled).toBe(true);
      expect(manifest.mcp!.serena?.projectName).toBe('test-project');
      expect(manifest.mcp!.serena?.language).toBe('typescript');

      // Verify Serena config created
      const serenaConfigPath = path.join(testDir, '.serena', 'project.yml');
      expect(await fs.pathExists(serenaConfigPath)).toBe(true);

      const serenaConfig = await fs.readFile(serenaConfigPath, 'utf-8');
      expect(serenaConfig).toContain('name: "test-project"');
      expect(serenaConfig).toContain('language: typescript');

      // Verify Serena memories directory
      expect(await fs.pathExists(path.join(testDir, '.serena', 'memories'))).toBe(true);

      // Verify MCP hooks created
      const sessionStartHook = path.join(testDir, '.claude', 'hooks', 'session-start-mcp.sh');
      const sessionEndHook = path.join(testDir, '.claude', 'hooks', 'session-end-graphiti.sh');

      expect(await fs.pathExists(sessionStartHook)).toBe(true);
      expect(await fs.pathExists(sessionEndHook)).toBe(true);

      // Verify hooks are executable
      const startStat = await fs.stat(sessionStartHook);
      expect((startStat.mode & 0o111) !== 0).toBe(true);

      const endStat = await fs.stat(sessionEndHook);
      expect((endStat.mode & 0o111) !== 0).toBe(true);

      // Verify hook content
      const startContent = await fs.readFile(sessionStartHook, 'utf-8');
      expect(startContent).toContain('activate_project("test-project")');
      expect(startContent).toContain('test-project');

      const endContent = await fs.readFile(sessionEndHook, 'utf-8');
      expect(endContent).toContain('test-project');

      // Verify settings.local.json has MCP permissions and hooks
      const settingsPath = path.join(testDir, '.claude', 'settings.local.json');
      expect(await fs.pathExists(settingsPath)).toBe(true);

      const settings: SettingsLocal = await fs.readJson(settingsPath);

      // Verify Graphiti permissions
      expect(settings.permissions!.allow).toContain('mcp__graphiti__add_memory');
      expect(settings.permissions!.allow).toContain('mcp__graphiti__search_memory_facts');
      expect(settings.permissions!.allow).toContain('mcp__graphiti__search_nodes');

      // Verify Serena permissions
      expect(settings.permissions!.allow).toContain('mcp__plugin_serena_serena__activate_project');
      expect(settings.permissions!.allow).toContain('mcp__plugin_serena_serena__find_symbol');
      expect(settings.permissions!.allow).toContain('mcp__plugin_serena_serena__get_symbols_overview');

      // Verify hooks registered
      expect(settings.hooks!.SessionStart).toBeDefined();
      expect(settings.hooks!.Stop).toBeDefined();
    });
  });

  describe('Init_WithMcpGraphitiOnly_CreatesGraphitiSetup', () => {
    it('should initialize project with Graphiti only', async () => {
      await initializeWithMcp(testDir, {
        projectName: 'graphiti-project',
        modules: ['core'],
        mcp: {
          enabled: true,
          graphiti: true,
          serena: false,
          graphitiGroupId: 'graphiti-project',
          serenaProject: '',
          serenaLanguage: '',
        },
      });

      // Verify manifest has Graphiti config only
      const manifestManager = new ManifestManager(testDir);
      const manifest = await manifestManager.read();

      expect(manifest.mcp!.graphiti?.enabled).toBe(true);
      expect(manifest.mcp!.serena?.enabled).toBe(false);

      // Verify Serena config NOT created
      expect(await fs.pathExists(path.join(testDir, '.serena'))).toBe(false);

      // Verify session start hook exists (for Graphiti reminder)
      const sessionStartHook = path.join(testDir, '.claude', 'hooks', 'session-start-mcp.sh');
      expect(await fs.pathExists(sessionStartHook)).toBe(true);

      // Verify session end hook exists (for Graphiti)
      const sessionEndHook = path.join(testDir, '.claude', 'hooks', 'session-end-graphiti.sh');
      expect(await fs.pathExists(sessionEndHook)).toBe(true);

      // Verify only Graphiti permissions
      const settingsPath = path.join(testDir, '.claude', 'settings.local.json');
      const settings: SettingsLocal = await fs.readJson(settingsPath);

      expect(settings.permissions!.allow).toContain('mcp__graphiti__add_memory');
      expect(settings.permissions!.allow).not.toContain('mcp__plugin_serena_serena__activate_project');
    });
  });

  describe('Init_WithMcpSerenaOnly_CreatesSerenaSetup', () => {
    it('should initialize project with Serena only', async () => {
      await initializeWithMcp(testDir, {
        projectName: 'serena-project',
        modules: ['core'],
        mcp: {
          enabled: true,
          graphiti: false,
          serena: true,
          graphitiGroupId: '',
          serenaProject: 'serena-project',
          serenaLanguage: 'python',
        },
      });

      // Verify manifest has Serena config only
      const manifestManager = new ManifestManager(testDir);
      const manifest = await manifestManager.read();

      expect(manifest.mcp!.graphiti?.enabled).toBe(false);
      expect(manifest.mcp!.serena?.enabled).toBe(true);
      expect(manifest.mcp!.serena?.language).toBe('python');

      // Verify Serena config created
      const serenaConfigPath = path.join(testDir, '.serena', 'project.yml');
      expect(await fs.pathExists(serenaConfigPath)).toBe(true);

      const serenaConfig = await fs.readFile(serenaConfigPath, 'utf-8');
      expect(serenaConfig).toContain('language: python');

      // Verify session start hook exists (for Serena)
      const sessionStartHook = path.join(testDir, '.claude', 'hooks', 'session-start-mcp.sh');
      expect(await fs.pathExists(sessionStartHook)).toBe(true);

      // Verify session end hook NOT created (Graphiti only)
      const sessionEndHook = path.join(testDir, '.claude', 'hooks', 'session-end-graphiti.sh');
      expect(await fs.pathExists(sessionEndHook)).toBe(false);

      // Verify only Serena permissions
      const settingsPath = path.join(testDir, '.claude', 'settings.local.json');
      const settings: SettingsLocal = await fs.readJson(settingsPath);

      expect(settings.permissions!.allow).not.toContain('mcp__graphiti__add_memory');
      expect(settings.permissions!.allow).toContain('mcp__plugin_serena_serena__activate_project');

      // Verify no Graphiti Stop hook (may have framework default hooks)
      const stopHooks = settings.hooks!.Stop || [];
      const hasGraphitiHook = stopHooks.some(g =>
        g.hooks.some(h => h.command?.includes('session-end-graphiti.sh'))
      );
      expect(hasGraphitiHook).toBe(false);
    });
  });

  describe('Init_WithoutMcp_SkipsMcpSetup', () => {
    it('should initialize project without MCP when not enabled', async () => {
      await initializeWithMcp(testDir, {
        projectName: 'no-mcp-project',
        modules: ['core'],
        mcp: undefined, // No MCP config
      });

      // Verify manifest has no MCP config
      const manifestManager = new ManifestManager(testDir);
      const manifest = await manifestManager.read();

      expect(manifest.mcp).toBeUndefined();

      // Verify Serena config NOT created
      expect(await fs.pathExists(path.join(testDir, '.serena'))).toBe(false);

      // Verify MCP hooks NOT created
      expect(await fs.pathExists(path.join(testDir, '.claude', 'hooks', 'session-start-mcp.sh'))).toBe(false);
      expect(await fs.pathExists(path.join(testDir, '.claude', 'hooks', 'session-end-graphiti.sh'))).toBe(false);

      // Verify settings.local.json has no MCP permissions
      const settingsPath = path.join(testDir, '.claude', 'settings.local.json');
      const settings: SettingsLocal = await fs.readJson(settingsPath);

      expect(settings.permissions!.allow).not.toContain('mcp__graphiti__add_memory');
      expect(settings.permissions!.allow).not.toContain('mcp__plugin_serena_serena__activate_project');
    });
  });

  describe('Init_DifferentLanguages_ConfiguresSerena', () => {
    it('should configure Serena with JavaScript', async () => {
      await initializeWithMcp(testDir, {
        projectName: 'js-project',
        modules: ['core'],
        mcp: {
          enabled: true,
          graphiti: false,
          serena: true,
          graphitiGroupId: '',
          serenaProject: 'js-project',
          serenaLanguage: 'javascript',
        },
      });

      const serenaConfigPath = path.join(testDir, '.serena', 'project.yml');
      const serenaConfig = await fs.readFile(serenaConfigPath, 'utf-8');
      expect(serenaConfig).toContain('language: javascript');
    });

    it('should configure Serena with Go', async () => {
      await initializeWithMcp(testDir, {
        projectName: 'go-project',
        modules: ['core'],
        mcp: {
          enabled: true,
          graphiti: false,
          serena: true,
          graphitiGroupId: '',
          serenaProject: 'go-project',
          serenaLanguage: 'go',
        },
      });

      const serenaConfigPath = path.join(testDir, '.serena', 'project.yml');
      const serenaConfig = await fs.readFile(serenaConfigPath, 'utf-8');
      expect(serenaConfig).toContain('language: go');
    });

    it('should configure Serena with Rust', async () => {
      await initializeWithMcp(testDir, {
        projectName: 'rust-project',
        modules: ['core'],
        mcp: {
          enabled: true,
          graphiti: false,
          serena: true,
          graphitiGroupId: '',
          serenaProject: 'rust-project',
          serenaLanguage: 'rust',
        },
      });

      const serenaConfigPath = path.join(testDir, '.serena', 'project.yml');
      const serenaConfig = await fs.readFile(serenaConfigPath, 'utf-8');
      expect(serenaConfig).toContain('language: rust');
    });
  });

  describe('Init_TemplatePathsInHooks_UseProjectRoot', () => {
    it('should use {{PROJECT_ROOT}} placeholder in hook paths', async () => {
      await initializeWithMcp(testDir, {
        projectName: 'template-test',
        modules: ['core'],
        mcp: {
          enabled: true,
          graphiti: true,
          serena: true,
          graphitiGroupId: 'template-test',
          serenaProject: 'template-test',
          serenaLanguage: 'typescript',
        },
      });

      // Verify settings.local.json uses template paths
      const settingsPath = path.join(testDir, '.claude', 'settings.local.json');
      const settings: SettingsLocal = await fs.readJson(settingsPath);

      // SessionStart hook should use template
      const sessionStartHook = settings.hooks!.SessionStart![0].hooks[0];
      expect(sessionStartHook.command).toContain('{{PROJECT_ROOT}}');
      expect(sessionStartHook.command).not.toContain(testDir); // No absolute path

      // Stop hook should use template
      if (settings.hooks!.Stop) {
        const stopHook = settings.hooks!.Stop[0].hooks[0];
        expect(stopHook.command).toContain('{{PROJECT_ROOT}}');
        expect(stopHook.command).not.toContain(testDir);
      }
    });
  });
  describe('Module directory creation', () => {
    it('should create declared directories for installed modules', async () => {
      // Exercise the real executeInit() code path via the CLI binary to verify
      // that directory creation works end-to-end for the backlog module which
      // declares backlog/tickets, backlog/epics, backlog/sprints, backlog/milestones.
      execFileSync(
        process.execPath,
        [CLI_DIST, 'init', 'dir-creation-test', '--no-interactive', '--no-git', '--modules', 'backlog'],
        {
          cwd: testDir,
          env: { ...process.env, NO_COLOR: '1' },
          timeout: 60000,
        }
      );

      expect(await fs.pathExists(path.join(testDir, 'backlog', 'tickets'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, 'backlog', 'epics'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, 'backlog', 'sprints'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, 'backlog', 'milestones'))).toBe(true);
    });

    it('should not fail when module declares no directories', () => {
      // core module declares no directories — init should complete without error
      // and must not create any module-specific dirs like backlog/ or reports/
      expect(() =>
        execFileSync(
          process.execPath,
          [CLI_DIST, 'init', 'no-dirs-test', '--no-interactive', '--no-git', '--modules', 'core'],
          { cwd: testDir, env: { ...process.env, NO_COLOR: '1' }, timeout: 60000 }
        )
      ).not.toThrow();

      expect(fs.pathExistsSync(path.join(testDir, 'backlog'))).toBe(false);
      expect(fs.pathExistsSync(path.join(testDir, 'reports'))).toBe(false);
    });
  });
});

/**
 * Helper: Initialize project with MCP (simulates init command with MCP config)
 */
async function initializeWithMcp(
  projectPath: string,
  config: {
    projectName: string;
    modules: string[];
    mcp?: {
      enabled: boolean;
      graphiti: boolean;
      serena: boolean;
      graphitiGroupId: string;
      serenaProject: string;
      serenaLanguage: string;
    };
  }
): Promise<void> {
  const { ManifestManager } = await import('../../lib/manifest-manager.js');
  const {
    settingsLocalTemplate,
    createSerenaProjectConfig,
    getMcpPermissions,
    getMcpHooks,
    createSessionStartHook,
    createSessionEndHook,
  } = await import('../../templates/index.js');

  // Create directory structure
  await fs.ensureDir(path.join(projectPath, '.claude'));
  await fs.ensureDir(path.join(projectPath, '.claude', 'commands'));
  await fs.ensureDir(path.join(projectPath, '.claude', 'skills'));
  await fs.ensureDir(path.join(projectPath, '.claude', 'context'));
  await fs.ensureDir(path.join(projectPath, '.claude', 'hooks'));

  // Create manifest
  const manifestManager = new ManifestManager(projectPath);
  const manifest = await manifestManager.create('1.0.0', config.modules);
  await manifestManager.write(manifest);

  // Create settings.local.json from template
  const settingsPath = path.join(projectPath, '.claude', 'settings.local.json');
  await fs.writeJson(settingsPath, settingsLocalTemplate);

  // Configure MCP if enabled
  if (config.mcp?.enabled) {
    const { mcp } = config;

    // Update manifest with MCP config
    const manifest = await manifestManager.read();
    manifest.mcp = {
      enabled: true,
      graphiti: {
        enabled: mcp.graphiti,
        groupId: mcp.graphitiGroupId,
      },
      serena: {
        enabled: mcp.serena,
        projectName: mcp.serenaProject,
        language: mcp.serenaLanguage,
      },
    };
    await manifestManager.write(manifest);

    // Create Serena project config if enabled
    if (mcp.serena) {
      const serenaDir = path.join(projectPath, '.serena');
      await fs.ensureDir(serenaDir);
      await fs.ensureDir(path.join(serenaDir, 'memories'));

      const serenaConfig = createSerenaProjectConfig(mcp.serenaProject, mcp.serenaLanguage);
      await fs.writeFile(path.join(serenaDir, 'project.yml'), serenaConfig, 'utf-8');
    }

    // Create MCP hook scripts
    const hooksDir = path.join(projectPath, '.claude', 'hooks');

    // Session start hook
    const sessionStartHook = createSessionStartHook(
      mcp.graphiti,
      mcp.serena,
      mcp.graphitiGroupId,
      mcp.serenaProject
    );
    await fs.writeFile(path.join(hooksDir, 'session-start-mcp.sh'), sessionStartHook, 'utf-8');
    await fs.chmod(path.join(hooksDir, 'session-start-mcp.sh'), 0o755);

    // Session end hook (Graphiti only)
    if (mcp.graphiti) {
      const sessionEndHook = createSessionEndHook(mcp.graphitiGroupId);
      await fs.writeFile(path.join(hooksDir, 'session-end-graphiti.sh'), sessionEndHook, 'utf-8');
      await fs.chmod(path.join(hooksDir, 'session-end-graphiti.sh'), 0o755);
    }

    // Update settings.local.json with MCP permissions and hooks
    let settings: SettingsLocal = await fs.readJson(settingsPath);

    // Merge MCP permissions
    const mcpPermissions = getMcpPermissions(mcp.graphiti, mcp.serena);
    const existingPermissions = settings.permissions?.allow || [];
    const newPermissions = [...new Set([...existingPermissions, ...mcpPermissions])];
    settings.permissions = { ...(settings.permissions || {}), allow: newPermissions };

    // Merge MCP hooks
    const mcpHooks = getMcpHooks(projectPath, mcp.graphiti, mcp.serena);
    settings.hooks = { ...settings.hooks, ...mcpHooks };

    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  }
}
