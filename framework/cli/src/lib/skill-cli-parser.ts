import fs from 'fs-extra';
import fg from 'fast-glob';
import matter from 'gray-matter';

/**
 * CLI command configuration from skill frontmatter
 */
export interface CliCommandConfig {
  command: string;
  description: string;
  options: string[];
  template?: string;
  schema?: string;
  rules?: string;
}

/**
 * Skill CLI metadata
 */
export interface SkillCliMetadata {
  id: string;
  module: string;
  cliCommands?: Record<string, CliCommandConfig>;
}

/**
 * Extended skill metadata with file path
 */
export interface SkillMetadata extends SkillCliMetadata {
  filePath: string;
  name?: string;
  description?: string;
}

/**
 * Parse CLI commands from a skill file
 * @param skillPath - Path to SKILL.md file
 * @returns Skill CLI metadata
 */
export async function parseSkillCli(skillPath: string): Promise<SkillCliMetadata> {
  // Read file content
  const content = await fs.readFile(skillPath, 'utf-8');

  // Parse frontmatter
  const { data } = matter(content);

  // Extract required fields
  const id = data.id;
  const module = data.module;

  if (!id) {
    throw new Error(`Skill at ${skillPath} is missing required field: id`);
  }

  if (!module) {
    throw new Error(`Skill at ${skillPath} is missing required field: module`);
  }

  // Extract CLI commands if present
  const cliCommands = data['cli-commands'] as Record<string, CliCommandConfig> | undefined;

  return {
    id,
    module,
    cliCommands,
  };
}

/**
 * Parse full skill metadata including CLI commands
 * @param skillPath - Path to SKILL.md file
 * @returns Full skill metadata
 */
export async function parseSkillMetadata(skillPath: string): Promise<SkillMetadata> {
  const content = await fs.readFile(skillPath, 'utf-8');
  const { data } = matter(content);

  const id = data.id;
  const module = data.module;

  if (!id) {
    throw new Error(`Skill at ${skillPath} is missing required field: id`);
  }

  if (!module) {
    throw new Error(`Skill at ${skillPath} is missing required field: module`);
  }

  const cliCommands = data['cli-commands'] as Record<string, CliCommandConfig> | undefined;

  return {
    id,
    module,
    name: data.name,
    description: data.description,
    cliCommands,
    filePath: skillPath,
  };
}

/**
 * Find all SKILL.md files in framework
 * @param frameworkRoot - Root directory of the framework
 * @returns Array of skill file paths
 */
async function findSkillFiles(frameworkRoot: string): Promise<string[]> {
  // Look in framework/core/skills and framework/modules/*/skills
  const patterns = [
    'framework/core/skills/**/SKILL.md',
    'framework/modules/*/skills/**/SKILL.md',
  ];

  const files: string[] = [];

  for (const pattern of patterns) {
    const matches = await fg(pattern, {
      cwd: frameworkRoot,
      absolute: true,
      followSymbolicLinks: false,
    });
    files.push(...matches);
  }

  return files;
}

/**
 * Get all skills with CLI commands
 * @param frameworkRoot - Root directory of the framework
 * @returns Array of skill CLI metadata for skills that have CLI commands
 */
export async function getAllSkillsWithCli(
  frameworkRoot: string
): Promise<SkillCliMetadata[]> {
  const skillFiles = await findSkillFiles(frameworkRoot);

  const skills: SkillCliMetadata[] = [];

  for (const skillPath of skillFiles) {
    try {
      const metadata = await parseSkillCli(skillPath);

      // Only include skills that have CLI commands
      if (metadata.cliCommands && Object.keys(metadata.cliCommands).length > 0) {
        skills.push(metadata);
      }
    } catch (error) {
      // Log warning but continue processing other skills
      console.warn(`Warning: Failed to parse skill at ${skillPath}:`, error);
    }
  }

  return skills;
}

/**
 * Get all skills (including those without CLI commands)
 * @param frameworkRoot - Root directory of the framework
 * @returns Array of full skill metadata
 */
export async function getAllSkills(frameworkRoot: string): Promise<SkillMetadata[]> {
  const skillFiles = await findSkillFiles(frameworkRoot);

  const skills: SkillMetadata[] = [];

  for (const skillPath of skillFiles) {
    try {
      const metadata = await parseSkillMetadata(skillPath);
      skills.push(metadata);
    } catch (error) {
      // Log warning but continue processing other skills
      console.warn(`Warning: Failed to parse skill at ${skillPath}:`, error);
    }
  }

  return skills;
}

/**
 * Find a specific skill by ID
 * @param frameworkRoot - Root directory of the framework
 * @param skillId - Skill ID to find
 * @returns Skill metadata or null if not found
 */
export async function findSkillById(
  frameworkRoot: string,
  skillId: string
): Promise<SkillMetadata | null> {
  const skills = await getAllSkills(frameworkRoot);
  return skills.find((s) => s.id === skillId) || null;
}

/**
 * Find skills by module
 * @param frameworkRoot - Root directory of the framework
 * @param moduleName - Module name to filter by
 * @returns Array of skill metadata for the module
 */
export async function findSkillsByModule(
  frameworkRoot: string,
  moduleName: string
): Promise<SkillMetadata[]> {
  const skills = await getAllSkills(frameworkRoot);
  return skills.filter((s) => s.module === moduleName);
}

/**
 * Validate CLI command configuration
 * @param config - CLI command configuration to validate
 * @returns True if valid, throws error otherwise
 */
export function validateCliCommand(config: CliCommandConfig): boolean {
  if (!config.command) {
    throw new Error('CLI command is missing required field: command');
  }

  if (!config.description) {
    throw new Error('CLI command is missing required field: description');
  }

  if (!Array.isArray(config.options)) {
    throw new Error('CLI command options must be an array');
  }

  return true;
}

/**
 * Get CLI command by name from skill
 * @param skillPath - Path to skill file
 * @param commandName - Command name to retrieve
 * @returns CLI command configuration or null if not found
 */
export async function getCliCommand(
  skillPath: string,
  commandName: string
): Promise<CliCommandConfig | null> {
  const metadata = await parseSkillCli(skillPath);

  if (!metadata.cliCommands) {
    return null;
  }

  return metadata.cliCommands[commandName] || null;
}
