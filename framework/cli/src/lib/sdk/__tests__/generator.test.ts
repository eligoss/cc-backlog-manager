/**
 * Unit tests for SDK generator
 */

import { SDKGenerator } from "../generator.js";
import fs from "fs-extra";
import path from "path";

// Mock fs-extra
jest.mock("fs-extra");

// Mock DiscoveryEngine
jest.mock("../../discovery-engine.js", () => {
  return {
    DiscoveryEngine: jest.fn().mockImplementation(() => ({
      loadModules: jest.fn().mockResolvedValue(undefined),
      getAgentDefinition: jest.fn().mockResolvedValue({
        id: "test-agent",
        moduleId: "test",
        capabilityNeeds: ["test-capability"],
        tokenBudget: 1000,
        sourcePath: "/test/agent.md",
        variant: "full",
      }),
      discoverSkillsForAgent: jest.fn().mockResolvedValue({
        skills: ["test-skill"],
        essentialSkills: [],
        discoveredSkills: ["test-skill"],
        availableSkills: [],
        unfulfilledCapabilities: [],
        moduleId: "test",
      }),
      getAllSkillsFromAllSources: jest.fn().mockResolvedValue({
        project: [],
        deployed: [],
        modules: [
          {
            id: "test-skill",
            sourcePath: "/test/skill.md",
          },
        ],
      }),
    })),
  };
});

