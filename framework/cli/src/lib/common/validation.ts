/**
 * Validation error severity levels
 */
export type ValidationErrorSeverity = 'error' | 'warning' | 'info';

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  public field: string;
  public severity: ValidationErrorSeverity;
  public suggestion?: string;

  constructor(
    field: string,
    message: string,
    severity: ValidationErrorSeverity = 'error',
    suggestion?: string
  ) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.severity = severity;
    this.suggestion = suggestion;
  }
}

/**
 * Validation result with errors
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity?: ValidationErrorSeverity;
    suggestion?: string;
  }>;
}

/**
 * Validation rule definition
 */
export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  pattern?: RegExp;
  enum?: string[];
  message?: string;
  arrayValidator?: (item: unknown) => void;
  custom?: (value: unknown) => void;
}

/**
 * Type guard: Check if value is defined (not null or undefined)
 */
export function isRequired<T>(value: T | undefined | null): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard: Check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard: Check if value is a number (excluding NaN)
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard: Check if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Type guard: Check if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Type guard: Check if value is a plain object (not array or null)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validate that a field is required (not null or undefined)
 */
export function validateRequired(field: string, value: unknown, message?: string): void {
  if (!isRequired(value)) {
    throw new ValidationError(field, message || `Field "${field}" is required`);
  }
}

/**
 * Validate that a field matches the expected type
 */
export function validateType(
  field: string,
  value: unknown,
  expectedType: 'string' | 'number' | 'boolean' | 'array' | 'object',
  message?: string
): void {
  let isValid = false;

  switch (expectedType) {
    case 'string':
      isValid = isString(value);
      break;
    case 'number':
      isValid = isNumber(value);
      break;
    case 'boolean':
      isValid = isBoolean(value);
      break;
    case 'array':
      isValid = isArray(value);
      break;
    case 'object':
      isValid = isObject(value);
      break;
  }

  if (!isValid) {
    throw new ValidationError(
      field,
      message || `Field "${field}" must be of type ${expectedType}`
    );
  }
}

/**
 * Validate that a string field matches a regex pattern
 */
export function validatePattern(
  field: string,
  value: unknown,
  pattern: RegExp,
  message?: string
): void {
  if (!isString(value)) {
    throw new ValidationError(field, `Field "${field}" must be a string for pattern validation`);
  }

  if (!pattern.test(value)) {
    throw new ValidationError(
      field,
      message || `Field "${field}" does not match the required pattern`
    );
  }
}

/**
 * Validate that a field value is one of the allowed enum values
 */
export function validateEnum(field: string, value: unknown, allowedValues: string[], message?: string): void {
  if (!allowedValues.includes(value as string)) {
    throw new ValidationError(
      field,
      message || `Field "${field}" must be one of: ${allowedValues.join(', ')}`
    );
  }
}

/**
 * Validate array items using a custom validator function
 */
export function validateArray(
  field: string,
  value: unknown,
  itemValidator: (item: unknown) => void,
  _message?: string
): void {
  if (!isArray(value)) {
    throw new ValidationError(field, `Field "${field}" must be an array`);
  }

  for (let i = 0; i < value.length; i++) {
    try {
      itemValidator(value[i]);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(`${field}[${i}]`, error.message);
      }
      throw error;
    }
  }
}

/**
 * Validate using a custom validator function
 */
export function validateCustom(
  field: string,
  value: unknown,
  validatorFn: (value: unknown) => void
): void {
  try {
    validatorFn(value);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(field, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Get nested field value from an object using dot notation
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Validate data against a set of validation rules
 */
export function validate(data: unknown, rules: ValidationRule[]): ValidationResult {
  const errors: Array<{
    field: string;
    message: string;
    severity?: ValidationErrorSeverity;
    suggestion?: string;
  }> = [];

  for (const rule of rules) {
    try {
      const value = getNestedValue(data, rule.field);

      // Check if field is required
      if (rule.required) {
        validateRequired(rule.field, value, rule.message);
      }

      // Skip validation for optional missing fields
      if (!isRequired(value) && !rule.required) {
        continue;
      }

      // Type validation
      if (rule.type) {
        validateType(rule.field, value, rule.type, rule.message);
      }

      // Pattern validation
      if (rule.pattern) {
        validatePattern(rule.field, value, rule.pattern, rule.message);
      }

      // Enum validation
      if (rule.enum) {
        validateEnum(rule.field, value, rule.enum, rule.message);
      }

      // Array validation
      if (rule.arrayValidator) {
        validateArray(rule.field, value, rule.arrayValidator, rule.message);
      }

      // Custom validation
      if (rule.custom) {
        validateCustom(rule.field, value, rule.custom);
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push({
          field: error.field,
          message: error.message,
          severity: error.severity,
          suggestion: error.suggestion,
        });
      } else {
        // Unexpected error
        errors.push({
          field: rule.field,
          message: error instanceof Error ? error.message : String(error),
          severity: 'error',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
