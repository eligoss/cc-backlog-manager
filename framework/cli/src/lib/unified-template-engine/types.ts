/**
 * Unified Template Engine Types
 *
 * TypeScript interfaces for the template configuration and rendering system.
 */

/**
 * Variable validation rules for a single variable
 */
export interface VariableValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  enum?: string[];
}

/**
 * Variable configuration for a template
 */
export interface VariableConfig {
  required: string[];
  optional: string[];
  computed: ComputedVariable[];
}

/**
 * Computed variable types that the engine can auto-generate
 */
export type ComputedVariable = 'date' | 'datetime' | 'year' | 'number' | 'uuid' | 'user';

/**
 * Configuration for a single template
 */
export interface TemplateDefinition {
  output: string;
  variables: VariableConfig;
  defaults: Record<string, string>;
  validation?: Record<string, VariableValidation>;
  description?: string;
}

/**
 * Auto-numbering configuration
 */
export interface AutoNumberingConfig {
  pattern: string;
  padding: number;
  startFrom?: number;
}

/**
 * Complete template.config.json structure
 */
export interface TemplateConfig {
  $schema?: string;
  version: string;
  templates: Record<string, TemplateDefinition>;
  autoNumbering?: AutoNumberingConfig;
  defaults?: Record<string, string>;
}

/**
 * Legacy template config (pre-v1.0, without version field)
 */
export interface LegacyTemplateConfig {
  templates: Record<string, {
    output: string;
    variables: {
      required: string[];
      optional?: string[];
    };
    defaults?: Record<string, string>;
  }>;
  autoNumbering?: {
    pattern: string;
    padding: number;
  };
}

/**
 * Template resolution context
 */
export interface TemplateResolutionContext {
  /** User's project root directory */
  projectRoot: string;
  /** Optional: specific module to look in */
  moduleId?: string;
  /** Template category (e.g., 'backlog', 'planning', 'context') */
  templateCategory?: string;
}

/**
 * Template rendering options
 */
export interface RenderOptions {
  /** Variables to substitute in the template */
  variables: Record<string, string>;
  /** Override output path (otherwise uses config) */
  outputPath?: string;
  /** Preview without writing files */
  dryRun?: boolean;
  /** Skip variable validation */
  skipValidation?: boolean;
  /** Directory for auto-numbering scan */
  numberingDirectory?: string;
}

/**
 * Result of template rendering
 */
export interface RenderResult {
  /** Rendered template content */
  content: string;
  /** Output path (where file was/would be written) */
  outputPath: string;
  /** All variables used (including computed) */
  variables: Record<string, string>;
  /** Whether this was a dry run */
  dryRun: boolean;
}

/**
 * Validation result for variables or config
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error detail
 */
export interface ValidationError {
  type: 'missing_required' | 'invalid_pattern' | 'invalid_length' | 'invalid_enum' | 'unknown_variable' | 'schema_error';
  variable?: string;
  message: string;
  expected?: string;
  actual?: string;
}

/**
 * Validation warning detail
 */
export interface ValidationWarning {
  type: 'unknown_variable' | 'deprecated' | 'legacy_config';
  variable?: string;
  message: string;
}

/**
 * Template info returned by getInfo()
 */
export interface TemplateInfo {
  name: string;
  output: string;
  variables: VariableConfig;
  defaults: Record<string, string>;
  validation?: Record<string, VariableValidation>;
  description?: string;
  category?: string;
  source: 'project' | 'module' | 'cli';
}

/**
 * Template list item
 */
export interface TemplateListItem {
  name: string;
  category: string;
  description?: string;
  source: 'project' | 'module' | 'cli';
  requiredVariables: string[];
}

/**
 * Resolved template location
 */
export interface ResolvedTemplate {
  /** Full path to template file */
  templatePath: string;
  /** Full path to config file */
  configPath: string;
  /** Template category */
  category: string;
  /** Source of the template */
  source: 'project' | 'module' | 'cli';
  /** Loaded config */
  config: TemplateConfig;
  /** Template definition from config */
  definition: TemplateDefinition;
}
