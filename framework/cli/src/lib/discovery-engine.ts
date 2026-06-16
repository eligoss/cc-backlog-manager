import fs from 'fs-extra';
import path from 'path';
import { ModuleManifest } from './module-loader.js';
import { recordDiscoveryOperation } from './telemetry/instrumentation/discovery-instrumentation.js';

/**
 * Map of capability name to skills that provide it
 */
export type CapabilityMap = Map<string, string[]>;

/**
 * Result of discovering skills for an agent
 */
export interface DiscoveryResult {
  agentId: string;
  skills: string[]; // For backward compat: all discovered skills (Tier 2)
  essentialSkills: string[]; // Tier 1: Pre-loaded
  discoveredSkills: string[]; // Tier 2: Capability-based
  availableSkills: string[]; // Tier 3: On-demand reference
  unfulfilledCapabilities: string[];
  moduleId: string;
}

/**
 * Agent definition parsed from markdown frontmatter
 */
export interface AgentDefinition {
  id: string;
  moduleId: string;
  essentialSkills?: string[];
  capabilityNeeds: string[];
  availableSkills?: string[];
  tokenBudget: number;
  sourcePath: string;
  // Variant fields for agent hierarchy
  variant?: 'full' | 'slim';
  delegatesTo?: string[];
  parentAgent?: string;
}

/**
 * Skill definition parsed from markdown frontmatter
 */
export interface SkillDefinition {
  id: string;
  moduleId: string;
  capabilitiesProvided: string[];
  description?: string;
  sourcePath: string;
}

/**
 * Dependency validation result
 */
export interface DependencyValidation {
  valid: boolean;
  missingDependencies: Array<{ module: string; requires: string }>;
}

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content: string): Record<string, unknown> {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return {};
  }

  const frontmatter: Record<string, unknown> = {};
  const lines = frontmatterMatch[1].split('\n');
  let currentKey: string | null = null;
  let currentIndent = 0;
  let currentList: string[] | null = null;
  let currentObj: Record<string, unknown> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = line.search(/\S/);
    const keyValueMatch = trimmed.match(/^([a-z-]+):\s*(.*)$/i);
    const listItemMatch = trimmed.match(/^-\s+(.+)$/);

    if (keyValueMatch) {
      const [, key, value] = keyValueMatch;

      if (indent === 0) {
        // Top-level key
        if (value === '') {
          // Start of list or object
          currentKey = key;
          currentIndent = indent;
          currentList = null;
          currentObj = null;
        } else {
          // Simple value
          frontmatter[key] = parseValue(value);
          currentKey = null;
        }
      } else if (currentKey && indent > currentIndent) {
        // Nested key-value (object)
        if (!currentObj) {
          currentObj = {};
          frontmatter[currentKey] = currentObj;
        }
        currentObj[key] = parseValue(value);
      }
    } else if (listItemMatch && currentKey) {
      // List item
      if (!currentList) {
        currentList = [];
        frontmatter[currentKey] = currentList;
      }
      currentList.push(listItemMatch[1].trim());
    }
  }

  return frontmatter;
}

/**
 * Parse a YAML value
 */
function parseValue(value: string): string | number | boolean | unknown[] | Record<string, unknown> {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === '[]') return []; // Empty array
  if (value === '{}') return {}; // Empty object
  if (!isNaN(Number(value)) && value !== '') return Number(value);
  return value;
}

/**
 * Discovery Engine for capability-based skill discovery
 *
 * Loads module manifests, parses agent/skill definitions, and discovers
 * which skills should be loaded for each agent based on capability matching.
 */
export class DiscoveryEngine {
  // Skill source types and their priorities (lower = higher priority)
  private static readonly SKILL_SOURCES = [
    { type: 'project', path: '.claude/skills/project', priority: 1 },
    { type: 'deployed', path: '.claude/skills', priority: 2 },
    // Module skills come from module.provides.skills at priority 3
  ] as const;

  private frameworkRoot: string;
  private modules: Map<string, ModuleManifest> = new Map();
  private capabilityMap: CapabilityMap = new Map();
  private agentCache: Map<string, AgentDefinition> = new Map();
  private skillCache: Map<string, SkillDefinition> = new Map();
  private initialized = false;

  constructor(frameworkRoot: string) {
    this.frameworkRoot = frameworkRoot;
  }

