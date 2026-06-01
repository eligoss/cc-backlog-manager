/**
 * OpenClaw Export Command
 *
 * Generates a machine-readable agent manifest from the agents registry
 * for consumption by OpenClaw or other external orchestrators.
 */

import { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { CliContext } from "../../lib/cli-context.js";

interface AgentRegistryEntry {
  id: string;
  module: string;
  "capability-needs": string[];
  "essential-skills": string[];
  "available-skills"?: string[];
  "custom-agent-file"?: string;
  sdk?: {
    enabled: boolean;
    model: string;
    "execution-mode": string;
  };
}

export function createOpenclawExportCommand(): Command {
  return new Command("export")
    .description("Generate OpenClaw agent manifest from registry")
    .option("-p, --path <path>", "Project path", ".")
    .option(
      "-o, --output <file>",
      "Output file path",
      "integrations/openclaw/manifest.json",
    )
    .action(async (options) => {
      try {
        const context = await CliContext.create({ path: options.path });
        const registryPath = path.join(
          context.projectRoot,
          ".claude/registries/agents.json",
        );

        if (!(await fs.pathExists(registryPath))) {
          console.error(chalk.red("Error:"), "Agents registry not found.");
          process.exit(1);
        }

        const registry = await fs.readJson(registryPath);
        const agents: AgentRegistryEntry[] = registry.agents || [];

        // Filter to SDK-enabled agents
        const sdkAgents = agents.filter((a) => a.sdk?.enabled);

        // Read package.json for version
        const pkgPath = path.join(context.projectRoot, "package.json");
        const pkg = (await fs.pathExists(pkgPath))
          ? await fs.readJson(pkgPath)
          : { version: "0.0.0" };

        // Build manifest
        const manifest = {
          $schema: "https://openclaw.dev/schemas/agent-catalog.json",
          name: "agentic-development-framework",
          version: pkg.version || "0.0.0",
          description:
            "Modular framework for AI-assisted software development with composable agents",
          agents: sdkAgents.map((agent) => ({
            id: agent.id,
            name: agent.id
              .replace(/^ai-/, "")
              .replace(/-/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase()),
            model: agent.sdk?.model || "sonnet",
            module: agent.module,
            capabilities: agent["capability-needs"] || [],
            skills: agent["essential-skills"] || [],
            autonomous: true,
            agentFile:
              agent["custom-agent-file"] || `.claude/agents/${agent.id}.json`,
          })),
          execution: {
            command:
              'agentic-framework agent run {agent-id} "{prompt}" --autonomous',
            dryRunCommand:
              'agentic-framework agent run {agent-id} "{prompt}" --autonomous --dry-run',
            permissionMode: "acceptEdits",
          },
        };

        // Write manifest
        const outputPath = path.resolve(context.projectRoot, options.output);
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeJson(outputPath, manifest, { spaces: 2 });

        console.log(chalk.green("✓"), `Manifest exported to ${options.output}`);
        console.log(chalk.dim(`  ${sdkAgents.length} agents included`));
      } catch (error) {
        console.error(chalk.red("Error:"), (error as Error).message);
        process.exit(1);
      }
    });
}
