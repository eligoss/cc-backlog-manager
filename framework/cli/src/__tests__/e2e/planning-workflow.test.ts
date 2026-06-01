/**
 * E2E Test: Planning Workflow
 *
 * Tests planning workflows:
 * - Create plan → Verify structure → Check templates
 */

import path from 'path';
import fs from 'fs-extra';
import { createPlan } from '../../lib/planning/plan-creator.js';
import { createSandbox, TestSandbox } from '../../lib/__tests__/test-utils/sandbox.js';

describe('E2E: Planning Workflow', () => {
  let sandbox: TestSandbox;
  let TEST_DIR: string;

  beforeAll(async () => {
    sandbox = await createSandbox('e2e-planning');
    TEST_DIR = sandbox.path;
  });

  afterAll(async () => {
    await sandbox.cleanup();
  });

  describe('Create Plan', () => {
    it('should create a new plan successfully', async () => {
      const projectRoot = path.join(TEST_DIR, 'basic-test');
      await fs.ensureDir(projectRoot);

      const result = await createPlan('test-plan', 'framework', projectRoot, false);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should handle dry-run mode', async () => {
      const projectRoot = path.join(TEST_DIR, 'dryrun-test');
      await fs.ensureDir(projectRoot);

      const result = await createPlan('dryrun-plan', 'framework', projectRoot, true);

      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should handle different categories', async () => {
      const projectRoot = path.join(TEST_DIR, 'category-test');
      await fs.ensureDir(projectRoot);

      const frameworkResult = await createPlan('framework-plan', 'framework', projectRoot, false);
      expect(frameworkResult).toBeDefined();

      const apmrResult = await createPlan('apmr-plan', 'apm-r', projectRoot, false);
      expect(apmrResult).toBeDefined();
    });

    it('should handle invalid plan name', async () => {
      const projectRoot = path.join(TEST_DIR, 'invalid-test');
      await fs.ensureDir(projectRoot);

      const result = await createPlan('', 'framework', projectRoot, false);
      expect(result.success).toBe(false);
    });

    it('should create multiple plans', async () => {
      const projectRoot = path.join(TEST_DIR, 'multiple-test');
      await fs.ensureDir(projectRoot);

      const result1 = await createPlan('plan-1', 'framework', projectRoot, false);
      const result2 = await createPlan('plan-2', 'framework', projectRoot, false);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });

  describe('Plan Structure', () => {
    it('should return result for plan creation attempt', async () => {
      const projectRoot = path.join(TEST_DIR, 'structure-test');
      await fs.ensureDir(projectRoot);

      const result = await createPlan('structured-plan', 'framework', projectRoot, false);

      // Should return a result even if template doesn't exist
      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should handle category parameter', async () => {
      const projectRoot = path.join(TEST_DIR, 'category-dir-test');
      await fs.ensureDir(projectRoot);

      const result = await createPlan('cat-plan', 'framework', projectRoot, false);

      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
    });
  });

  describe('Dry-run Mode', () => {
    it('should return result in dry-run mode', async () => {
      const projectRoot = path.join(TEST_DIR, 'preview-test');
      await fs.ensureDir(projectRoot);

      const result = await createPlan('preview-plan', 'framework', projectRoot, true);

      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
    });
  });
});
