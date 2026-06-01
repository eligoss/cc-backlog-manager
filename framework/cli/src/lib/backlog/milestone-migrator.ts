/**
 * Milestone Migration Module
 *
 * Ported from Python: modules/backlog/src/backlog/migrate_milestones.py
 *                     modules/backlog/src/backlog/validate_milestone_migration.py
 *
 * Handles migration of milestone files from local ID naming convention
 * (Jan2026.md) to Jira source-of-truth naming (apm-r-app-january-2026-w51-w1-w3.md).
 *
 * Features:
 * - Detect old milestone format
 * - Convert to new format preserving data
 * - Validate migration success
 * - Track changes for rollback
 *
 * @module milestone-migrator
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { parseFrontmatter } from '../common/yaml-frontmatter.js';
import { sanitizeMilestoneName, validateMilestoneFilename } from './milestone-sanitizer.js';

/**
 * Milestone metadata extracted from frontmatter
 */
export interface MilestoneMetadata {
  /** Jira milestone name */
  milestoneName?: string;
  /** Jira milestone ID */
  jiraMilestoneId?: string;
}

/**
 * Migration plan entry for a single milestone
 */
export interface MigrationPlanEntry {
  /** New sanitized filename */
  newFilename: string;
  /** Original Jira milestone name */
  milestoneName?: string;
  /** Jira milestone ID */
  jiraMilestoneId?: string;
}

/**
 * Complete migration plan mapping old filenames to new filenames
 */
export interface MigrationPlan {
  [oldFilename: string]: MigrationPlanEntry;
}

/**
 * Migration changes tracking data
 */
export interface MigrationChanges {
  /** Timestamp of migration */
  timestamp: string;
  /** Old filename to new filename mapping */
  milestoneRenames: { [oldName: string]: string };
  /** List of ticket files updated */
  ticketUpdates: string[];
}

/**
 * Validation result for milestone architecture
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** List of errors found */
  errors: string[];
  /** List of warnings found */
  warnings: string[];
}

/**
 * Track migration changes for reporting and rollback
 */
export class MigrationTracker {
  public changes: MigrationChanges;
  private trackerFile: string;

  constructor(trackerFile?: string) {
    this.trackerFile = trackerFile || '.migration-tracker.json';
    this.changes = {
      timestamp: new Date().toISOString(),
      milestoneRenames: {},
      ticketUpdates: [],
    };
  }

  /**
   * Track a milestone file rename
   */
  addRename(oldName: string, newName: string): void {
    this.changes.milestoneRenames[oldName] = newName;
  }

  /**
   * Track a ticket file update
   */
  addTicketUpdate(ticketPath: string): void {
    this.changes.ticketUpdates.push(ticketPath);
  }

  /**
   * Save migration tracking file
   */
  async save(): Promise<void> {
    await fs.writeJson(this.trackerFile, this.changes, { spaces: 2 });
  }

  /**
   * Load migration tracking file
   */
  static async load(trackerFile?: string): Promise<MigrationChanges | null> {
    const file = trackerFile || '.migration-tracker.json';
    if (!(await fs.pathExists(file))) {
      return null;
    }
    return await fs.readJson(file);
  }
}

/**
 * Extract milestone name and Jira ID from milestone file frontmatter.
 *
 * @param milestoneFile - Path to milestone markdown file
 * @returns Milestone metadata or empty object if not found
 * @throws {Error} If file cannot be read
 */
export async function readMilestoneMetadata(milestoneFile: string): Promise<MilestoneMetadata> {
  const content = await fs.readFile(milestoneFile, 'utf-8');
  const { data } = parseFrontmatter(content);

  return {
    milestoneName: data.milestoneName as string | undefined,
    jiraMilestoneId: data.jiraMilestoneId as string | undefined,
  };
}

/**
 * Check if a milestone filename is already sanitized.
 *
 * A milestone is considered already sanitized if:
 * - It's all lowercase
 * - Contains only hyphens (no unsafe chars)
 * - No consecutive hyphens
 *
 * @param filename - Milestone filename to check
 * @returns True if already sanitized, false otherwise
 */
function isAlreadySanitized(filename: string): boolean {
  // Skip template files
  if (filename.startsWith('.')) {
    return true;
  }

  // Check if it matches sanitization pattern
  return validateMilestoneFilename(filename);
}

/**
 * Build migration plan for all milestones in a directory.
 *
 * Scans milestone directory and identifies files that need migration.
 * Skips already-sanitized files and files without Jira metadata.
 *
 * @param milestonesDir - Path to milestones directory
 * @returns Migration plan mapping old filenames to new filenames
 *
 * @example
 * ```typescript
 * const plan = await getMigrationPlan('/path/to/backlog/milestones');
 * // Returns: {
 * //   'Jan2026.md': {
 * //     newFilename: 'apm-r-app-january-2026-w51-w1-w3.md',
 * //     milestoneName: 'APM-R: App: January 2026 (W51, W1, W3)',
 * //     jiraMilestoneId: undefined
 * //   }
 * // }
 * ```
 */
