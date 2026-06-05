/**
 * Zod schema for Skill frontmatter validation
 *
 * Validates skill SKILL.md files' YAML frontmatter structure.
 *
 * @module schemas/skill
 */

import { z } from 'zod';

/**
 * CLI command type - common types plus any string for extensibility
 * Common types: create, validate, sync, export, import, transform, update, migrate, fetch
 * Also allows: note (documentation), future (planned), and actual command names
 */
export const CliCommandTypeSchema = z.string().min(1);

/**
 * Single CLI command definition
 */
export const CliCommandSchema = z.object({
  /** Full CLI command string */
  command: z.string().min(1, 'Command string is required'),

  /** Description of what the command does */
  description: z.string().min(1, 'Command description is required'),

  /** Template file used by this command (optional) */
  template: z.string().optional(),

  /** Schema file used for validation (optional) */
  schema: z.string().optional(),
});

/**
 * CLI command definition with more fields for array format
 */
export const CliCommandArrayItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  usage: z.string().optional(),
  options: z.array(z.string()).optional(),
  examples: z.array(z.string()).optional(),
});

/**
 * CLI commands - supports multiple formats:
 * 1. Record format: { create: { command: "...", description: "..." } }
 * 2. Array format: [{ name: "...", description: "..." }]
 * 3. Mixed record values: strings for notes, nested objects for future commands
 *
 * Due to the variety of formats in use, we use a flexible schema that
 * accepts any valid structure. Detailed validation can be done separately
 * when parsing specific command formats.
 */
export const CliCommandsSchema = z.union([
  // Record format (most flexible - accepts any nested structure)
  z.record(z.string(), z.unknown()),
  // Array format (list of commands)
  z.array(CliCommandArrayItemSchema),
]).optional();

/**
 * Skill scope - where the skill applies
 * Common values: generic, framework, project, project-specific, apmr
 */
export const SkillScopeSchema = z.string().optional();

/**
 * Main skill schema
 */
export const SkillSchema = z.object({
  /** Unique skill identifier (kebab-case) */
  id: z.string()
    .min(1, 'Skill ID is required')
    .regex(/^[a-z][a-z0-9-]*$/, 'Skill ID must be kebab-case starting with a letter'),

  /** Human-readable skill name */
  name: z.string().min(1, 'Skill name is required'),

  /** Description of when to use this skill */
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must not exceed 500 characters'),

  /** Scope of applicability */
  scope: SkillScopeSchema,

  /** Which projects this skill applies to */
  'applicable-projects': z.string().optional(),

  /** Module this skill belongs to */
  module: z.string().optional(),

  /** Capabilities this skill provides to agents */
  'capabilities-provided': z.array(z.string())
    .min(1, 'Skills must provide at least one capability'),

  /** Marks a project-knowledge template skill (copy-once on deploy, user-filled) */
  'project-knowledge': z.boolean().optional(),

  /** CLI commands this skill exposes */
  'cli-commands': CliCommandsSchema,
});

/**
 * Loose skill schema for initial parsing (allows unknown fields)
 */
export const SkillSchemaLoose = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  scope: z.string().optional(),
  'applicable-projects': z.string().optional(),
  module: z.string().optional(),
  'capabilities-provided': z.array(z.string()).optional(),
  'cli-commands': z.record(z.string(), z.any()).optional(),
}).passthrough();

// Type exports
export type CliCommandType = z.infer<typeof CliCommandTypeSchema>;
export type CliCommand = z.infer<typeof CliCommandSchema>;
export type SkillScope = z.infer<typeof SkillScopeSchema>;
export type Skill = z.infer<typeof SkillSchema>;
