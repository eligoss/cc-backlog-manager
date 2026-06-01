/**
 * Integration tests for structuring-code skill
 *
 * These tests verify that the new skill is properly integrated with:
 * 1. Module registration (module.json)
 * 2. Discovery engine (capability resolution)
 * 3. Skill metadata parsing (YAML frontmatter)
 * 4. Supporting files existence
 */

import path from 'path';
import fs from 'fs-extra';
import matter from 'gray-matter';
import { DiscoveryEngine } from '../discovery-engine';
import { parseSkillMetadata, findSkillById } from '../skill-cli-parser';

// Resolve paths relative to __dirname (framework/cli/src/lib/__tests__/)
const CLI_SRC_LIB = path.resolve(__dirname, '..'); // framework/cli/src/lib/
const CLI_SRC = path.dirname(CLI_SRC_LIB); // framework/cli/src/
const CLI_ROOT = path.dirname(CLI_SRC); // framework/cli/
const FRAMEWORK_DIR = path.dirname(CLI_ROOT); // framework/
const PROJECT_ROOT = path.dirname(FRAMEWORK_DIR); // agentic-development-framework/
const MODULES_PATH = path.join(FRAMEWORK_DIR, 'modules');
const SKILL_PATH = path.join(
  MODULES_PATH,
  'coding/skills/coding/structuring-code'
);

