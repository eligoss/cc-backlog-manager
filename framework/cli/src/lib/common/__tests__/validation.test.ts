import {
  validate,
  ValidationRule,
  ValidationResult,
  ValidationError,
  isRequired,
  isString,
  isNumber,
  isBoolean,
  isArray,
  isObject,
  validateRequired,
  validateType,
  validatePattern,
  validateEnum,
  validateArray,
  validateCustom,
} from '../validation';

describe('Validation', () => {
  describe('Type Guards', () => {
    describe('isRequired()', () => {
      it('should return true for defined values', () => {
        expect(isRequired('test')).toBe(true);
        expect(isRequired(0)).toBe(true);
        expect(isRequired(false)).toBe(true);
        expect(isRequired('')).toBe(true);
        expect(isRequired([])).toBe(true);
        expect(isRequired({})).toBe(true);
      });

      it('should return false for null and undefined', () => {
        expect(isRequired(null)).toBe(false);
        expect(isRequired(undefined)).toBe(false);
      });
    });

    describe('isString()', () => {
      it('should return true for strings', () => {
        expect(isString('hello')).toBe(true);
        expect(isString('')).toBe(true);
        expect(isString('123')).toBe(true);
      });

      it('should return false for non-strings', () => {
        expect(isString(123)).toBe(false);
        expect(isString(true)).toBe(false);
        expect(isString(null)).toBe(false);
        expect(isString(undefined)).toBe(false);
        expect(isString([])).toBe(false);
        expect(isString({})).toBe(false);
      });
    });

    describe('isNumber()', () => {
      it('should return true for numbers', () => {
        expect(isNumber(123)).toBe(true);
        expect(isNumber(0)).toBe(true);
        expect(isNumber(-5.5)).toBe(true);
        expect(isNumber(Infinity)).toBe(true);
      });

      it('should return false for non-numbers', () => {
        expect(isNumber('123')).toBe(false);
        expect(isNumber(true)).toBe(false);
        expect(isNumber(null)).toBe(false);
        expect(isNumber(undefined)).toBe(false);
        expect(isNumber(NaN)).toBe(false);
      });
    });

    describe('isBoolean()', () => {
      it('should return true for booleans', () => {
        expect(isBoolean(true)).toBe(true);
        expect(isBoolean(false)).toBe(true);
      });

      it('should return false for non-booleans', () => {
        expect(isBoolean(1)).toBe(false);
        expect(isBoolean(0)).toBe(false);
        expect(isBoolean('true')).toBe(false);
        expect(isBoolean(null)).toBe(false);
        expect(isBoolean(undefined)).toBe(false);
      });
    });

    describe('isArray()', () => {
      it('should return true for arrays', () => {
        expect(isArray([])).toBe(true);
        expect(isArray([1, 2, 3])).toBe(true);
        expect(isArray(['a', 'b'])).toBe(true);
      });

      it('should return false for non-arrays', () => {
        expect(isArray('array')).toBe(false);
        expect(isArray(123)).toBe(false);
        expect(isArray({})).toBe(false);
        expect(isArray(null)).toBe(false);
        expect(isArray(undefined)).toBe(false);
      });
    });

    describe('isObject()', () => {
      it('should return true for plain objects', () => {
        expect(isObject({})).toBe(true);
        expect(isObject({ key: 'value' })).toBe(true);
      });

      it('should return false for non-objects', () => {
        expect(isObject([])).toBe(false);
        expect(isObject(null)).toBe(false);
        expect(isObject(undefined)).toBe(false);
        expect(isObject('object')).toBe(false);
        expect(isObject(123)).toBe(false);
      });
    });
  });

  describe('Field Validators', () => {
    describe('validateRequired()', () => {
      it('should pass for non-null values', () => {
        expect(() => validateRequired('name', 'value')).not.toThrow();
        expect(() => validateRequired('count', 0)).not.toThrow();
        expect(() => validateRequired('flag', false)).not.toThrow();
      });

      it('should throw for null values', () => {
        expect(() => validateRequired('name', null)).toThrow(ValidationError);
        expect(() => validateRequired('name', null)).toThrow('Field "name" is required');
      });

      it('should throw for undefined values', () => {
        expect(() => validateRequired('name', undefined)).toThrow(ValidationError);
        expect(() => validateRequired('name', undefined)).toThrow('Field "name" is required');
      });

      it('should use custom message if provided', () => {
        expect(() => validateRequired('email', null, 'Email is mandatory')).toThrow(
          'Email is mandatory'
        );
      });
    });

    describe('validateType()', () => {
      it('should validate string type', () => {
        expect(() => validateType('name', 'John', 'string')).not.toThrow();
        expect(() => validateType('name', 123, 'string')).toThrow(ValidationError);
        expect(() => validateType('name', 123, 'string')).toThrow(
          'Field "name" must be of type string'
        );
      });

      it('should validate number type', () => {
        expect(() => validateType('age', 25, 'number')).not.toThrow();
        expect(() => validateType('age', '25', 'number')).toThrow(ValidationError);
      });

      it('should validate boolean type', () => {
        expect(() => validateType('active', true, 'boolean')).not.toThrow();
        expect(() => validateType('active', 1, 'boolean')).toThrow(ValidationError);
      });

      it('should validate array type', () => {
        expect(() => validateType('items', [1, 2, 3], 'array')).not.toThrow();
        expect(() => validateType('items', 'not-array', 'array')).toThrow(ValidationError);
      });

      it('should validate object type', () => {
        expect(() => validateType('config', { key: 'value' }, 'object')).not.toThrow();
        expect(() => validateType('config', [], 'object')).toThrow(ValidationError);
      });
    });

    describe('validatePattern()', () => {
      it('should validate regex patterns', () => {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        expect(() => validatePattern('email', 'test@example.com', emailPattern)).not.toThrow();
        expect(() => validatePattern('email', 'invalid-email', emailPattern)).toThrow(
          ValidationError
        );
      });

      it('should throw for non-string values', () => {
        const pattern = /^\d+$/;
        expect(() => validatePattern('code', 123 as any, pattern)).toThrow(ValidationError);
      });

      it('should use custom message if provided', () => {
        const pattern = /^\d{3}$/;
        expect(() =>
          validatePattern('code', 'abc', pattern, 'Code must be 3 digits')
        ).toThrow('Code must be 3 digits');
      });
    });

    describe('validateEnum()', () => {
      it('should validate enum values', () => {
        const validStatuses = ['active', 'inactive', 'pending'];
        expect(() => validateEnum('status', 'active', validStatuses)).not.toThrow();
        expect(() => validateEnum('status', 'invalid', validStatuses)).toThrow(ValidationError);
        expect(() => validateEnum('status', 'invalid', validStatuses)).toThrow(
          'Field "status" must be one of: active, inactive, pending'
        );
      });

      it('should handle empty enum array', () => {
        expect(() => validateEnum('status', 'any', [])).toThrow(ValidationError);
      });
    });

    describe('validateArray()', () => {
      it('should validate array items', () => {
        const validator = (item: any) => {
          if (typeof item !== 'number') {
            throw new ValidationError('item', 'Item must be a number');
          }
        };

        expect(() => validateArray('numbers', [1, 2, 3], validator)).not.toThrow();
        expect(() => validateArray('numbers', [1, 'two', 3], validator)).toThrow(
          ValidationError
        );
      });

      it('should throw if value is not an array', () => {
        const validator = () => {};
        expect(() => validateArray('items', 'not-array' as any, validator)).toThrow(
          ValidationError
        );
      });

      it('should provide item index in error message', () => {
        const validator = (item: any) => {
          if (item < 0) {
            throw new ValidationError('item', 'Must be positive');
          }
        };

        expect(() => validateArray('numbers', [1, -2, 3], validator)).toThrow('Must be positive');
      });
    });

    describe('validateCustom()', () => {
      it('should validate using custom function', () => {
        const validator = (value: any) => {
          if (value.length < 3) {
            throw new ValidationError('password', 'Password too short');
          }
        };

        expect(() => validateCustom('password', 'abcd', validator)).not.toThrow();
        expect(() => validateCustom('password', 'ab', validator)).toThrow(ValidationError);
        expect(() => validateCustom('password', 'ab', validator)).toThrow('Password too short');
      });
    });
  });

  describe('validate() function', () => {
    describe('Required field validation', () => {
      it('should validate required fields', () => {
        const data = { name: 'John' };
        const rules: ValidationRule[] = [
          { field: 'name', required: true },
          { field: 'email', required: true },
        ];

        const result = validate(data, rules);

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toMatchObject({
          field: 'email',
          message: 'Field "email" is required',
        });
      });

      it('should pass when all required fields are present', () => {
        const data = { name: 'John', email: 'john@example.com' };
        const rules: ValidationRule[] = [
          { field: 'name', required: true },
          { field: 'email', required: true },
        ];

        const result = validate(data, rules);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Type validation', () => {
      it('should validate field types', () => {
        const data = { name: 'John', age: '25' };
        const rules: ValidationRule[] = [
          { field: 'name', type: 'string' },
          { field: 'age', type: 'number' },
        ];

        const result = validate(data, rules);

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toMatchObject({
          field: 'age',
          message: 'Field "age" must be of type number',
        });
      });

      it('should validate multiple types correctly', () => {
        const data = {
          name: 'John',
          age: 25,
          active: true,
          tags: ['a', 'b'],
          config: { key: 'value' },
        };
        const rules: ValidationRule[] = [
          { field: 'name', type: 'string' },
          { field: 'age', type: 'number' },
          { field: 'active', type: 'boolean' },
          { field: 'tags', type: 'array' },
          { field: 'config', type: 'object' },
        ];

        const result = validate(data, rules);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Pattern validation', () => {
      it('should validate regex patterns', () => {
        const data = { email: 'john@example.com', phone: '12345' };
        const rules: ValidationRule[] = [
          { field: 'email', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
          { field: 'phone', pattern: /^\d{10}$/ },
        ];

        const result = validate(data, rules);

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].field).toBe('phone');
      });
    });

    describe('Enum validation', () => {
      it('should validate enum values', () => {
        const data = { status: 'active', role: 'invalid' };
        const rules: ValidationRule[] = [
          { field: 'status', enum: ['active', 'inactive'] },
          { field: 'role', enum: ['admin', 'user', 'guest'] },
        ];

        const result = validate(data, rules);

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toMatchObject({
          field: 'role',
          message: 'Field "role" must be one of: admin, user, guest',
        });
      });
    });

    describe('Nested object validation', () => {
      it('should validate nested objects', () => {
        const data = {
          user: {
            name: 'John',
            email: 'john@example.com',
          },
        };
        const rules: ValidationRule[] = [
          { field: 'user.name', required: true, type: 'string' },
          { field: 'user.email', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
          { field: 'user.age', type: 'number' },
        ];

        const result = validate(data, rules);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should report errors in nested objects', () => {
        const data = {
          user: {
            name: 'John',
            email: 'invalid-email',
          },
        };
        const rules: ValidationRule[] = [
          { field: 'user.email', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        ];

        const result = validate(data, rules);

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].field).toBe('user.email');
      });
    });

    describe('Array validation', () => {
      it('should validate array items', () => {
        const data = {
          tags: ['tag1', 'tag2', 'tag3'],
        };
        const rules: ValidationRule[] = [
          {
            field: 'tags',
            type: 'array',
            arrayValidator: (item: any) => {
              if (typeof item !== 'string') {
                throw new ValidationError('item', 'Tag must be a string');
              }
              if (item.length < 2) {
                throw new ValidationError('item', 'Tag must be at least 2 characters');
              }
            },
          },
        ];

        const result = validate(data, rules);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should report errors in array items', () => {
        const data = {
          tags: ['tag1', 't', 'tag3'],
        };
        const rules: ValidationRule[] = [
          {
            field: 'tags',
            arrayValidator: (item: any) => {
              if (item.length < 2) {
                throw new ValidationError('item', 'Tag must be at least 2 characters');
              }
            },
          },
        ];

        const result = validate(data, rules);

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
      });
    });

    describe('Custom validator function', () => {
      it('should support custom validation functions', () => {
        const data = { password: 'weak' };
        const rules: ValidationRule[] = [
          {
            field: 'password',
            custom: (value: any) => {
              if (value.length < 8) {
                throw new ValidationError('password', 'Password must be at least 8 characters');
              }
              if (!/[A-Z]/.test(value)) {
                throw new ValidationError(
                  'password',
                  'Password must contain uppercase letter'
                );
              }
            },
          },
        ];

        const result = validate(data, rules);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('Multiple validation errors', () => {
      it('should collect all validation errors', () => {
        const data = {
          name: '',
          age: 'not-a-number',
          email: 'invalid',
        };
        const rules: ValidationRule[] = [
          { field: 'name', required: true },
          { field: 'age', type: 'number' },
          { field: 'email', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
          { field: 'phone', required: true },
        ];

        const result = validate(data, rules);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('Custom error messages', () => {
      it('should use custom error messages when provided', () => {
        const data = { email: 'invalid' };
        const rules: ValidationRule[] = [
          {
            field: 'email',
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Please provide a valid email address',
          },
        ];

        const result = validate(data, rules);

        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toBe('Please provide a valid email address');
      });
    });

    describe('Skip validation for optional missing fields', () => {
      it('should not validate missing optional fields', () => {
        const data = { name: 'John' };
        const rules: ValidationRule[] = [
          { field: 'name', type: 'string' },
          { field: 'age', type: 'number' }, // Optional, not present
        ];

        const result = validate(data, rules);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate present optional fields', () => {
        const data = { name: 'John', age: 'invalid' };
        const rules: ValidationRule[] = [
          { field: 'name', type: 'string' },
          { field: 'age', type: 'number' }, // Optional but present and invalid
        ];

        const result = validate(data, rules);

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
      });
    });
  });

  describe('ValidationError class', () => {
    it('should create error with field and message', () => {
      const error = new ValidationError('email', 'Invalid email format');

      expect(error.field).toBe('email');
      expect(error.message).toBe('Invalid email format');
      expect(error.name).toBe('ValidationError');
      expect(error instanceof Error).toBe(true);
    });

    it('should be catchable as Error', () => {
      try {
        throw new ValidationError('field', 'error message');
      } catch (e) {
        expect(e instanceof Error).toBe(true);
        expect(e instanceof ValidationError).toBe(true);
      }
    });
  });
});
