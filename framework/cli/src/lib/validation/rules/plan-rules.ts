/**
 * Plan Validation Rules
 *
 * TypeScript validation rules for plan content beyond JSON Schema validation.
 * These rules enforce best practices and conventions for plan structure.
 *
 * @module lib/validation/rules/plan-rules
 */

import {
  ValidationIssue,
  createWarning,
  createError,
  createInfo,
} from '../validation-report.js';

/**
 * Plan data structure
 */
export interface PlanData {
  status?: string;
  category?: string;
  created?: string;
  phases?: Phase[];
  successCriteria?: string[];
  riskLevel?: string;
  estimatedHours?: number;
  [key: string]: unknown; // Allow additional properties
}

/**
 * Phase structure
 */
export interface Phase {
  title: string;
  goal: string;
  deliverables: string[];
  successMetrics?: string[];
}

/**
 * Action verbs that should start deliverables
 */
const ACTION_VERBS = [
  'create',
  'implement',
  'design',
  'build',
  'develop',
  'update',
  'modify',
  'refactor',
  'add',
  'remove',
  'delete',
  'migrate',
  'fix',
  'test',
  'validate',
  'document',
  'write',
  'setup',
  'configure',
  'install',
  'deploy',
  'integrate',
  'optimize',
  'improve',
  'enhance',
  'analyze',
  'review',
  'verify',
];

/**
 * Validate plan against custom rules
 *
 * @param data - Parsed plan frontmatter data
 * @param filePath - Path to the PLAN.md file
 * @returns Array of validation issues
 */
export function validatePlanRules(data: PlanData, filePath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Rule: Check if phases have success metrics
  if (data.phases && data.phases.length > 0) {
    data.phases.forEach((phase, index) => {
      if (!phase.successMetrics || phase.successMetrics.length === 0) {
        issues.push(
          createWarning(
            'MISSING_SUCCESS_METRICS',
            `Phase ${index + 1} "${phase.title}" lacks success metrics`,
            `phases[${index}].successMetrics`,
            { file: filePath },
            'Add success metrics to define how to verify phase completion'
          )
        );
      }
    });
  }

  // Rule: Deliverables should start with action verbs
  if (data.phases && data.phases.length > 0) {
    data.phases.forEach((phase, index) => {
      phase.deliverables.forEach((deliverable, delIndex) => {
        const firstWord = deliverable.trim().toLowerCase().split(/\s+/)[0];
        if (!ACTION_VERBS.includes(firstWord)) {
          issues.push(
            createWarning(
              'DELIVERABLE_NO_ACTION_VERB',
              `Deliverable "${deliverable}" should start with an action verb`,
              `phases[${index}].deliverables[${delIndex}]`,
              { file: filePath },
              `Start with verbs like: ${ACTION_VERBS.slice(0, 10).join(', ')}, etc.`
            )
          );
        }
      });
    });
  }

  // Rule: Plan should have overall success criteria
  if (!data.successCriteria || data.successCriteria.length === 0) {
    issues.push(
      createWarning(
        'MISSING_SUCCESS_CRITERIA',
        'Plan lacks overall success criteria',
        'successCriteria',
        { file: filePath },
        'Add success criteria to define when the entire plan is complete'
      )
    );
  }

  // Rule: Plans should have risk level assessment
  if (!data.riskLevel) {
    issues.push(
      createInfo(
        'MISSING_RISK_LEVEL',
        'Plan does not specify risk level',
        'riskLevel',
        { file: filePath },
        'Consider adding riskLevel: "low" | "medium" | "high" to frontmatter'
      )
    );
  }

  // Rule: Plans should have time estimate
  if (!data.estimatedHours) {
    issues.push(
      createInfo(
        'MISSING_TIME_ESTIMATE',
        'Plan does not specify estimated hours',
        'estimatedHours',
        { file: filePath },
        'Consider adding estimatedHours to help with planning'
      )
    );
  } else if (data.estimatedHours < 3) {
    issues.push(
      createWarning(
        'INSUFFICIENT_COMPLEXITY',
        `Plan estimated at ${data.estimatedHours} hours (< 3 hours minimum)`,
        'estimatedHours',
        { file: filePath },
        'Plans should be for complex tasks (3+ hours). Consider using TodoWrite for simpler tasks.'
      )
    );
  }

  // Rule: Category should be lowercase kebab-case
  if (data.category) {
    const kebabCasePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    if (!kebabCasePattern.test(data.category)) {
      issues.push(
        createWarning(
          'INVALID_CATEGORY_FORMAT',
          `Category "${data.category}" should be lowercase kebab-case`,
          'category',
          { file: filePath },
          'Use format like: "framework", "backend", "frontend", "apm-r"'
        )
      );
    }
  }

  // Rule: Check for reasonable phase count
  if (data.phases) {
    if (data.phases.length < 3) {
      issues.push(
        createWarning(
          'TOO_FEW_PHASES',
          `Plan has only ${data.phases.length} phases (recommended: 3-5)`,
          'phases',
          { file: filePath },
          'Break down the work into at least 3 distinct phases'
        )
      );
    } else if (data.phases.length > 7) {
      issues.push(
        createWarning(
          'TOO_MANY_PHASES',
          `Plan has ${data.phases.length} phases (recommended: 3-5, max: 7)`,
          'phases',
          { file: filePath },
          'Consider consolidating related phases to keep the plan manageable'
        )
      );
    }
  }

  // Rule: Phase titles should be concise
  if (data.phases) {
    data.phases.forEach((phase, index) => {
      if (phase.title.length > 60) {
        issues.push(
          createWarning(
            'PHASE_TITLE_TOO_LONG',
            `Phase ${index + 1} title is too long (${phase.title.length} chars)`,
            `phases[${index}].title`,
            { file: filePath },
            'Keep phase titles concise (< 60 characters)'
          )
        );
      }
    });
  }

  // Rule: Each phase should have multiple deliverables for substantial work
  if (data.phases) {
    data.phases.forEach((phase, index) => {
      if (phase.deliverables.length === 1) {
        issues.push(
          createInfo(
            'SINGLE_DELIVERABLE_PHASE',
            `Phase ${index + 1} "${phase.title}" has only one deliverable`,
            `phases[${index}].deliverables`,
            { file: filePath },
            'Consider if this phase needs to be broken down further or combined with another phase'
          )
        );
      }
    });
  }

  return issues;
}