describe('structuring-code Skill Integration', () => {
  describe('Skill Files Existence', () => {
    it('should have SKILL.md file', async () => {
      const skillFile = path.join(SKILL_PATH, 'SKILL.md');
      expect(await fs.pathExists(skillFile)).toBe(true);
    });

    it('should have FILE-ORGANIZATION.md supporting file', async () => {
      const file = path.join(SKILL_PATH, 'FILE-ORGANIZATION.md');
      expect(await fs.pathExists(file)).toBe(true);
    });

    it('should have READABILITY.md supporting file', async () => {
      const file = path.join(SKILL_PATH, 'READABILITY.md');
      expect(await fs.pathExists(file)).toBe(true);
    });

    it('should have DRY-PRINCIPLES.md supporting file', async () => {
      const file = path.join(SKILL_PATH, 'DRY-PRINCIPLES.md');
      expect(await fs.pathExists(file)).toBe(true);
    });

    it('should have CHECKLISTS.md supporting file', async () => {
      const file = path.join(SKILL_PATH, 'CHECKLISTS.md');
      expect(await fs.pathExists(file)).toBe(true);
    });
  });

  describe('SKILL.md Metadata Parsing', () => {
    let metadata: Awaited<ReturnType<typeof parseSkillMetadata>>;

    beforeAll(async () => {
      const skillFile = path.join(SKILL_PATH, 'SKILL.md');
      metadata = await parseSkillMetadata(skillFile);
    });

    it('should have correct skill id', () => {
      expect(metadata.id).toBe('structuring-code');
    });

    it('should have correct module', () => {
      expect(metadata.module).toBe('coding');
    });

    it('should have name', () => {
      expect(metadata.name).toBe('Organizing Code Structure');
    });

    it('should have description', () => {
      expect(metadata.description).toBeDefined();
      expect(metadata.description).toContain('Code organization');
    });
  });

  describe('SKILL.md YAML Frontmatter Validation', () => {
    let frontmatter: Record<string, unknown>;

    beforeAll(async () => {
      const skillFile = path.join(SKILL_PATH, 'SKILL.md');
      const content = await fs.readFile(skillFile, 'utf-8');
      const { data } = matter(content);
      frontmatter = data;
    });

    it('should have generic scope', () => {
      expect(frontmatter.scope).toBe('generic');
    });

    it('should be applicable to any project', () => {
      expect(frontmatter['applicable-projects']).toBe('any');
    });

    it('should provide code-organization capability', () => {
      const capabilities = frontmatter['capabilities-provided'] as string[];
      expect(capabilities).toContain('code-organization');
    });

    it('should provide file-structure-guidance capability', () => {
      const capabilities = frontmatter['capabilities-provided'] as string[];
      expect(capabilities).toContain('file-structure-guidance');
    });

    it('should provide readability-assessment capability', () => {
      const capabilities = frontmatter['capabilities-provided'] as string[];
      expect(capabilities).toContain('readability-assessment');
    });
  });

  describe('Module Registration', () => {
    let moduleJson: {
      id: string;
      provides: {
        skills: string[];
        capabilities: string[];
      };
    };

    beforeAll(async () => {
      const moduleJsonPath = path.join(MODULES_PATH, 'coding/module.json');
      moduleJson = await fs.readJson(moduleJsonPath);
    });

    it('should be registered in coding module skills', () => {
      expect(moduleJson.provides.skills).toContain('structuring-code');
    });

    it('should have code-organization capability in module', () => {
      expect(moduleJson.provides.capabilities).toContain('code-organization');
    });

    it('should be listed alongside other coding skills', () => {
      expect(moduleJson.provides.skills).toContain('implementing-code');
      expect(moduleJson.provides.skills).toContain('designing-architecture');
    });
  });

  describe('Discovery Engine Integration', () => {
    let engine: DiscoveryEngine;

    beforeAll(() => {
      // DiscoveryEngine expects the framework directory (parent of modules/)
      engine = new DiscoveryEngine(FRAMEWORK_DIR);
    });

    it('should load coding module with the new skill', async () => {
      const modulesMap = await engine.loadModules();
      const codingModule = modulesMap.get('coding');

      expect(codingModule).toBeDefined();
      expect(codingModule?.provides.skills).toContain('structuring-code');
    });

    it('should include code-organization in capability map', async () => {
      const capabilityMap = await engine.buildCapabilityMap();

      expect(capabilityMap.get('code-organization')).toBeDefined();
      expect(capabilityMap.get('code-organization')).toContain(
        'structuring-code'
      );
    });

    it('should discover skill for agent needing code-organization capability', async () => {
      // Simulate an agent with code-organization capability need
      const mockAgent = {
        id: 'test-agent',
        capabilityNeeds: ['code-organization'],
      };

      const capabilityMap = await engine.buildCapabilityMap();
      const discoveredSkills: string[] = [];

      for (const capability of mockAgent.capabilityNeeds) {
        const skills = capabilityMap.get(capability);
        if (skills) {
          discoveredSkills.push(...skills);
        }
      }

      expect(discoveredSkills).toContain('structuring-code');
    });

    it('should discover all coding module skills via getAllSkills', async () => {
      const allSkills = await engine.getAllSkills();
      // SkillDefinition uses moduleId, not module
      const codingSkills = allSkills.filter((s) => s.moduleId === 'coding');

      const skillIds = codingSkills.map((s) => s.id);
      expect(skillIds).toContain('structuring-code');
      expect(skillIds).toContain('implementing-code');
      expect(skillIds).toContain('designing-architecture');
    });

    it('should have correct capabilitiesProvided in SkillDefinition', async () => {
      const allSkills = await engine.getAllSkills();
      const skill = allSkills.find((s) => s.id === 'structuring-code');

      expect(skill).toBeDefined();
      expect(skill?.capabilitiesProvided).toContain('code-organization');
      expect(skill?.capabilitiesProvided).toContain('file-structure-guidance');
      expect(skill?.capabilitiesProvided).toContain('readability-assessment');
    });
  });

  describe('Skill CLI Parser Integration', () => {
    it('should find skill by id using findSkillById', async () => {
      // findSkillById takes (projectRoot, skillId) - it looks for framework/modules/*/skills/**
      const skill = await findSkillById(PROJECT_ROOT, 'structuring-code');

      expect(skill).toBeDefined();
      expect(skill?.id).toBe('structuring-code');
      expect(skill?.module).toBe('coding');
    });

    it('should not have cli-commands (this is a knowledge skill)', async () => {
      const skill = await findSkillById(PROJECT_ROOT, 'structuring-code');

      // This skill provides guidance, not CLI commands
      expect(skill?.cliCommands).toBeUndefined();
    });
  });

  describe('Skill Content Quality', () => {
    let skillContent: string;

    beforeAll(async () => {
      const skillFile = path.join(SKILL_PATH, 'SKILL.md');
      skillContent = await fs.readFile(skillFile, 'utf-8');
    });

    it('should have "When to Use This Skill" section', () => {
      expect(skillContent).toContain('## When to Use This Skill');
    });

    it('should have "Quick Start" section', () => {
      expect(skillContent).toContain('## Quick Start');
    });

    it('should have "Instructions" section', () => {
      expect(skillContent).toContain('## Instructions');
    });

    it('should have "Common Patterns" section', () => {
      expect(skillContent).toContain('## Common Patterns');
    });

    it('should have "See Also" section with links to supporting files', () => {
      expect(skillContent).toContain('## See Also');
      expect(skillContent).toContain('FILE-ORGANIZATION.md');
      expect(skillContent).toContain('READABILITY.md');
      expect(skillContent).toContain('DRY-PRINCIPLES.md');
      expect(skillContent).toContain('CHECKLISTS.md');
    });

    it('should reference related skills', () => {
      expect(skillContent).toContain('implementing-code');
      expect(skillContent).toContain('designing-architecture');
    });

    it('should be under 500 lines (progressive disclosure)', async () => {
      const lineCount = skillContent.split('\n').length;
      expect(lineCount).toBeLessThan(500);
    });
  });

  describe('Supporting Files Content', () => {
    it('FILE-ORGANIZATION.md should cover key topics', async () => {
      const content = await fs.readFile(
        path.join(SKILL_PATH, 'FILE-ORGANIZATION.md'),
        'utf-8'
      );

      expect(content).toContain('One Responsibility Per File');
      expect(content).toContain('File Size');
      expect(content).toContain('Directory Structure');
      // The section is "Naming Files" not "File Naming"
      expect(content).toContain('Naming');
    });

    it('READABILITY.md should cover key topics', async () => {
      const content = await fs.readFile(
        path.join(SKILL_PATH, 'READABILITY.md'),
        'utf-8'
      );

      expect(content).toContain('Self-Descriptive Naming');
      expect(content).toContain('Function Design');
      expect(content).toContain('Comment');
      expect(content).toContain('Consistent Style');
    });

    it('DRY-PRINCIPLES.md should cover key topics', async () => {
      const content = await fs.readFile(
        path.join(SKILL_PATH, 'DRY-PRINCIPLES.md'),
        'utf-8'
      );

      expect(content).toContain('Duplication');
      expect(content).toContain('When to Extract');
      expect(content).toContain('When NOT to Extract');
      expect(content).toContain('Abstraction');
    });

    it('CHECKLISTS.md should have structured checklists', async () => {
      const content = await fs.readFile(
        path.join(SKILL_PATH, 'CHECKLISTS.md'),
        'utf-8'
      );

      expect(content).toContain('File Organization Checklist');
      expect(content).toContain('Readability Checklist');
      expect(content).toContain('DRY Compliance Checklist');
      expect(content).toContain('[ ]'); // Checklist items
    });
  });
});
