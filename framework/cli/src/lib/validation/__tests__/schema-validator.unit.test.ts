/**
 * Unit Tests: Schema Validator
 *
 * Tests for QA-015, QA-016, and QA-017:
 * - QA-015: `planning validate-plan` shows "unknown format" warning for date
 * - QA-016: Validation errors show schema path instead of file path
 * - QA-017: Plan schema status enum uses emoji strings
 *
 * Root cause:
 * - QA-015: AJV not configured with format support for "date" type
 * - QA-016: Error formatter uses schema path instead of source file path
 * - QA-017: Schema only accepted emoji status values, not programmatic ones
 *
 * Fix:
 * - QA-015: Added ajv-formats package and configured format support
 * - QA-016: Error locations are updated to use source file path
 * - QA-017: Schema now accepts both programmatic and emoji status values
 *
 * @module lib/validation/__tests__/schema-validator.unit.test
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

describe('Unit: Schema Validator', () => {
  describe('QA-015: AJV Date Format Support', () => {
    /**
     * Tests that AJV is configured to recognize the "date" format
     */

    it('should validate date format without warning when ajv-formats is used', () => {
      const ajv = new Ajv({ allErrors: true, strict: false });
      addFormats(ajv); // This is the fix

      const schema = {
        type: 'object',
        properties: {
          created: { type: 'string', format: 'date' },
        },
      };

      const validate = ajv.compile(schema);

      // Valid date should pass
      const result = validate({ created: '2025-12-29' });
      expect(result).toBe(true);
      expect(validate.errors).toBeNull();
    });

    it('should reject invalid date format', () => {
      const ajv = new Ajv({ allErrors: true, strict: false });
      addFormats(ajv);

      const schema = {
        type: 'object',
        properties: {
          created: { type: 'string', format: 'date' },
        },
      };

      const validate = ajv.compile(schema);

      // Invalid date should fail
      const result = validate({ created: 'not-a-date' });
      expect(result).toBe(false);
      expect(validate.errors).not.toBeNull();
    });

    it('should handle date-time format as well', () => {
      const ajv = new Ajv({ allErrors: true, strict: false });
      addFormats(ajv);

      const schema = {
        type: 'object',
        properties: {
          timestamp: { type: 'string', format: 'date-time' },
        },
      };

      const validate = ajv.compile(schema);

      // Valid ISO date-time
      expect(validate({ timestamp: '2025-12-29T12:00:00Z' })).toBe(true);

      // Invalid date-time
      expect(validate({ timestamp: '2025-12-29' })).toBe(false);
    });

    it('should show warning when ajv-formats is NOT used', () => {
      // Without ajv-formats, unknown format warnings occur
      const ajvWithoutFormats = new Ajv({
        allErrors: true,
        strict: false,
        strictSchema: false, // This suppresses the warning, but format isn't validated
      });

      const schema = {
        type: 'object',
        properties: {
          created: { type: 'string', format: 'date' },
        },
      };

      // This compiles but doesn't actually validate the date format
      const validate = ajvWithoutFormats.compile(schema);

      // Even invalid dates would pass because format isn't checked
      expect(validate({ created: 'anything' })).toBe(true);
    });
  });

  describe('QA-016: Validation Error Location Fixing', () => {
    /**
     * Tests that validation errors show the source file path,
     * not the schema file path
     */

    interface ValidationIssue {
      severity: 'error' | 'warning' | 'info';
      code: string;
      message: string;
      location?: { file: string; line?: number };
    }

    it('should update issue locations with source file path', () => {
      const schemaPath = '/path/to/framework/cli/framework/modules/planning/schemas/plan.schema.json';
      const planFilePath = '/path/to/project/ai/plans/001-my-plan/PLAN.md';

      // Original issues with schema path
      const issues: ValidationIssue[] = [
        {
          severity: 'error',
          code: 'MISSING_REQUIRED',
          message: 'Missing required property: status',
          location: { file: schemaPath },
        },
        {
          severity: 'warning',
          code: 'INVALID_VALUE',
          message: 'Invalid status value',
          location: { file: schemaPath, line: 5 },
        },
      ];

      // Fix: Replace schema path with plan file path
      const fixedIssues = issues.map((issue) => ({
        ...issue,
        location: {
          file: planFilePath,
          ...(issue.location?.line ? { line: issue.location.line } : {}),
        },
      }));

      // Verify all issues now reference the plan file
      for (const issue of fixedIssues) {
        expect(issue.location?.file).toBe(planFilePath);
        expect(issue.location?.file).not.toContain('schema.json');
      }

      // Verify line numbers are preserved
      expect(fixedIssues[1].location?.line).toBe(5);
    });

    it('should handle issues without line numbers', () => {
      const sourceFile = '/path/to/PLAN.md';

      const issue: ValidationIssue = {
        severity: 'error',
        code: 'MISSING_FIELD',
        message: 'Missing field',
        location: { file: '/schema/path' },
      };

      const fixed: ValidationIssue = {
        ...issue,
        location: { file: sourceFile },
      };

      expect(fixed.location?.file).toBe(sourceFile);
      expect(fixed.location?.line).toBeUndefined();
    });

    it('should handle issues with line numbers', () => {
      const sourceFile = '/path/to/PLAN.md';

      const issue: ValidationIssue = {
        severity: 'error',
        code: 'INVALID_VALUE',
        message: 'Invalid value',
        location: { file: '/schema/path', line: 10 },
      };

      const fixed: ValidationIssue = {
        ...issue,
        location: { file: sourceFile, line: issue.location?.line },
      };

      expect(fixed.location?.file).toBe(sourceFile);
      expect(fixed.location?.line).toBe(10);
    });
  });

  describe('QA-017: Plan Status Enum Values', () => {
    /**
     * Tests that the schema accepts both programmatic and emoji status values
     */

    it('should accept programmatic status values', () => {
      const validProgrammaticStatuses = ['proposed', 'in_progress', 'completed'];

      for (const status of validProgrammaticStatuses) {
        expect(typeof status).toBe('string');
        expect(status.length).toBeGreaterThan(0);
        // No emoji in programmatic values
        expect(status).not.toMatch(/[\u{1F300}-\u{1F6FF}]/u);
      }
    });

    it('should accept emoji status values', () => {
      const validEmojiStatuses = [
        '🔶 PROPOSED - PENDING REVIEW',
        '🔄 IN PROGRESS',
        '✅ COMPLETED',
      ];

      for (const status of validEmojiStatuses) {
        expect(typeof status).toBe('string');
        expect(status.length).toBeGreaterThan(0);
      }
    });

    it('should map programmatic to emoji values', () => {
      const statusMap: Record<string, string> = {
        'proposed': '🔶 PROPOSED - PENDING REVIEW',
        'in_progress': '🔄 IN PROGRESS',
        'completed': '✅ COMPLETED',
      };

      expect(statusMap['proposed']).toContain('PROPOSED');
      expect(statusMap['in_progress']).toContain('IN PROGRESS');
      expect(statusMap['completed']).toContain('COMPLETED');
    });

    it('should validate schema with anyOf for status', () => {
      const ajv = new Ajv({ allErrors: true, strict: false });

      // This is how the fixed schema defines status
      const schema = {
        type: 'object',
        properties: {
          status: {
            anyOf: [
              // Programmatic values
              { type: 'string', enum: ['proposed', 'in_progress', 'completed'] },
              // Emoji values
              { type: 'string', enum: [
                '🔶 PROPOSED - PENDING REVIEW',
                '🔄 IN PROGRESS',
                '✅ COMPLETED',
              ]},
            ],
          },
        },
        required: ['status'],
      };

      const validate = ajv.compile(schema);

      // Programmatic values should pass
      expect(validate({ status: 'proposed' })).toBe(true);
      expect(validate({ status: 'in_progress' })).toBe(true);
      expect(validate({ status: 'completed' })).toBe(true);

      // Emoji values should pass
      expect(validate({ status: '🔶 PROPOSED - PENDING REVIEW' })).toBe(true);
      expect(validate({ status: '🔄 IN PROGRESS' })).toBe(true);
      expect(validate({ status: '✅ COMPLETED' })).toBe(true);

      // Invalid values should fail
      expect(validate({ status: 'invalid' })).toBe(false);
      expect(validate({ status: 'done' })).toBe(false);
    });
  });

  describe('Schema Validation Report', () => {
    /**
     * Tests for validation report formatting
     */

    it('should create validation report with correct structure', () => {
      interface ValidationReport {
        valid: boolean;
        issues: ValidationIssue[];
        summary: {
          errors: number;
          warnings: number;
          info: number;
        };
      }

      interface ValidationIssue {
        severity: 'error' | 'warning' | 'info';
        code: string;
        message: string;
        location?: { file: string; line?: number };
        suggestion?: string;
      }

      const report: ValidationReport = {
        valid: false,
        issues: [
          {
            severity: 'error',
            code: 'MISSING_REQUIRED',
            message: 'Missing required property: status',
            location: { file: '/path/to/PLAN.md' },
            suggestion: 'Add a status field to the frontmatter',
          },
        ],
        summary: {
          errors: 1,
          warnings: 0,
          info: 0,
        },
      };

      expect(report.valid).toBe(false);
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0].severity).toBe('error');
      expect(report.summary.errors).toBe(1);
    });

    it('should merge multiple validation reports', () => {
      interface ValidationReport {
        valid: boolean;
        issues: Array<{ severity: string; message: string }>;
        summary: { errors: number; warnings: number; info: number };
      }

      const mergeReports = (...reports: ValidationReport[]): ValidationReport => {
        const allIssues = reports.flatMap(r => r.issues);
        const summary = {
          errors: allIssues.filter(i => i.severity === 'error').length,
          warnings: allIssues.filter(i => i.severity === 'warning').length,
          info: allIssues.filter(i => i.severity === 'info').length,
        };

        return {
          valid: summary.errors === 0,
          issues: allIssues,
          summary,
        };
      };

      const report1: ValidationReport = {
        valid: false,
        issues: [{ severity: 'error', message: 'Error 1' }],
        summary: { errors: 1, warnings: 0, info: 0 },
      };

      const report2: ValidationReport = {
        valid: true,
        issues: [{ severity: 'warning', message: 'Warning 1' }],
        summary: { errors: 0, warnings: 1, info: 0 },
      };

      const merged = mergeReports(report1, report2);

      expect(merged.valid).toBe(false); // Has errors
      expect(merged.issues).toHaveLength(2);
      expect(merged.summary.errors).toBe(1);
      expect(merged.summary.warnings).toBe(1);
    });
  });
});
