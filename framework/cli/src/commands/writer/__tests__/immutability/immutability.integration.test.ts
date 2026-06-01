/**
 * Immutability Integration Tests
 *
 * Tests CLI commands for lock-fact, unlock-fact, and validate-immutability.
 * These tests use TestSandbox for isolated file I/O.
 */

import path from 'path';
import fs from 'fs-extra';
import { createSandbox, TestSandbox } from '../../../../lib/__tests__/test-utils/sandbox.js';
import {
  lockFact,
  unlockFact,
  readLockFile,
  writeLockFile,
  computeHash,
} from '../../lib/lock-utils.js';
import {
  validateFactFile,
  validateFactFiles,
  validateStagedFacts,
  formatValidationResult,
  ValidationErrorCode,
} from '../../lib/immutability-utils.js';

describe('Immutability Integration Tests', () => {
  let sandbox: TestSandbox;

  beforeEach(async () => {
    sandbox = await createSandbox('immutability-integration');
    // Create minimal world.lock.json
    await writeLockFile(sandbox.path, { version: '1.0.0', facts: {} });
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('lock-fact command', () => {
    it('locks immutable fact by path', async () => {
      const content = `---
id: "world-physics"
title: "Physics Rules"
mutability: "immutable"
established: "2026-01-01"
---

# Physics Rules

Gravity works normally.`;

      await sandbox.createFile('world/rules/physics.md', content);
      const filePath = sandbox.resolve('world/rules/physics.md');

      const result = await lockFact(sandbox.path, filePath);

      expect(result.success).toBe(true);
      expect(result.factId).toBe('world-physics');
      expect(result.message).toContain('world-physics');
      expect(result.message).toContain('immutable');

      // Verify lock file entry
      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile.facts['world-physics']).toBeDefined();
      expect(lockFile.facts['world-physics'].mutability).toBe('immutable');
      expect(lockFile.facts['world-physics'].hash).toHaveLength(64);
    });

    it('locks append-only fact by path', async () => {
      const content = `---
id: "world-history"
title: "World History"
mutability: "append-only"
established: "2026-01-01"
---

# World History

The Great War happened.`;

      await sandbox.createFile('world/history/great-war.md', content);
      const filePath = sandbox.resolve('world/history/great-war.md');

      const result = await lockFact(sandbox.path, filePath);

      expect(result.success).toBe(true);
      expect(result.message).toContain('append-only');

      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile.facts['world-history'].mutability).toBe('append-only');
      expect(lockFile.facts['world-history']['original-hash']).toBeDefined();
    });

    it('locks expandable fact by path', async () => {
      const content = `---
id: "world-regions"
title: "World Regions"
mutability: "expandable"
established: "2026-01-01"
---

# World Regions

The Northern Kingdom exists.`;

      await sandbox.createFile('world/regions/northern.md', content);
      const filePath = sandbox.resolve('world/regions/northern.md');

      const result = await lockFact(sandbox.path, filePath);

      expect(result.success).toBe(true);
      expect(result.message).toContain('expandable');

      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile.facts['world-regions'].mutability).toBe('expandable');
      expect(lockFile.facts['world-regions']['original-hash']).toBeDefined();
    });

    it('stores correct hash in lock file', async () => {
      const content = `---
id: "test-fact"
mutability: "immutable"
established: "2026-01-01"
---

Content to hash.`;

      await sandbox.createFile('world/test.md', content);
      const filePath = sandbox.resolve('world/test.md');

      await lockFact(sandbox.path, filePath);

      const lockFile = await readLockFile(sandbox.path);
      const expectedHash = computeHash(content);
      expect(lockFile.facts['test-fact'].hash).toBe(expectedHash);
    });

    it('fails if file has no fact ID', async () => {
      const content = `---
title: "No ID"
mutability: "immutable"
---

Content.`;

      await sandbox.createFile('world/no-id.md', content);
      const filePath = sandbox.resolve('world/no-id.md');

      const result = await lockFact(sandbox.path, filePath);

      expect(result.success).toBe(false);
      expect(result.message).toContain('no fact ID');
    });

    it('stores timestamp when locking', async () => {
      const content = `---
id: "test-fact"
mutability: "immutable"
established: "2026-01-01"
---

Content.`;

      await sandbox.createFile('world/test.md', content);
      const filePath = sandbox.resolve('world/test.md');

      const beforeLock = new Date();
      await lockFact(sandbox.path, filePath);
      const afterLock = new Date();

      const lockFile = await readLockFile(sandbox.path);
      const lockedAt = new Date(lockFile.facts['test-fact'].lockedAt);

      expect(lockedAt.getTime()).toBeGreaterThanOrEqual(beforeLock.getTime() - 1000);
      expect(lockedAt.getTime()).toBeLessThanOrEqual(afterLock.getTime() + 1000);
    });

    it('defaults to immutable if no mutability specified', async () => {
      const content = `---
id: "test-fact"
established: "2026-01-01"
---

Content.`;

      await sandbox.createFile('world/test.md', content);
      const filePath = sandbox.resolve('world/test.md');

      await lockFact(sandbox.path, filePath);

      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile.facts['test-fact'].mutability).toBe('immutable');
    });

    it('uses current date if no established date', async () => {
      const content = `---
id: "test-fact"
mutability: "immutable"
---

Content.`;

      await sandbox.createFile('world/test.md', content);
      const filePath = sandbox.resolve('world/test.md');

      await lockFact(sandbox.path, filePath);

      const lockFile = await readLockFile(sandbox.path);
      const today = new Date().toISOString().split('T')[0];
      expect(lockFile.facts['test-fact'].established).toBe(today);
    });
  });

  describe('unlock-fact command', () => {
    const createAndLockFact = async (factId: string, mutability: string = 'immutable') => {
      const content = `---
id: "${factId}"
mutability: "${mutability}"
established: "2026-01-01"
---

Content.`;

      await sandbox.createFile(`world/${factId}.md`, content);
      const filePath = sandbox.resolve(`world/${factId}.md`);
      await lockFact(sandbox.path, filePath);
    };

    it('unlocks immutable fact with reason', async () => {
      await createAndLockFact('test-fact', 'immutable');

      const result = await unlockFact(sandbox.path, 'test-fact', 'Fixing typo');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Unlocked');
      expect(result.message).toContain('test-fact');
      expect(result.message).toContain('Fixing typo');

      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile.facts['test-fact']).toBeUndefined();
    });

    it('unlocks append-only fact with reason', async () => {
      await createAndLockFact('history-fact', 'append-only');

      const result = await unlockFact(sandbox.path, 'history-fact', 'Adding new section');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Unlocked');

      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile.facts['history-fact']).toBeUndefined();
    });

    it('unlocks expandable fact with reason', async () => {
      await createAndLockFact('region-fact', 'expandable');

      const result = await unlockFact(sandbox.path, 'region-fact', 'Adding sub-region');

      expect(result.success).toBe(true);

      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile.facts['region-fact']).toBeUndefined();
    });

    it('fails if fact not locked', async () => {
      const result = await unlockFact(sandbox.path, 'nonexistent', 'Test');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not locked');
    });

    it('removes fact from lock file', async () => {
      await createAndLockFact('fact-1', 'immutable');
      await createAndLockFact('fact-2', 'immutable');

      let lockFile = await readLockFile(sandbox.path);
      expect(Object.keys(lockFile.facts)).toHaveLength(2);

      await unlockFact(sandbox.path, 'fact-1', 'Test');

      lockFile = await readLockFile(sandbox.path);
      expect(Object.keys(lockFile.facts)).toHaveLength(1);
      expect(lockFile.facts['fact-1']).toBeUndefined();
      expect(lockFile.facts['fact-2']).toBeDefined();
    });

    it('preserves other locked facts when unlocking one', async () => {
      await createAndLockFact('keep-this', 'immutable');
      await createAndLockFact('unlock-this', 'immutable');
      await createAndLockFact('keep-this-too', 'append-only');

      await unlockFact(sandbox.path, 'unlock-this', 'Test');

      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile.facts['keep-this']).toBeDefined();
      expect(lockFile.facts['keep-this-too']).toBeDefined();
      expect(lockFile.facts['unlock-this']).toBeUndefined();
    });
  });

  describe('validate-immutability command', () => {
    it('passes when fact matches hash', async () => {
      const content = `---
id: "valid-fact"
mutability: "immutable"
established: "2026-01-01"
---

Unchanged content.`;

      await sandbox.createFile('world/valid.md', content);
      const filePath = sandbox.resolve('world/valid.md');
      await lockFact(sandbox.path, filePath);

      const result = await validateFactFile(sandbox.path, filePath);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.factsValidated).toBe(1);
    });

    it('detects IMMUT-001: modified immutable fact', async () => {
      const originalContent = `---
id: "modified-fact"
mutability: "immutable"
established: "2026-01-01"
---

Original content.`;

      await sandbox.createFile('world/modified.md', originalContent);
      const filePath = sandbox.resolve('world/modified.md');
      await lockFact(sandbox.path, filePath);

      // Modify the file after locking
      const modifiedContent = `---
id: "modified-fact"
mutability: "immutable"
established: "2026-01-01"
---

Modified content.`;

      await fs.writeFile(filePath, modifiedContent);

      const result = await validateFactFile(sandbox.path, filePath);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ValidationErrorCode.IMMUT_001);
      expect(result.errors[0].factId).toBe('modified-fact');
      expect(result.errors[0].expectedHash).toBeDefined();
      expect(result.errors[0].actualHash).toBeDefined();
      expect(result.errors[0].expectedHash).not.toBe(result.errors[0].actualHash);
    });

    it('detects IMMUT-004: established date changed', async () => {
      const originalContent = `---
id: "date-changed"
mutability: "immutable"
established: "2026-01-01"
---

Content.`;

      await sandbox.createFile('world/date-changed.md', originalContent);
      const filePath = sandbox.resolve('world/date-changed.md');
      await lockFact(sandbox.path, filePath);

      // Change the established date
      const modifiedContent = `---
id: "date-changed"
mutability: "immutable"
established: "2025-12-01"
---

Content.`;

      await fs.writeFile(filePath, modifiedContent);

      const result = await validateFactFile(sandbox.path, filePath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCode.IMMUT_004)).toBe(true);
    });

    it('validates multiple files at once', async () => {
      // Create and lock two valid facts
      const content1 = `---
id: "fact-1"
mutability: "immutable"
established: "2026-01-01"
---

Content 1.`;

      const content2 = `---
id: "fact-2"
mutability: "immutable"
established: "2026-01-01"
---

Content 2.`;

      await sandbox.createFile('world/fact1.md', content1);
      await sandbox.createFile('world/fact2.md', content2);

      const filePath1 = sandbox.resolve('world/fact1.md');
      const filePath2 = sandbox.resolve('world/fact2.md');

      await lockFact(sandbox.path, filePath1);
      await lockFact(sandbox.path, filePath2);

      const result = await validateFactFiles(sandbox.path, [filePath1, filePath2]);

      expect(result.valid).toBe(true);
      expect(result.factsValidated).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('returns warnings for unlocked facts', async () => {
      const content = `---
id: "unlocked-fact"
mutability: "immutable"
established: "2026-01-01"
---

Content.`;

      await sandbox.createFile('world/unlocked.md', content);
      const filePath = sandbox.resolve('world/unlocked.md');

      // Don't lock the fact
      const result = await validateFactFile(sandbox.path, filePath);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('not in lock file');
    });

    it('returns warnings for files without fact ID', async () => {
      const content = `---
title: "No ID"
---

Content.`;

      await sandbox.createFile('world/no-id.md', content);
      const filePath = sandbox.resolve('world/no-id.md');

      const result = await validateFactFile(sandbox.path, filePath);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('no fact ID');
    });

    it('aggregates errors from multiple files', async () => {
      const content1 = `---
id: "fact-1"
mutability: "immutable"
established: "2026-01-01"
---

Original.`;

      const content2 = `---
id: "fact-2"
mutability: "immutable"
established: "2026-01-01"
---

Original.`;

      await sandbox.createFile('world/fact1.md', content1);
      await sandbox.createFile('world/fact2.md', content2);

      const filePath1 = sandbox.resolve('world/fact1.md');
      const filePath2 = sandbox.resolve('world/fact2.md');

      await lockFact(sandbox.path, filePath1);
      await lockFact(sandbox.path, filePath2);

      // Modify both files
      await fs.writeFile(filePath1, content1.replace('Original', 'Modified'));
      await fs.writeFile(filePath2, content2.replace('Original', 'Changed'));

      const result = await validateFactFiles(sandbox.path, [filePath1, filePath2]);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].factId).toBe('fact-1');
      expect(result.errors[1].factId).toBe('fact-2');
    });
  });

  describe('formatValidationResult', () => {
    it('formats passing result', () => {
      const result = {
        valid: true,
        errors: [],
        warnings: [],
        factsValidated: 5,
      };

      const formatted = formatValidationResult(result);

      expect(formatted).toContain('✓');
      expect(formatted).toContain('passed');
      expect(formatted).toContain('5 facts');
    });

    it('formats failing result with errors', () => {
      const result = {
        valid: false,
        errors: [
          {
            code: ValidationErrorCode.IMMUT_001,
            message: 'Immutable fact has been modified',
            factId: 'test-fact',
            file: 'world/test.md',
            expectedHash: 'abc123',
            actualHash: 'def456',
          },
        ],
        warnings: [],
        factsValidated: 0,
      };

      const formatted = formatValidationResult(result);

      expect(formatted).toContain('✗');
      expect(formatted).toContain('failed');
      expect(formatted).toContain('IMMUT-001');
      expect(formatted).toContain('test-fact');
      expect(formatted).toContain('world/test.md');
      expect(formatted).toContain('abc123');
      expect(formatted).toContain('def456');
    });

    it('formats result with warnings', () => {
      const result = {
        valid: true,
        errors: [],
        warnings: [
          {
            message: 'Fact not in lock file',
            factId: 'unlocked-fact',
            file: 'world/unlocked.md',
          },
        ],
        factsValidated: 0,
      };

      const formatted = formatValidationResult(result);

      expect(formatted).toContain('Warnings');
      expect(formatted).toContain('unlocked-fact');
      expect(formatted).toContain('not in lock file');
    });
  });

  describe('lock-unlock-relock cycle', () => {
    it('allows re-locking after unlock', async () => {
      const content = `---
id: "cycling-fact"
mutability: "immutable"
established: "2026-01-01"
---

Original content.`;

      await sandbox.createFile('world/cycling.md', content);
      const filePath = sandbox.resolve('world/cycling.md');

      // Lock
      let result = await lockFact(sandbox.path, filePath);
      expect(result.success).toBe(true);

      let lockFile = await readLockFile(sandbox.path);
      const originalHash = lockFile.facts['cycling-fact'].hash;

      // Unlock
      result = await unlockFact(sandbox.path, 'cycling-fact', 'Making changes');
      expect(result.success).toBe(true);

      // Modify
      const modifiedContent = content.replace('Original', 'Modified');
      await fs.writeFile(filePath, modifiedContent);

      // Re-lock
      result = await lockFact(sandbox.path, filePath);
      expect(result.success).toBe(true);

      lockFile = await readLockFile(sandbox.path);
      const newHash = lockFile.facts['cycling-fact'].hash;

      expect(newHash).not.toBe(originalHash);
    });

    it('validation passes after re-locking modified content', async () => {
      const content = `---
id: "validate-cycle"
mutability: "immutable"
established: "2026-01-01"
---

Original.`;

      await sandbox.createFile('world/validate-cycle.md', content);
      const filePath = sandbox.resolve('world/validate-cycle.md');

      // Lock, unlock, modify, re-lock
      await lockFact(sandbox.path, filePath);
      await unlockFact(sandbox.path, 'validate-cycle', 'Test');
      await fs.writeFile(filePath, content.replace('Original', 'Modified'));
      await lockFact(sandbox.path, filePath);

      // Validate should pass with new hash
      const result = await validateFactFile(sandbox.path, filePath);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty lock file', async () => {
      // Create empty lock file
      await writeLockFile(sandbox.path, { version: '1.0.0', facts: {} });

      const content = `---
id: "new-fact"
mutability: "immutable"
established: "2026-01-01"
---

Content.`;

      await sandbox.createFile('world/new.md', content);
      const filePath = sandbox.resolve('world/new.md');

      const result = await lockFact(sandbox.path, filePath);

      expect(result.success).toBe(true);

      const lockFile = await readLockFile(sandbox.path);
      expect(Object.keys(lockFile.facts)).toHaveLength(1);
    });

    it('handles special characters in content', async () => {
      const content = `---
id: "special-chars"
mutability: "immutable"
established: "2026-01-01"
---

# Special Characters

Unicode: 日本語 中文 한국어
Emoji: 🚀 🎉 ✨
Quotes: "double" 'single' \`backtick\`
Math: 1 + 2 = 3, π ≈ 3.14
HTML: <div>&amp;</div>`;

      await sandbox.createFile('world/special.md', content);
      const filePath = sandbox.resolve('world/special.md');

      const result = await lockFact(sandbox.path, filePath);
      expect(result.success).toBe(true);

      const validateResult = await validateFactFile(sandbox.path, filePath);
      expect(validateResult.valid).toBe(true);
    });

    it('handles large content', async () => {
      const longContent = 'x'.repeat(100000);
      const content = `---
id: "large-fact"
mutability: "immutable"
established: "2026-01-01"
---

${longContent}`;

      await sandbox.createFile('world/large.md', content);
      const filePath = sandbox.resolve('world/large.md');

      const result = await lockFact(sandbox.path, filePath);
      expect(result.success).toBe(true);

      const lockFile = await readLockFile(sandbox.path);
      expect(lockFile.facts['large-fact'].hash).toHaveLength(64);
    });

    it('handles deeply nested fact paths', async () => {
      const content = `---
id: "nested-fact"
mutability: "immutable"
established: "2026-01-01"
---

Content.`;

      await sandbox.createFile('world/regions/north/cities/capital/history/founding.md', content);
      const filePath = sandbox.resolve('world/regions/north/cities/capital/history/founding.md');

      const result = await lockFact(sandbox.path, filePath);
      expect(result.success).toBe(true);

      const validateResult = await validateFactFile(sandbox.path, filePath);
      expect(validateResult.valid).toBe(true);
    });
  });
});
