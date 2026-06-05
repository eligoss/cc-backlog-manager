import path from 'path';
import { DiscoveryEngine } from '../discovery-engine';
import { FrameworkValidator } from '../framework-validator';
import fs from 'fs-extra';

describe('Framework Integrity (Integration)', () => {
  let engine: DiscoveryEngine;
  let validator: FrameworkValidator;
  let FRAMEWORK_ROOT: string;

  beforeAll(async () => {
    // Use dynamic framework root resolution (bundled or development)
    // Check for bundled framework first (cli/dist/lib/__tests__ -> cli/framework)
    const bundledPath = path.resolve(__dirname, '../../../framework');
    if (await fs.pathExists(bundledPath)) {
      FRAMEWORK_ROOT = bundledPath;
    } else {
      // Development mode: cli/src/lib/__tests__ -> framework root
      FRAMEWORK_ROOT = path.resolve(__dirname, '../../../..');
    }

    engine = new DiscoveryEngine(FRAMEWORK_ROOT);
    await engine.loadModules();
    await engine.buildCapabilityMap();
    validator = new FrameworkValidator(engine, FRAMEWORK_ROOT);
  });

  describe('Capability Resolution', () => {
    it('should resolve all agent capability-needs to at least one skill', async () => {
      const result = await validator.validateCapabilityResolution();

      if (!result.valid) {
        console.log('Capability resolution issues:', result.issues);
      }

      expect(result.valid).toBe(true);
      expect(result.issues.filter(i => i.type === 'error')).toHaveLength(0);
    });

    it('should have no unfulfilled capabilities across all agents', async () => {
      const result = await validator.validateCapabilityResolution();
      expect(result.stats.failed).toBe(0);
    });
  });


  describe('Module Declarations', () => {
    it('should have all declared agent files', async () => {
      const result = await validator.validateModuleDeclarations();

      const agentIssues = result.issues.filter(i =>
        i.details?.agentId !== undefined
      );

      if (agentIssues.length > 0) {
        console.log('Missing agent files:', agentIssues);
      }

      expect(agentIssues.filter(i => i.type === 'error')).toHaveLength(0);
    });

    it('should have all declared skill directories', async () => {
      const result = await validator.validateModuleDeclarations();

      const skillIssues = result.issues.filter(i =>
        i.details?.skillId !== undefined
      );

      if (skillIssues.length > 0) {
        console.log('Missing skill directories:', skillIssues);
      }

      expect(skillIssues.filter(i => i.type === 'error')).toHaveLength(0);
    });
  });

  describe('Skill Capabilities', () => {
    it('should have consistent capability declarations', async () => {
      const result = await validator.validateSkillCapabilities();

      if (!result.valid) {
        console.log('Skill capability issues:', result.issues);
      }

      // Warnings are acceptable, errors are not
      const errors = result.issues.filter(i => i.type === 'error');
      expect(errors).toHaveLength(0);
    });
  });

  describe('Full Validation', () => {
    // Note: Full validation via validateAll() includes context existence checks
    // which look for deployed context files (ai/context/*.md). When testing
    // framework source, these files don't exist - they're deployment artifacts.
    // We test framework-specific validations individually instead.
    it('should pass framework structure validations', async () => {
      const report = await validator.validateAll();

      // Capability resolution should pass
      expect(report.capabilityResolution.valid).toBe(true);

      // Module declarations should pass
      expect(report.moduleDeclarations.valid).toBe(true);

      // Skill capabilities may have warnings but no errors
      const skillErrors = report.skillCapabilities.issues.filter(i => i.type === 'error');
      expect(skillErrors).toHaveLength(0);

      // Agent variants should pass
      expect(report.agentVariants.valid).toBe(true);
    });

    it('should report validation statistics', async () => {
      const report = await validator.validateAll();

      console.log('Framework Validation Stats:');
      console.log(`  Capability Resolution: ${report.capabilityResolution.stats.passed}/${report.capabilityResolution.stats.checked}`);
      console.log(`  Module Declarations: ${report.moduleDeclarations.stats.passed}/${report.moduleDeclarations.stats.checked}`);
      console.log(`  Skill Capabilities: ${report.skillCapabilities.stats.passed}/${report.skillCapabilities.stats.checked}`);
      console.log(`  Agent Variants: ${report.agentVariants.stats.passed}/${report.agentVariants.stats.checked}`);

      expect(report.timestamp).toBeDefined();
    });
  });
});
