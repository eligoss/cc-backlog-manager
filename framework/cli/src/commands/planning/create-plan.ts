/**
 * Planning Create Plan Command
 *
 * CLI command for creating new plan folders with auto-numbering and templates.
 * Integrates with SkillTemplateEngine for skill-based template rendering.
 *
 * Usage:
 *   agentic-framework planning create-plan --name my-plan --category framework
 *   agentic-framework planning create-plan --name auth-refactor --category apm-r --dry-run
 *   agentic-framework planning create-plan --name my-plan --use-skill-templates
 *
 * @module commands/planning/create-plan
 */

import { Command } from 'commander';
import { createPlan } from '../../lib/planning/plan-creator.js';
import { CliContext } from '../../lib/cli-context.js';
import { recordCLICommand } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';

/**
 * Command options for create-plan command
 */
interface CreatePlanOptions {
  name?: string;
  category: string;
  dryRun: boolean;
  path: string;
}

/**
 * Create the create-plan command.
 *
 * @returns Commander command instance
 */
export function createCreatePlanCommand(): Command {
  const command = new Command('create-plan');

  command
    .description('Create a new plan folder with auto-numbering and templates')
    .option('-n, --name <name>', 'Plan name in kebab-case (e.g., "my-plan-name")')
    .option('-c, --category <category>', 'Plan category (e.g., "framework", "apm-r")', 'framework')
    .option('--dry-run', 'Preview what would be created without creating files', false)
    .option('-p, --path <path>', 'Project root path', '.')
    .action(async (cmdOptions: CreatePlanOptions) => {
      try {
        await runCreatePlanCommand(cmdOptions);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`\nError: ${errorMessage}\n`);
        process.exit(1);
      }
    });

  return command;
}

/**
 * Run the create-plan command.
 *
 * @param cmdOptions - Command options
 */
async function runCreatePlanCommand(cmdOptions: CreatePlanOptions): Promise<void> {
  const startTime = Date.now();
  const {
    name,
    category,
    dryRun,
    path: pathOption,
  } = cmdOptions;

  // Validate required options
  if (!name) {
    throw new Error('Plan name is required. Use --name <name> to specify it.');
  }

  // Use CliContext for project detection and path resolution
  // If explicit path is provided (and not '.'), use it; otherwise auto-detect
  const ctx = pathOption && pathOption !== '.'
    ? await CliContext.create({ path: pathOption })
    : await CliContext.require();

  // Get plans directory from path resolver
  const plansDir = ctx.paths.getPlanPath(category);

  // Create the plan using project root from context
  const result = await createPlan(name, category, ctx.projectRoot, dryRun, plansDir);

  // Record telemetry
  const durationMs = Date.now() - startTime;
  recordCLICommand(
    'planning',
    'create-plan',
    { name, category, dryRun },
    { plan_id: result.planId, path: result.planPath },
    durationMs,
    result.success
  ).catch(() => {});

  // Output result
  console.log(result.message);

  // Exit with error code if failed
  if (!result.success) {
    process.exit(1);
  }
}
