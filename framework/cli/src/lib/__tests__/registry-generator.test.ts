/**
 * Unit Tests for Registry Generator
 *
 * Tests registry generation for agents, skills, discovery-map, and context.
 */

import fs from 'fs-extra';
import { generateRegistries, regenerateContextRegistry } from '../registry-generator.js';
import { DiscoveryEngine } from '../discovery-engine.js';
import type { ModuleManifest } from '../module-loader.js';

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock DiscoveryEngine
jest.mock('../discovery-engine.js');
const MockedDiscoveryEngine = DiscoveryEngine as jest.MockedClass<typeof DiscoveryEngine>;

describe('generateRegistries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFs.ensureDir.mockResolvedValue(undefined as any);
    mockedFs.writeJson.mockResolvedValue(undefined);
    mockedFs.pathExists.mockResolvedValue(false);

    // Setup default DiscoveryEngine mock
    MockedDiscoveryEngine.mockImplementation(() => ({
      loadModules: jest.fn().mockResolvedValue(new Map()),
      getAllAgents: jest.fn().mockResolvedValue([]),
      getAllSkills: jest.fn().mockResolvedValue([]),
      getContextFilesForAgent: jest.fn().mockReturnValue([]),
    } as any));
  });

  it('should create registries directory', async () => {
    await generateRegistries('/test/project', []);

    expect(mockedFs.ensureDir).toHaveBeenCalledWith('/test/project/.claude/registries');
  });

  it('should generate all five registry files', async () => {
    await generateRegistries('/test/project', []);

    expect(mockedFs.writeJson).toHaveBeenCalledTimes(5);

    const filePaths = mockedFs.writeJson.mock.calls.map(call => call[0]);
    expect(filePaths).toContain('/test/project/.claude/registries/agents.json');
    expect(filePaths).toContain('/test/project/.claude/registries/skills.json');
    expect(filePaths).toContain('/test/project/.claude/registries/discovery-map.json');
    expect(filePaths).toContain('/test/project/.claude/registries/context.json');
    expect(filePaths).toContain('/test/project/.claude/registries/commands.json');
  });

  it('should generate empty registries for empty modules array', async () => {
    await generateRegistries('/test/project', []);

    // Check agents.json
    const agentsCall = mockedFs.writeJson.mock.calls.find(
      call => String(call[0]).includes('agents.json')
    );
    expect(agentsCall![1]).toEqual({ version: '1.0.0', agents: [] });

    // Check skills.json
    const skillsCall = mockedFs.writeJson.mock.calls.find(
      call => String(call[0]).includes('skills.json')
    );
    expect(skillsCall![1]).toEqual({ version: '1.0.0', skills: [] });

    // Check discovery-map.json
    const discoveryCall = mockedFs.writeJson.mock.calls.find(
      call => String(call[0]).includes('discovery-map.json')
    );
    expect(discoveryCall![1]).toEqual({ version: '1.0.0', capabilities: [] });
  });

  it('should generate agents registry from modules', async () => {
    const mockAgentDef = {
      id: 'ai-test-agent',
      moduleId: 'core',
      capabilityNeeds: ['code-implementation'],
      contextCategoryNeeds: { business: 'basic' },
      tokenBudget: 3000,
      variant: 'full',
      essentialSkills: ['verifying-quality'],
      availableSkills: ['using-mcp'],
      delegatesTo: ['ai-test-agent-slim'],
      parentAgent: undefined,
      sourcePath: '/test/agent.md',
    };

    MockedDiscoveryEngine.mockImplementation(() => ({
      loadModules: jest.fn().mockResolvedValue(new Map()),
      getAllAgents: jest.fn().mockResolvedValue([mockAgentDef]),
      getAllSkills: jest.fn().mockResolvedValue([]),
      getContextFilesForAgent: jest.fn().mockReturnValue(['business-basic.md']),
    } as any));

    const modules: ModuleManifest[] = [
      {
        id: 'core',
        version: '1.0.0',
        _sourcePath: '/test/framework/modules/core',
      },
    ];

    await generateRegistries('/test/project', modules);

    const agentsCall = mockedFs.writeJson.mock.calls.find(
      call => String(call[0]).includes('agents.json')
    );

    expect(agentsCall![1].agents).toHaveLength(1);
    expect(agentsCall![1].agents[0].id).toBe('ai-test-agent');
    expect(agentsCall![1].agents[0]['essential-skills']).toContain('verifying-quality');
    expect(agentsCall![1].agents[0]['available-skills']).toContain('using-mcp');
    expect(agentsCall![1].agents[0]['delegates-to']).toContain('ai-test-agent-slim');
  });

  it('should generate skills registry from modules', async () => {
    const mockSkillDef = {
      id: 'test-skill',
      moduleId: 'core',
      capabilitiesProvided: ['code-implementation'],
      sourcePath: '/test/skill.md',
    };

    MockedDiscoveryEngine.mockImplementation(() => ({
      loadModules: jest.fn().mockResolvedValue(new Map()),
      getAllAgents: jest.fn().mockResolvedValue([]),
      getAllSkills: jest.fn().mockResolvedValue([mockSkillDef]),
      getContextFilesForAgent: jest.fn().mockReturnValue([]),
    } as any));

    const modules: ModuleManifest[] = [
      {
        id: 'core',
        version: '1.0.0',
        _sourcePath: '/test/framework/modules/core',
      },
    ];

    await generateRegistries('/test/project', modules);

    const skillsCall = mockedFs.writeJson.mock.calls.find(
      call => String(call[0]).includes('skills.json')
    );

    expect(skillsCall![1].skills).toHaveLength(1);
    expect(skillsCall![1].skills[0].id).toBe('test-skill');
    expect(skillsCall![1].skills[0]['capabilities-provided']).toContain('code-implementation');
  });

  it('should generate discovery-map from capabilities', async () => {
    const mockAgentDef = {
      id: 'ai-test-agent',
      moduleId: 'core',
      capabilityNeeds: ['code-implementation'],
      contextCategoryNeeds: {},
      tokenBudget: 3000,
      sourcePath: '/test/agent.md',
    };

    const mockSkillDef = {
      id: 'test-skill',
      moduleId: 'core',
      capabilitiesProvided: ['code-implementation'],
      sourcePath: '/test/skill.md',
    };

    MockedDiscoveryEngine.mockImplementation(() => ({
      loadModules: jest.fn().mockResolvedValue(new Map()),
      getAllAgents: jest.fn().mockResolvedValue([mockAgentDef]),
      getAllSkills: jest.fn().mockResolvedValue([mockSkillDef]),
      getContextFilesForAgent: jest.fn().mockReturnValue([]),
    } as any));

    const modules: ModuleManifest[] = [
      {
        id: 'core',
        version: '1.0.0',
        _sourcePath: '/test/framework/modules/core',
      },
    ];

    await generateRegistries('/test/project', modules);

    const discoveryCall = mockedFs.writeJson.mock.calls.find(
      call => String(call[0]).includes('discovery-map.json')
    );

    expect(discoveryCall![1].capabilities).toHaveLength(1);
    expect(discoveryCall![1].capabilities[0].capability).toBe('code-implementation');
    expect(discoveryCall![1].capabilities[0]['skills-providing']).toContain('test-skill');
    expect(discoveryCall![1].capabilities[0]['used-by-agents']).toContain('ai-test-agent');
  });

  it('should filter agents by installed modules', async () => {
    const mockAgents = [
      {
        id: 'agent-core',
        moduleId: 'core',
        capabilityNeeds: [],
        contextCategoryNeeds: {},
        tokenBudget: 3000,
        sourcePath: '/test/agent1.md',
      },
      {
        id: 'agent-coding',
        moduleId: 'coding',
        capabilityNeeds: [],
        contextCategoryNeeds: {},
        tokenBudget: 3000,
        sourcePath: '/test/agent2.md',
      },
    ];

    MockedDiscoveryEngine.mockImplementation(() => ({
      loadModules: jest.fn().mockResolvedValue(new Map()),
      getAllAgents: jest.fn().mockResolvedValue(mockAgents),
      getAllSkills: jest.fn().mockResolvedValue([]),
      getContextFilesForAgent: jest.fn().mockReturnValue([]),
    } as any));

    // Only install 'core' module
    const modules: ModuleManifest[] = [
      {
        id: 'core',
        version: '1.0.0',
        _sourcePath: '/test/framework/modules/core',
      },
    ];

    await generateRegistries('/test/project', modules);

    const agentsCall = mockedFs.writeJson.mock.calls.find(
      call => String(call[0]).includes('agents.json')
    );

    // Should only include core agent
    expect(agentsCall![1].agents).toHaveLength(1);
    expect(agentsCall![1].agents[0].id).toBe('agent-core');
  });

  it('should include context files that exist', async () => {
    mockedFs.pathExists.mockResolvedValue(true);

    await generateRegistries('/test/project', []);

    const contextCall = mockedFs.writeJson.mock.calls.find(
      call => String(call[0]).includes('context.json')
    );

    // Should include standard context files that exist
    expect(contextCall![1].context.length).toBeGreaterThan(0);
  });

  it('should not include context files that do not exist', async () => {
    mockedFs.pathExists.mockResolvedValue(false);

    await generateRegistries('/test/project', []);

    const contextCall = mockedFs.writeJson.mock.calls.find(
      call => String(call[0]).includes('context.json')
    );

    // No context files exist, so array should be empty
    expect(contextCall![1].context).toEqual([]);
  });

  it('should include module-specific context files', async () => {
    mockedFs.pathExists.mockResolvedValue(true);

    const modules: ModuleManifest[] = [
      {
        id: 'jira',
        version: '1.0.0',
        _sourcePath: '/test/framework/modules/jira',
        context: {
          technical: ['jira-integration.md'],
        },
      },
    ];

    await generateRegistries('/test/project', modules);

    const contextCall = mockedFs.writeJson.mock.calls.find(
      call => String(call[0]).includes('context.json')
    );

    const moduleContext = contextCall![1].context.find(
      (c: any) => c.module === 'jira'
    );

    expect(moduleContext).toBeDefined();
    expect(moduleContext.id).toBe('jira-integration');
  });

  it('should omit optional fields when empty', async () => {
    const mockAgentDef = {
      id: 'simple-agent',
      moduleId: 'core',
      capabilityNeeds: [],
      contextCategoryNeeds: {},
      tokenBudget: 1000,
      variant: 'slim',
      essentialSkills: [], // Empty
      availableSkills: undefined, // Undefined
      delegatesTo: [], // Empty
      parentAgent: undefined, // No parent
      sourcePath: '/test/agent.md',
    };

    MockedDiscoveryEngine.mockImplementation(() => ({
      loadModules: jest.fn().mockResolvedValue(new Map()),
      getAllAgents: jest.fn().mockResolvedValue([mockAgentDef]),
      getAllSkills: jest.fn().mockResolvedValue([]),
      getContextFilesForAgent: jest.fn().mockReturnValue([]),
    } as any));

    const modules: ModuleManifest[] = [
      {
        id: 'core',
        version: '1.0.0',
        _sourcePath: '/test/framework/modules/core',
      },
    ];

    await generateRegistries('/test/project', modules);

    const agentsCall = mockedFs.writeJson.mock.calls.find(
      call => String(call[0]).includes('agents.json')
    );

    const agent = agentsCall![1].agents[0];
    expect(agent['essential-skills']).toBeUndefined();
    expect(agent['available-skills']).toBeUndefined();
    expect(agent['delegates-to']).toBeUndefined();
    expect(agent['parent-agent']).toBeUndefined();
  });
});

describe('regenerateContextRegistry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFs.ensureDir.mockResolvedValue(undefined as any);
    mockedFs.writeJson.mockResolvedValue(undefined);
    mockedFs.pathExists.mockResolvedValue(true);
  });

  it('should create registries directory', async () => {
    await regenerateContextRegistry('/test/project', []);

    expect(mockedFs.ensureDir).toHaveBeenCalledWith('/test/project/.claude/registries');
  });

  it('should only generate context.json', async () => {
    await regenerateContextRegistry('/test/project', []);

    expect(mockedFs.writeJson).toHaveBeenCalledTimes(1);
    expect(mockedFs.writeJson).toHaveBeenCalledWith(
      '/test/project/.claude/registries/context.json',
      expect.any(Object),
      expect.any(Object)
    );
  });

  it('should include existing context files', async () => {
    mockedFs.pathExists.mockResolvedValue(true);

    await regenerateContextRegistry('/test/project', []);

    const contextCall = mockedFs.writeJson.mock.calls[0];
    expect(contextCall[1].context.length).toBeGreaterThan(0);
  });
});
