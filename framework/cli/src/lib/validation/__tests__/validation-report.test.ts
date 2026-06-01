import {
  createReport,
  mergeReports,
  formatReport,
  createError,
  createWarning,
  createInfo,
  ValidationReport,
  ValidationIssue,
} from '../validation-report';

describe('ValidationReport', () => {
  describe('createReport', () => {
    it('should create report with valid status when no errors', () => {
      const issues: ValidationIssue[] = [
        createWarning('TEST_WARNING', 'This is a warning'),
        createInfo('TEST_INFO', 'This is info'),
      ];

      const report = createReport(issues);

      expect(report.valid).toBe(true);
      expect(report.issues).toHaveLength(2);
      expect(report.summary.errors).toBe(0);
      expect(report.summary.warnings).toBe(1);
      expect(report.summary.info).toBe(1);
    });

    it('should create report with invalid status when errors exist', () => {
      const issues: ValidationIssue[] = [
        createError('TEST_ERROR', 'This is an error'),
        createWarning('TEST_WARNING', 'This is a warning'),
      ];

      const report = createReport(issues);

      expect(report.valid).toBe(false);
      expect(report.issues).toHaveLength(2);
      expect(report.summary.errors).toBe(1);
      expect(report.summary.warnings).toBe(1);
      expect(report.summary.info).toBe(0);
    });

    it('should create empty report when no issues', () => {
      const report = createReport([]);

      expect(report.valid).toBe(true);
      expect(report.issues).toHaveLength(0);
      expect(report.summary.errors).toBe(0);
      expect(report.summary.warnings).toBe(0);
      expect(report.summary.info).toBe(0);
    });

    it('should correctly count multiple issues of each type', () => {
      const issues: ValidationIssue[] = [
        createError('ERR1', 'Error 1'),
        createError('ERR2', 'Error 2'),
        createError('ERR3', 'Error 3'),
        createWarning('WARN1', 'Warning 1'),
        createWarning('WARN2', 'Warning 2'),
        createInfo('INFO1', 'Info 1'),
      ];

      const report = createReport(issues);

      expect(report.summary.errors).toBe(3);
      expect(report.summary.warnings).toBe(2);
      expect(report.summary.info).toBe(1);
      expect(report.valid).toBe(false);
    });
  });

  describe('createError', () => {
    it('should create error with required fields', () => {
      const error = createError('TEST_CODE', 'Test error message');

      expect(error.severity).toBe('error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.message).toBe('Test error message');
      expect(error.field).toBeUndefined();
      expect(error.location).toBeUndefined();
      expect(error.suggestion).toBeUndefined();
    });

    it('should create error with all optional fields', () => {
      const error = createError(
        'TEST_CODE',
        'Test error message',
        'fieldName',
        { file: 'test.json', line: 42 },
        'Try this fix'
      );

      expect(error.severity).toBe('error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.message).toBe('Test error message');
      expect(error.field).toBe('fieldName');
      expect(error.location).toEqual({ file: 'test.json', line: 42 });
      expect(error.suggestion).toBe('Try this fix');
    });
  });

  describe('createWarning', () => {
    it('should create warning with required fields', () => {
      const warning = createWarning('WARN_CODE', 'Warning message');

      expect(warning.severity).toBe('warning');
      expect(warning.code).toBe('WARN_CODE');
      expect(warning.message).toBe('Warning message');
    });

    it('should create warning with optional fields', () => {
      const warning = createWarning(
        'WARN_CODE',
        'Warning message',
        'field',
        { file: 'test.json' },
        'Suggestion'
      );

      expect(warning.field).toBe('field');
      expect(warning.location).toEqual({ file: 'test.json' });
      expect(warning.suggestion).toBe('Suggestion');
    });
  });

  describe('createInfo', () => {
    it('should create info with required fields', () => {
      const info = createInfo('INFO_CODE', 'Info message');

      expect(info.severity).toBe('info');
      expect(info.code).toBe('INFO_CODE');
      expect(info.message).toBe('Info message');
    });

    it('should create info with optional fields', () => {
      const info = createInfo(
        'INFO_CODE',
        'Info message',
        'field',
        { file: 'test.json', line: 10 },
        'Suggestion'
      );

      expect(info.field).toBe('field');
      expect(info.location).toEqual({ file: 'test.json', line: 10 });
      expect(info.suggestion).toBe('Suggestion');
    });
  });

  describe('mergeReports', () => {
    it('should merge two reports into one', () => {
      const report1 = createReport([
        createError('ERR1', 'Error 1'),
        createWarning('WARN1', 'Warning 1'),
      ]);

      const report2 = createReport([
        createError('ERR2', 'Error 2'),
        createInfo('INFO1', 'Info 1'),
      ]);

      const merged = mergeReports(report1, report2);

      expect(merged.issues).toHaveLength(4);
      expect(merged.summary.errors).toBe(2);
      expect(merged.summary.warnings).toBe(1);
      expect(merged.summary.info).toBe(1);
      expect(merged.valid).toBe(false);
    });

    it('should merge multiple reports', () => {
      const report1 = createReport([createError('ERR1', 'Error 1')]);
      const report2 = createReport([createWarning('WARN1', 'Warning 1')]);
      const report3 = createReport([createInfo('INFO1', 'Info 1')]);

      const merged = mergeReports(report1, report2, report3);

      expect(merged.issues).toHaveLength(3);
      expect(merged.summary.errors).toBe(1);
      expect(merged.summary.warnings).toBe(1);
      expect(merged.summary.info).toBe(1);
    });

    it('should merge empty reports', () => {
      const report1 = createReport([]);
      const report2 = createReport([]);

      const merged = mergeReports(report1, report2);

      expect(merged.issues).toHaveLength(0);
      expect(merged.valid).toBe(true);
    });

    it('should preserve issue details in merged report', () => {
      const report1 = createReport([
        createError('ERR1', 'Error 1', 'field1', { file: 'file1.json' }, 'Fix this'),
      ]);

      const report2 = createReport([
        createWarning('WARN1', 'Warning 1', 'field2', { file: 'file2.json', line: 10 }),
      ]);

      const merged = mergeReports(report1, report2);

      expect(merged.issues[0]).toEqual({
        severity: 'error',
        code: 'ERR1',
        message: 'Error 1',
        field: 'field1',
        location: { file: 'file1.json' },
        suggestion: 'Fix this',
      });

      expect(merged.issues[1]).toEqual({
        severity: 'warning',
        code: 'WARN1',
        message: 'Warning 1',
        field: 'field2',
        location: { file: 'file2.json', line: 10 },
      });
    });
  });

  describe('formatReport', () => {
    it('should format valid report with no issues', () => {
      const report = createReport([]);
      const formatted = formatReport(report);

      expect(formatted).toBe('✓ Validation passed with no issues');
    });

    it('should format report with errors', () => {
      const report = createReport([createError('ERR1', 'Test error')]);

      const formatted = formatReport(report);

      expect(formatted).toContain('Validation Summary:');
      expect(formatted).toContain('✗ 1 error(s)');
      expect(formatted).toContain('Errors:');
      expect(formatted).toContain('Test error');
      expect(formatted).toContain('(ERR1)');
    });

    it('should format report with warnings', () => {
      const report = createReport([createWarning('WARN1', 'Test warning')]);

      const formatted = formatReport(report);

      expect(formatted).toContain('⚠ 1 warning(s)');
      expect(formatted).toContain('Warnings:');
      expect(formatted).toContain('Test warning');
      expect(formatted).toContain('(WARN1)');
    });

    it('should format report with info messages', () => {
      const report = createReport([createInfo('INFO1', 'Test info')]);

      const formatted = formatReport(report);

      expect(formatted).toContain('ℹ 1 info message(s)');
      expect(formatted).toContain('Info:');
      expect(formatted).toContain('Test info');
      expect(formatted).toContain('(INFO1)');
    });

    it('should format report with all severity levels', () => {
      const report = createReport([
        createError('ERR1', 'Error message'),
        createWarning('WARN1', 'Warning message'),
        createInfo('INFO1', 'Info message'),
      ]);

      const formatted = formatReport(report);

      expect(formatted).toContain('✗ 1 error(s)');
      expect(formatted).toContain('⚠ 1 warning(s)');
      expect(formatted).toContain('ℹ 1 info message(s)');
      expect(formatted).toContain('Errors:');
      expect(formatted).toContain('Warnings:');
      expect(formatted).toContain('Info:');
    });

    it('should include field name in formatted output', () => {
      const report = createReport([createError('ERR1', 'Test error', 'fieldName')]);

      const formatted = formatReport(report);

      expect(formatted).toContain('fieldName: Test error');
    });

    it('should include file location in formatted output', () => {
      const report = createReport([
        createError('ERR1', 'Test error', undefined, { file: 'test.json' }),
      ]);

      const formatted = formatReport(report);

      expect(formatted).toContain('[test.json]');
    });

    it('should include file and line number in formatted output', () => {
      const report = createReport([
        createError('ERR1', 'Test error', undefined, { file: 'test.json', line: 42 }),
      ]);

      const formatted = formatReport(report);

      expect(formatted).toContain('[test.json:42]');
    });

    it('should include suggestion in formatted output', () => {
      const report = createReport([
        createError('ERR1', 'Test error', undefined, undefined, 'Try fixing it this way'),
      ]);

      const formatted = formatReport(report);

      expect(formatted).toContain('Suggestion: Try fixing it this way');
    });

    it('should format complex issue with all fields', () => {
      const report = createReport([
        createError(
          'VALIDATION_ERROR',
          'Invalid field value',
          'user.email',
          { file: 'config.json', line: 15 },
          'Ensure email is in valid format'
        ),
      ]);

      const formatted = formatReport(report);

      expect(formatted).toContain('[config.json:15]');
      expect(formatted).toContain('user.email:');
      expect(formatted).toContain('Invalid field value');
      expect(formatted).toContain('(VALIDATION_ERROR)');
      expect(formatted).toContain('Suggestion: Ensure email is in valid format');
    });

    it('should number issues within each severity group', () => {
      const report = createReport([
        createError('ERR1', 'Error 1'),
        createError('ERR2', 'Error 2'),
        createWarning('WARN1', 'Warning 1'),
        createWarning('WARN2', 'Warning 2'),
      ]);

      const formatted = formatReport(report);

      expect(formatted).toContain('1. ');
      expect(formatted).toContain('2. ');
    });

    it('should handle report with only warnings (valid but with warnings)', () => {
      const report = createReport([
        createWarning('WARN1', 'Warning 1'),
        createWarning('WARN2', 'Warning 2'),
      ]);

      expect(report.valid).toBe(true); // No errors
      const formatted = formatReport(report);

      expect(formatted).toContain('⚠ 2 warning(s)');
      expect(formatted).toContain('Warnings:');
      expect(formatted).not.toContain('✗');
      expect(formatted).not.toContain('error');
    });
  });

  describe('summary counts', () => {
    it('should accurately count issues', () => {
      const issues: ValidationIssue[] = [
        createError('E1', 'Error 1'),
        createError('E2', 'Error 2'),
        createError('E3', 'Error 3'),
        createWarning('W1', 'Warning 1'),
        createWarning('W2', 'Warning 2'),
        createInfo('I1', 'Info 1'),
      ];

      const report = createReport(issues);

      expect(report.summary.errors).toBe(3);
      expect(report.summary.warnings).toBe(2);
      expect(report.summary.info).toBe(1);
    });

    it('should handle zero counts', () => {
      const report = createReport([]);

      expect(report.summary.errors).toBe(0);
      expect(report.summary.warnings).toBe(0);
      expect(report.summary.info).toBe(0);
    });

    it('should update counts after merging', () => {
      const report1 = createReport([createError('E1', 'Error 1')]);
      const report2 = createReport([createWarning('W1', 'Warning 1')]);

      const merged = mergeReports(report1, report2);

      expect(merged.summary.errors).toBe(1);
      expect(merged.summary.warnings).toBe(1);
      expect(merged.summary.info).toBe(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle validation workflow: create issues, create report, format', () => {
      // Simulate a validation workflow
      const issues: ValidationIssue[] = [];

      // Check required field
      issues.push(
        createError(
          'REQUIRED_FIELD',
          'Missing required field',
          'name',
          { file: 'module.json', line: 1 },
          'Add the name field to your module configuration'
        )
      );

      // Check type
      issues.push(
        createError(
          'TYPE_MISMATCH',
          'Expected type string, got number',
          'version',
          { file: 'module.json', line: 2 },
          'Convert version to string format (e.g., "1.0.0")'
        )
      );

      // Add warning
      issues.push(
        createWarning(
          'DEPRECATED_FIELD',
          'Field "legacy" is deprecated',
          'legacy',
          { file: 'module.json', line: 5 },
          'Consider removing this field'
        )
      );

      // Create report
      const report = createReport(issues);

      expect(report.valid).toBe(false);
      expect(report.summary.errors).toBe(2);
      expect(report.summary.warnings).toBe(1);

      // Format report
      const formatted = formatReport(report);

      expect(formatted).toContain('✗ 2 error(s)');
      expect(formatted).toContain('⚠ 1 warning(s)');
      expect(formatted).toContain('Missing required field');
      expect(formatted).toContain('Expected type string');
      expect(formatted).toContain('deprecated');
    });

    it('should handle multi-file validation with merge', () => {
      // File 1 validation
      const file1Issues = [createError('E1', 'Error in file 1', 'field1', { file: 'file1.json' })];

      // File 2 validation
      const file2Issues = [
        createWarning('W1', 'Warning in file 2', 'field2', { file: 'file2.json' }),
      ];

      // File 3 validation (valid)
      const file3Issues: ValidationIssue[] = [];

      // Create individual reports
      const report1 = createReport(file1Issues);
      const report2 = createReport(file2Issues);
      const report3 = createReport(file3Issues);

      // Merge all reports
      const finalReport = mergeReports(report1, report2, report3);

      expect(finalReport.valid).toBe(false); // Has errors
      expect(finalReport.summary.errors).toBe(1);
      expect(finalReport.summary.warnings).toBe(1);

      const formatted = formatReport(finalReport);
      expect(formatted).toContain('[file1.json]');
      expect(formatted).toContain('[file2.json]');
    });
  });
});
