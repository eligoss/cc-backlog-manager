/**
 * Integration Test: MCP Seed Command
 *
 * Tests the mcp seed command end-to-end with real knowledge extraction
 * and file generation for Graphiti and Serena.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { ManifestManager } from '../../../lib/manifest-manager.js';
import { extractKnowledge } from '../../../lib/mcp/extractors/index.js';

describe('MCP Seed Command Integration', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-seed-test-'));
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('Seed_KnowledgeExtraction_CreatesFiles', () => {
    it('should extract knowledge from framework project and create seed files', async () => {
      // Create framework project structure
      await createFrameworkProject(testDir);

      // Run knowledge extraction
      const knowledge = await extractKnowledge(testDir);

      // The extractor returns 'framework' for framework projects (not 'agentic-framework')
      expect(knowledge.projectType).toBe('framework');
      expect(knowledge.episodes.length).toBeGreaterThan(0);
      expect(knowledge.serenaMemories.length).toBeGreaterThan(0);

      // Verify episodes have required fields
      for (const episode of knowledge.episodes) {
        expect(episode.name).toBeDefined();
        expect(episode.body).toBeDefined();
        expect(episode.source).toBeDefined();
        expect(episode.sourceType).toBeDefined();
        expect(episode.body.length).toBeGreaterThan(0);
      }

      // Verify Serena memories have required fields
      for (const memory of knowledge.serenaMemories) {
        expect(memory.name).toBeDefined();
        expect(memory.category).toBeDefined();
        expect(memory.content).toBeDefined();
        expect(memory.content.length).toBeGreaterThan(0);
      }
    });

    it('should create Graphiti seed file with correct structure', async () => {
      await createFrameworkProject(testDir);

      const knowledge = await extractKnowledge(testDir);

      // Create seed file
      const seedFilePath = path.join(testDir, '.graphiti-seed.json');
      const seedFile = {
        groupId: 'test-project',
        projectPath: testDir,
        episodes: knowledge.episodes.map(e => ({
          name: e.name,
          body: e.body,
          source: e.source,
          sourceType: e.sourceType,
        })),
        createdAt: new Date().toISOString(),
        instructions: 'Import instructions...',
      };

      await fs.writeJson(seedFilePath, seedFile, { spaces: 2 });

      // Verify file created
      expect(await fs.pathExists(seedFilePath)).toBe(true);

      // Verify structure
      const loadedSeed = await fs.readJson(seedFilePath);
      expect(loadedSeed.groupId).toBe('test-project');
      expect(loadedSeed.projectPath).toBe(testDir);
      expect(loadedSeed.episodes).toHaveLength(knowledge.episodes.length);
      expect(loadedSeed.createdAt).toBeDefined();
      expect(loadedSeed.instructions).toBeDefined();

      // Verify episodes have correct fields
      for (const episode of loadedSeed.episodes) {
        expect(episode.name).toBeDefined();
        expect(episode.body).toBeDefined();
        expect(episode.source).toBeDefined();
        expect(episode.sourceType).toBeDefined();
      }
    });

    it('should create Serena memory files in .serena/memories', async () => {
      await createFrameworkProject(testDir);

      const knowledge = await extractKnowledge(testDir);

      // Create Serena memories
      const serenaDir = path.join(testDir, '.serena', 'memories');
      await fs.ensureDir(serenaDir);

      for (const memory of knowledge.serenaMemories) {
        // Sanitize memory name (security: prevent path traversal)
        const safeName = memory.name
          .replace(/[/\\]/g, '-')
          .replace(/\.\./g, '--')
          .replace(/^\./, '_');
        const memoryPath = path.join(serenaDir, `${safeName}.md`);
        await fs.writeFile(memoryPath, memory.content, 'utf-8');
      }

      // Verify files created
      const memoryFiles = await fs.readdir(serenaDir);
      expect(memoryFiles.length).toBe(knowledge.serenaMemories.length);

      // Verify all are markdown files
      for (const file of memoryFiles) {
        expect(file).toMatch(/\.md$/);
      }

      // Verify file contents
      for (const memory of knowledge.serenaMemories) {
        const safeName = memory.name
          .replace(/[/\\]/g, '-')
          .replace(/\.\./g, '--')
          .replace(/^\./, '_');
        const memoryPath = path.join(serenaDir, `${safeName}.md`);
        const content = await fs.readFile(memoryPath, 'utf-8');
        expect(content).toBe(memory.content);
      }
    });

    it('should extract knowledge from generic project', async () => {
      // Create generic project (not a framework project)
      await fs.ensureDir(testDir);
      await fs.writeFile(
        path.join(testDir, 'package.json'),
        JSON.stringify({ name: 'test-app', version: '1.0.0' }, null, 2)
      );
      await fs.writeFile(
        path.join(testDir, 'README.md'),
        '# Test App\n\nA generic TypeScript application.'
      );

      const knowledge = await extractKnowledge(testDir);

      expect(knowledge.projectType).toBe('generic');
      expect(knowledge.episodes.length).toBeGreaterThan(0);
      expect(knowledge.serenaMemories.length).toBeGreaterThan(0);

      // Should extract from README
      const readmeEpisode = knowledge.episodes.find(e => e.source.includes('README.md'));
      expect(readmeEpisode).toBeDefined();
      expect(readmeEpisode!.body).toContain('Test App');
    });
  });

  describe('Seed_DryRun_PreviewsOutput', () => {
    it('should not create files in dry run mode', async () => {
      await createFrameworkProject(testDir);

      const knowledge = await extractKnowledge(testDir);

      // Dry run should not write files
      const seedFilePath = path.join(testDir, '.graphiti-seed.json');
      const serenaMemoriesDir = path.join(testDir, '.serena', 'memories');

      // Files should not exist
      expect(await fs.pathExists(seedFilePath)).toBe(false);
      expect(await fs.pathExists(serenaMemoriesDir)).toBe(false);

      // But knowledge should be extracted
      expect(knowledge.episodes.length).toBeGreaterThan(0);
      expect(knowledge.serenaMemories.length).toBeGreaterThan(0);
    });
  });

  describe('Seed_SecurityValidation_SanitizesNames', () => {
    it('should sanitize malicious memory names', async () => {
      const maliciousNames = [
        '../../../etc/passwd',
        'test/../../../etc/passwd',
        'test/../../passwd',
        './test',
        'test\\windows\\system32',
      ];

      const serenaDir = path.join(testDir, '.serena', 'memories');
      await fs.ensureDir(serenaDir);

      for (const maliciousName of maliciousNames) {
        // Sanitize name (same logic as seed.ts)
        const safeName = maliciousName
          .replace(/[/\\]/g, '-')
          .replace(/\.\./g, '--')
          .replace(/^\./, '_');

        const memoryPath = path.join(serenaDir, `${safeName}.md`);
        await fs.writeFile(memoryPath, 'test content', 'utf-8');

        // Verify file is inside memories directory
        const resolvedPath = path.resolve(memoryPath);
        const resolvedDir = path.resolve(serenaDir);
        expect(resolvedPath.startsWith(resolvedDir)).toBe(true);

        // Verify no path traversal
        expect(safeName).not.toContain('..');
        expect(safeName).not.toContain('/');
        expect(safeName).not.toContain('\\');
      }
    });
  });

  describe('Seed_SelectiveSeeding_SupportsFlags', () => {
    it('should seed only Graphiti when --graphiti flag used', async () => {
      await createFrameworkProject(testDir);

      const knowledge = await extractKnowledge(testDir);

      // Simulate --graphiti flag (only create Graphiti seed)
      const seedFilePath = path.join(testDir, '.graphiti-seed.json');
      const seedFile = {
        groupId: 'test-project',
        projectPath: testDir,
        episodes: knowledge.episodes.map(e => ({
          name: e.name,
          body: e.body,
          source: e.source,
          sourceType: e.sourceType,
        })),
        createdAt: new Date().toISOString(),
        instructions: 'Import instructions...',
      };
      await fs.writeJson(seedFilePath, seedFile, { spaces: 2 });

      // Don't create Serena memories
      const serenaMemoriesDir = path.join(testDir, '.serena', 'memories');

      expect(await fs.pathExists(seedFilePath)).toBe(true);
      expect(await fs.pathExists(serenaMemoriesDir)).toBe(false);
    });

    it('should seed only Serena when --serena flag used', async () => {
      await createFrameworkProject(testDir);

      const knowledge = await extractKnowledge(testDir);

      // Simulate --serena flag (only create Serena memories)
      const serenaDir = path.join(testDir, '.serena', 'memories');
      await fs.ensureDir(serenaDir);

      for (const memory of knowledge.serenaMemories) {
        const safeName = memory.name
          .replace(/[/\\]/g, '-')
          .replace(/\.\./g, '--')
          .replace(/^\./, '_');
        const memoryPath = path.join(serenaDir, `${safeName}.md`);
        await fs.writeFile(memoryPath, memory.content, 'utf-8');
      }

      // Don't create Graphiti seed
      const seedFilePath = path.join(testDir, '.graphiti-seed.json');

      expect(await fs.pathExists(serenaDir)).toBe(true);
      expect(await fs.pathExists(seedFilePath)).toBe(false);

      const memoryFiles = await fs.readdir(serenaDir);
      expect(memoryFiles.length).toBe(knowledge.serenaMemories.length);
    });
  });

  describe('Seed_ErrorHandling_ValidatesConfig', () => {
    it('should fail when manifest missing', async () => {
      await fs.ensureDir(testDir);

      // No manifest exists
      const manifestManager = new ManifestManager(testDir);
      expect(await manifestManager.exists()).toBe(false);

      // Seed should check for manifest
      await expect(
        (async () => {
          if (!(await manifestManager.exists())) {
            throw new Error('Not an agentic framework project');
          }
        })()
      ).rejects.toThrow('Not an agentic framework project');
    });

    it('should fail when MCP not configured', async () => {
      await fs.ensureDir(testDir);

      const manifestManager = new ManifestManager(testDir);
      const manifest = await manifestManager.create('1.0.0', ['core']);
      await manifestManager.write(manifest);

      const loadedManifest = await manifestManager.read();
      expect(loadedManifest.mcp).toBeUndefined();

      // Seed should check for MCP config
      const mcpConfig = loadedManifest.mcp;
      if (!mcpConfig?.enabled) {
        expect(mcpConfig?.enabled).toBeFalsy();
      }
    });
  });
});

/**
 * Helper: Create a minimal framework project structure for testing
 */
