/**
 * Unit Tests for Boundary Validator
 *
 * Tests reference extraction and boundary validation logic with mocked filesystem.
 */

import * as fs from 'fs/promises';
import { glob } from 'glob';
import { BoundaryValidator, Zone } from '../boundary-validator.js';

// Mock fs/promises
jest.mock('fs/promises');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock glob
jest.mock('glob');
const mockedGlob = glob as jest.MockedFunction<typeof glob>;

describe('BoundaryValidator', () => {
  const projectRoot = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('classifyZone', () => {
    it('should classify framework/ files as framework zone', () => {
      const validator = new BoundaryValidator(projectRoot);
      expect(validator.classifyZone('/test/project/framework/test.md')).toBe('framework');
      expect(validator.classifyZone('/test/project/framework/modules/core/test.md')).toBe('framework');
    });

    it('should classify .claude/ files as instance zone', () => {
      const validator = new BoundaryValidator(projectRoot);
      expect(validator.classifyZone('/test/project/.claude/test.md')).toBe('instance');
      expect(validator.classifyZone('/test/project/.claude/commands/test.md')).toBe('instance');
    });

    it('should classify other paths as framework zone (default)', () => {
      const validator = new BoundaryValidator(projectRoot);
      // Paths not in instance list default to framework zone
      expect(validator.classifyZone('/test/project/other/context/test.md')).toBe('framework');
      expect(validator.classifyZone('/test/project/src/index.ts')).toBe('framework');
    });

    it('should classify CLAUDE.md as instance zone', () => {
      const validator = new BoundaryValidator(projectRoot);
      expect(validator.classifyZone('/test/project/CLAUDE.md')).toBe('instance');
    });

    it('should classify routes.yml as instance zone', () => {
      const validator = new BoundaryValidator(projectRoot);
      expect(validator.classifyZone('/test/project/routes.yml')).toBe('instance');
    });

    it('should classify docs/ as instance zone', () => {
      const validator = new BoundaryValidator(projectRoot);
      expect(validator.classifyZone('/test/project/docs/guide.md')).toBe('instance');
    });

    it('should default other files to framework zone', () => {
      const validator = new BoundaryValidator(projectRoot);
      expect(validator.classifyZone('/test/project/other/file.md')).toBe('framework');
      expect(validator.classifyZone('/test/project/src/index.ts')).toBe('framework');
    });

    it('should respect custom frameworkPath option', () => {
      const validator = new BoundaryValidator(projectRoot, { frameworkPath: 'src/' });
      expect(validator.classifyZone('/test/project/src/test.md')).toBe('framework');
      expect(validator.classifyZone('/test/project/framework/test.md')).toBe('framework'); // Default fallback
    });

    it('should respect custom instancePaths option', () => {
      const validator = new BoundaryValidator(projectRoot, { instancePaths: ['custom/'] });
      expect(validator.classifyZone('/test/project/custom/test.md')).toBe('instance');
      // Default paths no longer work with custom instancePaths
      expect(validator.classifyZone('/test/project/.claude/test.md')).toBe('framework');
    });
  });

  describe('validateProject', () => {
    it('should return valid when no files match patterns', async () => {
      mockedGlob.mockResolvedValue([]);

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.stats.filesScanned).toBe(0);
    });

    it('should extract markdown references and detect framework-to-instance violations', async () => {
      mockedGlob
        .mockResolvedValueOnce(['/test/project/framework/test.md']) // framework files
        .mockResolvedValueOnce([]); // instance files

      mockedFs.readFile.mockResolvedValue(
        '# Test\n[link](../.claude/context/test.md) for details.\n'
      );

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].rule).toBe('framework-to-instance');
      expect(result.stats.frameworkViolations).toBe(1);
    });

    it('should extract markdown references and detect instance-to-framework violations', async () => {
      mockedGlob
        .mockResolvedValueOnce([]) // framework files
        .mockResolvedValueOnce(['/test/project/.claude/test.md']); // instance files

      mockedFs.readFile.mockResolvedValue(
        '# Test\n[link](../framework/modules/test.md) for details.\n'
      );

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].rule).toBe('instance-to-framework');
      expect(result.stats.instanceViolations).toBe(1);
    });

    it('should detect hardcoded absolute paths in markdown', async () => {
      mockedGlob
        .mockResolvedValueOnce(['/test/project/framework/test.md'])
        .mockResolvedValueOnce([]);

      mockedFs.readFile.mockResolvedValue(
        '# Test\nSee /Users/john/project/file.md for details.\n'
      );

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();

      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.rule === 'hardcoded-absolute')).toBe(true);
      expect(result.stats.absolutePathViolations).toBeGreaterThan(0);
    });

    it('should detect hardcoded Linux paths', async () => {
      mockedGlob
        .mockResolvedValueOnce(['/test/project/framework/test.md'])
        .mockResolvedValueOnce([]);

      mockedFs.readFile.mockResolvedValue(
        '# Test\nSee /home/user/project/file.md for details.\n'
      );

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();

      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.rule === 'hardcoded-absolute')).toBe(true);
    });

    it('should ignore external URLs in markdown', async () => {
      mockedGlob
        .mockResolvedValueOnce(['/test/project/framework/test.md'])
        .mockResolvedValueOnce([]);

      mockedFs.readFile.mockResolvedValue(
        '# Test\n[link](https://example.com) and [ftp](ftp://server.com)\n'
      );

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();

      expect(result.valid).toBe(true);
      expect(result.stats.referencesChecked).toBe(0);
    });

    it('should ignore anchor-only links', async () => {
      mockedGlob
        .mockResolvedValueOnce(['/test/project/framework/test.md'])
        .mockResolvedValueOnce([]);

      mockedFs.readFile.mockResolvedValue('# Test\n[section](#my-section)\n');

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();

      expect(result.valid).toBe(true);
      expect(result.stats.referencesChecked).toBe(0);
    });

    it('should skip links inside code blocks', async () => {
      mockedGlob
        .mockResolvedValueOnce(['/test/project/framework/test.md'])
        .mockResolvedValueOnce([]);

      mockedFs.readFile.mockResolvedValue(
        '# Test\n```markdown\n[link](../ai/context/test.md)\n```\nNormal text\n'
      );

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();

      // Links in code blocks should be ignored
      expect(result.violations.filter(v => v.rule === 'framework-to-instance')).toHaveLength(0);
    });

    it('should skip {project}/ placeholders', async () => {
      mockedGlob
        .mockResolvedValueOnce(['/test/project/framework/test.md'])
        .mockResolvedValueOnce([]);

      mockedFs.readFile.mockResolvedValue(
        '# Test\n[link]({project}/ai/context/test.md)\n'
      );

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();

      // {project}/ placeholders are valid
      expect(result.violations).toHaveLength(0);
    });

    it('should extract JSON references and detect path violations', async () => {
      mockedGlob
        .mockResolvedValueOnce(['/test/project/framework/module.json'])
        .mockResolvedValueOnce([]);

      mockedFs.readFile.mockResolvedValue(
        JSON.stringify({
          path: '../ai/registries/agents.json',
          name: 'test'
        }, null, 2)
      );

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();

      expect(result.stats.referencesChecked).toBeGreaterThan(0);
    });

    it('should extract YAML references', async () => {
      mockedGlob
        .mockResolvedValueOnce(['/test/project/framework/config.yml'])
        .mockResolvedValueOnce([]);

      mockedFs.readFile.mockResolvedValue('path: ../ai/context/test.md\nname: test\n');

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();

      expect(result.stats.referencesChecked).toBeGreaterThan(0);
    });

    it('should handle file read errors gracefully', async () => {
      mockedGlob
        .mockResolvedValueOnce(['/test/project/framework/test.md'])
        .mockResolvedValueOnce([]);

      mockedFs.readFile.mockRejectedValue(new Error('Permission denied'));

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();

      // Should not throw, just skip the file
      expect(result.stats.filesScanned).toBe(1);
    });

    it('should pass when framework links to framework', async () => {
      mockedGlob
        .mockResolvedValueOnce(['/test/project/framework/test.md'])
        .mockResolvedValueOnce([]);

      mockedFs.readFile.mockResolvedValue(
        '# Test\n[link](./other.md) for details.\n'
      );

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();

      expect(result.valid).toBe(true);
      expect(result.stats.frameworkViolations).toBe(0);
    });

    it('should pass when instance links to instance', async () => {
      mockedGlob
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(['/test/project/ai/context/technical.md']);

      mockedFs.readFile.mockResolvedValue(
        '# Technical\n[link](./business.md) for details.\n'
      );

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();

      expect(result.valid).toBe(true);
      expect(result.stats.instanceViolations).toBe(0);
    });

    it('should skip absolute paths in instance that match project root', async () => {
      const validator = new BoundaryValidator(projectRoot);

      mockedGlob
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(['/test/project/.claude/test.md']);

      // Absolute path that starts with project root - valid in instance
      mockedFs.readFile.mockResolvedValue(
        `# Test\nPath: /test/project/ai/context/test.md\n`
      );

      const result = await validator.validateProject();

      // Should allow project root paths in instance files
      expect(result.violations.filter(v => v.rule === 'hardcoded-absolute')).toHaveLength(0);
    });
  });

  describe('formatReport', () => {
    it('should format clean report when no violations', async () => {
      mockedGlob.mockResolvedValue([]);

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();
      const report = validator.formatReport(result);

      expect(report).toContain('BOUNDARY VALIDATION REPORT');
      expect(report).toContain('Files Scanned: 0');
      expect(report).toContain('References Checked: 0');
      expect(report).toContain('Framework→Instance: 0');
      expect(report).toContain('Instance→Framework: 0');
      expect(report).toContain('Hardcoded Absolute: 0');
      expect(report).not.toContain('Violations:');
    });

    it('should format report with violations grouped by file', async () => {
      mockedGlob
        .mockResolvedValueOnce(['/test/project/framework/test.md'])
        .mockResolvedValueOnce([]);

      mockedFs.readFile.mockResolvedValue(
        '# Test\n[link](../.claude/context/test.md) for details.\nPath: /Users/john/file.md\n'
      );

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();
      const report = validator.formatReport(result);

      expect(report).toContain('Violations:');
      expect(report).toContain('framework/test.md:');
      expect(report).toContain('[framework-to-instance]');
      expect(report).toContain('[hardcoded-absolute]');
    });
  });

  describe('Reference Extraction Edge Cases', () => {
    it('should handle URL-encoded paths', async () => {
      mockedGlob
        .mockResolvedValueOnce(['/test/project/framework/test.md'])
        .mockResolvedValueOnce([]);

      mockedFs.readFile.mockResolvedValue(
        '# Test\n[link](./path%20with%20spaces/file.md)\n'
      );

      const validator = new BoundaryValidator(projectRoot);
      // Should not throw
      await expect(validator.validateProject()).resolves.toBeDefined();
    });

    it('should handle paths with anchors', async () => {
      mockedGlob
        .mockResolvedValueOnce(['/test/project/framework/test.md'])
        .mockResolvedValueOnce([]);

      mockedFs.readFile.mockResolvedValue(
        '# Test\n[link](./other.md#section)\n'
      );

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();

      // Should strip anchor and process path
      expect(result.stats.referencesChecked).toBeGreaterThan(0);
    });

    it('should handle multiple links on same line', async () => {
      mockedGlob
        .mockResolvedValueOnce(['/test/project/framework/test.md'])
        .mockResolvedValueOnce([]);

      mockedFs.readFile.mockResolvedValue(
        '# Test\n[link1](./a.md) and [link2](./b.md) and [link3](../.claude/c.md)\n'
      );

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();

      expect(result.stats.referencesChecked).toBe(3);
      expect(result.stats.frameworkViolations).toBe(1); // link3 to .claude/
    });

    it('should detect Windows absolute paths', async () => {
      mockedGlob
        .mockResolvedValueOnce(['/test/project/framework/test.md'])
        .mockResolvedValueOnce([]);

      mockedFs.readFile.mockResolvedValue(
        '# Test\nPath: C:\\Users\\john\\project\\file.md\n'
      );

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();

      expect(result.violations.some(v => v.rule === 'hardcoded-absolute')).toBe(true);
    });

    it('should handle empty files', async () => {
      mockedGlob
        .mockResolvedValueOnce(['/test/project/framework/test.md'])
        .mockResolvedValueOnce([]);

      mockedFs.readFile.mockResolvedValue('');

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();

      expect(result.stats.referencesChecked).toBe(0);
    });

    it('should skip unsupported file types', async () => {
      mockedGlob
        .mockResolvedValueOnce(['/test/project/framework/test.ts'])
        .mockResolvedValueOnce([]);

      mockedFs.readFile.mockResolvedValue(
        'import something from "../ai/context/test";\n'
      );

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();

      // .ts files are not processed
      expect(result.stats.referencesChecked).toBe(0);
    });
  });

  describe('Documentation Example Detection', () => {
    it('should skip absolute paths in anti-patterns.md', async () => {
      mockedGlob
        .mockResolvedValueOnce(['/test/project/framework/ANTI-PATTERNS.md'])
        .mockResolvedValueOnce([]);

      mockedFs.readFile.mockResolvedValue(
        '# Anti-Patterns\nBad: /Users/anton/project/file.md\n'
      );

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();

      // Should skip documentation examples
      expect(result.violations.filter(v => v.rule === 'hardcoded-absolute')).toHaveLength(0);
    });

    it('should skip absolute paths in quick-reference.md', async () => {
      mockedGlob
        .mockResolvedValueOnce(['/test/project/framework/QUICK-REFERENCE.md'])
        .mockResolvedValueOnce([]);

      mockedFs.readFile.mockResolvedValue(
        '# Quick Reference\nExample: /Users/anton/Documents/file.md\n'
      );

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();

      expect(result.violations.filter(v => v.rule === 'hardcoded-absolute')).toHaveLength(0);
    });

    it('should NOT skip absolute paths in regular files with /Users/anton/', async () => {
      mockedGlob
        .mockResolvedValueOnce(['/test/project/framework/test.md'])
        .mockResolvedValueOnce([]);

      mockedFs.readFile.mockResolvedValue(
        '# Test\nPath: /Users/anton/project/file.md\n'
      );

      const validator = new BoundaryValidator(projectRoot);
      const result = await validator.validateProject();

      // Should detect in regular files
      expect(result.violations.some(v => v.rule === 'hardcoded-absolute')).toBe(true);
    });
  });
});
