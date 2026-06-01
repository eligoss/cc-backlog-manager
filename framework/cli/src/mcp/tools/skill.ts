/**
 * Skill MCP Tools
 *
 * MCP tools for managing skills: deploy, list, remove, info, pull.
 *
 * @module mcp/tools/skill
 */

import { z } from 'zod';
import { defineTool } from '../tool-registry.js';
import { successResult, errorResult, ErrorCodes } from '../types.js';
import { CliContext } from '../../lib/cli-context.js';
import { GlobalSkillsManager } from '../../lib/global-skills-manager.js';
import path from 'path';
import fs from 'fs-extra';

/**
 * Skill metadata parsed from SKILL.md frontmatter
 */
interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  scope: string;
  module?: string;
  capabilitiesProvided?: string[];
}

/**
 * Parse YAML frontmatter from SKILL.md file
 */
function parseSkillFrontmatter(content: string): SkillMetadata | null {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return null;
  }

  const frontmatter = frontmatterMatch[1];
  const metadata: Partial<SkillMetadata> = {};

  const lines = frontmatter.split('\n');
  let currentKey: string | null = null;
  const capabilitiesProvided: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Handle list items (capabilities-provided)
    if (trimmed.startsWith('-')) {
      if (currentKey === 'capabilities-provided') {
        capabilitiesProvided.push(trimmed.substring(1).trim());
      }
      continue;
    }

    // Handle key-value pairs
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      currentKey = key;

      if (key === 'id') {
        metadata.id = value;
      } else if (key === 'name') {
        metadata.name = value;
      } else if (key === 'description') {
        metadata.description = value;
      } else if (key === 'scope') {
        metadata.scope = value;
      } else if (key === 'module') {
        metadata.module = value;
      }
    }
  }

  if (capabilitiesProvided.length > 0) {
    metadata.capabilitiesProvided = capabilitiesProvided;
  }

  // Validate required fields
  if (!metadata.id || !metadata.scope) {
    return null;
  }

  return metadata as SkillMetadata;
}

/**
 * Find skill directory in project
 */
async function findSkillInProject(ctx: CliContext, skillId: string): Promise<string | null> {
  // Check .claude/skills/{skill-id}/
  const claudeSkillPath = path.join(ctx.projectRoot, '.claude', 'skills', skillId);
  if (await fs.pathExists(path.join(claudeSkillPath, 'SKILL.md'))) {
    return claudeSkillPath;
  }

  // Check .claude/skills/project/{skill-id}/
  const projectSkillPath = path.join(ctx.projectRoot, 'ai', 'skills', 'project', skillId);
  if (await fs.pathExists(path.join(projectSkillPath, 'SKILL.md'))) {
    return projectSkillPath;
  }

  return null;
}

/**
 * Find all generic-scope skills in project
 */
async function findAllGenericSkills(ctx: CliContext): Promise<Array<{ skillId: string; path: string; metadata: SkillMetadata }>> {
  const skills: Array<{ skillId: string; path: string; metadata: SkillMetadata }> = [];

  // Search .claude/skills/
  const claudeSkillsDir = path.join(ctx.projectRoot, '.claude', 'skills');
  if (await fs.pathExists(claudeSkillsDir)) {
    const entries = await fs.readdir(claudeSkillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(claudeSkillsDir, entry.name);
        const skillMdPath = path.join(skillPath, 'SKILL.md');
        if (await fs.pathExists(skillMdPath)) {
          const content = await fs.readFile(skillMdPath, 'utf-8');
          const metadata = parseSkillFrontmatter(content);
          if (metadata && metadata.scope === 'generic') {
            skills.push({ skillId: entry.name, path: skillPath, metadata });
          }
        }
      }
    }
  }

  // Search .claude/skills/project/
  const projectSkillsDir = path.join(ctx.projectRoot, 'ai', 'skills', 'project');
  if (await fs.pathExists(projectSkillsDir)) {
    const entries = await fs.readdir(projectSkillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(projectSkillsDir, entry.name);
        const skillMdPath = path.join(skillPath, 'SKILL.md');
        if (await fs.pathExists(skillMdPath)) {
          const content = await fs.readFile(skillMdPath, 'utf-8');
          const metadata = parseSkillFrontmatter(content);
          if (metadata && metadata.scope === 'generic') {
            skills.push({ skillId: entry.name, path: skillPath, metadata });
          }
        }
      }
    }
  }

  return skills;
}

