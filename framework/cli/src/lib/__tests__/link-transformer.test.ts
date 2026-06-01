/**
 * Unit Tests for Link Transformer
 *
 * Tests markdown link transformation for framework deployments.
 */

import fs from 'fs-extra';
import path from 'path';
import { LinkTransformer } from '../link-transformer.js';

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('LinkTransformer', () => {
  const frameworkRoot = '/test/framework';

  beforeEach(() => {
    jest.resetAllMocks();
    // Default: frameworkRoot exists and is a directory
    mockedFs.pathExistsSync.mockReturnValue(true);
    mockedFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
  });

  describe('constructor', () => {
    it('should create transformer with valid frameworkRoot', () => {
      const transformer = new LinkTransformer(frameworkRoot);
      expect(transformer).toBeDefined();
    });

    it('should throw error when frameworkRoot is empty', () => {
      expect(() => new LinkTransformer('')).toThrow('frameworkRoot cannot be empty');
    });

    it('should throw error when frameworkRoot does not exist', () => {
      mockedFs.pathExistsSync.mockReturnValue(false);

      expect(() => new LinkTransformer('/nonexistent')).toThrow(
        'frameworkRoot does not exist'
      );
    });

    it('should throw error when frameworkRoot is not a directory', () => {
      mockedFs.statSync.mockReturnValue({ isDirectory: () => false } as any);

      expect(() => new LinkTransformer('/test/file.txt')).toThrow(
        'frameworkRoot is not a directory'
      );
    });

    it('should accept custom projectRoot', () => {
      const transformer = new LinkTransformer(frameworkRoot, '/project');
      expect(transformer).toBeDefined();
    });
  });

  describe('transformFile', () => {
    it('should transform links in a file', async () => {
      const transformer = new LinkTransformer(frameworkRoot);
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.stat.mockResolvedValue({ isFile: () => true } as any);
      mockedFs.readFile.mockResolvedValue(
        '[link](../ai/context/business.md)\n'
      );

      const result = await transformer.transformFile(
        '/test/framework/agents/agent.md',
        '/test/output/agent.md'
      );

      expect(result).toContain('[link]');
    });

    it('should throw error when source file does not exist', async () => {
      const transformer = new LinkTransformer(frameworkRoot);
      mockedFs.pathExists.mockResolvedValue(false);

      await expect(
        transformer.transformFile('/nonexistent.md', '/output.md')
      ).rejects.toThrow('Source file not found');
    });

    it('should throw error when source is not a file', async () => {
      const transformer = new LinkTransformer(frameworkRoot);
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.stat.mockResolvedValue({ isFile: () => false } as any);

      await expect(
        transformer.transformFile('/test/directory', '/output.md')
      ).rejects.toThrow('Source path is not a file');
    });
  });

  describe('transformContent', () => {
    let transformer: LinkTransformer;

    beforeEach(() => {
      transformer = new LinkTransformer(frameworkRoot);
    });

    describe('project placeholders', () => {
      it('should replace {project} with project root', () => {
        const content = 'Link: [file]({project}/ai/registries/agents.json)';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/agents/agent.md`
        );

        expect(result).toContain(`[file](${frameworkRoot}/ai/registries/agents.json)`);
      });

      it('should replace multiple {project} placeholders', () => {
        const content =
          '[file1]({project}/ai/agents.json)\n[file2]({project}/ai/skills.json)';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/agents/agent.md`
        );

        expect(result).toContain(`${frameworkRoot}/ai/agents.json`);
        expect(result).toContain(`${frameworkRoot}/ai/skills.json`);
      });

      it('should use custom projectRoot for placeholders', () => {
        const customTransformer = new LinkTransformer(frameworkRoot, '/custom/project');
        const content = '[file]({project}/ai/config.json)';

        const result = customTransformer.transformContent(
          content,
          `${frameworkRoot}/agents/agent.md`
        );

        expect(result).toContain('[file](/custom/project/ai/config.json)');
      });
    });

    describe('external URLs', () => {
      it('should preserve http:// URLs', () => {
        const content = '[link](http://example.com/path)';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/test.md`
        );

        expect(result).toBe('[link](http://example.com/path)');
      });

      it('should preserve https:// URLs', () => {
        const content = '[link](https://example.com/path)';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/test.md`
        );

        expect(result).toBe('[link](https://example.com/path)');
      });
    });

    describe('anchor-only links', () => {
      it('should preserve anchor-only links', () => {
        const content = '[link](#section)';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/test.md`
        );

        expect(result).toBe('[link](#section)');
      });
    });

    describe('image links', () => {
      it('should preserve .png links', () => {
        const content = '[image](./images/diagram.png)';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/test.md`
        );

        expect(result).toBe('[image](./images/diagram.png)');
      });

      it('should preserve .jpg links', () => {
        const content = '[image](./images/photo.jpg)';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/test.md`
        );

        expect(result).toBe('[image](./images/photo.jpg)');
      });

      it('should preserve .gif links', () => {
        const content = '[image](./images/animation.gif)';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/test.md`
        );

        expect(result).toBe('[image](./images/animation.gif)');
      });

      it('should preserve .svg links', () => {
        const content = '[image](./images/icon.svg)';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/test.md`
        );

        expect(result).toBe('[image](./images/icon.svg)');
      });

      it('should preserve .webp links', () => {
        const content = '[image](./images/photo.webp)';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/test.md`
        );

        expect(result).toBe('[image](./images/photo.webp)');
      });
    });

    describe('internal files', () => {
      it('should preserve ./ links', () => {
        const content = '[doc](./EXAMPLES.md)';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/test.md`
        );

        expect(result).toBe('[doc](./EXAMPLES.md)');
      });
    });

    describe('placeholder paths', () => {
      it('should preserve "url" placeholder', () => {
        const content = '[example](url)';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/test.md`
        );

        expect(result).toBe('[example](url)');
      });

      it('should preserve "path" placeholder', () => {
        const content = '[example](path)';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/test.md`
        );

        expect(result).toBe('[example](path)');
      });

      it('should preserve "file" placeholder', () => {
        const content = '[example](file)';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/test.md`
        );

        expect(result).toBe('[example](file)');
      });
    });

    describe('framework files', () => {
      it('should transform ai/context/ paths', () => {
        const content = '[context](../ai/context/business.md)';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/agents/test/agent.md`
        );

        expect(result).toContain('/ai/context/business.md');
      });

      it('should transform ai/registries/ paths', () => {
        const content = '[registry](../ai/registries/agents.json)';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/agents/test/agent.md`
        );

        expect(result).toContain('/ai/registries/agents.json');
      });

      it('should transform README.md paths', () => {
        const content = '[readme](../README.md)';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/agents/agent.md`
        );

        expect(result).toContain('README.md');
      });

      it('should transform CLAUDE.md paths', () => {
        const content = '[claude](../CLAUDE.md)';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/agents/agent.md`
        );

        expect(result).toContain('CLAUDE.md');
      });

      it('should transform routes.yml paths', () => {
        const content = '[routes](../routes.yml)';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/agents/agent.md`
        );

        expect(result).toContain('routes.yml');
      });
    });

    describe('combined links with anchors', () => {
      it('should preserve anchor in transformed path', () => {
        const content = '[section](../ai/context/business.md#overview)';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/agents/test/agent.md`
        );

        expect(result).toContain('#overview');
      });

      it('should preserve anchor in non-framework path', () => {
        const content = '[section](../other.md#section)';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/docs/test.md`
        );

        expect(result).toContain('#section');
      });
    });

    describe('empty and whitespace links', () => {
      it('should preserve empty links', () => {
        const content = '[link]()';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/test.md`
        );

        expect(result).toBe('[link]()');
      });

      it('should preserve whitespace-only links', () => {
        const content = '[link](   )';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/test.md`
        );

        expect(result).toBe('[link](   )');
      });
    });

    describe('multiple links in content', () => {
      it('should transform multiple links correctly', () => {
        const content = `
# Document

Link 1: [external](https://example.com)
Link 2: [internal](./local.md)
Link 3: [image](./icon.png)
Link 4: [anchor](#section)
Link 5: [context](../ai/context/business.md)
`;

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/agents/agent.md`
        );

        expect(result).toContain('[external](https://example.com)');
        expect(result).toContain('[internal](./local.md)');
        expect(result).toContain('[image](./icon.png)');
        expect(result).toContain('[anchor](#section)');
        expect(result).toContain('/ai/context/business.md');
      });
    });

    describe('non-framework relative paths', () => {
      it('should preserve non-framework relative paths', () => {
        const content = '[other](../other-project/file.md)';

        const result = transformer.transformContent(
          content,
          `${frameworkRoot}/agents/agent.md`
        );

        // Path outside framework should be preserved
        expect(result).toContain('../other-project/file.md');
      });
    });
  });
});
