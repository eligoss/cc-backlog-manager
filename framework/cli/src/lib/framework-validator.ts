import path from 'path';
import fs from 'fs-extra';
import { DiscoveryEngine } from './discovery-engine.js';

export interface ValidationIssue {
  type: 'error' | 'warning';
  category: 'capability' | 'module' | 'skill' | 'agent';
  message: string;
  details?: {
    agentId?: string;
    skillId?: string;
    moduleId?: string;
    capability?: string;
    file?: string;
    category?: string;
    level?: string;
    tokenBudget?: number;
    delegatesTo?: string;
    searchPath?: string;
  };
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  stats: {
    checked: number;
    passed: number;
    failed: number;
  };
}

export interface ValidationReport {
  overall: boolean;
  timestamp: string;
  capabilityResolution: ValidationResult;
  moduleDeclarations: ValidationResult;
  skillCapabilities: ValidationResult;
  agentVariants: ValidationResult;
  essentialAndAvailableSkills: ValidationResult;
}

export class FrameworkValidator {
  constructor(
    private engine: DiscoveryEngine,
    private frameworkRoot: string,
    private projectPath: string = frameworkRoot // Default to frameworkRoot for backwards compat
  ) {}

  /**
   * Validate that all agent capability needs can be resolved to skills
   */
  async validateCapabilityResolution(): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let checked = 0;
    let passed = 0;

    try {
      const agents = await this.engine.getAllAgents();
      checked = agents.length;

      for (const agent of agents) {
        const discovery = await this.engine.discoverSkillsForAgent(agent.id);

        if (discovery.unfulfilledCapabilities.length > 0) {
          for (const capability of discovery.unfulfilledCapabilities) {
            issues.push({
              type: 'error',
              category: 'capability',
              message: `Agent '${agent.id}' requires capability '${capability}' but no skill provides it`,
              details: {
                agentId: agent.id,
                capability,
                moduleId: agent.moduleId,
              },
            });
          }
        } else {
          passed++;
        }
      }
    } catch (error) {
      issues.push({
        type: 'error',
        category: 'capability',
        message: `Failed to validate capability resolution: ${error instanceof Error ? error.message : String(error)}`,
      });
    }