/**
 * Schema for skill deploy tool
 */
const SkillDeploySchema = z.object({
  skillId: z.string().optional().describe('Skill ID to deploy (or use all: true)'),
  force: z.boolean().default(false).describe('Overwrite existing global skill'),
  dryRun: z.boolean().default(false).describe('Preview changes without deploying'),
  all: z.boolean().default(false).describe('Deploy all generic-scope skills'),
});

/**
 * Schema for skill list tool
 */
const SkillListSchema = z.object({
  global: z.boolean().default(false).describe('List globally installed skills'),
});

/**
 * Schema for skill remove tool
 */
const SkillRemoveSchema = z.object({
  skillId: z.string().describe('Skill ID to remove'),
  force: z.boolean().default(false).describe('Skip confirmation prompt'),
});

/**
 * Schema for skill info tool
 */
const SkillInfoSchema = z.object({
  skillId: z.string().describe('Skill ID'),
  global: z.boolean().default(false).describe('Show info for globally installed skill'),
});

/**
 * Schema for skill pull tool
 */
const SkillPullSchema = z.object({
  skillId: z.string().describe('Skill ID to pull'),
  force: z.boolean().default(false).describe('Overwrite existing project skill'),
  dryRun: z.boolean().default(false).describe('Preview changes without pulling'),
});

/**
 * Tool: agentic_skill_deploy
 *
 * Deploy skill to global ~/.claude/skills/
 */
