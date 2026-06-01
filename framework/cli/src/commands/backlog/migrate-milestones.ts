/**
 * Backlog Migrate Milestones Command
 *
 * CLI command for migrating milestone files from old naming convention
 * to new Jira-based sanitized naming.
 *
 * Migrates: Jan2026.md → apm-r-app-january-2026-w51-w1-w3.md
 *
 * Usage:
 *   agentic-framework backlog:migrate-milestones [path] [options]
 *
 * @module commands/backlog/migrate-milestones
 */

import { Command } from "commander";
import path from "path";
import fs from "fs-extra";
import {
  getMigrationPlan,
  applyMigration,
  validateMilestoneArchitecture,
  printMigrationPlan,
  printValidationResults,
} from "../../lib/backlog/milestone-migrator.js";
import { recordCLICommand } from "../../lib/telemetry/instrumentation/cli-instrumentation.js";

/**
 * Create the migrate-milestones command.
 *
 * @returns Commander command instance
 */
export function createMigrateMilestonesCommand(): Command {
  const command = new Command("migrate-milestones");

  command
    .description("Migrate milestone files to Jira-based sanitized naming")
    .argument("[path]", "Path to backlog directory", "./backlog")
    .option("--dry-run", "Preview changes without applying them", false)
    .option(
      "--validate",
      "Validate milestone architecture after migration",
      false,
    )
    .option("-v, --verbose", "Show detailed progress and logging", false)
    .action(async (backlogPath: string, cmdOptions: unknown) => {
      try {
        await runMigrateCommand(backlogPath, cmdOptions);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`\nError: ${errorMessage}\n`);
        process.exit(1);
      }
    });

  return command;
}

/**
 * Command options interface
 */
interface MigrateCommandOptions {
  dryRun: boolean;
  validate: boolean;
  verbose: boolean;
}

/**
 * Run the migrate command.
 *
 * @param backlogPath - Path to backlog directory
 * @param cmdOptions - Command options
 */
async function runMigrateCommand(
  backlogPath: string,
  cmdOptions: unknown,
): Promise<void> {
  const startTime = Date.now();
  const { dryRun, validate, verbose } = cmdOptions as MigrateCommandOptions;

  // Resolve backlog path
  const backlogDir = path.resolve(backlogPath);

  // Validate backlog directory exists
  if (!(await fs.pathExists(backlogDir))) {
    throw new Error(`Backlog directory not found: ${backlogDir}`);
  }

  const milestonesDir = path.join(backlogDir, "milestones");
  if (!(await fs.pathExists(milestonesDir))) {
    throw new Error(`Milestones directory not found: ${milestonesDir}`);
  }

  // Print header
  console.log("");
  console.log("=".repeat(80));
  console.log("Milestone Migration");
  console.log("=".repeat(80));
  console.log("");
  console.log("Configuration:");
  console.log(`  Backlog Path:   ${backlogDir}`);
  console.log(`  Milestones Dir: ${milestonesDir}`);
  console.log(`  Dry Run:        ${dryRun ? "YES" : "NO"}`);
  console.log(`  Validate:       ${validate ? "YES" : "NO"}`);
  console.log(`  Verbose:        ${verbose ? "YES" : "NO"}`);
  console.log("");

  // Build migration plan
  if (verbose) {
    console.log("Scanning milestones directory...");
  }

  const plan = await getMigrationPlan(milestonesDir);

  // Print migration plan
  printMigrationPlan(plan);

  // Check if there's anything to migrate
  const planEntries = Object.entries(plan);
  if (planEntries.length === 0) {
    console.log("✓ No migration needed");
    console.log("");

    const durationMs = Date.now() - startTime;
    recordCLICommand(
      "backlog",
      "migrate-milestones",
      { dry_run: dryRun, validate },
      { migrated: 0 },
      durationMs,
      true,
    ).catch(() => {});

    // Run validation if requested
    if (validate) {
      console.log("Running validation...");
      console.log("");
      const validationResult = await validateMilestoneArchitecture(
        backlogDir,
        verbose,
      );
      printValidationResults(validationResult);

      if (!validationResult.valid) {
        process.exit(1);
      }
    }

    return;
  }

  // Apply migration
  console.log(
    dryRun ? "[DRY RUN] Previewing changes..." : "Applying migration...",
  );
  console.log("");

  const tracker = await applyMigration(backlogDir, plan, dryRun);

  // Print results
  let migratedCount: number;
  if (dryRun) {
    console.log("[DRY RUN] No changes applied");
    console.log("");
    console.log(`Would migrate ${planEntries.length} milestone(s):`);
    planEntries.forEach(([oldName, entry]) => {
      console.log(`  ${oldName} → ${entry.newFilename}`);
    });
    console.log("");
    console.log("Run without --dry-run to apply these changes");
    migratedCount = planEntries.length;
  } else {
    migratedCount = Object.keys(tracker.changes.milestoneRenames).length;

    if (migratedCount > 0) {
      // Save tracker for rollback capability
      await tracker.save();

      console.log(`✓ Successfully migrated ${migratedCount} milestone(s)`);
      console.log("");
      console.log("Migrated files:");
      Object.entries(tracker.changes.milestoneRenames).forEach(
        ([oldName, newName]) => {
          console.log(`  ✓ ${oldName} → ${newName}`);
        },
      );
      console.log("");
      console.log(
        `Migration tracker saved to: ${path.join(backlogDir, ".migration-tracker.json")}`,
      );
    } else {
      console.log("⚠ No milestones were migrated");
      console.log("");
    }
  }

  const durationMs = Date.now() - startTime;
  recordCLICommand(
    "backlog",
    "migrate-milestones",
    { dry_run: dryRun, validate },
    { migrated: migratedCount },
    durationMs,
    true,
  ).catch(() => {});

  // Run validation if requested
  if (validate && !dryRun) {
    console.log("");
    console.log("Running validation...");
    console.log("");
    const validationResult = await validateMilestoneArchitecture(
      backlogDir,
      verbose,
    );
    printValidationResults(validationResult);

    if (!validationResult.valid) {
      console.log("");
      console.log("⚠ Validation found issues. Please review and fix.");
      process.exit(1);
    }
  }

  console.log("");
}
