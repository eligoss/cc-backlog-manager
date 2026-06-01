import AjvModule from 'ajv';
import type { ErrorObject } from 'ajv';
import ajvFormatsModule from 'ajv-formats';
import fs from 'fs-extra';
import {
  ValidationReport,
  ValidationIssue,
  createReport,
  createError,
} from './validation-report.js';

// Ajv is exported as both default and named export
const Ajv = AjvModule.default || AjvModule;
// ajv-formats may be exported as default or as module.default in CommonJS/ESM interop
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addFormats = (ajvFormatsModule as any).default || ajvFormatsModule;

/**
 * AJV instance with default configuration and format support
 */
const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false,
});

// Add format validation support (date, time, email, uri, etc.)
addFormats(ajv);

/**
 * Validate data against a JSON Schema
 * @param data - Data to validate
 * @param schemaPath - Absolute path to JSON Schema file
 * @returns Validation report
 */
export async function validateWithSchema(
  data: unknown,
  schemaPath: string
): Promise<ValidationReport> {
  const issues: ValidationIssue[] = [];

  try {
    // Check if file exists first
    const exists = await fs.pathExists(schemaPath);
    if (!exists) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }

    // Load schema
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');
    const schema = JSON.parse(schemaContent);

    // Compile schema
    const validate = ajv.compile(schema);

    // Validate data
    const valid = validate(data);

    if (!valid && validate.errors) {
      // Convert AJV errors to validation issues
      for (const error of validate.errors) {
        issues.push(convertAjvError(error, schemaPath));
      }
    }
  } catch (error) {
    // Schema loading or parsing error
    if (error instanceof Error) {
      issues.push(
        createError(
          'SCHEMA_ERROR',
          `Failed to load or parse schema: ${error.message}`,
          undefined,
          { file: schemaPath },
          'Ensure the schema file exists and contains valid JSON'
        )
      );
    }
  }

  return createReport(issues);
}

/**
 * Validate data against a JSON Schema object (not file)
 * @param data - Data to validate
 * @param schema - JSON Schema object
 * @returns Validation report
 */
export function validateWithSchemaObject(
  data: unknown,
  schema: object
): ValidationReport {
  const issues: ValidationIssue[] = [];

  try {
    // Compile schema
    const validate = ajv.compile(schema);

    // Validate data
    const valid = validate(data);

    if (!valid && validate.errors) {
      // Convert AJV errors to validation issues
      for (const error of validate.errors) {
        issues.push(convertAjvError(error));
      }
    }
  } catch (error) {
    // Schema compilation error
    if (error instanceof Error) {
      issues.push(
        createError(
          'SCHEMA_COMPILATION_ERROR',
          `Failed to compile schema: ${error.message}`,
          undefined,
          undefined,
          'Check that the schema is valid JSON Schema'
        )
      );
    }
  }

  return createReport(issues);
}

/**
 * Convert AJV error to ValidationIssue
 */
function convertAjvError(error: ErrorObject, schemaFile?: string): ValidationIssue {
  const field = error.instancePath ? error.instancePath.replace(/^\//, '').replace(/\//g, '.') : undefined;

  let message = error.message || 'Validation failed';
  const code = `SCHEMA_${error.keyword.toUpperCase()}`;

  // Enhance message based on error type
  switch (error.keyword) {
    case 'required':
      if (error.params && 'missingProperty' in error.params) {
        message = `Missing required property: ${error.params.missingProperty}`;
      }
      break;
    case 'type':
      if (error.params && 'type' in error.params) {
        message = `Expected type ${error.params.type}, got ${typeof error.data}`;
      }
      break;
    case 'enum':
      if (error.params && 'allowedValues' in error.params) {
        message = `Value must be one of: ${error.params.allowedValues.join(', ')}`;
      }
      break;
    case 'pattern':
      if (error.params && 'pattern' in error.params) {
        message = `Value does not match pattern: ${error.params.pattern}`;
      }
      break;
    case 'minLength':
      if (error.params && 'limit' in error.params) {
        message = `String length must be at least ${error.params.limit}`;
      }
      break;
    case 'maxLength':
      if (error.params && 'limit' in error.params) {
        message = `String length must not exceed ${error.params.limit}`;
      }
      break;
    case 'minimum':
      if (error.params && 'limit' in error.params) {
        message = `Value must be >= ${error.params.limit}`;
      }
      break;
    case 'maximum':
      if (error.params && 'limit' in error.params) {
        message = `Value must be <= ${error.params.limit}`;
      }
      break;
    case 'additionalProperties':
      if (error.params && 'additionalProperty' in error.params) {
        message = `Unexpected property: ${error.params.additionalProperty}`;
      }
      break;
  }

  // Add suggestion based on error type
  let suggestion: string | undefined;
  switch (error.keyword) {
    case 'required':
      suggestion = 'Add the missing required field to your data';
      break;
    case 'type':
      if (error.params && 'type' in error.params) {
        suggestion = `Convert the value to type: ${error.params.type}`;
      }
      break;
    case 'enum':
      suggestion = 'Use one of the allowed values';
      break;
    case 'additionalProperties':
      suggestion = 'Remove the unexpected property or update the schema to allow it';
      break;
  }

  const location = schemaFile ? { file: schemaFile } : undefined;

  // Determine severity - most schema violations are errors
  // But we could make some warnings if needed in the future
  return createError(code, message, field, location, suggestion);
}

/**
 * Validate multiple files against schemas
 * @param files - Array of {data, schemaPath} objects
 * @returns Merged validation report
 */
export async function validateMultiple(
  files: Array<{ data: unknown; schemaPath: string; fileName?: string }>
): Promise<ValidationReport> {
  const reports = await Promise.all(
    files.map(async ({ data, schemaPath, fileName }) => {
      const report = await validateWithSchema(data, schemaPath);

      // Add fileName to location if provided
      if (fileName) {
        report.issues = report.issues.map((issue) => ({
          ...issue,
          location: issue.location || { file: fileName },
        }));
      }

      return report;
    })
  );

  // Merge all reports
  const allIssues = reports.flatMap((r) => r.issues);
  return createReport(allIssues);
}