export const skillDeployTool = defineTool(
  'agentic_skill_deploy',
  'Deploy skill to global ~/.claude/skills/',
  SkillDeploySchema,
  async (args) => {
    try {
      // Validate arguments
      if (!args.skillId && !args.all) {
        return errorResult(
          ErrorCodes.INVALID_ARGUMENTS,
          'Either provide a skillId or use all: true',
          'Specify which skill to deploy or deploy all generic skills'
        );
      }

      if (args.skillId && args.all) {
        return errorResult(
          ErrorCodes.INVALID_ARGUMENTS,
          'Cannot use both skillId and all: true',
          'Choose one deployment mode'
        );
      }

      const ctx = await CliContext.require();
      const manager = new GlobalSkillsManager();

      // Deploy all generic skills
      if (args.all) {
        const allSkills = await findAllGenericSkills(ctx);

        if (allSkills.length === 0) {
          return successResult(
            { deployed: 0, skipped: 0 },
            'No generic-scope skills found in project'
          );
        }

        if (args.dryRun) {
          const output: string[] = ['[DRY RUN] Would deploy skills:', ''];
          for (const skill of allSkills) {
            output.push(`  - ${skill.skillId} (${skill.metadata.module || 'unknown'})`);
          }
          return successResult(
            { skills: allSkills.map(s => s.skillId), dryRun: true },
            `Would deploy ${allSkills.length} skill(s)`,
            output.join('\n')
          );
        }

        let deployed = 0;
        let skipped = 0;
        const results: Array<{ skillId: string; deployed: boolean }> = [];

        for (const skill of allSkills) {
          const exists = await manager.skillExists(skill.skillId);
          if (exists && !args.force) {
            skipped++;
            results.push({ skillId: skill.skillId, deployed: false });
            continue;
          }

          await manager.deploySkill(skill.path, skill.skillId, {
            name: skill.metadata.name,
            description: skill.metadata.description,
            scope: skill.metadata.scope,
            sourceModule: skill.metadata.module || 'unknown',
            deployedFrom: ctx.projectRoot,
            capabilities: skill.metadata.capabilitiesProvided,
          });

          deployed++;
          results.push({ skillId: skill.skillId, deployed: true });
        }

        return successResult(
          { deployed, skipped, results },
          `Deployed ${deployed} skill(s), skipped ${skipped}`
        );
      }

      // Deploy single skill
      const skillId = args.skillId;
      if (!skillId) {
        return errorResult(
          ErrorCodes.INVALID_ARGUMENTS,
          'Skill ID is required',
          'Provide a skillId parameter'
        );
      }
      const skillPath = await findSkillInProject(ctx, skillId);

      if (!skillPath) {
        return errorResult(
          ErrorCodes.FILE_NOT_FOUND,
          `Skill not found: ${skillId}`,
          'Check that the skill exists in .claude/skills/ or .claude/skills/project/'
        );
      }

      // Parse SKILL.md frontmatter
      const skillMdPath = path.join(skillPath, 'SKILL.md');
      const content = await fs.readFile(skillMdPath, 'utf-8');
      const metadata = parseSkillFrontmatter(content);

      if (!metadata) {
        return errorResult(
          ErrorCodes.VALIDATION_FAILED,
          'Invalid SKILL.md frontmatter',
          'Ensure SKILL.md has valid YAML frontmatter with id and scope fields'
        );
      }

      // STRICT scope enforcement
      if (metadata.scope !== 'generic') {
        return errorResult(
          ErrorCodes.VALIDATION_FAILED,
          `Cannot deploy project-specific skill globally (scope: ${metadata.scope})`,
          'Only generic-scope skills can be deployed to ~/.claude/skills/'
        );
      }

      // Check if skill already exists globally
      const exists = await manager.skillExists(skillId);
      if (exists && !args.force) {
        return errorResult(
          ErrorCodes.VALIDATION_FAILED,
          `Skill ${skillId} already exists globally`,
          'Use force: true to overwrite existing skill'
        );
      }

      if (args.dryRun) {
        const globalPath = path.join(GlobalSkillsManager.getGlobalSkillsPath(), skillId);
        return successResult(
          {
            skillId,
            metadata,
            dryRun: true,
            action: exists ? 'overwrite' : 'create',
          },
          `Would deploy skill ${skillId}`,
          `Would deploy to: ${globalPath}`
        );
      }

      // Deploy skill
      await manager.deploySkill(skillPath, skillId, {
        name: metadata.name,
        description: metadata.description,
        scope: metadata.scope,
        sourceModule: metadata.module || 'unknown',
        deployedFrom: ctx.projectRoot,
        capabilities: metadata.capabilitiesProvided,
      });

      const globalPath = path.join(GlobalSkillsManager.getGlobalSkillsPath(), skillId);

      return successResult(
        { skillId, globalPath },
        `Deployed skill ${skillId}`,
        `Deployed to: ${globalPath}`
      );
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : String(error),
        'Check that you are in a valid framework project'
      );
    }
  }
);

/**
 * Tool: agentic_skill_list
 *
 * List skills (project or global)
 */
