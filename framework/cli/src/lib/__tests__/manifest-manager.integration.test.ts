import fs from 'fs-extra';
import path from 'path';
import { ManifestManager, FrameworkManifest } from '../manifest-manager';
import { createSandbox, TestSandbox } from './test-utils';

describe('ManifestManager', () => {
  let sandbox: TestSandbox;
  let manager: ManifestManager;

  beforeEach(async () => {
    sandbox = await createSandbox('manifest-test');
    manager = new ManifestManager(sandbox.path);
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('constructor', () => {
    it('should create manager with project path', () => {
      const manager = new ManifestManager('/some/path');
      expect(manager).toBeDefined();
    });
  });

  describe('exists()', () => {
    it('should return false when manifest does not exist', async () => {
      const exists = await manager.exists();
      expect(exists).toBe(false);
    });

    it('should return true when manifest exists', async () => {
      const manifest = await manager.create('1.0.0', ['core']);
      await manager.write(manifest);

      const exists = await manager.exists();
      expect(exists).toBe(true);
    });
  });

  describe('read()', () => {
    it('should throw error when manifest does not exist', async () => {
      await expect(manager.read()).rejects.toThrow(
        /Manifest file not found.*Run 'agentic-framework init' to create one/
      );
    });

    it('should read and parse valid manifest', async () => {
      const createdManifest = await manager.create('1.0.0', ['core']);
      await manager.write(createdManifest);

      const readManifest = await manager.read();

      expect(readManifest).toBeDefined();
      expect(readManifest.version).toBe('1.0.0');
      expect(readManifest.framework.version).toBe('1.0.0');
      expect(readManifest.modules).toHaveProperty('core');
    });

    it('should throw error for invalid JSON', async () => {
      const manifestPath = manager.getManifestPath();
      await fs.writeFile(manifestPath, 'invalid json {]');

      await expect(manager.read()).rejects.toThrow(/Failed to parse manifest/);
    });

    it('should read manifest with all properties correctly', async () => {
      const manifest = await manager.create('2.0.0', ['core', 'planning']);
      await manager.write(manifest);

      const readManifest = await manager.read();

      expect(readManifest.framework.version).toBe('2.0.0');
      expect(readManifest.modules.core).toBeDefined();
      expect(readManifest.modules.planning).toBeDefined();
      expect(readManifest.projectSkills).toEqual([]);
      expect(readManifest.settings.autoSyncSkills).toBe(true);
      expect(readManifest.settings.linkTransformation).toBe(true);
    });
  });

  describe('write()', () => {
    it('should create manifest file', async () => {
      const manifest = await manager.create('1.0.0', ['core']);
      await manager.write(manifest);

      const manifestPath = manager.getManifestPath();
      const exists = await fs.pathExists(manifestPath);
      expect(exists).toBe(true);
    });

    it('should format JSON with 2-space indentation', async () => {
      const manifest = await manager.create('1.0.0', ['core']);
      await manager.write(manifest);

      const manifestPath = manager.getManifestPath();
      const content = await fs.readFile(manifestPath, 'utf-8');

      // Check that JSON is formatted with 2-space indentation
      expect(content).toContain('  "version": "1.0.0"');
      expect(content).toContain('  "framework": {');
      expect(content).toContain('    "version": "1.0.0"');
    });

    it('should overwrite existing manifest', async () => {
      const manifest1 = await manager.create('1.0.0', ['core']);
      await manager.write(manifest1);

      const manifest2 = await manager.create('2.0.0', ['core', 'planning']);
      await manager.write(manifest2);

      const readManifest = await manager.read();
      expect(readManifest.framework.version).toBe('2.0.0');
      expect(readManifest.modules.planning).toBeDefined();
    });

    it('should create project directory if it does not exist', async () => {
      const newTestDir = path.join(sandbox.path, 'nested', 'dir');
      const newManager = new ManifestManager(newTestDir);

      const manifest = await newManager.create('1.0.0', ['core']);
      await newManager.write(manifest);

      const manifestPath = newManager.getManifestPath();
      const exists = await fs.pathExists(manifestPath);
      expect(exists).toBe(true);
    });
  });

  describe('create()', () => {
    it('should create manifest with correct structure', async () => {
      const manifest = await manager.create('1.0.0', ['core']);

      expect(manifest).toHaveProperty('version');
      expect(manifest).toHaveProperty('framework');
      expect(manifest).toHaveProperty('modules');
      expect(manifest).toHaveProperty('projectSkills');
      expect(manifest).toHaveProperty('settings');
    });

    it('should set framework version from parameter', async () => {
      const manifest = await manager.create('2.5.3', ['core']);

      expect(manifest.framework.version).toBe('2.5.3');
    });

    it('should populate modules from array parameter', async () => {
      const manifest = await manager.create('1.0.0', ['core', 'planning', 'coding']);

      expect(Object.keys(manifest.modules)).toHaveLength(3);
      expect(manifest.modules.core).toBeDefined();
      expect(manifest.modules.planning).toBeDefined();
      expect(manifest.modules.coding).toBeDefined();
    });

    it('should set module versions to framework version', async () => {
      const manifest = await manager.create('1.5.0', ['core', 'planning']);

      expect(manifest.modules.core.version).toBe('1.5.0');
      expect(manifest.modules.planning.version).toBe('1.5.0');
    });

    it('should set default settings (autoSyncSkills: true, linkTransformation: true)', async () => {
      const manifest = await manager.create('1.0.0', ['core']);

      expect(manifest.settings.autoSyncSkills).toBe(true);
      expect(manifest.settings.linkTransformation).toBe(true);
    });

    it('should use ISO timestamps', async () => {
      const manifest = await manager.create('1.0.0', ['core']);

      // Validate ISO 8601 format (basic check)
      expect(manifest.framework.installedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(manifest.framework.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(manifest.modules.core.installedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // Timestamps should be equal (created at same time)
      expect(manifest.framework.installedAt).toBe(manifest.framework.updatedAt);
      expect(manifest.framework.installedAt).toBe(manifest.modules.core.installedAt);
    });

    it('should create empty modules object when no modules provided', async () => {
      const manifest = await manager.create('1.0.0', []);

      expect(manifest.modules).toEqual({});
      expect(Object.keys(manifest.modules)).toHaveLength(0);
    });

    it('should initialize empty projectSkills array', async () => {
      const manifest = await manager.create('1.0.0', ['core']);

      expect(manifest.projectSkills).toEqual([]);
      expect(Array.isArray(manifest.projectSkills)).toBe(true);
    });

    it('should set manifest schema version to 1.0.0', async () => {
      const manifest = await manager.create('2.5.0', ['core']);

      expect(manifest.version).toBe('1.0.0');
    });

    it('should set pinned to false by default', async () => {
      const manifest = await manager.create('1.0.0', ['core']);

      expect(manifest.framework.pinned).toBe(false);
    });
  });

  describe('getManifestPath()', () => {
    it('should return correct path with .agentic-framework.json', () => {
      const manifestPath = manager.getManifestPath();

      expect(manifestPath).toBe(path.join(sandbox.path, '.agentic-framework.json'));
    });

    it('should return absolute path', () => {
      const manifestPath = manager.getManifestPath();

      expect(path.isAbsolute(manifestPath)).toBe(true);
    });
  });

  describe('addModule()', () => {
    it('should add module to existing manifest', async () => {
      const manifest = await manager.create('1.0.0', ['core']);
      await manager.write(manifest);

      await manager.addModule('planning', '1.0.0');

      const updatedManifest = await manager.read();
      expect(updatedManifest.modules.planning).toBeDefined();
      expect(updatedManifest.modules.planning.version).toBe('1.0.0');
    });

    it('should update updatedAt timestamp', async () => {
      const manifest = await manager.create('1.0.0', ['core']);
      await manager.write(manifest);

      const originalUpdatedAt = manifest.framework.updatedAt;

      // Wait a bit to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      await manager.addModule('planning', '1.0.0');

      const updatedManifest = await manager.read();
      expect(updatedManifest.framework.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('should preserve existing modules when adding new one', async () => {
      const manifest = await manager.create('1.0.0', ['core']);
      await manager.write(manifest);

      await manager.addModule('planning', '1.0.0');

      const updatedManifest = await manager.read();
      expect(updatedManifest.modules.core).toBeDefined();
      expect(updatedManifest.modules.planning).toBeDefined();
    });

    it('should throw error when manifest does not exist', async () => {
      await expect(manager.addModule('planning', '1.0.0')).rejects.toThrow(
        /Manifest file not found/
      );
    });

    it('should overwrite module if already exists', async () => {
      const manifest = await manager.create('1.0.0', ['core']);
      await manager.write(manifest);

      await manager.addModule('core', '2.0.0');

      const updatedManifest = await manager.read();
      expect(updatedManifest.modules.core.version).toBe('2.0.0');
    });
  });

  describe('removeModule()', () => {
    it('should remove module from manifest', async () => {
      const manifest = await manager.create('1.0.0', ['core', 'planning']);
      await manager.write(manifest);

      await manager.removeModule('planning');

      const updatedManifest = await manager.read();
      expect(updatedManifest.modules.planning).toBeUndefined();
      expect(updatedManifest.modules.core).toBeDefined();
    });

    it('should handle non-existent module gracefully', async () => {
      const manifest = await manager.create('1.0.0', ['core']);
      await manager.write(manifest);

      // Should not throw error when removing non-existent module
      await expect(manager.removeModule('nonexistent')).resolves.not.toThrow();

      const updatedManifest = await manager.read();
      expect(updatedManifest.modules.core).toBeDefined();
    });

    it('should update updatedAt timestamp', async () => {
      const manifest = await manager.create('1.0.0', ['core', 'planning']);
      await manager.write(manifest);

      const originalUpdatedAt = manifest.framework.updatedAt;

      // Wait a bit to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      await manager.removeModule('planning');

      const updatedManifest = await manager.read();
      expect(updatedManifest.framework.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('should throw error when manifest does not exist', async () => {
      await expect(manager.removeModule('planning')).rejects.toThrow(
        /Manifest file not found/
      );
    });
  });

  describe('updateFrameworkVersion()', () => {
    it('should update framework version', async () => {
      const manifest = await manager.create('1.0.0', ['core']);
      await manager.write(manifest);

      await manager.updateFrameworkVersion('2.0.0');

      const updatedManifest = await manager.read();
      expect(updatedManifest.framework.version).toBe('2.0.0');
    });

    it('should update updatedAt timestamp', async () => {
      const manifest = await manager.create('1.0.0', ['core']);
      await manager.write(manifest);

      const originalUpdatedAt = manifest.framework.updatedAt;

      // Wait a bit to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      await manager.updateFrameworkVersion('2.0.0');

      const updatedManifest = await manager.read();
      expect(updatedManifest.framework.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('should not modify installedAt timestamp', async () => {
      const manifest = await manager.create('1.0.0', ['core']);
      await manager.write(manifest);

      const originalInstalledAt = manifest.framework.installedAt;

      await manager.updateFrameworkVersion('2.0.0');

      const updatedManifest = await manager.read();
      expect(updatedManifest.framework.installedAt).toBe(originalInstalledAt);
    });

    it('should throw error when manifest does not exist', async () => {
      await expect(manager.updateFrameworkVersion('2.0.0')).rejects.toThrow(
        /Manifest file not found/
      );
    });
  });

  describe('registerProjectSkill()', () => {
    it('should add skill path to projectSkills array', async () => {
      const manifest = await manager.create('1.0.0', ['core']);
      await manager.write(manifest);

      await manager.registerProjectSkill('./skills/custom-skill');

      const updatedManifest = await manager.read();
      expect(updatedManifest.projectSkills).toContain('./skills/custom-skill');
    });

    it('should not add duplicate skill paths', async () => {
      const manifest = await manager.create('1.0.0', ['core']);
      await manager.write(manifest);

      await manager.registerProjectSkill('./skills/custom-skill');
      await manager.registerProjectSkill('./skills/custom-skill');

      const updatedManifest = await manager.read();
      const occurrences = updatedManifest.projectSkills.filter(
        (s) => s === './skills/custom-skill'
      );
      expect(occurrences).toHaveLength(1);
    });

    it('should add multiple different skill paths', async () => {
      const manifest = await manager.create('1.0.0', ['core']);
      await manager.write(manifest);

      await manager.registerProjectSkill('./skills/skill-1');
      await manager.registerProjectSkill('./skills/skill-2');
      await manager.registerProjectSkill('./skills/skill-3');

      const updatedManifest = await manager.read();
      expect(updatedManifest.projectSkills).toHaveLength(3);
      expect(updatedManifest.projectSkills).toContain('./skills/skill-1');
      expect(updatedManifest.projectSkills).toContain('./skills/skill-2');
      expect(updatedManifest.projectSkills).toContain('./skills/skill-3');
    });

    it('should update updatedAt timestamp', async () => {
      const manifest = await manager.create('1.0.0', ['core']);
      await manager.write(manifest);

      const originalUpdatedAt = manifest.framework.updatedAt;

      // Wait a bit to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      await manager.registerProjectSkill('./skills/custom-skill');

      const updatedManifest = await manager.read();
      expect(updatedManifest.framework.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('should throw error when manifest does not exist', async () => {
      await expect(manager.registerProjectSkill('./skills/custom-skill')).rejects.toThrow(
        /Manifest file not found/
      );
    });

    it('should update timestamp even when skill is duplicate', async () => {
      const manifest = await manager.create('1.0.0', ['core']);
      await manager.write(manifest);

      await manager.registerProjectSkill('./skills/custom-skill');
      const firstUpdatedAt = (await manager.read()).framework.updatedAt;

      // Wait a bit to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Register same skill again
      await manager.registerProjectSkill('./skills/custom-skill');

      const updatedManifest = await manager.read();
      expect(updatedManifest.framework.updatedAt).not.toBe(firstUpdatedAt);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow from create to updates', async () => {
      // Create initial manifest
      const manifest = await manager.create('1.0.0', ['core']);
      await manager.write(manifest);

      // Add module
      await manager.addModule('planning', '1.0.0');

      // Register skill
      await manager.registerProjectSkill('./skills/custom-skill');

      // Update framework version
      await manager.updateFrameworkVersion('1.1.0');

      // Read final state
      const final = await manager.read();

      expect(final.framework.version).toBe('1.1.0');
      expect(final.modules.core).toBeDefined();
      expect(final.modules.planning).toBeDefined();
      expect(final.projectSkills).toContain('./skills/custom-skill');
    });

    it('should persist changes across multiple manager instances', async () => {
      const manager1 = new ManifestManager(sandbox.path);
      const manifest = await manager1.create('1.0.0', ['core']);
      await manager1.write(manifest);

      const manager2 = new ManifestManager(sandbox.path);
      await manager2.addModule('planning', '1.0.0');

      const manager3 = new ManifestManager(sandbox.path);
      const final = await manager3.read();

      expect(final.modules.core).toBeDefined();
      expect(final.modules.planning).toBeDefined();
    });
  });
});