/**
 * Validate plan markdown content (non-frontmatter content)
 *
 * @param content - Markdown content (without frontmatter)
 * @param filePath - Path to the PLAN.md file
 * @returns Array of validation issues
 */
export function validatePlanContent(content: string, filePath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Rule: Plan should have a problem statement section
  if (!content.includes('## Problem Statement')) {
    issues.push(
      createError(
        'MISSING_PROBLEM_STATEMENT',
        'Plan is missing "## Problem Statement" section',
        undefined,
        { file: filePath },
        'Add a Problem Statement section explaining what problem this plan addresses'
      )
    );
  }

  // Rule: Plan should have a solution overview section
  if (!content.includes('## Solution Overview')) {
    issues.push(
      createError(
        'MISSING_SOLUTION_OVERVIEW',
        'Plan is missing "## Solution Overview" section',
        undefined,
        { file: filePath },
        'Add a Solution Overview section explaining the high-level approach'
      )
    );
  }

  // Rule: Plan should have a phases section
  if (!content.includes('## Phases')) {
    issues.push(
      createError(
        'MISSING_PHASES_SECTION',
        'Plan is missing "## Phases" section',
        undefined,
        { file: filePath },
        'Add a Phases section detailing the implementation phases'
      )
    );
  }

  // Rule: Plan should have success criteria section
  if (!content.includes('## Success Criteria')) {
    issues.push(
      createWarning(
        'MISSING_SUCCESS_CRITERIA_SECTION',
        'Plan is missing "## Success Criteria" section',
        undefined,
        { file: filePath },
        'Add a Success Criteria section defining when the plan is complete'
      )
    );
  }

  // Rule: Warn if content is too short (likely incomplete)
  const minContentLength = 500;
  if (content.trim().length < minContentLength) {
    issues.push(
      createWarning(
        'PLAN_TOO_SHORT',
        `Plan content is very short (${content.trim().length} chars, expected > ${minContentLength})`,
        undefined,
        { file: filePath },
        'Ensure the plan has sufficient detail in problem statement, solution, and phases'
      )
    );
  }

  return issues;
}
