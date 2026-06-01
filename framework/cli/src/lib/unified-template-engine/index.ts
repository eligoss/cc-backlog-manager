/**
 * Unified Template Engine
 *
 * Single template engine that consolidates SkillTemplateEngine, PlanCreator, and TemplateEngine.
 * Provides consistent {{variable}} syntax, schema validation, and hybrid template resolution.
 */

import fs from 'fs-extra';
import path from 'path';
import fg from 'fast-glob';
import type {
  TemplateResolutionContext,
  RenderOptions,
  RenderResult,
  ValidationResult,
  TemplateInfo,
  TemplateListItem,
  ResolvedTemplate,
  AutoNumberingConfig,
} from './types.js';
import { TemplateResolver, createResolver } from './resolver.js';
import { validateConfig, validateVariables } from './validator.js';
import { computeVariables, formatNumber } from './computed-variables.js';

// Re-export types
export * from './types.js';
export { validateConfig, validateVariables } from './validator.js';
export { TemplateResolver, createResolver } from './resolver.js';
export { computeVariables, formatNumber, getDate, getDatetime, getYear, getUuid, getUser } from './computed-variables.js';

/**
 * Unified Template Engine
 *
 * Main class for template resolution, rendering, and file creation.
 */
export class UnifiedTemplateEngine {
  private resolver: TemplateResolver;
  private projectRoot: string;

  constructor(context: TemplateResolutionContext) {
    this.projectRoot = context.projectRoot;
    this.resolver = createResolver(context);
  }

  /**
   * Find a template by name
   */
  async findTemplate(templateName: string, category?: string): Promise<ResolvedTemplate | null> {
    return this.resolver.findTemplate(templateName, category);
  }

  /**
   * List all available templates
   */
  async listTemplates(category?: string): Promise<TemplateListItem[]> {
    return this.resolver.listTemplates(category);
  }

  /**
   * Get detailed info about a template
   */
  async getInfo(templateName: string, category?: string): Promise<TemplateInfo | null> {
    const resolved = await this.findTemplate(templateName, category);
    if (!resolved) return null;

    return {
      name: templateName,
      output: resolved.definition.output,
      variables: resolved.definition.variables,
      defaults: resolved.definition.defaults,
      validation: resolved.definition.validation,
      description: resolved.definition.description,
      category: resolved.category,
      source: resolved.source,
    };
  }

  /**
   * Validate a template config file
   */
  async validateConfig(configPath: string): Promise<ValidationResult> {
    const config = await fs.readJSON(configPath);
    return validateConfig(config);
  }

  /**
   * Render a template with variables
   */
  async render(templateName: string, options: RenderOptions, category?: string): Promise<RenderResult> {
    // Find template
    const resolved = await this.findTemplate(templateName, category);
    if (!resolved) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Load template content
    const templateContent = await fs.readFile(resolved.templatePath, 'utf-8');

    // Compute automatic variables
    const computedVars = computeVariables(resolved.definition.variables.computed || []);

    // Handle auto-numbering if needed
    if (
      resolved.definition.variables.computed?.includes('number') &&
      resolved.config.autoNumbering
    ) {
      const nextNum = await this.getNextNumber(
        options.numberingDirectory || this.projectRoot,
        resolved.config.autoNumbering
      );
      computedVars.number = formatNumber(nextNum, resolved.config.autoNumbering.padding);
    }

    // Merge variables: defaults < computed < user-provided
    const allVariables = {
      ...resolved.definition.defaults,
      ...(resolved.config.defaults || {}),
      ...computedVars,
      ...options.variables,
    };

    // Validate variables
    if (!options.skipValidation) {
      const validation = validateVariables(resolved.definition, allVariables);
      if (!validation.valid) {
        const errorMessages = validation.errors.map((e) => e.message).join(', ');
        throw new Error(`Variable validation failed: ${errorMessages}`);
      }

      // Log warnings
      for (const warning of validation.warnings) {
        console.warn(`Warning: ${warning.message}`);
      }
    }

    // Render template
    const content = this.replaceVariables(templateContent, allVariables);

    // Determine output path
    let outputPath = options.outputPath;
    if (!outputPath) {
      outputPath = this.replaceVariables(resolved.definition.output, allVariables);
    }

    return {
      content,
      outputPath,
      variables: allVariables,
      dryRun: options.dryRun || false,
    };
  }

  /**
   * Render and write template to file
   */
  async renderToFile(
    templateName: string,
    options: RenderOptions,
    category?: string
  ): Promise<RenderResult> {
    const result = await this.render(templateName, options, category);

    if (!result.dryRun) {
      // Ensure output directory exists
      const outputDir = path.dirname(result.outputPath);
      await fs.ensureDir(outputDir);

      // Write file
      await fs.writeFile(result.outputPath, result.content, 'utf-8');
    }

    return result;
  }

  /**
   * Get the next number for auto-numbering
   */
  async getNextNumber(directory: string, config: AutoNumberingConfig): Promise<number> {
    const pattern = config.pattern;
    const startFrom = config.startFrom ?? 1;

    // Convert pattern to glob pattern
    // Example: "TICKET-{num}" -> "TICKET-*"
    const globPattern = pattern.replace(/\{num\}/g, '*');

    // Find all matching files
    const files = await fg(globPattern, {
      cwd: directory,
      onlyFiles: true,
      absolute: false,
    });

    if (files.length === 0) {
      return startFrom;
    }

    // Extract numbers from filenames
    const numbers: number[] = [];
    const regex = new RegExp(pattern.replace(/\{num\}/g, '(\\d+)'));

    for (const file of files) {
      const match = file.match(regex);
      if (match && match[1]) {
        numbers.push(parseInt(match[1], 10));
      }
    }

    if (numbers.length === 0) {
      return startFrom;
    }

    // Return next number
    return Math.max(...numbers) + 1;
  }

  /**
   * Replace template variables in content
   * Supports both {{variable}} and {variable} syntax (normalized to {{variable}})
   */
  private replaceVariables(content: string, variables: Record<string, string>): string {
    let result = content;

    // Replace all {{variable}} patterns
    for (const [key, value] of Object.entries(variables)) {
      // Double-brace syntax {{var}}
      const doubleBracePattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(doubleBracePattern, value);

      // Single-brace syntax {var} (for backward compatibility)
      const singleBracePattern = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(singleBracePattern, value);
    }

    return result;
  }

  /**
   * Clear resolver cache
   */
  clearCache(): void {
    this.resolver.clearCache();
  }
}

/**
 * Create a unified template engine instance
 */
export function createUnifiedTemplateEngine(
  context: TemplateResolutionContext
): UnifiedTemplateEngine {
  return new UnifiedTemplateEngine(context);
}

/**
 * Default export for convenience
 */
export default UnifiedTemplateEngine;
