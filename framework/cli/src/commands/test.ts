import { Command } from 'commander';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import {
  detectAffectedModules,
  getTestPatternsForModules,
  isGitRepository,
  branchExists,
  MODULE_TEST_PATTERNS,
} from '../lib/affected-modules.js';
import { recordCLICommand } from '../lib/telemetry/instrumentation/cli-instrumentation.js';

export interface TestOptions {
  projectRoot: string;
  /** Run tests only for affected modules */
  affected?: boolean;
  /** Run tests for specific module */
  module?: string;
  /** Base branch for affected detection (default: main) */
  baseBranch?: string;
  /** Run all tests (default behavior if no flags) */
  all?: boolean;
  /** Pass through to Jest: run in watch mode */
  watch?: boolean;
  /** Pass through to Jest: run with coverage */
  coverage?: boolean;
  /** Pass through to Jest: bail on first failure */
  bail?: boolean;
  /** Pass through to Jest: verbose output */
  verbose?: boolean;
  /** Show what would run without executing */
  dryRun?: boolean;
  /** Additional Jest arguments */
  jestArgs?: string[];
}

export interface TestResult {
  success: boolean;
  testsRun: boolean;
  modulesAffected: string[];
  command: string | null;
  exitCode: number;
}

/**
 * Build Jest arguments array
 */
function buildJestArgs(
  testPathPattern: string | null,
  options: TestOptions
): string[] {
  const args: string[] = [];

  if (testPathPattern) {
    // Jest 30+ uses --testPathPatterns (plural) instead of --testPathPattern
    args.push(`--testPathPatterns="${testPathPattern}"`);
  }

  if (options.watch) {
    args.push('--watch');
  }

  if (options.coverage) {
    args.push('--coverage');
  }

  if (options.bail) {
    args.push('--bail');
  }

  if (options.verbose) {
    args.push('--verbose');
  }

  // Always pass with no tests to avoid failure when no tests match
  args.push('--passWithNoTests');

  // Add any additional Jest arguments
  if (options.jestArgs && options.jestArgs.length > 0) {
    args.push(...options.jestArgs);
  }

  return args;
}

/**
 * Get CLI directory path
 */
function getCliDirectory(projectRoot: string): string {
  return path.join(projectRoot, 'framework', 'cli');
}

/**
 * Run tests using npm test or jest directly
 */
async function runTests(
  cliDir: string,
  jestArgs: string[],
  dryRun: boolean
): Promise<{ success: boolean; exitCode: number }> {
  const command = `npx jest ${jestArgs.join(' ')}`;

  if (dryRun) {
    console.log('\nDRY RUN - Would execute:');
    console.log(`  cd ${cliDir}`);
    console.log(`  ${command}`);
    return { success: true, exitCode: 0 };
  }

  console.log(`\nRunning: ${command}\n`);

  return new Promise((resolve) => {
    const child = spawn('npx', ['jest', ...jestArgs], {
      cwd: cliDir,
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        exitCode: code || 0,
      });
    });

    child.on('error', (err) => {
      console.error(`Failed to run tests: ${err.message}`);
      resolve({
        success: false,
        exitCode: 1,
      });
    });
  });
}

/**
 * Main test command logic
 */
