/**
 * Agent Generator Module
 *
 * Generates Claude Code custom agent JSON definitions from slim agent markdown files.
 * These JSON files enable slim agents to be invoked as true subagents via the Task tool
 * with their own subagent_type.
 *
 * Usage:
 *     const generator = new AgentGenerator(projectRoot);
 *     const results = await generator.generateAll();
 *
 * The generated JSON files are written to module source directories (framework/modules/{module}/agents/)
 * alongside the markdown files. They are then deployed to .claude/agents/ by the sync command.
 */

import fs from "fs-extra";
import path from "path";
import yaml from "js-yaml";

/**
 * Agent definition from agents.json registry
 */
export interface AgentDefinition {
  id: string;
  module: string;
  file: string;
  "essential-skills"?: string[];
  "capability-needs"?: string[];
  "available-skills"?: string[];
  "context-category-needs"?: {
    business?: "basic" | "advanced" | "expert";
    technical?: "basic" | "advanced" | "expert";
    process?: "basic" | "advanced" | "expert";
  };
  "context-files"?: string[];
  "token-budget"?: number;
  variant?: "full" | "slim";
  "parent-agent"?: string;
  "delegates-to"?: string[];
  "deploy-to"?: "command" | "agent" | "both";
}

/**
 * Claude Code custom agent JSON definition
 */
export interface CustomAgentDefinition {
  $schema?: string;
  name: string;
  description: string;
  model: "opus" | "sonnet" | "haiku";
  instructions: string;
  tools: string[];
  skills?: string[];
  context?: {
    business?: "basic" | "advanced" | "expert";
    technical?: "basic" | "advanced" | "expert";
    process?: "basic" | "advanced" | "expert";
  };
  sourceAgent: string;
  generated: string;
}

/**
 * Agent frontmatter parsed from markdown
 */
interface AgentFrontmatter {
  agent: string;
  role?: string;
  "framework-version"?: string;
  "essential-skills"?: string[];
  "capability-needs"?: string[];
  "available-skills"?: string[];
  variant?: "full" | "slim";
  "parent-agent"?: string;
  "context-category-needs"?: {
    business?: "basic" | "advanced" | "expert";
    technical?: "basic" | "advanced" | "expert";
    process?: "basic" | "advanced" | "expert";
  };
  "token-budget"?: number;
  "deploy-to"?: "command" | "agent" | "both";
}

/**
 * Result of generating a single agent
 */
export interface GenerationItem {
  agentId: string;
  sourcePath: string;
  outputPath: string;
  action: "created" | "updated" | "skipped" | "failed";
  error?: string;
}

/**
 * Generates Claude Code custom agent JSON definitions from slim agent markdown files.
 *
 * The generator:
 * 1. Reads agents.json to find all slim agents
 * 2. Parses each slim agent's markdown file
 * 3. Extracts description, instructions, and metadata
 * 4. Generates JSON matching custom-agent.schema.json
 * 5. Writes JSON files alongside markdown sources
 */
export class AgentGenerator {
  /** Default tools for slim agents */
  private static readonly DEFAULT_TOOLS = [
    "Read",
    "Write",
    "Edit",
    "Glob",
    "Grep",
    "Bash",
    "Task",
    "TodoWrite",
    "Skill",
  ];

  private readonly projectRoot: string;

