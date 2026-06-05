/**
 * E2E Tests for Init Wizard File Handlers
 * Tests file creation, merging, and existing file handling
 *
 * Note: These tests focus on the file handling utilities since
 * the full init command requires ESM-only dependencies that are
 * difficult to test in Jest's CommonJS environment.
 */

import { createSandbox, TestSandbox } from '../../lib/__tests__/test-utils/sandbox.js';
import { detectExistingProject, hasExistingFiles, generatePlannedActions } from '../../lib/wizard/detection.js';
import {
  appendGitignore,
  mergeCLAUDEmd,
  mergeSettingsLocal,
  FRAMEWORK_SEPARATOR,
} from '../../lib/wizard/file-handlers.js';
import { groupModules, getModuleInfo, resolveDependencies, ModuleInfo } from '../../lib/wizard/module-groups.js';
import { generateSummary, WizardAnswers } from '../../lib/wizard/summary.js';

describe('E2E: Init Wizard File Handlers', () => {
  let sandbox: TestSandbox;

  beforeEach(async () => {
    sandbox = await createSandbox('init-wizard-e2e');
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('Detection Logic', () => {
    it('should detect empty directory', async () => {
      const info = await detectExistingProject(sandbox.path);

      expect(info.hasGit).toBe(false);
      expect(info.hasClaudeMd).toBe(false);
      expect(info.hasGitignore).toBe(false);
      expect(info.hasFrameworkManifest).toBe(false);
      expect(hasExistingFiles(info)).toBe(false);
    });

    it('should detect .git directory', async () => {
      await sandbox.createDir('.git');

      const info = await detectExistingProject(sandbox.path);

      expect(info.hasGit).toBe(true);
      expect(hasExistingFiles(info)).toBe(true);
    });

    it('should detect existing CLAUDE.md', async () => {
      await sandbox.createFile('CLAUDE.md', '# Test');

      const info = await detectExistingProject(sandbox.path);

      expect(info.hasClaudeMd).toBe(true);
    });

    it('should detect .gitignore', async () => {
      await sandbox.createFile('.gitignore', 'node_modules/');

      const info = await detectExistingProject(sandbox.path);

      expect(info.hasGitignore).toBe(true);
    });

    it('should detect framework manifest', async () => {
      await sandbox.createJson('.agentic-framework.json', { modules: {} });

      const info = await detectExistingProject(sandbox.path);

      expect(info.hasFrameworkManifest).toBe(true);
    });

    it('should detect README.md', async () => {
      await sandbox.createFile('README.md', '# Project');

      const info = await detectExistingProject(sandbox.path);

      expect(info.hasReadme).toBe(true);
    });

    it('should detect settings.local.json', async () => {
      await sandbox.createDir('.claude');
      await sandbox.createJson('.claude/settings.local.json', {});

      const info = await detectExistingProject(sandbox.path);

      expect(info.hasSettingsLocal).toBe(true);
    });

    it('should generate correct planned actions for new project', async () => {
      const info = await detectExistingProject(sandbox.path);
      const actions = generatePlannedActions(info);

      const actionMap = new Map(actions.map((a) => [a.file, a.action]));
      expect(actionMap.get('.agentic-framework.json')).toBe('CREATE');
      expect(actionMap.get('CLAUDE.md')).toBe('CREATE');
      expect(actionMap.get('.gitignore')).toBe('CREATE');
    });

    it('should generate correct planned actions for existing project', async () => {
      await sandbox.createDir('.git');
      await sandbox.createFile('CLAUDE.md', '# Test');
      await sandbox.createFile('.gitignore', 'node_modules/');
      await sandbox.createFile('README.md', '# Test');

      const info = await detectExistingProject(sandbox.path);
      const actions = generatePlannedActions(info);

      const actionMap = new Map(actions.map((a) => [a.file, a.action]));
      expect(actionMap.get('CLAUDE.md')).toBe('MERGE');
      expect(actionMap.get('.gitignore')).toBe('APPEND');
      expect(actionMap.get('README.md')).toBe('SKIP');
    });
  });

  describe('.gitignore Handling', () => {
    it('should create new .gitignore if not exists', async () => {
      const result = await appendGitignore(sandbox.path);

      expect(result.action).toBe('created');
      expect(await sandbox.exists('.gitignore')).toBe(true);

      const content = await sandbox.readFile('.gitignore');
      expect(content).toContain('# Agentic Framework');
      expect(content).toContain('.claude/telemetry/');
    });

    it('should append to existing .gitignore', async () => {
      await sandbox.createFile('.gitignore', 'node_modules/\ndist/\n');

      const result = await appendGitignore(sandbox.path);

      expect(result.action).toBe('appended');
      const content = await sandbox.readFile('.gitignore');
      expect(content).toContain('node_modules/');
      expect(content).toContain('dist/');
      expect(content).toContain('# Agentic Framework');
      expect(content).toContain('.claude/telemetry/');
    });

    it('should not duplicate entries if already present', async () => {
      await sandbox.createFile('.gitignore', 'node_modules/\n# Agentic Framework\n.claude/telemetry/\n');

      const result = await appendGitignore(sandbox.path);

      expect(result.action).toBe('unchanged');
    });

    it('should preserve original content', async () => {
      const original = '# My project\nnode_modules/\n*.log\n';
      await sandbox.createFile('.gitignore', original);

      await appendGitignore(sandbox.path);

      const content = await sandbox.readFile('.gitignore');
      expect(content).toContain('# My project');
      expect(content).toContain('node_modules/');
      expect(content).toContain('*.log');
    });
  });

  describe('CLAUDE.md Merging', () => {
    it('should create new CLAUDE.md with separator if not exists', async () => {
      const result = await mergeCLAUDEmd(sandbox.path, '# Framework Content');

      expect(result.action).toBe('created');
      const content = await sandbox.readFile('CLAUDE.md');
      expect(content).toContain('# Framework Content');
      expect(content).toContain(FRAMEWORK_SEPARATOR);
    });

    it('should prepend framework content to existing CLAUDE.md', async () => {
      await sandbox.createFile('CLAUDE.md', '# User Project\n\nMy documentation.\n');

      const result = await mergeCLAUDEmd(sandbox.path, '# Framework Section');

      expect(result.action).toBe('merged');
      const content = await sandbox.readFile('CLAUDE.md');

      // Check order: framework content first
      const separatorIndex = content.indexOf(FRAMEWORK_SEPARATOR);
      const frameworkIndex = content.indexOf('# Framework Section');
      const userIndex = content.indexOf('# User Project');

      expect(frameworkIndex).toBeLessThan(separatorIndex);
      expect(separatorIndex).toBeLessThan(userIndex);
    });

    it('should preserve user content below separator', async () => {
      await sandbox.createFile('CLAUDE.md', '# User Content\n\nImportant stuff here.\n');

      await mergeCLAUDEmd(sandbox.path, '# Framework');

      const content = await sandbox.readFile('CLAUDE.md');
      const parts = content.split(FRAMEWORK_SEPARATOR);

      expect(parts.length).toBe(2);
      expect(parts[0]).toContain('# Framework');
      expect(parts[1]).toContain('# User Content');
      expect(parts[1]).toContain('Important stuff here.');
    });

    it('should replace framework section if separator already exists', async () => {
      const existingContent = `# Old Framework Content\n\n${FRAMEWORK_SEPARATOR}\n\n# User Content`;
      await sandbox.createFile('CLAUDE.md', existingContent);

      const result = await mergeCLAUDEmd(sandbox.path, '# New Framework Content');

      expect(result.action).toBe('updated');
      const content = await sandbox.readFile('CLAUDE.md');
      expect(content).toContain('# New Framework Content');
      expect(content).not.toContain('# Old Framework Content');
      expect(content).toContain('# User Content');
    });

    it('should handle CLAUDE.md with only framework separator', async () => {
      await sandbox.createFile('CLAUDE.md', `${FRAMEWORK_SEPARATOR}\n`);

      await mergeCLAUDEmd(sandbox.path, '# New Framework');

      const content = await sandbox.readFile('CLAUDE.md');
      expect(content).toContain('# New Framework');
      expect(content.split(FRAMEWORK_SEPARATOR).length).toBe(2);
    });
  });

  describe('Settings Merge', () => {
    it('should create new settings if not exists', async () => {
      const result = await mergeSettingsLocal(sandbox.path, { setting: true });

      expect(result.action).toBe('created');
      expect(await sandbox.exists('.claude/settings.local.json')).toBe(true);

      const settings = await sandbox.readJson<Record<string, unknown>>('.claude/settings.local.json');
      expect(settings.setting).toBe(true);
    });

    it('should deep merge nested objects', async () => {
      await sandbox.createDir('.claude');
      await sandbox.createJson('.claude/settings.local.json', {
        user: { preference: 'dark' },
      });

      await mergeSettingsLocal(sandbox.path, {
        framework: { version: '1.0.0' },
      });

      const settings = await sandbox.readJson<Record<string, Record<string, unknown>>>('.claude/settings.local.json');
      expect(settings.user?.preference).toBe('dark');
      expect(settings.framework?.version).toBe('1.0.0');
    });

    it('should combine permissions arrays', async () => {
      await sandbox.createDir('.claude');
      await sandbox.createJson('.claude/settings.local.json', {
        permissions: { allow: ['Bash(user:*)'] },
      });

      await mergeSettingsLocal(sandbox.path, {
        permissions: { allow: ['Bash(framework:*)'] },
      });

      const settings = await sandbox.readJson<{ permissions: { allow: string[] } }>('.claude/settings.local.json');
      expect(settings.permissions.allow).toContain('Bash(user:*)');
      expect(settings.permissions.allow).toContain('Bash(framework:*)');
    });

    it('should deduplicate permissions', async () => {
      await sandbox.createDir('.claude');
      await sandbox.createJson('.claude/settings.local.json', {
        permissions: { allow: ['Bash(same:*)'] },
      });

      await mergeSettingsLocal(sandbox.path, {
        permissions: { allow: ['Bash(same:*)'] },
      });

      const settings = await sandbox.readJson<{ permissions: { allow: string[] } }>('.claude/settings.local.json');
      const count = settings.permissions.allow.filter((p) => p === 'Bash(same:*)').length;
      expect(count).toBe(1);
    });

    it('should preserve user custom settings', async () => {
      await sandbox.createDir('.claude');
      await sandbox.createJson('.claude/settings.local.json', {
        customSetting: 'user-value',
        nested: { deep: { value: 42 } },
      });

      await mergeSettingsLocal(sandbox.path, {
        frameworkSetting: 'framework-value',
      });

      const settings = await sandbox.readJson<Record<string, unknown>>('.claude/settings.local.json');
      expect(settings.customSetting).toBe('user-value');
      expect((settings.nested as Record<string, Record<string, number>>).deep.value).toBe(42);
    });
  });

  describe('Module Grouping', () => {
    const mockModules: ModuleInfo[] = [
      { id: 'core', name: 'Core', description: 'Framework Core', category: 'Core Infrastructure', version: '1.0.0', isCore: true },
      { id: 'coding', name: 'Coding', description: 'Development', category: 'Development', version: '1.0.0', isCore: false },
      { id: 'jira', name: 'Jira', description: 'Jira Integration', category: 'Integrations', version: '1.0.0', isCore: false },
    ];

    it('should group modules by category', () => {
      const groups = groupModules(mockModules);

      expect(groups.length).toBeGreaterThan(0);
      expect(groups.some((g) => g.name === 'Core Infrastructure')).toBe(true);
      expect(groups.some((g) => g.name === 'Development')).toBe(true);
    });

    it('should resolve dependencies - always include core', () => {
      const result = resolveDependencies(['coding'], mockModules);

      expect(result).toContain('core');
      expect(result).toContain('coding');
    });

    it('should not duplicate core module', () => {
      const result = resolveDependencies(['core', 'core', 'coding'], mockModules);

      const coreCount = result.filter((m) => m === 'core').length;
      expect(coreCount).toBe(1);
    });
  });

  describe('Summary Generation', () => {
    it('should generate summary with correct git status for existing git', async () => {
      await sandbox.createDir('.git');

      const info = await detectExistingProject(sandbox.path);
      const answers: WizardAnswers = {
        projectName: 'test-project',
        projectPath: sandbox.path,
        modules: ['core'],
        initGit: true,
        existingInfo: info,
      };

      const summary = generateSummary(answers);

      expect(summary.gitStatus).toBe('already_exists');
    });

    it('should generate summary with will_init for new git', async () => {
      const info = await detectExistingProject(sandbox.path);
      const answers: WizardAnswers = {
        projectName: 'test-project',
        projectPath: sandbox.path,
        modules: ['core'],
        initGit: true,
        existingInfo: info,
      };

      const summary = generateSummary(answers);

      expect(summary.gitStatus).toBe('will_init');
    });

    it('should generate summary with skip for no git', async () => {
      const info = await detectExistingProject(sandbox.path);
      const answers: WizardAnswers = {
        projectName: 'test-project',
        projectPath: sandbox.path,
        modules: ['core'],
        initGit: false,
        existingInfo: info,
      };

      const summary = generateSummary(answers);

      expect(summary.gitStatus).toBe('skip');
    });

    it('should include modules in summary', async () => {
      const info = await detectExistingProject(sandbox.path);
      const answers: WizardAnswers = {
        projectName: 'test-project',
        projectPath: sandbox.path,
        modules: ['core', 'coding', 'jira'],
        initGit: false,
        existingInfo: info,
      };

      const summary = generateSummary(answers);

      expect(summary.modules).toEqual(['core', 'coding', 'jira']);
    });
  });
});
