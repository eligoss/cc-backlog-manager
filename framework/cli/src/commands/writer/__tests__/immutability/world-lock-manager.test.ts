/**
 * World Lock Manager Unit Tests
 *
 * Tests for lock file management used in world fact immutability.
 * Uses TestSandbox for isolated file operations.
 *
 * @skip Tests are skipped because the library modules at
 * modules/writer/src/lib/ have not been implemented yet.
 */

import {
  getLockFilePath,
  createLockFile,
  readLockFile,
  writeLockFile,
  addImmutableFact,
  addAppendOnlyFact,
  addExpandableFact,
  updateAppendOnlyFact,
  updateExpandableFact,
  getFactEntry,
  WorldLockFile,
} from '../../../../../../modules/writer/src/lib/world-lock-manager.js';
import { createSandbox, TestSandbox } from '../../../../lib/__tests__/test-utils/sandbox.js';

describe.skip('world-lock-manager', () => {
  let sandbox: TestSandbox;

  beforeEach(async () => {
    sandbox = await createSandbox('world-lock-manager');
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('getLockFilePath', () => {
    it('returns correct path for project root', () => {
      const result = getLockFilePath('/path/to/project');
      expect(result).toBe('/path/to/project/world.lock.json');
    });
  });

  describe('createLockFile', () => {
    it('creates lock file with default structure', async () => {
      const lockFile = await createLockFile(sandbox.path);

      expect(lockFile.version).toBe('1.0.0');
      expect(lockFile['immutable-facts']).toEqual({});
      expect(lockFile['append-only-facts']).toEqual({});
      expect(lockFile['expandable-facts']).toEqual({});
      expect(lockFile['audit-trail']).toEqual([]);
    });

    it('sets correct version', async () => {
      const lockFile = await createLockFile(sandbox.path);
      expect(lockFile.version).toBe('1.0.0');
    });

    it('sets created date', async () => {
      const lockFile = await createLockFile(sandbox.path);
      expect(lockFile.created).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('sets last-updated timestamp', async () => {
      const lockFile = await createLockFile(sandbox.path);
      expect(lockFile['last-updated']).toBeDefined();
      expect(lockFile['last-updated']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('initializes empty fact registries', async () => {
      const lockFile = await createLockFile(sandbox.path);
      expect(Object.keys(lockFile['immutable-facts'])).toHaveLength(0);
      expect(Object.keys(lockFile['append-only-facts'])).toHaveLength(0);
      expect(Object.keys(lockFile['expandable-facts'])).toHaveLength(0);
    });

    it('applies default validation rules', async () => {
      const lockFile = await createLockFile(sandbox.path);
      expect(lockFile['validation-rules']).toBeDefined();
      expect(lockFile['validation-rules']?.['prevent-modification']).toBe(true);
      expect(lockFile['validation-rules']?.['require-hash-match']).toBe(true);
    });

    it('applies custom validation rules', async () => {
      const customRules = {
        'prevent-modification': false,
        'require-hash-match': true,
        'audit-all-changes': false,
      };
      const lockFile = await createLockFile(sandbox.path, { validationRules: customRules });
      expect(lockFile['validation-rules']).toEqual(customRules);
    });

    it('throws if lock file already exists', async () => {
      await createLockFile(sandbox.path);
      await expect(createLockFile(sandbox.path)).rejects.toThrow('already exists');
    });

    it('writes file to disk', async () => {
      await createLockFile(sandbox.path);
      const exists = await sandbox.exists('world.lock.json');
      expect(exists).toBe(true);
    });
  });

  describe('readLockFile', () => {
    it('reads and parses lock file', async () => {
      await createLockFile(sandbox.path);
      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile.version).toBe('1.0.0');
    });

    it('throws if lock file does not exist', async () => {
      await expect(readLockFile(sandbox.path)).rejects.toThrow('not found');
    });

    it('parses all fields correctly', async () => {
      const created = await createLockFile(sandbox.path);
      const read = await readLockFile(sandbox.path);

      expect(read.version).toBe(created.version);
      expect(read['immutable-facts']).toEqual(created['immutable-facts']);
    });
  });

  describe('writeLockFile', () => {
    it('writes lock file with formatting', async () => {
      await createLockFile(sandbox.path);
      const lockFile = await readLockFile(sandbox.path);

      lockFile['immutable-facts']['test-fact'] = {
        hash: 'abc123',
        established: '2026-01-01',
        file: 'test.md',
      };

      await writeLockFile(sandbox.path, lockFile);

      const updated = await readLockFile(sandbox.path);
      expect(updated['immutable-facts']['test-fact']).toBeDefined();
    });

    it('updates last-updated timestamp', async () => {
      await createLockFile(sandbox.path);
      const original = await readLockFile(sandbox.path);
      const originalTimestamp = original['last-updated'];

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));

      await writeLockFile(sandbox.path, original);
      const updated = await readLockFile(sandbox.path);

      expect(updated['last-updated']).not.toBe(originalTimestamp);
    });
  });

  describe('addImmutableFact', () => {
    beforeEach(async () => {
      await createLockFile(sandbox.path);
    });

    it('adds fact to immutable-facts registry', async () => {
      await addImmutableFact(
        sandbox.path,
        'world-core-physics',
        'world/core/physics.md',
        'abc123def456',
        { established: '2026-01-01', category: 'core', version: '1.0.0' }
      );

      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile['immutable-facts']['world-core-physics']).toBeDefined();
    });

    it('includes all required metadata', async () => {
      await addImmutableFact(
        sandbox.path,
        'world-core-physics',
        'world/core/physics.md',
        'abc123def456',
        { established: '2026-01-01', category: 'core', version: '1.0.0' }
      );

      const lockFile = await readLockFile(sandbox.path);
      const fact = lockFile['immutable-facts']['world-core-physics'];

      expect(fact.hash).toBe('abc123def456');
      expect(fact.established).toBe('2026-01-01');
      expect(fact.file).toBe('world/core/physics.md');
      expect(fact.category).toBe('core');
      expect(fact.version).toBe('1.0.0');
    });

    it('adds audit trail entry', async () => {
      await addImmutableFact(
        sandbox.path,
        'world-core-physics',
        'world/core/physics.md',
        'abc123def456',
        { established: '2026-01-01' }
      );

      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile['audit-trail']).toHaveLength(1);
      expect(lockFile['audit-trail']![0]['fact-id']).toBe('world-core-physics');
      expect(lockFile['audit-trail']![0].action).toBe('locked');
    });
  });

  describe('addAppendOnlyFact', () => {
    beforeEach(async () => {
      await createLockFile(sandbox.path);
    });

    it('adds fact to append-only-facts registry', async () => {
      await addAppendOnlyFact(
        sandbox.path,
        'world-history-war',
        'world/history/war.md',
        'def456ghi789',
        { established: '2026-01-01', category: 'history', version: '1.0.0' }
      );

      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile['append-only-facts']['world-history-war']).toBeDefined();
    });

    it('stores original-hash', async () => {
      await addAppendOnlyFact(
        sandbox.path,
        'world-history-war',
        'world/history/war.md',
        'def456ghi789',
        { established: '2026-01-01', version: '1.0.0' }
      );

      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile['append-only-facts']['world-history-war']['original-hash']).toBe('def456ghi789');
    });

    it('initializes empty additions array', async () => {
      await addAppendOnlyFact(
        sandbox.path,
        'world-history-war',
        'world/history/war.md',
        'def456ghi789',
        { established: '2026-01-01', version: '1.0.0' }
      );

      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile['append-only-facts']['world-history-war'].additions).toEqual([]);
    });

    it('adds audit trail entry', async () => {
      await addAppendOnlyFact(
        sandbox.path,
        'world-history-war',
        'world/history/war.md',
        'def456ghi789',
        { established: '2026-01-01', version: '1.0.0' }
      );

      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile['audit-trail']).toHaveLength(1);
      expect(lockFile['audit-trail']![0].action).toBe('locked');
    });
  });

  describe('addExpandableFact', () => {
    beforeEach(async () => {
      await createLockFile(sandbox.path);
    });

    it('adds fact to expandable-facts registry', async () => {
      await addExpandableFact(
        sandbox.path,
        'world-geography-region',
        'world/geography/region.md',
        'ghi789jkl012',
        { established: '2026-01-01', category: 'geography' }
      );

      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile['expandable-facts']['world-geography-region']).toBeDefined();
    });

    it('stores original-hash', async () => {
      await addExpandableFact(
        sandbox.path,
        'world-geography-region',
        'world/geography/region.md',
        'ghi789jkl012',
        { established: '2026-01-01' }
      );

      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile['expandable-facts']['world-geography-region']['original-hash']).toBe('ghi789jkl012');
    });

    it('initializes empty expansions array', async () => {
      await addExpandableFact(
        sandbox.path,
        'world-geography-region',
        'world/geography/region.md',
        'ghi789jkl012',
        { established: '2026-01-01' }
      );

      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile['expandable-facts']['world-geography-region'].expansions).toEqual([]);
    });

    it('adds audit trail entry', async () => {
      await addExpandableFact(
        sandbox.path,
        'world-geography-region',
        'world/geography/region.md',
        'ghi789jkl012',
        { established: '2026-01-01' }
      );

      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile['audit-trail']).toHaveLength(1);
    });
  });

  describe('updateAppendOnlyFact', () => {
    beforeEach(async () => {
      await createLockFile(sandbox.path);
      await addAppendOnlyFact(
        sandbox.path,
        'world-history-war',
        'world/history/war.md',
        'def456ghi789',
        { established: '2026-01-01', version: '1.0.0' }
      );
    });

    it('adds addition to additions array', async () => {
      await updateAppendOnlyFact(sandbox.path, 'world-history-war', {
        date: '2026-01-15',
        hash: 'new123hash',
        section: 'Aftermath',
        description: 'Added aftermath section',
      });

      const lockFile = await readLockFile(sandbox.path);
      const fact = lockFile['append-only-facts']['world-history-war'];
      expect(fact.additions).toHaveLength(1);
      expect(fact.additions![0].section).toBe('Aftermath');
    });

    it('increments patch version', async () => {
      await updateAppendOnlyFact(sandbox.path, 'world-history-war', {
        date: '2026-01-15',
        hash: 'new123hash',
      });

      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile['append-only-facts']['world-history-war']['current-version']).toBe('1.0.1');
    });

    it('adds audit trail entry', async () => {
      await updateAppendOnlyFact(sandbox.path, 'world-history-war', {
        date: '2026-01-15',
        hash: 'new123hash',
      });

      const lockFile = await readLockFile(sandbox.path);
      // First entry is from addAppendOnlyFact, second from update
      const auditEntries = lockFile['audit-trail']!.filter(e => e.action === 'addition');
      expect(auditEntries).toHaveLength(1);
    });

    it('throws if fact not found', async () => {
      await expect(
        updateAppendOnlyFact(sandbox.path, 'nonexistent-fact', {
          date: '2026-01-15',
          hash: 'new123hash',
        })
      ).rejects.toThrow('not found');
    });
  });

  describe('updateExpandableFact', () => {
    beforeEach(async () => {
      await createLockFile(sandbox.path);
      await addExpandableFact(
        sandbox.path,
        'world-geography-region',
        'world/geography/region.md',
        'ghi789jkl012',
        { established: '2026-01-01', version: '1.0.0' }
      );
    });

    it('adds expansion to expansions array', async () => {
      await updateExpandableFact(
        sandbox.path,
        'world-geography-region',
        'world-geography-city-capital'
      );

      const lockFile = await readLockFile(sandbox.path);
      const fact = lockFile['expandable-facts']['world-geography-region'];
      expect(fact.expansions).toContain('world-geography-city-capital');
    });

    it('increments minor version', async () => {
      await updateExpandableFact(
        sandbox.path,
        'world-geography-region',
        'world-geography-city-capital'
      );

      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile['expandable-facts']['world-geography-region']['current-version']).toBe('1.1.0');
    });

    it('does not add duplicate expansions', async () => {
      await updateExpandableFact(sandbox.path, 'world-geography-region', 'world-geography-city-capital');
      await updateExpandableFact(sandbox.path, 'world-geography-region', 'world-geography-city-capital');

      const lockFile = await readLockFile(sandbox.path);
      const fact = lockFile['expandable-facts']['world-geography-region'];
      expect(fact.expansions!.filter(e => e === 'world-geography-city-capital')).toHaveLength(1);
    });

    it('throws if fact not found', async () => {
      await expect(
        updateExpandableFact(sandbox.path, 'nonexistent-fact', 'expansion-id')
      ).rejects.toThrow('not found');
    });

    it('adds audit trail entry', async () => {
      await updateExpandableFact(sandbox.path, 'world-geography-region', 'world-geography-city-capital');

      const lockFile = await readLockFile(sandbox.path);
      const expansionEntries = lockFile['audit-trail']!.filter(e => e.action === 'expansion');
      expect(expansionEntries).toHaveLength(1);
    });
  });

  describe('getFactEntry', () => {
    beforeEach(async () => {
      await createLockFile(sandbox.path);
      await addImmutableFact(
        sandbox.path,
        'world-core-physics',
        'world/core/physics.md',
        'hash1',
        { established: '2026-01-01' }
      );
      await addAppendOnlyFact(
        sandbox.path,
        'world-history-war',
        'world/history/war.md',
        'hash2',
        { established: '2026-01-01', version: '1.0.0' }
      );
      await addExpandableFact(
        sandbox.path,
        'world-geography-region',
        'world/geography/region.md',
        'hash3',
        { established: '2026-01-01' }
      );
    });

    it('finds immutable fact', async () => {
      const result = await getFactEntry(sandbox.path, 'world-core-physics');
      expect(result).not.toBeNull();
      expect(result!.mutability).toBe('immutable');
      expect(result!.entry.hash).toBe('hash1');
    });

    it('finds append-only fact', async () => {
      const result = await getFactEntry(sandbox.path, 'world-history-war');
      expect(result).not.toBeNull();
      expect(result!.mutability).toBe('append-only');
      expect(result!.entry['original-hash']).toBe('hash2');
    });

    it('finds expandable fact', async () => {
      const result = await getFactEntry(sandbox.path, 'world-geography-region');
      expect(result).not.toBeNull();
      expect(result!.mutability).toBe('expandable');
      expect(result!.entry['original-hash']).toBe('hash3');
    });

    it('returns null for unknown fact', async () => {
      const result = await getFactEntry(sandbox.path, 'nonexistent-fact');
      expect(result).toBeNull();
    });
  });
});
