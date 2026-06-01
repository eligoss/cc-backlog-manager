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
  });
});
