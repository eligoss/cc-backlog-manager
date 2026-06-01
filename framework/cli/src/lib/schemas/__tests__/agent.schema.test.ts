/**
 * Tests for Agent Schema (Zod)
 *
 * Validates agent frontmatter schema with discriminated union for full/slim variants.
 */

import { describe, it, expect } from "@jest/globals";
import {
  AgentSchema,
  FullAgentSchema,
  SlimAgentSchema,
  AgentSchemaLoose,
  AgentVariantSchema,
} from "../agent.schema.js";

describe("Agent Schema", () => {
  describe("AgentSchema (unified)", () => {
    it("should validate a valid agent", () => {
      const agent = {
        agent: "ai-architect",
        role: "Architecture design and decisions",
        "capability-needs": ["architecture-design", "code-review"],
        "token-budget": 3000,
      };

      const result = AgentSchema.safeParse(agent);
      expect(result.success).toBe(true);
    });

    it("should allow optional capability-needs", () => {
      const agent = {
        agent: "ai-architect",
        role: "Architecture design",
        // capability-needs is optional
      };

      const result = AgentSchema.safeParse(agent);
      expect(result.success).toBe(true);
    });

  });

  describe("Agent name validation", () => {
    it("should require agent name to start with ai-", () => {
      const agent = {
        agent: "architect", // Missing ai- prefix
        role: "Architecture design",
        variant: "full",
        "capability-needs": ["design"],
      };

      const result = AgentSchema.safeParse(agent);
      expect(result.success).toBe(false);
    });

    it("should accept valid ai- prefixed names", () => {
      const validNames = [
        "ai-architect",
        "ai-app-developer",
        "ai-framework-manager-slim",
        "ai-test-agent-v2",
      ];

      for (const name of validNames) {
        const agent = {
          agent: name,
          role: "Test role",
          variant: "full",
          "capability-needs": ["test"],
        };

        const result = AgentSchema.safeParse(agent);
        expect(result.success).toBe(true);
      }
    });
  });

  describe("Token budget validation", () => {
    it("should validate token budget within range", () => {
      const agent = {
        agent: "ai-test",
        role: "Test role",
        variant: "full",
        "capability-needs": ["test"],
        "token-budget": 3000,
      };

      const result = AgentSchema.safeParse(agent);
      expect(result.success).toBe(true);
    });

    it("should reject token budget below minimum", () => {
      const agent = {
        agent: "ai-test",
        role: "Test role",
        variant: "full",
        "capability-needs": ["test"],
        "token-budget": 50, // Below 100
      };

      const result = AgentSchema.safeParse(agent);
      expect(result.success).toBe(false);
    });

    it("should reject token budget above maximum", () => {
      const agent = {
        agent: "ai-test",
        role: "Test role",
        variant: "full",
        "capability-needs": ["test"],
        "token-budget": 20000, // Above 10000
      };

      const result = AgentSchema.safeParse(agent);
      expect(result.success).toBe(false);
    });

    it("should allow optional token budget", () => {
      const agent = {
        agent: "ai-test",
        role: "Test role",
        variant: "full",
        "capability-needs": ["test"],
        // No token-budget
      };

      const result = AgentSchema.safeParse(agent);
      expect(result.success).toBe(true);
    });
  });

  describe("AgentSchemaLoose", () => {
    it("should accept partial data for initial parsing", () => {
      const partial = {
        agent: "ai-test",
        // Missing many required fields
        extra: "allowed",
      };

      const result = AgentSchemaLoose.safeParse(partial);
      expect(result.success).toBe(true);
    });

    it("should passthrough unknown fields", () => {
      const data = {
        agent: "ai-test",
        customField: "value",
        nested: { data: true },
      };

      const result = AgentSchemaLoose.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.customField).toBe("value");
      }
    });
  });

  describe("Individual enum schemas", () => {
    it("should validate agent variants", () => {
      expect(AgentVariantSchema.safeParse("full").success).toBe(true);
      expect(AgentVariantSchema.safeParse("slim").success).toBe(true);
      expect(AgentVariantSchema.safeParse("invalid").success).toBe(false);
    });
  });
});
