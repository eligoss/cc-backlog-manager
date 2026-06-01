/**
 * E2E Test: Backlog Config Scaffolding
 *
 * Verifies that backlog.config.json and .env.example are created in the
 * project root when the backlog module is installed, and that existing
 * files are never overwritten.
 */

import path from 'path';
import { createSandbox, TestSandbox } from '../../lib/__tests__/test-utils/sandbox.js';
import { scaffoldBacklogConfig } from '../../lib/backlog-scaffold.js';

// Resolve the actual framework root (framework/cli → framework/).
// Under Jest the import.meta.url mock prevents normal resolution, so we use __dirname.
// __dirname here is: framework/cli/src/__tests__/e2e/
// From e2e/: ../  → __tests__/
//             ../../ → src/
//             ../../../ → cli/
//             ../../../../ → framework/
const FRAMEWORK_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

describe('E2E: Backlog Config Scaffolding', () => {
  let sandbox: TestSandbox;

  beforeEach(async () => {
    sandbox = await createSandbox('backlog-config-scaffold');
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('scaffoldBacklogConfig', () => {
    it('should create backlog.config.json when it does not exist', async () => {
      await scaffoldBacklogConfig(sandbox.path, FRAMEWORK_ROOT);

      expect(await sandbox.exists('backlog.config.json')).toBe(true);
    });

    it('should create a valid backlog.config.json with expected fields', async () => {
      await scaffoldBacklogConfig(sandbox.path, FRAMEWORK_ROOT);

      const config = await sandbox.readJson<Record<string, unknown>>('backlog.config.json');

      expect(config).toHaveProperty('jiraProject');
      expect(config).toHaveProperty('jiraBaseUrl');
      expect(config).toHaveProperty('envFile');
      expect(config).toHaveProperty('components');
      expect(config).toHaveProperty('defaults');

      const defaults = config.defaults as Record<string, string>;
      expect(defaults).toHaveProperty('ticketPath');
      expect(defaults).toHaveProperty('epicPath');
      expect(defaults).toHaveProperty('sprintPath');
      expect(defaults).toHaveProperty('milestonePath');
    });

    it('should create .env.example when it does not exist', async () => {
      await scaffoldBacklogConfig(sandbox.path, FRAMEWORK_ROOT);

      expect(await sandbox.exists('.env.example')).toBe(true);
    });

    it('should create .env.example with JIRA credentials placeholders', async () => {
      await scaffoldBacklogConfig(sandbox.path, FRAMEWORK_ROOT);

      const content = await sandbox.readFile('.env.example');

      expect(content).toContain('JIRA_EMAIL');
      expect(content).toContain('JIRA_API_TOKEN');
    });

    it('should NOT overwrite existing backlog.config.json', async () => {
      const userConfig = { jiraProject: 'MY_PROJECT', custom: true };
      await sandbox.createJson('backlog.config.json', userConfig);

      await scaffoldBacklogConfig(sandbox.path, FRAMEWORK_ROOT);

      const config = await sandbox.readJson<Record<string, unknown>>('backlog.config.json');
      expect(config.jiraProject).toBe('MY_PROJECT');
      expect(config.custom).toBe(true);
    });

    it('should NOT overwrite existing .env.example', async () => {
      const userContent = 'JIRA_EMAIL=myteam@example.com\nJIRA_API_TOKEN=already-set\n';
      await sandbox.createFile('.env.example', userContent);

      await scaffoldBacklogConfig(sandbox.path, FRAMEWORK_ROOT);

      const content = await sandbox.readFile('.env.example');
      expect(content).toBe(userContent);
    });

    it('should create backlog.config.json even if .env.example already exists', async () => {
      await sandbox.createFile('.env.example', 'JIRA_EMAIL=x\n');

      await scaffoldBacklogConfig(sandbox.path, FRAMEWORK_ROOT);

      expect(await sandbox.exists('backlog.config.json')).toBe(true);
    });

    it('should create .env.example even if backlog.config.json already exists', async () => {
      await sandbox.createJson('backlog.config.json', { jiraProject: 'X' });

      await scaffoldBacklogConfig(sandbox.path, FRAMEWORK_ROOT);

      expect(await sandbox.exists('.env.example')).toBe(true);
    });

    it('should be idempotent - safe to call multiple times', async () => {
      await scaffoldBacklogConfig(sandbox.path, FRAMEWORK_ROOT);
      await scaffoldBacklogConfig(sandbox.path, FRAMEWORK_ROOT);

      const config = await sandbox.readJson<{ jiraProject: string }>('backlog.config.json');
      expect(config.jiraProject).toBe('YOUR_PROJECT_KEY');
    });
  });

  describe('backlog.config.json template content', () => {
    it('should contain placeholder project key', async () => {
      await scaffoldBacklogConfig(sandbox.path, FRAMEWORK_ROOT);

      const config = await sandbox.readJson<{ jiraProject: string }>('backlog.config.json');
      expect(config.jiraProject).toBe('YOUR_PROJECT_KEY');
    });

    it('should contain placeholder Jira base URL', async () => {
      await scaffoldBacklogConfig(sandbox.path, FRAMEWORK_ROOT);

      const config = await sandbox.readJson<{ jiraBaseUrl: string }>('backlog.config.json');
      expect(config.jiraBaseUrl).toContain('atlassian.net');
    });

    it('should point defaults to correct backlog subdirectories', async () => {
      await scaffoldBacklogConfig(sandbox.path, FRAMEWORK_ROOT);

      const config = await sandbox.readJson<{ defaults: Record<string, string> }>('backlog.config.json');
      expect(config.defaults.ticketPath).toContain('tickets');
      expect(config.defaults.epicPath).toContain('epics');
      expect(config.defaults.sprintPath).toContain('sprints');
      expect(config.defaults.milestonePath).toContain('milestones');
    });
  });
});
