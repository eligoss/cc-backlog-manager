import fs from 'fs-extra';
import path from 'path';
import {
  validatePlanName,
  getNextPlanNumber,
  getTemplatePath,
  renderTemplate,
  createPlan,
  PlanResult,
  TemplateVars,
} from '../plan-creator';
import { createSandbox, TestSandbox } from '../../__tests__/test-utils/sandbox';

describe('PlanCreator', () => {
  let sandbox: TestSandbox;
  let testDir: string;
  let plansDir: string;

  beforeEach(async () => {
    sandbox = await createSandbox('plan-creator');
    testDir = sandbox.path;
    plansDir = path.join(testDir, 'ai', 'plans');
    await fs.ensureDir(plansDir);
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('validatePlanName', () => {
    it('should accept valid kebab-case names', () => {
      const result = validatePlanName('my-plan');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept names with numbers', () => {
      const result = validatePlanName('plan-123');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept short valid names', () => {
      const result = validatePlanName('ab');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject names shorter than 2 chars', () => {
      const result = validatePlanName('a');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('2-30 characters');
    });

    it('should reject names longer than 30 chars', () => {
      const result = validatePlanName('a'.repeat(31));
      expect(result.valid).toBe(false);
      expect(result.error).toContain('2-30 characters');
    });

    it('should reject names with uppercase', () => {
      const result = validatePlanName('My-Plan');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('kebab-case');
    });

    it('should reject names with special chars', () => {
      const result = validatePlanName('my_plan');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('kebab-case');
    });

    it('should reject names with spaces', () => {
      const result = validatePlanName('my plan');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('kebab-case');
    });

    it('should reject consecutive hyphens', () => {
      const result = validatePlanName('my--plan');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('consecutive hyphens');
    });

    it('should reject leading hyphens', () => {
      const result = validatePlanName('-my-plan');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('kebab-case');
    });

    it('should reject trailing hyphens', () => {
      const result = validatePlanName('my-plan-');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('kebab-case');
    });
  });

  describe('getNextPlanNumber', () => {
    it('should return 1 for empty category', async () => {
      const categoryDir = path.join(plansDir, 'framework');
      await fs.ensureDir(categoryDir);

      const result = await getNextPlanNumber('framework', testDir);
      expect(result).toBe(1);
    });

    it('should return 1 for non-existent category', async () => {
      const result = await getNextPlanNumber('nonexistent', testDir);
      expect(result).toBe(1);
    });

    it('should return next number after existing plans', async () => {
      const categoryDir = path.join(plansDir, 'framework');
      await fs.ensureDir(categoryDir);
      await fs.ensureDir(path.join(categoryDir, '001-first-plan'));
      await fs.ensureDir(path.join(categoryDir, '002-second-plan'));

      const result = await getNextPlanNumber('framework', testDir);
      expect(result).toBe(3);
    });

    it('should handle gaps in numbering', async () => {
      const categoryDir = path.join(plansDir, 'framework');
      await fs.ensureDir(categoryDir);
      await fs.ensureDir(path.join(categoryDir, '001-first-plan'));
      await fs.ensureDir(path.join(categoryDir, '005-fifth-plan'));

      const result = await getNextPlanNumber('framework', testDir);
      expect(result).toBe(6);
    });

    it('should ignore non-plan directories', async () => {
      const categoryDir = path.join(plansDir, 'framework');
      await fs.ensureDir(categoryDir);
      await fs.ensureDir(path.join(categoryDir, '001-first-plan'));
      await fs.ensureDir(path.join(categoryDir, '.templates'));
      await fs.ensureDir(path.join(categoryDir, 'README.md'));
      await fs.ensureDir(path.join(categoryDir, 'other-dir'));

      const result = await getNextPlanNumber('framework', testDir);
      expect(result).toBe(2);
    });

    it('should ignore hidden directories', async () => {
      const categoryDir = path.join(plansDir, 'framework');
      await fs.ensureDir(categoryDir);
      await fs.ensureDir(path.join(categoryDir, '001-first-plan'));
      await fs.ensureDir(path.join(categoryDir, '.hidden'));

      const result = await getNextPlanNumber('framework', testDir);
      expect(result).toBe(2);
    });
  });

  describe('getTemplatePath', () => {
    it('should find category-specific templates', async () => {
      const categoryTemplateDir = path.join(plansDir, 'framework', '.templates');
      await fs.ensureDir(categoryTemplateDir);
      const templatePath = path.join(categoryTemplateDir, 'PLAN.md.template');
      await fs.writeFile(templatePath, 'Category template');

      const result = await getTemplatePath('framework', 'PLAN.md.template', testDir);
      expect(result).toBe(templatePath);
    });

    it('should fallback to framework templates', async () => {
      const frameworkTemplateDir = path.join(plansDir, 'framework', '.templates');
      await fs.ensureDir(frameworkTemplateDir);
      const templatePath = path.join(frameworkTemplateDir, 'PLAN.md.template');
      await fs.writeFile(templatePath, 'Framework template');

      const result = await getTemplatePath('apm-r', 'PLAN.md.template', testDir);
      expect(result).toBe(templatePath);
    });

    it('should return null if not found', async () => {
      const result = await getTemplatePath('framework', 'nonexistent.template', testDir);
      expect(result).toBeNull();
    });

    it('should prefer category template over framework fallback', async () => {
      const categoryTemplateDir = path.join(plansDir, 'apm-r', '.templates');
      const frameworkTemplateDir = path.join(plansDir, 'framework', '.templates');
      await fs.ensureDir(categoryTemplateDir);
      await fs.ensureDir(frameworkTemplateDir);

      const categoryTemplatePath = path.join(categoryTemplateDir, 'PLAN.md.template');
      const frameworkTemplatePath = path.join(frameworkTemplateDir, 'PLAN.md.template');
      await fs.writeFile(categoryTemplatePath, 'Category template');
      await fs.writeFile(frameworkTemplatePath, 'Framework template');

      const result = await getTemplatePath('apm-r', 'PLAN.md.template', testDir);
      expect(result).toBe(categoryTemplatePath);
    });
  });

  describe('renderTemplate', () => {
    it('should replace {number} placeholder', () => {
      const template = 'Plan {number}';
      const vars: TemplateVars = {
        number: '003',
        date: '2025-12-21',
      };

      const result = renderTemplate(template, vars);
      expect(result).toBe('Plan 003');
    });

    it('should replace {date} placeholder', () => {
      const template = 'Date: {date}';
      const vars: TemplateVars = {
        number: '001',
        date: '2025-12-21',
      };

      const result = renderTemplate(template, vars);
      expect(result).toBe('Date: 2025-12-21');
    });

    it('should replace {Category} placeholder', () => {
      const template = 'Category: {Category}';
      const vars: TemplateVars = {
        number: '001',
        date: '2025-12-21',
        Category: 'Framework',
      };

      const result = renderTemplate(template, vars);
      expect(result).toBe('Category: Framework');
    });

    it('should replace multiple placeholders', () => {
      const template = 'Plan {number} - {date} - {Category}';
      const vars: TemplateVars = {
        number: '042',
        date: '2025-12-21',
        Category: 'APM-R',
      };

      const result = renderTemplate(template, vars);
      expect(result).toBe('Plan 042 - 2025-12-21 - APM-R');
    });

    it('should handle templates with no placeholders', () => {
      const template = 'Static content';
      const vars: TemplateVars = {
        number: '001',
        date: '2025-12-21',
      };

      const result = renderTemplate(template, vars);
      expect(result).toBe('Static content');
    });

    it('should handle empty template', () => {
      const template = '';
      const vars: TemplateVars = {
        number: '001',
        date: '2025-12-21',
      };

      const result = renderTemplate(template, vars);
      expect(result).toBe('');
    });
  });

  describe('createPlan', () => {
    beforeEach(async () => {
      // Create template files
      const templateDir = path.join(plansDir, 'framework', '.templates');
      await fs.ensureDir(templateDir);

      const planTemplate = `# Plan {number}

Created: {date}
Category: {Category}

## Problem Statement
[TODO]

## Phases
[TODO]
`;

      const progressTemplate = `# Progress - Plan {number}

Created: {date}

## Status
Not Started

## Updates
None yet
`;

      await fs.writeFile(path.join(templateDir, 'PLAN.md.template'), planTemplate);
      await fs.writeFile(path.join(templateDir, 'PROGRESS.md.template'), progressTemplate);
    });

    it('should create folder structure', async () => {
      const result = await createPlan('my-plan', 'framework', testDir);

      expect(result.success).toBe(true);
      const planFolder = path.join(plansDir, 'framework', '001-my-plan');
      expect(await fs.pathExists(planFolder)).toBe(true);
    });

    it('should create PLAN.md from template', async () => {
      const result = await createPlan('my-plan', 'framework', testDir);

      expect(result.success).toBe(true);
      const planFile = path.join(plansDir, 'framework', '001-my-plan', 'PLAN.md');
      expect(await fs.pathExists(planFile)).toBe(true);

      const content = await fs.readFile(planFile, 'utf-8');
      expect(content).toContain('# Plan 001');
      expect(content).toContain('Category: Framework');
    });

    it('should create PROGRESS.md from template', async () => {
      const result = await createPlan('my-plan', 'framework', testDir);

      expect(result.success).toBe(true);
      const progressFile = path.join(plansDir, 'framework', '001-my-plan', 'PROGRESS.md');
      expect(await fs.pathExists(progressFile)).toBe(true);

      const content = await fs.readFile(progressFile, 'utf-8');
      expect(content).toContain('# Progress - Plan 001');
    });

    it('should use correct category display for APM-R', async () => {
      // Create APM-R category
      const apmrDir = path.join(plansDir, 'apm-r');
      await fs.ensureDir(apmrDir);

      const result = await createPlan('my-plan', 'apm-r', testDir);

      expect(result.success).toBe(true);
      const planFile = path.join(plansDir, 'apm-r', '001-my-plan', 'PLAN.md');
      const content = await fs.readFile(planFile, 'utf-8');
      expect(content).toContain('Category: APM-R');
    });

    it('should respect dry-run mode', async () => {
      const result = await createPlan('my-plan', 'framework', testDir, true);

      expect(result.success).toBe(true);
      expect(result.message).toContain('DRY RUN');
      expect(result.message).toContain('No files created');

      const planFolder = path.join(plansDir, 'framework', '001-my-plan');
      expect(await fs.pathExists(planFolder)).toBe(false);
    });

    it('should allow multiple plans with same name (auto-increment)', async () => {
      // The system allows multiple plans with the same name by auto-incrementing the number
      const result1 = await createPlan('my-plan', 'framework', testDir);
      expect(result1.success).toBe(true);

      const result2 = await createPlan('my-plan', 'framework', testDir);
      expect(result2.success).toBe(true);

      // Both should exist
      expect(await fs.pathExists(path.join(plansDir, 'framework', '001-my-plan'))).toBe(true);
      expect(await fs.pathExists(path.join(plansDir, 'framework', '002-my-plan'))).toBe(true);
    });

    it('should fail for invalid plan name', async () => {
      const result = await createPlan('My-Plan', 'framework', testDir);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid plan name');
    });

    it('should fail if PLAN.md.template not found', async () => {
      const templateDir = path.join(plansDir, 'framework', '.templates');
      await fs.remove(path.join(templateDir, 'PLAN.md.template'));

      const result = await createPlan('my-plan', 'framework', testDir);

      expect(result.success).toBe(false);
      expect(result.message).toContain('PLAN.md.template not found');
    });

    it('should fail if PROGRESS.md.template not found', async () => {
      const templateDir = path.join(plansDir, 'framework', '.templates');
      await fs.remove(path.join(templateDir, 'PROGRESS.md.template'));

      const result = await createPlan('my-plan', 'framework', testDir);

      expect(result.success).toBe(false);
      expect(result.message).toContain('PROGRESS.md.template not found');
    });

    it('should auto-increment plan numbers', async () => {
      await createPlan('first-plan', 'framework', testDir);
      await createPlan('second-plan', 'framework', testDir);

      const firstFolder = path.join(plansDir, 'framework', '001-first-plan');
      const secondFolder = path.join(plansDir, 'framework', '002-second-plan');

      expect(await fs.pathExists(firstFolder)).toBe(true);
      expect(await fs.pathExists(secondFolder)).toBe(true);
    });

    it('should include plan details in success message', async () => {
      const result = await createPlan('my-plan', 'framework', testDir);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Plan created successfully');
      expect(result.message).toContain('001');
      expect(result.message).toContain('framework');
    });

    it('should include plan details in dry-run message', async () => {
      const result = await createPlan('my-plan', 'framework', testDir, true);

      expect(result.success).toBe(true);
      expect(result.message).toContain('001');
      expect(result.message).toContain('my-plan');
      expect(result.message).toContain('framework');
    });
  });
});
