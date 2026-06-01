/**
 * Unit Tests for ModuleManifest type — directories field
 *
 * Verifies that the directories field is correctly typed on ModuleManifest.provides.
 */

import type { ModuleManifest } from '../module-loader.js';

describe('ModuleManifest type', () => {
  it('should accept directories in provides', () => {
    const manifest: ModuleManifest = {
      id: 'test-mod',
      version: '1.0.0',
      name: 'Test',
      description: 'Test module for type checking',
      provides: {
        directories: ['backlog/tickets', 'reports'],
      },
    };
    expect(manifest.provides.directories).toEqual(['backlog/tickets', 'reports']);
  });

  it('should treat directories as optional', () => {
    const manifest: ModuleManifest = {
      id: 'no-dirs',
      version: '1.0.0',
      name: 'No Dirs',
      description: 'Module with no directories',
      provides: {},
    };
    expect(manifest.provides.directories).toBeUndefined();
  });
});