  /**
   * Load all available modules from modules/ directory (includes core)
   */
  async loadModules(): Promise<Map<string, ModuleManifest>> {
    this.modules.clear();

    // All modules (including core) are now in modules/ directory
    const modulesDir = path.join(this.frameworkRoot, 'modules');
    if (await fs.pathExists(modulesDir)) {
      const entries = await fs.readdir(modulesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const moduleJsonPath = path.join(modulesDir, entry.name, 'module.json');
          if (await fs.pathExists(moduleJsonPath)) {
            const manifest = await fs.readJson(moduleJsonPath) as ModuleManifest;
            manifest._sourcePath = path.join(modulesDir, entry.name);
            this.modules.set(entry.name, manifest);
          }
        }
      }
    }

    this.initialized = true;
    return this.modules;
  }

  /**
   * Load skills from project-specific directory (.claude/skills/project/)
   * These take priority over framework skills
   */
  async loadProjectSkills(): Promise<SkillDefinition[]> {
    const projectSkillsDir = path.join(this.frameworkRoot, '.claude', 'skills', 'project');
    if (!(await fs.pathExists(projectSkillsDir))) {
      return [];
    }

    const skills: SkillDefinition[] = [];
    const entries = await fs.readdir(projectSkillsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(projectSkillsDir, entry.name, 'SKILL.md');
        if (await fs.pathExists(skillPath)) {
          const content = await fs.readFile(skillPath, 'utf-8');
          const frontmatter = parseFrontmatter(content);

          const skillDef: SkillDefinition = {
            id: entry.name,
            moduleId: 'project',
            capabilitiesProvided: (frontmatter['capabilities-provided'] as string[]) || [],
            description: (frontmatter['description'] as string) || undefined,
            sourcePath: skillPath,
          };

          skills.push(skillDef);
          this.skillCache.set(entry.name, skillDef);
        }
      }
    }

    return skills;
  }

  /**
   * Load skills from deployed directory (.claude/skills/)
   * Fallback when project skills don't provide a capability
   */
  async loadDeployedSkills(): Promise<SkillDefinition[]> {
    const deployedSkillsDir = path.join(this.frameworkRoot, '.claude', 'skills');
    if (!(await fs.pathExists(deployedSkillsDir))) {
      return [];
    }

    const skills: SkillDefinition[] = [];
    const entries = await fs.readdir(deployedSkillsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(deployedSkillsDir, entry.name, 'SKILL.md');
        if (await fs.pathExists(skillPath)) {
          const content = await fs.readFile(skillPath, 'utf-8');
          const frontmatter = parseFrontmatter(content);

          const skillDef: SkillDefinition = {
            id: entry.name,
            moduleId: 'deployed',
            capabilitiesProvided: (frontmatter['capabilities-provided'] as string[]) || [],
            description: (frontmatter['description'] as string) || undefined,
            sourcePath: skillPath,
          };

          skills.push(skillDef);
          this.skillCache.set(entry.name, skillDef);
        }
      }
    }

    return skills;
  }

  /**
   * Build capability to skills mapping
   * @param installedModules - Optional list of modules to include (defaults to all)
   */
  async buildCapabilityMap(installedModules?: string[]): Promise<CapabilityMap> {
    if (!this.initialized) {
      await this.loadModules();
    }

    this.capabilityMap.clear();
    const modulesToProcess = installedModules || Array.from(this.modules.keys());

    // 1. First, load project skills (highest priority)
    const projectSkills = await this.loadProjectSkills();
    for (const skill of projectSkills) {
      for (const capability of skill.capabilitiesProvided) {
        const existing = this.capabilityMap.get(capability) || [];
        // Project skills go FIRST (priority)
        if (!existing.includes(skill.id)) {
          existing.unshift(skill.id); // Add to front
        }
        this.capabilityMap.set(capability, existing);
      }
    }

    // 2. Then load deployed skills (if not already provided by project)
    const deployedSkills = await this.loadDeployedSkills();
    for (const skill of deployedSkills) {
      for (const capability of skill.capabilitiesProvided) {
        const existing = this.capabilityMap.get(capability) || [];
        // Deployed skills go after project skills
        if (!existing.includes(skill.id)) {
          existing.push(skill.id);
        }
        this.capabilityMap.set(capability, existing);
      }
    }

    // 3. Finally, load module skills (existing logic)
    for (const moduleId of modulesToProcess) {
      const module = this.modules.get(moduleId);
      if (!module) continue;

      // Load skills from this module
      const skillIds = module.provides?.skills || [];
      for (const skillId of skillIds) {
        const skillDef = await this.loadSkillDefinition(moduleId, skillId);
        if (skillDef) {
          for (const capability of skillDef.capabilitiesProvided) {
            const existing = this.capabilityMap.get(capability) || [];
            if (!existing.includes(skillId)) {
              existing.push(skillId);
            }
            this.capabilityMap.set(capability, existing);
          }
        }
      }
    }

    return this.capabilityMap;
  }

  /**
   * Discover skills for an agent based on capability-needs
   * Implements three-tier skill loading: essential (Tier 1), discovered (Tier 2), available (Tier 3)
   * @param agentId - The agent ID to discover skills for
   * @param installedModules - Optional list of installed modules (defaults to all)
   */
  async discoverSkillsForAgent(
    agentId: string,
    installedModules?: string[]
  ): Promise<DiscoveryResult> {
    const startTime = Date.now();

    if (!this.initialized) {
      await this.loadModules();
    }

    if (this.capabilityMap.size === 0) {
      await this.buildCapabilityMap(installedModules);
    }

    const agent = await this.getAgentDefinition(agentId);

    // Tier 1: Essential skills (always loaded)
    const essentialSkills = agent.essentialSkills || [];

    // Tier 2: Capability-based discovery (role-based)
    const discoveredSkills: string[] = [];
    const unfulfilledCapabilities: string[] = [];

    for (const capability of agent.capabilityNeeds) {
      const providers = this.capabilityMap.get(capability);
      if (providers && providers.length > 0) {
        for (const skill of providers) {
          // Avoid duplicates
          if (!essentialSkills.includes(skill) && !discoveredSkills.includes(skill)) {
            discoveredSkills.push(skill);
          }
        }
      } else {
        unfulfilledCapabilities.push(capability);
      }
    }

    // Tier 3: Available skills (on-demand reference only)
    const availableSkills = agent.availableSkills || [];

    // Backward compatibility: 'skills' contains all discovered skills (Tier 2)
    const skills = [...discoveredSkills];

    const result = {
      agentId,
      skills, // For backward compat
      essentialSkills,
      discoveredSkills,
      availableSkills,
      unfulfilledCapabilities,
      moduleId: agent.moduleId,
    };

    // Record telemetry
    const durationMs = Date.now() - startTime;
    recordDiscoveryOperation(
      agentId,
      agent.moduleId,
      agent.capabilityNeeds,
      [...essentialSkills, ...discoveredSkills].map(skillId => ({
        skillId,
        module: agent.moduleId,
        source: essentialSkills.includes(skillId) ? 'essential' : 'discovered'
      })),
      unfulfilledCapabilities,
      durationMs,
      agent.variant
    ).catch(() => {
      // Ignore telemetry errors
    });

    return result;
  }

  /**
   * Get agent definition by ID
   */
  async getAgentDefinition(agentId: string): Promise<AgentDefinition> {
    const cached = this.agentCache.get(agentId);
    if (cached) {
      return cached;
    }

    if (!this.initialized) {
      await this.loadModules();
    }

    // Find the module containing this agent
    for (const [moduleId, module] of this.modules) {
      if (module.provides?.agents?.includes(agentId)) {
        const agentDef = await this.loadAgentDefinition(moduleId, agentId);
        if (agentDef) {
          this.agentCache.set(agentId, agentDef);
          return agentDef;
        }
      }
    }

    throw new Error(`Agent '${agentId}' not found in any module`);
  }

  /**
   * Get all agents from all loaded modules
   */
  async getAllAgents(): Promise<AgentDefinition[]> {
    if (!this.initialized) {
      await this.loadModules();
    }

    const agents: AgentDefinition[] = [];

    for (const [moduleId, module] of this.modules) {
      const agentIds = module.provides?.agents || [];
      for (const agentId of agentIds) {
        const agentDef = await this.loadAgentDefinition(moduleId, agentId);
        if (agentDef) {
          agents.push(agentDef);
        }
      }
    }

    return agents;
  }

  /**
   * Get all skills from all loaded modules
   */
  async getAllSkills(): Promise<SkillDefinition[]> {
    if (!this.initialized) {
      await this.loadModules();
    }

    const skills: SkillDefinition[] = [];

    for (const [moduleId, module] of this.modules) {
      const skillIds = module.provides?.skills || [];
      for (const skillId of skillIds) {
        const skillDef = await this.loadSkillDefinition(moduleId, skillId);
        if (skillDef) {
          skills.push(skillDef);
        }
      }
    }

    return skills;
  }

  /**
   * Get all skills from all sources (project, deployed, modules)
   * Useful for validation and status reporting
   */
  async getAllSkillsFromAllSources(): Promise<{
    project: SkillDefinition[];
    deployed: SkillDefinition[];
    modules: SkillDefinition[];
  }> {
    if (!this.initialized) {
      await this.loadModules();
    }

    // Load project skills
    const project = await this.loadProjectSkills();

    // Load deployed skills
    const deployed = await this.loadDeployedSkills();

    // Load module skills
    const modules: SkillDefinition[] = [];
    for (const [moduleId, module] of this.modules) {
      const skillIds = module.provides?.skills || [];
      for (const skillId of skillIds) {
        const skillDef = await this.loadSkillDefinition(moduleId, skillId);
        if (skillDef) {
          modules.push(skillDef);
        }
      }
    }

    return {
      project,
      deployed,
      modules,
    };
  }

  /**
   * Validate module dependencies
   */
  async validateModuleDependencies(installedModules: string[]): Promise<DependencyValidation> {
    if (!this.initialized) {
      await this.loadModules();
    }

    const missingDependencies: Array<{ module: string; requires: string }> = [];

    for (const moduleId of installedModules) {
      const module = this.modules.get(moduleId);
      if (!module) continue;

      if (module.requires) {
        for (const requiredModule of Object.keys(module.requires)) {
          if (!installedModules.includes(requiredModule)) {
            missingDependencies.push({
              module: moduleId,
              requires: requiredModule,
            });
          }
        }
      }
    }

    return {
      valid: missingDependencies.length === 0,
      missingDependencies,
    };
  }

  /**
   * Get skills that provide a capability
   */
  getCapabilityProviders(capability: string): string[] {
    return this.capabilityMap.get(capability) || [];
  }

  /**
   * Get already-loaded modules without reloading
   * Use loadModules() first if modules haven't been loaded yet
   */
  getLoadedModules(): Map<string, ModuleManifest> {
    return this.modules;
  }

  /**
   * Load agent definition from markdown file
   */
  private async loadAgentDefinition(
    moduleId: string,
    agentId: string
  ): Promise<AgentDefinition | null> {
    const module = this.modules.get(moduleId);
    if (!module || !module._sourcePath) return null;

    const agentPath = path.join(module._sourcePath, 'agents', `${agentId}.md`);
    if (!await fs.pathExists(agentPath)) {
      return null;
    }

    const content = await fs.readFile(agentPath, 'utf-8');
    const frontmatter = parseFrontmatter(content);

    return {
      id: agentId,
      moduleId,
      essentialSkills: (frontmatter['essential-skills'] as string[]) || undefined,
      capabilityNeeds: (frontmatter['capability-needs'] as string[]) || [],
      availableSkills: (frontmatter['available-skills'] as string[]) || undefined,
      tokenBudget: (frontmatter['token-budget'] as number) || 0,
      sourcePath: agentPath,
      variant: (frontmatter['variant'] as 'full' | 'slim') || 'full',
      delegatesTo: (frontmatter['delegates-to'] as string[]) || [],
      parentAgent: (frontmatter['parent-agent'] as string) || undefined,
    };
  }

  /**
   * Load skill definition from markdown file
   * Searches recursively in skills/ to handle taxonomy subdirectories
   */
  private async loadSkillDefinition(
    moduleId: string,
    skillId: string
  ): Promise<SkillDefinition | null> {
    const module = this.modules.get(moduleId);
    if (!module || !module._sourcePath) return null;

    const skillsDir = path.join(module._sourcePath, 'skills');
    if (!await fs.pathExists(skillsDir)) {
      return null;
    }

    // Recursively search for SKILL.md file matching skillId
    const skillPath = await this.findSkillPath(skillsDir, skillId);
    if (!skillPath) {
      return null;
    }

    const content = await fs.readFile(skillPath, 'utf-8');
    const frontmatter = parseFrontmatter(content);

    return {
      id: skillId,
      moduleId,
      capabilitiesProvided: (frontmatter['capabilities-provided'] as string[]) || [],
      description: (frontmatter['description'] as string) || undefined,
      sourcePath: skillPath,
    };
  }

  /**
   * Recursively find SKILL.md file for a given skill ID
   * Handles taxonomy subdirectories (e.g., skills/shared/skill-name/ or skills/taxonomy/skill-name/)
   */
  private async findSkillPath(baseDir: string, skillId: string): Promise<string | null> {
    try {
      const entries = await fs.readdir(baseDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const entryPath = path.join(baseDir, entry.name);

        // Check if this directory is the skill directory (contains SKILL.md)
        if (entry.name === skillId) {
          const skillMdPath = path.join(entryPath, 'SKILL.md');
          if (await fs.pathExists(skillMdPath)) {
            return skillMdPath;
          }
        }

        // Recurse into subdirectories (taxonomy structure)
        const foundPath = await this.findSkillPath(entryPath, skillId);
        if (foundPath) {
          return foundPath;
        }
      }

      return null;
    } catch (_error) {
      return null;
    }
  }
}