  /**
   * Initialize the AgentGenerator.
   *
   * @param projectRoot - Absolute path to the project root directory
   */
  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
  }

  /**
   * Generate custom agent JSON files for all slim agents.
   *
   * @param options - Generation options
   * @returns List of generation results
   */
  async generateAll(
    options: {
      dryRun?: boolean;
      force?: boolean;
      agentId?: string;
    } = {},
  ): Promise<GenerationItem[]> {
    const results: GenerationItem[] = [];

    // Load agents registry
    const registryPath = path.join(
      this.projectRoot,
      ".claude/registries/agents.json",
    );
    if (!(await fs.pathExists(registryPath))) {
      throw new Error(`Agents registry not found: ${registryPath}`);
    }

    const registry = await fs.readJson(registryPath);
    const agents: AgentDefinition[] = registry.agents || [];

    // Apply agent filter if specified
    const targetAgents = options.agentId
      ? agents.filter((a) => a.id === options.agentId)
      : agents;

    if (options.agentId && targetAgents.length === 0) {
      throw new Error(`Agent not found: ${options.agentId}`);
    }

    for (const agent of targetAgents) {
      const result = await this.generateAgent(agent, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Generate custom agent JSON for a single slim agent.
   *
   * @param agent - Agent definition from registry
   * @param options - Generation options
   * @returns Generation result
   */
  private async generateAgent(
    agent: AgentDefinition,
    options: { dryRun?: boolean; force?: boolean },
  ): Promise<GenerationItem> {
    // Resolve paths
    // agents.json stores paths like ".claude/commands/ai-xxx.md" but actual source is in framework/modules/*/agents/
    const sourcePath = await this.resolveAgentSourcePath(agent);
    const outputPath = sourcePath.replace(".md", ".json");

    const result: GenerationItem = {
      agentId: agent.id,
      sourcePath,
      outputPath,
      action: "skipped",
    };

    try {
      // Check if output exists
      const outputExists = await fs.pathExists(outputPath);
      if (outputExists && !options.force) {
        result.action = "skipped";
        return result;
      }

      // Read and parse source markdown
      const content = await fs.readFile(sourcePath, "utf-8");
      const { frontmatter, body } = this.parseMarkdown(content);

      // Skip JSON generation for command-only agents
      const deployTo = frontmatter["deploy-to"] || agent["deploy-to"] || "both";
      if (deployTo === "command") {
        result.action = "skipped";
        return result;
      }

      // Generate custom agent definition
      const customAgent = this.buildCustomAgent(agent, frontmatter, body);

      // Write output
      if (!options.dryRun) {
        await fs.writeJson(outputPath, customAgent, { spaces: 2 });
      }

      result.action = outputExists ? "updated" : "created";
    } catch (error) {
      result.action = "failed";
      result.error = error instanceof Error ? error.message : String(error);
    }

    return result;
  }

  /**
   * Resolve the actual source path for an agent.
   *
   * The registry stores paths relative to project root, but we need the actual
   * source file in framework/modules/{module}/agents/.
   */
  private async resolveAgentSourcePath(
    agent: AgentDefinition,
  ): Promise<string> {
    // Try framework module path first
    const modulePath = path.join(
      this.projectRoot,
      "framework/modules",
      agent.module,
      "agents",
      `${agent.id}.md`,
    );

    if (await fs.pathExists(modulePath)) {
      return modulePath;
    }

    // Fallback to registry file path
    const registryPath = path.join(this.projectRoot, agent.file);
    if (await fs.pathExists(registryPath)) {
      return registryPath;
    }

    throw new Error(`Agent source file not found for ${agent.id}`);
  }

  /**
   * Parse markdown file with YAML frontmatter.
   */
  private parseMarkdown(content: string): {
    frontmatter: AgentFrontmatter;
    body: string;
  } {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
      throw new Error("Invalid markdown: missing frontmatter");
    }

    const frontmatter = yaml.load(frontmatterMatch[1]) as AgentFrontmatter;
    const body = frontmatterMatch[2];

    return { frontmatter, body };
  }

  /**
   * Build custom agent JSON definition from parsed markdown.
   */
  private buildCustomAgent(
    agent: AgentDefinition,
    frontmatter: AgentFrontmatter,
    body: string,
  ): CustomAgentDefinition {
    // Extract description from Purpose line in body
    const description = this.extractDescription(body, frontmatter.role);

    // Generate condensed instructions
    const instructions = this.generateInstructions(agent, frontmatter, body);

    // Determine model (slim agents default to sonnet)
    const model: "sonnet" | "haiku" | "opus" = "sonnet";

    // Build skills list from essential skills
    const skills =
      agent["essential-skills"] || frontmatter["essential-skills"] || [];

    // Build context from registry or frontmatter
    const context =
      agent["context-category-needs"] || frontmatter["context-category-needs"];

    return {
      $schema:
        "../../../framework/modules/core/registries/schemas/custom-agent.schema.json",
      name: agent.id,
      description,
      model,
      instructions,
      tools: [...AgentGenerator.DEFAULT_TOOLS],
      skills,
      context,
      sourceAgent: agent.id,
      generated: new Date().toISOString(),
    };
  }

  /**
   * Extract description from markdown body.
   */
  private extractDescription(body: string, role?: string): string {
    // Try to find Purpose line
    const purposeMatch = body.match(/\*\*Purpose:\*\*\s*(.+)/);
    if (purposeMatch) {
      return purposeMatch[1].trim();
    }

    // Try to find first paragraph after heading
    const paragraphMatch = body.match(/^#[^\n]+\n+([^#\n][^\n]+)/);
    if (paragraphMatch) {
      return paragraphMatch[1].trim().substring(0, 200);
    }

    // Fallback to role
    return role || "Slim agent for focused task execution";
  }

  /**
   * Generate condensed instructions for the custom agent.
   */
  private generateInstructions(
    agent: AgentDefinition,
    frontmatter: AgentFrontmatter,
    body: string,
  ): string {
    const agentName = agent.id;
    const parentAgent =
      agent["parent-agent"] || frontmatter["parent-agent"] || "orchestrator";
    const skills =
      agent["essential-skills"] || frontmatter["essential-skills"] || [];

    // Extract key sections from body
    const scope = this.extractSection(body, "Scope");
    const execution =
      this.extractSection(body, "Task Execution") ||
      this.extractSection(body, "Execution Steps");
    const validation = this.extractSection(body, "Validation Checklist");
    const antiPatterns = this.extractSection(body, "Anti-Patterns");

    // Build condensed instructions
    let instructions = `You are ${agentName}, a slim agent variant designed for focused task execution.

## Role
${scope || "Execute a single focused task as delegated by the parent orchestrator."}

## Parent Agent
This agent is invoked by ${parentAgent}. Control returns to parent after completion.

## Pre-loaded Skills
${skills.map((s) => `- ${s}`).join("\n")}

`;

    if (execution) {
      instructions += `## Execution
${this.condenseSection(execution)}

`;
    }

    if (validation) {
      instructions += `## Validation
${this.condenseSection(validation)}

`;
    }

    if (antiPatterns) {
      instructions += `## Critical Rules
${this.condenseSection(antiPatterns)}

`;
    }

    instructions += `## Output
Return a structured summary to the orchestrator including:
- What was accomplished
- Files modified
- Test results (if applicable)
- Issues or blockers encountered
- Suggested next steps`;

    return instructions;
  }

  /**
   * Extract a section from markdown body by heading.
   */
  private extractSection(body: string, heading: string): string | null {
    const pattern = new RegExp(
      `(?:^|\\n)#+\\s*${heading}[^\\n]*\\n([\\s\\S]*?)(?=\\n#|$)`,
      "i",
    );
    const match = body.match(pattern);
    return match ? match[1].trim() : null;
  }

  /**
   * Condense a section by removing excessive whitespace and limiting length.
   */
  private condenseSection(section: string): string {
    return section
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n")
      .substring(0, 1500); // Limit length
  }
}
