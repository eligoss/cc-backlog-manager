import path from 'path';
import fs from 'fs-extra';
import { FrameworkValidator } from '../framework-validator';
import { DiscoveryEngine, AgentDefinition } from '../discovery-engine';
import { createSandbox, TestSandbox } from './test-utils/sandbox';

describe('FrameworkValidator - Agent Variants', () => {
  let sandbox: TestSandbox;
  let testDir: string;
  let engine: DiscoveryEngine;
  let validator: FrameworkValidator;

  // Create a test fixture with agent variants
  async function createVariantFixture() {
    // Create core module (inside modules/ directory like all other modules)
    const coreDir = path.join(testDir, 'modules', 'core');
    await fs.ensureDir(coreDir);
    await fs.writeJson(path.join(coreDir, 'module.json'), {
      id: 'core',
      version: '1.0.0',
      name: 'Core Framework',
      description: 'Core framework module',
      provides: {
        agents: ['ai-test-agent', 'ai-test-agent-slim'],
        skills: ['shared-git-workflow'],
        capabilities: ['git-workflow-management'],
      },
    });

    // Create agents directory
    const coreAgentsDir = path.join(coreDir, 'agents');
    await fs.ensureDir(coreAgentsDir);

    // Create full variant agent
    await fs.writeFile(path.join(coreAgentsDir, 'ai-test-agent.md'), `---
agent: ai-test-agent
variant: full
delegates-to:
  - ai-test-agent-slim
capability-needs:
  - git-workflow-management
context-category-needs:
  business: advanced
token-budget: 3000
---
# Test Agent (Full Variant)
`);

    // Create slim variant agent
    await fs.writeFile(path.join(coreAgentsDir, 'ai-test-agent-slim.md'), `---
agent: ai-test-agent-slim
variant: slim
parent-agent: ai-test-agent
capability-needs:
  - git-workflow-management
context-category-needs:
  business: basic
token-budget: 1000
---
# Test Agent (Slim Variant)
`);

    // Create skills directory with skill files
    const coreSkillsDir = path.join(coreDir, 'skills');
    await fs.ensureDir(path.join(coreSkillsDir, 'shared-git-workflow'));
    await fs.writeFile(path.join(coreSkillsDir, 'shared-git-workflow', 'SKILL.md'), `---
skill: shared-git-workflow
capabilities-provided:
  - git-workflow-management
---
# Git Workflow Skill
`);

  }

  beforeEach(async () => {
    sandbox = await createSandbox('framework-validator-variants');
    testDir = sandbox.path;
    await createVariantFixture();
    engine = new DiscoveryEngine(testDir);
    await engine.loadModules();
    await engine.buildCapabilityMap();
    validator = new FrameworkValidator(engine, testDir);
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('validateAgentVariants', () => {
    it('should pass for valid full agent with existing slim delegate', async () => {
      const result = await validator.validateAgentVariants();

      expect(result.valid).toBe(true);
      expect(result.issues.filter(i => i.type === 'error')).toHaveLength(0);
    });

    it('should error when slim agent has no parent-agent', async () => {
      // Create orphan slim agent
      const orphanPath = path.join(testDir, 'modules', 'core', 'agents', 'ai-orphan-slim.md');
      await fs.writeFile(orphanPath, `---
agent: ai-orphan-slim
variant: slim
capability-needs:
  - git-workflow-management
context-category-needs:
  business: basic
token-budget: 1000
---
# Orphan Slim Agent
`);

      // Update module.json
      const coreModulePath = path.join(testDir, 'modules', 'core', 'module.json');
      const coreModule = await fs.readJson(coreModulePath);
      coreModule.provides.agents.push('ai-orphan-slim');
      await fs.writeJson(coreModulePath, coreModule);

      // Recreate engine and validator
      const freshEngine = new DiscoveryEngine(testDir);
      await freshEngine.loadModules();
      await freshEngine.buildCapabilityMap();
      const freshValidator = new FrameworkValidator(freshEngine, testDir);

      const result = await freshValidator.validateAgentVariants();

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('must declare parent-agent')
        })
      );
    });

    it('should warn when slim agent exceeds 1000 token budget', async () => {
      // Create slim agent with large token budget
      const largePath = path.join(testDir, 'modules', 'core', 'agents', 'ai-large-slim.md');
      await fs.writeFile(largePath, `---
agent: ai-large-slim
variant: slim
parent-agent: ai-test-agent
capability-needs:
  - git-workflow-management
context-category-needs:
  business: basic
token-budget: 1500
---
# Large Slim Agent
`);

      // Update module.json
      const coreModulePath = path.join(testDir, 'modules', 'core', 'module.json');
      const coreModule = await fs.readJson(coreModulePath);
      coreModule.provides.agents.push('ai-large-slim');
      await fs.writeJson(coreModulePath, coreModule);

      // Recreate engine and validator
      const freshEngine = new DiscoveryEngine(testDir);
      await freshEngine.loadModules();
      await freshEngine.buildCapabilityMap();
      const freshValidator = new FrameworkValidator(freshEngine, testDir);

      const result = await freshValidator.validateAgentVariants();

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('exceeds recommended 1000 token budget')
        })
      );
    });

    it('should error when full agent delegates to non-existent agent', async () => {
      // Create agent that delegates to non-existent slim variant
      const badDelegatorPath = path.join(testDir, 'modules', 'core', 'agents', 'ai-bad-delegator.md');
      await fs.writeFile(badDelegatorPath, `---
agent: ai-bad-delegator
variant: full
delegates-to:
  - ai-ghost-slim
capability-needs:
  - git-workflow-management
context-category-needs:
  business: advanced
token-budget: 3000
---
# Bad Delegator Agent
`);

      // Update module.json
      const coreModulePath = path.join(testDir, 'modules', 'core', 'module.json');
      const coreModule = await fs.readJson(coreModulePath);
      coreModule.provides.agents.push('ai-bad-delegator');
      await fs.writeJson(coreModulePath, coreModule);

      // Recreate engine and validator
      const freshEngine = new DiscoveryEngine(testDir);
      await freshEngine.loadModules();
      await freshEngine.buildCapabilityMap();
      const freshValidator = new FrameworkValidator(freshEngine, testDir);

      const result = await freshValidator.validateAgentVariants();

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('delegates to non-existent agent')
        })
      );
    });

    it('should warn when full agent delegates to non-slim variant', async () => {
      // Create another full agent
      const fullAgent2Path = path.join(testDir, 'modules', 'core', 'agents', 'ai-full-agent-2.md');
      await fs.writeFile(fullAgent2Path, `---
agent: ai-full-agent-2
variant: full
capability-needs:
  - git-workflow-management
context-category-needs:
  business: advanced
token-budget: 3000
---
# Full Agent 2
`);

      // Make ai-test-agent delegate to ai-full-agent-2 (both full variants)
      const testAgentPath = path.join(testDir, 'modules', 'core', 'agents', 'ai-test-agent.md');
      await fs.writeFile(testAgentPath, `---
agent: ai-test-agent
variant: full
delegates-to:
  - ai-full-agent-2
capability-needs:
  - git-workflow-management
context-category-needs:
  business: advanced
token-budget: 3000
---
# Test Agent (Full Variant)
`);

      // Update module.json
      const coreModulePath = path.join(testDir, 'modules', 'core', 'module.json');
      const coreModule = await fs.readJson(coreModulePath);
      coreModule.provides.agents.push('ai-full-agent-2');
      await fs.writeJson(coreModulePath, coreModule);

      // Recreate engine and validator
      const freshEngine = new DiscoveryEngine(testDir);
      await freshEngine.loadModules();
      await freshEngine.buildCapabilityMap();
      const freshValidator = new FrameworkValidator(freshEngine, testDir);

      const result = await freshValidator.validateAgentVariants();

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('is not marked as slim variant')
        })
      );
    });

    it('should return correct stats', async () => {
      const result = await validator.validateAgentVariants();

      expect(result.stats).toBeDefined();
      expect(result.stats.checked).toBe(2); // ai-test-agent and ai-test-agent-slim
      if (result.valid) {
        expect(result.stats.passed).toBe(result.stats.checked);
        expect(result.stats.failed).toBe(0);
      }
    });

    it('should handle agents with default variant (full)', async () => {
      // Create agent without variant field (defaults to full)
      const defaultPath = path.join(testDir, 'modules', 'core', 'agents', 'ai-default-variant.md');
      await fs.writeFile(defaultPath, `---
agent: ai-default-variant
capability-needs:
  - git-workflow-management
context-category-needs:
  business: advanced
token-budget: 3000
---
# Default Variant Agent
`);

      // Update module.json
      const coreModulePath = path.join(testDir, 'modules', 'core', 'module.json');
      const coreModule = await fs.readJson(coreModulePath);
      coreModule.provides.agents.push('ai-default-variant');
      await fs.writeJson(coreModulePath, coreModule);

      // Recreate engine and validator
      const freshEngine = new DiscoveryEngine(testDir);
      await freshEngine.loadModules();
      await freshEngine.buildCapabilityMap();
      const freshValidator = new FrameworkValidator(freshEngine, testDir);

      const result = await freshValidator.validateAgentVariants();

      // Should pass as default variant is 'full' and has no slim-specific constraints
      expect(result.valid).toBe(true);
    });

    it('should validate multiple slim agents with same parent', async () => {
      // Create second slim variant
      const slim2Path = path.join(testDir, 'modules', 'core', 'agents', 'ai-test-agent-slim-2.md');
      await fs.writeFile(slim2Path, `---
agent: ai-test-agent-slim-2
variant: slim
parent-agent: ai-test-agent
capability-needs:
  - git-workflow-management
context-category-needs:
  business: basic
token-budget: 800
---
# Test Agent (Slim Variant 2)
`);

      // Update module.json
      const coreModulePath = path.join(testDir, 'modules', 'core', 'module.json');
      const coreModule = await fs.readJson(coreModulePath);
      coreModule.provides.agents.push('ai-test-agent-slim-2');
      await fs.writeJson(coreModulePath, coreModule);

      // Recreate engine and validator
      const freshEngine = new DiscoveryEngine(testDir);
      await freshEngine.loadModules();
      await freshEngine.buildCapabilityMap();
      const freshValidator = new FrameworkValidator(freshEngine, testDir);

      const result = await freshValidator.validateAgentVariants();

      expect(result.valid).toBe(true);
      expect(result.stats.checked).toBe(3); // ai-test-agent, ai-test-agent-slim, ai-test-agent-slim-2
    });
  });
});
