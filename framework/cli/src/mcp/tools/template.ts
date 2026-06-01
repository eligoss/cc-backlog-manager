/**
 * Template MCP Tools
 *
 * MCP tools for managing templates: list, info, render, validate.
 *
 * @module mcp/tools/template
 */

import { z } from 'zod';
import { defineTool } from '../tool-registry.js';
import { successResult, errorResult, ErrorCodes } from '../types.js';
import { createUnifiedTemplateEngine } from '../../lib/unified-template-engine/index.js';
import { validateConfig } from '../../lib/unified-template-engine/index.js';
import { CliContext } from '../../lib/cli-context.js';
import path from 'path';
import fs from 'fs-extra';
import fg from 'fast-glob';

/**
 * Schema for template list tool
 */
const ListTemplatesSchema = z.object({
  category: z.string().optional().describe('Filter by template category'),
  json: z.boolean().default(false).describe('Output as JSON'),
});

/**
 * Schema for template info tool
 */
const TemplateInfoSchema = z.object({
  name: z.string().describe('Template name (e.g., story.template or category/story.template)'),
  category: z.string().optional().describe('Template category (can also be specified as category/name)'),
  json: z.boolean().default(false).describe('Output as JSON'),
});

/**
 * Schema for template render tool
 */
const RenderTemplateSchema = z.object({
  name: z.string().describe('Template name (e.g., story.template)'),
  variables: z.record(z.string(), z.string()).optional().describe('Variable values as key-value pairs'),
  output: z.string().optional().describe('Output file path (overrides template default)'),
  category: z.string().optional().describe('Template category'),
  dryRun: z.boolean().default(false).describe('Preview without writing files'),
  json: z.boolean().default(false).describe('Output as JSON'),
});

/**
 * Schema for template validate tool
 */
const ValidateTemplateSchema = z.object({
  path: z.string().default('.').describe('Path to template.config.json or directory containing templates'),
  json: z.boolean().default(false).describe('Output as JSON'),
  strict: z.boolean().default(false).describe('Exit with error on warnings'),
});

/**
 * Tool: agentic_template_list
 *
 * List all available templates in the framework.
 */
