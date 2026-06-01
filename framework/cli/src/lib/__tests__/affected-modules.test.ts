/**
 * Tests for affected-modules detection library
 */

import {
  mapFileToModule,
  getTestPatternsForModules,
  buildJestCommand,
  MODULE_TEST_PATTERNS,
} from '../affected-modules.js';

describe('affected-modules', () => {
  describe('mapFileToModule', () => {
    describe('module content files', () => {
      it('should map framework/modules/backlog/ files to backlog module', () => {
        expect(mapFileToModule('framework/modules/backlog/module.json')).toBe('backlog');
        expect(mapFileToModule('framework/modules/backlog/skills/building-tickets.md')).toBe('backlog');
      });

      it('should map framework/modules/confluence/ files to confluence module', () => {
        expect(mapFileToModule('framework/modules/confluence/module.json')).toBe('confluence');
      });

      it('should map framework/modules/coding/ files to coding module', () => {
        expect(mapFileToModule('framework/modules/coding/module.json')).toBe('coding');
      });

      it('should map framework/modules/writer/ files to writer module', () => {
        expect(mapFileToModule('framework/modules/writer/module.json')).toBe('writer');
      });

      it('should map framework/modules/planning/ files to planning module', () => {
        expect(mapFileToModule('framework/modules/planning/module.json')).toBe('planning');
      });

      it('should map framework/modules/core/ files to core module', () => {
        expect(mapFileToModule('framework/modules/core/module.json')).toBe('core');
        expect(mapFileToModule('framework/modules/core/registries/agents.json')).toBe('core');
      });
    });

    describe('CLI command implementations', () => {
      it('should map CLI backlog commands to backlog module', () => {
        expect(mapFileToModule('framework/cli/src/commands/backlog/create-ticket.ts')).toBe('backlog');
        expect(mapFileToModule('framework/cli/src/commands/backlog/validate.ts')).toBe('backlog');
      });

      it('should map CLI writer commands to writer module', () => {
        expect(mapFileToModule('framework/cli/src/commands/writer/create-chapter.ts')).toBe('writer');
      });

      it('should map CLI planning commands to planning module', () => {
        expect(mapFileToModule('framework/cli/src/commands/planning/create-plan.ts')).toBe('planning');
      });

      it('should map CLI confluence commands to confluence module', () => {
        expect(mapFileToModule('framework/cli/src/commands/confluence/create-page.ts')).toBe('confluence');
      });
    });

    describe('CLI library implementations', () => {
      it('should map CLI backlog lib to backlog module', () => {
        expect(mapFileToModule('framework/cli/src/lib/backlog/import-engine.ts')).toBe('backlog');
      });

      it('should map CLI jira lib to backlog module', () => {
        expect(mapFileToModule('framework/cli/src/lib/jira/export-engine.ts')).toBe('backlog');
      });

      it('should map CLI confluence lib to confluence module', () => {
        expect(mapFileToModule('framework/cli/src/lib/confluence/adf-converter.ts')).toBe('confluence');
      });

      it('should map CLI planning lib to planning module', () => {
        expect(mapFileToModule('framework/cli/src/lib/planning/plan-creator.ts')).toBe('planning');
      });
    });

    describe('generic CLI files', () => {
      it('should map generic CLI files to core module', () => {
        expect(mapFileToModule('framework/cli/src/lib/discovery-engine.ts')).toBe('core');
        expect(mapFileToModule('framework/cli/src/lib/sync-engine.ts')).toBe('core');
        expect(mapFileToModule('framework/cli/src/commands/init.ts')).toBe('core');
        expect(mapFileToModule('framework/cli/src/commands/validate.ts')).toBe('core');
      });
    });

    describe('ai directory files', () => {
      it('should map ai/skills to appropriate modules', () => {
        expect(mapFileToModule('ai/skills/building-tickets.md')).toBe('core');
        // Note: specific skill patterns would need to contain module name in filename
      });

      it('should map generic ai directory files to core module', () => {
        expect(mapFileToModule('ai/registries/agents.json')).toBe('core');
        expect(mapFileToModule('ai/context/technical-basic.md')).toBe('core');
      });
    });

    describe('deployed files', () => {
      it('should map .claude/ files to core module', () => {
        expect(mapFileToModule('.claude/skills/committing-code.md')).toBe('core');
        expect(mapFileToModule('.claude/commands/ai-app-developer.md')).toBe('core');
      });
    });

    describe('unmatched files', () => {
      it('should return null for files not matching any pattern', () => {
        expect(mapFileToModule('README.md')).toBeNull();
        expect(mapFileToModule('package.json')).toBeNull();
        expect(mapFileToModule('docs/getting-started.md')).toBeNull();
      });
    });

    describe('path normalization', () => {
      it('should handle Windows-style paths', () => {
        expect(mapFileToModule('framework\\modules\\backlog\\module.json')).toBe('backlog');
      });
    });
  });

  describe('MODULE_TEST_PATTERNS', () => {
    it('should have patterns defined for backlog module', () => {
      expect(MODULE_TEST_PATTERNS.backlog).toBeDefined();
      expect(MODULE_TEST_PATTERNS.backlog.length).toBeGreaterThan(0);
    });

    it('should have patterns defined for confluence module', () => {
      expect(MODULE_TEST_PATTERNS.confluence).toBeDefined();
      expect(MODULE_TEST_PATTERNS.confluence.length).toBeGreaterThan(0);
    });

    it('should have patterns defined for core module', () => {
      expect(MODULE_TEST_PATTERNS.core).toBeDefined();
      expect(MODULE_TEST_PATTERNS.core.length).toBeGreaterThan(0);
    });

    it('should have patterns defined for writer module', () => {
      expect(MODULE_TEST_PATTERNS.writer).toBeDefined();
      expect(MODULE_TEST_PATTERNS.writer.length).toBeGreaterThan(0);
    });

    it('should have patterns defined for planning module', () => {
      expect(MODULE_TEST_PATTERNS.planning).toBeDefined();
      expect(MODULE_TEST_PATTERNS.planning.length).toBeGreaterThan(0);
    });
  });

  describe('getTestPatternsForModules', () => {
    it('should return patterns for a single module', () => {
      const patterns = getTestPatternsForModules(['backlog']);
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns).toContain('backlog');
    });

    it('should return combined patterns for multiple modules', () => {
      const patterns = getTestPatternsForModules(['backlog', 'confluence']);
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns).toContain('backlog');
      expect(patterns).toContain('confluence');
    });

    it('should deduplicate patterns', () => {
      const patterns = getTestPatternsForModules(['backlog', 'backlog']);
      const uniquePatterns = [...new Set(patterns)];
      expect(patterns.length).toBe(uniquePatterns.length);
    });

    it('should return empty array for unknown modules', () => {
      const patterns = getTestPatternsForModules(['unknown-module']);
      expect(patterns).toEqual([]);
    });

    it('should return empty array for empty input', () => {
      const patterns = getTestPatternsForModules([]);
      expect(patterns).toEqual([]);
    });
  });

  describe('buildJestCommand', () => {
    it('should return null for modules with no test patterns', () => {
      const command = buildJestCommand(['unknown-module']);
      expect(command).toBeNull();
    });

    it('should return null for empty module list', () => {
      const command = buildJestCommand([]);
      expect(command).toBeNull();
    });

    it('should build command with test path pattern', () => {
      const command = buildJestCommand(['backlog']);
      expect(command).not.toBeNull();
      expect(command).toContain('npx jest');
      expect(command).toContain('--testPathPatterns');
      expect(command).toContain('--passWithNoTests');
    });

    it('should include pattern for the module', () => {
      const command = buildJestCommand(['backlog']);
      expect(command).toContain('backlog');
    });

    it('should combine patterns for multiple modules', () => {
      const command = buildJestCommand(['backlog', 'confluence']);
      expect(command).not.toBeNull();
      expect(command).toContain('backlog');
      expect(command).toContain('confluence');
      // Patterns should be joined with |
      expect(command).toMatch(/backlog.*\|.*confluence|confluence.*\|.*backlog/);
    });

    it('should include additional Jest arguments', () => {
      const command = buildJestCommand(['backlog'], ['--coverage', '--verbose']);
      expect(command).toContain('--coverage');
      expect(command).toContain('--verbose');
    });
  });
});
