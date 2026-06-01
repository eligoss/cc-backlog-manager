/**
 * Validation issue severity levels
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Validation issue with location and suggestion
 */
export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  field?: string;
  message: string;
  location?: {
    file: string;
    line?: number;
  };
  suggestion?: string;
}

/**
 * Summary of validation results
 */
export interface ValidationSummary {
  errors: number;
  warnings: number;
  info: number;
}

/**
 * Validation report with issues and summary
 */
export interface ValidationReport {
  valid: boolean;
  issues: ValidationIssue[];
  summary: ValidationSummary;
}

/**
 * Create a validation report from issues
 */
export function createReport(issues: ValidationIssue[]): ValidationReport {
  const summary: ValidationSummary = {
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warning').length,
    info: issues.filter((i) => i.severity === 'info').length,
  };

  return {
    valid: summary.errors === 0,
    issues,
    summary,
  };
}

/**
 * Merge multiple validation reports into one
 */
export function mergeReports(...reports: ValidationReport[]): ValidationReport {
  const allIssues = reports.flatMap((r) => r.issues);
  return createReport(allIssues);
}

/**
 * Format a validation report as human-readable text
 */
export function formatReport(report: ValidationReport): string {
  if (report.valid && report.issues.length === 0) {
    return '✓ Validation passed with no issues';
  }

  const lines: string[] = [];

  // Summary
  const { summary } = report;
  lines.push('Validation Summary:');
  if (summary.errors > 0) {
    lines.push(`  ✗ ${summary.errors} error(s)`);
  }
  if (summary.warnings > 0) {
    lines.push(`  ⚠ ${summary.warnings} warning(s)`);
  }
  if (summary.info > 0) {
    lines.push(`  ℹ ${summary.info} info message(s)`);
  }
  lines.push('');

  // Group issues by severity
  const errors = report.issues.filter((i) => i.severity === 'error');
  const warnings = report.issues.filter((i) => i.severity === 'warning');
  const infos = report.issues.filter((i) => i.severity === 'info');

  // Format errors
  if (errors.length > 0) {
    lines.push('Errors:');
    errors.forEach((issue, index) => {
      lines.push(`  ${index + 1}. ${formatIssue(issue)}`);
    });
    lines.push('');
  }

  // Format warnings
  if (warnings.length > 0) {
    lines.push('Warnings:');
    warnings.forEach((issue, index) => {
      lines.push(`  ${index + 1}. ${formatIssue(issue)}`);
    });
    lines.push('');
  }

  // Format info
  if (infos.length > 0) {
    lines.push('Info:');
    infos.forEach((issue, index) => {
      lines.push(`  ${index + 1}. ${formatIssue(issue)}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format a single validation issue
 */
function formatIssue(issue: ValidationIssue): string {
  const parts: string[] = [];

  // Add location if available
  if (issue.location) {
    let loc = issue.location.file;
    if (issue.location.line !== undefined) {
      loc += `:${issue.location.line}`;
    }
    parts.push(`[${loc}]`);
  }

  // Add field if available
  if (issue.field) {
    parts.push(`${issue.field}:`);
  }

  // Add message
  parts.push(issue.message);

  // Add code in parentheses
  parts.push(`(${issue.code})`);

  let result = parts.join(' ');

  // Add suggestion if available
  if (issue.suggestion) {
    result += `\n     Suggestion: ${issue.suggestion}`;
  }

  return result;
}

/**
 * Helper to create an error issue
 */
export function createError(
  code: string,
  message: string,
  field?: string,
  location?: { file: string; line?: number },
  suggestion?: string
): ValidationIssue {
  return {
    severity: 'error',
    code,
    message,
    field,
    location,
    suggestion,
  };
}

/**
 * Helper to create a warning issue
 */
export function createWarning(
  code: string,
  message: string,
  field?: string,
  location?: { file: string; line?: number },
  suggestion?: string
): ValidationIssue {
  return {
    severity: 'warning',
    code,
    message,
    field,
    location,
    suggestion,
  };
}

/**
 * Helper to create an info issue
 */
export function createInfo(
  code: string,
  message: string,
  field?: string,
  location?: { file: string; line?: number },
  suggestion?: string
): ValidationIssue {
  return {
    severity: 'info',
    code,
    message,
    field,
    location,
    suggestion,
  };
}
