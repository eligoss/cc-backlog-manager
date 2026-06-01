/**
 * Unit Tests for Jira Lookup
 *
 * Tests sprint and milestone lookup by name and Jira ID.
 */

import fs from 'fs-extra';
import {
  parseSprintFileYaml,
  parseMilestoneFileYaml,
  findSprintByName,
  findSprintByJiraId,
  findMilestoneByName,
  findMilestoneById,
  listAllSprints,
  listAllMilestones,
} from '../jira-lookup.js';
import { parseFrontmatter } from '../../common/yaml-frontmatter.js';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('../../common/yaml-frontmatter.js');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedParseFrontmatter = parseFrontmatter as jest.MockedFunction<
  typeof parseFrontmatter
>;

describe('jira-lookup', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('parseSprintFileYaml', () => {
    it('should parse valid sprint file', async () => {
      mockedFs.readFile.mockResolvedValue(`---
sprintName: APM-APP-2026-W1
jiraSprintId: "16786"
milestone: Jan2026
committed: 30
ticketCount: 5
---
# Content` as any);

      mockedParseFrontmatter.mockReturnValue({
        data: {
          sprintName: 'APM-APP-2026-W1',
          jiraSprintId: '16786',
          milestone: 'Jan2026',
          committed: 30,
          ticketCount: 5,
        },
        content: '# Content',
        matter: '',
      });

      const result = await parseSprintFileYaml('/backlog/sprints/2026-W1.md');

      expect(result).not.toBeNull();
      expect(result!.sprintId).toBe('2026-W1');
      expect(result!.sprintName).toBe('APM-APP-2026-W1');
      expect(result!.jiraSprintId).toBe('16786');
      expect(result!.milestone).toBe('Jan2026');
      expect(result!.committed).toBe(30);
      expect(result!.ticketCount).toBe(5);
    });

    it('should return null for file without frontmatter', async () => {
      mockedFs.readFile.mockResolvedValue('No frontmatter content' as any);

      const result = await parseSprintFileYaml('/backlog/sprints/test.md');

      expect(result).toBeNull();
    });

    it('should return null for file without closing frontmatter delimiter', async () => {
      mockedFs.readFile.mockResolvedValue('---\nsprintName: Test\nNo closing delimiter' as any);

      const result = await parseSprintFileYaml('/backlog/sprints/test.md');

      expect(result).toBeNull();
    });

    it('should handle missing optional fields', async () => {
      mockedFs.readFile.mockResolvedValue(`---
committed: 10
---
# Content` as any);

      mockedParseFrontmatter.mockReturnValue({
        data: { committed: 10 },
        content: '# Content',
        matter: '',
      });

      const result = await parseSprintFileYaml('/backlog/sprints/2026-W1.md');

      expect(result).not.toBeNull();
      expect(result!.sprintName).toBeUndefined();
      expect(result!.jiraSprintId).toBeUndefined();
      expect(result!.milestone).toBeUndefined();
    });

    it('should default committed and ticketCount to 0', async () => {
      mockedFs.readFile.mockResolvedValue(`---
sprintName: Test
---
# Content` as any);

      mockedParseFrontmatter.mockReturnValue({
        data: { sprintName: 'Test' },
        content: '# Content',
        matter: '',
      });

      const result = await parseSprintFileYaml('/backlog/sprints/test.md');

      expect(result!.committed).toBe(0);
      expect(result!.ticketCount).toBe(0);
    });

    it('should handle file read errors gracefully', async () => {
      mockedFs.readFile.mockRejectedValue(new Error('File not found'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await parseSprintFileYaml('/nonexistent.md');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('parseMilestoneFileYaml', () => {
    it('should parse valid milestone file', async () => {
      mockedFs.readFile.mockResolvedValue(`---
milestoneName: January 2026 (W51, W1, W3)
jiraMilestoneId: "12345"
committed: 50
ticketCount: 10
---
# Content` as any);

      mockedParseFrontmatter.mockReturnValue({
        data: {
          milestoneName: 'January 2026 (W51, W1, W3)',
          jiraMilestoneId: '12345',
          committed: 50,
          ticketCount: 10,
        },
        content: '# Content',
        matter: '',
      });

      const result = await parseMilestoneFileYaml('/backlog/milestones/Jan2026.md');

      expect(result).not.toBeNull();
      expect(result!.milestoneId).toBe('Jan2026');
      expect(result!.milestoneName).toBe('January 2026 (W51, W1, W3)');
      expect(result!.jiraMilestoneId).toBe('12345');
      expect(result!.committed).toBe(50);
      expect(result!.ticketCount).toBe(10);
    });

    it('should return null for file without frontmatter', async () => {
      mockedFs.readFile.mockResolvedValue('No frontmatter content' as any);

      const result = await parseMilestoneFileYaml('/backlog/milestones/test.md');

      expect(result).toBeNull();
    });

    it('should return null for file without closing frontmatter delimiter', async () => {
      mockedFs.readFile.mockResolvedValue('---\nmilestoneName: Test\nNo closing' as any);

      const result = await parseMilestoneFileYaml('/backlog/milestones/test.md');

      expect(result).toBeNull();
    });

    it('should handle file read errors gracefully', async () => {
      mockedFs.readFile.mockRejectedValue(new Error('File not found'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await parseMilestoneFileYaml('/nonexistent.md');

      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe('findSprintByName', () => {
    it('should find sprint by name', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readdir.mockResolvedValue(['2026-W1.md', '2026-W2.md'] as any);
      mockedFs.readFile.mockImplementation(async (filePath: any) => {
        if (filePath.includes('2026-W1')) {
          return '---\nsprintName: APM-APP-2026-W1\ncommitted: 30\n---\n# Content';
        }
        return '---\nsprintName: APM-APP-2026-W2\ncommitted: 20\n---\n# Content';
      });
      mockedParseFrontmatter.mockImplementation((content: string) => {
        if (content.includes('2026-W1')) {
          return { data: { sprintName: 'APM-APP-2026-W1', committed: 30 }, content: '', matter: '' };
        }
        return { data: { sprintName: 'APM-APP-2026-W2', committed: 20 }, content: '', matter: '' };
      });

      const result = await findSprintByName('APM-APP-2026-W1', '/backlog');

      expect(result).not.toBeNull();
      expect(result!.sprintName).toBe('APM-APP-2026-W1');
    });

    it('should return null when sprints directory does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      const result = await findSprintByName('Test', '/backlog');

      expect(result).toBeNull();
    });

    it('should return null when sprint name not found', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readdir.mockResolvedValue(['2026-W1.md'] as any);
      mockedFs.readFile.mockResolvedValue('---\nsprintName: Other\n---\n# Content' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: { sprintName: 'Other' },
        content: '',
        matter: '',
      });

      const result = await findSprintByName('Nonexistent', '/backlog');

      expect(result).toBeNull();
    });
  });

  describe('findSprintByJiraId', () => {
    it('should find sprint by Jira ID', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readdir.mockResolvedValue(['2026-W1.md'] as any);
      mockedFs.readFile.mockResolvedValue('---\njiraSprintId: "16786"\n---\n# Content' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: { jiraSprintId: '16786' },
        content: '',
        matter: '',
      });

      const result = await findSprintByJiraId('16786', '/backlog');

      expect(result).not.toBeNull();
      expect(result!.jiraSprintId).toBe('16786');
    });

    it('should return null when sprints directory does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      const result = await findSprintByJiraId('16786', '/backlog');

      expect(result).toBeNull();
    });

    it('should return null when Jira ID not found', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readdir.mockResolvedValue(['2026-W1.md'] as any);
      mockedFs.readFile.mockResolvedValue('---\njiraSprintId: "99999"\n---\n# Content' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: { jiraSprintId: '99999' },
        content: '',
        matter: '',
      });

      const result = await findSprintByJiraId('16786', '/backlog');

      expect(result).toBeNull();
    });
  });

  describe('findMilestoneByName', () => {
    it('should find milestone by name', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readdir.mockResolvedValue(['Jan2026.md'] as any);
      mockedFs.readFile.mockResolvedValue('---\nmilestoneName: January 2026\n---\n# Content' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: { milestoneName: 'January 2026' },
        content: '',
        matter: '',
      });

      const result = await findMilestoneByName('January 2026', '/backlog');

      expect(result).not.toBeNull();
      expect(result!.milestoneName).toBe('January 2026');
    });

    it('should return null when milestones directory does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      const result = await findMilestoneByName('Test', '/backlog');

      expect(result).toBeNull();
    });

    it('should return null when milestone name not found', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readdir.mockResolvedValue(['Jan2026.md'] as any);
      mockedFs.readFile.mockResolvedValue('---\nmilestoneName: Other\n---\n# Content' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: { milestoneName: 'Other' },
        content: '',
        matter: '',
      });

      const result = await findMilestoneByName('Nonexistent', '/backlog');

      expect(result).toBeNull();
    });
  });

  describe('findMilestoneById', () => {
    it('should find milestone by ID', async () => {
      mockedFs.pathExists
        .mockResolvedValueOnce(true) // milestones dir
        .mockResolvedValueOnce(true); // milestone file
      mockedFs.readFile.mockResolvedValue('---\nmilestoneName: January 2026\n---\n# Content' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: { milestoneName: 'January 2026' },
        content: '',
        matter: '',
      });

      const result = await findMilestoneById('Jan2026', '/backlog');

      expect(result).not.toBeNull();
      expect(result!.milestoneId).toBe('Jan2026');
    });

    it('should return null when milestones directory does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      const result = await findMilestoneById('Jan2026', '/backlog');

      expect(result).toBeNull();
    });

    it('should return null when milestone file does not exist', async () => {
      mockedFs.pathExists
        .mockResolvedValueOnce(true) // milestones dir
        .mockResolvedValueOnce(false); // milestone file

      const result = await findMilestoneById('Nonexistent', '/backlog');

      expect(result).toBeNull();
    });
  });

  describe('listAllSprints', () => {
    it('should list all sprints sorted by ID', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readdir.mockResolvedValue(['2026-W2.md', '2026-W1.md', '2026-W3.md'] as any);
      mockedFs.readFile.mockImplementation(async (filePath: any) => {
        return '---\nsprintName: Test\n---\n# Content';
      });
      mockedParseFrontmatter.mockReturnValue({
        data: { sprintName: 'Test' },
        content: '',
        matter: '',
      });

      const result = await listAllSprints('/backlog');

      expect(result).toHaveLength(3);
      expect(result[0].sprintId).toBe('2026-W1');
      expect(result[1].sprintId).toBe('2026-W2');
      expect(result[2].sprintId).toBe('2026-W3');
    });

    it('should return empty array when sprints directory does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      const result = await listAllSprints('/backlog');

      expect(result).toEqual([]);
    });

    it('should skip non-markdown files', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readdir.mockResolvedValue(['2026-W1.md', 'README.txt', '.gitkeep'] as any);
      mockedFs.readFile.mockResolvedValue('---\nsprintName: Test\n---\n# Content' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: { sprintName: 'Test' },
        content: '',
        matter: '',
      });

      const result = await listAllSprints('/backlog');

      expect(result).toHaveLength(1);
    });

    it('should skip files with parsing errors', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readdir.mockResolvedValue(['2026-W1.md', '2026-W2.md'] as any);
      mockedFs.readFile.mockImplementation(async (filePath: any) => {
        if (filePath.includes('2026-W1')) {
          return '---\nsprintName: Valid\n---\n# Content';
        }
        return 'No frontmatter'; // Invalid
      });
      mockedParseFrontmatter.mockReturnValue({
        data: { sprintName: 'Valid' },
        content: '',
        matter: '',
      });

      const result = await listAllSprints('/backlog');

      expect(result).toHaveLength(1);
    });
  });

  describe('listAllMilestones', () => {
    it('should list all milestones sorted by ID', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readdir.mockResolvedValue(['Feb2026.md', 'Jan2026.md', 'Mar2026.md'] as any);
      mockedFs.readFile.mockImplementation(async () => {
        return '---\nmilestoneName: Test\n---\n# Content';
      });
      mockedParseFrontmatter.mockReturnValue({
        data: { milestoneName: 'Test' },
        content: '',
        matter: '',
      });

      const result = await listAllMilestones('/backlog');

      expect(result).toHaveLength(3);
      expect(result[0].milestoneId).toBe('Feb2026');
      expect(result[1].milestoneId).toBe('Jan2026');
      expect(result[2].milestoneId).toBe('Mar2026');
    });

    it('should return empty array when milestones directory does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      const result = await listAllMilestones('/backlog');

      expect(result).toEqual([]);
    });

    it('should skip non-markdown files', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readdir.mockResolvedValue(['Jan2026.md', 'README.txt'] as any);
      mockedFs.readFile.mockResolvedValue('---\nmilestoneName: Test\n---\n# Content' as any);
      mockedParseFrontmatter.mockReturnValue({
        data: { milestoneName: 'Test' },
        content: '',
        matter: '',
      });

      const result = await listAllMilestones('/backlog');

      expect(result).toHaveLength(1);
    });
  });
});
