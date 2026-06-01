import path from 'path';
import fs from 'fs-extra';
import {
  DiscoveryEngine,
  CapabilityMap,
  DiscoveryResult,
  AgentDefinition,
} from '../discovery-engine';
import { createSandbox, TestSandbox } from './test-utils/sandbox';

describe('DiscoveryEngine', () => {
  let sandbox: TestSandbox;
  let testDir: string;
  let engine: DiscoveryEngine;

  // Create a test fixture with modules
  async function createTestFixture() {
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
        capabilities: ['git-workflow-management', 'quality-assurance', 'framework-governance'],
      },
    });

    // Create agents directory with agent file
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
# Git Workflow Skill
`);
    await fs.ensureDir(path.join(coreSkillsDir, 'verifying-quality'));
    await fs.writeFile(path.join(coreSkillsDir, 'verifying-quality', 'SKILL.md'), `---
skill: verifying-quality
capabilities-provided:
  - quality-assurance
---
# QA Standards Skill
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
    sandbox = await createSandbox('discovery-engine');
    testDir = sandbox.path;
    await createTestFixture();
    engine = new DiscoveryEngine(testDir);
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('constructor', () => {
    it('should create engine with framework root path', () => {
      const engine = new DiscoveryEngine('/some/path');
      expect(engine).toBeDefined();
    });
  });

  describe('loadModules()', () => {
    it('should load all available modules', async () => {
      const modules = await engine.loadModules();

      expect(modules.has('core')).toBe(true);
      expect(modules.has('planning')).toBe(true);
      expect(modules.has('coding')).toBe(true);
      expect(modules.size).toBe(3);
    });

    it('should load module manifest with correct properties', async () => {
      const modules = await engine.loadModules();
      const core = modules.get('core');

      expect(core).toBeDefined();
      expect(core?.id).toBe('core');
      expect(core?.version).toBe('1.0.0');
      expect(core?.provides.agents).toContain('ai-framework-manager');
      expect(core?.provides.skills).toContain('committing-code');
      expect(core?.provides.capabilities).toContain('git-workflow-management');
    });

    it('should handle missing modules directory gracefully', async () => {
      const emptyDir = path.join(testDir, 'empty-subdir');
      await fs.ensureDir(emptyDir);

      const emptyEngine = new DiscoveryEngine(emptyDir);
      const modules = await emptyEngine.loadModules();

      expect(modules.size).toBe(0);
    });
  });

  describe('buildCapabilityMap()', () => {
    it('should build capability to skills mapping', async () => {
      await engine.loadModules();
      const capabilityMap = await engine.buildCapabilityMap();

      expect(capabilityMap.get('git-workflow-management')).toContain('committing-code');
      expect(capabilityMap.get('quality-assurance')).toContain('verifying-quality');
      expect(capabilityMap.get('plan-creation')).toContain('planning-phases');
    });

    it('should aggregate capabilities from all modules', async () => {
      await engine.loadModules();
      const capabilityMap = await engine.buildCapabilityMap();

      // Should have capabilities from core, planning, and coding
      expect(capabilityMap.has('git-workflow-management')).toBe(true);
      expect(capabilityMap.has('plan-creation')).toBe(true);
      expect(capabilityMap.has('code-implementation')).toBe(true);
    });

    it('should handle multiple skills providing same capability', async () => {
      // Add another skill that provides git-workflow-management
      const extraSkillDir = path.join(testDir, 'modules', 'core', 'skills', 'extra-git-skill');
      await fs.ensureDir(extraSkillDir);
      await fs.writeFile(path.join(extraSkillDir, 'SKILL.md'), `---
skill: extra-git-skill
capabilities-provided:
  - git-workflow-management
---
# Extra Git Skill
`);

      // Update core module.json
      const coreModulePath = path.join(testDir, 'modules', 'core', 'module.json');
      const coreModule = await fs.readJson(coreModulePath);
      coreModule.provides.skills.push('extra-git-skill');
      await fs.writeJson(coreModulePath, coreModule);

      // Reload and rebuild
      const freshEngine = new DiscoveryEngine(testDir);
      await freshEngine.loadModules();
      const capabilityMap = await freshEngine.buildCapabilityMap();

      const gitSkills = capabilityMap.get('git-workflow-management');
      expect(gitSkills).toContain('committing-code');
      expect(gitSkills).toContain('extra-git-skill');
    });
  });

  describe('discoverSkillsForAgent()', () => {
    it('should discover skills matching agent capability-needs', async () => {
      await engine.loadModules();
      await engine.buildCapabilityMap();

      const result = await engine.discoverSkillsForAgent('ai-framework-manager');

      expect(result.agentId).toBe('ai-framework-manager');
      expect(result.skills).toContain('committing-code');
      expect(result.skills).toContain('verifying-quality');
    });

    it('should discover skills from multiple modules', async () => {
      await engine.loadModules();
      await engine.buildCapabilityMap();

      // ai-planning-manager needs git-workflow-management (from core) and plan-creation (from planning)
      const result = await engine.discoverSkillsForAgent('ai-planning-manager');

      expect(result.skills).toContain('committing-code');
      expect(result.skills).toContain('planning-phases');
    });

    it('should report unfulfilled capabilities', async () => {
      await engine.loadModules();
      await engine.buildCapabilityMap();

      // Create an agent with unknown capability-need
      const agentPath = path.join(testDir, 'modules', 'core', 'agents', 'ai-test-agent.md');
      await fs.writeFile(agentPath, `---
agent: ai-test-agent
capability-needs:
  - unknown-capability
  - git-workflow-management
---
# Test Agent
`);

      // Update core module.json
      const coreModulePath = path.join(testDir, 'modules', 'core', 'module.json');
      const coreModule = await fs.readJson(coreModulePath);
      coreModule.provides.agents.push('ai-test-agent');
      await fs.writeJson(coreModulePath, coreModule);

      const freshEngine = new DiscoveryEngine(testDir);
      await freshEngine.loadModules();
      await freshEngine.buildCapabilityMap();

      const result = await freshEngine.discoverSkillsForAgent('ai-test-agent');

      expect(result.unfulfilledCapabilities).toContain('unknown-capability');
      expect(result.skills).toContain('committing-code');
    });

    it('should throw error for unknown agent', async () => {
      await engine.loadModules();
      await engine.buildCapabilityMap();

      await expect(engine.discoverSkillsForAgent('nonexistent-agent'))
        .rejects.toThrow(/Agent.*not found/);
    });
  });

  describe('getAgentDefinition()', () => {
    it('should load agent definition from markdown frontmatter', async () => {
      await engine.loadModules();

      const agent = await engine.getAgentDefinition('ai-framework-manager');

      expect(agent).toBeDefined();
      expect(agent.id).toBe('ai-framework-manager');
      expect(agent.capabilityNeeds).toContain('git-workflow-management');
      expect(agent.capabilityNeeds).toContain('quality-assurance');
      expect(agent.contextCategoryNeeds).toEqual({
        business: 'basic',
        technical: 'advanced',
      });
      expect(agent.tokenBudget).toBe(3000);
    });

    it('should load agent from different modules', async () => {
      await engine.loadModules();

      const planningAgent = await engine.getAgentDefinition('ai-planning-manager');

      expect(planningAgent.id).toBe('ai-planning-manager');
      expect(planningAgent.capabilityNeeds).toContain('plan-creation');
      expect(planningAgent.moduleId).toBe('planning');
    });

    it('should throw error for unknown agent', async () => {
      await engine.loadModules();

      await expect(engine.getAgentDefinition('unknown-agent'))
        .rejects.toThrow(/Agent.*not found/);
    });
  });

  describe('getAllAgents()', () => {
    it('should return all agents from all modules', async () => {
      await engine.loadModules();

      const agents = await engine.getAllAgents();

      expect(agents).toHaveLength(3);
      expect(agents.map(a => a.id)).toContain('ai-framework-manager');
      expect(agents.map(a => a.id)).toContain('ai-planning-manager');
      expect(agents.map(a => a.id)).toContain('ai-app-developer');
    });

    it('should include module source for each agent', async () => {
      await engine.loadModules();

      const agents = await engine.getAllAgents();

      const frameworkAgent = agents.find(a => a.id === 'ai-framework-manager');
      const planningAgent = agents.find(a => a.id === 'ai-planning-manager');

      expect(frameworkAgent?.moduleId).toBe('core');
      expect(planningAgent?.moduleId).toBe('planning');
    });
  });

  describe('getAllSkills()', () => {
    it('should return all skills from all modules', async () => {
      await engine.loadModules();

      const skills = await engine.getAllSkills();

      expect(skills.map(s => s.id)).toContain('committing-code');
      expect(skills.map(s => s.id)).toContain('verifying-quality');
      expect(skills.map(s => s.id)).toContain('planning-phases');
    });

    it('should include capabilities provided by each skill', async () => {
      await engine.loadModules();

      const skills = await engine.getAllSkills();

      const gitSkill = skills.find(s => s.id === 'committing-code');
      expect(gitSkill?.capabilitiesProvided).toContain('git-workflow-management');
    });
  });

  describe('discoverForInstalledModules()', () => {
    it('should only discover from specified modules', async () => {
      await engine.loadModules();

      // Only use core module
      const capabilityMap = await engine.buildCapabilityMap(['core']);

      expect(capabilityMap.has('git-workflow-management')).toBe(true);
      expect(capabilityMap.has('plan-creation')).toBe(false);
    });

    it('should respect module dependencies', async () => {
      await engine.loadModules();

      // Planning requires core
      const result = await engine.discoverSkillsForAgent('ai-planning-manager', ['planning', 'core']);

      expect(result.skills).toContain('committing-code'); // from core
      expect(result.skills).toContain('planning-phases'); // from planning
    });
  });

  describe('validateModuleDependencies()', () => {
    it('should return valid for modules with satisfied dependencies', async () => {
      await engine.loadModules();

      const result = await engine.validateModuleDependencies(['core', 'planning']);

      expect(result.valid).toBe(true);
      expect(result.missingDependencies).toHaveLength(0);
    });

    it('should return invalid for modules with unsatisfied dependencies', async () => {
      await engine.loadModules();

      // Planning requires core, but we only have planning
      const result = await engine.validateModuleDependencies(['planning']);

      expect(result.valid).toBe(false);
      expect(result.missingDependencies).toContainEqual({
        module: 'planning',
        requires: 'core',
      });
    });
  });

  describe('getCapabilityProviders()', () => {
    it('should return all skills that provide a capability', async () => {
      await engine.loadModules();
      await engine.buildCapabilityMap();

      const providers = engine.getCapabilityProviders('git-workflow-management');

      expect(providers).toContain('committing-code');
    });

    it('should return empty array for unknown capability', async () => {
      await engine.loadModules();
      await engine.buildCapabilityMap();

      const providers = engine.getCapabilityProviders('unknown-capability');

      expect(providers).toEqual([]);
    });
  });

  describe('Multi-Source Skill Discovery', () => {
    describe('loadProjectSkills()', () => {
      it('should load skills from ai/skills/project/', async () => {
        // Create project skills directory
        const projectSkillsDir = path.join(testDir, 'ai', 'skills', 'project', 'custom-validation');
        await fs.ensureDir(projectSkillsDir);
        await fs.writeFile(path.join(projectSkillsDir, 'SKILL.md'), `---
skill: custom-validation
capabilities-provided:
  - validation-custom
  - quality-assurance
---
# Custom Validation Skill
`);

        await engine.loadModules();
        const projectSkills = await engine['loadProjectSkills']();

        expect(projectSkills).toHaveLength(1);
        expect(projectSkills[0].id).toBe('custom-validation');
        expect(projectSkills[0].moduleId).toBe('project');
        expect(projectSkills[0].capabilitiesProvided).toContain('validation-custom');
        expect(projectSkills[0].capabilitiesProvided).toContain('quality-assurance');
      });

      it('should return empty array when project skills directory does not exist', async () => {
        await engine.loadModules();
        const projectSkills = await engine['loadProjectSkills']();

        expect(projectSkills).toEqual([]);
      });

      it('should cache loaded project skills', async () => {
        // Create project skills directory
        const projectSkillsDir = path.join(testDir, 'ai', 'skills', 'project', 'custom-skill');
        await fs.ensureDir(projectSkillsDir);
        await fs.writeFile(path.join(projectSkillsDir, 'SKILL.md'), `---
skill: custom-skill
capabilities-provided:
  - custom-capability
---
# Custom Skill
`);

        await engine.loadModules();
        await engine['loadProjectSkills']();

        // Check cache
        const cached = engine['skillCache'].get('custom-skill');
        expect(cached).toBeDefined();
        expect(cached?.moduleId).toBe('project');
      });
    });

    describe('loadDeployedSkills()', () => {
      it('should load skills from .claude/skills/', async () => {
        // Create deployed skills directory
        const deployedSkillsDir = path.join(testDir, '.claude', 'skills', 'deployed-git-workflow');
        await fs.ensureDir(deployedSkillsDir);
        await fs.writeFile(path.join(deployedSkillsDir, 'SKILL.md'), `---
skill: deployed-git-workflow
capabilities-provided:
  - git-workflow-management
  - git-advanced
---
# Deployed Git Workflow Skill
`);

        await engine.loadModules();
        const deployedSkills = await engine['loadDeployedSkills']();

        expect(deployedSkills).toHaveLength(1);
        expect(deployedSkills[0].id).toBe('deployed-git-workflow');
        expect(deployedSkills[0].moduleId).toBe('deployed');
        expect(deployedSkills[0].capabilitiesProvided).toContain('git-workflow-management');
        expect(deployedSkills[0].capabilitiesProvided).toContain('git-advanced');
      });

      it('should return empty array when deployed skills directory does not exist', async () => {
        await engine.loadModules();
        const deployedSkills = await engine['loadDeployedSkills']();

        expect(deployedSkills).toEqual([]);
      });
    });

    describe('buildCapabilityMap() with multi-source skills', () => {
      it('should prioritize project skills over module skills', async () => {
        // Create project skill that provides same capability as module skill
        const projectSkillsDir = path.join(testDir, 'ai', 'skills', 'project', 'project-git-workflow');
        await fs.ensureDir(projectSkillsDir);
        await fs.writeFile(path.join(projectSkillsDir, 'SKILL.md'), `---
skill: project-git-workflow
capabilities-provided:
  - git-workflow-management
---
# Project Git Workflow Skill (overrides module skill)
`);

        await engine.loadModules();
        const capabilityMap = await engine.buildCapabilityMap();

        const providers = capabilityMap.get('git-workflow-management');
        expect(providers).toBeDefined();
        // Project skill should come first
        expect(providers![0]).toBe('project-git-workflow');
        // Module skill should come after
        expect(providers).toContain('committing-code');
      });

      it('should prioritize deployed skills over module skills but after project skills', async () => {
        // Create deployed skill
        const deployedSkillsDir = path.join(testDir, '.claude', 'skills', 'deployed-qa');
        await fs.ensureDir(deployedSkillsDir);
        await fs.writeFile(path.join(deployedSkillsDir, 'SKILL.md'), `---
skill: deployed-qa
capabilities-provided:
  - quality-assurance
---
# Deployed QA Skill
`);

        // Create project skill
        const projectSkillsDir = path.join(testDir, 'ai', 'skills', 'project', 'project-qa');
        await fs.ensureDir(projectSkillsDir);
        await fs.writeFile(path.join(projectSkillsDir, 'SKILL.md'), `---
skill: project-qa
capabilities-provided:
  - quality-assurance
---
# Project QA Skill
`);

        await engine.loadModules();
        const capabilityMap = await engine.buildCapabilityMap();

        const providers = capabilityMap.get('quality-assurance');
        expect(providers).toBeDefined();
        expect(providers!.length).toBeGreaterThanOrEqual(3);
        // Priority order: project > deployed > module
        expect(providers![0]).toBe('project-qa');
        expect(providers).toContain('deployed-qa');
        expect(providers).toContain('verifying-quality');
      });

      it('should include all sources without duplication', async () => {
        // Create project skill with unique capability
        const projectSkillsDir = path.join(testDir, 'ai', 'skills', 'project', 'project-only');
        await fs.ensureDir(projectSkillsDir);
        await fs.writeFile(path.join(projectSkillsDir, 'SKILL.md'), `---
skill: project-only
capabilities-provided:
  - project-only-capability
---
# Project Only Skill
`);

        await engine.loadModules();
        const capabilityMap = await engine.buildCapabilityMap();

        // Should have capabilities from all sources
        expect(capabilityMap.has('git-workflow-management')).toBe(true); // from modules
        expect(capabilityMap.has('project-only-capability')).toBe(true); // from project
      });
    });

    describe('getAllSkillsFromAllSources()', () => {
      it('should return skills categorized by source', async () => {
        // Create project skill
        const projectSkillsDir = path.join(testDir, 'ai', 'skills', 'project', 'test-project-skill');
        await fs.ensureDir(projectSkillsDir);
        await fs.writeFile(path.join(projectSkillsDir, 'SKILL.md'), `---
skill: test-project-skill
capabilities-provided:
  - test-capability
---
# Test Project Skill
`);

        // Create deployed skill
        const deployedSkillsDir = path.join(testDir, '.claude', 'skills', 'test-deployed-skill');
        await fs.ensureDir(deployedSkillsDir);
        await fs.writeFile(path.join(deployedSkillsDir, 'SKILL.md'), `---
skill: test-deployed-skill
capabilities-provided:
  - another-capability
---
# Test Deployed Skill
`);

        await engine.loadModules();
        const allSkills = await engine.getAllSkillsFromAllSources();

        // Verify structure
        expect(allSkills).toHaveProperty('project');
        expect(allSkills).toHaveProperty('deployed');
        expect(allSkills).toHaveProperty('modules');

        // Verify project skills
        expect(allSkills.project).toHaveLength(1);
        expect(allSkills.project[0].id).toBe('test-project-skill');
        expect(allSkills.project[0].moduleId).toBe('project');

        // Verify deployed skills
        expect(allSkills.deployed).toHaveLength(1);
        expect(allSkills.deployed[0].id).toBe('test-deployed-skill');
        expect(allSkills.deployed[0].moduleId).toBe('deployed');

        // Verify module skills (from fixture)
        expect(allSkills.modules.length).toBeGreaterThan(0);
        const moduleSkillIds = allSkills.modules.map(s => s.id);
        expect(moduleSkillIds).toContain('committing-code');
      });

      it('should handle empty sources gracefully', async () => {
        await engine.loadModules();
        const allSkills = await engine.getAllSkillsFromAllSources();

        // No project or deployed skills created, should return empty arrays
        expect(allSkills.project).toEqual([]);
        expect(allSkills.deployed).toEqual([]);
        // But should have module skills
        expect(allSkills.modules.length).toBeGreaterThan(0);
      });
    });

    describe('Integration: Multi-source skill discovery with agents', () => {
      it('should discover project skill for agent when available', async () => {
        // Create project skill that provides git-workflow-management
        const projectSkillsDir = path.join(testDir, 'ai', 'skills', 'project', 'project-git');
        await fs.ensureDir(projectSkillsDir);
        await fs.writeFile(path.join(projectSkillsDir, 'SKILL.md'), `---
skill: project-git
capabilities-provided:
  - git-workflow-management
---
# Project Git Skill
`);

        await engine.loadModules();
        await engine.buildCapabilityMap();

        // ai-framework-manager needs git-workflow-management
        const result = await engine.discoverSkillsForAgent('ai-framework-manager');

        // Should include the project skill
        expect(result.skills).toContain('project-git');
      });
    });
  });
});
