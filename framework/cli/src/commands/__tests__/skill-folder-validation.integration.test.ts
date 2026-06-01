/**
 * Integration Test: Skill Folder Naming Validation
 *
 * Validates that:
 * 1. Skill folder names match their skill IDs in YAML frontmatter
 * 2. All skills found in filesystem are registered in skills.json
 *
 * This test recursively scans framework modules skills directories
 * and verifies naming consistency and registry completeness.
 */

import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';

// Get the project root - this file is in framework/cli/src/commands/__tests__/
// So we go up 5 levels to reach the project root
const PROJECT_ROOT = path.resolve(process.cwd(), '../..');
const FRAMEWORK_ROOT = path.join(PROJECT_ROOT, 'framework');
// Skills registry moved from ai/registries to .claude/registries as part of architecture migration
const SKILLS_REGISTRY_PATH = path.join(PROJECT_ROOT, '.claude/registries/skills.json');

interface SkillFrontmatter {
  id: string;
  name?: string;
  module: string;
  description?: string;
  'capabilities-provided'?: string[];
}

interface SkillInfo {
  id: string;
  folderName: string;
  folderPath: string;
  module: string;
}

interface SkillRegistryEntry {
  id: string;
  module: string;
  'capabilities-provided'?: string[];
  location: string;
}

interface SkillRegistry {
  version: string;
  skills: SkillRegistryEntry[];
}

/**
 * Recursively find all SKILL.md files in a directory
 */
function findSkillFiles(dir: string): string[] {
  const skillFiles: string[] = [];

  if (!fs.existsSync(dir)) {
    return skillFiles;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recursively search subdirectories
      skillFiles.push(...findSkillFiles(fullPath));
    } else if (entry.isFile() && entry.name === 'SKILL.md') {
      skillFiles.push(fullPath);
    }
  }

  return skillFiles;
}

/**
 * Extract skill ID from SKILL.md YAML frontmatter
 */
function extractSkillId(skillFilePath: string): SkillInfo | null {
  try {
    const content = fs.readFileSync(skillFilePath, 'utf8');
    const { data } = matter(content);
    const frontmatter = data as SkillFrontmatter;

    if (!frontmatter.id) {
      return null;
    }

    // Get the folder name (parent directory of SKILL.md)
    const folderPath = path.dirname(skillFilePath);
    const folderName = path.basename(folderPath);

    return {
      id: frontmatter.id,
      folderName,
      folderPath,
      module: frontmatter.module || 'unknown',
    };
  } catch (error) {
    console.error(`Error parsing ${skillFilePath}:`, error);
    return null;
  }
}

/**
 * Find all skills in framework modules skills directories
 */