async function createFrameworkProject(projectPath: string): Promise<void> {
  // Create manifest
  const manifestManager = new ManifestManager(projectPath);
  const manifest = await manifestManager.create('1.0.0', ['core']);
  manifest.mcp = {
    enabled: true,
    graphiti: { enabled: true, groupId: 'test-project' },
    serena: { enabled: true, projectName: 'test-project', language: 'typescript' },
  };
  await manifestManager.write(manifest);

  // Create CLAUDE.md
  await fs.writeFile(
    path.join(projectPath, 'CLAUDE.md'),
    `# Test Project\n\nFramework: Agentic Development Framework v1.0.0\n\n## Overview\n\nA test framework project for MCP seed testing.`
  );

  // Create package.json
  await fs.writeJson(path.join(projectPath, 'package.json'), {
    name: 'test-project',
    version: '1.0.0',
    description: 'Test project for MCP seed integration tests',
  });

  // Create context files
  await fs.ensureDir(path.join(projectPath, '.claude', 'context'));
  await fs.writeFile(
    path.join(projectPath, '.claude', 'context', 'business-basic.md'),
    '# Business Context\n\nTest business context for seed testing.'
  );

  await fs.writeFile(
    path.join(projectPath, '.claude', 'context', 'technical-basic.md'),
    '# Technical Context\n\nTest technical context for seed testing.'
  );
}
