import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { loadModule, getOptionalDependents } from '../lib/module-loader.js';
import { ManifestManager } from '../lib/manifest-manager.js';
import { generateRegistries } from '../lib/registry-generator.js';
import { recordCLICommand } from '../lib/telemetry/instrumentation/cli-instrumentation.js';
import { CleanupEngine } from '../lib/cleanup-engine.js';

interface RemoveOptions {
  path: string;
  force: boolean;
  dryRun?: boolean;
}

export async function removeCommand(moduleName: string, options: RemoveOptions): Promise<void> {
  const startTime = Date.now();
  const projectPath = path.resolve(options.path);

  console.log(chalk.blue(`\nRemoving module: ${moduleName}\n`));

  // Validate project exists
  if (!await fs.pathExists(path.join(projectPath, 'CLAUDE.md'))) {
    console.error(chalk.red('Error: Not an Agentic Framework project (CLAUDE.md not found)'));
    process.exit(1);
  }

  // Special handling for core module removal
  if (moduleName === 'core') {
    const optionalDependents = await getOptionalDependents('core');

    console.log(chalk.yellow('\nWarning: Removing core module will affect functionality:\n'));
    console.log(chalk.dim('  - Framework management agents (ai-framework-manager, etc.) will be removed'));
    console.log(chalk.dim('  - Shared skills (verifying-quality, committing-code) will be removed'));

    if (optionalDependents.length > 0) {
      console.log(chalk.dim(`  - The following modules have optional dependency on core:`));
      for (const dep of optionalDependents) {
        console.log(chalk.dim(`    • ${dep}`));
      }
    }
    console.log('');
  }

  // Load module before preview
  const module = await loadModule(moduleName);

  // Initialize CleanupEngine
  const cleanupEngine = new CleanupEngine(projectPath, options.dryRun || false);

  // Preview cleanup
  const preview = await cleanupEngine.previewCleanup(module);

  // Show preview
  const hasArtifacts = preview.agents.length > 0 ||
                       preview.skills.length > 0 ||
                       preview.templates.length > 0 ||
                       preview.schemas.length > 0 ||
                       preview.scripts.length > 0;

  if (hasArtifacts) {
    console.log(chalk.bold('\nArtifacts to be removed:'));
    if (preview.agents.length > 0) {
      console.log(chalk.dim(`  Agents: ${preview.agents.length} (${preview.agents.join(', ')})`));
    }
    if (preview.skills.length > 0) {
      console.log(chalk.dim(`  Skills: ${preview.skills.length} (${preview.skills.join(', ')})`));
    }
    if (preview.templates.length > 0) {
      console.log(chalk.dim(`  Templates: ${preview.templates.join(', ')}`));
    }
    if (preview.schemas.length > 0) {
      console.log(chalk.dim(`  Schemas: ${preview.schemas.join(', ')}`));
    }
    if (preview.scripts.length > 0) {
      console.log(chalk.dim(`  Scripts: ${preview.scripts.join(', ')}`));
    }
  } else {
    console.log(chalk.dim('\nNo artifacts found to remove (module may have already been cleaned up).'));
  }

  // Show warnings
  if (preview.warnings.length > 0) {
    console.log(chalk.yellow('\n⚠️  Warnings:'));
    preview.warnings.forEach(w => console.log(chalk.yellow(`  - ${w}`)));
  }

  // If dry-run, exit here
  if (options.dryRun) {
    console.log(chalk.cyan('\n[Dry run mode - no changes made]'));
    return;
  }

  // Confirm removal
  if (!options.force) {
    // Check if stdin is a TTY - inquirer requires interactive terminal
    if (!process.stdin.isTTY) {
      console.error(chalk.red('\nError: Interactive confirmation requires a TTY terminal.'));
      console.error(chalk.dim('Use --force flag to skip confirmation in non-interactive environments.'));
      process.exit(1);
    }

    console.log(''); // Add spacing before prompt
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to remove module '${moduleName}'?`,
        default: false,
      },
    ]);

    if (!confirm) {
      console.log('Removal cancelled');
      process.exit(0);
    }
  }

  // Execute cleanup
  const spinner = ora(`Removing module artifacts: ${moduleName}...`).start();

  try {
    const result = await cleanupEngine.cleanupModule(module);

    const totalRemoved = result.files.length + result.directories.length;
    spinner.succeed(`Module artifacts removed: ${totalRemoved} items`);
  } catch (error) {
    spinner.fail(`Failed to remove module artifacts: ${moduleName}`);
    throw error;
  }

  // Update manifest and registries
  const manifestManager = new ManifestManager(projectPath);

  // Update manifest
  spinner.start('Updating manifest...');
  try {
    if (await manifestManager.exists()) {
      await manifestManager.removeModule(moduleName);
      spinner.succeed('Manifest updated');
    } else {
      spinner.warn('No manifest found - skipping manifest update');
    }
  } catch (error) {
    spinner.fail('Failed to update manifest');
    throw error;
  }

  // Update registries
  spinner.start('Updating registries...');
  try {
    if (await manifestManager.exists()) {
      const manifest = await manifestManager.read();
      const installedModuleIds = Object.keys(manifest.modules);

      // Load all remaining installed modules to regenerate registries
      const installedModules = await Promise.all(
        installedModuleIds.map(async (id) => {
          try {
            return await loadModule(id);
          } catch {
            return null;
          }
        })
      );

      // Filter out any modules that failed to load
      const validModules = installedModules.filter((m) => m !== null);
      await generateRegistries(projectPath, validModules);
    }
    spinner.succeed('Registries updated');
  } catch (error) {
    spinner.fail('Failed to update registries');
    throw error;
  }

  console.log(chalk.green(`\n✓ Module '${moduleName}' removed successfully!\n`));

  // Record telemetry
  const durationMs = Date.now() - startTime;
  recordCLICommand(
    'remove',
    undefined,
    { path: options.path, force: options.force, dryRun: options.dryRun },
    { module_removed: moduleName },
    durationMs,
    true
  ).catch(() => {});
}
