/**
 * Plan Creation Tool
 *
 * Automates the creation of plan folders with auto-numbering, templates, and validation.
 *
 * @deprecated This module uses a separate template resolution logic. Consider using
 * unified-template-engine for new template-based features. This module is kept for
 * backward compatibility with existing plan template structure.
 *
 * @module lib/planning/plan-creator
 */

import fs from 'fs-extra';
import path from 'path';

/**
 * Template variables for rendering plan templates
 */
export interface TemplateVars {
  number: string;      // e.g., "003"
  date: string;        // e.g., "2025-12-20"
  Category?: string;   // e.g., "Framework" or "APM-R"
  category?: string;   // e.g., "framework" or "apm-r" (lowercase)
  status?: string;     // e.g., "PROPOSED - PENDING REVIEW"
  title?: string;      // e.g., "[Plan Title]" (placeholder for user to fill)
}

/**
 * Result of plan creation operation
 */
export interface PlanResult {
  success: boolean;
  message: string;
  /** Plan ID in format NNN (e.g., "003") - only set on success */
  planId?: string;
  /** Absolute path to the plan folder - only set on success */
  planPath?: string;
}

/**
 * Validation result for plan names
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate plan name follows kebab-case rules.
 *
 * @param name - Plan name to validate
 * @returns Validation result with error message if invalid
 *
 * @example
 * ```typescript
 * const result = validatePlanName('my-plan');
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validatePlanName(name: string): ValidationResult {
  // Check length
  if (name.length < 2 || name.length > 30) {
    return {
      valid: false,
      error: 'Plan name must be 2-30 characters long',
    };
  }

  // Check for double hyphens
  if (name.includes('--')) {
    return {
      valid: false,
      error: 'Plan name cannot contain consecutive hyphens',
    };
  }

  // Check format: lowercase, hyphens only, starts/ends with letter/number
  const pattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!pattern.test(name)) {
    return {
      valid: false,
      error: 'Plan name must be kebab-case: lowercase letters, numbers, and hyphens only (no leading/trailing hyphens)',
    };
  }

  return { valid: true };
}

/**
 * Scan category directory and compute next plan number.
 *
 * @param category - Plan category (e.g., "framework", "apm-r")
 * @param projectRoot - Path to project root (defaults to current working directory)
 * @returns Next available plan number
 *
 * @example
 * ```typescript
 * const nextNumber = await getNextPlanNumber('framework');
 * console.log(`Next plan: ${nextNumber}`);
 * ```
 */
export async function getNextPlanNumber(category: string, projectRoot?: string): Promise<number> {
  const root = projectRoot || process.cwd();
  const categoryDir = path.join(root, 'ai', 'plans', category);

  // If category directory doesn't exist, start at 1
  if (!(await fs.pathExists(categoryDir))) {
    return 1;
  }

  // Scan for existing plan folders matching pattern: NNN-*
  let maxNumber = 0;
  const planPattern = /^(\d{3})-/;

  const items = await fs.readdir(categoryDir);
  for (const item of items) {
    // Skip .templates and other hidden directories
    if (item.startsWith('.')) {
      continue;
    }

    const itemPath = path.join(categoryDir, item);
    const stat = await fs.stat(itemPath);

    if (stat.isDirectory()) {
      const match = planPattern.exec(item);
      if (match) {
        const number = parseInt(match[1], 10);
        maxNumber = Math.max(maxNumber, number);
      }
    }
  }

  return maxNumber + 1;
}

/**
 * Get path to template file for category.
 *
 * Searches in the following locations (in order):
 * 1. Category-specific templates in ai/plans/{category}/.templates/
 * 2. Framework templates in ai/plans/framework/.templates/
 * 3. Installed skill templates in .claude/skills/planning-phases/templates/
 *
 * @param category - Plan category (e.g., "framework", "apm-r")
 * @param templateName - Template filename (e.g., "PLAN.md.template")
 * @param projectRoot - Path to project root (defaults to current working directory)
 * @returns Path to template or null if not found
 *
 * @example
 * ```typescript
 * const templatePath = await getTemplatePath('framework', 'PLAN.md.template');
 * if (templatePath) {
 *   const content = await fs.readFile(templatePath, 'utf-8');
 * }
 * ```
 */
