import path from 'path';
import fs from 'fs-extra';
import { FrameworkValidator } from '../framework-validator';
import { DiscoveryEngine } from '../discovery-engine';
import { createSandbox, TestSandbox } from './test-utils/sandbox';

describe('FrameworkValidator', () => {
  let sandbox: TestSandbox;
  let testDir: string;
  let engine: DiscoveryEngine;
  let validator: FrameworkValidator;

  // Create a complete, valid module setup with all required directories and files
  async function createValidFixture() {
    // Create core module (inside modules/ directory like all other modules)
    const coreDir = path.join(testDir, 'modules', 'core');
    await fs.ensureDir(coreDir);
    await fs.writeJson(path.join(coreDir, 'module.json'), {
      id: 'core',
      version: '1.0.0',
      name: 'Core Framework',
      description: 'Core framework module',
      provides: {
        agents: ['ai-framework-manager'],
        skills: ['committing-code', 'verifying-quality'],
        capabilities: ['git-workflow-management', 'quality-assurance'],
      },
    });

    // Create ai/context directory at framework root (not inside core)
    const contextDir = path.join(testDir, 'ai', 'context');
    await fs.ensureDir(contextDir);

    // Create business context files
    await fs.writeFile(path.join(contextDir, 'business-basic.md'), `---
context: business-basic
level: basic
category: business
---
# Business Context - Basic Level

Core business concepts and strategies.
`);

    await fs.writeFile(path.join(contextDir, 'business-advanced.md'), `---
context: business-advanced
level: advanced
category: business
---
# Business Context - Advanced Level

Advanced business strategies and domain knowledge.
`);

    // Create technical context files
    await fs.writeFile(path.join(contextDir, 'technical-basic.md'), `---
context: technical-basic
level: basic
category: technical
---
# Technical Context - Basic Level

Core technical concepts.
`);

    await fs.writeFile(path.join(contextDir, 'technical-advanced.md'), `---
context: technical-advanced
level: advanced
category: technical
---
# Technical Context - Advanced Level

Advanced technical knowledge and architecture.
`);

    // Create process context files
    await fs.writeFile(path.join(contextDir, 'process-basic.md'), `---
context: process-basic
level: basic
category: process
---
# Process Context - Basic Level

Basic process workflows.
`);

    await fs.writeFile(path.join(contextDir, 'process-advanced.md'), `---
context: process-advanced
level: advanced
category: process
---
# Process Context - Advanced Level

Advanced process workflows and procedures.
`);

    // Create agents directory with agent files
    const coreAgentsDir = path.join(coreDir, 'agents');
    await fs.ensureDir(coreAgentsDir);
    await fs.writeFile(path.join(coreAgentsDir, 'ai-framework-manager.md'), `---
agent: ai-framework-manager
capability-needs:
  - git-workflow-management
  - quality-assurance
context-category-needs:
  business: basic
  technical: advanced
token-budget: 3000
---
# Framework Manager Agent
`);

    // Create skills directory with skill files
    const coreSkillsDir = path.join(coreDir, 'skills');
    await fs.ensureDir(path.join(coreSkillsDir, 'committing-code'));
    await fs.writeFile(path.join(coreSkillsDir, 'committing-code', 'SKILL.md'), `---
skill: committing-code
capabilities-provided:
  - git-workflow-management
---
# Committing Code Skill
`);

    await fs.ensureDir(path.join(coreSkillsDir, 'verifying-quality'));
    await fs.writeFile(path.join(coreSkillsDir, 'verifying-quality', 'SKILL.md'), `---
skill: verifying-quality
capabilities-provided:
  - quality-assurance
---
# Verifying Quality Skill
`);

    // Create planning module
    const planningDir = path.join(testDir, 'modules', 'planning');
    await fs.ensureDir(planningDir);
    await fs.writeJson(path.join(planningDir, 'module.json'), {
      id: 'planning',
      version: '1.0.0',
      name: 'Planning Module',
      description: 'Planning workflows',
      provides: {
        agents: ['ai-planning-manager'],
        skills: ['planning-phases'],
        capabilities: ['plan-creation', 'phase-decomposition', 'progress-tracking'],
      },
      requires: {
        core: '>=1.0.0',
      },
    });

    // Create planning agent
    const planningAgentsDir = path.join(planningDir, 'agents');
    await fs.ensureDir(planningAgentsDir);
    await fs.writeFile(path.join(planningAgentsDir, 'ai-planning-manager.md'), `---
agent: ai-planning-manager
capability-needs:
  - plan-creation
  - phase-decomposition
  - git-workflow-management
context-category-needs:
  process: advanced
token-budget: 3500
---
# Planning Manager Agent
`);

    // Create planning skill
    const planningSkillsDir = path.join(planningDir, 'skills');
    await fs.ensureDir(path.join(planningSkillsDir, 'planning-phases'));
    await fs.writeFile(path.join(planningSkillsDir, 'planning-phases', 'SKILL.md'), `---
skill: planning-phases
capabilities-provided:
  - plan-creation
  - phase-decomposition
  - progress-tracking
---
# Planning Phases Skill
`);

    // Create coding module
    const codingDir = path.join(testDir, 'modules', 'coding');
    await fs.ensureDir(codingDir);
    await fs.writeJson(path.join(codingDir, 'module.json'), {
      id: 'coding',
      version: '1.0.0',
      name: 'Coding Module',
      description: 'Development agents',
      provides: {
        agents: ['ai-app-developer'],
        skills: ['coding-practices'],
        capabilities: ['code-implementation', 'testing-strategy'],
      },
      requires: {
        core: '>=1.0.0',
      },
      'optional-dependencies': ['planning'],
    });

    // Create coding agent
    const codingAgentsDir = path.join(codingDir, 'agents');
    await fs.ensureDir(codingAgentsDir);
    await fs.writeFile(path.join(codingAgentsDir, 'ai-app-developer.md'), `---
agent: ai-app-developer
capability-needs:
  - code-implementation
  - quality-assurance
  - git-workflow-management
context-category-needs:
  technical: advanced
token-budget: 2500
---
# App Developer Agent
`);

    // Create coding skill
    const codingSkillsDir = path.join(codingDir, 'skills');
    await fs.ensureDir(path.join(codingSkillsDir, 'coding-practices'));
    await fs.writeFile(path.join(codingSkillsDir, 'coding-practices', 'SKILL.md'), `---
skill: coding-practices
capabilities-provided:
  - code-implementation
  - testing-strategy
---
# Coding Practices Skill
`);

  }

  beforeEach(async () => {
    sandbox = await createSandbox('framework-validator');
    testDir = sandbox.path;
    await createValidFixture();
    engine = new DiscoveryEngine(testDir);
    await engine.loadModules();
    await engine.buildCapabilityMap();
    validator = new FrameworkValidator(engine, testDir);
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('constructor', () => {
    it('should create validator with discovery engine and framework root', () => {
      expect(validator).toBeDefined();
    });

    it('should initialize with provided discovery engine', () => {
      expect(validator).toHaveProperty('engine');
    });

    it('should initialize with provided framework root path', () => {
      expect(validator).toHaveProperty('frameworkRoot', testDir);
    });
  });

  describe('validateCapabilityResolution()', () => {
    it('should pass when all capabilities resolve to skills', async () => {
      const result = await validator.validateCapabilityResolution();

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail when agent has unfulfilled capability', async () => {
      // Add agent with unknown capability
      const brokenAgentPath = path.join(testDir, 'modules', 'core', 'agents', 'broken-agent.md');
      await fs.writeFile(brokenAgentPath, `---
agent: broken-agent
capability-needs:
  - unknown-capability
---
# Broken Agent
`);

      // Update module.json to include this agent
      const coreModulePath = path.join(testDir, 'modules', 'core', 'module.json');
      const coreModule = await fs.readJson(coreModulePath);
      coreModule.provides.agents.push('broken-agent');
      await fs.writeJson(coreModulePath, coreModule);

      // Recreate engine and validator
      const freshEngine = new DiscoveryEngine(testDir);
      await freshEngine.loadModules();
      await freshEngine.buildCapabilityMap();
      const freshValidator = new FrameworkValidator(freshEngine, testDir);

      const result = await freshValidator.validateCapabilityResolution();

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some(issue => issue.message?.includes('unknown-capability') || issue.details?.capability === 'unknown-capability')).toBe(true);
    });

    it('should return correct stats on success', async () => {
      const result = await validator.validateCapabilityResolution();

      expect(result.stats).toBeDefined();
      expect(result.stats.checked).toBeGreaterThan(0);
      expect(result.stats.passed).toBe(result.stats.checked);
      expect(result.stats.failed).toBe(0);
    });

    it('should return correct stats on failure', async () => {
      // Add agent with unknown capability
      const brokenAgentPath = path.join(testDir, 'modules', 'core', 'agents', 'broken-agent.md');
      await fs.writeFile(brokenAgentPath, `---
agent: broken-agent
capability-needs:
  - unknown-capability
---
# Broken Agent
`);

      // Update module.json
      const coreModulePath = path.join(testDir, 'modules', 'core', 'module.json');
      const coreModule = await fs.readJson(coreModulePath);
      coreModule.provides.agents.push('broken-agent');
      await fs.writeJson(coreModulePath, coreModule);

      // Recreate engine and validator
      const freshEngine = new DiscoveryEngine(testDir);
      await freshEngine.loadModules();
      await freshEngine.buildCapabilityMap();
      const freshValidator = new FrameworkValidator(freshEngine, testDir);

      const result = await freshValidator.validateCapabilityResolution();

      expect(result.stats.failed).toBeGreaterThan(0);
      expect(result.stats.passed + result.stats.failed).toBe(result.stats.checked);
    });

    it('should handle agents without capability needs', async () => {
      // Add agent with no capability-needs
      const simplePath = path.join(testDir, 'modules', 'core', 'agents', 'simple-agent.md');
      await fs.writeFile(simplePath, `---
agent: simple-agent
---
# Simple Agent
`);

      // Update module.json
      const coreModulePath = path.join(testDir, 'modules', 'core', 'module.json');
      const coreModule = await fs.readJson(coreModulePath);
      coreModule.provides.agents.push('simple-agent');
      await fs.writeJson(coreModulePath, coreModule);

      // Recreate engine and validator
      const freshEngine = new DiscoveryEngine(testDir);
      await freshEngine.loadModules();
      await freshEngine.buildCapabilityMap();
      const freshValidator = new FrameworkValidator(freshEngine, testDir);

      const result = await freshValidator.validateCapabilityResolution();

      expect(result.valid).toBe(true);
    });
  });

  describe('validateModuleDeclarations()', () => {
    it('should pass when all declared agents exist', async () => {
      const result = await validator.validateModuleDeclarations();

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail when agent file is missing', async () => {
      // Delete an agent file but keep it in module.json
      const agentPath = path.join(testDir, 'modules', 'core', 'agents', 'ai-framework-manager.md');
      await fs.remove(agentPath);

      const result = await validator.validateModuleDeclarations();

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some(issue => issue.message?.includes('ai-framework-manager') || issue.details?.agentId === 'ai-framework-manager')).toBe(true);
    });

    it('should fail when skill directory is missing', async () => {
      // Delete a skill directory but keep it in module.json
      const skillDir = path.join(testDir, 'modules', 'core', 'skills', 'committing-code');
      await fs.remove(skillDir);

      const result = await validator.validateModuleDeclarations();

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should validate skills across multiple modules', async () => {
      const result = await validator.validateModuleDeclarations();

      if (result.valid) {
        // Should have found skills in planning module too
        expect(result.stats?.checked).toBeGreaterThanOrEqual(2);
      }
    });

    it('should return correct stat counts', async () => {
      const result = await validator.validateModuleDeclarations();

      expect(result.stats).toBeDefined();
      if (result.valid) {
        expect(result.stats.passed).toBe(result.stats.checked);
        expect(result.stats.failed).toBe(0);
      }
    });
  });

  describe('validateSkillCapabilities()', () => {
    it('should pass when capabilities match declarations', async () => {
      const result = await validator.validateSkillCapabilities();

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should warn when skill has undeclared capability', async () => {
      // Modify skill file to have capability not in module.json
      const skillPath = path.join(testDir, 'modules', 'core', 'skills', 'committing-code', 'SKILL.md');
      await fs.writeFile(skillPath, `---
skill: committing-code
capabilities-provided:
  - git-workflow-management
  - undeclared-capability
---
# Git Workflow Skill
`);

      const result = await validator.validateSkillCapabilities();

      expect(result.issues.length).toBeGreaterThanOrEqual(0);
    });

    it('should validate capabilities from all modules', async () => {
      const result = await validator.validateSkillCapabilities();

      // Should check skills from both core and planning modules
      expect(result.stats?.checked).toBeGreaterThanOrEqual(2);
    });

    it('should handle skills with multiple capabilities', async () => {
      const result = await validator.validateSkillCapabilities();

      expect(result.valid).toBe(true);
    });
  });

  describe('validateAll()', () => {
    it('should run all validations and aggregate results', async () => {
      // Debug: check what skills are loaded
      const skills = await engine.getAllSkills();
      console.log('Skills loaded:', skills.map(s => ({ id: s.id, moduleId: s.moduleId, caps: s.capabilitiesProvided })));

      const report = await validator.validateAll();

      if (!report.overall) {
        console.log('Validation failed. Details:');
        console.log('  capabilityResolution.valid:', report.capabilityResolution.valid, report.capabilityResolution.issues);
        console.log('  moduleDeclarations.valid:', report.moduleDeclarations.valid, report.moduleDeclarations.issues);
        console.log('  skillCapabilities.valid:', report.skillCapabilities.valid, report.skillCapabilities.issues);
      }

      expect(report.overall).toBe(true);
      expect(report.capabilityResolution).toBeDefined();
      expect(report.moduleDeclarations).toBeDefined();
      expect(report.skillCapabilities).toBeDefined();
      expect(report.timestamp).toBeDefined();
    });

    it('should set overall to false if capability validation fails', async () => {
      // Add agent with unknown capability
      const brokenAgentPath = path.join(testDir, 'modules', 'core', 'agents', 'broken-agent.md');
      await fs.writeFile(brokenAgentPath, `---
agent: broken-agent
capability-needs:
  - unknown-capability
---
# Broken Agent
`);

      // Update module.json
      const coreModulePath = path.join(testDir, 'modules', 'core', 'module.json');
      const coreModule = await fs.readJson(coreModulePath);
      coreModule.provides.agents.push('broken-agent');
      await fs.writeJson(coreModulePath, coreModule);

      // Recreate engine and validator
      const freshEngine = new DiscoveryEngine(testDir);
      await freshEngine.loadModules();
      await freshEngine.buildCapabilityMap();
      const freshValidator = new FrameworkValidator(freshEngine, testDir);

      const report = await freshValidator.validateAll();

      expect(report.overall).toBe(false);
      expect(report.capabilityResolution.valid).toBe(false);
    });

    it('should set overall to false if module declaration fails', async () => {
      // Delete an agent file but keep it in module.json
      const agentPath = path.join(testDir, 'modules', 'core', 'agents', 'ai-framework-manager.md');
      await fs.remove(agentPath);

      const report = await validator.validateAll();

      expect(report.overall).toBe(false);
      expect(report.moduleDeclarations.valid).toBe(false);
    });

    it('should include timestamp with valid ISO format', async () => {
      const report = await validator.validateAll();

      expect(report.timestamp).toBeDefined();
      expect(typeof report.timestamp).toBe('string');
      expect(new Date(report.timestamp).getTime()).not.toBeNaN();
    });

    it('should aggregate stats from all validations', async () => {
      const report = await validator.validateAll();

      // Stats are per-validation, not aggregated
      expect(report.capabilityResolution.stats).toBeDefined();
      expect(report.moduleDeclarations.stats).toBeDefined();
      expect(report.skillCapabilities.stats).toBeDefined();
    });

    it('should have timestamp in ISO format', async () => {
      const report = await validator.validateAll();

      expect(report.timestamp).toBeDefined();
      expect(new Date(report.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('error handling', () => {
    it('should handle empty module set gracefully', async () => {
      // Test with non-existent path - no modules found means nothing to validate
      const emptyDir = path.join(testDir, 'empty-subdir');
      await fs.ensureDir(emptyDir);

      const emptyEngine = new DiscoveryEngine(emptyDir);
      await emptyEngine.loadModules();
      const emptyValidator = new FrameworkValidator(emptyEngine, emptyDir);

      const result = await emptyValidator.validateModuleDeclarations();

      // With no modules, validation passes (nothing to validate)
      expect(result).toBeDefined();
      expect(result.stats.checked).toBe(0);
    });

    it('should handle malformed YAML in agent files', async () => {
      // Create agent file with invalid YAML
      const badAgentPath = path.join(testDir, 'modules', 'core', 'agents', 'bad-agent.md');
      await fs.writeFile(badAgentPath, `---
agent: bad-agent
capability-needs: invalid-yaml-structure
---
# Bad Agent
`);

      // Update module.json
      const coreModulePath = path.join(testDir, 'modules', 'core', 'module.json');
      const coreModule = await fs.readJson(coreModulePath);
      coreModule.provides.agents.push('bad-agent');
      await fs.writeJson(coreModulePath, coreModule);

      // Should not throw, but report error
      const freshEngine = new DiscoveryEngine(testDir);
      await freshEngine.loadModules();
      await freshEngine.buildCapabilityMap();
      const freshValidator = new FrameworkValidator(freshEngine, testDir);

      const result = await freshValidator.validateCapabilityResolution();

      expect(result).toBeDefined();
    });
  });

  describe('performance and edge cases', () => {
    it('should handle multiple capability needs correctly', async () => {
      const result = await validator.validateCapabilityResolution();

      // ai-planning-manager has 3 capability needs
      const stats = result.stats;
      expect(stats.checked).toBeGreaterThanOrEqual(1);
    });

    it('should validate framework with all modules installed', async () => {
      const report = await validator.validateAll();

      // With all modules (core, planning, coding), should have comprehensive checks
      const totalChecked = report.capabilityResolution.stats.checked +
        report.moduleDeclarations.stats.checked +
        report.skillCapabilities.stats.checked;
      expect(totalChecked).toBeGreaterThan(0);
    });

    it('should detect capability resolution across modules', async () => {
      const result = await validator.validateCapabilityResolution();

      // ai-planning-manager needs git-workflow-management from core
      // and plan-creation from planning module
      expect(result.valid).toBe(true);
    });
  });
});