export const skillListTool = defineTool(
  'agentic_skill_list',
  'List skills (project or global)',
  SkillListSchema,
  async (args) => {
    try {
      const manager = new GlobalSkillsManager();

      if (args.global) {
        // List global skills
        const skills = await manager.listSkills();

        if (skills.length === 0) {
          return successResult(
            { skills: [] },
            'No global skills installed'
          );
        }

        const output: string[] = [
          `Global Skills (${GlobalSkillsManager.getGlobalSkillsPath()}):`,
          '',
        ];

        for (const skill of skills) {
          const deployedDate = new Date(skill.deployedAt).toISOString().split('T')[0];
          output.push(`  ${skill.id} (${skill.sourceModule}) - deployed ${deployedDate}`);
        }

        return successResult(
          { skills, count: skills.length },
          `Found ${skills.length} global skill(s)`,
          output.join('\n')
        );
      }

      // List project skills
      const ctx = await CliContext.require();

      // Find all project skills
      const skills: Array<{
        id: string;
        scope: string;
        module: string;
        path: string;
        isGlobal: boolean;
      }> = [];

      // Search .claude/skills/
      const claudeSkillsDir = path.join(ctx.projectRoot, '.claude', 'skills');
      if (await fs.pathExists(claudeSkillsDir)) {
        const entries = await fs.readdir(claudeSkillsDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const skillPath = path.join(claudeSkillsDir, entry.name);
            const skillMdPath = path.join(skillPath, 'SKILL.md');
            if (await fs.pathExists(skillMdPath)) {
              const content = await fs.readFile(skillMdPath, 'utf-8');
              const metadata = parseSkillFrontmatter(content);
              if (metadata) {
                const isGlobal = await manager.skillExists(metadata.id);
                skills.push({
                  id: metadata.id,
                  scope: metadata.scope,
                  module: metadata.module || 'unknown',
                  path: skillPath,
                  isGlobal,
                });
              }
            }
          }
        }
      }

      // Search .claude/skills/project/
      const projectSkillsDir = path.join(ctx.projectRoot, 'ai', 'skills', 'project');
      if (await fs.pathExists(projectSkillsDir)) {
        const entries = await fs.readdir(projectSkillsDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const skillPath = path.join(projectSkillsDir, entry.name);
            const skillMdPath = path.join(skillPath, 'SKILL.md');
            if (await fs.pathExists(skillMdPath)) {
              const content = await fs.readFile(skillMdPath, 'utf-8');
              const metadata = parseSkillFrontmatter(content);
              if (metadata) {
                const isGlobal = await manager.skillExists(metadata.id);
                skills.push({
                  id: metadata.id,
                  scope: metadata.scope,
                  module: metadata.module || 'unknown',
                  path: skillPath,
                  isGlobal,
                });
              }
            }
          }
        }
      }

      if (skills.length === 0) {
        return successResult(
          { skills: [] },
          'No project skills found'
        );
      }

      const output: string[] = ['Project Skills:', ''];

      for (const skill of skills) {
        const globalIndicator = skill.isGlobal ? ' [global]' : '';
        output.push(`  ${skill.id} (${skill.scope}, ${skill.module})${globalIndicator}`);
      }

      return successResult(
        { skills, count: skills.length },
        `Found ${skills.length} project skill(s)`,
        output.join('\n')
      );
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : String(error),
        'Check that you are in a valid framework project'
      );
    }
  }
);

/**
 * Tool: agentic_skill_remove
 *
 * Remove skill from global ~/.claude/skills/
 */
export const skillRemoveTool = defineTool(
  'agentic_skill_remove',
  'Remove skill from global ~/.claude/skills/',
  SkillRemoveSchema,
  async (args) => {
    try {
      const manager = new GlobalSkillsManager();

      // Check if skill exists
      const exists = await manager.skillExists(args.skillId);
      if (!exists) {
        return errorResult(
          ErrorCodes.FILE_NOT_FOUND,
          `Global skill not found: ${args.skillId}`,
          'Use agentic_skill_list with global: true to see deployed skills'
        );
      }

      // Get skill info to display details
      const skillInfo = await manager.getSkillInfo(args.skillId);
      if (!skillInfo) {
        return errorResult(
          ErrorCodes.COMMAND_FAILED,
          `Failed to retrieve skill information for: ${args.skillId}`
        );
      }

      // Note: In MCP context, we can't do interactive confirmation
      // force: true is required for non-interactive execution
      if (!args.force) {
        return errorResult(
          ErrorCodes.INVALID_ARGUMENTS,
          'Interactive confirmation not available in MCP context',
          'Use force: true to confirm removal'
        );
      }

      // Remove skill
      await manager.removeSkill(args.skillId);

      return successResult(
        { skillId: args.skillId, removed: true },
        `Removed skill ${args.skillId}`,
        `Skill ${args.skillId} has been removed from global skills`
      );
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : String(error)
      );
    }
  }
);