export async function getTemplatePath(
  category: string,
  templateName: string,
  projectRoot?: string
): Promise<string | null> {
  const root = projectRoot || process.cwd();

  // Search paths in priority order
  const searchPaths = [
    // 1. Category-specific templates in ai/plans/
    path.join(root, 'ai', 'plans', category, '.templates', templateName),
    // 2. Framework templates in ai/plans/
    path.join(root, 'ai', 'plans', 'framework', '.templates', templateName),
    // 3. Installed skill templates (planning-phases)
    path.join(root, '.claude', 'skills', 'planning-phases', 'templates', templateName),
  ];

  for (const templatePath of searchPaths) {
    if (await fs.pathExists(templatePath)) {
      return templatePath;
    }
  }

  return null;
}

/**
 * Render template with placeholders replaced.
 *
 * Supports both single-brace `{var}` and double-brace `{{var}}` syntax
 * for backward compatibility with different template formats.
 *
 * @param content - Template content
 * @param vars - Template variables
 * @returns Rendered template content
 *
 * @example
 * ```typescript
 * const template = 'Plan {number} - {{date}}';
 * const rendered = renderTemplate(template, { number: '001', date: '2025-12-21' });
 * ```
 */
export function renderTemplate(content: string, vars: TemplateVars): string {
  let result = content;

  // Replace placeholders - support both {var} and {{var}} syntax
  // Double-brace first to avoid partial matches
  result = result.replace(/\{\{number\}\}/g, vars.number);
  result = result.replace(/{number}/g, vars.number);

  result = result.replace(/\{\{date\}\}/g, vars.date);
  result = result.replace(/{date}/g, vars.date);

  if (vars.Category) {
    result = result.replace(/\{\{Category\}\}/g, vars.Category);
    result = result.replace(/{Category}/g, vars.Category);
  }

  if (vars.category) {
    result = result.replace(/\{\{category\}\}/g, vars.category);
    result = result.replace(/{category}/g, vars.category);
  }

  if (vars.status) {
    result = result.replace(/\{\{status\}\}/g, vars.status);
    result = result.replace(/{status}/g, vars.status);
  }

  if (vars.title) {
    result = result.replace(/\{\{title\}\}/g, vars.title);
    result = result.replace(/{title}/g, vars.title);
  }

  return result;
}

/**
 * Get display name for category (capitalize or special case for APM-R)
 *
 * @param category - Category name
 * @returns Display name
 */