export async function getMigrationPlan(milestonesDir: string): Promise<MigrationPlan> {
  const plan: MigrationPlan = {};

  // Find all milestone files
  const pattern = path.join(milestonesDir, '*.md');
  const files = await glob(pattern, { absolute: true });

  for (const filePath of files.sort()) {
    const filename = path.basename(filePath);

    // Skip already-sanitized files
    if (isAlreadySanitized(filename)) {
      continue;
    }

    try {
      // Read metadata to get Jira name
      const metadata = await readMilestoneMetadata(filePath);

      if (metadata.milestoneName) {
        // Generate new sanitized filename from Jira name
        const newFilename = sanitizeMilestoneName(metadata.milestoneName);

        plan[filename] = {
          newFilename,
          milestoneName: metadata.milestoneName,
          jiraMilestoneId: metadata.jiraMilestoneId,
        };
      }
      // If no milestoneName, skip this file (will be logged as warning)
    } catch (error) {
      // Skip files that can't be read
      console.warn(`Warning: Could not read ${filePath}:`, error);
    }
  }

  return plan;
}

/**
 * Apply the migration plan to rename milestone files.
 *
 * Renames files according to the migration plan and tracks all changes.
 * In dry-run mode, no files are actually changed.
 *
 * @param backlogDir - Base backlog directory
 * @param plan - Migration plan from getMigrationPlan()
 * @param dryRun - If true, preview changes only without applying
 * @returns Migration tracker with all changes recorded
 *
 * @example
 * ```typescript
 * const plan = await getMigrationPlan(milestonesDir);
 * const tracker = await applyMigration('/path/to/backlog', plan, false);
 * await tracker.save(); // Save for rollback capability
 * ```
 */
export async function applyMigration(
  backlogDir: string,
  plan: MigrationPlan,
  dryRun: boolean = false
): Promise<MigrationTracker> {
  const tracker = new MigrationTracker(path.join(backlogDir, '.migration-tracker.json'));
  const milestonesDir = path.join(backlogDir, 'milestones');

  const entries = Object.entries(plan).sort();

  if (entries.length === 0) {
    return tracker;
  }

  for (const [oldName, entry] of entries) {
    const oldPath = path.join(milestonesDir, oldName);
    const newPath = path.join(milestonesDir, entry.newFilename);

    // Check if target already exists
    if (await fs.pathExists(newPath)) {
      console.warn(`Warning: ${entry.newFilename} already exists, skipping`);
      continue;
    }

    if (dryRun) {
      // Just preview, don't actually rename
      continue;
    }

    try {
      await fs.move(oldPath, newPath);
      tracker.addRename(oldName, entry.newFilename);
    } catch (error) {
      console.error(`Failed to rename ${oldName}:`, error);
    }
  }

  return tracker;
}

/**
 * Validate milestone architecture compliance.
 *
 * Checks that:
 * 1. Milestone files use sanitized Jira names for filenames
 * 2. Ticket files don't have deprecated 'milestone:' field
 * 3. Milestone files have Jira metadata (milestoneName or jiraMilestoneId)
 *
 * @param backlogDir - Path to backlog directory
 * @param verbose - If true, show detailed validation for each file
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const result = await validateMilestoneArchitecture('/path/to/backlog', false);
 * if (!result.valid) {
 *   console.error('Validation failed:', result.errors);
 * }
 * ```
 */
export async function validateMilestoneArchitecture(
  backlogDir: string,
  verbose: boolean = false
): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  const milestonesDir = path.join(backlogDir, 'milestones');
  const ticketsDir = path.join(backlogDir, 'tickets');

  // Validate milestones directory exists
  if (!(await fs.pathExists(milestonesDir))) {
    result.valid = false;
    result.errors.push(`Milestones directory not found: ${milestonesDir}`);
    return result;
  }

  // Validate milestone files
  await validateMilestoneFiles(milestonesDir, result, verbose);

  // Validate ticket files (if tickets directory exists)
  if (await fs.pathExists(ticketsDir)) {
    await validateTicketFiles(ticketsDir, backlogDir, result, verbose);
  }

  return result;
}

/**
 * Validate milestone file structure
 */
