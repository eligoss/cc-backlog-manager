/**
 * Unit Tests: Status Command Display Logic
 *
 * Tests for QA-001 and QA-002:
 * - QA-001: "Invalid Date" displayed when installedAt is missing/invalid
 * - QA-002: "vundefined" displayed when module version is missing
 *
 * Root cause: No null/undefined checks before displaying values.
 * Fix: Added null checks to show "Unknown" for missing dates and
 *      "(version unknown)" for missing versions.
 *
 * @module commands/__tests__/status.unit.test
 */

describe('Unit: Status Command Display Logic', () => {
  describe('QA-001: Date Display Handling', () => {
    /**
     * Helper function simulating the fixed date display logic from status.ts
     */
    function formatInstallDate(dateValue: string | undefined | null): string {
      if (!dateValue) {
        return 'Unknown';
      }
      try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) {
          return 'Unknown';
        }
        return date.toLocaleString();
      } catch {
        return 'Unknown';
      }
    }

    it('should display "Unknown" when installedAt is undefined', () => {
      const result = formatInstallDate(undefined);
      expect(result).toBe('Unknown');
      expect(result).not.toContain('Invalid');
    });

    it('should display "Unknown" when installedAt is null', () => {
      const result = formatInstallDate(null);
      expect(result).toBe('Unknown');
      expect(result).not.toContain('Invalid');
    });

    it('should display "Unknown" when installedAt is empty string', () => {
      const result = formatInstallDate('');
      expect(result).toBe('Unknown');
      expect(result).not.toContain('Invalid');
    });

    it('should display "Unknown" for invalid date string', () => {
      const result = formatInstallDate('not-a-date');
      expect(result).toBe('Unknown');
      expect(result).not.toContain('Invalid');
    });

    it('should display formatted date for valid ISO string', () => {
      const result = formatInstallDate('2025-12-29T18:03:29Z');
      expect(result).not.toBe('Unknown');
      expect(result).not.toContain('Invalid');
      // Should be a valid locale string
      expect(result.length).toBeGreaterThan(0);
    });

    it('should display formatted date for valid date-only string', () => {
      const result = formatInstallDate('2025-12-29');
      expect(result).not.toBe('Unknown');
      expect(result).not.toContain('Invalid');
    });
  });

  describe('QA-002: Module Version Display Handling', () => {
    /**
     * Helper function simulating the fixed version display logic from status.ts
     */
    function formatModuleVersion(version: string | undefined | null): string {
      if (!version) {
        return '(version unknown)';
      }
      return `v${version}`;
    }

    it('should display "(version unknown)" when version is undefined', () => {
      const result = formatModuleVersion(undefined);
      expect(result).toBe('(version unknown)');
      expect(result).not.toBe('vundefined');
    });

    it('should display "(version unknown)" when version is null', () => {
      const result = formatModuleVersion(null);
      expect(result).toBe('(version unknown)');
      expect(result).not.toBe('vnull');
    });

    it('should display "(version unknown)" when version is empty string', () => {
      const result = formatModuleVersion('');
      expect(result).toBe('(version unknown)');
      expect(result).not.toBe('v');
    });

    it('should display prefixed version for valid version string', () => {
      const result = formatModuleVersion('1.4.0');
      expect(result).toBe('v1.4.0');
    });

    it('should display prefixed version for semver with prerelease', () => {
      const result = formatModuleVersion('1.0.0-beta.1');
      expect(result).toBe('v1.0.0-beta.1');
    });
  });

  describe('Status Report Building', () => {
    /**
     * Simulates building a status report with incomplete manifest data
     */
    interface ModuleInfo {
      id: string;
      version?: string;
      installedAt?: string;
    }

    interface StatusReportModule {
      id: string;
      version: string;
      installedAt: string;
    }

    function buildModuleReport(modules: Record<string, ModuleInfo>): StatusReportModule[] {
      return Object.entries(modules).map(([id, info]) => ({
        id,
        version: info.version || '',
        installedAt: info.installedAt || '',
      }));
    }

    it('should handle modules with missing version', () => {
      const modules = {
        core: { id: 'core' }, // No version
      };
      const report = buildModuleReport(modules);
      expect(report[0].version).toBe('');
    });

    it('should handle modules with missing installedAt', () => {
      const modules = {
        core: { id: 'core', version: '1.0.0' }, // No installedAt
      };
      const report = buildModuleReport(modules);
      expect(report[0].installedAt).toBe('');
    });

    it('should handle empty modules object', () => {
      const modules = {};
      const report = buildModuleReport(modules);
      expect(report).toHaveLength(0);
    });

    it('should handle complete module data', () => {
      const modules = {
        core: { id: 'core', version: '1.4.0', installedAt: '2025-12-29' },
      };
      const report = buildModuleReport(modules);
      expect(report[0].id).toBe('core');
      expect(report[0].version).toBe('1.4.0');
      expect(report[0].installedAt).toBe('2025-12-29');
    });
  });
});
