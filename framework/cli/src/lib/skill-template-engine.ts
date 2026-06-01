/**
 * @deprecated This module is deprecated. Use `unified-template-engine` instead.
 * This file is kept for backward compatibility and will be removed in v2.0.
 *
 * Migration:
 * - Import from './unified-template-engine/index.js' instead
 * - Use `createUnifiedTemplateEngine()` instead of `new SkillTemplateEngine()`
 * - The UnifiedTemplateEngine provides the same functionality with additional features
 */

import fs from 'fs-extra';
import path from 'path';
import fg from 'fast-glob';

/**
 * Template variable configuration
 * @deprecated Use types from unified-template-engine instead
 */
interface VariableConfig {
  required: string[];
  optional: string[];
}

/**
 * Template configuration for a single template
 */
interface TemplateInfo {
  output: string;
  variables: VariableConfig;
  defaults: Record<string, string>;
}

/**
 * Auto-numbering configuration
 */
interface AutoNumberingConfig {
  pattern: string;
  padding: number;
}

/**
 * Complete template configuration
 */
export interface TemplateConfig {
  templates: Record<string, TemplateInfo>;
  autoNumbering?: AutoNumberingConfig;
}

/**
 * Template rendering options
 */
export interface RenderOptions {
  variables: Record<string, string>;
  skipValidation?: boolean;
}

/**
 * Template validation result
 */
interface ValidationResult {
  valid: boolean;
  missing: string[];
  unknown: string[];
}

/**
 * Skill template engine for rendering templates with variable substitution
 */
export class SkillTemplateEngine {
  private templateDir: string;
  private config: TemplateConfig | null = null;

  constructor(templateDir: string) {
    this.templateDir = templateDir;
  }

  /**
   * Load template configuration
   */
  private async loadConfig(): Promise<TemplateConfig> {
    if (this.config) {
      return this.config;
    }

    const configPath = path.join(this.templateDir, 'template.config.json');

    if (!(await fs.pathExists(configPath))) {
      throw new Error(`Template configuration not found at ${configPath}`);
    }

    const configContent = await fs.readFile(configPath, 'utf-8');
    const parsedConfig = JSON.parse(configContent) as TemplateConfig;
    this.config = parsedConfig;

    return parsedConfig;
  }

  /**
   * Get template info by name
   */
  private async getTemplateInfo(templateName: string): Promise<TemplateInfo> {
    const config = await this.loadConfig();

    if (!config.templates[templateName]) {
      throw new Error(
        `Template "${templateName}" not found. Available templates: ${Object.keys(config.templates).join(', ')}`
      );
    }

    return config.templates[templateName];
  }

  /**
   * Validate variables against template requirements
   */
  private validateVariables(
    templateInfo: TemplateInfo,
    variables: Record<string, string>
  ): ValidationResult {
    const missing: string[] = [];
    const unknown: string[] = [];

    // Check required variables
    for (const required of templateInfo.variables.required) {
      if (!(required in variables)) {
        missing.push(required);
      }
    }

    // Check for unknown variables
    const allowedVars = new Set([
      ...templateInfo.variables.required,
      ...templateInfo.variables.optional,
    ]);

    for (const varName of Object.keys(variables)) {
      if (!allowedVars.has(varName)) {
        unknown.push(varName);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
      unknown,
    };
  }

  /**
   * Merge variables with defaults
   */
  private mergeWithDefaults(
    templateInfo: TemplateInfo,
    variables: Record<string, string>
  ): Record<string, string> {
    return {
      ...templateInfo.defaults,
      ...variables,
    };
  }

  /**
   * Replace template variables in content
   * Supports {{variable}} syntax
   */
  private replaceVariables(content: string, variables: Record<string, string>): string {
    let result = content;

    // Replace all {{variable}} patterns
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(pattern, value);
    }

    return result;
  }

