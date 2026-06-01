/**
 * Planning MCP Tools
 *
 * MCP tools for plan management:
 * - Create plan folders with auto-numbering
 * - Validate plan structure and content
 *
 * @module mcp/tools/planning
 */

import { z } from 'zod';
import { defineTool } from '../tool-registry.js';
import { successResult, errorResult, ErrorCodes } from '../types.js';
import { createPlan } from '../../lib/planning/plan-creator.js';
import { CliContext } from '../../lib/cli-context.js';
import fs from 'fs-extra';
import path from 'path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { validateWithSchema } from '../../lib/validation/schema-validator.js';
import {
  formatReport,
  mergeReports,
  ValidationReport,
} from '../../lib/validation/validation-report.js';
import {
  validatePlanRules,
  validatePlanContent,
  PlanData,
} from '../../lib/validation/rules/plan-rules.js';

/**
 * Schema for planning create-plan tool
 */
const CreatePlanSchema = z.object({
  name: z.string().describe('Plan name in kebab-case (e.g., "my-plan-name")'),
  category: z.string().default('framework').describe('Plan category (e.g., "framework", "apm-r")'),
  dryRun: z.boolean().optional().describe('Preview what would be created without creating files'),
  path: z.string().default('.').describe('Project root path'),
});

/**
 * Schema for planning validate-plan tool
 */
const ValidatePlanSchema = z.object({
  path: z.string().default('.').describe('Path to plan file or folder (searches for PLAN.md files)'),
  strict: z.boolean().optional().describe('Exit with error code on warnings (not just errors)'),
});

/**
 * agentic_planning_create tool
 */
export const planningCreateTool = defineTool(
  'agentic_planning_create',
  'Create a new plan folder with auto-numbering and templates',
  CreatePlanSchema,
  async (args) => {
    try {
      const { name, category, dryRun, path: pathOption } = args;

      // Use CliContext for project detection and path resolution
      const ctx = pathOption && pathOption !== '.'
        ? await CliContext.create({ path: pathOption })
        : await CliContext.require();

      // Get plans directory from path resolver
      const plansDir = ctx.paths.getPlanPath(category);

      // Create the plan using project root from context
      const result = await createPlan(name, category, ctx.projectRoot, dryRun || false, plansDir);

      if (!result.success) {
        return errorResult(
          ErrorCodes.COMMAND_FAILED,
          result.message
        );
      }

      return successResult(
        {
          planId: result.planId,
          planPath: result.planPath,
          category,
          dryRun: dryRun || false,
        },
        result.message
      );
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        error
      );
    }
  }
);

/**
 * agentic_planning_validate tool
 */
export const planningValidateTool = defineTool(
  'agentic_planning_validate',
  'Validate plan structure and content against schema and best practices',
  ValidatePlanSchema,
  async (args) => {
    try {
      const { path: searchPath, strict } = args;

      // Use CliContext to get project root for schema resolution
      let projectRoot: string;
      try {
        const ctx = await CliContext.create();
        projectRoot = ctx.projectRoot;
      } catch {
        projectRoot = process.cwd();
      }

      // Resolve search path
      const resolvedPath = path.resolve(searchPath);

      // Check if path exists
      if (!(await fs.pathExists(resolvedPath))) {
        return errorResult(
          ErrorCodes.FILE_NOT_FOUND,
          `Path does not exist: ${resolvedPath}`
        );
      }

      // Find PLAN.md files
      const planFiles = await findPlanFiles(resolvedPath);

      if (planFiles.length === 0) {
        return successResult(
          { plansValidated: 0 },
          'No PLAN.md files found',
          'No PLAN.md files found in the specified path'
        );
      }

      // Get schema path
      const schemaPath = await getSchemaPath(projectRoot);
      if (!schemaPath) {
        return errorResult(
          ErrorCodes.FILE_NOT_FOUND,
          'Plan schema not found',
          'Expected at framework/modules/planning/schemas/plan.schema.json'
        );
      }

      // Validate each plan file
      const allReports: ValidationReport[] = [];

      for (const planFile of planFiles) {
        const report = await validatePlanFile(planFile, schemaPath);
        allReports.push(report);
      }

      // Merge all reports
      const finalReport = mergeReports(...allReports);

      // Determine validation result
      const hasErrors = finalReport.summary.errors > 0;
      const hasWarnings = finalReport.summary.warnings > 0;
      const isValid = finalReport.valid && finalReport.issues.length === 0;

      if (isValid) {
        return successResult(
          {
            valid: true,
            plansValidated: planFiles.length,
            errors: 0,
            warnings: 0,
          },
          'All plans passed validation with no issues',
          formatReport(finalReport)
        );
      }

      if (hasErrors || (strict && hasWarnings)) {
        return errorResult(
          ErrorCodes.VALIDATION_FAILED,
          hasErrors ? 'Validation failed with errors' : 'Validation failed with warnings (strict mode)',
          undefined,
          {
            plansValidated: planFiles.length,
            errors: finalReport.summary.errors,
            warnings: finalReport.summary.warnings,
            report: formatReport(finalReport),
          }
        );
      }

      return successResult(
        {
          valid: true,
          plansValidated: planFiles.length,
          errors: finalReport.summary.errors,
          warnings: finalReport.summary.warnings,
        },
        'Validation passed with warnings',
        formatReport(finalReport)
      );
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        error
      );
    }
  }
);