/**
 * Tool: agentic_skill_info
 *
 * Show skill details
 */
export const skillInfoTool = defineTool(
  'agentic_skill_info',
  'Show skill details',
  SkillInfoSchema,
  async (args) => {
    try {
      const manager = new GlobalSkillsManager();

      if (args.global) {
        // Show global skill info
        const skillInfo = await manager.getSkillInfo(args.skillId);

        if (!skillInfo) {
          return errorResult(
            ErrorCodes.FILE_NOT_FOUND,
            `Global skill not found: ${args.skillId}`,
            'Use agentic_skill_list with global: true to see available global skills'
          );
        }

        const globalSkillsPath = GlobalSkillsManager.getGlobalSkillsPath();
        const skillPath = path.join(globalSkillsPath, args.skillId);

        const output: string[] = [
          `Global Skill: ${args.skillId}`,
          '',
          `Name:         ${skillInfo.name}`,
          `Description:  ${skillInfo.description}`,
          `Scope:        ${skillInfo.scope}`,
          `Module:       ${skillInfo.sourceModule}`,
          '',
          'Deployment Info:',
          `  Deployed from: ${skillInfo.deployedFrom}`,
          `  Deployed at:   ${new Date(skillInfo.deployedAt).toLocaleString()}`,
          '',
        ];

        if (skillInfo.capabilities && skillInfo.capabilities.length > 0) {
          output.push('Capabilities:');
          for (const capability of skillInfo.capabilities) {
            output.push(`  - ${capability}`);
          }
          output.push('');
        }

        output.push('Location:');
        output.push(`  ${skillPath}/`);

        return successResult(
          { skill: skillInfo, path: skillPath },
          undefined,
          output.join('\n')
        );
      }

      // Show project skill info
      const ctx = await CliContext.require();
      const skillPath = await findSkillInProject(ctx, args.skillId);

      if (!skillPath) {
        return errorResult(
          ErrorCodes.FILE_NOT_FOUND,
          `Project skill not found: ${args.skillId}`,
          'Check .claude/skills/ or .claude/skills/project/'
        );
      }

      // Parse SKILL.md frontmatter
      const skillMdPath = path.join(skillPath, 'SKILL.md');
      const content = await fs.readFile(skillMdPath, 'utf-8');
      const metadata = parseSkillFrontmatter(content);

      if (!metadata) {
        return errorResult(
          ErrorCodes.VALIDATION_FAILED,
          'Invalid SKILL.md frontmatter',
          'Ensure SKILL.md has valid YAML frontmatter'
        );
      }

      const output: string[] = [
        `Project Skill: ${args.skillId}`,
        '',
        `Name:         ${metadata.name}`,
        `Description:  ${metadata.description}`,
        `Scope:        ${metadata.scope}`,
      ];

      if (metadata.module) {
        output.push(`Module:       ${metadata.module}`);
      }

      output.push('');

      if (metadata.capabilitiesProvided && metadata.capabilitiesProvided.length > 0) {
        output.push('Capabilities:');
        for (const capability of metadata.capabilitiesProvided) {
          output.push(`  - ${capability}`);
        }
        output.push('');
      }

      output.push('Location:');
      output.push(`  ${skillPath}/`);

      // Check if also deployed globally
      const isGlobal = await manager.skillExists(args.skillId);
      if (isGlobal) {
        output.push('');
        output.push('✓ Also installed globally');
      }

      return successResult(
        { skill: metadata, path: skillPath, isGlobal },
        undefined,
        output.join('\n')
      );
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : String(error),
        'Check that you are in a valid framework project'
      );
    }
  }
);

