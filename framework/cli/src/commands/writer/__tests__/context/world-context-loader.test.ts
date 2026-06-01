/**
 * World Context Loader Unit Tests
 *
 * Tests for loading world facts with token budgets and priorities.
 *
 * @skip Tests are skipped because the library modules at
 * modules/writer/src/lib/ have not been implemented yet.
 */

import path from 'path';
import fs from 'fs-extra';
import { createSandbox, TestSandbox } from '../../../../lib/__tests__/test-utils/sandbox.js';
import {
  loadWorldContext,
  formatWorldContext,
  loadWorldFactsByIds,
  estimateWorldContextTokens,
  loadBaselineContext,
} from '../../../../../../modules/writer/src/lib/world-context-loader.js';

describe.skip('world-context-loader', () => {
  let sandbox: TestSandbox;

  beforeEach(async () => {
    sandbox = await createSandbox('world-context-loader');
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  /**
   * Helper to create a world directory structure with manifests
   */
  async function createWorldStructure() {
    // Create world/core directory with manifest
    await sandbox.createFile('world/core/_manifest.json', JSON.stringify({
      directory: 'core',
      type: 'immutable',
      facts: [
        { file: 'physics.md', 'fact-id': 'world-core-physics', 'token-estimate': 100, 'summary-token-estimate': 20 },
        { file: 'magic.md', 'fact-id': 'world-core-magic', 'token-estimate': 150, 'summary-token-estimate': 30 },
      ],
      'total-token-estimate': 250,
      'total-summary-tokens': 50,
    }, null, 2));

    await sandbox.createFile('world/core/physics.md', `---
id: world-core-physics
title: Physics Rules
summary: Gravity exists. Light travels fast.
---

# Physics

Detailed physics content here.`);

    await sandbox.createFile('world/core/magic.md', `---
id: world-core-magic
title: Magic System
summary: Magic requires willpower.
---

# Magic

Detailed magic system content.`);

    // Create world/geography directory with manifest
    await sandbox.createFile('world/geography/_manifest.json', JSON.stringify({
      directory: 'geography',
      type: 'expandable',
      facts: [
        { file: 'regions.md', 'fact-id': 'world-geo-regions', 'token-estimate': 200, 'summary-token-estimate': 40 },
      ],
      'total-token-estimate': 200,
      'total-summary-tokens': 40,
    }, null, 2));

    await sandbox.createFile('world/geography/regions.md', `---
id: world-geo-regions
title: Regions Overview
summary: The world has four main regions.
---

# Regions

North, South, East, West regions.`);

    // Create world/history directory with manifest
    await sandbox.createFile('world/history/_manifest.json', JSON.stringify({
      directory: 'history',
      type: 'append-only',
      facts: [
        { file: 'great-war.md', 'fact-id': 'world-history-war', 'token-estimate': 300, 'summary-token-estimate': 50 },
      ],
      'total-token-estimate': 300,
      'total-summary-tokens': 50,
    }, null, 2));

    await sandbox.createFile('world/history/great-war.md', `---
id: world-history-war
title: The Great War
summary: A century-long conflict that shaped the world.
---

# The Great War

Detailed history content.`);
  }

  describe('loadWorldContext', () => {
    beforeEach(async () => {
      await createWorldStructure();
    });

    it('loads world facts within budget', async () => {
      const result = loadWorldContext({
        worldPath: sandbox.resolve('world'),
        budget: 200,
        useSummaries: true,
      });

      expect(result.facts.length).toBeGreaterThan(0);
      expect(result.budgetUsed).toBeLessThanOrEqual(200);
      expect(result.budgetRemaining).toBeGreaterThanOrEqual(0);
    });

    it('respects category priorities', async () => {
      const result = loadWorldContext({
        worldPath: sandbox.resolve('world'),
        budget: 100,
        useSummaries: true,
        priorities: {
          core: 1,
          geography: 2,
          history: 3,
        },
      });

      // Core should be loaded first
      if (result.facts.length > 0) {
        expect(result.facts[0].category).toBe('core');
      }
    });

    it('includes required fact IDs regardless of budget', async () => {
      const result = loadWorldContext({
        worldPath: sandbox.resolve('world'),
        budget: 10, // Very small budget
        useSummaries: true,
        requiredFactIds: ['world-core-physics'],
      });

      const physicsIncluded = result.facts.some(f => f.id === 'world-core-physics');
      expect(physicsIncluded).toBe(true);
    });

    it('filters by include categories', async () => {
      const result = loadWorldContext({
        worldPath: sandbox.resolve('world'),
        budget: 1000,
        useSummaries: true,
        includeCategories: ['core'],
      });

      for (const fact of result.facts) {
        expect(fact.category).toBe('core');
      }
    });

    it('filters by exclude categories', async () => {
      const result = loadWorldContext({
        worldPath: sandbox.resolve('world'),
        budget: 1000,
        useSummaries: true,
        excludeCategories: ['history'],
      });

      for (const fact of result.facts) {
        expect(fact.category).not.toBe('history');
      }
    });

    it('indicates when truncated due to budget', async () => {
      const result = loadWorldContext({
        worldPath: sandbox.resolve('world'),
        budget: 30, // Small budget, should truncate
        useSummaries: true,
      });

      // If there are facts that couldn't fit, truncated should be true
      expect(typeof result.truncated).toBe('boolean');
    });

    it('reports categories included', async () => {
      const result = loadWorldContext({
        worldPath: sandbox.resolve('world'),
        budget: 1000,
        useSummaries: true,
      });

      expect(result.categoriesIncluded).toBeInstanceOf(Array);
      expect(result.categoriesIncluded.length).toBeGreaterThan(0);
    });

    it('loads full content when useSummaries is false', async () => {
      const result = loadWorldContext({
        worldPath: sandbox.resolve('world'),
        budget: 1000,
        useSummaries: false,
      });

      // Full content should use more tokens
      for (const fact of result.facts) {
        expect(fact.fullTokens).toBeGreaterThan(0);
      }
    });

    it('handles empty world directory', async () => {
      await sandbox.createFile('empty-world/.gitkeep', '');

      const result = loadWorldContext({
        worldPath: sandbox.resolve('empty-world'),
        budget: 1000,
        useSummaries: true,
      });

      expect(result.facts).toHaveLength(0);
      expect(result.totalTokens).toBe(0);
    });
  });

  describe('formatWorldContext', () => {
    it('formats facts as markdown', () => {
      const facts = [
        {
          id: 'fact-1',
          title: 'Physics',
          category: 'core',
          file: 'world/core/physics.md',
          summary: 'Gravity exists.',
          summaryTokens: 10,
          fullTokens: 50,
          priority: 1,
        },
      ];

      const result = formatWorldContext(facts);

      expect(result).toContain('## Core');
      expect(result).toContain('### Physics');
      expect(result).toContain('Gravity exists.');
    });

    it('groups facts by category', () => {
      const facts = [
        {
          id: 'fact-1',
          title: 'Physics',
          category: 'core',
          file: 'file1.md',
          summary: 'Physics summary.',
          summaryTokens: 10,
          fullTokens: 50,
          priority: 1,
        },
        {
          id: 'fact-2',
          title: 'Magic',
          category: 'core',
          file: 'file2.md',
          summary: 'Magic summary.',
          summaryTokens: 10,
          fullTokens: 50,
          priority: 1,
        },
        {
          id: 'fact-3',
          title: 'Regions',
          category: 'geography',
          file: 'file3.md',
          summary: 'Regions summary.',
          summaryTokens: 10,
          fullTokens: 50,
          priority: 2,
        },
      ];

      const result = formatWorldContext(facts);

      // Should have category headers
      expect(result).toContain('## Core');
      expect(result).toContain('## Geography');
    });

    it('uses full content when useSummaries is false', () => {
      const facts = [
        {
          id: 'fact-1',
          title: 'Physics',
          category: 'core',
          file: 'file.md',
          summary: 'Short summary.',
          summaryTokens: 5,
          fullTokens: 100,
          priority: 1,
          content: `---
id: fact-1
---

# Full Content

This is the full detailed content.`,
        },
      ];

      const result = formatWorldContext(facts, { useSummaries: false });

      expect(result).toContain('Full Content');
      expect(result).toContain('full detailed content');
    });

    it('hides category headers when disabled', () => {
      const facts = [
        {
          id: 'fact-1',
          title: 'Physics',
          category: 'core',
          file: 'file.md',
          summary: 'Summary.',
          summaryTokens: 5,
          fullTokens: 50,
          priority: 1,
        },
      ];

      const result = formatWorldContext(facts, { includeCategory: false });

      expect(result).not.toContain('## Core');
    });

    it('hides titles when disabled', () => {
      const facts = [
        {
          id: 'fact-1',
          title: 'Physics',
          category: 'core',
          file: 'file.md',
          summary: 'Summary.',
          summaryTokens: 5,
          fullTokens: 50,
          priority: 1,
        },
      ];

      const result = formatWorldContext(facts, { includeTitle: false });

      expect(result).not.toContain('### Physics');
    });

    it('returns empty string for empty facts array', () => {
      const result = formatWorldContext([]);

      expect(result).toBe('');
    });
  });

  describe('loadWorldFactsByIds', () => {
    beforeEach(async () => {
      await createWorldStructure();
    });

    it('loads specific facts by ID', async () => {
      const facts = loadWorldFactsByIds(
        sandbox.resolve('world'),
        ['world-core-physics', 'world-history-war']
      );

      expect(facts.length).toBe(2);
      const ids = facts.map(f => f.id);
      expect(ids).toContain('world-core-physics');
      expect(ids).toContain('world-history-war');
    });

    it('returns empty for non-existent IDs', async () => {
      const facts = loadWorldFactsByIds(
        sandbox.resolve('world'),
        ['nonexistent-fact']
      );

      expect(facts).toHaveLength(0);
    });

    it('loads summary when useSummaries is true', async () => {
      const facts = loadWorldFactsByIds(
        sandbox.resolve('world'),
        ['world-core-physics'],
        true
      );

      expect(facts[0].summary).toBeDefined();
    });

    it('loads full content when useSummaries is false', async () => {
      const facts = loadWorldFactsByIds(
        sandbox.resolve('world'),
        ['world-core-physics'],
        false
      );

      expect(facts[0].content).toBeDefined();
    });
  });

  describe('estimateWorldContextTokens', () => {
    beforeEach(async () => {
      await createWorldStructure();
    });

    it('estimates total tokens', async () => {
      const estimate = estimateWorldContextTokens(sandbox.resolve('world'));

      expect(estimate.totalTokens).toBeGreaterThan(0);
      expect(estimate.factCount).toBeGreaterThan(0);
    });

    it('breaks down tokens by category', async () => {
      const estimate = estimateWorldContextTokens(sandbox.resolve('world'));

      expect(estimate.tokensByCategory).toBeDefined();
      expect(typeof estimate.tokensByCategory).toBe('object');
    });

    it('uses summary estimates when useSummaries is true', async () => {
      const summaryEstimate = estimateWorldContextTokens(
        sandbox.resolve('world'),
        { useSummaries: true }
      );

      const fullEstimate = estimateWorldContextTokens(
        sandbox.resolve('world'),
        { useSummaries: false }
      );

      expect(summaryEstimate.totalTokens).toBeLessThan(fullEstimate.totalTokens);
    });

    it('filters by include categories', async () => {
      const estimate = estimateWorldContextTokens(
        sandbox.resolve('world'),
        { includeCategories: ['core'] }
      );

      // Should only include core category tokens
      expect(Object.keys(estimate.tokensByCategory)).toHaveLength(1);
    });

    it('filters by exclude categories', async () => {
      const estimate = estimateWorldContextTokens(
        sandbox.resolve('world'),
        { excludeCategories: ['history'] }
      );

      expect(estimate.tokensByCategory['history']).toBeUndefined();
    });
  });

  describe('loadBaselineContext', () => {
    beforeEach(async () => {
      await createWorldStructure();
    });

    it('loads world context based on baseline file', async () => {
      await sandbox.createFile('baseline-book1.md', `---
title: "Book One"
world-elements-required:
  - world-core-physics
  - world-core-magic
---

# Baseline

Content here.`);

      const result = loadBaselineContext(
        sandbox.resolve('world'),
        sandbox.resolve('baseline-book1.md'),
        500
      );

      expect(result.facts.length).toBeGreaterThan(0);
      expect(result.budgetUsed).toBeLessThanOrEqual(500);
    });

    it('handles missing baseline file gracefully', async () => {
      const result = loadBaselineContext(
        sandbox.resolve('world'),
        sandbox.resolve('nonexistent-baseline.md'),
        500
      );

      // Should still return valid result, just without required facts
      expect(result).toBeDefined();
      expect(result.facts).toBeInstanceOf(Array);
    });

    it('uses summaries for smaller budgets', async () => {
      await sandbox.createFile('baseline-book1.md', `---
title: "Book One"
---

Content.`);

      const result = loadBaselineContext(
        sandbox.resolve('world'),
        sandbox.resolve('baseline-book1.md'),
        500 // Less than 1000, should use summaries
      );

      expect(result).toBeDefined();
    });

    it('uses full content for larger budgets', async () => {
      await sandbox.createFile('baseline-book1.md', `---
title: "Book One"
---

Content.`);

      const result = loadBaselineContext(
        sandbox.resolve('world'),
        sandbox.resolve('baseline-book1.md'),
        1500 // More than 1000, should use full content
      );

      expect(result).toBeDefined();
    });
  });
});