  /**
   * Get the next number for auto-numbering
   * Scans existing files in the directory to find the highest number
   */
  async getNextNumber(directory: string, pattern?: string): Promise<number> {
    const config = await this.loadConfig();

    if (!pattern && !config.autoNumbering) {
      throw new Error('No auto-numbering pattern configured');
    }

    const numberingPattern = pattern || (config.autoNumbering ? config.autoNumbering.pattern : '');

    // Convert pattern to glob pattern
    // Example: "TICKET-{num}" -> "TICKET-*"
    const globPattern = numberingPattern.replace(/\{num\}/g, '*');

    // Find all matching files
    const files = await fg(globPattern, {
      cwd: directory,
      onlyFiles: true,
      absolute: false,
    });

    if (files.length === 0) {
      return 1;
    }

    // Extract numbers from filenames
    const numbers: number[] = [];
    const regex = new RegExp(numberingPattern.replace(/\{num\}/g, '(\\d+)'));

    for (const file of files) {
      const match = file.match(regex);
      if (match && match[1]) {
        numbers.push(parseInt(match[1], 10));
      }
    }

    if (numbers.length === 0) {
      return 1;
    }

    // Return next number
    return Math.max(...numbers) + 1;
  }

  /**
   * Format a number with padding
   */
  private formatNumber(num: number, padding: number): string {
    return num.toString().padStart(padding, '0');
  }

  /**
   * Render a template with variables
   * @param templateName - Name of the template to render
   * @param options - Rendering options with variables
   * @returns Rendered template content
   */
  async render(templateName: string, options: RenderOptions): Promise<string> {
    const templateInfo = await this.getTemplateInfo(templateName);

    // Merge with defaults
    const variables = this.mergeWithDefaults(templateInfo, options.variables);

    // Validate variables unless skipped
    if (!options.skipValidation) {
      const validation = this.validateVariables(templateInfo, variables);

      if (!validation.valid) {
        throw new Error(
          `Missing required variables: ${validation.missing.join(', ')}`
        );
      }

      if (validation.unknown.length > 0) {
        console.warn(
          `Warning: Unknown variables provided: ${validation.unknown.join(', ')}`
        );
      }
    }

    // Load template file
    const templatePath = path.join(this.templateDir, `${templateName}.md`);

    if (!(await fs.pathExists(templatePath))) {
      throw new Error(`Template file not found: ${templatePath}`);
    }

    const templateContent = await fs.readFile(templatePath, 'utf-8');

    // Replace variables
    const rendered = this.replaceVariables(templateContent, variables);

    return rendered;
  }

  /**
   * Render and write template to output file
   * @param templateName - Name of the template
   * @param options - Rendering options
   * @param outputPath - Output file path (optional, uses config if not provided)
   */
  async renderToFile(
    templateName: string,
    options: RenderOptions,
    outputPath?: string
  ): Promise<string> {
    const templateInfo = await this.getTemplateInfo(templateName);
    const rendered = await this.render(templateName, options);

    // Determine output path
    let finalOutputPath = outputPath;

    if (!finalOutputPath) {
      // Use output from config and replace variables
      finalOutputPath = this.replaceVariables(
        templateInfo.output,
        this.mergeWithDefaults(templateInfo, options.variables)
      );
    }

    // Ensure output directory exists
    const outputDir = path.dirname(finalOutputPath);
    await fs.ensureDir(outputDir);

    // Write file
    await fs.writeFile(finalOutputPath, rendered, 'utf-8');

    return finalOutputPath;
  }

  /**
   * Get auto-numbering configuration
   */
  async getAutoNumberingConfig(): Promise<AutoNumberingConfig | undefined> {
    const config = await this.loadConfig();
    return config.autoNumbering;
  }

  /**
   * List available templates
   */
  async listTemplates(): Promise<string[]> {
    const config = await this.loadConfig();
    return Object.keys(config.templates);
  }

  /**
   * Get template info
   */
  async getInfo(templateName: string): Promise<TemplateInfo> {
    return this.getTemplateInfo(templateName);
  }
}

/**
 * Create a template engine instance
 */
export function createTemplateEngine(templateDir: string): SkillTemplateEngine {
  return new SkillTemplateEngine(templateDir);
}
