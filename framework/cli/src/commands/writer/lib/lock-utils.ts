/**
 * World fact locking utilities for writer CLI commands
 * Inline implementation to avoid cross-package imports
 */

import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface LockEntry {
  hash: string;
  established: string;
  mutability: 'immutable' | 'append-only' | 'expandable';
  lockedAt: string;
  'original-hash'?: string;
  additions?: { hash: string; addedAt: string }[];
  expansions?: string[];
}

export interface LockFile {
  version: string;
  facts: Record<string, LockEntry>;
}

/** Frontmatter data parsed from YAML - values are strings from simple YAML parsing */
type FrontmatterData = Record<string, string>;

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content: string): { data: FrontmatterData; content: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, content };
  }

  const yamlContent = match[1];
  const markdownContent = match[2];

  const data: FrontmatterData = {};
  const lines = yamlContent.split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value: string = line.substring(colonIndex + 1).trim();

      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      data[key] = value;
    }
  }

  return { data, content: markdownContent };
}

/**
 * Compute SHA256 hash of content
 */
export function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Read lock file
 */
export async function readLockFile(projectRoot: string): Promise<LockFile> {
  const lockPath = path.join(projectRoot, 'world.lock.json');
  try {
    const content = await fs.readFile(lockPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { version: '1.0.0', facts: {} };
  }
}

/**
 * Write lock file
 */
export async function writeLockFile(projectRoot: string, lockFile: LockFile): Promise<void> {
  const lockPath = path.join(projectRoot, 'world.lock.json');
  await fs.writeFile(lockPath, JSON.stringify(lockFile, null, 2), 'utf-8');
}

/**
 * Lock a fact file
 */
export async function lockFact(
  projectRoot: string,
  filePath: string
): Promise<{ success: boolean; factId: string; message: string }> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const { data } = parseFrontmatter(content);

    const factId = data.id;
    if (!factId) {
      return { success: false, factId: '', message: 'File has no fact ID in frontmatter' };
    }

    const mutability = data.mutability || 'immutable';
    const established = data.established || new Date().toISOString().split('T')[0];

    const lockFile = await readLockFile(projectRoot);
    const hash = computeHash(content);

    lockFile.facts[factId] = {
      hash,
      established,
      mutability: mutability as 'immutable' | 'append-only' | 'expandable',
      lockedAt: new Date().toISOString(),
    };

    if (mutability === 'append-only' || mutability === 'expandable') {
      lockFile.facts[factId]['original-hash'] = hash;
    }

    await writeLockFile(projectRoot, lockFile);

    return {
      success: true,
      factId,
      message: `Locked fact ${factId} as ${mutability}`,
    };
  } catch (error) {
    return {
      success: false,
      factId: '',
      message: `Failed to lock fact: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Unlock a fact
 */
export async function unlockFact(
  projectRoot: string,
  factId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    const lockFile = await readLockFile(projectRoot);

    if (!lockFile.facts[factId]) {
      return { success: false, message: `Fact ${factId} is not locked` };
    }

    delete lockFile.facts[factId];
    await writeLockFile(projectRoot, lockFile);

    return {
      success: true,
      message: `Unlocked fact ${factId}. Reason: ${reason}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to unlock fact: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
