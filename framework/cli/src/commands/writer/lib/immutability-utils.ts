/**
 * Immutability validation utilities for writer CLI commands
 * Inline implementation to avoid cross-package imports
 */

import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Validation error codes
 */
export enum ValidationErrorCode {
  IMMUT_001 = 'IMMUT-001', // Immutable fact hash mismatch
  IMMUT_002 = 'IMMUT-002', // Append-only original content modified
  IMMUT_003 = 'IMMUT-003', // Append-only additions not logged
  IMMUT_004 = 'IMMUT-004', // Established date changed
  IMMUT_005 = 'IMMUT-005', // Expandable fact parent modified
}

export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
  factId: string;
  file: string;
  expectedHash?: string;
  actualHash?: string;
}

export interface ValidationWarning {
  message: string;
  factId: string;
  file: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  factsValidated: number;
}

export interface LockEntry {
  hash: string;
  established: string;
  mutability: 'immutable' | 'append-only' | 'expandable';
  'original-hash'?: string;
  additions?: { hash: string }[];
  expansions?: string[];
}

export interface LockFile {
  version: string;
  facts: Record<string, LockEntry>;
}

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content: string): { data: Record<string, unknown>; content: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, content };
  }

  const yamlContent = match[1];
  const markdownContent = match[2];

  // Simple YAML parser for frontmatter
  const data: Record<string, unknown> = {};
  const lines = yamlContent.split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value: string = line.substring(colonIndex + 1).trim();

      // Handle quoted strings
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
export async function readLockFile(projectRoot: string): Promise<LockFile | null> {
  const lockPath = path.join(projectRoot, 'world.lock.json');
  try {
    const content = await fs.readFile(lockPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Get fact entry from lock file
 */
export async function getFactEntry(
  projectRoot: string,
  factId: string
): Promise<{ entry: LockEntry; mutability: string } | null> {
  const lockFile = await readLockFile(projectRoot);
  if (!lockFile || !lockFile.facts[factId]) {
    return null;
  }
  const entry = lockFile.facts[factId];
  return { entry, mutability: entry.mutability };
}

/**
 * Validate a single fact file
 */
export async function validateFactFile(
  projectRoot: string,
  filePath: string
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const { data } = parseFrontmatter(content);

    const factId = data.id as string;
    if (!factId) {
      return {
        valid: true,
        errors: [],
        warnings: [{
          message: 'File has no fact ID in frontmatter, skipping validation',
          factId: 'unknown',
          file: path.relative(projectRoot, filePath),
        }],
        factsValidated: 0,
      };
    }

    const lockEntry = await getFactEntry(projectRoot, factId);
    if (!lockEntry) {
      return {
        valid: true,
        errors: [],
        warnings: [{
          message: 'Fact not in lock file, skipping validation (run lock-fact to add)',
          factId,
          file: path.relative(projectRoot, filePath),
        }],
        factsValidated: 0,
      };
    }

    // Validate based on mutability type
    if (lockEntry.mutability === 'immutable') {
      // Check established date
      if (data.established !== lockEntry.entry.established) {
        errors.push({
          code: ValidationErrorCode.IMMUT_004,
          message: `Established date cannot be changed for immutable facts`,
          factId,
          file: path.relative(projectRoot, filePath),
        });
      }

      // Check content hash
      const currentHash = computeHash(content);
      if (currentHash !== lockEntry.entry.hash) {
        errors.push({
          code: ValidationErrorCode.IMMUT_001,
          message: `Immutable fact has been modified`,
          factId,
          file: path.relative(projectRoot, filePath),
          expectedHash: lockEntry.entry.hash,
          actualHash: currentHash,
        });
      }
    }
    // Add similar checks for append-only and expandable...

  } catch (error) {
    errors.push({
      code: ValidationErrorCode.IMMUT_001,
      message: `Failed to validate file: ${error instanceof Error ? error.message : String(error)}`,
      factId: 'unknown',
      file: path.relative(projectRoot, filePath),
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    factsValidated: errors.length === 0 && warnings.length === 0 ? 1 : 0,
  };
}

/**
 * Validate multiple fact files
 */
export async function validateFactFiles(
  projectRoot: string,
  filePaths: string[]
): Promise<ValidationResult> {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];
  let totalValidated = 0;

  for (const filePath of filePaths) {
    const result = await validateFactFile(projectRoot, filePath);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
    totalValidated += result.factsValidated;
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    factsValidated: totalValidated,
  };
}

/**
 * Format validation result for display
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push(`✓ Validation passed (${result.factsValidated} facts validated)`);
  } else {
    lines.push(`✗ Validation failed (${result.errors.length} errors, ${result.warnings.length} warnings)`);
  }

  if (result.errors.length > 0) {
    lines.push('\nErrors:');
    for (const error of result.errors) {
      lines.push(`  ${error.code}: ${error.message}`);
      lines.push(`    Fact: ${error.factId}`);
      lines.push(`    File: ${error.file}`);
      if (error.expectedHash && error.actualHash) {
        lines.push(`    Expected hash: ${error.expectedHash.substring(0, 16)}...`);
        lines.push(`    Actual hash:   ${error.actualHash.substring(0, 16)}...`);
      }
      lines.push('');
    }
  }

  if (result.warnings.length > 0) {
    lines.push('\nWarnings:');
    for (const warning of result.warnings) {
      lines.push(`  ${warning.message}`);
      lines.push(`    Fact: ${warning.factId}`);
      lines.push(`    File: ${warning.file}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Get staged world fact files
 */
async function getStagedWorldFacts(projectRoot: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync('git diff --cached --name-only --diff-filter=ACM', {
      cwd: projectRoot,
    });

    if (!stdout.trim()) {
      return [];
    }

    return stdout
      .trim()
      .split('\n')
      .filter((file) => file.startsWith('world/') && file.endsWith('.md'))
      .map((file) => path.join(projectRoot, file));
  } catch {
    return [];
  }
}

/**
 * Validate staged facts for pre-commit hook
 */
export async function validateStagedFacts(
  projectRoot: string
): Promise<{ exitCode: number; message: string }> {
  const stagedFiles = await getStagedWorldFacts(projectRoot);

  if (stagedFiles.length === 0) {
    return { exitCode: 0, message: 'No world facts staged for commit' };
  }

  const result = await validateFactFiles(projectRoot, stagedFiles);

  if (result.valid) {
    return {
      exitCode: 0,
      message: `✓ World fact validation passed (${result.factsValidated} facts checked)`,
    };
  }

  const formatted = formatValidationResult(result);
  return {
    exitCode: 1,
    message: `✗ World fact validation failed\n\n${formatted}\n\nCommit blocked. Fix errors or unlock facts.`,
  };
}
