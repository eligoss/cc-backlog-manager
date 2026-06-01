/**
 * E2E Integration Test: Level-Based Context Loading and Agent Variants
 *
 * This test verifies all the new level-based context loading and agent variant features
 * work as intended across the entire framework.
 */

import { describe, it, expect, beforeAll } from "@jest/globals";
import path from "path";
import fs from "fs-extra";
import {
  DiscoveryEngine,
  AgentDefinition,
  ContextLevel,
} from "../../lib/discovery-engine.js";
import { FrameworkValidator } from "../../lib/framework-validator.js";

describe("Level-Based Context Loading and Agent Variants - Integration", () => {
  const frameworkRoot = path.resolve(__dirname, "../../../../");
  let discoveryEngine: DiscoveryEngine;
  let validator: FrameworkValidator;
  let allAgents: AgentDefinition[];

  beforeAll(async () => {
    discoveryEngine = new DiscoveryEngine(frameworkRoot);
    await discoveryEngine.loadModules();
    allAgents = await discoveryEngine.getAllAgents();
    validator = new FrameworkValidator(discoveryEngine, frameworkRoot);
  });

  describe("Cumulative Context Loading", () => {
    it("should compute correct files for basic level", () => {
      const files = discoveryEngine.getCumulativeContextFiles(
        "business",
        "basic",
      );
      expect(files).toEqual(["business-basic.md"]);
    });

    it("should compute correct files for advanced level (basic + advanced)", () => {
      const files = discoveryEngine.getCumulativeContextFiles(
        "technical",
        "advanced",
      );
      expect(files).toEqual(["technical-basic.md", "technical-advanced.md"]);
    });

    it("should compute correct files for expert level (all three)", () => {
      const files = discoveryEngine.getCumulativeContextFiles(
        "process",
        "expert",
      );
      expect(files).toEqual([
        "process-basic.md",
        "process-advanced.md",
        "process-expert.md",
      ]);
    });

    it("should compute cumulative files for all three categories", () => {
      const businessFiles = discoveryEngine.getCumulativeContextFiles(
        "business",
        "expert",
      );
      const technicalFiles = discoveryEngine.getCumulativeContextFiles(
        "technical",
        "expert",
      );
      const processFiles = discoveryEngine.getCumulativeContextFiles(
        "process",
        "expert",
      );

      expect(businessFiles).toEqual([
        "business-basic.md",
        "business-advanced.md",
        "business-expert.md",
      ]);
      expect(technicalFiles).toEqual([
        "technical-basic.md",
        "technical-advanced.md",
        "technical-expert.md",
      ]);
      expect(processFiles).toEqual([
        "process-basic.md",
        "process-advanced.md",
        "process-expert.md",
      ]);
    });

    it("should compute cumulative files for an agent with mixed levels", () => {
      // Find an agent with mixed context levels (framework manager uses advanced)
      const agent = allAgents.find((a) => a.id === "ai-framework-manager");

      if (agent) {
        const files = discoveryEngine.getContextFilesForAgent(agent);

        // Should have cumulative files based on agent's context needs
        expect(files.length).toBeGreaterThan(0);
        // Should not have duplicates
        expect(files.length).toBe(new Set(files).size);

        // Should include context files based on declared needs
        const contextNeeds = agent.contextCategoryNeeds || {};
        for (const [category, level] of Object.entries(contextNeeds)) {
          const expectedFiles = discoveryEngine.getCumulativeContextFiles(
            category,
            level as ContextLevel,
          );
          for (const expectedFile of expectedFiles) {
            expect(files).toContain(expectedFile);
          }
        }
      }
    });

    it("should not have duplicate files in cumulative loading", () => {
      // Test all agents to ensure no duplicates
      for (const agent of allAgents) {
        const files = discoveryEngine.getContextFilesForAgent(agent);
        const uniqueFiles = [...new Set(files)];
        expect(files.length).toBe(uniqueFiles.length);
      }
    });

    it("should maintain correct order (basic, advanced, expert) in cumulative files", () => {
      const expertFiles = discoveryEngine.getCumulativeContextFiles(
        "business",
        "expert",
      );

      expect(expertFiles[0]).toBe("business-basic.md");
      expect(expertFiles[1]).toBe("business-advanced.md");
      expect(expertFiles[2]).toBe("business-expert.md");
    });
  });

  describe("Agent Discovery", () => {
    const expectedAgents = [
      "ai-framework-manager",
      "ai-framework-developer",
      "ai-backlog-manager",
      "ai-architect",
      "ai-app-developer",
      "ai-confluence-manager",
      "ai-scout-backlog",
      "ai-scout-codebase",
      "ai-scout-knowledge",
    ];

    it("should discover all 9 agents", () => {
      expect(allAgents.length).toBe(9);

      for (const agentId of expectedAgents) {
        expect(allAgents.map((a) => a.id)).toContain(agentId);
      }
    });
  });

  describe("Agent Token Budget Validation", () => {
    it("all agents should have reasonable token budgets", () => {
      for (const agent of allAgents) {
        expect(agent.tokenBudget).toBeGreaterThan(0);
        expect(agent.tokenBudget).toBeLessThanOrEqual(10000);
      }
    });
  });

  describe("Framework Validator - Variant Validation", () => {
    it("should pass variant validation for all agents", async () => {
      const result = await validator.validateAgentVariants();

      // Should have no errors (warnings are OK)
      const errors = result.issues.filter((i) => i.type === "error");
      if (errors.length > 0) {
        console.error("Validation errors:", JSON.stringify(errors, null, 2));
      }
      expect(errors).toHaveLength(0);
    });

    it("should report correct stats", async () => {
      const result = await validator.validateAgentVariants();

      expect(result.stats.checked).toBe(9);
      expect(result.stats.failed).toBe(0);
    });

    it("should validate that all agents have valid variant declarations", async () => {
      const result = await validator.validateAgentVariants();

      // Check for any variant-related errors
      const variantErrors = result.issues.filter(
        (i) => i.type === "error" && i.category === "agent",
      );

      expect(variantErrors).toHaveLength(0);
    });
  });

  describe("Context File Templates", () => {
    it("should have all 9 context templates in core/templates/context/", async () => {
      const templatesDir = path.join(
        frameworkRoot,
        "modules",
        "core",
        "templates",
        "context",
      );

      const expectedTemplates = [
        "business-basic.template.md",
        "business-advanced.template.md",
        "business-expert.template.md",
        "technical-basic.template.md",
        "technical-advanced.template.md",
        "technical-expert.template.md",
        "process-basic.template.md",
        "process-advanced.template.md",
        "process-expert.template.md",
      ];

      for (const template of expectedTemplates) {
        const templatePath = path.join(templatesDir, template);
        const exists = await fs.pathExists(templatePath);
        expect(exists).toBe(true);
      }
    });

    it("should have exactly 9 template files (no more, no less)", async () => {
      const templatesDir = path.join(
        frameworkRoot,
        "modules",
        "core",
        "templates",
        "context",
      );
      const files = await fs.readdir(templatesDir);
      const templateFiles = files.filter((f) => f.endsWith(".template.md"));

      expect(templateFiles.length).toBe(9);
    });
  });

  describe("Module Manifests", () => {
    it("should have framework agents registered in core module.json", async () => {
      const coreManifest = await fs.readJson(
        path.join(frameworkRoot, "modules", "core", "module.json"),
      );

      expect(coreManifest.provides.agents).toContain("ai-framework-manager");
      expect(coreManifest.provides.agents).toContain("ai-framework-developer");
    });

    it("should have agents registered in module module.json files", async () => {
      const modulesToCheck = [
        { path: "modules/backlog", agent: "ai-backlog-manager" },
        { path: "modules/coding", agent: "ai-architect" },
        { path: "modules/coding", agent: "ai-app-developer" },
        { path: "modules/confluence", agent: "ai-confluence-manager" },
      ];

      for (const { path: modulePath, agent } of modulesToCheck) {
        const moduleJsonPath = path.join(
          frameworkRoot,
          modulePath,
          "module.json",
        );

        if (await fs.pathExists(moduleJsonPath)) {
          const manifest = await fs.readJson(moduleJsonPath);
          expect(manifest.provides.agents).toContain(agent);
        }
      }
    });

    it("should have all 9 agents registered in module manifests", async () => {
      const modules = discoveryEngine.getLoadedModules();
      const registeredAgents: string[] = [];

      for (const [, manifest] of modules) {
        const agents = manifest.provides?.agents || [];
        registeredAgents.push(...agents);
      }

      expect(registeredAgents.length).toBe(9);
    });
  });

  describe("Real Agent Validation", () => {
    it("should load actual agent files from the framework", async () => {
      expect(allAgents.length).toBe(9);

      // Verify each agent has required properties
      for (const agent of allAgents) {
        expect(agent.id).toBeDefined();
        expect(agent.moduleId).toBeDefined();
        expect(agent.sourcePath).toBeDefined();
        expect(agent.tokenBudget).toBeGreaterThan(0);
      }
    });

    it("should verify the 9 agents have correct metadata", () => {
      const expectedAgents = [
        "ai-framework-manager",
        "ai-framework-developer",
        "ai-backlog-manager",
        "ai-architect",
        "ai-app-developer",
        "ai-confluence-manager",
        "ai-scout-backlog",
        "ai-scout-codebase",
        "ai-scout-knowledge",
      ];

      for (const agentId of expectedAgents) {
        const agent = allAgents.find((a) => a.id === agentId);

        expect(agent).toBeDefined();
        expect(agent!.tokenBudget).toBeGreaterThan(0);
      }
    });

    it("should verify agent files exist on filesystem", async () => {
      for (const agent of allAgents) {
        const exists = await fs.pathExists(agent.sourcePath);
        expect(exists).toBe(true);
      }
    });
  });

  describe("Context Loading Integration", () => {
    it("should handle agents with no context needs", () => {
      const agentsWithNoContext = allAgents.filter(
        (a) =>
          !a.contextCategoryNeeds ||
          Object.keys(a.contextCategoryNeeds).length === 0,
      );

      for (const agent of agentsWithNoContext) {
        const files = discoveryEngine.getContextFilesForAgent(agent);
        expect(files).toEqual([]);
      }
    });

    it("should compute context files for all agents without errors", () => {
      for (const agent of allAgents) {
        const files = discoveryEngine.getContextFilesForAgent(agent);

        // Should return an array
        expect(Array.isArray(files)).toBe(true);

        // Should not have duplicates
        const uniqueFiles = [...new Set(files)];
        expect(files.length).toBe(uniqueFiles.length);

        // All files should be valid context filenames
        for (const file of files) {
          expect(file).toMatch(
            /^(business|technical|process)-(basic|advanced|expert)\.md$/,
          );
        }
      }
    });

    it("should maintain cumulative hierarchy for all agents", () => {
      for (const agent of allAgents) {
        const contextNeeds = agent.contextCategoryNeeds || {};

        for (const [category, level] of Object.entries(contextNeeds)) {
          const files = discoveryEngine.getCumulativeContextFiles(
            category,
            level as ContextLevel,
          );

          // Basic should always be included
          expect(files).toContain(`${category}-basic.md`);

          // Advanced and expert should include basic
          if (level === "advanced") {
            expect(files).toContain(`${category}-advanced.md`);
            expect(files).not.toContain(`${category}-expert.md`);
          } else if (level === "expert") {
            expect(files).toContain(`${category}-advanced.md`);
            expect(files).toContain(`${category}-expert.md`);
          }
        }
      }
    });

    it("should verify cumulative context files are ordered correctly", () => {
      for (const agent of allAgents) {
        const files = discoveryEngine.getContextFilesForAgent(agent);

        // Check that for each category, files are in correct order
        const categories = ["business", "technical", "process"];

        for (const category of categories) {
          const categoryFiles = files.filter((f) => f.startsWith(category));

          if (categoryFiles.length > 1) {
            const basicIndex = categoryFiles.indexOf(`${category}-basic.md`);
            const advancedIndex = categoryFiles.indexOf(
              `${category}-advanced.md`,
            );
            const expertIndex = categoryFiles.indexOf(`${category}-expert.md`);

            // If basic exists, it should come before advanced and expert
            if (basicIndex !== -1) {
              if (advancedIndex !== -1) {
                expect(basicIndex).toBeLessThan(advancedIndex);
              }
              if (expertIndex !== -1) {
                expect(basicIndex).toBeLessThan(expertIndex);
              }
            }

            // If advanced exists, it should come before expert
            if (advancedIndex !== -1 && expertIndex !== -1) {
              expect(advancedIndex).toBeLessThan(expertIndex);
            }
          }
        }
      }
    });
  });

  describe("Complete Workflow Integration", () => {
    it("should validate agents without errors", async () => {
      const variantResult = await validator.validateAgentVariants();

      // Log any errors
      const variantErrors = variantResult.issues.filter(
        (i) => i.type === "error",
      );

      if (variantErrors.length > 0) {
        console.log(
          "Validation errors:",
          JSON.stringify(variantErrors.slice(0, 5), null, 2),
        );
      }

      // Agent validation should pass without errors
      expect(variantErrors.length).toBe(0);
      expect(variantResult.valid).toBe(true);
    });

    it("should have consistent agent count across all validations", async () => {
      const capabilityResult = await validator.validateCapabilityResolution();
      const variantResult = await validator.validateAgentVariants();

      // Both validations should check the same number of agents
      expect(capabilityResult.stats.checked).toBe(variantResult.stats.checked);
    });

    it("should verify context template coverage for all agent needs", async () => {
      const templatesDir = path.join(
        frameworkRoot,
        "modules",
        "core",
        "templates",
        "context",
      );
      const uniqueContextFiles = new Set<string>();

      // Collect all unique context files needed by agents
      for (const agent of allAgents) {
        const files = discoveryEngine.getContextFilesForAgent(agent);
        files.forEach((f) => uniqueContextFiles.add(f));
      }

      // Verify template exists for each needed context file
      for (const contextFile of uniqueContextFiles) {
        const templateName = contextFile.replace(".md", ".template.md");
        const templatePath = path.join(templatesDir, templateName);
        const exists = await fs.pathExists(templatePath);
        expect(exists).toBe(true);
      }
    });
  });
});
