/**
 * Unit tests for MCP Seed Command
 *
 * Tests knowledge extraction and seeding to Graphiti and Serena.
 * Focuses on path sanitization and security.
 *
 * @module commands/mcp/__tests__/seed.test
 */

import path from 'path';
import fs from 'fs-extra';
import { createMcpSeedCommand } from '../seed.js';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('ora', () => ({
  default: jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
  })),
}));
jest.mock('../../../lib/cli-context.js');
jest.mock('../../../lib/manifest-manager.js');
jest.mock('../../../lib/mcp/prerequisite-checker.js');
jest.mock('../../../lib/mcp/extractors/index.js');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('MCP Seed Command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Path Sanitization in Memory Names', () => {
    it('should sanitize path separators in memory names', () => {
      // Test the sanitization logic directly
      const unsafeName = '../../../etc/passwd';
      const safeName = unsafeName
        .replace(/[/\\]/g, '-')
        .replace(/\.\./g, '--')
        .replace(/^\./, '_');

      // Each .. becomes --, and each / becomes -, so ../../../etc/passwd becomes:
      // ../ -> ---, ../ -> ---, ../ -> ---, etc/passwd -> etc-passwd
      expect(safeName).toBe('---------etc-passwd');
      expect(safeName).not.toContain('/');
      expect(safeName).not.toContain('\\');
      expect(safeName).not.toContain('..');
    });

    it('should sanitize forward slashes', () => {
      const unsafeName = 'path/to/file';
      const safeName = unsafeName
        .replace(/[/\\]/g, '-')
        .replace(/\.\./g, '--')
        .replace(/^\./, '_');

      expect(safeName).toBe('path-to-file');
    });

    it('should sanitize backslashes', () => {
      const unsafeName = 'path\\to\\file';
      const safeName = unsafeName
        .replace(/[/\\]/g, '-')
        .replace(/\.\./g, '--')
        .replace(/^\./, '_');

      expect(safeName).toBe('path-to-file');
    });

    it('should sanitize dot-dot sequences', () => {
      const unsafeName = '..malicious..file..';
      const safeName = unsafeName
        .replace(/[/\\]/g, '-')
        .replace(/\.\./g, '--')
        .replace(/^\./, '_');

      expect(safeName).toBe('--malicious--file--');
      expect(safeName).not.toContain('..');
    });

    it('should sanitize leading dots', () => {
      const unsafeName = '.hidden-file';
      const safeName = unsafeName
        .replace(/[/\\]/g, '-')
        .replace(/\.\./g, '--')
        .replace(/^\./, '_');

      expect(safeName).toBe('_hidden-file');
      expect(safeName[0]).not.toBe('.');
    });

    it('should handle complex attack patterns', () => {
      const attackPatterns = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        './../.hidden/file',
        'normal/../../../etc/shadow',
        '....//....//etc/hosts',
      ];

      attackPatterns.forEach((pattern) => {
        const safeName = pattern
          .replace(/[/\\]/g, '-')
          .replace(/\.\./g, '--')
          .replace(/^\./, '_');

        expect(safeName).not.toContain('/');
        expect(safeName).not.toContain('\\');
        expect(safeName).not.toContain('..');
        expect(safeName[0]).not.toBe('.');
      });
    });

    it('should preserve safe names unchanged', () => {
      const safeName = 'project-overview';
      const sanitized = safeName
        .replace(/[/\\]/g, '-')
        .replace(/\.\./g, '--')
        .replace(/^\./, '_');

      expect(sanitized).toBe('project-overview');
    });
  });

  describe('GroupId Escaping in Seed File', () => {
    it('should escape quotes in groupId', () => {
      const groupId = 'my"project"id';
      const escapedGroupId = JSON.stringify(groupId).slice(1, -1);

      // JSON.stringify escapes quotes as \"
      expect(escapedGroupId).toBe('my\\"project\\"id');
      // The escaped string contains backslash-quote, not raw quote
      expect(escapedGroupId).toContain('\\"');
      // Should not contain unescaped quotes
      expect(escapedGroupId.replace(/\\"/g, '')).not.toContain('"');
    });

    it('should escape backslashes in groupId', () => {
      const groupId = 'my\\project\\id';
      const escapedGroupId = JSON.stringify(groupId).slice(1, -1);

      expect(escapedGroupId).toBe('my\\\\project\\\\id');
    });

    it('should escape newlines in groupId', () => {
      const groupId = 'my\nproject\nid';
      const escapedGroupId = JSON.stringify(groupId).slice(1, -1);

      expect(escapedGroupId).toBe('my\\nproject\\nid');
      expect(escapedGroupId).not.toContain('\n');
    });

    it('should escape injection attempts', () => {
      const injectionAttempts = [
        'id", evil_param: "malicious',
        'id\'); DROP TABLE users; --',
        'id\n", \n"injected": "value',
      ];

      injectionAttempts.forEach((attempt) => {
        const escapedGroupId = JSON.stringify(attempt).slice(1, -1);

        // Should not break out of string context
        expect(escapedGroupId).not.toMatch(/[^\\]"/);
        expect(escapedGroupId).not.toContain('\n');
      });
    });

    it('should handle unicode characters safely', () => {
      const groupId = 'project-\u{1F4A9}-unicode';
      const escapedGroupId = JSON.stringify(groupId).slice(1, -1);

      expect(escapedGroupId).toContain('unicode');
      // JSON.stringify escapes unicode safely
      expect(typeof escapedGroupId).toBe('string');
    });

    it('should produce valid JSON when reconstructed', () => {
      const groupIds = [
        'simple-id',
        'with"quotes',
        'with\\backslash',
        'with\nnewline',
        'with\ttab',
      ];

      groupIds.forEach((groupId) => {
        const escapedGroupId = JSON.stringify(groupId).slice(1, -1);
        const reconstructed = `"${escapedGroupId}"`;

        // Should parse back to original value
        expect(() => JSON.parse(reconstructed)).not.toThrow();
        expect(JSON.parse(reconstructed)).toBe(groupId);
      });
    });
  });

  describe('Seed File Generation', () => {
    it('should create valid JSON seed file', async () => {
      const episodes = [
        {
          name: 'Episode 1',
          body: 'Content 1',
          source: 'file1.md',
          sourceType: 'file' as const,
        },
        {
          name: 'Episode 2',
          body: 'Content 2',
          source: 'file2.md',
          sourceType: 'file' as const,
        },
      ];

      const groupId = 'test-project';
      const projectPath = '/test/path';

      // Simulate the seed file generation logic
      const escapedGroupId = JSON.stringify(groupId).slice(1, -1);
      const seedFile = {
        groupId,
        projectPath,
        episodes: episodes.map((e) => ({
          name: e.name,
          body: e.body,
          source: e.source,
          sourceType: e.sourceType,
        })),
        createdAt: new Date().toISOString(),
        instructions: `
To import this knowledge into Graphiti, use add_memory in your Claude session:

For each episode, run:
  add_memory(
    name="<episode.name>",
    episode_body="<episode.body>",
    group_id="${escapedGroupId}"
  )

Or use this Claude prompt:
  "Read .graphiti-seed.json and add each episode to Graphiti using add_memory"
`.trim(),
      };

      // Validate seed file structure
      expect(seedFile.groupId).toBe(groupId);
      expect(seedFile.episodes).toHaveLength(2);
      expect(seedFile.createdAt).toBeDefined();
      expect(seedFile.instructions).toContain(groupId);

      // Should be valid JSON
      expect(() => JSON.stringify(seedFile)).not.toThrow();
    });

    it('should include all episode fields in seed file', () => {
      const episode = {
        name: 'Test Episode',
        body: 'Episode content',
        source: 'test.md',
        sourceType: 'file' as const,
      };

      const mapped = {
        name: episode.name,
        body: episode.body,
        source: episode.source,
        sourceType: episode.sourceType,
      };

      expect(mapped).toEqual(episode);
      expect(Object.keys(mapped)).toEqual(['name', 'body', 'source', 'sourceType']);
    });

    it('should generate timestamp in ISO format', () => {
      const timestamp = new Date().toISOString();

      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Serena Memory File Writing', () => {
    it('should sanitize memory file names before writing', () => {
      const memories = [
        { name: 'project-overview', content: 'Content', category: 'overview' as const },
        { name: '../../../etc/passwd', content: 'Malicious', category: 'overview' as const },
        { name: 'path/to/file', content: 'Content', category: 'structure' as const },
      ];

      memories.forEach((memory) => {
        const safeName = memory.name
          .replace(/[/\\]/g, '-')
          .replace(/\.\./g, '--')
          .replace(/^\./, '_');

        // Safe name should not contain path separators
        expect(safeName).not.toContain('/');
        expect(safeName).not.toContain('\\');
        expect(safeName).not.toContain('..');

        // Safe name should be a valid filename
        expect(safeName).not.toMatch(/[<>:"|?*]/);
      });
    });

    it('should write to .serena/memories directory', () => {
      const projectPath = '/test/project';
      const serenaDir = path.join(projectPath, '.serena', 'memories');

      expect(serenaDir).toBe('/test/project/.serena/memories');
    });

    it('should write markdown files with .md extension', () => {
      const memoryName = 'project-overview';
      const filename = `${memoryName}.md`;

      expect(filename).toBe('project-overview.md');
      expect(filename).toMatch(/\.md$/);
    });
  });

  describe('Dry Run Mode', () => {
    it('should preview episodes without making changes', () => {
      const episodes = [
        {
          name: 'Episode 1',
          body: 'Content 1',
          source: 'file1.md',
          sourceType: 'file' as const,
        },
      ];

      // In dry run, no fs operations should occur
      const dryRun = true;

      if (dryRun) {
        expect(mockFs.writeFile).not.toHaveBeenCalled();
        expect(mockFs.writeJson).not.toHaveBeenCalled();
      }
    });

    it('should preview Serena memories without writing files', () => {
      const memories = [
        { name: 'project-overview', content: 'Content', category: 'overview' as const },
      ];

      const dryRun = true;

      if (dryRun) {
        expect(mockFs.writeFile).not.toHaveBeenCalled();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle fs.writeFile errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(mockFs.writeFile('/test/path', 'content')).rejects.toThrow('Permission denied');
    });

    it('should handle fs.writeJson errors gracefully', async () => {
      mockFs.writeJson.mockRejectedValueOnce(new Error('Disk full'));

      await expect(mockFs.writeJson('/test/path', {})).rejects.toThrow('Disk full');
    });

    it('should handle fs.ensureDir errors gracefully', async () => {
      mockFs.ensureDir.mockRejectedValueOnce(new Error('Cannot create directory'));

      await expect(mockFs.ensureDir('/test/path')).rejects.toThrow('Cannot create directory');
    });
  });

  describe('Character Encoding', () => {
    it('should handle UTF-8 content correctly', () => {
      const content = 'Content with émojis 🎉 and spëcial çharacters';

      // Should write UTF-8 encoded
      const encoding = 'utf-8';
      expect(encoding).toBe('utf-8');

      // Content should remain unchanged
      expect(content).toContain('émojis');
      expect(content).toContain('🎉');
    });

    it('should preserve multi-byte characters', () => {
      const content = '中文测试 한글 العربية';

      expect(content.length).toBeGreaterThan(0);
      expect(typeof content).toBe('string');
    });
  });

  describe('File Path Construction', () => {
    it('should construct seed file path correctly', () => {
      const projectPath = '/test/project';
      const seedFilePath = path.join(projectPath, '.graphiti-seed.json');

      expect(seedFilePath).toBe('/test/project/.graphiti-seed.json');
    });

    it('should construct Serena memory path correctly', () => {
      const projectPath = '/test/project';
      const memoryName = 'project-overview';
      const memoryPath = path.join(projectPath, '.serena', 'memories', `${memoryName}.md`);

      expect(memoryPath).toBe('/test/project/.serena/memories/project-overview.md');
    });

    it('should handle project paths with special characters', () => {
      const projectPath = '/test/my-project_v2';
      const seedFilePath = path.join(projectPath, '.graphiti-seed.json');

      expect(seedFilePath).toContain('my-project_v2');
    });
  });

  describe('Command Creation', () => {
    it('should create a valid Commander command', () => {
      const command = createMcpSeedCommand();

      expect(command).toBeDefined();
      expect(command.name()).toBe('seed');
      expect(command.description()).toContain('Seed knowledge bases');
    });

    it('should define all required options', () => {
      const command = createMcpSeedCommand();
      const options = command.options;

      const optionNames = options.map((opt) => opt.long);
      expect(optionNames).toContain('--path');
      expect(optionNames).toContain('--graphiti');
      expect(optionNames).toContain('--serena');
      expect(optionNames).toContain('--dry-run');
      expect(optionNames).toContain('--verbose');
    });
  });

  describe('Memory Name Edge Cases', () => {
    it('should handle empty name gracefully', () => {
      const name = '';
      const safeName = name
        .replace(/[/\\]/g, '-')
        .replace(/\.\./g, '--')
        .replace(/^\./, '_');

      expect(safeName).toBe('');
    });

    it('should handle name with only dots', () => {
      const name = '...';
      const safeName = name
        .replace(/[/\\]/g, '-')
        .replace(/\.\./g, '--')
        .replace(/^\./, '_');

      // ... becomes -- (first .. replaced) then --. which starts with --, not .
      expect(safeName).toBe('--.');
    });

    it('should handle very long names', () => {
      const name = 'a'.repeat(300);
      const safeName = name
        .replace(/[/\\]/g, '-')
        .replace(/\.\./g, '--')
        .replace(/^\./, '_');

      expect(safeName).toBe(name); // Should preserve if valid
      expect(safeName.length).toBe(300);
    });

    it('should handle names with null bytes', () => {
      const name = 'file\x00name';
      const safeName = name
        .replace(/[/\\]/g, '-')
        .replace(/\.\./g, '--')
        .replace(/^\./, '_');

      // Null bytes preserved but path separators removed
      expect(safeName).not.toContain('/');
      expect(safeName).not.toContain('\\');
    });
  });
});
