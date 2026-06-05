/**
 * Tests for Path Resolver
 *
 * Tests semantic path resolution derived from the project root using the
 * framework's default directory layout (DEFAULT_PATHS). Covers:
 * - Semantic path accessors (getTicketPath, getPlanPath, etc.)
 * - Default path mappings
 * - Ticket type directory mappings
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import { createSandbox, TestSandbox } from './test-utils';
import {
  createPathResolver,
  createPathResolverSync,
  getDefaultPaths,
  getTicketTypeDirs,
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
    it('should set the project root', async () => {
      const resolver = await createPathResolver(sandbox.path);

      expect(resolver.projectRoot).toBe(sandbox.path);
    });

    it('should normalize project root to absolute path', async () => {
      const resolver = await createPathResolver(sandbox.path);

      expect(path.isAbsolute(resolver.projectRoot)).toBe(true);
    });
  });

  describe('getTicketPath', () => {
    const ticketTypes: TicketType[] = ['story', 'task', 'bug', 'epic', 'spike'];

    it.each(ticketTypes)('should return default path for %s tickets', async (type) => {
      const resolver = await createPathResolver(sandbox.path);
      const defaultPaths = getDefaultPaths();
      const ticketTypeDirs = getTicketTypeDirs();

      const ticketPath = resolver.getTicketPath(type);
      expect(ticketPath).toBe(
        path.join(sandbox.path, defaultPaths.tickets, ticketTypeDirs[type])
      );
    });

    it('should map ticket types to correct directory names', async () => {
      const resolver = await createPathResolver(sandbox.path);

      expect(resolver.getTicketPath('story')).toContain('stories');
      expect(resolver.getTicketPath('task')).toContain('tasks');
      expect(resolver.getTicketPath('bug')).toContain('bugs');
      expect(resolver.getTicketPath('epic')).toContain('epics');
      expect(resolver.getTicketPath('spike')).toContain('spikes');
    });
  });

  describe('getPlanPath', () => {
    it('should return plans root without category', async () => {
      const resolver = await createPathResolver(sandbox.path);
      const defaultPaths = getDefaultPaths();

      const plansPath = resolver.getPlanPath();
      expect(plansPath).toBe(path.join(sandbox.path, defaultPaths.plans));
    });

    it('should return category subdirectory with category', async () => {
      const resolver = await createPathResolver(sandbox.path);
      const defaultPaths = getDefaultPaths();

      const frameworkPlansPath = resolver.getPlanPath('framework');
      expect(frameworkPlansPath).toBe(
        path.join(sandbox.path, defaultPaths.plans, 'framework')
      );
    });
  });

  describe('other semantic accessors', () => {
    it('should resolve all directory accessors to default paths', async () => {
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

  describe('DEFAULT_PATHS', () => {
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
  });

  describe('createPathResolverSync', () => {
    it('should create a resolver with an absolute project root', () => {
      const resolver = createPathResolverSync(sandbox.path);

      expect(resolver.projectRoot).toBe(sandbox.path);
      expect(path.isAbsolute(resolver.projectRoot)).toBe(true);
    });

    it('should resolve ticket paths against default paths', () => {
      const resolver = createPathResolverSync(sandbox.path);
      const defaultPaths = getDefaultPaths();

      expect(resolver.getTicketPath('story')).toBe(
        path.join(sandbox.path, defaultPaths.tickets, 'stories')
      );
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
});
