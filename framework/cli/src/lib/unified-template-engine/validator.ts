/**
 * Template Validator
 *
 * Validates template configurations and variables against schemas and rules.
 */

import AjvModule from 'ajv';
// Ajv is exported as both default and named export
const Ajv = AjvModule.default || AjvModule;
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  TemplateConfig,
  LegacyTemplateConfig,
  TemplateDefinition,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  VariableValidation,
} from './types.js';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);

/**
 * Load the template schema for validation
 */
async function loadTemplateSchema(): Promise<object> {
  // Try multiple possible locations for the schema
  const possiblePaths = [
    // Relative to CLI dist
    path.resolve(currentDirPath, '../../../../framework/modules/core/registries/schemas/template.schema.json'),
    // Relative to CLI source
    path.resolve(currentDirPath, '../../../../../modules/core/registries/schemas/template.schema.json'),
    // In project root
    path.resolve(process.cwd(), 'framework/modules/core/registries/schemas/template.schema.json'),
  ];

  for (const schemaPath of possiblePaths) {
    if (await fs.pathExists(schemaPath)) {
      return fs.readJSON(schemaPath);
    }
  }

  throw new Error('Template schema not found');
}

/**
 * Validate a template config against the schema
 */
export async function validateConfig(config: unknown): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check if it's a legacy config (no version field)
  if (typeof config === 'object' && config !== null && !('version' in config)) {
    warnings.push({
      type: 'legacy_config',
      message: 'Config is missing version field. Consider updating to v1.0 format.',
    });
    // Legacy configs are still valid, just warn
  }

  try {
    const schema = await loadTemplateSchema();
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(schema);

    const valid = validate(config);

    if (!valid && validate.errors) {
      for (const error of validate.errors) {
        errors.push({
          type: 'schema_error',
          message: `${error.instancePath} ${error.message}`,
          expected: error.params ? JSON.stringify(error.params) : undefined,
        });
      }
    }
  } catch (_schemaError) {
    // Schema not found - do basic validation
    if (typeof config !== 'object' || config === null) {
      errors.push({
        type: 'schema_error',
        message: 'Config must be an object',
      });
    } else if (!('templates' in config)) {
      errors.push({
        type: 'schema_error',
        message: 'Config must have a templates property',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate variables against template definition
 */
export function validateVariables(
  definition: TemplateDefinition,
  variables: Record<string, string>
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check required variables
  for (const required of definition.variables.required) {
    if (!(required in variables) || variables[required] === undefined || variables[required] === '') {
      errors.push({
        type: 'missing_required',
        variable: required,
        message: `Missing required variable: ${required}`,
      });
    }
  }

  // Build set of allowed variables
  const allowedVars = new Set([
    ...definition.variables.required,
    ...definition.variables.optional,
    ...(definition.variables.computed || []),
  ]);

  // Check for unknown variables
  for (const varName of Object.keys(variables)) {
    if (!allowedVars.has(varName)) {
      warnings.push({
        type: 'unknown_variable',
        variable: varName,
        message: `Unknown variable provided: ${varName}`,
      });
    }
  }

  // Validate variable values against rules
  if (definition.validation) {
    for (const [varName, rules] of Object.entries(definition.validation)) {
      const value = variables[varName];
      if (value !== undefined) {
        const validationErrors = validateVariableValue(varName, value, rules);
        errors.push(...validationErrors);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a single variable value against validation rules
 */
function validateVariableValue(
  varName: string,
  value: string,
  rules: VariableValidation
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Pattern validation
  if (rules.pattern) {
    try {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(value)) {
        errors.push({
          type: 'invalid_pattern',
          variable: varName,
          message: `Variable ${varName} does not match pattern: ${rules.pattern}`,
          expected: rules.pattern,
          actual: value,
        });
      }
    } catch {
      // Invalid regex - skip validation
    }
  }

  // Length validation
  if (rules.minLength !== undefined && value.length < rules.minLength) {
    errors.push({
      type: 'invalid_length',
      variable: varName,
      message: `Variable ${varName} is too short (min: ${rules.minLength})`,
      expected: `>= ${rules.minLength} characters`,
      actual: `${value.length} characters`,
    });
  }

  if (rules.maxLength !== undefined && value.length > rules.maxLength) {
    errors.push({
      type: 'invalid_length',
      variable: varName,
      message: `Variable ${varName} is too long (max: ${rules.maxLength})`,
      expected: `<= ${rules.maxLength} characters`,
      actual: `${value.length} characters`,
    });
  }

  // Enum validation
  if (rules.enum && !rules.enum.includes(value)) {
    errors.push({
      type: 'invalid_enum',
      variable: varName,
      message: `Variable ${varName} must be one of: ${rules.enum.join(', ')}`,
      expected: rules.enum.join(' | '),
      actual: value,
    });
  }

  return errors;
}

/**
 * Normalize a legacy config to v1.0 format
 */
export function normalizeLegacyConfig(legacy: LegacyTemplateConfig): TemplateConfig {
  const templates: Record<string, TemplateDefinition> = {};

  for (const [name, def] of Object.entries(legacy.templates)) {
    templates[name] = {
      output: def.output,
      variables: {
        required: def.variables.required,
        optional: def.variables.optional || [],
        computed: [],
      },
      defaults: def.defaults || {},
    };
  }

  return {
    version: '1.0',
    templates,
    autoNumbering: legacy.autoNumbering,
  };
}

/**
 * Check if config is legacy format
 */
export function isLegacyConfig(config: unknown): config is LegacyTemplateConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'templates' in config &&
    !('version' in config)
  );
}
