/**
 * Template Resolver
 *
 * Resolves template locations using the priority order: project > module > CLI defaults.
 */

import fs from 'fs-extra';
import path from 'path';
import fg from 'fast-glob';
import { fileURLToPath } from 'url';
import type {
  TemplateResolutionContext,
  TemplateConfig,
  ResolvedTemplate,
  TemplateListItem,
} from './types.js';
import { isLegacyConfig, normalizeLegacyConfig } from './validator.js';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);

/**
 * Template Resolver class
 *
 * Resolves templates from multiple locations with priority ordering.
 */
export class TemplateResolver {
  private projectRoot: string;
  private moduleId?: string;
  private templateCategory?: string;
  private configCache: Map<string, TemplateConfig> = new Map();

  constructor(context: TemplateResolutionContext) {
    this.projectRoot = context.projectRoot;
    this.moduleId = context.moduleId;
    this.templateCategory = context.templateCategory;
  }

  /**
   * Get CLI bundled templates directory
   */
  private getCliTemplatePaths(): string[] {
    return [
      // Relative to dist/lib/unified-template-engine -> framework/modules
      // When running from framework/cli/dist/lib/unified-template-engine:
      // ../../../../ = framework/, then /modules = framework/modules
      path.resolve(currentDirPath, '../../../../modules'),
      // Alternative: 5 levels up then framework/modules (from project root)
      path.resolve(currentDirPath, '../../../../../framework/modules'),
    ];
  }

  /**
   * Get all possible template search paths
   */
  private getSearchPaths(category?: string): Array<{ path: string; source: 'project' | 'module' | 'cli' }> {
    const searchPaths: Array<{ path: string; source: 'project' | 'module' | 'cli' }> = [];
    const cat = category || this.templateCategory;

    // 1. Project-local overrides (.claude/skills/<category>/templates)
    if (cat) {
      searchPaths.push({
        path: path.join(this.projectRoot, '.claude/skills', cat, 'templates'),
        source: 'project',
      });
    }

    // 2. Project .claude/skills directory (synced from modules)
    if (cat) {
      searchPaths.push({
        path: path.join(this.projectRoot, '.claude/skills', cat, 'templates'),
        source: 'project',
      });
    }

    // 3. Module templates if moduleId specified
    if (this.moduleId && cat) {
      searchPaths.push({
        path: path.join(this.projectRoot, 'framework/modules', this.moduleId, 'skills', '*', cat, 'templates'),
        source: 'module',
      });
    }

    // 4. Search in framework modules (for core templates)
    if (cat) {
      searchPaths.push({
        path: path.join(this.projectRoot, 'framework/modules/*/skills/*', cat, 'templates'),
        source: 'module',
      });
      // Also check core/templates directly
      searchPaths.push({
        path: path.join(this.projectRoot, 'framework/modules/core/templates', cat),
        source: 'module',
      });
    }

    // 5. CLI bundled defaults
    for (const cliPath of this.getCliTemplatePaths()) {
      if (cat) {
        searchPaths.push({
          path: path.join(cliPath, '*/skills/*', cat, 'templates'),
          source: 'cli',
        });
        searchPaths.push({
          path: path.join(cliPath, 'core/templates', cat),
          source: 'cli',
        });
      }
    }

    return searchPaths;
  }

  /**
   * Load and cache template config from a directory
   */
  private async loadConfig(configDir: string): Promise<TemplateConfig | null> {
    // Check cache
    const cachedConfig = this.configCache.get(configDir);
    if (cachedConfig) {
      return cachedConfig;
    }

    const configPath = path.join(configDir, 'template.config.json');

    if (!(await fs.pathExists(configPath))) {
      return null;
    }

    try {
      const rawConfig = await fs.readJSON(configPath);

      // Normalize legacy configs
      const config = isLegacyConfig(rawConfig)
        ? normalizeLegacyConfig(rawConfig)
        : (rawConfig as TemplateConfig);

      this.configCache.set(configDir, config);
      return config;
    } catch {
      return null;
    }
  }

  /**
   * Find a specific template by name
   */
  async findTemplate(templateName: string, category?: string): Promise<ResolvedTemplate | null> {
    const searchPaths = this.getSearchPaths(category);

    for (const { path: searchPath, source } of searchPaths) {
      // Handle glob patterns
      if (searchPath.includes('*')) {
        const directories = await fg(searchPath, {
          onlyDirectories: true,
          absolute: true,
        });

        for (const dir of directories) {
          const result = await this.checkTemplateInDir(dir, templateName, source, category);
          if (result) return result;
        }
      } else {
        const result = await this.checkTemplateInDir(searchPath, templateName, source, category);
        if (result) return result;
      }
    }

    return null;
  }

