/**
 * Zod schema for Agent frontmatter validation
 *
 * Validates agent markdown files' YAML frontmatter structure.
 *
 * @module schemas/agent
 */

import { z } from "zod";

/**
 * Agent schema - unified agent definition (no full/slim distinction)
 */
export const AgentSchema = z.object({
  /** Agent identifier - must start with 'ai-' */
  agent: z
    .string()
    .min(1, "Agent name is required")
    .regex(/^ai-/, 'Agent name must start with "ai-"'),

  /** Human-readable role description */
  role: z.string().min(1, "Role description is required"),

  /** Essential skills always loaded for this agent */
  "essential-skills": z.array(z.string()).optional(),

  /** Capabilities this agent needs from skills */
  "capability-needs": z.array(z.string()).optional(),

  /** Skills available for on-demand invocation */
  "available-skills": z.array(z.string()).optional(),

  /** Token budget for this agent */
  "token-budget": z
    .number()
    .int("Token budget must be an integer")
    .min(100, "Token budget must be at least 100")
    .max(10000, "Token budget must not exceed 10000")
    .optional(),

  /** Deployment target: command (slash command only), agent (subagent only), or both (default) */
  "deploy-to": z.enum(["command", "agent", "both"]).default("both"),
});

/** @deprecated Use AgentSchema instead */
export const FullAgentSchema = AgentSchema;
/** @deprecated No longer used - slim agents removed */
export const SlimAgentSchema = AgentSchema;

/**
 * Loose agent schema for initial parsing (allows unknown fields)
 */
export const AgentSchemaLoose = z
  .object({
    agent: z.string().optional(),
    role: z.string().optional(),
    "essential-skills": z.array(z.string()).optional(),
    "capability-needs": z.array(z.string()).optional(),
    "available-skills": z.array(z.string()).optional(),
    "token-budget": z.number().optional(),
    "deploy-to": z.enum(["command", "agent", "both"]).optional(),
  })
  .passthrough();

// Type exports
export type Agent = z.infer<typeof AgentSchema>;
/** @deprecated No longer used - agent variants removed */
export const AgentVariantSchema = z.enum(["full", "slim"]);

/** @deprecated Use Agent instead */
export type FullAgent = Agent;
/** @deprecated Use Agent instead */
export type SlimAgent = Agent;
/** @deprecated No longer used */
export type AgentVariant = "full" | "slim";
