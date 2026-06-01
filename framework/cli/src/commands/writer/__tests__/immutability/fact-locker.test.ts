/**
 * Fact Locker Unit Tests
 *
 * Tests for lock/unlock operations on world facts.
 * Covers all mutability types and audit trail.
 *
 * @skip Tests are skipped because the library modules at
 * modules/writer/src/lib/ have not been implemented yet.
 */

import {
  lockFact,
  unlockFact,
  relockFact,
  isFactLocked,
  getFactLockStatus,
} from '../../../../../../modules/writer/src/lib/fact-locker.js';
import { createLockFile, readLockFile } from '../../../../../../modules/writer/src/lib/world-lock-manager.js';
import { createSandbox, TestSandbox } from '../../../../lib/__tests__/test-utils/sandbox.js';

describe.skip('fact-locker', () => {
  let sandbox: TestSandbox;

  beforeEach(async () => {
    sandbox = await createSandbox('fact-locker');
    await createLockFile(sandbox.path);
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('lockFact', () => {
    it('locks immutable fact and computes hash', async () => {
      const content = `---
id: "test-immutable"
title: "Test Fact"
mutability: "immutable"
established: "2026-01-01"
category: "core"
version: "1.0.0"
---

# Test Fact

Content here.`;

      await sandbox.createFile('world/test.md', content);

      const result = await lockFact(sandbox.path, sandbox.resolve('world/test.md'));

      expect(result).toContain('locked successfully');
      expect(result).toContain('immutable');
    });

    it('locks append-only fact', async () => {
      const content = `---
id: "test-append-only"
title: "Test Fact"
mutability: "append-only"
established: "2026-01-01"
---

# Test Fact

Content.`;

      await sandbox.createFile('world/test.md', content);

      const result = await lockFact(sandbox.path, sandbox.resolve('world/test.md'));

      expect(result).toContain('append-only');
    });

    it('locks expandable fact', async () => {
      const content = `---
id: "test-expandable"
title: "Test Fact"
mutability: "expandable"
established: "2026-01-01"
---

# Test Fact

Content.`;

      await sandbox.createFile('world/test.md', content);

      const result = await lockFact(sandbox.path, sandbox.resolve('world/test.md'));

      expect(result).toContain('expandable');
    });

    it('adds to lock file registry', async () => {
      const content = `---
id: "new-fact"
mutability: "immutable"
established: "2026-01-01"
---

Content.`;

      await sandbox.createFile('world/test.md', content);
      await lockFact(sandbox.path, sandbox.resolve('world/test.md'));

      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile['immutable-facts']['new-fact']).toBeDefined();
    });

    it('updates frontmatter with content-hash', async () => {
      const content = `---
id: "test-fact"
mutability: "immutable"
established: "2026-01-01"
---

Content.`;

      await sandbox.createFile('world/test.md', content);
      await lockFact(sandbox.path, sandbox.resolve('world/test.md'));

      const updated = await sandbox.readFile('world/test.md');
      expect(updated).toContain('content-hash');
    });

    it('throws if fact already locked', async () => {
      const content = `---
id: "test-fact"
mutability: "immutable"
established: "2026-01-01"
---

Content.`;

      await sandbox.createFile('world/test.md', content);
      await lockFact(sandbox.path, sandbox.resolve('world/test.md'));

      await expect(
        lockFact(sandbox.path, sandbox.resolve('world/test.md'))
      ).rejects.toThrow('already locked');
    });

    it('throws if missing required frontmatter id', async () => {
      const content = `---
title: "No ID"
mutability: "immutable"
established: "2026-01-01"
---

Content.`;

      await sandbox.createFile('world/test.md', content);

      await expect(
        lockFact(sandbox.path, sandbox.resolve('world/test.md'))
      ).rejects.toThrow('id');
    });

    it('throws if missing mutability field', async () => {
      const content = `---
id: "test-fact"
established: "2026-01-01"
---

Content.`;

      await sandbox.createFile('world/test.md', content);

      await expect(
        lockFact(sandbox.path, sandbox.resolve('world/test.md'))
      ).rejects.toThrow('mutability');
    });

    it('throws if invalid mutability value', async () => {
      const content = `---
id: "test-fact"
mutability: "invalid"
established: "2026-01-01"
---

Content.`;

      await sandbox.createFile('world/test.md', content);

      await expect(
        lockFact(sandbox.path, sandbox.resolve('world/test.md'))
      ).rejects.toThrow('mutability');
    });

    it('throws if missing established field', async () => {
      const content = `---
id: "test-fact"
mutability: "immutable"
---

Content.`;

      await sandbox.createFile('world/test.md', content);

      await expect(
        lockFact(sandbox.path, sandbox.resolve('world/test.md'))
      ).rejects.toThrow('established');
    });
  });

  describe('unlockFact', () => {
    const createAndLockFact = async (mutability: string = 'immutable') => {
      const content = `---
id: "test-fact"
title: "Test Fact"
mutability: "${mutability}"
established: "2026-01-01"
---

# Test Fact

Content here.`;

      await sandbox.createFile('world/test.md', content);
      await lockFact(sandbox.path, sandbox.resolve('world/test.md'));
      return content;
    };

    it('removes fact from lock file', async () => {
      await createAndLockFact();

      await unlockFact(sandbox.path, 'test-fact', {
        reason: 'Test unlock',
      });

      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile['immutable-facts']['test-fact']).toBeUndefined();
    });

    it('adds audit entry with reason', async () => {
      await createAndLockFact();

      await unlockFact(sandbox.path, 'test-fact', {
        reason: 'Need to clarify rules',
      });

      const lockFile = await readLockFile(sandbox.path);
      const unlockEntry = lockFile['audit-trail']!.find(e => e.action === 'unlocked');
      expect(unlockEntry).toBeDefined();
      expect(unlockEntry!.reason).toBe('Need to clarify rules');
    });

    it('supports dry run mode', async () => {
      await createAndLockFact();

      const result = await unlockFact(sandbox.path, 'test-fact', {
        reason: 'Test',
        dryRun: true,
      });

      expect(result.message).toContain('DRY RUN');

      // Should still be locked
      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile['immutable-facts']['test-fact']).toBeDefined();
    });

    it('returns appropriate message for immutable facts', async () => {
      await createAndLockFact('immutable');

      const result = await unlockFact(sandbox.path, 'test-fact', {
        reason: 'Test',
      });

      expect(result.message).toContain('unlocked');
      expect(result.message).toContain('Re-lock');
    });

    it('returns guidance for append-only facts', async () => {
      await createAndLockFact('append-only');

      const result = await unlockFact(sandbox.path, 'test-fact', {
        reason: 'Test',
      });

      expect(result.message).toContain('append-only');
      expect(result.message).toContain('add new sections');
    });

    it('returns guidance for expandable facts', async () => {
      await createAndLockFact('expandable');

      const result = await unlockFact(sandbox.path, 'test-fact', {
        reason: 'Test',
      });

      expect(result.message).toContain('expandable');
      expect(result.message).toContain('sub-items');
    });

    it('throws if fact not locked', async () => {
      await expect(
        unlockFact(sandbox.path, 'nonexistent-fact', {
          reason: 'Test',
        })
      ).rejects.toThrow('not found');
    });

    it('returns mutability type in result', async () => {
      await createAndLockFact('immutable');

      const result = await unlockFact(sandbox.path, 'test-fact', {
        reason: 'Test',
      });

      expect(result.mutability).toBe('immutable');
    });

    it('returns current hash in result', async () => {
      await createAndLockFact();

      const result = await unlockFact(sandbox.path, 'test-fact', {
        reason: 'Test',
      });

      expect(result.currentHash).toBeDefined();
      expect(result.currentHash).toHaveLength(64);
    });
  });

  describe('relockFact', () => {
    it('computes new hash after modification', async () => {
      // Create and lock
      const content = `---
id: "test-fact"
mutability: "immutable"
established: "2026-01-01"
---

Original content.`;

      await sandbox.createFile('world/test.md', content);
      await lockFact(sandbox.path, sandbox.resolve('world/test.md'));

      // Unlock
      await unlockFact(sandbox.path, 'test-fact', { reason: 'Test' });

      // Modify
      const modified = `---
id: "test-fact"
mutability: "immutable"
established: "2026-01-01"
---

Modified content.`;

      await sandbox.createFile('world/test.md', modified);

      // Relock
      const result = await relockFact(
        sandbox.path,
        sandbox.resolve('world/test.md'),
        'Updated content'
      );

      expect(result).toContain('re-locked successfully');
    });

    it('updates frontmatter hash', async () => {
      const content = `---
id: "test-fact"
mutability: "immutable"
established: "2026-01-01"
---

Content.`;

      await sandbox.createFile('world/test.md', content);
      await lockFact(sandbox.path, sandbox.resolve('world/test.md'));
      await unlockFact(sandbox.path, 'test-fact', { reason: 'Test' });

      await relockFact(sandbox.path, sandbox.resolve('world/test.md'), 'Test');

      const updated = await sandbox.readFile('world/test.md');
      expect(updated).toContain('content-hash');
    });

    it('adds modification audit entry', async () => {
      const content = `---
id: "test-fact"
mutability: "immutable"
established: "2026-01-01"
---

Content.`;

      await sandbox.createFile('world/test.md', content);
      await lockFact(sandbox.path, sandbox.resolve('world/test.md'));
      await unlockFact(sandbox.path, 'test-fact', { reason: 'Test' });
      await relockFact(sandbox.path, sandbox.resolve('world/test.md'), 'Updated rules');

      const lockFile = await readLockFile(sandbox.path);
      const modifyEntry = lockFile['audit-trail']!.find(e => e.action === 'modified');
      expect(modifyEntry).toBeDefined();
      expect(modifyEntry!.reason).toBe('Updated rules');
    });

    it('throws if fact still locked', async () => {
      const content = `---
id: "test-fact"
mutability: "immutable"
established: "2026-01-01"
---

Content.`;

      await sandbox.createFile('world/test.md', content);
      await lockFact(sandbox.path, sandbox.resolve('world/test.md'));

      // Don't unlock, try to relock
      await expect(
        relockFact(sandbox.path, sandbox.resolve('world/test.md'), 'Test')
      ).rejects.toThrow('still locked');
    });

    it('throws if missing fact id', async () => {
      const content = `---
title: "No ID"
mutability: "immutable"
established: "2026-01-01"
---

Content.`;

      await sandbox.createFile('world/test.md', content);

      await expect(
        relockFact(sandbox.path, sandbox.resolve('world/test.md'), 'Test')
      ).rejects.toThrow('id');
    });
  });

  describe('isFactLocked', () => {
    it('returns true for locked fact', async () => {
      const content = `---
id: "test-fact"
mutability: "immutable"
established: "2026-01-01"
---

Content.`;

      await sandbox.createFile('world/test.md', content);
      await lockFact(sandbox.path, sandbox.resolve('world/test.md'));

      const result = await isFactLocked(sandbox.path, 'test-fact');
      expect(result).toBe(true);
    });

    it('returns false for unlocked fact', async () => {
      const result = await isFactLocked(sandbox.path, 'nonexistent-fact');
      expect(result).toBe(false);
    });

    it('returns false after unlock', async () => {
      const content = `---
id: "test-fact"
mutability: "immutable"
established: "2026-01-01"
---

Content.`;

      await sandbox.createFile('world/test.md', content);
      await lockFact(sandbox.path, sandbox.resolve('world/test.md'));
      await unlockFact(sandbox.path, 'test-fact', { reason: 'Test' });

      const result = await isFactLocked(sandbox.path, 'test-fact');
      expect(result).toBe(false);
    });
  });

  describe('getFactLockStatus', () => {
    it('returns full status for locked fact', async () => {
      const content = `---
id: "test-fact"
mutability: "immutable"
established: "2026-01-01"
---

Content.`;

      await sandbox.createFile('world/test.md', content);
      await lockFact(sandbox.path, sandbox.resolve('world/test.md'));

      const status = await getFactLockStatus(sandbox.path, 'test-fact');

      expect(status.locked).toBe(true);
      expect(status.mutability).toBe('immutable');
      expect(status.hash).toBeDefined();
      expect(status.file).toBeDefined();
    });

    it('returns locked:false for unlocked fact', async () => {
      const status = await getFactLockStatus(sandbox.path, 'nonexistent');

      expect(status.locked).toBe(false);
      expect(status.mutability).toBeUndefined();
      expect(status.hash).toBeUndefined();
    });

    it('returns hash for immutable facts', async () => {
      const content = `---
id: "test-fact"
mutability: "immutable"
established: "2026-01-01"
---

Content.`;

      await sandbox.createFile('world/test.md', content);
      await lockFact(sandbox.path, sandbox.resolve('world/test.md'));

      const status = await getFactLockStatus(sandbox.path, 'test-fact');
      expect(status.hash).toHaveLength(64);
    });

    it('returns original-hash for append-only facts', async () => {
      const content = `---
id: "test-fact"
mutability: "append-only"
established: "2026-01-01"
---

Content.`;

      await sandbox.createFile('world/test.md', content);
      await lockFact(sandbox.path, sandbox.resolve('world/test.md'));

      const status = await getFactLockStatus(sandbox.path, 'test-fact');
      expect(status.mutability).toBe('append-only');
      expect(status.hash).toHaveLength(64);
    });

    it('returns original-hash for expandable facts', async () => {
      const content = `---
id: "test-fact"
mutability: "expandable"
established: "2026-01-01"
---

Content.`;

      await sandbox.createFile('world/test.md', content);
      await lockFact(sandbox.path, sandbox.resolve('world/test.md'));

      const status = await getFactLockStatus(sandbox.path, 'test-fact');
      expect(status.mutability).toBe('expandable');
      expect(status.hash).toHaveLength(64);
    });
  });
});