/**
 * Find all PLAN.md files in the given path
 */
async function findPlanFiles(searchPath: string): Promise<string[]> {
  const stat = await fs.stat(searchPath);

  if (stat.isFile()) {
    // If it's a file, check if it's PLAN.md
    if (path.basename(searchPath) === 'PLAN.md') {
      return [searchPath];
    }
    throw new Error(`Specified file is not PLAN.md: ${searchPath}`);
  }

  // If it's a directory, search for all PLAN.md files
  const planFiles = await fg('**/PLAN.md', {
    cwd: searchPath,
    absolute: true,
    ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
  });

  return planFiles;
}

/**
 * Get path to plan schema file
 */
async function getSchemaPath(projectRoot: string): Promise<string | null> {
  const possiblePaths = [
    path.join(projectRoot, 'framework/modules/planning/schemas/plan.schema.json'),
    path.join(projectRoot, '../modules/planning/schemas/plan.schema.json'),
    path.join(projectRoot, '../../modules/planning/schemas/plan.schema.json'),
  ];

  for (const schemaPath of possiblePaths) {
    if (await fs.pathExists(schemaPath)) {
      return schemaPath;
    }
  }

  return null;
}

/**
 * Normalize frontmatter data by converting Date objects to ISO date strings
 */
function normalizeFrontmatter(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Date) {
      result[key] = value.toISOString().split('T')[0];
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item && typeof item === 'object' && !(item instanceof Date)
          ? normalizeFrontmatter(item as Record<string, unknown>)
          : item instanceof Date
            ? item.toISOString().split('T')[0]
            : item
      );
    } else if (value && typeof value === 'object') {
      result[key] = normalizeFrontmatter(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Validate a single plan file
 */
async function validatePlanFile(
  planFile: string,
  schemaPath: string
): Promise<ValidationReport> {
  try {
    // Read and parse the plan file
    const fileContent = await fs.readFile(planFile, 'utf-8');
    const parsed = matter(fileContent);

    // Normalize frontmatter: convert Date objects to ISO date strings
    const frontmatter = normalizeFrontmatter(parsed.data) as PlanData;
    const content = parsed.content;

    // Validate frontmatter against schema
    const schemaReport = await validateWithSchema(frontmatter, schemaPath);

    // Fix schema report locations: replace schema path with the actual plan file path
    schemaReport.issues = schemaReport.issues.map((issue) => ({
      ...issue,
      location: { file: planFile, ...(issue.location?.line ? { line: issue.location.line } : {}) },
    }));

    // Apply custom validation rules to frontmatter
    const rulesIssues = validatePlanRules(frontmatter, planFile);
    const rulesReport = {
      valid: rulesIssues.filter((i) => i.severity === 'error').length === 0,
      issues: rulesIssues,
      summary: {
        errors: rulesIssues.filter((i) => i.severity === 'error').length,
        warnings: rulesIssues.filter((i) => i.severity === 'warning').length,
        info: rulesIssues.filter((i) => i.severity === 'info').length,
      },
    };

    // Validate markdown content
    const contentIssues = validatePlanContent(content, planFile);
    const contentReport = {
      valid: contentIssues.filter((i) => i.severity === 'error').length === 0,
      issues: contentIssues,
      summary: {
        errors: contentIssues.filter((i) => i.severity === 'error').length,
        warnings: contentIssues.filter((i) => i.severity === 'warning').length,
        info: contentIssues.filter((i) => i.severity === 'info').length,
      },
    };

    // Merge all reports
    return mergeReports(schemaReport, rulesReport, contentReport);
  } catch (error) {
    // Return error report if file can't be read/parsed
    return {
      valid: false,
      issues: [
        {
          severity: 'error',
          code: 'FILE_READ_ERROR',
          message: `Failed to read or parse plan file: ${error instanceof Error ? error.message : String(error)}`,
          location: { file: planFile },
          suggestion: 'Ensure the file exists and contains valid YAML frontmatter',
        },
      ],
      summary: { errors: 1, warnings: 0, info: 0 },
    };
  }
}

/**
 * Export all planning tools
 */
export const planningTools = [
  planningCreateTool,
  planningValidateTool,
];
