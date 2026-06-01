/**
 * Create MCP Tools
 *
 * MCP tools for creating agents, skills, and modules.
 */

import { z } from 'zod';
import { defineTool } from '../tool-registry.js';
import { successResult, errorResult, ErrorCodes } from '../types.js';
import { createUnifiedTemplateEngine } from '../../lib/unified-template-engine/index.js';
import { CliContext } from '../../lib/cli-context.js';
import path from 'path';
import fs from 'fs-extra';

/**
 * Schema for agentic_create_agent
 */
const CreateAgentSchema = z.object({
  name: z.string().describe('Agent name in kebab-case (e.g., my-agent)'),
  capability: z.string().describe('Primary capability this agent provides'),
  description: z.string().optional().describe('Agent description'),
  variant: z.enum(['full', 'slim']).default('full').describe('Agent variant'),
  role: z.string().optional().describe('Agent role description'),
  module: z.string().default('core').describe('Target module for the agent'),
  output: z.string().optional().describe('Custom output path'),
  dryRun: z.boolean().default(false).describe('Preview without creating files'),
});

/**
 * Create a new agent from template
 */
export const createAgentTool = defineTool(
  'agentic_create_agent',
  'Create a new agent from template',
  CreateAgentSchema,
  async (args) => {
    try {
      // Get CLI context
      const ctx = await CliContext.require();

      // Validate name format
      if (!/^[a-z][a-z0-9-]*$/.test(args.name)) {
        return errorResult(
          ErrorCodes.INVALID_ARGUMENTS,
          'Agent name must be kebab-case (e.g., my-agent)'
        );
      }

      const engine = createUnifiedTemplateEngine({
        projectRoot: ctx.projectRoot,
        templateCategory: 'agent',
      });

      // Determine output path
      let outputPath = args.output;
      if (!outputPath) {
        outputPath = path.join(
          ctx.projectRoot,
          'framework/modules',
          args.module,
          'agents',
          `ai-${args.name}.md`
        );
      }

      // Prepare variables
      const variables: Record<string, string> = {
        name: args.name,
        capability: args.capability,
        description: args.description || `${args.name} agent description`,
        variant: args.variant,
        role: args.role || 'Agent Role',
        title: args.name
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
      };

      const result = await engine.renderToFile('agent.template', {
        variables,
        outputPath,
        dryRun: args.dryRun,
      }, 'agent');

      if (args.dryRun) {
        let output = '\n=== DRY RUN (preview only) ===\n\n';
        output += `Would create: ${result.outputPath}\n\n`;
        output += 'Variables:\n';
        for (const [key, value] of Object.entries(result.variables)) {
          output += `  ${key}: ${value}\n`;
        }
        output += '\nContent preview:\n';
        output += '─'.repeat(60) + '\n';
        const lines = result.content.split('\n').slice(0, 30);
        output += lines.join('\n');
        if (result.content.split('\n').length > 30) {
          output += '\n... (truncated)';
        }
        output += '\n' + '─'.repeat(60) + '\n';
        output += '\n=== END DRY RUN ===\n';

        return successResult(
          {
            dryRun: true,
            outputPath: result.outputPath,
            variables: result.variables,
          },
          `Dry run for agent ai-${args.name}`,
          output
        );
      } else {
        let output = `✓ Agent created successfully!\n`;
        output += `  File: ${result.outputPath}\n`;
        output += `  Agent ID: ai-${args.name}\n\n`;
        output += 'Next steps:\n';
        output += '  1. Edit the agent file to add responsibilities and workflows\n';
        output += '  2. Update the module.json to register the agent\n';
        output += '  3. Run `agentic-framework sync` to update registries\n';

        return successResult(
          {
            agentId: `ai-${args.name}`,
            path: result.outputPath,
            module: args.module,
          },
          `Agent ai-${args.name} created successfully`,
          output
        );
      }
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : String(error)
      );
    }
  }
);

/**
 * Schema for agentic_create_skill
 */
const CreateSkillSchema = z.object({
  name: z.string().describe('Skill name in kebab-case (e.g., my-skill)'),
  capability: z.string().describe('Capability this skill provides'),
  description: z.string().optional().describe('Skill description'),
  scope: z.enum(['generic', 'project', 'shared']).default('project').describe('Skill scope'),
  module: z.string().default('core').describe('Target module for the skill'),
  output: z.string().optional().describe('Custom output directory'),
  dryRun: z.boolean().default(false).describe('Preview without creating files'),
});

/**
 * Create a new skill from template
 */
