/**
 * Agent Run Command
 *
 * Executes an agent using the Claude Agent SDK.
 * Supports dry-run mode to preview the SDK definition without execution.
 */

import { Command } from "commander";
import chalk from "chalk";
import {
  createSDKGenerator,
  executeAgent,
  executePhase,
  type SDKModel,
  type SubAgentType,
} from "../../lib/sdk/index.js";
import { CliContext } from "../../lib/cli-context.js";

export function createAgentRunCommand(): Command {
  return new Command("run")
    .description("Run an agent with Claude Agent SDK")
    .argument("<agent-id>", "Agent ID to run (e.g., ai-framework-manager)")
    .argument("[prompt]", "Initial prompt for the agent")
    .option("-p, --path <path>", "Project path", ".")
    .option("-m, --model <model>", "Override model (opus|sonnet|haiku)")
    .option(
      "--phase <phase>",
      "Run specific phase sub-agent (explore|architect|reviewer|implementer)",
    )
    .option("--dry-run", "Preview SDK definition without executing")
    .option("--json", "Output as JSON (for dry-run)")
    .option("-c, --context <files...>", "Additional context files to include")
    .option("--session <id>", "Resume a previous session")
    .option(
      "--autonomous",
      "Run without permission prompts (for CI/CD, OpenClaw)",
    )
    .action(async (agentId, prompt, options) => {
      try {
        const context = await CliContext.create({ path: options.path });
        const generator = await createSDKGenerator(context.projectRoot);

        // Validate model option if provided
        if (
          options.model &&
          !["opus", "sonnet", "haiku"].includes(options.model)
        ) {
          console.error(
            chalk.red("Error:"),
            `Invalid model '${options.model}'. Must be opus, sonnet, or haiku.`,
          );
          process.exit(1);
        }

        // Validate phase option if provided
        const validPhases: SubAgentType[] = [
          "explore",
          "architect",
          "reviewer",
          "implementer",
        ];
        if (options.phase && !validPhases.includes(options.phase)) {
          console.error(
            chalk.red("Error:"),
            `Invalid phase '${options.phase}'. Must be one of: ${validPhases.join(", ")}`,
          );
          process.exit(1);
        }

        // Generate SDK definition
        const generated = await generator.generateForAgent(agentId);

        // Apply model override if specified
        const model: SDKModel = options.model || generated.definition.model;

        // Handle dry-run mode
        if (options.dryRun) {
          if (options.json) {
            const output = {
              agentId,
              model,
              phase: options.phase || null,
              prompt: prompt || null,
              definition: generated.definition,
              subAgents: Object.fromEntries(generated.subAgents),
              queryOptions: {
                allowedTools: generated.definition.tools,
                agents: options.phase
                  ? undefined
                  : Object.fromEntries(generated.subAgents),
              },
            };
            console.log(JSON.stringify(output, null, 2));
          } else {
            console.log(chalk.bold("\n[Dry Run] Agent SDK Definition\n"));
            console.log(chalk.dim("─".repeat(60)));

            console.log(chalk.cyan("\nAgent:"), agentId);
            console.log(chalk.cyan("Model:"), model);
            console.log(
              chalk.cyan("Tools:"),
              generated.definition.tools.join(", "),
            );

            if (options.phase) {
              console.log(chalk.cyan("Phase:"), options.phase);
              const subAgent = generated.subAgents.get(options.phase);
              if (subAgent) {
                console.log(chalk.cyan("Sub-Agent Model:"), subAgent.model);
                console.log(
                  chalk.cyan("Sub-Agent Tools:"),
                  subAgent.tools.join(", "),
                );
              } else {
                console.log(
                  chalk.yellow("Warning:"),
                  `Phase '${options.phase}' not configured for this agent`,
                );
              }
            }

            if (prompt) {
              console.log(chalk.cyan("\nPrompt:"));
              console.log(chalk.white(`  "${prompt}"`));
            }

            console.log(chalk.cyan("\nSub-Agents Available:"));
            if (generated.subAgents.size === 0) {
              console.log(chalk.dim("  None"));
            } else {
              for (const [type, def] of generated.subAgents) {
                console.log(`  - ${type} (${def.model})`);
              }
            }

            console.log(chalk.cyan("\nSystem Prompt Size:"));
            console.log(`  ${generated.definition.prompt.length} characters`);

            console.log(chalk.dim("\n─".repeat(60)));
            console.log(
              chalk.dim("\nTo execute, remove the ") +
                chalk.cyan("--dry-run") +
                chalk.dim(" flag"),
            );
          }
          return;
        }

        // Check if prompt is provided for actual execution
        if (!prompt) {
          console.error(
            chalk.red("Error:"),
            "A prompt is required for execution.",
          );
          console.log(
            chalk.dim(
              'Usage: agentic-framework agent run <agent-id> "<prompt>"',
            ),
          );
          process.exit(1);
        }

        // Check if SDK-enabled
        const isEnabled = await generator.isSDKEnabled(agentId);
        if (!isEnabled) {
          console.error(
            chalk.red("Error:"),
            `Agent '${agentId}' is not SDK-enabled.`,
          );
          console.log(
            chalk.dim(
              'Add "sdk.enabled: true" to this agent in agents.json to enable execution.',
            ),
          );
          process.exit(1);
        }

        // Execute with SDK
        console.log(chalk.cyan("\nStarting agent execution..."));
        console.log(chalk.dim("─".repeat(60)));
        console.log(chalk.cyan("Agent:"), agentId);
        console.log(chalk.cyan("Model:"), model);
        if (options.autonomous) {
          console.log(
            chalk.cyan("Mode:"),
            "autonomous (no permission prompts)",
          );
        }
        if (options.phase) {
          console.log(chalk.cyan("Phase:"), options.phase);
        }
        console.log(chalk.cyan("Prompt:"), prompt);
        console.log(chalk.dim("─".repeat(60)));
        console.log(); // Extra newline for readability

        // Execute the agent
        const executionOptions = {
          prompt,
          model,
          phase: options.phase,
          workingDirectory: context.projectRoot,
          sessionId: options.session,
          additionalContext: options.context,
          autonomous: options.autonomous,
          permissionMode: options.autonomous
            ? ("acceptEdits" as const)
            : undefined,
        };

        let result;
        if (options.phase) {
          // Execute specific phase sub-agent
          result = await executePhase(generated, options.phase, prompt);
        } else {
          // Execute main agent with all sub-agents available
          result = await executeAgent(generated, executionOptions);
        }

        // Handle execution result
        if (!result.success) {
          console.error(chalk.red("\nExecution failed:"), result.error);
          process.exit(1);
        }

        // Show completion info
        console.log();
        console.log(chalk.green("✓ Execution completed successfully"));

        if (result.subAgentsInvoked && result.subAgentsInvoked.length > 0) {
          console.log(
            chalk.dim("Sub-agents invoked:"),
            result.subAgentsInvoked.join(", "),
          );
        }

        if (result.sessionId && !options.session) {
          console.log(
            chalk.dim("Session ID:"),
            result.sessionId,
            chalk.dim("(use --session to resume)"),
          );
        }
      } catch (error) {
        console.error(chalk.red("Error:"), (error as Error).message);
        if (process.env.DEBUG) {
          console.error(chalk.dim("Stack trace:"), (error as Error).stack);
        }
        process.exit(1);
      }
    });
}
