import chalk from 'chalk';
import { getAvailableModules, loadModule } from '../lib/module-loader.js';
import { recordCLICommand } from '../lib/telemetry/instrumentation/cli-instrumentation.js';

interface ListOptions {
  verbose: boolean;
}

export async function listCommand(options: ListOptions): Promise<void> {
  const startTime = Date.now();
  console.log(chalk.blue('\nAvailable Modules\n'));

  const modules = await getAvailableModules();

  if (options.verbose) {
    for (const moduleName of modules) {
      try {
        const module = await loadModule(moduleName);
        console.log(chalk.green(`${module.name} (${module.id})`));
        console.log(chalk.dim(`  Version: ${module.version}`));
        console.log(chalk.dim(`  ${module.description}`));

        if (module.provides.agents?.length) {
          console.log(chalk.dim(`  Agents: ${module.provides.agents.join(', ')}`));
        }
        if (module.provides.capabilities?.length) {
          console.log(chalk.dim(`  Capabilities: ${module.provides.capabilities.join(', ')}`));
        }
        if (module.requires && Object.keys(module.requires).length) {
          console.log(chalk.dim(`  Requires: ${Object.entries(module.requires).map(([k, v]) => `${k}${v}`).join(', ')}`));
        }
        console.log();
      } catch (_error) {
        console.log(chalk.yellow(`${moduleName} (error loading)`));
      }
    }
  } else {
    console.log('Modules:');
    for (const moduleName of modules) {
      try {
        const module = await loadModule(moduleName);
        const agentCount = module.provides.agents?.length || 0;
        const skillCount = module.provides.skills?.length || 0;
        console.log(chalk.dim(`  ${moduleName.padEnd(15)} ${module.name.padEnd(25)} (${agentCount} agents, ${skillCount} skills)`));
      } catch {
        console.log(chalk.dim(`  ${moduleName.padEnd(15)} (error loading)`));
      }
    }
  }

  console.log(chalk.dim('\nUse --verbose for detailed information'));
  console.log(chalk.dim('Use `agentic-framework info <module>` for full module details\n'));

  // Record telemetry
  const durationMs = Date.now() - startTime;
  recordCLICommand(
    'list',
    undefined,
    { verbose: options.verbose },
    { modules_count: modules.length },
    durationMs,
    true
  ).catch(() => {});
}
