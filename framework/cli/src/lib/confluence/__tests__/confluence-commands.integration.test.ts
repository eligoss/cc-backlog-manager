/**
 * Tests for Confluence Commands
 *
 * Tests the CLI command logic for:
 * - create-page: Read markdown, convert to ADF, create in Confluence
 * - fetch-page: Get page by ID, convert ADF to markdown, save to file
 * - import-reports: Batch import markdown reports to Confluence
 */

import fs from 'fs-extra';
import path from 'path';
import {
  createPageCommand,
  fetchPageCommand,
  importReportsCommand,
} from '../confluence-commands';
import { ConfluenceClient } from '../confluence-client';
import { markdownToAdf, adfToMarkdown } from '../adf-converter';

// Mock dependencies
jest.mock('../confluence-client');
jest.mock('../adf-converter');
jest.mock('fs-extra');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedMarkdownToAdf = markdownToAdf as jest.MockedFunction<typeof markdownToAdf>;
const mockedAdfToMarkdown = adfToMarkdown as jest.MockedFunction<typeof adfToMarkdown>;

describe('ConfluenceCommands', () => {
  // Note: These tests fully mock fs-extra, so no real filesystem operations occur.
  // We use a fake tempDir path since it's only used to construct paths for mock assertions.
  let tempDir: string;
  let mockClient: any;

  beforeEach(() => {
    // Use a deterministic fake path for mock-based tests
    tempDir = '/mock/test/confluence';
    mockClient = {
      createPage: jest.fn(),
      updatePage: jest.fn(),
      getPage: jest.fn(),
      getPageByTitle: jest.fn(),
    };

    // Mock ConfluenceClient constructor
    (ConfluenceClient as any).mockImplementation(() => mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPageCommand', () => {
    it('should read markdown file with frontmatter', async () => {
      const markdownPath = path.join(tempDir, 'test.md');
      const markdown = `---
title: Test Page
spaceKey: TEST
---
# Hello World`;

      mockedFs.readFile.mockResolvedValue(markdown as any);
      mockedMarkdownToAdf.mockReturnValue({
        version: 1,
        type: 'doc',
        content: [],
      });
      mockClient.createPage.mockResolvedValue('12345');
      mockClient.getPage.mockResolvedValue({
        id: '12345',
        title: 'Test Page',
        version: { number: 1 },
        _links: { webui: '/pages/12345' },
      });

      const config = {
        baseUrl: 'https://test.atlassian.net/wiki',
        email: 'test@example.com',
        apiToken: 'token',
      };

      await createPageCommand(markdownPath, config);

      expect(fs.readFile).toHaveBeenCalledWith(markdownPath, 'utf-8');
    });

    it('should convert markdown to ADF', async () => {
      const markdownPath = path.join(tempDir, 'test.md');
      const markdown = `---
title: Test Page
spaceKey: TEST
---
# Hello World`;

      mockedFs.readFile.mockResolvedValue(markdown as any);
      mockedMarkdownToAdf.mockReturnValue({
        version: 1,
        type: 'doc',
        content: [],
      });
      mockClient.createPage.mockResolvedValue('12345');
      mockClient.getPage.mockResolvedValue({
        id: '12345',
        title: 'Test Page',
        version: { number: 1 },
        _links: { webui: '/pages/12345' },
      });

      const config = {
        baseUrl: 'https://test.atlassian.net/wiki',
        email: 'test@example.com',
        apiToken: 'token',
      };

      await createPageCommand(markdownPath, config);

      expect(markdownToAdf).toHaveBeenCalledWith('# Hello World');
    });

    it('should create page in Confluence with space key from frontmatter', async () => {
      const markdownPath = path.join(tempDir, 'test.md');
      const markdown = `---
title: Test Page
spaceKey: TEST
---
# Hello World`;

      const adfDoc = {
        version: 1,
        type: 'doc',
        content: [],
      };

      mockedFs.readFile.mockResolvedValue(markdown);
      mockedMarkdownToAdf.mockReturnValue(adfDoc);
      mockClient.createPage.mockResolvedValue('12345');
      mockClient.getPage.mockResolvedValue({
        id: '12345',
        title: 'Test Page',
        version: { number: 1 },
        _links: { webui: '/pages/12345' },
      });

      const config = {
        baseUrl: 'https://test.atlassian.net/wiki',
        email: 'test@example.com',
        apiToken: 'token',
      };

      await createPageCommand(markdownPath, config);

      expect(mockClient.createPage).toHaveBeenCalledWith(
        'TEST',
        'Test Page',
        adfDoc,
        undefined
      );
    });

    it('should support parent page option', async () => {
      const markdownPath = path.join(tempDir, 'test.md');
      const markdown = `---
title: Test Page
spaceKey: TEST
parentId: 999
---
# Hello World`;

      const adfDoc = {
        version: 1,
        type: 'doc',
        content: [],
      };

      mockedFs.readFile.mockResolvedValue(markdown);
      mockedMarkdownToAdf.mockReturnValue(adfDoc);
      mockClient.createPage.mockResolvedValue('12345');
      mockClient.getPage.mockResolvedValue({
        id: '12345',
        title: 'Test Page',
        version: { number: 1 },
        _links: { webui: '/pages/12345' },
      });

      const config = {
        baseUrl: 'https://test.atlassian.net/wiki',
        email: 'test@example.com',
        apiToken: 'token',
      };

      await createPageCommand(markdownPath, config, { parentId: '888' });

      // CLI option should override frontmatter
      expect(mockClient.createPage).toHaveBeenCalledWith(
        'TEST',
        'Test Page',
        adfDoc,
        '888'
      );
    });

    it('should update frontmatter with page metadata after creation', async () => {
      const markdownPath = path.join(tempDir, 'test.md');
      const markdown = `---
title: Test Page
spaceKey: TEST
---
# Hello World`;

      mockedFs.readFile.mockResolvedValue(markdown as any);
      mockedMarkdownToAdf.mockReturnValue({
        version: 1,
        type: 'doc',
        content: [],
      });
      mockClient.createPage.mockResolvedValue('12345');
      mockClient.getPage.mockResolvedValue({
        id: '12345',
        title: 'Test Page',
        version: { number: 1 },
        _links: { webui: '/pages/12345' },
      });

      const config = {
        baseUrl: 'https://test.atlassian.net/wiki',
        email: 'test@example.com',
        apiToken: 'token',
      };

      await createPageCommand(markdownPath, config);

      // Should write updated frontmatter back to file
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should handle dry-run mode without creating page', async () => {
      const markdownPath = path.join(tempDir, 'test.md');
      const markdown = `---
title: Test Page
spaceKey: TEST
---
# Hello World`;

      mockedFs.readFile.mockResolvedValue(markdown);
      mockedMarkdownToAdf.mockReturnValue({
        version: 1,
        type: 'doc',
        content: [],
      });

      const config = {
        baseUrl: 'https://test.atlassian.net/wiki',
        email: 'test@example.com',
        apiToken: 'token',
      };

      await createPageCommand(markdownPath, config, { dryRun: true });

      expect(mockClient.createPage).not.toHaveBeenCalled();
    });

    it('should throw error if title missing in frontmatter', async () => {
      const markdownPath = path.join(tempDir, 'test.md');
      const markdown = `---
spaceKey: TEST
---
# Hello World`;

      mockedFs.readFile.mockResolvedValue(markdown);

      const config = {
        baseUrl: 'https://test.atlassian.net/wiki',
        email: 'test@example.com',
        apiToken: 'token',
      };

      await expect(createPageCommand(markdownPath, config)).rejects.toThrow(
        /title/i
      );
    });

    it('should throw error if spaceKey missing in frontmatter', async () => {
      const markdownPath = path.join(tempDir, 'test.md');
      const markdown = `---
title: Test Page
---
# Hello World`;

      mockedFs.readFile.mockResolvedValue(markdown);

      const config = {
        baseUrl: 'https://test.atlassian.net/wiki',
        email: 'test@example.com',
        apiToken: 'token',
      };

      await expect(createPageCommand(markdownPath, config)).rejects.toThrow(
        /spaceKey/i
      );
    });
  });

  describe('fetchPageCommand', () => {
    it('should fetch page by ID', async () => {
      const pageId = '12345';
      const outputPath = path.join(tempDir, 'output.md');

      mockClient.getPage.mockResolvedValue({
        id: pageId,
        title: 'Test Page',
        spaceId: 'TEST',
        status: 'current',
        version: { number: 1 },
        body: {
          atlas_doc_format: {
            representation: 'atlas_doc_format',
            value: JSON.stringify({
              version: 1,
              type: 'doc',
              content: [],
            }),
          },
        },
        _links: { webui: '/pages/12345' },
      });

      mockedAdfToMarkdown.mockReturnValue('# Test Content');

      const config = {
        baseUrl: 'https://test.atlassian.net/wiki',
        email: 'test@example.com',
        apiToken: 'token',
      };

      await fetchPageCommand(pageId, outputPath, config);

      expect(mockClient.getPage).toHaveBeenCalledWith(pageId);
    });

    it('should convert ADF to markdown', async () => {
      const pageId = '12345';
      const outputPath = path.join(tempDir, 'output.md');

      const adfDoc = {
        version: 1,
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Test' }],
          },
        ],
      };

      mockClient.getPage.mockResolvedValue({
        id: pageId,
        title: 'Test Page',
        spaceId: 'TEST',
        status: 'current',
        version: { number: 1 },
        body: {
          atlas_doc_format: {
            representation: 'atlas_doc_format',
            value: JSON.stringify(adfDoc),
          },
        },
        _links: { webui: '/pages/12345' },
      });

      mockedAdfToMarkdown.mockReturnValue('# Test');

      const config = {
        baseUrl: 'https://test.atlassian.net/wiki',
        email: 'test@example.com',
        apiToken: 'token',
      };

      await fetchPageCommand(pageId, outputPath, config);

      expect(adfToMarkdown).toHaveBeenCalledWith(adfDoc);
    });

    it('should write markdown with frontmatter to output file', async () => {
      const pageId = '12345';
      const outputPath = path.join(tempDir, 'output.md');

      mockClient.getPage.mockResolvedValue({
        id: pageId,
        title: 'Test Page',
        spaceId: 'TEST',
        status: 'current',
        version: { number: 1 },
        body: {
          atlas_doc_format: {
            representation: 'atlas_doc_format',
            value: JSON.stringify({
              version: 1,
              type: 'doc',
              content: [],
            }),
          },
        },
        _links: { webui: '/pages/12345' },
      });

      mockedAdfToMarkdown.mockReturnValue('# Test Content');

      const config = {
        baseUrl: 'https://test.atlassian.net/wiki',
        email: 'test@example.com',
        apiToken: 'token',
      };

      await fetchPageCommand(pageId, outputPath, config);

      expect(fs.writeFile).toHaveBeenCalled();
      const writtenContent = mockedFs.writeFile.mock.calls[0][1] as string;

      // Should contain YAML frontmatter
      expect(writtenContent).toContain('---');
      expect(writtenContent).toContain('title: Test Page');
      expect(writtenContent).toMatch(/pageId: ['"]?12345['"]?/); // Allow quoted or unquoted
      expect(writtenContent).toContain('# Test Content');
    });

    it('should create output directory if it does not exist', async () => {
      const pageId = '12345';
      const outputPath = path.join(tempDir, 'nested', 'dir', 'output.md');

      mockClient.getPage.mockResolvedValue({
        id: pageId,
        title: 'Test Page',
        spaceId: 'TEST',
        status: 'current',
        version: { number: 1 },
        body: {
          atlas_doc_format: {
            representation: 'atlas_doc_format',
            value: JSON.stringify({
              version: 1,
              type: 'doc',
              content: [],
            }),
          },
        },
        _links: { webui: '/pages/12345' },
      });

      mockedAdfToMarkdown.mockReturnValue('# Test');

      const config = {
        baseUrl: 'https://test.atlassian.net/wiki',
        email: 'test@example.com',
        apiToken: 'token',
      };

      await fetchPageCommand(pageId, outputPath, config);

      expect(fs.ensureDir).toHaveBeenCalledWith(path.dirname(outputPath));
    });
  });

  describe('importReportsCommand', () => {
    it('should find markdown files in reports directory', async () => {
      const reportsDir = path.join(tempDir, 'reports');

      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readdir.mockResolvedValue([
        'report1.md',
        'report2.md',
        'readme.txt',
      ] as any);
      mockedFs.readFile.mockResolvedValue(`---
title: Report 1
spaceKey: TEST
---
# Report`);
      mockedMarkdownToAdf.mockReturnValue({
        version: 1,
        type: 'doc',
        content: [],
      });
      mockClient.createPage.mockResolvedValue('12345');
      mockClient.getPageByTitle.mockResolvedValue(null);

      const config = {
        baseUrl: 'https://test.atlassian.net/wiki',
        email: 'test@example.com',
        apiToken: 'token',
      };

      await importReportsCommand(reportsDir, config);

      // Should only process .md files
      expect(fs.readFile).toHaveBeenCalledTimes(2);
    });

    it('should create new pages for reports not in Confluence', async () => {
      const reportsDir = path.join(tempDir, 'reports');

      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readdir.mockResolvedValue(['report1.md'] as any);
      mockedFs.readFile.mockResolvedValue(`---
title: New Report
spaceKey: TEST
---
# Report Content`);
      mockedMarkdownToAdf.mockReturnValue({
        version: 1,
        type: 'doc',
        content: [],
      });
      mockClient.getPageByTitle.mockResolvedValue(null); // Page doesn't exist
      mockClient.createPage.mockResolvedValue('12345');
      mockClient.getPage.mockResolvedValue({
        id: '12345',
        title: 'New Report',
        version: { number: 1 },
        _links: { webui: '/pages/12345' },
      });

      const config = {
        baseUrl: 'https://test.atlassian.net/wiki',
        email: 'test@example.com',
        apiToken: 'token',
      };

      await importReportsCommand(reportsDir, config);

      expect(mockClient.createPage).toHaveBeenCalledWith(
        'TEST',
        'New Report',
        expect.any(Object),
        undefined
      );
    });

    it('should update existing pages in Confluence', async () => {
      const reportsDir = path.join(tempDir, 'reports');

      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readdir.mockResolvedValue(['report1.md'] as any);
      mockedFs.readFile.mockResolvedValue(`---
title: Existing Report
spaceKey: TEST
---
# Updated Content`);
      mockedMarkdownToAdf.mockReturnValue({
        version: 1,
        type: 'doc',
        content: [],
      });
      mockClient.getPageByTitle.mockResolvedValue({
        id: '999',
        title: 'Existing Report',
        version: { number: 5 },
      });
      mockClient.updatePage.mockResolvedValue(undefined);
      mockClient.getPage.mockResolvedValue({
        id: '999',
        title: 'Existing Report',
        version: { number: 6 },
        _links: { webui: '/pages/999' },
      });

      const config = {
        baseUrl: 'https://test.atlassian.net/wiki',
        email: 'test@example.com',
        apiToken: 'token',
      };

      await importReportsCommand(reportsDir, config);

      expect(mockClient.updatePage).toHaveBeenCalledWith(
        '999',
        'Existing Report',
        expect.any(Object),
        6 // version + 1
      );
    });

    it('should handle batch processing with progress tracking', async () => {
      const reportsDir = path.join(tempDir, 'reports');

      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readdir.mockResolvedValue([
        'report1.md',
        'report2.md',
        'report3.md',
      ] as any);
      mockedFs.readFile.mockResolvedValue(`---
title: Report
spaceKey: TEST
---
# Content`);
      mockedMarkdownToAdf.mockReturnValue({
        version: 1,
        type: 'doc',
        content: [],
      });
      mockClient.getPageByTitle.mockResolvedValue(null);
      mockClient.createPage.mockResolvedValue('12345');
      mockClient.getPage.mockResolvedValue({
        id: '12345',
        title: 'Report',
        version: { number: 1 },
        _links: { webui: '/pages/12345' },
      });

      const config = {
        baseUrl: 'https://test.atlassian.net/wiki',
        email: 'test@example.com',
        apiToken: 'token',
      };

      const result = await importReportsCommand(reportsDir, config);

      expect(result.total).toBe(3);
      expect(result.created + result.updated).toBe(3);
    });

    it('should support dry-run mode', async () => {
      const reportsDir = path.join(tempDir, 'reports');

      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readdir.mockResolvedValue(['report1.md'] as any);
      mockedFs.readFile.mockResolvedValue(`---
title: Report
spaceKey: TEST
---
# Content`);
      mockedMarkdownToAdf.mockReturnValue({
        version: 1,
        type: 'doc',
        content: [],
      });
      mockClient.getPageByTitle.mockResolvedValue(null);

      const config = {
        baseUrl: 'https://test.atlassian.net/wiki',
        email: 'test@example.com',
        apiToken: 'token',
      };

      await importReportsCommand(reportsDir, config, { dryRun: true });

      expect(mockClient.createPage).not.toHaveBeenCalled();
      expect(mockClient.updatePage).not.toHaveBeenCalled();
    });

    it('should skip files without required frontmatter', async () => {
      const reportsDir = path.join(tempDir, 'reports');

      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readdir.mockResolvedValue(['bad-report.md'] as any);
      mockedFs.readFile.mockResolvedValue(`# No frontmatter here`);

      const config = {
        baseUrl: 'https://test.atlassian.net/wiki',
        email: 'test@example.com',
        apiToken: 'token',
      };

      const result = await importReportsCommand(reportsDir, config);

      expect(result.skipped).toBe(1);
      expect(mockClient.createPage).not.toHaveBeenCalled();
    });
  });
});
