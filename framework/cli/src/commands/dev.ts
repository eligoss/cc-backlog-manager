import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import { fileURLToPath } from 'url';
import { loadModule, getAvailableModules } from '../lib/module-loader.js';
import { SyncEngine } from '../lib/sync-engine.js';
import { generateRegistries } from '../lib/registry-generator.js';
import { recordCLICommand } from '../lib/telemetry/instrumentation/cli-instrumentation.js';

// Use different variable names to avoid conflict with CommonJS globals in Jest
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);

export interface DevOptions {
  sync?: boolean;
  status?: boolean;
  clean?: boolean;
  link?: boolean;
  unlink?: boolean;
  build?: boolean;  // --no-build sets this to false
}

/**
 * Resolve framework SOURCE root for dev command.
 *
 * Unlike getFrameworkRoot() which may return the bundled framework,
 * this always returns the source framework directory.
 *
 * Path: framework/cli/dist/commands/dev.js → framework/
 */
function getSourceFrameworkRoot(): string {
  // From framework/cli/dist/commands/ go up to framework/
  return path.resolve(currentDirPath, '..', '..', '..');
}

/**
 * Dev command: Set up the framework for self-development
 *
 * Configures the framework repository to use its own modules for
 * development work on the framework itself.
 */
export async function devCommand(options: DevOptions): Promise<void> {
  const startTime = Date.now();
  // Use source path, not bundled path
  const frameworkRoot = getSourceFrameworkRoot();
  const repoRoot = path.resolve(frameworkRoot, '..');

  console.log(chalk.blue('\nAgentic Development Framework - Dev Setup\n'));

  // Validate we're in framework source repo
  const frameworkDirExists = await fs.pathExists(frameworkRoot);
  if (!frameworkDirExists) {
    console.error(chalk.red('Error: Not in framework source repository'));
    console.log(chalk.dim('Expected to find framework/ directory at repo root\n'));
    process.exit(1);
  }

  const spinner = ora();

  // Handle --status option
  if (options.status) {
    spinner.start('Checking dev setup status...');

    const manifestPath = path.join(repoRoot, '.agentic-framework.json');
    const manifestExists = await fs.pathExists(manifestPath);

    if (!manifestExists) {
      spinner.fail('Dev setup not initialized');
      console.log(chalk.yellow('\nDev setup is not configured.'));
      console.log(chalk.dim('Run "agentic-framework dev" to set up.\n'));
      process.exit(1);
    }

    const manifest = await fs.readJson(manifestPath);
    const claudeDir = path.join(repoRoot, '.claude');
    const _aiDir = path.join(repoRoot, 'ai');

    spinner.succeed('Dev setup status:');
    console.log(`  Manifest: ${chalk.green('✓')} ${manifestPath}`);
    console.log(`  Type: ${chalk.cyan(manifest.type || 'unknown')}`);
    console.log(`  Self-dev: ${manifest.selfDev ? chalk.green('✓') : chalk.red('✗')}`);
    console.log(`  Modules: ${chalk.cyan(manifest.modules?.length || 0)}`);
    console.log(`  .claude/: ${await fs.pathExists(claudeDir) ? chalk.green('✓') : chalk.red('✗')}`);
    console.log();

    // Record telemetry
    const durationMs = Date.now() - startTime;
    recordCLICommand(
      'dev',
      undefined,
      { status: true },
      { action: 'status' },
      durationMs,
      true
    ).catch(() => {});
    return;
  }

  // Handle --clean option
  if (options.clean) {
    spinner.start('Cleaning dev setup...');

    const manifestPath = path.join(repoRoot, '.agentic-framework.json');
    const claudeCommandsDir = path.join(repoRoot, '.claude', 'commands');
    const claudeSkillsDir = path.join(repoRoot, '.claude', 'skills');
    const claudeRegistriesDir = path.join(repoRoot, '.claude', 'registries');

    try {
      // Remove manifest
      if (await fs.pathExists(manifestPath)) {
        await fs.remove(manifestPath);
      }
      // Remove deployed commands and skills (preserve .claude/settings.local.json)
      if (await fs.pathExists(claudeCommandsDir)) {
        await fs.remove(claudeCommandsDir);
      }
      if (await fs.pathExists(claudeSkillsDir)) {
        await fs.remove(claudeSkillsDir);
      }
      // Remove generated registries (preserve .claude/context/)
      if (await fs.pathExists(claudeRegistriesDir)) {
        await fs.remove(claudeRegistriesDir);
      }

      spinner.succeed('Dev setup cleaned');
      console.log(chalk.green('\n✓ Dev setup artifacts removed'));
      console.log(chalk.dim('  Preserved: .claude/context/, .claude/settings.local.json\n'));

      // Record telemetry
      const durationMs = Date.now() - startTime;
      recordCLICommand(
        'dev',
        undefined,
        { clean: true },
        { action: 'unlink' },
        durationMs,
        true
      ).catch(() => {});
      return;
    } catch (error) {
      spinner.fail('Failed to clean dev setup');
      throw error;
    }
  }

  // Handle --unlink option (remove global CLI installation)
  if (options.unlink) {
    spinner.start('Removing global CLI installation...');
    const cliDir = path.resolve(frameworkRoot, 'cli');
    const { execSync } = await import('child_process');
    try {
      execSync('npm unlink -g', { cwd: cliDir, stdio: 'pipe' });
      spinner.succeed('Global CLI installation removed');
      console.log(chalk.green('\n✓ agentic-framework unlinked from global\n'));

      // Record telemetry and exit (don't wait for network)
      const durationMs = Date.now() - startTime;
      recordCLICommand(
        'dev',
        undefined,
        { unlink: true },
        { action: 'unlink-global' },
        durationMs,
        true
      ).catch(() => {});
      // Exit cleanly without waiting for telemetry
      setTimeout(() => process.exit(0), 100);
      return;
    } catch (error) {
      spinner.fail('Failed to unlink');
      throw error;
    }
  }

  // Handle --link option (build and install CLI globally)
  if (options.link) {
    const cliDir = path.resolve(frameworkRoot, 'cli');
    const { execSync } = await import('child_process');

    // Build first (unless --no-build)
    if (options.build !== false) {
      spinner.start('Building CLI...');
      try {
        execSync('npm run build', { cwd: cliDir, stdio: 'pipe' });
        spinner.succeed('CLI built successfully');
      } catch (error) {
        spinner.fail('Build failed');
        throw error;
      }
    }

    // Link globally
    spinner.start('Installing CLI globally...');
    try {
      execSync('npm link', { cwd: cliDir, stdio: 'pipe' });
      spinner.succeed('CLI installed globally');
    } catch (error) {
      spinner.fail('npm link failed');
      throw error;
    }

    // Verify
    spinner.start('Verifying installation...');
    try {
      const version = execSync('agentic-framework --version', { encoding: 'utf-8' }).trim();
      spinner.succeed(`Verified: agentic-framework ${version}`);
    } catch {
      spinner.warn('Verification failed - you may need to restart your terminal');
    }

    console.log(chalk.green('\n✓ CLI installed globally!\n'));
    console.log('Usage:');
    console.log(chalk.dim('  agentic-framework init MyProject --modules core,coding'));
    console.log(chalk.dim('  agentic-framework list'));
    console.log(chalk.dim('  agentic-framework --help\n'));

    // Record telemetry and exit (don't wait for network)
    const durationMs = Date.now() - startTime;
    recordCLICommand(
      'dev',
      undefined,
      { link: true, build: options.build },
      { action: 'link-global' },
      durationMs,
      true
    ).catch(() => {});
    // Exit cleanly without waiting for telemetry
    setTimeout(() => process.exit(0), 100);
    return;
  }

  // Main setup logic
  spinner.start('Initializing dev setup...');

  // Create manifest
  const manifestPath = path.join(repoRoot, '.agentic-framework.json');
  const manifest = {
    name: 'agentic-development-framework',
    version: '1.0.0',
    type: 'framework-source',
    modules: {
      core: '1.0.0',
      backlog: '1.0.0',
      jira: '1.0.0',
      confluence: '1.0.0',
      planning: '1.0.0',
      coding: '1.0.0',
      reporting: '1.0.0'
    },
    selfDev: true,
    framework: {
      version: '1.0.0',
      source: 'local',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    paths: {
      source: 'framework/',
      deployed: '.claude/',
      projectData: '.claude/'
    }
  };

  await fs.writeJson(manifestPath, manifest, { spaces: 2 });
  spinner.succeed('Manifest created');

  // Create directory structure
  spinner.start('Creating directories...');
  const directories = [
    path.join(repoRoot, '.claude', 'commands'),
    path.join(repoRoot, '.claude', 'skills'),
    path.join(repoRoot, 'ai', 'registries'),
    path.join(repoRoot, 'ai', 'context'),
    path.join(repoRoot, 'ai', 'backlog')
  ];

  for (const dir of directories) {
    await fs.ensureDir(dir);
  }
  spinner.succeed('Directories created');

  // Load all available modules
  spinner.start('Loading modules...');
  const availableModules = await getAvailableModules();
  const loadedModules = [];

  for (const moduleName of availableModules) {
    try {
      const module = await loadModule(moduleName);
      loadedModules.push(module);
    } catch (_error) {
      console.warn(chalk.yellow(`\nWarning: Failed to load module '${moduleName}'`));
    }
  }
  spinner.succeed(`Loaded ${loadedModules.length} module(s)`);

  // Generate registries
  spinner.start('Generating registries...');
  try {
    await generateRegistries(repoRoot, loadedModules);
    spinner.succeed('Registries generated');
  } catch (error) {
    spinner.fail('Failed to generate registries');
    throw error;
  }

  // Sync agents and skills (always sync on setup)
  // Note: This could be conditional on options.sync in the future if we want to skip sync
  if (options.sync !== false) {
    const syncEngine = new SyncEngine(frameworkRoot, repoRoot);

    // Sync skills
    spinner.start('Syncing skills...');
    try {
      const skillItems = await syncEngine.syncSkills(loadedModules);
      const projectSkillItems = await syncEngine.syncProjectSkills();
      const totalSkills = skillItems.filter(i => i.action !== 'skipped').length +
                         projectSkillItems.filter(i => i.action !== 'skipped').length;
      spinner.succeed(`Skills synced (${totalSkills} total)`);
    } catch (error) {
      spinner.fail('Failed to sync skills');
      throw error;
    }

    // Sync agents
    spinner.start('Syncing agents...');
    try {
      const agentItems = await syncEngine.syncAgents(loadedModules);
      const totalAgents = agentItems.filter(i => i.action !== 'skipped').length;
      spinner.succeed(`Agents synced (${totalAgents} total)`);
    } catch (error) {
      spinner.fail('Failed to sync agents');
      throw error;
    }
  }

  // Success summary
  console.log(chalk.green('\n✓ Dev setup completed successfully!\n'));
  console.log('Summary:');
  console.log(`  Framework: ${chalk.cyan('agentic-development-framework')}`);
  console.log(`  Type: ${chalk.cyan('framework-source')}`);
  console.log(`  Modules: ${chalk.cyan(loadedModules.length)}`);
  console.log(`  Deployed to: ${chalk.cyan(path.join(repoRoot, '.claude'))}`);
  console.log(`  Data dir: ${chalk.cyan(path.join(repoRoot, 'ai'))}`);
  console.log();
  console.log(chalk.dim('You can now use framework agents and skills for self-development.\n'));

  // Record telemetry
  const durationMs = Date.now() - startTime;
  recordCLICommand(
    'dev',
    undefined,
    { sync: options.sync },
    { action: 'link', modules_loaded: loadedModules.length },
    durationMs,
    true
  ).catch(() => {});
}

/**
 * Create the dev command for Commander
 */
export function createDevCommand(): Command {
  const cmd = new Command('dev');

  cmd
    .description('Set up framework for self-development')
    .option('--sync', 'Force sync agents and skills')
    .option('--status', 'Show current dev setup status')
    .option('--clean', 'Remove dev setup')
    .option('--link', 'Build and install CLI globally (npm link)')
    .option('--unlink', 'Remove global CLI installation (npm unlink)')
    .option('--no-build', 'Skip build step when using --link')
    .action(devCommand);

  return cmd;
}