  /**
   * Check if a template exists in a specific directory
   */
  private async checkTemplateInDir(
    dir: string,
    templateName: string,
    source: 'project' | 'module' | 'cli',
    category?: string
  ): Promise<ResolvedTemplate | null> {
    if (!(await fs.pathExists(dir))) {
      return null;
    }

    const config = await this.loadConfig(dir);
    if (!config) return null;

    // Check if template is defined in config
    if (!(templateName in config.templates)) {
      return null;
    }

    // Try multiple file naming patterns
    const possiblePaths = [
      path.join(dir, `${templateName}.md`),           // story.template -> story.template.md
      path.join(dir, `${templateName}.template.md`),  // agent -> agent.template.md
      path.join(dir, `${templateName}.template`),     // SKILL.md -> SKILL.md.template
      path.join(dir, templateName),                   // SKILL.md -> SKILL.md
    ];

    let finalTemplatePath: string | null = null;
    for (const candidatePath of possiblePaths) {
      if (await fs.pathExists(candidatePath)) {
        finalTemplatePath = candidatePath;
        break;
      }
    }

    if (!finalTemplatePath) {
      return null;
    }

    return {
      templatePath: finalTemplatePath,
      configPath: path.join(dir, 'template.config.json'),
      category: category || this.templateCategory || this.extractCategory(dir),
      source,
      config,
      definition: config.templates[templateName],
    };
  }

  /**
   * Extract category from directory path
   */
  private extractCategory(dir: string): string {
    // Try to extract from path like .../skills/<category>/templates
    const parts = dir.split(path.sep);
    const templatesIndex = parts.indexOf('templates');
    if (templatesIndex > 0) {
      return parts[templatesIndex - 1];
    }
    return 'unknown';
  }

  /**
   * List all available templates
   */
  async listTemplates(category?: string): Promise<TemplateListItem[]> {
    const templates: TemplateListItem[] = [];
    const seen = new Set<string>();

    // Search all possible locations
    const allSearchPaths = category
      ? this.getSearchPaths(category)
      : await this.getAllCategories();

    for (const { path: searchPath, source } of allSearchPaths) {
      // Handle glob patterns
      if (searchPath.includes('*')) {
        const directories = await fg(searchPath, {
          onlyDirectories: true,
          absolute: true,
        });

        for (const dir of directories) {
          const items = await this.listTemplatesInDir(dir, source);
          for (const item of items) {
            const key = `${item.category}/${item.name}`;
            if (!seen.has(key)) {
              seen.add(key);
              templates.push(item);
            }
          }
        }
      } else {
        const items = await this.listTemplatesInDir(searchPath, source);
        for (const item of items) {
          const key = `${item.category}/${item.name}`;
          if (!seen.has(key)) {
            seen.add(key);
            templates.push(item);
          }
        }
      }
    }

    return templates.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }

  /**
   * List templates in a specific directory
   */
  private async listTemplatesInDir(
    dir: string,
    source: 'project' | 'module' | 'cli'
  ): Promise<TemplateListItem[]> {
    if (!(await fs.pathExists(dir))) {
      return [];
    }

    const config = await this.loadConfig(dir);
    if (!config) return [];

    const category = this.extractCategory(dir);
    const items: TemplateListItem[] = [];

    for (const [name, def] of Object.entries(config.templates)) {
      items.push({
        name,
        category,
        description: def.description,
        source,
        requiredVariables: def.variables.required,
      });
    }

    return items;
  }

  /**
   * Get all category search paths (when no specific category is requested)
   */
  private async getAllCategories(): Promise<Array<{ path: string; source: 'project' | 'module' | 'cli' }>> {
    const paths: Array<{ path: string; source: 'project' | 'module' | 'cli' }> = [];

    // Project templates
    paths.push({
      path: path.join(this.projectRoot, '.claude/skills/*/templates'),
      source: 'project',
    });
    paths.push({
      path: path.join(this.projectRoot, '.claude/skills/*/templates'),
      source: 'project',
    });

    // Module templates
    paths.push({
      path: path.join(this.projectRoot, 'framework/modules/*/skills/*/*/templates'),
      source: 'module',
    });
    paths.push({
      path: path.join(this.projectRoot, 'framework/modules/core/templates/*'),
      source: 'module',
    });

    // CLI templates
    for (const cliPath of this.getCliTemplatePaths()) {
      paths.push({
        path: path.join(cliPath, '*/skills/*/*/templates'),
        source: 'cli',
      });
      paths.push({
        path: path.join(cliPath, 'core/templates/*'),
        source: 'cli',
      });
    }

    return paths;
  }

  /**
   * Clear the config cache
   */
  clearCache(): void {
    this.configCache.clear();
  }
}

/**
 * Create a template resolver instance
 */
export function createResolver(context: TemplateResolutionContext): TemplateResolver {
  return new TemplateResolver(context);
}
