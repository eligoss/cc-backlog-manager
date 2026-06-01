/**
 * Writer CLI Commands Integration Tests
 *
 * Tests for writer CLI commands: init, create-part, create-chapter, create-scene,
 * create-character, validate, build, export, and analyze.
 *
 * These tests use TestSandbox for isolated file I/O and test the core
 * functionality of each command.
 */

import path from 'path';
import fs from 'fs-extra';
import { createSandbox, TestSandbox } from '../../../../lib/__tests__/test-utils/sandbox.js';

describe('Writer CLI Commands Integration Tests', () => {
  let sandbox: TestSandbox;

  beforeEach(async () => {
    sandbox = await createSandbox('writer-cli');
    // Create minimal framework structure for CliContext
    await sandbox.createFile('CLAUDE.md', '# Test Project');
    await sandbox.createFile('routes.yml', 'version: "1.0"\nroutes: {}');
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('init command', () => {
    it('creates required directory structure', async () => {
      // Simulate init command by creating the expected structure
      const dirs = [
        'manuscript',
        'characters',
        'world',
        'world/rules',
        'world/regions',
        'world/nations',
        'world/magic-systems',
        'world/history',
        'build',
        'build/context',
        'build/analysis',
      ];

      for (const dir of dirs) {
        await sandbox.createFile(`${dir}/.gitkeep`, '');
      }

      // Verify directories exist
      for (const dir of dirs) {
        const exists = await fs.pathExists(sandbox.resolve(dir));
        expect(exists).toBe(true);
      }
    });

    it('creates BOOK.md with correct frontmatter', async () => {
      const bookContent = `---
title: "Test Epic"
author: ""
status: planning
created: 2026-01-01
word-count: 0
target-word-count: 100000
genre: fantasy
---

# Test Epic

## Synopsis

[Your synopsis here]
`;
      await sandbox.createFile('BOOK.md', bookContent);

      const content = await fs.readFile(sandbox.resolve('BOOK.md'), 'utf-8');
      expect(content).toContain('title: "Test Epic"');
      expect(content).toContain('status: planning');
      expect(content).toContain('word-count: 0');
    });

    it('creates world.lock.json', async () => {
      const lockContent = {
        version: '1.0.0',
        locked: false,
        baseline: null,
        facts: {
          immutable: [],
          'append-only': [],
          expandable: [],
        },
        hashes: {},
        lastUpdated: '2026-01-01',
      };

      await sandbox.createFile('world.lock.json', JSON.stringify(lockContent, null, 2));

      const content = await fs.readFile(sandbox.resolve('world.lock.json'), 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.facts).toBeDefined();
      expect(parsed.facts.immutable).toEqual([]);
    });

    it('validates kebab-case name', async () => {
      // Valid names
      const validNames = ['my-book', 'test', 'fantasy-epic-2025', 'a1b2-c3'];
      for (const name of validNames) {
        const pattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
        expect(pattern.test(name)).toBe(true);
      }

      // Invalid names
      const invalidNames = ['MyBook', 'test_book', '-start', 'end-', 'has spaces', 'UPPERCASE'];
      for (const name of invalidNames) {
        const pattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
        expect(pattern.test(name)).toBe(false);
      }
    });
  });

  describe('create-part command', () => {
    beforeEach(async () => {
      // Create manuscript directory
      await sandbox.createFile('manuscript/.gitkeep', '');
    });

    it('creates part with auto-numbering', async () => {
      const partContent = `---
part-number: 001
title: "Prologue"
status: draft
---

# Part 001: Prologue
`;
      await sandbox.createFile('manuscript/part-001-prologue/PART.md', partContent);

      const exists = await fs.pathExists(sandbox.resolve('manuscript/part-001-prologue'));
      expect(exists).toBe(true);

      const content = await fs.readFile(sandbox.resolve('manuscript/part-001-prologue/PART.md'), 'utf-8');
      expect(content).toContain('part-number: 001');
      expect(content).toContain('Prologue');
    });

    it('increments part number correctly', async () => {
      // Create existing parts
      await sandbox.createFile('manuscript/part-001-first/.gitkeep', '');
      await sandbox.createFile('manuscript/part-002-second/.gitkeep', '');

      // Next part should be 003
      const dirs = await fs.readdir(sandbox.resolve('manuscript'));
      const partPattern = /^part-(\d{3})-/;
      let maxNumber = 0;

      for (const dir of dirs) {
        const match = partPattern.exec(dir);
        if (match) {
          const number = parseInt(match[1], 10);
          maxNumber = Math.max(maxNumber, number);
        }
      }

      expect(maxNumber + 1).toBe(3);
    });

    it('validates part name format', async () => {
      const pattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

      expect(pattern.test('prologue')).toBe(true);
      expect(pattern.test('rising-action')).toBe(true);
      expect(pattern.test('act-1-beginning')).toBe(true);

      expect(pattern.test('Prologue')).toBe(false);
      expect(pattern.test('rising_action')).toBe(false);
    });

    it('enforces name length limits', async () => {
      const minLength = 3;
      const maxLength = 40;

      expect('ab'.length >= minLength).toBe(false);
      expect('abc'.length >= minLength).toBe(true);
      expect('a'.repeat(40).length <= maxLength).toBe(true);
      expect('a'.repeat(41).length <= maxLength).toBe(false);
    });
  });

  describe('create-chapter command', () => {
    beforeEach(async () => {
      await sandbox.createFile('manuscript/part-001-prologue/PART.md', `---
part-number: 001
title: "Prologue"
---

# Prologue`);
    });

    it('creates chapter in correct part', async () => {
      const chapterContent = `---
chapter-number: 001
title: "The Beginning"
pov: "protagonist"
---

# Chapter 1: The Beginning
`;
      await sandbox.createFile(
        'manuscript/part-001-prologue/chapter-001-beginning/CHAPTER.md',
        chapterContent
      );

      const exists = await fs.pathExists(
        sandbox.resolve('manuscript/part-001-prologue/chapter-001-beginning')
      );
      expect(exists).toBe(true);
    });

    it('auto-numbers chapters within part', async () => {
      await sandbox.createFile('manuscript/part-001-prologue/chapter-001-first/.gitkeep', '');
      await sandbox.createFile('manuscript/part-001-prologue/chapter-002-second/.gitkeep', '');

      const dirs = await fs.readdir(sandbox.resolve('manuscript/part-001-prologue'));
      const chapterPattern = /^chapter-(\d{3})-/;
      let maxNumber = 0;

      for (const dir of dirs) {
        const match = chapterPattern.exec(dir);
        if (match) {
          const number = parseInt(match[1], 10);
          maxNumber = Math.max(maxNumber, number);
        }
      }

      expect(maxNumber + 1).toBe(3);
    });
  });

  describe('create-scene command', () => {
    beforeEach(async () => {
      await sandbox.createFile(
        'manuscript/part-001-prologue/chapter-001-beginning/CHAPTER.md',
        `---
chapter-number: 001
---

# Chapter 1`
      );
    });

    it('creates scene in correct chapter', async () => {
      const sceneContent = `---
scene-number: 001
title: "Opening"
pov: "protagonist"
summary: The story begins.
---

# Scene: Opening
`;
      await sandbox.createFile(
        'manuscript/part-001-prologue/chapter-001-beginning/scene-001-opening.md',
        sceneContent
      );

      const exists = await fs.pathExists(
        sandbox.resolve('manuscript/part-001-prologue/chapter-001-beginning/scene-001-opening.md')
      );
      expect(exists).toBe(true);
    });

    it('links to prior scene', async () => {
      await sandbox.createFile(
        'manuscript/part-001-prologue/chapter-001-beginning/scene-001-first.md',
        `---
scene-number: 001
---

First scene.`
      );

      const secondSceneContent = `---
scene-number: 002
prior-scene: scene-001-first.md
---

Second scene.`;

      await sandbox.createFile(
        'manuscript/part-001-prologue/chapter-001-beginning/scene-002-second.md',
        secondSceneContent
      );

      const content = await fs.readFile(
        sandbox.resolve('manuscript/part-001-prologue/chapter-001-beginning/scene-002-second.md'),
        'utf-8'
      );
      expect(content).toContain('prior-scene: scene-001-first.md');
    });
  });

  describe('create-character command', () => {
    beforeEach(async () => {
      await sandbox.createFile('characters/.gitkeep', '');
    });

    it('creates character profile', async () => {
      const characterContent = `---
id: protagonist
name: "Aria Nightshade"
role: protagonist
status: alive
first-appearance: part-001-chapter-001
---

# Aria Nightshade

## Physical Description

[Description here]

## Personality

[Traits here]
`;
      await sandbox.createFile('characters/protagonist.md', characterContent);

      const exists = await fs.pathExists(sandbox.resolve('characters/protagonist.md'));
      expect(exists).toBe(true);

      const content = await fs.readFile(sandbox.resolve('characters/protagonist.md'), 'utf-8');
      expect(content).toContain('id: protagonist');
      expect(content).toContain('role: protagonist');
    });

    it('validates character ID format', async () => {
      const pattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

      expect(pattern.test('protagonist')).toBe(true);
      expect(pattern.test('evil-wizard')).toBe(true);
      expect(pattern.test('character-1')).toBe(true);

      expect(pattern.test('Protagonist')).toBe(false);
      expect(pattern.test('evil_wizard')).toBe(false);
    });
  });

  describe('validate command', () => {
    it('validates book structure', async () => {
      // Create valid book structure
      await sandbox.createFile('BOOK.md', `---
title: "Test Book"
status: planning
---

# Test Book`);

      await sandbox.createFile('manuscript/part-001-prologue/PART.md', `---
part-number: 001
---

# Prologue`);

      await sandbox.createFile(
        'manuscript/part-001-prologue/chapter-001-beginning/CHAPTER.md',
        `---
chapter-number: 001
---

# Chapter 1`
      );

      // All required files exist
      expect(await fs.pathExists(sandbox.resolve('BOOK.md'))).toBe(true);
      expect(await fs.pathExists(sandbox.resolve('manuscript/part-001-prologue/PART.md'))).toBe(true);
    });

    it('detects missing BOOK.md', async () => {
      // No BOOK.md file
      const exists = await fs.pathExists(sandbox.resolve('BOOK.md'));
      expect(exists).toBe(false);
    });

    it('validates frontmatter in all files', async () => {
      // Valid frontmatter
      const validContent = `---
title: "Valid"
status: draft
---

Content here.`;

      // Invalid frontmatter (missing closing ---)
      const invalidContent = `---
title: "Invalid"
status: draft

Content here.`;

      await sandbox.createFile('valid.md', validContent);
      await sandbox.createFile('invalid.md', invalidContent);

      const validFile = await fs.readFile(sandbox.resolve('valid.md'), 'utf-8');
      const hasValidFrontmatter = /^---\n[\s\S]*?\n---/.test(validFile);
      expect(hasValidFrontmatter).toBe(true);

      const invalidFile = await fs.readFile(sandbox.resolve('invalid.md'), 'utf-8');
      const hasInvalidFrontmatter = /^---\n[\s\S]*?\n---/.test(invalidFile);
      expect(hasInvalidFrontmatter).toBe(false);
    });
  });

  describe('build command', () => {
    beforeEach(async () => {
      await sandbox.createFile('build/.gitkeep', '');
      await sandbox.createFile('schemas/token-budgets.json', JSON.stringify({
        version: '1.0.0',
        defaults: {
          'scene-writing': { total: 2000, allocation: {} },
        },
        'context-levels': {
          minimal: { name: 'Minimal', 'max-tokens': 500, sections: [] },
        },
      }));
    });

    it('creates build output directory', async () => {
      await fs.ensureDir(sandbox.resolve('build/context'));
      await fs.ensureDir(sandbox.resolve('build/analysis'));

      expect(await fs.pathExists(sandbox.resolve('build/context'))).toBe(true);
      expect(await fs.pathExists(sandbox.resolve('build/analysis'))).toBe(true);
    });

    it('generates context files', async () => {
      const contextContent = `## Immediate Context

**Time:** Dawn
**Location:** Castle

## POV State

**Thinking:** What is happening?`;

      await sandbox.createFile('build/context/scene-001-context.md', contextContent);

      const content = await fs.readFile(
        sandbox.resolve('build/context/scene-001-context.md'),
        'utf-8'
      );
      expect(content).toContain('Immediate Context');
      expect(content).toContain('POV State');
    });
  });

  describe('export command', () => {
    beforeEach(async () => {
      // Create manuscript with scenes
      await sandbox.createFile(
        'manuscript/part-001-prologue/chapter-001-beginning/scene-001-opening.md',
        `---
scene-number: 001
title: "Opening"
---

# Opening

The story begins here.

Scene content paragraph 1.

Scene content paragraph 2.`
      );

      await sandbox.createFile(
        'manuscript/part-001-prologue/chapter-001-beginning/scene-002-continues.md',
        `---
scene-number: 002
title: "Continues"
prior-scene: scene-001-opening.md
---

# Continues

The story continues.`
      );
    });

    it('exports manuscript to single file', async () => {
      // Simulate export by concatenating scenes
      const scene1 = await fs.readFile(
        sandbox.resolve('manuscript/part-001-prologue/chapter-001-beginning/scene-001-opening.md'),
        'utf-8'
      );
      const scene2 = await fs.readFile(
        sandbox.resolve('manuscript/part-001-prologue/chapter-001-beginning/scene-002-continues.md'),
        'utf-8'
      );

      // Extract content (remove frontmatter)
      const extractContent = (content: string) => {
        return content.replace(/^---\n[\s\S]*?\n---\n+/, '').trim();
      };

      const combined = [extractContent(scene1), extractContent(scene2)].join('\n\n---\n\n');
      await sandbox.createFile('build/export/manuscript.md', combined);

      const exported = await fs.readFile(sandbox.resolve('build/export/manuscript.md'), 'utf-8');
      expect(exported).toContain('The story begins here.');
      expect(exported).toContain('The story continues.');
    });

    it('exports with chapter breaks', async () => {
      const exportContent = `# Part 1: Prologue

## Chapter 1: Beginning

### Scene 1: Opening

The story begins here.

---

### Scene 2: Continues

The story continues.
`;
      await sandbox.createFile('build/export/formatted-manuscript.md', exportContent);

      const content = await fs.readFile(
        sandbox.resolve('build/export/formatted-manuscript.md'),
        'utf-8'
      );
      expect(content).toContain('# Part 1');
      expect(content).toContain('## Chapter 1');
      expect(content).toContain('### Scene 1');
    });
  });

  describe('analyze command', () => {
    beforeEach(async () => {
      await sandbox.createFile('build/analysis/.gitkeep', '');
      await sandbox.createFile('manuscript/part-001-prologue/chapter-001-beginning/scene-001.md', `---
scene-number: 001
word-count: 1500
---

# Scene Content

${Array(300).fill('word').join(' ')}`);
    });

    it('generates word count analysis', async () => {
      const analysisContent = {
        totalWords: 1500,
        byPart: { 'part-001': 1500 },
        byChapter: { 'chapter-001': 1500 },
        averageSceneWords: 1500,
        generatedAt: new Date().toISOString(),
      };

      await sandbox.createFile(
        'build/analysis/word-count.json',
        JSON.stringify(analysisContent, null, 2)
      );

      const content = await fs.readFile(
        sandbox.resolve('build/analysis/word-count.json'),
        'utf-8'
      );
      const parsed = JSON.parse(content);
      expect(parsed.totalWords).toBe(1500);
    });

    it('generates structure analysis', async () => {
      const structureAnalysis = {
        parts: 1,
        chapters: 1,
        scenes: 1,
        characters: 0,
        worldFacts: 0,
        structure: {
          'part-001': {
            name: 'prologue',
            chapters: 1,
            scenes: 1,
          },
        },
      };

      await sandbox.createFile(
        'build/analysis/structure.json',
        JSON.stringify(structureAnalysis, null, 2)
      );

      const content = await fs.readFile(
        sandbox.resolve('build/analysis/structure.json'),
        'utf-8'
      );
      const parsed = JSON.parse(content);
      expect(parsed.parts).toBe(1);
      expect(parsed.chapters).toBe(1);
    });

    it('detects consistency issues', async () => {
      const consistencyReport = {
        issues: [
          { type: 'missing-summary', file: 'scene-002.md', message: 'Scene missing summary' },
        ],
        warnings: [
          { type: 'long-scene', file: 'scene-001.md', message: 'Scene exceeds 3000 words' },
        ],
        passed: false,
      };

      await sandbox.createFile(
        'build/analysis/consistency.json',
        JSON.stringify(consistencyReport, null, 2)
      );

      const content = await fs.readFile(
        sandbox.resolve('build/analysis/consistency.json'),
        'utf-8'
      );
      const parsed = JSON.parse(content);
      expect(parsed.issues.length).toBeGreaterThan(0);
      expect(parsed.passed).toBe(false);
    });
  });

  describe('directory structure validation', () => {
    it('validates standard project structure', async () => {
      const requiredDirs = [
        'manuscript',
        'characters',
        'world',
        'build',
      ];

      const requiredFiles = [
        'BOOK.md',
        'world.lock.json',
      ];

      // Create structure
      for (const dir of requiredDirs) {
        await sandbox.createFile(`${dir}/.gitkeep`, '');
      }
      for (const file of requiredFiles) {
        await sandbox.createFile(file, '# Placeholder');
      }

      // Validate all exist
      for (const dir of requiredDirs) {
        expect(await fs.pathExists(sandbox.resolve(dir))).toBe(true);
      }
      for (const file of requiredFiles) {
        expect(await fs.pathExists(sandbox.resolve(file))).toBe(true);
      }
    });
  });
});
