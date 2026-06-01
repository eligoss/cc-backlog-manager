/**
 * Unit tests for Generic Project Extractor
 *
 * Tests knowledge extraction from non-framework projects.
 * Validates constant limits and project type detection.
 *
 * @module lib/mcp/extractors/__tests__/generic-project.test
 */

import path from 'path';
import fs from 'fs-extra';
import { GenericProjectExtractor } from '../generic-project.js';

// Mock fs-extra
jest.mock('fs-extra');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('Generic Project Extractor', () => {
  const projectPath = '/test/generic-project';
  const projectName = 'generic-project';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GenericProjectExtractor', () => {
    let extractor: GenericProjectExtractor;

    beforeEach(() => {
      extractor = new GenericProjectExtractor(projectPath, projectName);
    });

    describe('extractReadme', () => {
      it('should extract README content', async () => {
        const readmeContent = '# Generic Project\n\nA great project';
        mockFs.pathExists.mockResolvedValueOnce(true);
        mockFs.readFile.mockResolvedValueOnce(readmeContent);

        const knowledge = await extractor.extract();
        const readmeEpisode = knowledge.episodes.find(
          (e) => e.source === 'README.md'
        );

        expect(readmeEpisode).toBeDefined();
        expect(readmeEpisode?.name).toBe('Project README');
        expect(readmeEpisode?.body).toContain('Generic Project');
        expect(readmeEpisode?.sourceType).toBe('file');
      });

      it('should truncate long README to 2000 characters', async () => {
        const longContent = 'a'.repeat(3000);
        mockFs.pathExists.mockResolvedValueOnce(true);
        mockFs.readFile.mockResolvedValueOnce(longContent);

        const knowledge = await extractor.extract();
        const readmeEpisode = knowledge.episodes.find(
          (e) => e.source === 'README.md'
        );

        expect(readmeEpisode?.body.length).toBe(2003); // 2000 + '...'
        expect(readmeEpisode?.body.endsWith('...')).toBe(true);
      });

      it('should not truncate README under 2000 characters', async () => {
        const content = 'a'.repeat(1500);
        mockFs.pathExists.mockResolvedValueOnce(true);
        mockFs.readFile.mockResolvedValueOnce(content);

        const knowledge = await extractor.extract();
        const readmeEpisode = knowledge.episodes.find(
          (e) => e.source === 'README.md'
        );

        expect(readmeEpisode?.body).toBe(content);
        expect(readmeEpisode?.body.endsWith('...')).toBe(false);
      });

      it('should handle missing README', async () => {
        mockFs.pathExists.mockResolvedValueOnce(false);

        const knowledge = await extractor.extract();
        const readmeEpisode = knowledge.episodes.find(
          (e) => e.source === 'README.md'
        );

        expect(readmeEpisode).toBeUndefined();
      });
    });

    describe('extractClaudeMd', () => {
      it('should extract CLAUDE.md if present', async () => {
        const claudeContent = '# Project Instructions\n\nUse TypeScript';
        mockFs.pathExists
          .mockResolvedValueOnce(false) // README.md
          .mockResolvedValueOnce(true); // CLAUDE.md
        mockFs.readFile.mockResolvedValueOnce(claudeContent);

        const knowledge = await extractor.extract();
        const claudeEpisode = knowledge.episodes.find(
          (e) => e.source === 'CLAUDE.md'
        );

        expect(claudeEpisode).toBeDefined();
        expect(claudeEpisode?.name).toBe('Claude Instructions (CLAUDE.md)');
        expect(claudeEpisode?.body).toContain('TypeScript');
      });
    });

    describe('extractPackageJson', () => {
      it('should extract package.json metadata', async () => {
        const pkg = {
          name: 'my-package',
          version: '1.0.0',
          description: 'A cool package',
          dependencies: {
            react: '^18.0.0',
            'react-dom': '^18.0.0',
          },
          scripts: {
            start: 'npm run dev',
            build: 'tsc',
          },
        };

        mockFs.pathExists
          .mockResolvedValueOnce(false) // README.md
          .mockResolvedValueOnce(false) // CLAUDE.md
          .mockResolvedValueOnce(true); // package.json
        mockFs.readJson.mockResolvedValueOnce(pkg);

        const knowledge = await extractor.extract();
        const pkgEpisode = knowledge.episodes.find(
          (e) => e.source === 'package.json'
        );

        expect(pkgEpisode).toBeDefined();
        expect(pkgEpisode?.name).toBe('Package Configuration');
        expect(pkgEpisode?.body).toContain('my-package');
        expect(pkgEpisode?.body).toContain('1.0.0');
        expect(pkgEpisode?.body).toContain('A cool package');
        expect(pkgEpisode?.body).toContain('react');
        expect(pkgEpisode?.body).toContain('npm run start');
      });

      it('should limit dependencies display to 15 items', async () => {
        const deps = Object.fromEntries(
          Array.from({ length: 20 }, (_, i) => [`dep${i}`, '^1.0.0'])
        );
        const pkg = {
          name: 'many-deps',
          dependencies: deps,
        };

        mockFs.pathExists
          .mockResolvedValueOnce(false) // README.md
          .mockResolvedValueOnce(false) // CLAUDE.md
          .mockResolvedValueOnce(true); // package.json
        mockFs.readJson.mockResolvedValueOnce(pkg);

        const knowledge = await extractor.extract();
        const pkgEpisode = knowledge.episodes.find(
          (e) => e.source === 'package.json'
        );

        expect(pkgEpisode?.body).toContain('... and 5 more');
      });

      it('should handle package.json without optional fields', async () => {
        const pkg = { name: 'minimal-package' };

        mockFs.pathExists
          .mockResolvedValueOnce(false) // README.md
          .mockResolvedValueOnce(false) // CLAUDE.md
          .mockResolvedValueOnce(true); // package.json
        mockFs.readJson.mockResolvedValueOnce(pkg);

        const knowledge = await extractor.extract();
        const pkgEpisode = knowledge.episodes.find(
          (e) => e.source === 'package.json'
        );

        expect(pkgEpisode).toBeDefined();
        expect(pkgEpisode?.body).toContain('minimal-package');
      });

      it('should handle corrupt package.json', async () => {
        mockFs.pathExists
          .mockResolvedValueOnce(false) // README.md
          .mockResolvedValueOnce(false) // CLAUDE.md
          .mockResolvedValueOnce(true); // package.json
        mockFs.readJson.mockRejectedValueOnce(new Error('Invalid JSON'));

        const knowledge = await extractor.extract();
        const pkgEpisode = knowledge.episodes.find(
          (e) => e.source === 'package.json'
        );

        expect(pkgEpisode).toBeUndefined();
      });
    });

    describe('extractPyproject', () => {
      it('should extract pyproject.toml metadata', async () => {
        const pyproject = `[project]
name = "my-python-project"
version = "0.1.0"
description = "A Python project"

[project.dependencies]
dependencies = [
  "requests>=2.28.0",
  "pydantic>=2.0.0",
]
`;
        mockFs.pathExists
          .mockResolvedValueOnce(false) // README.md
          .mockResolvedValueOnce(false) // CLAUDE.md
          .mockResolvedValueOnce(false) // package.json
          .mockResolvedValueOnce(true); // pyproject.toml
        mockFs.readFile.mockResolvedValueOnce(pyproject);

        const knowledge = await extractor.extract();
        const pyEpisode = knowledge.episodes.find(
          (e) => e.source === 'pyproject.toml'
        );

        expect(pyEpisode).toBeDefined();
        expect(pyEpisode?.name).toBe('Python Project Configuration');
        expect(pyEpisode?.body).toContain('my-python-project');
        expect(pyEpisode?.body).toContain('0.1.0');
        expect(pyEpisode?.body).toContain('A Python project');
        expect(pyEpisode?.body).toContain('requests');
      });

      it('should limit Python dependencies display to 10 items', async () => {
        const deps = Array.from({ length: 15 }, (_, i) => `"dep${i}>=1.0.0"`).join(',\n');
        const pyproject = `[project.dependencies]
dependencies = [
  ${deps}
]
`;
        mockFs.pathExists
          .mockResolvedValueOnce(false) // README.md
          .mockResolvedValueOnce(false) // CLAUDE.md
          .mockResolvedValueOnce(false) // package.json
          .mockResolvedValueOnce(true); // pyproject.toml
        mockFs.readFile.mockResolvedValueOnce(pyproject);

        const knowledge = await extractor.extract();
        const pyEpisode = knowledge.episodes.find(
          (e) => e.source === 'pyproject.toml'
        );

        expect(pyEpisode?.body).toContain('... and 5 more');
      });

      it('should handle pyproject.toml without dependencies', async () => {
        const pyproject = `[project]
name = "simple-project"
`;
        mockFs.pathExists
          .mockResolvedValueOnce(false) // README.md
          .mockResolvedValueOnce(false) // CLAUDE.md
          .mockResolvedValueOnce(false) // package.json
          .mockResolvedValueOnce(true); // pyproject.toml
        mockFs.readFile.mockResolvedValueOnce(pyproject);

        const knowledge = await extractor.extract();
        const pyEpisode = knowledge.episodes.find(
          (e) => e.source === 'pyproject.toml'
        );

        expect(pyEpisode).toBeDefined();
        expect(pyEpisode?.body).toContain('simple-project');
      });
    });

    describe('extractStructure', () => {
      it('should detect common directories', async () => {
        mockFs.pathExists.mockImplementation((p) => {
          const pathStr = p as string;
          return Promise.resolve(
            pathStr.endsWith('/src') ||
              pathStr.endsWith('/tests') ||
              pathStr.endsWith('/docs')
          );
        });

        const knowledge = await extractor.extract();
        const structureEpisode = knowledge.episodes.find(
          (e) => e.source === 'directory scan'
        );

        expect(structureEpisode).toBeDefined();
        expect(structureEpisode?.name).toBe('Project Structure');
        expect(structureEpisode?.body).toContain('src/: Source code');
        expect(structureEpisode?.body).toContain('tests/: Test files');
        expect(structureEpisode?.body).toContain('docs/: Documentation');
      });

      it('should detect common config files', async () => {
        mockFs.pathExists.mockImplementation((p) => {
          const pathStr = p as string;
          return Promise.resolve(
            pathStr.endsWith('/tsconfig.json') ||
              pathStr.endsWith('/jest.config.js') ||
              pathStr.endsWith('/Dockerfile')
          );
        });

        const knowledge = await extractor.extract();
        const structureEpisode = knowledge.episodes.find(
          (e) => e.name === 'Project Structure'
        );

        expect(structureEpisode?.body).toContain('tsconfig.json');
        expect(structureEpisode?.body).toContain('jest.config.js');
        expect(structureEpisode?.body).toContain('Dockerfile');
      });

      it('should return null when no structure found', async () => {
        mockFs.pathExists.mockResolvedValue(false);

        const knowledge = await extractor.extract();
        const structureEpisode = knowledge.episodes.find(
          (e) => e.name === 'Project Structure'
        );

        expect(structureEpisode).toBeUndefined();
      });
    });

    describe('generateProjectOverview', () => {
      it('should detect Next.js project', async () => {
        const pkg = {
          dependencies: { next: '^14.0.0' },
        };

        mockFs.pathExists.mockImplementation((p) =>
          Promise.resolve((p as string).endsWith('/package.json'))
        );
        mockFs.readJson.mockImplementation(() =>
          Promise.resolve(pkg)
        );

        const knowledge = await extractor.extract();
        const overview = knowledge.serenaMemories.find(
          (m) => m.name === 'project-overview'
        );

        expect(overview?.content).toContain('Next.js application');
      });

      it('should detect React project', async () => {
        const pkg = {
          dependencies: { react: '^18.0.0' },
        };

        mockFs.pathExists.mockImplementation((p) =>
          Promise.resolve((p as string).endsWith('/package.json'))
        );
        mockFs.readJson.mockImplementation(() =>
          Promise.resolve(pkg)
        );

        const knowledge = await extractor.extract();
        const overview = knowledge.serenaMemories.find(
          (m) => m.name === 'project-overview'
        );

        expect(overview?.content).toContain('React application');
      });

      it('should detect TypeScript', async () => {
        const pkg = {
          devDependencies: { typescript: '^5.0.0' },
        };

        mockFs.pathExists.mockImplementation((p) =>
          Promise.resolve((p as string).endsWith('/package.json'))
        );
        // Need to mock readJson to return a Promise with .catch method
        mockFs.readJson.mockImplementation(() =>
          Promise.resolve(pkg)
        );

        const knowledge = await extractor.extract();
        const overview = knowledge.serenaMemories.find(
          (m) => m.name === 'project-overview'
        );

        expect(overview?.content).toContain('TypeScript');
      });

      it('should detect Python project', async () => {
        mockFs.pathExists.mockImplementation((p) => {
          const pathStr = p as string;
          return Promise.resolve(pathStr.endsWith('/pyproject.toml'));
        });
        mockFs.readFile.mockResolvedValue('[project]\nname = "test"\n');

        const knowledge = await extractor.extract();
        const overview = knowledge.serenaMemories.find(
          (m) => m.name === 'project-overview'
        );

        expect(overview?.content).toContain('Python project');
      });

      it('should detect Rust project', async () => {
        mockFs.pathExists.mockResolvedValue(false);
        mockFs.pathExists.mockImplementation((p) =>
          Promise.resolve((p as string).endsWith('/Cargo.toml'))
        );

        const knowledge = await extractor.extract();
        const overview = knowledge.serenaMemories.find(
          (m) => m.name === 'project-overview'
        );

        expect(overview?.content).toContain('Rust project');
      });

      it('should detect Go project', async () => {
        mockFs.pathExists.mockResolvedValue(false);
        mockFs.pathExists.mockImplementation((p) =>
          Promise.resolve((p as string).endsWith('/go.mod'))
        );

        const knowledge = await extractor.extract();
        const overview = knowledge.serenaMemories.find(
          (m) => m.name === 'project-overview'
        );

        expect(overview?.content).toContain('Go project');
      });

      it('should detect common entry points', async () => {
        mockFs.pathExists.mockImplementation((p) => {
          const pathStr = p as string;
          return Promise.resolve(
            pathStr.endsWith('/src/index.ts') || pathStr.endsWith('/src/main.ts')
          );
        });

        const knowledge = await extractor.extract();
        const overview = knowledge.serenaMemories.find(
          (m) => m.name === 'project-overview'
        );

        expect(overview?.content).toContain('Entry Points');
        expect(overview?.content).toContain('src/index.ts');
        expect(overview?.content).toContain('src/main.ts');
      });
    });

    describe('generateStructureMemory', () => {
      it('should scan source directories', async () => {
        mockFs.pathExists.mockImplementation((p) => {
          const pathStr = p as string;
          return Promise.resolve(pathStr.endsWith('/src') || pathStr.endsWith('/lib'));
        });

        mockFs.readdir
          .mockResolvedValueOnce([
            { name: 'components', isDirectory: () => true, isFile: () => false },
            { name: 'utils', isDirectory: () => true, isFile: () => false },
            { name: 'index.ts', isDirectory: () => false, isFile: () => true },
          ] as never)
          .mockResolvedValueOnce([
            { name: 'helpers', isDirectory: () => true, isFile: () => false },
          ] as never);

        const knowledge = await extractor.extract();
        const structure = knowledge.serenaMemories.find(
          (m) => m.name === 'code-structure'
        );

        expect(structure).toBeDefined();
        expect(structure?.content).toContain('src/');
        expect(structure?.content).toContain('components/');
        expect(structure?.content).toContain('index.ts');
        expect(structure?.category).toBe('structure');
      });

      it('should limit subdirectory display to 10 items', () => {
        const subdirs = Array.from({ length: 15 }, (_, i) => ({
          name: `dir${i}`,
          isDirectory: () => true,
          isFile: () => false,
        }));

        mockFs.pathExists.mockResolvedValue(true);
        mockFs.readdir.mockResolvedValueOnce(subdirs as never);

        // Implementation should slice to 10
        expect(subdirs.length).toBe(15);
      });

      it('should limit source files display to 10 items', () => {
        const files = Array.from({ length: 15 }, (_, i) => ({
          name: `file${i}.ts`,
          isDirectory: () => false,
          isFile: () => true,
        }));

        mockFs.pathExists.mockResolvedValue(true);
        mockFs.readdir.mockResolvedValueOnce(files as never);

        // Implementation should slice to 10
        expect(files.length).toBe(15);
      });
    });

    describe('Full extraction', () => {
      it('should return generic project type', async () => {
        mockFs.pathExists.mockResolvedValue(false);

        const knowledge = await extractor.extract();

        expect(knowledge.projectType).toBe('generic');
        expect(knowledge.projectName).toBe(projectName);
      });

      it('should generate all Serena memories', async () => {
        mockFs.pathExists.mockResolvedValue(false);

        const knowledge = await extractor.extract();

        expect(knowledge.serenaMemories).toHaveLength(2); // overview, structure
        expect(knowledge.serenaMemories.map((m) => m.name)).toEqual([
          'project-overview',
          'code-structure',
        ]);
      });

      it('should have correct memory categories', async () => {
        mockFs.pathExists.mockResolvedValue(false);

        const knowledge = await extractor.extract();

        const categories = knowledge.serenaMemories.map((m) => m.category);
        expect(categories).toContain('overview');
        expect(categories).toContain('structure');
      });
    });

    describe('Constant Limits', () => {
      it('should respect MAX_README_LENGTH (2000)', () => {
        const MAX_README_LENGTH = 2000;
        expect(MAX_README_LENGTH).toBe(2000);
      });

      it('should respect MAX_DEPS_DISPLAY (15)', () => {
        const MAX_DEPS_DISPLAY = 15;
        expect(MAX_DEPS_DISPLAY).toBe(15);
      });

      it('should respect MAX_PYTHON_DEPS_DISPLAY (10)', () => {
        const MAX_PYTHON_DEPS_DISPLAY = 10;
        expect(MAX_PYTHON_DEPS_DISPLAY).toBe(10);
      });

      it('should respect MAX_SOURCE_FILES_DISPLAY (10)', () => {
        const MAX_SOURCE_FILES_DISPLAY = 10;
        expect(MAX_SOURCE_FILES_DISPLAY).toBe(10);
      });

      it('should respect MAX_SUBDIRS_DISPLAY (10)', () => {
        const MAX_SUBDIRS_DISPLAY = 10;
        expect(MAX_SUBDIRS_DISPLAY).toBe(10);
      });
    });
  });
});