describe("SDKGenerator", () => {
  const mockProjectRoot = "/mock/project";
  let generator: SDKGenerator;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock file system reads
    (fs.pathExists as jest.Mock).mockResolvedValue(true);

    (fs.readJson as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes("agents.json")) {
        return Promise.resolve({
          agents: [
            {
              id: "test-agent",
              sdk: {
                enabled: true,
                model: "opus",
                "allowed-tools": ["Read", "Write", "Edit"],
                "sub-agents": ["explore", "implementer"],
                "execution-mode": "interactive",
              },
            },
          ],
        });
      }
      return Promise.resolve({});
    });

    (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes("agent.md")) {
        return Promise.resolve(`---
variant: full
---

# Test Agent

## Purpose

This is a test agent for unit testing.

## Instructions

Do test things.
`);
      }

      if (filePath.includes("skill.md")) {
        return Promise.resolve(`---
id: test-skill
---

# Test Skill

This is a test skill.
`);
      }

      if (filePath.includes("technical-basic.md")) {
        return Promise.resolve("# Technical Context\n\nBasic technical info.");
      }

      return Promise.resolve("");
    });

    generator = new SDKGenerator(mockProjectRoot);
    await generator.initialize();
  });

  describe("generateForAgent", () => {
    it("should generate SDK definition for agent", async () => {
      const result = await generator.generateForAgent("test-agent");

      expect(result.definition).toBeDefined();
      expect(result.definition.description).toBeTruthy();
      expect(result.definition.prompt).toContain("Test Agent");
      expect(result.definition.tools).toContain("Read");
      expect(result.definition.model).toBe("opus");
    });

    it("should generate sub-agents based on configuration", async () => {
      const result = await generator.generateForAgent("test-agent");

      expect(result.subAgents.size).toBe(2);
      expect(result.subAgents.has("explore")).toBe(true);
      expect(result.subAgents.has("implementer")).toBe(true);
    });

    it("should inject skills into system prompt", async () => {
      const result = await generator.generateForAgent("test-agent");

      // Should contain Role-Based Skills (Tier 2) since test-skill is in discoveredSkills
      expect(result.definition.prompt).toContain("Role-Based Skills");
      expect(result.definition.prompt).toContain("test-skill");
    });

    it("should use default tools when not specified", async () => {
      // Mock agent without SDK tools config
      (fs.readJson as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes("agents.json")) {
          return Promise.resolve({
            agents: [
              {
                id: "test-agent",
                sdk: {
                  enabled: true,
                  model: "sonnet",
                  "sub-agents": [],
                  "execution-mode": "interactive",
                },
              },
            ],
          });
        }
        return Promise.resolve({});
      });

      const newGenerator = new SDKGenerator(mockProjectRoot);
      await newGenerator.initialize();
      const result = await newGenerator.generateForAgent("test-agent");

      // Should have default tools for full variant
      expect(result.definition.tools.length).toBeGreaterThan(0);
      expect(result.definition.tools).toContain("Read");
      expect(result.definition.tools).toContain("Task");
    });

    it("should use default model when not specified", async () => {
      (fs.readJson as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes("agents.json")) {
          return Promise.resolve({
            agents: [
              {
                id: "test-agent",
                variant: "slim", // Slim variant for this test
                sdk: {
                  enabled: true,
                  "sub-agents": [],
                  "execution-mode": "interactive",
                },
              },
            ],
          });
        }
        return Promise.resolve({});
      });

      const newGenerator = new SDKGenerator(mockProjectRoot);
      await newGenerator.initialize();
      const result = await newGenerator.generateForAgent("test-agent");

      // Slim variant should default to sonnet
      expect(result.definition.model).toBe("sonnet");
    });

    it("should include framework agent metadata", async () => {
      const result = await generator.generateForAgent("test-agent");

      expect(result.frameworkAgent).toBeDefined();
      expect(result.frameworkAgent.id).toBe("test-agent");
      expect(result.frameworkAgent.variant).toBe("full");
      expect(result.frameworkAgent.sdk).toBeDefined();
    });

    it("should extract purpose from agent markdown", async () => {
      const result = await generator.generateForAgent("test-agent");

      expect(result.definition.description).toContain("test agent");
    });
  });

  describe("listSDKEnabledAgents", () => {
    it("should list only SDK-enabled agents", async () => {
      (fs.readJson as jest.Mock).mockResolvedValue({
        agents: [
          {
            id: "agent-1",
            variant: "full",
            sdk: { enabled: true, model: "opus" },
          },
          {
            id: "agent-2",
            variant: "slim",
            sdk: { enabled: false, model: "sonnet" },
          },
          {
            id: "agent-3",
            variant: "full",
            sdk: { enabled: true, model: "sonnet" },
          },
        ],
      });

      const newGenerator = new SDKGenerator(mockProjectRoot);
      await newGenerator.initialize();
      const agents = await newGenerator.listSDKEnabledAgents();

      expect(agents.length).toBe(2);
      expect(agents[0].id).toBe("agent-1");
      expect(agents[1].id).toBe("agent-3");
    });

    it("should return empty array when no agents are SDK-enabled", async () => {
      (fs.readJson as jest.Mock).mockResolvedValue({
        agents: [
          {
            id: "agent-1",
            sdk: { enabled: false },
          },
        ],
      });

      const newGenerator = new SDKGenerator(mockProjectRoot);
      await newGenerator.initialize();
      const agents = await newGenerator.listSDKEnabledAgents();

      expect(agents).toEqual([]);
    });
  });

  describe("isSDKEnabled", () => {
    it("should return true for SDK-enabled agent", async () => {
      const enabled = await generator.isSDKEnabled("test-agent");

      expect(enabled).toBe(true);
    });

    it("should return false for non-enabled agent", async () => {
      (fs.readJson as jest.Mock).mockResolvedValue({
        agents: [
          {
            id: "disabled-agent",
            sdk: { enabled: false },
          },
        ],
      });

      const newGenerator = new SDKGenerator(mockProjectRoot);
      await newGenerator.initialize();
      const enabled = await newGenerator.isSDKEnabled("disabled-agent");

      expect(enabled).toBe(false);
    });

    it("should return false for agent without SDK config", async () => {
      (fs.readJson as jest.Mock).mockResolvedValue({
        agents: [
          {
            id: "no-sdk-agent",
          },
        ],
      });

      const newGenerator = new SDKGenerator(mockProjectRoot);
      await newGenerator.initialize();
      const enabled = await newGenerator.isSDKEnabled("no-sdk-agent");

      expect(enabled).toBe(false);
    });
  });

  describe("sub-agent generation", () => {
    it("should generate correct tools for explore sub-agent", async () => {
      const result = await generator.generateForAgent("test-agent");
      const exploreAgent = result.subAgents.get("explore");

      expect(exploreAgent).toBeDefined();
      expect(exploreAgent?.model).toBe("haiku");
      expect(exploreAgent?.tools).toEqual(["Read", "Glob", "Grep"]);
      expect(exploreAgent?.prompt).toContain("Explore sub-agent");
    });

    it("should generate correct tools for implementer sub-agent", async () => {
      const result = await generator.generateForAgent("test-agent");
      const implementerAgent = result.subAgents.get("implementer");

      expect(implementerAgent).toBeDefined();
      expect(implementerAgent?.model).toBe("sonnet");
      expect(implementerAgent?.tools).toContain("Write");
      expect(implementerAgent?.tools).toContain("Edit");
    });

    it("should inject parent context into sub-agent prompts", async () => {
      const result = await generator.generateForAgent("test-agent");
      const exploreAgent = result.subAgents.get("explore");

      expect(exploreAgent?.prompt).toContain("Parent Agent Context");
      expect(exploreAgent?.prompt).toContain("test-agent");
    });
  });

  describe("buildSystemPrompt - Three-Tier Skill Loading", () => {
    let tierGenerator: SDKGenerator;

    beforeEach(async () => {
      // Mock DiscoveryEngine to return three-tier results
      const DiscoveryEngine =
        require("../../discovery-engine.js").DiscoveryEngine;
      DiscoveryEngine.mockImplementation(() => ({
        loadModules: jest.fn().mockResolvedValue(undefined),
        getAgentDefinition: jest.fn().mockResolvedValue({
          id: "test-agent",
          moduleId: "test",
          capabilityNeeds: ["capability-1"],
            tokenBudget: 3000,
          sourcePath: "/test/agent.md",
          variant: "full",
          essentialSkills: ["essential-skill-1"],
          availableSkills: ["available-skill-1", "available-skill-2"],
        }),
        discoverSkillsForAgent: jest.fn().mockResolvedValue({
          skills: ["discovered-skill-1"],
          essentialSkills: ["essential-skill-1"],
          discoveredSkills: ["discovered-skill-1"],
          availableSkills: ["available-skill-1", "available-skill-2"],
          unfulfilledCapabilities: [],
          moduleId: "test",
        }),
        getAllSkillsFromAllSources: jest.fn().mockResolvedValue({
          project: [],
          deployed: [],
          modules: [
            {
              id: "essential-skill-1",
              sourcePath: "/test/essential-skill-1.md",
            },
            {
              id: "discovered-skill-1",
              sourcePath: "/test/discovered-skill-1.md",
            },
            {
              id: "available-skill-1",
              sourcePath: "/test/available-skill-1.md",
            },
            {
              id: "available-skill-2",
              sourcePath: "/test/available-skill-2.md",
            },
          ],
        }),
      }));

      tierGenerator = new SDKGenerator(mockProjectRoot);
      await tierGenerator.initialize();
    });

    it("should create three distinct sections for skills", async () => {
      const result = await tierGenerator.generateForAgent("test-agent");
      const prompt = result.definition.prompt;

      expect(prompt).toContain("Essential Skills (Tier 1: Pre-loaded)");
      expect(prompt).toContain("Role-Based Skills (Tier 2: Auto-discovered)");
      expect(prompt).toContain("Available Skills (Tier 3: On-demand)");
    });

    it("should include Tier 1 header with correct description", async () => {
      const result = await tierGenerator.generateForAgent("test-agent");
      const prompt = result.definition.prompt;

      expect(prompt).toContain("Tier 1: Pre-loaded");
      expect(prompt).toContain("critical for this agent and always loaded");
    });

    it("should include Tier 2 header with correct description", async () => {
      const result = await tierGenerator.generateForAgent("test-agent");
      const prompt = result.definition.prompt;

      expect(prompt).toContain("Tier 2: Auto-discovered");
      expect(prompt).toContain("loaded based on capability-needs");
    });

    it("should include Tier 3 header with correct description", async () => {
      const result = await tierGenerator.generateForAgent("test-agent");
      const prompt = result.definition.prompt;

      expect(prompt).toContain("Tier 3: On-demand");
      expect(prompt).toContain("on-demand invocation via Skill tool");
    });

    it("should render Tier 3 skills as list (IDs only)", async () => {
      const result = await tierGenerator.generateForAgent("test-agent");
      const prompt = result.definition.prompt;

      // Should contain list items
      expect(prompt).toContain("- available-skill-1");
      expect(prompt).toContain("- available-skill-2");

      // Should NOT contain full content headers for Tier 3
      expect(prompt).not.toContain("## Skill: available-skill-1");
    });

    it("should use horizontal rules to separate sections", async () => {
      const result = await tierGenerator.generateForAgent("test-agent");
      const prompt = result.definition.prompt;

      const hrCount = (prompt.match(/---/g) || []).length;
      expect(hrCount).toBeGreaterThanOrEqual(3);
    });

    it("should maintain section order: Tier 1 -> Tier 2 -> Tier 3", async () => {
      const result = await tierGenerator.generateForAgent("test-agent");
      const prompt = result.definition.prompt;

      const tier1Idx = prompt.indexOf("Essential Skills");
      const tier2Idx = prompt.indexOf("Role-Based Skills");
      const tier3Idx = prompt.indexOf("Available Skills");

      expect(tier1Idx).toBeLessThan(tier2Idx);
      expect(tier2Idx).toBeLessThan(tier3Idx);
    });

    it("should return essentialSkillsContent and discoveredSkillsContent separately", async () => {
      const result = await tierGenerator.generateForAgent("test-agent");

      expect(result.essentialSkillsContent).toBeDefined();
      expect(result.discoveredSkillsContent).toBeDefined();
      expect(result.availableSkillIds).toBeDefined();

      expect(Array.isArray(result.essentialSkillsContent)).toBe(true);
      expect(Array.isArray(result.discoveredSkillsContent)).toBe(true);
      expect(Array.isArray(result.availableSkillIds)).toBe(true);
    });

    it("should handle empty skill arrays gracefully", async () => {
      // Mock no skills
      const DiscoveryEngine =
        require("../../discovery-engine.js").DiscoveryEngine;
      DiscoveryEngine.mockImplementation(() => ({
        loadModules: jest.fn().mockResolvedValue(undefined),
        getAgentDefinition: jest.fn().mockResolvedValue({
          id: "test-agent",
          moduleId: "test",
          capabilityNeeds: [],
          tokenBudget: 1000,
          sourcePath: "/test/agent.md",
          variant: "slim",
        }),
        discoverSkillsForAgent: jest.fn().mockResolvedValue({
          skills: [],
          essentialSkills: [],
          discoveredSkills: [],
          availableSkills: [],
          unfulfilledCapabilities: [],
          moduleId: "test",
        }),
        getAllSkillsFromAllSources: jest.fn().mockResolvedValue({
          project: [],
          deployed: [],
          modules: [],
        }),
      }));

      const emptyGenerator = new SDKGenerator(mockProjectRoot);
      await emptyGenerator.initialize();
      const result = await emptyGenerator.generateForAgent("test-agent");

      expect(result.essentialSkillsContent).toEqual([]);
      expect(result.discoveredSkillsContent).toEqual([]);
      expect(result.availableSkillIds).toEqual([]);
    });

    it("should omit Tier 1 section if no essential skills", async () => {
      const DiscoveryEngine =
        require("../../discovery-engine.js").DiscoveryEngine;
      DiscoveryEngine.mockImplementation(() => ({
        loadModules: jest.fn().mockResolvedValue(undefined),
        getAgentDefinition: jest.fn().mockResolvedValue({
          id: "test-agent",
          moduleId: "test",
          capabilityNeeds: ["cap-1"],
          tokenBudget: 1000,
          sourcePath: "/test/agent.md",
          variant: "full",
        }),
        discoverSkillsForAgent: jest.fn().mockResolvedValue({
          skills: ["discovered-1"],
          essentialSkills: [],
          discoveredSkills: ["discovered-1"],
          availableSkills: [],
          unfulfilledCapabilities: [],
          moduleId: "test",
        }),
        getAllSkillsFromAllSources: jest.fn().mockResolvedValue({
          project: [],
          deployed: [],
          modules: [
            { id: "discovered-1", sourcePath: "/test/discovered-1.md" },
          ],
        }),
      }));

      const noTier1Generator = new SDKGenerator(mockProjectRoot);
      await noTier1Generator.initialize();
      const result = await noTier1Generator.generateForAgent("test-agent");

      expect(result.definition.prompt).not.toContain(
        "Essential Skills (Tier 1",
      );
    });

    it("should omit Tier 2 section if no discovered skills", async () => {
      const DiscoveryEngine =
        require("../../discovery-engine.js").DiscoveryEngine;
      DiscoveryEngine.mockImplementation(() => ({
        loadModules: jest.fn().mockResolvedValue(undefined),
        getAgentDefinition: jest.fn().mockResolvedValue({
          id: "test-agent",
          moduleId: "test",
          capabilityNeeds: [],
          tokenBudget: 1000,
          sourcePath: "/test/agent.md",
          variant: "full",
          essentialSkills: ["essential-1"],
          availableSkills: ["available-1"],
        }),
        discoverSkillsForAgent: jest.fn().mockResolvedValue({
          skills: [],
          essentialSkills: ["essential-1"],
          discoveredSkills: [],
          availableSkills: ["available-1"],
          unfulfilledCapabilities: [],
          moduleId: "test",
        }),
        getAllSkillsFromAllSources: jest.fn().mockResolvedValue({
          project: [],
          deployed: [],
          modules: [
            { id: "essential-1", sourcePath: "/test/essential-1.md" },
            { id: "available-1", sourcePath: "/test/available-1.md" },
          ],
        }),
      }));

      const noTier2Generator = new SDKGenerator(mockProjectRoot);
      await noTier2Generator.initialize();
      const result = await noTier2Generator.generateForAgent("test-agent");

      expect(result.definition.prompt).not.toContain(
        "Role-Based Skills (Tier 2",
      );
    });

    it("should omit Tier 3 section if no available skills", async () => {
      const DiscoveryEngine =
        require("../../discovery-engine.js").DiscoveryEngine;
      DiscoveryEngine.mockImplementation(() => ({
        loadModules: jest.fn().mockResolvedValue(undefined),
        getAgentDefinition: jest.fn().mockResolvedValue({
          id: "test-agent",
          moduleId: "test",
          capabilityNeeds: ["cap-1"],
          tokenBudget: 1000,
          sourcePath: "/test/agent.md",
          variant: "full",
          essentialSkills: ["essential-1"],
        }),
        discoverSkillsForAgent: jest.fn().mockResolvedValue({
          skills: ["discovered-1"],
          essentialSkills: ["essential-1"],
          discoveredSkills: ["discovered-1"],
          availableSkills: [],
          unfulfilledCapabilities: [],
          moduleId: "test",
        }),
        getAllSkillsFromAllSources: jest.fn().mockResolvedValue({
          project: [],
          deployed: [],
          modules: [
            { id: "essential-1", sourcePath: "/test/essential-1.md" },
            { id: "discovered-1", sourcePath: "/test/discovered-1.md" },
          ],
        }),
      }));

      const noTier3Generator = new SDKGenerator(mockProjectRoot);
      await noTier3Generator.initialize();
      const result = await noTier3Generator.generateForAgent("test-agent");

      expect(result.definition.prompt).not.toContain(
        "Available Skills (Tier 3",
      );
    });
  });
});