async function validateMilestoneFiles(
  milestonesDir: string,
  result: ValidationResult,
  verbose: boolean
): Promise<void> {
  const pattern = path.join(milestonesDir, '*.md');
  const files = await glob(pattern, { absolute: true });

  for (const filePath of files) {
    const filename = path.basename(filePath);

    // Skip template files
    if (filename.startsWith('.')) {
      continue;
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const { data } = parseFrontmatter(content);

      // Validate 1: No deprecated "milestone:" field in frontmatter
      if (data.milestone) {
        result.errors.push(`${filename}: YAML contains deprecated 'milestone:' field`);
        result.valid = false;
      }

      // Validate 2: Has milestoneName or jiraMilestoneId
      const hasJiraMetadata = data.milestoneName || data.jiraMilestoneId;
      if (!hasJiraMetadata) {
        // Only warn for actual milestone files
        if (!filename.includes('Demo') && !filename.includes('UC') && !filename.includes('Post')) {
          result.warnings.push(
            `${filename}: Missing Jira metadata (milestoneName or jiraMilestoneId)`
          );
        }
      }

      // Validate 3: Filename is sanitized
      if (!validateMilestoneFilename(filename)) {
        result.warnings.push(`${filename}: Filename may not be properly sanitized`);
      }

      if (verbose) {
        console.log(`  ✓ ${filename}`);
      }
    } catch (error) {
      result.errors.push(`Failed to read ${filename}: ${error}`);
      result.valid = false;
    }
  }
}

/**
 * Validate all ticket files
 */
async function validateTicketFiles(
  ticketsDir: string,
  backlogDir: string,
  result: ValidationResult,
  verbose: boolean
): Promise<void> {
  const ticketTypes = ['stories', 'tasks', 'bugs', 'spikes'];
  const ticketsWithMilestoneField: string[] = [];

  for (const ticketType of ticketTypes) {
    const typeDir = path.join(ticketsDir, ticketType);

    if (!(await fs.pathExists(typeDir))) {
      continue;
    }

    const pattern = path.join(typeDir, '*.md');
    const files = await glob(pattern, { absolute: true });

    for (const filePath of files) {
      // Skip README files
      if (filePath.endsWith('README.md')) {
        continue;
      }

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const { data } = parseFrontmatter(content);

        if (data.milestone) {
          const relativePath = path.relative(backlogDir, filePath);
          ticketsWithMilestoneField.push(relativePath);
        }
      } catch (error) {
        result.errors.push(`Failed to read ${filePath}: ${error}`);
        result.valid = false;
      }
    }
  }

  if (ticketsWithMilestoneField.length > 0) {
    result.valid = false;
    result.warnings.push(
      `Found ${ticketsWithMilestoneField.length} tickets with deprecated 'milestone:' field`
    );

    if (verbose) {
      ticketsWithMilestoneField.slice(0, 10).forEach((ticket) => {
        result.warnings.push(`  - ${ticket}`);
      });

      if (ticketsWithMilestoneField.length > 10) {
        result.warnings.push(`  ... and ${ticketsWithMilestoneField.length - 10} more`);
      }
    }
  }
}

/**
 * Print migration plan for user review
 *
 * @param plan - Migration plan to display
 */
export function printMigrationPlan(plan: MigrationPlan): void {
  console.log('');
  console.log('='.repeat(80));
  console.log('MIGRATION PLAN');
  console.log('='.repeat(80));

  const entries = Object.entries(plan).sort();

  if (entries.length === 0) {
    console.log('No milestones to migrate (all already using Jira names)');
    return;
  }

  for (const [oldName, entry] of entries) {
    console.log('');
    console.log(oldName);
    console.log(`  → ${entry.newFilename}`);
    if (entry.milestoneName) {
      console.log(`  Jira: ${entry.milestoneName}`);
    }
    if (entry.jiraMilestoneId) {
      console.log(`  ID: ${entry.jiraMilestoneId}`);
    }
  }

  console.log('');
  console.log('='.repeat(80));
  console.log(`Total milestones to migrate: ${entries.length}`);
  console.log('='.repeat(80));
  console.log('');
}

/**
 * Print validation results
 *
 * @param result - Validation result to display
 */
export function printValidationResults(result: ValidationResult): void {
  console.log('='.repeat(80));
  console.log('VALIDATION RESULTS');
  console.log('='.repeat(80));
  console.log('');

  if (result.valid && result.errors.length === 0 && result.warnings.length === 0) {
    console.log('✓ All validations passed!');
    console.log('');
    console.log('Architecture Status:');
    console.log('  ✓ Milestone files use Jira source-of-truth');
    console.log('  ✓ No deprecated \'milestone:\' fields in tickets');
    console.log('  ✓ New naming convention is active');
    console.log('');
    console.log('='.repeat(80));
    return;
  }

  if (result.errors.length > 0) {
    console.log(`✗ ${result.errors.length} ERRORS:`);
    result.errors.forEach((error) => {
      console.log(`   ${error}`);
    });
    console.log('');
  }

  if (result.warnings.length > 0) {
    console.log(`⚠ ${result.warnings.length} WARNINGS:`);
    result.warnings.slice(0, 10).forEach((warning) => {
      console.log(`   ${warning}`);
    });
    if (result.warnings.length > 10) {
      console.log(`   ... and ${result.warnings.length - 10} more`);
    }
    console.log('');
  }

  console.log('='.repeat(80));
}
