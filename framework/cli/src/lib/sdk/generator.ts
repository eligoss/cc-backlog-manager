/**
 * SDK Agent Definition Generator
 *
 * Transforms framework agent definitions (markdown + registry) into
 * Claude Agent SDK AgentDefinition format.
 */

import fs from "fs-extra";
import path from "path";
import { DiscoveryEngine } from "../discovery-engine.js";
import type {
  SDKAgentDefinition,
  SDKConfiguration,
  GeneratedSDKAgent,
  FrameworkAgentDefinition,
  SubAgentType,
  SDKTool,
  SDKModel,
  ParsedAgentContent,
} from "./types.js";
import {
  generateAllSubAgents,
  getDefaultTools,
  getDefaultModel,
} from "./sub-agents.js";

/**
 * SDK Generator for transforming framework agents to SDK format
 */
export class SDKGenerator {
  private engine: DiscoveryEngine;
  private projectRoot: string;
  private agentsRegistry: Record<string, unknown>[] | null = null;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.engine = new DiscoveryEngine(path.join(projectRoot, "framework"));
  }

  /**
   * Initialize the generator by loading the discovery engine
   */
  async initialize(): Promise<void> {
    await this.engine.loadModules();
    await this.loadAgentsRegistry();
  }

  /**
   * Load the agents.json registry
   */
  private async loadAgentsRegistry(): Promise<void> {
    const registryPath = path.join(
      this.projectRoot,
      "ai",
      "registries",
      "agents.json",
    );
    if (await fs.pathExists(registryPath)) {
      const registry = await fs.readJson(registryPath);
      this.agentsRegistry = registry.agents || [];
    }
  }

  /**
   * Get SDK configuration from registry for an agent
   */
  private getSDKConfigFromRegistry(
    agentId: string,
  ): SDKConfiguration | undefined {
    if (!this.agentsRegistry) return undefined;

    const agentEntry = this.agentsRegistry.find(
      (a: Record<string, unknown>) => a.id === agentId,
    ) as Record<string, unknown> | undefined;

    if (!agentEntry?.sdk) return undefined;

    const sdk = agentEntry.sdk as Record<string, unknown>;
    return {
      enabled: (sdk.enabled as boolean) ?? false,
      model: (sdk.model as SDKModel) ?? "sonnet",
      allowedTools: (sdk["allowed-tools"] as SDKTool[]) ?? [],
      subAgents: (sdk["sub-agents"] as SubAgentType[]) ?? [],
      executionMode:
        (sdk["execution-mode"] as "interactive" | "autonomous") ??
        "interactive",
      maxTokens: sdk["max-tokens"] as number | undefined,
    };
  }

  /**
   * Generate SDK agent definition for a specific agent
   *
   * @param agentId - The agent ID to generate for
   * @returns Generated SDK agent with sub-agents
   */
  async generateForAgent(agentId: string): Promise<GeneratedSDKAgent> {
    // Get agent definition from discovery engine
    const agent = await this.engine.getAgentDefinition(agentId);

    // Get SDK configuration from registry
    const sdkConfig = this.getSDKConfigFromRegistry(agentId);

    // Convert to framework agent definition with SDK config
    const frameworkAgent: FrameworkAgentDefinition = {
      id: agent.id,
      moduleId: agent.moduleId,
      capabilityNeeds: agent.capabilityNeeds,
      contextCategoryNeeds: agent.contextCategoryNeeds,
      tokenBudget: agent.tokenBudget,
      sourcePath: agent.sourcePath,
      variant: "full",
      delegatesTo: undefined,
      parentAgent: undefined,
      sdk: sdkConfig,
    };

    // Parse agent markdown content
    const agentContent = await this.parseAgentMarkdown(agent.sourcePath);

    // Discover and load skills (three-tier loading)
    const discoveryResult = await this.engine.discoverSkillsForAgent(agentId);
    const essentialSkillsContent = await this.loadSkillsContent(
      discoveryResult.essentialSkills,
    );
    const discoveredSkillsContent = await this.loadSkillsContent(
      discoveryResult.discoveredSkills,
    );

    // Load context files
    const contextFiles = this.engine.getContextFilesForAgent(agent);
    const contextContent = await this.loadContextContent(contextFiles);

    // Build system prompt with tiered skills
    const systemPrompt = this.buildSystemPrompt(
      agentContent,
      essentialSkillsContent,
      discoveredSkillsContent,
      discoveryResult.availableSkills,
      contextContent,
      frameworkAgent,
    );

    // Determine tools and model
    const tools = sdkConfig?.allowedTools?.length
      ? sdkConfig.allowedTools
      : getDefaultTools();

    const model = sdkConfig?.model ?? getDefaultModel();

    // Create main agent definition
    const definition: SDKAgentDefinition = {
      description: this.extractDescription(agentContent),
      prompt: systemPrompt,
      tools,
      model,
    };

    // Generate sub-agents if configured
    const subAgentTypes = sdkConfig?.subAgents ?? [];
    const parentContext = this.buildParentContext(agentContent, frameworkAgent);
    const subAgents = generateAllSubAgents(subAgentTypes, parentContext);

    return {
      definition,
      subAgents,
      frameworkAgent,
      skillsContent: [...essentialSkillsContent, ...discoveredSkillsContent],
      essentialSkillsContent,
      discoveredSkillsContent,
      availableSkillIds: discoveryResult.availableSkills,
      contextContent,
    };
  }

  /**
   * Parse agent markdown file
   */
  private async parseAgentMarkdown(
    filePath: string,
  ): Promise<ParsedAgentContent> {
    const content = await fs.readFile(filePath, "utf-8");

    // Parse frontmatter
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    const frontmatter = this.parseFrontmatter(frontmatterMatch?.[1] ?? "");

    // Get body (content after frontmatter)
    const body = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "");

    // Extract title (first H1)
    const titleMatch = body.match(/^#\s+(.+)$/m);
    const title = titleMatch?.[1] ?? "Agent";

    // Extract purpose section
    const purposeMatch = body.match(/##\s*Purpose\s*\n([\s\S]*?)(?=\n##|$)/i);
    const purpose = purposeMatch?.[1]?.trim() ?? "";

    // Extract skill routing table
    const routingMatch = body.match(
      /##\s*Skill Routing Table\s*\n([\s\S]*?)(?=\n##|$)/i,
    );
    const skillRoutingTable = routingMatch?.[1]?.trim();

    return {
      frontmatter,
      title,
      purpose,
      body,
      skillRoutingTable,
    };
  }

  /**
   * Parse YAML-like frontmatter
   */
  private parseFrontmatter(content: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = content.split("\n");

    for (const line of lines) {
      const match = line.match(/^([a-z-]+):\s*(.*)$/i);
      if (match) {
        const [, key, value] = match;
        result[key] = value || null;
      }
    }

    return result;
  }

  /**
   * Load content from skill files
   */
  private async loadSkillsContent(skillIds: string[]): Promise<string[]> {
    const content: string[] = [];

    for (const skillId of skillIds) {
      const skills = await this.engine.getAllSkillsFromAllSources();
      const allSkills = [
        ...skills.project,
        ...skills.deployed,
        ...skills.modules,
      ];
      const skill = allSkills.find((s) => s.id === skillId);

      if (skill) {
        try {
          const skillContent = await fs.readFile(skill.sourcePath, "utf-8");
          // Remove frontmatter
          const bodyContent = skillContent.replace(
            /^---\s*\n[\s\S]*?\n---\s*\n/,
            "",
          );
          content.push(`## Skill: ${skillId}\n\n${bodyContent}`);
        } catch {
          // Skip skills that can't be read
        }
      }
    }

    return content;
  }

  /**
   * Load content from context files
   */
  private async loadContextContent(contextFiles: string[]): Promise<string[]> {
    const content: string[] = [];
    const contextDir = path.join(this.projectRoot, "ai", "context");

    for (const fileName of contextFiles) {
      const filePath = path.join(contextDir, fileName);
      if (await fs.pathExists(filePath)) {
        try {
          const fileContent = await fs.readFile(filePath, "utf-8");
          content.push(`## Context: ${fileName}\n\n${fileContent}`);
        } catch {
          // Skip files that can't be read
        }
      }
    }

    return content;
  }

  /**
   * Build the complete system prompt for the agent with three-tier skill loading
   */
  private buildSystemPrompt(
    agentContent: ParsedAgentContent,
    essentialSkillsContent: string[],
    discoveredSkillsContent: string[],
    availableSkillIds: string[],
    contextContent: string[],
    frameworkAgent: FrameworkAgentDefinition,
  ): string {
    const sections: string[] = [];

    // Agent identity and purpose
    sections.push(`# ${agentContent.title}`);
    sections.push(`\n**Agent ID:** ${frameworkAgent.id}`);
    sections.push(`**Module:** ${frameworkAgent.moduleId}`);

    if (agentContent.purpose) {
      sections.push(`\n## Purpose\n\n${agentContent.purpose}`);
    }

    // Core instructions from agent body
    sections.push(`\n## Instructions\n\n${agentContent.body}`);

    // Inject context if available
    if (contextContent.length > 0) {
      sections.push("\n---\n\n# Loaded Context\n");
      sections.push(contextContent.join("\n\n"));
    }

    // Tier 1: Essential Skills (always loaded)
    if (essentialSkillsContent.length > 0) {
      sections.push("\n---\n\n# Essential Skills (Tier 1: Pre-loaded)\n");
      sections.push(
        "The following skills are critical for this agent and always loaded:\n",
      );
      sections.push(essentialSkillsContent.join("\n\n"));
    }

    // Tier 2: Role-Based Skills (discovered via capabilities)
    if (discoveredSkillsContent.length > 0) {
      sections.push("\n---\n\n# Role-Based Skills (Tier 2: Auto-discovered)\n");
      sections.push(
        "The following skills have been loaded based on capability-needs:\n",
      );
      sections.push(discoveredSkillsContent.join("\n\n"));
    }

    // Tier 3: Available Skills (reference only, not loaded)
    if (availableSkillIds.length > 0) {
      sections.push("\n---\n\n# Available Skills (Tier 3: On-demand)\n");
      sections.push(
        "The following skills are available for on-demand invocation via Skill tool:\n",
      );
      sections.push(availableSkillIds.map((id) => `- ${id}`).join("\n"));
    }

    return sections.join("\n");
  }

  /**
   * Extract a short description from agent content
   */
  private extractDescription(agentContent: ParsedAgentContent): string {
    // Use purpose if available, otherwise first paragraph of body
    if (agentContent.purpose) {
      // Take first sentence or first 200 chars
      const firstSentence = agentContent.purpose.split(/[.!?]/)[0];
      return firstSentence.length > 200
        ? firstSentence.substring(0, 197) + "..."
        : firstSentence + ".";
    }

    // Fallback to title
    return `${agentContent.title} agent for the Agentic Development Framework.`;
  }

  /**
   * Build context string for sub-agents
   */
  private buildParentContext(
    agentContent: ParsedAgentContent,
    frameworkAgent: FrameworkAgentDefinition,
  ): string {
    return `
## Parent Agent Context

You are operating as a sub-agent of **${frameworkAgent.id}**.

**Parent Purpose:** ${agentContent.purpose || "General development assistance"}

**Working Directory:** Use the project root for all file operations.

**Reporting:** Return your findings to the parent agent in a structured format.
`;
  }

  /**
   * List all SDK-enabled agents
   */
  async listSDKEnabledAgents(): Promise<
    Array<{ id: string; model: SDKModel }>
  > {
    await this.loadAgentsRegistry();

    if (!this.agentsRegistry) return [];

    return this.agentsRegistry
      .filter((a: Record<string, unknown>) => {
        const sdk = a.sdk as Record<string, unknown> | undefined;
        return sdk?.enabled === true;
      })
      .map((a: Record<string, unknown>) => {
        const sdk = a.sdk as Record<string, unknown>;
        return {
          id: a.id as string,
          model: (sdk.model as SDKModel) ?? "sonnet",
        };
      });
  }

  /**
   * Check if an agent is SDK-enabled
   */
  async isSDKEnabled(agentId: string): Promise<boolean> {
    const config = this.getSDKConfigFromRegistry(agentId);
    return config?.enabled === true;
  }
}

/**
 * Create and initialize an SDK generator
 */
export async function createSDKGenerator(
  projectRoot: string,
): Promise<SDKGenerator> {
  const generator = new SDKGenerator(projectRoot);
  await generator.initialize();
  return generator;
}