export async function runTestCommand(options: TestOptions): Promise<TestResult> {
  const { projectRoot, affected, module: targetModule, baseBranch = 'main', all: _all, dryRun } = options;

  const cliDir = getCliDirectory(projectRoot);

  // Verify CLI directory exists
  if (!await fs.pathExists(cliDir)) {
    throw new Error(`CLI directory not found at ${cliDir}`);
  }

  // Mode 1: Affected tests only
  if (affected) {
    if (!isGitRepository(projectRoot)) {
      throw new Error('Affected test detection requires a git repository');
    }

    if (!branchExists(baseBranch, projectRoot)) {
      throw new Error(`Base branch '${baseBranch}' does not exist`);
    }

    console.log(`Detecting affected modules (comparing to ${baseBranch})...\n`);

    const result = detectAffectedModules({
      baseBranch,
      projectRoot,
    });

    if (!result.hasChanges || result.modules.length === 0) {
      console.log('No affected modules detected. No tests to run.');
      return {
        success: true,
        testsRun: false,
        modulesAffected: [],
        command: null,
        exitCode: 0,
      };
    }

    const moduleIds = result.modules.map(m => m.id);
    console.log(`Affected modules: ${moduleIds.join(', ')}`);

    const patterns = getTestPatternsForModules(moduleIds);
    if (patterns.length === 0) {
      console.log('No test patterns defined for affected modules. No tests to run.');
      return {
        success: true,
        testsRun: false,
        modulesAffected: moduleIds,
        command: null,
        exitCode: 0,
      };
    }

    // Build test path pattern (patterns are already regex-compatible)
    const testPathPattern = [...new Set(patterns)].join('|');

    const jestArgs = buildJestArgs(testPathPattern, options);
    const command = `npx jest ${jestArgs.join(' ')}`;

    const { success, exitCode } = await runTests(cliDir, jestArgs, !!dryRun);

    return {
      success,
      testsRun: !dryRun,
      modulesAffected: moduleIds,
      command,
      exitCode,
    };
  }

  // Mode 2: Specific module tests
  if (targetModule) {
    const patterns = MODULE_TEST_PATTERNS[targetModule];

    if (!patterns || patterns.length === 0) {
      console.log(`No test patterns defined for module '${targetModule}'.`);
      return {
        success: true,
        testsRun: false,
        modulesAffected: [targetModule],
        command: null,
        exitCode: 0,
      };
    }

    console.log(`Running tests for module: ${targetModule}`);

    // Build test path pattern (patterns are already regex-compatible)
    const testPathPattern = [...new Set(patterns)].join('|');

    const jestArgs = buildJestArgs(testPathPattern, options);
    const command = `npx jest ${jestArgs.join(' ')}`;

    const { success, exitCode } = await runTests(cliDir, jestArgs, !!dryRun);

    return {
      success,
      testsRun: !dryRun,
      modulesAffected: [targetModule],
      command,
      exitCode,
    };
  }

  // Mode 3: All tests (default)
  console.log('Running all tests...');

  const jestArgs = buildJestArgs(null, options);
  const command = `npx jest ${jestArgs.join(' ')}`;

  const { success, exitCode } = await runTests(cliDir, jestArgs, !!dryRun);

  return {
    success,
    testsRun: !dryRun,
    modulesAffected: [],
    command,
    exitCode,
  };
}

/**
 * Create the test command
 */
export function createTestCommand(): Command {
  const command = new Command('test');

  command
    .description('Run framework tests (supports affected module detection)')
    .option('--affected', 'Run tests only for modules affected by changes')
    .option('-m, --module <name>', 'Run tests for a specific module')
    .option('--base-branch <branch>', 'Base branch for affected detection (default: main)', 'main')
    .option('--all', 'Run all tests (default if no flags)')
    .option('-w, --watch', 'Run Jest in watch mode')
    .option('--coverage', 'Run Jest with coverage')
    .option('--bail', 'Bail on first test failure')
    .option('-v, --verbose', 'Run Jest in verbose mode')
    .option('--dry-run', 'Show what would run without executing')
    .option('-p, --path <path>', 'Project root path', '.')
    .allowUnknownOption(true)
    .action(async (cmdOptions, cmd) => {
      const startTime = Date.now();
      const chalk = await import('chalk').then(m => m.default);

      try {
        // Validate conflicting options
        if (cmdOptions.affected && cmdOptions.module) {
          console.error(chalk.red('Error: Cannot use --affected and --module together.'));
          process.exit(1);
        }

        const projectRoot = cmdOptions.path === '.' ? process.cwd() : cmdOptions.path;

        // Collect unknown options as Jest arguments
        const jestArgs = cmd.args.filter((arg: string) => arg.startsWith('-') || arg.startsWith('--'));

        const options: TestOptions = {
          projectRoot,
          affected: cmdOptions.affected,
          module: cmdOptions.module,
          baseBranch: cmdOptions.baseBranch,
          all: cmdOptions.all,
          watch: cmdOptions.watch,
          coverage: cmdOptions.coverage,
          bail: cmdOptions.bail,
          verbose: cmdOptions.verbose,
          dryRun: cmdOptions.dryRun,
          jestArgs,
        };

        const result = await runTestCommand(options);

        // Record telemetry
        const durationMs = Date.now() - startTime;
        recordCLICommand(
          'test',
          undefined,
          {
            affected: cmdOptions.affected,
            module: cmdOptions.module,
            all: cmdOptions.all,
          },
          {
            success: result.success,
            tests_run: result.testsRun,
            modules_affected: result.modulesAffected.length,
          },
          durationMs,
          result.success
        ).catch(() => {});

        if (!result.success) {
          process.exit(result.exitCode);
        }
      } catch (error) {
        console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
        process.exit(1);
      }
    });

  return command;
}