/**
 * Tool: agentic_skill_pull
 *
 * Pull skill from global ~/.claude/skills/ into project
 */
export const skillPullTool = defineTool(
  'agentic_skill_pull',
  'Pull skill from global ~/.claude/skills/ into project',
  SkillPullSchema,
  async (args) => {
    try {
      const ctx = await CliContext.require();
      const manager = new GlobalSkillsManager();

      // Check if skill exists globally
      const exists = await manager.skillExists(args.skillId);

      if (!exists) {
        return errorResult(
          ErrorCodes.FILE_NOT_FOUND,
          `Global skill not found: ${args.skillId}`,
          'Use agentic_skill_list with global: true to see available skills'
        );
      }

      // Get skill info for metadata display
      const skillInfo = await manager.getSkillInfo(args.skillId);

      // Determine source and target paths
      const globalSkillPath = path.join(GlobalSkillsManager.getGlobalSkillsPath(), args.skillId);
      const localSkillPath = path.join(ctx.projectRoot, '.claude', 'skills', args.skillId);

      // Check if skill already exists locally
      const localExists = await fs.pathExists(localSkillPath);
      if (localExists && !args.force) {
        return errorResult(
          ErrorCodes.VALIDATION_FAILED,
          `Skill ${args.skillId} already exists in project`,
          'Use force: true to overwrite existing skill'
        );
      }

      if (args.dryRun) {
        const output: string[] = ['[DRY RUN] Would pull skill:', ''];
        if (skillInfo) {
          output.push(`  Skill: ${args.skillId}`);
          output.push(`  Name: ${skillInfo.name}`);
          output.push(`  Description: ${skillInfo.description}`);
          output.push(`  Scope: ${skillInfo.scope}`);
          if (skillInfo.sourceModule) {
            output.push(`  Source Module: ${skillInfo.sourceModule}`);
          }
        }
        output.push(`  From: ${globalSkillPath}`);
        output.push(`  To: ${localSkillPath}`);
        output.push(`  Action: ${localExists ? 'overwrite (force)' : 'create'}`);

        return successResult(
          {
            skillId: args.skillId,
            dryRun: true,
            action: localExists ? 'overwrite' : 'create',
          },
          `Would pull skill ${args.skillId}`,
          output.join('\n')
        );
      }

      // Pull skill - ensure target directory exists
      await fs.ensureDir(path.dirname(localSkillPath));

      // Copy skill directory from global to project
      await fs.copy(globalSkillPath, localSkillPath, {
        overwrite: true,
        filter: (src: string) => {
          // Filter out .DS_Store files
          return !src.endsWith('.DS_Store');
        },
      });

      const output: string[] = [`Pulled skill ${args.skillId}`, `  → ${localSkillPath}`];

      if (skillInfo) {
        output.push('');
        output.push('Skill Info:');
        output.push(`  Name: ${skillInfo.name}`);
        output.push(`  Description: ${skillInfo.description}`);
        output.push(`  Scope: ${skillInfo.scope}`);
        if (skillInfo.sourceModule) {
          output.push(`  Source Module: ${skillInfo.sourceModule}`);
        }
        if (skillInfo.capabilities && skillInfo.capabilities.length > 0) {
          output.push(`  Capabilities: ${skillInfo.capabilities.join(', ')}`);
        }
      }

      return successResult(
        { skillId: args.skillId, localPath: localSkillPath, pulled: true },
        `Pulled skill ${args.skillId}`,
        output.join('\n')
      );
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : String(error),
        'Check that you are in a valid framework project'
      );
    }
  }
);

/**
 * Export all skill tools
 */
export const skillTools = [
  skillDeployTool,
  skillListTool,
  skillRemoveTool,
  skillInfoTool,
  skillPullTool,
];