    return {
      valid: issues.length === 0,
      issues,
      stats: {
        checked,
        passed,
        failed: checked - passed,
      },
    };
  }

  /**
   * Validate that module declarations match filesystem structure
   */
  async validateModuleDeclarations(): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let checked = 0;
    let passed = 0;

    try {
      // Use getLoadedModules() to avoid clearing the modules map
      const modules = this.engine.getLoadedModules();
      checked = modules.size;

      for (const [moduleId, manifest] of modules) {
        if (!manifest._sourcePath) {
          continue;
        }

        let modulePassed = true;

        // Validate agents
        if (manifest.provides?.agents) {
          for (const agentId of manifest.provides.agents) {
            const agentPath = path.join(manifest._sourcePath, 'agents', `${agentId}.md`);

            if (!(await fs.pathExists(agentPath))) {
              issues.push({
                type: 'error',
                category: 'module',
                message: `Module '${moduleId}' declares agent '${agentId}' but file does not exist`,
                details: {
                  moduleId,
                  agentId,
                  file: agentPath,
                },
              });
              modulePassed = false;
            }
          }
        }

        // Validate skills
        if (manifest.provides?.skills) {
          for (const skillId of manifest.provides.skills) {
            const skillsSourceDir = path.join(manifest._sourcePath, 'skills');

            // Recursively find skill directory (handles taxonomy structures)
            const skillDir = await this.findSkillDirectory(skillsSourceDir, skillId);

            if (!skillDir) {
              issues.push({
                type: 'error',
                category: 'module',
                message: `Module '${moduleId}' declares skill '${skillId}' but directory does not exist`,
                details: {
                  moduleId,
                  skillId,
                  searchPath: skillsSourceDir,
                },
              });
              modulePassed = false;
            }
          }
        }

        if (modulePassed) {
          passed++;
        }
      }
    } catch (error) {
      issues.push({
        type: 'error',
        category: 'module',
        message: `Failed to validate module declarations: ${error instanceof Error ? error.message : String(error)}`,
      });
    }

    return {
      valid: issues.length === 0,
      issues,
      stats: {
        checked,
        passed,
        failed: checked - passed,
      },
    };
  }

  /**
   * Validate that skill capabilities match module declarations
   */
  async validateSkillCapabilities(): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let checked = 0;
    let passed = 0;

    try {
      const skills = await this.engine.getAllSkills();
      // Use getLoadedModules() to avoid clearing the modules map
      const modules = this.engine.getLoadedModules();
      checked = skills.length;

      for (const skill of skills) {
        const module = modules.get(skill.moduleId);
        if (!module) {
          issues.push({
            type: 'error',
            category: 'skill',
            message: `Skill '${skill.id}' references non-existent module '${skill.moduleId}'`,
            details: {
              skillId: skill.id,
              moduleId: skill.moduleId,
            },
          });
          continue;
        }

        let skillPassed = true;

        // Check if skill capabilities are declared in module
        const moduleCapabilities = module.provides?.capabilities || [];
        for (const capability of skill.capabilitiesProvided) {
          if (!moduleCapabilities.includes(capability)) {
            issues.push({
              type: 'warning',
              category: 'skill',
              message: `Skill '${skill.id}' provides capability '${capability}' not declared in module manifest`,
              details: {
                skillId: skill.id,
                moduleId: skill.moduleId,
                capability,
              },
            });
            skillPassed = false;
          }
        }

        if (skillPassed) {
          passed++;
        }
      }

      // Also validate that all module-declared capabilities are provided by some skill
      for (const [moduleId, module] of modules) {
        const moduleCapabilities = module.provides?.capabilities || [];
        const skillIds = module.provides?.skills || [];

        for (const capability of moduleCapabilities) {
          let found = false;

          for (const skillId of skillIds) {
            const skill = skills.find((s) => s.id === skillId && s.moduleId === moduleId);
            if (skill && skill.capabilitiesProvided.includes(capability)) {
              found = true;
              break;
            }
          }

          if (!found) {
            issues.push({
              type: 'warning',
              category: 'skill',
              message: `Module '${moduleId}' declares capability '${capability}' but no skill provides it`,
              details: {
                moduleId,
                capability,
              },
            });
          }
        }
      }
    } catch (error) {
      issues.push({
        type: 'error',
        category: 'skill',
        message: `Failed to validate skill capabilities: ${error instanceof Error ? error.message : String(error)}`,
      });
    }

    return {
      valid: issues.filter((i) => i.type === 'error').length === 0,
      issues,
      stats: {
        checked,
        passed,
        failed: issues.filter((i) => i.type === 'error').length,
      },
    };
  }

  /**
   * Validate agent variant declarations and constraints
   */
  async validateAgentVariants(): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let checked = 0;

    try {
      const agents = await this.engine.getAllAgents();

      for (const agent of agents) {
        checked++;
        const variant = agent.variant || 'full';

        // Slim agent validations
        if (variant === 'slim') {
          // Must have parent-agent
          if (!agent.parentAgent) {
            issues.push({
              type: 'error',
              category: 'agent',
              message: `Slim agent '${agent.id}' must declare parent-agent in frontmatter`,
              details: { agentId: agent.id },
            });
          }

          // Token budget must be <= 1000
          if (agent.tokenBudget > 1000) {
            issues.push({
              type: 'warning',
              category: 'agent',
              message: `Slim agent '${agent.id}' exceeds recommended 1000 token budget (has ${agent.tokenBudget})`,
              details: { agentId: agent.id, tokenBudget: agent.tokenBudget },
            });
          }
        }

        // Full agent validations
        if (variant === 'full' && agent.delegatesTo && agent.delegatesTo.length > 0) {
          // Verify delegated agents exist
          for (const slimId of agent.delegatesTo) {
            const slimExists = agents.some(a => a.id === slimId);
            if (!slimExists) {
              issues.push({
                type: 'error',
                category: 'agent',
                message: `Agent '${agent.id}' delegates to non-existent agent '${slimId}'`,
                details: { agentId: agent.id, delegatesTo: slimId },
              });
            } else {
              const slimAgent = agents.find(a => a.id === slimId);
              if (slimAgent && slimAgent.variant !== 'slim') {
                issues.push({
                  type: 'warning',
                  category: 'agent',
                  message: `Agent '${agent.id}' delegates to '${slimId}' which is not marked as slim variant`,
                  details: { agentId: agent.id, delegatesTo: slimId },
                });
              }
            }
          }
        }
      }
    } catch (error) {
      issues.push({
        type: 'error',
        category: 'agent',
        message: `Failed to validate agent variants: ${error instanceof Error ? error.message : String(error)}`,
      });
    }

    return {
      valid: issues.filter(i => i.type === 'error').length === 0,
      issues,
      stats: {
        checked,
        passed: checked - issues.filter(i => i.type === 'error').length,
        failed: issues.filter(i => i.type === 'error').length,
      },
    };
  }

  /**
   * Validate essential-skills and available-skills references
   */
  async validateEssentialAndAvailableSkills(): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let checked = 0;
    let passed = 0;

    try {
      const agents = await this.engine.getAllAgents();
      const skills = await this.engine.getAllSkills();
      const skillIds = new Set(skills.map(s => s.id));

      for (const agent of agents) {
        checked++;
        let agentPassed = true;

        // Validate essential-skills references
        if (agent.essentialSkills && agent.essentialSkills.length > 0) {
          for (const skillId of agent.essentialSkills) {
            if (!skillIds.has(skillId)) {
              issues.push({
                type: 'error',
                category: 'skill',
                message: `Agent '${agent.id}' declares essential-skill '${skillId}' but skill does not exist`,
                details: {
                  agentId: agent.id,
                  skillId,
                },
              });
              agentPassed = false;
            }
          }
        }

        // Validate available-skills references
        if (agent.availableSkills && agent.availableSkills.length > 0) {
          for (const skillId of agent.availableSkills) {
            if (!skillIds.has(skillId)) {
              issues.push({
                type: 'error',
                category: 'skill',
                message: `Agent '${agent.id}' declares available-skill '${skillId}' but skill does not exist`,
                details: {
                  agentId: agent.id,
                  skillId,
                },
              });
              agentPassed = false;
            }
          }
        }

        // Warn if skill appears in both essential and discovered via capabilities
        if (agent.essentialSkills && agent.essentialSkills.length > 0 && agent.capabilityNeeds && agent.capabilityNeeds.length > 0) {
          const discovery = await this.engine.discoverSkillsForAgent(agent.id);
          const discoveredSkillIds = new Set(discovery.skills);

          for (const essentialSkill of agent.essentialSkills) {
            if (discoveredSkillIds.has(essentialSkill)) {
              issues.push({
                type: 'warning',
                category: 'skill',
                message: `Agent '${agent.id}' has skill '${essentialSkill}' in both essential-skills and discovered via capability-needs (will be loaded once)`,
                details: {
                  agentId: agent.id,
                  skillId: essentialSkill,
                },
              });
            }
          }
        }

        // Warn if skill appears in both essential and available (logical conflict)
        if (agent.essentialSkills && agent.availableSkills) {
          const essentialSet = new Set(agent.essentialSkills);
          for (const availableSkill of agent.availableSkills) {
            if (essentialSet.has(availableSkill)) {
              issues.push({
                type: 'warning',
                category: 'skill',
                message: `Agent '${agent.id}' has skill '${availableSkill}' in both essential-skills and available-skills (essential takes precedence)`,
                details: {
                  agentId: agent.id,
                  skillId: availableSkill,
                },
              });
            }
          }
        }

        if (agentPassed) {
          passed++;
        }
      }
    } catch (error) {
      issues.push({
        type: 'error',
        category: 'skill',
        message: `Failed to validate essential and available skills: ${error instanceof Error ? error.message : String(error)}`,
      });
    }

    return {
      valid: issues.filter(i => i.type === 'error').length === 0,
      issues,
      stats: {
        checked,
        passed,
        failed: checked - passed,
      },
    };
  }

  /**
   * Recursively find a skill directory by ID within a source directory.
   * Handles taxonomy structures like skills/coding/coding-architecture-patterns/.
   *
   * @param sourceDir - Root directory to search for skills
   * @param skillId - ID of the skill to find
   * @returns Path to skill directory if found, null otherwise
   */
  private async findSkillDirectory(sourceDir: string, skillId: string): Promise<string | null> {
    if (!(await fs.pathExists(sourceDir))) {
      return null;
    }

    const entries = await fs.readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const fullPath = path.join(sourceDir, entry.name);
      const skillMdPath = path.join(fullPath, 'SKILL.md');

      // Check if this directory is the skill we're looking for
      if (entry.name === skillId && (await fs.pathExists(skillMdPath))) {
        return fullPath;
      }

      // Recurse into subdirectories (taxonomy structure)
      const found = await this.findSkillDirectory(fullPath, skillId);
      if (found) return found;
    }

    return null;
  }

  /**
   * Run all validations and generate a comprehensive report
   */
  async validateAll(): Promise<ValidationReport> {
    const results = await Promise.all([
      this.validateCapabilityResolution(),
      this.validateModuleDeclarations(),
      this.validateSkillCapabilities(),
      this.validateAgentVariants(),
      this.validateEssentialAndAvailableSkills(),
    ]);

    const [capabilityResolution, moduleDeclarations, skillCapabilities, agentVariants, essentialAndAvailableSkills] = results;

    const overall =
      capabilityResolution.valid &&
      moduleDeclarations.valid &&
      skillCapabilities.valid &&
      agentVariants.valid &&
      essentialAndAvailableSkills.valid;

    return {
      overall,
      timestamp: new Date().toISOString(),
      capabilityResolution,
      moduleDeclarations,
      skillCapabilities,
      agentVariants,
      essentialAndAvailableSkills,
    };
  }
}
