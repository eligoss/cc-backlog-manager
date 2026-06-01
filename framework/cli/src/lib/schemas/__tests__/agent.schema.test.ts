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
  ContextLevelSchema,
  ContextCategorySchema,
  AgentVariantSchema,
} from "../agent.schema.js";

describe("Agent Schema", () => {
  describe("AgentSchema (unified)", () => {
    it("should validate a valid agent", () => {
      const agent = {
        agent: "ai-architect",
        role: "Architecture design and decisions",
        "capability-needs": ["architecture-design", "code-review"],
        "context-category-needs": {
          business: "basic",
          technical: "advanced",
        },
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

    it("should allow optional context-category-needs", () => {
      const agent = {
        agent: "ai-architect",
        role: "Architecture design",
        "capability-needs": ["architecture-design"],
        // No context-category-needs
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

  describe("Context category needs validation", () => {
    it("should validate valid context categories", () => {
      const agent = {
        agent: "ai-test",
        role: "Test role",
        variant: "full",
        "capability-needs": ["test"],
        "context-category-needs": {
          business: "basic",
          technical: "advanced",
          process: "expert",
        },
      };

      const result = AgentSchema.safeParse(agent);
      expect(result.success).toBe(true);
    });

    it("should reject invalid context levels", () => {
      const agent = {
        agent: "ai-test",
        role: "Test role",
        variant: "full",
        "capability-needs": ["test"],
        "context-category-needs": {
          business: "invalid", // Not a valid level
        },
      };

      const result = AgentSchema.safeParse(agent);
      expect(result.success).toBe(false);
    });

    it("should reject invalid context categories", () => {
      const agent = {
        agent: "ai-test",
        role: "Test role",
        variant: "full",
        "capability-needs": ["test"],
        "context-category-needs": {
          unknown: "basic", // Not a valid category
        },
      };

      const result = AgentSchema.safeParse(agent);
      expect(result.success).toBe(false);
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
    it("should validate context levels", () => {
      expect(ContextLevelSchema.safeParse("basic").success).toBe(true);
      expect(ContextLevelSchema.safeParse("advanced").success).toBe(true);
      expect(ContextLevelSchema.safeParse("expert").success).toBe(true);
      expect(ContextLevelSchema.safeParse("invalid").success).toBe(false);
    });

    it("should validate context categories", () => {
      expect(ContextCategorySchema.safeParse("business").success).toBe(true);
      expect(ContextCategorySchema.safeParse("technical").success).toBe(true);
      expect(ContextCategorySchema.safeParse("process").success).toBe(true);
      expect(ContextCategorySchema.safeParse("invalid").success).toBe(false);
    });

    it("should validate agent variants", () => {
      expect(AgentVariantSchema.safeParse("full").success).toBe(true);
      expect(AgentVariantSchema.safeParse("slim").success).toBe(true);
      expect(AgentVariantSchema.safeParse("invalid").success).toBe(false);
    });
  });
});