function getCategoryDisplay(category: string): string {
  if (category === 'apm-r') {
    return 'APM-R';
  }
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Format dry-run output message.
 *
 * @param planFolder - Path to plan folder
 * @param planNumber - Plan number
 * @param name - Plan name
 * @param category - Plan category
 * @param planContent - PLAN.md content
 * @param progressContent - PROGRESS.md content
 * @returns Formatted message
 */
function formatDryRunOutput(
  planFolder: string,
  planNumber: number,
  name: string,
  category: string,
  planContent: string,
  progressContent: string
): string {
  return `
DRY RUN - No files created

Plan Details:
  Number:   ${planNumber.toString().padStart(3, '0')}
  Name:     ${name}
  Category: ${category}
  Folder:   ${planFolder}

Would create:
  ✓ ${planFolder}/
  ✓ ${planFolder}/PLAN.md (${planContent.length} bytes)
  ✓ ${planFolder}/PROGRESS.md (${progressContent.length} bytes)

Next steps:
  1. Remove --dry-run flag to create plan
  2. Edit PLAN.md to add problem statement and phases
  3. Commit PLAN.md to git
  4. Share plan location with user for review
  `.trim();
}

/**
 * Format success output message.
 *
 * @param planFolder - Path to plan folder
 * @param planFile - Path to PLAN.md
 * @param progressFile - Path to PROGRESS.md
 * @param planNumber - Plan number
 * @param category - Plan category
 * @returns Formatted message
 */
function formatSuccessOutput(
  planFolder: string,
  planFile: string,
  progressFile: string,
  planNumber: number,
  category: string
): string {
  return `
Plan created successfully!

Plan Number: ${planNumber.toString().padStart(3, '0')}
Category:    ${category}

Created:
  📁 ${planFolder}
  📄 ${planFile}
  📄 ${progressFile}

Next steps:
  1. Edit PLAN.md to add problem statement and phases
  2. Commit PLAN.md to git: git add ${planFolder} && git commit -m "feat(planning): create plan ${planNumber.toString().padStart(3, '0')}"
  3. Share plan location with user for review

File paths (absolute):
  ${planFile}
  ${progressFile}
  `.trim();
}

/**
 * Create plan folder structure with templates.
 *
 * @param name - Plan name (kebab-case)
 * @param category - Plan category (e.g., "framework", "apm-r")
 * @param projectRoot - Path to project root (defaults to current working directory)
 * @param dryRun - If true, show what would be created without creating
 * @param categoryPlansDir - Optional pre-resolved path to the category plans directory.
 *                           If provided, uses this path directly instead of computing from projectRoot.
 *                           This allows integration with CliContext path resolution.
 * @returns Result with success status and message
 *
 * @example
 * ```typescript
 * const result = await createPlan('my-plan', 'framework');
 * if (result.success) {
 *   console.log(result.message);
 * } else {
 *   console.error(result.message);
 * }
 * ```
 */
export async function createPlan(
  name: string,
  category: string,
  projectRoot?: string,
  dryRun: boolean = false,
  categoryPlansDir?: string
): Promise<PlanResult> {
  try {
    const root = projectRoot || process.cwd();
    // Use pre-resolved category path if provided, otherwise compute from projectRoot
    const plansDir = categoryPlansDir
      ? path.dirname(categoryPlansDir)  // Get parent dir since categoryPlansDir includes category
      : path.join(root, 'ai', 'plans');

    // Validate plan name
    const validation = validatePlanName(name);
    if (!validation.valid) {
      return {
        success: false,
        message: `Invalid plan name: ${validation.error}`,
      };
    }

    // Get next plan number
    const planNumber = await getNextPlanNumber(category, root);
    const folderName = `${planNumber.toString().padStart(3, '0')}-${name}`;
    const planFolder = path.join(plansDir, category, folderName);

    // Check if folder already exists (even in dry-run mode)
    if (await fs.pathExists(planFolder)) {
      return {
        success: false,
        message: `Plan folder already exists: ${planFolder}`,
      };
    }

    // Get current date
    const currentDate = new Date().toISOString().split('T')[0];

    // Get template paths
    const planTemplatePath = await getTemplatePath(category, 'PLAN.md.template', root);
    const progressTemplatePath = await getTemplatePath(category, 'PROGRESS.md.template', root);

    if (!planTemplatePath) {
      return {
        success: false,
        message: `PLAN.md.template not found for category '${category}'`,
      };
    }

    if (!progressTemplatePath) {
      return {
        success: false,
        message: `PROGRESS.md.template not found for category '${category}'`,
      };
    }

    // Read templates
    const planTemplateContent = await fs.readFile(planTemplatePath, 'utf-8');
    const progressTemplateContent = await fs.readFile(progressTemplatePath, 'utf-8');

    // Render templates
    const categoryDisplay = getCategoryDisplay(category);
    const vars: TemplateVars = {
      number: planNumber.toString().padStart(3, '0'),
      date: currentDate,
      Category: categoryDisplay,
      category: category,  // lowercase version for {{category}}
      status: 'proposed',  // default status for new plans (programmatic value)
      title: '[Plan Title]',  // placeholder for user to fill
    };

    const planContent = renderTemplate(planTemplateContent, vars);
    const progressContent = renderTemplate(progressTemplateContent, vars);

    // Dry run: just show what would be created
    if (dryRun) {
      return {
        success: true,
        message: formatDryRunOutput(
          planFolder,
          planNumber,
          name,
          category,
          planContent,
          progressContent
        ),
        planId: planNumber.toString().padStart(3, '0'),
        planPath: planFolder,
      };
    }

    // Create folder and files
    await fs.ensureDir(planFolder);

    const planFile = path.join(planFolder, 'PLAN.md');
    const progressFile = path.join(planFolder, 'PROGRESS.md');

    await fs.writeFile(planFile, planContent, 'utf-8');
    await fs.writeFile(progressFile, progressContent, 'utf-8');

    return {
      success: true,
      message: formatSuccessOutput(
        planFolder,
        planFile,
        progressFile,
        planNumber,
        category
      ),
      planId: planNumber.toString().padStart(3, '0'),
      planPath: planFolder,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create plan: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