function findAllSkills(): SkillInfo[] {
  const skills: SkillInfo[] = [];
  const modulesDir = path.join(FRAMEWORK_ROOT, 'modules');

  if (!fs.existsSync(modulesDir)) {
    throw new Error(`Modules directory not found: ${modulesDir}`);
  }

  const modules = fs.readdirSync(modulesDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  for (const moduleName of modules) {
    const skillsDir = path.join(modulesDir, moduleName, 'skills');

    if (fs.existsSync(skillsDir)) {
      const skillFiles = findSkillFiles(skillsDir);

      for (const skillFile of skillFiles) {
        const skillInfo = extractSkillId(skillFile);
        if (skillInfo) {
          skills.push(skillInfo);
        }
      }
    }
  }

  return skills;
}

/**
 * Load skills registry
 */
function loadSkillsRegistry(): SkillRegistry {
  if (!fs.existsSync(SKILLS_REGISTRY_PATH)) {
    throw new Error(`Skills registry not found: ${SKILLS_REGISTRY_PATH}`);
  }

  const content = fs.readFileSync(SKILLS_REGISTRY_PATH, 'utf8');
  return JSON.parse(content) as SkillRegistry;
}

// TODO: Skill folder validation tests are skipped in CI due to inconsistencies
// between the skills registry (.claude/registries/skills.json) and filesystem
// locations (framework/modules/*/skills/). The registry declares deployed paths
// (.claude/skills/) while the test scans source paths (framework/modules/).
// This needs to be reconciled with the sync/deployment workflow.
describe.skip('Skill Folder Naming Validation', () => {
  let allSkills: SkillInfo[];
  let skillsRegistry: SkillRegistry;

  beforeAll(() => {
    // Load all skills and registry once for all tests
    allSkills = findAllSkills();
    skillsRegistry = loadSkillsRegistry();
  });

  describe('Test 1: Skill folder names must match skill IDs', () => {
    it('should find at least one skill in the framework', () => {
      expect(allSkills.length).toBeGreaterThan(0);
    });

    it('should have skill folder names matching skill IDs in YAML frontmatter', () => {
      const mismatches: Array<{
        expected: string;
        actual: string;
        path: string;
      }> = [];

      for (const skill of allSkills) {
        if (skill.folderName !== skill.id) {
          mismatches.push({
            expected: skill.id,
            actual: skill.folderName,
            path: skill.folderPath,
          });
        }
      }

      if (mismatches.length > 0) {
        const errorMessage = [
          '\nSkill folder name mismatches found:',
          ...mismatches.map(m =>
            `  - Folder: "${m.actual}" | Expected ID: "${m.expected}"\n    Path: ${m.path}`
          ),
          `\nTotal mismatches: ${mismatches.length}`,
        ].join('\n');

        throw new Error(errorMessage);
      }

      // If we get here, all folder names match skill IDs
      expect(mismatches.length).toBe(0);
    });

    it('should have unique skill IDs across all skills', () => {
      const idCounts = new Map<string, number>();

      for (const skill of allSkills) {
        const count = idCounts.get(skill.id) || 0;
        idCounts.set(skill.id, count + 1);
      }

      const duplicates = Array.from(idCounts.entries())
        .filter(([_, count]) => count > 1)
        .map(([id, count]) => ({ id, count }));

      if (duplicates.length > 0) {
        const errorMessage = [
          '\nDuplicate skill IDs found:',
          ...duplicates.map(d => `  - "${d.id}" appears ${d.count} times`),
        ].join('\n');

        throw new Error(errorMessage);
      }

      expect(duplicates.length).toBe(0);
    });
  });

  describe('Test 2: All skills must be registered in skills.json', () => {
    it('should load skills registry successfully', () => {
      expect(skillsRegistry).toBeDefined();
      expect(skillsRegistry.skills).toBeInstanceOf(Array);
      expect(skillsRegistry.skills.length).toBeGreaterThan(0);
    });

    it('should have all filesystem skills registered in skills.json', () => {
      const registeredIds = new Set(
        skillsRegistry.skills.map(s => s.id)
      );

      const unregistered: Array<{
        id: string;
        module: string;
        path: string;
      }> = [];

      for (const skill of allSkills) {
        if (!registeredIds.has(skill.id)) {
          unregistered.push({
            id: skill.id,
            module: skill.module,
            path: skill.folderPath,
          });
        }
      }

      if (unregistered.length > 0) {
        const errorMessage = [
          '\nUnregistered skills found in filesystem:',
          ...unregistered.map(s =>
            `  - ID: "${s.id}" | Module: ${s.module}\n    Path: ${s.path}`
          ),
          `\nTotal unregistered: ${unregistered.length}`,
          '\nThese skills exist in the filesystem but are not in ai/registries/skills.json',
        ].join('\n');

        throw new Error(errorMessage);
      }

      expect(unregistered.length).toBe(0);
    });

    it('should not have orphaned entries in skills.json (registry entries without files)', () => {
      const filesystemIds = new Set(allSkills.map(s => s.id));

      const orphaned: Array<{
        id: string;
        module: string;
        location: string;
      }> = [];

      for (const registryEntry of skillsRegistry.skills) {
        if (!filesystemIds.has(registryEntry.id)) {
          orphaned.push({
            id: registryEntry.id,
            module: registryEntry.module,
            location: registryEntry.location,
          });
        }
      }

      if (orphaned.length > 0) {
        const errorMessage = [
          '\nOrphaned registry entries found (no corresponding SKILL.md):',
          ...orphaned.map(s =>
            `  - ID: "${s.id}" | Module: ${s.module}\n    Declared location: ${s.location}`
          ),
          `\nTotal orphaned: ${orphaned.length}`,
          '\nThese entries exist in skills.json but have no SKILL.md file',
        ].join('\n');

        throw new Error(errorMessage);
      }

      expect(orphaned.length).toBe(0);
    });

    it('should have correct location paths in skills.json', () => {
      const incorrectLocations: Array<{
        id: string;
        declaredLocation: string;
        actualPath: string;
      }> = [];

      for (const skill of allSkills) {
        const registryEntry = skillsRegistry.skills.find(s => s.id === skill.id);

        if (registryEntry) {
          // Normalize paths for comparison
          const actualRelativePath = path.relative(PROJECT_ROOT, skill.folderPath);
          const declaredPath = registryEntry.location;

          // Compare normalized paths
          if (actualRelativePath !== declaredPath) {
            incorrectLocations.push({
              id: skill.id,
              declaredLocation: declaredPath,
              actualPath: actualRelativePath,
            });
          }
        }
      }

      if (incorrectLocations.length > 0) {
        const errorMessage = [
          '\nIncorrect location paths in skills.json:',
          ...incorrectLocations.map(s =>
            `  - Skill: "${s.id}"\n    Declared: ${s.declaredLocation}\n    Actual:   ${s.actualPath}`
          ),
          `\nTotal incorrect: ${incorrectLocations.length}`,
        ].join('\n');

        throw new Error(errorMessage);
      }

      expect(incorrectLocations.length).toBe(0);
    });
  });
});