export const templateListTool = defineTool(
  'agentic_template_list',
  'List all available templates in the framework',
  ListTemplatesSchema,
  async (args) => {
    try {
      const ctx = await CliContext.require();
      const engine = createUnifiedTemplateEngine({
        projectRoot: ctx.projectRoot,
      });

      const templates = await engine.listTemplates(args.category);

      if (templates.length === 0) {
        return successResult(
          { templates: [] },
          args.category
            ? `No templates found in category: ${args.category}`
            : 'No templates found'
        );
      }

      if (args.json) {
        return successResult({ templates });
      }

      // Group by category for better presentation
      const byCategory = new Map<string, typeof templates>();
      for (const template of templates) {
        const list = byCategory.get(template.category) || [];
        list.push(template);
        byCategory.set(template.category, list);
      }

      const output: string[] = ['Available Templates:', ''];
      for (const [category, categoryTemplates] of byCategory) {
        output.push(`  ${category}/`);
        for (const t of categoryTemplates) {
          const required = t.requiredVariables.length > 0
            ? ` [${t.requiredVariables.join(', ')}]`
            : '';
          output.push(`    ${t.name}${required} (${t.source})`);
          if (t.description) {
            output.push(`      ${t.description}`);
          }
        }
        output.push('');
      }
      output.push(`Total: ${templates.length} template(s)`);

      return successResult(
        { templates, count: templates.length },
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
 * Tool: agentic_template_info
 *
 * Show detailed information about a specific template.
 */
export const templateInfoTool = defineTool(
  'agentic_template_info',
  'Show detailed information about a template',
  TemplateInfoSchema,
  async (args) => {
    try {
      // Support both "name" and "category/name" formats
      let name = args.name;
      let category = args.category;

      // If name contains a slash, parse it as "category/name"
      if (args.name.includes('/') && !category) {
        const parts = args.name.split('/');
        if (parts.length === 2) {
          category = parts[0];
          name = parts[1];
        }
      }

      const ctx = await CliContext.require();
      const engine = createUnifiedTemplateEngine({
        projectRoot: ctx.projectRoot,
        templateCategory: category,
      });

      const info = await engine.getInfo(name, category);

      if (!info) {
        return errorResult(
          ErrorCodes.FILE_NOT_FOUND,
          `Template not found: ${name}`,
          'Use agentic_template_list to see available templates'
        );
      }

      if (args.json) {
        return successResult({ template: info });
      }

      const output: string[] = [
        `Template: ${name}`,
        '',
        `  Category:   ${info.category}`,
        `  Source:     ${info.source}`,
        `  Output:     ${info.output}`,
      ];

      if (info.description) {
        output.push(`  Description: ${info.description}`);
      }

      output.push('', 'Variables:');

      if (info.variables.required.length > 0) {
        output.push('  Required:');
        for (const v of info.variables.required) {
          const validation = info.validation?.[v];
          let constraints = '';
          if (validation) {
            const parts = [];
            if (validation.pattern) parts.push(`pattern: ${validation.pattern}`);
            if (validation.minLength !== undefined) parts.push(`min: ${validation.minLength}`);
            if (validation.maxLength !== undefined) parts.push(`max: ${validation.maxLength}`);
            if (validation.enum) parts.push(`values: ${validation.enum.join('|')}`);
            if (parts.length > 0) constraints = ` (${parts.join(', ')})`;
          }
          output.push(`    - ${v}${constraints}`);
        }
      }

      if (info.variables.optional.length > 0) {
        output.push('  Optional:');
        for (const v of info.variables.optional) {
          const defaultVal = info.defaults[v];
          const defaultStr = defaultVal ? ` = "${defaultVal}"` : '';
          output.push(`    - ${v}${defaultStr}`);
        }
      }

      if (info.variables.computed.length > 0) {
        output.push('  Computed: (auto-generated)');
        for (const v of info.variables.computed) {
          output.push(`    - ${v}`);
        }
      }

      return successResult(
        { template: info },
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
 * Tool: agentic_template_render
 *
 * Render a template with provided variables.
 */
export const templateRenderTool = defineTool(
  'agentic_template_render',
  'Render a template with variables',
  RenderTemplateSchema,
  async (args) => {
    try {
      const ctx = await CliContext.require();
      const engine = createUnifiedTemplateEngine({
        projectRoot: ctx.projectRoot,
        templateCategory: args.category,
      });

      // Resolve output path
      let outputPath = args.output;
      if (outputPath && !path.isAbsolute(outputPath)) {
        outputPath = path.resolve(ctx.projectRoot, outputPath);
      }

      const result = args.dryRun
        ? await engine.render(args.name, {
            variables: args.variables || {},
            outputPath,
            dryRun: true,
          }, args.category)
        : await engine.renderToFile(args.name, {
            variables: args.variables || {},
            outputPath,
            dryRun: false,
          }, args.category);

      if (args.json) {
        return successResult({
          outputPath: result.outputPath,
          dryRun: result.dryRun,
          variables: result.variables,
          contentLength: result.content.length,
        });
      }

      const output: string[] = [];

      if (args.dryRun) {
        output.push('=== DRY RUN (preview only) ===', '');
        output.push(`Output would be written to: ${result.outputPath}`, '');
        output.push('Variables used:');
        for (const [key, value] of Object.entries(result.variables)) {
          output.push(`  ${key}: ${value}`);
        }
        output.push('', 'Rendered content:');
        output.push('─'.repeat(60));
        output.push(result.content);
        output.push('─'.repeat(60));
        output.push('', '=== END DRY RUN ===');
      } else {
        output.push('✓ Template rendered successfully!');
        output.push(`  Output: ${result.outputPath}`);
      }

      return successResult(
        {
          outputPath: result.outputPath,
          dryRun: result.dryRun,
          variables: result.variables,
        },
        args.dryRun ? 'Template preview generated' : 'Template rendered successfully',
        output.join('\n')
      );
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : String(error),
        'Check template name and required variables'
      );
    }
  }
);

/**
 * Tool: agentic_template_validate
 *
 * Validate template configuration files.
 */
export const templateValidateTool = defineTool(
  'agentic_template_validate',
  'Validate template configuration files',
  ValidateTemplateSchema,
  async (args) => {
    try {
      const ctx = await CliContext.require();
      const resolvedPath = path.resolve(ctx.projectRoot, args.path);

      const stat = await fs.stat(resolvedPath);
      let configFiles: string[] = [];

      if (stat.isFile()) {
        if (!resolvedPath.endsWith('template.config.json')) {
          return errorResult(
            ErrorCodes.INVALID_ARGUMENTS,
            'Expected template.config.json file',
            'Provide a path to template.config.json or a directory'
          );
        }
        configFiles = [resolvedPath];
      } else if (stat.isDirectory()) {
        // Find all template.config.json files
        configFiles = await fg('**/template.config.json', {
          cwd: resolvedPath,
          absolute: true,
          ignore: ['**/node_modules/**', '**/dist/**'],
        });
      }

      if (configFiles.length === 0) {
        return successResult(
          { files: [], valid: true },
          'No template.config.json files found'
        );
      }

      const results: Array<{
        file: string;
        valid: boolean;
        errors: Array<{ type: string; message: string }>;
        warnings: Array<{ type: string; message: string }>;
      }> = [];

      let hasErrors = false;
      let hasWarnings = false;

      for (const configFile of configFiles) {
        const relativePath = path.relative(ctx.projectRoot, configFile);

        try {
          const config = await fs.readJSON(configFile);
          const validation = await validateConfig(config);

          results.push({
            file: relativePath,
            valid: validation.valid,
            errors: validation.errors.map((e) => ({ type: e.type, message: e.message })),
            warnings: validation.warnings.map((w) => ({ type: w.type, message: w.message })),
          });

          if (!validation.valid) hasErrors = true;
          if (validation.warnings.length > 0) hasWarnings = true;
        } catch (parseError) {
          results.push({
            file: relativePath,
            valid: false,
            errors: [{ type: 'parse_error', message: parseError instanceof Error ? parseError.message : String(parseError) }],
            warnings: [],
          });
          hasErrors = true;
        }
      }

      if (args.json) {
        return successResult({
          files: results,
          valid: !hasErrors,
          hasWarnings,
        });
      }

      const output: string[] = [
        `Validating ${results.length} template config(s)...`,
        '',
      ];

      for (const result of results) {
        const statusIcon = result.valid
          ? result.warnings.length > 0 ? '⚠' : '✓'
          : '✗';

        output.push(`${statusIcon} ${result.file}`);

        for (const error of result.errors) {
          output.push(`    ✗ ${error.message}`);
        }

        for (const warning of result.warnings) {
          output.push(`    ⚠ ${warning.message}`);
        }
      }

      output.push('');

      if (hasErrors) {
        output.push('Validation failed with errors.');
      } else if (hasWarnings) {
        output.push('Validation passed with warnings.');
      } else {
        output.push('All template configs are valid.');
      }

      const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

      if (hasErrors || (args.strict && hasWarnings)) {
        return errorResult(
          ErrorCodes.VALIDATION_FAILED,
          hasErrors ? 'Validation failed with errors' : 'Validation failed with warnings (strict mode)',
          undefined,
          { files: results, errorCount: totalErrors }
        );
      }

      return successResult(
        { files: results, valid: !hasErrors, hasWarnings, errorCount: totalErrors },
        hasWarnings ? 'Validation passed with warnings' : 'All template configs are valid',
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
 * Export all template tools
 */
export const templateTools = [
  templateListTool,
  templateInfoTool,
  templateRenderTool,
  templateValidateTool,
];
