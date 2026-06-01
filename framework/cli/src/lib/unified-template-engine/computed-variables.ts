/**
 * Computed Variables
 *
 * Functions for generating computed template variables (date, number, uuid, user).
 */

import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import type { ComputedVariable } from './types.js';

/**
 * Get current date in ISO format (YYYY-MM-DD)
 */
export function getDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get current datetime in ISO format
 */
export function getDatetime(): string {
  return new Date().toISOString();
}

/**
 * Get current year
 */
export function getYear(): string {
  return new Date().getFullYear().toString();
}

/**
 * Generate a random UUID
 */
export function getUuid(): string {
  return randomUUID();
}

/**
 * Get current git user name (or fallback to system user)
 */
export function getUser(): string {
  try {
    const gitUser = execSync('git config user.name', { encoding: 'utf-8' }).trim();
    if (gitUser) {
      return gitUser;
    }
  } catch {
    // Git not available or not configured
  }

  // Fallback to environment variable
  return process.env.USER || process.env.USERNAME || 'unknown';
}

/**
 * Compute all computed variables based on the list provided
 */
export function computeVariables(
  computedList: ComputedVariable[],
  _options?: {
    numberingDirectory?: string;
    getNextNumber?: () => Promise<number>;
  }
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const varName of computedList) {
    switch (varName) {
      case 'date':
        result.date = getDate();
        break;
      case 'datetime':
        result.datetime = getDatetime();
        break;
      case 'year':
        result.year = getYear();
        break;
      case 'uuid':
        result.uuid = getUuid();
        break;
      case 'user':
        result.user = getUser();
        break;
      case 'number':
        // Number is computed separately via async getNextNumber()
        // Placeholder - will be replaced by the engine
        result.number = '{{number}}';
        break;
    }
  }

  return result;
}

/**
 * Format a number with zero-padding
 */
export function formatNumber(num: number, padding: number): string {
  return num.toString().padStart(padding, '0');
}
