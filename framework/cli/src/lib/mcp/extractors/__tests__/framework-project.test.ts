/**
 * Unit tests for Framework Project Extractor
 *
 * Tests knowledge extraction from Agentic Framework projects.
 * Focuses on parsing, error handling, and extraction limits.
 *
 * @module lib/mcp/extractors/__tests__/framework-project.test
 */

import path from 'path';
import fs from 'fs-extra';
import {
  isFrameworkProject,
  FrameworkProjectExtractor,
} from '../framework-project.js';

// Mock fs-extra
jest.mock('fs-extra');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('Framework Project Extractor', () => {
  const projectPath = '/test/project';
  const projectName = 'test-project';

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.warn in tests
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isFrameworkProject', () => {
    it('should return true when manifest exists', async () => {
      mockFs.pathExists.mockResolvedValueOnce(true);

      const result = await isFrameworkProject(projectPath);

      expect(result).toBe(true);
      expect(mockFs.pathExists).toHaveBeenCalledWith(
        path.join(projectPath, '.agentic-framework.json')
      );
    });

    it('should return false when manifest does not exist', async () => {
      mockFs.pathExists.mockResolvedValueOnce(false);

      const result = await isFrameworkProject(projectPath);

      expect(result).toBe(false);
    });
  });

  describe('FrameworkProjectExtractor', () => {
    let extractor: FrameworkProjectExtractor;

    beforeEach(() => {
      extractor = new FrameworkProjectExtractor(projectPath, projectName);
    });

    describe('extractClaudeMd', () => {
      it('should extract key sections from CLAUDE.md', async () => {
        const claudeMdContent = `# Agentic Development Framework - Entry Point

Framework Version: **v1.4.0** | Architecture: **Modular Discovery-Driven**

## Quick Navigation

\`\`\`
framework/
├── modules/
│   ├── core/
│   └── coding/
\`\`\`
`;
        mockFs.pathExists.mockResolvedValueOnce(true);
        mockFs.readFile.mockResolvedValueOnce(claudeMdContent);

        const knowledge = await extractor.extract();
        const claudeEpisode = knowledge.episodes.find(
          (e) => e.source === 'CLAUDE.md'
        );

        expect(claudeEpisode).toBeDefined();
        expect(claudeEpisode?.name).toBe('Project Entry Point (CLAUDE.md)');
        expect(claudeEpisode?.body).toContain('v1.4.0');
        expect(claudeEpisode?.body).toContain('Modular Discovery-Driven');
      });

      it('should handle missing CLAUDE.md', async () => {
        mockFs.pathExists.mockResolvedValueOnce(false);

        const knowledge = await extractor.extract();
        const claudeEpisode = knowledge.episodes.find(
          (e) => e.source === 'CLAUDE.md'
        );

        expect(claudeEpisode).toBeUndefined();
      });

      it('should extract project title', async () => {
        const content = '# My Awesome Project\n\nSome description';
        mockFs.pathExists.mockResolvedValueOnce(true);
        mockFs.readFile.mockResolvedValueOnce(content);

        const knowledge = await extractor.extract();
        const claudeEpisode = knowledge.episodes.find(
          (e) => e.source === 'CLAUDE.md'
        );

        expect(claudeEpisode?.body).toContain('Project: My Awesome Project');
      });
    });

    describe('extractReadme', () => {
      it('should extract first 3 sections from README', async () => {
        const readmeContent = `# Title

Description

## Section 1

Content 1

## Section 2

Content 2

## Section 3

Content 3

## Section 4

Content 4 (should not be included)
`;
        mockFs.pathExists
          .mockResolvedValueOnce(false) // CLAUDE.md
          .mockResolvedValueOnce(true); // README.md
        mockFs.readFile.mockResolvedValueOnce(readmeContent);

        const knowledge = await extractor.extract();
        const readmeEpisode = knowledge.episodes.find(
          (e) => e.source === 'README.md'
        );

        expect(readmeEpisode).toBeDefined();
        expect(readmeEpisode?.body).toContain('Section 3');
        expect(readmeEpisode?.body).not.toContain('Section 4');
      });

      it('should handle README with fewer than 3 sections', async () => {
        const readmeContent = `# Title\n\n## Section 1\n\nContent`;
        mockFs.pathExists
          .mockResolvedValueOnce(false) // CLAUDE.md
          .mockResolvedValueOnce(true); // README.md
        mockFs.readFile.mockResolvedValueOnce(readmeContent);

        const knowledge = await extractor.extract();
        const readmeEpisode = knowledge.episodes.find(
          (e) => e.source === 'README.md'
        );

        expect(readmeEpisode).toBeDefined();
        expect(readmeEpisode?.body).toContain('Title');
      });
    });

    describe('extractModuleCatalog', () => {
      it('should extract module information from manifest', async () => {
        const manifest = {
          modules: {
            core: { name: 'Core Module', version: '1.0.0' },
            coding: { name: 'Coding Module', version: '1.1.0' },
          },
        };

        mockFs.pathExists
          .mockResolvedValueOnce(false) // CLAUDE.md
          .mockResolvedValueOnce(false) // README.md
          .mockResolvedValueOnce(true); // manifest
        mockFs.readJson.mockResolvedValueOnce(manifest);

        const knowledge = await extractor.extract();
        const moduleEpisode = knowledge.episodes.find(
          (e) => e.source === '.agentic-framework.json'
        );

        expect(moduleEpisode).toBeDefined();
        expect(moduleEpisode?.name).toBe('Installed Modules');
        expect(moduleEpisode?.body).toContain('core: Core Module (v1.0.0)');
        expect(moduleEpisode?.body).toContain('coding: Coding Module (v1.1.0)');
      });

      it('should handle corrupt manifest JSON with warning', async () => {
        mockFs.pathExists
          .mockResolvedValueOnce(false) // CLAUDE.md
          .mockResolvedValueOnce(false) // README.md
          .mockResolvedValueOnce(true); // manifest
        mockFs.readJson.mockRejectedValueOnce(new Error('Invalid JSON'));

        const knowledge = await extractor.extract();

        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('Failed to parse')
        );
      });

      it('should handle manifest without modules', async () => {
        const manifest = { framework: { version: '1.0.0' } };

        mockFs.pathExists
          .mockResolvedValueOnce(false) // CLAUDE.md
          .mockResolvedValueOnce(false) // README.md
          .mockResolvedValueOnce(true); // manifest
        mockFs.readJson.mockResolvedValueOnce(manifest);

        const knowledge = await extractor.extract();
        const moduleEpisode = knowledge.episodes.find(
          (e) => e.name === 'Installed Modules'
        );

        expect(moduleEpisode).toBeUndefined();
      });
    });

    describe('extractAgentRegistry', () => {
      it('should extract agent information from registry', async () => {
        const agents = {
          agents: [
            { id: 'ai-architect', name: 'AI Architect', description: 'Designs architecture' },
            { id: 'ai-developer', description: 'Implements features' },
          ],
        };

        mockFs.pathExists
          .mockResolvedValueOnce(false) // CLAUDE.md
          .mockResolvedValueOnce(false) // README.md
          .mockResolvedValueOnce(false) // manifest
          .mockResolvedValueOnce(true); // agents.json
        mockFs.readJson.mockResolvedValueOnce(agents);

        const knowledge = await extractor.extract();
        const agentEpisode = knowledge.episodes.find(
          (e) => e.source === '.claude/registries/agents.json'
        );

        expect(agentEpisode).toBeDefined();
        expect(agentEpisode?.name).toBe('Available Agents');
        expect(agentEpisode?.body).toContain('/ai-architect: Designs architecture');
        expect(agentEpisode?.body).toContain('/ai-developer: Implements features');
      });

      it('should handle agents as array', async () => {
        const agents = [{ id: 'test-agent', description: 'Test' }];

        mockFs.pathExists
          .mockResolvedValueOnce(false) // CLAUDE.md
          .mockResolvedValueOnce(false) // README.md
          .mockResolvedValueOnce(false) // manifest
          .mockResolvedValueOnce(true); // agents.json
        mockFs.readJson.mockResolvedValueOnce(agents);

        const knowledge = await extractor.extract();
        const agentEpisode = knowledge.episodes.find(
          (e) => e.name === 'Available Agents'
        );

        expect(agentEpisode).toBeDefined();
      });

      it('should handle corrupt agents.json with warning', async () => {
        mockFs.pathExists
          .mockResolvedValueOnce(false) // CLAUDE.md
          .mockResolvedValueOnce(false) // README.md
          .mockResolvedValueOnce(false) // manifest
          .mockResolvedValueOnce(true); // agents.json
        mockFs.readJson.mockRejectedValueOnce(new Error('Parse error'));

        const knowledge = await extractor.extract();

        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('Failed to parse agents.json')
        );
      });

      it('should handle empty agent list', async () => {
        const agents = { agents: [] };

        mockFs.pathExists
          .mockResolvedValueOnce(false) // CLAUDE.md
          .mockResolvedValueOnce(false) // README.md
          .mockResolvedValueOnce(false) // manifest
          .mockResolvedValueOnce(true); // agents.json
        mockFs.readJson.mockResolvedValueOnce(agents);

        const knowledge = await extractor.extract();
        const agentEpisode = knowledge.episodes.find(
          (e) => e.name === 'Available Agents'
        );

        expect(agentEpisode).toBeUndefined();
      });
    });

    describe('extractSkillRegistry', () => {
      it('should extract skill information from registry', async () => {
        const skills = {
          skills: [
            { id: 'committing-code', description: 'Git operations' },
            { id: 'verifying-quality', description: 'Quality checks' },
          ],
        };

        mockFs.pathExists
          .mockResolvedValueOnce(false) // CLAUDE.md
          .mockResolvedValueOnce(false) // README.md
          .mockResolvedValueOnce(false) // manifest
          .mockResolvedValueOnce(false) // agents.json
          .mockResolvedValueOnce(true); // skills.json
        mockFs.readJson.mockResolvedValueOnce(skills);

        const knowledge = await extractor.extract();
        const skillEpisode = knowledge.episodes.find(
          (e) => e.source === '.claude/registries/skills.json'
        );

        expect(skillEpisode).toBeDefined();
        expect(skillEpisode?.name).toBe('Available Skills');
        expect(skillEpisode?.body).toContain('committing-code: Git operations');
      });

      it('should handle corrupt skills.json with warning', async () => {
        mockFs.pathExists
          .mockResolvedValueOnce(false) // CLAUDE.md
          .mockResolvedValueOnce(false) // README.md
          .mockResolvedValueOnce(false) // manifest
          .mockResolvedValueOnce(false) // agents.json
          .mockResolvedValueOnce(true); // skills.json
        mockFs.readJson.mockRejectedValueOnce(new Error('Invalid JSON'));

        const knowledge = await extractor.extract();

        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('Failed to parse skills.json')
        );
      });
    });

    describe('extractContextSummaries', () => {
      it('should extract basic context files', async () => {
        const contextFiles = ['business-basic.md', 'technical-basic.md'];
        const businessContent = '# Business Context\n\nOur product helps...';
        const technicalContent = '# Technical Context\n\nWe use React...';

        mockFs.pathExists
          .mockResolvedValueOnce(false) // CLAUDE.md
          .mockResolvedValueOnce(false) // README.md
          .mockResolvedValueOnce(false) // manifest
          .mockResolvedValueOnce(false) // agents.json
          .mockResolvedValueOnce(false) // skills.json
          .mockResolvedValueOnce(true); // context dir
        mockFs.readdir.mockResolvedValueOnce(contextFiles as never);
        mockFs.readFile
          .mockResolvedValueOnce(businessContent)
          .mockResolvedValueOnce(technicalContent);

        const knowledge = await extractor.extract();
        const contextEpisodes = knowledge.episodes.filter((e) =>
          e.name.startsWith('Context:')
        );

        expect(contextEpisodes).toHaveLength(2);
        expect(contextEpisodes.some((e) => e.name === 'Context: business')).toBe(true);
        expect(contextEpisodes.some((e) => e.name === 'Context: technical')).toBe(true);
      });

      it('should skip template files', async () => {
        const contextFiles = ['business-basic.md'];
        const templateContent = '<!-- TEMPLATE: Fill this in -->\n\n# Template';

        mockFs.pathExists
          .mockResolvedValueOnce(false) // CLAUDE.md
          .mockResolvedValueOnce(false) // README.md
          .mockResolvedValueOnce(false) // manifest
          .mockResolvedValueOnce(false) // agents.json
          .mockResolvedValueOnce(false) // skills.json
          .mockResolvedValueOnce(true); // context dir
        mockFs.readdir.mockResolvedValueOnce(contextFiles as never);
        mockFs.readFile.mockResolvedValueOnce(templateContent);

        const knowledge = await extractor.extract();
        const contextEpisodes = knowledge.episodes.filter((e) =>
          e.name.startsWith('Context:')
        );

        expect(contextEpisodes).toHaveLength(0);
      });

      it('should handle missing context directory', async () => {
        mockFs.pathExists.mockResolvedValue(false);

        const knowledge = await extractor.extract();
        const contextEpisodes = knowledge.episodes.filter((e) =>
          e.name.startsWith('Context:')
        );

        expect(contextEpisodes).toHaveLength(0);
      });
    });

    describe('generateProjectOverview', () => {
      it('should generate overview with manifest data', async () => {
        const manifest = {
          framework: { version: '1.4.0', cliVersion: '1.7.0' },
          modules: { core: {}, coding: {} },
        };

        // Mock all file operations to return false except for the manifest
        mockFs.pathExists.mockImplementation((p) => {
          const pathStr = p as string;
          return Promise.resolve(
            pathStr.includes('.agentic-framework.json') ||
            pathStr.includes('.claude/commands') ||
            pathStr.includes('.claude/skills')
          );
        });
        // Manifest is read twice: once in extractModuleCatalog, once in generateProjectOverview
        mockFs.readJson
          .mockResolvedValueOnce(manifest) // extractModuleCatalog
          .mockResolvedValueOnce(manifest); // generateProjectOverview
        mockFs.readdir
          .mockResolvedValueOnce([]) // commands dir
          .mockResolvedValueOnce([]); // skills dir

        const knowledge = await extractor.extract();
        const overview = knowledge.serenaMemories.find(
          (m) => m.name === 'project-overview'
        );

        expect(overview).toBeDefined();
        expect(overview?.content).toContain('Framework');
        expect(overview?.content).toContain('1.4.0');
        expect(overview?.content).toContain('Installed Modules');
        expect(overview?.category).toBe('overview');
      });

      it('should scan key directories', async () => {
        mockFs.pathExists.mockImplementation((p) => {
          const pathStr = p as string;
          return Promise.resolve(
            pathStr.includes('.claude/commands') || pathStr.includes('.claude/skills')
          );
        });
        mockFs.readdir
          .mockResolvedValueOnce(['command1.md', 'command2.md'] as never)
          .mockResolvedValueOnce(['skill1.md'] as never);

        const knowledge = await extractor.extract();
        const overview = knowledge.serenaMemories.find(
          (m) => m.name === 'project-overview'
        );

        expect(overview?.content).toContain('Agent Commands');
        expect(overview?.content).toContain('Files: 2');
      });
    });

    describe('generateCliStructure', () => {
      it('should generate CLI structure memory', async () => {
        mockFs.pathExists.mockImplementation((p) => {
          const pathStr = p as string;
          return Promise.resolve(
            pathStr.includes('framework/cli/src') ||
              pathStr.includes('commands') ||
              pathStr.includes('lib')
          );
        });

        mockFs.readdir
          .mockResolvedValueOnce([
            { name: 'init.ts', isDirectory: () => false },
            { name: 'validate.ts', isDirectory: () => false },
            { name: 'backlog', isDirectory: () => true },
          ] as never)
          .mockResolvedValueOnce([
            { name: 'manifest-manager.ts', isDirectory: () => false },
            { name: 'cli-context.ts', isDirectory: () => false },
            { name: 'mcp', isDirectory: () => true },
          ] as never);

        const knowledge = await extractor.extract();
        const cliStructure = knowledge.serenaMemories.find(
          (m) => m.name === 'cli-structure'
        );

        expect(cliStructure).toBeDefined();
        expect(cliStructure?.content).toContain('Commands');
        expect(cliStructure?.content).toContain('Libraries');
        expect(cliStructure?.category).toBe('structure');
      });

      it('should limit library display to 10 items', () => {
        const libs = Array.from({ length: 15 }, (_, i) => ({
          name: `lib${i}.ts`,
          isDirectory: () => false,
        }));

        mockFs.pathExists.mockResolvedValue(true);
        mockFs.readdir.mockResolvedValueOnce([] as never).mockResolvedValueOnce(libs as never);

        // The implementation should show only first 10 and add "... and 5 more"
        expect(libs.length).toBe(15);
      });

      it('should handle missing CLI directory', async () => {
        mockFs.pathExists.mockResolvedValue(false);

        const knowledge = await extractor.extract();
        const cliStructure = knowledge.serenaMemories.find(
          (m) => m.name === 'cli-structure'
        );

        expect(cliStructure?.content).toContain('No CLI source found');
      });
    });

    describe('Full extraction', () => {
      it('should return all expected episodes and memories', async () => {
        // Setup all files to exist
        mockFs.pathExists.mockResolvedValue(true);
        mockFs.readFile.mockResolvedValue('content');
        mockFs.readJson.mockResolvedValue({});
        mockFs.readdir.mockResolvedValue([]);

        const knowledge = await extractor.extract();

        expect(knowledge.projectName).toBe(projectName);
        expect(knowledge.projectType).toBe('framework');
        expect(knowledge.episodes).toBeInstanceOf(Array);
        expect(knowledge.serenaMemories).toBeInstanceOf(Array);
        expect(knowledge.serenaMemories).toHaveLength(3); // overview, patterns, structure
      });

      it('should have correct Serena memory categories', async () => {
        mockFs.pathExists.mockResolvedValue(false);

        const knowledge = await extractor.extract();

        const categories = knowledge.serenaMemories.map((m) => m.category);
        expect(categories).toContain('overview');
        expect(categories).toContain('patterns');
        expect(categories).toContain('structure');
      });
    });
  });
});
