import chalk from 'chalk';
import { RoutesValidator, RoutesValidationResult } from '../lib/routes-validator.js';
import { recordCLICommand } from '../lib/telemetry/instrumentation/cli-instrumentation.js';
import { CliContext } from '../lib/cli-context.js';

interface RoutesOptions {
  path: string;
  json?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
}

/**
 * Check routes.yml synchronization
 */
export async function routesCheckCommand(options: RoutesOptions): Promise<void> {
  const startTime = Date.now();

  // Use CliContext for project resolution
  const ctx = options.path && options.path !== '.'
    ? await CliContext.create({ path: options.path })
    : await CliContext.require();
  const frameworkRoot = ctx.projectRoot;

  try {
    const validator = new RoutesValidator(frameworkRoot);
    const result = await validator.validateRoutes();

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printValidationReport(result, options.verbose ?? false);
    }

    // Record telemetry
    const durationMs = Date.now() - startTime;
    recordCLICommand(
      'routes',
      'check',
      { json: options.json, verbose: options.verbose },
      { synced: result.synced.length, missing: result.missing.length, undefined: result.undefined.length },
      durationMs,
      result.valid
    ).catch(() => {});

    // Exit with error code if not valid
    if (!result.valid) {
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Synchronize routes.yml with filesystem
 */
export async function routesSyncCommand(options: RoutesOptions): Promise<void> {
  const startTime = Date.now();

  // Use CliContext for project resolution
  const ctx = options.path && options.path !== '.'
    ? await CliContext.create({ path: options.path })
    : await CliContext.require();
  const frameworkRoot = ctx.projectRoot;

  try {
    const validator = new RoutesValidator(frameworkRoot);

    // First validate to show what will change
    const result = await validator.validateRoutes();

    if (result.valid) {
      console.log(chalk.green('✅ routes.yml is already in sync with filesystem structure!'));

      // Record telemetry for already synced case
      const durationMs = Date.now() - startTime;
      recordCLICommand(
        'routes',
        'sync',
        { verbose: options.verbose },
        { synced: result.synced.length, missing: 0 },
        durationMs,
        true
      ).catch(() => {});
      return;
    }

    // Show what will be changed
    console.log(chalk.yellow('\n📋 Changes to be applied:\n'));
    printValidationReport(result, true);

    // If dry-run, stop here without applying changes
    if (options.dryRun) {
      console.log(chalk.yellow('\n=== DRY RUN - No changes applied ==='));
      console.log(chalk.dim('Run without --dry-run to apply these changes.\n'));

      // Record telemetry
      const durationMs = Date.now() - startTime;
      recordCLICommand(
        'routes',
        'sync',
        { verbose: options.verbose, dryRun: true },
        { synced: result.synced.length, missing: result.missing.length },
        durationMs,
        true
      ).catch(() => {});
      return;
    }

    // Apply fixes
    console.log(chalk.cyan('\n🔧 Applying fixes...\n'));
    const success = await validator.applyFix();

    if (success) {
      console.log(chalk.green('✅ routes.yml updated successfully'));

      // Validate again to confirm
      const newValidator = new RoutesValidator(frameworkRoot);
      const newResult = await newValidator.validateRoutes();

      if (newResult.valid) {
        console.log(chalk.green('✅ Verification passed - routes.yml is now synchronized'));
      } else {
        console.log(chalk.yellow('⚠️  Warning: Some discrepancies remain'));
        if (options.verbose) {
          printValidationReport(newResult, true);
        }
      }

      // Record telemetry
      const durationMs = Date.now() - startTime;
      recordCLICommand(
        'routes',
        'sync',
        { verbose: options.verbose },
        { synced: newResult.synced.length, missing: newResult.missing.length },
        durationMs,
        newResult.valid
      ).catch(() => {});
    } else {
      console.error(chalk.red('❌ Failed to update routes.yml'));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Print validation report
 */
function printValidationReport(result: RoutesValidationResult, verbose: boolean): void {
  console.log(chalk.bold('\nRoutes.yml Validation Report\n'));
  console.log('─'.repeat(80));

  // Summary statistics
  const totalRoutes = result.synced.length + result.missing.length;
  const totalDirs = result.synced.length + result.undefined.length;

  console.log(`Total paths in routes.yml:  ${totalRoutes}`);
  console.log(`Total directories in filesystem: ${totalDirs}`);
  console.log(`Total discrepancies: ${result.missing.length + result.undefined.length}`);
  console.log();

  // Missing directories (in routes.yml but not filesystem)
  if (result.missing.length > 0) {
    console.log(chalk.red(`❌ MISSING (${result.missing.length} paths):`));
    console.log(chalk.gray('   These paths are defined in routes.yml but don\'t exist in the filesystem:\n'));

    result.missing.forEach(path => {
      console.log(chalk.red(`   ⚠️  ${path}`));
    });
    console.log();
  }

  // Undefined directories (in filesystem but not routes.yml)
  if (result.undefined.length > 0) {
    console.log(chalk.yellow(`✨ UNDEFINED (${result.undefined.length} paths):`));
    console.log(chalk.gray('   These paths exist in the filesystem but aren\'t defined in routes.yml:\n'));

    result.undefined.forEach(path => {
      console.log(chalk.yellow(`   ➕ ${path}`));
    });
    console.log();
  }

  // Synced directories
  if (verbose && result.synced.length > 0) {
    console.log(chalk.green(`✅ SYNCHRONIZED (${result.synced.length} paths):`));
    console.log(chalk.gray('   These paths are correctly synchronized:\n'));

    result.synced.forEach(path => {
      console.log(chalk.green(`   ✓  ${path}`));
    });
    console.log();
  }

  console.log('─'.repeat(80));

  // Overall status
  if (result.valid) {
    console.log(chalk.green('\n✅ ALL PATHS SYNCHRONIZED'));
    console.log(chalk.gray('routes.yml matches current filesystem structure perfectly!'));
  } else {
    console.log(chalk.red('\n❌ SYNCHRONIZATION REQUIRED'));
    console.log(chalk.gray('Run ') + chalk.cyan('agentic-framework routes sync') + chalk.gray(' to fix these issues.'));
  }

  console.log();
}
