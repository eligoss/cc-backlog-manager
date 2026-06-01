/**
 * Tests for Path Resolver
 *
 * Tests path resolution using routes.yml configuration and fallback defaults.
 * Covers:
 * - Loading routes.yml configuration
 * - Dot notation resolution (e.g., 'backlog.tickets')
 * - Semantic path accessors (getTicketPath, getPlanPath, etc.)
 * - Fallback to DEFAULT_PATHS when routes.yml is missing
 * - Graceful handling of malformed routes.yml
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import { createSandbox, TestSandbox } from './test-utils';
import {
  createPathResolver,
  createPathResolverSync,
  getDefaultPaths,
  getTicketTypeDirs,
  type PathResolver,
  type RoutesConfig,
  type TicketType,
} from '../path-resolver';

describe('PathResolver', () => {
  let sandbox: TestSandbox;

  beforeEach(async () => {
    sandbox = await createSandbox('path-resolver');
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('createPathResolver', () => {
    it('should load routes.yml correctly', async () => {
      const routesContent = `
paths:
  backlog:
    root: "ai/backlog/"
    tickets: "ai/backlog/tickets/"
  agents:
    root: "ai/agents/"
  skills:
    root: "ai/skills/"
meta:
  last-updated: "2024-12-27"
`;
      await sandbox.createFile('routes.yml', routesContent);

      const resolver = await createPathResolver(sandbox.path);

      expect(resolver.projectRoot).toBe(sandbox.path);
      expect(resolver.routesConfig).not.toBeNull();
      expect(resolver.routesConfig?.paths).toHaveProperty('backlog');
      expect(resolver.routesConfig?.paths).toHaveProperty('agents');
    });

    it('should work without routes.yml', async () => {
      // No routes.yml file
      const resolver = await createPathResolver(sandbox.path);

      expect(resolver.projectRoot).toBe(sandbox.path);
      expect(resolver.routesConfig).toBeNull();
    });

    it('should normalize project root to absolute path', async () => {
      const relativePath = '.';
      const resolver = await createPathResolver(sandbox.path);

      expect(path.isAbsolute(resolver.projectRoot)).toBe(true);
    });
  });

  describe('resolve() - dot notation', () => {
    it('should resolve paths using dot notation', async () => {
      const routesContent = `
paths:
  backlog:
    root: "ai/backlog"
    tickets: "ai/backlog/tickets"
    archive: "ai/backlog/archive"
`;
      await sandbox.createFile('routes.yml', routesContent);

      const resolver = await createPathResolver(sandbox.path);

      const ticketsPath = resolver.resolve('backlog.tickets');
      expect(ticketsPath).toBe(path.join(sandbox.path, 'ai/backlog/tickets'));

      const archivePath = resolver.resolve('backlog.archive');
      expect(archivePath).toBe(path.join(sandbox.path, 'ai/backlog/archive'));
    });

    it('should resolve category.root with just category name', async () => {
      const routesContent = `
paths:
  backlog:
    root: "ai/backlog"
`;
      await sandbox.createFile('routes.yml', routesContent);

      const resolver = await createPathResolver(sandbox.path);

      // 'backlog' alone should resolve to 'backlog.root'
      const backlogPath = resolver.resolve('backlog');
      expect(backlogPath).toBe(path.join(sandbox.path, 'ai/backlog'));
    });

    it('should return null for non-existent routes', async () => {
      const routesContent = `
paths:
  backlog:
    root: "ai/backlog"
`;
      await sandbox.createFile('routes.yml', routesContent);

      const resolver = await createPathResolver(sandbox.path);

      expect(resolver.resolve('nonexistent.path')).toBeNull();
      expect(resolver.resolve('backlog.nonexistent')).toBeNull();
      expect(resolver.resolve('')).toBeNull();
    });

    it('should return null when routesConfig is null', async () => {
      // No routes.yml file
      const resolver = await createPathResolver(sandbox.path);

      expect(resolver.resolve('backlog.tickets')).toBeNull();
    });

    it('should strip trailing slashes from paths', async () => {
      const routesContent = `
paths:
  backlog:
    tickets: "ai/backlog/tickets/"
`;
      await sandbox.createFile('routes.yml', routesContent);

      const resolver = await createPathResolver(sandbox.path);

      const ticketsPath = resolver.resolve('backlog.tickets');
      expect(ticketsPath).toBe(path.join(sandbox.path, 'ai/backlog/tickets'));
      expect(ticketsPath?.endsWith('/')).toBe(false);
    });
  });

  describe('getTicketPath', () => {
    const ticketTypes: TicketType[] = ['story', 'task', 'bug', 'epic', 'spike'];

    it.each(ticketTypes)('should return correct path for %s tickets', async (type) => {
      const routesContent = `
paths:
  backlog:
    tickets: "ai/backlog/tickets"
`;
      await sandbox.createFile('routes.yml', routesContent);

      const resolver = await createPathResolver(sandbox.path);
      const ticketTypeDirs = getTicketTypeDirs();

      const ticketPath = resolver.getTicketPath(type);
      expect(ticketPath).toBe(
        path.join(sandbox.path, 'ai/backlog/tickets', ticketTypeDirs[type])
      );
    });

    it('should map ticket types to correct directory names', async () => {
      const routesContent = `
paths:
  backlog:
    tickets: "ai/backlog/tickets"
`;
      await sandbox.createFile('routes.yml', routesContent);

      const resolver = await createPathResolver(sandbox.path);

      expect(resolver.getTicketPath('story')).toContain('stories');
      expect(resolver.getTicketPath('task')).toContain('tasks');
      expect(resolver.getTicketPath('bug')).toContain('bugs');
      expect(resolver.getTicketPath('epic')).toContain('epics');
      expect(resolver.getTicketPath('spike')).toContain('spikes');
    });

    it('should use default path when routes.yml is missing', async () => {
      // No routes.yml file
      const resolver = await createPathResolver(sandbox.path);
      const defaultPaths = getDefaultPaths();

      const storyPath = resolver.getTicketPath('story');
      expect(storyPath).toBe(path.join(sandbox.path, defaultPaths.tickets, 'stories'));
    });

    it('should use default path when backlog.tickets is not in routes', async () => {
      const routesContent = `
paths:
  agents:
    root: "ai/agents"
`;
      await sandbox.createFile('routes.yml', routesContent);

      const resolver = await createPathResolver(sandbox.path);
      const defaultPaths = getDefaultPaths();

      const bugPath = resolver.getTicketPath('bug');
      expect(bugPath).toBe(path.join(sandbox.path, defaultPaths.tickets, 'bugs'));
    });
  });

  describe('getPlanPath', () => {
    it('should return plans root without category', async () => {
      const routesContent = `
paths:
  plans:
    root: "ai/plans"
`;
      await sandbox.createFile('routes.yml', routesContent);

      const resolver = await createPathResolver(sandbox.path);

      const plansPath = resolver.getPlanPath();
      expect(plansPath).toBe(path.join(sandbox.path, 'ai/plans'));
    });

    it('should return category subdirectory with category', async () => {
      const routesContent = `
paths:
  plans:
    root: "ai/plans"
`;
      await sandbox.createFile('routes.yml', routesContent);

      const resolver = await createPathResolver(sandbox.path);

      const frameworkPlansPath = resolver.getPlanPath('framework');
      expect(frameworkPlansPath).toBe(path.join(sandbox.path, 'ai/plans/framework'));
    });

    it('should use default path when routes.yml is missing', async () => {
      const resolver = await createPathResolver(sandbox.path);
      const defaultPaths = getDefaultPaths();

      const plansPath = resolver.getPlanPath();
      expect(plansPath).toBe(path.join(sandbox.path, defaultPaths.plans));
    });

    it('should support planning.root as alternative key', async () => {
      const routesContent = `
paths:
  planning:
    root: "ai/planning"
`;
      await sandbox.createFile('routes.yml', routesContent);

      const resolver = await createPathResolver(sandbox.path);

      const plansPath = resolver.getPlanPath();
      expect(plansPath).toBe(path.join(sandbox.path, 'ai/planning'));
    });

    it('should prefer plans.root over planning.root', async () => {
      const routesContent = `
paths:
  plans:
    root: "ai/plans"
  planning:
    root: "ai/planning"
`;
      await sandbox.createFile('routes.yml', routesContent);

      const resolver = await createPathResolver(sandbox.path);

      const plansPath = resolver.getPlanPath();
      expect(plansPath).toBe(path.join(sandbox.path, 'ai/plans'));
    });
  });

  describe('other semantic accessors', () => {
    it('should resolve getContextPath correctly', async () => {
      const routesContent = `
paths:
  context:
    root: "ai/context"
`;
      await sandbox.createFile('routes.yml', routesContent);

      const resolver = await createPathResolver(sandbox.path);

      expect(resolver.getContextPath()).toBe(path.join(sandbox.path, 'ai/context'));
    });

    it('should resolve getAgentPath correctly', async () => {
      const routesContent = `
paths:
  agents:
    root: "ai/agents"
`;
      await sandbox.createFile('routes.yml', routesContent);

      const resolver = await createPathResolver(sandbox.path);

      expect(resolver.getAgentPath()).toBe(path.join(sandbox.path, 'ai/agents'));
    });

    it('should resolve getSkillPath correctly', async () => {
      const routesContent = `
paths:
  skills:
    root: "ai/skills"
`;
      await sandbox.createFile('routes.yml', routesContent);

      const resolver = await createPathResolver(sandbox.path);

      expect(resolver.getSkillPath()).toBe(path.join(sandbox.path, 'ai/skills'));
    });

    it('should resolve getRegistryPath correctly', async () => {
      const routesContent = `
paths:
  registries:
    root: "ai/registries"
`;
      await sandbox.createFile('routes.yml', routesContent);

      const resolver = await createPathResolver(sandbox.path);

      expect(resolver.getRegistryPath()).toBe(path.join(sandbox.path, 'ai/registries'));
    });

    it('should use default paths when routes.yml is missing', async () => {
      const resolver = await createPathResolver(sandbox.path);
      const defaultPaths = getDefaultPaths();

      expect(resolver.getContextPath()).toBe(path.join(sandbox.path, defaultPaths.context));
      expect(resolver.getAgentPath()).toBe(path.join(sandbox.path, defaultPaths.agents));
      expect(resolver.getSkillPath()).toBe(path.join(sandbox.path, defaultPaths.skills));
      expect(resolver.getRegistryPath()).toBe(
        path.join(sandbox.path, defaultPaths.registries)
      );
    });
  });

  describe('fallback to DEFAULT_PATHS', () => {
    it('should return correct default paths', () => {
      const defaults = getDefaultPaths();

      expect(defaults.backlog).toBe('.claude/backlog');
      expect(defaults.tickets).toBe('.claude/backlog/tickets');
      expect(defaults.plans).toBe('.claude/plans');
      expect(defaults.context).toBe('.claude/context');
      expect(defaults.agents).toBe('.claude/commands');
      expect(defaults.skills).toBe('.claude/skills');
      expect(defaults.registries).toBe('.claude/registries');
    });

    it('should use defaults when routes.yml has empty paths', async () => {
      const routesContent = `
paths: {}
`;
      await sandbox.createFile('routes.yml', routesContent);

      const resolver = await createPathResolver(sandbox.path);
      const defaultPaths = getDefaultPaths();

      expect(resolver.getTicketPath('story')).toBe(
        path.join(sandbox.path, defaultPaths.tickets, 'stories')
      );
      expect(resolver.getPlanPath()).toBe(path.join(sandbox.path, defaultPaths.plans));
    });
  });

  describe('graceful handling of malformed routes.yml', () => {
    it('should handle invalid YAML gracefully', async () => {
      await sandbox.createFile('routes.yml', '{ invalid yaml : : }');

      const resolver = await createPathResolver(sandbox.path);

      expect(resolver.routesConfig).toBeNull();
      // Should still work with defaults
      expect(resolver.getTicketPath('story')).toContain('stories');
    });

    it('should handle non-object paths gracefully', async () => {
      const routesContent = `
paths: "not an object"
`;
      await sandbox.createFile('routes.yml', routesContent);

      const resolver = await createPathResolver(sandbox.path);

      expect(resolver.routesConfig).toBeNull();
    });

    it('should handle null paths gracefully', async () => {
      const routesContent = `
paths: null
meta:
  version: "1.0"
`;
      await sandbox.createFile('routes.yml', routesContent);

      const resolver = await createPathResolver(sandbox.path);

      // Should still parse, paths defaults to empty object
      expect(resolver.routesConfig).not.toBeNull();
      expect(resolver.routesConfig?.paths).toEqual({});
    });

    it('should handle empty file gracefully', async () => {
      await sandbox.createFile('routes.yml', '');

      const resolver = await createPathResolver(sandbox.path);

      expect(resolver.routesConfig).toBeNull();
    });

    it('should handle paths with non-string values gracefully', async () => {
      const routesContent = `
paths:
  backlog:
    tickets: 123
`;
      await sandbox.createFile('routes.yml', routesContent);

      const resolver = await createPathResolver(sandbox.path);

      // Should parse but resolve returns null for invalid values
      const ticketsPath = resolver.resolve('backlog.tickets');
      expect(ticketsPath).toBeNull();
    });
  });

  describe('createPathResolverSync', () => {
    it('should create resolver with pre-loaded config', async () => {
      const config: RoutesConfig = {
        paths: {
          backlog: {
            tickets: 'ai/backlog/tickets',
          },
        },
      };

      const resolver = createPathResolverSync(sandbox.path, config);

      expect(resolver.projectRoot).toBe(sandbox.path);
      expect(resolver.routesConfig).not.toBeNull();
      expect(resolver.resolve('backlog.tickets')).toBe(
        path.join(sandbox.path, 'ai/backlog/tickets')
      );
    });

    it('should work with null config', async () => {
      const resolver = createPathResolverSync(sandbox.path, null);

      expect(resolver.projectRoot).toBe(sandbox.path);
      expect(resolver.routesConfig).toBeNull();
      expect(resolver.resolve('backlog.tickets')).toBeNull();
    });
  });

  describe('getTicketTypeDirs', () => {
    it('should return all ticket type mappings', () => {
      const dirs = getTicketTypeDirs();

      expect(dirs).toEqual({
        story: 'stories',
        task: 'tasks',
        bug: 'bugs',
        epic: 'epics',
        spike: 'spikes',
      });
    });

    it('should return a copy (not the original)', () => {
      const dirs1 = getTicketTypeDirs();
      const dirs2 = getTicketTypeDirs();

      expect(dirs1).not.toBe(dirs2);
      expect(dirs1).toEqual(dirs2);
    });
  });

  describe('edge cases', () => {
    it('should handle deeply nested path configurations', async () => {
      const routesContent = `
paths:
  backlog:
    root: "path/to/backlog"
    tickets: "path/to/backlog/tickets"
    archive:
      current: "path/to/backlog/archive/current"
`;
      await sandbox.createFile('routes.yml', routesContent);

      const resolver = await createPathResolver(sandbox.path);

      expect(resolver.resolve('backlog.tickets')).toBe(
        path.join(sandbox.path, 'path/to/backlog/tickets')
      );
    });

    it('should handle meta section without affecting paths', async () => {
      const routesContent = `
paths:
  backlog:
    tickets: "ai/backlog/tickets"
meta:
  last-updated: "2024-12-27"
  sync-status: "synchronized"
  version: "1.0.0"
`;
      await sandbox.createFile('routes.yml', routesContent);

      const resolver = await createPathResolver(sandbox.path);

      expect(resolver.routesConfig?.meta).toEqual({
        'last-updated': '2024-12-27',
        'sync-status': 'synchronized',
        version: '1.0.0',
      });
      expect(resolver.resolve('backlog.tickets')).toBe(
        path.join(sandbox.path, 'ai/backlog/tickets')
      );
    });

    it('should handle paths with special characters', async () => {
      const routesContent = `
paths:
  backlog:
    tickets: "ai/backlog/my-tickets"
    special: "ai/backlog/tickets_v2"
`;
      await sandbox.createFile('routes.yml', routesContent);

      const resolver = await createPathResolver(sandbox.path);

      expect(resolver.resolve('backlog.tickets')).toBe(
        path.join(sandbox.path, 'ai/backlog/my-tickets')
      );
      expect(resolver.resolve('backlog.special')).toBe(
        path.join(sandbox.path, 'ai/backlog/tickets_v2')
      );
    });
  });
});
