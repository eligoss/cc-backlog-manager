/**
 * CSV validation and data extraction for Jira imports.
 *
 * Validates CSV schema, extracts sprint/milestone data, and validates
 * argument formats before import processing.
 *
 * @module jira-validators
 */

import fs from 'fs-extra';
import { parse } from 'csv-parse/sync';

/**
 * CSV validation error
 */
export class CsvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvValidationError';
  }
}

/**
 * Result of CSV validation
 */
export interface CsvValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Data extracted from CSV for import
 */
export interface CsvExtraction {
  sprintName?: string;
  milestoneName?: string;
  uniqueSprints: string[];
  uniqueMilestones: string[];
  hasSprintColumn: boolean;
  hasFixVersionsColumn: boolean;
}

/**
 * Result of argument validation
 */
export interface ArgumentValidationResult {
  valid: boolean;
  errors: string[];
}

// Required columns for different import types
const SPRINT_REQUIRED_COLUMNS = ['Issue key', 'Sprint'];
const MILESTONE_REQUIRED_COLUMNS = ['Issue key', 'Fix Versions'];
const COMMON_REQUIRED_COLUMNS = ['Issue key', 'Summary', 'Issue Type', 'Description'];

/**
 * Validate CSV file schema and required columns.
 *
 * @param csvPath - Path to CSV file
 * @param importType - 'sprint' or 'milestone'
 * @param verbose - Print detailed validation messages
 * @returns Validation result with errors
 */
