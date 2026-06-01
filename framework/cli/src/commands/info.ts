import chalk from 'chalk';
import { loadModule, getAvailableModules } from '../lib/module-loader.js';
import { recordCLICommand } from '../lib/telemetry/instrumentation/cli-instrumentation.js';

export async function infoCommand(moduleName: string): Promise<void> {
  const startTime = Date.now();

  // Validate module exists
  const availableModules = await getAvailableModules();

  if (!availableModules.includes(moduleName)) {
    console.error(chalk.red(`Error: Module '${moduleName}' not found`));
    console.log(`\nAvailable modules: ${availableModules.join(', ')}`);
    process.exit(1);
  }

  try {
    const module = await loadModule(moduleName);

    console.log(chalk.blue(`\n${module.name}\n`));
    console.log(chalk.dim('─'.repeat(50)));
    console.log();
    console.log(`ID:          ${chalk.green(module.id)}`);
    console.log(`Version:     ${module.version}`);
    console.log(`Description: ${module.description}`);
    console.log();

    if (module.provides.agents?.length) {
      console.log(chalk.yellow('Agents:'));
      for (const agent of module.provides.agents) {
        console.log(chalk.dim(`  - ${agent}`));
      }
      console.log();
    }

    if (module.provides.skills?.length) {
      console.log(chalk.yellow('Skills:'));
      for (const skill of module.provides.skills) {
        console.log(chalk.dim(`  - ${skill}`));
      }
      console.log();
    }

    if (module.provides.capabilities?.length) {
      console.log(chalk.yellow('Capabilities:'));
      for (const cap of module.provides.capabilities) {
        console.log(chalk.dim(`  - ${cap}`));
      }
      console.log();
    }

    if (module.provides.scripts?.length) {
      console.log(chalk.yellow('Scripts:'));
      for (const script of module.provides.scripts) {
        console.log(chalk.dim(`  - ${script}`));
      }
      console.log();
    }

    if (module.requires && Object.keys(module.requires).length) {
      console.log(chalk.yellow('Required Dependencies:'));
      for (const [dep, version] of Object.entries(module.requires)) {
        console.log(chalk.dim(`  - ${dep} ${version}`));
      }
      console.log();
    }

    if (module['optional-dependencies']?.length) {
      console.log(chalk.yellow('Optional Dependencies:'));
      for (const dep of module['optional-dependencies']) {
        console.log(chalk.dim(`  - ${dep}`));
      }
      console.log();
    }

    if (module.metadata) {
      console.log(chalk.yellow('Metadata:'));
      if (module.metadata.category) {
        console.log(chalk.dim(`  Category: ${module.metadata.category}`));
      }
      if (module.metadata.keywords?.length) {
        console.log(chalk.dim(`  Keywords: ${module.metadata.keywords.join(', ')}`));
      }
      console.log();
    }

    // Record telemetry
    const durationMs = Date.now() - startTime;
    recordCLICommand(
      'info',
      undefined,
      {},
      { module: moduleName },
      durationMs,
      true
    ).catch(() => {});

  } catch (error) {
    console.error(chalk.red(`Error loading module '${moduleName}':`), error);
    process.exit(1);
  }
}
