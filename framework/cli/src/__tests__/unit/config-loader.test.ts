import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import fs from 'fs-extra';
import {
  loadBacklogConfig,
  resolveCredentials,
  BacklogConfig,
} from '../../lib/backlog/config-loader.js';

describe('config-loader', () => {
  const TEST_DIR = path.join(__dirname, '../fixtures/config-loader-test');

  beforeEach(async () => {
    await fs.ensureDir(TEST_DIR);
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  describe('loadBacklogConfig', () => {
    it('should load a valid config file', async () => {
      const config: BacklogConfig = {
        jiraProject: 'DAPM',
        jiraBaseUrl: 'https://example.atlassian.net',
      };
      await fs.writeJson(path.join(TEST_DIR, 'backlog.config.json'), config);

      const result = await loadBacklogConfig(TEST_DIR);

      expect(result.jiraProject).toBe('DAPM');
      expect(result.jiraBaseUrl).toBe('https://example.atlassian.net');
      expect(result.envFile).toBe('.env');
      expect(result.components).toEqual([]);
      expect(result.defaults.ticketPath).toBe('./backlog/tickets');
    });

    it('should throw if config file is missing', async () => {
      await expect(loadBacklogConfig(TEST_DIR)).rejects.toThrow(
        'backlog.config.json not found'
      );
    });

    it('should throw if required fields are missing', async () => {
      await fs.writeJson(path.join(TEST_DIR, 'backlog.config.json'), {});
      await expect(loadBacklogConfig(TEST_DIR)).rejects.toThrow('jiraProject');
    });

    it('should merge defaults for optional fields', async () => {
      await fs.writeJson(path.join(TEST_DIR, 'backlog.config.json'), {
        jiraProject: 'TEST',
        jiraBaseUrl: 'https://test.atlassian.net',
        components: ['Team: Frontend', 'Team: Backend'],
        defaults: { ticketPath: './custom/tickets' },
      });

      const result = await loadBacklogConfig(TEST_DIR);

      expect(result.components).toEqual(['Team: Frontend', 'Team: Backend']);
      expect(result.defaults.ticketPath).toBe('./custom/tickets');
      expect(result.defaults.epicPath).toBe('./backlog/epics');
    });
  });

  describe('resolveCredentials', () => {
    it('should load credentials from env file', async () => {
      const envContent =
        'JIRA_EMAIL=test@example.com\nJIRA_API_TOKEN=secret123\n';
      await fs.writeFile(path.join(TEST_DIR, '.env'), envContent);

      const config: BacklogConfig = {
        jiraProject: 'DAPM',
        jiraBaseUrl: 'https://example.atlassian.net',
        envFile: '.env',
        components: [],
        defaults: {
          ticketPath: './backlog/tickets',
          epicPath: './backlog/epics',
          sprintPath: './backlog/sprints',
          milestonePath: './backlog/milestones',
        },
      };

      const creds = resolveCredentials(config, TEST_DIR);

      expect(creds.email).toBe('test@example.com');
      expect(creds.apiToken).toBe('secret123');
      expect(creds.baseUrl).toBe('https://example.atlassian.net');
    });

    it('should throw if credentials are missing from env', async () => {
      await fs.writeFile(path.join(TEST_DIR, '.env'), 'OTHER_VAR=value\n');

      const config: BacklogConfig = {
        jiraProject: 'DAPM',
        jiraBaseUrl: 'https://example.atlassian.net',
        envFile: '.env',
        components: [],
        defaults: {
          ticketPath: './backlog/tickets',
          epicPath: './backlog/epics',
          sprintPath: './backlog/sprints',
          milestonePath: './backlog/milestones',
        },
      };

      expect(() => resolveCredentials(config, TEST_DIR)).toThrow('JIRA_EMAIL');
    });

    it('should throw if JIRA_API_TOKEN is missing from env', async () => {
      await fs.writeFile(path.join(TEST_DIR, '.env'), 'JIRA_EMAIL=test@example.com\n');
      const config: BacklogConfig = {
        jiraProject: 'DAPM',
        jiraBaseUrl: 'https://example.atlassian.net',
        envFile: '.env',
        components: [],
        defaults: {
          ticketPath: './backlog/tickets',
          epicPath: './backlog/epics',
          sprintPath: './backlog/sprints',
          milestonePath: './backlog/milestones',
        },
      };
      expect(() => resolveCredentials(config, TEST_DIR)).toThrow('JIRA_API_TOKEN');
    });

    it('should use envOverride path when provided', async () => {
      await fs.writeFile(path.join(TEST_DIR, 'custom.env'), 'JIRA_EMAIL=custom@example.com\nJIRA_API_TOKEN=customtoken\n');
      const config: BacklogConfig = {
        jiraProject: 'DAPM',
        jiraBaseUrl: 'https://example.atlassian.net',
        envFile: '.env',
        components: [],
        defaults: {
          ticketPath: './backlog/tickets',
          epicPath: './backlog/epics',
          sprintPath: './backlog/sprints',
          milestonePath: './backlog/milestones',
        },
      };
      const creds = resolveCredentials(config, TEST_DIR, 'custom.env');
      expect(creds.email).toBe('custom@example.com');
      expect(creds.apiToken).toBe('customtoken');
    });
  });
});