export async function validateCsvSchema(
  csvPath: string,
  importType: 'sprint' | 'milestone',
  verbose: boolean = false
): Promise<CsvValidationResult> {
  const errors: string[] = [];

  // Check file exists
  if (!(await fs.pathExists(csvPath))) {
    errors.push(`CSV file not found: ${csvPath}`);
    return { valid: false, errors };
  }

  try {
    // Read CSV file
    const content = await fs.readFile(csvPath, 'utf-8');

    // Parse CSV
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relaxColumnCount: true,
    }) as Record<string, string>[];

    // Check if CSV has headers
    if (!records || records.length === 0) {
      // Check if file is completely empty
      const firstRecord = parse(content, {
        columns: false,
        skip_empty_lines: true,
      });
      if (!firstRecord || firstRecord.length === 0) {
        errors.push('CSV file is empty or has no headers');
        return { valid: false, errors };
      }
    }

    // Get fieldnames from first record
    const firstRecord = records[0] || {};
    const fieldnames = Object.keys(firstRecord);

    if (fieldnames.length === 0) {
      errors.push('CSV file is empty or has no headers');
      return { valid: false, errors };
    }

    if (verbose) {
      console.error(`ℹ️  Found ${fieldnames.length} columns in CSV`);
    }

    // Create case-insensitive lookup
    const fieldnamesLower: Record<string, string> = {};
    fieldnames.forEach(f => {
      fieldnamesLower[f.toLowerCase()] = f;
    });

    // Check common required columns (case-insensitive)
    for (const col of COMMON_REQUIRED_COLUMNS) {
      if (!(col.toLowerCase() in fieldnamesLower)) {
        errors.push(`Missing required column: ${col}`);
      }
    }

    // Check type-specific required columns (case-insensitive)
    if (importType === 'sprint') {
      for (const col of SPRINT_REQUIRED_COLUMNS) {
        if (!(col.toLowerCase() in fieldnamesLower)) {
          errors.push(`Missing required column for sprint import: ${col}`);
        }
      }
    } else if (importType === 'milestone') {
      for (const col of MILESTONE_REQUIRED_COLUMNS) {
        if (!(col.toLowerCase() in fieldnamesLower)) {
          errors.push(`Missing required column for milestone import: ${col}`);
        }
      }
    } else {
      errors.push(`Invalid import_type: ${importType}. Must be 'sprint' or 'milestone'`);
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // Validate data rows (only require Issue key and Summary)
    const issueKeyCol = fieldnamesLower['issue key'];
    const summaryCol = fieldnamesLower['summary'];

    records.forEach((row, index) => {
      const rowNum = index + 1;

      // Check Issue key is not empty
      if (issueKeyCol && !row[issueKeyCol]?.trim()) {
        errors.push(`Row ${rowNum}: Issue key is empty`);
      }

      // Check Summary is not empty
      if (summaryCol && !row[summaryCol]?.trim()) {
        errors.push(`Row ${rowNum}: Summary is empty`);
      }
    });

    if (verbose) {
      console.error(`ℹ️  Validated ${records.length} data rows`);
    }
  } catch (error) {
    if (error instanceof Error) {
      errors.push(`CSV parsing error: ${error.message}`);
    } else {
      errors.push(`Unexpected error reading CSV: ${String(error)}`);
    }
    return { valid: false, errors };
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Extract sprint data from CSV file.
 *
 * Identifies unique sprints in the CSV and extracts sprint names
 * from the Sprint column.
 *
 * @param csvPath - Path to CSV file
 * @param verbose - Print extraction details
 * @returns CSV extraction with unique sprints identified
 */
export async function extractSprintDataFromCsv(
  csvPath: string,
  verbose: boolean = false
): Promise<CsvExtraction> {
  const extraction: CsvExtraction = {
    hasSprintColumn: false,
    hasFixVersionsColumn: false,
    uniqueSprints: [],
    uniqueMilestones: [],
  };

  try {
    const content = await fs.readFile(csvPath, 'utf-8');

    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relaxColumnCount: true,
    }) as Record<string, string>[];

    if (!records || records.length === 0) {
      return extraction;
    }

    // Find 'Sprint' column (case-insensitive)
    const firstRecord = records[0];
    const fieldnames = Object.keys(firstRecord);
    const fieldnamesLower: Record<string, string> = {};
    fieldnames.forEach(f => {
      fieldnamesLower[f.toLowerCase()] = f;
    });

    const sprintCol = fieldnamesLower['sprint'];
    if (!sprintCol) {
      return extraction;
    }

    extraction.hasSprintColumn = true;
    const uniqueSprints = new Set<string>();

    records.forEach((row) => {
      const sprint = row[sprintCol]?.trim();
      if (sprint) {
        uniqueSprints.add(sprint);
      }
    });

    extraction.uniqueSprints = Array.from(uniqueSprints).sort();

    if (extraction.uniqueSprints.length > 0) {
      extraction.sprintName = extraction.uniqueSprints[0];
      if (verbose) {
        console.error(`ℹ️  Found ${extraction.uniqueSprints.length} unique sprint(s): ${extraction.uniqueSprints}`);
        if (extraction.uniqueSprints.length > 1) {
          console.error(`⚠️  CSV contains multiple sprints. Using first: ${extraction.sprintName}`);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error extracting sprint data: ${error}`);
  }

  return extraction;
}

/**
 * Extract milestone data from CSV file.
 *
 * Identifies unique milestones in the CSV and extracts milestone names
 * from the Fix Versions column.
 *
 * @param csvPath - Path to CSV file
 * @param verbose - Print extraction details
 * @returns CSV extraction with unique milestones identified
 */
export async function extractMilestoneDataFromCsv(
  csvPath: string,
  verbose: boolean = false
): Promise<CsvExtraction> {
  const extraction: CsvExtraction = {
    hasSprintColumn: false,
    hasFixVersionsColumn: false,
    uniqueSprints: [],
    uniqueMilestones: [],
  };

  try {
    const content = await fs.readFile(csvPath, 'utf-8');

    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relaxColumnCount: true,
    }) as Record<string, string>[];

    if (!records || records.length === 0) {
      return extraction;
    }

    // Find 'Fix Versions' column (case-insensitive)
    const firstRecord = records[0];
    const fieldnames = Object.keys(firstRecord);
    const fieldnamesLower: Record<string, string> = {};
    fieldnames.forEach(f => {
      fieldnamesLower[f.toLowerCase()] = f;
    });

    const fixVersionsCol = fieldnamesLower['fix versions'];
    if (!fixVersionsCol) {
      return extraction;
    }

    extraction.hasFixVersionsColumn = true;
    const uniqueMilestones = new Set<string>();

    records.forEach((row) => {
      const fixVersions = row[fixVersionsCol]?.trim();
      if (fixVersions) {
        // Parse milestone name (takes first if multiple, preserves parentheses)
        const milestoneName = parseMilestoneNameFromFixVersions(fixVersions);
        if (milestoneName) {
          uniqueMilestones.add(milestoneName);
        }
      }
    });

    extraction.uniqueMilestones = Array.from(uniqueMilestones).sort();

    if (extraction.uniqueMilestones.length > 0) {
      extraction.milestoneName = extraction.uniqueMilestones[0];
      if (verbose) {
        console.error(`ℹ️  Found ${extraction.uniqueMilestones.length} unique milestone(s): ${extraction.uniqueMilestones}`);
        if (extraction.uniqueMilestones.length > 1) {
          console.error(`⚠️  CSV contains multiple milestones. Using first: ${extraction.milestoneName}`);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error extracting milestone data: ${error}`);
  }

  return extraction;
}

/**
 * Parse milestone name from Fix Versions string.
 *
 * Fix Versions often contains descriptive milestone names.
 * Example: "January 2026 (W51, W1, W3)" -> "January 2026 (W51, W1, W3)"
 * Example: "January 2026, February 2026" -> "January 2026"
 *
 * Handles multiple top-level milestones by taking the first one,
 * while preserving commas inside parentheses.
 *
 * @param fixVersions - Raw Fix Versions value from CSV
 * @returns Parsed milestone name or null
 */
export function parseMilestoneNameFromFixVersions(fixVersions: string): string | null {
  if (!fixVersions) {
    return null;
  }

  // Split only on top-level commas (not inside parentheses)
  const parts: string[] = [];
  const currentPart: string[] = [];
  let parenDepth = 0;

  for (const char of fixVersions) {
    if (char === '(') {
      parenDepth++;
      currentPart.push(char);
    } else if (char === ')') {
      parenDepth--;
      currentPart.push(char);
    } else if (char === ',' && parenDepth === 0) {
      // Top-level comma - split here
      parts.push(currentPart.join('').trim());
      currentPart.length = 0;
    } else {
      currentPart.push(char);
    }
  }

  // Add the last part
  if (currentPart.length > 0) {
    parts.push(currentPart.join('').trim());
  }

  // Return first milestone
  return parts.length > 0 && parts[0] ? parts[0] : null;
}

/**
 * Validate sprint ID format (local ID like "2025-W45").
 *
 * Sprint IDs should be: YYYY-WXX format
 *
 * @param sprintId - Sprint ID to validate
 * @returns True if valid format, false otherwise
 */
export function validateSprintIdFormat(sprintId: string): boolean {
  if (!sprintId) {
    return false;
  }

  // Pattern: YYYY-WXX (e.g., "2025-W45")
  const pattern = /^\d{4}-W\d{1,2}$/;
  return pattern.test(sprintId);
}

/**
 * Validate Jira sprint ID format (numeric only).
 *
 * Jira sprint IDs are numeric values (e.g., "16786")
 *
 * @param jiraSprintId - Jira sprint ID to validate
 * @returns True if valid format, false otherwise
 */
export function validateJiraSprintIdFormat(jiraSprintId: string): boolean {
  if (!jiraSprintId) {
    return false;
  }

  // Jira sprint IDs are numeric
  return /^\d+$/.test(jiraSprintId);
}

/**
 * Validate milestone ID format (alphanumeric like "Jan2026").
 *
 * Milestone IDs should be: Month + Year format (e.g., "Jan2026", "Nov2025")
 *
 * @param milestoneId - Milestone ID to validate
 * @returns True if valid format, false otherwise
 */
export function validateMilestoneIdFormat(milestoneId: string): boolean {
  if (!milestoneId) {
    return false;
  }

  // Pattern: 3-letter month abbreviation + 4-digit year (e.g., "Jan2026")
  const pattern = /^[A-Z][a-z]{2}\d{4}$/;
  return pattern.test(milestoneId);
}

/**
 * Validate command-line arguments based on import type.
 *
 * Checks that arguments are in correct format and appropriate for the
 * specified import type.
 *
 * @param argsDict - Dictionary of parsed arguments
 * @param importType - 'sprint' or 'milestone'
 * @returns Validation result with errors
 */
export function validateArguments(
  argsDict: Record<string, string>,
  importType: 'sprint' | 'milestone'
): ArgumentValidationResult {
  const errors: string[] = [];

  // Type must be specified
  if (importType !== 'sprint' && importType !== 'milestone') {
    errors.push(`Invalid --type: ${importType}. Must be 'sprint' or 'milestone'`);
  }

  // Validate sprint-specific arguments
  if (importType === 'sprint') {
    if (argsDict.sprintId && argsDict.sprintId.trim()) {
      if (!validateSprintIdFormat(argsDict.sprintId)) {
        errors.push(`Invalid sprint ID format: ${argsDict.sprintId}. Expected YYYY-WXX (e.g., 2025-W45)`);
      }
    }

    if (argsDict.jiraSprintId && argsDict.jiraSprintId.trim()) {
      if (!validateJiraSprintIdFormat(argsDict.jiraSprintId)) {
        errors.push(`Invalid Jira sprint ID format: ${argsDict.jiraSprintId}. Expected numeric (e.g., 16786)`);
      }
    }
  }

  // Validate milestone-specific arguments
  if (importType === 'milestone') {
    if (argsDict.milestoneId && argsDict.milestoneId.trim()) {
      if (!validateMilestoneIdFormat(argsDict.milestoneId)) {
        errors.push(`Invalid milestone ID format: ${argsDict.milestoneId}. Expected MonthYYYY (e.g., Jan2026)`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
