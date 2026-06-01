import path from 'path';
import fs from 'fs-extra';
import { DiscoveryEngine, ContextLevel, AgentDefinition } from '../discovery-engine';
import { createSandbox, TestSandbox } from './test-utils';

describe('DiscoveryEngine - Cumulative Context Loading', () => {
  let sandbox: TestSandbox;
  let testDir: string;
  let engine: DiscoveryEngine;

  // Create a test fixture with context files
  async function createContextFixture() {
    testDir = sandbox.path;

    // Create core module (inside modules/ directory like all other modules)
    const coreDir = path.join(testDir, 'modules', 'core');
    await fs.ensureDir(coreDir);
    await fs.writeJson(path.join(coreDir, 'module.json'), {
      id: 'core',
      version: '1.0.0',
      name: 'Core Framework',
      description: 'Core framework module',
      provides: {
        agents: ['ai-test-agent'],
        skills: [],
        capabilities: [],
      },
    });

    // Create agents directory
    const coreAgentsDir = path.join(coreDir, 'agents');
    await fs.ensureDir(coreAgentsDir);

    // Create test agent with various context levels
    await fs.writeFile(path.join(coreAgentsDir, 'ai-test-agent.md'), `---
agent: ai-test-agent
capability-needs: []
context-category-needs:
  business: advanced
  technical: basic
  process: expert
token-budget: 2500
---
# Test Agent
`);

  }

  beforeEach(async () => {
    sandbox = await createSandbox('discovery-engine-context-test');
    await createContextFixture();
    engine = new DiscoveryEngine(sandbox.path);
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('getCumulativeContextFiles', () => {
    it('should return only basic file for basic level', () => {
      const files = engine.getCumulativeContextFiles('business', 'basic');

      expect(files).toEqual(['business-basic.md']);
    });

    it('should return basic and advanced files for advanced level', () => {
      const files = engine.getCumulativeContextFiles('technical', 'advanced');

      expect(files).toEqual([
        'technical-basic.md',
        'technical-advanced.md'
      ]);
    });

    it('should return all three files for expert level', () => {
      const files = engine.getCumulativeContextFiles('process', 'expert');

      expect(files).toEqual([
        'process-basic.md',
        'process-advanced.md',
        'process-expert.md'
      ]);
    });

    it('should fallback gracefully for unknown level', () => {
      const files = engine.getCumulativeContextFiles('business', 'unknown' as ContextLevel);

      expect(files).toEqual(['business-unknown.md']);
    });

    it('should work with different category names', () => {
      const businessFiles = engine.getCumulativeContextFiles('business', 'expert');
      const technicalFiles = engine.getCumulativeContextFiles('technical', 'expert');
      const processFiles = engine.getCumulativeContextFiles('process', 'expert');

      expect(businessFiles).toEqual([
        'business-basic.md',
        'business-advanced.md',
        'business-expert.md'
      ]);
      expect(technicalFiles).toEqual([
        'technical-basic.md',
        'technical-advanced.md',
        'technical-expert.md'
      ]);
      expect(processFiles).toEqual([
        'process-basic.md',
        'process-advanced.md',
        'process-expert.md'
      ]);
    });

    it('should return correct order (basic, advanced, expert)', () => {
      const files = engine.getCumulativeContextFiles('business', 'expert');

      expect(files[0]).toBe('business-basic.md');
      expect(files[1]).toBe('business-advanced.md');
      expect(files[2]).toBe('business-expert.md');
    });
  });

  describe('getContextFilesForAgent', () => {
    it('should compute cumulative files for all categories', async () => {
      await engine.loadModules();

      const agent = await engine.getAgentDefinition('ai-test-agent');
      const files = engine.getContextFilesForAgent(agent);

      expect(files).toContain('business-basic.md');
      expect(files).toContain('business-advanced.md');
      expect(files).toContain('technical-basic.md');
      expect(files).toContain('process-basic.md');
      expect(files).toContain('process-advanced.md');
      expect(files).toContain('process-expert.md');
      expect(files).toHaveLength(6);
    });

    it('should deduplicate files', async () => {
      await engine.loadModules();

      // Create agent with duplicate requirements
      const agentPath = path.join(sandbox.path, 'modules', 'core', 'agents', 'ai-duplicate-agent.md');
      await fs.writeFile(agentPath, `---
agent: ai-duplicate-agent
capability-needs: []
context-category-needs:
  business: basic
  technical: basic
token-budget: 1500
---
# Duplicate Agent
`);

      // Update module.json
      const coreModulePath = path.join(testDir, 'modules', 'core', 'module.json');
      const coreModule = await fs.readJson(coreModulePath);
      coreModule.provides.agents.push('ai-duplicate-agent');
      await fs.writeJson(coreModulePath, coreModule);

      // Recreate engine
      const freshEngine = new DiscoveryEngine(testDir);
      await freshEngine.loadModules();

      const agent = await freshEngine.getAgentDefinition('ai-duplicate-agent');
      const files = freshEngine.getContextFilesForAgent(agent);

      // Each file should appear only once
      const uniqueFiles = [...new Set(files)];
      expect(files.length).toBe(uniqueFiles.length);
    });

    it('should handle agent with single basic context', async () => {
      await engine.loadModules();

      // Create agent with single basic context
      const agentPath = path.join(testDir, 'modules', 'core', 'agents', 'ai-basic-agent.md');
      await fs.writeFile(agentPath, `---
agent: ai-basic-agent
capability-needs: []
context-category-needs:
  business: basic
token-budget: 1000
---
# Basic Agent
`);

      // Update module.json
      const coreModulePath = path.join(testDir, 'modules', 'core', 'module.json');
      const coreModule = await fs.readJson(coreModulePath);
      coreModule.provides.agents.push('ai-basic-agent');
      await fs.writeJson(coreModulePath, coreModule);

      // Recreate engine
      const freshEngine = new DiscoveryEngine(testDir);
      await freshEngine.loadModules();

      const agent = await freshEngine.getAgentDefinition('ai-basic-agent');
      const files = freshEngine.getContextFilesForAgent(agent);

      expect(files).toEqual(['business-basic.md']);
    });

    it('should handle agent with no context needs', async () => {
      await engine.loadModules();

      // Create agent with no context
      const agentPath = path.join(testDir, 'modules', 'core', 'agents', 'ai-no-context-agent.md');
      await fs.writeFile(agentPath, `---
agent: ai-no-context-agent
capability-needs: []
token-budget: 1000
---
# No Context Agent
`);

      // Update module.json
      const coreModulePath = path.join(testDir, 'modules', 'core', 'module.json');
      const coreModule = await fs.readJson(coreModulePath);
      coreModule.provides.agents.push('ai-no-context-agent');
      await fs.writeJson(coreModulePath, coreModule);

      // Recreate engine
      const freshEngine = new DiscoveryEngine(testDir);
      await freshEngine.loadModules();

      const agent = await freshEngine.getAgentDefinition('ai-no-context-agent');
      const files = freshEngine.getContextFilesForAgent(agent);

      expect(files).toEqual([]);
    });

    it('should handle expert level across all categories', async () => {
      await engine.loadModules();

      // Create agent with expert level for all categories
      const agentPath = path.join(testDir, 'modules', 'core', 'agents', 'ai-expert-agent.md');
      await fs.writeFile(agentPath, `---
agent: ai-expert-agent
capability-needs: []
context-category-needs:
  business: expert
  technical: expert
  process: expert
token-budget: 5000
---
# Expert Agent
`);

      // Update module.json
      const coreModulePath = path.join(testDir, 'modules', 'core', 'module.json');
      const coreModule = await fs.readJson(coreModulePath);
      coreModule.provides.agents.push('ai-expert-agent');
      await fs.writeJson(coreModulePath, coreModule);

      // Recreate engine
      const freshEngine = new DiscoveryEngine(testDir);
      await freshEngine.loadModules();

      const agent = await freshEngine.getAgentDefinition('ai-expert-agent');
      const files = freshEngine.getContextFilesForAgent(agent);

      expect(files).toHaveLength(9); // 3 categories * 3 levels each
      expect(files).toContain('business-basic.md');
      expect(files).toContain('business-advanced.md');
      expect(files).toContain('business-expert.md');
      expect(files).toContain('technical-basic.md');
      expect(files).toContain('technical-advanced.md');
      expect(files).toContain('technical-expert.md');
      expect(files).toContain('process-basic.md');
      expect(files).toContain('process-advanced.md');
      expect(files).toContain('process-expert.md');
    });

    it('should preserve file order for each category', async () => {
      await engine.loadModules();

      const agent = await engine.getAgentDefinition('ai-test-agent');
      const files = engine.getContextFilesForAgent(agent);

      // Business: advanced (should include basic, advanced)
      const businessIndex = files.indexOf('business-basic.md');
      const businessAdvancedIndex = files.indexOf('business-advanced.md');
      expect(businessIndex).toBeLessThan(businessAdvancedIndex);

      // Process: expert (should include basic, advanced, expert)
      const processBasicIndex = files.indexOf('process-basic.md');
      const processAdvancedIndex = files.indexOf('process-advanced.md');
      const processExpertIndex = files.indexOf('process-expert.md');
      expect(processBasicIndex).toBeLessThan(processAdvancedIndex);
      expect(processAdvancedIndex).toBeLessThan(processExpertIndex);
    });

    it('should work with mixed levels across categories', async () => {
      await engine.loadModules();

      // Create agent with mixed context levels
      const agentPath = path.join(testDir, 'modules', 'core', 'agents', 'ai-mixed-agent.md');
      await fs.writeFile(agentPath, `---
agent: ai-mixed-agent
capability-needs: []
context-category-needs:
  business: basic
  technical: advanced
  process: expert
token-budget: 3000
---
# Mixed Agent
`);

      // Update module.json
      const coreModulePath = path.join(testDir, 'modules', 'core', 'module.json');
      const coreModule = await fs.readJson(coreModulePath);
      coreModule.provides.agents.push('ai-mixed-agent');
      await fs.writeJson(coreModulePath, coreModule);

      // Recreate engine
      const freshEngine = new DiscoveryEngine(testDir);
      await freshEngine.loadModules();

      const agent = await freshEngine.getAgentDefinition('ai-mixed-agent');
      const files = freshEngine.getContextFilesForAgent(agent);

      expect(files).toHaveLength(6);
      expect(files).toContain('business-basic.md');
      expect(files).toContain('technical-basic.md');
      expect(files).toContain('technical-advanced.md');
      expect(files).toContain('process-basic.md');
      expect(files).toContain('process-advanced.md');
      expect(files).toContain('process-expert.md');
    });
  });

  describe('cumulative loading hierarchy', () => {
    it('should ensure basic is always loaded when advanced is needed', () => {
      const advancedFiles = engine.getCumulativeContextFiles('business', 'advanced');

      expect(advancedFiles).toContain('business-basic.md');
      expect(advancedFiles.indexOf('business-basic.md')).toBe(0);
    });

    it('should ensure basic and advanced are loaded when expert is needed', () => {
      const expertFiles = engine.getCumulativeContextFiles('process', 'expert');

      expect(expertFiles).toContain('process-basic.md');
      expect(expertFiles).toContain('process-advanced.md');
      expect(expertFiles.indexOf('process-basic.md')).toBe(0);
      expect(expertFiles.indexOf('process-advanced.md')).toBe(1);
    });

    it('should not load advanced when basic is needed', () => {
      const basicFiles = engine.getCumulativeContextFiles('technical', 'basic');

      expect(basicFiles).not.toContain('technical-advanced.md');
      expect(basicFiles).not.toContain('technical-expert.md');
      expect(basicFiles).toEqual(['technical-basic.md']);
    });

    it('should not load expert when advanced is needed', () => {
      const advancedFiles = engine.getCumulativeContextFiles('business', 'advanced');

      expect(advancedFiles).not.toContain('business-expert.md');
      expect(advancedFiles).toEqual(['business-basic.md', 'business-advanced.md']);
    });
  });
});
