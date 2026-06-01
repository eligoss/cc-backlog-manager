/**
 * Agent List Command
 *
 * Lists all SDK-enabled agents in the framework.
 */

import { Command } from "commander";
import chalk from "chalk";
import { createSDKGenerator } from "../../lib/sdk/index.js";
import { CliContext } from "../../lib/cli-context.js";

export function createAgentListCommand(): Command {
  return new Command("list")
    .description("List all SDK-enabled agents")
    .option("-p, --path <path>", "Project path", ".")
    .option("--all", "Show all agents, not just SDK-enabled")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      try {
        const context = await CliContext.create({ path: options.path });
        const generator = await createSDKGenerator(context.projectRoot);

        const agents = await generator.listSDKEnabledAgents();

        if (options.json) {
          console.log(JSON.stringify(agents, null, 2));
          return;
        }

        if (agents.length === 0) {
          console.log(chalk.yellow("No SDK-enabled agents found."));
          console.log(
            chalk.dim(
              'Add "sdk.enabled: true" to agents in agents.json to enable SDK execution.',
            ),
          );
          return;
        }

        console.log(chalk.bold("\nSDK-Enabled Agents\n"));
        console.log(chalk.dim("─".repeat(60)));

        for (const agent of agents) {
          const modelColor =
            agent.model === "opus"
              ? chalk.magenta
              : agent.model === "sonnet"
                ? chalk.blue
                : chalk.green;

          console.log(
            `  ${chalk.bold(agent.id)} ${chalk.dim("|")} ` +
              `${modelColor(agent.model)}`,
          );
        }

        console.log(chalk.dim("─".repeat(60)));
        console.log(chalk.dim(`\n${agents.length} agent(s) available\n`));
        console.log(
          chalk.dim("Run: ") +
            chalk.cyan("agentic-framework agent show <agent-id>") +
            chalk.dim(" for details"),
        );
      } catch (error) {
        console.error(chalk.red("Error:"), (error as Error).message);
        process.exit(1);
      }
    });
}
