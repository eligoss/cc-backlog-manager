/**
 * Unit Tests for FrameworkValidator
 *
 * Tests all validation methods with mocked DiscoveryEngine and filesystem
 */

import { FrameworkValidator, ValidationIssue, ValidationResult } from '../framework-validator.js';
import { DiscoveryEngine, AgentDefinition, SkillDefinition, SkillDiscoveryResult } from '../discovery-engine.js';
import fs from 'fs-extra';

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Create mock DiscoveryEngine
const createMockEngine = (): jest.Mocked<DiscoveryEngine> => ({
  getAllAgents: jest.fn(),
  getAllSkills: jest.fn(),
  getLoadedModules: jest.fn(),
  discoverSkillsForAgent: jest.fn(),
  loadModules: jest.fn(),
  discoverAgents: jest.fn(),
  discoverSkills: jest.fn(),
} as unknown as jest.Mocked<DiscoveryEngine>);

describe('FrameworkValidator', () => {
  let mockEngine: jest.Mocked<DiscoveryEngine>;
  let validator: FrameworkValidator;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEngine = createMockEngine();
    validator = new FrameworkValidator(mockEngine, '/framework', '/project');
  });

  describe('validateCapabilityResolution', () => {
    it('should pass when all capabilities are fulfilled', async () => {
      const mockAgents: AgentDefinition[] = [
        {
          id: 'test-agent',
          moduleId: 'core',
          capabilityNeeds: ['git-workflow'],
          contextCategoryNeeds: {},
          tokenBudget: 1000,
          sourcePath: '/framework/agents/test-agent.md',
          variant: 'full',
        },
      ];

      mockEngine.getAllAgents.mockResolvedValue(mockAgents);
      mockEngine.discoverSkillsForAgent.mockResolvedValue({
        skills: ['committing-code'],
        unfulfilledCapabilities: [],
      } as SkillDiscoveryResult);

      const result = await validator.validateCapabilityResolution();

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.stats.checked).toBe(1);
      expect(result.stats.passed).toBe(1);
      expect(result.stats.failed).toBe(0);
    });

    it('should fail when capability is not provided by any skill', async () => {
      const mockAgents: AgentDefinition[] = [
        {
          id: 'test-agent',
          moduleId: 'core',
          capabilityNeeds: ['missing-capability'],
          contextCategoryNeeds: {},
          tokenBudget: 1000,
          sourcePath: '/framework/agents/test-agent.md',
          variant: 'full',
        },
      ];

      mockEngine.getAllAgents.mockResolvedValue(mockAgents);
      mockEngine.discoverSkillsForAgent.mockResolvedValue({
        skills: [],
        unfulfilledCapabilities: ['missing-capability'],
      } as SkillDiscoveryResult);

      const result = await validator.validateCapabilityResolution();

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('error');
      expect(result.issues[0].category).toBe('capability');
      expect(result.issues[0].message).toContain("requires capability 'missing-capability'");
      expect(result.stats.failed).toBe(1);
    });

    it('should handle multiple unfulfilled capabilities', async () => {
      const mockAgents: AgentDefinition[] = [
        {
          id: 'test-agent',
          moduleId: 'core',
          capabilityNeeds: ['cap1', 'cap2', 'cap3'],
          contextCategoryNeeds: {},
          tokenBudget: 1000,
          sourcePath: '/framework/agents/test-agent.md',
          variant: 'full',
        },
      ];

      mockEngine.getAllAgents.mockResolvedValue(mockAgents);
      mockEngine.discoverSkillsForAgent.mockResolvedValue({
        skills: [],
        unfulfilledCapabilities: ['cap1', 'cap2'],
      } as SkillDiscoveryResult);

      const result = await validator.validateCapabilityResolution();

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(2);
    });

    it('should handle errors gracefully', async () => {
      mockEngine.getAllAgents.mockRejectedValue(new Error('Engine failure'));

      const result = await validator.validateCapabilityResolution();

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].message).toContain('Engine failure');
    });
  });

  describe('validateContextExistence', () => {
    it('should pass when all context files exist', async () => {
      const mockAgents: AgentDefinition[] = [
        {
          id: 'test-agent',
          moduleId: 'core',
          capabilityNeeds: [],
          contextCategoryNeeds: { business: 'basic' },
          tokenBudget: 1000,
          sourcePath: '/framework/agents/test-agent.md',
          variant: 'full',
        },
      ];

      mockEngine.getAllAgents.mockResolvedValue(mockAgents);
      mockedFs.pathExists.mockResolvedValue(true);

      const result = await validator.validateContextExistence();

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail when context file is missing', async () => {
      const mockAgents: AgentDefinition[] = [
        {
          id: 'test-agent',
          moduleId: 'core',
          capabilityNeeds: [],
          contextCategoryNeeds: { business: 'basic' },
          tokenBudget: 1000,
          sourcePath: '/framework/agents/test-agent.md',
          variant: 'full',
        },
      ];

      mockEngine.getAllAgents.mockResolvedValue(mockAgents);
      mockedFs.pathExists.mockResolvedValue(false);

      const result = await validator.validateContextExistence();

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].message).toContain('business-basic.md');
    });

    it('should check cumulative context files for advanced level', async () => {
      const mockAgents: AgentDefinition[] = [
        {
          id: 'test-agent',
          moduleId: 'core',
          capabilityNeeds: [],
          contextCategoryNeeds: { business: 'advanced' },
          tokenBudget: 1000,
          sourcePath: '/framework/agents/test-agent.md',
          variant: 'full',
        },
      ];

      mockEngine.getAllAgents.mockResolvedValue(mockAgents);
      mockedFs.pathExists.mockResolvedValue(true);

      await validator.validateContextExistence();

      // Should check for both basic and advanced files (cumulative loading)
      expect(mockedFs.pathExists).toHaveBeenCalledWith(
        expect.stringContaining('business-basic.md')
      );
      expect(mockedFs.pathExists).toHaveBeenCalledWith(
        expect.stringContaining('business-advanced.md')
      );
    });

    it('should skip agents without context needs', async () => {
      const mockAgents: AgentDefinition[] = [
        {
          id: 'test-agent',
          moduleId: 'core',
          capabilityNeeds: [],
          contextCategoryNeeds: {},
          tokenBudget: 1000,
          sourcePath: '/framework/agents/test-agent.md',
          variant: 'full',
        },
      ];

      mockEngine.getAllAgents.mockResolvedValue(mockAgents);

      const result = await validator.validateContextExistence();

      expect(result.valid).toBe(true);
      expect(result.stats.checked).toBe(0);
    });
  });

  describe('validateModuleDeclarations', () => {
    it('should pass when all declared assets exist', async () => {
      const mockModules = new Map([
        [
          'core',
          {
            id: 'core',
            version: '1.0.0',
            provides: { agents: ['test-agent'], skills: ['test-skill'] },
            _sourcePath: '/framework/modules/core',
          },
        ],
      ]);

      mockEngine.getLoadedModules.mockReturnValue(mockModules);
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readdir.mockResolvedValue([
        { name: 'test-skill', isDirectory: () => true },
      ] as any);

      const result = await validator.validateModuleDeclarations();

      expect(result.valid).toBe(true);
    });

    it('should fail when declared agent file is missing', async () => {
      const mockModules = new Map([
        [
          'core',
          {
            id: 'core',
            version: '1.0.0',
            provides: { agents: ['missing-agent'] },
            _sourcePath: '/framework/modules/core',
          },
        ],
      ]);

      mockEngine.getLoadedModules.mockReturnValue(mockModules);
      mockedFs.pathExists.mockResolvedValue(false);

      const result = await validator.validateModuleDeclarations();

      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain("declares agent 'missing-agent'");
    });

    it('should fail when declared skill directory is missing', async () => {
      const mockModules = new Map([
        [
          'core',
          {
            id: 'core',
            version: '1.0.0',
            provides: { skills: ['missing-skill'] },
            _sourcePath: '/framework/modules/core',
          },
        ],
      ]);

      mockEngine.getLoadedModules.mockReturnValue(mockModules);
      mockedFs.pathExists.mockResolvedValue(false);

      const result = await validator.validateModuleDeclarations();

      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain("declares skill 'missing-skill'");
    });
  });

  describe('validateSkillCapabilities', () => {
    it('should pass when skills match module capabilities', async () => {
      const mockSkills: SkillDefinition[] = [
        {
          id: 'test-skill',
          moduleId: 'core',
          capabilitiesProvided: ['git-workflow'],
          sourcePath: '/framework/modules/core/skills/test-skill',
        },
      ];

      const mockModules = new Map([
        [
          'core',
          {
            id: 'core',
            version: '1.0.0',
            provides: { capabilities: ['git-workflow'], skills: ['test-skill'] },
          },
        ],
      ]);

      mockEngine.getAllSkills.mockResolvedValue(mockSkills);
      mockEngine.getLoadedModules.mockReturnValue(mockModules);

      const result = await validator.validateSkillCapabilities();

      expect(result.valid).toBe(true);
    });

    it('should warn when skill provides undeclared capability', async () => {
      const mockSkills: SkillDefinition[] = [
        {
          id: 'test-skill',
          moduleId: 'core',
          capabilitiesProvided: ['undeclared-capability'],
          sourcePath: '/framework/modules/core/skills/test-skill',
        },
      ];

      const mockModules = new Map([
        [
          'core',
          {
            id: 'core',
            version: '1.0.0',
            provides: { capabilities: [], skills: ['test-skill'] },
          },
        ],
      ]);

      mockEngine.getAllSkills.mockResolvedValue(mockSkills);
      mockEngine.getLoadedModules.mockReturnValue(mockModules);

      const result = await validator.validateSkillCapabilities();

      expect(result.issues.some((i) => i.type === 'warning')).toBe(true);
      expect(result.issues[0].message).toContain('not declared in module manifest');
    });

    it('should error when skill references non-existent module', async () => {
      const mockSkills: SkillDefinition[] = [
        {
          id: 'orphan-skill',
          moduleId: 'non-existent',
          capabilitiesProvided: [],
          sourcePath: '/path',
        },
      ];

      mockEngine.getAllSkills.mockResolvedValue(mockSkills);
      mockEngine.getLoadedModules.mockReturnValue(new Map());

      const result = await validator.validateSkillCapabilities();

      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain("references non-existent module");
    });
  });

  describe('validateAgentVariants', () => {
    it('should pass for valid full agent', async () => {
      const mockAgents: AgentDefinition[] = [
        {
          id: 'full-agent',
          moduleId: 'core',
          capabilityNeeds: [],
          contextCategoryNeeds: { business: 'expert' },
          tokenBudget: 3000,
          sourcePath: '/framework/agents/full-agent.md',
          variant: 'full',
        },
      ];

      mockEngine.getAllAgents.mockResolvedValue(mockAgents);

      const result = await validator.validateAgentVariants();

      expect(result.valid).toBe(true);
    });

    it('should error when slim agent lacks parent-agent', async () => {
      const mockAgents: AgentDefinition[] = [
        {
          id: 'slim-agent',
          moduleId: 'core',
          capabilityNeeds: [],
          contextCategoryNeeds: {},
          tokenBudget: 500,
          sourcePath: '/framework/agents/slim-agent.md',
          variant: 'slim',
          // Missing parentAgent
        },
      ];

      mockEngine.getAllAgents.mockResolvedValue(mockAgents);

      const result = await validator.validateAgentVariants();

      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain('must declare parent-agent');
    });

    it('should warn when slim agent exceeds 1000 token budget', async () => {
      const mockAgents: AgentDefinition[] = [
        {
          id: 'slim-agent',
          moduleId: 'core',
          capabilityNeeds: [],
          contextCategoryNeeds: {},
          tokenBudget: 1500,
          sourcePath: '/framework/agents/slim-agent.md',
          variant: 'slim',
          parentAgent: 'full-agent',
        },
      ];

      mockEngine.getAllAgents.mockResolvedValue(mockAgents);

      const result = await validator.validateAgentVariants();

      expect(result.issues.some((i) => i.type === 'warning')).toBe(true);
      expect(result.issues[0].message).toContain('exceeds recommended 1000 token budget');
    });

    it('should error when slim agent uses non-basic context level', async () => {
      const mockAgents: AgentDefinition[] = [
        {
          id: 'slim-agent',
          moduleId: 'core',
          capabilityNeeds: [],
          contextCategoryNeeds: { business: 'advanced' },
          tokenBudget: 500,
          sourcePath: '/framework/agents/slim-agent.md',
          variant: 'slim',
          parentAgent: 'full-agent',
        },
      ];

      mockEngine.getAllAgents.mockResolvedValue(mockAgents);

      const result = await validator.validateAgentVariants();

      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain("must use 'basic' context level");
    });

    it('should error when full agent delegates to non-existent agent', async () => {
      const mockAgents: AgentDefinition[] = [
        {
          id: 'full-agent',
          moduleId: 'core',
          capabilityNeeds: [],
          contextCategoryNeeds: {},
          tokenBudget: 3000,
          sourcePath: '/framework/agents/full-agent.md',
          variant: 'full',
          delegatesTo: ['non-existent-slim'],
        },
      ];

      mockEngine.getAllAgents.mockResolvedValue(mockAgents);

      const result = await validator.validateAgentVariants();

      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain("delegates to non-existent agent");
    });

    it('should warn when full agent delegates to non-slim agent', async () => {
      const mockAgents: AgentDefinition[] = [
        {
          id: 'full-agent',
          moduleId: 'core',
          capabilityNeeds: [],
          contextCategoryNeeds: {},
          tokenBudget: 3000,
          sourcePath: '/framework/agents/full-agent.md',
          variant: 'full',
          delegatesTo: ['another-full'],
        },
        {
          id: 'another-full',
          moduleId: 'core',
          capabilityNeeds: [],
          contextCategoryNeeds: {},
          tokenBudget: 3000,
          sourcePath: '/framework/agents/another-full.md',
          variant: 'full', // Not slim!
        },
      ];

      mockEngine.getAllAgents.mockResolvedValue(mockAgents);

      const result = await validator.validateAgentVariants();

      expect(result.issues.some((i) => i.type === 'warning')).toBe(true);
      expect(result.issues[0].message).toContain('is not marked as slim variant');
    });
  });

  describe('validateEssentialAndAvailableSkills', () => {
    it('should pass when all referenced skills exist', async () => {
      const mockAgents: AgentDefinition[] = [
        {
          id: 'test-agent',
          moduleId: 'core',
          capabilityNeeds: [],
          contextCategoryNeeds: {},
          tokenBudget: 1000,
          sourcePath: '/framework/agents/test-agent.md',
          variant: 'full',
          essentialSkills: ['existing-skill'],
          availableSkills: ['another-skill'],
        },
      ];

      const mockSkills: SkillDefinition[] = [
        { id: 'existing-skill', moduleId: 'core', capabilitiesProvided: [], sourcePath: '/path' },
        { id: 'another-skill', moduleId: 'core', capabilitiesProvided: [], sourcePath: '/path' },
      ];

      mockEngine.getAllAgents.mockResolvedValue(mockAgents);
      mockEngine.getAllSkills.mockResolvedValue(mockSkills);
      mockEngine.discoverSkillsForAgent.mockResolvedValue({
        skills: [],
        unfulfilledCapabilities: [],
      } as SkillDiscoveryResult);

      const result = await validator.validateEssentialAndAvailableSkills();

      expect(result.valid).toBe(true);
    });

    it('should error when essential skill does not exist', async () => {
      const mockAgents: AgentDefinition[] = [
        {
          id: 'test-agent',
          moduleId: 'core',
          capabilityNeeds: [],
          contextCategoryNeeds: {},
          tokenBudget: 1000,
          sourcePath: '/framework/agents/test-agent.md',
          variant: 'full',
          essentialSkills: ['missing-skill'],
        },
      ];

      mockEngine.getAllAgents.mockResolvedValue(mockAgents);
      mockEngine.getAllSkills.mockResolvedValue([]);

      const result = await validator.validateEssentialAndAvailableSkills();

      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain("declares essential-skill 'missing-skill'");
    });

    it('should error when available skill does not exist', async () => {
      const mockAgents: AgentDefinition[] = [
        {
          id: 'test-agent',
          moduleId: 'core',
          capabilityNeeds: [],
          contextCategoryNeeds: {},
          tokenBudget: 1000,
          sourcePath: '/framework/agents/test-agent.md',
          variant: 'full',
          availableSkills: ['missing-skill'],
        },
      ];

      mockEngine.getAllAgents.mockResolvedValue(mockAgents);
      mockEngine.getAllSkills.mockResolvedValue([]);

      const result = await validator.validateEssentialAndAvailableSkills();

      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain("declares available-skill 'missing-skill'");
    });

    it('should warn when skill is in both essential and discovered', async () => {
      const mockAgents: AgentDefinition[] = [
        {
          id: 'test-agent',
          moduleId: 'core',
          capabilityNeeds: ['git-workflow'],
          contextCategoryNeeds: {},
          tokenBudget: 1000,
          sourcePath: '/framework/agents/test-agent.md',
          variant: 'full',
          essentialSkills: ['committing-code'],
        },
      ];

      const mockSkills: SkillDefinition[] = [
        { id: 'committing-code', moduleId: 'core', capabilitiesProvided: ['git-workflow'], sourcePath: '/path' },
      ];

      mockEngine.getAllAgents.mockResolvedValue(mockAgents);
      mockEngine.getAllSkills.mockResolvedValue(mockSkills);
      mockEngine.discoverSkillsForAgent.mockResolvedValue({
        skills: ['committing-code'], // Same skill discovered!
        unfulfilledCapabilities: [],
      } as SkillDiscoveryResult);

      const result = await validator.validateEssentialAndAvailableSkills();

      expect(result.issues.some((i) => i.type === 'warning')).toBe(true);
      expect(result.issues[0].message).toContain('in both essential-skills and discovered');
    });

    it('should warn when skill is in both essential and available', async () => {
      const mockAgents: AgentDefinition[] = [
        {
          id: 'test-agent',
          moduleId: 'core',
          capabilityNeeds: [],
          contextCategoryNeeds: {},
          tokenBudget: 1000,
          sourcePath: '/framework/agents/test-agent.md',
          variant: 'full',
          essentialSkills: ['shared-skill'],
          availableSkills: ['shared-skill'], // Same skill!
        },
      ];

      const mockSkills: SkillDefinition[] = [
        { id: 'shared-skill', moduleId: 'core', capabilitiesProvided: [], sourcePath: '/path' },
      ];

      mockEngine.getAllAgents.mockResolvedValue(mockAgents);
      mockEngine.getAllSkills.mockResolvedValue(mockSkills);

      const result = await validator.validateEssentialAndAvailableSkills();

      expect(result.issues.some((i) => i.type === 'warning')).toBe(true);
      expect(result.issues[0].message).toContain('essential takes precedence');
    });
  });

  describe('validateAll', () => {
    it('should run all validations and aggregate results', async () => {
      mockEngine.getAllAgents.mockResolvedValue([]);
      mockEngine.getAllSkills.mockResolvedValue([]);
      mockEngine.getLoadedModules.mockReturnValue(new Map());

      const report = await validator.validateAll();

      expect(report.timestamp).toBeDefined();
      expect(report.capabilityResolution).toBeDefined();
      expect(report.contextExistence).toBeDefined();
      expect(report.moduleDeclarations).toBeDefined();
      expect(report.skillCapabilities).toBeDefined();
      expect(report.agentVariants).toBeDefined();
      expect(report.essentialAndAvailableSkills).toBeDefined();
    });

    it('should report overall as false if any validation fails', async () => {
      mockEngine.getAllAgents.mockRejectedValue(new Error('Test error'));
      mockEngine.getAllSkills.mockResolvedValue([]);
      mockEngine.getLoadedModules.mockReturnValue(new Map());

      const report = await validator.validateAll();

      expect(report.overall).toBe(false);
    });

    it('should report overall as true if all validations pass', async () => {
      mockEngine.getAllAgents.mockResolvedValue([]);
      mockEngine.getAllSkills.mockResolvedValue([]);
      mockEngine.getLoadedModules.mockReturnValue(new Map());

      const report = await validator.validateAll();

      expect(report.overall).toBe(true);
    });
  });
});
