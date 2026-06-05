import fs from 'fs-extra';
import path from 'path';
import { generateRegistries } from '../registry-generator';
import type { ModuleManifest } from '../module-loader';
import { createSandbox, TestSandbox } from './test-utils/sandbox';

describe('RegistryGenerator', () => {
  let sandbox: TestSandbox;
  let testDir: string;
  let projectPath: string;
  let frameworkDir: string;
  let modulesDir: string;

  beforeEach(async () => {
    sandbox = await createSandbox('registry-generator');
    testDir = sandbox.path;
    projectPath = testDir;
    frameworkDir = path.join(testDir, 'framework');
    modulesDir = path.join(frameworkDir, 'modules');

    // Create project structure
    await fs.ensureDir(path.join(projectPath, '.claude/registries'));
    await fs.ensureDir(path.join(projectPath, '.claude/context'));

    // Create existing context files (the 9 standard ones)
    await fs.writeFile(path.join(projectPath, '.claude/context/business-basic.md'), '# Business Basic');
    await fs.writeFile(path.join(projectPath, '.claude/context/business-advanced.md'), '# Business Advanced');
    await fs.writeFile(path.join(projectPath, '.claude/context/business-expert.md'), '# Business Expert');
    await fs.writeFile(path.join(projectPath, '.claude/context/technical-basic.md'), '# Technical Basic');
    await fs.writeFile(path.join(projectPath, '.claude/context/technical-advanced.md'), '# Technical Advanced');
    await fs.writeFile(path.join(projectPath, '.claude/context/technical-expert.md'), '# Technical Expert');
    await fs.writeFile(path.join(projectPath, '.claude/context/process-basic.md'), '# Process Basic');
    await fs.writeFile(path.join(projectPath, '.claude/context/process-advanced.md'), '# Process Advanced');
    await fs.writeFile(path.join(projectPath, '.claude/context/process-expert.md'), '# Process Expert');
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  /**
   * Create a complete test fixture with modules, skills, and agents
   */
  async function createTestFixture(): Promise<ModuleManifest[]> {
    // Module: core (with skills and agents)
    const coreDir = path.join(modulesDir, 'core');
    await fs.ensureDir(path.join(coreDir, 'agents'));
    await fs.ensureDir(path.join(coreDir, 'skills/shared/git-workflow'));
    await fs.ensureDir(path.join(coreDir, 'skills/core/governance'));

    // Create module.json for core (required by DiscoveryEngine)
    await fs.writeJson(path.join(coreDir, 'module.json'), {
      id: 'core',
      version: '1.0.0',
      provides: {
        agents: ['ai-framework-manager', 'ai-framework-manager-slim'],
        skills: ['git-workflow', 'governance'],
      },
      context: {},
    });

    // Create agent files with frontmatter
    await fs.writeFile(
      path.join(coreDir, 'agents/ai-framework-manager.md'),
      `---
capability-needs:
  - framework-governance
  - git-workflow-management
token-budget: 2500
variant: full
delegates-to:
  - ai-framework-manager-slim
---
# Framework Manager Agent
`
    );

    await fs.writeFile(
      path.join(coreDir, 'agents/ai-framework-manager-slim.md'),
      `---
capability-needs:
  - framework-governance
token-budget: 1000
variant: slim
parent-agent: ai-framework-manager
---
# Framework Manager Agent (Slim)
`
    );

    // Create skill files with frontmatter
    await fs.writeFile(
      path.join(coreDir, 'skills/shared/git-workflow/SKILL.md'),
      `---
capabilities-provided:
  - git-workflow-management
  - version-control
---
# Git Workflow Skill
`
    );

    await fs.writeFile(
      path.join(coreDir, 'skills/core/governance/SKILL.md'),
      `---
capabilities-provided:
  - framework-governance
---
# Framework Governance Skill
`
    );

    // Module: backlog (with context that DOES NOT exist)
    const backlogDir = path.join(modulesDir, 'backlog');
    await fs.ensureDir(path.join(backlogDir, 'agents'));
    await fs.ensureDir(path.join(backlogDir, 'skills/backlog/ticket-standards'));

    // Create module.json for backlog (required by DiscoveryEngine)
    await fs.writeJson(path.join(backlogDir, 'module.json'), {
      id: 'backlog',
      version: '1.0.0',
      provides: {
        agents: ['ai-backlog-manager'],
        skills: ['ticket-standards'],
      },
      context: {
        process: ['backlog-workflow.md'], // This file DOES NOT exist
      },
    });

    await fs.writeFile(
      path.join(backlogDir, 'agents/ai-backlog-manager.md'),
      `---
capability-needs:
  - ticket-management
token-budget: 2000
---
# Backlog Manager Agent
`
    );

    await fs.writeFile(
      path.join(backlogDir, 'skills/backlog/ticket-standards/SKILL.md'),
      `---
capabilities-provided:
  - ticket-management
  - ticket-writing
---
# Ticket Standards Skill
`
    );

    return [
      {
        id: 'core',
        version: '1.0.0',
        provides: {
          agents: ['ai-framework-manager', 'ai-framework-manager-slim'],
          skills: ['git-workflow', 'governance'],
        },
        context: {},
        _sourcePath: coreDir,
      } as ModuleManifest,
      {
        id: 'backlog',
        version: '1.0.0',
        provides: {
          agents: ['ai-backlog-manager'],
          skills: ['ticket-standards'],
        },
        context: {
          process: ['backlog-workflow.md'], // This file DOES NOT exist
        },
        _sourcePath: backlogDir,
      } as ModuleManifest,
    ];
  }

  describe('generateRegistries', () => {
    it('should create all registry files', async () => {
      const modules = await createTestFixture();

      await generateRegistries(projectPath, modules);

      // All registry files should be created
      expect(await fs.pathExists(path.join(projectPath, '.claude/registries/agents.json'))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, '.claude/registries/skills.json'))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, '.claude/registries/discovery-map.json'))).toBe(true);
    });

    it('should create registries directory if it does not exist', async () => {
      const modules = await createTestFixture();

      // Remove registries dir
      await fs.remove(path.join(projectPath, '.claude/registries'));

      await generateRegistries(projectPath, modules);

      expect(await fs.pathExists(path.join(projectPath, '.claude/registries'))).toBe(true);
    });
  });

  describe('agents.json generation', () => {
    it('should generate agents with correct structure', async () => {
      const modules = await createTestFixture();

      await generateRegistries(projectPath, modules);

      const agentsJson = await fs.readJson(path.join(projectPath, '.claude/registries/agents.json'));

      expect(agentsJson.version).toBe('1.0.0');
      expect(agentsJson.agents).toBeInstanceOf(Array);
      expect(agentsJson.agents.length).toBe(3); // 2 from core, 1 from backlog
    });

    it('should include capability-needs from agent frontmatter', async () => {
      const modules = await createTestFixture();

      await generateRegistries(projectPath, modules);

      const agentsJson = await fs.readJson(path.join(projectPath, '.claude/registries/agents.json'));
      const frameworkManager = agentsJson.agents.find((a: { id: string }) => a.id === 'ai-framework-manager');

      expect(frameworkManager).toBeDefined();
      expect(frameworkManager['capability-needs']).toContain('framework-governance');
      expect(frameworkManager['capability-needs']).toContain('git-workflow-management');
    });

    it('should include token-budget from agent frontmatter', async () => {
      const modules = await createTestFixture();

      await generateRegistries(projectPath, modules);

      const agentsJson = await fs.readJson(path.join(projectPath, '.claude/registries/agents.json'));
      const frameworkManager = agentsJson.agents.find((a: { id: string }) => a.id === 'ai-framework-manager');

      expect(frameworkManager['token-budget']).toBe(2500);
    });

    it('should include variant and delegation fields', async () => {
      const modules = await createTestFixture();

      await generateRegistries(projectPath, modules);

      const agentsJson = await fs.readJson(path.join(projectPath, '.claude/registries/agents.json'));

      const fullAgent = agentsJson.agents.find((a: { id: string }) => a.id === 'ai-framework-manager');
      expect(fullAgent.variant).toBe('full');
      expect(fullAgent['delegates-to']).toContain('ai-framework-manager-slim');

      const slimAgent = agentsJson.agents.find((a: { id: string }) => a.id === 'ai-framework-manager-slim');
      expect(slimAgent.variant).toBe('slim');
      expect(slimAgent['parent-agent']).toBe('ai-framework-manager');
    });
  });

  describe('skills.json generation', () => {
    it('should generate skills with correct structure', async () => {
      const modules = await createTestFixture();

      await generateRegistries(projectPath, modules);

      const skillsJson = await fs.readJson(path.join(projectPath, '.claude/registries/skills.json'));

      expect(skillsJson.version).toBe('1.0.0');
      expect(skillsJson.skills).toBeInstanceOf(Array);
      expect(skillsJson.skills.length).toBe(3); // 2 from core, 1 from backlog
    });

    it('should include capabilities-provided from skill frontmatter', async () => {
      const modules = await createTestFixture();

      await generateRegistries(projectPath, modules);

      const skillsJson = await fs.readJson(path.join(projectPath, '.claude/registries/skills.json'));
      const gitWorkflow = skillsJson.skills.find((s: { id: string }) => s.id === 'git-workflow');

      expect(gitWorkflow).toBeDefined();
      expect(gitWorkflow['capabilities-provided']).toContain('git-workflow-management');
      expect(gitWorkflow['capabilities-provided']).toContain('version-control');
    });

    it('should include module id for each skill', async () => {
      const modules = await createTestFixture();

      await generateRegistries(projectPath, modules);

      const skillsJson = await fs.readJson(path.join(projectPath, '.claude/registries/skills.json'));

      const gitWorkflow = skillsJson.skills.find((s: { id: string }) => s.id === 'git-workflow');
      expect(gitWorkflow.module).toBe('core');

      const ticketStandards = skillsJson.skills.find((s: { id: string }) => s.id === 'ticket-standards');
      expect(ticketStandards.module).toBe('backlog');
    });
  });

  describe('discovery-map.json generation', () => {
    it('should generate capability mappings', async () => {
      const modules = await createTestFixture();

      await generateRegistries(projectPath, modules);

      const discoveryMapJson = await fs.readJson(path.join(projectPath, '.claude/registries/discovery-map.json'));

      expect(discoveryMapJson.version).toBe('1.0.0');
      expect(discoveryMapJson.capabilities).toBeInstanceOf(Array);
      expect(discoveryMapJson.capabilities.length).toBeGreaterThan(0);
    });

    it('should map capabilities to skills that provide them', async () => {
      const modules = await createTestFixture();

      await generateRegistries(projectPath, modules);

      const discoveryMapJson = await fs.readJson(path.join(projectPath, '.claude/registries/discovery-map.json'));

      const gitCapability = discoveryMapJson.capabilities.find(
        (c: { capability: string }) => c.capability === 'git-workflow-management'
      );

      expect(gitCapability).toBeDefined();
      expect(gitCapability['skills-providing']).toContain('git-workflow');
    });

    it('should map capabilities to agents that need them', async () => {
      const modules = await createTestFixture();

      await generateRegistries(projectPath, modules);

      const discoveryMapJson = await fs.readJson(path.join(projectPath, '.claude/registries/discovery-map.json'));

      const governanceCapability = discoveryMapJson.capabilities.find(
        (c: { capability: string }) => c.capability === 'framework-governance'
      );

      expect(governanceCapability).toBeDefined();
      expect(governanceCapability['used-by-agents']).toContain('ai-framework-manager');
      expect(governanceCapability['used-by-agents']).toContain('ai-framework-manager-slim');
    });
  });

  describe('frameworkRoot calculation', () => {
    it('should correctly derive frameworkRoot from module._sourcePath', async () => {
      const modules = await createTestFixture();

      // The bug was: frameworkRoot = path.resolve(_sourcePath, '..')
      // Which gives: .../framework/modules (wrong)
      // Should give: .../framework (correct, two levels up)

      await generateRegistries(projectPath, modules);

      // If frameworkRoot is correct, DiscoveryEngine will find modules
      // and agents.json will have agents
      const agentsJson = await fs.readJson(path.join(projectPath, '.claude/registries/agents.json'));

      expect(agentsJson.agents.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty modules array', async () => {
      await generateRegistries(projectPath, []);

      // Should still create registry files with empty arrays
      const agentsJson = await fs.readJson(path.join(projectPath, '.claude/registries/agents.json'));
      const skillsJson = await fs.readJson(path.join(projectPath, '.claude/registries/skills.json'));
      const discoveryMapJson = await fs.readJson(path.join(projectPath, '.claude/registries/discovery-map.json'));

      expect(agentsJson.agents).toEqual([]);
      expect(skillsJson.skills).toEqual([]);
      expect(discoveryMapJson.capabilities).toEqual([]);
    });

    it('should handle modules without _sourcePath', async () => {
      const modules: ModuleManifest[] = [
        {
          id: 'no-source',
          version: '1.0.0',
          provides: {
            agents: ['some-agent'],
            skills: ['some-skill'],
          },
          // No _sourcePath
        } as ModuleManifest,
      ];

      // Should not throw, just skip the module
      await expect(generateRegistries(projectPath, modules)).resolves.not.toThrow();
    });

    it('should handle agents without frontmatter', async () => {
      const coreDir = path.join(modulesDir, 'core');
      await fs.ensureDir(path.join(coreDir, 'agents'));

      // Create module.json (required by DiscoveryEngine)
      await fs.writeJson(path.join(coreDir, 'module.json'), {
        id: 'core',
        version: '1.0.0',
        provides: {
          agents: ['ai-simple'],
          skills: [],
        },
      });

      await fs.writeFile(
        path.join(coreDir, 'agents/ai-simple.md'),
        '# Simple Agent\n\nNo frontmatter here'
      );

      const modules: ModuleManifest[] = [
        {
          id: 'core',
          version: '1.0.0',
          provides: {
            agents: ['ai-simple'],
            skills: [],
          },
          _sourcePath: coreDir,
        } as ModuleManifest,
      ];

      await generateRegistries(projectPath, modules);

      const agentsJson = await fs.readJson(path.join(projectPath, '.claude/registries/agents.json'));
      const simpleAgent = agentsJson.agents.find((a: { id: string }) => a.id === 'ai-simple');

      // Should have defaults for missing frontmatter fields
      expect(simpleAgent).toBeDefined();
      expect(simpleAgent['capability-needs']).toEqual([]);
      expect(simpleAgent['token-budget']).toBe(0);
    });

    it('should handle skills without frontmatter', async () => {
      const coreDir = path.join(modulesDir, 'core');
      await fs.ensureDir(path.join(coreDir, 'skills/simple-skill'));

      // Create module.json (required by DiscoveryEngine)
      await fs.writeJson(path.join(coreDir, 'module.json'), {
        id: 'core',
        version: '1.0.0',
        provides: {
          agents: [],
          skills: ['simple-skill'],
        },
      });

      await fs.writeFile(
        path.join(coreDir, 'skills/simple-skill/SKILL.md'),
        '# Simple Skill\n\nNo frontmatter here'
      );

      const modules: ModuleManifest[] = [
        {
          id: 'core',
          version: '1.0.0',
          provides: {
            agents: [],
            skills: ['simple-skill'],
          },
          _sourcePath: coreDir,
        } as ModuleManifest,
      ];

      await generateRegistries(projectPath, modules);

      const skillsJson = await fs.readJson(path.join(projectPath, '.claude/registries/skills.json'));
      const simpleSkill = skillsJson.skills.find((s: { id: string }) => s.id === 'simple-skill');

      expect(simpleSkill).toBeDefined();
      expect(simpleSkill['capabilities-provided']).toEqual([]);
    });
  });
});