export const createSkillTool = defineTool(
  'agentic_create_skill',
  'Create a new skill from template',
  CreateSkillSchema,
  async (args) => {
    try {
      // Get CLI context
      const ctx = await CliContext.require();

      // Validate name format
      if (!/^[a-z][a-z0-9-]*$/.test(args.name)) {
        return errorResult(
          ErrorCodes.INVALID_ARGUMENTS,
          'Skill name must be kebab-case (e.g., my-skill)'
        );
      }

      const engine = createUnifiedTemplateEngine({
        projectRoot: ctx.projectRoot,
        templateCategory: 'skill',
      });

      // Determine output directory
      let outputDir = args.output;
      if (!outputDir) {
        outputDir = path.join(
          ctx.projectRoot,
          'framework/modules',
          args.module,
          'skills',
          args.name
        );
      }

      // Prepare variables
      const variables: Record<string, string> = {
        id: args.name,
        name: args.name,
        capability: args.capability,
        description: args.description || `${args.name} skill description`,
        scope: args.scope,
        module: args.module,
        applicableProjects: 'any',
        title: args.name
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
      };

      const skillPath = path.join(outputDir, 'SKILL.md');

      const result = await engine.renderToFile('SKILL.md', {
        variables,
        outputPath: skillPath,
        dryRun: args.dryRun,
      }, 'skill');

      if (args.dryRun) {
        let output = '\n=== DRY RUN (preview only) ===\n\n';
        output += `Would create directory: ${outputDir}\n`;
        output += `Would create file: ${result.outputPath}\n\n`;
        output += 'Variables:\n';
        for (const [key, value] of Object.entries(result.variables)) {
          output += `  ${key}: ${value}\n`;
        }
        output += '\nSKILL.md preview:\n';
        output += '─'.repeat(60) + '\n';
        const lines = result.content.split('\n').slice(0, 30);
        output += lines.join('\n');
        if (result.content.split('\n').length > 30) {
          output += '\n... (truncated)';
        }
        output += '\n' + '─'.repeat(60) + '\n';
        output += '\n=== END DRY RUN ===\n';

        return successResult(
          {
            dryRun: true,
            outputPath: result.outputPath,
            variables: result.variables,
          },
          `Dry run for skill ${args.name}`,
          output
        );
      } else {
        let output = `✓ Skill created successfully!\n`;
        output += `  Directory: ${outputDir}\n`;
        output += `  Skill ID: ${args.name}\n\n`;
        output += 'Next steps:\n';
        output += '  1. Edit SKILL.md to add workflow details and examples\n';
        output += '  2. Create EXAMPLES.md if needed\n';
        output += '  3. Update the module.json to register the skill\n';
        output += '  4. Run `agentic-framework sync` to update registries\n';

        return successResult(
          {
            skillId: args.name,
            path: outputDir,
            module: args.module,
          },
          `Skill ${args.name} created successfully`,
          output
        );
      }
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : String(error)
      );
    }
  }
);

/**
 * Schema for agentic_create_module
 */
const CreateModuleSchema = z.object({
  name: z.string().describe('Module name in kebab-case (e.g., my-module)'),
  description: z.string().optional().describe('Module description'),
  category: z.string().default('workflow').describe('Module category'),
  author: z.string().optional().describe('Module author'),
  output: z.string().optional().describe('Custom output directory'),
  dryRun: z.boolean().default(false).describe('Preview without creating files'),
});

/**
 * Create a new module from template
 */
export const createModuleTool = defineTool(
  'agentic_create_module',
  'Create a new module from template',
  CreateModuleSchema,
  async (args) => {
    try {
      // Get CLI context
      const ctx = await CliContext.require();

      // Validate name format
      if (!/^[a-z][a-z0-9-]*$/.test(args.name)) {
        return errorResult(
          ErrorCodes.INVALID_ARGUMENTS,
          'Module name must be kebab-case (e.g., my-module)'
        );
      }

      const engine = createUnifiedTemplateEngine({
        projectRoot: ctx.projectRoot,
        templateCategory: 'module',
      });

      // Determine output directory
      let outputDir = args.output;
      if (!outputDir) {
        outputDir = path.join(ctx.projectRoot, 'framework/modules', args.name);
      }

      // Prepare variables
      const displayName = args.name
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      const variables: Record<string, string> = {
        id: args.name,
        name: displayName,
        description: args.description || `${displayName} module for the Agentic Development Framework`,
        category: args.category,
        author: args.author || 'Agentic Framework',
        version: '1.0.0',
      };

      const modulePath = path.join(outputDir, 'module.json');

      if (args.dryRun) {
        const result = await engine.render('module.json', {
          variables,
          dryRun: true,
        }, 'module');

        let output = '\n=== DRY RUN (preview only) ===\n\n';
        output += 'Would create directory structure:\n';
        output += `  ${outputDir}/\n`;
        output += '  ├── module.json\n';
        output += '  ├── agents/\n';
        output += '  ├── skills/\n';
        output += '  └── templates/\n\n';
        output += 'Variables:\n';
        for (const [key, value] of Object.entries(result.variables)) {
          output += `  ${key}: ${value}\n`;
        }
        output += '\nmodule.json preview:\n';
        output += '─'.repeat(60) + '\n';
        output += result.content;
        output += '\n' + '─'.repeat(60) + '\n';
        output += '\n=== END DRY RUN ===\n';

        return successResult(
          {
            dryRun: true,
            outputPath: modulePath,
            variables: result.variables,
          },
          `Dry run for module ${args.name}`,
          output
        );
      } else {
        // Create directory structure
        await fs.ensureDir(outputDir);
        await fs.ensureDir(path.join(outputDir, 'agents'));
        await fs.ensureDir(path.join(outputDir, 'skills'));
        await fs.ensureDir(path.join(outputDir, 'templates'));

        // Create module.json
        const _result = await engine.renderToFile('module.json', {
          variables,
          outputPath: modulePath,
          dryRun: false,
        }, 'module');

        let output = `✓ Module created successfully!\n`;
        output += `  Directory: ${outputDir}\n`;
        output += `  Module ID: ${args.name}\n\n`;
        output += 'Created structure:\n';
        output += `  ${outputDir}/\n`;
        output += '  ├── module.json\n';
        output += '  ├── agents/\n';
        output += '  ├── skills/\n';
        output += '  └── templates/\n\n';
        output += 'Next steps:\n';
        output += '  1. Add agents using `agentic-framework create-agent`\n';
        output += '  2. Add skills using `agentic-framework create-skill`\n';
        output += '  3. Update module.json with provided capabilities\n';
        output += '  4. Run `agentic-framework sync` to register the module\n';

        return successResult(
          {
            moduleId: args.name,
            path: outputDir,
          },
          `Module ${args.name} created successfully`,
          output
        );
      }
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : String(error)
      );
    }
  }
);

/**
 * Export all create tools
 */
export const createTools = [createAgentTool, createSkillTool, createModuleTool];
