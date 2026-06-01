import chalk from 'chalk';
import ora from 'ora';
import { ManifestManager, FrameworkManifest } from '../lib/manifest-manager.js';
import { DiscoveryEngine } from '../lib/discovery-engine.js';
import { FrameworkValidator } from '../lib/framework-validator.js';
import { CliContext } from '../lib/cli-context.js';
import { recordCLICommand } from '../lib/telemetry/instrumentation/cli-instrumentation.js';

export interface StatusOptions {
  path: string;
  verbose: boolean;
  json: boolean;
}

interface StatusReport {
  framework: {
    version: string;
    installedAt: string;
    updatedAt: string;
    pinned: boolean;
  };
  modules: Array<{
    id: string;
    version: string;
    installedAt: string;
  }>;
  skills: {
    project: string[];
    deployed: string[];
    module: string[];
  };
  validation?: {
    overall: boolean;
    issues: number;
  };
}

/**
 * Status command: Show framework and module status
 * Displays installed version, modules, skills, and validation status
 */
export async function statusCommand(options: StatusOptions): Promise<void> {
  const startTime = Date.now();
  const ctx = options.path && options.path !== '.'
    ? await CliContext.create({ path: options.path })
    : await CliContext.require();
  const projectPath = ctx.projectRoot;

  if (!options.json) {
    console.log(chalk.blue('\nAgentic Development Framework - Status\n'));
  }

  // Validate project has manifest
  // Ora 9: discardStdin prevents input twitching during long operations
  const spinner = options.json ? null : ora({ text: 'Reading project configuration...', discardStdin: true }).start();
  const manifestManager = new ManifestManager(projectPath);

  if (!(await manifestManager.exists())) {
    if (spinner) spinner.fail('Not an agentic framework project');
    if (options.json) {
      console.log(JSON.stringify({ error: 'Not an agentic framework project' }, null, 2));
    } else {
      console.error(
        chalk.red(
          `\nError: No .agentic-framework.json found at ${projectPath}`
        )
      );
      console.log(
        chalk.dim(
          '\nThis directory does not appear to be an agentic framework project.'
        )
      );
      console.log(
        chalk.dim(`Run 'agentic-framework init <project-name>' to create a new project.\n`)
      );
    }
    process.exit(1);
  }

  let manifest: FrameworkManifest;
  try {
    manifest = await manifestManager.read();
    if (spinner) spinner.succeed('Project configuration loaded');
  } catch (_error) {
    if (spinner) spinner.fail('Failed to read manifest');
    if (options.json) {
      console.log(JSON.stringify({ error: 'Failed to read manifest' }, null, 2));
    }
    process.exit(1);
  }

  // Build status report
  const report: StatusReport = {
    framework: {
      version: manifest.framework.version,
      installedAt: manifest.framework.installedAt,
      updatedAt: manifest.framework.updatedAt,
      pinned: manifest.framework.pinned || false,
    },
    modules: Object.entries(manifest.modules).map(([id, info]) => ({
      id,
      version: info.version,
      installedAt: info.installedAt,
    })),
    skills: {
      project: [],
      deployed: [],
      module: [],
    },
  };

  // Load skills from discovery engine
  if (spinner) spinner.start('Discovering skills...');
  try {
    const engine = new DiscoveryEngine(projectPath);
    await engine.loadModules();
    const allSkills = await engine.getAllSkillsFromAllSources();

    report.skills = {
      project: allSkills.project.map(s => s.id),
      deployed: allSkills.deployed.map(s => s.id),
      module: allSkills.modules.map(s => s.id),
    };

    if (spinner) spinner.succeed('Skills discovered');
  } catch (_error) {
    if (spinner) spinner.warn('Could not discover skills');
  }

  // Run validation if verbose
  if (options.verbose) {
    if (spinner) spinner.start('Running validation...');
    try {
      const engine = new DiscoveryEngine(projectPath);
      await engine.loadModules();
      await engine.buildCapabilityMap();
      const validator = new FrameworkValidator(engine, projectPath);
      const validationReport = await validator.validateAll();

      const totalIssues =
        validationReport.capabilityResolution.issues.length +
        validationReport.moduleDeclarations.issues.length +
        validationReport.skillCapabilities.issues.length;

      report.validation = {
        overall: validationReport.overall,
        issues: totalIssues,
      };

      if (spinner) spinner.succeed('Validation complete');
    } catch (_error) {
      if (spinner) spinner.warn('Validation skipped');
    }
  }

  // Output based on format
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // Display status
  console.log(chalk.yellow('\nFramework Status:\n'));

  // Framework info
  console.log(`  Version: ${chalk.cyan(report.framework.version)}${report.framework.pinned ? chalk.dim(' (pinned)') : ''}`);
  const installedDate = report.framework.installedAt
    ? new Date(report.framework.installedAt).toLocaleString()
    : 'Unknown';
  const updatedDate = report.framework.updatedAt
    ? new Date(report.framework.updatedAt).toLocaleString()
    : 'Unknown';
  console.log(`  Installed: ${chalk.dim(installedDate)}`);
  console.log(`  Updated: ${chalk.dim(updatedDate)}`);

  // Modules
  console.log(chalk.yellow('\nInstalled Modules:\n'));
  if (report.modules.length === 0) {
    console.log(chalk.dim('  No modules installed'));
  } else {
    for (const module of report.modules) {
      const versionStr = module.version ? `v${module.version}` : '(version unknown)';
      console.log(`  ${chalk.green('•')} ${chalk.cyan(module.id)} ${chalk.dim(versionStr)}`);
    }
  }

  // Skills
  console.log(chalk.yellow('\nSkills:\n'));

  const totalSkills =
    report.skills.project.length +
    report.skills.deployed.length +
    report.skills.module.length;

  if (totalSkills === 0) {
    console.log(chalk.dim('  No skills found'));
  } else {
    if (report.skills.project.length > 0) {
      console.log(`  ${chalk.cyan('Project Skills')} (.claude/skills/project/):`);
      for (const skill of report.skills.project) {
        console.log(`    ${chalk.green('•')} ${skill}`);
      }
    }

    if (report.skills.deployed.length > 0) {
      console.log(`  ${chalk.cyan('Deployed Skills')} (.claude/skills/):`);
      for (const skill of report.skills.deployed) {
        console.log(`    ${chalk.green('•')} ${skill}`);
      }
    }

    if (options.verbose && report.skills.module.length > 0) {
      console.log(`  ${chalk.cyan('Module Skills')} (from modules):`);
      for (const skill of report.skills.module) {
        console.log(`    ${chalk.green('•')} ${skill}`);
      }
    } else if (report.skills.module.length > 0) {
      console.log(chalk.dim(`  ${report.skills.module.length} module skills (use --verbose to list)`));
    }
  }

  // Validation status
  if (report.validation) {
    console.log(chalk.yellow('\nValidation:\n'));
    if (report.validation.overall) {
      console.log(`  ${chalk.green('✓')} All checks passed`);
    } else {
      console.log(`  ${chalk.red('✗')} ${report.validation.issues} issue(s) found`);
      console.log(chalk.dim('  Run \'agentic-framework validate --verbose\' for details'));
    }
  }

  // Helpful commands
  console.log(chalk.yellow('\nCommands:\n'));
  console.log(chalk.dim('  agentic-framework update     Update to latest version'));
  console.log(chalk.dim('  agentic-framework sync       Force re-sync skills/agents'));
  console.log(chalk.dim('  agentic-framework validate   Check framework integrity\n'));

  // Record telemetry
  const durationMs = Date.now() - startTime;
  recordCLICommand(
    'status',
    undefined,
    { path: options.path, verbose: options.verbose, json: options.json },
    { modules_count: report.modules.length, synced: true },
    durationMs,
    true
  ).catch(() => {});
}
