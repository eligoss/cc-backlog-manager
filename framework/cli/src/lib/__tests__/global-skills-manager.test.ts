/**
 * Unit Tests for Global Skills Manager
 *
 * Tests global skills deployment, removal, and tracking.
 */

import fs from 'fs-extra';
import os from 'os';
import { GlobalSkillsManager } from '../global-skills-manager.js';

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock os
jest.mock('os');
const mockedOs = os as jest.Mocked<typeof os>;

describe('GlobalSkillsManager', () => {
  let manager: GlobalSkillsManager;

  beforeEach(() => {
    jest.resetAllMocks();
    mockedOs.homedir.mockReturnValue('/home/user');
    manager = new GlobalSkillsManager();
  });

  describe('getGlobalSkillsPath', () => {
    it('should return path to global skills directory', () => {
      const result = GlobalSkillsManager.getGlobalSkillsPath();
      expect(result).toBe('/home/user/.claude/skills');
    });
  });

  describe('ensureGlobalSkillsDir', () => {
    it('should create global skills directory', async () => {
      mockedFs.ensureDir.mockResolvedValue(undefined);

      await manager.ensureGlobalSkillsDir();

      expect(mockedFs.ensureDir).toHaveBeenCalledWith('/home/user/.claude/skills');
    });

    it('should throw error when directory creation fails', async () => {
      mockedFs.ensureDir.mockRejectedValue(new Error('Permission denied'));

      await expect(manager.ensureGlobalSkillsDir()).rejects.toThrow(
        'Failed to create global skills directory'
      );
    });
  });

  describe('readManifest', () => {
    it('should create empty manifest when file does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeJson.mockResolvedValue(undefined);

      const result = await manager.readManifest();

      expect(result.version).toBe('1.0.0');
      expect(result.skills).toEqual({});
      expect(mockedFs.writeJson).toHaveBeenCalled();
    });

    it('should read existing manifest', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue({
        version: '1.0.0',
        skills: {
          'test-skill': {
            id: 'test-skill',
            name: 'Test Skill',
            description: 'A test skill',
            scope: 'shared',
            deployedAt: '2025-01-01T00:00:00.000Z',
            deployedFrom: '/path/to/source',
            sourceModule: 'core',
          },
        },
        updatedAt: '2025-01-01T00:00:00.000Z',
      });

      const result = await manager.readManifest();

      expect(result.skills['test-skill']).toBeDefined();
      expect(result.skills['test-skill'].name).toBe('Test Skill');
    });

    it('should throw error when manifest parsing fails', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockRejectedValue(new Error('Invalid JSON'));

      await expect(manager.readManifest()).rejects.toThrow(
        'Failed to parse global skills manifest'
      );
    });
  });

  describe('writeManifest', () => {
    it('should write manifest to disk', async () => {
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeJson.mockResolvedValue(undefined);

      const manifest = {
        version: '1.0.0',
        skills: {},
        updatedAt: '2025-01-01T00:00:00.000Z',
      };

      await manager.writeManifest(manifest);

      expect(mockedFs.writeJson).toHaveBeenCalledWith(
        '/home/user/.claude/skills/.global-skills-manifest.json',
        manifest,
        { spaces: 2 }
      );
    });

    it('should throw error when write fails', async () => {
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeJson.mockRejectedValue(new Error('Disk full'));

      await expect(
        manager.writeManifest({ version: '1.0.0', skills: {}, updatedAt: '' })
      ).rejects.toThrow('Failed to write global skills manifest');
    });
  });

  describe('deploySkill', () => {
    it('should deploy skill from source to global location', async () => {
      mockedFs.pathExists
        .mockResolvedValueOnce(true) // source exists
        .mockResolvedValueOnce(false); // manifest doesn't exist yet
      mockedFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.copy.mockResolvedValue(undefined);
      mockedFs.writeJson.mockResolvedValue(undefined);

      await manager.deploySkill('/path/to/source', 'my-skill', {
        name: 'My Skill',
        description: 'A test skill',
        sourceModule: 'core',
      });

      expect(mockedFs.copy).toHaveBeenCalledWith(
        '/path/to/source',
        '/home/user/.claude/skills/my-skill',
        expect.objectContaining({ overwrite: true })
      );
    });

    it('should throw error when source path does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      await expect(
        manager.deploySkill('/nonexistent', 'my-skill', {})
      ).rejects.toThrow('Source skill directory not found');
    });

    it('should throw error when source is not a directory', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.stat.mockResolvedValue({ isDirectory: () => false } as any);

      await expect(
        manager.deploySkill('/path/to/file.txt', 'my-skill', {})
      ).rejects.toThrow('Source path is not a directory');
    });

    it('should throw error when copy fails', async () => {
      mockedFs.pathExists
        .mockResolvedValueOnce(true) // source exists
        .mockResolvedValueOnce(false); // manifest doesn't exist
      mockedFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.copy.mockRejectedValue(new Error('Copy failed'));
      mockedFs.writeJson.mockResolvedValue(undefined);

      await expect(
        manager.deploySkill('/path/to/source', 'my-skill', {})
      ).rejects.toThrow('Failed to deploy skill');
    });

    it('should filter out .DS_Store files during copy', async () => {
      mockedFs.pathExists
        .mockResolvedValueOnce(true) // source exists
        .mockResolvedValueOnce(false); // manifest doesn't exist
      mockedFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeJson.mockResolvedValue(undefined);

      let filterFn: ((src: string) => boolean) | undefined;
      mockedFs.copy.mockImplementation(async (src, dest, options) => {
        filterFn = options?.filter as ((src: string) => boolean) | undefined;
      });

      await manager.deploySkill('/path/to/source', 'my-skill', {});

      // Test the filter function
      expect(filterFn).toBeDefined();
      expect(filterFn!('/path/to/file.txt')).toBe(true);
      expect(filterFn!('/path/to/.DS_Store')).toBe(false);
    });
  });

  describe('removeSkill', () => {
    it('should remove skill from global location', async () => {
      mockedFs.pathExists
        .mockResolvedValueOnce(true) // skill exists
        .mockResolvedValueOnce(true); // manifest exists
      mockedFs.remove.mockResolvedValue(undefined);
      mockedFs.readJson.mockResolvedValue({
        version: '1.0.0',
        skills: {
          'my-skill': { id: 'my-skill', name: 'My Skill' },
        },
        updatedAt: '',
      });
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeJson.mockResolvedValue(undefined);

      await manager.removeSkill('my-skill');

      expect(mockedFs.remove).toHaveBeenCalledWith(
        '/home/user/.claude/skills/my-skill'
      );
    });

    it('should throw error when skill does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      await expect(manager.removeSkill('nonexistent')).rejects.toThrow(
        'Global skill not found'
      );
    });

    it('should throw error when removal fails', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.remove.mockRejectedValue(new Error('Permission denied'));

      await expect(manager.removeSkill('my-skill')).rejects.toThrow(
        'Failed to remove global skill'
      );
    });
  });

  describe('listSkills', () => {
    it('should return all deployed skills', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue({
        version: '1.0.0',
        skills: {
          'skill-1': {
            id: 'skill-1',
            name: 'Skill 1',
            description: 'First skill',
            scope: 'shared',
            deployedAt: '2025-01-01T00:00:00.000Z',
            deployedFrom: '/path/1',
            sourceModule: 'core',
          },
          'skill-2': {
            id: 'skill-2',
            name: 'Skill 2',
            description: 'Second skill',
            scope: 'shared',
            deployedAt: '2025-01-01T00:00:00.000Z',
            deployedFrom: '/path/2',
            sourceModule: 'coding',
          },
        },
        updatedAt: '',
      });

      const result = await manager.listSkills();

      expect(result).toHaveLength(2);
      expect(result.map((s) => s.id)).toContain('skill-1');
      expect(result.map((s) => s.id)).toContain('skill-2');
    });

    it('should return empty array when no skills deployed', async () => {
      mockedFs.pathExists.mockResolvedValue(false);
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeJson.mockResolvedValue(undefined);

      const result = await manager.listSkills();

      expect(result).toEqual([]);
    });
  });

  describe('skillExists', () => {
    it('should return true when skill exists', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue({
        version: '1.0.0',
        skills: {
          'my-skill': { id: 'my-skill', name: 'My Skill' },
        },
        updatedAt: '',
      });

      const result = await manager.skillExists('my-skill');

      expect(result).toBe(true);
    });

    it('should return false when skill does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue({
        version: '1.0.0',
        skills: {},
        updatedAt: '',
      });

      const result = await manager.skillExists('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getSkillInfo', () => {
    it('should return skill info when skill exists', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue({
        version: '1.0.0',
        skills: {
          'my-skill': {
            id: 'my-skill',
            name: 'My Skill',
            description: 'A test skill',
            scope: 'shared',
            deployedAt: '2025-01-01T00:00:00.000Z',
            deployedFrom: '/path/to/source',
            sourceModule: 'core',
          },
        },
        updatedAt: '',
      });

      const result = await manager.getSkillInfo('my-skill');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('my-skill');
      expect(result!.name).toBe('My Skill');
    });

    it('should return null when skill does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue({
        version: '1.0.0',
        skills: {},
        updatedAt: '',
      });

      const result = await manager.getSkillInfo('nonexistent');

      expect(result).toBeNull();
    });
  });
});
