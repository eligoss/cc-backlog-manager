/**
 * Unit Tests for Manifest Manager
 *
 * Tests project manifest reading, writing, and modification.
 */

import fs from 'fs-extra';
import { ManifestManager, FrameworkManifest } from '../manifest-manager.js';

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('ManifestManager', () => {
  const projectPath = '/test/project';
  let manager: ManifestManager;

  beforeEach(() => {
    jest.resetAllMocks();
    manager = new ManifestManager(projectPath);
  });

  describe('getManifestPath', () => {
    it('should return path to manifest file', () => {
      const result = manager.getManifestPath();
      expect(result).toBe('/test/project/.agentic-framework.json');
    });
  });

  describe('exists', () => {
    it('should return true when manifest exists', async () => {
      mockedFs.pathExists.mockResolvedValue(true);

      const result = await manager.exists();

      expect(result).toBe(true);
    });

    it('should return false when manifest does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      const result = await manager.exists();

      expect(result).toBe(false);
    });
  });

  describe('read', () => {
    it('should read and return manifest', async () => {
      const mockManifest: FrameworkManifest = {
        version: '1.0.0',
        framework: {
          version: '1.0.0',
          installedAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        modules: {},
        projectSkills: [],
        settings: {
          autoSyncSkills: true,
          linkTransformation: true,
        },
      };
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(mockManifest);

      const result = await manager.read();

      expect(result).toEqual(mockManifest);
    });

    it('should throw error when manifest does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      await expect(manager.read()).rejects.toThrow(
        'Manifest file not found'
      );
    });

    it('should throw error when JSON is invalid', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockRejectedValue(new Error('Invalid JSON'));

      await expect(manager.read()).rejects.toThrow(
        'Failed to parse manifest'
      );
    });
  });

  describe('write', () => {
    it('should write manifest to disk', async () => {
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeJson.mockResolvedValue(undefined);

      const manifest: FrameworkManifest = {
        version: '1.0.0',
        framework: {
          version: '1.0.0',
          installedAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        modules: {},
        projectSkills: [],
        settings: {
          autoSyncSkills: true,
          linkTransformation: true,
        },
      };

      await manager.write(manifest);

      expect(mockedFs.ensureDir).toHaveBeenCalledWith(projectPath);
      expect(mockedFs.writeJson).toHaveBeenCalledWith(
        '/test/project/.agentic-framework.json',
        manifest,
        { spaces: 2 }
      );
    });

    it('should throw error when write fails', async () => {
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeJson.mockRejectedValue(new Error('Disk full'));

      await expect(
        manager.write({
          version: '1.0.0',
          framework: {
            version: '1.0.0',
            installedAt: '',
            updatedAt: '',
          },
          modules: {},
          projectSkills: [],
          settings: { autoSyncSkills: true, linkTransformation: true },
        })
      ).rejects.toThrow('Failed to write manifest');
    });
  });

  describe('create', () => {
    it('should create manifest with default values', async () => {
      const result = await manager.create('1.2.0', []);

      expect(result.version).toBe('1.0.0');
      expect(result.framework.version).toBe('1.2.0');
      expect(result.framework.pinned).toBe(false);
      expect(result.modules).toEqual({});
      expect(result.projectSkills).toEqual([]);
      expect(result.settings.autoSyncSkills).toBe(true);
      expect(result.settings.linkTransformation).toBe(true);
    });

    it('should create manifest with modules', async () => {
      const result = await manager.create('1.2.0', ['core', 'backlog', 'coding']);

      expect(Object.keys(result.modules)).toHaveLength(3);
      expect(result.modules['core']).toBeDefined();
      expect(result.modules['core'].version).toBe('1.2.0');
      expect(result.modules['backlog']).toBeDefined();
      expect(result.modules['coding']).toBeDefined();
    });

    it('should set installedAt timestamp for all modules', async () => {
      const result = await manager.create('1.2.0', ['core']);

      expect(result.framework.installedAt).toBeDefined();
      expect(result.modules['core'].installedAt).toBeDefined();
      // Both should have same timestamp (created at same time)
      expect(result.framework.installedAt).toBe(result.modules['core'].installedAt);
    });
  });

  describe('addModule', () => {
    it('should add module to manifest', async () => {
      const existingManifest: FrameworkManifest = {
        version: '1.0.0',
        framework: {
          version: '1.0.0',
          installedAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        modules: {},
        projectSkills: [],
        settings: { autoSyncSkills: true, linkTransformation: true },
      };
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(existingManifest);
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeJson.mockResolvedValue(undefined);

      await manager.addModule('jira', '1.0.0');

      expect(mockedFs.writeJson).toHaveBeenCalled();
      const writtenManifest = mockedFs.writeJson.mock.calls[0][1] as FrameworkManifest;
      expect(writtenManifest.modules['jira']).toBeDefined();
      expect(writtenManifest.modules['jira'].version).toBe('1.0.0');
    });

    it('should update framework.updatedAt timestamp', async () => {
      const existingManifest: FrameworkManifest = {
        version: '1.0.0',
        framework: {
          version: '1.0.0',
          installedAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        modules: {},
        projectSkills: [],
        settings: { autoSyncSkills: true, linkTransformation: true },
      };
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(existingManifest);
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeJson.mockResolvedValue(undefined);

      await manager.addModule('jira', '1.0.0');

      const writtenManifest = mockedFs.writeJson.mock.calls[0][1] as FrameworkManifest;
      expect(writtenManifest.framework.updatedAt).not.toBe('2025-01-01T00:00:00.000Z');
    });
  });

  describe('removeModule', () => {
    it('should remove module from manifest', async () => {
      const existingManifest: FrameworkManifest = {
        version: '1.0.0',
        framework: {
          version: '1.0.0',
          installedAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        modules: {
          core: { version: '1.0.0', installedAt: '2025-01-01T00:00:00.000Z' },
          jira: { version: '1.0.0', installedAt: '2025-01-01T00:00:00.000Z' },
        },
        projectSkills: [],
        settings: { autoSyncSkills: true, linkTransformation: true },
      };
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(existingManifest);
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeJson.mockResolvedValue(undefined);

      await manager.removeModule('jira');

      const writtenManifest = mockedFs.writeJson.mock.calls[0][1] as FrameworkManifest;
      expect(writtenManifest.modules['jira']).toBeUndefined();
      expect(writtenManifest.modules['core']).toBeDefined();
    });

    it('should update framework.updatedAt timestamp', async () => {
      const existingManifest: FrameworkManifest = {
        version: '1.0.0',
        framework: {
          version: '1.0.0',
          installedAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        modules: {
          jira: { version: '1.0.0', installedAt: '2025-01-01T00:00:00.000Z' },
        },
        projectSkills: [],
        settings: { autoSyncSkills: true, linkTransformation: true },
      };
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(existingManifest);
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeJson.mockResolvedValue(undefined);

      await manager.removeModule('jira');

      const writtenManifest = mockedFs.writeJson.mock.calls[0][1] as FrameworkManifest;
      expect(writtenManifest.framework.updatedAt).not.toBe('2025-01-01T00:00:00.000Z');
    });
  });

  describe('updateFrameworkVersion', () => {
    it('should update framework version', async () => {
      const existingManifest: FrameworkManifest = {
        version: '1.0.0',
        framework: {
          version: '1.0.0',
          installedAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        modules: {},
        projectSkills: [],
        settings: { autoSyncSkills: true, linkTransformation: true },
      };
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(existingManifest);
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeJson.mockResolvedValue(undefined);

      await manager.updateFrameworkVersion('2.0.0');

      const writtenManifest = mockedFs.writeJson.mock.calls[0][1] as FrameworkManifest;
      expect(writtenManifest.framework.version).toBe('2.0.0');
    });

    it('should update updatedAt timestamp', async () => {
      const existingManifest: FrameworkManifest = {
        version: '1.0.0',
        framework: {
          version: '1.0.0',
          installedAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        modules: {},
        projectSkills: [],
        settings: { autoSyncSkills: true, linkTransformation: true },
      };
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(existingManifest);
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeJson.mockResolvedValue(undefined);

      await manager.updateFrameworkVersion('2.0.0');

      const writtenManifest = mockedFs.writeJson.mock.calls[0][1] as FrameworkManifest;
      expect(writtenManifest.framework.updatedAt).not.toBe('2025-01-01T00:00:00.000Z');
    });
  });

  describe('registerProjectSkill', () => {
    it('should register new project skill', async () => {
      const existingManifest: FrameworkManifest = {
        version: '1.0.0',
        framework: {
          version: '1.0.0',
          installedAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        modules: {},
        projectSkills: [],
        settings: { autoSyncSkills: true, linkTransformation: true },
      };
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(existingManifest);
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeJson.mockResolvedValue(undefined);

      await manager.registerProjectSkill('/path/to/skill');

      const writtenManifest = mockedFs.writeJson.mock.calls[0][1] as FrameworkManifest;
      expect(writtenManifest.projectSkills).toContain('/path/to/skill');
    });

    it('should not add duplicate skill paths', async () => {
      const existingManifest: FrameworkManifest = {
        version: '1.0.0',
        framework: {
          version: '1.0.0',
          installedAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        modules: {},
        projectSkills: ['/path/to/skill'],
        settings: { autoSyncSkills: true, linkTransformation: true },
      };
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(existingManifest);
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeJson.mockResolvedValue(undefined);

      await manager.registerProjectSkill('/path/to/skill');

      const writtenManifest = mockedFs.writeJson.mock.calls[0][1] as FrameworkManifest;
      expect(writtenManifest.projectSkills.length).toBe(1);
    });

    it('should update updatedAt timestamp', async () => {
      const existingManifest: FrameworkManifest = {
        version: '1.0.0',
        framework: {
          version: '1.0.0',
          installedAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        modules: {},
        projectSkills: [],
        settings: { autoSyncSkills: true, linkTransformation: true },
      };
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(existingManifest);
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeJson.mockResolvedValue(undefined);

      await manager.registerProjectSkill('/path/to/skill');

      const writtenManifest = mockedFs.writeJson.mock.calls[0][1] as FrameworkManifest;
      expect(writtenManifest.framework.updatedAt).not.toBe('2025-01-01T00:00:00.000Z');
    });
  });
});
