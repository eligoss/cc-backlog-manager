/**
 * Context Generator Unit Tests
 *
 * Tests for the main context generation engine.
 * Covers token-budgeted context file generation.
 *
 * @skip Tests are skipped because the library modules at
 * modules/writer/src/lib/ have not been implemented yet.
 */

import path from 'path';
import fs from 'fs-extra';
import { createSandbox, TestSandbox } from '../../../../lib/__tests__/test-utils/sandbox.js';
import {
  ContextGenerator,
  createContextGenerator,
} from '../../../../../../modules/writer/src/lib/context-generator.js';

describe.skip('context-generator', () => {
  let sandbox: TestSandbox;

  beforeEach(async () => {
    sandbox = await createSandbox('context-generator');
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  /**
   * Helper to create a complete book project structure
   */
  async function createBookProject() {
    // Create token-budgets.json schema
    await sandbox.createFile('schemas/token-budgets.json', JSON.stringify({
      version: '1.0.0',
      defaults: {
        'scene-writing': {
          total: 2000,
          allocation: { minimal: 300, world: 400, style: 100 },
        },
        'chapter-planning': {
          total: 3000,
          allocation: { chapter: 400, scenes: 500, world: 600 },
        },
        'part-planning': {
          total: 5000,
          allocation: { part: 600, chapters: 800, world: 1000 },
        },
      },
      'world-fact-priorities': {
        core: 1,
        magic: 2,
        geography: 3,
        history: 5,
      },
      'context-levels': {
        minimal: {
          name: 'Minimal Context',
          'max-tokens': 500,
          sections: ['immediate', 'pov', 'tensions'],
        },
        scene: {
          name: 'Scene Context',
          'max-tokens': 1500,
          sections: ['minimal', 'chapter', 'world', 'style'],
        },
        chapter: {
          name: 'Chapter Context',
          'max-tokens': 2500,
          sections: ['scene', 'part', 'characters', 'priorScenes'],
        },
        part: {
          name: 'Part Context',
          'max-tokens': 4000,
          sections: ['chapter', 'baseline', 'worldFull'],
        },
        full: {
          name: 'Full Context',
          'max-tokens': 8000,
          sections: ['all'],
        },
      },
    }, null, 2));

    // Create baseline file
    await sandbox.createFile('baseline-book1.md', `---
title: "Book One"
summary: "An epic tale of adventure and mystery."
world-elements-required:
  - world-core-physics
  - world-core-magic
---

# Book One Baseline

This is the baseline document for Book One.`);

    // Create world directory with manifests
    await sandbox.createFile('world/core/_manifest.json', JSON.stringify({
      directory: 'core',
      type: 'immutable',
      facts: [
        { file: 'physics.md', 'fact-id': 'world-core-physics', 'token-estimate': 100, 'summary-token-estimate': 20 },
      ],
    }, null, 2));

    await sandbox.createFile('world/core/physics.md', `---
id: world-core-physics
title: Physics Rules
summary: Gravity exists and light travels fast.
---

# Physics

The world follows normal physical laws.`);

    // Create manuscript structure
    await sandbox.createFile('manuscript/part-001-prologue/part-001-prologue.md', `---
title: "Prologue"
summary: "The story begins with an ancient prophecy."
---

# Part One: Prologue

The ancient scrolls spoke of a chosen one.`);

    await sandbox.createFile('manuscript/part-001-prologue/chapter-001-awakening/chapter-001-awakening.md', `---
title: "The Awakening"
summary: "Our hero discovers their true power."
---

# Chapter One: The Awakening

A young person discovers extraordinary abilities.`);

    // Use unquoted YAML for compatibility with simple YAML parser
    await sandbox.createFile('manuscript/part-001-prologue/chapter-001-awakening/scene-001-discovery.md', `---
title: Discovery
summary: The power manifests for the first time.
immediate:
  time: Dawn
  location: Village home
  weather: Clear
  lighting: Morning light
pov-state:
  current-thought: What is happening to me?
  current-fear: Others will find out
  physical-sensation: Tingling in hands
---

# Scene: Discovery

The morning sun streamed through the window.`);
  }

  describe('createContextGenerator', () => {
    it('creates generator with default options', async () => {
      await createBookProject();

      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      expect(generator).toBeInstanceOf(ContextGenerator);
    });

    it('creates generator with custom output directory', async () => {
      await createBookProject();

      const generator = createContextGenerator({
        projectRoot: sandbox.path,
        outputDir: sandbox.resolve('custom-output'),
      });

      expect(generator).toBeInstanceOf(ContextGenerator);
    });

    it('throws if budget config not found', async () => {
      // Don't create the schemas directory
      expect(() => {
        createContextGenerator({
          projectRoot: sandbox.path,
        });
      }).toThrow();
    });
  });

  describe('generateBaselineContext', () => {
    beforeEach(async () => {
      await createBookProject();
    });

    it('generates baseline summary file', async () => {
      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      const result = await generator.generateBaselineContext();

      expect(result.outputPath).toContain('baseline-summary.md');
      expect(await fs.pathExists(result.outputPath)).toBe(true);
    });

    it('respects token budget', async () => {
      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      const result = await generator.generateBaselineContext();

      expect(result.tokenCount).toBeLessThanOrEqual(result.budget);
      expect(result.withinBudget).toBe(true);
    });

    it('reports token count in sections', async () => {
      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      const result = await generator.generateBaselineContext();

      expect(result.sections).toBeDefined();
      expect(result.sections.baseline).toBeGreaterThan(0);
    });
  });

  describe('generateSceneContext', () => {
    beforeEach(async () => {
      await createBookProject();
    });

    it('generates minimal context', async () => {
      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      const scenePath = sandbox.resolve(
        'manuscript/part-001-prologue/chapter-001-awakening/scene-001-discovery.md'
      );

      const result = await generator.generateSceneContext(scenePath, 'minimal');

      expect(result.outputPath).toContain('minimal');
      expect(await fs.pathExists(result.outputPath)).toBe(true);
    });

    it('generates scene-level context', async () => {
      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      const scenePath = sandbox.resolve(
        'manuscript/part-001-prologue/chapter-001-awakening/scene-001-discovery.md'
      );

      const result = await generator.generateSceneContext(scenePath, 'scene');

      expect(result.outputPath).toContain('scene');
      expect(result.sections.minimal).toBeDefined();
    });

    it('generates chapter-level context', async () => {
      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      const scenePath = sandbox.resolve(
        'manuscript/part-001-prologue/chapter-001-awakening/scene-001-discovery.md'
      );

      const result = await generator.generateSceneContext(scenePath, 'chapter');

      expect(result.outputPath).toContain('chapter');
    });

    it('respects token budget for each level', async () => {
      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      const scenePath = sandbox.resolve(
        'manuscript/part-001-prologue/chapter-001-awakening/scene-001-discovery.md'
      );

      const minimalResult = await generator.generateSceneContext(scenePath, 'minimal');
      const sceneResult = await generator.generateSceneContext(scenePath, 'scene');
      const chapterResult = await generator.generateSceneContext(scenePath, 'chapter');

      // Budgets should increase as level increases
      expect(minimalResult.budget).toBeLessThan(sceneResult.budget);
      expect(sceneResult.budget).toBeLessThan(chapterResult.budget);
    });

    it('creates output directory structure', async () => {
      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      const scenePath = sandbox.resolve(
        'manuscript/part-001-prologue/chapter-001-awakening/scene-001-discovery.md'
      );

      const result = await generator.generateSceneContext(scenePath, 'minimal');

      // Output should be in structured path
      expect(result.outputPath).toContain('part-001');
      expect(result.outputPath).toContain('chapter-001');
      expect(result.outputPath).toContain('scenes');
    });

    it('includes immediate context in output', async () => {
      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      const scenePath = sandbox.resolve(
        'manuscript/part-001-prologue/chapter-001-awakening/scene-001-discovery.md'
      );

      await generator.generateSceneContext(scenePath, 'minimal');

      const outputPath = sandbox.resolve(
        'build/context/part-001/chapter-001/scenes/scene-001-discovery-context-minimal.md'
      );
      const content = await fs.readFile(outputPath, 'utf-8');

      expect(content).toContain('Dawn');
      expect(content).toContain('Village home');
    });

    it('includes POV state in minimal context', async () => {
      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      const scenePath = sandbox.resolve(
        'manuscript/part-001-prologue/chapter-001-awakening/scene-001-discovery.md'
      );

      await generator.generateSceneContext(scenePath, 'minimal');

      const outputPath = sandbox.resolve(
        'build/context/part-001/chapter-001/scenes/scene-001-discovery-context-minimal.md'
      );
      const content = await fs.readFile(outputPath, 'utf-8');

      expect(content).toContain('What is happening to me?');
    });

    it('includes weather in minimal context', async () => {
      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      const scenePath = sandbox.resolve(
        'manuscript/part-001-prologue/chapter-001-awakening/scene-001-discovery.md'
      );

      await generator.generateSceneContext(scenePath, 'minimal');

      const outputPath = sandbox.resolve(
        'build/context/part-001/chapter-001/scenes/scene-001-discovery-context-minimal.md'
      );
      const content = await fs.readFile(outputPath, 'utf-8');

      expect(content).toContain('Clear');
    });
  });

  describe('generateChapterContext', () => {
    beforeEach(async () => {
      await createBookProject();
    });

    it('generates chapter context file', async () => {
      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      const chapterPath = sandbox.resolve(
        'manuscript/part-001-prologue/chapter-001-awakening/chapter-001-awakening.md'
      );

      const result = await generator.generateChapterContext(chapterPath);

      expect(result.outputPath).toContain('chapter-context.md');
      expect(await fs.pathExists(result.outputPath)).toBe(true);
    });

    it('includes chapter summary', async () => {
      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      const chapterPath = sandbox.resolve(
        'manuscript/part-001-prologue/chapter-001-awakening/chapter-001-awakening.md'
      );

      const result = await generator.generateChapterContext(chapterPath);

      expect(result.sections.chapter).toBeGreaterThan(0);
    });

    it('respects chapter planning budget', async () => {
      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      const chapterPath = sandbox.resolve(
        'manuscript/part-001-prologue/chapter-001-awakening/chapter-001-awakening.md'
      );

      const result = await generator.generateChapterContext(chapterPath);

      expect(result.budget).toBe(3000); // From token-budgets.json
    });
  });

  describe('generatePartContext', () => {
    beforeEach(async () => {
      await createBookProject();
    });

    it('generates part context file', async () => {
      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      const partPath = sandbox.resolve(
        'manuscript/part-001-prologue/part-001-prologue.md'
      );

      const result = await generator.generatePartContext(partPath);

      expect(result.outputPath).toContain('part-context.md');
      expect(await fs.pathExists(result.outputPath)).toBe(true);
    });

    it('includes baseline summary', async () => {
      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      const partPath = sandbox.resolve(
        'manuscript/part-001-prologue/part-001-prologue.md'
      );

      const result = await generator.generatePartContext(partPath);

      expect(result.sections.baseline).toBeGreaterThan(0);
    });

    it('includes world facts', async () => {
      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      const partPath = sandbox.resolve(
        'manuscript/part-001-prologue/part-001-prologue.md'
      );

      const result = await generator.generatePartContext(partPath);

      expect(result.sections.world).toBeDefined();
    });

    it('respects part planning budget', async () => {
      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      const partPath = sandbox.resolve(
        'manuscript/part-001-prologue/part-001-prologue.md'
      );

      const result = await generator.generatePartContext(partPath);

      expect(result.budget).toBe(5000); // From token-budgets.json
    });
  });

  describe('generateAllContexts', () => {
    beforeEach(async () => {
      await createBookProject();
    });

    it('generates contexts for all scenes', async () => {
      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      const results = await generator.generateAllContexts();

      // Should have at least baseline + scene contexts (minimal, scene, chapter)
      expect(results.length).toBeGreaterThanOrEqual(4);
    });

    it('includes baseline in results', async () => {
      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      const results = await generator.generateAllContexts();

      const hasBaseline = results.some(r => r.outputPath.includes('baseline'));
      expect(hasBaseline).toBe(true);
    });

    it('generates all context levels for scenes', async () => {
      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      const results = await generator.generateAllContexts();

      const sceneResults = results.filter(r => r.outputPath.includes('scene-001'));

      // Should have minimal, scene, chapter levels
      const hasMinimal = sceneResults.some(r => r.outputPath.includes('minimal'));
      const hasScene = sceneResults.some(r => r.outputPath.includes('-scene.md'));
      const hasChapter = sceneResults.some(r => r.outputPath.includes('-chapter.md'));

      expect(hasMinimal).toBe(true);
      expect(hasScene).toBe(true);
      expect(hasChapter).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles empty manuscript directory', async () => {
      await sandbox.createFile('schemas/token-budgets.json', JSON.stringify({
        version: '1.0.0',
        defaults: {
          'scene-writing': { total: 2000, allocation: {} },
          'chapter-planning': { total: 3000, allocation: {} },
          'part-planning': { total: 5000, allocation: {} },
        },
        'world-fact-priorities': {},
        'context-levels': {
          minimal: { name: 'Minimal', 'max-tokens': 500, sections: [] },
          scene: { name: 'Scene', 'max-tokens': 1500, sections: [] },
          chapter: { name: 'Chapter', 'max-tokens': 2500, sections: [] },
          part: { name: 'Part', 'max-tokens': 4000, sections: [] },
          full: { name: 'Full', 'max-tokens': 8000, sections: [] },
        },
      }, null, 2));

      await sandbox.createFile('manuscript/.gitkeep', '');
      await sandbox.createFile('world/.gitkeep', '');

      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      const results = await generator.generateAllContexts();

      // Should return empty results, not throw
      expect(results.length).toBe(0);
    });

    it('handles missing world directory', async () => {
      await sandbox.createFile('schemas/token-budgets.json', JSON.stringify({
        version: '1.0.0',
        defaults: {
          'scene-writing': { total: 2000, allocation: {} },
          'chapter-planning': { total: 3000, allocation: {} },
          'part-planning': { total: 5000, allocation: {} },
        },
        'world-fact-priorities': {},
        'context-levels': {
          minimal: { name: 'Minimal', 'max-tokens': 500, sections: [] },
          scene: { name: 'Scene', 'max-tokens': 1500, sections: [] },
          chapter: { name: 'Chapter', 'max-tokens': 2500, sections: [] },
          part: { name: 'Part', 'max-tokens': 4000, sections: [] },
          full: { name: 'Full', 'max-tokens': 8000, sections: [] },
        },
      }, null, 2));

      await sandbox.createFile('manuscript/.gitkeep', '');

      const generator = createContextGenerator({
        projectRoot: sandbox.path,
      });

      // Should not throw when world directory is missing
      const results = await generator.generateAllContexts();
      expect(results.length).toBe(0);
    });
  });
});
